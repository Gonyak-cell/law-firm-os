# Forest v0.1.17 final QA report

## Decision

**Source merge gate: `ELIGIBLE`. Release gate: `BLOCKED_AUTHENTICODE`.**

The final product source is exact SHA `39ed9571b0e841e1a6480e6875fe7b6658f83465`, tree `42bb94f745b329053cc14325ef1251fc7d8475cd`. The formal macOS package is signed, notarized, stapled, and accepted by Gatekeeper. The exact-SHA Windows package passes native install, launch, Forest login, canonical `서지원` identity, leave, payroll, restart-session restore, and uninstall. On 2026-07-16 the owner separated source-merge approval from package signing and deployment approval, so these functional and security results make the branch eligible for a PR and `main` source merge. Both Windows binaries remain `NotSigned`, therefore Windows distribution and every release/deployment claim remain blocked until an approved Authenticode certificate or provider is configured.

This report authorizes only the owner-approved source-merge gate. It does not authorize package publication, release tags, internal/staging/production deployment, production AWS traffic change, production data migration, provider write, or go-live.

## Exact-source binding

| Field | Value |
|---|---|
| integration branch | `codex/integration/forest-v0.1.17` |
| artifact-source branch revision at build | `39ed9571b0e841e1a6480e6875fe7b6658f83465` |
| product tree | `42bb94f745b329053cc14325ef1251fc7d8475cd` |
| source dirty at formal build | `false` |
| current remote `main` | `fdd1e34a42ee11ad1e5049647048471be772f381` |
| version | `0.1.17` |
| formal app ID | `com.amic.matter.desktop` |
| renderer SHA-256 | `efc12338c5f6b77e3fb1f88f0ef5285c925144dc346cdbb3ff53ab08d7199599` |
| renderer file count | `28` |

The preserved candidate tag `forest-v0.1.17-integration-candidate-e19a17dd` remains anchored at product commit `e19a17dd48edf131cada90cf0b2c9b6891002d8d`; it was not moved to disguise the later packaging fixes.

## QA matrix

| TUW | Result | Evidence |
|---|---|---|
| QA-001 | PASS | 228 test files, 1,161 pass, 0 fail, 0 skip; 8 validators PASS |
| QA-002 | PASS | 246 unique cases: 245 pass, 0 fail, 1 existing browser-gated skip; Web typecheck/build PASS; Desktop smoke 102/102 |
| QA-003 | PASS | migration/security 18 files, 59 pass, 0 fail, 0 skip; 10 validators PASS; critical findings 0 |
| QA-004 | PASS | 6 roles × 5 viewports = 30/30; unexpected errors, overflow, broken images, empty/unlabeled controls 0; LV02~LV07 PASS |
| QA-005 | PASS | signed formal macOS login, `서지원` profile, leave, payroll, restart; 5/5 screenshots; codesign/notary/staple/Gatekeeper PASS |
| QA-006 | BLOCKED | native Windows scenarios PASS and 4/4 screenshots; installer and unpacked executable `NotSigned` |
| QA-007 | PASS | candidate, macOS local, Windows local, Windows CI: renderer 28 files, digest identical, recursive mismatch 0 |
| QA-008 | PASS | 48 screenshots manifested; broken image, overflow, legacy regression, stale window 0 |

The single QA-002 skip is the intentionally browser-gated Matter profile test and is covered by the later rendered QA rather than force-enabled in the source-only suite.

## Formal macOS result

| Check | Result |
|---|---|
| Developer ID | `Developer ID Application: Jiwon Suh (LHDXU66NX3)` |
| app strict codesign | PASS |
| app Gatekeeper | PASS (`Notarized Developer ID`) |
| app staple | PASS |
| DMG codesign | PASS |
| DMG Gatekeeper | PASS |
| DMG staple | PASS |
| DMG image verify | PASS |
| app notary submission | `80dd3d70-2f21-4798-b5e5-3476a9880e0f` (`Accepted`) |
| DMG notary submission | `0bd9eaf9-8111-4ee7-bfe3-cc5786ca49d6` (`Accepted`) |
| ZIP SHA-256 | `2e2af3ef0a7da78ffaa6ed3d2c6500d59daf0eb70abde617d0a4272f39a38e5c` |
| DMG SHA-256 | `66d00e1422eacddfed3a57403f9ecbacc9ae4b3ff6c2683dcf43e4ef8ad36043` |

The signed bundle intentionally contains no bundled local API. Rendered QA kept the signed package immutable and connected it only to an isolated exact-source synthetic loopback API.

## Native Windows result

