# LCX Desktop Reset Safety And Motion Implementation TUW Traceability

Status: implemented_and_verified_internal
Date: 2026-07-02
Parent plan: `docs/lazycodex/lcx-desktop-reset-safety-motion-implementation-tuw-plan-2026-07-02.md`
Implementation goal ids: `LCX-DPRS-COMPLETE`, `LCX-MOTION-COMPLETE`
Scope: packaged desktop reset QA safety and desktop SaaS motion only

## Goal Contract

Use this document as the executable LazyCodex backlog for implementing:

- real-account reset protection for `jwsuh@amic.kr`;
- safe QA reset account routing;
- restrained SaaS motion for controls, navigation, panels, loading states, and reduced-motion paths.

The work is complete only when every child TUW below is either:

- `closed` with code/mapping, tests, packaged-screen proof, and evidence artifact;
- `closed_external` with an explicit external environment, OS, signing, owner, or provider receipt outside repo implementation; or
- `retired_by_owner_decision` with a recorded decision artifact.

No row may be silently skipped.

## Claim Boundary

Allowed implementation target:

`protected reset scripts -> QA account reset proof -> secret-clean receipts -> tokenized motion -> reduced-motion safe packaged UI`

Blocked until separate receipt:

- production go-live
- public release
- owner final approval
- real `jwsuh@amic.kr` password reset
- external email delivery guarantee
- OS protocol registration receipt
- distribution signing/notarization approval
- exposing `latestResetEmail` or synthetic reset outbox in visible UI
- rendering reset tokens, reset URLs, passwords, operator credentials, bearer tokens, cookies, or AWS credentials
- app-wide redesign beyond the desktop auth/app shell motion surfaces

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

## Goal Text

> Implement every `LCX-DPRS-00..07` and `LCX-MOTION-00..09` child TUW for the packaged desktop app, changing only desktop password-reset QA safety scripts/helpers/tests, desktop renderer motion styling/behavior, focused desktop tests, LazyCodex evidence, and release-boundary docs; verify with protected-account negative tests proving `jwsuh@amic.kr` cannot be reset by default, dedicated QA-account reset proof for `matter.desktop.qa@amic.kr`, `node --test apps/api/test/matter-temp-desktop-runtime-lambda.test.js`, `npm --workspace apps/desktop run test:smoke`, packaged Electron screen QA for reset and motion surfaces, `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed`, `git diff --check`, and secret-material grep proving no reset token, password, operator token, bearer token, cookie, AWS credential, or reset URL is rendered or logged. Stop and ask only if the dedicated QA account cannot be selected, a protected account reset is explicitly required, or a secret-material hit cannot be removed without changing backend contracts.

## Parent Breakdown

| Parent | Child TUWs | Goal |
| --- | --- | --- |
| `LCX-DPRS-COMPLETE` | `LCX-DPRS-00..07` | Make all password-reset QA and smoke flows safe for real accounts by default while preserving QA coverage on the dedicated synthetic QA account. |
| `LCX-MOTION-COMPLETE` | `LCX-MOTION-00..09` | Add restrained, accessible SaaS motion to the packaged desktop UI without changing product information architecture or auth semantics. |

## Child TUW Backlog

### LCX-DPRS-00 - Reset Source Truth And Risk Map

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-DPRS-00.01 | source trace | `scripts/smoke-matter-desktop-aws-runtime.mjs`; `scripts/smoke-matter-desktop-screen-qa.mjs`; `scripts/run-lcx-dprui-packaged-screen-qa.mjs` | `rg -n "SUPER_ADMIN_EMAIL|QA_EMAIL|resetPasswordFor|latestResetEmail|confirmPasswordReset" scripts apps/desktop apps/api` | `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprs-00-source-trace.json` | Every reset-capable script and route is mapped. | closed |
| LCX-DPRS-00.02 | protected principal baseline | account selection logic and env files referenced by scripts | read-only account list call or mocked fixture | source trace receipt | `jwsuh@amic.kr` is classified as protected by default. | closed |
| LCX-DPRS-00.03 | current role boundary | `scripts/smoke-matter-desktop-aws-runtime.mjs` | source assertion | `lcx-dprs-00-role-boundary.json` | Super-admin role checks are read-only unless explicit reset override is set. | closed |
| LCX-DPRS-00.04 | claim guard | parent plan and traceability docs | `rg -n "public release|go-live|owner final approval|jwsuh@amic.kr" docs/lazycodex/lcx-desktop-reset-safety-motion-*` | traceability grep receipt | Plan states the real-account reset and release claims are blocked. | closed |

