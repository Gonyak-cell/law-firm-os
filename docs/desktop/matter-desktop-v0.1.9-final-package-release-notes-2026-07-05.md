# matter Desktop v0.1.9 Final Package Prerelease 2026-07-05

Status: GitHub prerelease candidate
Tag: `matter-desktop-v0.1.9-final-20260705`
Date: 2026-07-05
Channel: `formal-candidate`
App ID: `com.amic.matter.desktop`

This package rolls the v0.1.8 desktop prerelease forward to the latest enterprise remediation and AWS deployment alignment state. It keeps the desktop package, production/staging Lambda deployment, and temporary desktop runtime on the same current release line. It does not claim production go-live, public release, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Packaged Desktop Artifacts

- macOS DMG: `apps/desktop/dist/mac/matter-0.1.9-macos.dmg`
- macOS ZIP: `apps/desktop/dist/mac/matter-0.1.9-macos.zip`
- Windows installer: `apps/desktop/dist/matter-0.1.9-win-x64.exe`
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.9-win-x64.exe.blockmap`
- Windows installer manifest: `apps/desktop/dist/win/matter-0.1.9-win-installer-manifest.json`
- Windows installer manifest signature: `apps/desktop/dist/win/matter-0.1.9-win-installer-manifest.json.sig`
- Release manifest: `apps/desktop/dist/release/matter-desktop-v0.1.9-final-20260705/release-manifest.json`
- Checksums: `apps/desktop/dist/release/matter-desktop-v0.1.9-final-20260705/checksums.sha256`
- Formal receipt: `docs/desktop/matter-desktop-formal-release-receipt.md`

## SHA-256

- macOS DMG: `40e72948ded380874e209c6223579b5b7566dd2bb5e70c474f708328bdc2cee3`
- macOS ZIP: `be87bf7fcd63d9369e41a6b2a2a8093b6900401c58d431df120ae2e8c957dde2`
- Windows installer: `9d854ebd516128b8120a54e6a2e0c4a06066bab70a316a9c112ef9cf99a2e780`
- Windows installer blockmap: `f818e65c3706a37707b7b8c5ab358b7e97a078e5c620013613202f87f4520e75`
- Windows installer manifest: `c7297f14f88430be98cd4dd3910e92a4622a24c116c6184adeeae68d09b01b1f`
- Windows installer manifest signature: `82b2e65bfd0bdb41eada523aa77383f4b28dd581c6be82f8ca30d83b417f86d5`
- Release manifest: `74e7afd8031361239ad9fbab44a3dbfb5efc7b7fbf70ffba2797401cf970d862`
- Checksums: `4cb7df642b3dd33551d1c701809c1647125904d08b17084373605295afe16d81`

## Included Product Work

- v0.1.8 formal-candidate desktop package contents.
- Enterprise audit remediation gates and coverage workbook updates.
- Session-authenticated production smoke flow for current Lambda session requirements.
- AWS SSO role-chain runbook and current Lambda redeploy evidence alignment.
- Desktop package version bump to `0.1.9` for a non-mutating prerelease line.

## Verification

- `MATTER_DESKTOP_GITHUB_RELEASE_TAG=matter-desktop-v0.1.9-final-20260705 npm run matter-desktop:formal-release`: PASS
- `npm --workspace apps/desktop run test:smoke`: 70/70 pass
- `npm --workspace apps/desktop run test:file-bridge`: 17/17 pass plus bridge contract validators PASS
- `npm run matter-desktop:aws-runtime:smoke`: PASS
- macOS Developer ID signing: applied
- macOS notarization: submitted and accepted by notarytool
- macOS Gatekeeper assess: pass
- Windows NSIS installer: generated
- Windows native install smoke: not run on this macOS host
- Windows Authenticode signing: false
- `npm run matter-desktop:formal-release:validate`: PASS, 9 checksum entries verified
- `node scripts/validate-matter-desktop-no-public-release-claim.mjs`: PASS

## Release Boundary

This prerelease does not claim:

- production go-live
- public release
- owner final approval
- provider production writes
- production migration/import execution
- external tax or Hometax issue
- external payment, payroll movement, or disbursement
- external e-sign/send completion
- Windows Authenticode signing
- App Store or Microsoft Store distribution
