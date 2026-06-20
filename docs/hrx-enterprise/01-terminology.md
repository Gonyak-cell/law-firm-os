# HRX Runtime Terminology

Status: accepted
Date: 2026-06-20
TUW: HRX-L0-005

## Required Terms

Descriptor-only: A contract, projection, handoff, or closeout artifact that describes a boundary or intended behavior without executing runtime state changes.

Synthetic fixture: Non-production sample data created for tests, examples, or planning. Synthetic fixtures must be labeled and must not be treated as real employee, candidate, payroll, client, or matter data.

Fixture: Test or demo data used to exercise behavior. A fixture may support validation, but it does not prove production readiness by itself.

API-backed: A UI or workflow state that is loaded from or written through an application API with tenant, actor, permission, validation, and audit boundaries. Static fallback data is not API-backed evidence.

Persistence: A repository or database-backed path that stores HRX runtime state under tenant isolation and preserves the Employee/User separation rule.

Durable production persistence: A DB-backed runtime path with migrations, transactions, restart durability, backup/restore smoke evidence, and no production default to in-memory storage.

Route-level HR-sensitive authz: A deny-by-default policy decision attached to every `/api/hrx/*` route with action, sensitivity, required scope, tenant, actor, and purpose inputs.

Durable audit: Append-only audit storage that survives process restart and records actor, tenant, route/action, object, permission decision, reason, previous hash, and event hash when required.

Step-up: A fresh MFA or equivalent high-assurance session proof required before sensitive compensation, evaluation, payroll, audit, or similarly classified HR actions.

Real tenant/actor context: Tenant, actor, session, and scope derived from trusted server-side context. Query parameters or client-created allow rules do not satisfy this term.

Runtime-ready: A scoped engineering state where the relevant schema, repository, service, API, permission, audit, and test evidence exist for the specific HRX slice. Runtime-ready is narrower than production-ready.

Production-ready: A release state where runtime, API, UI, e2e, tenant isolation, security negative tests, observability, backup/restore, compliance, UAT, rollback, and human release receipt gates pass.

Enterprise-ready: A later release claim evaluated after PR-15 owner review. It requires all P0/P1 roadmap TUWs to be traced and all hardening/release evidence to be current, not only local tests.

Current HRX readiness boundary: `runtime_api_evidence_only__durable_persistence_open`.

Target HRX roadmap state: `runtime_write_ready__durable_persistence_guarded`. This is a future target, not a current claim.

## False Readiness Rules

- Descriptor-only evidence cannot satisfy runtime-ready.
- Runtime-ready cannot satisfy production-ready.
- Production-ready cannot be claimed without human release authority.
- Static UI cannot satisfy API-backed UI acceptance.
- A permission decision without audit append is incomplete for sensitive HR operations.
- Durable persistence cannot be claimed while production runtime defaults to in-memory storage.
- A step-up implementation that is not wired to sensitive routes is not step-up enforcement.

## Claim Mapping

| Evidence | Allowed Claim | Blocked Claim |
| --- | --- | --- |
| Descriptor/projection | Planning or guardrail evidence | Runtime-ready |
| Synthetic fixture | Test fixture coverage | Real HR data available |
| Unit tests only | Local slice behavior | Production-ready |
| API route without UI/e2e | API slice ready | Full product ready |
| HR AI draft output | Reviewable claim | Final employment decision |
| In-memory store | Local runtime evidence | Durable production persistence |
| Route handler without policy map | API shape evidence | HR-sensitive authz enforcement |
