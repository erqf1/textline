// Designs: Farben der Oberfläche und der Syntax, jeweils hell und dunkel. Alle nehmen jede Akzentfarbe.
// style "modern": rund, Symbolleiste (wie Cutline/Clipline/Webline); "simple": eckig und schlicht wie der
// Windows-Editor; "classic" (Minimalist): wie Notepad++ - Menü, Symbolreihe, kleine Tabs, graue Zeilennummern.

const SYN = {
  material: {
    dark: { keyword: '#c792ea', string: '#c3e88d', number: '#f78c6c', comment: '#676e95', function: '#82aaff', type: '#ffcb6b', property: '#89ddff', tag: '#f07178', attr: '#ffcb6b', operator: '#89ddff', constant: '#f78c6c', regexp: '#89ddff', heading: '#82aaff', link: '#89ddff', meta: '#ffcb6b', invalid: '#ff5370' },
    light: { keyword: '#7c3aed', string: '#15803d', number: '#c2410c', comment: '#8a8fa3', function: '#2563eb', type: '#b45309', property: '#0e7490', tag: '#be123c', attr: '#a16207', operator: '#475569', constant: '#c2410c', regexp: '#0e7490', heading: '#1d4ed8', link: '#0369a1', meta: '#a16207', invalid: '#dc2626' },
  },
  night: {
    dark: { keyword: '#bb9af7', string: '#9ece6a', number: '#ff9e64', comment: '#5f6996', function: '#7aa2f7', type: '#2ac3de', property: '#73daca', tag: '#f7768e', attr: '#e0af68', operator: '#89ddff', constant: '#ff9e64', regexp: '#b4f9f8', heading: '#7aa2f7', link: '#73daca', meta: '#e0af68', invalid: '#f7768e' },
    light: { keyword: '#5a3e9e', string: '#33635c', number: '#965027', comment: '#848cb5', function: '#2959aa', type: '#006c86', property: '#0f4b6e', tag: '#8c4351', attr: '#8f5e15', operator: '#3e5f8a', constant: '#965027', regexp: '#006c86', heading: '#2959aa', link: '#0f4b6e', meta: '#8f5e15', invalid: '#c0392b' },
  },
  everforest: {
    dark: { keyword: '#e67e80', string: '#a7c080', number: '#d699b6', comment: '#7f897d', function: '#83c092', type: '#dbbc7f', property: '#7fbbb3', tag: '#e67e80', attr: '#dbbc7f', operator: '#e69875', constant: '#d699b6', regexp: '#83c092', heading: '#a7c080', link: '#7fbbb3', meta: '#dbbc7f', invalid: '#e67e80' },
    light: { keyword: '#c0392b', string: '#5b7a1a', number: '#9a4f8a', comment: '#8a9486', function: '#2e7d5b', type: '#9a6b0a', property: '#2b6f8a', tag: '#c0392b', attr: '#9a6b0a', operator: '#b85b16', constant: '#9a4f8a', regexp: '#2e7d5b', heading: '#5b7a1a', link: '#2b6f8a', meta: '#9a6b0a', invalid: '#c0392b' },
  },
  gruvbox: {
    dark: { keyword: '#fb4934', string: '#b8bb26', number: '#d3869b', comment: '#928374', function: '#fabd2f', type: '#fe8019', property: '#83a598', tag: '#fb4934', attr: '#fabd2f', operator: '#fe8019', constant: '#d3869b', regexp: '#8ec07c', heading: '#fabd2f', link: '#83a598', meta: '#8ec07c', invalid: '#fb4934' },
    light: { keyword: '#9d0006', string: '#79740e', number: '#8f3f71', comment: '#928374', function: '#b57614', type: '#af3a03', property: '#076678', tag: '#9d0006', attr: '#b57614', operator: '#af3a03', constant: '#8f3f71', regexp: '#427b58', heading: '#b57614', link: '#076678', meta: '#427b58', invalid: '#9d0006' },
  },
  github: {
    dark: { keyword: '#ff7b72', string: '#a5d6ff', number: '#79c0ff', comment: '#8b949e', function: '#d2a8ff', type: '#ffa657', property: '#79c0ff', tag: '#7ee787', attr: '#79c0ff', operator: '#ff7b72', constant: '#79c0ff', regexp: '#7ee787', heading: '#79c0ff', link: '#a5d6ff', meta: '#ffa657', invalid: '#f85149' },
    light: { keyword: '#cf222e', string: '#0a3069', number: '#0550ae', comment: '#6e7781', function: '#8250df', type: '#953800', property: '#0550ae', tag: '#116329', attr: '#0550ae', operator: '#cf222e', constant: '#0550ae', regexp: '#116329', heading: '#0550ae', link: '#0a3069', meta: '#953800', invalid: '#cf222e' },
  },
  // Notepad++ (Standard-Stil hell, "Dark Mode" dunkel)
  npp: {
    dark: { keyword: '#7ca8ff', string: '#c8c8c8', number: '#ff8c3a', comment: '#6aaa64', function: '#e6e6e6', type: '#4ec9b0', property: '#d4d4d4', tag: '#7ca8ff', attr: '#ff8c3a', operator: '#9fb8ff', constant: '#ff8c3a', regexp: '#d7a2ff', heading: '#7ca8ff', link: '#57a6ff', meta: '#c586c0', invalid: '#ff5555' },
    light: { keyword: '#0000ff', string: '#808080', number: '#ff8000', comment: '#008000', function: '#000000', type: '#8000ff', property: '#000000', tag: '#0000ff', attr: '#ff0000', operator: '#000080', constant: '#ff8000', regexp: '#8000ff', heading: '#0000ff', link: '#0000ff', meta: '#804000', invalid: '#ff0000' },
  },
  vs: {
    dark: { keyword: '#569cd6', string: '#ce9178', number: '#b5cea8', comment: '#6a9955', function: '#dcdcaa', type: '#4ec9b0', property: '#9cdcfe', tag: '#569cd6', attr: '#9cdcfe', operator: '#d4d4d4', constant: '#4fc1ff', regexp: '#d16969', heading: '#569cd6', link: '#3794ff', meta: '#c586c0', invalid: '#f44747' },
    light: { keyword: '#0000ff', string: '#a31515', number: '#098658', comment: '#008000', function: '#795e26', type: '#267f99', property: '#001080', tag: '#800000', attr: '#e50000', operator: '#000000', constant: '#0070c1', regexp: '#811f3f', heading: '#0000ff', link: '#0067c0', meta: '#af00db', invalid: '#cd3131' },
  },
};

