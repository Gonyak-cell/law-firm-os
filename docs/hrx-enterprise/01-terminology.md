# HRX Runtime Terminology

Status: accepted
Date: 2026-06-19
TUW: HRX-ENT-L0-W01-T02

## Required Terms

Descriptor-only: A contract, projection, handoff, or closeout artifact that describes a boundary or intended behavior without executing runtime state changes.

Synthetic fixture: Non-production sample data created for tests, examples, or planning. Synthetic fixtures must be labeled and must not be treated as real employee, candidate, payroll, client, or matter data.

Fixture: Test or demo data used to exercise behavior. A fixture may support validation, but it does not prove production readiness by itself.

API-backed: A UI or workflow state that is loaded from or written through an application API with tenant, actor, permission, validation, and audit boundaries.

Persistence: A repository or database-backed path that stores HRX runtime state under tenant isolation and preserves the Employee/User separation rule.

Runtime-ready: A scoped engineering state where the relevant schema, repository, service, API, permission, audit, and test evidence exist for the specific HRX slice. Runtime-ready is narrower than production-ready.

Production-ready: A release state where runtime, API, UI, e2e, tenant isolation, security negative tests, observability, backup/restore, compliance, UAT, rollback, and human release receipt gates pass.

Enterprise-ready: A later release claim evaluated after HRX-P17 and HRX-P18. It requires hardening and release evidence, not only local unit tests.

## False Readiness Rules

- Descriptor-only evidence cannot satisfy runtime-ready.
- Runtime-ready cannot satisfy production-ready.
- Production-ready cannot be claimed without human release authority.
- Static UI cannot satisfy API-backed UI acceptance.
- A permission decision without audit append is incomplete for sensitive HR operations.

## Claim Mapping

| Evidence | Allowed Claim | Blocked Claim |
| --- | --- | --- |
| Descriptor/projection | Planning or guardrail evidence | Runtime-ready |
| Synthetic fixture | Test fixture coverage | Real HR data available |
| Unit tests only | Local slice behavior | Production-ready |
| API route without UI/e2e | API slice ready | Full product ready |
| HR AI draft output | Reviewable claim | Final employment decision |

