// Textline - Oberfläche: Tabs, Dateien, Sitzung, Befehle mit Tastenkürzeln, Menüs, Statusleiste,
// Python ausführen, Vorschau. Ein EditorView, jeder Tab hat seinen eigenen EditorState.
import { h, $, showMenu, closeMenus, menuOpen, dialog, dialogOpen, prompt, toast, keyLabel } from './ui.js';
import { icon } from './icons.js';
import { applyTheme, themeById, THEMES, printColors } from './themes.js';
import { ALL, POPULAR, PLAIN, detectLanguage, findLanguage, defaultExtension, displayName } from './languages.js';
import * as E from './editor.js';
import { createConsole } from './console.js';
import { openPackages } from './packages.js';
import { openSettings } from './settings-dialog.js';
import { createPreview } from './preview.js';
import { undo, redo, selectAll, copyLineDown, deleteLine, moveLineUp, moveLineDown, indentMore, indentLess, toggleComment, cursorMatchingBracket } from '@codemirror/commands';
import { openSearchPanel, closeSearchPanel, searchPanelOpen, findNext, findPrevious, selectNextOccurrence, selectSelectionMatches } from '@codemirror/search';
import { foldAll, unfoldAll } from '@codemirror/language';
import i18n from '../../shared/i18n.js';

const api = window.api;
const DEFAULTS = {
  language: '', theme: 'standard', mode: 'system', accent: '', fontFamily: '', fontSize: 14,
  tabSize: 4, useTabs: false, detectIndent: true, wrap: false, lineNumbers: true, activeLine: true, whitespace: false,
  closeBrackets: true, autocomplete: true, restoreSession: true, trimTrailing: false, finalNewline: false,
  newEol: 'auto', newEncoding: 'utf8', pythonMode: 'env', pythonPath: '', saveBeforeRun: true, clearConsoleOnRun: true,
  pythonCheck: true, recent: [], consoleHeight: 220, previewWidth: 44, consoleOpen: false,
};
const DEFAULT_FONT = '"Cascadia Mono", "Cascadia Code", Consolas, "JetBrains Mono", "SF Mono", Menlo, "DejaVu Sans Mono", "Liberation Mono", monospace';

let S = { ...DEFAULTS };
let INFO = { platform: 'win32' };
let systemDark = true;
let MAC = false;
const T = (key, vars) => i18n.t(S.language || i18n.guess(navigator.language), key, vars);

const tabs = [];
let active = null;
let view = null;
let nextId = 1;
let untitled = 1;
const closed = [];
let pyInfo = null;
let sessionTimer = null;
let consoleApi = null;
let previewApi = null;

// ---------------------------------------------------------------- Einstellungen
function saveSettings() {
  api.setSettings(S);
}
function update(patch) {
  const before = { ...S };
  Object.assign(S, patch);
  saveSettings();
  const relabelNeeded = 'language' in patch && patch.language !== before.language;
  if (['theme', 'mode', 'accent'].some((k) => k in patch)) applyLook();
  if ('fontFamily' in patch || 'fontSize' in patch) applyFont();
  const editorKeys = ['wrap', 'lineNumbers', 'activeLine', 'whitespace', 'closeBrackets', 'autocomplete', 'pythonCheck'];
  if (editorKeys.some((k) => k in patch)) reconfigureAll();
  if ('tabSize' in patch || 'useTabs' in patch) {
    for (const tb of tabs) if (!tb.indentDetected) {
      tb.useTabs = S.useTabs;
      tb.tabSize = S.tabSize;
    }
    reconfigureAll();
  }
  if ('pythonMode' in patch || 'pythonPath' in patch) pyInfo = null;
  if (relabelNeeded) relabel();
  else renderChrome();
}

function applyLook() {
  const { dark } = applyTheme(S, systemDark);
  for (const tb of tabs) tb.state = tb === active ? tb.state : tb.state.update({ effects: E.reconfigure(editorOptions(tb), ['dark']) }).state;
  if (view && active) view.dispatch({ effects: E.reconfigure(editorOptions(active), ['dark']) });  // ohne Tab (Startbildschirm) nichts zu tun
  document.documentElement.dataset.dark = dark ? '1' : '0';
  if (previewApi) previewApi.reset();
  updatePreview();
}
function applyFont() {
  const root = document.documentElement.style;
  root.setProperty('--editor-font', S.fontFamily || DEFAULT_FONT);
  root.setProperty('--editor-size', `${S.fontSize}px`);
  if (view) view.requestMeasure();
}

// ---------------------------------------------------------------- Editor-Optionen pro Tab
const isPython = (tb) => tb && tb.lang && tb.lang.name === 'Python';
const kindOf = (tb) => {
  if (!tb || !tb.lang) return '';
  if (tb.lang.name === 'Markdown') return 'markdown';
  if (tb.lang.name === 'HTML') return 'html';
  return '';
};

let pyLinter = null;
function pythonLint() {
  if (!pyLinter) {
    pyLinter = E.pythonLinter(async (code) => {
      const py = await getPython(false);
      const exe = py && (py.python || py.base);
      return exe ? api.py.check(exe, code) : null;
    }, T('syntaxError'));
  }
  return pyLinter;
}

function editorOptions(tb) {
  return {
    support: tb.support || [],
    tabSize: tb.tabSize,
    useTabs: tb.useTabs,
    wrap: S.wrap,
    lineNumbers: S.lineNumbers,
    activeLine: S.activeLine,
    whitespace: S.whitespace,
    closeBrackets: S.closeBrackets,
    autocomplete: S.autocomplete,
    lint: S.pythonCheck && isPython(tb) ? pythonLint() : null,
    readOnly: tb.readOnly,
    phrases: phrases(),
    dark: document.documentElement.dataset.mode === 'dark',
  };
}

function phrases() {
  const k = (key) => T(key);
  return {
    Find: k('cmFind'), Replace: k('cmReplace'), next: k('cmNext'), previous: k('cmPrevious'), all: k('cmAll'),
    'match case': k('cmMatchCase'), 'by word': k('cmByWord'), regexp: k('cmRegexp'), replace: k('cmReplaceOne'),
    'replace all': k('cmReplaceAll'), close: k('close'), 'Go to line': k('goToLine'), go: 'OK',
    'Folded lines': k('cmFolded'), 'Unfolded lines': k('cmUnfolded'), to: '–', 'folded code': k('cmFolded'),
    unfold: k('cmUnfold'), 'Fold line': k('cmFoldLine'), 'Unfold line': k('cmUnfoldLine'),
    'current match': k('cmCurrentMatch'), 'on line': k('cmOnLine'),
  };
}

function reconfigureAll(keys) {
  for (const tb of tabs) {
    const effects = E.reconfigure(editorOptions(tb), keys);
    if (tb === active && view) view.dispatch({ effects });
    else tb.state = tb.state.update({ effects }).state;
  }
}

// ---------------------------------------------------------------- Tabs
const baseName = (p) => (p ? p.split(/[\\/]/).pop() : '');
const dirName = (p) => (p ? p.replace(/[\\/][^\\/]*$/, '') : '');
const tabTitle = (tb) => (tb.path ? baseName(tb.path) : tb.title || T('untitled', { n: tb.untitled }));
const defaultEol = () => (S.newEol === 'auto' ? (INFO.platform === 'win32' ? 'crlf' : 'lf') : S.newEol);

function makeListener() {
  return E.EditorView.updateListener.of((u) => {
    if (!active || u.state !== view.state) return;
    if (u.docChanged) {
      active.state = u.state;
      const dirty = !active.saved || !u.state.doc.eq(active.saved);
      if (dirty !== active.dirty) {
        active.dirty = dirty;
        renderTabs();
        updateTitle();
      }
      scheduleSession();
      schedulePreview();
    }
    if (u.docChanged || u.selectionSet) renderStatus();
  });
}

async function attachLanguage(tb, lang) {
  tb.lang = lang;
  tb.support = null;
  if (lang) {
    try {
      tb.support = lang.support || (await lang.load());
    } catch {
      tb.support = null;
    }
  }
  // Makefiles brauchen echte Tabs
  if (lang && lang.name === 'Makefile') tb.useTabs = true;
  const effects = E.reconfigure(editorOptions(tb), ['lang', 'lint', 'indent']);
  if (tb === active && view) view.dispatch({ effects });
  else tb.state = tb.state.update({ effects }).state;
  if (tb === active) {
    renderChrome();
    updatePreview();
  }
}

