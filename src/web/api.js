// Textline im Browser: ersetzt die Brücke zum Hauptprozess (src/preload.js) durch Browser-Mittel.
// Dateien liegen im Browser (IndexedDB) und bleiben auch auf dem Handy erhalten. Am PC (Chrome/Edge) speichert
// "Vom Gerät öffnen" zusätzlich direkt in die Datei auf der Festplatte. Python läuft mit Pyodide (py-worker.js).
import * as store from './store.js';
import { h, dialog, prompt, toast, confirm } from '../renderer/js/ui.js';
import { icon } from '../renderer/js/icons.js';
import i18n from '../shared/i18n.js';

const MAX_SIZE = 20 * 1024 * 1024;
const PY_VERSION = '3.14';
let lang = i18n.guess(navigator.language);
const T = (key, vars) => i18n.t(lang, key, vars);

const baseName = (p) => String(p).split('/').pop();
const norm = (t) => t.replace(/\r\n?/g, '\n');
const isBinary = (t) => t.slice(0, 8192).includes('\u0000');
const temp = new Map(); // ungespeicherter Code zum Ausführen ("temp:/name.py")
let fileChanged = () => {};
let openFiles = () => {};
let askedPersist = false;

// ---------------------------------------------------------------- Kodierungen
const LABELS = { utf8: 'utf-8', utf16le: 'utf-16le', utf16be: 'utf-16be', windows1252: 'windows-1252', iso88591: 'iso-8859-1', iso885915: 'iso-8859-15', windows1250: 'windows-1250', windows1251: 'windows-1251', shiftjis: 'shift_jis', gbk: 'gbk' };

function detect(bytes) {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return { encoding: 'utf8', bom: true };
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return { encoding: 'utf16le', bom: true };
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return { encoding: 'utf16be', bom: true };
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { encoding: 'utf8', bom: false };
  } catch {
    return { encoding: 'windows1252', bom: false };
  }
}

function decode(bytes, encoding, bom) {
  const skip = bom ? (encoding === 'utf8' ? 3 : 2) : 0;
  return new TextDecoder(LABELS[encoding] || 'utf-8', { ignoreBOM: true }).decode(bytes.subarray(skip));
}

/** Text -> Bytes in der Kodierung der Datei (Shift JIS/GBK kann der Browser nicht schreiben: dann UTF-8) */
function encode(text, encoding, bom) {
  if (encoding === 'utf16le' || encoding === 'utf16be') {
    const out = new Uint8Array(text.length * 2 + 2);
    const le = encoding === 'utf16le';
    out.set(le ? [0xff, 0xfe] : [0xfe, 0xff]);
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      out[2 + i * 2 + (le ? 0 : 1)] = c & 0xff;
      out[2 + i * 2 + (le ? 1 : 0)] = c >> 8;
    }
    return bom === false ? out.subarray(2) : out;
  }
  const single = ['windows1252', 'iso88591', 'iso885915', 'windows1250', 'windows1251'].includes(encoding);
  if (single) {
    const table = new Map();
    const chars = new TextDecoder(LABELS[encoding]).decode(Uint8Array.from({ length: 256 }, (_, i) => i));
    for (let i = 0; i < 256; i++) table.set(chars[i], i);
    return Uint8Array.from([...text].map((ch) => (table.has(ch) ? table.get(ch) : 0x3f)));
  }
  const utf8 = new TextEncoder().encode(text);
  if (!(encoding === 'utf8' && bom)) return utf8;
  const out = new Uint8Array(utf8.length + 3);
  out.set([0xef, 0xbb, 0xbf]);
  out.set(utf8, 3);
  return out;
}

// ---------------------------------------------------------------- Dateien im Browser
const record = (p) => (p.startsWith('temp:') ? (temp.has(p) ? { text: temp.get(p) } : null) : store.get('files', p));

async function findKey(p) {
  const lower = p.toLowerCase();
  return (await store.keys('files')).find((k) => k.toLowerCase() === lower);
}

/** Freier Name "/name.txt", "/name (2).txt" … - dieselbe Datei nochmal geöffnet bekommt ihren alten Platz */
async function freePath(name, text) {
  const all = await store.keys('files');
  const m = /^(.*?)(\.[^.]*)?$/.exec(name);
  for (let i = 1; ; i++) {
    const p = `/${i === 1 ? name : `${m[1]} (${i})${m[2] || ''}`}`;
    const hit = all.find((k) => k.toLowerCase() === p.toLowerCase());
    if (!hit) return p;
    const rec = await store.get('files', hit);
    if (rec && rec.text === text) return hit;
  }
}

