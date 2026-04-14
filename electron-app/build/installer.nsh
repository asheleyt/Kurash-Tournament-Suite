!macro customInstall
  SetOutPath "$INSTDIR"
  File /oname=kts-shortcut.ico "${BUILD_RESOURCES_DIR}\kts.ico"

  IfFileExists "$newStartMenuLink" 0 +3
    CreateShortCut "$newStartMenuLink" "$appExe" "" "$INSTDIR\kts-shortcut.ico" 0 "" "" "${APP_DESCRIPTION}"
    WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"

  IfFileExists "$newDesktopLink" 0 +3
    CreateShortCut "$newDesktopLink" "$appExe" "" "$INSTDIR\kts-shortcut.ico" 0 "" "" "${APP_DESCRIPTION}"
    WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
!macroend

!macro customRemoveFiles
  Delete "$INSTDIR\kts-shortcut.ico"
!macroend
