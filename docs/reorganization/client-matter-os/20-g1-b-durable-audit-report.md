# G1-B Durable Audit Entry Report

Status: Proposed
Gate: `G1 Trust Foundation Gate`
Slice: `G1-B`
Branch: `codex/lawos-g1-durable-audit-entry`
TUWs: `LFOS-G1-W01-T004`, `LFOS-G1-W01-T005`, `LFOS-G1-W01-T006`

## Scope

This slice opens the durable audit entry surface for G1. It builds on the
existing `packages/audit` append-only ledger and hash-chain event model, then
adds middleware-style append helpers and sensitive-read audit helpers.

This slice does not close G1 and does not claim runtime readiness for the
permission evaluator API, ObjectACL, ethical wall, legal hold, break-glass,
audit export, admin simulator, or G1 closeout.

## Implemented Surfaces

| Surface | Purpose |
| --- | --- |
| `packages/audit/src/durable-entry.js` | Adds G1-B event input builder, audit middleware, and sensitive-read recorder. |
| `packages/audit/src/index.js` | Exports the durable audit entry helpers. |
| `packages/audit/test/audit.test.js` | Adds G1-B tests for durable event schema, middleware append, idempotency, and sensitive read audit. |
| `scripts/validate-client-matter-os-g1-b.mjs` | Validates the slice against TUW IDs, source exports, tests, and G1-open boundary. |

## TUW Evidence

| TUW | Evidence | Status |
| --- | --- | --- |
| `LFOS-G1-W01-T004` | `buildAuditEventInput()` prepares durable audit event schema inputs compatible with `createAuditEvent()` and hash-chain append. | Proposed |
| `LFOS-G1-W01-T005` | `createAuditMiddleware()` appends write-route audit events through the append-only ledger. | Proposed |
| `LFOS-G1-W01-T006` | `recordSensitiveRead()` appends document/conflict/billing-style sensitive read audit events with permission decision binding. | Proposed |

## Validation

```sh
npm run client-matter:g0:validate
npm run client-matter:g1:plan:validate
npm run client-matter:g1a:validate
npm run client-matter:g1b:validate
npm --workspace @law-firm-os/audit run test
npm run rp03:audit:validate
npm run validate
```

## Boundary

G1 remains open. This slice proves durable audit entry helpers only. Later G1
slices still need permission evaluator API hardening, deny-over-allow
regression, ObjectACL, ethical wall, legal hold, break-glass, hash-chain
verification API, audit export, admin simulator, and `LFOS-G1-W01-T016`
closeout evidence.

This slice does not claim runtime readiness.
