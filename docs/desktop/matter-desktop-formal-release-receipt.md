# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub prerelease candidate. Publication as a prerelease does not claim public stable release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.16-20260713-137fa156c` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.16-20260713-137fa156c/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.16-20260713-137fa156c/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.16-20260713-137fa156c` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.16-macos.zip` |
| macOS ZIP SHA-256 | `28730d758427dae15bd4953b3c38746dd1d9e59bcd653c57d7044ce6347762e8` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.16-macos.dmg` |
| macOS DMG SHA-256 | `756afaae92ad70f83cd8a8e066a9143446b13eb6c99954f2939770a89fbd41f4` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.16-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `bc591da658a912e96bce76306687c3aae940dd61c4cecfb328557a8806c43b69` |
| Windows unsigned package ZIP | `apps/desktop/dist/win/matter-0.1.16-win32-x64-unsigned.zip` |
| Windows unsigned package ZIP SHA-256 | `774c0c37ff884f1f67283a144970f29b4a9971245b88a355c7522c0a993acf06` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.16-win-x64.exe` |
| Windows formal installer SHA-256 | `41a6088ff5e3e0cf65537ea634218e5c61498367ed48056ccbc23c366bc85c4c` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.16-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `0892d4248a5a146ac0787eea1492ad53d9adf5ec8cc7c0492154eb09f5de5292` |

## macOS Signing and Notarization

| Field | Value |
| --- | --- |
| Developer ID signing | applied |
| Requested signing mode | `developer-id` |
| Resolved signing identity | `Developer ID Application: Jiwon Suh (LHDXU66NX3)` |
| codesign verify | pass |
| strict codesign verify | pass |
| gatekeeper assess | pass |
| public distribution approval | not claimed |
| notarization requested | true |
| notarization credential source | present |
| notarization state | submitted_and_accepted_by_notarytool |
| DMG codesign verify | pass |
| DMG notarization state | submitted_and_accepted_by_notarytool |
| DMG stapler validate | pass |
| DMG Gatekeeper assess | pass |
| DMG image verify | pass |

## Windows State

- Windows Authenticode signing: false
- Windows native install smoke: not_run_on_darwin

## Non-Claims

- Public release: false
- Production go-live: false
- Owner approval: false
- Actual launch/go-live completed: false
- App Store distribution: false
- Microsoft Store distribution: false
