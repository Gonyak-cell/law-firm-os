# G4-B Matter Execution Workflow Report

TUWs: `LFOS-G4-W05-T005` through `LFOS-G4-W05-T010`

Branch: `codex/lawos-g4-matter-execution-workflow`

Base: `codex/lawos-g4-matter-opening-foundation`

This slice does not claim G4 runtime readiness. G4-B adds synthetic-only
descriptor evidence for Matter team UI, MatterTask status transitions,
MatterCalendarEvent deadline changes, critical deadline dual control,
MatterStatusHistory immutability, and client-safe report projection without opening runtime writes, database rows, audit appends, permission evaluation, live UI rendering, portal publishing, or Matter execution runtime.

## Scope

G4-B depends on G4-A Matter opening foundation evidence. It assumes a Matter
candidate exists only after G3 clearance and G4-A opening evidence, then proves
the execution workflow controls that must be accepted before Matter/DMS runtime
readiness can be claimed.

| File | Purpose |
| --- | --- |
| `packages/matter/src/client-matter-g4.js` | Adds G4-B descriptor factories for team UI state, task transition, deadline change audit, critical deadline dual control, status history, client report projection, and closeout evidence. |
| `packages/matter/test/client-matter-g4-execution.test.js` | Covers team add/remove audit, hidden-member trimming, task status transitions, deadline audit, two-person confirmation, immutable status history, client-safe projection, and G4-B closeout evidence. |
| `scripts/validate-client-matter-os-g4-b.mjs` | Validates the G4-B document, source, tests, exports, package script, contract boundary, and descriptor behavior. |

## TUW Coverage

| TUW | Implementation Evidence | Status |
| --- | --- | --- |
| `LFOS-G4-W05-T005` | `createMatterTeamUiStateDescriptor()` trims hidden members, avoids unauthorized count leaks, and requires audit refs for add/remove actions. | Proposed |
| `LFOS-G4-W05-T006` | `createMatterTaskTransitionDescriptor()` enforces allowed MatterTask status transitions and audit-bound transition evidence. | Proposed |
| `LFOS-G4-W05-T007` | `createMatterCalendarDeadlineChangeDescriptor()` requires deadline-change audit evidence and blocks no-op changes. | Proposed |
| `LFOS-G4-W05-T008` | `createMatterCriticalDeadlineDualControlDescriptor()` requires two-person confirmation for critical deadline handling. | Proposed |
| `LFOS-G4-W05-T009` | `createMatterStatusHistoryDescriptor()` emits immutable, audit-bound status history evidence. | Proposed |
| `LFOS-G4-W05-T010` | `createMatterClientReportProjectionDescriptor()` strips privileged/internal material and keeps portal projection unpublished. | Proposed |

## Runtime Boundary

- `writes_product_state: false`
- `creates_database_rows: false`
- `updates_database_rows: false`
- `writes_audit_event: false`
- `appends_audit_event: false`
- `executes_api_handler: false`
- `persists_idempotency_key: false`
- `acquires_runtime_lock: false`
- `creates_matter_runtime: false`
- `opens_matter_runtime: false`
- `g4_runtime_readiness_claim: "open"`

## Required Evidence

- `npm run client-matter:g4b:validate`
- `npm --workspace @law-firm-os/matter run test`
- `npm run client-matter:g4a:validate`
- `npm run client-matter:g4:plan:validate`
- `npm run rp05:matter-core:validate`
- `npm test`

## Non-Goals

- No Matter team change is persisted.
- No MatterTask or MatterCalendarEvent update is persisted.
- No status history row is written.
- No client report is published to the portal.
- No runtime permission engine is evaluated.
- No draft PR is self-merged.
