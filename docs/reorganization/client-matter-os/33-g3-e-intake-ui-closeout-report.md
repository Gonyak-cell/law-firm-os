# G3-E Intake UI Closeout Report

TUWs: `LFOS-G3-W04-T011` through `LFOS-G3-W04-T014`

Branch: `codex/lawos-g3-intake-ui-closeout`

Base: `codex/lawos-g3-conflict-engagement-workflow`

This slice does not claim G3 runtime readiness. G3-E adds synthetic-only
descriptor evidence for conflict memo permission boundary, waiver approval UI,
engagement approval UI, and G3 Intake closeout while keeping UI rendering,
runtime writes, audit appends, and Matter creation closed.

## Scope

| File | Purpose |
| --- | --- |
| `packages/intake/src/client-matter-g3.js` | Adds G3-E UI-state and closeout descriptor factories on the existing Intake G3 descriptor layer. |
| `packages/intake/test/client-matter-g3-ui-closeout.test.js` | Covers CRM user memo denial, waiver denied/review states, engagement signed/approved states, and Opportunity-to-Matter bypass blocking. |
| `scripts/validate-client-matter-os-g3-e.mjs` | Validates the G3-E document, source, tests, exports, package script, contract boundary, and descriptor behavior. |

## TUW Coverage

| TUW | Implementation Evidence | Status |
| --- | --- | --- |
| `LFOS-G3-W04-T011` | `createIntakeConflictMemoBoundaryDescriptor()` denies CRM users and hides conflict memo body, hit details, raw permission decisions, audit event body, and unauthorized counts. | Proposed |
| `LFOS-G3-W04-T012` | `createIntakeWaiverApprovalUiStateDescriptor()` records denied and review-required waiver UI states without exposing consent document bodies or conflict details. | Proposed |
| `LFOS-G3-W04-T013` | `createIntakeEngagementApprovalUiStateDescriptor()` records approved and signed engagement UI states without exposing signed document bodies or raw fee terms. | Proposed |
| `LFOS-G3-W04-T014` | `createIntakeG3CloseoutDescriptor()` records CRM, schema, workflow, UI, command, PR, G1/G2, and human-review evidence while blocking Opportunity-to-Matter bypass attempts. | Proposed |

## Runtime Boundary

- `writes_product_state: false`
- `creates_database_rows: false`
- `updates_database_rows: false`
- `writes_audit_event: false`
- `executes_api_handler: false`
- `renders_ui: false`
- `dispatches_intake_runtime: false`
- `dispatches_conflict_runtime: false`
- `creates_matter: false`
- `g3_runtime_readiness_claim: "open"`

## Required Evidence

- `npm run client-matter:g3e:validate`
- `npm --workspace @law-firm-os/intake run test`
- `npm run client-matter:g3:plan:validate`
- `npm run rp10:intake-core:validate`
- `npm test`

## Non-Goals

- No runtime UI is rendered.
- No conflict memo body, consent document body, signed document body, raw fee terms, raw permission decision, audit event body, or unauthorized count is exposed.
- No closeout approval is self-granted.
- No Matter is created or opened from Opportunity or Intake.
- No draft PR is self-merged.