async function importFile(file, handle) {
  if (file.size > MAX_SIZE) {
    toast(T('errTooBig', { name: file.name, mb: Math.round(file.size / 1048576) }), { kind: 'error', ms: 4500 });
    return null;
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const det = detect(bytes);
  const raw = decode(bytes, det.encoding, det.bom);
  const text = norm(raw);
  const p = await freePath(file.name.replace(/[\\/]/g, '_') || 'file.txt', text);
  const old = await store.get('files', p);
  await store.put('files', p, { text, bytes, ...det, eol: /\r\n/.test(raw) ? 'crlf' : 'lf', mtime: file.lastModified || Date.now(), size: file.size, handle: handle || (old && old.handle) || null });
  return p;
}

async function writeToDisk(handle, bytes) {
  try {
    let perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') perm = await handle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') throw new Error('denied');
    const w = await handle.createWritable();
    await w.write(bytes);
    await w.close();
  } catch {
    toast(T('webDiskFailed'), { kind: 'error', ms: 5000 });
  }
}

async function pickFromDevice() {
  if (window.showOpenFilePicker) {
    let handles;
    try {
      handles = await window.showOpenFilePicker({ multiple: true });
    } catch {
      return []; // abgebrochen
    }
    const out = [];
    for (const hd of handles) {
      const p = await importFile(await hd.getFile(), hd);
      if (p) out.push(p);
    }
    return out;
  }
  // Handy & andere Browser: normale Dateiauswahl, die Datei wird in den Browser kopiert
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', multiple: true, style: { display: 'none' } });
    input.addEventListener('change', async () => {
      const out = [];
      for (const f of input.files) {
        const p = await importFile(f);
        if (p) out.push(p);
      }
      input.remove();
      resolve(out);
    });
    document.body.append(input);
    input.click();
  });
}

const fmtSize = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

/** "Öffnen": Liste der Dateien im Browser plus "Vom Gerät öffnen" */
function openDialog(opts = {}) {
  return new Promise((resolve) => {
    let done = false;
    let closeDialog = null;
    const finish = (paths) => {
      if (done || !paths.length) return;
      done = true;
      closeDialog(null);
      resolve(paths);
    };
    const list = h('div', { class: 'web-files' });
    async function render() {
      const [ks, vs] = await Promise.all([store.keys('files'), store.values('files')]);
      const rows = ks.map((k, i) => ({ path: k, ...vs[i] })).sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
      list.textContent = '';
      if (!rows.length) list.append(h('div', { class: 'web-files-empty', text: T('webNoFiles') }));
      for (const r of rows) {
        const del = h('button', { class: 'icon-btn small', html: icon('trash', 15), title: T('webDelete') });
        del.addEventListener('click', async (e) => {
          e.stopPropagation();
          const v = await confirm(T('webDelete'), T('webDeleteAsk', { name: baseName(r.path) }), [{ label: T('cancel'), value: 'no' }, { label: T('webDelete'), value: 'yes', danger: true, primary: true }]);
          if (v === 'yes') {
            await store.del('files', r.path);
            render();
          }
        });
        const date = new Date(r.mtime || Date.now()).toLocaleString(document.documentElement.lang || undefined, { dateStyle: 'short', timeStyle: 'short' });
        const row = h('button', { class: 'web-file' },
          h('span', { class: 'web-file-ico', html: icon('file', 18) }),
          h('span', { class: 'web-file-main' },
            h('span', { class: 'web-file-name', text: baseName(r.path) }),
            h('span', { class: 'web-file-meta', text: `${date} · ${fmtSize(r.size || r.text.length)}${r.handle ? ` · ${T('webOnDisk')}` : ''}` })),
          del);
        row.addEventListener('click', () => finish([r.path]));
        list.append(row);
      }
    }
    const device = h('button', { class: 'btn primary web-device', html: `${icon('open', 16)}<span>${T('webFromDevice')}</span>` });
    device.addEventListener('click', async () => finish(await pickFromDevice()));
    render();
    dialog({
      title: opts.title || T('open'),
      body: h('div', { class: 'web-open' }, device, h('div', { class: 'web-files-title', text: T('webStored') }), list),
      buttons: [{ label: T('cancel'), value: null }],
      cancelValue: null,
      className: 'web-open-dialog',
      onOpen: (card, close) => {
        closeDialog = close;
        setTimeout(() => device.focus(), 0);
      },
    }).then(() => {
      if (!done) {
        done = true;
        resolve([]);
      }
    });
  });
}

