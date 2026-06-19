# G4-A Matter Opening Foundation Report

TUWs: `LFOS-G4-W05-T001` through `LFOS-G4-W05-T004`

Branch: `codex/lawos-g4-matter-opening-foundation`

Base: `codex/lawos-g4-matter-dms-entry-plan`

This slice does not claim G4 runtime readiness. G4-A adds synthetic-only
descriptor evidence for Matter schema opening, matter number idempotency,
Matter opening transaction refs, and MatterMember role permission behavior
without opening runtime writes, database rows, audit appends, lock acquisition,
API handlers, or Matter runtime creation.

## Scope

Matter opening requires G3 clearance token evidence before any G4 Matter
candidate can be represented. Direct Opportunity-to-Matter conversion remains
blocked; the only accepted path is G3 Intake clearance followed by a G4 Matter
opening candidate.

| File | Purpose |
| --- | --- |
| `packages/matter/src/client-matter-g4.js` | Adds G4-A descriptor factories for Matter opening records, matter number reservation, atomic opening transaction refs, MatterMember permission evidence, and G4-A closeout. |
| `packages/matter/src/index.js` | Exports the G4 descriptor layer from the Matter package. |
| `packages/matter/test/client-matter-g4-opening.test.js` | Covers clearance required, Opportunity shortcut blocking, matter number idempotency/duplicate detection, ACL/DMS/Billing atomic refs, member role permission, and G4-A closeout evidence. |
| `scripts/validate-client-matter-os-g4-a.mjs` | Validates the G4-A document, source, tests, exports, package script, contract boundary, and descriptor behavior. |

## TUW Coverage

| TUW | Implementation Evidence | Status |
| --- | --- | --- |
| `LFOS-G4-W05-T001` | `createMatterG4OpeningRecord()` requires valid G3 clearance token evidence, preserves Party-based legal client identity, and blocks Opportunity-to-Matter shortcut claims. | Proposed |
| `LFOS-G4-W05-T002` | `createMatterNumberReservationDescriptor()` returns deterministic matter numbers, detects idempotent replays, and blocks duplicate numbers from different idempotency keys. | Proposed |
| `LFOS-G4-W05-T003` | `createMatterOpeningTransactionDescriptor()` requires Matter schema validity plus ACL, DMS workspace, and Billing refs as an atomic evidence set. | Proposed |
| `LFOS-G4-W05-T004` | `createMatterMemberPermissionDescriptor()` validates MatterMember schema and role permission evidence before member assignment can proceed. | Proposed |

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

- `npm run client-matter:g4a:validate`
- `npm --workspace @law-firm-os/matter run test`
- `npm run client-matter:g4:plan:validate`
- `npm run rp05:matter-core:validate`
- `npm test`

## Non-Goals

- No Matter row is written.
- No matter number is persisted.
- No opening transaction commits ACL, DMS, or Billing refs.
- No member assignment is persisted.
- No runtime permission engine is evaluated.
- No draft PR is self-merged.