// Oberfläche: bg = Editorfläche, panel = Leisten, panel2 = Knöpfe/Eingaben, line = Rahmen
export const THEMES = [
  {
    id: 'standard', accent: '#f5a524', syntax: 'material',
    dark: { bg: '#0d0f14', panel: '#151821', panel2: '#1c202b', line: '#2a2f3d', text: '#e6e8ee', muted: '#8b90a0' },
    light: { bg: '#ffffff', panel: '#f3f4f8', panel2: '#e9ebf2', line: '#d8dbe5', text: '#1b1f2a', muted: '#6a7083' },
  },
  {
    id: 'ocean', accent: '#4aa3ff', syntax: 'night',
    dark: { bg: '#0a101d', panel: '#101a2e', panel2: '#16233c', line: '#263557', text: '#e3ecff', muted: '#8fa3c7' },
    light: { bg: '#f7faff', panel: '#eaf1fb', panel2: '#dde8f7', line: '#c6d5ec', text: '#132036', muted: '#5a6e8c' },
  },
  {
    id: 'forest', accent: '#7fcf8e', syntax: 'everforest',
    dark: { bg: '#0f1511', panel: '#151d17', panel2: '#1c2820', line: '#2b3c30', text: '#e3efe5', muted: '#8aa391' },
    light: { bg: '#fbfcf8', panel: '#eef2e8', panel2: '#e2e9da', line: '#cdd8c4', text: '#1d2a1f', muted: '#62735f' },
  },
  {
    id: 'sunset', accent: '#ff8a4c', syntax: 'gruvbox',
    dark: { bg: '#17100e', panel: '#221815', panel2: '#2d211c', line: '#493429', text: '#fbeee6', muted: '#b59a8a' },
    light: { bg: '#fffaf5', panel: '#f8ede3', panel2: '#f0e0d2', line: '#e2cbb8', text: '#2d1d14', muted: '#86685a' },
  },
  {
    id: 'graphite', accent: '#9ea7b3', syntax: 'github',
    dark: { bg: '#141414', panel: '#1b1b1b', panel2: '#252525', line: '#333333', text: '#e8e8e8', muted: '#9a9a9a' },
    light: { bg: '#ffffff', panel: '#f6f6f6', panel2: '#ececec', line: '#dadada', text: '#161616', muted: '#6b6b6b' },
  },
  {
    id: 'minimalist', accent: '#fa9600', syntax: 'npp', style: 'classic',
    dark: { bg: '#1e1e1e', panel: '#2d2d30', panel2: '#3a3a3e', line: '#4a4a4f', text: '#e0e0e0', muted: '#a8a8a8', gutter: '#252526', gutterText: '#8a8a8a', activeLine: '#2a2d3e' },
    light: { bg: '#ffffff', panel: '#f0f0f0', panel2: '#e5e5e5', line: '#a9a9a9', text: '#000000', muted: '#505050', gutter: '#e4e4e4', gutterText: '#808080', activeLine: '#e8e8ff' },
  },
  {
    id: 'simple', accent: null, syntax: 'vs', style: 'simple',
    dark: { bg: '#1e1e1e', panel: '#2b2b2b', panel2: '#333333', line: '#454545', text: '#d4d4d4', muted: '#9d9d9d', accent: '#3794ff', selection: '#264f78' },
    light: { bg: '#ffffff', panel: '#f3f3f3', panel2: '#e8e8e8', line: '#d0d0d0', text: '#000000', muted: '#5f5f5f', accent: '#0067c0', selection: '#add6ff' },
  },
];

