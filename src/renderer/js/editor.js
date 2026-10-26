// CodeMirror-Aufbau für Textline: ein EditorView, pro Tab ein eigener EditorState (mit eigenem Rückgängig-Verlauf).
// Alle einstellbaren Teile hängen in Compartments, damit Einstellungen ohne Neuladen greifen.
import { EditorState, Compartment, EditorSelection, Prec, countColumn } from '@codemirror/state';
import {
  EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor,
  rectangularSelection, crosshairCursor, highlightActiveLine, highlightWhitespace, highlightTrailingWhitespace,
} from '@codemirror/view';
import {
  defaultKeymap, history, historyKeymap, indentMore, indentLess, insertNewlineAndIndent, addCursorAbove, addCursorBelow,
} from '@codemirror/commands';
import {
  indentOnInput, syntaxHighlighting, bracketMatching, foldGutter, foldKeymap, indentUnit, HighlightStyle,
  getIndentUnit, indentString, ensureSyntaxTree, language as languageFacet,
} from '@codemirror/language';
import { search, searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap, completeAnyWord } from '@codemirror/autocomplete';
import { linter, lintGutter, lintKeymap } from '@codemirror/lint';
import { tags as t, highlightTree } from '@lezer/highlight';

// ---------------------------------------------------------------- Farben (über CSS-Variablen aus dem Design)
const v = (name) => `var(--syn-${name})`;
export const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword, t.modifier], color: v('keyword') },
  { tag: [t.string, t.special(t.string), t.character, t.docString, t.attributeValue], color: v('string') },
  { tag: [t.number, t.integer, t.float, t.bool, t.null, t.atom, t.unit], color: v('number') },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: v('comment'), fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.function(t.definition(t.variableName)), t.macroName], color: v('function') },
  { tag: [t.typeName, t.className, t.namespace, t.definition(t.typeName), t.definition(t.className)], color: v('type') },
  { tag: [t.propertyName, t.attributeName, t.definition(t.propertyName)], color: v('property') },
  { tag: [t.tagName, t.angleBracket], color: v('tag') },
  { tag: [t.operator, t.derefOperator, t.arithmeticOperator, t.logicOperator, t.bitwiseOperator, t.compareOperator, t.updateOperator], color: v('operator') },
  { tag: [t.constant(t.variableName), t.standard(t.variableName), t.self, t.special(t.variableName)], color: v('constant') },
  { tag: [t.regexp, t.escape, t.special(t.brace)], color: v('regexp') },
  { tag: [t.heading, t.heading1, t.heading2, t.heading3], color: v('heading'), fontWeight: 'bold' },
  { tag: [t.link, t.url], color: v('link'), textDecoration: 'underline' },
  { tag: [t.meta, t.processingInstruction, t.annotation, t.labelName, t.documentMeta], color: v('meta') },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.invalid, color: v('invalid') },
  { tag: t.definition(t.variableName), color: v('function') },
  { tag: [t.inserted], color: v('string') },
  { tag: [t.deleted], color: v('invalid') },
  { tag: [t.changed], color: v('meta') },
]);

