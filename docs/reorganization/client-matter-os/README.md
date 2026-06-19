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
| `29-g3-a-crm-schema-report.md` | Records the G3-A Lead, Opportunity, CRMActivity, Proposal, Referral, and Campaign schema slice. |
| `30-g3-b-crm-service-ui-closeout-report.md` | Records the G3-B CRM pipeline, permission trimming, summary UI, Opportunity-to-Intake, KeyClientPlan, and partial closeout slice. |
| `31-g3-c-intake-conflict-schema-report.md` | Records the G3-C IntakeRequest, ConflictCheck, and ConflictHit schema slice. |
| `32-g3-d-conflict-engagement-workflow-report.md` | Records the G3-D conflict search, decision, waiver, engagement, FeeTerms, risk approval, and clearance-token workflow slice. |
| `33-g3-e-intake-ui-closeout-report.md` | Records the G3-E conflict memo boundary, waiver UI, engagement UI, and G3 Intake closeout slice. |
| `34-g4-matter-dms-entry-plan.md` | Opens the G4 Matter/DMS execution lane with TUW coverage, entry evidence, Matter opening clearance controls, DMS permission/search controls, and PR slices. |
| `35-g4-a-matter-opening-foundation-report.md` | Records the G4-A Matter opening record, matter number reservation, atomic opening transaction refs, and MatterMember permission slice. |
| `36-g4-b-matter-execution-workflow-report.md` | Records the G4-B Matter team UI, task transition, deadline audit, critical deadline dual control, status history, and client report projection slice. |
| `37-g4-c-matter-closeout-ui-report.md` | Records the G4-C Matter closing checklist, silent matter visibility, dashboard ACL trimming, and Matter closeout evidence slice. |
| `38-g4-d-dms-workspace-document-foundation-report.md` | Records the G4-D DMS workspace, folder path, document upload, version, file object, and hash-lineage foundation slice. |
| `39-g4-e-dms-security-email-search-report.md` | Records the G4-E DMS checkout lock, privilege label, redaction, secure link, email filing, Outlook placeholder, and search ACL slice. |
| `40-g4-f-dms-ui-audit-closeout-report.md` | Records the G4-F DMS workspace UI, view/download/share audit coverage, and G4 DMS closeout slice. |
| `41-g5-billing-finance-entry-plan.md` | Opens the G5 Billing/Finance execution lane with TUW coverage, G4 handoff evidence, revenue runtime requirements, and PR slices. |
| `42-g5-a-time-expense-foundation-report.md` | Records the G5-A TimeEntry, RateCard, FeeArrangement, time-entry workflow, Expense, and Disbursement foundation slice. |
| `43-g5-b-wip-prebill-adjustment-report.md` | Records the G5-B WIP generation, immutable PreBill snapshot, partner review, and write-down/write-off approval slice. |
| `44-g5-c-invoice-tax-billing-ui-report.md` | Records the G5-C invoice issue, invoice-line reconciliation, TaxInvoice, correction workflow, Billing UI masking, and G5 Billing closeout slice. |
| `45-g5-d-payment-ar-foundation-report.md` | Records the G5-D Payment import, duplicate import idempotency, partial matching, ARBalance, and AR aging foundation slice. |
| `46-g5-e-accounting-tax-export-report.md` | Records the G5-E JournalEntry, accounting export, and VAT/tax export slice. |
| `47-g5-f-settlement-finance-ui-closeout-report.md` | Records the G5-F SettlementRun, OriginationCredit, WorkingCredit, settlement approval, Finance UI masking, and G5 Finance closeout slice. |
| `48-g6-analytics-ai-portal-entry-plan.md` | Opens the G6 Analytics, AI Governance, AI Legal Workflows, Client Portal, and Data Room planning lane. |
| `49-g6-a-analytics-read-model-foundation-report.md` | Records the G6-A AnalyticsEvent, profitability, utilization, and realization read-model foundation slice. |
| `50-g6-b-analytics-dashboard-export-closeout-report.md` | Records the G6-B AR aging, client health, practice P&L, analytics export, and Analytics closeout slice. |
| `51-g6-c-ai-policy-retrieval-audit-report.md` | Records the G6-C ModelPolicy, RetrievalRequest, permission-aware retrieval, and PromptLog audit slice. |
| `52-g6-d-ai-output-review-controls-report.md` | Records the G6-D AIOutput, Citation, HumanReviewQueue, and DisableSwitch review-control slice. |
| `53-g6-e-ai-legal-workflows-closeout-report.md` | Records the G6-E AI legal workflow, workflow-builder, AI export, and AI closeout slice. |
| `54-g6-f-portal-rfi-foundation-report.md` | Records the G6-F ExternalUser, PortalMatterProjection, ExternalACL, RFIRequest, and RFIResponse upload slice. |
| `55-g6-g-portal-data-room-closeout-report.md` | Records the G6-G client approval, secure link, DataRoom, portal audit, and Portal/Data Room closeout slice. |
| `56-g7-enterprise-hardening-entry-plan.md` | Opens the G7 Enterprise hardening, UAT, migration, HRX, QA/security, and production-readiness planning lane. |

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
npm run client-matter:g3a:validate
npm run client-matter:g3b:validate
npm run client-matter:g3c:validate
npm run client-matter:g3d:validate
npm run client-matter:g3e:validate
npm run client-matter:g4:plan:validate
npm run client-matter:g4a:validate
npm run client-matter:g4b:validate
npm run client-matter:g4c:validate
npm run client-matter:g4d:validate
npm run client-matter:g4e:validate
npm run client-matter:g4f:validate
npm run client-matter:g5:plan:validate
npm run client-matter:g5a:validate
npm run client-matter:g5b:validate
npm run client-matter:g5c:validate
npm run client-matter:g5d:validate
npm run client-matter:g5e:validate
npm run client-matter:g5f:validate
npm run client-matter:g6:plan:validate
npm run client-matter:g6a:validate
npm run client-matter:g6b:validate
npm run client-matter:g6c:validate
npm run client-matter:g6d:validate
npm run client-matter:g6e:validate
npm run client-matter:g6f:validate
npm run client-matter:g6g:validate
npm run client-matter:g7:plan:validate
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

