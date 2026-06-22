# macOS Internal Build Receipt

Status: internal_electron_app_bundle_created
Source TUW: MDT-P6-W01-T03
App bundle: `apps/desktop/dist/mac/mater.app`
App ID: `com.amic.mater.desktop.internal`
Product name: `mater`
Version: `0.1.0`

## Package Structure

- Electron runtime: `node_modules/electron/dist/Electron.app`
- packaged app source: `apps/desktop/dist/mac/mater.app/Contents/Resources/app`
- executable: `apps/desktop/dist/mac/mater.app/Contents/MacOS/mater`
- archive: `apps/desktop/dist/mac/mater-internal-0.1.0-macos.zip`
- disk image: `apps/desktop/dist/mac/mater-internal-0.1.0-macos.dmg`

## Signing

- signing identity: not applied in this internal packaging step
- codesign verify: not_distribution_ready: /Users/jws/Documents/Codex/Law Firm OS/apps/desktop/dist/mac/mater.app: code has no resources but signature indicates they must be present
- strict distribution verify: not claimed
- notarization state: not_submitted_internal_only

## Install Smoke

- bundle exists: true
- executable exists: true
- packaged app source exists: true
- ZIP archive exists: true
- DMG image exists: true
- install smoke result: pass
- executable smoke: `42.4.1`

## Non-Claims

- production go-live: false
- public release: false
- owner approval: false
- App Store distribution: false
- external pilot distribution: false