### LCX-DPRS-01 - Protected Reset Account Policy Helper

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-DPRS-01.01 | helper module | `scripts/lib/protected-reset-accounts.mjs` or nearest existing helper | `node --test scripts/test/protected-reset-accounts.test.mjs` | test output | Shared helper decides protected/default/override behavior. | closed |
| LCX-DPRS-01.02 | default protected list | helper module | focused unit test | `lcx-dprs-01-default-protected.json` | `jwsuh@amic.kr` is protected when no env is set. | closed |
| LCX-DPRS-01.03 | env contract | helper module; docs | focused unit test | `lcx-dprs-01-env-contract.json` | `MATTER_PROTECTED_RESET_EMAILS` extends/replaces protection as documented. | closed |
| LCX-DPRS-01.04 | dangerous override | helper module | focused negative/positive unit tests | `lcx-dprs-01-override.json` | `MATTER_ALLOW_PROTECTED_ACCOUNT_RESET=1` is required for protected reset. | closed |
| LCX-DPRS-01.05 | sanitized error | helper module; scripts | focused unit test | `lcx-dprs-01-sanitized-error.json` | Denial message names the protected email but prints no password, token, or reset URL. | closed |

### LCX-DPRS-02 - QA Reset Account Routing

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-DPRS-02.01 | QA env | reset QA scripts | source assertion | `lcx-dprs-02-qa-env.json` | `MATTER_DESKTOP_QA_EMAIL` is the documented QA account selector. | closed |
| LCX-DPRS-02.02 | non-protected selection | `scripts/smoke-matter-desktop-aws-runtime.mjs`; `scripts/run-lcx-dprui-packaged-screen-qa.mjs` | mocked account fixture test | `lcx-dprs-02-account-selection.json` | Default QA reset target is not `jwsuh@amic.kr` and not any protected account. | closed |
| LCX-DPRS-02.03 | super-admin read-only | `scripts/smoke-matter-desktop-aws-runtime.mjs` | focused script test or dry-run | `lcx-dprs-02-super-admin-readonly.json` | Super-admin account can be role-checked without password reset. | closed |
| LCX-DPRS-02.04 | missing QA account stop | script account selection | focused negative test | `lcx-dprs-02-missing-qa-stop.json` | Script fails closed when no non-protected QA account exists. | closed |

### LCX-DPRS-03 - Reset Script Remediation

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-DPRS-03.01 | AWS runtime smoke | `scripts/smoke-matter-desktop-aws-runtime.mjs` | focused script dry-run or mocked runtime | `lcx-dprs-03-aws-runtime-smoke.json` | Smoke no longer resets `jwsuh@amic.kr` by default. | closed |
| LCX-DPRS-03.02 | screen QA | `scripts/smoke-matter-desktop-screen-qa.mjs` | focused script test | `lcx-dprs-03-screen-qa.json` | Screen QA accepts QA account/password without protected reset. | closed |
| LCX-DPRS-03.03 | packaged DPRUI QA | `scripts/run-lcx-dprui-packaged-screen-qa.mjs` | focused script test | `lcx-dprs-03-packaged-qa.json` | Packaged QA uses QA account selector and guard helper. | closed |
| LCX-DPRS-03.04 | log contract | all touched scripts | secret grep | `lcx-dprs-03-log-contract.json` | Script logs never include generated password, token, reset URL, or auth header. | closed |

### LCX-DPRS-04 - Protected Reset Tests

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-DPRS-04.01 | default denial | `scripts/test/protected-reset-accounts.test.mjs` | `node --test scripts/test/protected-reset-accounts.test.mjs` | test output | `jwsuh@amic.kr` reset is denied when no override is set. | closed |
| LCX-DPRS-04.02 | override allowed | same | same | test output | Protected reset is allowed only when dangerous override env is set. | closed |
| LCX-DPRS-04.03 | QA allowed | same | same | test output | Non-protected QA account reset is allowed. | closed |
| LCX-DPRS-04.04 | protected env parsing | same | same | test output | Multiple protected emails are normalized and matched case-insensitively. | closed |
| LCX-DPRS-04.05 | no accidental network write | scripts under test | mocked runtime test | `lcx-dprs-04-no-network-write.json` | Protected denial happens before request/reset/confirm API calls. | closed |

