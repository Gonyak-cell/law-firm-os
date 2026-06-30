# Windows Formal Release Candidate Build Receipt

Status: formal_release_candidate_windows_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-0.1.0-win-installer-manifest.json`
Windows package directory: `apps/desktop/dist/win/matter-0.1.0-win32-x64`
Windows executable: `apps/desktop/dist/win/matter-0.1.0-win32-x64/matter.exe`
Windows unsigned package zip: `apps/desktop/dist/win/matter-0.1.0-win32-x64-unsigned.zip`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `a4ed00e8de3968d5bb6990753cbe97b8cf9a8c67584850a1f257caf4a2c02e93`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.0`
Channel: `formal`

## Signing

- signing identity: matter-formal-candidate-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-0.1.0-win-installer-manifest.json.sig`

## Installer Hash

- installer hash algorithm: sha256
- installer hash: `843ad93b77937dc3155d4acfbfb27693183a7e3293dc6b54ebe4207d010e3ade`
- executable hash: `30fd02e82aa5835cb82992fbce5a2738da1861773f1184f4f9d8f9d128db11fc`
- unsigned package zip hash: `cecbf33a8fc2f42e1923339b245a725fd9de17fa5b1f7119d94ca1c0ec78e005`

## Install Smoke

- package directory exists: true
- executable exists: true
- unsigned package zip exists: true
- install smoke result: package_candidate_created
- Windows native install smoke: not_run_on_darwin

## Non-Claims

- production go-live: false
- public release: false
- owner approval: false
- Microsoft Store distribution: false
- Windows Authenticode signing: false
