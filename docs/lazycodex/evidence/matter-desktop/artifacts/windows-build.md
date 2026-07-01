# Windows Formal Release Candidate Build Receipt

Status: formal_release_candidate_windows_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-0.1.6-win-installer-manifest.json`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `a4ed00e8de3968d5bb6990753cbe97b8cf9a8c67584850a1f257caf4a2c02e93`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.6`
Channel: `formal`

## Signing

- signing identity: matter-formal-candidate-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-0.1.6-win-installer-manifest.json.sig`

## Installer Hash

- installer hash algorithm: sha256
- installer hash: `358dbb4db79ee544c507453e525e36034ffdccf72b7f536c3c996ad31dbb8175`

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

- Windows installer: `apps/desktop/dist/matter-0.1.6-win-x64.exe`
- Windows installer sha256: `36da5c1f32c2e533dc3359c5eaec610d7d7086749abb4ca9761630177aa79dac`
- Windows installer bytes: 105707208
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.6-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `d73aa8e00c6589c1ba95b280c009bd6643e2093b70dd9acfd9eb88f5a88ef9be`
- Windows installer blockmap bytes: 112737
- Windows installer packaging: nsis-x64
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
