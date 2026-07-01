# Windows Formal Release Candidate Build Receipt

Status: formal_release_candidate_windows_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-0.1.3-win-installer-manifest.json`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `a4ed00e8de3968d5bb6990753cbe97b8cf9a8c67584850a1f257caf4a2c02e93`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.3`
Channel: `formal`

## Signing

- signing identity: matter-formal-candidate-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-0.1.3-win-installer-manifest.json.sig`

## Installer Hash

- installer hash algorithm: sha256
- installer hash: `28cd62f94a6d3f715684e0b3eb8f14217fe0212be655b2b6cbac2729372663e0`

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

- Windows installer: `apps/desktop/dist/matter-0.1.3-win-x64.exe`
- Windows installer sha256: `aab707905bce485f0bf181c7893cc8e683d2c6a8c72ab57511229e8abd9a7f98`
- Windows installer bytes: 105707098
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.3-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `b2bcd78254327771c2954c6da62784b314cf8c4e1b740dc526f81e7748d49639`
- Windows installer blockmap bytes: 112756
- Windows installer packaging: nsis-x64
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
