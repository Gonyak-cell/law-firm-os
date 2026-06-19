# G3-D Conflict Engagement Workflow Report

TUWs: `LFOS-G3-W04-T004` through `LFOS-G3-W04-T010`

Branch: `codex/lawos-g3-conflict-engagement-workflow`

Base: `codex/lawos-g3-intake-conflict-schema`

This slice does not claim G3 runtime readiness. G3-D adds synthetic-only
descriptor evidence for conflict search, conflict decision, waiver, engagement,
FeeTerms, risk approval, and clearance-token behavior without opening runtime writes, API handlers, audit appends, clearance token persistence, or Matter creation.

## Scope

| File | Purpose |
| --- | --- |
| `packages/intake/src/client-matter-g3.js` | Adds G3-D descriptor factories for conflict search, conflict decision, waiver, engagement, FeeTerms, risk approval, clearance token, and workflow closeout evidence. |
| `packages/intake/src/index.js` | Exports the G3-D descriptor layer from the Intake package. |
| `packages/intake/test/client-matter-g3-workflow.test.js` | Covers alias, relationship, and former matter search, reviewer required decision flow, consent document waiver evidence, legal client and scope enforcement, fee variants, approval audit evidence, and expired or stale clearance token blocking. |
| `scripts/validate-client-matter-os-g3-d.mjs` | Validates the G3-D document, source, tests, exports, package script, contract boundary, and descriptor behavior. |

## TUW Coverage

| TUW | Implementation Evidence | Status |
| --- | --- | --- |
| `LFOS-G3-W04-T004` | `createIntakeConflictSearchDescriptor()` requires alias, relationship, and former matter search source coverage and blocks Matter shortcut claims. | Proposed |
| `LFOS-G3-W04-T005` | `createIntakeConflictDecisionWorkflowDescriptor()` requires a reviewer and audited ConflictHit schema evidence before any decision can be accepted as descriptor evidence. | Proposed |
| `LFOS-G3-W04-T006` | `createIntakeWaiverDescriptor()` requires conflict-hit references, consent document evidence, and approver identity. | Proposed |
| `LFOS-G3-W04-T007` | `createIntakeEngagementDescriptor()` requires legal client Party reference, scope summary, and FeeTerms reference while keeping Matter creation closed. | Proposed |
| `LFOS-G3-W04-T008` | `createIntakeFeeTermsDescriptor()` supports hourly, fixed, cap, and retainer variants with variant-specific required fields. | Proposed |
| `LFOS-G3-W04-T009` | `createIntakeRiskApprovalQueueDescriptor()` requires reviewer and approval audit evidence without enqueueing runtime work. | Proposed |
| `LFOS-G3-W04-T010` | `createIntakeClearanceTokenDescriptor()` blocks expired or stale clearance token evidence and refuses runtime Matter-opening claims. | Proposed |

## Runtime Boundary

- `writes_product_state: false`
- `creates_database_rows: false`
- `updates_database_rows: false`
- `writes_audit_event: false`
- `executes_api_handler: false`
- `dispatches_intake_runtime: false`
- `dispatches_conflict_runtime: false`
- `persists_clearance_token: false`
- `creates_matter: false`
- `g3_runtime_readiness_claim: "open"`

## Required Evidence

- `npm run client-matter:g3d:validate`
- `npm --workspace @law-firm-os/intake run test`
- `npm run client-matter:g3:plan:validate`
- `npm run rp10:intake-core:validate`
- `npm test`

## Non-Goals

- No runtime conflict search is executed.
- No waiver, engagement, FeeTerms, approval, or clearance token row is written.
- No audit event is appended by this slice.
- No Matter is created or opened from Intake.
- No draft PR is self-merged.
