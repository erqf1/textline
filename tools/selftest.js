'use strict';

// Selbsttest (unsichtbar): textline --selftest <ordner>
// Tippt wie ein Mensch (echte Tastendrücke an das versteckte Fenster), prüft Einrücken, Klammern, Kommentare,
// führt ein Python-Programm mit Eingabe aus, nutzt pip und macht Bilder von allen Designs.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

module.exports = function selftest(win, dir, { python }) {
  const out = path.join(dir, 'shots');
  fs.mkdirSync(out, { recursive: true });
  const logFile = path.join(dir, 'selftest.txt');
  fs.writeFileSync(logFile, '');
  const log = (s) => fs.appendFileSync(logFile, `${s}\n`);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const js = (code) => win.webContents.executeJavaScript(code, true);
  // Aktion ohne Rückgabewert (Tabs/Zustände lassen sich nicht übertragen); fire = nicht auf Dialoge warten
  const act = (code) => js(`(async () => { await (${code}); return 0; })()`);
  const fire = (code) => js(`void (${code}); 0`);
  const shot = async (name) => {
    await wait(300);
    // Verstecktes Fenster neu zeichnen lassen, sonst kommt manchmal noch das alte Bild
    win.webContents.invalidate();
    await wait(250);
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(out, `${name}.png`), img.toPNG());
  };
  let fails = 0;
  const check = (name, ok, extra = '') => {
    if (!ok) fails++;
    log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? `  (${extra})` : ''}`);
  };

  // Echte Tasten (gehen durch Chromium wie beim Tippen)
  const key = async (keyCode, modifiers = []) => {
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode, modifiers });
    if (keyCode.length === 1 && !modifiers.some((m) => m === 'control' || m === 'meta')) win.webContents.sendInputEvent({ type: 'char', keyCode, modifiers });
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode, modifiers });
    await wait(25);
  };
  const type = async (text) => {
    for (const ch of text) {
      if (ch === '\n') await key('Enter');
      else await key(ch);
    }
    await wait(60);
  };
  const doc = () => js('window.__textline.view.state.doc.toString()');
  const lineText = (n) => js(`window.__textline.view.state.doc.line(${n}).text`);

  win.webContents.on('console-message', (e, level, message, line, source) => {
    const d = e && e.message !== undefined ? e : { message, lineNumber: line, sourceId: source, level };
    log(`console[${d.level}]: ${d.message} (${String(d.sourceId || '').split('/').pop()}:${d.lineNumber})`);
  });
  win.webContents.once('did-finish-load', async () => {
    try {
      win.setSize(1180, 760);
      await win.webContents.insertCSS('*, *::before, *::after { animation: none !important; transition: none !important; }');
      await wait(1500);
      win.webContents.focus();
      const sample = path.join(dir, 'beispiel.py');
      fs.writeFileSync(sample, [
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
      ].join('\n'));

      // ---------------------------------------------------------- Tippen in einer neuen Python-Datei
      await act(`window.__textline.newFile('Python')`);
      await wait(400);
      await js('window.__textline.view.focus()');
      await type('def f(x):\n');
      check('Enter after ":" indents', (await lineText(2)) === '    ', JSON.stringify(await lineText(2)));
      await type('return x\n');
      check('Enter after "return" dedents', (await lineText(3)) === '', JSON.stringify(await lineText(3)));
      await type('if True:\n');
      await type('pass\n');
      check('Enter after "pass" dedents', (await lineText(5)) === '', JSON.stringify(await lineText(5)));
      await key('Tab');
      check('Tab inserts 4 spaces', (await lineText(5)) === '    ', JSON.stringify(await lineText(5)));
      await key('Tab');
      await key('Backspace');
      check('Backspace removes one indent level', (await lineText(5)) === '    ', JSON.stringify(await lineText(5)));
      await key('Tab', ['shift']);
      check('Shift+Tab outdents', (await lineText(5)) === '', JSON.stringify(await lineText(5)));
      await type('print(');
      check('"(" closes the bracket', (await lineText(5)) === 'print()', JSON.stringify(await lineText(5)));
      await type('"hi');
      check('quote closes too', (await lineText(5)) === 'print("hi")', JSON.stringify(await lineText(5)));
      await key('End');
      await key('/', ['control']);
      check('Ctrl+/ comments the line', (await lineText(5)).startsWith('# print'), JSON.stringify(await lineText(5)));
      await key('/', ['control']);
      check('Ctrl+/ uncomments', (await lineText(5)) === 'print("hi")', JSON.stringify(await lineText(5)));
      await key('Home', ['control']);
      await key('Down', ['shift']);
      await key('Down', ['shift']);
      await key('Tab');
      check('Tab with selection indents lines', (await lineText(1)) === '    def f(x):' && (await lineText(2)).startsWith('        return'), JSON.stringify([await lineText(1), await lineText(2)]));
      await wait(700);
      await key('Tab', ['shift']);
      check('Shift+Tab with selection outdents lines', (await lineText(1)) === 'def f(x):', JSON.stringify(await lineText(1)));
      await wait(700);
      await key('Z', ['control']);
      check('Undo works', (await lineText(1)) === '    def f(x):', JSON.stringify(await lineText(1)));
      await key('Y', ['control']);
      check('Redo works', (await lineText(1)) === 'def f(x):', JSON.stringify(await lineText(1)));
      await key('End', ['control']);
      await type('\nx = [1, 2,\n');
      const cont = await js('(() => { const s = window.__textline.view.state, h = s.selection.main.head, l = s.doc.lineAt(h); return l.text.slice(0, h - l.from); })()');
      check('Enter inside [ ] continues indented', /^\s{4,}$/.test(cont), JSON.stringify(cont));
      log(`doc: ${JSON.stringify(await doc())}`);

      // ---------------------------------------------------------- Sprachen erkennen
      const want = { 'a.py': 'Python', 'b.js': 'JavaScript', 'c.html': 'HTML', 'd.css': 'CSS', 'e.json': 'JSON', 'f.md': 'Markdown', 'g.rs': 'Rust', 'h.cpp': 'C++', 'i.bat': 'Batch', Makefile: 'Makefile', 'j.sh': 'Shell', 'k.yml': 'YAML', 'l.sql': 'SQL', 'm.ps1': 'PowerShell', 'n.txt': null, Dockerfile: 'Dockerfile', 'o.toml': 'TOML', 'p.ts': 'TypeScript', 'q.java': 'Java', 'r.cs': 'C#', 's.lua': 'Lua', 't.go': 'Go', 'u.php': 'PHP', 'v.xml': 'XML', 'w.kt': 'Kotlin', 'x.swift': 'Swift', 'y.rb': 'Ruby', '.env': 'Properties files', 'z.ini': 'Properties files', 'CMakeLists.txt': 'CMake' };
      const got = await js(`(() => { const r = {}; for (const n of ${JSON.stringify(Object.keys(want))}) r[n] = window.__textline.detect(n); return r; })()`);
      const wrong = Object.keys(want).filter((n) => got[n] !== want[n]).map((n) => `${n}=${got[n]}`);
      check(`detects ${Object.keys(want).length} file types`, !wrong.length, wrong.join(' '));
      check('shebang detection', (await js(`window.__textline.detect('run', '#!/usr/bin/env python3')`)) === 'Python');

      // ---------------------------------------------------------- Datei öffnen, Bilder der Designs
      await act(`window.__textline.openPaths([${JSON.stringify(sample)}])`);
      await wait(800);
      log('active after open: ' + await js('window.__textline.active.path'));
      const langName = await js('window.__textline.active.lang && window.__textline.active.lang.name');
      check('beispiel.py detected as Python', langName === 'Python', String(langName));
      await act(`window.__textline.update({ language: 'en' })`);
      for (const theme of ['standard', 'ocean', 'forest', 'sunset', 'graphite', 'simple']) {
        for (const mode of ['dark', 'light']) {
          await act(`window.__textline.update({ theme: '${theme}', mode: '${mode}' })`);
          await shot(`theme-${theme}-${mode}`);
        }
      }
      await act(`window.__textline.update({ theme: 'standard', mode: 'dark', accent: '#4aa3ff' })`);
      await shot('accent-blue');
      await act(`window.__textline.update({ accent: '' })`);

      // Simple: Menü "Datei" offen
      await act(`window.__textline.update({ theme: 'simple', mode: 'light', language: 'de' })`);
      await js(`document.querySelector('.menubar-item').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))`);
      await shot('simple-menu-datei');
      await key('Escape');
      await act(`window.__textline.update({ theme: 'standard', mode: 'dark' })`);
      await js(`document.querySelector('#main-menu').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))`);
      await wait(100);
      await js(`(() => { const r = document.querySelectorAll('.menu-item')[1]; r.dispatchEvent(new MouseEvent('mouseenter')); })()`);
      await shot('standard-menu');
      await key('Escape');
      await key('Escape');

      // Suchleiste
      await js('window.__textline.view.focus()');
      await key('F', ['control']);
      await wait(300);
      await type('versuche');
      check('typing goes into the search field', (await js(`(document.querySelector('.cm-search input[name=search]') || {}).value`)) === 'versuche', String(await js(`document.activeElement && document.activeElement.outerHTML.slice(0, 80)`)));
      await shot('search');
      await key('Escape');

      // Einstellungen
      await fire(`window.__textline.settingsDialog('look')`);
      await wait(300);
      check('settings dialog opens', await js(`!!document.querySelector('.settings-dialog .theme-grid')`));
      await shot('settings-look-de');
      await key('Escape');
      await fire(`window.__textline.settingsDialog('python')`);
      await wait(1500);
      await shot('settings-python-de');
      await key('Escape');
      await fire(`window.__textline.languagePicker()`);
      await type('ru');
      await shot('language-picker');
      await key('Escape');

      // ---------------------------------------------------------- Python ausführen (mit Eingabe)
      const resolved = await python.resolve({ pythonMode: 'env' });
      log(`python resolve: ${JSON.stringify(resolved)}`);
      const prog = path.join(dir, 'eingabe.py');
      fs.writeFileSync(prog, 'name = input("Wie heißt du? ")\nprint(f"Hallo {name}!")\nfor i in range(3):\n    print("Zeile", i)\nprint(1 / 0)\n');
      await act(`window.__textline.openPaths([${JSON.stringify(prog)}])`);
      await wait(600);
      await key('F5');
      // Beim ersten Mal wird die eigene Umgebung angelegt (dauert)
      let started = false;
      for (let i = 0; i < 120 && !started; i++) {
        await wait(500);
        started = await js(`document.querySelector('.console-out').textContent.includes('Wie heißt du')`);
      }
      check('program runs and asks for input', started);
      await js(`document.querySelector('#console-input').focus()`);
      await type('Mert\n');
      let finished = false;
      for (let i = 0; i < 40 && !finished; i++) {
        await wait(250);
        finished = await js(`/code 1|Code 1/.test(document.querySelector('.console-out').textContent)`);
      }
      const consoleText = await js(`document.querySelector('.console-out').textContent`);
      check('input reaches the program', consoleText.includes('Hallo Mert!'), consoleText.slice(-200).replace(/\n/g, '⏎'));
      check('traceback shown and program ends with error', finished && consoleText.includes('ZeroDivisionError'));
      check('traceback line is clickable', await js(`!!document.querySelector('.console-link')`));
      await shot('console-run');
      // Python-Konsole (>>>) nach dem Programm
      await js(`document.querySelector('#console-input').focus()`);
      await type('21 * 2\n');
      let shellOk = false;
      for (let i = 0; i < 40 && !shellOk; i++) {
        await wait(250);
        shellOk = await js(`document.querySelector('.console-out').textContent.includes('42')`);
      }
      check('python console answers 21 * 2', shellOk);

      // Syntaxfehler-Prüfung
      await act(`window.__textline.newFile('Python')`);
      await wait(300);
      await js('window.__textline.view.focus()');
      await type('def oops(:\n');
      let lint = false;
      for (let i = 0; i < 30 && !lint; i++) {
        await wait(300);
        lint = await js(`!!document.querySelector('.cm-lintRange-error')`);
      }
      check('syntax error is underlined', lint);
      await shot('syntax-error');

      // ---------------------------------------------------------- pip
      const env = await python.resolve({ pythonMode: 'env' });
      if (env.python) {
        const list = await python.pipList(env.python);
        check('pip list works', Array.isArray(list.packages), JSON.stringify(list).slice(0, 120));
        const { done } = python.pip(env.python, ['install', 'six']);
        const r = await done;
        const list2 = await python.pipList(env.python);
        check('pip install six', r.code === 0 && list2.packages.some((p) => p.name === 'six'));
      } else check('pip (no env)', false);
      await fire(`window.__textline.CMD.packages.run()`);
      await wait(2500);
      await shot('packages');
      await key('Escape');

      // ---------------------------------------------------------- Markdown-Vorschau, Start-Bildschirm, Speichern
      const md = path.join(dir, 'liesmich.md');
      fs.writeFileSync(md, '# Textline\n\nEin **schneller** Editor.\n\n- Farben für 140+ Sprachen\n- Python mit Konsole\n\n```python\nprint("Hallo")\n```\n\n| Taste | Aktion |\n|---|---|\n| F5 | Ausführen |\n');
      await act(`window.__textline.openPaths([${JSON.stringify(md)}])`);
      await wait(500);
      await fire(`window.__textline.togglePreview(true)`);
      await wait(600);
      await shot('markdown-preview');

      const enc = path.join(dir, 'latin1.txt');
      fs.writeFileSync(enc, Buffer.from([0x47, 0x72, 0xfc, 0xdf, 0x65, 0x0d, 0x0a, 0x5a, 0x65, 0x69, 0x6c, 0x65, 0x20, 0x32, 0x0d, 0x0a]));
      await act(`window.__textline.openPaths([${JSON.stringify(enc)}])`);
      await wait(500);
      const encInfo = await js(`(() => { const a = window.__textline.active; return [a.encoding, a.eol, window.__textline.view.state.doc.toString()]; })()`);
      check('Windows-1252 + CRLF detected', encInfo[0] === 'windows1252' && encInfo[1] === 'crlf' && encInfo[2].startsWith('Grüße'), JSON.stringify(encInfo));
      await js('window.__textline.view.focus()');
      await key('End', ['control']);
      await type('Neu');
      await key('S', ['control']);
      await wait(400);
      const bytes = fs.readFileSync(enc);
      check('saved in the same encoding and line endings', bytes.includes(Buffer.from([0x47, 0x72, 0xfc, 0xdf, 0x65, 0x0d, 0x0a])) && bytes.slice(-3).toString('latin1') === 'Neu', bytes.toString('hex'));

      fs.writeFileSync(enc, 'von außen geändert\n');
      await wait(1200);
      const reloaded = await js('window.__textline.view.state.doc.toString()');
      check('external change reloads the tab', reloaded.startsWith('von au'), JSON.stringify(reloaded));

      await fire(`window.__textline.CMD.closeAll.run()`);
      await wait(400);
      // Ungespeicherte Tabs fragen nach -> "Nicht speichern"
      for (let i = 0; i < 6; i++) {
        const open = await js(`!!document.querySelector('.overlay')`);
        if (!open) break;
        await js(`document.querySelector('.dialog-buttons .btn.danger').click()`);
        await wait(250);
      }
      await shot('welcome-de');
      await act(`window.__textline.update({ language: 'ja' })`);
      await shot('welcome-ja');
    } catch (e) {
      fails++;
      log(`ERROR ${e && e.stack ? e.stack : e}`);
    }
    log(`RESULT: ${fails} failed`);
    python.stopAll();
    setTimeout(() => app.exit(0), 300);
  });
};