// Terminal: Farbschemata wie in Windows Terminal und Co. Die Farben kommen aus settings.termScheme, das Fenster ist
// durchsichtig (Acryl/Mica, siehe main.js "win:glass"). Schemata ohne helle Variante bleiben im hellen Modus dunkel.
THEMES.push({ id: 'terminal', accent: null, syntax: null, style: 'terminal', glass: true });

// bg/panel/line/text/muted + Farben: red green yellow blue magenta cyan orange pink comment, accent
export const SCHEMES = [
  { id: 'catppuccin', name: 'Catppuccin',
    dark: { bg: '#1e1e2e', panel: '#181825', line: '#313244', text: '#cdd6f4', muted: '#a6adc8', red: '#f38ba8', green: '#a6e3a1', yellow: '#f9e2af', blue: '#89b4fa', magenta: '#cba6f7', cyan: '#94e2d5', orange: '#fab387', pink: '#f5c2e7', comment: '#7f849c', accent: '#cba6f7' },
    light: { bg: '#eff1f5', panel: '#e6e9ef', line: '#ccd0da', text: '#4c4f69', muted: '#6c6f85', red: '#d20f39', green: '#40a02b', yellow: '#df8e1d', blue: '#1e66f5', magenta: '#8839ef', cyan: '#179299', orange: '#fe640b', pink: '#ea76cb', comment: '#8c8fa1', accent: '#8839ef' } },
  { id: 'dracula', name: 'Dracula',
    dark: { bg: '#282a36', panel: '#21222c', line: '#44475a', text: '#f8f8f2', muted: '#a9abb8', red: '#ff5555', green: '#50fa7b', yellow: '#f1fa8c', blue: '#8be9fd', magenta: '#ff79c6', cyan: '#8be9fd', orange: '#ffb86c', pink: '#ff79c6', comment: '#6272a4', accent: '#bd93f9' } },
  { id: 'tokyonight', name: 'Tokyo Night',
    dark: { bg: '#1a1b26', panel: '#16161e', line: '#292e42', text: '#c0caf5', muted: '#9aa5ce', red: '#f7768e', green: '#9ece6a', yellow: '#e0af68', blue: '#7aa2f7', magenta: '#bb9af7', cyan: '#7dcfff', orange: '#ff9e64', pink: '#ff007c', comment: '#565f89', accent: '#7aa2f7' },
    light: { bg: '#e1e2e7', panel: '#d5d6db', line: '#c4c8da', text: '#3760bf', muted: '#6172b0', red: '#f52a65', green: '#587539', yellow: '#8c6c3e', blue: '#2e7de9', magenta: '#9854f1', cyan: '#007197', orange: '#b15c00', pink: '#d20065', comment: '#848cb5', accent: '#2e7de9' } },
  { id: 'onedark', name: 'One Dark',
    dark: { bg: '#282c34', panel: '#21252b', line: '#3e4451', text: '#abb2bf', muted: '#8b929e', red: '#e06c75', green: '#98c379', yellow: '#e5c07b', blue: '#61afef', magenta: '#c678dd', cyan: '#56b6c2', orange: '#d19a66', pink: '#c678dd', comment: '#5c6370', accent: '#61afef' },
    light: { bg: '#fafafa', panel: '#f0f0f0', line: '#d4d4d4', text: '#383a42', muted: '#696c77', red: '#e45649', green: '#50a14f', yellow: '#c18401', blue: '#4078f2', magenta: '#a626a4', cyan: '#0184bc', orange: '#986801', pink: '#a626a4', comment: '#a0a1a7', accent: '#4078f2' } },
  { id: 'gruvbox', name: 'Gruvbox',
    dark: { bg: '#282828', panel: '#1d2021', line: '#3c3836', text: '#ebdbb2', muted: '#bdae93', red: '#fb4934', green: '#b8bb26', yellow: '#fabd2f', blue: '#83a598', magenta: '#d3869b', cyan: '#8ec07c', orange: '#fe8019', pink: '#d3869b', comment: '#928374', accent: '#fabd2f' },
    light: { bg: '#fbf1c7', panel: '#f2e5bc', line: '#d5c4a1', text: '#3c3836', muted: '#665c54', red: '#9d0006', green: '#79740e', yellow: '#b57614', blue: '#076678', magenta: '#8f3f71', cyan: '#427b58', orange: '#af3a03', pink: '#8f3f71', comment: '#928374', accent: '#af3a03' } },
  { id: 'nord', name: 'Nord',
    dark: { bg: '#2e3440', panel: '#272c36', line: '#3b4252', text: '#d8dee9', muted: '#a4adbd', red: '#bf616a', green: '#a3be8c', yellow: '#ebcb8b', blue: '#81a1c1', magenta: '#b48ead', cyan: '#88c0d0', orange: '#d08770', pink: '#b48ead', comment: '#616e88', accent: '#88c0d0' } },
  { id: 'rosepine', name: 'Rosé Pine',
    dark: { bg: '#191724', panel: '#1f1d2e', line: '#26233a', text: '#e0def4', muted: '#908caa', red: '#eb6f92', green: '#9ccfd8', yellow: '#f6c177', blue: '#31748f', magenta: '#c4a7e7', cyan: '#9ccfd8', orange: '#f6c177', pink: '#ebbcba', comment: '#6e6a86', accent: '#ebbcba' },
    light: { bg: '#faf4ed', panel: '#fffaf3', line: '#dfdad9', text: '#575279', muted: '#797593', red: '#b4637a', green: '#56949f', yellow: '#ea9d34', blue: '#286983', magenta: '#907aa9', cyan: '#56949f', orange: '#ea9d34', pink: '#d7827e', comment: '#9893a5', accent: '#d7827e' } },
  { id: 'campbell', name: 'Campbell',
    dark: { bg: '#0c0c0c', panel: '#111111', line: '#2a2a2a', text: '#cccccc', muted: '#9a9a9a', red: '#e74856', green: '#16c60c', yellow: '#f9f1a5', blue: '#3b78ff', magenta: '#b4009e', cyan: '#61d6d6', orange: '#c19c00', pink: '#e74856', comment: '#767676', accent: '#3b78ff' } },
];
export const schemeById = (id) => SCHEMES.find((x) => x.id === id) || SCHEMES[0];
/** Schema -> Oberfläche + Syntaxfarben (die acht "Farbblöcke" wie bei fastfetch: dunkel, Rot … Hell) */
function fromScheme(v) {
  return {
    ui: { bg: v.bg, panel: v.panel, panel2: mix(v.bg, v.line, 0.6), line: v.line, text: v.text, muted: v.muted, accent: v.accent },
    syn: { keyword: v.magenta, string: v.green, number: v.orange, comment: v.comment, function: v.blue, type: v.yellow, property: v.cyan, tag: v.red, attr: v.yellow, operator: v.cyan, constant: v.orange, regexp: v.pink, heading: v.blue, link: v.cyan, meta: v.yellow, invalid: v.red },
  };
}
export const schemeBlocks = (v) => [v.line, v.red, v.green, v.yellow, v.blue, v.pink, v.cyan, v.muted];

