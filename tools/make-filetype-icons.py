# Dateisymbole für "Öffnen mit"/Explorer: Blatt mit Eselsohr und Zeilen, das Textline-Logo in der Mitte, darunter
# die Dateiendung und ganz unten ein Streifen - je Dateityp in eigener Farbe. Hell (weißes Blatt) und dunkel; welche
# Windows zeigt, stellt man in Textline ein (src/fileicons.js). Schreibt assets/filetypes/light|dark/<name>.ico
# und assets/filetypes/mac/<name>.icns (hell).
# Braucht Python 3 + Pillow und die Schrift Segoe UI (Windows). Aufruf: python tools/make-filetype-icons.py
# Die Zuordnung Endung -> Symbol steht in tools/filetypes.json (auch für package.json/installer.nsh benutzt).
import io
import json
import os
import struct

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'filetypes')
LOGO = Image.open(os.path.join(ROOT, 'assets', 'icon.png')).convert('RGBA')
TYPES = json.load(open(os.path.join(ROOT, 'tools', 'filetypes.json'), encoding='utf-8'))
FONT = next((f for f in ['C:/Windows/Fonts/segoeuib.ttf', 'C:/Windows/Fonts/arialbd.ttf'] if os.path.exists(f)), None)


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


LIGHT = {'paper': (255, 255, 255), 'outline': (176, 182, 194), 'fold': (226, 230, 237), 'lines': (229, 232, 238), 'shadow': 60}
DARK = {'paper': (43, 45, 50), 'outline': (88, 92, 102), 'fold': (62, 65, 72), 'lines': (60, 63, 70), 'shadow': 110}


def page(size, label, color, detail, dark=False):
    """Ein Symbol in 'size' Pixeln, gezeichnet in 4-facher Größe und verkleinert (glatte Kanten)."""
    P = DARK if dark else LIGHT
    col = hexrgb(color)
    if dark:  # Farben der Endung auf dunklem Blatt aufhellen, damit sie lesbar bleiben
        col = tuple(round(c + (255 - c) * 0.38) for c in col)
    S = size * 4
    u = S / 256  # Einheit: Raster 256
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    left, top, right, bottom, fold = 40 * u, 10 * u, 216 * u, 246 * u, 52 * u
    if size <= 24:  # kleine Größen: Blatt breiter, Logo größer
        left, right, top, bottom, fold = 34 * u, 222 * u, 6 * u, 250 * u, 60 * u
    # leichter Schatten
    shadow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.polygon([(left, top + 4 * u), (right - fold, top + 4 * u), (right, top + fold + 4 * u), (right, bottom + 4 * u), (left, bottom + 4 * u)], fill=(0, 0, 0, P['shadow']))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(5 * u)))
    outline = P['outline'] + (255,)
    w = max(1, round(3 * u)) if size >= 32 else max(1, round(5 * u))
    d.polygon([(left, top), (right - fold, top), (right, top + fold), (right, bottom), (left, bottom)], fill=P['paper'] + (255,), outline=outline, width=w)
    # Eselsohr
    d.polygon([(right - fold, top), (right - fold, top + fold), (right, top + fold)], fill=P['fold'] + (255,), outline=outline, width=w)
    # Zeilen im Hintergrund
    if detail:
        y = top + 34 * u
        while y < bottom - 34 * u:
            x2 = right - (fold + 14 * u if y < top + fold + 6 * u else 22 * u)
            d.rounded_rectangle([left + 20 * u, y, x2, y + 7 * u], radius=3.5 * u, fill=P['lines'] + (255,))
            y += 19 * u
    # Logo
    ls = (104 if detail else 150) * u
    cx = (left + right) / 2
    cy = (top + 98 * u) if detail else (top + bottom) / 2
    logo = LOGO.resize((round(ls), round(ls)), Image.LANCZOS)
    if detail:  # Rand in Blattfarbe ums Logo, damit es sich von den Zeilen abhebt
        d.rounded_rectangle([cx - ls / 2 - 7 * u, cy - ls / 2 - 7 * u, cx + ls / 2 + 7 * u, cy + ls / 2 + 7 * u], radius=30 * u, fill=P['paper'] + (255,))
    img.alpha_composite(logo, (round(cx - ls / 2), round(cy - ls / 2)))
    # Endung
    if detail and label:
        fs = 58 * u if len(label) <= 3 else (48 * u if len(label) == 4 else 40 * u)
        font = ImageFont.truetype(FONT, round(fs))
        tw = d.textlength(label, font=font)
        ty = bottom - 84 * u
        # Feld in Blattfarbe genau hinter der Schrift (die Zeilen laufen nicht durch die Buchstaben)
        x0, y0, x1, y1 = d.textbbox((cx - tw / 2, ty - 8 * u), label, font=font)
        d.rectangle([x0 - 8 * u, y0 - 6 * u, x1 + 8 * u, y1 + 6 * u], fill=P['paper'] + (255,))
        d.text((cx - tw / 2, ty - 8 * u), label, font=font, fill=col + (255,))
    # farbiger Streifen ganz unten am Blatt (ab 32 px)
    if label and size >= 32:
        d.rectangle([left + w, bottom - 16 * u, right - w + 1, bottom], fill=col + (255,))
    return img.resize((size, size), Image.LANCZOS)


