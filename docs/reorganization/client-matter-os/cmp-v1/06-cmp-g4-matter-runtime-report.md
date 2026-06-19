# CMP-G4 Matter Core Runtime Report

Status: Implemented runtime API evidence; durable production persistence remains open
Date: 2026-06-20

## Scope

This report records the executable CMP v1.0 runtime slice for
`CMP-G4-W04 Matter Core`. It depends on `CMP-G1-W01`, `CMP-G2-W02`, and
`CMP-G3-W03`: Matter opening must be permission/audit-aware, Party-backed, and
People/HRX-ready for staffing. The implementation also preserves the
CRM/Intake clearance boundary by requiring an Intake clearance token before any
Matter opening route can create runtime state.

The implementation reuses `packages/matter/src/client-matter-g4.js` descriptor
contracts and exposes them through `apps/api` as tenant-scoped `/api/matter/*`
runtime routes. The web layer gets a reusable `apps/web/src/data/matterApiClient.js`
client for these routes. This is not an R4 completion claim. State is kept in
the API process; durable production persistence remains open.

## TUWs Covered

`CMP-G4-W04-T001`, `CMP-G4-W04-T002`, `CMP-G4-W04-T003`,
`CMP-G4-W04-T004`, `CMP-G4-W04-T005`, `CMP-G4-W04-T006`,
`CMP-G4-W04-T007`, `CMP-G4-W04-T008`, `CMP-G4-W04-T009`,
`CMP-G4-W04-T010`, `CMP-G4-W04-T011`, `CMP-G4-W04-T012`,
`CMP-G4-W04-T013`, `CMP-G4-W04-T014`, `CMP-G4-W04-T015`,
`CMP-G4-W04-T016`, `CMP-G4-W04-T017`, `CMP-G4-W04-T018`,
`CMP-G4-W04-T019`, `CMP-G4-W04-T020`, `CMP-G4-W04-T021`,
`CMP-G4-W04-T022`, `CMP-G4-W04-T023`

## Implemented Files

| File | Runtime role |
| --- | --- |
| `apps/api/src/matter-runtime-context.js` | CMP-G4 Matter API runtime, clearance token registration, Matter number reservation, clearance-gated Matter opening, atomic refs, staffing, task/deadline/status workflows, client report projection, closing checklist, dashboard visibility, audit export, and runtime evidence. |
| `apps/api/src/server.js` | Routes `/api/matter/*` through the API server and exposes the `matter-core` bounded context in `/api/health`. |
| `apps/api/test/cmp-g4-matter-core-api.test.js` | In-process API coverage for clearance blocking, Opportunity shortcut blocking, atomic Matter opening, idempotent replay, wiki/graph shell, staffing permission, task/deadline/status audit, report/dashboard trimming, closing checklist, runtime evidence, and audit verification. |
| `apps/web/src/data/matterApiClient.js` | Web client functions for clearance token creation, Matter number reservation, Matter opening, dashboard fetch, and runtime evidence fetch. |
| `scripts/validate-client-matter-os-cmp-g4-runtime.mjs` | Static validator guarding TUW traceability, route coverage, UI refs, tests, dependency ordering, and no premature R4 claim. |

## Runtime Routes

| Route | Methods | Evidence intent |
| --- | --- | --- |
| `/api/matter/runtime/evidence` | `GET` | CMP-G4 evidence bundle with dependencies, 23 TUW IDs, closeout descriptors, and readiness boundary. |
| `/api/matter/clearance-tokens` | `POST` | Registers Intake clearance token descriptor evidence before Matter opening. |
| `/api/matter/clearance-tokens/:id` | `GET` | Reads registered clearance token evidence. |
| `/api/matter/matter-numbers/reservations` | `POST` | Idempotent Matter number reservation and duplicate blocking. |
| `/api/matter/opening/transactions` | `POST` | Atomic opening descriptor preview requiring ACL, DMS, and Billing refs. |
| `/api/matter/matters` | `GET`, `POST` | Permission-trimmed Matter list and clearance-gated Matter opening. |
| `/api/matter/matters/:id` | `GET` | Matter detail plus wiki shell and graph skeleton refs. |
| `/api/matter/matters/:id/members` | `GET`, `POST` | Team visibility and staffing role permission checks. |
| `/api/matter/matters/:id/tasks/:taskId/transitions` | `POST` | MatterTask status transition with audit. |
| `/api/matter/matters/:id/calendar/:eventId/deadline-change` | `POST` | Deadline change audit evidence. |
| `/api/matter/matters/:id/calendar/:eventId/dual-control` | `POST` | Critical deadline two-person confirmation. |
| `/api/matter/matters/:id/status-history` | `POST` | Immutable status history append. |
| `/api/matter/matters/:id/client-report/projection` | `POST` | Client-safe report projection with privileged/internal fields removed. |
| `/api/matter/matters/:id/closing-checklist` | `POST` | Closing checklist blocking WIP, AR, holds, unresolved tasks, and missing retention/final invoice review. |
| `/api/matter/dashboard` | `GET` | Dashboard projection without silent Matter or unauthorized-count leakage. |
| `/api/matter/audit` | `GET` | Tenant-scoped audit export and hash-chain verification. |

## Guardrails

- Matter opening fails closed without a registered CRM/Intake clearance token.
- Intake clearance token registration blocks attempts to create Matter from the
  Intake/CRM side.
- Direct Opportunity-to-Matter shortcut input is blocked.
- Opening transaction evidence requires ACL, DMS workspace, Billing, and
  idempotency refs before runtime Matter state is created.
- Matter number reservation is idempotent and duplicate-safe.
- Matter staffing validates role permission before adding a member.
- Task transitions, deadline changes, critical deadline dual-control, and
  status history all produce audit-bound descriptors.
- Client report and dashboard projections remove privileged/internal fields and
  do not expose unauthorized or silent Matter counts.
- Closing checklist blocks open WIP, AR, legal holds, unresolved tasks, and
  missing retention/final invoice review.
- Wiki shell and graph skeleton are created as runtime evidence only; graph
  provider execution and client-visible wiki output remain closed.
- The exposed readiness string is
  `runtime_api_evidence_only__durable_persistence_open`; this intentionally
  avoids an R4 claim until durable persistence evidence exists.

## Verification

Required commands:

```bash
npm run client-matter:cmp-v1:validate
npm run client-matter:cmp-g1:validate
npm run client-matter:cmp-g2:validate
npm run client-matter:cmp-g3:validate
npm run client-matter:cmp-g4:validate
npm --workspace apps/api run test
npm test
```