const theme = EditorView.theme({
  '&': { height: '100%', color: 'var(--text)', backgroundColor: 'var(--bg)', fontSize: 'var(--editor-size)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--editor-font)', lineHeight: '1.6' },
  '.cm-content': { caretColor: 'var(--accent)', padding: '8px 0 40vh' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'var(--selection) !important' },
  '.cm-activeLine': { backgroundColor: 'var(--active-line)' },
  '.cm-gutters': { backgroundColor: 'var(--bg)', color: 'var(--gutter-text)', border: 'none' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--text)' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 16px', minWidth: '28px' },
  '.cm-foldGutter .cm-gutterElement': { padding: '0 4px', color: 'var(--gutter-text)', cursor: 'pointer' },
  '.cm-foldGutter .cm-gutterElement:hover': { color: 'var(--text)' },
  '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': { backgroundColor: 'var(--accent-soft)', outline: '1px solid var(--accent)', borderRadius: '2px' },
  '.cm-nonmatchingBracket, &.cm-focused .cm-nonmatchingBracket': { color: 'var(--danger)', backgroundColor: 'transparent' },
  '.cm-selectionMatch': { backgroundColor: 'var(--selection-match)' },
  '.cm-searchMatch': { backgroundColor: 'var(--selection-match)', outline: '1px solid var(--accent)' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'var(--selection)' },
  '.cm-foldPlaceholder': { backgroundColor: 'var(--panel2)', border: '1px solid var(--line)', color: 'var(--muted)', padding: '0 6px', borderRadius: '4px' },
  '.cm-tooltip': { backgroundColor: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow)' },
  '.cm-tooltip-autocomplete > ul': { fontFamily: 'var(--editor-font)', maxHeight: '16em' },
  '.cm-tooltip-autocomplete > ul > li': { padding: '2px 10px !important' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' },
  '.cm-completionMatchedText': { textDecoration: 'none', fontWeight: '700' },
  '.cm-diagnostic-error': { borderLeftColor: 'var(--danger)' },
  '.cm-lintRange-error': { backgroundImage: 'none', textDecoration: 'underline wavy var(--danger)', textUnderlineOffset: '3px' },
  '.cm-highlightSpace': { backgroundImage: 'radial-gradient(circle at 50% 55%, var(--gutter-text) 11%, transparent 5%)' },
  '.cm-highlightTab': { backgroundImage: 'none', position: 'relative' },
  '.cm-highlightTab::before': { content: '"→"', position: 'absolute', color: 'var(--gutter-text)', left: '2px' },
  '.cm-trailingSpace': { backgroundColor: 'var(--selection-match)' },
  '.cm-panels': { backgroundColor: 'var(--panel)', color: 'var(--text)' },
  '.cm-panels.cm-panels-top': { borderBottom: '1px solid var(--line)' },
  '.cm-panels.cm-panels-bottom': { borderTop: '1px solid var(--line)' },
  '.cm-placeholder': { color: 'var(--gutter-text)' },
});

// ---------------------------------------------------------------- Einrücken wie in guten Editoren
/** Tab: ohne Auswahl bis zum nächsten Tabstopp einrücken (Leerzeichen oder Tab), mit Auswahl die Zeilen einrücken */
function smartTab(view) {
  const st = view.state;
  if (st.readOnly) return false;
  if (st.selection.ranges.some((r) => !r.empty)) return indentMore(view);
  const unit = st.facet(indentUnit);
  if (unit === '\t') {
    view.dispatch(st.update(st.replaceSelection('\t'), { scrollIntoView: true, userEvent: 'input' }));
    return true;
  }
  const width = unit.length;
  view.dispatch(st.update(st.changeByRange((range) => {
    const line = st.doc.lineAt(range.from);
    const col = countColumn(line.text.slice(0, range.from - line.from), st.tabSize);
    const n = width - (col % width);
    return { changes: { from: range.from, insert: ' '.repeat(n) }, range: EditorSelection.cursor(range.from + n) };
  }), { scrollIntoView: true, userEvent: 'input' }));
  return true;
}

/** Python: nach return/pass/break/continue/raise eine Ebene zurück (wie in IDLE und Thonny) */
function pythonEnter(view) {
  const st = view.state;
  const lang = st.facet(languageFacet);
  if (!lang || lang.name !== 'python' || st.selection.ranges.length !== 1) return false;
  const r = st.selection.main;
  if (!r.empty) return false;
  const line = st.doc.lineAt(r.head);
  if (r.head !== line.to || !/^\s*(return\b.*|pass|break|continue|raise\b.*)\s*$/.test(line.text)) return false;
  const col = countColumn(/^\s*/.exec(line.text)[0], st.tabSize);
  const insert = '\n' + indentString(st, Math.max(0, col - getIndentUnit(st)));
  view.dispatch(st.update({ changes: { from: r.head, insert }, selection: { anchor: r.head + insert.length }, scrollIntoView: true, userEvent: 'input' }));
  return true;
}

/** Enter in einer Zeile, die nur aus Leerraum besteht: Leerraum nicht stehen lassen (keine "toten" Leerzeichen) */
function cleanEnter(view) {
  const st = view.state;
  if (st.selection.ranges.length !== 1 || !st.selection.main.empty) return false;
  const line = st.doc.lineAt(st.selection.main.head);
  if (line.length === 0 || /\S/.test(line.text) || st.selection.main.head !== line.to) return false;
  const insert = '\n' + line.text;
  view.dispatch(st.update({ changes: { from: line.from, to: line.to, insert }, selection: { anchor: line.from + insert.length }, scrollIntoView: true, userEvent: 'input' }));
  return true;
}

// ---------------------------------------------------------------- Compartments
const C = {
  lang: new Compartment(), indent: new Compartment(), wrap: new Compartment(), gutters: new Compartment(),
  active: new Compartment(), spaces: new Compartment(), brackets: new Compartment(), complete: new Compartment(),
  lint: new Compartment(), readOnly: new Compartment(), phrases: new Compartment(), dark: new Compartment(),
};