function newTabObject({ path = null, text = '', encoding, bom, eol, mtime = null, readOnly = false, title = '' }) {
  const tb = {
    id: nextId++, path, title, untitled: path ? 0 : untitled++, encoding: encoding || (S.newEncoding === 'utf8bom' ? 'utf8' : 'utf8'),
    bom: bom ?? (!path && S.newEncoding === 'utf8bom'), eol: eol || defaultEol(), mtime, readOnly, dirty: false, lang: null,
    support: null, useTabs: S.useTabs, tabSize: S.tabSize, indentDetected: false, scroll: null, external: null,
  };
  if (S.detectIndent && text) {
    const ind = E.detectIndentation(text);
    if (ind) Object.assign(tb, ind.useTabs ? { useTabs: true } : { useTabs: false, tabSize: ind.size }, { indentDetected: true });
  }
  tb.state = E.createState(text, editorOptions(tb), [makeListener()]);
  tb.saved = path ? tb.state.doc : null;
  return tb;
}

function addTab(tb, { activate = true, index } = {}) {
  if (index == null) tabs.push(tb);
  else tabs.splice(index, 0, tb);
  if (activate) activateTab(tb);
  else renderTabs();
  watchFiles();
  scheduleSession();
  return tb;
}

function activateTab(tb) {
  if (!tb) return;
  if (active && view && active !== tb) {
    active.state = view.state;
    active.scroll = { top: view.scrollDOM.scrollTop, left: view.scrollDOM.scrollLeft };
  }
  active = tb;
  ensureView();
  view.setState(tb.state);
  if (tb.scroll) {
    const { top, left } = tb.scroll;
    requestAnimationFrame(() => {
      view.scrollDOM.scrollTop = top;
      view.scrollDOM.scrollLeft = left;
    });
  }
  $('#welcome').classList.add('hidden');
  $('#editor').classList.remove('hidden');
  renderChrome();
  updateTitle();
  if (previewApi) previewApi.reset();
  updatePreview();
  setTimeout(() => !dialogOpen() && view.focus(), 0);
  scheduleSession();
}

function ensureView() {
  if (view) return;
  view = new E.EditorView({ parent: $('#editor'), state: active.state });
  // Strg+Mausrad = Schrift größer/kleiner (statt das ganze Fenster zu zoomen)
  $('#editor').addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    zoom(e.deltaY < 0 ? 1 : -1);
  }, { passive: false });
}

async function closeTab(tb, { force = false } = {}) {
  if (!tb) return true;
  if (tb.dirty && !force) {
    if (tb !== active) activateTab(tb);
    const r = await dialog({
      title: T('unsavedTitle'),
      body: h('p', { class: 'dialog-text', text: T('unsavedText', { name: tabTitle(tb) }) }),
      buttons: [
        { label: T('dontSave'), value: 'discard', danger: true, left: true },
        { label: T('cancel'), value: 'cancel' },
        { label: T('save'), value: 'save', primary: true },
      ],
      cancelValue: 'cancel',
    });
    if (r === 'cancel') return false;
    if (r === 'save' && !(await save(tb))) return false;
  }
  const i = tabs.indexOf(tb);
  if (i < 0) return true;
  if (tb === active && view) tb.state = view.state;
  closed.push({ path: tb.path, sel: tb.state.selection.main.head });
  if (closed.length > 20) closed.shift();
  tabs.splice(i, 1);
  if (tb === active) {
    active = null;
    const next = tabs[i] || tabs[i - 1];
    if (next) activateTab(next);
    else showWelcome();
  }
  renderTabs();
  watchFiles();
  scheduleSession();
  return true;
}

async function closeMany(list) {
  for (const tb of list) if (!(await closeTab(tb))) return false;
  return true;
}

function showWelcome() {
  active = null;
  $('#editor').classList.add('hidden');
  const w = $('#welcome');
  w.classList.remove('hidden');
  w.textContent = '';
  const recent = (S.recent || []).slice(0, 8);
  w.append(h('div', { class: 'welcome-card' },
    h('div', { class: 'welcome-logo', html: logoSvg() }),
    h('div', { class: 'welcome-title', text: 'Textline' }),
    h('div', { class: 'welcome-sub', text: T('welcomeSub') }),
    h('div', { class: 'welcome-actions' },
      h('button', { class: 'btn primary', html: `${icon('file', 16)}<span>${T('newFile')}</span>`, onclick: () => newFile() }),
      h('button', { class: 'btn', html: `${icon('python', 16)}<span>${T('newPython')}</span>`, onclick: () => newFile('Python') }),
      h('button', { class: 'btn', html: `${icon('open', 16)}<span>${T('open')}</span>`, onclick: () => openDialog() })),
    recent.length ? h('div', { class: 'welcome-recent' },
      h('div', { class: 'welcome-head', text: T('recent') }),
      recent.map((p) => h('button', { class: 'recent-item', title: p, onclick: () => openPaths([p]) },
        h('span', { class: 'recent-name', text: baseName(p) }), h('span', { class: 'recent-dir', text: dirName(p) })))) : null,
    h('div', { class: 'welcome-keys' },
      [['Mod+N', 'newFile'], ['Mod+O', 'open'], ['F5', 'run'], ['Mod+F', 'find'], ['Mod+,', 'settings']].map(([k, label]) =>
        h('div', {}, h('kbd', { text: keyLabel(k, MAC) }), h('span', { text: T(label) }))))));
  renderChrome();
  updateTitle();
  updatePreview();
}

function logoSvg() {
  return '<svg viewBox="0 0 64 64" width="56" height="56"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc24b"/><stop offset="1" stop-color="#f0782a"/></linearGradient></defs><rect x="4" y="4" width="56" height="56" rx="14" fill="url(#lg)"/><path d="M17 19h24M17 29h30M17 41h14" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/><path d="M38 36v10" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>';
}

// ---------------------------------------------------------------- Dateien
function addRecent(p) {
  S.recent = [p, ...(S.recent || []).filter((x) => x !== p)].slice(0, 15);
  saveSettings();
}

async function readFileTab(p, encoding) {
  const r = await api.readFile(p, encoding);
  if (r.error) {
    const msg = r.error === 'ENOENT' ? T('errNotFound', { name: baseName(p) })
      : r.error === 'EISDIR' ? T('errFolder', { name: baseName(p) })
        : r.error === 'ETOOBIG' ? T('errTooBig', { name: baseName(p), mb: Math.round(r.size / 1048576) })
          : r.error === 'EACCES' || r.error === 'EPERM' ? T('errNoAccess', { name: baseName(p) })
            : T('errOpen', { name: baseName(p), error: r.error });
    toast(msg, { kind: 'error', ms: 4500 });
    return null;
  }
  return r;
}

async function openPaths(paths, { activate = true } = {}) {
  let last = null;
  for (const p of paths) {
    const existing = tabs.find((tb) => tb.path && samePath(tb.path, p));
    if (existing) {
      last = existing;
      continue;
    }
    const r = await readFileTab(p);
    if (!r) {
      S.recent = (S.recent || []).filter((x) => x !== p);
      continue;
    }
    if (r.binary) {
      const go = await dialog({
        title: T('binaryTitle'),
        body: h('p', { class: 'dialog-text', text: T('binaryText', { name: baseName(p) }) }),
        buttons: [{ label: T('cancel'), value: 'no' }, { label: T('binaryOpen'), value: 'yes', primary: true }],
        cancelValue: 'no',
      });
      if (go !== 'yes') continue;
    }
    // Leerer, unveränderter "Unbenannt"-Tab wird ersetzt (wie im Windows-Editor)
    const replace = tabs.length === 1 && !active?.path && !active?.dirty && active?.state.doc.length === 0 ? active : null;
    const tb = newTabObject({ path: p, text: r.text, encoding: r.encoding, bom: r.bom, eol: r.eol, mtime: r.mtime, readOnly: r.binary });
    addTab(tb, { activate: false, index: replace ? 0 : undefined });
    if (replace) tabs.splice(tabs.indexOf(replace), 1);
    attachLanguage(tb, detectLanguage(p, r.text.slice(0, 200).split('\n')[0]));
    addRecent(p);
    last = tb;
  }
  if (last && activate) activateTab(last);
  renderTabs();
  watchFiles();
  return last;
}
const samePath = (a, b) => (INFO.platform === 'linux' ? a === b : a.toLowerCase() === b.toLowerCase());

