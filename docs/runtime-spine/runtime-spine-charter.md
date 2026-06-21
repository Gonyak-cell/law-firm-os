# Law Firm OS Runtime Spine Charter

Status: G0 scope-ready candidate
Date: 2026-06-21
Baseline: PR #73 merge commit `41268c4becac7d06948d10c173d30635e108c5e1`

## Purpose

The Runtime Spine lane turns Law Firm OS from descriptor-only and synthetic fixture evidence toward a runtime-ready enterprise SaaS spine. It is additive: it must not rewrite closed pack evidence, weaken existing production-ready semantics, or claim actual launch/go-live.

The six runtime spines are:

| Spine | Goal | Gate |
| --- | --- | --- |
| RS-1 | Tenant-scoped durable DB | G1 Persistence Ready |
| RS-2 | Server-derived AuthN/AuthZ | G2 Trust Boundary Ready |
| RS-3 | Non-bypassable durable audit | G3 Audit Ready |
| RS-4 | Client-Matter-People canonical model | G4 Canonical Model Ready |
| RS-5 | UI/API/write path wiring | G5 App Runtime Ready |
| RS-6 | Runtime integration tests and runtime_ready gate | G6 Runtime-ready Candidate |

RS-PRE owns G0 Runtime Scope Ready and freezes the decision, boundary, ledger, and evidence structure before runtime implementation begins.

## Non-goals

- Do not reinterpret descriptor-only, synthetic fixture, no-write, or closeout evidence as runtime execution.
- Do not treat `runtime_ready` as a replacement for `production_ready`.
- Do not claim actual launch/go-live from repo implementation evidence alone.
- Do not open Portal, Outlook/M365, HR real data, external AI, or Vault import/sync before their later gates.
- Do not trust caller-supplied tenant, role, or permission context for real data access.

## Owner Roles

Real names are not inferred in this repo. G0 records owner roles only:

| Role | Approval Boundary |
| --- | --- |
| Product Owner | product scope, go-live scope, prioritization |
| Architecture Owner | DB, runtime, API, service boundary |
| Security Owner | AuthN/AuthZ, audit, tenant isolation, classification |
| Data Owner | schema, migration, retention, residency |
| Microsoft 365 Owner | SharePoint, Graph, Outlook consent |
| HR Owner | employee, HR, payroll, evaluation, candidate data |
| Verification Owner | tests, validators, runtime_ready evidence |
| UI Owner | UI/API wiring, accessibility, error states |

## Gate Summary

| Gate | Entry Condition | Exit Evidence |
| --- | --- | --- |
| G0 | PR #73 baseline clean | RS-PRE T01-T10 closed or timed-deferred |
| G1 | G0 scope ready | persistence package, migrations, tenant isolation evidence |
| G2 | G1 persistence ready | server-derived principal and AuthZ context evidence |
| G3 | G2 trust boundary ready | durable audit, hash-chain, route coverage evidence |
| G4 | G1-G3 foundation ready | canonical object migrations and fixture evidence |
| G5 | G4 model ready | API/UI write path smoke with auth and audit |
| G6 | G5 app runtime ready | runtime integration harness, RTG-001..005 evidence |

## Launch Boundary

`runtime_ready_candidate` and `actual_launch_go_live_completed` are separate claims. G6 may establish a repo-side runtime-ready candidate, but actual production launch still requires owner go/no-go, external environment smoke, migration operator receipt, rollback readiness, and production monitoring evidence.
