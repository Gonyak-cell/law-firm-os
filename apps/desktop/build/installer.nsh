!include "LogicLib.nsh"
!include "x64.nsh"

!define AMIC_OUTLOOK_PROGID "AMIC.OS.Vault.Outlook"
!define AMIC_OUTLOOK_CLSID "{F6C72FE5-325E-49D6-9D1A-1D15122F6D88}"

!macro amicRegisterOutlookAddinForCurrentUser
  WriteRegStr HKCU "Software\Microsoft\Office\Outlook\Addins\${AMIC_OUTLOOK_PROGID}" "FriendlyName" "AMIC OS Vault"
  WriteRegStr HKCU "Software\Microsoft\Office\Outlook\Addins\${AMIC_OUTLOOK_PROGID}" "Description" "현재 Outlook 초안에 Vault 문서의 정확한 버전을 첨부합니다."
  WriteRegDWORD HKCU "Software\Microsoft\Office\Outlook\Addins\${AMIC_OUTLOOK_PROGID}" "LoadBehavior" 3
  WriteRegDWORD HKCU "Software\Microsoft\Office\Outlook\Addins\${AMIC_OUTLOOK_PROGID}" "CommandLineSafe" 0
  WriteRegDWORD HKCU "Software\Microsoft\Office\Outlook\Addins\${AMIC_OUTLOOK_PROGID}" "RequireShutdownNotification" 1
  WriteRegStr HKCU "Software\AMIC\AMIC OS" "DesktopExecutable" "$INSTDIR\matter.exe"
!macroend

!macro amicUnregisterOutlookAddinForCurrentUser
  DeleteRegKey HKCU "Software\Microsoft\Office\Outlook\Addins\${AMIC_OUTLOOK_PROGID}"
  DeleteRegValue HKCU "Software\AMIC\AMIC OS" "DesktopExecutable"
  DeleteRegKey /ifempty HKCU "Software\AMIC\AMIC OS"
  DeleteRegKey /ifempty HKCU "Software\AMIC"
!macroend

!macro amicRemoveLegacyUserComRegistration
  DeleteRegKey HKCU "Software\Classes\CLSID\${AMIC_OUTLOOK_CLSID}"
  DeleteRegKey HKCU "Software\Classes\${AMIC_OUTLOOK_PROGID}"
!macroend

!macro amicRemoveMachineComRegistration
  DeleteRegKey HKLM "Software\Classes\CLSID\${AMIC_OUTLOOK_CLSID}"
  DeleteRegKey HKLM "Software\Classes\${AMIC_OUTLOOK_PROGID}"
!macroend

!macro amicRegisterManagedCom FRAMEWORK
  ExecWait '"$WINDIR\Microsoft.NET\${FRAMEWORK}\v4.0.30319\RegAsm.exe" "$INSTDIR\resources\classic-outlook\AMIC.OS.Vault.Outlook.dll" /codebase /silent' $0
  ${If} $0 != 0
    SetRegView 32
    !insertmacro amicRemoveMachineComRegistration
    !insertmacro amicUnregisterOutlookAddinForCurrentUser
    ${If} ${RunningX64}
      SetRegView 64
      !insertmacro amicRemoveMachineComRegistration
      !insertmacro amicUnregisterOutlookAddinForCurrentUser
    ${EndIf}
    SetRegView 32
    MessageBox MB_ICONSTOP "AMIC OS Vault Outlook 구성요소를 등록하지 못했습니다. 오류 코드: $0"
    Abort
  ${EndIf}
!macroend

!macro customInstall
  IfFileExists "$INSTDIR\resources\classic-outlook\AMIC.OS.Vault.Outlook.dll" 0 amic_outlook_registration_done

  SetRegView 32
  !insertmacro amicRemoveLegacyUserComRegistration
  ${If} ${RunningX64}
    SetRegView 64
    !insertmacro amicRemoveLegacyUserComRegistration
  ${EndIf}

  !insertmacro amicRegisterManagedCom "Framework"
  ${If} ${RunningX64}
    !insertmacro amicRegisterManagedCom "Framework64"
  ${EndIf}

  SetRegView 32
  !insertmacro amicRegisterOutlookAddinForCurrentUser
  ${If} ${RunningX64}
    SetRegView 64
    !insertmacro amicRegisterOutlookAddinForCurrentUser
  ${EndIf}
  SetRegView 32

  amic_outlook_registration_done:
!macroend

!macro customUnInstall
  IfFileExists "$INSTDIR\resources\classic-outlook\AMIC.OS.Vault.Outlook.dll" 0 amic_outlook_unregasm_done
  ExecWait '"$WINDIR\Microsoft.NET\Framework\v4.0.30319\RegAsm.exe" "$INSTDIR\resources\classic-outlook\AMIC.OS.Vault.Outlook.dll" /unregister /silent' $0
  ${If} ${RunningX64}
    ExecWait '"$WINDIR\Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe" "$INSTDIR\resources\classic-outlook\AMIC.OS.Vault.Outlook.dll" /unregister /silent' $0
  ${EndIf}
  amic_outlook_unregasm_done:

  SetRegView 32
  !insertmacro amicUnregisterOutlookAddinForCurrentUser
  !insertmacro amicRemoveLegacyUserComRegistration
  !insertmacro amicRemoveMachineComRegistration
  ${If} ${RunningX64}
    SetRegView 64
    !insertmacro amicUnregisterOutlookAddinForCurrentUser
    !insertmacro amicRemoveLegacyUserComRegistration
    !insertmacro amicRemoveMachineComRegistration
  ${EndIf}
  ${If} ${RunningX64}
    SetRegView 64
  ${Else}
    SetRegView 32
  ${EndIf}
  RMDir /r "$LOCALAPPDATA\AMIC OS\OutlookAttachments"
!macroend
