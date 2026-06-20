# HRX-P02 Governance Plan

Status: active plan
Date: 2026-06-19
Pack: HRX-P02
PR lane: PR-01
Source TUWs: HRX-ENT-L1-W01-T01 through HRX-ENT-L1-W01-T04

## Purpose

HRX-P02 turns the boundary decision into a repeatable execution system. It creates the pull request evidence shape, separates descriptor validation from runtime readiness validation, and fixes the 30/60/90 release gate language before runtime code begins.

## Scope

| TUW | Output | Acceptance Gate |
| --- | --- | --- |
| HRX-ENT-L1-W01-T01 | .github/pull_request_template.md; docs/hrx-enterprise/02-tuw-governance.md | PRs must map changed files to TUWs, packs, lanes, and gates |
| HRX-ENT-L1-W01-T02 | scripts/validate-hrx-runtime-readiness.mjs | Validator fails when HRX runtime DB/API/authz/audit/e2e evidence is missing |
| HRX-ENT-L1-W01-T03 | package.json; scripts/validate-rp30-hrx-people-contract.mjs | Descriptor validator and runtime validator are separate commands and separate claims |
| HRX-ENT-L1-W01-T04 | docs/hrx-enterprise/03-release-gates.md | 30/60/90 gates, owner-deferred items, and no-go conditions are documented |

## Entry Gate

- HRX-P01 boundary gate passed.
- Payroll and AI decision boundary contracts exist.
- Existing RP30 descriptor validator still passes.
- Existing product contract validator still passes.

## Exit Gate

- Pull request template contains TUW mapping, gate evidence, and HRX boundary checks.
- Runtime validator defaults to failing until DB, repository, API, authz, audit, UI/e2e, and release evidence exist.
- Runtime validator has an expect-not-ready mode for the current governance tranche.
- Package scripts expose descriptor validation and runtime validation as separate commands.
- Release gate document blocks production and enterprise readiness claims before later TUW gates.

## Validation Commands

```sh
node scripts/validate-hrx-runtime-readiness.mjs --expect-not-ready
npm run rp30:hrx:validate
npm run validate
git diff --check -- .github/pull_request_template.md docs/hrx-enterprise scripts/validate-hrx-runtime-readiness.mjs package.json
```

## Claim Boundary

This pack is governance implementation only. It does not create HRX database tables, API handlers, UI screens, permission engines, audit stores, e2e receipts, or production readiness evidence.
