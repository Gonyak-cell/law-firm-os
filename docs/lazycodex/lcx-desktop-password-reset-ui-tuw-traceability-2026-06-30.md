# LCX Desktop Password Reset UI TUW Traceability

Status: implemented; child TUW ledger closed / closed_external
Date: 2026-06-30
Parent plan: `docs/lazycodex/lcx-desktop-password-reset-ui-tuw-plan-2026-06-30.md`
Implementation goal id: `LCX-DPRUI-COMPLETE`
Scope: desktop login shell password setup/reset UI only

## Goal Contract

Use this document as the executable LazyCodex backlog for implementing the desktop password reset UI without losing token, password, operator credential, release, or go-live boundaries.

The work is complete only when every child TUW below is either:

- `closed` with code/mapping, tests, packaged-screen proof, and evidence artifact;
- `closed_external` with an explicit OS protocol, email-delivery, signing, or owner receipt outside repo implementation; or
- `retired_by_owner_decision` with a recorded decision artifact.

No row may be silently skipped.

## Claim Boundary

Allowed implementation target:

`sign_in -> reset_requested -> reset_confirm -> reset_success -> sign_in`

Blocked until separate receipt:

- production go-live
- public release
- owner final approval
- real external email delivery
- OS protocol registration receipt
- distribution signing/notarization approval
- exposing `latestResetEmail` or synthetic reset outbox in visible UI
- rendering reset tokens, reset URLs, passwords, operator credentials, bearer tokens, or cookies

## Required Row Fields

Every child TUW must be tracked with:

- child TUW ID
- parent TUW
- implementation lane
- planned files/modules
- test/validator command
- packaged desktop or route proof
- evidence artifact
- allowed claim
- blocked claim
- status

## Recommended Goal Setup

Best single goal for implementing this whole backlog:

> Implement every `LCX-DPRUI-00..07` child TUW for the packaged desktop password reset UI, changing only the desktop login/reset surface, its required desktop main/preload/deep-link bridges, tests, scripts, and LazyCodex evidence; verify with `npm --workspace apps/desktop run test:smoke`, `npm --workspace apps/desktop run build:mac`, packaged Electron screen QA covering sign-in/reset-request/reset-confirm/reset-success states, `sloplint`, `git diff --check`, and secret-material grep proving no reset token, password, operator token, bearer token, cookie, or reset URL is rendered or logged. Stop and ask only if the backend reset routes are missing, OS protocol registration requires external approval, or a secret-material hit cannot be removed without changing backend contracts.

Why this is a good goal:

- Concrete outcome: packaged desktop reset UI works end to end.
- Measurable evidence: named test/build/QA/grep gates.
- Scope bound: desktop login/reset only.
- Safety bound: no public release/go-live/owner approval claim.
- Stop condition: backend gap, external OS protocol receipt, or unresolved secret leak.

Recommended staged goals if the work is split across multiple sessions:

| Goal | Child TUWs | Goal Text |
| --- | --- | --- |
| DPRUI Goal 1 | `LCX-DPRUI-00..02` | Implement token-free reset request UI for the packaged desktop login shell and verify source trace, neutral copy, no `latestResetEmail` renderer call, desktop smoke, sloplint, and button QA. |
| DPRUI Goal 2 | `LCX-DPRUI-03..04` | Implement reset confirm UI and reset deep-link parser/handoff, verify confirm bridge tests, parser deny tests, no auto-login, and no token logging. |
| DPRUI Goal 3 | `LCX-DPRUI-05..07` | Close desktop password reset UI with redaction/storage guards, packaged screen QA, evidence receipts, and no public release/go-live/owner approval claim. |

## PR Sequence

| PR | Child TUWs | Exit Gate |
| --- | --- | --- |
| PR-DPRUI-01 | `LCX-DPRUI-00.*`, `LCX-DPRUI-01.*`, `LCX-DPRUI-02.*` | Baseline and reset-request UI are complete, neutral, and token-free. |
| PR-DPRUI-02 | `LCX-DPRUI-03.*`, `LCX-DPRUI-04.*` | Reset confirm form and reset deep-link handoff are repo/test backed. |
| PR-DPRUI-03 | `LCX-DPRUI-05.*`, `LCX-DPRUI-06.*`, `LCX-DPRUI-07.*` | Secret guards, packaged QA, and closeout receipts exist. |