GitHub Actions run: [29466863451](https://github.com/Gonyak-cell/law-firm-os/actions/runs/29466863451)

| Check | Result |
|---|---|
| NSIS install | PASS |
| Forest login | PASS |
| `jwsuh@amic.kr -> 서지원` | PASS |
| leave | PASS |
| payroll | PASS |
| restart session restore | PASS |
| NSIS uninstall | PASS |
| page errors | `0` |
| unexpected console errors | `0` |
| installer Authenticode | `NotSigned` |
| unpacked executable Authenticode | `NotSigned` |
| signer subject/thumbprint | absent |

| Artifact | SHA-256 |
|---|---|
| CI NSIS installer | `53e2b694e28ba29a068feaa313d862edbeca976912be7204d0e7968b69ab44b3` |
| CI blockmap | `03f05e5093edc1278c8600c1ba01d5e8e84f3391b524750fcf1d30b8aa08739e` |
| CI unpacked executable | `9772e31fcaa6c7e4005392238aa096b55522f6572d01b2f27753c186fbf4a3f8` |
| macOS-hosted same-source installer | `cab98371cd6acbec6adce59b27aadc231eaeb88ea736b6c7f9cc01aab3972e61` |
| macOS-hosted same-source blockmap | `4b5092232b35c435208f5f458af725803dd72f6bb1ff82d44743fc206e0f1a5e` |
| macOS-hosted unsigned Windows ZIP | `3d7564934fcb0d91e89b41a34cea671f8d57fbcf11c41ac881086a264cb5baab` |

Host-dependent NSIS/archive bytes are not asserted equal. Each package is instead bound to the same full source SHA, source tree, app ID, version, channel, formal marker, and renderer digest.

## Renderer and screenshot proof

The QA-004 browser candidate and final source have the identical `apps/web` tree `9d16072e1aa20dc23750543483c74f64b6a79c76`. Formal macOS local, formal Windows local, and Windows-native CI renderers each contain 28 files and produce digest `efc12338c5f6b77e3fb1f88f0ef5285c925144dc346cdbb3ff53ab08d7199599`; recursive comparison reports zero mismatches.

QA-008 binds 39 QA-004 role/viewport and leave images, 5 final macOS images, and 4 final Windows images: 48 total. The final nine package images were manually inspected, including restart-session surfaces. Broken images, overflow, legacy UI regression, and stale-window findings are all zero.

## Final consistency checks

- Desktop smoke: `102/102 PASS`
- PV-002 provenance regression: `3/3 PASS`
- public renderer PII: `56` files scanned, protected values printed `false`
- legacy source assets: `191` files scanned, forbidden references `0`
- formal Mac/Windows bundle legacy scan: `35+35` files, forbidden references and offline entries `0`
- public release/go-live claim validator: `98` files, findings `0`
- QA-005~009 plus MR-000 hash ledgers: `6/6 PASS`
- evidence JSON parse: `8/8 PASS`
- evidence links: `20/20`, missing `0`
- `git diff --check`: PASS
- AI slop review: PASS

## Commands represented by the evidence

```bash
npm --workspace apps/desktop run test:smoke
node --test scripts/test/pv002-build-manifest.test.mjs
npm --workspace apps/desktop run build:mac
npm --workspace apps/desktop run build:win
npm --workspace apps/desktop run build:win:installer
node scripts/run-formal-macos-package-qa.mjs
node scripts/run-formal-windows-package-qa.mjs
npm run public-renderer:pii:validate
npm run matter-desktop:legacy-assets:validate
MATTER_DESKTOP_RELEASE_CHANNEL=formal node scripts/validate-pv006-legacy-assets.mjs --bundle
python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed
```

Native Windows execution was performed by `.github/workflows/formal-windows-package-qa.yml` on `windows-latest`; the receipt and workflow summary are preserved in QA-006.

## Preserved state

- The user-owned root checkout remains at branch `codex/profile-contact-regression-fix`, SHA `aa653bb12c7424fb5cda717817ba1ee1d2c454c3`, with the exact RC-001 77-path content manifest and working-tree digest unchanged.
- The existing v0.1.16 package process PID `55090` remains at `/private/tmp/lawos-forest-v016-release/apps/desktop/dist/mac/matter.app/Contents/MacOS/matter`.
- User root worker PIDs `27104`, `27105`, and `27106` remain alive and were not interrupted.

## Next admissible action and retained blockers

1. MR-001 may open a `main` PR with the Authenticode blocker stated explicitly; the required `HRX rollout validation` check must pass.
2. MR-002 may merge source through that PR and must record the exact remote `main` merge SHA.
3. MR-003~006 and DP-001~007 remain blocked pending separate release/deployment approval.
4. Before any Windows distribution or release, configure an owner-approved Authenticode certificate/provider without exposing credentials in repository evidence.
5. Rebuild from the exact accepted `main` SHA, require `Get-AuthenticodeSignature` status `Valid` plus non-empty approved signer subject and thumbprint for installer and executable, rerun QA-006, and refresh downstream hashes.

A self-signed certificate, source-only signature configuration, or a successful native runtime smoke cannot substitute for approved Authenticode evidence.
