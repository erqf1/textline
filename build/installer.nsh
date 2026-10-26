; Erzeugt von tools/make-filetype-icons.py aus tools/filetypes.json - nicht von Hand ändern.
; Windows: Textline unter "Öffnen mit" für Text- und Code-Dateien eintragen, mit eigenem Dateisymbol je Typ,
; und "Mit Textline öffnen" ins Kontextmenü aller Dateien. Absichtlich OHNE das Standard-Programm umzustellen.

!macro textlineTypes ADD
  !insertmacro ${ADD} "txt" "txt"
  !insertmacro ${ADD} "text" "txt"
  !insertmacro ${ADD} "log" "log"
  !insertmacro ${ADD} "md" "md"
  !insertmacro ${ADD} "markdown" "md"
  !insertmacro ${ADD} "rst" "md"
  !insertmacro ${ADD} "py" "py"
  !insertmacro ${ADD} "pyw" "py"
  !insertmacro ${ADD} "pyi" "py"
  !insertmacro ${ADD} "html" "html"
  !insertmacro ${ADD} "htm" "html"
  !insertmacro ${ADD} "css" "css"
  !insertmacro ${ADD} "scss" "css"
  !insertmacro ${ADD} "sass" "css"
  !insertmacro ${ADD} "less" "css"
  !insertmacro ${ADD} "js" "js"
  !insertmacro ${ADD} "mjs" "js"
  !insertmacro ${ADD} "cjs" "js"
  !insertmacro ${ADD} "jsx" "js"
  !insertmacro ${ADD} "ts" "ts"
  !insertmacro ${ADD} "tsx" "ts"
  !insertmacro ${ADD} "json" "json"
  !insertmacro ${ADD} "jsonc" "json"
  !insertmacro ${ADD} "xml" "xml"
  !insertmacro ${ADD} "yaml" "yaml"
  !insertmacro ${ADD} "yml" "yaml"
  !insertmacro ${ADD} "ini" "ini"
  !insertmacro ${ADD} "toml" "toml"
  !insertmacro ${ADD} "cfg" "config"
  !insertmacro ${ADD} "conf" "config"
  !insertmacro ${ADD} "properties" "config"
  !insertmacro ${ADD} "env" "config"
  !insertmacro ${ADD} "gitignore" "config"
  !insertmacro ${ADD} "editorconfig" "config"
  !insertmacro ${ADD} "csv" "csv"
  !insertmacro ${ADD} "tsv" "csv"
  !insertmacro ${ADD} "sql" "sql"
  !insertmacro ${ADD} "sh" "sh"
  !insertmacro ${ADD} "bash" "sh"
  !insertmacro ${ADD} "zsh" "sh"
  !insertmacro ${ADD} "fish" "sh"
  !insertmacro ${ADD} "bat" "bat"
  !insertmacro ${ADD} "cmd" "bat"
  !insertmacro ${ADD} "ps1" "ps1"
  !insertmacro ${ADD} "psm1" "ps1"
  !insertmacro ${ADD} "c" "c"
  !insertmacro ${ADD} "h" "c"
  !insertmacro ${ADD} "cpp" "cpp"
  !insertmacro ${ADD} "cc" "cpp"
  !insertmacro ${ADD} "cxx" "cpp"
  !insertmacro ${ADD} "hpp" "cpp"
  !insertmacro ${ADD} "hh" "cpp"
  !insertmacro ${ADD} "cs" "cs"
  !insertmacro ${ADD} "java" "java"
  !insertmacro ${ADD} "kt" "kt"
  !insertmacro ${ADD} "kts" "kt"
  !insertmacro ${ADD} "go" "go"
  !insertmacro ${ADD} "rs" "rs"
  !insertmacro ${ADD} "rb" "rb"
  !insertmacro ${ADD} "php" "php"
  !insertmacro ${ADD} "lua" "lua"
  !insertmacro ${ADD} "svg" "svg"
  !insertmacro ${ADD} "tex" "tex"
  !insertmacro ${ADD} "diff" "diff"
  !insertmacro ${ADD} "patch" "diff"
  !insertmacro ${ADD} "srt" "srt"
  !insertmacro ${ADD} "vue" "code"
  !insertmacro ${ADD} "svelte" "code"
  !insertmacro ${ADD} "pl" "code"
  !insertmacro ${ADD} "r" "code"
  !insertmacro ${ADD} "swift" "code"
  !insertmacro ${ADD} "dart" "code"
  !insertmacro ${ADD} "scala" "code"
  !insertmacro ${ADD} "cmake" "code"
  !insertmacro ${ADD} "gradle" "code"
  !insertmacro ${ADD} "groovy" "code"
  !insertmacro ${ADD} "hs" "code"
  !insertmacro ${ADD} "elm" "code"
  !insertmacro ${ADD} "erl" "code"
  !insertmacro ${ADD} "ex" "code"
  !insertmacro ${ADD} "exs" "code"
  !insertmacro ${ADD} "clj" "code"
  !insertmacro ${ADD} "jl" "code"
  !insertmacro ${ADD} "nim" "code"
  !insertmacro ${ADD} "zig" "code"
  !insertmacro ${ADD} "v" "code"
  !insertmacro ${ADD} "sv" "code"
  !insertmacro ${ADD} "vhd" "code"
  !insertmacro ${ADD} "asm" "code"
  !insertmacro ${ADD} "s" "code"
  !insertmacro ${ADD} "f90" "code"
  !insertmacro ${ADD} "pas" "code"
  !insertmacro ${ADD} "m" "code"
  !insertmacro ${ADD} "mm" "code"
  !insertmacro ${ADD} "vb" "code"
  !insertmacro ${ADD} "fs" "code"
  !insertmacro ${ADD} "ml" "code"
  !insertmacro ${ADD} "proto" "code"
  !insertmacro ${ADD} "graphql" "code"
  !insertmacro ${ADD} "dockerfile" "code"
  !insertmacro ${ADD} "nix" "code"
  !insertmacro ${ADD} "tf" "code"
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
  !insertmacro ${CMD} "bat"
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

