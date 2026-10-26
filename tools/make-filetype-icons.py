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


# ---------------------------------------------------------------- kleine Größen (16-40 px)
# Logo und Endung sind dort zu klein. Stattdessen: Blatt, darauf unten ein breites farbiges Schild mit der Endung in
# weißen Großbuchstaben (16/20 px als Pixelschrift, ab 24 px Segoe UI), ab 20 px oben klein das Logo.
SMALL_LIGHT = {'paper': (255, 255, 255), 'outline': (150, 156, 168), 'fold': (226, 230, 237), 'lines': (205, 209, 216)}
SMALL_DARK = {'paper': (43, 45, 50), 'outline': (110, 114, 124), 'fold': (62, 65, 72), 'lines': (78, 81, 90)}
GLYPHS = {  # 3x5 Pixel je Zeichen
    'A': '.#.|#.#|###|#.#|#.#', 'B': '##.|#.#|##.|#.#|##.', 'C': '.##|#..|#..|#..|.##', 'D': '##.|#.#|#.#|#.#|##.',
    'E': '###|#..|##.|#..|###', 'F': '###|#..|##.|#..|#..', 'G': '.##|#..|#.#|#.#|.##', 'H': '#.#|#.#|###|#.#|#.#',
    'I': '###|.#.|.#.|.#.|###', 'J': '..#|..#|..#|#.#|.#.', 'K': '#.#|#.#|##.|#.#|#.#', 'L': '#..|#..|#..|#..|###',
    'M': '#.#|###|###|#.#|#.#', 'N': '##.|#.#|#.#|#.#|#.#', 'O': '.#.|#.#|#.#|#.#|.#.', 'P': '##.|#.#|##.|#..|#..',
    'Q': '.#.|#.#|#.#|##.|.##', 'R': '##.|#.#|##.|#.#|#.#', 'S': '.##|#..|.#.|..#|##.', 'T': '###|.#.|.#.|.#.|.#.',
    'U': '#.#|#.#|#.#|#.#|###', 'V': '#.#|#.#|#.#|#.#|.#.', 'W': '#.#|#.#|###|###|#.#', 'X': '#.#|#.#|.#.|#.#|#.#',
    'Y': '#.#|#.#|.#.|.#.|.#.', 'Z': '###|..#|.#.|#..|###',
    '0': '###|#.#|#.#|#.#|###', '1': '.#.|##.|.#.|.#.|###', '2': '##.|..#|.#.|#..|###', '3': '##.|..#|.#.|..#|##.',
    '4': '#.#|#.#|###|..#|..#', '5': '###|#..|##.|..#|##.', '6': '.##|#..|###|#.#|###', '7': '###|..#|.#.|.#.|.#.',
    '8': '###|#.#|###|#.#|###', '9': '###|#.#|###|..#|##.',
    '+': '...|.#.|###|.#.|...', '#': '#.#|###|#.#|###|#.#', '<': '..#|.#.|#..|.#.|..#', '>': '#..|.#.|..#|.#.|#..',
    '/': '..#|..#|.#.|#..|#..',
}


