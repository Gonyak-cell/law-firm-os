# matter Desktop v0.1.5 Current Clients And Matter Codes Release Candidate

Tag: `matter-desktop-v0.1.5`
Date: 2026-07-01
Channel: `formal-candidate`
App ID: `com.amic.matter.desktop`

This release candidate packages the current AMIC Client and Matter Code inventory into the desktop runtime. It does not claim production go-live, public release, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Included Install Packages

- macOS DMG: `apps/desktop/dist/mac/matter-0.1.5-macos.dmg`
- macOS ZIP: `apps/desktop/dist/mac/matter-0.1.5-macos.zip`
- Windows installer: `apps/desktop/dist/matter-0.1.5-win-x64.exe`
- Windows installer blockmap: `apps/desktop/dist/matter-0.1.5-win-x64.exe.blockmap`
- Windows installer manifest: `apps/desktop/dist/win/matter-0.1.5-win-installer-manifest.json`
- Windows installer manifest signature: `apps/desktop/dist/win/matter-0.1.5-win-installer-manifest.json.sig`
- Release manifest: `apps/desktop/dist/release/matter-desktop-v0.1.5/release-manifest.json`
- Checksums: `apps/desktop/dist/release/matter-desktop-v0.1.5/checksums.sha256`

## SHA-256

- macOS DMG: `d103edd30c00c0bbe82c6c590975a9175fa8f7a5940f971f3e637ab5049b98db`
- macOS ZIP: `e93cd4faf7f9643e49d13e4ce2c6a1ee8f1820ff69f10f92abae36e4731b953c`
- Windows installer: `57915d9332fcef24a4427935c3b227907f7e208bcfe5df1b326f5fc2052c9f5f`
- Windows installer blockmap: `a9c8adda89ad8593602b7039c8028f44ce58971c7c0b6824bf0b141a1bc4b303`
- Windows installer manifest: `dcd689cce4a768741f6d0220c1b3e8cb7892215dd1459c75136b2d852d6ea868`
- Windows installer manifest signature: `04cb0e163638fb5b630a446c53d0eef310d0ad147def2a6cf47013631841bd16`

## Runtime Data

- Current Client inventory: 99 clients
- Current Matter Code inventory: 148 generated matters
- App API runtime smoke inventory: 149 matters including the synthetic opening fixture
- Axis counts: Advisory 14, LIT 99, Dispute 7, DEAL 28
- `ADV` is normalized to `Advisory`; `DISP` and `DIST` are normalized to `Dispute`
- Code-name DEAL matters use the `Project ...` detail form, including `제이에스테크/DEAL/Project Jade`, `새빗켐/DEAL/Project Tempus`, `성일하이텍/DEAL/Project S`, `포이스/DEAL/Project Fausta`, `위즈코어/DEAL/Project Wiz`, `엠피닉스/DEAL/Project Phoenix`, `유진이엔티/DEAL/Project Horizon`, `타이탄컴퍼니/DEAL/Project Titan`, and `성진종합전기/DEAL/Project Switch`

## Verification

- `npm run matter-desktop:formal-release`: pass
- `npm run matter-desktop:formal-release:validate`: pass
- `node --test packages/matter/test/runtime-services.test.js apps/api/test/cmp-r4-g4-matter.test.js apps/api/test/matter-vault-bridge-api.test.js`: 26/26 pass
- `npm run rp05:matter-core:validate`: pass
- packaged Electron QA: pass, `docs/lazycodex/evidence/matter-desktop/artifacts/matter-desktop-v0.1.5-electron-matter-codes-qa.json`
- bundled runtime code check: pass
- `git diff --check`: pass

## Distribution State

- macOS Developer ID signing: applied
- macOS notarization: submitted and accepted by notarytool
- macOS Gatekeeper assess: pass
- Windows NSIS installer: generated
- Windows native install smoke: not run on this macOS host
- Windows Authenticode signing: false
- Production bridge smoke: pass after sourcing `LAWOS_VAULT_BRIDGE_TOKEN` from the production Lambda environment and redeploying `matter-lawos-api-prod` to commit `48dd2da5983203987bb3e065d17d25fbc94ee26f`
- Production Matter inventory readback: pass, 149 matters returned and required current codes including `제이에스테크/DEAL/Project Jade`, `새빗켐/DEAL/Project Tempus`, and `유진이엔티/DEAL/Project Horizon` found
- Public/external release: false
