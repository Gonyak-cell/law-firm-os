# HRX SLO Definition

Status: PR-13 enterprise controls evidence
Date: 2026-06-20

This document defines the operational SLO targets required before HRX can be considered for `runtime_write_ready__durable_persistence_guarded` promotion. It is not go-live approval, R4 approval, or an enterprise-ready claim.

## Service SLOs

| Area | Target | Measurement | Blocking condition |
| --- | --- | --- | --- |
| Availability | 99.9% monthly availability for `/api/hrx/*` read and write routes | Synthetic API probe plus application health reporting | Any unresolved P0 tenant isolation, authz, or persistence failure |
| Latency | p95 under 500 ms for standard HRX read routes and p95 under 900 ms for write routes | `hrx.operation.latency_ms` metric grouped by route and tenant | Baseline smoke exceeds target for two consecutive runs |
| Error rate | 5xx rate under 0.1% per day for HRX routes | `hrx.operation.error_count` divided by request count | Any sustained 5xx burst without owner-reviewed incident note |
| Security events | 100% of denied/step-up/cross-tenant HRX decisions counted | `hrx.operation.security_count` plus audit events | Missing counter for sensitive route denial |
| Audit writes | 100% of sensitive HRX read/write decisions have durable audit append evidence | Audit hash-chain and route audit validator | Any sensitive route without audit append evidence |
| Retention execution | 100% of due purge candidates evaluated, 0 legal-hold records purged | Retention job decisions and compliance report | Due purge skipped without recorded reason or legal hold bypass |

## Evidence Rules

- SLO evidence must be tenant scoped and must not include raw HR, compensation, evaluation, candidate, or document body fields.
- Local passing tests may support engineering readiness, but they do not authorize go-live.
- Owner sign-off remains required before any go-live, R4, production-ready, or enterprise-ready claim.
