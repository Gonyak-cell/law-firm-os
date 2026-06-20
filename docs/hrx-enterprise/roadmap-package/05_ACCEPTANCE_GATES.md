# HRX Acceptance Gates

## Global rule
`runtime_api_evidence_only__durable_persistence_open` 상태에서는 go-live, R4, enterprise-ready claim을 금지합니다.

| Gate | Must pass | Blocks |
|---|---|---|
| G-P0-1 Durable Persistence | DB-backed repository, migration runner, restart durability | runtime-write-ready |
| G-P0-2 Route Authz | Every HRX route evaluates HRX policy | sensitive data exposure |
| G-P0-3 Step-up | Compensation/evaluation/payroll/audit require fresh MFA | enterprise trust |
| G-P0-4 Durable Audit | Append-only DB audit with hash chain | compliance readiness |
| G-P0-5 Real Context | Tenant/actor/session derived from trusted server-side context | tenant isolation |
| G-P0-6 E2E | People portal, leave, approval, document, audit, AI scenarios pass | release readiness |
| G-P0-7 No Premature Claim | R4/go-live forbidden unless all gates + owner approval pass | launch |
