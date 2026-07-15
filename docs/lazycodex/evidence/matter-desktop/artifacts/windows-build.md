# Windows Internal Build Receipt

Status: internal_windows_build_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-internal-0.1.16-win-installer-manifest.json`
Windows package directory: `apps/desktop/dist/win/matter-internal-0.1.16-win32-x64`
Windows executable: `apps/desktop/dist/win/matter-internal-0.1.16-win32-x64/matter.exe`
Windows unsigned package zip: `apps/desktop/dist/win/matter-internal-0.1.16-win32-x64-unsigned.zip`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `70f741af2564838b4d7d45789af5b8fa970bfc8f9ff190d987f445295a26f075`
App ID: `com.amic.matter.desktop.internal`
Product name: `matter`
Version: `0.1.16`
Channel: `internal`

## Signing

- signing identity: matter-internal-nonproduction-signing-key
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-internal-0.1.16-win-installer-manifest.json.sig`

## Manifest Hash

- manifest hash algorithm: sha256
- manifest hash: `13c77bed10ceda9cb4f1df0ab0ec631129b66073562c5b07111376766736f1ee`
- executable hash: `b0b6e0cd22a7a135e5230118be27a4c2713a516340f0bbdfb446acb9b2dae31e`
- unsigned package zip hash: `90504b6f14d937ab5acf4debb44500d0dfad78191a5f4b59f97952d5fa45567e`

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
