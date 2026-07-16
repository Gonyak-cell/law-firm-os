# Windows Formal Release Candidate Build Receipt

Status: formal_release_candidate_windows_build_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-0.1.17-win-installer-manifest.json`
Windows package directory: `apps/desktop/dist/win/matter-0.1.17-win32-x64`
Windows executable: `apps/desktop/dist/win/matter-0.1.17-win32-x64/matter.exe`
Windows unsigned package zip: `apps/desktop/dist/win/matter-0.1.17-win32-x64-unsigned.zip`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `70f741af2564838b4d7d45789af5b8fa970bfc8f9ff190d987f445295a26f075`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.17`
Channel: `formal`
Build manifest: `apps/desktop/dist/win/matter-0.1.17-win-build-manifest.json`
Packaged build manifest: `apps/desktop/dist/win/matter-0.1.17-win32-x64/resources/matter-build-manifest.json`
Build manifest SHA-256: `373d72cc41ec8bdba2ded71b6497ee03b2b588eb842007480173a349143ba9f5`
Source SHA: `53854dca55c8b4c0730b57998980755bf141de58`
Source tree: `d99621ca5bf6a93130c26ab7ba08cd4836b234d3`
Source dirty: `false`
Renderer SHA-256: `efc12338c5f6b77e3fb1f88f0ef5285c925144dc346cdbb3ff53ab08d7199599`
Renderer files: `28`
Built at: `2026-07-16T00:44:50.901Z`

## Signing

- signing identity: matter-formal-candidate-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-0.1.17-win-installer-manifest.json.sig`

## Manifest Hash

- manifest hash algorithm: sha256
- manifest hash: `b6b4c22f1fa624e655135acaf2c20a5d100d8ee5fb8ee07b71c80767722646ad`
- executable hash: `2444ed1ed7d74bb305e2c7def43122a4633c6c3a412dddeb182f7b5b3641b043`
- unsigned package zip hash: `b0217be3d00e9dfd23afc2f05aea2be1cc8066af7d5fcbc12f4bdf689a8d699f`

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

- Windows installer: `apps/desktop/dist/matter-0.1.17-win-x64.exe`
- Windows installer sha256: `2f94f240c0013ad119b98202622411bad86959355da333f457561504a7d1190e`
- Windows installer bytes: 109465801
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.17-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `90de98dd94aba938b51f68c2e27e462c8c060203ea36283e73ad4b62b5e98fad`
- Windows installer blockmap bytes: 117015
- Windows installer packaging: nsis-x64
- Windows renderer runtime assets: verified (5)
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
