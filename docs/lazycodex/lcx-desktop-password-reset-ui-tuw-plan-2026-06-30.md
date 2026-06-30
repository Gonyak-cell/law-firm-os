# LCX Desktop Password Reset UI TUW Plan

Status: implemented_repo_ui_ready
Date: 2026-06-30
Scope: packaged desktop login shell password setup/reset UX
Planning mode: LazyCodex TUW, Plan -> Do -> Check -> Act
Detailed execution backlog: `docs/lazycodex/lcx-desktop-password-reset-ui-tuw-traceability-2026-06-30.md`
Closeout receipt: `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-closeout-2026-06-30.json`
Production execution: false
Public release: false
Go-live approved: false
Owner final approval: false

## Goal

Implement the desktop login password setup path against the current backend without exposing reset token material, operator credentials, or synthetic outbox internals to the user-facing renderer.

The target user flow is:

`email entered -> reset requested -> reset link/token received -> new password confirmed -> login with new password`

## Current Backend Truth

| Capability | Current route / bridge | UI implication |
| --- | --- | --- |
| Registered accounts | `window.matterSession.accounts()` -> `/api/desktop/accounts` | Can show count and validate friendly copy, but do not expose role detail in reset UI. |
| Password login | `window.matterSession.login({ email, password })` -> `/api/desktop/login` | Existing `계속` button remains the sign-in action. |
| Reset request | `window.matterSession.requestPasswordReset({ email })` -> `/api/desktop/password-reset/request` | Safe for visible UI. Response must not reveal whether an email exists. |
| Synthetic reset email lookup | `window.matterSession.latestResetEmail({ email })` -> `/api/desktop/password-reset/latest-email` | Internal smoke only. Do not expose through visible UI. |
| Reset confirm | `window.matterSession.confirmPasswordReset({ token, password })` -> `/api/desktop/password-reset/confirm` | Needs visible confirm-password UI and token/deep-link handling. |
| Reset link shape | `matter://password-reset/confirm?token=...` | Needs a safe desktop route parser and renderer handoff. |

## Claim Boundary

```json
{
  "planning_only": true,
  "password_reset_request_ui_planned": true,
  "password_reset_confirm_ui_planned": true,
  "latest_reset_email_user_ui_allowed": false,
  "reset_token_material_may_render_in_screenshots": false,
  "operator_token_material_may_render": false,
  "production_go_live": false,
  "public_release": false,
  "owner_final_approval": false
}
```

## Source Anchors

- `apps/desktop/src/renderer/offline.html`
- `apps/desktop/src/preload/session.js`
- `apps/desktop/src/preload/session.cjs`
- `apps/desktop/src/main/session-ipc.js`
- `apps/desktop/src/main/auth.js`
- `apps/desktop/src/main/aws-runtime.js`
- `apps/desktop/src/main/deep-link.js`
- `apps/api/src/matter-temp-desktop-runtime-lambda.mjs`
- `apps/desktop/test/renderer-runtime-ui.test.mjs`
- `apps/desktop/test/session-ipc.test.mjs`
- `apps/desktop/test/aws-runtime-client.test.mjs`
- `apps/api/test/matter-temp-desktop-runtime-lambda.test.js`
- `scripts/smoke-matter-desktop-screen-qa.mjs`
- `docs/lazycodex/evidence/matter-desktop/artifacts/`

## Non-Negotiable Rules

1. `latestResetEmail` stays internal-only and must not be called from the visible renderer UI.
2. Reset request copy must avoid account enumeration: success text is the same for registered and unregistered emails.
3. Reset tokens, passwords, operator tokens, bearer tokens, cookies, and reset URLs must not appear in screenshots, receipts, logs, local/session storage, or UI status text.
4. New password fields clear after submit, cancel, success, logout, and navigation away.
5. Deep-link parsing must allow only the reset-confirm route shape and must not open a generic action-execution route.
6. Desktop runtime proof is not production go-live, public release, owner approval, or distribution signing approval.

## TUW Execution Order

