# Windows Formal Release Candidate Build Receipt

Status: formal_release_candidate_windows_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-0.1.4-win-installer-manifest.json`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `a4ed00e8de3968d5bb6990753cbe97b8cf9a8c67584850a1f257caf4a2c02e93`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.4`
Channel: `formal`

## Signing

- signing identity: matter-formal-candidate-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-0.1.4-win-installer-manifest.json.sig`

## Installer Hash

- installer hash algorithm: sha256
- installer hash: `b0a19511ca529b27d03c14d56c9fc3045d43642a276f772c152c4193204db1ec`

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

- Windows installer: `apps/desktop/dist/matter-0.1.4-win-x64.exe`
- Windows installer sha256: `ffb245a9a2f2ca6dbc71632e735f41a41da56ad2ff3e8b7a6b9d587a46362727`
- Windows installer bytes: 105706925
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.4-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `787b534899954e36f41738be0ec0ee7645c821e6385acba529614a3bcbaaedcb`
- Windows installer blockmap bytes: 112490
- Windows installer packaging: nsis-x64
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