The G3-A validator checks CRM Lead, Opportunity, CRMActivity, Proposal,
Referral, and Campaign schema evidence, Party Master references, direct
Opportunity-to-Matter blocking, confidential activity trimming claims, proposal
fee-estimate references, campaign contact consent, test coverage, and the open
runtime-readiness boundary.

The G3-B validator checks CRM Opportunity pipeline descriptors, confidential
activity trimming, no conflict memo or billing detail leak in CRM summary state,
Opportunity-to-Intake-only command evidence, KeyClientPlan AR/detail masking,
partial closeout evidence, test coverage, and the open runtime-readiness
boundary.

The G3-C validator checks IntakeRequest required Party references,
pre-clearance Matter blocking, ConflictCheck immutable snapshot evidence,
ConflictHit source/audit evidence, test coverage, and the open
runtime-readiness boundary.

The G3-D validator checks conflict search source coverage, reviewer-required
decision workflow, waiver consent document evidence, engagement legal
client/scope requirements, hourly/fixed/cap/retainer FeeTerms, risk approval
audit evidence, expired or stale clearance-token blocking, test coverage, and
the open runtime-readiness boundary.

The G3-E validator checks conflict memo permission boundaries, CRM-user denial,
hidden-field and unauthorized-count leak guards, waiver denied/review UI states,
engagement signed/approved UI states, G3 closeout evidence, Opportunity-to-Matter
bypass blocking, test coverage, and the open runtime-readiness boundary.

The G4 plan validator checks all 30 G4 TUWs, Matter, DMS, and Email-DMS
descriptor evidence, R-005/R-011/R-015 controls, G3 clearance before Matter
opening, required validation scripts, and the open runtime-readiness boundary.

The G4-A validator checks Matter opening clearance requirements, matter number
idempotency and duplicate blocking, ACL/DMS/Billing atomic opening refs,
MatterMember role permission evidence, test coverage, and the open
runtime-readiness boundary.

The G4-B validator checks Matter team add/remove audit and hidden-member
trimming, MatterTask status transitions, deadline-change audit, critical
deadline two-person confirmation, immutable status history, client-safe report
projection, test coverage, and the open runtime-readiness boundary.

The G4-C validator checks Matter closing checklist blockers for WIP, AR, holds,
unresolved tasks, retention, and invoice review, silent matter unauthorized
omission, Matter dashboard ACL trimming, hidden-field removal, Matter closeout
evidence, test coverage, and the open runtime-readiness boundary.

The G4-D validator checks DMS workspace matter requirements, folder path
permission and traversal blocking, document upload audit evidence, immutable
document version evidence, file-object raw storage path blocking, document hash
lineage and mismatch detection, test coverage, and the open runtime-readiness
boundary.

The G4-E validator checks DMS check-in/check-out lock evidence, privilege
AI/search exclusion, redacted export metadata, secure-link expiry/MFA/watermark
controls, Matter-traced email filing, Outlook placeholder no-credential-leak
guards, search ACL unauthorized-result omission, test coverage, RP06/RP08
descriptor-only contract boundaries, and the open runtime-readiness boundary.

The G4-F validator checks DMS workspace UI current-version and privilege-label
display, UI no-byte/no-raw-path/no-extracted-text leak guards, DMS
view/download/share audit coverage, sensitive audit payload blocking, G4 DMS
closeout evidence, G4-D/G4-E dependencies, RP06 descriptor-only contract
boundary, and the open runtime-readiness boundary.

The G5 plan validator checks all 30 G5 TUWs, Time/Expense, Billing,
Payments/AR, and Settlement descriptor evidence, R-001/R-006/R-013/R-014/R-015
controls, G4 Matter/DMS handoff requirements before revenue runtime, required
validation scripts, and the open runtime-readiness boundary.