async function openDialog() {
  const dir = active && active.path ? dirName(active.path) : undefined;
  const paths = await api.openDialog({ title: T('open'), defaultPath: dir, filters: fileFilters() });
  if (paths.length) openPaths(paths);
}

function fileFilters(lang) {
  const list = [{ name: T('allFiles'), extensions: ['*'] }];
  if (lang && lang.extensions && lang.extensions.length) list.unshift({ name: displayName(lang), extensions: lang.extensions.slice(0, 12) });
  list.push({ name: T('textFiles'), extensions: ['txt', 'md', 'log', 'csv', 'ini', 'json', 'xml', 'yml', 'yaml'] });
  list.push({ name: 'Python', extensions: ['py', 'pyw'] }, { name: 'Web', extensions: ['html', 'htm', 'css', 'js', 'ts'] });
  return list;
}

function newFile(langName) {
  const tb = newTabObject({});
  addTab(tb);
  if (langName) attachLanguage(tb, findLanguage(langName));
  return tb;
}

/** Text für die Datei: optional Leerzeichen am Zeilenende weg und eine Leerzeile am Ende */
function prepareForSave(tb) {
  let state = tb === active ? view.state : tb.state;
  const changes = [];
  if (S.trimTrailing) changes.push(...E.trailingWhitespaceChanges(state));
  if (S.finalNewline && state.doc.length && state.doc.sliceString(state.doc.length - 1) !== '\n') changes.push({ from: state.doc.length, insert: '\n' });
  if (changes.length) {
    const tr = state.update({ changes, userEvent: 'input' });
    if (tb === active) view.dispatch(tr);
    else tb.state = tr.state;
    state = tb === active ? view.state : tb.state;
  }
  return state;
}

async function save(tb = active) {
  if (!tb) return false;
  if (!tb.path) return saveAs(tb);
  const state = prepareForSave(tb);
  const r = await api.writeFile(tb.path, state.doc.toString(), { encoding: tb.encoding, bom: tb.bom, eol: tb.eol });
  if (r.error) {
    toast(r.error === 'EACCES' || r.error === 'EPERM' ? T('errSaveAccess', { name: tabTitle(tb) }) : T('errSave', { name: tabTitle(tb), error: r.error }), { kind: 'error', ms: 5000 });
    return false;
  }
  tb.saved = state.doc;
  tb.state = state;
  tb.mtime = r.mtime;
  tb.dirty = false;
  tb.external = null;
  renderChrome();
  updateTitle();
  scheduleSession();
  return true;
}

async function saveAs(tb = active) {
  if (!tb) return false;
  const name = tb.path ? baseName(tb.path) : `${tabTitle(tb).replace(/\s+/g, '')}.${defaultExtension(tb.lang)}`;
  const dir = tb.path ? dirName(tb.path) : (S.lastDir || INFO.home);
  const file = await api.saveDialog({ title: T('saveAs'), defaultPath: `${dir}${INFO.platform === 'win32' ? '\\' : '/'}${name}`, filters: fileFilters(tb.lang) });
  if (!file) return false;
  const oldPath = tb.path;
  tb.path = file;
  if (!(await save(tb))) {
    tb.path = oldPath;
    return false;
  }
  S.lastDir = dirName(file);
  addRecent(file);
  if (!tb.langOverride) {
    const lang = detectLanguage(file, (tb === active ? view.state : tb.state).doc.line(1).text);
    if ((lang && lang.name) !== (tb.lang && tb.lang.name)) attachLanguage(tb, lang);
  }
  watchFiles();
  renderChrome();
  return true;
}

async function saveAll() {
  for (const tb of [...tabs]) if (tb.dirty && !(await save(tb))) return false;
  return true;
}

async function reload(tb = active, encoding) {
  if (!tb || !tb.path) return;
  if (tb.dirty && !encoding) {
    const r = await dialog({
      title: T('reloadTitle'),
      body: h('p', { class: 'dialog-text', text: T('reloadText', { name: tabTitle(tb) }) }),
      buttons: [{ label: T('cancel'), value: 'no' }, { label: T('reload'), value: 'yes', primary: true, danger: true }],
      cancelValue: 'no',
    });
    if (r !== 'yes') return;
  }
  const r = await readFileTab(tb.path, encoding);
  if (!r) return;
  const st = tb === active ? view.state : tb.state;
  const head = Math.min(st.selection.main.head, r.text.length);
  const tr = st.update({ changes: { from: 0, to: st.doc.length, insert: r.text }, selection: { anchor: head } });
  if (tb === active) view.dispatch(tr);
  else tb.state = tr.state;
  Object.assign(tb, { encoding: r.encoding, bom: r.bom, eol: r.eol, mtime: r.mtime, external: null });
  tb.saved = (tb === active ? view.state : tb.state).doc;
  tb.dirty = false;
  renderChrome();
  updateTitle();
}

function watchFiles() {
  api.watch(tabs.filter((tb) => tb.path).map((tb) => tb.path));
}

api.onFileChanged(async ({ path: p, deleted }) => {
  const tb = tabs.find((x) => x.path && samePath(x.path, p));
  if (!tb) return;
  if (deleted) {
    tb.external = 'deleted';
    tb.dirty = true;
    renderChrome();
    return;
  }
  if (!tb.dirty) {
    await reload(tb);
    toast(T('reloadedExternal', { name: tabTitle(tb) }));
  } else {
    tb.external = 'changed';
    renderChrome();
  }
});

// ---------------------------------------------------------------- Sitzung (wie beim Windows-Editor/Notepad++)
function sessionData() {
  if (active && view) active.state = view.state;
  return {
    active: tabs.indexOf(active),
    untitled,
    tabs: tabs.map((tb) => ({
      path: tb.path,
      untitled: tb.untitled,
      title: tb.title,
      content: tb.dirty || !tb.path ? tb.state.doc.toString() : undefined,
      dirty: tb.dirty,
      encoding: tb.encoding,
      bom: tb.bom,
      eol: tb.eol,
      lang: tb.langOverride ? (tb.lang ? tb.lang.name : PLAIN) : undefined,
      useTabs: tb.useTabs,
      tabSize: tb.tabSize,
      sel: tb.state.selection.main.head,
      scroll: tb === active && view ? view.scrollDOM.scrollTop : tb.scroll ? tb.scroll.top : 0,
    })),
  };
}
function scheduleSession() {
  clearTimeout(sessionTimer);
  sessionTimer = setTimeout(() => S.restoreSession && api.setSession(sessionData()), 1200);
}

async function restoreSession() {
  const data = await api.getSession();
  if (!data || !Array.isArray(data.tabs)) return false;
  untitled = Math.max(1, data.untitled || 1);
  for (const s of data.tabs) {
    let text = s.content;
    let meta = { encoding: s.encoding, bom: s.bom, eol: s.eol };
    if (s.path && text === undefined) {
      if (!(await api.exists(s.path))) continue;
      const r = await api.readFile(s.path);
      if (r.error) continue;
      text = r.text;
      meta = { encoding: r.encoding, bom: r.bom, eol: r.eol, mtime: r.mtime };
    }
    if (text === undefined) continue;
    const tb = newTabObject({ path: s.path, text, ...meta, title: s.title });
    if (!s.path) tb.untitled = s.untitled || untitled++;
    if (s.useTabs !== undefined && s.tabSize) Object.assign(tb, { useTabs: s.useTabs, tabSize: s.tabSize, indentDetected: true });
    if (s.dirty) {
      tb.dirty = true;
      if (s.path) {
        // gespeicherten Stand von der Festplatte als Vergleich nehmen
        const r = await api.readFile(s.path);
        tb.saved = r.error ? null : E.EditorState.create({ doc: r.text }).doc;
        if (tb.saved && tb.saved.eq(tb.state.doc)) tb.dirty = false;
      }
    }
    const sel = Math.min(s.sel || 0, tb.state.doc.length);
    tb.state = tb.state.update({ selection: { anchor: sel } }).state;
    tb.scroll = { top: s.scroll || 0, left: 0 };
    tabs.push(tb);
    const lang = s.lang ? (s.lang === PLAIN ? null : findLanguage(s.lang)) : detectLanguage(s.path || '', text.slice(0, 200).split('\n')[0]);
    if (s.lang) tb.langOverride = true;
    attachLanguage(tb, lang);
  }
  if (!tabs.length) return false;
  activateTab(tabs[Math.min(Math.max(0, data.active), tabs.length - 1)]);
  watchFiles();
  return true;
}

