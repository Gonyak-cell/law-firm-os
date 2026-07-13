# Windows Formal Release Candidate Build Receipt

Status: formal_release_candidate_windows_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-0.1.15-win-installer-manifest.json`
Windows package directory: `apps/desktop/dist/win/matter-0.1.15-win32-x64`
Windows executable: `apps/desktop/dist/win/matter-0.1.15-win32-x64/matter.exe`
Windows unsigned package zip: `apps/desktop/dist/win/matter-0.1.15-win32-x64-unsigned.zip`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `a4ed00e8de3968d5bb6990753cbe97b8cf9a8c67584850a1f257caf4a2c02e93`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.15`
Channel: `formal`

## Signing

- signing identity: matter-formal-candidate-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-0.1.15-win-installer-manifest.json.sig`

## Manifest Hash

- manifest hash algorithm: sha256
- manifest hash: `d499ef85344e60bb08863de77d56a4f58bfea2a262e30184fd4d2d3f34b0b118`
- executable hash: `9b17c7d0347573defa11a5d5039d0fd22049f161e37a8bd73447337d9a39ef2c`
- unsigned package zip hash: `25ab43c1619c28922712d1c66d09a2a48af53e809507783ae7d8c0cbb76949a1`

## Install Smoke

- package directory exists: true
- executable exists: true
- unsigned package zip exists: true
- install smoke result: package_candidate_created
- Windows native install smoke: not_run_on_darwin

## Non-Claims

- production go-live: false
- public release: false
- owner approval: false
- Microsoft Store distribution: false
- Windows Authenticode signing: false
## Installer Package

- Windows installer: `apps/desktop/dist/matter-0.1.15-win-x64.exe`
- Windows installer sha256: `2815e436742794d22f261f074c6714ad5c58011f4577bce28d910eb39cfeb835`
- Windows installer bytes: 109469983
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.15-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `f43ca14c3ede8106a01bb8217fa2ddc7e17279c37cef6f10393b4bc9d98757d1`
- Windows installer blockmap bytes: 117387
- Windows installer packaging: nsis-x64
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
