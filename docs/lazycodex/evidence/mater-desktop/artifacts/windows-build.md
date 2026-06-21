# Windows Internal Build Receipt

Status: internal_windows_build_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/mater-internal-0.1.0-win-installer-manifest.json`
App ID: `com.amic.mater.desktop.internal`
Product name: `mater`
Version: `0.1.0`

## Signing

- signing identity: mater-internal-nonproduction detached signature
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/mater-internal-0.1.0-win-installer-manifest.json.sig`

## Installer Hash

- installer hash algorithm: sha256
- installer hash: `d320cffc7b404782d9ed81b06c972a2d7b307cfc953d6c92a4d0c8e5f76af063`

## Install Smoke

- install smoke result: manifest_smoke_pass
- Windows native install smoke: not_run_on_darwin

## Non-Claims

- production go-live: false
- public release: false
- owner approval: false
- Microsoft Store distribution: false
- Windows Authenticode signing: false
