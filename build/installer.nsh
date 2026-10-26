; Erzeugt von tools/make-filetype-icons.py aus tools/filetypes.json - nicht von Hand ändern.
; Windows: Textline unter "Öffnen mit" für Text- und Code-Dateien (je Typ eine ProgID mit eigenem Dateisymbol) und
; "Mit Textline öffnen" im Kontextmenü aller Dateien. Den Standardwert von .<endung> und UserChoice fasst Textline nie an.
; Ausführbare Dateien und Skripte (.bat, .js, .ps1 ...) bekommen KEINEN OpenWithProgids-Eintrag - sonst zeigt Windows
; beim Doppelklick "Wählen Sie eine App aus" statt sie auszuführen -, sondern "Mit Textline bearbeiten" im Kontextmenü und
; Textline als zuletzt benutzte App unter "Öffnen mit".
; SHCTX = HKCU bei "Nur für mich" (Standard), HKLM nur bei "Für alle Benutzer".

; Typen unter "Öffnen mit": Endung, Symbol/ProgID

!macro textlineTypes CMD
  !insertmacro ${CMD} "txt" "txt"
  !insertmacro ${CMD} "text" "txt"
  !insertmacro ${CMD} "log" "log"
  !insertmacro ${CMD} "md" "md"
  !insertmacro ${CMD} "markdown" "md"
  !insertmacro ${CMD} "rst" "md"
  !insertmacro ${CMD} "py" "py"
  !insertmacro ${CMD} "pyw" "py"
  !insertmacro ${CMD} "pyi" "py"
  !insertmacro ${CMD} "html" "html"
  !insertmacro ${CMD} "htm" "html"
  !insertmacro ${CMD} "css" "css"
  !insertmacro ${CMD} "scss" "css"
  !insertmacro ${CMD} "sass" "css"
  !insertmacro ${CMD} "less" "css"
  !insertmacro ${CMD} "mjs" "js"
  !insertmacro ${CMD} "cjs" "js"
  !insertmacro ${CMD} "jsx" "js"
  !insertmacro ${CMD} "ts" "ts"
  !insertmacro ${CMD} "tsx" "ts"
  !insertmacro ${CMD} "json" "json"
  !insertmacro ${CMD} "jsonc" "json"
  !insertmacro ${CMD} "xml" "xml"
  !insertmacro ${CMD} "yaml" "yaml"
  !insertmacro ${CMD} "yml" "yaml"
  !insertmacro ${CMD} "ini" "ini"
  !insertmacro ${CMD} "toml" "toml"
  !insertmacro ${CMD} "cfg" "config"
  !insertmacro ${CMD} "conf" "config"
  !insertmacro ${CMD} "properties" "config"
  !insertmacro ${CMD} "env" "config"
  !insertmacro ${CMD} "gitignore" "config"
  !insertmacro ${CMD} "editorconfig" "config"
  !insertmacro ${CMD} "csv" "csv"
  !insertmacro ${CMD} "tsv" "csv"
  !insertmacro ${CMD} "sql" "sql"
  !insertmacro ${CMD} "sh" "sh"
  !insertmacro ${CMD} "bash" "sh"
  !insertmacro ${CMD} "zsh" "sh"
  !insertmacro ${CMD} "fish" "sh"
  !insertmacro ${CMD} "psm1" "ps1"
  !insertmacro ${CMD} "c" "c"
  !insertmacro ${CMD} "h" "c"
  !insertmacro ${CMD} "cpp" "cpp"
  !insertmacro ${CMD} "cc" "cpp"
  !insertmacro ${CMD} "cxx" "cpp"
  !insertmacro ${CMD} "hpp" "cpp"
  !insertmacro ${CMD} "hh" "cpp"
  !insertmacro ${CMD} "cs" "cs"
  !insertmacro ${CMD} "java" "java"
  !insertmacro ${CMD} "kt" "kt"
  !insertmacro ${CMD} "kts" "kt"
  !insertmacro ${CMD} "go" "go"
  !insertmacro ${CMD} "rs" "rs"
  !insertmacro ${CMD} "rb" "rb"
  !insertmacro ${CMD} "php" "php"
  !insertmacro ${CMD} "lua" "lua"
  !insertmacro ${CMD} "svg" "svg"
  !insertmacro ${CMD} "tex" "tex"
  !insertmacro ${CMD} "diff" "diff"
  !insertmacro ${CMD} "patch" "diff"
  !insertmacro ${CMD} "srt" "srt"
  !insertmacro ${CMD} "vue" "code"
  !insertmacro ${CMD} "svelte" "code"
  !insertmacro ${CMD} "pl" "code"
  !insertmacro ${CMD} "r" "code"
  !insertmacro ${CMD} "swift" "code"
  !insertmacro ${CMD} "dart" "code"
  !insertmacro ${CMD} "scala" "code"
  !insertmacro ${CMD} "cmake" "code"
  !insertmacro ${CMD} "gradle" "code"
  !insertmacro ${CMD} "groovy" "code"
  !insertmacro ${CMD} "hs" "code"
  !insertmacro ${CMD} "elm" "code"
  !insertmacro ${CMD} "erl" "code"
  !insertmacro ${CMD} "ex" "code"
  !insertmacro ${CMD} "exs" "code"
  !insertmacro ${CMD} "clj" "code"
  !insertmacro ${CMD} "jl" "code"
  !insertmacro ${CMD} "nim" "code"
  !insertmacro ${CMD} "zig" "code"
  !insertmacro ${CMD} "v" "code"
  !insertmacro ${CMD} "sv" "code"
  !insertmacro ${CMD} "vhd" "code"
  !insertmacro ${CMD} "asm" "code"
  !insertmacro ${CMD} "s" "code"
  !insertmacro ${CMD} "f90" "code"
  !insertmacro ${CMD} "pas" "code"
  !insertmacro ${CMD} "m" "code"
  !insertmacro ${CMD} "mm" "code"
  !insertmacro ${CMD} "vb" "code"
  !insertmacro ${CMD} "fs" "code"
  !insertmacro ${CMD} "ml" "code"
  !insertmacro ${CMD} "proto" "code"
  !insertmacro ${CMD} "graphql" "code"
  !insertmacro ${CMD} "dockerfile" "code"
  !insertmacro ${CMD} "nix" "code"
  !insertmacro ${CMD} "tf" "code"
