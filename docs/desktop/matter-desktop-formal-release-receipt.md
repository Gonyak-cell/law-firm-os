# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.10-20260710-a01958e71` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.10-20260710-a01958e71/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.10-20260710-a01958e71/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.10-20260710-a01958e71` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.10-macos.zip` |
| macOS ZIP SHA-256 | `c89e3db92dbf64f16f299314c8841127d13c92171cac4cbe51ed79106c75f049` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.10-macos.dmg` |
| macOS DMG SHA-256 | `6583a2c08826ecaa9484b43cadea25fcbf1aae34971110039b40d6e06db3acd3` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.10-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `72bdf5f7ca55befdb9620d347e91f21051063afbda4f65d2ebf33103cb23c5c5` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.10-win-x64.exe` |
| Windows formal installer SHA-256 | `46fa2e392ac25ba685d3dfe064c41349863562b1f39ba7e69006c53901395ac8` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.10-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `574ea99938057ae4c46be60833805ad4d5d5d469c3060a9aa4cf4d6b821bd305` |

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
