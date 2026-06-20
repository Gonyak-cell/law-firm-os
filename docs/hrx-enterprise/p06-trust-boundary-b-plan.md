# HRX-P06 Trust Boundary B Plan

Status: active plan
Date: 2026-06-19
Pack: HRX-P06
PR lane: PR-04
Source TUWs: HRX-ENT-L3-W01-T06 through HRX-ENT-L3-W01-T10

## Purpose

HRX-P06 completes the first trust boundary by adding HRX audit event modeling, an immutable append store, API audit append helper, field masking, and break-glass controls.

## Scope

| TUW | Output | Acceptance Gate |
| --- | --- | --- |
| HRX-ENT-L3-W01-T06 | packages/audit/src/hrx-events.js | Audit event schema includes actor, tenant, object, decision, and reason |
| HRX-ENT-L3-W01-T07 | packages/audit/src/hrx-event-store.js | Sensitive read/write appends immutable event |
| HRX-ENT-L3-W01-T08 | apps/api/src/middleware/hrx-audit-write.js | Middleware helper appends audit for HRX routes |
| HRX-ENT-L3-W01-T09 | packages/hrx/src/field-masker.js | Compensation, evaluation, candidate, and payroll fields mask unless scope grants |
| HRX-ENT-L3-W01-T10 | packages/authz/src/hrx-break-glass.js | Reason, expiry, approver, and audit are required |

## Entry Gate

- HRX-P05 focused tests pass.
- Authz package tests pass.

## Exit Gate

- P06 focused tests pass.
- Audit, authz, API, and HRX package tests pass.
- Runtime readiness guard remains not-ready until HRX API route, UI, and e2e receipts exist.

## Validation Commands

```sh
node --test packages/audit/test/hrx-events.test.js
node --test packages/audit/test/hrx-event-store.test.js
node --test apps/api/test/hrx-audit-write.test.js
node --test packages/hrx/test/field-masker.test.js
node --test packages/authz/test/hrx-break-glass.test.js
npm run hrx:runtime:validate:expect-not-ready
```

## Claim Boundary

This pack does not create HRX API routes, API-backed UI, e2e receipts, production readiness, enterprise readiness, payroll calculation runtime, or AI final decision authority.
