# LCX-HRX-SFT Production Rollout TUW Plan

Date: 2026-06-28
Status: `planning_ready`
Parent plan: `docs/lazycodex/people-reflection/lcx-hrx-sft-production-rollout-plan-2026-06-28.md`
Branch observed: `codex/hrx-member-roster-source-of-truth`
HEAD observed: `807e781c2`
Production execution: `false`
Production readiness claim: `false`
Go-live approval: `false`

## Goal

Break the People/HRX production rollout into small testable units of work that can be executed, validated, reviewed, and stopped independently. Each TUW has an observable output and a specific verification gate.

## Status Legend

| Status | Meaning |
| --- | --- |
| `todo` | Not started. |
| `ready` | Inputs are present and the unit can start. |
| `active` | Work is underway. |
| `blocked` | Requires external environment, receipt, human decision, or secret. |
| `done-local` | Passed local source/build/browser validation only. |
| `done-staging` | Passed staging validation. |
| `done-production` | Passed production validation with receipt. |

## Global Claim Boundary

No TUW may set any of these flags to true unless its required receipt exists:

- `production_ready`
- `production_deployed`
- `go_live_approved`
- `payroll_provider_live`
- `electronic_contract_provider_live`

The current expected state remains:

```json
{
  "production_ready": false,
  "production_deployed": false,
  "go_live_approved": false,
  "payroll_provider_live": false,
  "electronic_contract_provider_live": false
}
```

## TUW Index

| TUW | Status | Unit | Primary proof |
| --- | --- | --- | --- |
| `LCX-HRX-PROD-00` | ready | Release scope freeze | Payload manifest and dirty-state receipt |
| `LCX-HRX-PROD-01` | ready | Out-of-scope file quarantine | Prototype exclusion receipt |
| `LCX-HRX-PROD-02` | ready | Roster Source of Truth gate | Roster validator pass |
| `LCX-HRX-PROD-03` | ready | People navigation catalog gate | Catalog validator pass |
| `LCX-HRX-PROD-04` | ready | Korean terminology and removed-label guard | UI regression and grep receipt |
| `LCX-HRX-PROD-05` | ready | External schedule surface gate | Browser proof for 법원/검찰/우체국/세무서/관청 |
| `LCX-HRX-PROD-06` | ready | 입퇴사 관리 layout gate | Browser layout proof |
| `LCX-HRX-PROD-07` | ready | 구성원 상세 drawer parity gate | Browser computed-style proof |
| `LCX-HRX-PROD-08` | ready | Permission and provider boundary gate | Guard/provider claim audit |
| `LCX-HRX-PROD-09` | ready | Local validation bundle | Test/build/validator receipts |
| `LCX-HRX-PROD-10` | ready | Local browser QA bundle | Browser JSON and screenshots |
| `LCX-HRX-PROD-11` | todo | Release candidate commit and PR | Commit SHA and PR receipt |
| `LCX-HRX-PROD-12` | todo | CI parity gate | CI run receipt |
| `LCX-HRX-PROD-13` | blocked | Staging deployment | Staging deploy receipt |
| `LCX-HRX-PROD-14` | blocked | Staging API smoke | Staging API smoke receipt |
| `LCX-HRX-PROD-15` | blocked | Staging browser QA | Staging browser proof bundle |
| `LCX-HRX-PROD-16` | blocked | Security and provider review | Human/security disposition |
| `LCX-HRX-PROD-17` | blocked | UAT and go/no-go | Human go-live receipt |
| `LCX-HRX-PROD-18` | blocked | Production deploy preflight | Preflight receipt |
| `LCX-HRX-PROD-19` | blocked | Production deploy | Production deploy receipt |
| `LCX-HRX-PROD-20` | blocked | Production smoke and closeout | Production smoke proof and closeout doc |

## Detailed TUWs

### LCX-HRX-PROD-00: Release Scope Freeze

Purpose:
Freeze exactly what is being promoted before any commit, PR, or deploy step.