function parts(o) {
  return {
    lang: o.support || [],
    indent: [EditorState.tabSize.of(o.tabSize || 4), indentUnit.of(o.useTabs ? '\t' : ' '.repeat(o.tabSize || 4))],
    wrap: o.wrap ? EditorView.lineWrapping : [],
    gutters: o.lineNumbers === false ? [foldGutter(foldMarkers)] : [lineNumbers(), highlightActiveLineGutter(), foldGutter(foldMarkers)],
    active: o.activeLine === false ? [] : highlightActiveLine(),
    spaces: o.whitespace ? [highlightWhitespace(), highlightTrailingWhitespace()] : [],
    brackets: o.closeBrackets === false ? [] : closeBrackets(),
    complete: o.autocomplete === false ? [] : autocompletion({ activateOnTypingDelay: 120, icons: false }),
    lint: o.lint ? [o.lint, lintGutter()] : [],
    readOnly: [EditorState.readOnly.of(!!o.readOnly), EditorView.editable.of(!o.readOnly)],
    phrases: EditorState.phrases.of(o.phrases || {}),
    dark: EditorView.darkTheme.of(!!o.dark),
  };
}

const foldMarkers = {
  markerDOM(open) {
    const el = document.createElement('span');
    el.className = 'tl-fold';
    el.innerHTML = open
      ? '<svg viewBox="0 0 16 16" width="12" height="12"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg viewBox="0 0 16 16" width="12" height="12"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return el;
  },
};

/** Neuer Zustand für einen Tab. o: Optionen (siehe parts), onChange: (update) => void, keys: App-Tastenkürzel */
export function createState(doc, o, extra = []) {
  const p = parts(o);
  return EditorState.create({
    doc,
    selection: o.selection,
    extensions: [
      Prec.highest(keymap.of([
        { key: 'Enter', run: (view) => pythonEnter(view) || cleanEnter(view) },
        { key: 'Tab', run: smartTab, shift: indentLess },
        { key: 'Mod-Alt-ArrowUp', run: addCursorAbove },
        { key: 'Mod-Alt-ArrowDown', run: addCursorBelow },
      ])),
      ...extra,
      highlightSpecialChars(),
      history(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(highlight, { fallback: true }),
      bracketMatching(),
      rectangularSelection(),
      crosshairCursor(),
      highlightSelectionMatches({ minSelectionLength: 2 }),
      search({ top: true }),
      EditorState.languageData.of(() => [{ autocomplete: completeAnyWord }]),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap.filter((b) => b.key !== 'Mod-Enter'),
        ...searchKeymap.filter((b) => !['Mod-g', 'Shift-Mod-g', 'Mod-Alt-g'].includes(b.key)),
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap,
        { key: 'Enter', run: insertNewlineAndIndent },
      ]),
      theme,
      ...Object.entries(p).map(([k, ext]) => C[k].of(ext)),
    ],
  });
}

/** Einstellungen auf einen bestehenden Zustand anwenden (nur die genannten Teile) */
export function reconfigure(o, keys) {
  const p = parts(o);
  return (keys || Object.keys(p)).map((k) => C[k].reconfigure(p[k]));
}

/** Syntaxprüfung (Python): checker(text) liefert null oder {line, col, endLine, endCol, msg} */
export function pythonLinter(checker, label) {
  return linter(async (view) => {
    const doc = view.state.doc;
    if (doc.length > 2_000_000) return [];
    const err = await checker(doc.toString());
    if (!err || !err.line || view.state.doc !== doc) return [];
    const line = doc.line(Math.min(Math.max(1, err.line), doc.lines));
    const from = Math.min(line.to, line.from + Math.max(0, (err.col || 1) - 1));
    let to = line.to;
    if (err.endLine === err.line && err.endCol && err.endCol > err.col) to = Math.min(line.to, line.from + err.endCol - 1);
    if (to <= from) to = Math.min(line.to, from + 1);
    return [{ from, to: Math.max(to, from), severity: 'error', message: `${label}: ${err.msg}` }];
  }, { delay: 700 });
}

// ---------------------------------------------------------------- Befehle für Menüs
export function goToLine(view, lineNo, col = 1) {
  const doc = view.state.doc;
  const line = doc.line(Math.min(Math.max(1, lineNo), doc.lines));
  const pos = Math.min(line.to, line.from + Math.max(0, col - 1));
  view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
  view.focus();
}

