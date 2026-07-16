# LCX Desktop Reset Safety And Motion Implementation TUW Plan

Status: implemented_and_verified_internal
Date: 2026-07-02
Scope: packaged desktop password-reset QA safety and operational SaaS motion system
Planning mode: LazyCodex TUW, Plan -> Do -> Check -> Act
Detailed execution backlog: `docs/lazycodex/lcx-desktop-reset-safety-motion-implementation-tuw-traceability-2026-07-02.md`
Production execution: false
Public release: false
Go-live approved: false
Owner final approval: false

## Goal

Implement the remaining desktop authentication safety and UI motion work as two bounded implementation trains:

1. `LCX-DPRS-COMPLETE` - prevent smoke, QA, packaged-screen QA, and release validation scripts from resetting the real `jwsuh@amic.kr` account by default.
2. `LCX-MOTION-COMPLETE` - add a restrained SaaS motion system for buttons, menus, panel transitions, loading states, and reduced-motion handling in the packaged desktop app.

Completion requires code changes, tests, packaged desktop proof, LazyCodex evidence receipts, and explicit non-claims for public release, production go-live, owner approval, and unsafe secret exposure.

## Current Truth

| Area | Current source anchor | Planning implication |
| --- | --- | --- |
| Real super-admin account | `scripts/smoke-matter-desktop-aws-runtime.mjs` currently hard-codes `jwsuh@amic.kr` as `SUPER_ADMIN_EMAIL` | This account must become protected by default and read-only for smoke unless an explicit dangerous override is set. |
| Packaged reset QA | `scripts/run-lcx-dprui-packaged-screen-qa.mjs` previously defaulted `QA_EMAIL` to `jwsuh@amic.kr` | Packaged QA must use the dedicated synthetic QA account `matter.desktop.qa@amic.kr` or an explicit non-protected `MATTER_DESKTOP_QA_EMAIL`. |
| Reset internals | `latestResetEmail` exists in desktop preload/main/runtime bridges | It remains internal-only for smoke; visible renderer UI must not call it. |
| Existing reset UI | `apps/desktop/src/renderer/offline.html` already has reset request and confirm modes | Motion work must not re-open the completed reset UI boundary or add auto-login. |
| Existing motion | `offline.html` already has transitions, logo intro animation, and `prefers-reduced-motion` handling | Implementation should normalize tokens and behavior rather than introduce a new animation framework. |

## Claim Boundary

```json
{
  "planning_only": false,
  "protected_real_account_default": "jwsuh@amic.kr",
  "real_account_reset_default_allowed": false,
  "protected_reset_override_required": true,
  "default_qa_reset_account": "matter.desktop.qa@amic.kr",
  "qa_reset_account_required": true,
  "latest_reset_email_user_ui_allowed": false,
  "reset_token_material_may_render_in_screenshots": false,
  "operator_token_material_may_render": false,
  "motion_system_implemented_internal": true,
  "motion_must_respect_reduced_motion": true,
  "public_release": false,
  "production_go_live": false,
  "owner_final_approval": false
}
```

## Source Anchors

- `scripts/smoke-matter-desktop-aws-runtime.mjs`
- `scripts/smoke-matter-desktop-screen-qa.mjs`
- `scripts/run-lcx-dprui-packaged-screen-qa.mjs`
- `scripts/lib/`
- `apps/desktop/src/renderer/offline.html`
- `apps/desktop/src/main/auth.js`
- `apps/desktop/src/main/aws-runtime.js`
- `apps/desktop/src/main/session-ipc.js`
- `apps/desktop/src/preload/session.js`
- `apps/desktop/src/preload/session.cjs`
- `apps/desktop/test/renderer-runtime-ui.test.mjs`
- `apps/desktop/test/session-ipc.test.mjs`
- `apps/desktop/test/aws-runtime-client.test.mjs`
- `apps/api/test/matter-temp-desktop-runtime-lambda.test.js`
- `docs/lazycodex/evidence/matter-desktop/artifacts/`

## Non-Negotiable Rules

