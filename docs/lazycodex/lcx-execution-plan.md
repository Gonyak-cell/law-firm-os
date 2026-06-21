# LazyCodex LCX1-LCX6 Execution Plan

Date: 2026-06-21
Branch: codex/runtime-spine-launch-tuw-crosswalk
Goal status: active until LCX1 through LCX6 are all completed

## Goal

Complete the Law Firm OS LazyCodex execution program from LCX1 through LCX6:

1. Repair the final product completion gate.
2. Crosswalk the attached remediation package against the live repo.
3. Validate production persistence decisions.
4. Drive Client, Matter, and People core runtime flows.
5. Complete UI/API manual QA evidence.
6. Prepare locked-domain unlock packets.

This goal does not authorize a production go-live claim. Launch remains blocked
until external receipts and owner approval are present.

## Completion Rules

| Rule | Requirement |
| --- | --- |
| LCX evidence | Each LCX must have a repo evidence file under `docs/lazycodex/evidence/`. |
| Validator evidence | Each LCX must list commands, pass/fail results, and remaining blockers. |
| Boundary | Each LCX must state what it does not prove. |
| Persistence | Any LCX code or contract repair must be committed and pushed to the active branch. |
| Goal completion | The goal can only be marked complete after LCX6 is done and no required LCX work remains. |

## LCX1 - Final Product Completion Gate Repair

Status: completed

Objective:
Repair the final-product gate without weakening its validator contract.

Work plan:

1. Reproduce `npm run final-product-completion-gate:validate`.
2. Inspect `scripts/validate-final-product-completion-gate.mjs`.
3. Confirm whether `commit_evidence_count` is derived from current-branch
   `git log --format=%s`.
4. Add current-branch commit evidence for `CP00-001` through `CP00-987`.
5. Record repair evidence and validation results.
6. Push the branch.

Done evidence:

- `docs/lazycodex/evidence/lcx1-final-product-completion-gate-repair.md`
- Commit `584938e0c`: current-branch CP00 checkpoint subject.
- Commit `cdf7a8edb`: LCX1 validation evidence update.
- `npm run final-product-completion-gate:validate`: PASS.
- `npm run runtime-spine:readiness:validate`: PASS.
- `npm run runtime-spine:launch-crosswalk:validate`: PASS.
- `npm run validate`: PASS.

Boundary:
LCX1 proves repo-side final-product gate evidence only. It does not approve
external launch, production cutover, or owner sign-off.

## LCX2 - Remediation Package Crosswalk

Status: completed

Objective:
Compare the attached `law firm os runtime` remediation package with the current
repo and separate stale baseline findings from live repo blockers.

Input package:

- `/Users/jws/Documents/Codex/law firm os runtime/law_firm_os_remediation_package_v1_0/`
- `00_PACKAGE_README.md` through `13_Traceability_Matrix.md`
- `runtime_evidence_baseline.json`
- `claim_evidence_taxonomy.json`
- `missing_requested_files.json`

Work plan:

1. Inventory package files and classify each package claim.
2. Read P0 foundation, Client, Matter, People, TUW backlog, and traceability
   matrix documents.
3. Compare package remediation TUWs against Runtime Spine, CMP v1, RP04/RP05,
   RP09, RP30, HRX, and Matter-Vault validators.
4. Mark each package item as covered, partially covered, stale, or residual.
5. Repair any repo-side validator drift discovered during crosswalk when the
   fix is local and non-invasive.
6. Record LCX2 evidence and push.

Acceptance:

- LCX2 evidence file exists.
- Current validator results are cited.
- Package gaps are mapped to LCX3-LCX6 follow-up lanes.
- Any stale package baseline is explicitly marked stale instead of treated as
  current truth.

Done evidence:

- `docs/lazycodex/evidence/lcx2-remediation-package-crosswalk.md`
- `contracts/master-data-contract.json` public export snapshot synchronized to
  `packages/master-data/src/index.js`.
- `npm run rp04:master-data:validate`: PASS.
- `npm run client-matter:cmp-v1:validate`: PASS.
- `npm run runtime-spine:readiness:validate`: PASS.
- `npm run runtime-spine:launch-crosswalk:validate`: PASS.

Boundary:
LCX2 is a reconciliation and validator-drift pass. It does not implement every
P0/P1 runtime feature and does not close go-live.

## LCX3 - Production Persistence Decision

Status: completed

Objective:
Resolve production persistence decisions required before durable write-runtime
claims can be treated as production-bound rather than repo/runtime-ready
candidate evidence.

Work plan:

1. Inspect Runtime Spine RS-1 persistence documents, launch L2 persistence
   blockers, and hosting/storage decision briefs.
2. Reconcile `runtime-spine:rs1:persistence-ready:validate` with the fail-closed
   RS-1 subvalidators.
