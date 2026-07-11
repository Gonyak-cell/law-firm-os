# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.11-20260711-d1b880e30` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.11-20260711-d1b880e30/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.11-20260711-d1b880e30/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.11-20260711-d1b880e30` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.11-macos.zip` |
| macOS ZIP SHA-256 | `e60b6879a81539e587040c42d37c93bfb19d3174ea1f52ce17bd4c6a4e747d89` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.11-macos.dmg` |
| macOS DMG SHA-256 | `d31ccdfe43ba71be03f00d91058ed0777867d9c46ed984408feff5d3c023c528` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.11-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `63c63f4ff11b71d5c46f43c2c2148aec1adfe838fcbebdd86eacf707cd026a43` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.11-win-x64.exe` |
| Windows formal installer SHA-256 | `fd771c02038fccc1debbba0c7b3a8f7a3074f98c67892b1b36cfbef9642cef20` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.11-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `c805376a864305dcd7051296fbdecbbdfc8a5b20d10dce2ffc357de6f36283f3` |

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
