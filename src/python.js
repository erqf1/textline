'use strict';

// Python für Textline: Interpreter finden, eine eigene Umgebung (venv) wie bei Thonny anlegen, Programme
// ausführen (mit Eingabe), eine Python-Konsole, Pakete per pip verwalten und Syntaxfehler prüfen.
// Die eigene Umgebung braucht keine Adminrechte und umgeht "externally managed" (Arch, neuere Ubuntu/Debian).
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROBE = 'import sys,json;print(json.dumps([sys.executable,sys.version.split()[0]]))';
const CHECK = [
  'import sys,json',
  "src=sys.stdin.buffer.read().decode('utf-8','replace')",
  'try:',
  "    compile(src,'<textline>','exec')",
  "    print('null')",
  'except SyntaxError as e:',
  "    print(json.dumps({'line':e.lineno,'col':e.offset,'endLine':getattr(e,'end_lineno',None),'endCol':getattr(e,'end_offset',None),'msg':e.msg}))",
  'except Exception:',
  "    print('null')",
].join('\n');

const UTF8_ENV = { PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' };

function probe(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, [...args, '-c', PROBE], { timeout: 8000, windowsHide: true }, (err, stdout) => {
      if (err) return resolve(null);
      try {
        const [exe, version] = JSON.parse(String(stdout).trim().split(/\r?\n/).pop());
        const [maj, min] = version.split('.').map(Number);
        resolve(maj === 3 && min >= 7 ? { exe, version } : null);
      } catch {
        resolve(null);
      }
    });
  });
}

class Python {
  constructor(userData, send) {
    this.envDir = path.join(userData, 'python-env');
    this.send = send;           // (channel, payload) an das Fenster
    this.procs = new Map();     // id -> Kindprozess (Programm, Konsole, pip)
    this.baseCache = null;
    this.nextId = 1;
  }

  envPython() {
    return process.platform === 'win32' ? path.join(this.envDir, 'Scripts', 'python.exe') : path.join(this.envDir, 'bin', 'python3');
  }

  /** Erster funktionierender Python-3-Interpreter des Systems */
  async findBase(force) {
    if (this.baseCache && !force) return this.baseCache;
    const tries = [];
    if (process.platform === 'win32') {
      tries.push(['py', ['-3']], ['python', []], ['python3', []]);
      const local = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python');
      try {
        for (const d of fs.readdirSync(local).sort().reverse()) tries.push([path.join(local, d, 'python.exe'), []]);
      } catch {
        // keine Installation dort
      }
    } else {
      tries.push(['python3', []], ['python', []], ['/opt/homebrew/bin/python3', []], ['/usr/local/bin/python3', []], ['/usr/bin/python3', []]);
    }
    for (const [cmd, args] of tries) {
      const r = await probe(cmd, args);
      // Der Windows-Store-Platzhalter "python.exe" startet nichts Echtes - probe() liefert dann null
      if (r) return (this.baseCache = r);
    }
    return null;
  }

  /** Welcher Interpreter gilt? mode "env" = eigene Umgebung (empfohlen), "system" = System-Python, sonst Pfad */
  async resolve(settings) {
    const mode = settings.pythonMode || 'env';
    if (mode === 'custom' && settings.pythonPath) {
      const r = await probe(settings.pythonPath, []);
      return r ? { python: r.exe, version: r.version, kind: 'custom' } : { error: 'custom-broken', path: settings.pythonPath };
    }
    const base = await this.findBase();
    if (!base) return { error: 'nopython' };
    if (mode === 'system') return { python: base.exe, version: base.version, kind: 'system', base: base.exe };
    if (fs.existsSync(this.envPython())) {
      const r = await probe(this.envPython(), []);
      if (r) return { python: r.exe, version: r.version, kind: 'env', base: base.exe, envDir: this.envDir };
    }
    return { needsEnv: true, base: base.exe, version: base.version, kind: 'env', envDir: this.envDir };
  }

  /** Eigene Umgebung anlegen (dauert ein paar Sekunden); Ausgabe geht als "pip"-Protokoll ans Fenster */
  async ensureEnv() {
    const base = await this.findBase();
    if (!base) return { error: 'nopython' };
    if (fs.existsSync(this.envPython()) && (await probe(this.envPython(), []))) return { ok: true };
    fs.rmSync(this.envDir, { recursive: true, force: true });
    const res = await this.stream('pip', base.exe, ['-m', 'venv', this.envDir], {});
    if (res.code !== 0) {
      const venvMissing = /ensurepip|venv/i.test(res.output);
      return { error: venvMissing && process.platform === 'linux' ? 'novenv' : 'venv-failed', output: res.output };
    }
    return { ok: true };
  }

