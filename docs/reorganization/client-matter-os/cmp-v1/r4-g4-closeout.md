# CMP R4 G4 Closeout

Status: runtime-closeout
Gate: CMP-G4 Matter Core & Staffing Runtime

## Closed Runtime Slices

- CMP-G4-W04-T001 through CMP-G4-W04-T023 have target files, focused tests, evidence artifacts, and validator coverage.
- Matter Core now has file-backed repository persistence, migration descriptors, idempotency, audit append, rollback-capable transactions, and API-visible runtime writes.
- Matter opening requires G3 clearance evidence and blocks direct Opportunity-to-Matter shortcuts.
- MatterTeam writes require `employee_id`, block user_id-only membership, validate Employee availability, evaluate Matter role policy, persist state, and append audit.
- Matter Home, opening wizard, and team roster are routed in the web app and backed by `/api/matters`.

## Verification

- `node --test packages/matter/test/runtime-services.test.js`
- `node --test packages/matter/test/*.test.js`
- `node --test apps/api/test/cmp-r4-g4-matter.test.js`
- `npm --workspace apps/web run test:ui`
- `npm --workspace apps/web run build`
- `npm run client-matter:cmp-v1:g4:validate`

## Open Slice

- None within CMP-G4. Package-level R4 runtime-write-ready remains open until G5-G12 complete and pass review/adjudication.

## Claim Boundary

This report claims CMP-G4 runtime closeout only. It does not claim whole-package R4 runtime-write-ready, R5/R6 owner-decision-ready, go-live, or production-ready status.
