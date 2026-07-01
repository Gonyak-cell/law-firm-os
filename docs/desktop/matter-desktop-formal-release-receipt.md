# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.6` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.6/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.6/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.6` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.6-macos.zip` |
| macOS ZIP SHA-256 | `cbacf85a2f6655701bf2c7177953de8104f58c3e7d44faadf72646d9c4c32695` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.6-macos.dmg` |
| macOS DMG SHA-256 | `b9a0d30349fcdf6e918e7979401f75c3f553c664e5e5b1591f1af0e6b99eb635` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.6-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `358dbb4db79ee544c507453e525e36034ffdccf72b7f536c3c996ad31dbb8175` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.6-win-x64.exe` |
| Windows formal installer SHA-256 | `36da5c1f32c2e533dc3359c5eaec610d7d7086749abb4ca9761630177aa79dac` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.6-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `d73aa8e00c6589c1ba95b280c009bd6643e2093b70dd9acfd9eb88f5a88ef9be` |

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
