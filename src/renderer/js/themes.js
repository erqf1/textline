// Designs: Farben der Oberfläche und der Syntax, jeweils hell und dunkel.
// "standard" sieht aus wie Cutline/Clipline/Webcase, "simple" ist eckig und schlicht wie der Windows-Editor
// (dort gibt es keine eigene Akzentfarbe, nur hell/dunkel). Alle anderen nehmen jede Akzentfarbe.

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
    id: 'simple', accent: null, syntax: 'vs', simple: true,
    dark: { bg: '#1e1e1e', panel: '#2b2b2b', panel2: '#333333', line: '#454545', text: '#d4d4d4', muted: '#9d9d9d', accent: '#3794ff', selection: '#264f78' },
    light: { bg: '#ffffff', panel: '#f3f3f3', panel2: '#e8e8e8', line: '#d0d0d0', text: '#000000', muted: '#5f5f5f', accent: '#0067c0', selection: '#add6ff' },
  },
];

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
  const dark = settings.mode === 'dark' || (settings.mode !== 'light' && systemDark);
  const ui = dark ? theme.dark : theme.light;
  const syn = SYN[theme.syntax][dark ? 'dark' : 'light'];
  let accent = theme.simple ? ui.accent : settings.accent || theme.accent;
  // Neutrale Akzente (fast weiß/schwarz) im jeweils anderen Modus lesbar machen
  if (!theme.simple && !dark && luminance(accent) > 0.75) accent = mix(accent, '#000000', 0.45);
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
    '--selection': theme.simple ? ui.selection : alpha(accent, dark ? 0.3 : 0.24),
    '--selection-match': alpha(accent, dark ? 0.16 : 0.14),
    '--hover': dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    '--active-line': dark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.035)',
    '--gutter-text': mix(ui.muted, ui.bg, 0.35),
    '--shadow': dark ? '0 18px 48px rgba(0,0,0,0.55)' : '0 18px 44px rgba(20,25,40,0.18)',
    '--danger': dark ? '#ff6b6b' : '#d92d2d',
    '--ok': dark ? '#4ade80' : '#15803d',
  };
  for (const [k, v] of Object.entries(syn)) vars[`--syn-${k}`] = v;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.dataset.style = theme.simple ? 'simple' : 'modern';
  root.dataset.mode = dark ? 'dark' : 'light';
  root.style.colorScheme = dark ? 'dark' : 'light';
  return { theme, dark, accent };
}

/** Farben eines Designs für die kleinen Vorschauen im Einstellungsfenster */
export function previewColors(themeId, dark, accent) {
  const theme = themeById(themeId);
  const ui = dark ? theme.dark : theme.light;
  const syn = SYN[theme.syntax][dark ? 'dark' : 'light'];
  return { ...ui, accent: theme.simple ? ui.accent : accent || theme.accent, syn };
}

/** Licht-Farben für den Ausdruck (Papier ist weiß) */
export function printColors(themeId) {
  return SYN[themeById(themeId).syntax].light;
}
