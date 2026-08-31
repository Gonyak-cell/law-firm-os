!include "LogicLib.nsh"
!include "x64.nsh"

!define AMIC_OUTLOOK_PROGID "AMIC.OS.Vault.Outlook"
!define AMIC_OUTLOOK_CLSID "{F6C72FE5-325E-49D6-9D1A-1D15122F6D88}"
!define AMIC_MANAGED_CATEGORY "{62C8FE65-4EBB-45E7-B440-6E39B2CDBF29}"
!define AMIC_OUTLOOK_CLASS "Amic.Os.Vault.Outlook.VaultOutlookAddIn"
!define AMIC_OUTLOOK_ASSEMBLY "AMIC.OS.Vault.Outlook, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null"

!macro amicRegisterOutlookAddin
  WriteRegStr HKCU "Software\Classes\${AMIC_OUTLOOK_PROGID}" "" "${AMIC_OUTLOOK_CLASS}"
  WriteRegStr HKCU "Software\Classes\${AMIC_OUTLOOK_PROGID}\CLSID" "" "${AMIC_OUTLOOK_CLSID}"
  WriteRegStr HKCU "Software\Classes\CLSID\${AMIC_OUTLOOK_CLSID}" "" "${AMIC_OUTLOOK_CLASS}"
  WriteRegStr HKCU "Software\Classes\CLSID\${AMIC_OUTLOOK_CLSID}\InprocServer32" "" "mscoree.dll"
  WriteRegStr HKCU "Software\Classes\CLSID\${AMIC_OUTLOOK_CLSID}\InprocServer32" "ThreadingModel" "Both"
  WriteRegStr HKCU "Software\Classes\CLSID\${AMIC_OUTLOOK_CLSID}\InprocServer32" "Class" "${AMIC_OUTLOOK_CLASS}"
  WriteRegStr HKCU "Software\Classes\CLSID\${AMIC_OUTLOOK_CLSID}\InprocServer32" "Assembly" "${AMIC_OUTLOOK_ASSEMBLY}"
  WriteRegStr HKCU "Software\Classes\CLSID\${AMIC_OUTLOOK_CLSID}\InprocServer32" "RuntimeVersion" "v4.0.30319"
  WriteRegStr HKCU "Software\Classes\CLSID\${AMIC_OUTLOOK_CLSID}\InprocServer32" "CodeBase" "file:///$INSTDIR\resources\classic-outlook\AMIC.OS.Vault.Outlook.dll"
  WriteRegStr HKCU "Software\Classes\CLSID\${AMIC_OUTLOOK_CLSID}\InprocServer32\1.0.0.0" "Class" "${AMIC_OUTLOOK_CLASS}"
  WriteRegStr HKCU "Software\Classes\CLSID\${AMIC_OUTLOOK_CLSID}\InprocServer32\1.0.0.0" "Assembly" "${AMIC_OUTLOOK_ASSEMBLY}"
  WriteRegStr HKCU "Software\Classes\CLSID\${AMIC_OUTLOOK_CLSID}\InprocServer32\1.0.0.0" "RuntimeVersion" "v4.0.30319"
  WriteRegStr HKCU "Software\Classes\CLSID\${AMIC_OUTLOOK_CLSID}\InprocServer32\1.0.0.0" "CodeBase" "file:///$INSTDIR\resources\classic-outlook\AMIC.OS.Vault.Outlook.dll"
  WriteRegStr HKCU "Software\Classes\CLSID\${AMIC_OUTLOOK_CLSID}\ProgId" "" "${AMIC_OUTLOOK_PROGID}"
  WriteRegStr HKCU "Software\Classes\CLSID\${AMIC_OUTLOOK_CLSID}\Implemented Categories\${AMIC_MANAGED_CATEGORY}" "" ""
  WriteRegStr HKCU "Software\Microsoft\Office\Outlook\Addins\${AMIC_OUTLOOK_PROGID}" "FriendlyName" "AMIC OS Vault"
  WriteRegStr HKCU "Software\Microsoft\Office\Outlook\Addins\${AMIC_OUTLOOK_PROGID}" "Description" "현재 Outlook 초안에 Vault 문서의 정확한 버전을 첨부합니다."
  WriteRegDWORD HKCU "Software\Microsoft\Office\Outlook\Addins\${AMIC_OUTLOOK_PROGID}" "LoadBehavior" 3
  WriteRegDWORD HKCU "Software\Microsoft\Office\Outlook\Addins\${AMIC_OUTLOOK_PROGID}" "CommandLineSafe" 0
  WriteRegDWORD HKCU "Software\Microsoft\Office\Outlook\Addins\${AMIC_OUTLOOK_PROGID}" "RequireShutdownNotification" 1
  WriteRegStr HKCU "Software\AMIC\AMIC OS" "DesktopExecutable" "$INSTDIR\matter.exe"
!macroend

!macro amicUnregisterOutlookAddin
  DeleteRegKey HKCU "Software\Microsoft\Office\Outlook\Addins\${AMIC_OUTLOOK_PROGID}"
  DeleteRegKey HKCU "Software\Classes\CLSID\${AMIC_OUTLOOK_CLSID}"
  DeleteRegKey HKCU "Software\Classes\${AMIC_OUTLOOK_PROGID}"
  DeleteRegValue HKCU "Software\AMIC\AMIC OS" "DesktopExecutable"
  DeleteRegKey /ifempty HKCU "Software\AMIC\AMIC OS"
  DeleteRegKey /ifempty HKCU "Software\AMIC"
!macroend

!macro customInstall
  IfFileExists "$INSTDIR\resources\classic-outlook\AMIC.OS.Vault.Outlook.dll" 0 amic_outlook_registration_done
  SetRegView 32
  !insertmacro amicRegisterOutlookAddin
  ${If} ${RunningX64}
    SetRegView 64
    !insertmacro amicRegisterOutlookAddin
  ${EndIf}
  SetRegView 32
  amic_outlook_registration_done:
!macroend

!macro customUnInstall
  SetRegView 32
  !insertmacro amicUnregisterOutlookAddin
  ${If} ${RunningX64}
    SetRegView 64
    !insertmacro amicUnregisterOutlookAddin
  ${EndIf}
  SetRegView 32
  RMDir /r "$LOCALAPPDATA\AMIC OS\OutlookAttachments"
!macroend
