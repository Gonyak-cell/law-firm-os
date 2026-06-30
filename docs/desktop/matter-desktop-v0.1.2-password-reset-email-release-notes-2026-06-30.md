# matter Desktop v0.1.2 Password Reset Email Prerelease 2026-06-30

Status: GitHub prerelease candidate
Tag: `matter-desktop-v0.1.2`
Branch: `codex/lcx-vltui-owner-approval-intake`

## Scope

This prerelease packages the current Matter desktop app after the password setup email delivery update.

Included changes:

- password setup email delivery now uses SES Raw MIME for HTML plus inline image support
- the password setup email header includes the Matter app logo image as `cid:matter-app-logo`
- the password setup email sender display name is `Matter Desktop App Services`
- the desktop app/package version is `0.1.2`

## Packaged Desktop Artifacts

- `apps/desktop/dist/mac/matter-0.1.2-macos.dmg`
- `apps/desktop/dist/mac/matter-0.1.2-macos.zip`
- `apps/desktop/dist/matter-0.1.2-win-x64.exe`
- `apps/desktop/dist/matter-0.1.2-win-x64.exe.blockmap`
- `apps/desktop/dist/win/matter-0.1.2-win-installer-manifest.json`
- `apps/desktop/dist/win/matter-0.1.2-win-installer-manifest.json.sig`
- `apps/desktop/dist/release/matter-desktop-v0.1.2/release-manifest.json`
- `apps/desktop/dist/release/matter-desktop-v0.1.2/checksums.sha256`
- `docs/desktop/matter-desktop-formal-release-receipt.md`

## Package Checksums

- macOS DMG: `eceeba7a2bbc5431d7013709dc571523348d60dc3d9d9cdea3421d81aeb69d3f`
- macOS ZIP: `a3fce5c99f36566f57746b1bb172a8107e05f24c10b5deaa7c760069168535cf`
- Windows installer: `2ef2985eb53adeaebace5af6a4848d54c8c05800d8aafa453c34e8dc7cf6eab7`
- Windows installer blockmap: `6a658c1c4f79867d02ec2ed731abeb06d90a61220b0a9c7bfbaf132ff0295286`

## Validation

- `npm run matter-desktop:formal-release`: PASS
- `npm run matter-desktop:formal-release:validate`: PASS
- `node scripts/validate-matter-desktop-no-public-release-claim.mjs`: PASS
- `node --test apps/api/test/matter-temp-desktop-runtime-lambda.test.js`: PASS

## Release Boundary

This prerelease does not claim:

- production go-live
- final public/go-live approval
- provider production writes
- production Vault writes
- real migration/import execution
- external pilot distribution
- Windows Authenticode signing
- Windows native install smoke
- App Store or Microsoft Store distribution
