'use strict';

// Bilder für die Website (unsichtbar): textline --siteshots <ordner>
// Saubere Beispieldateien auf Englisch und Deutsch, je Sprache: Editor (hell/dunkel), Programm mit Konsole, Fehlermeldung,
// Syntaxfehler, Pakete, Markdown- und HTML-Vorschau, viele Dateitypen, Suchen/Ersetzen, mehrere Cursor, Menü, alle
// Designs hell und dunkel, Terminal-Farbschemata, alle Einstellungsseiten und kleine Dialoge.
// Ergebnis: <ordner>/shots/<name>-<sprache>.png und <ordner>/webp/<name>-<sprache>.webp
// Scharf für die Website: zusätzlich --force-device-scale-factor=2. Nur einige Bilder: TEXTLINE_SHOTS=editor,theme
// (Anfang des Namens), nur eine Sprache: TEXTLINE_SHOT_LANGS=de
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const TEXT = {
  en: {
    game: [
      '# A small game: guess the number',
      'import random',
      '',
      '',
      'def guess(maximum: int = 100) -> int:',
      '    """Lets the player guess a number and counts the tries."""',
      '    target = random.randint(1, maximum)',
      '    tries = 0',
      '    while True:',
      '        tip = int(input(f"Number between 1 and {maximum}: "))',
      '        tries += 1',
      '        if tip < target:',
      '            print("Too small!")',
      '        elif tip > target:',
      '            print("Too big!")',
      '        else:',
      '            print(f"Correct after {tries} tries 🎉")',
      '            return tries',
      '',
      '',
      'if __name__ == "__main__":',
      '    guess()',
      '',
    ],
    hello: 'name = input("What\'s your name? ")\nprint(f"Hello {name}!")\n\nfor i in range(1, 4):\n    print(f"{i} × 7 = {i * 7}")\n',
    who: 'Alex',
    files: { game: 'guess.py', hello: 'hello.py', md: 'README.md' },
    md: '# Notes\n\nA **fast** editor for text and code.\n\n- Colours for 140+ languages\n- Python with a console\n- Packages from PyPI\n\n```python\nprint("Hello")\n```\n\n| Key | Action |\n|---|---|\n| F5 | Run |\n| Ctrl+F | Find |\n',
  },
  de: {
    game: [
      '# Kleines Spiel: Zahl raten',
      'import random',
      '',
      '',
      'def raten(maximum: int = 100) -> int:',
      '    """Lässt den Spieler eine Zahl raten und zählt die Versuche."""',
      '    ziel = random.randint(1, maximum)',
      '    versuche = 0',
      '    while True:',
      '        tipp = int(input(f"Zahl zwischen 1 und {maximum}: "))',
      '        versuche += 1',
      '        if tipp < ziel:',
      '            print("Zu klein!")',
      '        elif tipp > ziel:',
      '            print("Zu groß!")',
      '        else:',
      '            print(f"Richtig nach {versuche} Versuchen 🎉")',
      '            return versuche',
      '',
      '',
      'if __name__ == "__main__":',
      '    raten()',
      '',
    ],
    hello: 'name = input("Wie heißt du? ")\nprint(f"Hallo {name}!")\n\nfor i in range(1, 4):\n    print(f"{i} × 7 = {i * 7}")\n',
    who: 'Alex',
    files: { game: 'raten.py', hello: 'hallo.py', md: 'Notizen.md' },
    md: '# Notizen\n\nEin **schneller** Editor für Text und Code.\n\n- Farben für 140+ Sprachen\n- Python mit Konsole\n- Pakete von PyPI\n\n```python\nprint("Hallo")\n```\n\n| Taste | Aktion |\n|---|---|\n| F5 | Ausführen |\n| Strg+F | Suchen |\n',
  },
};

