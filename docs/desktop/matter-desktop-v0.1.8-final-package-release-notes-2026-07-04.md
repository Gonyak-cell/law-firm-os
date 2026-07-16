# matter Desktop v0.1.8 Final Package Prerelease 2026-07-04

Status: GitHub prerelease candidate
Tag: `matter-desktop-v0.1.8-final-20260704`
Date: 2026-07-04
Channel: `formal-candidate`
App ID: `com.amic.matter.desktop`

This package rolls the completed Forest UI, frontend Stage 1-5 cleanup, and Lazyweb feature integration Stage 6-15 into the desktop installer set. It does not claim production go-live, public release, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Packaged Desktop Artifacts

- macOS DMG: `apps/desktop/dist/mac/matter-0.1.8-macos.dmg`
- macOS ZIP: `apps/desktop/dist/mac/matter-0.1.8-macos.zip`
- Windows installer: `apps/desktop/dist/matter-0.1.8-win-x64.exe`
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.8-win-x64.exe.blockmap`
- Windows installer manifest: `apps/desktop/dist/win/matter-0.1.8-win-installer-manifest.json`
- Windows installer manifest signature: `apps/desktop/dist/win/matter-0.1.8-win-installer-manifest.json.sig`
- Release manifest: `apps/desktop/dist/release/matter-desktop-v0.1.8-final-20260704/release-manifest.json`
- Checksums: `apps/desktop/dist/release/matter-desktop-v0.1.8-final-20260704/checksums.sha256`
- Formal receipt: `docs/desktop/matter-desktop-formal-release-receipt.md`

## SHA-256

- macOS DMG: `7cdd9578efe44617f8de2315a1a12bd0591a0a60433f78f9b50299902492df6d`
- macOS ZIP: `373c4b9d63608d7430d3d5b3359894cb1e2b346e9def8692d734d07ec256e2a8`
- Windows installer: `8413973aae3fbf7f28cc2ad06a0ce9c2b0ba6414c0bbf71fa8b3d37d6cc97560`
- Windows installer blockmap: `5fd3e232b860e01b1d926c0d5f4faa88afc574542a7979873d95dfecf625c3f2`
- Windows installer manifest: `5a16afb6cb673de680078c74706155e1d0242bf23c749dcfde186331e95f0412`
- Windows installer manifest signature: `cbb3717f276761a249c1cb9fc4bded03d896d9c82173955a81cd1e9ec045ec7c`

## Included Product Work

- Forest visual system final package, including macOS and Windows packaged renderer.
- Frontend Stage 1-5 cleanup and committed route polish.
- Lazyweb feature integration Stage 6-15: adverse parties, conflict review, engagement approval, matter opening, leave approval, admin security operations, employment contracts, recruiting conversion, compensation masked references, and Matter charge actions.

## Verification

- `MATTER_DESKTOP_GITHUB_RELEASE_TAG=matter-desktop-v0.1.8-final-20260704 npm run matter-desktop:formal-release`: PASS
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
