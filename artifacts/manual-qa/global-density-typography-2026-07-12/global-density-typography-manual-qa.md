# Global density typography manual QA

Date: 2026-07-12 (Asia/Seoul)
Overall verdict: **BLOCKED** — required hands-on runtime verification could not reach either renderer. Static evidence is recorded separately and is not a visual PASS.

## manualQa

### surfaceEvidence

| scenario id | criterion reference | surface | exact invocation | verdict | artifactRefs |
|---|---|---|---|---|---|
| GD-S1 | Typography/density contract | `apps/web/dist` rebuilt web renderer | Playwright Chromium `headless:true`; open `apps/web/dist/index.html` with `skin=forest&locale=ko&view=people`; attempt 1280x900 and 375x720 | BLOCKED before page creation by Chromium MachPort permission denied (1100) | `A2` |
| GD-S2 | Packaged renderer parity | `apps/desktop/dist/mac/matter.app` | Playwright Electron launch of `Contents/MacOS/matter` with isolated `/private/tmp/global-density-qa` user data; attempt 1280x900 and 375x720 | BLOCKED before first window: `Process failed to launch!`; direct LaunchServices attempt also returned -10827 | `A2` |
| GD-S3 | Static token and responsive contract | Source, rebuilt web CSS, packaged CSS | `node --test apps/web/test/global-density-contract.test.mjs`; `npm --workspace apps/web run typecheck`; `git diff --check`; `node --check`; marker scan of both CSS assets | PASS for static evidence only; does not satisfy rendered/manual QA | `A1` |

### adversarialCases

| scenario id | criterion reference | adversarial class | expected behavior | verdict | artifactRefs |
|---|---|---|---|---|---|
| GD-A1 | No clipping / no viewport-scaled type | 1280px desktop viewport | All screens render with 40px hero, 14px body/table, 20px x 16px page padding, no horizontal clipping, and usable controls | BLOCKED: renderer could not launch; no inference made | `A2` |
| GD-A2 | Responsive spacing and typography | 375px small viewport | Hero reduces to 34px, body/table text remains 14px, spacing steps down, narrow tables reflow or scroll internally, and page has no horizontal overflow | BLOCKED: renderer could not launch; no inference made | `A2` |
| GD-A3 | Runtime surface coverage | Route changes across app screens | Typography, spacing, and clipping behavior remain stable after route changes | BLOCKED: no page was created, so route transitions could not be exercised | `A2` |
| GD-A4 | Packaged artifact parity | macOS packaged app launch | The signed packaged renderer opens and exposes the same density contract | BLOCKED by LaunchServices -10827 and Electron launch failure | `A1`, `A2` |

## artifactRefs

| id | kind | description | path |
|---|---|---|---|
| A1 | static-check | Focused contract test, typecheck, syntax/diff checks, packaged CSS marker scan, codesign result, and duplicate-contract finding | `/Users/jws/Documents/Codex/Law Firm OS/artifacts/manual-qa/global-density-typography-2026-07-12/01-static-contract-evidence.md` |
| A2 | runtime-log | Exact rebuilt-web Chromium, packaged Electron, and direct LaunchServices invocations and blockers | `/Users/jws/Documents/Codex/Law Firm OS/artifacts/manual-qa/global-density-typography-2026-07-12/02-runtime-blockers.md` |
| A3 | qa-matrix | This manual QA matrix and final verdict | `/Users/jws/Documents/Codex/Law Firm OS/artifacts/manual-qa/global-density-typography-2026-07-12/global-density-typography-manual-qa.md` |

## Findings ordered by severity

1. **BLOCKER — runtime visual QA unavailable.** Neither the rebuilt web renderer nor packaged `matter.app` reached a page/window, so computed styles, input usability, clipping, viewport behavior, and route-change behavior remain unverified.
2. **Low — duplicated density declarations.** One shared block begins around line 3168 and a second copy, explicitly titled at line 3387, repeats the contract in `apps/web/src/styles.css`. Static tests pass, but duplicate declarations create maintainability and future override risk.
