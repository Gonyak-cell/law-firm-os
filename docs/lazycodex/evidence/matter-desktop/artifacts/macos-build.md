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
Build manifest SHA-256: `3bda631f71cbf10d2bfdfd4a67697b2b06e3fffd2941938f75061e8eee8d46ae`
Source SHA: `53854dca55c8b4c0730b57998980755bf141de58`
Source tree: `d99621ca5bf6a93130c26ab7ba08cd4836b234d3`
Source dirty: `false`
Renderer SHA-256: `efc12338c5f6b77e3fb1f88f0ef5285c925144dc346cdbb3ff53ab08d7199599`
Renderer files: `28`
Built at: `2026-07-16T00:36:14.959Z`

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
