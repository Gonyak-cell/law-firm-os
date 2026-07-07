# Windows Formal Release Candidate Build Receipt

Status: formal_release_candidate_windows_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-0.1.10-win-installer-manifest.json`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `a4ed00e8de3968d5bb6990753cbe97b8cf9a8c67584850a1f257caf4a2c02e93`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.10`
Channel: `formal`

## Signing

- signing identity: matter-formal-candidate-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-0.1.10-win-installer-manifest.json.sig`

## Installer Hash

- installer hash algorithm: sha256
- installer hash: `72bdf5f7ca55befdb9620d347e91f21051063afbda4f65d2ebf33103cb23c5c5`

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

- Windows installer: `apps/desktop/dist/matter-0.1.10-win-x64.exe`
- Windows installer sha256: `38ad31095a25ac309865d1fd4e0b3c18f5be19434164aa4c96119837a3db3389`
- Windows installer bytes: 107908551
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.10-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `5e2ce36b80c6c84c320e4d005a7c847a142325a20856ebf4e2ff169bd346ebb6`
- Windows installer blockmap bytes: 115110
- Windows installer packaging: nsis-x64
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
