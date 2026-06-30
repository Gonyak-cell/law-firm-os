# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.1-lcx-openable-operating-fit-20260630` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.1-lcx-openable-operating-fit-20260630/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.1-lcx-openable-operating-fit-20260630/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.1-lcx-openable-operating-fit-20260630` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.1-macos.zip` |
| macOS ZIP SHA-256 | `c73c387760a438dcf07e8c37bd7b800f1079f8688039dea0c04b568297abe234` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.1-macos.dmg` |
| macOS DMG SHA-256 | `b9c67c29903cac95f04cfaa81e610b955d5029fb56ea1b0c933795bcba993e12` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.1-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `37a53f560b046bbffd3d1b65f768fd1ebd3581aaf14ebb869d5d25c2690d365f` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.1-win-x64.exe` |
| Windows formal installer SHA-256 | `f44312f454e430cc6b65c8cc0f24306f69180fcfa4a0381fea5b1cf445e64143` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.1-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `dc173c696dcfeadd97ec23edc10988e7ad1433975fc37b8da03de379ff4ef251` |

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