// Beispieldateien für "viele Dateitypen" - Kommentare je Sprache, Code gleich
const c = (lang, en, de) => (lang === 'de' ? de : en);
const SAMPLES = (lang) => ({
  html: ['index.html', `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <title>${c(lang, 'My page', 'Meine Seite')}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- ${c(lang, 'Header with navigation', 'Kopf mit Navigation')} -->
  <header class="top">
    <h1>${c(lang, 'Hello world', 'Hallo Welt')}</h1>
    <nav>
      <a href="#start">Start</a>
      <a href="#about">${c(lang, 'About', 'Über mich')}</a>
    </nav>
  </header>
  <main>
    <p>${c(lang, 'Made with', 'Gemacht mit')} <strong>Textline</strong>.</p>
    <button onclick="greet()">${c(lang, 'Click me', 'Klick mich')}</button>
  </main>
  <script src="app.js"></script>
</body>
</html>
`],
  css: ['style.css', `/* ${c(lang, 'Colours and layout', 'Farben und Aufbau')} */
:root {
  --accent: #4f8ff7;
  --text: #1d2330;
  --radius: 8px;
}

body {
  margin: 0;
  font: 16px/1.6 system-ui, sans-serif;
  color: var(--text);
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
}

button {
  border: 0;
  border-radius: var(--radius);
  background: var(--accent);
  color: white;
  padding: 8px 16px;
}

@media (max-width: 600px) {
  .top { flex-direction: column; }
}
`],
  js: ['app.js', `// ${c(lang, 'Greets the visitor and counts the clicks', 'Begrüßt den Besucher und zählt die Klicks')}
const greeting = document.querySelector('h1');
let clicks = 0;

function greet() {
  clicks += 1;
  greeting.textContent = \`${c(lang, 'Hello', 'Hallo')} #\${clicks}\`;
}

async function loadNews(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
  const items = await res.json();
  return items.filter((n) => n.published).map((n) => n.title);
}

loadNews('/news.json')
  .then((titles) => console.log(titles))
  .catch((err) => console.error(err));
`],
  ts: ['shapes.ts', `// ${c(lang, 'Shapes with types', 'Formen mit Typen')}
interface Shape {
  name: string;
  area(): number;
}

class Circle implements Shape {
  readonly name = 'circle';
  constructor(private radius: number) {}
  area(): number {
    return Math.PI * this.radius ** 2;
  }
}

class Rect implements Shape {
  readonly name = 'rect';
  constructor(private w: number, private h: number) {}
  area = (): number => this.w * this.h;
}

const shapes: Shape[] = [new Circle(2), new Rect(3, 4)];
for (const s of shapes) {
  console.log(\`\${s.name}: \${s.area().toFixed(2)}\`);
}
`],
  json: ['settings.json', `{
  "name": "${c(lang, 'My project', 'Mein Projekt')}",
  "version": "1.2.0",
  "private": true,
  "editor": {
    "fontSize": 14,
    "tabSize": 4,
    "wordWrap": false,
    "theme": "dark"
  },
  "languages": ["python", "html", "css", "javascript"],
  "lastOpened": null,
  "ratio": 0.75
}
`],
  c: ['main.c', `#include <stdio.h>
#include <string.h>

/* ${c(lang, 'Reverses a string in place', 'Dreht eine Zeichenkette um')} */
static void reverse(char *s) {
    size_t n = strlen(s);
    for (size_t i = 0; i < n / 2; i++) {
        char tmp = s[i];
        s[i] = s[n - 1 - i];
        s[n - 1 - i] = tmp;
    }
}

int main(void) {
    char word[] = "Textline";
    reverse(word);
    printf("%s\\n", word);
    return 0;
}
`],
  java: ['Main.java', `import java.util.List;

// ${c(lang, 'Average of a list of grades', 'Durchschnitt einer Notenliste')}
public class Main {
    record Grade(String subject, double value) {}

    static double average(List<Grade> grades) {
        return grades.stream()
                .mapToDouble(Grade::value)
                .average()
                .orElse(0);
    }

    public static void main(String[] args) {
        var grades = List.of(
                new Grade("${c(lang, 'Maths', 'Mathe')}", 1.7),
                new Grade("${c(lang, 'English', 'Englisch')}", 2.3),
                new Grade("${c(lang, 'Physics', 'Physik')}", 1.3));
        System.out.printf("%.2f%n", average(grades));
    }
}
`],
  rs: ['main.rs', `use std::collections::HashMap;

/// ${c(lang, 'Counts how often each word occurs', 'Zählt, wie oft jedes Wort vorkommt')}
fn word_count(text: &str) -> HashMap<String, usize> {
    let mut counts = HashMap::new();
    for word in text.split_whitespace() {
        *counts.entry(word.to_lowercase()).or_insert(0) += 1;
    }
    counts
}

fn main() {
    let text = "${c(lang, 'the quick fox and the lazy dog', 'der Hund und der Fuchs und die Katze')}";
    let mut list: Vec<_> = word_count(text).into_iter().collect();
    list.sort_by(|a, b| b.1.cmp(&a.1));
    for (word, n) in list.iter().take(3) {
        println!("{word}: {n}");
    }
}
`],
  go: ['main.go', `package main

import (
	"fmt"
	"strings"
)

// ${c(lang, 'Task is one line of the to-do list', 'Aufgabe ist eine Zeile der To-do-Liste')}
type Task struct {
	Title string
	Done  bool
}

func main() {
	tasks := []Task{
		{"${c(lang, 'Buy milk', 'Milch kaufen')}", true},
		{"${c(lang, 'Write essay', 'Aufsatz schreiben')}", false},
	}
	for i, t := range tasks {
		mark := " "
		if t.Done {
			mark = "x"
		}
		fmt.Printf("%d. [%s] %s\\n", i+1, mark, strings.TrimSpace(t.Title))
	}
}
`],
  sql: ['query.sql', `-- ${c(lang, 'Top customers of the last year', 'Beste Kunden des letzten Jahres')}
SELECT c.name,
       COUNT(o.id)    AS orders,
       SUM(o.total)   AS revenue
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
WHERE o.created_at >= DATE '2026-01-01'
  AND o.status <> 'cancelled'
GROUP BY c.name
HAVING SUM(o.total) > 500
ORDER BY revenue DESC
LIMIT 10;
`],
  yaml: ['config.yml', `# ${c(lang, 'Build settings', 'Einstellungen für den Build')}
name: textline-demo
version: 2
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: ${c(lang, 'Install', 'Installieren')}
        run: npm ci
      - name: Test
        run: npm test
        env:
          CI: true
`],
  sh: ['backup.sh', `#!/usr/bin/env bash
# ${c(lang, 'Copies the notes folder into a dated backup', 'Kopiert den Notizen-Ordner in ein Backup mit Datum')}
set -euo pipefail

src="$HOME/${c(lang, 'Notes', 'Notizen')}"
dest="$HOME/Backup/$(date +%Y-%m-%d)"

if [[ ! -d "$src" ]]; then
  echo "${c(lang, 'Nothing to back up', 'Nichts zu sichern')}" >&2
  exit 1
fi

mkdir -p "$dest"
cp -r "$src"/. "$dest"/
echo "OK: $(ls "$dest" | wc -l) ${c(lang, 'files', 'Dateien')}"
`],
});