Inputs:

- Current worktree.
- `docs/lazycodex/people-reflection/lcx-hrx-sft-production-rollout-plan-2026-06-28.md`.
- Current LazyCodex browser evidence artifacts.

Work:

1. Capture `git status --short`, branch, and HEAD.
2. Produce a file-level payload manifest.
3. Confirm every file belongs to People/HRX production rollout scope.
4. Record excluded files separately.

Test command:

```bash
git status --short
git branch --show-current
git log -1 --oneline
```

Deliverable:

- Payload block in PR description or a receipt under `docs/lazycodex/people-reflection/`.

Done criteria:

- Payload list is explicit.
- `docs/ui-reference/prototypes/matter-launch-login-dashboard-2026-06-25.html` is excluded unless separately approved.
- No production/go-live claim is made.

### LCX-HRX-PROD-01: Out-of-Scope File Quarantine

Purpose:
Prevent unrelated prototype/reference files from entering the production release.

Inputs:

- `git status --short`.
- In-scope payload list from the parent plan.

Work:

1. Identify dirty or untracked files not listed in the release payload.
2. Mark each as `exclude`, `include`, or `needs_human_decision`.
3. Do not stage excluded files.

Test command:

```bash
git diff --name-only
git ls-files --others --exclude-standard
```

Deliverable:

- Release staging list.

Done criteria:

- Only People/HRX release payload files are staged.
- Prototype HTML remains uncommitted or receives explicit human approval.

### LCX-HRX-PROD-02: Roster Source of Truth Gate

Purpose:
Ensure production candidate keeps roster-backed People data and does not regress to UI hardcoding.

Inputs:

- `docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json`
- `apps/api/src/hrx-member-roster-registry.js`
- `apps/web/src/people/employees/PeopleWorkforceDirectory.tsx`
- `apps/web/src/people/employees/EmployeeProfile.tsx`

Work:

1. Verify API registry still reads roster Source of Truth.
2. Verify People list/detail prefer API fields for 소속, 부서, 조직, 직위, 이메일.
3. Verify 김양태 / PETRA BRIDGE PARTNERS / Finance expected baseline.

Test command:

```bash
npm run lcx:hrx-sft:roster:validate
npm run hrx:ui:validate
```

Manual QA:

- Open `People > 관리 > 구성원`.
- Confirm 김양태 and PETRA BRIDGE values render from the API response.

Deliverable:

- Roster validator receipt.
- Browser proof if run outside local environment.

Done criteria:

- Validator exits 0.
- No UI-only hardcoded roster fallback is introduced.

### LCX-HRX-PROD-03: People Navigation Catalog Gate

Purpose:
Ensure Shiftee-style People navigation and state classification remain complete and honest.

Inputs:

- `apps/web/src/people/peopleFeatureCatalog.js`
- `apps/web/src/components/Shell.jsx`
- `apps/web/src/people/PeopleHome.tsx`

Work:

1. Verify all People menu groups and feature items load from the catalog.
2. Verify setup/integration/audit states remain explicit.
3. Verify payroll/e-contract are not marked live.

Test command:

```bash
npm run lcx:hrx-sft:catalog:validate
npm run lcx:hrx-sft:validate
```

Manual QA:

- Navigate through People sidebar groups.
- Confirm setup-state pages render for non-active items.

Deliverable:

- Catalog validator receipt.

Done criteria:

- Feature count and state counts match validator expectations.
- No provider-live claim is visible.

### LCX-HRX-PROD-04: Korean Terminology and Removed-Label Guard

Purpose:
Prevent the UI from regressing to awkward or wrong People/HR copy.

Inputs:

- `apps/web/src/components/Shell.jsx`
- `apps/web/src/people/PeopleHome.tsx`
- `apps/web/test/ui-regression.test.mjs`

Work:

1. Keep user-facing person noun as `구성원`.
2. Preserve Korean HR SaaS menu terms.
3. Confirm removed labels are absent:
   - `법률 People`
   - `관계망`
   - `충돌·윤리벽`
   - `활동 기록`
   - `인사 현황`
   - `권한 관리`
4. Confirm `이해상충` is used only where the product surface requires legal conflict context.

Test command:

```bash
npm --workspace apps/web run test:ui
rg -n "법률 People|관계망|충돌·윤리벽|활동 기록|인사 현황|권한 관리" apps/web/src docs/lazycodex/people-reflection || true
```

Manual QA:

- Review People sidebar in Korean.

Deliverable:

- UI regression receipt.

Done criteria:

- Regression tests pass.
- No removed visible label is present in product source.

### LCX-HRX-PROD-05: External Schedule Surface Gate

Purpose:
Ensure court/prosecutor/post office/tax office/agency work lives under `People > 근무일정 > 외부일정`.

Inputs:

- `apps/web/src/people/peopleFeatureCatalog.js`
- `apps/web/src/people/PeopleHome.tsx`
- Browser proof path from local QA.

Work:

1. Verify `people-work-schedule-external` belongs to `근무일정`.
2. Verify 법원, 검찰, 우체국, 세무서, 관청 are visible in the setup surface.
3. Verify it is not mounted under Matter or unrelated People legal graph menus.

Test command:

```bash
npm run lcx:hrx-sft:catalog:validate
npm run lcx:hrx-sft:validate
```

Manual QA:

- Open `/?locale=ko&view=people&data=live&ctx=allow#people-work-schedule-external`.
- Confirm the five external schedule types render.

Deliverable:

- Browser proof JSON:
  `docs/lazycodex/evidence/matter-web/artifacts/lcx-hrx-sft-people-navigation-browser-proof.json`

Done criteria:

- Browser proof has `has_court`, `has_prosecutor`, `has_post_office`, `has_tax_office`, `has_agency` all true.

### LCX-HRX-PROD-06: 입퇴사 관리 Layout Gate

Purpose:
Ensure the lifecycle screen reads as an HR operations screen, not a compressed full roster page.

Inputs:

- `apps/web/src/people/PeopleHome.tsx`
- `apps/web/src/people/employees/PeopleWorkforceDirectory.tsx`
- `apps/web/src/people/lifecycle/LifecycleBoard.tsx`
- `apps/web/src/styles.css`

Work:

1. Confirm `LifecycleBoard` is the primary left panel.
2. Confirm `PeopleWorkforceDirectory compact` renders as `입퇴사 대상`.
3. Confirm status tabs do not wrap.
4. Confirm body and roster table do not horizontally overflow.
5. Confirm compact table visible headers are `구성원`, `소속`.

Test command:

```bash
npm --workspace apps/web run test:ui
```

Manual QA:

- Open `/?locale=ko&view=people&data=live&ctx=allow#people-lifecycle`.
- Confirm `입사 준비 업무` and `퇴사 정리 업무` section heads are visible.

Deliverable:

- Browser proof JSON:
  `docs/lazycodex/evidence/matter-web/artifacts/lcx-hrx-sft-people-lifecycle-cleanup-proof.json`
- Screenshot:
  `docs/lazycodex/evidence/matter-web/artifacts/lcx-hrx-sft-people-lifecycle-cleanup-proof.png`

Done criteria:

- `wrappedTabs` is empty.
- `wrappedHeaders` is empty.
- `bodyOverflow=false`.
- `rosterTableOverflow=false`.

### LCX-HRX-PROD-07: 구성원 상세 Drawer Parity Gate

Purpose:
Ensure clicking a 구성원 row opens the same size and animation pattern as the topbar notification drawer.

Inputs:

- `apps/web/src/people/PeopleHome.tsx`
- `apps/web/src/styles.css`
- `apps/web/test/ui-regression.test.mjs`

Work:

1. Compare notification drawer and People detail drawer computed styles.
2. Verify both use width `440`, right edge `0`, z-index `140`, same scrim, same box shadow, and `notification-drawer-in`.
3. Verify reduced-motion and mobile width rules include `.people-detail-panel`.

Test command:

```bash
npm --workspace apps/web run test:ui
```

Manual QA:

- Click topbar bell and observe drawer.
- Close it.
- Click a 구성원 row and observe the detail drawer.

Deliverable:

- Browser proof JSON:
  `docs/lazycodex/evidence/matter-web/artifacts/lcx-hrx-people-detail-drawer-parity-proof.json`
- Screenshot:
  `docs/lazycodex/evidence/matter-web/artifacts/lcx-hrx-people-detail-drawer-parity-proof.png`

Done criteria:

- `sameWidth=true`.
- `sameAnimationName=true`.
- `sameAnimationDuration=true`.
- `sameAnimationTiming=true`.
- `sameScrimBackground=true`.
- `sameLayerZIndex=true`.
- `sameRightEdge=true`.
- `noConsoleErrors=true`.

### LCX-HRX-PROD-08: Permission and Provider Boundary Gate

Purpose:
Ensure production candidate does not imply unproven authority or provider execution.

Inputs:

- `docs/lazycodex/people-reflection/lcx-hrx-sft-task-ledger.json`
- `apps/web/src/people/peopleFeatureCatalog.js`
- HRX guard UI.

Work:

1. Confirm `production_ready=false`.
2. Confirm `go_live_approved=false`.
3. Confirm `payroll_provider_live=false`.
4. Confirm `electronic_contract_provider_live=false`.
5. Confirm denied/review states fail closed.

Test command:

```bash
npm run lcx:hrx-sft:validate
npm run hrx:ui:validate
npm run lcx:ppl:ui:validate
```

Manual QA:

- Open People with `ctx=denied`.
- Open People with `ctx=review`.
- Confirm mutation actions do not appear as usable execution.

Deliverable:

- Validator receipt.
- Guard-state screenshot or browser proof when run in staging/production.

Done criteria:

- No provider-live, production-ready, or go-live language is visible without a receipt.

### LCX-HRX-PROD-09: Local Validation Bundle

Purpose:
Run the complete local validation set before creating the release candidate.

Inputs:

- Full in-scope payload.

Test command:

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

Deliverable:

- Local validation receipt in PR description or LazyCodex closeout doc.

Done criteria:

- All commands exit 0.
- Existing Vite chunk warning is recorded as non-blocking.
- Sloplint weak drawer blur/shadow findings are documented as intentional parity with notification drawer.

### LCX-HRX-PROD-10: Local Browser QA Bundle

Purpose:
Drive the current UI surfaces through a real browser before staging.

Inputs:

- Local web server.
- Local API server.
- Current browser proof scripts or one-off Playwright proof commands.

Work:

1. Run People navigation proof.
2. Run lifecycle cleanup proof.
3. Run drawer parity proof.
4. Capture screenshots.
5. Record console/API errors.

Deliverables:

- `lcx-hrx-sft-people-navigation-browser-proof.json`
- `lcx-hrx-sft-people-lifecycle-cleanup-proof.json`
- `lcx-hrx-people-detail-drawer-parity-proof.json`

Done criteria:

- All proofs pass.
- Screenshots match expected UI.
- No unexpected console errors.

### LCX-HRX-PROD-11: Release Candidate Commit and PR

Purpose:
Create a reviewable source candidate.

Inputs:

- TUW-00 through TUW-10 done locally.

Work:

1. Stage only in-scope release payload files.
2. Commit.
3. Push.
4. Open or update PR.

Suggested commit message:

```text
Prepare HRX People production rollout candidate
```

Test command:

```bash
git diff --cached --name-only
git commit -m "Prepare HRX People production rollout candidate"
git push
```

Deliverable:

- Commit SHA.
- PR URL.

Done criteria:

- PR description links parent plan and this TUW plan.
- PR states production/go-live claims remain false.

