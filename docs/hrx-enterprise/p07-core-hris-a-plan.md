# HRX-P07 Core HRIS A Plan

Status: active plan
Date: 2026-06-19
Pack: HRX-P07
PR lane: PR-05
Source TUWs: HRX-ENT-L4-W01-T01 through HRX-ENT-L4-W01-T05

## Purpose

HRX-P07 opens the first core HRIS runtime slice: Employee API route handlers, EmploymentProfile lifecycle helpers, org/reporting line models, assignment model, and HR document metadata service.

## Scope

| TUW | Output | Acceptance Gate |
| --- | --- | --- |
| HRX-ENT-L4-W01-T01 | apps/api/src/routes/hrx/employees.js | GET, POST, and PATCH employee route handlers persist and audit |
| HRX-ENT-L4-W01-T02 | packages/hrx/src/employment-profile.js | Effective-dated status and employment type changes validate |
| HRX-ENT-L4-W01-T03 | packages/hrx/src/org.js; packages/hrx/src/reporting-line.js | Solid and dotted manager lines plus org unit history validate |
| HRX-ENT-L4-W01-T04 | packages/hrx/src/assignment.js | Role, position, practice group, and capacity percent are effective-dated |
| HRX-ENT-L4-W01-T05 | packages/hrx/src/documents.js; apps/api/src/routes/hrx/documents.js | HR document source_ref metadata stores without document body leakage |

## Entry Gate

- HRX-P06 trust boundary tests pass.
- Runtime readiness validator still blocks UI and e2e readiness.

## Exit Gate

- P07 focused tests pass.
- HRX package tests pass.
- API package tests pass.
- Runtime readiness guard remains not-ready until API-backed People UI and e2e receipts exist.

## Validation Commands

```sh
node --test apps/api/test/hrx/employees.test.js
node --test packages/hrx/test/employment-profile.test.js
node --test packages/hrx/test/org.test.js
node --test packages/hrx/test/assignment.test.js
node --test apps/api/test/hrx/documents.test.js
npm run hrx:runtime:validate:expect-not-ready
```

## Claim Boundary

This pack does not create the People web UI, e2e receipt, payroll calculation runtime, AI final decision authority, production readiness, or enterprise readiness.