| TUW | Layer | Primary Scope | Depends On | Exit Evidence | Allowed Claim | Blocked Claim |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-DPRUI-00 | baseline | current auth routes, buttons, and reset backend truth | none | source trace receipt | reset UI plan grounded | implementation complete |
| LCX-DPRUI-01 | renderer state | auth mode state machine and copy contract | 00 | renderer source test | reset modes wired locally | backend-confirm complete |
| LCX-DPRUI-02 | reset request | forgot-password request state and safe copy | 01 | UI test and button QA | reset request visible | password set |
| LCX-DPRUI-03 | reset confirm | token + new password form and confirm bridge call | 01, 02 | IPC/runtime tests | password confirm UI available | token delivery proven externally |
| LCX-DPRUI-04 | deep link | `matter://password-reset/confirm` parser and renderer handoff | 03 | deep-link tests | reset link opens confirm screen | OS protocol receipt |
| LCX-DPRUI-05 | security | token/password redaction, storage denial, screenshot guard | 02-04 | security validator | no secret material rendered | external security certification |
| LCX-DPRUI-06 | screen QA | packaged desktop button matrix and reset-state screenshots | 02-05 | desktop QA JSON/screenshots | packaged UI proof | production-ready claim |
| LCX-DPRUI-07 | docs/closeout | evidence index, claim boundary, release note fragment | 06 | LazyCodex receipt | implementation train ready for PR review | public release/go-live |

## Detailed TUWs

### LCX-DPRUI-00 - Backend And Button Baseline

Plan:
- Freeze the current backend capabilities and current visible button matrix before implementation.
- Record that `latestResetEmail` is smoke-only and not a user-facing UI primitive.

Do:
- Create a source trace receipt under `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-00-source-trace.json`.
- Include API/IPC bridge routes, current visible button list, and hidden post-login button list.

Check:
- `rg -n "requestPasswordReset|latestResetEmail|confirmPasswordReset" apps/desktop apps/api`
- `npm --workspace apps/desktop run test:smoke`

Act:
- If a backend route is missing, stop and do not mock a fake UI success path.

### LCX-DPRUI-01 - Renderer Auth Mode State Machine

Plan:
- Add a small state machine inside `offline.html` instead of adding a framework or separate route.

Do:
- Add auth modes: `sign_in`, `reset_requested`, `reset_confirm`, `reset_success`.
- Keep existing `Sign in`, email, password, `계속`, access request, help, and policy buttons.
- Add stable containers for reset request/confirm panels that are hidden unless active.

Check:
- `apps/desktop/test/renderer-runtime-ui.test.mjs` asserts required modes, selectors, and forbidden legacy controls.
- `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed`

Act:
- UI mode changes must not call any backend route until a user clicks an explicit button.

### LCX-DPRUI-02 - Visible Reset Request Flow

Plan:
- Make `비밀번호를 잊으셨나요?` a complete request-state flow, not a dead one-line message.

Do:
- Empty email: focus email and show `이메일 주소를 먼저 입력하세요.`
- Valid email: call `requestPasswordReset({ email })`.
- Success or accepted: show neutral text such as `비밀번호 설정 안내를 보냈습니다. 안내를 받은 뒤 새 비밀번호를 설정하세요.`
- Unknown email: show the same accepted text when backend returns accepted, preserving no-account-disclosure behavior.
- Add `다시 보내기` and `로그인으로 돌아가기` buttons in reset-requested state.

Check:
- Renderer test verifies no `latestResetEmail` call in UI code.
- Runtime/API tests verify request response excludes `reset_token`.
- Packaged app button QA clicks empty-email and valid-email paths without printing token material.

Act:
- If request fails because runtime is missing, show configuration-safe failure; do not imply the account exists or does not exist.

### LCX-DPRUI-03 - Reset Confirm Form

Plan:
- Implement visible password setup using the existing `confirmPasswordReset` bridge.

Do:
- Add fields: reset token, new password, new password confirmation.
- Add buttons: `비밀번호 설정`, `로그인으로 돌아가기`, password visibility toggles.
- Client-side checks: token required, minimum length copy aligned with backend, password confirmation match.
- Submit: call `confirmPasswordReset({ token, password })`.
- Success: clear token/password fields, return to sign-in mode, and show `비밀번호가 설정되었습니다. 새 비밀번호로 로그인하세요.`

Check:
- `apps/desktop/test/session-ipc.test.mjs` continues to prove `confirmPasswordReset` bridge.
- Add renderer assertions that token/password are not present in status text.
- Add runtime test for `password_too_short`, `invalid_reset_token`, and one-time token reuse.

