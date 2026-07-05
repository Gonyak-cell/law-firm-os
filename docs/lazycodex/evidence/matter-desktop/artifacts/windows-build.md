# Windows Formal Release Candidate Build Receipt

Status: formal_release_candidate_windows_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-0.1.9-win-installer-manifest.json`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `a4ed00e8de3968d5bb6990753cbe97b8cf9a8c67584850a1f257caf4a2c02e93`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.9`
Channel: `formal`

## Signing

- signing identity: matter-formal-candidate-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-0.1.9-win-installer-manifest.json.sig`

## Installer Hash

- installer hash algorithm: sha256
- installer hash: `c7297f14f88430be98cd4dd3910e92a4622a24c116c6184adeeae68d09b01b1f`

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

- Windows installer: `apps/desktop/dist/matter-0.1.9-win-x64.exe`
- Windows installer sha256: `9d854ebd516128b8120a54e6a2e0c4a06066bab70a316a9c112ef9cf99a2e780`
- Windows installer bytes: 107903007
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.9-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `f818e65c3706a37707b7b8c5ab358b7e97a078e5c620013613202f87f4520e75`
- Windows installer blockmap bytes: 115241
- Windows installer packaging: nsis-x64
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
