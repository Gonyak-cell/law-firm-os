# macOS Internal Build Receipt

Status: internal_electron_app_bundle_created
Source TUW: MDT-P6-W01-T03
App bundle: `apps/desktop/dist/mac/matter.app`
App ID: `com.amic.matter.desktop.internal`
Product name: `matter`
Version: `0.1.17`
Channel: `internal`
Build manifest: `apps/desktop/dist/mac/matter-internal-0.1.17-macos-build-manifest.json`
Packaged build manifest: `apps/desktop/dist/mac/matter.app/Contents/Resources/matter-build-manifest.json`
Build manifest SHA-256: `a038b3d12a82ea742484dda9feed91df227633028040eb1f72953b9b63efa4b3`
Source SHA: `298bbb2b577ba07980b7ec1671c677902b546c85`
Source tree: `f0b88838d5ed300069e10ef4be811729e7098c1b`
Source dirty: `false`
Renderer SHA-256: `f0a043dedfe1be18d711748e3b78d7313cdc1e92c90444a598b998b212485445`
Renderer files: `28`
Built at: `2026-07-15T18:05:34.212Z`

## Package Structure

- Electron runtime: `node_modules/electron/dist/Electron.app`
- app icon: `apps/desktop/build/icon.icns`
- packaged app icon: `apps/desktop/dist/mac/matter.app/Contents/Resources/matter.icns`
- packaged app source: `apps/desktop/dist/mac/matter.app/Contents/Resources/app`
- executable: `apps/desktop/dist/mac/matter.app/Contents/MacOS/matter`
- archive: `apps/desktop/dist/mac/matter-internal-0.1.17-macos.zip`
- disk image: `apps/desktop/dist/mac/matter-internal-0.1.17-macos.dmg`

## Signing

- Developer ID signing: not_applied_internal_package
- requested signing mode: internal
- resolved signing identity: not_applied_internal_package
- Developer ID signature: not_distribution_ready: Developer ID authority missing; TeamIdentifier=not set
- codesign verify: not_distribution_ready: /private/tmp/lawos-pv-parity-298bbb2b/apps/desktop/dist/mac/matter.app: code has no resources but signature indicates they must be present
- strict codesign verify: not_distribution_ready: /private/tmp/lawos-pv-parity-298bbb2b/apps/desktop/dist/mac/matter.app: code has no resources but signature indicates they must be present
- gatekeeper assess: not_distribution_ready: /private/tmp/lawos-pv-parity-298bbb2b/apps/desktop/dist/mac/matter.app: code has no resources but signature indicates they must be present
- public distribution approval: not claimed
- notarization requested: false
- notarization credential source: missing
- notarization state: not_submitted_internal_only
- DMG codesign verify: not_applied_internal_package
- DMG notarization state: not_submitted_internal_only
- DMG stapler validate: not_submitted_internal_only
- DMG Gatekeeper assess: not_distribution_ready: /private/tmp/lawos-pv-parity-298bbb2b/apps/desktop/dist/mac/matter-internal-0.1.17-macos.dmg: rejected
- DMG image verify: pass

## Install Smoke

- bundle exists: true
- executable exists: true
- packaged app icon exists: true
- packaged app source exists: true
- private HRX contact source excluded: true
- private HRX roster source excluded: false
- private HRX photo source excluded: false
- public HRX professional profile catalog included: true
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
