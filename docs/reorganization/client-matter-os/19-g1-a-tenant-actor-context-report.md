# G1-A Tenant, Actor, and Permission Context Report

Status: Proposed
Gate: `G1 Trust Foundation Gate`
Slice: `G1-A`
Branch: `codex/lawos-g1-tenant-actor-context`
TUWs: `LFOS-G1-W01-T001`, `LFOS-G1-W01-T002`, `LFOS-G1-W01-T003`

## Scope

This slice opens the first G1 implementation surface for tenant boundary, actor
context, and permission context. It does not close G1 and does not claim runtime
readiness for durable audit, ObjectACL, ethical wall, legal hold, break-glass,
audit export, or G1 closeout.

This slice does not claim runtime readiness.

## Implemented Surfaces

| Surface | Purpose |
| --- | --- |
| `packages/authz/src/trust-context.js` | Adds tenant boundary, actor context, and permission context builders. |
| `packages/authz/src/index.js` | Exports the G1-A trust context API. |
| `packages/authz/test/authz.test.js` | Adds fail-closed tests for missing tenant, missing actor, unauthorized actor type, and permission context binding. |
| `scripts/validate-client-matter-os-g1-a.mjs` | Validates the slice against TUW IDs, source exports, tests, and G1 open-boundary language. |

## TUW Evidence

| TUW | Evidence | Status |
| --- | --- | --- |
| `LFOS-G1-W01-T001` | `validateTenantBoundary()` rejects missing tenant, missing resource tenant, expected tenant mismatch, and cross-tenant access. | Proposed |
| `LFOS-G1-W01-T002` | `createActorContext()` rejects missing actor identity and unauthorized actor types. | Proposed |
| `LFOS-G1-W01-T003` | `createPermissionContext()` binds tenant, actor, action, object, request, persistence requirement, and audit binding without allowing header-only trust. | Proposed |

## Validation

```sh
npm run client-matter:g0:validate
npm run client-matter:g1:plan:validate
npm run client-matter:g1a:validate
npm --workspace @law-firm-os/authz run test
npm run validate
```

## Boundary

G1 remains open. This slice proves the first tenant, actor, and permission
context interface behavior only. Later G1 slices still need durable audit write
evidence, permission evaluator API hardening, deny-over-allow regression,
ObjectACL, ethical wall, legal hold, break-glass, hash-chain verification,
audit export, admin simulator, and `LFOS-G1-W01-T016` closeout evidence.
