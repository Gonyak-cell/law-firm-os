# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub prerelease candidate. Publication as a prerelease does not claim public stable release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.14-20260711-c30dfe525` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.14-20260711-c30dfe525/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.14-20260711-c30dfe525/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.14-20260711-c30dfe525` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.14-macos.zip` |
| macOS ZIP SHA-256 | `b03c06706569d45077492861ccf6d6e261235c305bdce596ae8966d91f0eb016` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.14-macos.dmg` |
| macOS DMG SHA-256 | `2aa55ee6eab72a44e85da42d275e8703b40cd45e470b34ff7854e8e9ad5988fc` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.14-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `eca443565c26a2da990ec16ec6b4e09a864ee19363296e607ed16462cc7d4447` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.14-win-x64.exe` |
| Windows formal installer SHA-256 | `89f0be0d7d8655b7cd11233dbdd5dee1e60a30aa2a1fa066497fbe771690331f` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.14-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `198ebeed14c71c769ad742b96f068b4517a0f96fcbb6ef1500a8830f55491fb6` |

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
