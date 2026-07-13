# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub prerelease candidate. Publication as a prerelease does not claim public stable release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.15-approved-ui-20260712` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.15-approved-ui-20260712/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.15-approved-ui-20260712/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.15-approved-ui-20260712` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.15-macos.zip` |
| macOS ZIP SHA-256 | `88f4881ba98a0e6d4e57c8a393f8e6317147ee6a29eeea82f0b0b657ed6f30b5` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.15-macos.dmg` |
| macOS DMG SHA-256 | `a5d7e47a7277ae614eb3e568f1c73478ee08637d478d6fe0d08f552f901f5c0d` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.15-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `5761a117e91f029773db9af224060940f921871639bfbf02b6b66e7af22c57f8` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.15-win-x64.exe` |
| Windows formal installer SHA-256 | `0acd3b4b302b4e36dd9be6d4636bfcf73c86ad4581c792b7b73098306e7789ac` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.15-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `7535e6fe03b471c167cbad4daddeb84c04428019ca4a71763951f9db978192c9` |

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
