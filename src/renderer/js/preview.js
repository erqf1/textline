// Vorschau rechts neben dem Editor: Markdown als Dokument, HTML so, wie der Browser es zeigt
// (ohne Skripte - die könnten sonst auf Textline zugreifen; "Im Browser öffnen" zeigt alles).
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: false });

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function mdCss() {
  const c = (n) => cssVar(n);
  return `
  :root { color-scheme: ${document.documentElement.dataset.mode}; }
  body { margin: 0; padding: 28px 36px 60px; font: 15px/1.65 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: ${c('--text')}; background: ${c('--bg')}; max-width: 860px; }
  h1, h2, h3, h4 { line-height: 1.25; margin: 1.4em 0 0.5em; }
  h1 { font-size: 2em; border-bottom: 1px solid ${c('--line')}; padding-bottom: .3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid ${c('--line')}; padding-bottom: .25em; }
  a { color: ${c('--accent')}; }
  code { font-family: ${c('--editor-font') || 'monospace'}; font-size: .9em; background: ${c('--panel2')}; padding: .15em .4em; border-radius: 5px; }
  pre { background: ${c('--panel')}; border: 1px solid ${c('--line')}; padding: 12px 14px; border-radius: 8px; overflow: auto; }
  pre code { background: none; padding: 0; }
  blockquote { margin: 0; padding: 0 1em; color: ${c('--muted')}; border-left: 4px solid ${c('--line')}; }
  table { border-collapse: collapse; } th, td { border: 1px solid ${c('--line')}; padding: 6px 12px; } th { background: ${c('--panel')}; }
  img { max-width: 100%; } hr { border: 0; border-top: 1px solid ${c('--line')}; }
  input[type=checkbox] { margin-right: .4em; }`;
}

export function createPreview({ frame, api }) {
  let last = '';
  const baseTag = (dir) => (dir ? `<base href="${encodeURI(`file:///${dir.replace(/\\/g, '/').replace(/^\/+/, '')}/`)}">` : '');

  function render(kind, text, dir) {
    let html;
    if (kind === 'markdown') {
      html = `<!doctype html><html><head><meta charset="utf-8">${baseTag(dir)}<style>${mdCss()}</style></head><body>${marked.parse(text)}</body></html>`;
    } else {
      const base = baseTag(dir);
      html = /<head[^>]*>/i.test(text) ? text.replace(/<head[^>]*>/i, (m) => m + base) : base + text;
    }
    if (html === last) return;
    last = html;
    frame.srcdoc = html;
  }

  // Links aus der Vorschau im normalen Browser öffnen statt in der Vorschau
  frame.addEventListener('load', () => {
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (href.startsWith('#')) return;
      e.preventDefault();
      if (/^https?:/i.test(a.href)) api.openExternal(a.href);
    });
  });

  return { render, reset: () => { last = ''; } };
}
