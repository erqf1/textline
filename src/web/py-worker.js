// Python im Browser (Pyodide) in einem eigenen Worker, damit die Oberfläche flüssig bleibt.
// input() und "Stopp" brauchen SharedArrayBuffer (Seite muss cross-origin-isolated sein, dafür sorgt sw.js);
// ohne liefert input() ein Dateiende und Stopp beendet den ganzen Worker.
const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';
const HOME = '/home/pyodide';

let py = null;
let loading = null;
let stdin = null; // { ctrl: Int32Array [state, länge], data: Uint8Array }
let current = null; // id des laufenden Programms oder der Konsole, an die Ausgaben gehen
let currentKind = 'run';
const enc = new TextEncoder();
const dec = new TextDecoder();

const send = (ev) => postMessage({ ev: { kind: currentKind, ...ev } });
const out = (type, data) => current !== null && send({ id: current, type, data });

function load() {
  if (!loading) {
    loading = (async () => {
      const { loadPyodide } = await import(`${PYODIDE}pyodide.mjs`);
      py = await loadPyodide({ indexURL: PYODIDE });
      py.setStdout({ write: (buf) => (out('out', dec.decode(buf)), buf.length) });
      py.setStderr({ write: (buf) => (out('err', dec.decode(buf)), buf.length) });
      py.setStdin({ stdin: readLine, isatty: true });
      py.runPython(HELPERS);
      return py;
    })();
  }
  return loading;
}

function readLine() {
  if (!stdin) {
    out('err', `\n${self.noInputText}\n`);
    return null;
  }
  postMessage({ needInput: current });
  Atomics.store(stdin.ctrl, 0, 0);
  while (Atomics.load(stdin.ctrl, 0) === 0) Atomics.wait(stdin.ctrl, 0, 0, 500);
  if (Atomics.load(stdin.ctrl, 0) === 2) return null; // Stopp oder Dateiende
  const n = Atomics.load(stdin.ctrl, 1);
  return dec.decode(stdin.data.slice(0, n));
}

// Programm wie "python datei.py" ausführen: eigener __main__, Traceback ohne Pyodide-Innereien
const HELPERS = `
import sys, os, traceback, code as _code
def __tl_run(src, path):
    g = {'__name__': '__main__', '__file__': path, '__builtins__': __builtins__}
    try:
        exec(compile(src, path, 'exec'), g)
        return 0
    except SystemExit as e:
        return e.code if isinstance(e.code, int) else (0 if e.code is None else 1)
    except BaseException as e:
        traceback.print_exception(type(e), e, e.__traceback__.tb_next)
        return 1
    finally:
        sys.stdout.flush(); sys.stderr.flush()

def __tl_check(src):
    try:
        compile(src, '<textline>', 'exec')
        return None
    except SyntaxError as e:
        return {'line': e.lineno, 'col': e.offset, 'endLine': getattr(e, 'end_lineno', None), 'endCol': getattr(e, 'end_offset', None), 'msg': e.msg}
    except Exception:
        return None

__tl_console = None
def __tl_shell_reset():
    global __tl_console
    __tl_console = _code.InteractiveConsole({'__name__': '__console__'})
def __tl_shell_push(line):
    more = __tl_console.push(line)
    sys.stdout.flush()
    sys.stderr.write('... ' if more else '>>> ')
    sys.stderr.flush()
`;

/** Dateien aus dem Browser ins Python-Arbeitsverzeichnis legen, damit open('daten.txt') klappt */
function putFiles(files) {
  for (const { name, text } of files || []) {
    try {
      py.FS.writeFile(`${HOME}/${name}`, text);
    } catch { /* Name, den das Dateisystem nicht mag */ }
  }
}