// Python-Programm mit Fehler (anklickbare Fehlermeldung) und eines mit Syntaxfehler (rot unterstrichen)
const BUGGY = (lang) => c(lang,
  'def average(numbers):\n    return sum(numbers) / len(numbers)\n\n\nprint(average([3, 4, 5]))\nprint(average([]))\n',
  'def durchschnitt(zahlen):\n    return sum(zahlen) / len(zahlen)\n\n\nprint(durchschnitt([3, 4, 5]))\nprint(durchschnitt([]))\n');
const SYNTAX = (lang) => c(lang,
  'names = ["Ada", "Linus", "Grace"]\n\nfor name in names\n    print(f"Hello {name}")\n',
  'namen = ["Ada", "Linus", "Grace"]\n\nfor name in namen\n    print(f"Hallo {name}")\n');

// Designs, die Akzentfarbe Blau statt des Orange (Orange nie neben grünen Zeichenketten)
const BLUE = '#4f8ff7';
const ACCENT = { standard: BLUE, acryl: BLUE, minimalist: BLUE, sunset: BLUE };
const THEMES = ['standard', 'ocean', 'forest', 'graphite', 'acryl', 'minimalist', 'simple', 'terminal'];
const SCHEMES = ['catppuccin', 'dracula', 'tokyonight', 'nord', 'rosepine', 'campbell'];