!macro textlineAddType EXT NAME
  WriteRegStr SHCTX "Software\Classes\.${EXT}\OpenWithProgids" "Textline.${NAME}" ""
  WriteRegStr SHCTX "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\SupportedTypes" ".${EXT}" ""
!macroend

!macro textlineRemoveType EXT NAME
  DeleteRegValue SHCTX "Software\Classes\.${EXT}\OpenWithProgids" "Textline.${NAME}"
!macroend

!macro customInstall
  StrCpy $0 "Open with Textline"
  StrCmp $LANGUAGE 1031 0 +2
    StrCpy $0 "Mit Textline öffnen"
  ; ältere Version hatte eine gemeinsame ProgID
  DeleteRegKey SHCTX "Software\Classes\Textline.File"
  !insertmacro textlineProgIds textlineAddProgId
  WriteRegStr SHCTX "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}" "FriendlyAppName" "Textline"
  WriteRegStr SHCTX "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\DefaultIcon" "" "$INSTDIR\resources\filetypes\light\code.ico"
  WriteRegStr SHCTX "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
  !insertmacro textlineTypes textlineAddType
  WriteRegStr SHCTX "Software\Classes\*\shell\Textline" "" "$0"
  WriteRegStr SHCTX "Software\Classes\*\shell\Textline" "Icon" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr SHCTX "Software\Classes\*\shell\Textline\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro customUnInstall
  ${ifNot} ${isUpdated}
    !insertmacro textlineTypes textlineRemoveType
    !insertmacro textlineProgIds textlineRemoveProgId
    DeleteRegKey SHCTX "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}"
    DeleteRegKey SHCTX "Software\Classes\*\shell\Textline"
    System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
  ${endIf}
!macroend