api.onClosing(async (opts = {}) => {
  if (active && view) active.state = view.state;
  if (S.restoreSession) {
    await api.setSession(sessionData());
  } else {
    const dirty = tabs.filter((tb) => tb.dirty);
    if (dirty.length) {
      const r = await dialog({
        title: T('unsavedTitle'),
        body: h('p', { class: 'dialog-text', text: dirty.length === 1 ? T('unsavedText', { name: tabTitle(dirty[0]) }) : T('unsavedMany', { n: dirty.length }) }),
        buttons: [
          { label: T('dontSave'), value: 'discard', danger: true, left: true },
          { label: T('cancel'), value: 'cancel' },
          { label: dirty.length === 1 ? T('save') : T('saveAll'), value: 'save', primary: true },
        ],
        cancelValue: 'cancel',
      });
      if (r === 'cancel') return;
      if (r === 'save' && !(await saveAll())) return;
    }
    await api.setSession(null);
  }
  saveSettings();
  if (opts.update) api.updateReady();
  else api.closeNow();
});

// ---------------------------------------------------------------- Python
/** Interpreter holen. interactive = bei Bedarf eigene Umgebung anlegen und Hinweise zeigen */
async function getPython(interactive) {
  if (pyInfo && pyInfo.python && !pyInfo.needsEnv) return pyInfo;
  let r = await api.py.resolve(false);
  if (r.needsEnv && interactive) {
    const ok = await createEnv(r);
    if (!ok) return null;
    r = await api.py.resolve(false);
  }
  pyInfo = r;
  if (r.error || r.needsEnv) {
    if (interactive && r.error) showPythonMissing(r);
    return r.needsEnv ? { ...r, python: null } : null;
  }
  renderStatus();
  return r;
}

async function createEnv(r) {
  showConsole(true);
  consoleApi.info(T('envCreating', { version: r.version }));
  const res = await api.py.ensureEnv();
  if (res.ok) {
    consoleApi.info(T('envReady'));
    return true;
  }
  if (res.error === 'novenv') {
    await dialog({
      title: T('envFailed'),
      body: h('div', {}, h('p', { class: 'dialog-text', text: T('envNoVenv') }), h('pre', { class: 'code-hint', text: 'sudo apt install python3-venv' })),
      buttons: [{ label: T('close'), value: 'ok', primary: true }],
    });
  } else {
    consoleApi.info(`${T('envFailed')}\n${res.output || res.error || ''}`);
  }
  return false;
}

function showPythonMissing(r) {
  const linux = INFO.platform === 'linux';
  dialog({
    title: r.error === 'custom-broken' ? T('pyCustomBroken') : T('pyMissingTitle'),
    body: h('div', {},
      h('p', { class: 'dialog-text', text: r.error === 'custom-broken' ? T('pyCustomBrokenText', { path: r.path }) : T('pyMissingText') }),
      linux ? h('pre', { class: 'code-hint', text: 'Arch:    sudo pacman -S python\nUbuntu:  sudo apt install python3 python3-venv\nFedora:  sudo dnf install python3' }) : null),
    buttons: [
      { label: T('close'), value: 'close' },
      { label: T('pyDownload'), value: 'dl', primary: true },
    ],
  }).then((v) => v === 'dl' && api.openExternal('https://www.python.org/downloads/'));
}

async function runCurrent() {
  const tb = active;
  if (!tb) return;
  const kind = kindOf(tb);
  if (!isPython(tb)) {
    if (kind === 'html' && tb.path) {
      if (tb.dirty) await save(tb);
      return api.openPath(tb.path);
    }
    if (kind) return togglePreview(true);
    return toast(T('runOnlyPython'));
  }
  const py = await getPython(true);
  if (!py || !py.python) return;
  let file = tb.path;
  if (tb.dirty || !file) {
    if (file && S.saveBeforeRun) {
      if (!(await save(tb))) return;
    } else {
      file = await api.tempFile(tb.path ? baseName(tb.path) : 'untitled.py', (tb === active ? view.state : tb.state).doc.toString());
    }
  }
  showConsole(true);
  await consoleApi.run(py, file, tb.path ? dirName(tb.path) : null, tabTitle(tb), S.clearConsoleOnRun);
  renderChrome();
}

function stopRun() {
  if (consoleApi && consoleApi.isRunning()) consoleApi.stop();
}

function showConsole(open) {
  const c = $('#console');
  const visible = open ?? c.classList.contains('hidden');
  c.classList.toggle('hidden', !visible);
  $('#console-split').classList.toggle('hidden', !visible);
  S.consoleOpen = visible;
  saveSettings();
  if (visible) consoleApi.focus();
  else if (view) view.focus();
  renderChrome();
}

// ---------------------------------------------------------------- Vorschau
let previewTimer = null;
let previewOpen = false;
function schedulePreview() {
  if (!previewOpen) return;
  clearTimeout(previewTimer);
  previewTimer = setTimeout(updatePreview, 250);
}
function updatePreview() {
  const kind = kindOf(active);
  const show = previewOpen && !!kind;
  $('#preview-pane').classList.toggle('hidden', !show);
  $('#preview-split').classList.toggle('hidden', !show);
  if (show) previewApi.render(kind, view.state.doc.toString(), active.path ? dirName(active.path) : '');
}
function togglePreview(force) {
  previewOpen = force ?? !previewOpen;
  if (previewOpen && !kindOf(active)) {
    previewOpen = false;
    toast(T('previewOnly'));
  }
  updatePreview();
  renderChrome();
}

// ---------------------------------------------------------------- Kleine Dialoge
async function goToLineDialog() {
  if (!active) return;
  const doc = view.state.doc;
  const cur = doc.lineAt(view.state.selection.main.head).number;
  const val = await prompt(T('goToLine'), T('goToLineLabel', { max: doc.lines }), String(cur), { okLabel: T('go'), cancelLabel: T('cancel'), inputMode: 'numeric' });
  if (val == null) return;
  const [l, c] = val.split(/[:,\s]+/).map((x) => parseInt(x, 10));
  if (l) E.goToLine(view, l, c || 1);
}

async function languagePicker() {
  if (!active) return;
  const input = h('input', { class: 'input', placeholder: T('langSearch'), spellcheck: 'false' });
  const list = h('div', { class: 'lang-list' });
  const names = [PLAIN, ...POPULAR, ...ALL.map((l) => l.name).filter((n) => !POPULAR.includes(n)).sort((a, b) => a.localeCompare(b))];
  let hot = 0;
  let items = [];
  let closeFn;
  const pick = (name) => {
    active.langOverride = true;
    attachLanguage(active, name === PLAIN ? null : findLanguage(name));
    scheduleSession();
    closeFn('ok');
  };
  const paint = () => {
    const q = input.value.trim().toLowerCase();
    items = names.filter((n, i) => names.indexOf(n) === i).filter((n) => {
      if (!q) return true;
      const l = findLanguage(n);
      return n.toLowerCase().includes(q) || (l && (l.alias.some((a) => a.includes(q)) || l.extensions.some((e) => e === q.replace(/^\./, ''))));
    });
    hot = Math.min(hot, Math.max(0, items.length - 1));
    list.textContent = '';
    const cur = active.lang ? active.lang.name : PLAIN;
    items.forEach((n, i) => {
      const l = findLanguage(n);
      const row = h('div', { class: `lang-row${i === hot ? ' hot' : ''}${n === cur ? ' cur' : ''}` },
        h('span', { text: n === PLAIN ? T('plainText') : displayName(l) }),
        h('span', { class: 'muted', text: l && l.extensions.length ? `.${l.extensions.slice(0, 3).join('  .')}` : '' }));
      row.addEventListener('click', () => pick(n));
      list.append(row);
    });
    const el = list.children[hot];
    if (el) el.scrollIntoView({ block: 'nearest' });
  };
  input.addEventListener('input', () => {
    hot = 0;
    paint();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      hot = Math.max(0, Math.min(items.length - 1, hot + (e.key === 'ArrowDown' ? 1 : -1)));
      paint();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[hot]) pick(items[hot]);
    }
  });
  paint();
  await dialog({
    title: T('chooseLanguage'),
    body: h('div', { class: 'lang-picker no-enter' }, input, list),
    buttons: [{ label: T('cancel'), value: 'cancel' }],
    cancelValue: 'cancel',
    onOpen: (_card, close) => {
      closeFn = close;
      setTimeout(() => input.focus(), 0);
    },
  });
}