module.exports = function siteshots(win, dir, { python }) {
  const out = path.join(dir, 'shots');
  const outWebp = path.join(dir, 'webp');
  fs.mkdirSync(out, { recursive: true });
  fs.mkdirSync(outWebp, { recursive: true });
  const logFile = path.join(dir, 'siteshots.txt');
  fs.writeFileSync(logFile, '');
  const log = (s) => fs.appendFileSync(logFile, `${s}\n`);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const js = (code) => win.webContents.executeJavaScript(code, true);
  const act = (code) => js(`(async () => { await (${code}); return 0; })()`);
  const fire = (code) => js(`void (${code}); 0`);
  // nur bestimmte Bilder: TEXTLINE_SHOTS=editor,theme (Anfang des Namens)
  const only = (process.env.TEXTLINE_SHOTS || '').split(',').filter(Boolean);
  const want = (name) => !only.length || only.some((o) => name.startsWith(o));
  // PNG -> WebP mit dem Canvas der Seite (keine zusätzlichen Pakete nötig)
  const toWebp = (png) => js(`(async () => {
    const img = new Image();
    img.src = 'data:image/png;base64,${png.toString('base64')}';
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth;
    cv.height = img.naturalHeight;
    cv.getContext('2d').drawImage(img, 0, 0);
    return cv.toDataURL('image/webp', 0.86).split(',')[1];
  })()`);
  const shot = async (name) => {
    await wait(600);
    // Verstecktes Fenster: das erste Bild nach einer Pause ist manchmal noch das alte (bei doppelter Auflösung
    // öfter) - mehrmals neu zeichnen lassen und das letzte nehmen
    let img;
    for (let i = 0; i < 3; i++) {
      win.webContents.invalidate();
      await wait(350);
      img = await win.webContents.capturePage();
    }
    const png = img.toPNG();
    fs.writeFileSync(path.join(out, `${name}.png`), png);
    fs.writeFileSync(path.join(outWebp, `${name}.webp`), Buffer.from(await toWebp(png), 'base64'));
    log(`shot ${name} ${img.getSize().width}x${img.getSize().height}`);
  };
  const key = async (keyCode, modifiers = []) => {
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode, modifiers });
    if (keyCode.length === 1 && !modifiers.some((m) => m === 'control' || m === 'meta')) win.webContents.sendInputEvent({ type: 'char', keyCode, modifiers });
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode, modifiers });
    await wait(25);
  };
  const type = async (text) => {
    for (const ch of text) await (ch === '\n' ? key('Enter') : key(ch));
    await wait(60);
  };
  const until = async (code, tries = 120, ms = 500) => {
    for (let i = 0; i < tries; i++) {
      if (await js(code)) return true;
      await wait(ms);
    }
    return false;
  };
  // Alle Tabs zu, ungespeicherte verwerfen
  const closeAll = async () => {
    await fire(`window.__textline.CMD.closeAll.run()`);
    await wait(400);
    for (let i = 0; i < 8; i++) {
      if (!(await js(`!!document.querySelector('.overlay')`))) break;
      await js(`document.querySelector('.dialog-buttons .btn.danger').click()`);
      await wait(250);
    }
  };
  const closeDialogs = async () => {
    for (let i = 0; i < 4 && (await js(`!!document.querySelector('.overlay, .menu')`)); i++) {
      await key('Escape');
      await wait(200);
    }
  };
  const open = async (file) => {
    await act(`window.__textline.openPaths([${JSON.stringify(file)}])`);
    await wait(500);
  };
  const look = (patch) => act(`window.__textline.update(${JSON.stringify(patch)})`);
  const theme = (id, mode, extra = {}) => look({ theme: id, mode, accent: ACCENT[id] || '', ...extra });
  // Konsole zu und Cursor an den Anfang, damit jedes Bild gleich aufgeräumt aussieht
  const tidy = async () => {
    await closeDialogs();
    // Suchleiste schließen (Escape im Suchfeld, wie von Hand)
    if (await js(`!!document.querySelector('.cm-search')`)) {
      await js(`document.querySelector('.cm-search input[name=search]').focus()`);
      await key('Escape');
      await wait(200);
    }
    await fire(`window.__textline.showConsole(false)`);
    await js(`(() => { const v = window.__textline.view; if (v) { v.dispatch({ selection: { anchor: 0 }, scrollIntoView: true }); v.focus(); } })()`);
    await wait(200);
  };
  const runAndWait = async (doneCode) => {
    await js('window.__textline.view.focus()');
    await key('F5');
    await until(doneCode, 60, 250);
    await wait(800);
  };

  win.webContents.once('did-finish-load', async () => {
    try {
      win.setSize(1180, 760);
      await win.webContents.insertCSS('*, *::before, *::after { animation: none !important; transition: none !important; }');
      await wait(1500);
      win.webContents.focus();
      // Eigene Python-Umgebung einmal vorher anlegen (dauert beim ersten Mal)
      const env = await python.resolve({ pythonMode: 'env' });
      log(`python: ${JSON.stringify(env)}`);
      // Start fertig werden lassen (Einstellungen und leerer erster Tab kommen asynchron)
      await wait(3000);
      await closeAll();
      await wait(500);
      for (const lang of (process.env.TEXTLINE_SHOT_LANGS || 'en,de').split(',')) {
        const L = TEXT[lang];
        const files = path.join(dir, lang);
        fs.mkdirSync(files, { recursive: true });
        const game = path.join(files, L.files.game);
        const hello = path.join(files, L.files.hello);
        const md = path.join(files, L.files.md);
        fs.writeFileSync(game, L.game.join('\n'));
        fs.writeFileSync(hello, L.hello);
        fs.writeFileSync(md, L.md);
        const samples = SAMPLES(lang);
        for (const [, [name, text]] of Object.entries(samples)) fs.writeFileSync(path.join(files, name), text);
        const buggy = path.join(files, c(lang, 'average.py', 'durchschnitt.py'));
        const syntax = path.join(files, c(lang, 'greet.py', 'gruss.py'));
        fs.writeFileSync(buggy, BUGGY(lang));
        fs.writeFileSync(syntax, SYNTAX(lang));

        await closeAll();
        await look({ language: lang, wrap: false, whitespace: false, menuBar: true });
        await theme('standard', 'dark');
        await open(game);
        if (want('editor')) await shot(`editor-${lang}`);
        if (want('editor')) {
          await theme('standard', 'light');
          await shot(`editor-light-${lang}`);
          await theme('standard', 'dark');
        }

        // Programm mit Eingabe in der Konsole
        if (want('run')) {
          await open(hello);
          await js('window.__textline.view.focus()');
          await key('F5');
          const asked = await until(`document.querySelector('.console-out') && /\\?\\s*$/.test(document.querySelector('.console-out').textContent.trim() + ' ')`);
          log(`asked ${lang}: ${asked}`);
          await wait(500);
          await js(`document.querySelector('#console-input').focus()`);
          await type(`${L.who}\n`);
          await until(`document.querySelector('.console-out').textContent.includes('21')`, 40, 250);
          await wait(800);
          await js('window.__textline.view.focus()');
          await shot(`run-${lang}`);
        }

        // Fehlermeldung mit anklickbarer Zeile
        if (want('error')) {
          await closeAll();
          await open(game);
          await open(buggy);
          await look({ consoleHeight: 300 });
          await runAndWait(`/ZeroDivisionError/.test((document.querySelector('.console-out') || {}).textContent || '')`);
          await js('window.__textline.view.focus()');
          await shot(`error-${lang}`);
          await fire(`window.__textline.showConsole(false)`);
          await look({ consoleHeight: 220 });
        }

        // Syntaxfehler schon beim Tippen unterstrichen
        if (want('syntax')) {
          await closeAll();
          await open(syntax);
          await js(`(() => { const v = window.__textline.view; const l = v.state.doc.line(3); v.dispatch({ selection: { anchor: l.to } }); v.focus(); })()`);
          await until(`!!document.querySelector('.cm-lintRange-error, .cm-lintRange')`, 20, 250);
          await wait(600);
          await shot(`syntax-${lang}`);
        }

        // Pakete
        if (want('packages')) {
          await fire(`window.__textline.CMD.packages.run()`);
          await wait(2500);
          await shot(`packages-${lang}`);
          await closeDialogs();
          await fire(`window.__textline.showConsole(false)`);
        }

        // Markdown mit Vorschau (dunkel und hell), HTML mit Vorschau
        if (want('markdown')) {
          await open(md);
          await fire(`window.__textline.togglePreview(true)`);
          await wait(700);
          await shot(`markdown-${lang}`);
          await theme('standard', 'light');
          await wait(300);
          await shot(`markdown-light-${lang}`);
          await theme('standard', 'dark');
          await fire(`window.__textline.togglePreview(false)`);
        }
        if (want('html-preview')) {
          await closeAll();
          await open(path.join(files, samples.css[0]));
          await open(path.join(files, samples.html[0]));
          await fire(`window.__textline.togglePreview(true)`);
          await wait(1200);
          await shot(`html-preview-${lang}`);
          await fire(`window.__textline.togglePreview(false)`);
        }

        // Viele Dateitypen (Design Standard dunkel)
        for (const [id, [name]] of Object.entries(samples)) {
          if (!want(`file-${id}`)) continue;
          await closeAll();
          await open(path.join(files, name));
          await tidy();
          await shot(`file-${id}-${lang}`);
        }

        // Suchen (alle Treffer markiert) und Ersetzen
        if (want('search')) {
          await closeAll();
          await open(hello);
          await open(game);
          await tidy();
          await key('F', ['control']);
          await wait(300);
          await type(c(lang, 'tries', 'versuche'));
          await wait(300);
          await shot(`search-${lang}`);
          await closeDialogs();
          await tidy();
          await fire(`window.__textline.CMD.replace.run()`);
          await wait(300);
          await js(`(() => { const s = document.querySelector('.cm-search input[name=search]'); if (s) s.focus(); })()`);
          await js(`document.execCommand('selectAll')`);
          await type(c(lang, 'tries', 'versuche'));
          await js(`(() => { const r = document.querySelector('.cm-search input[name=replace]'); if (r) r.focus(); })()`);
          await type(c(lang, 'attempts', 'runden'));
          await wait(300);
          await shot(`replace-${lang}`);
          await tidy();
        }

        // Mehrere Cursor: alle "tries"/"versuche" gleichzeitig markiert
        if (want('multicursor')) {
          await open(game);
          await tidy();
          await js(`(() => { const v = window.__textline.view; const w = ${JSON.stringify(c(lang, 'tries', 'versuche'))}; const i = v.state.doc.toString().indexOf(w + ' = 0'); v.dispatch({ selection: { anchor: i, head: i + w.length } }); v.focus(); })()`);
          await fire(`window.__textline.CMD.selectAllMatches.run()`);
          await wait(300);
          await shot(`multicursor-${lang}`);
          await tidy();
        }

        // Menü "Datei" offen
        if (want('menu')) {
          await open(game);
          await tidy();
          await js(`document.querySelector('.menubar-item').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))`);
          await wait(300);
          await shot(`menu-${lang}`);
          await closeDialogs();
        }

        // Alle Designs, jeweils hell und dunkel
        await closeAll();
        await open(hello);
        await open(game);
        await tidy();
        for (const id of THEMES) {
          for (const mode of ['dark', 'light']) {
            if (!want(`theme-${id}-${mode}`)) continue;
            await theme(id, mode, id === 'terminal' ? { termScheme: 'catppuccin' } : {});
            await wait(400);
            await shot(`theme-${id}-${mode}-${lang}`);
          }
        }
        // Bisherige Namen für die Website (Simple und Minimalist hell)
        if (want('simple')) {
          await theme('simple', 'light');
          await wait(300);
          await shot(`simple-${lang}`);
        }
        if (want('minimalist')) {
          await theme('minimalist', 'light');
          await wait(300);
          await shot(`minimalist-${lang}`);
        }
        // Terminal mit verschiedenen Farbschemata
        for (const scheme of SCHEMES) {
          if (!want(`terminal-${scheme}`)) continue;
          await theme('terminal', 'dark', { termScheme: scheme });
          await wait(400);
          await shot(`terminal-${scheme}-${lang}`);
        }
        await theme('standard', 'dark', { termScheme: 'catppuccin' });

        // Einstellungen: alle Seiten
        for (const page of ['look', 'general', 'editor', 'python']) {
          const name = page === 'look' ? `settings-${lang}` : `settings-${page}-${lang}`;
          if (!want(name)) continue;
          await fire(`window.__textline.settingsDialog('${page}')`);
          await wait(page === 'python' ? 1500 : 800);
          await shot(name);
          await closeDialogs();
        }
        // Einstellungen im hellen Design
        if (want('settings-light')) {
          await theme('standard', 'light');
          await fire(`window.__textline.settingsDialog('look')`);
          await wait(800);
          await shot(`settings-light-${lang}`);
          await closeDialogs();
          await theme('standard', 'dark');
        }

        // Kleine Dialoge: Sprache wählen, Tastenkürzel, Über, Als Standard-App
        if (want('language-picker')) {
          await open(game);
          await fire(`window.__textline.languagePicker()`);
          await wait(500);
          await shot(`language-picker-${lang}`);
          await closeDialogs();
        }
        if (want('shortcuts')) {
          await fire(`window.__textline.CMD.shortcuts.run()`);
          await wait(500);
          await shot(`shortcuts-${lang}`);
          await closeDialogs();
        }
        if (want('about')) {
          await fire(`window.__textline.CMD.about.run()`);
          await wait(500);
          await shot(`about-${lang}`);
          await closeDialogs();
        }
        if (want('default-apps')) {
          await fire(`window.__textline.defaultAppsDialog()`);
          await wait(2500);
          await shot(`default-apps-${lang}`);
          await closeDialogs();
        }
      }
    } catch (e) {
      log(`ERROR ${e && e.stack ? e.stack : e}`);
    }
    log('done');
    python.stopAll();
    setTimeout(() => app.exit(0), 300);
  });
};
