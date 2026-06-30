# Windows Formal Release Candidate Build Receipt

Status: formal_release_candidate_windows_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-0.1.1-win-installer-manifest.json`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `a4ed00e8de3968d5bb6990753cbe97b8cf9a8c67584850a1f257caf4a2c02e93`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.1`
Channel: `formal`

## Signing

- signing identity: matter-formal-candidate-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-0.1.1-win-installer-manifest.json.sig`

## Installer Hash

- installer hash algorithm: sha256
- installer hash: `37a53f560b046bbffd3d1b65f768fd1ebd3581aaf14ebb869d5d25c2690d365f`

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

- Windows installer: `apps/desktop/dist/matter-0.1.1-win-x64.exe`
- Windows installer sha256: `f44312f454e430cc6b65c8cc0f24306f69180fcfa4a0381fea5b1cf445e64143`
- Windows installer bytes: 105702409
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.1-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `dc173c696dcfeadd97ec23edc10988e7ad1433975fc37b8da03de379ff4ef251`
- Windows installer blockmap bytes: 112415
- Windows installer packaging: nsis-x64
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
