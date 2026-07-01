# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.5` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.5/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.5/checksums.sha256` |
| Channel | `formal-candidate` |
| App ID | `com.amic.matter.desktop` |
| GitHub tag candidate | `matter-desktop-v0.1.5` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.5-macos.zip` |
| macOS ZIP SHA-256 | `e93cd4faf7f9643e49d13e4ce2c6a1ee8f1820ff69f10f92abae36e4731b953c` |
| macOS DMG image | `apps/desktop/dist/mac/matter-0.1.5-macos.dmg` |
| macOS DMG SHA-256 | `d103edd30c00c0bbe82c6c590975a9175fa8f7a5940f971f3e637ab5049b98db` |
| Windows formal manifest | `apps/desktop/dist/win/matter-0.1.5-win-installer-manifest.json` |
| Windows formal manifest SHA-256 | `dcd689cce4a768741f6d0220c1b3e8cb7892215dd1459c75136b2d852d6ea868` |
| Windows formal installer | `apps/desktop/dist/matter-0.1.5-win-x64.exe` |
| Windows formal installer SHA-256 | `57915d9332fcef24a4427935c3b227907f7e208bcfe5df1b326f5fc2052c9f5f` |
| Windows installer blockmap | `apps/desktop/dist/matter-0.1.5-win-x64.exe.blockmap` |
| Windows installer blockmap SHA-256 | `a9c8adda89ad8593602b7039c8028f44ce58971c7c0b6824bf0b141a1bc4b303` |

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

## Production Bridge Smoke

- `matter-lawos-api-prod` redeployed to commit `48dd2da5983203987bb3e065d17d25fbc94ee26f`
- `LAWOS_VAULT_BRIDGE_TOKEN` restored from the production Lambda environment without recording the secret value
- `npm run lcx:vltui:production-smoke`: pass, 15 checks
- Production smoke writes remain synthetic bridge writes only; Vault document writes, public release, owner final approval, and company-wide go-live are not claimed

## Non-Claims

- Public release: false
- Production go-live: false
- Owner approval: false
- Actual launch/go-live completed: false
- App Store distribution: false
- Microsoft Store distribution: false
