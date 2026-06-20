# HRX Release Gates

Status: accepted
Date: 2026-06-20
TUWs: HRX-L0-003, HRX-L0-004

## Global Rule

`runtime_api_evidence_only__durable_persistence_open` is the current HRX boundary. While this boundary is current, go-live, R4, production-ready, and enterprise-ready claims are blocked.

The roadmap target `runtime_write_ready__durable_persistence_guarded` is a future engineering state. It requires all global P0 gates and the relevant PR-00 through PR-15 exit criteria to pass.

## P0 Gates

| Gate | Must pass | Blocks |
| --- | --- | --- |
| G-P0-1 Durable Persistence | DB-backed repository, migration runner, restart durability | runtime-write-ready |
| G-P0-2 Route Authz | Every HRX route evaluates HRX policy | sensitive data exposure |
| G-P0-3 Step-up | Compensation/evaluation/payroll/audit require fresh MFA | enterprise trust |
| G-P0-4 Durable Audit | Append-only DB audit with hash chain | compliance readiness |
| G-P0-5 Real Context | Tenant/actor/session derived from trusted server-side context | tenant isolation |
| G-P0-6 E2E | People portal, leave, approval, document, audit, AI scenarios pass | release readiness |
| G-P0-7 No Premature Claim | R4/go-live forbidden unless all gates plus owner approval pass | launch |

## Gate Model

The HRX plan uses 30/60/90 day windows as execution planning windows, not readiness claims.

| Window | PRs | Allowed Claim | Required Proof |
| --- | --- | --- | --- |
| 30 day | PR-00 to PR-05 | Boundary, durable persistence, route authz, step-up, and context hardening by slice | Current repo files, tests, and validator evidence for each PR |
| 60 day | PR-06 to PR-12 | Core HRIS, workflows, portal/API, AI, and analytics by gate | Permission, audit, API-backed UI, source-grounded AI, and e2e evidence |
| 90 day | PR-13 to PR-15 | Enterprise controls, DR/UAT, and release decision package | Security, observability, UAT, rollback, and human release receipt |

## P0 Zero Rule

A P0 item cannot be owner-deferred if it blocks the current pack exit gate. The pack remains open until the P0 gate passes or the plan is explicitly changed.

## Owner-Deferred Rule

An owner-deferred item must include:

- Owner name or role.
- Deferral reason.
- Blocked readiness claim.
- Follow-up TUW or pack.
- Expiration condition.

Owner-deferred status does not convert a blocked runtime, production, security, or release gate into a pass.

## No-Go Conditions

HRX cannot claim production or enterprise readiness while any of these conditions are true:

- Runtime validator fails in normal mode.
- Persistence/authz/step-up/audit/context validators are missing or failing for their PR scope.
- Sensitive HR read/write lacks permission and audit evidence.
- Tenant isolation, SSO/MFA, SCIM, or negative security gates are incomplete.
- Backup/restore, observability, UAT, rollback, or go-live checklist is incomplete.
- Human release authority has not signed the final release receipt.

## Human Release Gate

PR-15 can produce a release package ready for human decision. It cannot self-authorize go-live.