## Child TUW Backlog

### LCX-DPRUI-00 - Backend And Button Baseline

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-DPRUI-00.01 | source trace | `apps/desktop/src/main/aws-runtime.js`; `apps/desktop/src/main/auth.js`; `apps/desktop/src/main/session-ipc.js`; `apps/desktop/src/preload/session.js`; `apps/desktop/src/preload/session.cjs` | `rg -n "requestPasswordReset|latestResetEmail|confirmPasswordReset" apps/desktop apps/api` | `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-00-source-trace.json` | Reset request, latest synthetic email, confirm, and login routes are mapped with UI exposure rules. |
| LCX-DPRUI-00.02 | backend contract | `apps/api/src/matter-temp-desktop-runtime-lambda.mjs`; `apps/api/test/matter-temp-desktop-runtime-lambda.test.js` | `node --test apps/api/test/matter-temp-desktop-runtime-lambda.test.js` | backend contract excerpt in source trace | Confirms request accepts without account disclosure, confirm sets password, token reuse fails. |
| LCX-DPRUI-00.03 | button matrix | `apps/desktop/src/renderer/offline.html`; packaged app observation script | Playwright/Electron button scrape | `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-00-button-matrix.json` | All visible and hidden-post-login buttons are classified before UI changes. |
| LCX-DPRUI-00.04 | claim guard | parent plan; this file | `rg -n "latestResetEmail|public_release|production_go_live|owner_final_approval" docs/lazycodex/lcx-desktop-password-reset-ui-*` | traceability grep receipt | No plan row permits synthetic outbox user UI or release overclaim. |
| LCX-DPRUI-00.05 | baseline smoke | desktop runtime bridge and tests | `npm --workspace apps/desktop run test:smoke` | test output excerpt | Existing desktop runtime is green before reset UI changes. |

### LCX-DPRUI-01 - Renderer Auth Mode State Machine

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-DPRUI-01.01 | state model | `apps/desktop/src/renderer/offline.html` | renderer source assertion | `lcx-dprui-01-renderer-state.json` | Adds `sign_in`, `reset_requested`, `reset_confirm`, `reset_success` modes without a new framework. |
| LCX-DPRUI-01.02 | selectors | `offline.html`; `renderer-runtime-ui.test.mjs` | `npm --workspace apps/desktop run test:smoke` | selector test output | Stable `data-*` selectors exist for reset mode, reset email, token, new password, confirm password, submit, cancel, resend. |
| LCX-DPRUI-01.03 | copy contract | `offline.html` copy map | `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed` | sloplint receipt | Korean copy stays concrete and avoids mixed awkward English except intentional product terms. |
| LCX-DPRUI-01.04 | no eager calls | renderer event handlers | grep/static assertion | source trace receipt | Mode switches do not call reset/login APIs until an explicit user click. |
| LCX-DPRUI-01.05 | layout guard | desktop/mobile screenshots | packaged screenshot diff or manual QA receipt | `lcx-dprui-01-layout.png` | Added panels do not overlap existing logo, fields, footer, or decorative shapes. |

### LCX-DPRUI-02 - Visible Reset Request Flow

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-DPRUI-02.01 | empty-email behavior | `offline.html` | Playwright click with empty email | `lcx-dprui-02-empty-email.json` | Empty email focuses the email field and shows a Korean prompt. |
| LCX-DPRUI-02.02 | request call | `offline.html`; `matterSession.requestPasswordReset` | stubbed renderer/unit assertion or packaged runtime QA | `lcx-dprui-02-request-call.json` | Valid email invokes only `requestPasswordReset({ email })`. |
| LCX-DPRUI-02.03 | no enumeration copy | reset request result copy | backend unknown-account test plus UI assertion | `lcx-dprui-02-no-enumeration.json` | Known and unknown email outcomes do not reveal account existence. |
| LCX-DPRUI-02.04 | resend | `다시 보내기` button | Playwright click | `lcx-dprui-02-resend.json` | Resend reuses reset request and does not expose/reset token. |
| LCX-DPRUI-02.05 | back to sign-in | `로그인으로 돌아가기` button | Playwright click | `lcx-dprui-02-return.json` | Returns to sign-in mode and clears transient reset status. |
| LCX-DPRUI-02.06 | forbidden call guard | renderer source | `rg -n "latestResetEmail" apps/desktop/src/renderer/offline.html` must return no user-call site | source guard receipt | Visible UI never calls `latestResetEmail`. |