def small(size, label, color, dark=False):
    P = SMALL_DARK if dark else SMALL_LIGHT
    col = hexrgb(color)
    s, K = size, 4
    left = int(s * 0.125 + 0.5)
    right, fold = s - left, int(s * 0.3 + 0.5)
    # Blatt mit 1 px Rand und Eselsohr, auf ganze Pixel ausgerichtet (4-fach gezeichnet, dann verkleinert)
    img = Image.new('RGBA', (s * K, s * K), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    poly = lambda pts, fill: d.polygon([(x * K, y * K) for x, y in pts], fill=fill + (255,))
    poly([(left, 0), (right - fold, 0), (right, fold), (right, s), (left, s)], P['outline'])
    poly([(left + 1, 1), (right - fold - 0.4, 1), (right - 1, fold + 0.4), (right - 1, s - 1), (left + 1, s - 1)], P['paper'])
    poly([(right - fold, 0), (right - fold, fold), (right, fold)], P['outline'])
    poly([(right - fold + 1, 1.25), (right - fold + 1, fold - 1), (right - 1.25, fold - 1)], P['fold'])
    img = img.resize((s, s), Image.LANCZOS)
    d = ImageDraw.Draw(img)
    text, font = label.upper(), None
    if s >= 24:  # größte Segoe-Größe, die aufs Schild passt - sonst Pixelschrift
        for fs in range(round(s * 0.42), 6, -1):
            f = ImageFont.truetype(FONT, fs)
            x0, _, x1, _ = d.textbbox((0, 0), text, font=f)
            if x1 - x0 <= s - 2:
                font = f
                break
    if font is None:
        if len(text) * 4 - 1 > s:  # 16 px: höchstens 4 Zeichen
            text = text[:3]
        tw, th = len(text) * 4 - 1, 5
    else:
        hb = d.textbbox((0, 0), 'H', font=font)
        tw, th = x1 - x0, hb[3] - hb[1]  # Breite, Versalhöhe
    pad = 1 if s < 20 else 2 if s < 32 else 3
    bh = th + 2 * pad
    by = s - 1 - bh
    bw = min(s, max(tw + 2 * pad, right - left + 2))
    bx = (s - bw) // 2
    d.rectangle([bx, by, bx + bw - 1, by + bh - 1], fill=col + (255,))
    for cx, cy in ((bx, by), (bx + bw - 1, by), (bx, by + bh - 1), (bx + bw - 1, by + bh - 1)):
        img.putpixel((cx, cy), col + (110,))  # Ecken leicht abgerundet
    tx = bx + (bw - tw) // 2
    if font is None:
        for ch in text:
            for r, row in enumerate(GLYPHS.get(ch, '...|...|...|...|...').split('|')):
                for c, v in enumerate(row):
                    if v == '#':
                        img.putpixel((tx + c, by + pad + r), (255, 255, 255, 255))
            tx += 4
    else:
        d.text((tx - x0, by + pad - hb[1]), text, font=font, fill=(255, 255, 255, 255))
    if s >= 20:  # Logo oben links auf dem Blatt
        ls = min(by - 3, right - left - fold)
        img.alpha_composite(LOGO.resize((ls, ls), Image.LANCZOS), (left + 2, 2))
    else:  # 16 px: zwei Zeilen statt Logo
        for y in range(3, by - 1, 2):
            d.line([(left + 2, y), (right - (fold + 1 if y < fold + 1 else 3), y)], fill=P['lines'] + (255,))
    return img


SIZES = (16, 20, 24, 32, 40, 48, 64, 128, 256)


def icon(size, label, color, dark=False):
    return small(size, label, color, dark) if size < 48 else page(size, label, color, True, dark)


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
    for f in os.listdir(os.path.join(OUT, sub)):  # Symbole entfernter Typen nicht mehr mitliefern
        if os.path.splitext(f)[0] not in TYPES['icons']:
            os.remove(os.path.join(OUT, sub, f))
for name, t in TYPES['icons'].items():
    label, color = t['label'], t['color']
    for variant in ('light', 'dark'):
        render = lambda s, label=label, color=color, dark=variant == 'dark': icon(s, label, color, dark)
        write_ico(os.path.join(OUT, variant, f'{name}.ico'), [(s, png(render(s))) for s in SIZES])
    write_icns(os.path.join(OUT, 'mac', f'{name}.icns'), lambda s, label=label, color=color: icon(s, label, color))
print(f"{len(TYPES['icons'])} Dateisymbole nach {OUT}")

# ---------------------------------------------------------------- Windows: installer.nsh
# Nur "Öffnen mit" + Kontextmenü - nie den Standardwert von .<endung> oder UserChoice. Je Symbol eine eigene ProgID
# (Textline.py, Textline.md ...): wählt man Textline als Standard, zeigt der Explorer das passende Dateisymbol.
# Ausführbare Dateien und Skripte (scripts.never) bekommen keinen Öffnen-mit-Eintrag, sonst zeigt Windows beim
# Doppelklick auf eine .bat "Wählen Sie eine App aus" statt sie auszuführen. scripts.edit: "Mit Textline bearbeiten".
SCRIPTS = TYPES['scripts']
clash = sorted({e for t in TYPES['icons'].values() for e in t['exts']} & set(SCRIPTS['never']))
assert not clash, f'Diese Endungen dürfen nicht unter "Öffnen mit" stehen: {clash}'
assert set(SCRIPTS['edit']) <= set(SCRIPTS['never'])


def macro_list(name, rows):
    return '\n'.join([f'!macro {name} CMD', *(f'  !insertmacro ${{CMD}} ' + ' '.join(f'"{a}"' for a in row) for row in rows), '!macroend'])


LISTS = '\n\n'.join([
    '; Typen unter "Öffnen mit": Endung, Symbol/ProgID',
    macro_list('textlineTypes', [(e, name) for name, t in TYPES['icons'].items() for e in t['exts']]),
    macro_list('textlineProgIds', [(name,) for name in TYPES['icons']]),
    '; ausführbare Dateien und Skripte: nie unter "Öffnen mit"',
    macro_list('textlineScripts', [(e,) for e in SCRIPTS['never']]),
    '; davon diese mit "Mit Textline bearbeiten" im Kontextmenü',
    macro_list('textlineEditTypes', [(e,) for e in SCRIPTS['edit']]),
    '; ProgIDs älterer Versionen (gemeinsame ProgID, Skript-Typen)',
    macro_list('textlineRetiredProgIds', [(n,) for n in SCRIPTS['retiredProgIds']]),
])

NSH = r'''; Erzeugt von tools/make-filetype-icons.py aus tools/filetypes.json - nicht von Hand ändern.
; Windows: Textline unter "Öffnen mit" für Text- und Code-Dateien (je Typ eine ProgID mit eigenem Dateisymbol) und
; "Mit Textline öffnen" im Kontextmenü aller Dateien. Den Standardwert von .<endung> und UserChoice fasst Textline nie an.
; Ausführbare Dateien und Skripte (.bat, .js, .ps1 ...) bekommen KEINEN OpenWithProgids-Eintrag - sonst zeigt Windows
; beim Doppelklick "Wählen Sie eine App aus" statt sie auszuführen -, sondern "Mit Textline bearbeiten" im Kontextmenü und
; Textline als zuletzt benutzte App unter "Öffnen mit".
; SHCTX = HKCU bei "Nur für mich" (Standard), HKLM nur bei "Für alle Benutzer".

@LISTS@

; Schlüssel löschen, wenn er ganz leer ist (keine Unterschlüssel, keine Werte, auch kein Standardwert)
!macro textlineDeleteIfEmpty ROOT KEY
  Push $R1
  ClearErrors
  EnumRegKey $R1 ${ROOT} "${KEY}" 0
  ${IfNot} ${Errors}
  ${AndIf} $R1 == ""
    ClearErrors
    EnumRegValue $R1 ${ROOT} "${KEY}" 0
    ${If} ${Errors}
      DeleteRegKey ${ROOT} "${KEY}"
    ${EndIf}
  ${EndIf}
  Pop $R1
!macroend

; alle Werte "Textline.*" aus .<endung>\OpenWithProgids entfernen, danach die Schlüssel, falls leer
!macro textlineDropOpenWith ROOT EXT
  Push $R1
  Push $R2
  Push $R3
  StrCpy $R3 0
  ${Do}
    ClearErrors
    EnumRegValue $R1 ${ROOT} "Software\Classes\.${EXT}\OpenWithProgids" $R3
    ${If} ${Errors}
      ${Break}
    ${EndIf}
    StrCpy $R2 $R1 9
    ClearErrors
    ${If} $R2 == "Textline."
      DeleteRegValue ${ROOT} "Software\Classes\.${EXT}\OpenWithProgids" $R1
    ${Else}
      SetErrors
    ${EndIf}
    ${If} ${Errors}  ; Wert bleibt (anderes Programm oder keine Rechte): weiter mit dem nächsten
      IntOp $R3 $R3 + 1
    ${EndIf}
  ${Loop}
  !insertmacro textlineDeleteIfEmpty ${ROOT} "Software\Classes\.${EXT}\OpenWithProgids"
  !insertmacro textlineDeleteIfEmpty ${ROOT} "Software\Classes\.${EXT}"
  Pop $R3
  Pop $R2
  Pop $R1
!macroend

!macro textlineAddProgId NAME
  WriteRegStr SHCTX "Software\Classes\Textline.${NAME}" "" "Textline"
  WriteRegStr SHCTX "Software\Classes\Textline.${NAME}\DefaultIcon" "" "$INSTDIR\resources\filetypes\light\${NAME}.ico"
  WriteRegStr SHCTX "Software\Classes\Textline.${NAME}\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
!macroend

!macro textlineRemoveProgId NAME
  DeleteRegKey SHCTX "Software\Classes\Textline.${NAME}"
  ; Textline kann das Symbol (hell/dunkel) für den Benutzer umgestellt haben
  DeleteRegKey HKCU "Software\Classes\Textline.${NAME}"
!macroend

; in HKCU und HKLM (HKLM klappt nur mit Adminrechten, sonst passiert dort nichts)
!macro textlineDropRetiredProgId NAME
  DeleteRegKey HKCU "Software\Classes\Textline.${NAME}"
  DeleteRegKey HKLM "Software\Classes\Textline.${NAME}"
!macroend

; Nur die ProgID unter "Öffnen mit" - kein Eintrag über Applications\Textline.exe\SupportedTypes (sonst nimmt Windows
; für alle Typen das Programmsymbol). Vorher den Rest der Vorabversion entfernen (gemeinsame ProgID Textline.File).
!macro textlineAddType EXT NAME
  DeleteRegValue HKCU "Software\Classes\.${EXT}\OpenWithProgids" "Textline.File"
  DeleteRegValue HKLM "Software\Classes\.${EXT}\OpenWithProgids" "Textline.File"
  WriteRegStr SHCTX "Software\Classes\.${EXT}\OpenWithProgids" "Textline.${NAME}" ""
!macroend

!macro textlineRemoveType EXT NAME
  !insertmacro textlineDropOpenWith SHCTX "${EXT}"
  !insertmacro textlineDropOpenWith HKCU "${EXT}"
!macroend

; Skript-Typen: alle Textline-Einträge unter "Öffnen mit" entfernen (HKCU und, mit Adminrechten, HKLM)
!macro textlineCleanScript EXT
  !insertmacro textlineDropOpenWith HKCU "${EXT}"
  !insertmacro textlineDropOpenWith HKLM "${EXT}"
!macroend

; Skript-Typen: nur "Mit Textline bearbeiten" im Kontextmenü. Gleicher Verb-Name wie *\shell\Textline - der Explorer
; zeigt dann nur diesen Eintrag statt zusätzlich "Mit Textline öffnen".
!macro textlineAddEdit EXT
  WriteRegStr SHCTX "Software\Classes\SystemFileAssociations\.${EXT}\shell\Textline" "" "$1"
  WriteRegStr SHCTX "Software\Classes\SystemFileAssociations\.${EXT}\shell\Textline" "Icon" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr SHCTX "Software\Classes\SystemFileAssociations\.${EXT}\shell\Textline\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
!macroend

!macro textlineRemoveEdit EXT
  DeleteRegKey SHCTX "Software\Classes\SystemFileAssociations\.${EXT}\shell\Textline"
  !insertmacro textlineDeleteIfEmpty SHCTX "Software\Classes\SystemFileAssociations\.${EXT}\shell"
  !insertmacro textlineDeleteIfEmpty SHCTX "Software\Classes\SystemFileAssociations\.${EXT}"
!macroend

; Skript-Typen: Textline unter "Öffnen mit" als zuletzt benutzte App eintragen - genau das schreibt Windows selbst,
; nachdem man einmal "Öffnen mit -> Textline" gewählt hat. Anders als ein OpenWithProgids-Eintrag lässt das Windows
; beim Doppelklick nicht nach einer App fragen; die .bat startet weiter.
!macro textlineAddRecent EXT
  Push $R1
  Push $R2
  Push $R3
  Push $R4
  StrCpy $R3 "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.${EXT}\OpenWithList"
  StrCpy $R1 0
  ${Do}
    StrCpy $R2 "abcdefghijklmnopqrstuvwxyz" 1 $R1
    ${If} $R2 == ""
      ${Break}  ; alle Plätze belegt
    ${EndIf}
    ClearErrors
    ReadRegStr $R4 HKCU $R3 $R2
    ${If} ${Errors}  ; freier Platz: eintragen und hinten an die Reihenfolge hängen
      WriteRegStr HKCU $R3 $R2 "${APP_EXECUTABLE_FILENAME}"
      ReadRegStr $R4 HKCU $R3 "MRUList"
      WriteRegStr HKCU $R3 "MRUList" "$R4$R2"
      ${Break}
    ${EndIf}
    ${If} $R4 == "${APP_EXECUTABLE_FILENAME}"
      ${Break}  ; steht schon drin
    ${EndIf}
    IntOp $R1 $R1 + 1
  ${Loop}
  Pop $R4
  Pop $R3
  Pop $R2
  Pop $R1
!macroend

!macro textlineRemoveRecent EXT
  Push $R1
  Push $R2
  Push $R3
  Push $R4
  Push $R5
  Push $R6
  StrCpy $R3 "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.${EXT}\OpenWithList"
  StrCpy $R1 0
  ${Do}
    StrCpy $R2 "abcdefghijklmnopqrstuvwxyz" 1 $R1
    ${If} $R2 == ""
      ${Break}
    ${EndIf}
    ClearErrors
    ReadRegStr $R4 HKCU $R3 $R2
    ${IfNot} ${Errors}
    ${AndIf} $R4 == "${APP_EXECUTABLE_FILENAME}"
      DeleteRegValue HKCU $R3 $R2
      ; den Buchstaben aus der Reihenfolge nehmen
      ReadRegStr $R4 HKCU $R3 "MRUList"
      StrCpy $R5 ""
      StrCpy $R6 0
      ${Do}
        StrCpy $R1 $R4 1 $R6
        ${If} $R1 == ""
          ${Break}
        ${EndIf}
        ${If} $R1 != $R2
          StrCpy $R5 "$R5$R1"
        ${EndIf}
        IntOp $R6 $R6 + 1
      ${Loop}
      ${If} $R5 == ""
        DeleteRegValue HKCU $R3 "MRUList"
        !insertmacro textlineDeleteIfEmpty HKCU $R3
      ${Else}
        WriteRegStr HKCU $R3 "MRUList" $R5
      ${EndIf}
      ${Break}
    ${EndIf}
    IntOp $R1 $R1 + 1
  ${Loop}
  Pop $R6
  Pop $R5
  Pop $R4
  Pop $R3
  Pop $R2
  Pop $R1
!macroend

!macro customInstall
  Push $0
  Push $1
  StrCpy $0 "Open with Textline"
  StrCpy $1 "Edit with Textline"
  ${If} $LANGUAGE == 1031
    StrCpy $0 "Mit Textline öffnen"
    StrCpy $1 "Mit Textline bearbeiten"
  ${EndIf}
  ; aufräumen, auch nach älteren Versionen: Skript-Typen, alte ProgIDs, alte Applications-Liste
  !insertmacro textlineScripts textlineCleanScript
  !insertmacro textlineRetiredProgIds textlineDropRetiredProgId
  DeleteRegKey HKCU "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\SupportedTypes"
  DeleteRegKey HKLM "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\SupportedTypes"
  ; eintragen
  !insertmacro textlineProgIds textlineAddProgId
  WriteRegStr SHCTX "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}" "FriendlyAppName" "Textline"
  WriteRegStr SHCTX "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\DefaultIcon" "" "$INSTDIR\resources\filetypes\light\code.ico"
  WriteRegStr SHCTX "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
  !insertmacro textlineTypes textlineAddType
  WriteRegStr SHCTX "Software\Classes\*\shell\Textline" "" "$0"
  WriteRegStr SHCTX "Software\Classes\*\shell\Textline" "Icon" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr SHCTX "Software\Classes\*\shell\Textline\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
  !insertmacro textlineEditTypes textlineAddEdit
  !insertmacro textlineEditTypes textlineAddRecent
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
  Pop $1
  Pop $0
!macroend

!macro customUnInstall
  ${ifNot} ${isUpdated}
    !insertmacro textlineTypes textlineRemoveType
    !insertmacro textlineScripts textlineCleanScript
    !insertmacro textlineEditTypes textlineRemoveEdit
    !insertmacro textlineEditTypes textlineRemoveRecent
    !insertmacro textlineProgIds textlineRemoveProgId
    !insertmacro textlineRetiredProgIds textlineDropRetiredProgId
    DeleteRegKey SHCTX "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}"
    DeleteRegKey SHCTX "Software\Classes\*\shell\Textline"
    System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
  ${endIf}
!macroend
'''
os.makedirs(os.path.join(ROOT, 'build'), exist_ok=True)
# UTF-8 mit BOM, damit NSIS die Umlaute richtig liest
open(os.path.join(ROOT, 'build', 'installer.nsh'), 'w', encoding='utf-8-sig', newline='\r\n').write(NSH.replace('@LISTS@', LISTS))

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
