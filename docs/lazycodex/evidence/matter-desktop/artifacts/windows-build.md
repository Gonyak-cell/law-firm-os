# Windows Formal Release Candidate Build Receipt

Status: formal_release_candidate_windows_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-0.1.15-win-installer-manifest.json`
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
- manifest hash: `5761a117e91f029773db9af224060940f921871639bfbf02b6b66e7af22c57f8`

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

- Windows installer: `apps/desktop/dist/matter-0.1.15-win-x64.exe`
- Windows installer sha256: `0acd3b4b302b4e36dd9be6d4636bfcf73c86ad4581c792b7b73098306e7789ac`
- Windows installer bytes: 109426741
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.15-win-x64.exe.blockmap`
- Windows installer blockmap sha256: `7535e6fe03b471c167cbad4daddeb84c04428019ca4a71763951f9db978192c9`
- Windows installer blockmap bytes: 116869
- Windows installer packaging: nsis-x64
- Windows native install smoke: not_run_on_darwin
- Windows Authenticode signing: false