### LCX-DPRUI-03 - Reset Confirm Form

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-DPRUI-03.01 | confirm UI | `offline.html` | renderer source assertion | `lcx-dprui-03-confirm-ui.json` | Token, new password, confirm password, submit, cancel, and visibility toggles exist. |
| LCX-DPRUI-03.02 | client validation | `offline.html` validation helpers | Playwright empty/mismatch/too-short clicks | `lcx-dprui-03-validation.json` | Required, mismatch, and minimum-length states are clear and do not call backend prematurely. |
| LCX-DPRUI-03.03 | bridge submit | `confirmPasswordReset({ token, password })` | `apps/desktop/test/session-ipc.test.mjs`; Playwright runtime QA | `lcx-dprui-03-submit.json` | Confirm submit uses the existing bridge and does not log password/token. |
| LCX-DPRUI-03.04 | success state | `reset_success` mode | Playwright success path using synthetic runtime | `lcx-dprui-03-success.json` | Success clears sensitive fields and shows `비밀번호가 설정되었습니다. 새 비밀번호로 로그인하세요.` |
| LCX-DPRUI-03.05 | failure mapping | backend reasons `password_too_short`, `invalid_reset_token` | API/runtime tests | `lcx-dprui-03-failure-map.json` | Backend failure reasons map to safe Korean copy. |
| LCX-DPRUI-03.06 | no auto-login | renderer submit flow | source assertion | source guard receipt | Confirm success does not auto-login or store password. |

### LCX-DPRUI-04 - Reset Deep Link Handoff

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-DPRUI-04.01 | parser extension | `apps/desktop/src/main/deep-link.js` | `node --test apps/desktop/test/deep-link-parser.test.mjs` | parser test output | `matter://password-reset/confirm?token=...` parses as route-only reset confirm intent. |
| LCX-DPRUI-04.02 | deny rules | `deep-link-deny.test.mjs` | `node --test apps/desktop/test/deep-link-deny.test.mjs` | deny test output | Extra params, action params, wrong scheme, missing token, and invalid token shape fail closed. |
| LCX-DPRUI-04.03 | main-to-renderer handoff | desktop main window routing module | focused desktop test | `lcx-dprui-04-handoff.json` | Parsed reset intent opens reset-confirm mode without logging token. |
| LCX-DPRUI-04.04 | token redaction | diagnostics/error helpers | grep and test assertion | redaction receipt | Token values are shown only as `[reset-token-redacted]` in logs/receipts. |
| LCX-DPRUI-04.05 | external receipt boundary | docs/evidence | traceability doc grep | receipt boundary note | OS protocol registration remains blocked unless separately captured. |

### LCX-DPRUI-05 - Secret Redaction And Storage Guard

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-DPRUI-05.01 | field clearing | `offline.html` | Playwright submit/cancel/logout/navigation checks | `lcx-dprui-05-field-clear.json` | Token/password fields clear after submit, cancel, success, logout, and return-to-login. |
| LCX-DPRUI-05.02 | no browser storage | renderer source and runtime QA | source grep plus Playwright storage inspection | `lcx-dprui-05-storage.json` | No reset token/password stored in localStorage, sessionStorage, or IndexedDB. |
| LCX-DPRUI-05.03 | screenshot guard | screen QA script | packaged screenshot review | `lcx-dprui-05-screenshot-guard.json` | Screenshots never contain reset token, reset URL, or password. |
| LCX-DPRUI-05.04 | receipt grep | evidence artifacts | `rg -n "reset_token|operator_token|Bearer|MATTER_VAULT_R4_OPERATOR_TOKEN|password=.*" docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-*` | grep receipt | Secret-material grep has no findings or documented false positives. |
| LCX-DPRUI-05.05 | response sanitizer | `auth.js`; runtime client guards | `npm --workspace apps/desktop run test:smoke` | smoke output | Renderer responses remain sanitized after new reset UI paths. |

