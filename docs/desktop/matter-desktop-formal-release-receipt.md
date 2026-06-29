# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.0-lcx-vltui-20260630` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.0-lcx-vltui-20260630/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.0-lcx-vltui-20260630/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.0-lcx-vltui-20260630` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.0-macos.zip` |
| macOS ZIP SHA-256 | `f5661dabb9b11212fede3f9edf3bcc4330c8820ffec8225208ef42437a67b6d7` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.0-macos.dmg` |
| macOS DMG SHA-256 | `cfec77354111419cb01a912fb32b45dd599321d13bd4c710ba5be481773ce8b5` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.0-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `d2cf5fe871580df3943d7048671cef32747fd6bfd2179b606122c903c1be5d93` |

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
