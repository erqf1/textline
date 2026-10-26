// Alle Sprachen mit Farben: die 143 von CodeMirror (language-data) plus Batch, Makefile und
// Konfigurationsdateien. Erkennung über Dateiname, Endung und Shebang ("#!/usr/bin/env python").
import { LanguageDescription, LanguageSupport, StreamLanguage } from '@codemirror/language';
import { languages as cmLanguages } from '@codemirror/language-data';

const batch = StreamLanguage.define({
  name: 'batch',
  token(stream) {
    if (stream.sol() && stream.match(/^\s*(@?rem\b|::).*/i)) return 'comment';
    if (stream.match(/^"[^"]*"?/)) return 'string';
    if (stream.match(/^%~?\d|^%%~?\w|^%[\w#$@-]+%|^![\w]+!/)) return 'variableName';
    if (stream.sol() && stream.match(/^\s*:\w+/)) return 'labelName';
    if (stream.match(/^@?(echo|set|setlocal|endlocal|if|else|for|in|do|goto|call|exit|pause|shift|cd|chdir|pushd|popd|not|exist|defined|errorlevel|equ|neq|lss|leq|gtr|geq|start|del|erase|copy|move|mkdir|md|rmdir|rd|ren|rename|title|cls|choice|type|xcopy|robocopy|timeout|where|color|find|findstr|tasklist|taskkill)\b/i)) return 'keyword';
    if (stream.match(/^-?\d+\b/)) return 'number';
    if (stream.match(/^(==|[|&<>()]|\^)/)) return 'operator';
    stream.next();
    return null;
  },
  languageData: { commentTokens: { line: 'REM ' } },
});

const makefile = StreamLanguage.define({
  name: 'makefile',
  token(stream) {
    if (stream.match(/^#.*/)) return 'comment';
    if (stream.match(/^\$\([^)]*\)|^\$\{[^}]*\}|^\$[@<^*?%+|]/)) return 'variableName';
    if (stream.sol() && stream.match(/^(ifeq|ifneq|ifdef|ifndef|else|endif|-?include|define|endef|export|unexport|override|vpath)\b/)) return 'keyword';
    if (stream.sol() && stream.match(/^\.[A-Z_]+(?=\s*:)/)) return 'keyword';
    if (stream.sol() && stream.match(/^[A-Za-z_][\w.-]*(?=\s*(::?=|\?=|\+=|=))/)) return 'definition';
    if (stream.sol() && stream.match(/^[^\s:#=]+(?=\s*::?(?!=))/)) return 'typeName';
    if (stream.match(/^"(?:[^"\\]|\\.)*"?|^'(?:[^'\\]|\\.)*'?/)) return 'string';
    if (stream.match(/^(::?=|\?=|\+=|=|:)/)) return 'operator';
    stream.next();
    return null;
  },
  languageData: { commentTokens: { line: '#' } },
});

const custom = [
  LanguageDescription.of({ name: 'Batch', alias: ['bat', 'cmd'], extensions: ['bat', 'cmd'], support: new LanguageSupport(batch) }),
  LanguageDescription.of({ name: 'Makefile', alias: ['make'], extensions: ['mk', 'mak'], filename: /^(GNUmakefile|makefile|Makefile)$/, support: new LanguageSupport(makefile) }),
];

export const PLAIN = 'Plain Text';
export const ALL = [...custom, ...cmLanguages];
const byName = new Map(ALL.map((l) => [l.name.toLowerCase(), l]));
export const findLanguage = (name) => (name ? byName.get(name.toLowerCase()) || null : null);

// Beliebte zuerst in der Auswahl
export const POPULAR = ['Python', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'JSON', 'Markdown', 'XML', 'YAML', 'SQL', 'C', 'C++', 'C#', 'Java', 'PHP', 'Shell', 'PowerShell', 'Batch', 'Lua', 'Rust', 'Go'];

// Endungen, bei denen CodeMirror falsch oder gar nicht rät
const EXT = {
  m: 'Octave', txt: null, log: null, csv: null, tsv: null, text: null, nfo: null,
  env: 'Properties files', cfg: 'Properties files', conf: 'Properties files', ini: 'Properties files', reg: 'Properties files',
  gitignore: 'Shell', gitattributes: 'Properties files', editorconfig: 'Properties files', npmrc: 'Properties files',
  bashrc: 'Shell', zshrc: 'Shell', profile: 'Shell', zsh: 'Shell', fish: 'Shell',
  pyi: 'Python', ipy: 'Python', mjs: 'JavaScript', jsonc: 'JSON', json5: 'JSON', webmanifest: 'JSON',
  htm: 'HTML', xhtml: 'HTML', svg: 'XML', plist: 'XML', csproj: 'XML', xaml: 'XML', resx: 'XML',
  h: 'C', hpp: 'C++', hh: 'C++', ino: 'C++', kts: 'Kotlin', gradle: 'Groovy', ps1: 'PowerShell', psm1: 'PowerShell',
  tex: 'LaTeX', sty: 'LaTeX', cls: 'LaTeX', bib: 'LaTeX', vbs: 'VBScript', bas: 'VB.NET',
};
const NAMES = {
  'cmakelists.txt': 'CMake', dockerfile: 'Dockerfile', containerfile: 'Dockerfile', makefile: 'Makefile', gnumakefile: 'Makefile',
  'requirements.txt': 'Properties files', '.env': 'Properties files', '.gitignore': 'Shell', 'nginx.conf': 'Nginx',
  'pipfile': 'TOML', 'cargo.lock': 'TOML', 'jenkinsfile': 'Groovy', 'vagrantfile': 'Ruby', 'gemfile': 'Ruby', 'rakefile': 'Ruby',
};
const SHEBANG = [
  [/python/, 'Python'], [/\bnode\b|deno|bun/, 'JavaScript'], [/\b(ba|z|k|da)?sh\b/, 'Shell'], [/ruby/, 'Ruby'],
  [/perl/, 'Perl'], [/php/, 'PHP'], [/lua/, 'Lua'], [/pwsh|powershell/, 'PowerShell'], [/\bR\b|Rscript/, 'R'],
];

/** Sprache für eine Datei; null = reiner Text */
export function detectLanguage(fileName, firstLine = '') {
  const base = (fileName || '').split(/[\\/]/).pop();
  const lower = base.toLowerCase();
  if (lower in NAMES) return findLanguage(NAMES[lower]);
  if (lower.startsWith('.env')) return findLanguage('Properties files');
  if (lower.startsWith('dockerfile')) return findLanguage('Dockerfile');
  const dot = lower.lastIndexOf('.');
  const ext = dot >= 0 ? lower.slice(dot + 1) : "";
  if (ext && ext in EXT) {
    if (EXT[ext] === null) return shebangLanguage(firstLine);
    return findLanguage(EXT[ext]);
  }
  const hit = LanguageDescription.matchFilename(ALL, base);
  if (hit) return hit;
  return shebangLanguage(firstLine);
}

function shebangLanguage(firstLine) {
  if (!firstLine.startsWith('#!')) return null;
  for (const [re, name] of SHEBANG) if (re.test(firstLine)) return findLanguage(name);
  return null;
}

/** Endung für "Speichern unter" einer neuen Datei in dieser Sprache */
export function defaultExtension(lang) {
  if (!lang) return 'txt';
  const special = { Python: 'py', JavaScript: 'js', TypeScript: 'ts', Markdown: 'md', 'C++': 'cpp', Shell: 'sh', Batch: 'bat', 'Properties files': 'ini', LaTeX: 'tex', Makefile: 'mk', YAML: 'yml' };
  return special[lang.name] || (lang.extensions && lang.extensions[0]) || 'txt';
}

/** Kurzer Anzeigename in der Statusleiste */
export function displayName(lang) {
  if (!lang) return PLAIN;
  return lang.name === 'Properties files' ? 'INI / Properties' : lang.name;
}