### LCX-DPRUI-06 - Packaged Desktop Screen QA

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-DPRUI-06.01 | build | desktop package | `npm --workspace apps/desktop run build:mac` | build output | Current `matter.app` includes reset UI source. |
| LCX-DPRUI-06.02 | source/bundle parity | source and packaged files | `shasum -a 256 apps/desktop/src/renderer/offline.html apps/desktop/dist/mac/matter.app/Contents/Resources/app/src/renderer/offline.html` | parity receipt | Source and packaged renderer match. |
| LCX-DPRUI-06.03 | button matrix | packaged Electron QA script | Playwright/Electron script | `lcx-dprui-06-button-matrix.json` | Every visible sign-in/reset button is clicked and observed. |
| LCX-DPRUI-06.04 | screenshot set | packaged Electron screenshots | manual QA plus screenshot checks | `lcx-dprui-06-*.png` | Sign-in, reset-requested, reset-confirm, reset-error, reset-success screens are captured without secrets. |
| LCX-DPRUI-06.05 | formal receipt churn guard | `docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md` | `git diff -- docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md` | diff receipt | Local internal build does not leave formal release receipt churn in the UI PR. |
| LCX-DPRUI-06.06 | always-run bundle | tests/lint/diff | smoke, sloplint, diff-check | command receipt | Required verification bundle passes. |

### LCX-DPRUI-07 - Closeout And Traceability Receipt

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-DPRUI-07.01 | closeout JSON | evidence folder | JSON parse / grep | `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-closeout-2026-06-30.json` | Closeout lists changed files, commands, screenshots, and residual gates. |
| LCX-DPRUI-07.02 | closeout markdown | evidence folder | markdown grep | `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-closeout-2026-06-30.md` | Human-readable closeout states allowed/blocked claims. |
| LCX-DPRUI-07.03 | traceability update | this file | `rg -n "closed|blocked|LCX-DPRUI-07" docs/lazycodex/lcx-desktop-password-reset-ui-*` | traceability receipt | Every child TUW has status and evidence. |
| LCX-DPRUI-07.04 | no overclaim | docs/evidence | `rg -n "production_go_live.*true|public_release.*true|owner_final_approval.*true" docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-*` | no-overclaim receipt | No evidence artifact upgrades release/go-live/owner approval. |
| LCX-DPRUI-07.05 | final app reopen | packaged app | `open -n apps/desktop/dist/mac/matter.app` plus screen observation | final observation note | User can see the updated packaged login/reset surface locally. |

## Child Status Ledger

Initial status for every child TUW is `planned`.

| Status | Meaning |
| --- | --- |
| planned | Not implemented yet. |
| in_progress | Work has started in current PR/session. |
| closed | Code/mapping, tests, packaged proof, and evidence artifact exist. |
| closed_external | Repo work is ready, but final receipt is external and attached separately. |
| blocked | Cannot close without backend, OS, provider, owner, or security decision. |
| retired_by_owner_decision | Explicit owner decision removes the row from scope. |

## Execution Notes

- Start with PR-DPRUI-01 unless the user explicitly asks for one-shot implementation.
- Keep `offline.html` boring and local: no new frontend framework for this shell.
- Prefer adding small helper functions inside the existing renderer script over broad refactors.
- Do not modify unrelated `apps/web` UI.
- Leave unrelated dirty files untouched.
- If `build:mac` rewrites formal release receipts to internal build receipts, restore that generated receipt before finalizing the UI PR.

## Implementation Status - 2026-06-30

Evidence root: `docs/lazycodex/evidence/matter-desktop/artifacts/`