function indentMenu(x, y) {
  if (!active) return;
  const tb = active;
  const set = (patch) => {
    Object.assign(tb, patch, { indentDetected: true });
    view.dispatch({ effects: E.reconfigure(editorOptions(tb), ['indent']) });
    renderStatus();
    scheduleSession();
  };
  showMenu([
    { header: T('indentWith') },
    { label: T('spaces'), checked: !tb.useTabs, run: () => set({ useTabs: false }) },
    { label: T('tabs'), checked: tb.useTabs, run: () => set({ useTabs: true }) },
    '-',
    { header: T('tabWidth') },
    ...[2, 3, 4, 8].map((n) => ({ label: String(n), checked: tb.tabSize === n, run: () => set({ tabSize: n }) })),
    '-',
    { label: T('toSpaces'), run: () => view.dispatch({ changes: E.convertIndentation(view.state, false, tb.tabSize) }) || set({ useTabs: false }) },
    { label: T('toTabs'), run: () => view.dispatch({ changes: E.convertIndentation(view.state, true, tb.tabSize) }) || set({ useTabs: true }) },
  ], x, y, { alignRight: true });
}

const ENCODINGS = [['utf8', 'UTF-8'], ['utf8bom', 'UTF-8 BOM'], ['utf16le', 'UTF-16 LE'], ['utf16be', 'UTF-16 BE'], ['windows1252', 'Windows-1252 (Westeuropa)'], ['iso88591', 'ISO-8859-1'], ['iso885915', 'ISO-8859-15'], ['windows1250', 'Windows-1250'], ['windows1251', 'Windows-1251'], ['shiftjis', 'Shift JIS'], ['gbk', 'GBK']];
const encLabel = (tb) => {
  if (tb.encoding === 'utf8') return tb.bom ? 'UTF-8 BOM' : 'UTF-8';
  const e = ENCODINGS.find(([k]) => k === tb.encoding);
  return e ? e[1].split(' (')[0] : tb.encoding;
};
function encodingMenu(x, y) {
  if (!active) return;
  const tb = active;
  const cur = tb.encoding === 'utf8' && tb.bom ? 'utf8bom' : tb.encoding;
  const setEnc = (k) => {
    tb.encoding = k === 'utf8bom' ? 'utf8' : k;
    tb.bom = k === 'utf8bom' || (k.startsWith('utf16') && tb.bom);
    if (k.startsWith('utf16')) tb.bom = true;
    tb.dirty = true;
    renderChrome();
    updateTitle();
  };
  showMenu([
    { header: T('saveWithEncoding') },
    ...ENCODINGS.map(([k, label]) => ({ label, checked: k === cur, run: () => setEnc(k) })),
    '-',
    { label: T('reopenWithEncoding'), disabled: !tb.path, submenu: ENCODINGS.filter(([k]) => k !== 'utf8bom').map(([k, label]) => ({ label, run: () => reload(tb, k) })) },
  ], x, y, { alignRight: true });
}
function eolMenu(x, y) {
  if (!active) return;
  const tb = active;
  const set = (eol) => {
    if (tb.eol === eol) return;
    tb.eol = eol;
    tb.dirty = true;
    renderChrome();
    updateTitle();
  };
  showMenu([
    { label: 'LF  (Linux, macOS)', checked: tb.eol === 'lf', run: () => set('lf') },
    { label: 'CRLF  (Windows)', checked: tb.eol === 'crlf', run: () => set('crlf') },
  ], x, y, { alignRight: true });
}

function zoom(d) {
  const size = d === 0 ? 14 : Math.min(40, Math.max(8, S.fontSize + d));
  if (size === S.fontSize) return;
  S.fontSize = size;
  applyFont();
  saveSettings();
  renderStatus();
}

