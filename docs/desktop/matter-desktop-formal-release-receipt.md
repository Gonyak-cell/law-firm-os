# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.8-final-20260704` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.8-final-20260704/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.8-final-20260704/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.8-final-20260704` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.8-macos.zip` |
| macOS ZIP SHA-256 | `373c4b9d63608d7430d3d5b3359894cb1e2b346e9def8692d734d07ec256e2a8` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.8-macos.dmg` |
| macOS DMG SHA-256 | `7cdd9578efe44617f8de2315a1a12bd0591a0a60433f78f9b50299902492df6d` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.8-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `5a16afb6cb673de680078c74706155e1d0242bf23c749dcfde186331e95f0412` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.8-win-x64.exe` |
| Windows formal installer SHA-256 | `8413973aae3fbf7f28cc2ad06a0ce9c2b0ba6414c0bbf71fa8b3d37d6cc97560` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.8-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `5fd3e232b860e01b1d926c0d5f4faa88afc574542a7979873d95dfecf625c3f2` |

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
