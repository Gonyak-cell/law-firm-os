# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.4` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.4/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.4/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.4` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.4-macos.zip` |
| macOS ZIP SHA-256 | `6045b02caf8338da1a24f3994fd4892a287cfebe1f518a675e67d4b92a2919c1` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.4-macos.dmg` |
| macOS DMG SHA-256 | `96df9335ede70ca2325e711deba8f0efaa829bcdce229c75003066a029c90eba` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.4-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `b0a19511ca529b27d03c14d56c9fc3045d43642a276f772c152c4193204db1ec` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.4-win-x64.exe` |
| Windows formal installer SHA-256 | `ffb245a9a2f2ca6dbc71632e735f41a41da56ad2ff3e8b7a6b9d587a46362727` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.4-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `787b534899954e36f41738be0ec0ee7645c821e6385acba529614a3bcbaaedcb` |

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
