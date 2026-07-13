# Windows Formal Release Candidate Build Receipt

Status: formal_release_candidate_windows_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-0.1.16-win-installer-manifest.json`
Windows package directory: `apps/desktop/dist/win/matter-0.1.16-win32-x64`
Windows executable: `apps/desktop/dist/win/matter-0.1.16-win32-x64/matter.exe`
Windows unsigned package zip: `apps/desktop/dist/win/matter-0.1.16-win32-x64-unsigned.zip`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `70f741af2564838b4d7d45789af5b8fa970bfc8f9ff190d987f445295a26f075`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.16`
Channel: `formal`

## Signing

- signing identity: matter-formal-candidate-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-0.1.16-win-installer-manifest.json.sig`

## Manifest Hash

- manifest hash algorithm: sha256
- manifest hash: `bc591da658a912e96bce76306687c3aae940dd61c4cecfb328557a8806c43b69`
- executable hash: `b0b6e0cd22a7a135e5230118be27a4c2713a516340f0bbdfb446acb9b2dae31e`
- unsigned package zip hash: `774c0c37ff884f1f67283a144970f29b4a9971245b88a355c7522c0a993acf06`

## Install Smoke

- package directory exists: true
- executable exists: true
- unsigned package zip exists: true
- install smoke result: package_candidate_created
- Windows native install smoke: not_run_on_darwin
- formal release local API default disabled: true

## Non-Claims

- production go-live: false
- public release: false
- owner approval: false
- Microsoft Store distribution: false
- Windows Authenticode signing: false
## Installer Package

- Windows installer: `apps/desktop/dist/matter-0.1.16-win-x64.exe`
- Windows installer sha256: `41a6088ff5e3e0cf65537ea634218e5c61498367ed48056ccbc23c366bc85c4c`
- Windows installer bytes: 109455127
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.16-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `0892d4248a5a146ac0787eea1492ad53d9adf5ec8cc7c0492154eb09f5de5292`
- Windows installer blockmap bytes: 116853
- Windows installer packaging: nsis-x64
- Windows renderer runtime assets: verified (5)
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