1. `jwsuh@amic.kr` must not be reset by any default local, staging, smoke, packaged-screen QA, or release script.
2. A protected-account reset requires an explicit env flag and must produce a sanitized receipt that records the override without secrets.
3. Password-reset QA must still prove the flow using the dedicated synthetic QA account, not an arbitrary real user account.
4. `latestResetEmail` remains smoke/operator-only and must not be exposed in visible renderer UI.
5. Reset tokens, reset URLs, passwords, operator tokens, bearer tokens, cookies, and AWS credentials must not appear in screenshots, receipts, logs, or UI status text.
6. Motion must be functional and restrained: hover, press, focus, selection, panel entrance, loading, and reduced-motion behavior only.
7. Motion must not create layout shift, text overlap, marketing-style page slides, or repeated login-logo intro after the first app launch.
8. `prefers-reduced-motion: reduce` must remove or minimize transform and long-running animation.
9. Desktop runtime proof is not production go-live, public release, owner approval, signing approval, or external distribution approval.

## TUW Execution Order

| TUW | Layer | Primary Scope | Depends On | Exit Evidence | Allowed Claim | Blocked Claim |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-DPRS-00 | source truth | reset script inventory and protected-principal baseline | none | source trace receipt | reset risk mapped | safety implemented |
| LCX-DPRS-01 | policy helper | protected reset account helper and env contract | 00 | unit tests | protected policy exists | production auth policy certified |
| LCX-DPRS-02 | QA account | QA account routing and default script behavior | 01 | smoke dry-run receipt | QA reset account selected | real account reset |
| LCX-DPRS-03 | script remediation | smoke, screen QA, packaged QA script updates | 01, 02 | script tests and grep | protected defaults enforced | external email delivery |
| LCX-DPRS-04 | negative tests | protected-denial and override tests | 03 | focused test output | reset guard tested | security certification |
| LCX-DPRS-05 | packaged QA | packaged reset proof using QA account | 03, 04 | QA JSON/screenshots | desktop reset QA works | public release |
| LCX-DPRS-06 | secret guard | receipt/log/screenshot secret grep | 05 | grep receipt | no secret material found | formal security audit |
| LCX-DPRS-07 | closeout | evidence index and release note boundary | 06 | closeout receipt | implementation ready for review | go-live approved |
| LCX-MOTION-00 | source truth | current UI and motion inventory | none | motion source trace | motion scope mapped | implementation complete |
| LCX-MOTION-01 | tokens | motion duration/easing CSS contract | 00 | renderer source test | tokenized motion contract | app-wide design system certified |
| LCX-MOTION-02 | controls | button, link, toggle, input micro-interactions | 01 | UI test/screenshots | control motion works | global redesign |
| LCX-MOTION-03 | auth shell | auth mode transitions and first-launch logo intro guard | 01, 02 | packaged auth QA | auth shell motion works | login behavior rewrite |
| LCX-MOTION-04 | app shell | sidebar, menu, active indicator, section expand/collapse | 01, 02 | packaged navigation QA | navigation motion works | route architecture change |
| LCX-MOTION-05 | panels | cards, panels, drawers, modal-like surfaces, toasts | 01, 02 | UI proof | surface motion works | new component framework |
| LCX-MOTION-06 | loading states | loading, empty, error, skeleton/pulse behavior | 01 | UI proof | state changes are smoother | data-layer change |
| LCX-MOTION-07 | accessibility | reduced-motion, focus, layout, contrast guard | 02-06 | accessibility receipt | accessible motion behavior | external accessibility certification |
| LCX-MOTION-08 | packaged QA | desktop screenshots, button matrix, visual proof | 02-07 | packaged QA receipt | packaged UI proof | release/go-live |
| LCX-MOTION-09 | closeout | evidence index and implementation receipt | 08 | closeout JSON/MD | implementation ready for review | owner approval |

## Motion Timing Contract

The motion implementation should use the current SaaS motion research as a constraint set, not as decorative animation:

| Token | Duration | Use |
| --- | --- | --- |
| `--motion-press` | `70ms` | button press scale or translate feedback |
| `--motion-hover` | `110ms` | hover, border, background, text-color fade |
| `--motion-menu` | `150ms` | menu item active indicator, dropdown-like surfaces |
| `--motion-content` | `180ms` | page/content fade and short translate |
| `--motion-panel` | `240ms` | drawer, panel, toast entrance |
| `--motion-large` | `400ms` | rare large expansion only |
| `--motion-pulse` | `700ms` to `1200ms` | subtle loading pulse only |

