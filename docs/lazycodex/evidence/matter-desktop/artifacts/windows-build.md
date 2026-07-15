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
Build manifest SHA-256: `76fe2585593112456acc4ae529bad78b5da1a4ca4c147fd8b5ede8b0fbddb253`
Source SHA: `a38a63f8bcc0bedae5d038027cb2de7148cd6129`
Source tree: `3da21d6486a0577abb90a084988de3eb6888a189`
Source dirty: `false`
Renderer SHA-256: `f0a043dedfe1be18d711748e3b78d7313cdc1e92c90444a598b998b212485445`
Renderer files: `28`
Built at: `2026-07-15T17:32:20.289Z`

## Signing

- signing identity: matter-internal-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-internal-0.1.17-win-installer-manifest.json.sig`

## Manifest Hash

- manifest hash algorithm: sha256
- manifest hash: `743a6c63806efe073dc5935ba8d55191c868d031cf3331c0c80276c2447ea137`
- executable hash: `2444ed1ed7d74bb305e2c7def43122a4633c6c3a412dddeb182f7b5b3641b043`
- unsigned package zip hash: `b5115154905477ea250da73bc58a2e3b627846151c405da4d16be147189549c0`

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
