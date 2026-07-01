# matter Desktop v0.1.3 Internal Complete Release Candidate

Tag: `matter-desktop-v0.1.3`
Date: 2026-07-01
Channel: `formal-candidate`
App ID: `com.amic.matter.desktop`

This release candidate is complete for internal desktop installation and QA. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, macOS notarization, or Windows Authenticode signing.

## Included Install Packages

- macOS DMG: `apps/desktop/dist/mac/matter-0.1.3-macos.dmg`
- macOS ZIP: `apps/desktop/dist/mac/matter-0.1.3-macos.zip`
- Windows installer: `apps/desktop/dist/matter-0.1.3-win-x64.exe`
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.3-win-x64.exe.blockmap`
- Windows installer manifest: `apps/desktop/dist/win/matter-0.1.3-win-installer-manifest.json`
- Windows installer manifest signature: `apps/desktop/dist/win/matter-0.1.3-win-installer-manifest.json.sig`
- Release manifest: `apps/desktop/dist/release/matter-desktop-v0.1.3/release-manifest.json`
- Checksums: `apps/desktop/dist/release/matter-desktop-v0.1.3/checksums.sha256`

## SHA-256

- macOS DMG: `f8617b10c5b8bc195b4cfef4ec756dcdbdc7be0951fba821d4943d15a1d026b2`
- macOS ZIP: `59a7f692369081f3d79478078cdf1ccc740e1a02cf34ebd5457c9fc04e053001`
- Windows installer: `aab707905bce485f0bf181c7893cc8e683d2c6a8c72ab57511229e8abd9a7f98`
- Windows installer blockmap: `b2bcd78254327771c2954c6da62784b314cf8c4e1b740dc526f81e7748d49639`
- Windows installer manifest: `28cd62f94a6d3f715684e0b3eb8f14217fe0212be655b2b6cbac2729372663e0`
- Windows installer manifest signature: `4ec8e5b1e6e55a178ac351ad9a9cab4d5dd0d4672276b06ae76e66d7ccdc54f9`
- Release manifest: `c51f55063f62f9ca9f7abda5f251da03b0067a2332c0c4c7e008a1074896a8d8`
- Checksums file: `1aa188524127d81c8ae559e7b3d4be9632dcf67b251e8ef96c77fe00b2fcd043`

## Verification

- `npm --workspace apps/web run build`: pass
- targeted API, desktop, master-data, matter, and package tests: `201/201 pass`
- macOS package build: pass, install smoke pass
- Windows manifest build: pass
- Windows NSIS installer build: pass
- release manifest/checksum verification: pass
- packaged macOS app launch and local API smoke: pass
- no-public-release claim scan: pass

## Runtime Notes

- Client and Matter seeds include the current AMIC-derived data cleanup.
- ATU matters are split into PEF setup and individual investment project rows, including `ATU/DEAL/영화 HOPE 투자`.
- Cleaned Client/Matter names include `귀한사람들`, `더드림병원`, and `코멕스`; the removed phrases no longer appear in app-facing Client/Matter API responses.

## External Distribution Boundary

- macOS Developer ID signing: not applied
- macOS notarization: not submitted
- Windows Authenticode signing: false
- Windows native installer smoke: not run on this macOS host
- Public/external release: false