### LCX-HRX-PROD-12: CI Parity Gate

Purpose:
Ensure CI matches local validation before staging.

Inputs:

- PR from TUW-11.

Work:

1. Wait for CI.
2. Fetch failing logs if any.
3. Fix test/code issues without weakening tests.
4. Re-run until green or explicitly blocked by infrastructure.

Test command:

```bash
gh pr checks --watch
gh pr view --json headRefName,commits,statusCheckRollup
```

Deliverable:

- CI receipt with run URL or PR check summary.

Done criteria:

- Required checks are green.
- Any skipped check is named with owner and reason.

### LCX-HRX-PROD-13: Staging Deployment

Purpose:
Deploy the approved source candidate to production-equivalent staging.

Inputs:

- Green PR/commit SHA.
- Staging environment access.
- Rollback target SHA.

Work:

1. Deploy web and API from same SHA.
2. Confirm API proxy target is staging, not localhost.
3. Confirm roster Source of Truth is packaged/reachable.
4. Confirm no unapproved provider secrets are enabled.

Deliverable:

- Staging deploy receipt with environment, SHA, operator, timestamp.

Done criteria:

- Staging app loads.
- Web and API report same release SHA or deployment receipt ties both to the same SHA.
- Production remains untouched.

### LCX-HRX-PROD-14: Staging API Smoke

Purpose:
Confirm staging HRX reads and guards work before browser QA.

Inputs:

- Staging deployment from TUW-13.

Test routes:

```text
GET /api/hrx/employees
GET /api/hrx/lifecycle/onboarding
GET /api/hrx/lifecycle/offboarding
```

Expected:

- Authorized operator receives 200.
- Denied/review context fails closed.
- No 5xx.

Deliverable:

- Staging API smoke JSON.

Done criteria:

- All expected authorized reads pass.
- Guard-state probes do not leak protected data.

### LCX-HRX-PROD-15: Staging Browser QA

Purpose:
Reproduce local browser proofs against staging.

Inputs:

- Staging app URL.
- Authorized test operator.

Work:

1. Drive `People > 관리 > 구성원`.
2. Drive 조직 view.
3. Drive 구성원 detail drawer parity.
4. Drive `People > 근무일정 > 외부일정`.
5. Drive `People > 관리 > 입퇴사 관리`.
6. Drive denied/review guard states.

Deliverables:

- `<staging-date>-people-navigation-browser-proof.json`
- `<staging-date>-people-lifecycle-cleanup-proof.json`
- `<staging-date>-people-detail-drawer-parity-proof.json`
- Screenshots for each flow.

Done criteria:

- All local proof invariants pass against staging.
- No unexpected API errors.
- Korean text has no wrapping/overflow regression.

### LCX-HRX-PROD-16: Security and Provider Review

Purpose:
Block production if authority, payroll, e-contract, or guard claims are not safe.

Inputs:

- Staging proof bundle.
- Provider/secret configuration.
- Security reviewer or release owner.

Work:

1. Review denied/review guards.
2. Review payroll/e-contract states.
3. Review People versus Matter permission boundaries.
4. Review absence of removed legal graph/conflict-wall labels under People.
5. Review audit requirements for any write-like surface.

Deliverable:

- Security/provider disposition note.

Done criteria:

- Reviewer signs off, or blocker is recorded.
- Provider-live flags remain false unless provider receipts exist.

### LCX-HRX-PROD-17: UAT and Go/No-Go

Purpose:
Get human approval before production.

Inputs:

- Staging browser QA.
- Security/provider disposition.
- Rollback plan.

UAT script:

1. Review People menu labels.
2. Open 구성원 list.
3. Open 구성원 detail drawer.
4. Open 조직 view.
5. Open 입퇴사 관리.
6. Open 근무일정 > 외부일정.
7. Confirm payroll/e-contract are not implied live.
8. Confirm `구성원` is used consistently.

Deliverable:

- Human go/no-go receipt.

Done criteria:

