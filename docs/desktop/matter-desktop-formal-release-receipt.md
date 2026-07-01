# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.3` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.3/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.3/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.3` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.3-macos.zip` |
| macOS ZIP SHA-256 | `59a7f692369081f3d79478078cdf1ccc740e1a02cf34ebd5457c9fc04e053001` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.3-macos.dmg` |
| macOS DMG SHA-256 | `f8617b10c5b8bc195b4cfef4ec756dcdbdc7be0951fba821d4943d15a1d026b2` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.3-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `28cd62f94a6d3f715684e0b3eb8f14217fe0212be655b2b6cbac2729372663e0` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.3-win-x64.exe` |
| Windows formal installer SHA-256 | `aab707905bce485f0bf181c7893cc8e683d2c6a8c72ab57511229e8abd9a7f98` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.3-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `b2bcd78254327771c2954c6da62784b314cf8c4e1b740dc526f81e7748d49639` |

## macOS Signing and Notarization

| Field | Value |
| --- | --- |
| Developer ID signing | not_applied_internal_package |
| Requested signing mode | `internal` |
| Resolved signing identity | `not_applied_internal_package` |
| codesign verify | not_distribution_ready: /Users/jws/Documents/Codex/Law Firm OS/apps/desktop/dist/mac/matter.app: code has no resources but signature indicates they must be present |
| strict codesign verify | not_distribution_ready: /Users/jws/Documents/Codex/Law Firm OS/apps/desktop/dist/mac/matter.app: code has no resources but signature indicates they must be present |
| gatekeeper assess | not_distribution_ready: /Users/jws/Documents/Codex/Law Firm OS/apps/desktop/dist/mac/matter.app: code has no resources but signature indicates they must be present |
| public distribution approval | not claimed |
| notarization requested | false |
| notarization credential source | missing |
| notarization state | not_submitted_internal_only |

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