/** Neue oder geänderte Textdateien zurückmelden (z. B. von open(..., 'w')) */
function changedFiles(before) {
  const map = new Map((before || []).map((f) => [f.name, f.text]));
  const result = [];
  for (const name of py.FS.readdir(HOME)) {
    if (name === '.' || name === '..') continue;
    const p = `${HOME}/${name}`;
    try {
      if (!py.FS.isFile(py.FS.stat(p).mode)) continue;
      const bytes = py.FS.readFile(p);
      if (bytes.length > 5 * 1024 * 1024 || bytes.slice(0, 8192).includes(0)) continue;
      const text = dec.decode(bytes);
      if (map.get(name) !== text) result.push({ name, text });
    } catch { /* übergehen */ }
  }
  return result;
}

async function pip(args, files) {
  await py.loadPackage('micropip', { messageCallback: (m) => out('out', `${m}\n`), errorCallback: (m) => out('err', `${m}\n`) });
  const micropip = py.pyimport('micropip');
  const [cmd, ...rest] = args;
  let names = rest.filter((a) => !a.startsWith('-'));
  if (cmd === 'install' && rest.includes('-r')) {
    const req = (files || []).find((f) => `/${f.name}` === rest[rest.indexOf('-r') + 1]);
    names = req ? req.text.split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean) : [];
  }
  try {
    if (cmd === 'install') {
      for (const n of names) {
        out('out', `Collecting ${n}\n`);
        await micropip.install(n, { keep_going: true });
      }
      out('out', `Successfully installed ${names.join(' ')}\n`);
    } else if (cmd === 'uninstall') {
      micropip.uninstall(py.toPy(names));
      out('out', `Successfully uninstalled ${names.join(' ')}\n`);
    }
    return 0;
  } catch (e) {
    out('err', `${String(e.message || e).split('\n').slice(-3).join('\n')}\n`);
    return 1;
  }
}

onmessage = async (e) => {
  const m = e.data;
  if (m.cmd === 'init') {
    self.noInputText = m.noInputText;
    if (m.stdinSab) stdin = { ctrl: new Int32Array(m.stdinSab, 0, 2), data: new Uint8Array(m.stdinSab, 8) };
    if (m.intSab) self.intBuf = new Uint8Array(m.intSab);
    return;
  }
  if (m.cmd === 'check') {
    if (!py) return postMessage({ req: m.req, result: null });
    const r = py.globals.get('__tl_check')(m.code);
    const result = r && r.toJs ? Object.fromEntries(r.toJs()) : null;
    if (r && r.destroy) r.destroy();
    return postMessage({ req: m.req, result });
  }
  try {
    await load();
  } catch (err) {
    current = m.id;
    out('err', `Python: ${err.message || err}\n`);
    send({ id: m.id, type: 'exit', code: 1 });
    return;
  }
  if (self.intBuf) py.setInterruptBuffer(self.intBuf);
  if (m.cmd === 'run') {
    current = m.id;
    currentKind = 'run';
    py.FS.chdir(HOME);
    putFiles(m.files);
    let code = 1;
    try {
      code = py.globals.get('__tl_run')(m.code, m.path);
    } catch (err) {
      out('err', `${err.message || err}\n`);
    }
    if (self.intBuf) self.intBuf[0] = 0;
    send({ id: m.id, type: 'exit', code });
    postMessage({ files: changedFiles(m.files) });
  } else if (m.cmd === 'shell') {
    current = m.id;
    currentKind = 'shell';
    py.FS.chdir(HOME);
    putFiles(m.files);
    py.globals.get('__tl_shell_reset')();
    out('err', '>>> ');
  } else if (m.cmd === 'line') {
    current = m.id;
    currentKind = 'shell';
    try {
      py.globals.get('__tl_shell_push')(m.text.replace(/\n$/, ''));
    } catch (err) {
      out('err', `${err.message || err}\n>>> `);
    }
  } else if (m.cmd === 'list') {
    await py.loadPackage('micropip', { messageCallback: () => {} });
    const pkgs = py.runPython('import micropip, json; json.dumps([{"name": p.name, "version": p.version} for p in micropip.list().values()])');
    postMessage({ req: m.req, result: { packages: JSON.parse(pkgs) } });
  } else if (m.cmd === 'pip') {
    current = m.id;
    currentKind = 'pip';
    const code = await pip(m.args, m.files);
    postMessage({ req: m.req, result: { id: m.id, code } });
  }
};