| Child TUW | Status | Evidence |
| --- | --- | --- |
| LCX-DPRUI-00.01 | closed | `lcx-dprui-00-source-trace.json` |
| LCX-DPRUI-00.02 | closed | `lcx-dprui-00-source-trace.json`; `npm --workspace apps/desktop run test:smoke` |
| LCX-DPRUI-00.03 | closed | `lcx-dprui-00-button-matrix.json`; `lcx-dprui-06-screen-qa-result.json` |
| LCX-DPRUI-00.04 | closed | `lcx-dprui-closeout-2026-06-30.json` |
| LCX-DPRUI-00.05 | closed | `npm --workspace apps/desktop run test:smoke` passed 62/62 |
| LCX-DPRUI-01.01 | closed | `apps/desktop/src/renderer/offline.html`; renderer source test |
| LCX-DPRUI-01.02 | closed | `apps/desktop/test/renderer-runtime-ui.test.mjs`; desktop smoke |
| LCX-DPRUI-01.03 | closed | `sloplint` passed |
| LCX-DPRUI-01.04 | closed | renderer source guard; no visible `latestResetEmail` call |
| LCX-DPRUI-01.05 | closed | `lcx-dprui-06-reset-confirm-empty.png`; height guard CSS |
| LCX-DPRUI-02.01 | closed | `lcx-dprui-06-screen-qa-result.json` |
| LCX-DPRUI-02.02 | closed | `lcx-dprui-06-screen-qa-result.json`; `requestPasswordReset` button path |
| LCX-DPRUI-02.03 | closed | neutral reset-request copy in `offline.html` |
| LCX-DPRUI-02.04 | closed | `data-resend-password-reset` packaged QA click |
| LCX-DPRUI-02.05 | closed | `data-return-to-signin` packaged QA click |
| LCX-DPRUI-02.06 | closed | renderer source guard; no visible `latestResetEmail` call |
| LCX-DPRUI-03.01 | closed | reset confirm selectors in `offline.html` |
| LCX-DPRUI-03.02 | closed | empty-token validation in packaged QA |
| LCX-DPRUI-03.03 | closed | `session-ipc.test.mjs`; packaged deep-link success QA |
| LCX-DPRUI-03.04 | closed | `lcx-dprui-06-reset-success.png` |
| LCX-DPRUI-03.05 | closed | safe Korean failure mapping in `offline.html` |
| LCX-DPRUI-03.06 | closed | confirm success returns to reset success state, no auto-login |
| LCX-DPRUI-04.01 | closed | `deep-link-parser.test.mjs` |
| LCX-DPRUI-04.02 | closed | `deep-link-deny.test.mjs` |
| LCX-DPRUI-04.03 | closed | `shell-smoke.test.mjs`; `desktop:password-reset:confirm` handoff |
| LCX-DPRUI-04.04 | closed | redacted deep-link return value in `main.js` and shell smoke |
| LCX-DPRUI-04.05 | closed_external | OS protocol runtime receipt remains false; repo/parser/bundle metadata proof exists |
| LCX-DPRUI-05.01 | closed | renderer clear helpers and packaged success QA |
| LCX-DPRUI-05.02 | closed | renderer storage guard; no `localStorage`, `sessionStorage`, or IndexedDB |
| LCX-DPRUI-05.03 | closed | reset screenshots contain no secret material |
| LCX-DPRUI-05.04 | closed | `lcx-dprui-05-secret-material-grep.json` |
| LCX-DPRUI-05.05 | closed | desktop smoke 62/62 |
| LCX-DPRUI-06.01 | closed | `npm --workspace apps/desktop run build:mac` passed as internal package |
| LCX-DPRUI-06.02 | closed | source/bundle SHA match in `lcx-dprui-06-screen-qa-result.json` |
| LCX-DPRUI-06.03 | closed | packaged button matrix in `lcx-dprui-06-screen-qa-result.json` |
| LCX-DPRUI-06.04 | closed | `lcx-dprui-06-*.png` screenshot set |
| LCX-DPRUI-06.05 | closed | `macos-build.md` generated churn restored |
| LCX-DPRUI-06.06 | closed | smoke, build, screen QA, sloplint, secret grep |
| LCX-DPRUI-07.01 | closed | `lcx-dprui-closeout-2026-06-30.json` |
| LCX-DPRUI-07.02 | closed | `lcx-dprui-closeout-2026-06-30.md` |
| LCX-DPRUI-07.03 | closed | this implementation status table |
| LCX-DPRUI-07.04 | closed | no production/public/owner true claim in LCX-DPRUI artifacts |
| LCX-DPRUI-07.05 | closed_external | packaged app screen QA passed; manual open remains user/local observation |

## Final Completion Bar

The full `LCX-DPRUI-COMPLETE` goal is complete only when:

- every child row is `closed`, `closed_external`, or `retired_by_owner_decision`;
- `npm --workspace apps/desktop run test:smoke` passes;
- `npm --workspace apps/desktop run build:mac` passes;
- packaged Electron QA covers sign-in, reset request, reset confirm, reset success, and return-to-sign-in;
- secret-material grep is clean;
- `sloplint` passes;
- `git diff --check` passes;
- evidence files exist under `docs/lazycodex/evidence/matter-desktop/artifacts/`;
- no artifact claims production go-live, public release, owner final approval, real email delivery, or distribution signing approval.
