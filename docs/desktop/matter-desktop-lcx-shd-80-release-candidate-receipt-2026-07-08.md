# LCX-SHD-80 Desktop Packaged Renderer Release Candidate Receipt

Status: owner-release-receipt-ready
Owner confirmation: waiting
Current source commit: `9a6091dec feat(web): close sidebar home dashboard stage 7`
Objective: LCX-SHD-80 Desktop packaged renderer release candidate

## Scope

- Rebuilt desktop web renderer from the Stage 7 `apps/web` IA.
- Updated desktop screen QA expectations to the six-axis Portal IA: `Home`, `Client`, `Matter`, `People`, `Vault`, `Portal`.
- Built macOS and Windows formal-channel release-candidate artifacts.
- Drove the packaged macOS renderer through Electron from the app bundle path.
- Produced this owner receipt without public-release, production-go-live, or owner-approval overclaim.

## Release Boundary

Public release: false
Production go-live: false
Owner approval: false
Actual launch/go-live completed: false
App Store distribution: false
Microsoft Store distribution: false
Windows Authenticode signing: false
Developer ID distribution readiness: false

This receipt is an owner review package for a packaged renderer release candidate. It is not a public release notice, not a production go-live record, and not owner approval.

## Built Artifacts

| Surface | Result | Evidence |
| --- | --- | --- |
| Desktop web renderer sync | PASS | `docs/lazycodex/evidence/matter-web/desktop-web-renderer-asset.md` |
| macOS app bundle | PASS | `apps/desktop/dist/mac/matter.app` |
| macOS ZIP | PASS | `apps/desktop/dist/mac/matter-0.1.10-macos.zip` |
| macOS DMG | PASS | `apps/desktop/dist/mac/matter-0.1.10-macos.dmg` |
| Windows manifest | PASS | `apps/desktop/dist/win/matter-0.1.10-win-installer-manifest.json` |
| Windows manifest signature | PASS | `apps/desktop/dist/win/matter-0.1.10-win-installer-manifest.json.sig` |
| Windows NSIS installer | PASS | `apps/desktop/dist/matter-0.1.10-win-x64.exe` |
| Windows installer blockmap | PASS | `apps/desktop/dist/matter-0.1.10-win-x64.exe.blockmap` |

## Packaged Renderer Smoke

Evidence:

- JSON: `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-shd-80-packaged-renderer-smoke-2026-07-08.json`
- Screenshot: `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-shd-80-packaged-renderer-smoke-2026-07-08.png`

Observed result:

- Renderer URL loaded from `apps/desktop/dist/mac/matter.app/Contents/Resources/app/src/renderer/web/index.html`.
- Home dashboard shell, grid, and rail rendered.
- Home widgets rendered: `approval`, `calendar`, `feed`, `system`, `todo`.
- Top product axes rendered in order: `Home`, `Client`, `Matter`, `People`, `Vault`, `Portal`.
- Axis IDs rendered in order: `home`, `clients`, `matters`, `people`, `vault`, `portal`.
- Active axis count: `1`.
- Active axis: `home`.
- Portal axis fully visible: `true`.
- Top-axis horizontal overflow: `false`.
- Contextual sidebar duplicated product-axis labels: `[]`.
- Desktop `window.matterSession` bridge present: `true`.
- Positive public release/go-live/owner approval UI claim present: `false`.

## Build Receipts

macOS:

- Receipt: `docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md`
- Channel: `formal`
- App ID: `com.amic.matter.desktop`
- Install smoke result: `pass`
- Executable smoke: `bundle_rpath_smoke_pass`
- Developer ID signing: `not_applied_internal_package`
- Notarization requested: `false`
- Notarization state: `not_submitted_internal_only`
- Public distribution approval: `not claimed`

Windows:

- Receipt: `docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md`
- Channel: `formal`
- App ID: `com.amic.matter.desktop`
- Install smoke result: `manifest_smoke_pass`
- Windows native install smoke: `not_run_on_darwin`
- Windows Authenticode signing: `false`
- Installer sha256: `38ad31095a25ac309865d1fd4e0b3c18f5be19434164aa4c96119837a3db3389`
- Blockmap sha256: `5e2ce36b80c6c84c320e4d005a7c847a142325a20856ebf4e2ff169bd346ebb6`

## Direct Verification

| Command | Exit code | Result |
| --- | ---: | --- |
| `node --check scripts/smoke-lcx-shd-80-packaged-renderer.mjs` | 0 | PASS |
| `node --check scripts/smoke-matter-desktop-screen-qa.mjs` | 0 | PASS |
| `MATTER_DESKTOP_RELEASE_CHANNEL=formal npm --workspace apps/desktop run build:mac` | 0 | PASS |
| `MATTER_DESKTOP_RELEASE_CHANNEL=formal npm --workspace apps/desktop run build:win` | 0 | PASS |
| `MATTER_DESKTOP_RELEASE_CHANNEL=formal npm --workspace apps/desktop run build:win:installer` | 0 | PASS |
| `node scripts/smoke-lcx-shd-80-packaged-renderer.mjs` | 0 | PASS |
| `npm --workspace apps/desktop run test:smoke` | 0 | PASS |
| `node scripts/validate-matter-desktop-packaging.mjs` | 0 | PASS |
| `node scripts/validate-matter-desktop-no-public-release-claim.mjs` | 0 | PASS |
| `node --test apps/web/test/ui-regression.test.mjs` | 0 | PASS |
| `npm test` | 0 | PASS, 4157 tests |
| `npm run build` | 0 | PASS |
| `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed` | 0 | PASS exit; findings are outside the LCX-SHD-80 staged scope |
| JSON parse for LCX-SHD-80 receipt and packaged renderer smoke | 0 | PASS |
| `git diff --check` for LCX-SHD-80 pathspecs | 0 | PASS |
| targeted LCX-SHD-80 secret scan | 0 | PASS |

## Blocked Or Not Claimed

| Item | State | Reason |
| --- | --- | --- |
| `MATTER_DESKTOP_SCREEN_QA_TARGET=packaged npm run matter-desktop:screen-qa` | BLOCKED, exit code 1 | Runtime accounts response returned `ok: true` with `users: []`, so the existing `jwsuh@amic.kr` read-only privilege precondition was unavailable before UI assertions. |
| `npm run matter-desktop:formal-release:validate` | NOT CLAIMED | The formal-release validator requires Developer ID signing, accepted notarization, release manifest, and final release receipt. This LCX-SHD-80 package intentionally does not claim those. |
| macOS Developer ID distribution readiness | NOT CLAIMED | Build receipt records signing/notary not applied. |
| Windows native install smoke | NOT CLAIMED | Built and hashed on Darwin; Windows native install was not executed. |
| sloplint findings | OUT OF SCOPE | `sloplint --changed` reported existing shared-worktree findings in `apps/api/src/lambda.js`, `apps/desktop/src/renderer/offline.html`, and `workbook/*`. LCX-SHD-80 staged receipt/smoke paths had clean targeted diff/secret checks. |

## Owner Decision

Requested owner decision: review LCX-SHD-80 packaged renderer release candidate.

Decision options:

- Approve continued internal release-candidate handling.
- Request Developer ID signing/notary run before formal release validation.
- Request a runtime account-ledger repair before full packaged screen QA.

No public release, production go-live, owner approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing is claimed by this receipt.
