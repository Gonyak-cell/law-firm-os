# LazyCodex LCX-HRX-SFT Production Rollout Plan

Date: 2026-06-28
Status: `planning_ready`
Branch observed: `codex/hrx-member-roster-source-of-truth`
HEAD observed: `807e781c2`
Scope: current People/HRX worktree changes for the matter web app
Production execution: not started
Production readiness claim: not made
Go-live approval: not granted
Detailed TUW plan: `docs/lazycodex/people-reflection/lcx-hrx-sft-production-rollout-tuw-plan-2026-06-28.md`
Execution ledger: `docs/lazycodex/people-reflection/lcx-hrx-sft-production-execution-ledger-2026-06-28.json`

## Objective

Move the current People/HRX changes from local validated worktree state to a production-ready release candidate, then through staging/UAT, human go-live approval, production deployment, and post-deploy receipt capture.

This plan covers all current People/HRX changes in the working tree:

- HRX roster Source of Truth preservation and API-backed roster rendering.
- Shiftee-style People navigation and feature catalog.
- Korean HR SaaS terminology cleanup using `구성원` as the person noun.
- Removal/replacement of confusing People labels such as `법률 People`, `관계망`, `충돌·윤리벽`, `활동 기록`, `인사 현황`, `권한 관리`.
- `People > 근무일정 > 외부일정` for 법원, 검찰, 우체국, 세무서, 관청.
- `People > 입퇴사 관리` layout cleanup.
- 구성원 row click detail drawer parity with the topbar notification drawer.
- Validators, UI regression tests, LazyCodex proof artifacts, and package scripts added for the above.

## Claim Boundary

| Claim | Current state | Required before changing state |
| --- | --- | --- |
| Local implementation complete | `true` for current batch | Keep current source/tests/proofs together in one release candidate. |
| Local browser QA complete | `true` for current batch | Preserve proof JSON and screenshots in the release candidate. |
| Runtime UI validated | `true` for current batch | Re-run validators after final staging build. |
| Payroll provider live | `false` | Provider receipt, contract, secrets, audit proof. |
| Electronic contract provider live | `false` | Provider receipt, contract, secrets, audit proof. |
| Production ready | `false` | Staging pass, security/guard pass, human release disposition. |
| Go-live approved | `false` | Human approval receipt after staging/UAT and rollback review. |
| Production deployed | `false` | Deployment receipt, commit SHA, environment, timestamp, smoke results. |

Do not edit `docs/lazycodex/people-reflection/lcx-hrx-sft-task-ledger.json` to `production_ready: true` until the production readiness gate below is satisfied.

## In-Scope Release Payload

### Product/runtime files

- `apps/web/src/components/Shell.jsx`
- `apps/web/src/people/PeopleHome.tsx`
- `apps/web/src/people/employees/PeopleWorkforceDirectory.tsx`
- `apps/web/src/people/lifecycle/LifecycleBoard.tsx`
- `apps/web/src/styles.css`
- `apps/web/src/people/peopleFeatureCatalog.js`

### Tests and validators

- `apps/web/test/ui-regression.test.mjs`
- `package.json`
- `scripts/run-lcx8-people-sidebar-current-ui-proof.mjs`
- `scripts/validate-hrx-ui-api-backed.mjs`
- `scripts/validate-lcx-ppl-ui.mjs`
- `scripts/validate-lcx-hrx-sft-completion.mjs`
- `scripts/validate-lcx-hrx-sft-feature-catalog.mjs`
- `scripts/validate-lcx-hrx-sft-roster-source.mjs`

### LazyCodex evidence

- `docs/lazycodex/people-reflection/lcx-hrx-sft-baseline-2026-06-28.md`
- `docs/lazycodex/people-reflection/lcx-hrx-sft-task-ledger.json`
- `docs/lazycodex/people-reflection/lcx-hrx-shiftee-full-adoption-plan-2026-06-28.md`
- `docs/lazycodex/evidence/matter-web/artifacts/lcx-hrx-sft-people-navigation-browser-proof.json`
- `docs/lazycodex/evidence/matter-web/artifacts/lcx-hrx-sft-people-navigation-browser-proof.md`
- `docs/lazycodex/evidence/matter-web/artifacts/lcx-hrx-sft-people-lifecycle-cleanup-proof.json`
- `docs/lazycodex/evidence/matter-web/artifacts/lcx-hrx-sft-people-lifecycle-cleanup-proof.png`
- `docs/lazycodex/evidence/matter-web/artifacts/lcx-hrx-people-detail-drawer-parity-proof.json`
- `docs/lazycodex/evidence/matter-web/artifacts/lcx-hrx-people-detail-drawer-parity-proof.png`

### Explicitly excluded unless confirmed

- `docs/ui-reference/prototypes/matter-launch-login-dashboard-2026-06-25.html`

