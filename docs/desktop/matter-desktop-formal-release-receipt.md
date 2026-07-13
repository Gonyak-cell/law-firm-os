# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub prerelease candidate. Publication as a prerelease does not claim public stable release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.15-20260713-ca59b3f23` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.15-20260713-ca59b3f23/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.15-20260713-ca59b3f23/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.15-20260713-ca59b3f23` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.15-macos.zip` |
| macOS ZIP SHA-256 | `2d7d54a9f0fea6368367a4341126f82aa74fc4446b1fcfacb155f7ee1b05034c` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.15-macos.dmg` |
| macOS DMG SHA-256 | `198c6923fdc5d8d0146cfc52a5a690e04606d18d4bd5a8b30f47d9e3af002aba` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.15-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `d499ef85344e60bb08863de77d56a4f58bfea2a262e30184fd4d2d3f34b0b118` |
| Windows unsigned package ZIP | `apps/desktop/dist/win/matter-0.1.15-win32-x64-unsigned.zip` |
| Windows unsigned package ZIP SHA-256 | `25ab43c1619c28922712d1c66d09a2a48af53e809507783ae7d8c0cbb76949a1` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.15-win-x64.exe` |
| Windows formal installer SHA-256 | `2815e436742794d22f261f074c6714ad5c58011f4577bce28d910eb39cfeb835` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.15-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `f43ca14c3ede8106a01bb8217fa2ddc7e17279c37cef6f10393b4bc9d98757d1` |

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
