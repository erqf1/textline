// Einstellungen: Allgemein, Aussehen, Editor, Python. Jede Änderung wirkt sofort (update(patch)).
import { h, dialog } from './ui.js';
import { THEMES, ACCENTS, previewColors } from './themes.js';

export const FONTS = [
  ['', 'Standard'],
  ['"Cascadia Mono", "Cascadia Code", monospace', 'Cascadia Mono'],
  ['Consolas, monospace', 'Consolas'],
  ['"JetBrains Mono", monospace', 'JetBrains Mono'],
  ['"Fira Code", monospace', 'Fira Code'],
  ['"Source Code Pro", monospace', 'Source Code Pro'],
  ['"DejaVu Sans Mono", monospace', 'DejaVu Sans Mono'],
  ['Menlo, monospace', 'Menlo'],
  ['"Courier New", monospace', 'Courier New'],
];

export async function openSettings({ S, update, T, languages, api, openPackages, pythonInfo, systemDark, canFileIcons, page = 'general' }) {
  const tabs = [
    ['general', T('setGeneral')],
    ['look', T('setLook')],
    ['editor', T('setEditor')],
    ['python', 'Python'],
  ];
  const nav = h('div', { class: 'set-nav' });
  const pane = h('div', { class: 'set-pane' });

  const check = (key, label, hint) => {
    const box = h('input', { type: 'checkbox' });
    box.checked = !!S[key];
    box.addEventListener('change', () => update({ [key]: box.checked }));
    return h('label', { class: 'set-check' }, box, h('span', {}, h('span', { text: label }), hint ? h('small', { class: 'muted', text: hint }) : null));
  };
  const select = (key, label, options, cast = String) => {
    const sel = h('select', { class: 'input' }, options.map(([val, text]) => h('option', { value: String(val), text })));
    sel.value = String(S[key] ?? '');
    sel.addEventListener('change', () => update({ [key]: cast(sel.value) }));
    return h('label', { class: 'set-row' }, h('span', { text: label }), sel);
  };
  const segmented = (key, options, onPick) => {
    const wrap = h('div', { class: 'seg' });
    const paint = () => wrap.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(S[key])));
    for (const [val, text] of options) {
      wrap.append(h('button', { 'data-v': String(val), text, onclick: () => {
        update({ [key]: val });
        paint();
        onPick && onPick();
      } }));
    }
    paint();
    return wrap;
  };
  const section = (title, ...kids) => h('div', { class: 'set-section' }, h('div', { class: 'set-title', text: title }), ...kids);

  const pages = {
    general() {
      return [
        section(T('setLanguage'), select('language', T('setLanguageLabel'), languages)),
        section(T('setFiles'),
          check('restoreSession', T('setRestore'), T('setRestoreHint')),
          select('newEol', T('setNewEol'), [['auto', T('eolAuto')], ['lf', 'LF (Linux, macOS)'], ['crlf', 'CRLF (Windows)']]),
          select('newEncoding', T('setNewEncoding'), [['utf8', 'UTF-8'], ['utf8bom', 'UTF-8 BOM']])),
      ];
    },
    look() {
      const grid = h('div', { class: 'theme-grid' });
      const accentRow = h('div', { class: 'accent-row' });
      const paintThemes = () => {
        grid.textContent = '';
        const dark = S.mode === 'dark' || (S.mode !== 'light' && systemDark());
        for (const th of THEMES) {
          const c = previewColors(th.id, dark, S.accent);
          const card = h('button', { class: `theme-card ${c.style}${S.theme === th.id ? ' on' : ''}` },
            h('div', { class: 'theme-mini', style: { background: c.bg, borderColor: c.line } },
              h('div', { class: 'mini-bar', style: { background: c.panel } }, h('i', { style: { background: c.accent } })),
              h('div', { class: 'mini-code', style: c.gutter ? { borderLeft: `14px solid ${c.gutter}`, paddingLeft: '6px' } : {} },
                h('span', { style: { color: c.syn.keyword }, text: 'def ' }), h('span', { style: { color: c.syn.function }, text: 'main' }), h('span', { style: { color: c.text }, text: '():' }), h('br'),
                h('span', { style: { color: c.syn.comment }, text: '  # Textline' }), h('br'),
                h('span', { style: { color: c.syn.string }, text: '  "Hi!"' }))),
            h('span', { class: 'theme-name', text: T(`theme_${th.id}`) }));
          card.addEventListener('click', () => {
            update({ theme: th.id });
            paintThemes();
            paintAccents();
          });
          grid.append(card);
        }
      };
      const paintAccents = () => {
        accentRow.textContent = '';
        const cur = (S.accent || '').toLowerCase();
        const auto = h('button', { class: `swatch auto${!cur ? ' on' : ''}`, title: T('setAccentAuto'), text: 'A' });
        auto.addEventListener('click', () => {
          update({ accent: '' });
          paintAccents();
          paintThemes();
        });
        accentRow.append(auto);
        for (const col of ACCENTS) {
          const b = h('button', { class: `swatch${cur === col ? ' on' : ''}`, style: { background: col }, title: col });
          b.addEventListener('click', () => {
            update({ accent: col });
            paintAccents();
            paintThemes();
          });
          accentRow.append(b);
        }
        const custom = h('input', { type: 'color', class: 'swatch-custom', value: cur && cur.startsWith('#') ? cur : '#f5a524', title: T('setAccentCustom') });
        custom.addEventListener('input', () => update({ accent: custom.value }));
        custom.addEventListener('change', () => {
          paintAccents();
          paintThemes();
        });
        accentRow.append(h('label', { class: 'swatch-wrap' }, custom, h('span', { text: T('setAccentCustom') })));
      };
      paintThemes();
      paintAccents();
      const size = h('input', { type: 'number', class: 'input small', min: '8', max: '40', value: String(S.fontSize) });
      size.addEventListener('change', () => update({ fontSize: Math.min(40, Math.max(8, Number(size.value) || 14)) }));
      // Mausrad verstellt die Zahl nicht (beim Durchscrollen der Einstellungen) - es scrollt einfach weiter
      size.addEventListener('wheel', () => size.blur(), { passive: true });
      return [
        section(T('setTheme'), grid),
        section(T('setMode'), segmented('mode', [['system', T('modeSystem')], ['light', T('modeLight')], ['dark', T('modeDark')]], paintThemes)),
        section(T('setAccent'), accentRow),
        section(T('setMenuBar'), check('menuBar', T('setMenuBarShow'), T('setMenuBarHint'))),
        // Nur in der installierten Windows-Version: Dateisymbole im Explorer hell oder dunkel
        canFileIcons ? section(T('setFileIcons'),
          segmented('fileIcons', [['auto', T('fileIconsAuto')], ['light', T('modeLight')], ['dark', T('modeDark')]]),
          h('small', { class: 'muted', text: T('setFileIconsHint') })) : null,
        section(T('setFont'),
          select('fontFamily', T('setFontFamily'), FONTS.map(([v, n]) => [v, v ? n : T('fontDefault')])),
          h('label', { class: 'set-row' }, h('span', { text: T('setFontSize') }), size)),
      ];
    },
    editor() {
      return [
        section(T('setIndent'),
          select('tabSize', T('setTabSize'), [[2, '2'], [3, '3'], [4, '4'], [8, '8']], Number),
          select('useTabs', T('setIndentWith'), [['false', T('spaces')], ['true', T('tabs')]], (x) => x === 'true'),
          check('detectIndent', T('setDetectIndent'), T('setDetectIndentHint'))),
        section(T('setShow'),
          check('wrap', T('setWrap')),
          check('lineNumbers', T('setLineNumbers')),
          check('activeLine', T('setActiveLine')),
          check('whitespace', T('setWhitespace'))),
        section(T('setTyping'),
          check('closeBrackets', T('setBrackets'), T('setBracketsHint')),
          check('autocomplete', T('setAutocomplete'))),
        section(T('setSaving'),
          check('trimTrailing', T('setTrim')),
          check('finalNewline', T('setFinalNewline'))),
      ];
    },
    python() {
      const status = h('div', { class: 'py-status muted', text: T('pyChecking') });
      const path = h('input', { class: 'input', value: S.pythonPath || '', placeholder: T('pyPathPlaceholder'), spellcheck: 'false' });
      const browse = h('button', { class: 'btn', text: T('browse') });
      const pathRow = h('div', { class: 'set-pathrow' }, path, browse);
      const refresh = async () => {
        status.textContent = T('pyChecking');
        const r = await pythonInfo(true);
        if (!r || r.error) status.textContent = r && r.error === 'custom-broken' ? T('pyCustomBroken') : T('pyNone');
        else if (r.needsEnv) status.textContent = T('pyEnvLater', { version: r.version });
        else status.textContent = T(r.kind === 'env' ? 'pyUsingEnv' : 'pyUsing', { version: r.version, path: r.python });
      };
      const modes = segmented('pythonMode', [['env', T('pyModeEnv')], ['system', T('pyModeSystem')], ['custom', T('pyModeCustom')]], () => {
        pathRow.style.display = S.pythonMode === 'custom' ? '' : 'none';
        refresh();
      });
      pathRow.style.display = S.pythonMode === 'custom' ? '' : 'none';
      path.addEventListener('change', () => {
        update({ pythonPath: path.value.trim() });
        refresh();
      });
      browse.addEventListener('click', async () => {
        const files = await api.openDialog({ title: T('pyModeCustom') });
        if (files[0]) {
          path.value = files[0];
          update({ pythonPath: files[0] });
          refresh();
        }
      });
      refresh();
      return [
        section(T('pyInterpreter'), modes, h('small', { class: 'muted', text: T('pyModeHint') }), pathRow, status),
        section(T('pyRunning'),
          check('saveBeforeRun', T('pySaveBeforeRun')),
          check('clearConsoleOnRun', T('pyClearConsole')),
          check('pythonCheck', T('pyCheck'), T('pyCheckHint'))),
        section(T('pkgTitle'), h('div', {}, h('button', { class: 'btn', text: T('pkgOpen'), onclick: () => openPackages() }))),
      ];
    },
  };

  const show = (id) => {
    nav.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
    pane.textContent = '';
    pane.append(...pages[id]().filter(Boolean));
    pane.scrollTop = 0;
  };
  for (const [id, label] of tabs) nav.append(h('button', { 'data-id': id, text: label, onclick: () => show(id) }));
  show(page);

  await dialog({
    title: T('settings'),
    body: h('div', { class: 'settings no-enter' }, nav, pane),
    wide: true,
    className: 'settings-dialog',
    buttons: [{ label: T('done'), value: 'ok', primary: true }],
    cancelValue: 'ok',
  });
}