### LCX-DPRS-05 - Packaged Reset QA With QA Account

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-DPRS-05.01 | packaged reset request | `scripts/run-lcx-dprui-packaged-screen-qa.mjs` | packaged Electron QA | `lcx-dprs-05-reset-request.json` | Reset request works for QA account. | closed |
| LCX-DPRS-05.02 | packaged reset confirm | same | packaged Electron QA | `lcx-dprs-05-reset-confirm.json` | New password can be set for QA account. | closed |
| LCX-DPRS-05.03 | packaged login | same | packaged Electron QA | `lcx-dprs-05-login.json` | QA account can log in with reset password. | closed |
| LCX-DPRS-05.04 | protected negative smoke | same or helper test | protected denial test | `lcx-dprs-05-protected-negative.json` | Packaged QA refuses protected account by default. | closed |

### LCX-DPRS-06 - Secret Material Guard

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-DPRS-06.01 | receipt grep | `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprs-*` | `rg -n "reset_token|operator_token|Bearer|MATTER_VAULT_R4_OPERATOR_TOKEN|AWS_SECRET_ACCESS_KEY|password=.*|matter://password-reset/confirm\\?token=" docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprs-*` | `lcx-dprs-06-secret-grep.json` | No secret material in DPRS artifacts or documented false positive only. | closed |
| LCX-DPRS-06.02 | screenshot guard | packaged screenshots | manual/automated screenshot review | `lcx-dprs-06-screenshot-guard.json` | Screenshots show no token, reset URL, or password. | closed |
| LCX-DPRS-06.03 | script stdout guard | smoke/QA script output | captured output inspection | `lcx-dprs-06-stdout-guard.json` | Console output is sanitized. | closed |

### LCX-DPRS-07 - DPRS Closeout

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-DPRS-07.01 | evidence index | docs/evidence | JSON/markdown source review | `lcx-dprs-closeout-2026-07-02.json` | All DPRS child evidence is indexed. | closed |
| LCX-DPRS-07.02 | release boundary | docs/desktop release notes if touched | claim-boundary grep | `lcx-dprs-release-boundary.md` | No public release/go-live/owner approval claim added. | closed |
| LCX-DPRS-07.03 | final status | parent plan and traceability | source review | this traceability file | DPRS rows are closed, closed_external, or retired by owner decision. | closed |

### LCX-MOTION-00 - Motion Source Truth

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-MOTION-00.01 | source trace | `apps/desktop/src/renderer/offline.html` | `rg -n "transition|animation|prefers-reduced-motion|button|sidebar|auth-mode" apps/desktop/src/renderer/offline.html` | `lcx-motion-00-source-trace.json` | Current motion and UI surfaces are inventoried. | closed |
| LCX-MOTION-00.02 | button matrix | packaged UI or renderer source | Playwright/Electron scrape | `lcx-motion-00-button-matrix.json` | Buttons, text-buttons, icon-buttons, sidebar items, and panel controls are classified. | closed |
| LCX-MOTION-00.03 | visual baseline | packaged Electron app | desktop screenshots | `lcx-motion-00-baseline.png` | Baseline screenshots exist before motion changes. | closed |
| LCX-MOTION-00.04 | research lock | this plan | source review | `lcx-motion-00-research-lock.json` | Motion values are limited to SaaS micro-interaction ranges. | closed |

### LCX-MOTION-01 - Motion Token Contract

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-MOTION-01.01 | CSS tokens | `apps/desktop/src/renderer/offline.html` | renderer source assertion | `lcx-motion-01-tokens.json` | `--motion-*` and `--ease-*` tokens exist in one place. | closed |
| LCX-MOTION-01.02 | token replacement | same | source grep | `lcx-motion-01-replacement.json` | Existing ad hoc durations are normalized where safe. | closed |
| LCX-MOTION-01.03 | reduced-motion token override | same | source assertion | `lcx-motion-01-reduced-token.json` | Reduced-motion media block neutralizes transforms/long animations. | closed |
| LCX-MOTION-01.04 | no framework | package manifests | `git diff -- package.json apps/desktop/package.json` | `lcx-motion-01-no-framework.json` | No animation dependency is added. | closed |