Recommended easing:

```css
--ease-standard: cubic-bezier(0.2, 0, 0.38, 0.9);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-emphasized: cubic-bezier(0.2, 0, 0, 1);
```

## Recommended Goal Setup

Best single goal for implementing this whole backlog:

> Implement every `LCX-DPRS-00..07` and `LCX-MOTION-00..09` child TUW for the packaged desktop app, changing only desktop password-reset QA safety scripts/helpers/tests, desktop renderer motion styling/behavior, focused desktop tests, LazyCodex evidence, and release-boundary docs; verify with protected-account negative tests proving `jwsuh@amic.kr` cannot be reset by default, dedicated QA-account reset proof for `matter.desktop.qa@amic.kr`, `node --test apps/api/test/matter-temp-desktop-runtime-lambda.test.js`, `npm --workspace apps/desktop run test:smoke`, packaged Electron screen QA for reset and motion surfaces, `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed`, `git diff --check`, and secret-material grep proving no reset token, password, operator token, bearer token, cookie, AWS credential, or reset URL is rendered or logged. Stop and ask only if the dedicated QA account cannot be selected, a protected account reset is explicitly required, or a secret-material hit cannot be removed without changing backend contracts.

## PR Sequence

| PR | Child TUWs | Exit Gate |
| --- | --- | --- |
| PR-DPRS-01 | `LCX-DPRS-00.*`, `LCX-DPRS-01.*`, `LCX-DPRS-02.*`, `LCX-DPRS-03.*`, `LCX-DPRS-04.*` | Protected real-account reset denial and QA-account routing are implemented and tested. |
| PR-DPRS-02 | `LCX-DPRS-05.*`, `LCX-DPRS-06.*`, `LCX-DPRS-07.*` | Packaged reset QA runs on non-protected QA account and receipts are secret-clean. |
| PR-MOTION-01 | `LCX-MOTION-00.*`, `LCX-MOTION-01.*`, `LCX-MOTION-02.*`, `LCX-MOTION-03.*` | Motion tokens, controls, and auth shell behavior are implemented and reduced-motion safe. |
| PR-MOTION-02 | `LCX-MOTION-04.*`, `LCX-MOTION-05.*`, `LCX-MOTION-06.*`, `LCX-MOTION-07.*`, `LCX-MOTION-08.*`, `LCX-MOTION-09.*` | App shell, panel, loading, accessibility, packaged QA, and closeout receipts are complete. |

## Verification Bundle

Minimum verification before closeout:

```bash
git diff --check
node --test scripts/test/protected-reset-accounts.test.mjs
node --test apps/api/test/matter-temp-desktop-runtime-lambda.test.js
npm run matter-vault:user-registration:validate
npm --workspace apps/desktop run test:smoke
npm run matter-desktop:aws-runtime:smoke
npm run matter-desktop:screen-qa
python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed
rg -n "reset_token|operator_token|Bearer|MATTER_VAULT_R4_OPERATOR_TOKEN|AWS_SECRET_ACCESS_KEY|password=.*|matter://password-reset/confirm\\?token=" docs/lazycodex/evidence/matter-desktop/artifacts
```

The two `npm run matter-desktop:*` commands may use live staging configuration. They must be executed only after `LCX-DPRS-01..04` protect `jwsuh@amic.kr` by default.

## Stop Conditions

Stop and ask the owner before continuing if:

1. The dedicated synthetic QA account `matter.desktop.qa@amic.kr` is unavailable and creating or selecting another QA account would require a production write outside the planned script boundary.
2. The owner explicitly wants to reset `jwsuh@amic.kr`; this requires a separate dangerous override receipt.
3. A secret-material grep hit cannot be removed without changing backend contracts or redacting existing historical artifacts.
4. Motion changes cause layout overlap or hidden controls in packaged Electron and cannot be fixed without redesigning the app shell.
5. LazyCodex bootstrap/tooling becomes available and requires a different ledger schema before implementation receipts are finalized.
