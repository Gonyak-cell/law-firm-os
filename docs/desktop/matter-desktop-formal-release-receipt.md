# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.0-current-ui-20260629` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.0-current-ui-20260629/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.0-current-ui-20260629/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.0-current-ui-20260629` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.0-macos.zip` |
| macOS ZIP SHA-256 | `257f4f6cc2db3191001b440572518edd010cc69f9906e2222d693128485b6670` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.0-macos.dmg` |
| macOS DMG SHA-256 | `7e49cc1777c483f1425e2d3a9eb88a51fcd1cbcaab88a4a242bd725641c0c44a` |
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
