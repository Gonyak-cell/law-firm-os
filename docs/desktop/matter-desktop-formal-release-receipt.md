# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.7-forest-skin-20260704` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.7-forest-skin-20260704/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.7-forest-skin-20260704/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.7-forest-skin-20260704` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.7-macos.zip` |
| macOS ZIP SHA-256 | `ff0bc6353b7233d07ee15a87f4abbd0517ac9d45a46686eb53869f8671cc6a6d` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.7-macos.dmg` |
| macOS DMG SHA-256 | `cf2446c38ea179e8c5103d9cb6f66efaf31934d607003de7d6b04238c459b3fa` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.7-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `148369da77fc32348dbb9a68ee3bc994bed1afe8d88ec5cbe1fa69b90075027f` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.7-win-x64.exe` |
| Windows formal installer SHA-256 | `de988723d64c51213675b585d741000206f2ac086352789b4d948f7e77303735` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.7-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `75a653bd3621df1329c5497031f46821afcbd2cb841269efc5af3366e9d15f97` |

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
