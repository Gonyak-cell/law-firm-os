# Windows Formal Release Candidate Build Receipt

Status: formal_release_candidate_windows_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-0.1.13-win-installer-manifest.json`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `a4ed00e8de3968d5bb6990753cbe97b8cf9a8c67584850a1f257caf4a2c02e93`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.13`
Channel: `formal`

## Signing

- signing identity: matter-formal-candidate-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-0.1.13-win-installer-manifest.json.sig`

## Manifest Hash

- manifest hash algorithm: sha256
- manifest hash: `d368bceadeda3ef1313d8d14fb60b03c523af4eaaa925d8554e0c5fd19b85a56`

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

- Windows installer: `apps/desktop/dist/matter-0.1.13-win-x64.exe`
- Windows installer sha256: `b97c3ae048d9a720ad7fac460aa0f07df17de864a5ad5763a199a0d360bdfbad`
- Windows installer bytes: 108193121
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.13-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `78118a5447a360f4dd75e7abd91a2a1e69069c131769cff05c8be6c1c8cbfac4`
- Windows installer blockmap bytes: 115411
- Windows installer packaging: nsis-x64
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
