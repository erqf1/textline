# Textline

Schneller Text- und Code-Editor für Windows, Linux und macOS. Farben für über 140 Sprachen (Python, HTML, CSS, JavaScript, C, Java, Markdown, JSON …), Python eingebaut zum Ausführen – mit Konsole, Eingaben und einer Paketverwaltung wie in Thonny.

**[Releases](https://github.com/erqf1/textline/releases)** · Lizenz: [MIT](LICENSE)

## Fertige Pakete

| System | Optionen |
| --- | --- |
| Windows | **Installer** (`Textline-Setup-*.exe`, trägt Textline bei „Öffnen mit“ für Text- und Code-Dateien ein und fügt „Mit Textline öffnen“ ins Kontextmenü) oder **portabel** (`Textline-*-portable.exe`, keine Installation) |
| Linux | `.deb` (Debian/Ubuntu), `.pacman` (Arch) oder `.tar.gz` (portabel, jede Distribution) |
| macOS | `.zip` für Apple Silicon oder Intel (App-Bundle, immer portabel) |

Der Installer stellt **keine Standard-Programme** um: `.py`-Dateien laufen per Doppelklick weiter wie gewohnt, `.bat` startet weiter. Wer Textline als Standard will, wählt es einmal unter „Öffnen mit“ → „Immer“.

### Linux

`.deb` und `.pacman` installieren sich wie gewohnt über den Paketmanager. Bei `.tar.gz`: entpacken, dann `./textline` ausführen. Startet die App mit einer Meldung zum „SUID sandbox helper“ nicht (z. B. Ubuntu 24.04+):

```bash
sudo chown root:root chrome-sandbox && sudo chmod 4755 chrome-sandbox   # empfohlen
./textline --no-sandbox                                                 # Notlösung, schwächere Isolation
```

### macOS

Die App ist **nicht signiert**. Einmalig nach dem Entpacken im Terminal:

```bash
xattr -cr Textline.app
codesign --force --deep --sign - Textline.app   # nötig auf Apple Silicon
```

## Was drin ist

- **Farben für über 140 Sprachen**, erkannt an Dateiendung oder erster Zeile (`#!/usr/bin/env python3`). Sprache unten rechts jederzeit umstellbar.
- **Einrücken wie in einer IDE:** Tab/Shift+Tab für markierte Zeilen, automatisches Einrücken nach `:` und in Klammern, Leerzeichen oder Tabs, Breite einstellbar, Einrückung der Datei wird erkannt.
- **Python:** F5 führt die Datei aus, die Konsole nimmt Eingaben für `input()` an, Fehlermeldungen sind anklickbar und springen zur Zeile, Syntaxfehler werden schon beim Tippen unterstrichen. Danach läuft eine Python-Konsole zum Ausprobieren.
- **Pakete** (Würfel-Symbol): PyPI durchsuchen, beliebte Pakete mit einem Klick, `requirements.txt` installieren. Pakete landen in einer eigenen Umgebung von Textline – ohne Adminrechte, ohne das System-Python anzufassen.
- **Markdown- und HTML-Vorschau** neben dem Text.
- **Suchen und Ersetzen** (auch mit regulären Ausdrücken), Gehe zu Zeile, mehrere Cursor, Zeilen falten, Klammern-Paare, Kommentieren per Strg+/.
- **Kodierungen und Zeilenenden** (UTF-8, UTF-16, Windows-1252 …, LF/CRLF) werden erkannt und beim Speichern beibehalten. Ändert ein anderes Programm die Datei, lädt Textline sie neu.
- **Designs:** Standard, Ozean, Wald, Sonnenuntergang, Graphit – jeweils hell oder dunkel, mit beliebiger Akzentfarbe. Dazu **Simple**: eckig, nur hell/dunkel, Menü als Text wie im klassischen Editor – die Code-Farben bleiben.
- **12 Sprachen:** Deutsch, Englisch, Spanisch, Französisch, Italienisch, Portugiesisch, Niederländisch, Polnisch, Türkisch, Russisch, Japanisch, Chinesisch.

## Tastenkürzel

Auf dem Mac ⌘ statt Strg.

| Aktion | Taste |
| --- | --- |
| Neue Datei / Öffnen / Speichern | Strg+N / Strg+O / Strg+S |
| Ausführen / Stoppen | F5 / Shift+F5 |
| Suchen / Ersetzen | Strg+F / Strg+H (Mac: ⌘⌥F) |
| Weitersuchen | F3 / Shift+F3 |
| Gehe zu Zeile | Strg+G |
| Ein-/Ausrücken | Tab / Shift+Tab |
| Kommentar an/aus | Strg+/ |
| Zeile verschieben / verdoppeln | Alt+↑ / Alt+↓ / Shift+Alt+↓ |
| Nächstes gleiches Wort mitmarkieren | Strg+D |
| Cursor darüber/darunter | Strg+Alt+↑ / Strg+Alt+↓ |
| Geschlossenen Tab wieder öffnen | Strg+Shift+T |
| Zeilenumbruch an/aus | Alt+Z |
| Vorschau | Strg+Shift+V |
| Konsole | Strg+J |
| Zoom | Strg+= / Strg+- / Strg+0 |
| Einstellungen | Strg+, |

## Selbst bauen

```bash
npm ci
npm start              # bauen und starten
npm run build:win      # Windows-Installer + portabel nach dist/
node tools/make-icon.js   # App-Symbol neu erzeugen
```

Selbsttest (tippt echte Tasten in ein verstecktes Fenster, startet Python, macht Bilder): `npx electron . --selftest <ordner>`.