The G5-A validator checks TimeEntry Matter-required field coverage, RateCard
effective dates, FeeArrangement BillingProfile and rate override mapping,
submit/approve/lock workflow evidence, Expense evidence-document requirements,
Disbursement billable-flag evidence, test coverage, RP11 descriptor-only
contract boundary, and the open runtime-readiness boundary.

The G5-B validator checks approved-source WIP generation, immutable PreBill
snapshot evidence, partner review requirements, write-down/write-off approval
requirements, issued-invoice mutation blocking, test coverage, RP12
descriptor-only contract boundary, and the open runtime-readiness boundary.

The G5-C validator checks idempotent invoice issue evidence, WIP-to-invoice
line reconciliation, TaxInvoice issue/transmit/fail evidence, issued-invoice
direct-edit blocking, Billing UI role-based detail masking, time-to-invoice
closeout evidence, test coverage, RP12 descriptor-only contract boundary, and
the open runtime-readiness boundary.

The G5-D validator checks Payment imported/unmatched state evidence, duplicate
import idempotency, partial payment matching without duplicate cash recognition,
ARBalance derivation from issued invoices, AR aging bucket calculation evidence,
test coverage, RP13 descriptor-only contract boundary, and the open
runtime-readiness boundary.

The G5-E validator checks balanced JournalEntry evidence, accounting export
audit evidence, VAT/tax export period-lock evidence, test coverage, RP13
descriptor-only contract boundary, and the open runtime-readiness boundary.

The G5-F validator checks SettlementRun run-lock evidence, OriginationCredit
allocation-sum evidence, WorkingCredit role-allocation evidence, posted
settlement run direct-edit blocking, Finance UI permission masking,
invoice-to-payment closeout evidence, test coverage, RP14 descriptor-only
contract boundary, and the open runtime-readiness boundary.

The G6 plan validator checks all 32 G6 TUWs, Analytics, Governance/DLP, AI
Governance, AI Legal Workflows, Client Portal, and Data Room descriptor
evidence, R-005/R-007/R-009/R-015 controls, G5 Finance handoff requirements
before analytics/AI/portal runtime, required validation scripts, and the open
runtime-readiness boundary.

The G6-A validator checks AnalyticsEvent no-source-mutation evidence,
MatterProfitability invoice/payment/time join evidence, ClientProfitability
client-group aggregation evidence, UtilizationMetric capacity denominator
evidence, RealizationMetric billed-versus-standard value evidence, test
coverage, RP15 descriptor-only contract boundary, and the open
runtime-readiness boundary.

The G6-B validator checks AR aging dashboard finance permission evidence,
client-health conflict and Matter detail omission, practice P&L role-based
visibility, analytics export audit, masking, tenant scope, read-model-only
closeout evidence, test coverage, RP15 descriptor-only contract boundary, and
the open runtime-readiness boundary.

The G6-C validator checks ModelPolicy Matter sensitivity and privilege routing,
RetrievalRequest Matter-required evidence, permission-aware retrieval
unauthorized-document exclusion, PromptLog audit evidence, test coverage, RP17
descriptor-only contract boundary, and the open runtime-readiness boundary.

The G6-D validator checks AIOutput candidate default state, Citation
required-before-confirm evidence, HumanReview confirm/reject audit evidence,
DisableSwitch dark-launch-off evidence, test coverage, RP17 descriptor-only
contract boundary, and the open runtime-readiness boundary.

The G6-E validator checks LegalWorkflow human approval step evidence, Workflow
Builder no-auto-final legal decision controls, AI output export privilege-label
and ACL inheritance, AI ACL bypass blocking, test coverage, RP18
descriptor-only contract boundary, and the open runtime-readiness boundary.

The G6-F validator checks ExternalUser separation from internal identities,
PortalMatterProjection internal memo and hidden detail exclusion, ExternalACL
shared-only access, RFIRequest due date/status evidence, RFIResponse upload
security placeholders, test coverage, RP19 descriptor-only contract boundary,
and the open runtime-readiness boundary.

The G6-G validator checks client approval audit evidence, secure-link expiry,
watermark, and MFA controls, DataRoom room-level ACL evidence, portal external
view/upload audit coverage, no-internal-data-exposure closeout, test coverage,
RP19/RP20 descriptor-only contract boundaries, and the open runtime-readiness
boundary.

The G7 plan validator checks all 40 G7 TUWs, W12-W15 coverage, Admin,
Integrations, Migration, Enterprise SaaS, Platform, Marketplace, Commercial,
and HRX descriptor evidence, G6-G handoff, stacked PR branch markers, and the
open boundary for enterprise trust, UAT completion, production readiness, and
go-live approval.

## Non-Goals

- No runtime write path is opened by this lane.
- No package, contract, or validator behavior is changed by this lane.
- No current closeout-pack evidence is rewritten.
- No existing user-authored uncommitted files are staged by this lane.
