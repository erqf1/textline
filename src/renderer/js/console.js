// Konsole unten wie bei Thonny: Ausgabe des Programms, Eingabe für input(), und wenn nichts läuft
// eine Python-Konsole (">>>"). Fehlerzeilen in Tracebacks ("File ..., line 12") sind anklickbar.
import { h } from './ui.js';

const MAX_NODES = 4000;
// so viele Zeichen behält die Konsole höchstens, ältere fallen vorne weg
const MAX_CHARS = 400000;

export function createConsole({ root, api, T, getPython, onJump, onState }) {
  const out = root.querySelector('.console-out');
  const input = root.querySelector('.console-input');
  const promptEl = root.querySelector('.console-prompt');
  let runId = null;
  let shellId = null;
  let shellStarting = null;
  let runFile = null;
  let stopping = null; // nach "Stopp" kommt noch Ausgabe, bis der Prozess wirklich weg ist - die wird nicht mehr gezeigt
  const history = [];
  let hIndex = -1;
  let atLineStart = true;

  const setPrompt = (text) => {
    promptEl.textContent = text;
  };
  const busy = () => runId !== null;

  // Unten mitlaufen, solange man unten ist; wer hochscrollt, bleibt dort stehen
  // Nur echtes Hochscrollen (Mausrad, Scrollbalken ziehen) löst das; Scroll-Ereignisse vom Kürzen oben zählen nicht.
  let stick = true;
  let dragging = false;
  const atBottom = () => out.scrollHeight - out.scrollTop - out.clientHeight < 80;
  out.addEventListener('wheel', (e) => {
    if (e.deltaY < 0) stick = false;
    else requestAnimationFrame(() => (stick = stick || atBottom()));
  }, { passive: true });
  out.addEventListener('pointerdown', () => (dragging = true));
  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    stick = atBottom();
  });
  out.addEventListener('scroll', () => {
    if (dragging) stick = atBottom();
    else if (atBottom()) stick = true;
  });
  function scrollDown() {
    if (stick) out.scrollTop = out.scrollHeight;
  }

  function linkify(text, cls) {
    const frag = document.createDocumentFragment();
    const re = /File "([^"]+)", line (\d+)/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) frag.append(document.createTextNode(text.slice(last, m.index)));
      const file = m[1] === '<textline>' ? runFile : m[1];
      const a = h('a', { class: 'console-link', href: '#', text: m[0] });
      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (file) onJump(file, Number(m[2]));
      });
      frag.append(a);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.append(document.createTextNode(text.slice(last)));
    const span = h('span', { class: `c-${cls}` });
    span.append(frag);
    return span;
  }

  let chars = 0;
  let scrollQueued = false;
  function append(text, cls = 'out') {
    if (!text) return;
    out.append(linkify(text, cls));
    chars += text.length;
    atLineStart = text.endsWith('\n');
    while (out.firstChild && (out.childNodes.length > MAX_NODES || chars > MAX_CHARS)) {
      chars -= out.firstChild.textContent.length;
      out.firstChild.remove();
    }
    // höchstens einmal pro Bild nach unten scrollen
    if (!scrollQueued) {
      scrollQueued = true;
      requestAnimationFrame(() => {
        scrollQueued = false;
        scrollDown();
      });
    }
  }
  const line = (text, cls) => {
    if (!atLineStart) append('\n', cls);
    append(`${text}\n`, cls);
  };

  api.py.onEvent((ev) => {
    if (ev.kind === 'pip') return;
    if (ev.id !== runId && ev.id !== shellId) return;
    if ((ev.type === 'out' || ev.type === 'err' || ev.type === 'skip') && ev.id === stopping) return;
    if (ev.type === 'out' || ev.type === 'err') {
      let data = ev.data;
      if (ev.id === shellId && ev.type === 'err') {
        // Die Eingabeaufforderung (">>> " / "... ") steht schon links neben dem Eingabefeld
        const m = /(>>> |\.\.\. )$/.exec(data);
        if (m) {
          setPrompt(m[1].trim());
          data = data.slice(0, -m[1].length);
        }
      }
      append(data, ev.type);
    } else if (ev.type === 'skip') {
      line(T('consoleSkipped', { n: ev.lines.toLocaleString() }), 'info');
    } else if (ev.type === 'exit') {
      if (ev.id === runId) {
        runId = null;
        const code = ev.error ? ev.error : ev.code;
        line(ev.code === 0 ? T('consoleDone') : T('consoleExit', { code }), ev.code === 0 ? 'info' : 'warn');
        setPrompt('>>>');
        onState();
      } else {
        shellId = null;
        setPrompt('>>>');
      }
    }
  });

  async function ensureShell() {
    if (shellId) return shellId;
    if (shellStarting) return shellStarting;
    shellStarting = (async () => {
      const py = await getPython(true);
      if (!py) return null;
      line(T('consoleShellStart', { version: py.version }), 'info');
      shellId = await api.py.shell(py.python, null);
      return shellId;
    })();
    try {
      return await shellStarting;
    } finally {
      shellStarting = null;
    }
  }

  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = input.value;
      input.value = '';
      if (text.trim()) {
        history.push(text);
        if (history.length > 200) history.shift();
      }
      hIndex = -1;
      if (busy()) {
        append(`${text}\n`, 'in');
        api.py.write(runId, `${text}\n`);
        return;
      }
      const id = await ensureShell();
      append(`${promptEl.textContent} ${text}\n`, 'in');
      if (id) api.py.write(id, `${text}\n`);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (!history.length) return;
      e.preventDefault();
      hIndex = e.key === 'ArrowUp' ? (hIndex < 0 ? history.length - 1 : Math.max(0, hIndex - 1)) : hIndex < 0 ? -1 : hIndex + 1;
      if (hIndex >= history.length) hIndex = -1;
      input.value = hIndex < 0 ? '' : history[hIndex];
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !window.getSelection().toString() && input.selectionStart === input.selectionEnd) {
      e.preventDefault();
      if (busy()) stop();
      else if (shellId) {
        api.py.stop(shellId);
        line(T('consoleShellStopped'), 'warn');
      }
    }
  });
  out.addEventListener('mouseup', () => {
    if (!window.getSelection().toString()) input.focus();
  });

  async function run(py, file, cwd, label, clear) {
    if (runId) await stop(true);
    if (clear) out.textContent = '';
    runFile = file;
    line(`▶ ${label}  ·  Python ${py.version}`, 'head');
    runId = await api.py.run(py.python, file, cwd);
    setPrompt('›');
    onState();
    input.focus();
  }

  function stop(quiet) {
    if (!runId) return Promise.resolve();
    const id = runId;
    stopping = id;
    api.py.stop(id);
    if (!quiet) line(T('consoleStopped'), 'warn');
    return new Promise((resolve) => {
      const t0 = Date.now();
      const wait = () => (runId !== id || Date.now() - t0 > 3000 ? resolve() : setTimeout(wait, 50));
      wait();
    });
  }

  return {
    run,
    stop,
    clear: () => (out.textContent = ''),
    focus: () => input.focus(),
    info: (text) => line(text, 'info'),
    isRunning: busy,
  };
}
