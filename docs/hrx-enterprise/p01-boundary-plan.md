# HRX-P01 Boundary Plan

Status: active plan
Date: 2026-06-19
Pack: HRX-P01
PR lane: PR-01
Source TUWs: HRX-ENT-L0-W01-T01 through HRX-ENT-L0-W01-T04

## Purpose

HRX-P01 locks the product boundary before runtime work begins. It accepts the HRX Enterprise TUW package into the Law Firm OS roadmap while blocking overclaims that would turn the current descriptor-backed HRX layer into a claimed standalone HR SaaS, payroll engine, or HR AI decision system.

## Scope

| TUW | Output | Acceptance Gate |
| --- | --- | --- |
| HRX-ENT-L0-W01-T01 | docs/hrx-enterprise/00-boundary-decision.md | Standalone HR SaaS claim is blocked; embedded-to-runtime strategy is explicit |
| HRX-ENT-L0-W01-T02 | docs/hrx-enterprise/01-terminology.md | descriptor, synthetic, fixture, API, persistence, runtime-ready, and production-ready are defined |
| HRX-ENT-L0-W01-T03 | contracts/hrx-payroll-boundary.json | calculation_runtime=false and export_preview=true |
| HRX-ENT-L0-W01-T04 | contracts/hrx-ai-decision-boundary.json | hire, fire, pay, and evaluation final decisions are blocked |

## Entry Gate

- Pack 0 intake exists.
- All 88 source TUWs are mapped in docs/hrx-enterprise/tuw-traceability-matrix.md.
- HRX-P01 is the first pack in docs/hrx-enterprise/sequential-pack-pr-board.md.

## Exit Gate

- All four HRX-P01 target files exist.
- Payroll boundary JSON parses and blocks calculation runtime.
- AI decision boundary JSON parses and blocks employment, pay, evaluation, discipline, and termination final decisions.
- Boundary documentation states that current HRX is embedded in Law Firm OS and does not claim production HRIS readiness.

## Validation Commands

```sh
test -f docs/hrx-enterprise/00-boundary-decision.md
test -f docs/hrx-enterprise/01-terminology.md
node -e "const p=require('./contracts/hrx-payroll-boundary.json'); if (p.calculation_runtime !== false || p.export_preview !== true) process.exit(1)"
node -e "const a=require('./contracts/hrx-ai-decision-boundary.json'); for (const k of ['hire','fire','pay_change','performance_rating','termination']) if (!a.blocked_final_decisions.includes(k)) process.exit(1)"
```

## Claim Boundary

This pack is a boundary implementation only. It does not create HRX database tables, API handlers, UI screens, permission decisions, audit events, runtime receipts, or production readiness evidence.