def png(img):
    b = io.BytesIO()
    img.save(b, 'PNG', optimize=True)
    return b.getvalue()


def write_ico(path, images):
    head = struct.pack('<HHH', 0, 1, len(images))
    entries, data = b'', b''
    offset = 6 + 16 * len(images)
    for size, blob in images:
        entries += struct.pack('<BBBBHHII', 0 if size >= 256 else size, 0 if size >= 256 else size, 0, 0, 1, 32, len(blob), offset)
        data += blob
        offset += len(blob)
    open(path, 'wb').write(head + entries + data)


ICNS = [('ic11', 32), ('ic12', 64), ('ic07', 128), ('ic13', 256), ('ic08', 256), ('ic14', 512), ('ic09', 512), ('ic10', 1024)]


def write_icns(path, render):
    body = b''
    cache = {}
    for typ, size in ICNS:
        if size not in cache:
            cache[size] = png(render(size))
        blob = cache[size]
        body += typ.encode('ascii') + struct.pack('>I', len(blob) + 8) + blob
    open(path, 'wb').write(b'icns' + struct.pack('>I', len(body) + 8) + body)


for sub in ('light', 'dark', 'mac'):
    os.makedirs(os.path.join(OUT, sub), exist_ok=True)
for name, t in TYPES['icons'].items():
    label, color = t['label'], t['color']
    for variant in ('light', 'dark'):
        render = lambda s, label=label, color=color, dark=variant == 'dark': page(s, label, color, s >= 48, dark)
        write_ico(os.path.join(OUT, variant, f'{name}.ico'), [(s, png(render(s))) for s in (16, 24, 32, 48, 64, 128, 256)])
    write_icns(os.path.join(OUT, 'mac', f'{name}.icns'), lambda s, label=label, color=color: page(s, label, color, s >= 48))
print(f"{len(TYPES['icons'])} Dateisymbole nach {OUT}")

# ---------------------------------------------------------------- Windows: installer.nsh
# Nur "Öffnen mit" + Kontextmenü, ohne Standard-Programme umzustellen (.bat/.ps1 starten weiter, .py läuft weiter).
# Je Symbol eine eigene ProgID (Textline.py, Textline.md ...) - wählt man Textline als Standard, zeigt der Explorer
# das passende Dateisymbol. SHCTX folgt der Wahl "nur für mich" / "für alle" im Installer.
L = []
L.append('; Erzeugt von tools/make-filetype-icons.py aus tools/filetypes.json - nicht von Hand ändern.')
L.append('; Windows: Textline unter "Öffnen mit" für Text- und Code-Dateien eintragen, mit eigenem Dateisymbol je Typ,')
L.append('; und "Mit Textline öffnen" ins Kontextmenü aller Dateien. Absichtlich OHNE das Standard-Programm umzustellen.')
L.append('')
L.append('!macro textlineTypes ADD')
for name, t in TYPES['icons'].items():
    for e in t['exts']:
        L.append(f'  !insertmacro ${{ADD}} "{e}" "{name}"')
L.append('!macroend')
L.append('')
L.append('!macro textlineProgIds CMD')
for name in TYPES['icons']:
    L.append(f'  !insertmacro ${{CMD}} "{name}"')
