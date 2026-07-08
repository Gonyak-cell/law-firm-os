# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.10-current-20260708` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.10-current-20260708/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.10-current-20260708/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.10-current-20260708` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.10-macos.zip` |
| macOS ZIP SHA-256 | `d9476cd43937a9f22b10a64f0c0077280762024f82967952204f3980d1e9c40a` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.10-macos.dmg` |
| macOS DMG SHA-256 | `53f735752b56164b22ddcb9beee80a2f5eb0a12e577dcc611693301415cfd27b` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.10-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `72bdf5f7ca55befdb9620d347e91f21051063afbda4f65d2ebf33103cb23c5c5` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.10-win-x64.exe` |
| Windows formal installer SHA-256 | `482ffdaf17b36efb084bd2bdec22dccdc6fe8b01dcea80a93b3f58628e39510e` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.10-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `98f78d23a8aa30777bccb2c54c85dd565de01388b09d29eef879bd7641a8dffb` |

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
