# HRX-P05 Trust Boundary A Plan

Status: active plan
Date: 2026-06-19
Pack: HRX-P05
PR lane: PR-04
Source TUWs: HRX-ENT-L3-W01-T01 through HRX-ENT-L3-W01-T05

## Purpose

HRX-P05 establishes the first sensitive-data permission boundary. It adds HRX scope identifiers, a deny-by-default ABAC policy function, and focused restricted-access policies for compensation, evaluation, and candidate data.

## Scope

| TUW | Output | Acceptance Gate |
| --- | --- | --- |
| HRX-ENT-L3-W01-T01 | packages/authz/src/hrx-sensitive-scopes.js | Employee, document, compensation, evaluation, candidate, payroll, and audit scopes exported |
| HRX-ENT-L3-W01-T02 | packages/authz/src/hrx-policy-engine.js | Deny-by-default with tenant, role, purpose, and sensitivity checks |
| HRX-ENT-L3-W01-T03 | packages/authz/src/hrx-compensation-policy.js | Unauthorized actor is denied and compensation fields are masked |
| HRX-ENT-L3-W01-T04 | packages/authz/src/hrx-evaluation-policy.js | Reviewer or HR scope is required and read is audit-marked |
| HRX-ENT-L3-W01-T05 | packages/authz/src/hrx-candidate-policy.js | Candidate is not visible through CRM Party scope |

## Entry Gate

- HRX-P04 runtime shell tests pass.
- Runtime readiness validator still blocks API, authz, audit, UI, and e2e readiness claims.

## Exit Gate

- P05 focused authz tests pass.
- Authz package tests pass.
- Runtime readiness guard remains not-ready until audit/API/UI/e2e gates exist.

## Validation Commands

```sh
node --test packages/authz/test/hrx-scopes.test.js
node --test packages/authz/test/hrx-policy-engine.test.js
node --test packages/authz/test/hrx-compensation-policy.test.js
node --test packages/authz/test/hrx-evaluation-policy.test.js
node --test packages/authz/test/hrx-candidate-policy.test.js
npm --workspace packages/authz run test
npm run hrx:runtime:validate:expect-not-ready
```

## Claim Boundary

This pack does not create immutable HRX audit storage, API middleware audit append, break-glass approval, API routes, UI, e2e receipts, production readiness, or enterprise readiness.