export const ACCENTS = ['#f5a524', '#ff4d6d', '#ff8a4c', '#facc15', '#4ade9b', '#22c3a6', '#4aa3ff', '#6366f1', '#a78bfa', '#f472b6', '#9ea7b3'];

export const themeById = (id) => THEMES.find((x) => x.id === id) || THEMES[0];

function hexRgb(hex) {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
}
const alpha = (hex, a) => {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};
function luminance(hex) {
  const [r, g, b] = hexRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const mix = (a, b, w) => {
  const x = hexRgb(a), y = hexRgb(b);
  return '#' + x.map((c, i) => Math.round(c * (1 - w) + y[i] * w).toString(16).padStart(2, '0')).join('');
};

/** Setzt alle CSS-Variablen für Design + Modus + Akzentfarbe */
export function applyTheme(settings, systemDark) {
  const theme = themeById(settings.theme);
  let dark = settings.mode === 'dark' || (settings.mode !== 'light' && systemDark);
  let ui, syn;
  // Terminal: Farben aus dem gewählten Schema, durchsichtig wenn das Fenster Acryl/Mica kann (settings.glassActive)
  let glass = 0;
  if (theme.glass) {
    const sch = schemeById(settings.termScheme);
    const v = dark || !sch.light ? sch.dark : sch.light;
    dark = v === sch.dark;
    ({ ui, syn } = fromScheme(v));
    if (settings.termBg) ui = { ...ui, bg: settings.termBg, panel: mix(settings.termBg, '#000000', dark ? 0.18 : 0.04), panel2: mix(settings.termBg, ui.line, 0.6) };
    glass = settings.glassActive ? Math.min(1, Math.max(0.15, Number(settings.termOpacity ?? 0.8))) : 1;
  } else {
    ui = dark ? theme.dark : theme.light;
    syn = SYN[theme.syntax][dark ? 'dark' : 'light'];
  }
  const style = theme.style || 'modern';
  const custom = !!settings.accent;
  let accent = settings.accent || theme.accent || ui.accent;
  // Neutrale Akzente (fast weiß/schwarz) im jeweils anderen Modus lesbar machen
  if (!dark && luminance(accent) > 0.75) accent = mix(accent, '#000000', 0.45);
  const vars = {
    '--bg': ui.bg,
    '--panel': ui.panel,
    '--panel2': ui.panel2,
    '--line': ui.line,
    '--text': ui.text,
    '--muted': ui.muted,
    '--accent': accent,
    '--accent-text': luminance(accent) > 0.45 ? '#111111' : '#ffffff',
    '--accent-soft': alpha(accent, dark ? 0.16 : 0.12),
    '--selection': ui.selection && !custom ? ui.selection : alpha(accent, dark ? 0.3 : 0.24),
    '--selection-match': alpha(accent, dark ? 0.16 : 0.14),
    '--hover': dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    '--active-line': ui.activeLine || (dark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.035)'),
    '--gutter-bg': ui.gutter || ui.bg,
    '--gutter-text': ui.gutterText || mix(ui.muted, ui.bg, 0.35),
    '--shadow': dark ? '0 18px 48px rgba(0,0,0,0.55)' : '0 18px 44px rgba(20,25,40,0.18)',
    '--danger': dark ? '#ff6b6b' : '#d92d2d',
    '--ok': dark ? '#4ade80' : '#15803d',
  };
  if (theme.glass) {
    // alles leicht durchsichtig wie im Terminal; Menüs und Dialoge fast deckend (mit Unschärfe, siehe style.css)
    // --bg liegt nur einmal auf dem ganzen Fenster (body); Leisten/Knöpfe sind darüber nur eine leichte Tönung
    vars['--bg'] = glass < 1 ? alpha(ui.bg, glass) : ui.bg;
    vars['--panel'] = glass < 1 ? alpha(ui.panel, 0.45) : ui.panel;
    vars['--panel2'] = glass < 1 ? alpha(ui.panel2, 0.7) : ui.panel2;
    vars['--gutter-bg'] = 'transparent';
    vars['--popup'] = glass < 1 ? alpha(ui.panel, Math.max(glass, 0.92)) : ui.panel;
    vars['--active-line'] = dark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.04)';
  } else {
    vars['--popup'] = ui.panel;
  }
  for (const [k, v] of Object.entries(syn)) vars[`--syn-${k}`] = v;
  // Notepad++: Schlüsselwörter und Operatoren fett, Kommentare nicht kursiv
  const npp = theme.syntax === 'npp';
  vars['--syn-keyword-weight'] = npp ? 'bold' : 'normal';
  vars['--syn-operator-weight'] = npp ? 'bold' : 'normal';
  vars['--syn-comment-style'] = npp ? 'normal' : 'italic';
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.dataset.style = style;
  root.dataset.mode = dark ? 'dark' : 'light';
  root.dataset.glass = glass && glass < 1 ? '1' : '0';
  root.style.colorScheme = dark ? 'dark' : 'light';
  return { theme, dark, accent, bg: ui.bg };
}

/** Farben eines Designs für die kleinen Vorschauen im Einstellungsfenster */
export function previewColors(themeId, dark, accent, termScheme) {
  const theme = themeById(themeId);
  if (theme.glass) {
    const sch = schemeById(termScheme);
    const { ui, syn } = fromScheme(dark || !sch.light ? sch.dark : sch.light);
    return { ...ui, accent: accent || ui.accent, syn, style: 'terminal', glass: true };
  }
  const ui = dark ? theme.dark : theme.light;
  const syn = SYN[theme.syntax][dark ? 'dark' : 'light'];
  return { ...ui, accent: accent || theme.accent || ui.accent, syn, style: theme.style || 'modern' };
}

/** Licht-Farben für den Ausdruck (Papier ist weiß) */
export function printColors(themeId) {
  const theme = themeById(themeId);
  return theme.glass ? SYN.material.light : SYN[theme.syntax].light;
}
