# Windows Formal Release Candidate Build Receipt

Status: formal_release_candidate_windows_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-0.1.5-win-installer-manifest.json`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `a4ed00e8de3968d5bb6990753cbe97b8cf9a8c67584850a1f257caf4a2c02e93`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.5`
Channel: `formal`

## Signing

- signing identity: matter-formal-candidate-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-0.1.5-win-installer-manifest.json.sig`

## Installer Hash

- installer hash algorithm: sha256
- installer hash: `dcd689cce4a768741f6d0220c1b3e8cb7892215dd1459c75136b2d852d6ea868`

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

- Windows installer: `apps/desktop/dist/matter-0.1.5-win-x64.exe`
- Windows installer sha256: `57915d9332fcef24a4427935c3b227907f7e208bcfe5df1b326f5fc2052c9f5f`
- Windows installer bytes: 105706534
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.5-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `a9c8adda89ad8593602b7039c8028f44ce58971c7c0b6824bf0b141a1bc4b303`
- Windows installer blockmap bytes: 112496
- Windows installer packaging: nsis-x64
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
