# HRX-P04 Runtime Core B Plan

Status: active plan
Date: 2026-06-19
Pack: HRX-P04
PR lane: PR-03
Source TUWs: HRX-ENT-L2-W01-T05 through HRX-ENT-L2-W01-T10

## Purpose

HRX-P04 adds the runtime shell around the P03 core without opening full HRX API, authz, audit, UI, or production readiness. It creates fail-closed tenant/actor context parsing, a service shell that depends on authz and audit ports, runtime payload validators, synthetic seed dry-run tooling, master-data HR reference projections, and matter workload aggregation.

## Scope

| TUW | Output | Acceptance Gate |
| --- | --- | --- |
| HRX-ENT-L2-W01-T05 | apps/api/src/middleware/tenant-context.js; apps/api/src/middleware/actor-context.js | Missing tenant or actor fails closed |
| HRX-ENT-L2-W01-T06 | packages/hrx/src/service.js | Service depends on repository, authz, and audit ports |
| HRX-ENT-L2-W01-T07 | packages/hrx/src/validators.js | Runtime validators reject descriptor-only payloads |
| HRX-ENT-L2-W01-T08 | packages/hrx/fixtures/seed-employees.synthetic.json; scripts/seed-hrx-fixtures.mjs | Synthetic fixture dry-run validates and does not write production data |
| HRX-ENT-L2-W01-T09 | packages/master-data/src/hrx-refs.js | Person, org, and practice group refs resolve without HR sensitive leakage |
| HRX-ENT-L2-W01-T10 | packages/matter/src/hrx-workload-projection.js | Workload projection aggregates only and omits client detail |

## Entry Gate

- HRX-P03 tests pass.
- Runtime readiness validator remains not-ready because API/authz/audit/UI/e2e gates are incomplete.

## Exit Gate

- P04 focused tests pass.
- Seed script passes in dry-run mode.
- Runtime readiness validator still fails in normal mode until P05+ and P12+ evidence exists.
- Existing RP30 descriptor and product contract validators still pass.

## Validation Commands

```sh
node --test apps/api/test/context.test.js
node --test packages/hrx/test/service.test.js
node --test packages/hrx/test/validators.test.js
node scripts/seed-hrx-fixtures.mjs --dry-run
node --test packages/master-data/test/hrx-refs.test.js
node --test packages/matter/test/hrx-workload-projection.test.js
npm run hrx:runtime:validate:expect-not-ready
npm run rp30:hrx:validate
npm run validate
```

## Claim Boundary

This pack does not create the HRX employee API route, HR-sensitive authz policy engine, audit event store, API-backed UI, e2e receipt, payroll calculation runtime, AI final decision runtime, production readiness, or enterprise readiness.
