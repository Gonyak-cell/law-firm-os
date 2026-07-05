# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.9-final-20260705` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.9-final-20260705/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.9-final-20260705/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.9-final-20260705` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.9-macos.zip` |
| macOS ZIP SHA-256 | `be87bf7fcd63d9369e41a6b2a2a8093b6900401c58d431df120ae2e8c957dde2` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.9-macos.dmg` |
| macOS DMG SHA-256 | `40e72948ded380874e209c6223579b5b7566dd2bb5e70c474f708328bdc2cee3` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.9-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `c7297f14f88430be98cd4dd3910e92a4622a24c116c6184adeeae68d09b01b1f` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.9-win-x64.exe` |
| Windows formal installer SHA-256 | `9d854ebd516128b8120a54e6a2e0c4a06066bab70a316a9c112ef9cf99a2e780` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.9-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `f818e65c3706a37707b7b8c5ab358b7e97a078e5c620013613202f87f4520e75` |

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