/** Ausgewählten Text umwandeln (ganzes Dokument, wenn nichts ausgewählt ist, nur bei sortLines) */
export function transformSelection(view, fn) {
  const st = view.state;
  if (st.readOnly) return;
  view.dispatch(st.update(st.changeByRange((r) => {
    if (r.empty) {
      const word = st.wordAt(r.head);
      if (!word) return { range: r };
      const text = fn(st.sliceDoc(word.from, word.to));
      return { changes: { from: word.from, to: word.to, insert: text }, range: EditorSelection.cursor(r.head) };
    }
    const text = fn(st.sliceDoc(r.from, r.to));
    return { changes: { from: r.from, to: r.to, insert: text }, range: EditorSelection.range(r.from, r.from + text.length) };
  }), { userEvent: 'input' }));
}

export function sortLines(view, desc) {
  const st = view.state;
  const r = st.selection.main;
  const fromLine = st.doc.lineAt(r.empty ? 0 : r.from);
  const toLine = st.doc.lineAt(r.empty ? st.doc.length : r.to);
  const lines = st.sliceDoc(fromLine.from, toLine.to).split('\n');
  lines.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  if (desc) lines.reverse();
  view.dispatch({ changes: { from: fromLine.from, to: toLine.to, insert: lines.join('\n') }, userEvent: 'input' });
}

/** Änderungen, die Leerzeichen am Zeilenende entfernen */
export function trailingWhitespaceChanges(state) {
  const changes = [];
  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
    const m = /[ \t]+$/.exec(line.text);
    if (m) changes.push({ from: line.to - m[0].length, to: line.to });
  }
  return changes;
}

/** Einrückung umwandeln: führende Tabs <-> Leerzeichen */
export function convertIndentation(state, toTabs, size) {
  const changes = [];
  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
    const lead = /^[ \t]*/.exec(line.text)[0];
    if (!lead) continue;
    const cols = countColumn(lead, size);
    const next = toTabs ? '\t'.repeat(Math.floor(cols / size)) + ' '.repeat(cols % size) : ' '.repeat(cols);
    if (next !== lead) changes.push({ from: line.from, to: line.from + lead.length, insert: next });
  }
  return changes;
}

/** Einrückung einer Datei erraten: { useTabs, size } oder null */
export function detectIndentation(text) {
  let tabs = 0, spaces = 0;
  const steps = new Map();
  let prev = 0;
  const lines = text.split('\n', 5000);
  for (const l of lines) {
    if (!l.trim()) continue;
    const lead = /^[ \t]*/.exec(l)[0];
    if (lead.startsWith('\t')) tabs++;
    else if (lead.length) spaces++;
    const n = lead.replace(/\t/g, '    ').length;
    const d = Math.abs(n - prev);
    if (!lead.includes('\t') && d >= 2 && d <= 8) steps.set(d, (steps.get(d) || 0) + 1);
    prev = n;
  }
  if (!tabs && !spaces) return null;
  if (tabs > spaces) return { useTabs: true, size: 4 };
  let best = 4, bestN = 0;
  for (const [d, n] of steps) if (n > bestN || (n === bestN && d < best)) [best, bestN] = [d, n];
  return { useTabs: false, size: [2, 3, 4, 8].includes(best) ? best : 4 };
}

// ---------------------------------------------------------------- Drucken: eingefärbter Code als HTML
export function highlightedHtml(state, colors) {
  const tree = ensureSyntaxTree(state, state.doc.length, 4000);
  const text = state.doc.toString();
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const style = {
    keyword: colors.keyword, string: colors.string, number: colors.number, comment: colors.comment, function: colors.function,
    type: colors.type, property: colors.property, tag: colors.tag, operator: colors.operator, constant: colors.constant,
    regexp: colors.regexp, heading: colors.heading, link: colors.link, meta: colors.meta, invalid: colors.invalid,
  };
  // Eigene kleine Zuordnung Tag -> Farbklasse (wie highlight oben, nur mit festen Farben)
  const printStyle = HighlightStyle.define(highlight.specs.map((s) => {
    const color = typeof s.color === 'string' && s.color.startsWith('var(--syn-') ? style[s.color.slice(10, -1)] : undefined;
    return { ...s, color };
  }));
  let out = '';
  let pos = 0;
  if (tree) {
    highlightTree(tree, printStyle, (from, to, classes) => {
      if (from > pos) out += esc(text.slice(pos, from));
      out += `<span class="${classes}">${esc(text.slice(from, to))}</span>`;
      pos = to;
    });
  }
  out += esc(text.slice(pos));
  return { html: out, css: printStyle.module ? printStyle.module.getRules() : '' };
}

export { EditorView, EditorState, EditorSelection };
