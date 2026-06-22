# Windows Internal Build Receipt

Status: internal_windows_build_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: `apps/desktop/dist/win/matter-internal-0.1.0-win-installer-manifest.json`
App icon: `apps/desktop/build/icon.ico`
App icon sha256: `77765a6bcb09d25037e1a012124fec2c9a98533f6bffc3653460dca4e948fa34`
App ID: `com.amic.matter.desktop.internal`
Product name: `matter`
Version: `0.1.0`

## Signing

- signing identity: matter-internal-nonproduction detached signature
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: `apps/desktop/dist/win/matter-internal-0.1.0-win-installer-manifest.json.sig`

## Installer Hash

- installer hash algorithm: sha256
- installer hash: `dc2b6196e15a0d0abde170467a27731686adc6436d6902de1739e14bf95aec02`

## Install Smoke

- install smoke result: manifest_smoke_pass
- Windows native install smoke: not_run_on_darwin

## Non-Claims

- production go-live: false
- public release: false
- owner approval: false
- Microsoft Store distribution: false
- Windows Authenticode signing: false
