# Windows Formal Release Candidate Build Receipt

Status: formal_release_candidate_windows_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-0.1.8-win-installer-manifest.json`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `a4ed00e8de3968d5bb6990753cbe97b8cf9a8c67584850a1f257caf4a2c02e93`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.8`
Channel: `formal`

## Signing

- signing identity: matter-formal-candidate-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-0.1.8-win-installer-manifest.json.sig`

## Installer Hash

- installer hash algorithm: sha256
- installer hash: `5a16afb6cb673de680078c74706155e1d0242bf23c749dcfde186331e95f0412`

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

- Windows installer: `apps/desktop/dist/matter-0.1.8-win-x64.exe`
- Windows installer sha256: `8413973aae3fbf7f28cc2ad06a0ce9c2b0ba6414c0bbf71fa8b3d37d6cc97560`
- Windows installer bytes: 107904921
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.8-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `5fd3e232b860e01b1d926c0d5f4faa88afc574542a7979873d95dfecf625c3f2`
- Windows installer blockmap bytes: 114928
- Windows installer packaging: nsis-x64
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