### LCX-MOTION-02 - Control Micro-Interactions

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-MOTION-02.01 | primary buttons | `offline.html` CSS | renderer source assertion | `lcx-motion-02-primary-buttons.json` | Primary buttons have hover and press feedback within token range. | closed |
| LCX-MOTION-02.02 | secondary buttons | same | renderer source assertion | `lcx-motion-02-secondary-buttons.json` | Secondary buttons animate background/border without layout shift. | closed |
| LCX-MOTION-02.03 | text buttons/links | same | renderer source assertion | `lcx-motion-02-text-buttons.json` | Text buttons use color/underline/focus motion only. | closed |
| LCX-MOTION-02.04 | icon buttons/password toggles | same | packaged UI click proof | `lcx-motion-02-icon-buttons.json` | Icon buttons respond without changing hitbox size. | closed |
| LCX-MOTION-02.05 | inputs/focus | same | screenshot/focus proof | `lcx-motion-02-input-focus.json` | Inputs animate focus ring only, with stable dimensions. | closed |

### LCX-MOTION-03 - Auth Shell Motion

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-MOTION-03.01 | auth mode transition | `offline.html` | renderer source assertion and packaged screenshots | `lcx-motion-03-auth-mode.json` | `sign_in`, `reset_requested`, `reset_confirm`, `reset_success` changes fade/translate subtly. | closed |
| LCX-MOTION-03.02 | first-launch logo guard | `offline.html`; session bridge if needed | `npm --workspace apps/desktop run test:smoke` | `lcx-motion-03-logo-once.json` | Logo intro runs only on first app launch, not reset success, login retry, or menu changes. | closed |
| LCX-MOTION-03.03 | no reset auto-login | `offline.html` | source assertion | `lcx-motion-03-no-auto-login.json` | Reset success remains manual login only. | closed |
| LCX-MOTION-03.04 | auth layout guard | packaged desktop screenshots | screenshot review | `lcx-motion-03-layout.png` | Auth text, buttons, logo, footer, and fields do not overlap. | closed |

### LCX-MOTION-04 - App Shell And Navigation Motion

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-MOTION-04.01 | sidebar active state | `offline.html` app-shell CSS/JS | packaged navigation QA | `lcx-motion-04-active-state.json` | Active indicator slides/fades within 150-200ms. | closed |
| LCX-MOTION-04.02 | sidebar expand/collapse | same | packaged navigation QA | `lcx-motion-04-expand-collapse.json` | Section expand/collapse uses height/opacity or grid transition without jump. | closed |
| LCX-MOTION-04.03 | route content transition | same | packaged navigation QA | `lcx-motion-04-content-transition.json` | Content view changes use a restrained fade/short translate. | closed |
| LCX-MOTION-04.04 | no IA change | same | route/button matrix comparison | `lcx-motion-04-no-ia-change.json` | Motion does not add/remove/relabel navigation items. | closed |

### LCX-MOTION-05 - Panels, Drawers, Cards, Toasts

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-MOTION-05.01 | panels/cards | `offline.html` | packaged screenshots | `lcx-motion-05-panels.json` | Panels/cards animate opacity/shadow without nested-card drift. | closed |
| LCX-MOTION-05.02 | modal-like surfaces | same | packaged click proof | `lcx-motion-05-modal-surfaces.json` | Any modal/drawer-like surfaces enter/exit consistently. | closed |
| LCX-MOTION-05.03 | status/toast | same | UI proof | `lcx-motion-05-status-toast.json` | Status messages appear/disappear within token range. | closed |
| LCX-MOTION-05.04 | dense SaaS guard | same | screenshot review | `lcx-motion-05-density-guard.json` | UI remains operational and scan-friendly, not marketing-like. | closed |

### LCX-MOTION-06 - Loading, Empty, And Error State Motion

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-MOTION-06.01 | loading pulse | `offline.html` | source assertion | `lcx-motion-06-loading-pulse.json` | Loading states use subtle pulse/fade only. | closed |
| LCX-MOTION-06.02 | empty state | same | packaged state proof | `lcx-motion-06-empty-state.json` | Empty states appear without blocking action buttons. | closed |
| LCX-MOTION-06.03 | error state | same | packaged state proof | `lcx-motion-06-error-state.json` | Error states are immediate enough for work UI and do not bounce. | closed |
| LCX-MOTION-06.04 | no infinite distraction | same | source assertion | `lcx-motion-06-no-distraction.json` | Long-running animations are limited to loading affordances. | closed |