  /** Prozess starten und Ausgabe zeilenweise ans Fenster schicken; Promise mit Exit-Code und Ausgabe */
  stream(kind, cmd, args, { cwd, id = this.nextId++, stdin = false } = {}) {
    return new Promise((resolve) => {
      let output = '';
      let child;
      try {
        child = spawn(cmd, args, {
          cwd: cwd || undefined,
          env: { ...process.env, ...UTF8_ENV },
          windowsHide: true,
          stdio: [stdin ? 'pipe' : 'ignore', 'pipe', 'pipe'],
        });
      } catch (e) {
        this.send('py:event', { id, kind, type: 'exit', code: -1, error: String(e.message || e) });
        return resolve({ code: -1, output: String(e.message || e) });
      }
      this.procs.set(id, child);
      this.send('py:event', { id, kind, type: 'start', pid: child.pid });
      const pipe = (stream, type) => {
        stream.setEncoding('utf8');
        stream.on('data', (data) => {
          output += data;
          if (output.length > 200000) output = output.slice(-100000);
          this.send('py:event', { id, kind, type, data });
        });
      };
      pipe(child.stdout, 'out');
      pipe(child.stderr, 'err');
      child.on('error', (e) => {
        this.procs.delete(id);
        this.send('py:event', { id, kind, type: 'exit', code: -1, error: String(e.message || e) });
        resolve({ code: -1, output: output + String(e.message || e) });
      });
      child.on('close', (code, signal) => {
        this.procs.delete(id);
        this.send('py:event', { id, kind, type: 'exit', code, signal });
        resolve({ code, output });
      });
    });
  }

  /** Programm ausführen (Datei liegt schon gespeichert vor). Liefert die Prozess-ID sofort. */
  run(python, file, cwd) {
    const id = this.nextId++;
    this.stream('run', python, ['-u', file], { cwd, id, stdin: true });
    return id;
  }

  /** Python-Konsole wie bei Thonny (">>>"); bleibt offen, bis sie beendet wird */
  shell(python, cwd) {
    const id = this.nextId++;
    this.stream('shell', python, ['-i', '-q', '-u'], { cwd, id, stdin: true });
    return id;
  }

  write(id, text) {
    const p = this.procs.get(id);
    if (!p || !p.stdin || p.stdin.destroyed) return false;
    p.stdin.write(text);
    return true;
  }

  stop(id) {
    const p = this.procs.get(id);
    if (!p) return false;
    if (process.platform === 'win32') {
      // ganzen Baum beenden (z. B. Programme, die selbst Prozesse starten)
      execFile('taskkill', ['/pid', String(p.pid), '/t', '/f'], { windowsHide: true }, () => {});
    } else {
      p.kill('SIGTERM');
      setTimeout(() => {
        if (this.procs.has(id)) p.kill('SIGKILL');
      }, 1500);
    }
    return true;
  }

  stopAll() {
    for (const id of [...this.procs.keys()]) this.stop(id);
  }

  pipList(python) {
    return new Promise((resolve) => {
      execFile(python, ['-m', 'pip', 'list', '--format=json', '--disable-pip-version-check'], {
        timeout: 60000,
        windowsHide: true,
        maxBuffer: 16 * 1024 * 1024,
        env: { ...process.env, ...UTF8_ENV },
      }, (err, stdout, stderr) => {
        if (err) return resolve({ error: String(stderr || err.message).trim().slice(-600) });
        try {
          resolve({ packages: JSON.parse(String(stdout).trim().split(/\r?\n/).pop()) });
        } catch {
          resolve({ error: String(stdout).slice(-600) });
        }
      });
    });
  }

  /** pip install/uninstall …; die Ausgabe läuft live ins Protokoll des Paket-Fensters */
  pip(python, args) {
    const id = this.nextId++;
    const done = this.stream('pip', python, ['-m', 'pip', ...args, '--disable-pip-version-check', '--no-input'], { id });
    return { id, done };
  }

  check(python, code) {
    return new Promise((resolve) => {
      const child = execFile(python, ['-c', CHECK], { timeout: 8000, windowsHide: true, env: { ...process.env, ...UTF8_ENV } }, (err, stdout) => {
        if (err) return resolve(null);
        try {
          resolve(JSON.parse(String(stdout).trim().split(/\r?\n/).pop()));
        } catch {
          resolve(null);
        }
      });
      child.stdin.end(Buffer.from(code, 'utf8'));
    });
  }
}

module.exports = { Python };
