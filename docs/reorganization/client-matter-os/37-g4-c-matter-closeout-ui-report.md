# G4-C Matter Closeout UI Report

TUWs: `LFOS-G4-W05-T011` through `LFOS-G4-W05-T014`

Branch: `codex/lawos-g4-matter-closeout-ui`

Base: `codex/lawos-g4-matter-execution-workflow`

This slice does not claim G4 runtime readiness. G4-C adds synthetic-only
descriptor evidence for Matter closing checklist controls, silent matter visibility support, Matter dashboard UI ACL trimming, and G4 Matter closeout evidence without opening runtime writes, database rows, audit appends, permission evaluation, live UI rendering, dashboard API handlers, or Matter closeout runtime.

## Scope

G4-C depends on G4-A Matter opening foundation evidence and G4-B Matter
execution workflow evidence. It assumes Matter execution descriptors exist, then
proves the closeout and UI controls that must be accepted before Matter runtime
readiness can be claimed.

| File | Purpose |
| --- | --- |
| `packages/matter/src/client-matter-g4.js` | Adds G4-C descriptor factories for closing checklist gating, silent matter visibility omission, dashboard ACL trimming, and Matter closeout evidence. |
| `packages/matter/test/client-matter-g4-closeout-ui.test.js` | Covers WIP/AR closing blockers, unauthorized silent matter omission, dashboard hidden-field trimming, unauthorized detail denial, and G4-C closeout evidence. |
| `scripts/validate-client-matter-os-g4-c.mjs` | Validates the G4-C document, source, tests, exports, package script, contract boundary, and descriptor behavior. |

## TUW Coverage

| TUW | Implementation Evidence | Status |
| --- | --- | --- |
| `LFOS-G4-W05-T011` | `createMatterClosingChecklistDescriptor()` blocks closing when WIP, AR, holds, unresolved tasks, retention acknowledgment, or final invoice review remain open. | Proposed |
| `LFOS-G4-W05-T012` | `createMatterSilentMatterVisibilityDescriptor()` omits unauthorized and silent matters without exposing hidden counts or presence. | Proposed |
| `LFOS-G4-W05-T013` | `createMatterDashboardUiStateDescriptor()` trims dashboard cards and detail panels before projection. | Proposed |
| `LFOS-G4-W05-T014` | `createMatterG4CMatterCloseoutDescriptor()` records descriptor-only Matter closeout evidence and keeps runtime readiness open. | Proposed |

## Runtime Boundary

- `writes_product_state: false`
- `creates_database_rows: false`
- `updates_database_rows: false`
- `writes_audit_event: false`
- `appends_audit_event: false`
- `executes_api_handler: false`
- `renders_live_dom: false`
- `evaluates_runtime_permission: false`
- `creates_matter_runtime: false`
- `opens_matter_runtime: false`
- `g4_runtime_readiness_claim: "open"`

## Required Evidence

- `npm run client-matter:g4c:validate`
- `npm --workspace @law-firm-os/matter run test`
- `npm run client-matter:g4b:validate`
- `npm run client-matter:g4a:validate`
- `npm run client-matter:g4:plan:validate`
- `npm run rp05:matter-core:validate`
- `npm test`

## Non-Goals

- No Matter is closed.
- No WIP, AR, hold, task, retention, or invoice state is mutated.
- No silent matter query is executed.
- No dashboard API handler or live DOM is rendered.
- No runtime permission engine is evaluated.
- No draft PR is self-merged.
