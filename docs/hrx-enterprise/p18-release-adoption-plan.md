# HRX-P18 Release Adoption Plan

Status: In progress
PR lane: PR-12
Depends on: HRX-P17 Hardening B exit gate

## Scope

HRX-P18 packages the embedded People runtime for human release decision. It creates the PR sequence board, cutover and rollback runbook, tenant/risk-tier feature flag contract, go-live no-go checklist, and developer handoff receipt.

## TUW Mapping

| TUW | Artifact | Exit Evidence |
| --- | --- | --- |
| HRX-ENT-L8-W02-T01 | `docs/hrx-enterprise/pr-sequence.md` | Twelve PR lanes map HRX-P01 through HRX-P18 with dependency gates |
| HRX-ENT-L8-W02-T02 | `docs/hrx-enterprise/cutover-runbook.md` | Migration, feature flag, validation, rollback, and owner decision steps are explicit |
| HRX-ENT-L8-W02-T03 | `contracts/hrx-feature-flags.json` | HRX modules are disabled by default and enable only by tenant, risk tier, and prerequisite gate |
| HRX-ENT-L8-W02-T04 | `docs/hrx-enterprise/go-live-checklist.md` | Any failed runtime, authz, audit, e2e, security, or rollback gate is a no-go |
| HRX-ENT-L8-W02-T05 | `docs/hrx-enterprise/dev-handoff-receipt.md` | Engineering handoff acknowledges scope, non-goals, evidence, and human release authority |

## Verification

- `npm run hrx:release:validate`
- `npm run hrx:enterprise:validate`
- `npm run hrx:runtime:validate`
- `npm run rp30:hrx:validate`
- `npm run validate`

## Boundary

This pack does not authorize production go-live. It creates a release package ready for human approval.
