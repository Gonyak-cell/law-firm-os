# HRX-P03 Runtime Core A Plan

Status: active plan
Date: 2026-06-19
Pack: HRX-P03
PR lane: PR-02
Source TUWs: HRX-ENT-L2-W01-T01 through HRX-ENT-L2-W01-T04

## Purpose

HRX-P03 opens the first runtime foundation slice without claiming API, UI, authz, audit, or production readiness. The pack creates the core Employee, EmploymentProfile, and EmployeeUserLink schema, idempotent SQL migration, an in-memory repository adapter for local runtime tests, and an identity-link service that keeps Employee separate from IAM User.

## Scope

| TUW | Output | Acceptance Gate |
| --- | --- | --- |
| HRX-ENT-L2-W01-T01 | packages/hrx/src/schema.js | Employee, EmploymentProfile, and EmployeeUserLink schemas exported |
| HRX-ENT-L2-W01-T02 | packages/hrx/src/migrations/001_hrx_core.sql | Core HRX tables use idempotent create statements and identity separation constraints |
| HRX-ENT-L2-W01-T03 | packages/hrx/src/repository.js | Employee and EmploymentProfile CRUD roundtrips pass |
| HRX-ENT-L2-W01-T04 | packages/hrx/src/identity-link.js | User never equals Employee and purpose is login_mapping only |

## Entry Gate

- HRX-P02 governance gate passed.
- Runtime readiness validator exists and blocks descriptor-only false passes.
- Existing RP30 descriptor validator still passes.

## Exit Gate

- P03 package tests pass.
- Migration DDL is idempotent and non-destructive.
- Employee and EmploymentProfile schemas reject direct IAM user identity fields.
- EmployeeUserLink rejects employee_id equal to user_id.
- Runtime readiness validator still fails in normal mode because P04+ API/authz/audit/UI/e2e gates are not complete.

## Validation Commands

```sh
node --test packages/hrx/test/schema.test.js
npm run db:migrate:test
node --test packages/hrx/test/repository.test.js
node --test packages/hrx/test/identity-link.test.js
npm run hrx:runtime:validate:expect-not-ready
npm run rp30:hrx:validate
npm run validate
```

## Claim Boundary

This pack opens only local HRX runtime foundation. It does not create API handlers, authz policies, audit append services, UI screens, e2e receipts, payroll runtime, AI final decisions, production readiness, or enterprise readiness.
