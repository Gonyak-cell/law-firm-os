# macOS Formal Release Candidate Build Receipt

Status: formal_release_candidate_electron_app_bundle_created
Source TUW: MDT-P6-W01-T03
App bundle: `apps/desktop/dist/mac/matter.app`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.3`
Channel: `formal`

## Package Structure

- Electron runtime: `node_modules/electron/dist/Electron.app`
- app icon: `apps/desktop/build/icon.icns`
- packaged app icon: `apps/desktop/dist/mac/matter.app/Contents/Resources/matter.icns`
- packaged app source: `apps/desktop/dist/mac/matter.app/Contents/Resources/app`
- executable: `apps/desktop/dist/mac/matter.app/Contents/MacOS/matter`
- archive: `apps/desktop/dist/mac/matter-0.1.3-macos.zip`
- disk image: `apps/desktop/dist/mac/matter-0.1.3-macos.dmg`

## Signing

- Developer ID signing: not_applied_internal_package
- requested signing mode: internal
- resolved signing identity: not_applied_internal_package
- Developer ID signature: not_distribution_ready: Developer ID authority missing; TeamIdentifier=not set
- codesign verify: not_distribution_ready: /Users/jws/Documents/Codex/Law Firm OS/apps/desktop/dist/mac/matter.app: code has no resources but signature indicates they must be present
- strict codesign verify: not_distribution_ready: /Users/jws/Documents/Codex/Law Firm OS/apps/desktop/dist/mac/matter.app: code has no resources but signature indicates they must be present
- gatekeeper assess: not_distribution_ready: /Users/jws/Documents/Codex/Law Firm OS/apps/desktop/dist/mac/matter.app: code has no resources but signature indicates they must be present
- public distribution approval: not claimed
- notarization requested: false
- notarization credential source: missing
- notarization state: not_submitted_internal_only

## Install Smoke

- bundle exists: true
- executable exists: true
- packaged app icon exists: true
- packaged app source exists: true
- web renderer prepare state: rebuilt_from_apps_web
- packaged URL scheme metadata: matter
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
