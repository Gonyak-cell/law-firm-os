# Windows Internal Build Receipt

Status: internal_windows_build_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-internal-0.1.0-win-installer-manifest.json`
App ID: `com.amic.matter.desktop.internal`
Product name: `matter`
Version: `0.1.0`

## Signing

- signing identity: matter-internal-nonproduction detached signature
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-internal-0.1.0-win-installer-manifest.json.sig`

## Installer Hash

- installer hash algorithm: sha256
- installer hash: `904da885e4bf6467c4bf4c6f4badf1f2f6b0dca3cfcebf2c9c35424a901c3aaf`

## Install Smoke

- install smoke result: manifest_smoke_pass
- Windows native install smoke: not_run_on_darwin

## Non-Claims

- production go-live: false
- public release: false
- owner approval: false
- Microsoft Store distribution: false
- Windows Authenticode signing: false
