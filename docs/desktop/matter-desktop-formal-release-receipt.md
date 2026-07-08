# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.10-current-20260708-iconfix` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.10-current-20260708-iconfix/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.10-current-20260708-iconfix/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.10-current-20260708-iconfix` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.10-macos.zip` |
| macOS ZIP SHA-256 | `8ef3e4305424476f7c98040ec4470d9c19f3a1f9daeee6552da4f24b9c1bec71` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.10-macos.dmg` |
| macOS DMG SHA-256 | `f2bc1b9b54211fb9909252a69c003ce19a9e698aaa92f5cb88e8b55753bd733f` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.10-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `72bdf5f7ca55befdb9620d347e91f21051063afbda4f65d2ebf33103cb23c5c5` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.10-win-x64.exe` |
| Windows formal installer SHA-256 | `b8c701da93fb8f0c45a1279393ce887221cd2ed6754f6c0b103bd6973e9cffe1` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.10-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `c4f4144a4c9f9d92c662b075497687ebf85fc5577a69507e8ffe222c64c3a87d` |

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