### LCX-MOTION-07 - Accessibility And Reduced Motion

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-MOTION-07.01 | reduced-motion source | `offline.html` | source assertion | `lcx-motion-07-reduced-source.json` | `prefers-reduced-motion: reduce` disables transform and long animation. | closed |
| LCX-MOTION-07.02 | focus visibility | same | screenshot/focus QA | `lcx-motion-07-focus.json` | Focus remains visible after motion changes. | closed |
| LCX-MOTION-07.03 | layout stability | same | screenshot review | `lcx-motion-07-layout-stability.json` | Hover/press/focus does not resize controls or shift layout. | closed |
| LCX-MOTION-07.04 | text overlap guard | same | desktop and narrow viewport screenshots | `lcx-motion-07-text-overlap.json` | Text does not overflow or overlap in Korean/English labels. | closed |

### LCX-MOTION-08 - Packaged Desktop Motion QA

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-MOTION-08.01 | packaged auth screenshots | packaged Electron app | screen QA | `lcx-motion-08-auth-screenshots/` | Sign-in, reset-request, reset-confirm, reset-success remain visually stable. | closed |
| LCX-MOTION-08.02 | packaged navigation screenshots | packaged Electron app | screen QA | `lcx-motion-08-navigation-screenshots/` | Sidebar/menu transitions are visible and not broken. | closed |
| LCX-MOTION-08.03 | button interaction proof | packaged Electron app | button matrix click proof | `lcx-motion-08-button-matrix.json` | Buttons still click and expose no dead interactions. | closed |
| LCX-MOTION-08.04 | no console/page errors | packaged Electron app | QA log inspection | `lcx-motion-08-console.json` | No unexpected console or page errors from motion code. | closed |

### LCX-MOTION-09 - Motion Closeout

| Child TUW | Lane | Planned Files / Modules | Test / Validator | Evidence | Exit Gate | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-MOTION-09.01 | evidence index | docs/evidence | source review | `lcx-motion-closeout-2026-07-02.json` | All motion child evidence is indexed. | closed |
| LCX-MOTION-09.02 | sloplint receipt | changed UI files | `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed` | `lcx-motion-09-sloplint.json` | No strong/default AI UI-copy flags remain unexplained. | closed |
| LCX-MOTION-09.03 | final status | parent plan and traceability | source review | this traceability file | Motion rows are closed, closed_external, or retired by owner decision. | closed |
| LCX-MOTION-09.04 | release boundary | docs/desktop release notes if touched | claim-boundary grep | `lcx-motion-release-boundary.md` | No public release/go-live/owner approval claim added. | closed |

## Final Validation Matrix

| Validator | Required For | Pass Condition |
| --- | --- | --- |
| `git diff --check` | all changed files | exits 0 |
| `node --test scripts/test/protected-reset-accounts.test.mjs` | `LCX-DPRS-01..04` | protected denial and QA allow cases pass |
| `node --test apps/api/test/matter-temp-desktop-runtime-lambda.test.js` | reset backend compatibility | exits 0 |
| `npm run matter-vault:user-registration:validate` | dedicated QA seed account | exits 0 with registered account count 10 |
| `npm --workspace apps/desktop run test:smoke` | desktop renderer/main/preload compatibility | exits 0 |
| `npm run matter-desktop:aws-runtime:smoke` | live runtime smoke after protection | exits 0 without default protected-account reset |
| `npm run matter-desktop:screen-qa` | packaged screen QA after protection | exits 0 using non-protected QA account |
| `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed` | UI/copy changes | pass or documented intentional flags |
| secret-material grep | all evidence artifacts | no unredacted reset token, reset URL, password, operator token, bearer token, cookie, or AWS credential |

## Stop Conditions

Stop and ask before writing or executing if:

1. the dedicated synthetic QA account `matter.desktop.qa@amic.kr` cannot be selected without a production write;
2. a protected account reset is explicitly requested for `jwsuh@amic.kr`;
3. a secret-material hit exists in generated evidence and cannot be safely redacted;
4. packaged Electron QA shows layout overlap that requires a broader redesign;
5. LazyCodex tooling becomes available with a stricter schema than this repo-native TUW plan.
