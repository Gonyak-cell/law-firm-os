# Windows Formal Release Candidate Build Receipt

Status: formal_release_candidate_windows_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-0.1.12-win-installer-manifest.json`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `a4ed00e8de3968d5bb6990753cbe97b8cf9a8c67584850a1f257caf4a2c02e93`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.12`
Channel: `formal`

## Signing

- signing identity: matter-formal-candidate-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-0.1.12-win-installer-manifest.json.sig`

## Manifest Hash

- manifest hash algorithm: sha256
- manifest hash: `aa9efa8fc568b7bbfd4beb8c575e9e3c09eaeb8642d18b25c34be22fd5bbc7ba`

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

- Windows installer: `apps/desktop/dist/matter-0.1.12-win-x64.exe`
- Windows installer sha256: `f479f66b944cc8026317402ca907a93e57195f962189bac88d4638cd57c5b3a1`
- Windows installer bytes: 108189485
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.12-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `0a4a0aeff78d24a752bc579c662fbc829f8815f9e155df83edfd77e30715e79b`
- Windows installer blockmap bytes: 115515
- Windows installer packaging: nsis-x64
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
