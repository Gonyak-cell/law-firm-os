# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.10-20260710-1502e6772` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.10-20260710-1502e6772/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.10-20260710-1502e6772/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.10-20260710-1502e6772` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.10-macos.zip` |
| macOS ZIP SHA-256 | `45694c7f3770d9171e21e407ac91aadf32a6fe5c10c913c97fb8209c7f2726bf` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.10-macos.dmg` |
| macOS DMG SHA-256 | `7b5abaaefab48ed4be651720a44b97f9b81c78f1537d516d3020962f08d55b74` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.10-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `72bdf5f7ca55befdb9620d347e91f21051063afbda4f65d2ebf33103cb23c5c5` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.10-win-x64.exe` |
| Windows formal installer SHA-256 | `72c7909f38f9d58106d3f2d61d8f85d294c0738637416e8ff3155a049b89c40f` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.10-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `6b77970724aeb36ee27dee085b2e09e0fabf2792855b267527849c3ffd990d46` |

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
