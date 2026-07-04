# Windows Formal Release Candidate Build Receipt

Status: formal_release_candidate_windows_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-0.1.7-win-installer-manifest.json`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `a4ed00e8de3968d5bb6990753cbe97b8cf9a8c67584850a1f257caf4a2c02e93`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.7`
Channel: `formal`

## Signing

- signing identity: matter-formal-candidate-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-0.1.7-win-installer-manifest.json.sig`

## Installer Hash

- installer hash algorithm: sha256
- installer hash: `148369da77fc32348dbb9a68ee3bc994bed1afe8d88ec5cbe1fa69b90075027f`

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

- Windows installer: `apps/desktop/dist/matter-0.1.7-win-x64.exe`
- Windows installer sha256: `de988723d64c51213675b585d741000206f2ac086352789b4d948f7e77303735`
- Windows installer bytes: 107901788
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.7-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `75a653bd3621df1329c5497031f46821afcbd2cb841269efc5af3366e9d15f97`
- Windows installer blockmap bytes: 115128
- Windows installer packaging: nsis-x64
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
