# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.0` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.0/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.0/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.0` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.0-macos.zip` |
| macOS ZIP SHA-256 | `620a6cae41c83fab45d06ae7b56cb60119b990a1d484f9673452c0a4efb50e60` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.0-macos.dmg` |
| macOS DMG SHA-256 | `f45a6bb0dffab467ccb954e239bfd23ab515665e10f5d3e6d8ae2aff392c7a2b` |
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
