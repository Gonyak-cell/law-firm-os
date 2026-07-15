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
Build manifest SHA-256: `134e2a4478f74c965cab2836ee4760a276f1c656938a9653476587f1b35ea548`
Source SHA: `298bbb2b577ba07980b7ec1671c677902b546c85`
Source tree: `f0b88838d5ed300069e10ef4be811729e7098c1b`
Source dirty: `false`
Renderer SHA-256: `f0a043dedfe1be18d711748e3b78d7313cdc1e92c90444a598b998b212485445`
Renderer files: `28`
Built at: `2026-07-15T18:06:36.663Z`

## Signing

- signing identity: matter-internal-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-internal-0.1.17-win-installer-manifest.json.sig`

## Manifest Hash

- manifest hash algorithm: sha256
- manifest hash: `060aba8ea655d1460af04a87637d4dd40ffdf5268b47c12c547873dde3941167`
- executable hash: `2444ed1ed7d74bb305e2c7def43122a4633c6c3a412dddeb182f7b5b3641b043`
- unsigned package zip hash: `5517de97f84c47623ced6a57b69ca3d5538db8d76ba2ab5e7f27fa68661b9b99`

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
