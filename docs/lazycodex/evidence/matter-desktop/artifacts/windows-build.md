# Windows Internal Build Receipt

Status: internal_windows_build_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-internal-0.1.17-win-installer-manifest.json`
Windows package directory: `apps/desktop/dist/win/matter-internal-0.1.17-win32-x64`
Windows executable: `apps/desktop/dist/win/matter-internal-0.1.17-win32-x64/matter.exe`
Windows unsigned package zip: `apps/desktop/dist/win/matter-internal-0.1.17-win32-x64-unsigned.zip`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `70f741af2564838b4d7d45789af5b8fa970bfc8f9ff190d987f445295a26f075`
App ID: `com.amic.matter.desktop.internal`
Product name: `matter`
Version: `0.1.17`
Channel: `internal`
Build manifest: `apps/desktop/dist/win/matter-internal-0.1.17-win-build-manifest.json`
Packaged build manifest: `apps/desktop/dist/win/matter-internal-0.1.17-win32-x64/resources/matter-build-manifest.json`
Build manifest SHA-256: `69416a788cf41765a47447bb96c3601340c1e929de8789d83bc3c6d6cbc6c589`
Source SHA: `e19a17dd48edf131cada90cf0b2c9b6891002d8d`
Source tree: `d954dafbf67ba9dca47fd44effbc6109a4e056af`
Source dirty: `false`
Renderer SHA-256: `efc12338c5f6b77e3fb1f88f0ef5285c925144dc346cdbb3ff53ab08d7199599`
Renderer files: `28`
Built at: `2026-07-15T23:31:52.179Z`

## Signing

- signing identity: matter-internal-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-internal-0.1.17-win-installer-manifest.json.sig`

## Manifest Hash

- manifest hash algorithm: sha256
- manifest hash: `666cbf559582ead36ae8e7c6546fb7b6c8ffc6eefc767ab1cd3faa4c18ee0a29`
- executable hash: `2444ed1ed7d74bb305e2c7def43122a4633c6c3a412dddeb182f7b5b3641b043`
- unsigned package zip hash: `bc5756310b67cf8c99636dbfb02562b2771fe13204f4bf72783869988d66b684`

## Install Smoke

- package directory exists: true
- executable exists: true
- unsigned package zip exists: true
- install smoke result: package_candidate_created
- Windows native install smoke: not_run_on_darwin
- formal release local API default disabled: false

## Non-Claims

- production go-live: false
- public release: false
- owner approval: false
- Microsoft Store distribution: false
- Windows Authenticode signing: false