- Receipt includes approver, date/time, staging URL, SHA, known disabled features, rollback acceptance.
- `go_live_approved=true` is still not claimed unless this receipt explicitly grants it.

### LCX-HRX-PROD-18: Production Deploy Preflight

Purpose:
Confirm production can be deployed and rolled back safely.

Inputs:

- Human go-live approval.
- Production environment.
- Rollback artifact.

Work:

1. Confirm deploy target.
2. Confirm approved SHA.
3. Confirm rollback SHA.
4. Confirm operator.
5. Confirm no unapproved provider secret enablement.

Deliverable:

- Production preflight receipt.

Done criteria:

- Approved SHA and rollback SHA are recorded.
- Preflight does not mutate production.

### LCX-HRX-PROD-19: Production Deploy

Purpose:
Deploy the exact approved SHA to production.

Inputs:

- Preflight receipt from TUW-18.

Work:

1. Deploy web and API from approved SHA.
2. Record timestamp and operator.
3. Capture deployment receipt.
4. Do not enable unapproved provider execution.

Deliverable:

- Production deploy receipt.

Done criteria:

- Production deployment completes.
- Deployment receipt ties production to the approved SHA.
- Rollback remains available.

### LCX-HRX-PROD-20: Production Smoke and Closeout

Purpose:
Prove production behavior and close the LazyCodex release without overclaiming.

Inputs:

- Production deploy receipt.

Production smoke:

1. App loads.
2. People navigation loads.
3. Authorized operator can read 구성원.
4. 구성원 detail drawer opens and matches notification drawer.
5. 외부일정 setup state loads.
6. 입퇴사 관리 loads.
7. Denied/review guard states remain fail-closed.

Deliverables:

- `docs/lazycodex/evidence/matter-web/artifacts/<date>-people-production-smoke-proof.json`
- `docs/lazycodex/people-reflection/lcx-hrx-sft-production-closeout-<date>.md`

Done criteria:

- Production smoke proof passes.
- Closeout records exact production SHA.
- `production_deployed=true` is set only if deployment receipt exists.
- `production_ready=true` is set only with release owner readiness disposition.
- `go_live_approved=true` is set only with human go-live receipt.
- Payroll/e-contract provider flags remain false unless separate provider receipts exist.

## Execution Order

Run in this order:

```text
00 -> 01 -> 02 -> 03 -> 04 -> 05 -> 06 -> 07 -> 08 -> 09 -> 10 -> 11 -> 12 -> 13 -> 14 -> 15 -> 16 -> 17 -> 18 -> 19 -> 20
```

Hard stop points:

- Stop after `LCX-HRX-PROD-12` if CI is not green.
- Stop after `LCX-HRX-PROD-15` if staging browser proof fails.
- Stop after `LCX-HRX-PROD-16` if security/provider review is not signed.
- Stop after `LCX-HRX-PROD-17` unless human go-live approval is explicit.
- Stop before `LCX-HRX-PROD-19` if rollback target is missing.

## Current Local Evidence Already Available

These local proofs can satisfy the local portions of TUW-02 through TUW-10 after re-running on the final release candidate SHA:

- `npm --workspace apps/web run test:ui` PASS 17/17.
- `npm --workspace apps/web run build` PASS with existing Vite chunk warning only.
- `npm run hrx:ui:validate` PASS.
- `npm run lcx:ppl:ui:validate` PASS.
- `npm run lcx:hrx-sft:validate` PASS.
- `git diff --check` PASS.
- `docs/lazycodex/evidence/matter-web/artifacts/lcx-hrx-sft-people-navigation-browser-proof.json`.
- `docs/lazycodex/evidence/matter-web/artifacts/lcx-hrx-sft-people-lifecycle-cleanup-proof.json`.
- `docs/lazycodex/evidence/matter-web/artifacts/lcx-hrx-people-detail-drawer-parity-proof.json`.

Do not reuse local proof as staging or production truth. Re-run equivalent proof in each environment.
