# macOS Formal Release Candidate Build Receipt

Status: formal_release_candidate_electron_app_bundle_created
Source TUW: MDT-P6-W01-T03
App bundle: `apps/desktop/dist/mac/matter.app`
App ID: `com.amic.matter.desktop`
Product name: `matter`
Version: `0.1.17`
Channel: `formal`
Build manifest: `apps/desktop/dist/mac/matter-0.1.17-macos-build-manifest.json`
Packaged build manifest: `apps/desktop/dist/mac/matter.app/Contents/Resources/matter-build-manifest.json`
Build manifest SHA-256: `6509ade4cc8db6120790b334d1a5b330857d02ec26dba1730d0cd34bbd243fc9`
Source SHA: `39ed9571b0e841e1a6480e6875fe7b6658f83465`
Source tree: `42bb94f745b329053cc14325ef1251fc7d8475cd`
Source dirty: `false`
Renderer SHA-256: `efc12338c5f6b77e3fb1f88f0ef5285c925144dc346cdbb3ff53ab08d7199599`
Renderer files: `28`
Built at: `2026-07-16T02:42:39.352Z`

## Package Structure

- Electron runtime: `node_modules/electron/dist/Electron.app`
- app icon: `apps/desktop/build/icon.icns`
- packaged app icon: `apps/desktop/dist/mac/matter.app/Contents/Resources/matter.icns`
- packaged app source: `apps/desktop/dist/mac/matter.app/Contents/Resources/app`
- executable: `apps/desktop/dist/mac/matter.app/Contents/MacOS/matter`
- archive: `apps/desktop/dist/mac/matter-0.1.17-macos.zip`
- disk image: `apps/desktop/dist/mac/matter-0.1.17-macos.dmg`

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
- DMG codesign verify: pass
- DMG notarization state: submitted_and_accepted_by_notarytool
- DMG stapler validate: pass
- DMG Gatekeeper assess: pass
- DMG image verify: pass

## Install Smoke

- bundle exists: true
- executable exists: true
- packaged app icon exists: true
- packaged app source exists: true
- private HRX contact source excluded: true
- private HRX roster source excluded: true
- private HRX photo source excluded: true
- public HRX professional profile catalog included: false
- formal release marker: true
- web renderer prepare state: rebuilt_from_apps_web
- packaged URL scheme metadata: matter
- ZIP archive exists: true
- DMG image exists: true
- install smoke result: pass
- executable smoke: `bundle_rpath_smoke_pass`

## Non-Claims

- production go-live: false
- public release: false
- owner approval: false
- App Store distribution: false
- external pilot distribution: false