3. Prepare a production persistence decision packet covering DB, migration,
   rollback, WORM audit, object storage, tenant constraints, and idempotency.
4. Update the relevant launch/runtime evidence docs without claiming go-live.
5. Run RS-1, RS-2, RS-3, readiness, and launch-crosswalk validators.

Acceptance:

- Persistence decision packet exists.
- RS-1 boundary is explicit: ready-candidate versus production persistence.
- Launch blockers remain authoritative unless owner/external receipts clear
  them.

Done evidence:

- `docs/launch/production-persistence-decision-packet.md`
- `docs/lazycodex/evidence/lcx3-production-persistence-decision.md`
- `npm run runtime-spine:rs1:persistence:validate`: PASS.
- `npm run runtime-spine:rs1:tenant-data:validate`: PASS.
- `npm run runtime-spine:rs1:persistence-ready:validate`: PASS.
- `npm run runtime-spine:readiness:validate`: PASS.

## LCX4 - Client/Matter/People Runtime Flow Drive

Status: completed

Objective:
Exercise the three main product flows through actual code surfaces and identify
implementation gaps that remain after LCX2/LCX3.

Work plan:

1. Client: drive Client/Party/Contact master, duplicate candidate, CRM/intake
   transition, and client-safe projection surfaces.
2. Matter: drive matter opening, clearance/engagement dependency, numbering,
   team/ethical wall, task/deadline, DMS/email, and billing-adjacent surfaces.
3. People: drive Employee/User split, HR sensitive guard, HR document/consent,
   rule-engine, and Matter staffing linkage surfaces.
4. Add or repair focused runtime evidence only where a real gap blocks the flow.
5. Run CMP, RP04/RP05/RP09/RP30, HRX, Matter-Vault, and Runtime Spine validators.

Acceptance:

- Core flows are driven through code, not only read from docs.
- Remaining gaps are assigned to LCX5 manual QA or LCX6 locked-domain packets.
- No descriptor-only result is mislabeled as write-runtime.

Done evidence:

- `docs/lazycodex/evidence/lcx4-client-matter-people-runtime-flow.md`
- Direct Node smoke for Client, Matter, and People package/runtime paths.
- `npm --workspace @law-firm-os/master-data test`: PASS, 95/95.
- `npm --workspace @law-firm-os/matter test`: PASS, 104/104.
- HRX focused runtime tests: PASS, 16/16.
- `npm run client-matter:cmp-v1:g2:validate`: PASS.
- `npm run client-matter:cmp-v1:g4:validate`: PASS.
- `npm run client-matter:cmp-v1:g7:validate`: PASS.

## LCX5 - UI/API Manual QA Evidence

Status: completed

Objective:
Prove the relevant UI/API surfaces work in an observable local run and capture
manual QA evidence.

Work plan:

1. Start the API/web runtime required by the repo.
2. Exercise Client, Matter, and People screens or API routes.
3. Capture command receipts, response snippets, screenshots where applicable,
   and denied-path evidence.
4. Verify no visible UI or API copy claims launch/go-live.
5. Record manual QA evidence and any residual issues.

Acceptance:

- Manual QA evidence exists.
- Happy path and denied path are both covered where applicable.
- Any untestable external surface is moved to LCX6 instead of claimed complete.

Done evidence:

- `docs/lazycodex/evidence/lcx5-ui-api-manual-qa.md`
- Local API server on `http://127.0.0.1:4180`.
- Local web server on `http://127.0.0.1:5173/`.
- Client, Matter, and People manual API smoke: PASS.
- `npm --workspace @law-firm-os/web run test:ui`: PASS, 16/16.
- `node scripts/verify-matter-live-data.mjs`: PASS.
- `npm --workspace @law-firm-os/api run test -- apps/api/test/master-data-api.test.js apps/api/test/cmp-r4-g4-matter.test.js apps/api/test/hrx-runtime-api.test.js apps/api/test/hrx/route-authz.test.js`: PASS, 131/131.

## LCX6 - Locked-Domain Unlock Packets

Status: pending

Objective:
Prepare unlock packets for the domains that cannot be closed by repo code alone.

Work plan:

1. Inventory locked domains from launch blockers, external receipts, and owner
   approval ledgers.
2. Prepare per-domain unlock packets for LT-L2-W01, LT-L2-W02, LT-L2-W03, and
   LT-L2-W07 or their current equivalents.
3. Keep external receipts, production cutover, security acceptance, and owner
   approval separate from repo-ready claims.
4. Run launch authority, owner approval, launch evidence, Runtime Spine
   readiness, and final-product gate validators.

Acceptance:

- Unlock packets exist and identify required owner/external actions.
- Launch remains blocked unless real receipts and approvals are present.
- The overall goal is only marked complete after LCX6 evidence is present.
