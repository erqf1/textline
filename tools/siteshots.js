'use strict';

// Bilder für die Website (unsichtbar): textline --siteshots <ordner>
// Saubere Beispieldateien auf Englisch und Deutsch, je Sprache: Editor, Programm mit Konsole, Pakete,
// Markdown-Vorschau, Design Simple und Einstellungen. Ergebnis: <ordner>/shots/<name>-<sprache>.png
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

module.exports = function siteshots(win, dir, { python }) {
  const out = path.join(dir, 'shots');
  fs.mkdirSync(out, { recursive: true });
  const logFile = path.join(dir, 'siteshots.txt');
  fs.writeFileSync(logFile, '');
  const log = (s) => fs.appendFileSync(logFile, `${s}\n`);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const js = (code) => win.webContents.executeJavaScript(code, true);
  const act = (code) => js(`(async () => { await (${code}); return 0; })()`);
  const fire = (code) => js(`void (${code}); 0`);
  const shot = async (name) => {
    await wait(400);
    // Verstecktes Fenster: das erste Bild nach einer Pause ist manchmal noch das alte - zweimal holen
    win.webContents.invalidate();
    await wait(300);
    await win.webContents.capturePage();
    win.webContents.invalidate();
    await wait(300);
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(out, `${name}.png`), img.toPNG());
    log(`shot ${name}`);
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
      for (const lang of ['en', 'de']) {
        const L = TEXT[lang];
        const files = path.join(dir, lang);
        fs.mkdirSync(files, { recursive: true });
        const game = path.join(files, L.files.game);
        const hello = path.join(files, L.files.hello);
        const md = path.join(files, L.files.md);
        fs.writeFileSync(game, L.game.join('\n'));
        fs.writeFileSync(hello, L.hello);
        fs.writeFileSync(md, L.md);

        await closeAll();
        await act(`window.__textline.update({ language: '${lang}', theme: 'standard', mode: 'dark', accent: '' })`);
        await act(`window.__textline.openPaths([${JSON.stringify(game)}])`);
        await wait(700);
        await shot(`editor-${lang}`);

        // Programm mit Eingabe in der Konsole
        await act(`window.__textline.openPaths([${JSON.stringify(hello)}])`);
        await wait(600);
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

        // Pakete
        await fire(`window.__textline.CMD.packages.run()`);
        await wait(2500);
        await shot(`packages-${lang}`);
        await key('Escape');
        await wait(300);
        await fire(`window.__textline.showConsole(false)`);

        // Markdown mit Vorschau
        await act(`window.__textline.openPaths([${JSON.stringify(md)}])`);
        await wait(500);
        await fire(`window.__textline.togglePreview(true)`);
        await wait(700);
        await shot(`markdown-${lang}`);
        await fire(`window.__textline.togglePreview(false)`);

        // Design Simple (hell) mit dem Spiel
        await act(`window.__textline.openPaths([${JSON.stringify(game)}])`);
        await act(`window.__textline.update({ theme: 'simple', mode: 'light' })`);
        await wait(400);
        await shot(`simple-${lang}`);
        await act(`window.__textline.update({ theme: 'standard', mode: 'dark' })`);

        // Einstellungen: Aussehen
        await fire(`window.__textline.settingsDialog('look')`);
        await wait(800);
        await shot(`settings-${lang}`);
        await key('Escape');
        await wait(300);
      }
    } catch (e) {
      log(`ERROR ${e && e.stack ? e.stack : e}`);
    }
    log('done');
    python.stopAll();
    setTimeout(() => app.exit(0), 300);
  });
};
