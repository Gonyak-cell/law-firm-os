# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.7-wave1-remediation-20260703` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.7-wave1-remediation-20260703/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.7-wave1-remediation-20260703/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.7-wave1-remediation-20260703` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.7-macos.zip` |
| macOS ZIP SHA-256 | `04965d5b89d3259d45003aae1ea968a21a09623591284c5da1d2fac292d8b95c` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.7-macos.dmg` |
| macOS DMG SHA-256 | `e920c89d581818b54a664419ee0e4e8612eb5950cfae60b77e3aac82671ff70c` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.7-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `148369da77fc32348dbb9a68ee3bc994bed1afe8d88ec5cbe1fa69b90075027f` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.7-win-x64.exe` |
| Windows formal installer SHA-256 | `db21ae865ba3128000780d07113d6c4e63cb505f4f5609f708bbbf4dc65af903` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.7-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `5e78a02c4d11d68b6d37a8699115ac545bb3fa855d530e19c6071bc4c0276f5d` |

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
