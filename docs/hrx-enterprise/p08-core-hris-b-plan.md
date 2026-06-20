# HRX-P08 Core HRIS B Plan

Status: active plan
Date: 2026-06-19
Pack: HRX-P08
PR lane: PR-05
Source TUWs: HRX-ENT-L4-W01-T06 through HRX-ENT-L4-W01-T10

## Purpose

HRX-P08 completes the first core HRIS domain slice with employment contracts, compensation metadata, payroll export-preview boundary, retention/legal hold, and people graph edges.

## Scope

| TUW | Output | Acceptance Gate |
| --- | --- | --- |
| HRX-ENT-L4-W01-T06 | packages/hrx/src/contracts.js | Draft, approve, sign, renewal, and termination states validate |
| HRX-ENT-L4-W01-T07 | packages/hrx/src/compensation.js | Encrypted amount refs only; raw amount is blocked |
| HRX-ENT-L4-W01-T08 | packages/hrx/src/payroll-boundary.js; apps/api/src/routes/hrx/payroll.js | Export preview plus human review; no calculation runtime |
| HRX-ENT-L4-W01-T09 | packages/hrx/src/retention.js; packages/hrx/src/legal-hold.js | Purge allowed only when no legal hold and retention is due |
| HRX-ENT-L4-W01-T10 | packages/hrx/src/people-graph.js | Employee-org-manager-matter edges persist without client detail |

## Entry Gate

- HRX-P07 focused tests pass.
- Runtime readiness guard still blocks UI/e2e readiness claims.

## Exit Gate

- P08 focused tests pass.
- HRX and API package tests pass.
- Payroll calculation runtime remains blocked.

## Validation Commands

```sh
node --test packages/hrx/test/contracts.test.js
node --test packages/hrx/test/compensation.test.js
node --test apps/api/test/hrx/payroll.test.js
node --test packages/hrx/test/retention.test.js
node --test packages/hrx/test/people-graph.test.js
npm run hrx:runtime:validate:expect-not-ready
```

## Claim Boundary

This pack does not create payroll calculation runtime, payroll disbursement, People web UI, e2e receipt, production readiness, enterprise readiness, or AI final decision authority.