Reason: this file is currently untracked and appears to be a prototype/reference artifact, not part of the People/HRX production release payload.

## Release Sequence

### L0. Evidence Freeze

Goal: freeze the current release candidate inputs before staging.

Required actions:

1. Capture `git status --short`, branch, and HEAD.
2. Confirm no unrelated dirty files are included in the People/HRX release payload.
3. Confirm LazyCodex evidence paths exist and point to current screenshots/JSON.
4. Confirm `lcx-hrx-sft-task-ledger.json` still keeps production/go-live claims false.

Gate commands:

```bash
git status --short
git branch --show-current
git log -1 --oneline
npm run lcx:hrx-sft:validate
```

Exit criteria:

- Release payload file list is frozen.
- Out-of-scope prototype file is either excluded or explicitly accepted by a human.
- No production readiness or go-live claim is made.

### L1. Source Candidate Commit

Goal: create a reviewable release candidate commit containing only the in-scope payload.

Required actions:

1. Stage only the in-scope files listed above.
2. Commit with a message that states this is a People/HRX production-candidate bundle, not a production deployment.
3. Push the branch.
4. Open a PR or update the current PR with the LazyCodex plan and evidence links.

Suggested commit message:

```text
Prepare HRX People production rollout candidate
```

Exit criteria:

- PR contains exact commit SHA.
- PR description links this plan and browser proof JSON files.
- PR states `production_deployed=false`, `go_live_approved=false`.

### L2. CI and Local Gate Bundle

Goal: prove the source candidate is internally consistent before staging.

Required commands:

```bash
npm --workspace apps/web run test:ui
npm --workspace apps/web run build
npm run hrx:ui:validate
npm run lcx:ppl:ui:validate
npm run lcx:hrx-sft:catalog:validate
npm run lcx:hrx-sft:roster:validate
npm run lcx:hrx-sft:validate
git diff --check
python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed
```

Current local evidence already observed:

- `test:ui` PASS 17/17.
- `build` PASS with existing Vite chunk warning only.
- `hrx:ui:validate` PASS.
- `lcx:ppl:ui:validate` PASS.
- `lcx:hrx-sft:validate` PASS.
- `git diff --check` PASS.
- Sloplint reports weak stylesheet flags only; People detail drawer weak blur/shadow flags are intentional because they match the existing notification drawer.

Exit criteria:

- CI matches local results.
- Any new failure is fixed before staging.
- No test is weakened to pass.

### L3. Staging Deploy

Goal: deploy the release candidate to a production-equivalent staging environment without touching production.

Required actions:

1. Deploy API and web from the same commit SHA.
2. Confirm API proxy points to staging API, not local `127.0.0.1`.
3. Confirm roster Source of Truth is present in the packaged/deployed artifact or reachable through the expected runtime path.
4. Confirm no provider secrets are present for unapproved payroll/e-contract paths unless provider receipts exist.

Staging smoke checks:

```text
GET /api/hrx/employees
GET /api/hrx/lifecycle/onboarding
GET /api/hrx/lifecycle/offboarding
```

Expected:

- 200 for authorized staging operator.
- Fail-closed for denied/review contexts.
- No local fixture-only fallback visible in UI.

Exit criteria:

- Staging deploy receipt records environment, commit SHA, timestamp, and operator.
- API and web are on the same SHA.
- No production state is changed.

### L4. Staging Browser QA

Goal: reproduce local browser QA against staging.

Required flows:

1. `People > 관리 > 구성원`
   - 김양태 / PETRA BRIDGE PARTNERS / Finance remains API-backed.
   - Organization view remains AMIC 4, PETRA BRIDGE 3, Staff 2.
   - Row click opens the right detail drawer.
   - Detail drawer matches notification drawer width, scrim, right edge, z-index, and `notification-drawer-in` animation.

2. `People > 근무일정 > 외부일정`
   - Shows 법원, 검찰, 우체국, 세무서, 관청.
   - Stays in setup state where backend/provider proof is not complete.

3. `People > 관리 > 입퇴사 관리`
   - Main board appears left; `입퇴사 대상` compact list appears right.
   - Status tabs do not wrap.
   - No body horizontal overflow.
   - Headers visible as `구성원`, `소속`.

4. Guard states
   - `ctx=denied` and `ctx=review` do not expose mutation affordances.
   - No production-ready or provider-live copy is visible.

Required staging proof output:

```text
docs/lazycodex/evidence/matter-web/artifacts/<staging-date>-people-navigation-browser-proof.json
docs/lazycodex/evidence/matter-web/artifacts/<staging-date>-people-lifecycle-cleanup-proof.json
docs/lazycodex/evidence/matter-web/artifacts/<staging-date>-people-detail-drawer-parity-proof.json
```

Exit criteria:

- Browser proof passes with no console errors or unexpected API 4xx/5xx.
- Screenshots are reviewed for Korean text overflow and drawer visual parity.

### L5. Security, Permission, and Provider Gate

Goal: confirm production cannot expose unproven write/provider behavior.

Required checks:

1. Denied/review contexts hide People mutation affordances.
2. Payroll and electronic contract surfaces remain `integration_required`, `audit_required`, or boundary panels unless provider receipts are attached.
3. No Matter permission grant is moved into People.
4. No legal relationship/conflict-wall menu is reintroduced under People.
5. No `지점` primary menu is introduced for a branchless law firm.
6. No UI hardcoded roster fallback replaces API-backed roster values.

Exit criteria:

- Security reviewer or release owner signs off.
- Any unresolved item becomes a release blocker or a documented disabled feature.

### L6. Human UAT and Go/No-Go

Goal: get explicit human approval before production.

Required UAT script:

- Review all People left-nav labels.
- Open 구성원 list and detail panel.
- Open 조직 view.
- Open 입퇴사 관리.
- Open 근무일정 > 외부일정.
- Confirm payroll/e-contract are not implied live.
- Confirm `구성원` is used as the person noun.

Approval receipt must include:

- Approver.
- Date/time.
- Commit SHA.
- Staging URL.
- Browser proof artifact paths.
- Known disabled features.
- Rollback plan accepted.

Exit criteria:

- `go_live_approved=true` may only be claimed after this receipt exists.

### L7. Production Deploy

Goal: deploy exactly the approved SHA to production.

Required actions:

1. Confirm production deployment target and operator.
2. Confirm rollback artifact is available.
3. Deploy API and web from the same approved SHA.
4. Record deployment receipt.
5. Do not enable payroll/e-contract provider execution unless separate provider receipts are attached.

Production smoke checks:

- App loads.
- People navigation loads.
- Authorized operator can read 구성원.
- 구성원 detail drawer opens and matches notification drawer.
- 외부일정 setup state loads.
- 입퇴사 관리 loads.
- Denied/review guard states remain fail-closed.

Exit criteria:

- Production smoke proof captured.
- No unexpected console errors.
- No unexpected API 4xx/5xx for authorized read flows.
- Rollback not triggered.

### L8. Post-Deploy Closeout

Goal: update LazyCodex receipts without overstating readiness.

Required closeout artifacts:

```text
docs/lazycodex/people-reflection/lcx-hrx-sft-production-closeout-<date>.md
docs/lazycodex/evidence/matter-web/artifacts/<date>-people-production-smoke-proof.json
```

Update rules:

- Set `production_deployed=true` only after production deploy receipt exists.
- Set `production_ready=true` only if release owner explicitly marks readiness complete.
- Keep `payroll_provider_live=false` and `electronic_contract_provider_live=false` unless separate provider receipts exist.
- Keep `go_live_approved=false` unless the human approval receipt exists.

Exit criteria:

- Closeout points to exact production SHA and smoke proof.
- No local-only proof is represented as production truth.

## No-Go Conditions

Stop before production if any of these occur:

- CI or staging validation fails.
- Browser proof shows text overflow, broken drawer animation, or API errors.
- Roster values render from UI hardcoding instead of API payloads.
- Denied/review guard exposes mutation actions.
- Payroll/e-contract copy implies provider live without provider receipt.
- Approver has not signed go-live.
- Production rollback path is not ready.
- The in-scope file list is mixed with unrelated prototype/reference files.

## Rollback Plan

Rollback trigger:

- Production smoke fails.
- People navigation blocks normal app use.
- API-backed roster read fails for authorized operators.
- Guard state leaks sensitive or mutation affordances.

Rollback action:

1. Revert deployment to the previous production SHA.
2. Preserve failed production proof JSON and screenshots.
3. Do not rewrite LazyCodex evidence as PASS.
4. Open a remediation branch from the failed SHA.

Rollback receipt:

- Previous SHA.
- Failed SHA.
- Trigger.
- Timestamp.
- Operator.
- Smoke result after rollback.

## Recommended Release Prompt

```text
Use LazyCodex to promote the current People/HRX release candidate through staging only.

Scope:
- Include the files listed in docs/lazycodex/people-reflection/lcx-hrx-sft-production-rollout-plan-2026-06-28.md.
- Exclude docs/ui-reference/prototypes/matter-launch-login-dashboard-2026-06-25.html unless explicitly approved.

Required gates:
- test:ui, build, hrx:ui:validate, lcx:ppl:ui:validate, lcx:hrx-sft:* validators, diff check, sloplint.
- Staging browser QA for 구성원, 조직, 외부일정, 입퇴사 관리, 구성원 상세 drawer parity, denied/review guard.

Claim boundary:
- Do not claim production_ready, production_deployed, provider_live, or go_live_approved.
- Produce staging receipts and stop for human go/no-go.
```
