!include "nsDialogs.nsh"

!ifndef BUILD_UNINSTALLER
Var dialogDesktopShortcutChoice
Var checkboxDesktopShortcutChoice
Var createDesktopShortcutChoice

!macro customInit
  StrCpy $createDesktopShortcutChoice "1"
  ReadRegStr $0 SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" DesktopShortcutChoice
  ${if} $0 == "0"
    StrCpy $createDesktopShortcutChoice "0"
  ${endif}
!macroend

!macro customPageAfterChangeDir
  Page custom DesktopShortcutChoicePageCreate DesktopShortcutChoicePageLeave
!macroend

Function DesktopShortcutChoicePageCreate
  nsDialogs::Create 1018
  Pop $dialogDesktopShortcutChoice

  ${if} $dialogDesktopShortcutChoice == error
    Abort
  ${endif}

  ${NSD_CreateLabel} 0 0 100% 24u "Select the shortcut behavior for this installation."
  Pop $0

  ${NSD_CreateCheckbox} 0 30u 100% 12u "&Create a desktop shortcut named KTS Controller"
  Pop $checkboxDesktopShortcutChoice

  ${if} $createDesktopShortcutChoice == "1"
    ${NSD_Check} $checkboxDesktopShortcutChoice
  ${else}
    ${NSD_Uncheck} $checkboxDesktopShortcutChoice
  ${endif}

  nsDialogs::Show
FunctionEnd

Function DesktopShortcutChoicePageLeave
  ${NSD_GetState} $checkboxDesktopShortcutChoice $0

  ${if} $0 == ${BST_CHECKED}
    StrCpy $createDesktopShortcutChoice "1"
  ${else}
    StrCpy $createDesktopShortcutChoice "0"
  ${endif}
FunctionEnd
!endif

!macro customInstall
  SetOutPath "$INSTDIR"
  File /oname=kurash-tournament-suite-shortcut.ico "${BUILD_RESOURCES_DIR}\KTS_Icon.ico"

  IfFileExists "$newStartMenuLink" 0 +3
    CreateShortCut "$newStartMenuLink" "$appExe" "" "$INSTDIR\kurash-tournament-suite-shortcut.ico" 0 "" "" "${APP_DESCRIPTION}"
    WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"

  WriteRegStr SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" DesktopShortcutChoice "$createDesktopShortcutChoice"

  ${if} $createDesktopShortcutChoice == "1"
    CreateShortCut "$newDesktopLink" "$appExe" "" "$INSTDIR\kurash-tournament-suite-shortcut.ico" 0 "" "" "${APP_DESCRIPTION}"
    WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
  ${else}
    WinShell::UninstShortcut "$newDesktopLink"
    Delete "$newDesktopLink"
  ${endif}

  ${if} $oldDesktopLink != $newDesktopLink
    WinShell::UninstShortcut "$oldDesktopLink"
    Delete "$oldDesktopLink"
  ${endif}

  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend

!macro customRemoveFiles
  WinShell::UninstShortcut "$newDesktopLink"
  Delete "$newDesktopLink"
  ${if} $oldDesktopLink != $newDesktopLink
    WinShell::UninstShortcut "$oldDesktopLink"
    Delete "$oldDesktopLink"
  ${endif}
  DeleteRegValue SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" DesktopShortcutChoice
  Delete "$INSTDIR\kurash-tournament-suite-shortcut.ico"
!macroend
