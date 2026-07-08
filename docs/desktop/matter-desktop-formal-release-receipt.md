# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.10-current-20260708-365325a` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.10-current-20260708-365325a/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.10-current-20260708-365325a/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.10-current-20260708-365325a` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.10-macos.zip` |
| macOS ZIP SHA-256 | `770d2b26ceaca292ae396bc2fbe6fa86b06e26045069a50f8862c94146353699` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.10-macos.dmg` |
| macOS DMG SHA-256 | `558188c2010c31a4a1958d41eceab4ab9bb1e5a83a0b4205a537bf260fa1b521` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.10-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `72bdf5f7ca55befdb9620d347e91f21051063afbda4f65d2ebf33103cb23c5c5` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.10-win-x64.exe` |
| Windows formal installer SHA-256 | `dab2ec8cead072f199b526f19b63da56e5053b1433590d576df1edc5b0bffd86` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.10-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `4513cffcf6381ba9d323cd9e4f3e29812b2b4cb8fdef57887ae0adca228567ff` |

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
