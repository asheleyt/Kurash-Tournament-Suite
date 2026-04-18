!macro customInstall
  SetOutPath "$INSTDIR"
  File /oname=kurash-tournament-suite-shortcut.ico "${BUILD_RESOURCES_DIR}\KTS_Icon.ico"

  IfFileExists "$newStartMenuLink" 0 +3
    CreateShortCut "$newStartMenuLink" "$appExe" "" "$INSTDIR\kurash-tournament-suite-shortcut.ico" 0 "" "" "${APP_DESCRIPTION}"
    WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"

  IfFileExists "$newDesktopLink" 0 +3
    CreateShortCut "$newDesktopLink" "$appExe" "" "$INSTDIR\kurash-tournament-suite-shortcut.ico" 0 "" "" "${APP_DESCRIPTION}"
    WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
!macroend

!macro customRemoveFiles
  Delete "$INSTDIR\kurash-tournament-suite-shortcut.ico"
!macroend
