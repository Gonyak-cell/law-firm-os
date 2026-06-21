# macOS Internal Build Receipt

Status: internal_signed_build_created
Source TUW: MDT-P6-W01-T03
App bundle: `apps/desktop/dist/mac/mater.app`
App ID: `com.amic.mater.desktop.internal`
Product name: `mater`
Version: `0.1.0`

## Signing

- signing identity: ad-hoc internal codesign identity (`-`)
- codesign verify: pass
- notarization state: not_submitted_internal_only

## Install Smoke

- bundle exists: true
- executable exists: true
- install smoke result: pass
- smoke output: `mater desktop internal macOS build 0.1.0`

## Non-Claims

- production go-live: false
- public release: false
- owner approval: false
- App Store distribution: false
- external pilot distribution: false
