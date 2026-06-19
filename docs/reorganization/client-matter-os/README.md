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

## Follow-Up Decision Artifacts

| File | Purpose |
| --- | --- |
| `14-billing-profile-ownership-adr.md` | Proposes Party & Relationship Master as the canonical `BillingProfile` owner while Billing owns downstream workflow state. |
| `15-github-remote-vault-flow-adr.md` | Proposes the sanitized GitHub snapshot plus draft `codex/*` PR flow as the review surface while local history remains untouched. |
| `16-planning-root-adr.md` | Proposes this folder as the canonical G0-G7 Client-Matter OS planning root. |
| `17-g1-g2-sequencing-adr.md` | Proposes separate G1/G2 PR lanes with sequential runtime gate acceptance. |

## Gate Entry Plans

| File | Purpose |
| --- | --- |
| `18-g1-trust-foundation-plan.md` | Opens the G1 Trust Foundation execution lane with TUW coverage, entry evidence, required runtime evidence, and PR slices. |
| `19-g1-a-tenant-actor-context-report.md` | Records the G1-A tenant boundary, actor context, and permission context implementation slice. |
| `20-g1-b-durable-audit-report.md` | Records the G1-B durable audit event schema, middleware append, and sensitive-read audit slice. |
| `21-g1-c-permission-controls-report.md` | Records the G1-C evaluator wrapper, deny-over-allow, Object ACL, ethical wall, legal hold, and break-glass control slice. |
| `22-g1-d-audit-closeout-report.md` | Records the G1-D hash-chain verification, tenant export, admin simulator, and closeout evidence slice. |
| `23-g2-party-master-entry-plan.md` | Opens the G2 Party & Relationship Master planning lane with TUW coverage, entry evidence, runtime-evidence requirements, and slice boundaries. |
| `24-g2-a-party-schema-report.md` | Records the G2-A Party, Person, Organization, PartyAlias, and PartyIdentifier schema slice. |
| `25-g2-b-relationship-billing-profile-report.md` | Records the G2-B ClientGroup, Relationship, ContactPoint, and BillingProfile reference slice. |
| `26-g2-c-duplicate-search-merge-report.md` | Records the G2-C duplicate candidate, related-party search, and merge/split descriptor slice. |
| `27-g2-d-ui-closeout-report.md` | Records the G2-D Party search/profile UI-state and G2 closeout evidence descriptor slice. |
| `28-g3-crm-intake-entry-plan.md` | Opens the G3 CRM/Intake execution lane with TUW coverage, entry evidence, Opportunity-to-Matter shortcut controls, and PR slices. |

## Execution Order

1. Close G0: inventory, ownership, module boundaries, runtime readiness.
2. Open G1/G2: separate Trust Foundation and Party Master PR lanes, with G1
   runtime evidence required before G2 runtime readiness.
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

## Current Planning Root

`docs/reorganization/client-matter-os/` is the proposed canonical planning root
for the G0-G7 Client-Matter OS transition. Closeout-pack evidence, runtime
contracts, and package-local implementation evidence remain in their existing
locations.

## Validation

```sh
npm run client-matter:g0:validate
npm run client-matter:g1:plan:validate
npm run client-matter:g1a:validate
npm run client-matter:g1b:validate
npm run client-matter:g1c:validate
npm run client-matter:g1d:validate
npm run client-matter:g2:plan:validate
npm run client-matter:g2a:validate
npm run client-matter:g2b:validate
npm run client-matter:g2c:validate
npm run client-matter:g2d:validate
npm run client-matter:g3:plan:validate
```

This validator checks that the G0-G7 roadmap, all 198 TUWs, 15 source risks,
R0-R6 readiness badges, target folder checklist, decision ADRs,
no-self-merge boundary, and direct Opportunity-to-Matter shortcut prohibition
remain present.

The G1 plan validator checks the 16 G1 TUWs, permission/audit source contracts,
required npm scripts, and the open runtime-readiness boundary.

The G1-A validator checks tenant-boundary, actor-context, permission-context,
test, export, TUW trace, and G1-open boundary evidence.

The G1-B validator checks durable audit event, middleware append, sensitive-read
audit, test, export, TUW trace, and G1-open boundary evidence.

The G1-C validator checks the `/permissions/evaluate` wrapper, decision routing,
deny-over-allow, Object ACL, ethical wall, legal hold, break-glass, test, export,
TUW trace, and G1-open boundary evidence.

The G1-D validator checks hash-chain verification, tenant-scoped audit export,
admin permission simulation, closeout receipt, test, export, TUW trace, and
G1-open boundary evidence.

The G2 plan validator checks all 14 G2 TUWs, BillingProfile Party Master
ownership, G1/G2 sequencing, Master Data evidence surfaces, validation scripts,
and the open runtime-write-readiness boundary.

The G2-A validator checks Party, Person, Organization, PartyAlias, and
PartyIdentifier schema evidence, tenant-scoped identity keys, duplicate
alias/identifier review claims, contract scope, test coverage, and the open
runtime-write-readiness boundary.

The G2-B validator checks ClientGroup membership, Relationship Party endpoints,
ContactPoint primary/verified fields, BillingProfile legal-client versus
billing-client references, contract risks, test coverage, and the open
runtime-write-readiness boundary.

The G2-C validator checks duplicate candidate review queues, tenant-scoped
related-party lookup, merge/split audit and rollback descriptors, contract
risks, test coverage, and the open runtime-write-readiness boundary.

The G2-D validator checks denied and review-required Party search/profile UI
states, hidden-field and unauthorized-count protection, CRM/Matter/Billing
reference evidence, command evidence, draft PR state, human review disposition,
contract risks, test coverage, and the open runtime-write-readiness boundary.

The G3 plan validator checks all 26 G3 TUWs, CRM and Intake descriptor evidence,
R-001/R-002/R-003 controls, Opportunity-to-Matter shortcut prohibition,
required validation scripts, and the open runtime-readiness boundary.

## Non-Goals

- No runtime write path is opened by this lane.
- No package, contract, or validator behavior is changed by this lane.
- No current closeout-pack evidence is rewritten.
- No existing user-authored uncommitted files are staged by this lane.
