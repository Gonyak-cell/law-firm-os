# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.12-20260711-2eb4e7ab6` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.12-20260711-2eb4e7ab6/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.12-20260711-2eb4e7ab6/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.12-20260711-2eb4e7ab6` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.12-macos.zip` |
| macOS ZIP SHA-256 | `1039e0e0480974d51d34b7ee32747b591e5d4727ab4d58a96391e5f53ffc6789` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.12-macos.dmg` |
| macOS DMG SHA-256 | `2b4732b46768f6dbeec0cb0c9aadd9f2aa425c821695e6721d48fbf53485ac62` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.12-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `aa9efa8fc568b7bbfd4beb8c575e9e3c09eaeb8642d18b25c34be22fd5bbc7ba` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.12-win-x64.exe` |
| Windows formal installer SHA-256 | `f479f66b944cc8026317402ca907a93e57195f962189bac88d4638cd57c5b3a1` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.12-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `0a4a0aeff78d24a752bc579c662fbc829f8815f9e155df83edfd77e30715e79b` |

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
