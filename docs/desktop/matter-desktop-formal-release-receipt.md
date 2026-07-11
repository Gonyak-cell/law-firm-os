# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub prerelease candidate. Publication as a prerelease does not claim public stable release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.15-20260711-7e8796db4` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.15-20260711-7e8796db4/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.15-20260711-7e8796db4/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.15-20260711-7e8796db4` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.15-macos.zip` |
| macOS ZIP SHA-256 | `5762e8a6ca03f6d2cc6beaedf6a4587f602c808fbcd6c3b81a6bb275f052ae0f` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.15-macos.dmg` |
| macOS DMG SHA-256 | `96662958775fb6fd4a6e9e40c234f3261c77ef1870d8c3d69780e33a6e2e7a4c` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.15-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `5761a117e91f029773db9af224060940f921871639bfbf02b6b66e7af22c57f8` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.15-win-x64.exe` |
| Windows formal installer SHA-256 | `e1466c888bc00f114a81cd2079e77534204e497446aaa80da81b305d5178abd8` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.15-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `3d15c175824594a69937e7c43f8785f80c0eac0e6dcc9a8a2ebb2bbc4aaee95c` |

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
