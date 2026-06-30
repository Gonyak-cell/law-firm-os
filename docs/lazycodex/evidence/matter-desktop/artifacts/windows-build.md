# Windows Formal Release Candidate Build Receipt

Status: formal_release_candidate_windows_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-0.1.2-win-installer-manifest.json`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `a4ed00e8de3968d5bb6990753cbe97b8cf9a8c67584850a1f257caf4a2c02e93`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.2`
Channel: `formal`

## Signing

- signing identity: matter-formal-candidate-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-0.1.2-win-installer-manifest.json.sig`

## Installer Hash

- installer hash algorithm: sha256
- installer hash: `0a44baf9fe6ed9c2eda94fe61fe28f62abf26f66369fd9f92c8f01ec0ea4b85e`

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

- Windows installer: `apps/desktop/dist/matter-0.1.2-win-x64.exe`
- Windows installer sha256: `2ef2985eb53adeaebace5af6a4848d54c8c05800d8aafa453c34e8dc7cf6eab7`
- Windows installer bytes: 105702122
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.2-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `6a658c1c4f79867d02ec2ed731abeb06d90a61220b0a9c7bfbaf132ff0295286`
- Windows installer blockmap bytes: 112473
- Windows installer packaging: nsis-x64
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
