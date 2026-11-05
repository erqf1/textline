'use strict';

// Dateigruppen für "Als Standard-App festlegen" (Textline). primary = vorausgewählt, wenn kein anderes
// W-Software-Programm den Typ schon hat. HTML und SVG nicht: die gehören eher dem Browser, Webline oder Picline.
// exts = Windows (wie in build/installer.nsh, ohne .ts: das ist auch das Videoformat MPEG-TS), mimes = Linux, utis = macOS
module.exports = {
  name: 'Textline',
  desktopId: 'win.mert.Textline.desktop',
  bundleId: 'win.mert.Textline',
  groups: [
    { id: 'text', label: { en: 'Text files', de: 'Textdateien' }, exts: ['txt', 'text', 'log'], mimes: ['text/plain', 'text/x-log'], utis: ['public.plain-text', 'com.apple.log'], primary: true },
    { id: 'md', label: { en: 'Markdown', de: 'Markdown' }, exts: ['md', 'markdown', 'rst'], mimes: ['text/markdown', 'text/x-markdown'], utis: ['net.daringfireball.markdown'], primary: true },
    { id: 'py', label: { en: 'Python', de: 'Python' }, exts: ['py', 'pyw', 'pyi'], mimes: ['text/x-python', 'text/x-python3'], utis: ['public.python-script'], primary: true },
    { id: 'data', label: { en: 'Data and settings', de: 'Daten und Einstellungen' }, exts: ['json', 'jsonc', 'xml', 'yaml', 'yml', 'ini', 'toml', 'cfg', 'conf', 'properties', 'env', 'csv', 'tsv'], mimes: ['application/json', 'application/xml', 'text/xml', 'application/x-yaml', 'application/toml', 'text/csv', 'text/tab-separated-values'], utis: ['public.json', 'public.xml', 'public.yaml', 'public.comma-separated-values-text'], primary: true },
    { id: 'code', label: { en: 'Source code (C, C++, C#, Java, Go, Rust …)', de: 'Quellcode (C, C++, C#, Java, Go, Rust …)' }, exts: ['c', 'h', 'cpp', 'cc', 'cxx', 'hpp', 'hh', 'cs', 'java', 'kt', 'kts', 'go', 'rs', 'rb', 'php', 'lua', 'sql', 'tex', 'diff', 'patch', 'srt'], mimes: ['text/x-csrc', 'text/x-chdr', 'text/x-c++src', 'text/x-c++hdr', 'text/x-csharp', 'text/x-java', 'text/x-go', 'text/rust', 'application/x-ruby', 'application/x-php', 'text/x-lua', 'text/x-sql', 'text/x-tex', 'text/x-diff'], utis: ['public.c-source', 'public.c-header', 'public.c-plus-plus-source', 'com.sun.java-source', 'public.ruby-script', 'public.php-script'], primary: true },
    { id: 'web', label: { en: 'CSS, JavaScript, TypeScript', de: 'CSS, JavaScript, TypeScript' }, exts: ['css', 'scss', 'sass', 'less', 'mjs', 'cjs', 'jsx', 'tsx'], mimes: ['text/css', 'text/x-scss', 'application/javascript', 'text/javascript', 'application/typescript'], utis: ['public.css', 'com.netscape.javascript-source'], primary: true },
    { id: 'sh', label: { en: 'Shell scripts', de: 'Shell-Skripte' }, exts: ['sh', 'bash', 'zsh', 'fish', 'psm1'], mimes: ['application/x-shellscript'], utis: ['public.shell-script'], primary: false },
    { id: 'html', label: { en: 'HTML pages', de: 'HTML-Seiten' }, exts: ['html', 'htm'], mimes: ['text/html'], utis: ['public.html'], primary: false },
    { id: 'svg', label: { en: 'SVG graphics', de: 'SVG-Grafiken' }, exts: ['svg'], mimes: ['image/svg+xml'], utis: ['public.svg-image'], primary: false },
  ],
};
