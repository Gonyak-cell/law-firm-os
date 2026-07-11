# Windows Formal Release Candidate Build Receipt

Status: formal_release_candidate_windows_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-0.1.11-win-installer-manifest.json`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `a4ed00e8de3968d5bb6990753cbe97b8cf9a8c67584850a1f257caf4a2c02e93`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.11`
Channel: `formal`

## Signing

- signing identity: matter-formal-candidate-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-0.1.11-win-installer-manifest.json.sig`

## Installer Hash

- installer hash algorithm: sha256
- installer hash: `63c63f4ff11b71d5c46f43c2c2148aec1adfe838fcbebdd86eacf707cd026a43`

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

- Windows installer: `apps/desktop/dist/matter-0.1.11-win-x64.exe`
- Windows installer sha256: `fd771c02038fccc1debbba0c7b3a8f7a3074f98c67892b1b36cfbef9642cef20`
- Windows installer bytes: 108188559
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.11-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `c805376a864305dcd7051296fbdecbbdfc8a5b20d10dce2ffc357de6f36283f3`
- Windows installer blockmap bytes: 115497
- Windows installer packaging: nsis-x64
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
