# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.7` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.7/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.7/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.7` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.7-macos.zip` |
| macOS ZIP SHA-256 | `0fa6e4655be72d5df882a72b6e7c9e6c340f0a04c8aadf9c873cd2eecd86bd30` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.7-macos.dmg` |
| macOS DMG SHA-256 | `ea333796678a1add3b48ca4f1c3ab362c1da3122e3b8f6a41d91488f64ffc2b4` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.7-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `148369da77fc32348dbb9a68ee3bc994bed1afe8d88ec5cbe1fa69b90075027f` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.7-win-x64.exe` |
| Windows formal installer SHA-256 | `16c50eab2e5d6fecf0f4ebe4d412981e837214582b81ba619ed944e75205d6f9` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.7-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `c3efc878ab6a16b1eca732880f17007ed97bcb78a8e7be8d1fefbb4a32e31382` |

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
