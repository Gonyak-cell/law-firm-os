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
Build manifest SHA-256: `772a89f73894fb48578095964e46b5f98890cf298b20893cca563ba385820c93`
Source SHA: `39ed9571b0e841e1a6480e6875fe7b6658f83465`
Source tree: `42bb94f745b329053cc14325ef1251fc7d8475cd`
Source dirty: `false`
Renderer SHA-256: `efc12338c5f6b77e3fb1f88f0ef5285c925144dc346cdbb3ff53ab08d7199599`
Renderer files: `28`
Built at: `2026-07-16T02:47:31.726Z`

## Signing

- signing identity: matter-formal-candidate-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-0.1.17-win-installer-manifest.json.sig`

## Manifest Hash

- manifest hash algorithm: sha256
- manifest hash: `3b42fb755bd32d4bb7a6ccb53e8b00beccbfaa04b4bde620eb0bb904cac391ea`
- executable hash: `2444ed1ed7d74bb305e2c7def43122a4633c6c3a412dddeb182f7b5b3641b043`
- unsigned package zip hash: `3d7564934fcb0d91e89b41a34cea671f8d57fbcf11c41ac881086a264cb5baab`

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
- Windows installer sha256: `cab98371cd6acbec6adce59b27aadc231eaeb88ea736b6c7f9cc01aab3972e61`
- Windows installer bytes: 109466379
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.17-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `4b5092232b35c435208f5f458af725803dd72f6bb1ff82d44743fc206e0f1a5e`
- Windows installer blockmap bytes: 116974
- Windows installer packaging: nsis-x64
- Windows renderer runtime assets: verified (5)
- Windows installer build manifest: verified (39ed9571b0e841e1a6480e6875fe7b6658f83465)
- Windows installer renderer sha256: `efc12338c5f6b77e3fb1f88f0ef5285c925144dc346cdbb3ff53ab08d7199599`
- Windows installer formal marker: verified
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
## Installer Package

- Windows product name: `AMIC OS`
- Windows artifact prefix: `AMIC-OS-internal`
- Windows executable name: `matter.exe`
- Windows installer: `apps/desktop/dist/AMIC-OS-internal-0.1.30-win-x64.exe`
- Windows installer sha256: `ac38468ac00fe7dff46226293ed1a0e81d8ac2cdf539776910d46c4ebb796f0e`
- Windows installer bytes: 109675445
- Windows installer blockmap: `apps/desktop/dist/AMIC-OS-internal-0.1.30-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `110fd66f8fddac129085a41b0d1426cbbb54cceacb511a52188c5b5e53213933`
- Windows installer blockmap bytes: 116550
- Windows installer packaging: nsis-x64
- Windows renderer runtime assets: verified (5)
- Windows installer build manifest: verified (eeaf0f900781a29631c2ecf4cf44ec07bbcaba44)
- Windows installer renderer sha256: `4416b1c26c74d68ba2a6fcb83b821f8b8ca96aa13019f6148fd15c22994bfc8c`
- Windows Classic Outlook adapter: bundled
- Windows Classic Outlook adapter sha256: `98b5f6e6d16acfb59886a495c58f99589a6c88251f18b385b530b30f05d49e12`
- Windows Classic Outlook user registration: NSIS HKCU 32-bit and 64-bit registry views
- Windows installer formal marker: not_applicable
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
- Windows Authenticode timestamp verified: false
- Windows Authenticode signer certificate SHA-1: `not_applicable`
- Windows Authenticode signer subject: `not_applicable`
- Windows Authenticode signer code-signing EKU verified: false
- Windows Authenticode timestamp EKU verified: false
## Installer Package

- Windows product name: `AMIC OS`
- Windows artifact prefix: `AMIC-OS-internal`
- Windows executable name: `matter.exe`
- Windows installer: `apps/desktop/dist/AMIC-OS-internal-0.1.30-win-x64.exe`
- Windows installer sha256: `729c9c51e3592f484c928cbbd7a87a2e8633f7c464bf0d6f694022c7af9132bd`
- Windows installer bytes: 109677026
- Windows installer blockmap: `apps/desktop/dist/AMIC-OS-internal-0.1.30-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `8042e689048e33bac4bb6c15b2e97e1dad63319da70f47761ccfc62bc8af2440`
- Windows installer blockmap bytes: 116588
- Windows installer packaging: nsis-x64
- Windows renderer runtime assets: verified (5)
- Windows installer build manifest: verified (eeaf0f900781a29631c2ecf4cf44ec07bbcaba44)
- Windows installer renderer sha256: `6e1d7968fb8cfc2b34722ea9631996c3994d5f30e32f00b46ffe3d0ddd587771`
- Windows Classic Outlook adapter: bundled
- Windows Classic Outlook adapter sha256: `98b5f6e6d16acfb59886a495c58f99589a6c88251f18b385b530b30f05d49e12`
- Windows Classic Outlook user registration: NSIS HKCU 32-bit and 64-bit registry views
- Windows installer formal marker: not_applicable
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
- Windows Authenticode timestamp verified: false
- Windows Authenticode signer certificate SHA-1: `not_applicable`
- Windows Authenticode signer subject: `not_applicable`
- Windows Authenticode signer code-signing EKU verified: false
- Windows Authenticode timestamp EKU verified: false