!macroend

!macro textlineProgIds CMD
  !insertmacro ${CMD} "txt"
  !insertmacro ${CMD} "log"
  !insertmacro ${CMD} "md"
  !insertmacro ${CMD} "py"
  !insertmacro ${CMD} "html"
  !insertmacro ${CMD} "css"
  !insertmacro ${CMD} "js"
  !insertmacro ${CMD} "ts"
  !insertmacro ${CMD} "json"
  !insertmacro ${CMD} "xml"
  !insertmacro ${CMD} "yaml"
  !insertmacro ${CMD} "ini"
  !insertmacro ${CMD} "toml"
  !insertmacro ${CMD} "config"
  !insertmacro ${CMD} "csv"
  !insertmacro ${CMD} "sql"
  !insertmacro ${CMD} "sh"
  !insertmacro ${CMD} "ps1"
  !insertmacro ${CMD} "c"
  !insertmacro ${CMD} "cpp"
  !insertmacro ${CMD} "cs"
  !insertmacro ${CMD} "java"
  !insertmacro ${CMD} "kt"
  !insertmacro ${CMD} "go"
  !insertmacro ${CMD} "rs"
  !insertmacro ${CMD} "rb"
  !insertmacro ${CMD} "php"
  !insertmacro ${CMD} "lua"
  !insertmacro ${CMD} "svg"
  !insertmacro ${CMD} "tex"
  !insertmacro ${CMD} "diff"
  !insertmacro ${CMD} "srt"
  !insertmacro ${CMD} "code"
!macroend

; ausführbare Dateien und Skripte: nie unter "Öffnen mit"

!macro textlineScripts CMD
  !insertmacro ${CMD} "bat"
  !insertmacro ${CMD} "cmd"
  !insertmacro ${CMD} "ps1"
  !insertmacro ${CMD} "vbs"
  !insertmacro ${CMD} "vbe"
  !insertmacro ${CMD} "js"
  !insertmacro ${CMD} "jse"
  !insertmacro ${CMD} "wsf"
  !insertmacro ${CMD} "wsh"
  !insertmacro ${CMD} "hta"
  !insertmacro ${CMD} "reg"
  !insertmacro ${CMD} "msi"
  !insertmacro ${CMD} "exe"
  !insertmacro ${CMD} "com"
  !insertmacro ${CMD} "scr"
  !insertmacro ${CMD} "lnk"
!macroend

; davon diese mit "Mit Textline bearbeiten" im Kontextmenü

!macro textlineEditTypes CMD
  !insertmacro ${CMD} "bat"
  !insertmacro ${CMD} "cmd"
  !insertmacro ${CMD} "ps1"
  !insertmacro ${CMD} "vbs"
  !insertmacro ${CMD} "js"
  !insertmacro ${CMD} "wsf"
  !insertmacro ${CMD} "wsh"
  !insertmacro ${CMD} "hta"
  !insertmacro ${CMD} "reg"
!macroend

; ProgIDs älterer Versionen (gemeinsame ProgID, Skript-Typen)

!macro textlineRetiredProgIds CMD
  !insertmacro ${CMD} "File"
  !insertmacro ${CMD} "bat"
!macroend

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