async function printCurrent() {
  if (!active) return;
  const colors = printColors(S.theme);
  const { html, css } = E.highlightedHtml(view.state, colors);
  const title = tabTitle(active).replace(/[<>&]/g, '');
  const page = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
    @page { margin: 16mm 14mm; }
    body { margin: 0; font: 10pt/1.45 ${S.fontFamily || DEFAULT_FONT}; color: #111; }
    pre { margin: 0; white-space: pre-wrap; word-break: break-word; font: inherit; tab-size: ${active.tabSize}; }
    .head { font: 9pt system-ui, sans-serif; color: #666; border-bottom: 1px solid #ccc; padding-bottom: 6px; margin-bottom: 10px; }
    ${css}
  </style></head><body><div class="head">${title}</div><pre>${html}</pre></body></html>`;
  const r = await api.printHtml(page);
  if (r && !r.ok && r.reason && r.reason !== 'cancelled' && r.reason !== 'Print job canceled') toast(T('printFailed', { reason: r.reason }), { kind: 'error' });
}

function aboutDialog() {
  dialog({
    title: T('about'),
    body: h('div', { class: 'about' },
      h('div', { class: 'welcome-logo', html: logoSvg() }),
      h('div', { class: 'about-name', text: `Textline ${INFO.version || ''}` }),
      h('p', { class: 'dialog-text', text: T('aboutText') }),
      h('p', { class: 'muted', text: '© 2026 W Software · MIT License · CodeMirror' })),
    buttons: [
      { label: 'mert.win', value: 'web', left: true },
      { label: T('close'), value: 'ok', primary: true },
    ],
  }).then((v) => v === 'web' && api.openExternal('https://mert.win/text/'));
}

function shortcutsDialog() {
  const rows = Object.values(CMD).filter((c) => c.keys).map((c) => h('div', { class: 'key-row' }, h('span', { text: T(c.label) }), h('kbd', { text: keyLabel(c.keys, MAC) })));
  const extra = [['Tab / Shift+Tab', 'kIndent'], ['Alt+↑ / Alt+↓', 'moveLine'], ['Shift+Alt+↓', 'duplicateLine'], ['Mod+D', 'addNextOccurrence'], ['Alt + Klick', 'kMultiCursor'], ['Mod+Shift+[ / ]', 'kFold'], ['Mod+Space', 'kSuggest']];
  for (const [k, label] of extra) rows.push(h('div', { class: 'key-row' }, h('span', { text: T(label) }), h('kbd', { text: k.replace('Mod', MAC ? '⌘' : 'Ctrl') })));
  dialog({ title: T('shortcuts'), body: h('div', { class: 'keys-list' }, rows), buttons: [{ label: T('close'), value: 'ok', primary: true }], wide: true });
}

// ---------------------------------------------------------------- Befehle
const ed = (fn, { focus = true } = {}) => () => {
  if (!view || !active) return;
  fn(view);
  if (focus) view.focus();
};
const transform = (f) => ed((v) => E.transformSelection(v, f));

const CMD = {
  newFile: { label: 'newFile', keys: 'Mod+N', run: () => newFile() },
  newPython: { label: 'newPython', run: () => newFile('Python') },
  open: { label: 'open', keys: 'Mod+O', run: openDialog },
  save: { label: 'save', keys: 'Mod+S', run: () => save() },
  saveAs: { label: 'saveAs', keys: 'Mod+Shift+S', run: () => saveAs() },
  saveAll: { label: 'saveAll', keys: 'Mod+Alt+S', run: saveAll },
  reload: { label: 'reload', run: () => reload() },
  print: { label: 'print', keys: 'Mod+P', run: printCurrent },
  closeTab: { label: 'closeTab', keys: 'Mod+W', run: () => closeTab(active) },
  closeAll: { label: 'closeAll', run: () => closeMany([...tabs]) },
  reopenClosed: { label: 'reopenClosed', keys: 'Mod+Shift+T', run: async () => {
    const last = closed.pop();
    if (last && last.path) {
      const tb = await openPaths([last.path]);
      if (tb) E.goToLine(view, view.state.doc.lineAt(Math.min(last.sel, view.state.doc.length)).number);
    }
  } },
  nextTab: { label: 'nextTab', keys: 'Mod+Tab', run: () => cycleTab(1) },
  prevTab: { label: 'prevTab', keys: 'Mod+Shift+Tab', run: () => cycleTab(-1) },
  nextTab2: { label: 'nextTab', keys: 'Mod+PageDown', run: () => cycleTab(1), hidden: true },
  prevTab2: { label: 'prevTab', keys: 'Mod+PageUp', run: () => cycleTab(-1), hidden: true },
  undo: { label: 'undo', run: ed(undo) },
  redo: { label: 'redo', run: ed(redo) },
  cut: { label: 'cut', run: ed(() => document.execCommand('cut')) },
  copy: { label: 'copy', run: ed(() => document.execCommand('copy')) },
  paste: { label: 'paste', run: ed(async (v) => {
    try {
      const text = await navigator.clipboard.readText();
      v.dispatch(v.state.replaceSelection(text));
    } catch {
      document.execCommand('paste');
    }
  }) },
  selectAll: { label: 'selectAll', run: ed(selectAll) },
  duplicateLine: { label: 'duplicateLine', run: ed(copyLineDown) },
  deleteLine: { label: 'deleteLine', run: ed(deleteLine) },
  moveUp: { label: 'moveLineUp', run: ed(moveLineUp) },
  moveDown: { label: 'moveLineDown', run: ed(moveLineDown) },
  indent: { label: 'indent', run: ed(indentMore) },
  outdent: { label: 'outdent', run: ed(indentLess) },
  comment: { label: 'toggleComment', run: ed(toggleComment) },
  upper: { label: 'upperCase', run: transform((s) => s.toUpperCase()) },
  lower: { label: 'lowerCase', run: transform((s) => s.toLowerCase()) },
  title: { label: 'titleCase', run: transform((s) => s.toLowerCase().replace(/(^|[\s_\-./])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())) },
  sortAsc: { label: 'sortLines', run: ed((v) => E.sortLines(v, false)) },
  sortDesc: { label: 'sortLinesDesc', run: ed((v) => E.sortLines(v, true)) },
  trim: { label: 'trimTrailing', run: ed((v) => v.dispatch({ changes: E.trailingWhitespaceChanges(v.state) })) },
  // Suchleiste: der Fokus gehört ins Suchfeld, nicht zurück in den Text
  find: { label: 'find', keys: 'Mod+F', run: ed(openSearchPanel, { focus: false }), noSteal: true },
  replace: { label: 'replace', keys: MAC ? 'Mod+Alt+F' : 'Mod+H', run: ed((v) => {
    openSearchPanel(v);
    setTimeout(() => {
      const r = v.dom.querySelector('.cm-search input[name=replace]');
      if (r) r.focus();
    }, 0);
  }, { focus: false }) },
  findNext: { label: 'findNext', keys: 'F3', run: ed(findNext), noSteal: true },
  findPrev: { label: 'findPrevious', keys: 'Shift+F3', run: ed(findPrevious), noSteal: true },
  selectAllMatches: { label: 'selectAllMatches', run: ed(selectSelectionMatches) },
  addNextOccurrence: { label: 'addNextOccurrence', run: ed(selectNextOccurrence) },
  goToLine: { label: 'goToLine', keys: 'Mod+G', run: goToLineDialog },
  matchBracket: { label: 'matchingBracket', run: ed(cursorMatchingBracket) },
  wrap: { label: 'wordWrap', keys: 'Alt+Z', run: () => update({ wrap: !S.wrap }) },
  lineNumbers: { label: 'lineNumbers', run: () => update({ lineNumbers: !S.lineNumbers }) },
  whitespace: { label: 'showWhitespace', run: () => update({ whitespace: !S.whitespace }) },
  activeLine: { label: 'highlightLine', run: () => update({ activeLine: !S.activeLine }) },
  preview: { label: 'preview', keys: 'Mod+Shift+V', run: () => togglePreview() },
  console: { label: 'console', keys: 'Mod+J', run: () => showConsole() },
  zoomIn: { label: 'zoomIn', keys: 'Mod+=', run: () => zoom(1) },
  zoomIn2: { label: 'zoomIn', keys: 'Mod++', run: () => zoom(1), hidden: true },
  zoomOut: { label: 'zoomOut', keys: 'Mod+-', run: () => zoom(-1) },
  zoomReset: { label: 'zoomReset', keys: 'Mod+0', run: () => zoom(0) },
  foldAll: { label: 'foldAll', run: ed(foldAll) },
  unfoldAll: { label: 'unfoldAll', run: ed(unfoldAll) },
  language: { label: 'chooseLanguage', run: languagePicker },
  run: { label: 'run', keys: 'F5', run: runCurrent },
  stop: { label: 'stop', keys: 'Shift+F5', run: stopRun },
  packages: { label: 'packages', run: () => openPackages({ api, T, getPython, onChanged: () => {} }) },
  openBrowser: { label: 'openInBrowser', run: async () => {
    if (!active || !active.path) return toast(T('saveFirst'));
    if (active.dirty) await save();
    api.openPath(active.path);
  } },
  reveal: { label: 'revealInFolder', run: () => active && active.path && api.reveal(active.path) },
  copyPath: { label: 'copyPath', run: () => active && active.path && navigator.clipboard.writeText(active.path).then(() => toast(T('pathCopied'))) },
  settings: { label: 'settings', keys: 'Mod+,', run: () => settingsDialog() },
  shortcuts: { label: 'shortcuts', run: shortcutsDialog },
  about: { label: 'about', run: aboutDialog },
  quit: { label: 'quit', run: () => window.close() },
};

function cycleTab(d) {
  if (tabs.length < 2 || !active) return;
  const i = tabs.indexOf(active);
  activateTab(tabs[(i + d + tabs.length) % tabs.length]);
}

const item = (id, extra = {}) => {
  const c = CMD[id];
  return { label: T(c.label), shortcut: keyLabel(c.keys, MAC), run: c.run, ...extra };
};
const noTab = () => !active;

function menus() {
  const recent = (S.recent || []).slice(0, 12);
  const py = isPython(active);
  return [
    { id: 'file', label: T('menuFile'), items: [
      item('newFile'), item('newPython'), item('open'),
      { label: T('recent'), submenu: () => recent.length ? [...recent.map((p) => ({ label: p.length > 70 ? `…${p.slice(-68)}` : p, run: () => openPaths([p]) })), '-', { label: T('clearRecent'), run: () => update({ recent: [] }) }] : [{ label: T('noRecent'), disabled: true }] },
      '-', item('save', { disabled: noTab() }), item('saveAs', { disabled: noTab() }), item('saveAll', { disabled: !tabs.some((t) => t.dirty) }),
      item('reload', { disabled: !active || !active.path }),
      '-', item('print', { disabled: noTab() }), item('reveal', { disabled: !active || !active.path }), item('copyPath', { disabled: !active || !active.path }),
      '-', item('closeTab', { disabled: noTab() }), item('closeAll', { disabled: !tabs.length }), item('reopenClosed', { disabled: !closed.length }),
      '-', item('quit'),
    ] },
    { id: 'edit', label: T('menuEdit'), items: [
      { ...item('undo'), shortcut: keyLabel('Mod+Z', MAC), disabled: noTab() }, { ...item('redo'), shortcut: keyLabel(MAC ? 'Mod+Shift+Z' : 'Mod+Y', MAC), disabled: noTab() },
      '-', { ...item('cut'), shortcut: keyLabel('Mod+X', MAC) }, { ...item('copy'), shortcut: keyLabel('Mod+C', MAC) }, { ...item('paste'), shortcut: keyLabel('Mod+V', MAC) }, { ...item('selectAll'), shortcut: keyLabel('Mod+A', MAC) },
      '-', { ...item('duplicateLine'), shortcut: 'Shift+Alt+↓' }, { ...item('deleteLine'), shortcut: keyLabel('Mod+Shift+K', MAC) }, { ...item('moveUp'), shortcut: 'Alt+↑' }, { ...item('moveDown'), shortcut: 'Alt+↓' },
      '-', { ...item('indent'), shortcut: keyLabel('Mod+]', MAC) }, { ...item('outdent'), shortcut: keyLabel('Mod+[', MAC) }, { ...item('comment'), shortcut: keyLabel('Mod+/', MAC) },
      '-', { label: T('convertCase'), submenu: [item('upper'), item('lower'), item('title')] },
      { label: T('lines'), submenu: [item('sortAsc'), item('sortDesc'), item('trim')] },
    ] },
    { id: 'search', label: T('menuSearch'), items: [
      item('find'), item('replace'), item('findNext'), item('findPrev'),
      '-', { ...item('addNextOccurrence'), shortcut: keyLabel('Mod+D', MAC) }, { ...item('selectAllMatches'), shortcut: keyLabel('Mod+Shift+L', MAC) },
      '-', item('goToLine'), { ...item('matchBracket'), shortcut: keyLabel('Mod+Shift+\\', MAC) },
    ] },
    { id: 'view', label: T('menuView'), items: [
      item('wrap', { checked: S.wrap }), item('lineNumbers', { checked: S.lineNumbers }), item('whitespace', { checked: S.whitespace }), item('activeLine', { checked: S.activeLine }),
      '-', item('preview', { checked: previewOpen && !!kindOf(active), disabled: !kindOf(active) }), item('console', { checked: !$('#console').classList.contains('hidden') }),
      '-', item('zoomIn'), item('zoomOut'), item('zoomReset'),
      '-', item('foldAll'), item('unfoldAll'),
      '-', { label: T('setTheme'), submenu: THEMES.map((th) => ({ label: T(`theme_${th.id}`), checked: S.theme === th.id, run: () => update({ theme: th.id }) })) },
      { label: T('setMode'), submenu: [['system', 'modeSystem'], ['light', 'modeLight'], ['dark', 'modeDark']].map(([m, k]) => ({ label: T(k), checked: S.mode === m, run: () => update({ mode: m }) })) },
      item('language', { disabled: noTab() }),
    ] },
    { id: 'run', label: T('menuRun'), items: [
      item('run', { disabled: noTab() }), item('stop', { disabled: !(consoleApi && consoleApi.isRunning()) }),
      '-', item('packages'), { label: T('pyInterpreter'), run: () => settingsDialog('python') },
      '-', item('openBrowser', { disabled: !active || !active.path }),
    ].concat(py ? [] : []) },
    { id: 'help', label: T('menuHelp'), items: [item('shortcuts'), item('about')] },
  ];
}

function settingsDialog(page) {
  openSettings({
    S, update, T, api, page, systemDark: () => systemDark,
    languages: i18n.LANGS.map(([code, name]) => [code, name]),
    openPackages: () => CMD.packages.run(),
    pythonInfo: async () => {
      pyInfo = null;
      return api.py.resolve(true);
    },
  });
}

// ---------------------------------------------------------------- Tastenkürzel
function keySpec(e) {
  const parts = [];
  if (MAC ? e.metaKey : e.ctrlKey) parts.push('Mod');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  let k = e.key;
  if (k === ' ') k = 'Space';
  else if (k.length === 1) k = k.toUpperCase();
  if (k === '+' && parts.includes('Shift')) parts.splice(parts.indexOf('Shift'), 1);
  parts.push(k === 'Esc' ? 'Escape' : k);
  return parts.join('+');
}
const KEYMAP = new Map();
function buildKeymap() {
  KEYMAP.clear();
  for (const c of Object.values(CMD)) if (c.keys) KEYMAP.set(c.keys.toUpperCase(), c);
}

window.addEventListener('keydown', (e) => {
  if (dialogOpen() || menuOpen()) return;
  const spec = keySpec(e).toUpperCase();
  const c = KEYMAP.get(spec) || (e.code === 'Equal' && (MAC ? e.metaKey : e.ctrlKey) ? CMD.zoomIn : null);
  if (!c) {
    // Alt allein: Menüleiste im Simple-Design (wie im Windows-Editor)
    return;
  }
  // In der Konsolen-Eingabe gehören Strg+F/F3 dem Feld nicht, alles andere geht durch
  if (c.noSteal && e.target.closest('.cm-panel')) return;
  e.preventDefault();
  e.stopPropagation();
  c.run();
}, true);

// ---------------------------------------------------------------- Oberfläche zeichnen
function renderChrome() {
  renderMenubar();
  renderTabs();
  renderToolbar();
  renderStatus();
  renderBanner();
}

function renderMenubar() {
  const bar = $('#menubar');
  bar.textContent = '';
  for (const m of menus()) {
    const b = h('button', { class: 'menubar-item menu-anchor', text: m.label });
    const open = () => {
      const r = b.getBoundingClientRect();
      document.querySelectorAll('.menubar-item.open').forEach((x) => x.classList.remove('open'));
      b.classList.add('open');
      showMenu(menus().find((x) => x.id === m.id).items, r.left, r.bottom, { onClose: () => b.classList.remove('open') });
      b.classList.add('open');
    };
    b.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (b.classList.contains('open')) closeMenus();
      else open();
    });
    b.addEventListener('mouseenter', () => {
      if (menuOpen() && !b.classList.contains('open') && document.querySelector('.menubar-item.open')) open();
    });
    bar.append(b);
  }
  // Im Simple-Design ist "Einstellungen" einfach ein Wort in der Menüleiste (wie im Windows-Editor)
  bar.append(h('button', { class: 'menubar-item', text: T('settings'), onmousedown: (e) => {
    e.preventDefault();
    closeMenus();
    settingsDialog();
  } }));
}

let dragTab = null;
function renderTabs() {
  const host = $('#tabs');
  host.textContent = '';
  for (const tb of tabs) {
    const el = h('div', { class: `tab${tb === active ? ' active' : ''}${tb.dirty ? ' dirty' : ''}`, title: tb.path || tabTitle(tb), draggable: 'true' },
      h('span', { class: 'tab-name', text: tabTitle(tb) }),
      h('button', { class: 'tab-close', html: icon('x', 13), title: T('closeTab') }));
    el.addEventListener('mousedown', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        closeTab(tb);
      }
    });
    el.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close')) closeTab(tb);
      else if (tb !== active) activateTab(tb);
    });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const i = tabs.indexOf(tb);
      showMenu([
        { label: T('closeTab'), run: () => closeTab(tb) },
        { label: T('closeOthers'), disabled: tabs.length < 2, run: () => closeMany(tabs.filter((x) => x !== tb)) },
        { label: T('closeRight'), disabled: i === tabs.length - 1, run: () => closeMany(tabs.slice(i + 1)) },
        '-',
        { label: T('copyPath'), disabled: !tb.path, run: () => navigator.clipboard.writeText(tb.path).then(() => toast(T('pathCopied'))) },
        { label: T('revealInFolder'), disabled: !tb.path, run: () => api.reveal(tb.path) },
      ], e.clientX, e.clientY);
    });
    el.addEventListener('dragstart', (e) => {
      dragTab = tb;
      e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragover', (e) => {
      if (!dragTab || dragTab === tb) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const after = e.clientX > r.left + r.width / 2;
      const from = tabs.indexOf(dragTab);
      let to = tabs.indexOf(tb) + (after ? 1 : 0);
      if (from < to) to--;
      if (from !== to) {
        tabs.splice(from, 1);
        tabs.splice(to, 0, dragTab);
        renderTabs();
      }
    });
    el.addEventListener('dragend', () => {
      dragTab = null;
      scheduleSession();
    });
    host.append(el);
    if (tb === active) requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
  }
}

function renderToolbar() {
  const bar = $('#toolbar');
  bar.textContent = '';
  const btn = (name, title, run, cls = '', disabled = false) => {
    const b = h('button', { class: `icon-btn ${cls}`, html: icon(name), title, disabled });
    b.addEventListener('click', run);
    bar.append(b);
    return b;
  };
  const running = consoleApi && consoleApi.isRunning();
  if (isPython(active)) {
    if (running) btn('stop', `${T('stop')} (${keyLabel('Shift+F5', MAC)})`, stopRun, 'danger');
    btn('run', `${T('run')} (F5)`, runCurrent, 'run');
    btn('box', T('packages'), CMD.packages.run);
  }
  if (kindOf(active)) btn('eye', `${T('preview')} (${keyLabel('Mod+Shift+V', MAC)})`, () => togglePreview(), previewOpen ? 'on' : '');
  btn('terminal', `${T('console')} (${keyLabel('Mod+J', MAC)})`, () => showConsole(), $('#console').classList.contains('hidden') ? '' : 'on');
  btn('search', `${T('find')} (${keyLabel('Mod+F', MAC)})`, CMD.find.run, '', !active);
  btn('gear', `${T('settings')} (${keyLabel('Mod+,', MAC)})`, () => settingsDialog());
}

function renderStatus() {
  const bar = $('#statusbar');
  bar.textContent = '';
  const item = (text, title, onclick, cls = '') => {
    const el = h(onclick ? 'button' : 'span', { class: `st ${cls}`, text, title });
    if (onclick) el.addEventListener('click', (e) => {
      const r = el.getBoundingClientRect();
      onclick(r.right, r.top - 4, e);
    });
    bar.append(el);
    return el;
  };
  if (!active || !view) {
    item(T('ready'), '');
    bar.append(h('span', { class: 'st-spacer' }));
    item(`${Math.round((S.fontSize / 14) * 100)} %`, T('zoomReset'), () => zoom(0));
    return;
  }
  const st = view.state;
  const head = st.selection.main.head;
  const line = st.doc.lineAt(head);
  const col = head - line.from + 1;
  item(T('position', { line: line.number, col }), T('goToLine'), goToLineDialog);
  const selected = st.selection.ranges.reduce((n, r) => n + r.to - r.from, 0);
  if (st.selection.ranges.length > 1) item(T('cursors', { n: st.selection.ranges.length }), '');
  else if (selected) item(T('selected', { n: selected }), '');
  if (active.readOnly) item(T('readOnly'), '', null, 'warn');
  bar.append(h('span', { class: 'st-spacer' }));
  if (isPython(active) && pyInfo && (pyInfo.version)) item(`Python ${pyInfo.version}`, T('pyInterpreter'), () => settingsDialog('python'));
  item(active.lang ? displayName(active.lang) : T('plainText'), T('chooseLanguage'), languagePicker);
  item(active.useTabs ? T('tabsN', { n: active.tabSize }) : T('spacesN', { n: active.tabSize }), T('indentWith'), indentMenu);
  item(encLabel(active), T('encoding'), encodingMenu);
  item(active.eol === 'crlf' ? 'CRLF' : 'LF', T('lineEndings'), eolMenu);
  item(`${Math.round((S.fontSize / 14) * 100)} %`, T('zoomReset'), () => zoom(0));
}

function renderBanner() {
  const b = $('#banner');
  b.textContent = '';
  const ext = active && active.external;
  b.classList.toggle('hidden', !ext);
  if (!ext) return;
  b.append(h('span', { text: ext === 'deleted' ? T('extDeleted', { name: tabTitle(active) }) : T('extChanged', { name: tabTitle(active) }) }));
  if (ext === 'changed') b.append(h('button', { class: 'btn small', text: T('reload'), onclick: () => {
    active.dirty = false;
    reload(active);
  } }));
  b.append(h('button', { class: 'btn small', text: T('keepMine'), onclick: () => {
    active.external = null;
    renderBanner();
  } }));
}

function updateTitle() {
  const name = active ? `${active.dirty ? '● ' : ''}${tabTitle(active)} – ` : '';
  api.setTitle(`${name}Textline`);
}

/** Sprache der Oberfläche gewechselt: alles neu beschriften */
function relabel() {
  document.documentElement.lang = S.language || i18n.guess(navigator.language);
  pyLinter = null;
  reconfigureAll(['phrases', 'lint']);
  buildKeymap();
  $('#console-title').textContent = T('console');
  $('#console-clear').title = T('clear');
  $('#console-close').title = T('close');
  $('#console-input').placeholder = T('consolePlaceholder');
  $('#preview-title').textContent = T('preview');
  $('#preview-browser').title = T('openInBrowser');
  $('#new-tab').title = `${T('newFile')} (${keyLabel('Mod+N', MAC)})`;
  $('#main-menu').title = T('menu');
  if (!active) showWelcome();
  renderChrome();
}

// ---------------------------------------------------------------- Teiler (Konsole, Vorschau)
function splitter(el, onMove) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    document.body.classList.add('resizing');
    const move = (ev) => onMove(ev);
    const up = () => {
      el.removeEventListener('pointermove', move);
      document.body.classList.remove('resizing');
      saveSettings();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up, { once: true });
  });
}

// ---------------------------------------------------------------- Start
async function main() {
  [S, INFO] = await Promise.all([api.getSettings(), api.info()]);
  S = { ...DEFAULTS, ...S };
  MAC = INFO.platform === 'darwin';
  systemDark = INFO.dark;
  document.documentElement.dataset.platform = INFO.platform;
  document.documentElement.lang = S.language || i18n.guess(navigator.language);
  applyTheme(S, systemDark);
  applyFont();
  buildKeymap();

  $('#main-menu').innerHTML = icon('menu');
  $('#main-menu').addEventListener('mousedown', (e) => {
    e.preventDefault();
    const b = e.currentTarget;
    if (b.classList.contains('open')) return closeMenus();
    const r = b.getBoundingClientRect();
    const items = menus().map((m) => ({ label: m.label, submenu: () => menus().find((x) => x.id === m.id).items }));
    showMenu([...items, '-', item('settings')], r.left, r.bottom + 4, { onClose: () => b.classList.remove('open') });
    b.classList.add('open');
  });
  $('#new-tab').innerHTML = icon('plus', 16);
  $('#new-tab').addEventListener('click', () => newFile());
  $('#tabs').addEventListener('dblclick', (e) => {
    if (e.target === e.currentTarget) newFile();
  });
  $('#console-clear').innerHTML = icon('trash', 15);
  $('#console-close').innerHTML = icon('x', 15);
  $('#console-clear').addEventListener('click', () => consoleApi.clear());
  $('#console-close').addEventListener('click', () => showConsole(false));
  $('#preview-browser').innerHTML = icon('external', 15);
  $('#preview-browser').addEventListener('click', () => CMD.openBrowser.run());

  consoleApi = createConsole({
    root: $('#console'), api, T, getPython,
    onJump: async (file, line) => {
      const tb = tabs.find((x) => x.path && samePath(x.path, file)) || (await openPaths([file]));
      if (tb) {
        activateTab(tb);
        E.goToLine(view, line);
      }
    },
    onState: () => renderChrome(),
  });
  previewApi = createPreview({ frame: $('#preview'), api });

  const consoleEl = $('#console');
  consoleEl.style.height = `${S.consoleHeight}px`;
  splitter($('#console-split'), (e) => {
    const h0 = window.innerHeight - e.clientY - $('#statusbar').offsetHeight;
    S.consoleHeight = Math.max(90, Math.min(window.innerHeight - 200, h0));
    consoleEl.style.height = `${S.consoleHeight}px`;
  });
  const previewEl = $('#preview-pane');
  previewEl.style.width = `${S.previewWidth}%`;
  splitter($('#preview-split'), (e) => {
    const w = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
    S.previewWidth = Math.max(20, Math.min(75, w));
    previewEl.style.width = `${S.previewWidth}%`;
  });

  api.onSystemTheme((dark) => {
    systemDark = dark;
    applyLook();
  });
  api.onOpenFiles((list) => openPaths(list));

  // Dateien ins Fenster ziehen
  document.addEventListener('dragover', (e) => {
    if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) {
      e.preventDefault();
      document.body.classList.add('dropping');
    }
  });
  document.addEventListener('dragleave', (e) => {
    if (!e.relatedTarget) document.body.classList.remove('dropping');
  });
  document.addEventListener('drop', (e) => {
    document.body.classList.remove('dropping');
    const list = [...(e.dataTransfer ? e.dataTransfer.files : [])].map((f) => api.pathForFile(f)).filter(Boolean);
    if (list.length) {
      e.preventDefault();
      e.stopPropagation();
      openPaths(list);
    }
  }, true);

  const initial = await api.initialFiles();
  const restored = S.restoreSession ? await restoreSession() : false;
  if (initial.length) await openPaths(initial);
  else if (!restored) newFile();
  if (S.consoleOpen) showConsole(true);
  relabel();
  // Python im Hintergrund schon mal suchen (für die Statusleiste und die Syntaxprüfung)
  setTimeout(() => getPython(false), 1500);
  window.__textline = { detect: (n, first = '') => { const l = detectLanguage(n, first); return l ? l.name : null; }, tabs, get active() { return active; }, get view() { return view; }, CMD, update, openPaths, newFile, attachLanguage, findLanguage, settingsDialog, languagePicker, showConsole, togglePreview, S: () => S };
}

main();
