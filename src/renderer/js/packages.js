// Python-Pakete verwalten wie bei Thonny: installierte Pakete, Suche auf PyPI, installieren,
// aktualisieren, entfernen, requirements.txt - mit live mitlaufendem pip-Protokoll.
import { h, dialog } from './ui.js';
import { icon } from './icons.js';

const POPULAR = ['requests', 'numpy', 'pandas', 'matplotlib', 'pygame', 'pillow', 'flask', 'beautifulsoup4', 'openpyxl', 'pyautogui', 'customtkinter', 'pyttsx3'];

const norm = (n) => String(n || '').toLowerCase().replace(/[-_.]+/g, '-');
const newer = (a, b) => {
  const pa = String(a).split(/[.+-]/).map((x) => parseInt(x, 10) || 0), pb = String(b).split(/[.+-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
};

export async function openPackages({ api, T, getPython, onChanged }) {
  const py = await getPython(true);
  if (!py) return;

  let installed = [];
  let selected = null; // { name, info }
  let running = false;

  const filter = h('input', { class: 'input', placeholder: T('pkgFilter'), spellcheck: 'false' });
  const list = h('div', { class: 'pkg-list' });
  const countEl = h('div', { class: 'pkg-count' });
  const search = h('input', { class: 'input', placeholder: T('pkgSearch'), spellcheck: 'false' });
  const searchBtn = h('button', { class: 'btn primary', html: `${icon('search', 15)}<span>${T('pkgSearchBtn')}</span>` });
  const detail = h('div', { class: 'pkg-detail' });
  const log = h('pre', { class: 'pkg-log' });
  const logWrap = h('div', { class: 'pkg-logwrap' }, h('div', { class: 'pkg-logtitle', text: T('pkgLog') }), log);
  const envText = py.kind === 'web' ? T('webPyInfo', { version: py.version }) : py.kind === 'env' ? T('pkgEnvOwn', { version: py.version }) : T('pkgEnvSystem', { version: py.version, path: py.python });
  const envLine = h('div', { class: 'pkg-env', text: envText });

  const body = h('div', { class: 'pkg no-enter' },
    h('div', { class: 'pkg-left' },
      h('div', { class: 'pkg-searchrow no-enter' }, search, searchBtn),
      h('div', { class: 'pkg-sub' }, h('span', { text: T('pkgInstalled') }), countEl),
      filter,
      list),
    h('div', { class: 'pkg-right' }, detail, logWrap));

  const appendLog = (text) => {
    log.textContent += text;
    if (log.textContent.length > 60000) log.textContent = log.textContent.slice(-40000);
    log.scrollTop = log.scrollHeight;
  };
  const off = api.py.onEvent((ev) => {
    if (ev.kind !== 'pip') return;
    if (ev.type === 'out' || ev.type === 'err') appendLog(ev.data);
  });

  function renderList() {
    const q = norm(filter.value);
    list.textContent = '';
    const shown = installed.filter((p) => !q || norm(p.name).includes(q));
    countEl.textContent = String(installed.length);
    for (const p of shown) {
      const row = h('div', { class: `pkg-row${selected && norm(selected.name) === norm(p.name) ? ' on' : ''}` },
        h('span', { class: 'pkg-name', text: p.name }), h('span', { class: 'pkg-ver', text: p.version }));
      row.addEventListener('click', () => select(p.name));
      list.append(row);
    }
    if (!shown.length) list.append(h('div', { class: 'pkg-empty', text: installed.length ? T('pkgNoMatch') : T('pkgNone') }));
  }

  async function loadInstalled() {
    const r = await api.py.pipList(py.python);
    if (r.error) {
      installed = [];
      appendLog(`${r.error}\n`);
    } else {
      installed = r.packages.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }
    renderList();
  }

  function renderWelcome() {
    detail.textContent = '';
    detail.append(
      h('div', { class: 'pkg-title', text: T('pkgWelcome') }),
      h('p', { class: 'muted', text: T('pkgWelcomeText') }),
      h('div', { class: 'pkg-chips' }, POPULAR.map((n) => h('button', { class: 'chip', text: n, onclick: () => select(n) }))),
      h('div', { class: 'pkg-actions' },
        h('button', { class: 'btn', text: T('pkgRequirements'), onclick: installRequirements })));
  }

  async function select(name) {
    selected = { name, info: null };
    renderList();
    detail.textContent = '';
    detail.append(h('div', { class: 'pkg-title', text: name }), h('p', { class: 'muted', text: T('pkgLoading') }));
    const info = await api.py.pypi(name);
    if (!selected || selected.name !== name) return;
    selected.info = info;
    renderDetail();
  }

  function renderDetail() {
    const { name, info } = selected;
    const have = installed.find((p) => norm(p.name) === norm(info && info.name ? info.name : name));
    detail.textContent = '';
    if (info.notFound || info.error) {
      detail.append(
        h('div', { class: 'pkg-title', text: name }),
        h('p', { class: 'muted', text: info.notFound ? T('pkgNotFound') : T('pkgOffline', { error: info.error }) }));
      if (have) detail.append(h('div', { class: 'pkg-actions' }, h('button', { class: 'btn danger', text: T('pkgUninstall'), onclick: () => runPip(['uninstall', '-y', have.name]) })));
      return;
    }
    const meta = h('div', { class: 'pkg-meta' });
    const row = (k, val) => val && meta.append(h('div', {}, h('span', { class: 'muted', text: k }), h('span', { text: val })));
    row(T('pkgLatest'), info.version);
    row(T('pkgYours'), have ? have.version : T('pkgNotInstalled'));
    row(T('pkgAuthor'), info.author);
    row(T('pkgLicense'), info.license);
    row('Python', info.requiresPython);
    const actions = h('div', { class: 'pkg-actions' });
    if (!have) actions.append(h('button', { class: 'btn primary', html: `${icon('download', 15)}<span>${T('pkgInstall')}</span>`, onclick: () => runPip(['install', info.name]) }));
    else {
      if (newer(info.version, have.version)) actions.append(h('button', { class: 'btn primary', text: T('pkgUpgrade', { version: info.version }), onclick: () => runPip(['install', '-U', info.name]) }));
      actions.append(h('button', { class: 'btn danger', text: T('pkgUninstall'), onclick: () => runPip(['uninstall', '-y', have.name]) }));
    }
    if (info.homepage) actions.append(h('button', { class: 'btn', html: `${icon('external', 15)}<span>${T('pkgHomepage')}</span>`, onclick: () => api.openExternal(info.homepage) }));
    detail.append(
      h('div', { class: 'pkg-title', text: info.name }),
      info.summary ? h('p', { class: 'pkg-summary', text: info.summary }) : null,
      meta,
      actions);
  }

  async function runPip(args) {
    if (running) return;
    running = true;
    body.classList.add('busy');
    appendLog(`\n$ pip ${args.join(' ')}\n`);
    const r = await api.py.pip(py.python, args);
    appendLog(r.code === 0 ? `${T('pkgDone')}\n` : `${T('pkgFailed', { code: r.code })}\n`);
    running = false;
    body.classList.remove('busy');
    await loadInstalled();
    if (selected && selected.info) renderDetail();
    onChanged && onChanged();
  }

  async function installRequirements() {
    const files = await api.openDialog({ title: T('pkgRequirements'), filters: [{ name: 'requirements', extensions: ['txt'] }] });
    if (files[0]) runPip(['install', '-r', files[0]]);
  }

  const doSearch = () => {
    const q = search.value.trim();
    if (q) select(q);
  };
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch();
    }
  });
  searchBtn.addEventListener('click', doSearch);
  filter.addEventListener('input', renderList);

  renderWelcome();
  renderList();
  loadInstalled();
  await dialog({
    title: T('pkgTitle'),
    body: h('div', {}, envLine, body),
    wide: true,
    className: 'packages-dialog',
    buttons: [{ label: T('close'), value: 'close', primary: true }],
    cancelValue: 'close',
    onOpen: () => setTimeout(() => search.focus(), 0),
  });
  off();
}
