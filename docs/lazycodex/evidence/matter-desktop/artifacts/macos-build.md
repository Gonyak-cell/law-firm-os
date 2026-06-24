# macOS Formal Release Candidate Build Receipt

Status: formal_release_candidate_electron_app_bundle_created
Source TUW: MDT-P6-W01-T03
App bundle: `apps/desktop/dist/mac/matter.app`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.0`
Channel: `formal`

## Package Structure

- Electron runtime: `node_modules/electron/dist/Electron.app`
- app icon: `apps/desktop/build/icon.icns`
- packaged app icon: `apps/desktop/dist/mac/matter.app/Contents/Resources/matter.icns`
- packaged app source: `apps/desktop/dist/mac/matter.app/Contents/Resources/app`
- executable: `apps/desktop/dist/mac/matter.app/Contents/MacOS/matter`
- archive: `apps/desktop/dist/mac/matter-0.1.0-macos.zip`
- disk image: `apps/desktop/dist/mac/matter-0.1.0-macos.dmg`

## Signing

- Developer ID signing: applied
- requested signing mode: developer-id
- resolved signing identity: Developer ID Application: Jiwon Suh (LHDXU66NX3)
- Developer ID signature: pass
- codesign verify: pass
- strict codesign verify: pass
- gatekeeper assess: pass
- public distribution approval: not claimed
- notarization requested: true
- notarization credential source: present
- notarization state: submitted_and_accepted_by_notarytool

## Install Smoke

- bundle exists: true
- executable exists: true
- packaged app icon exists: true
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
