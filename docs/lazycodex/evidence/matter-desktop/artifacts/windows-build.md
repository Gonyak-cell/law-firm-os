# Windows Formal Release Candidate Build Receipt

Status: formal_release_candidate_windows_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-0.1.14-win-installer-manifest.json`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `a4ed00e8de3968d5bb6990753cbe97b8cf9a8c67584850a1f257caf4a2c02e93`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.14`
Channel: `formal`

## Signing

- signing identity: matter-formal-candidate-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-0.1.14-win-installer-manifest.json.sig`

## Manifest Hash

- manifest hash algorithm: sha256
- manifest hash: `eca443565c26a2da990ec16ec6b4e09a864ee19363296e607ed16462cc7d4447`

## Install Smoke

- install smoke result: manifest_smoke_pass
- Windows native install smoke: not_run_on_darwin

## Non-Claims

- production go-live: false
- public release: false
- owner approval: false
- Microsoft Store distribution: false
- Windows Authenticode signing: false
## Installer Package

- Windows installer: `apps/desktop/dist/matter-0.1.14-win-x64.exe`
- Windows installer sha256: `89f0be0d7d8655b7cd11233dbdd5dee1e60a30aa2a1fa066497fbe771690331f`
- Windows installer bytes: 108193094
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.14-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `198ebeed14c71c769ad742b96f068b4517a0f96fcbb6ef1500a8830f55491fb6`
- Windows installer blockmap bytes: 115369
- Windows installer packaging: nsis-x64
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