async function saveDialog(opts = {}) {
  let name = baseName(opts.defaultPath || 'untitled.txt');
  for (;;) {
    const v = await prompt(opts.title || T('saveAs'), T('webFileName'), name, { okLabel: T('save'), cancelLabel: T('cancel') });
    if (v == null) return null;
    name = v.trim().replace(/[\\/:*?"<>|]/g, '_');
    if (!name) continue;
    const existing = await findKey(`/${name}`);
    if (!existing) return `/${name}`;
    const r = await confirm(opts.title || T('saveAs'), T('webOverwrite', { name }), [{ label: T('cancel'), value: 'no' }, { label: T('webReplace'), value: 'yes', primary: true, danger: true }]);
    if (r === 'yes') return existing;
  }
}

function download(name, text, { encoding = 'utf8', bom = false, eol = 'lf' } = {}) {
  const bytes = encode(eol === 'crlf' ? text.replace(/\n/g, '\r\n') : text, encoding, bom);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

const canShare = (() => {
  try {
    return !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.txt', { type: 'text/plain' })] }));
  } catch {
    return false;
  }
})();

async function share(name, text, { eol = 'lf' } = {}) {
  const file = new File([eol === 'crlf' ? text.replace(/\n/g, '\r\n') : text], name, { type: 'text/plain' });
  try {
    await navigator.share({ files: [file], title: name });
  } catch { /* abgebrochen */ }
}

function printHtml(html) {
  return new Promise((resolve) => {
    const frame = h('iframe', { style: { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' } });
    frame.addEventListener('load', () => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        resolve({ ok: true });
      } catch (e) {
        resolve({ ok: false, reason: String(e.message || e) });
      }
      setTimeout(() => frame.remove(), 2000);
    });
    frame.srcdoc = html;
    document.body.append(frame);
  });
}

async function allFiles() {
  const [ks, vs] = await Promise.all([store.keys('files'), store.values('files')]);
  return ks.map((k, i) => ({ name: k.slice(1), text: vs[i].text })).filter((f) => f.text.length < 5 * 1024 * 1024 && !isBinary(f.text));
}

// ---------------------------------------------------------------- Python (Pyodide im Worker)
const pyListeners = new Set();
let worker = null;
let loaded = false;
let stdinCtrl = null;
let stdinData = null;
let intBuf = null;
let nextId = 1;
let nextReq = 1;
let runId = null;
let shellId = null;
const requests = new Map();
const emit = (ev) => pyListeners.forEach((f) => f(ev));

function getWorker() {
  if (worker) return worker;
  if (typeof SharedArrayBuffer !== 'undefined' && window.crossOriginIsolated && !stdinCtrl) {
    const sab = new SharedArrayBuffer(8 + 65536);
    stdinCtrl = new Int32Array(sab, 0, 2);
    stdinData = new Uint8Array(sab, 8);
    intBuf = new Uint8Array(new SharedArrayBuffer(1));
  }
  worker = new Worker('py-worker.js', { type: 'module' });
  worker.postMessage({ cmd: 'init', stdinSab: stdinCtrl ? stdinCtrl.buffer : null, intSab: intBuf ? intBuf.buffer : null, noInputText: T('webNoInput') });
  worker.onmessage = async (e) => {
    const m = e.data;
    if (m.ev) {
      loaded = true;
      if (m.ev.type === 'exit' && m.ev.id === runId) runId = null;
      emit(m.ev);
    } else if (m.req) {
      const done = requests.get(m.req);
      requests.delete(m.req);
      if (done) done(m.result);
    } else if (m.files) {
      for (const f of m.files) {
        const p = (await findKey(`/${f.name}`)) || `/${f.name}`;
        const old = await store.get('files', p);
        await store.put('files', p, { ...(old || { encoding: 'utf8', bom: false, eol: 'lf' }), text: norm(f.text), bytes: null, mtime: Date.now(), size: f.text.length });
        fileChanged({ path: p });
      }
    }
  };
  worker.onerror = (e) => {
    const id = runId ?? shellId;
    if (id != null) emit({ id, kind: 'run', type: 'err', data: `Python: ${e.message || e}\n` });
    restartWorker();
  };
  return worker;
}

function restartWorker() {
  if (worker) worker.terminate();
  worker = null;
  loaded = false;
  for (const done of requests.values()) done(null);
  requests.clear();
  const ids = [runId, shellId].filter((x) => x != null);
  runId = null;
  shellId = null;
  for (const id of ids) emit({ id, kind: 'run', type: 'exit', code: 1 });
}

function request(msg, timeout) {
  return new Promise((resolve) => {
    const req = nextReq++;
    requests.set(req, resolve);
    getWorker().postMessage({ ...msg, req });
    if (timeout) setTimeout(() => requests.delete(req) && resolve(null), timeout);
  });
}

/** Beim ersten Mal lädt der Browser Python (~10 MB, danach aus dem Cache) - kurz Bescheid geben */
function loadingNotice(id, kind) {
  if (!loaded) setTimeout(() => emit({ id, kind, type: 'out', data: `${T('webPyLoading')}\n` }), 0);
}

const py = {
  resolve: async () => ({ python: 'pyodide', version: PY_VERSION, kind: 'web' }),
  ensureEnv: async () => ({ ok: true }),
  run: async (_interp, file) => {
    const r = await record(file);
    const id = nextId++;
    runId = id;
    getWorker().postMessage({ cmd: 'run', id, code: r ? r.text : '', path: file.startsWith('temp:') ? '<textline>' : file, files: await allFiles() });
    loadingNotice(id, 'run');
    return id;
  },
  shell: async () => {
    const id = nextId++;
    shellId = id;
    getWorker().postMessage({ cmd: 'shell', id, files: await allFiles() });
    loadingNotice(id, 'shell');
    return id;
  },
  write: (id, text) => {
    if (id === runId) {
      if (!stdinCtrl) return false;
      const bytes = new TextEncoder().encode(text);
      const have = Atomics.load(stdinCtrl, 0) === 1 ? Atomics.load(stdinCtrl, 1) : 0;
      const n = Math.min(bytes.length, stdinData.length - have);
      stdinData.set(bytes.subarray(0, n), have);
      Atomics.store(stdinCtrl, 1, have + n);
      Atomics.store(stdinCtrl, 0, 1);
      Atomics.notify(stdinCtrl, 0);
      return true;
    }
    if (id === shellId) {
      getWorker().postMessage({ cmd: 'line', id, text });
      return true;
    }
    return false;
  },
  stop: (id) => {
    if (id === runId) {
      if (intBuf) {
        intBuf[0] = 2; // KeyboardInterrupt
        Atomics.store(stdinCtrl, 0, 2); // wartet das Programm gerade auf input(): aufwecken
        Atomics.notify(stdinCtrl, 0);
      } else {
        restartWorker(); // ohne SharedArrayBuffer lässt sich Python nur ganz beenden
      }
      return true;
    }
    if (id === shellId) {
      shellId = null;
      emit({ id, kind: 'shell', type: 'exit', code: 0 });
      return true;
    }
    return false;
  },
  pipList: async () => (await request({ cmd: 'list' })) || { error: 'Python' },
  pip: async (_interp, args) => {
    const id = nextId++;
    return (await request({ cmd: 'pip', id, args, files: await allFiles() })) || { id, code: 1 };
  },
  check: async (_interp, code) => (loaded && runId == null ? request({ cmd: 'check', code }, 3000) : null),
  pypi: async (name) => {
    try {
      const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
      if (res.status === 404) return { notFound: true };
      if (!res.ok) return { error: `HTTP ${res.status}` };
      const i = (await res.json()).info || {};
      const urls = i.project_urls || {};
      return {
        name: i.name,
        version: i.version,
        summary: i.summary,
        homepage: i.home_page || urls.Homepage || urls.Home || urls.Source || i.project_url,
        author: i.author || i.maintainer,
        license: i.license_expression || (i.license && i.license.length < 60 ? i.license : ''),
        requiresPython: i.requires_python,
      };
    } catch (e) {
      return { error: String(e.message || e) };
    }
  },
  onEvent: (cb) => {
    pyListeners.add(cb);
    return () => pyListeners.delete(cb);
  },
};

// ---------------------------------------------------------------- Als App geöffnete Dateien (installierte Web-App)
let launched = [];
const launchReady = new Promise((resolve) => {
  if (!('launchQueue' in window)) return resolve();
  let first = true;
  window.launchQueue.setConsumer(async (params) => {
    const paths = [];
    for (const hd of params.files || []) {
      const p = await importFile(await hd.getFile(), hd);
      if (p) paths.push(p);
    }
    if (first) {
      first = false;
      launched = paths;
      resolve();
    } else if (paths.length) openFiles(paths);
  });
  setTimeout(resolve, 400);
});

const dark = window.matchMedia('(prefers-color-scheme: dark)');

window.api = {
  info: async () => ({
    version: __VERSION__,
    platform: 'web',
    mac: /Mac|iPhone|iPad/.test(navigator.platform),
    home: '',
    dark: dark.matches,
    selfTest: false,
    fileIcons: false,
    canShare,
  }),
  getSettings: async () => {
    const s = (await store.get('kv', 'settings')) || {};
    if (s.language) lang = s.language;
    return s;
  },
  setSettings: async (s) => {
    lang = s.language || i18n.guess(navigator.language);
    await store.put('kv', 'settings', JSON.parse(JSON.stringify(s)));
    return true;
  },
  getSession: () => store.get('kv', 'session'),
  setSession: (s) => store.put('kv', 'session', s ? JSON.parse(JSON.stringify(s)) : null),
  initialFiles: async () => {
    await launchReady;
    return launched.splice(0);
  },
  onOpenFiles: (cb) => {
    openFiles = cb;
  },
  // Kein "Schließen" im Browser: beim Wegwechseln (Tab, App im Hintergrund) Sitzung sichern
  onClosing: (cb) => {
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && cb({}));
    window.addEventListener('pagehide', () => cb({}));
  },
  onSystemTheme: (cb) => dark.addEventListener('change', (e) => cb(e.matches)),
  closeNow: async () => {},
  updateReady: () => {},
  setTitle: async (title) => {
    document.title = title;
  },

  openDialog,
  saveDialog,
  readFile: async (p, encoding) => {
    const r = await record(p);
    if (!r) return { error: 'ENOENT' };
    let { text } = r;
    let enc = r.encoding || 'utf8';
    let bom = !!r.bom;
    if (encoding && r.bytes && encoding !== enc) {
      enc = encoding;
      bom = false;
      text = norm(decode(r.bytes, enc, false));
    }
    return { text, encoding: enc, bom, eol: r.eol || 'lf', binary: isBinary(text), mtime: r.mtime || 0, size: r.size || text.length };
  },
  writeFile: async (p, text, { encoding = 'utf8', bom = false, eol = 'lf' } = {}) => {
    const old = await store.get('files', p);
    const bytes = encode(eol === 'crlf' ? text.replace(/\n/g, '\r\n') : text, encoding, bom);
    const mtime = Date.now();
    await store.put('files', p, { text, bytes, encoding, bom, eol, mtime, size: bytes.length, handle: old ? old.handle : null });
    if (old && old.handle) await writeToDisk(old.handle, bytes);
    if (!askedPersist && navigator.storage && navigator.storage.persist) {
      askedPersist = true;
      navigator.storage.persist().catch(() => {}); // Browser soll die Dateien nicht von selbst wegräumen
    }
    return { mtime };
  },
  exists: async (p) => !!(await record(p)),
  tempFile: async (name, text) => {
    const p = `temp:/${name}`;
    temp.set(p, text);
    return p;
  },
  watch: async () => {},
  onFileChanged: (cb) => {
    fileChanged = cb;
  },
  pathForFile: () => null,
  importFiles: async (files) => {
    const out = [];
    for (const f of files) {
      const p = await importFile(f);
      if (p) out.push(p);
    }
    return out;
  },
  download,
  share,

  openExternal: async (url) => {
    window.open(url, '_blank', 'noopener');
  },
  // "Im Browser öffnen" für HTML: Inhalt als eigene Seite in einem neuen Tab
  openPath: async (p) => {
    const r = await record(p);
    if (!r) return;
    const url = URL.createObjectURL(new Blob([r.text], { type: 'text/html;charset=utf-8' }));
    if (!window.open(url, '_blank')) toast(T('webPopupBlocked'));
  },
  reveal: async () => {},
  printHtml,
  py,
};
