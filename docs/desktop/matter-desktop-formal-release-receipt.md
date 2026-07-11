# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.13-20260711-e9a5b285f` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.13-20260711-e9a5b285f/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.13-20260711-e9a5b285f/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.13-20260711-e9a5b285f` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.13-macos.zip` |
| macOS ZIP SHA-256 | `5db2bcc7edb68f1fd2ac9a409f0554cae7d8502c3f66f99fc4d34431adef6b49` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.13-macos.dmg` |
| macOS DMG SHA-256 | `b3c231ebdf287995daef3801660074292dd047517db2aecbfa0d92b3debc7bf5` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.13-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `d368bceadeda3ef1313d8d14fb60b03c523af4eaaa925d8554e0c5fd19b85a56` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.13-win-x64.exe` |
| Windows formal installer SHA-256 | `b97c3ae048d9a720ad7fac460aa0f07df17de864a5ad5763a199a0d360bdfbad` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.13-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `78118a5447a360f4dd75e7abd91a2a1e69069c131769cff05c8be6c1c8cbfac4` |

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
