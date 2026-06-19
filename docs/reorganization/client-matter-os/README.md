# Client-Matter OS Reorganization Plan

Status: Proposed
Date: 2026-06-19
Source package: `/Users/jws/Documents/Codex/matter-erp-crm-integration`
Primary gate: `G0 Reorganization Gate`

## Goal

Apply the attached `matter-erp-crm-integration` package as the planning baseline
for turning Law Firm OS from a contract-first, descriptor-heavy project into a
runtime-ready Client-Matter operating system.

This lane is planning-first. It does not open CRM, Intake, Matter, DMS, Billing,
Finance, AI, or Portal runtime work until G0 is closed with inventory,
ownership, boundary, and runtime-readiness evidence.

## Vault-Style PR Rules

1. Work on an isolated `codex/*` branch.
2. Keep the branch scoped to this reorganization lane.
3. Stage only files created or changed for this lane.
4. Keep local validation, PR state, and final merge authority separate.
5. Do not merge the PR from the agent side.

## G0 Deliverables

| File | Purpose |
| --- | --- |
| `00-source-package-register.md` | Records the attached source package and scope. |
| `01-current-folder-inventory.md` | Captures current repo surfaces before movement. |
| `02-package-inventory.md` | Classifies package runtime status. |
| `03-contract-inventory.md` | Classifies contract ownership and runtime role. |
| `04-canonical-glossary.md` | Freezes core terms. |
| `05-canonical-object-ownership.md` | Prevents duplicate canonical objects. |
| `06-module-boundary.md` | Defines module ownership and prohibited ownership. |
| `07-runtime-readiness-standard.md` | Defines R0-R6 badges and gate mapping. |
| `08-migration-manifest.csv` | Template for future folder/document movement. |
| `09-g0-closeout-report.md` | G0 closeout checklist and decision record. |

## Full-Goal Tracking Artifacts

| File | Purpose |
| --- | --- |
| `10-roadmap-and-gates.md` | Preserves the full G0-G7 roadmap and quality gates. |
| `11-full-tuw-catalog.md` | Preserves the full 198-TUW backlog for later slice PRs. |
| `12-risk-register.md` | Carries the source risk register as implementation controls. |
| `13-workflow-state-and-folder-checklist.md` | Carries workflow, state-machine, and target-folder checklists. |

## Execution Order

1. Close G0: inventory, ownership, module boundaries, runtime readiness.
2. Open G1/G2: Trust Foundation plus Party & Relationship Master.
3. Open G3: CRM and Intake only after Party Master and permission/audit
   baselines exist.
4. Open G4-G6: Matter/DMS, Revenue, Analytics/AI/Portal in that order.
5. Close G7: enterprise hardening, UAT, migration, production readiness.

## Current Remote Boundary

The GitHub repository is initialized from a sanitized snapshot because the local
historical repository contains `docs/weighted-implementation-ledger.json`, which
exceeds GitHub's per-file size limit. The sanitized snapshot preserves the
working product surfaces needed for this Vault-style PR flow while leaving the
local historical repository untouched.

## Validation

```sh
npm run client-matter:g0:validate
```

This validator checks that the G0-G7 roadmap, all 198 TUWs, 15 source risks,
R0-R6 readiness badges, target folder checklist, no-self-merge boundary, and
direct Opportunity-to-Matter shortcut prohibition remain present.

## Non-Goals

- No runtime write path is opened by this lane.
- No package, contract, or validator behavior is changed by this lane.
- No current closeout-pack evidence is rewritten.
- No existing user-authored uncommitted files are staged by this lane.
