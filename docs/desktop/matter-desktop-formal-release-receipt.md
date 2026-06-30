# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.2` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.2/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.2/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.2` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.2-macos.zip` |
| macOS ZIP SHA-256 | `a3fce5c99f36566f57746b1bb172a8107e05f24c10b5deaa7c760069168535cf` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.2-macos.dmg` |
| macOS DMG SHA-256 | `eceeba7a2bbc5431d7013709dc571523348d60dc3d9d9cdea3421d81aeb69d3f` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.2-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `0a44baf9fe6ed9c2eda94fe61fe28f62abf26f66369fd9f92c8f01ec0ea4b85e` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.2-win-x64.exe` |
| Windows formal installer SHA-256 | `2ef2985eb53adeaebace5af6a4848d54c8c05800d8aafa453c34e8dc7cf6eab7` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.2-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `6a658c1c4f79867d02ec2ed731abeb06d90a61220b0a9c7bfbaf132ff0295286` |

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
