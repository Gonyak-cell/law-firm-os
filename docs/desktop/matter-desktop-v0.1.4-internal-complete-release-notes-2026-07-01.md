# matter Desktop v0.1.4 Internal Complete Release Candidate

Tag: `matter-desktop-v0.1.4`
Date: 2026-07-01
Channel: `formal-candidate`
App ID: `com.amic.matter.desktop`

This release candidate is complete for internal desktop installation and QA. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, macOS notarization, or Windows Authenticode signing.

## Included Install Packages

- macOS DMG: `apps/desktop/dist/mac/matter-0.1.4-macos.dmg`
- macOS ZIP: `apps/desktop/dist/mac/matter-0.1.4-macos.zip`
- Windows installer: `apps/desktop/dist/matter-0.1.4-win-x64.exe`
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.4-win-x64.exe.blockmap`
- Windows installer manifest: `apps/desktop/dist/win/matter-0.1.4-win-installer-manifest.json`
- Windows installer manifest signature: `apps/desktop/dist/win/matter-0.1.4-win-installer-manifest.json.sig`
- Release manifest: `apps/desktop/dist/release/matter-desktop-v0.1.4/release-manifest.json`
- Checksums: `apps/desktop/dist/release/matter-desktop-v0.1.4/checksums.sha256`

## SHA-256

- macOS DMG: `96df9335ede70ca2325e711deba8f0efaa829bcdce229c75003066a029c90eba`
- macOS ZIP: `6045b02caf8338da1a24f3994fd4892a287cfebe1f518a675e67d4b92a2919c1`
- Windows installer: `ffb245a9a2f2ca6dbc71632e735f41a41da56ad2ff3e8b7a6b9d587a46362727`
- Windows installer blockmap: `787b534899954e36f41738be0ec0ee7645c821e6385acba529614a3bcbaaedcb`
- Windows installer manifest: `b0a19511ca529b27d03c14d56c9fc3045d43642a276f772c152c4193204db1ec`
- Windows installer manifest signature: `b93335666482ca48ec2e8cd1ebe316b42c2ca0623b09ebcdd4c3271a6cf5cf0d`
- Release manifest: `972c6cf017b3f3177af1dc66dbda55efe9906508d4a15e9972504cf99892164c`
- Checksums file: `104c1bfd6b2de17f4f46356bbee40918bfcf4922658644026e4cbb4b5b45a407`

## Verification

- `npm --workspace apps/web run build`: pass
- targeted API, desktop, master-data, matter, and package tests: `182/182 pass`
- macOS package build: pass, install smoke pass
- Windows manifest build: pass
- Windows NSIS installer build: pass
- release manifest/checksum verification: pass
- packaged macOS app launch and local API smoke: pass
- no-public-release claim scan: pass

## Runtime Notes

- Client and Matter seeds include the 2026-07-01 customer-name correction pass.
- Current app data exposes 102 current AMIC client rows and 127 generated Matter Code rows.
- Corrected examples include `ATU Partners/DEAL/영화 HOPE 투자`, `B&M Holdings/DEAL/TAKE Foundation`, `바이포엠스튜디오/DEAL/K-PLUS`, `오윤록 외 2명/DEAL/Titan`, and `귀한사람들/LIT/민사사건`.
- Removed or absorbed client labels no longer appear as client names: `고기깡패`, `고구려푸드`, `부산광역시`, `아론`, `ATU`, `K-PLUS`, `TAKE Foundation`, `Titan`, and `오윤록 외 1명`.

## External Distribution Boundary

- macOS Developer ID signing: not applied
- macOS notarization: not submitted
- Windows Authenticode signing: false
- Windows native installer smoke: not run on this macOS host
- `validate-matter-desktop-formal-release-bundle`: blocked on Developer ID signing expectation
- Public/external release: false