Act:
- Do not auto-login after confirm unless a later TUW adds a deliberate, tested handoff that never stores the password.

### LCX-DPRUI-04 - Reset Deep Link Handoff

Plan:
- Treat `matter://password-reset/confirm?token=...` as a route-only reset UI entry, not as an executable action.

Do:
- Extend deep-link parser allowlist with `password-reset/confirm`.
- Validate only one allowed query key: `token`.
- Pass the token to the renderer reset-confirm state without logging it.
- Redact token in any diagnostics as `[reset-token-redacted]`.

Check:
- `apps/desktop/test/deep-link-parser.test.mjs`
- `apps/desktop/test/deep-link-deny.test.mjs`
- New negative cases: extra query params, action params, missing token, invalid scheme.

Act:
- If OS protocol registration receipt is unavailable, close this TUW as repo/parser proof only and leave OS-protocol receipt blocked.

### LCX-DPRUI-05 - Secret Redaction And Storage Guard

Plan:
- Make reset UI safe before packaging screenshots or receipts.

Do:
- Ensure token/password fields are cleared before screenshots and after submit/cancel.
- Add helper to redact reset-token-like strings in UI status/debug receipts.
- Assert no reset token/password flows through `localStorage`, `sessionStorage`, IndexedDB, query params to web handoff, or screenshot names.

Check:
- `npm --workspace apps/desktop run test:smoke`
- `npm run matter-desktop:screen-qa`
- New secret-material grep over generated receipts.

Act:
- Any secret-material hit blocks closeout, even if login works.

### LCX-DPRUI-06 - Packaged Desktop Screen QA

Plan:
- Drive the artifact through the real packaged desktop surface.

Do:
- Build `apps/desktop/dist/mac/matter.app`.
- Click every visible login/reset button in packaged Electron.
- Capture screenshots for sign-in, reset requested, reset confirm empty/error, reset success, and sign-in-after-success states.
- Record button matrix and computed text in a JSON receipt.

Check:
- `npm --workspace apps/desktop run build:mac`
- `npm --workspace apps/desktop run test:smoke`
- `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed`
- Playwright/Electron packaged app QA script.

Act:
- Restore generated release receipt churn if local internal builds rewrite formal release docs.
- Do not claim notarization, public release, or go-live from this TUW.

### LCX-DPRUI-07 - Closeout And Traceability Receipt

Plan:
- Leave an implementer-ready LazyCodex closeout packet.

Do:
- Write `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-closeout-2026-06-30.json`.
- Include changed files, commands, screenshots, route/IPC proof, redaction proof, and residual gates.
- Update related desktop release notes only as local implementation notes, not release approval.

Check:
- `rg -n "latestResetEmail|reset_token|production_go_live|public_release" docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-*`
- `git diff --check`

Act:
- Close as `desktop_runtime_ui_ready` only. Keep `production_go_live=false`, `public_release=false`, and `owner_final_approval=false`.

## Suggested PR Slices

| PR | TUWs | Exit Gate |
| --- | --- | --- |
| PR-DPRUI-01 | LCX-DPRUI-00, 01, 02 | Reset request UI is complete, neutral, and token-free. |
| PR-DPRUI-02 | LCX-DPRUI-03, 04 | Confirm form and reset deep-link parser are test-backed. |
| PR-DPRUI-03 | LCX-DPRUI-05, 06, 07 | Packaged app QA and closeout receipt exist with no secret leakage. |

## Always-Run Verification Bundle

Run after each PR slice:

```bash
npm --workspace apps/desktop run test:smoke
python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed
git diff --check
```

Run before final closeout:

```bash
npm --workspace apps/desktop run build:mac
npm run matter-desktop:screen-qa
rg -n "reset_token|operator_token|Bearer|MATTER_VAULT_R4_OPERATOR_TOKEN|password=.*" docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-* || true
```

## Residual Gates

- OS protocol registration for `matter://password-reset/confirm` requires a packaged runtime receipt.
- Real email delivery is not proven by synthetic outbox.
- Owner/public release/go-live approval is outside this implementation plan.
- Distribution signing/notarization receipts remain separate from desktop UI readiness.
