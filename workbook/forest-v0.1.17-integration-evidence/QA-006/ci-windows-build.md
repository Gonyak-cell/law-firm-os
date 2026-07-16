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
Build manifest SHA-256: `a1237c12f27d0f29a76d9d3a0c99ca9353093568d310b9021f0d350b3ff365b4`
Source SHA: `39ed9571b0e841e1a6480e6875fe7b6658f83465`
Source tree: `42bb94f745b329053cc14325ef1251fc7d8475cd`
Source dirty: `false`
Renderer SHA-256: `efc12338c5f6b77e3fb1f88f0ef5285c925144dc346cdbb3ff53ab08d7199599`
Renderer files: `28`
Built at: `2026-07-16T02:34:43.858Z`

## Signing

- signing identity: matter-formal-candidate-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-0.1.17-win-installer-manifest.json.sig`

## Manifest Hash

- manifest hash algorithm: sha256
- manifest hash: `40480c6c36534ec230ce194811e7aebb36c30fa057b886c3827821c7d6062745`
- executable hash: `2444ed1ed7d74bb305e2c7def43122a4633c6c3a412dddeb182f7b5b3641b043`
- unsigned package zip hash: `46d84c94ae5ac5dc3d2a07c0621f4842f934e08bbe423f81825f596e4056df2e`

## Install Smoke

- package directory exists: true
- executable exists: true
- unsigned package zip exists: true
- install smoke result: package_candidate_created
- Windows native install smoke: not_run_on_win32
- formal release local API default disabled: true

## Non-Claims

- production go-live: false
- public release: false
- owner approval: false
- Microsoft Store distribution: false
- Windows Authenticode signing: false
## Installer Package

- Windows installer: `apps/desktop/dist/matter-0.1.17-win-x64.exe`
- Windows installer sha256: `53e2b694e28ba29a068feaa313d862edbeca976912be7204d0e7968b69ab44b3`
- Windows installer bytes: 109466368
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.17-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `03f05e5093edc1278c8600c1ba01d5e8e84f3391b524750fcf1d30b8aa08739e`
- Windows installer blockmap bytes: 116500
- Windows installer packaging: nsis-x64
- Windows renderer runtime assets: verified (5)
- Windows installer build manifest: verified (39ed9571b0e841e1a6480e6875fe7b6658f83465)
- Windows installer renderer sha256: `efc12338c5f6b77e3fb1f88f0ef5285c925144dc346cdbb3ff53ab08d7199599`
- Windows installer formal marker: verified
- Windows native install smoke: not_run_on_win32
- Windows Authenticode signing: false