L.append('!macroend')
L.append('')
L.append('!macro textlineAddProgId NAME')
L.append('  WriteRegStr SHCTX "Software\\Classes\\Textline.${NAME}" "" "Textline"')
L.append('  WriteRegStr SHCTX "Software\\Classes\\Textline.${NAME}\\DefaultIcon" "" "$INSTDIR\\resources\\filetypes\\light\\${NAME}.ico"')
L.append('  WriteRegStr SHCTX "Software\\Classes\\Textline.${NAME}\\shell\\open\\command" "" \'"$INSTDIR\\${APP_EXECUTABLE_FILENAME}" "%1"\'')
L.append('!macroend')
L.append('')
L.append('!macro textlineRemoveProgId NAME')
L.append('  DeleteRegKey SHCTX "Software\\Classes\\Textline.${NAME}"')
L.append('  ; Textline kann das Symbol (hell/dunkel) für den Benutzer umgestellt haben')
L.append('  DeleteRegKey HKCU "Software\\Classes\\Textline.${NAME}"')
L.append('!macroend')
L.append('')
# Nur die ProgID unter "Öffnen mit" - kein zweiter Eintrag über Applications\Textline.exe\SupportedTypes: wählt man
# den, nimmt Windows für alle Typen dasselbe Programmsymbol statt der Dateisymbole.
L.append('!macro textlineAddType EXT NAME')
L.append('  WriteRegStr SHCTX "Software\\Classes\\.${EXT}\\OpenWithProgids" "Textline.${NAME}" ""')
L.append('!macroend')
L.append('')
L.append('!macro textlineRemoveType EXT NAME')
L.append('  DeleteRegValue SHCTX "Software\\Classes\\.${EXT}\\OpenWithProgids" "Textline.${NAME}"')
L.append('!macroend')
L.append('')
L.append('!macro customInstall')
L.append('  StrCpy $0 "Open with Textline"')
L.append('  StrCmp $LANGUAGE 1031 0 +2')
L.append('    StrCpy $0 "Mit Textline öffnen"')
L.append('  ; ältere Versionen: gemeinsame ProgID, Typen zusätzlich über Applications (Programmsymbol statt Dateisymbol)')
L.append('  DeleteRegKey SHCTX "Software\\Classes\\Textline.File"')
L.append('  DeleteRegKey SHCTX "Software\\Classes\\Applications\\${APP_EXECUTABLE_FILENAME}\\SupportedTypes"')
L.append('  !insertmacro textlineProgIds textlineAddProgId')
L.append('  WriteRegStr SHCTX "Software\\Classes\\Applications\\${APP_EXECUTABLE_FILENAME}" "FriendlyAppName" "Textline"')
L.append('  WriteRegStr SHCTX "Software\\Classes\\Applications\\${APP_EXECUTABLE_FILENAME}\\DefaultIcon" "" "$INSTDIR\\resources\\filetypes\\light\\code.ico"')
L.append('  WriteRegStr SHCTX "Software\\Classes\\Applications\\${APP_EXECUTABLE_FILENAME}\\shell\\open\\command" "" \'"$INSTDIR\\${APP_EXECUTABLE_FILENAME}" "%1"\'')
L.append('  !insertmacro textlineTypes textlineAddType')
L.append('  WriteRegStr SHCTX "Software\\Classes\\*\\shell\\Textline" "" "$0"')
L.append('  WriteRegStr SHCTX "Software\\Classes\\*\\shell\\Textline" "Icon" "$INSTDIR\\${APP_EXECUTABLE_FILENAME},0"')
L.append('  WriteRegStr SHCTX "Software\\Classes\\*\\shell\\Textline\\command" "" \'"$INSTDIR\\${APP_EXECUTABLE_FILENAME}" "%1"\'')
L.append("  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'")
L.append('!macroend')
L.append('')
L.append('!macro customUnInstall')
L.append('  ${ifNot} ${isUpdated}')
L.append('    !insertmacro textlineTypes textlineRemoveType')
L.append('    !insertmacro textlineProgIds textlineRemoveProgId')
L.append('    DeleteRegKey SHCTX "Software\\Classes\\Applications\\${APP_EXECUTABLE_FILENAME}"')
L.append('    DeleteRegKey SHCTX "Software\\Classes\\*\\shell\\Textline"')
L.append("    System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'")
L.append('  ${endIf}')
L.append('!macroend')
os.makedirs(os.path.join(ROOT, 'build'), exist_ok=True)
# UTF-8 mit BOM, damit NSIS die Umlaute richtig liest
open(os.path.join(ROOT, 'build', 'installer.nsh'), 'w', encoding='utf-8-sig', newline='\r\n').write('\n'.join(L) + '\n')

# ---------------------------------------------------------------- package.json: Symbole mitliefern, macOS-Zuordnung
pj = os.path.join(ROOT, 'package.json')
pkg = json.load(open(pj, encoding='utf-8'))
b = pkg['build']
b['win']['extraResources'] = [{'from': 'assets/filetypes', 'to': 'filetypes', 'filter': ['light/*.ico', 'dark/*.ico']}]
b['mac']['fileAssociations'] = [
    {'ext': t['exts'], 'name': 'Source code' if name == 'code' else f"{t['label'].upper()} file", 'role': 'Editor', 'icon': f'assets/filetypes/mac/{name}.icns'}
    for name, t in TYPES['icons'].items()
]
json.dump(pkg, open(pj, 'w', encoding='utf-8', newline='\n'), indent=2, ensure_ascii=False)
open(pj, 'a', encoding='utf-8', newline='\n').write('\n')
print('installer.nsh und package.json aktualisiert')
