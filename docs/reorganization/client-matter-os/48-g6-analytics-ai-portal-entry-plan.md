# G6 Analytics AI Portal Entry Plan

Status: Proposed
Gate: `G6 AI/Portal Gate`
Depends on: G1 implementation evidence review, G2 implementation evidence review, G3 implementation evidence review, G4 implementation evidence review, G5 implementation evidence review
TUW range: `LFOS-G6-W09-T001` through `LFOS-G6-W11-T010`

## Purpose

G6 opens the Analytics, AI Governance, AI Legal Workflows, Client Portal, and
Data Room execution lane after the G5 Billing/Finance baseline. It turns the
descriptor evidence in RP15 through RP20 into the plan for read-model-only
analytics, permission-aware AI retrieval, human-reviewed AI outputs, portal
projections, external ACLs, RFI workflows, secure links, data rooms, and portal
audit coverage.

This plan opens G6 planning only. It does not claim G6 runtime readiness while
the stacked G1 through G5 PRs are still in draft review.

This plan does not claim G6 runtime readiness.

AI and Portal work remains prohibited unless G1 through G5 have produced valid
permission, audit, Matter, DMS, Billing, and Finance evidence. Analytics must
consume read models without mutating source objects. AI retrieval must inherit
Matter, DMS, privilege-label, external-share, and audit boundaries. Portal and
Data Room surfaces must expose only client-safe projections and shared-only
documents.

## Existing Evidence

| Surface | Current evidence | G6 treatment |
| --- | --- | --- |
| `contracts/analytics-core-contract.json` | RP15 Firm Analytics descriptor contract for managing partner views, Matter P&L, forecasts, and WIP analytics | Reuse as source contract; convert analytics event, profitability, utilization, realization, dashboard, and export controls into runtime tests. |
| `contracts/governance-core-contract.json` | RP16 Governance DLP Retention descriptor contract for DLP, legal hold, retention, break-glass, and incident response | Reuse as control evidence for AI/Portal policy inheritance, retention, DLP, and legal-hold boundaries. |
| `contracts/ai-governance-core-contract.json` | RP17 AI Governance descriptor contract for model policy, citation, and retrieval-scope controls | Reuse as source contract; convert policy routing, Matter-required retrieval, prompt logging, output states, citations, review queues, and disable switch into runtime tests. |
| `contracts/ai-legal-workflows-core-contract.json` | RP18 AI Legal Workflows descriptor contract for precedent, DD extraction, clause markup, and workflow controls | Reuse as source contract; convert legal workflow, workflow-builder, human approval, and no-auto-final-decision controls into runtime tests. |
| `contracts/client-portal-core-contract.json` | RP19 Client Portal descriptor contract for secure link, watermark, and client review controls | Reuse as source contract; convert ExternalUser, portal projection, external ACL, RFI, approval, secure-link, and portal audit controls into runtime tests. |
| `contracts/data-room-vdr-core-contract.json` | RP20 Data Room and VDR descriptor contract for room, RFI, CP, closing binder, and access analytics | Reuse as source contract; convert DataRoom, room ACL, secure document access, and access audit controls into runtime tests. |
| `packages/analytics/README.md` | RP15 generated pack evidence through CP00-479 and no-runtime/no-write boundaries | Treat as descriptor evidence; do not use pack catalog status as Analytics runtime readiness proof. |
| `packages/governance/README.md` | RP16 generated pack evidence through CP00-513 and no-runtime/no-write boundaries | Treat as descriptor evidence; do not use pack catalog status as Governance/DLP runtime readiness proof. |
| `packages/ai-governance/README.md` | RP17 generated pack evidence through CP00-550 and no-runtime/no-write boundaries | Treat as descriptor evidence; do not use pack catalog status as AI Governance runtime readiness proof. |
| `packages/ai-legal-workflows/README.md` | RP18 generated pack evidence through CP00-582 and no-runtime/no-write boundaries | Treat as descriptor evidence; do not use pack catalog status as AI Legal Workflow runtime readiness proof. |
| `packages/client-portal/README.md` | RP19 generated pack evidence through CP00-609 and no-runtime/no-write boundaries | Treat as descriptor evidence; do not use pack catalog status as Client Portal runtime readiness proof. |
| `packages/data-room/README.md` | RP20 generated pack evidence through CP00-644 and no-runtime/no-write boundaries | Treat as descriptor evidence; do not use pack catalog status as Data Room or VDR runtime readiness proof. |
| `docs/reorganization/client-matter-os/47-g5-f-settlement-finance-ui-closeout-report.md` | G5-F descriptor records settlement, finance UI, and invoice-to-payment evidence while keeping readiness open | Use as entry handoff only; G6 still requires accepted G5 evidence or fail-closed stubs before analytics, AI, or portal runtime writes. |
| `docs/reorganization/client-matter-os/12-risk-register.md` | R-005 AI DMS bypass, R-007 portal overexposure, R-009 analytics source mutation, and R-015 descriptor/runtime confusion risks | Use as G6 negative evidence requirements. |
| `docs/reorganization/client-matter-os/13-workflow-state-and-folder-checklist.md` | AIOutput states and target folders 09 Analytics/BI, 10 AI Governance/Legal Workflows, and 11 Client Portal/Data Room | Use as workflow and folder coverage map for G6 runtime evidence. |

## Runtime Evidence Still Required

G6 cannot close until the following evidence exists in implementation PRs:

1. AnalyticsEvent and all analytics read models prove no source object mutation.
2. MatterProfitability joins invoice, payment, time, expense, and WIP evidence
   without writing back to Billing, Finance, Matter, or Party source objects.
3. ClientProfitability aggregates by Party Master ClientGroup without creating
   duplicate client identities.
4. UtilizationMetric uses a tested capacity denominator and does not infer HR
   or payroll data beyond approved HRX boundaries.
5. RealizationMetric reconciles billed value versus standard value without
   mutating invoice, write-down, or write-off source records.
6. AR aging, client health, and practice P&L dashboards enforce finance,
   conflict, Matter, and role-based visibility.
7. Analytics exports are audit-bound, masked, tenant-scoped, and read-model-only.
8. ModelPolicy routes by Matter sensitivity, privilege label, legal hold, and
   dark-launch/disable-switch state.
9. RetrievalRequest requires Matter context and permission-aware retrieval proves
   unauthorized documents are not retrieved or summarized.
10. PromptLog, AIOutput, Citation, and review-queue records prove prompt audit,
    candidate default state, citation-required confirmation, and confirm/reject
    audit.
11. AI legal workflows require human approval steps and never make final legal
    decisions automatically.
12. AI output exports inherit DMS privilege labels, redaction, secure-link, and
    external-share boundaries.
13. ExternalUser remains separate from internal User and Employee records.
14. PortalMatterProjection excludes internal memos, conflict memos, privileged
    material, hidden Matter details, and non-shared documents.
15. ExternalACL, RFI, client approval, secure-link, and DataRoom controls enforce
    shared-only access, due dates/statuses, upload security placeholders,
    expiry, watermark, MFA, room ACLs, and portal audit coverage.
16. R-005, R-007, R-009, and R-015 remain explicit G6 control requirements.
17. G6 closeout records command output, PR state, G1/G2/G3/G4/G5 evidence
    disposition, and human review disposition.

## PR Slice Plan

| Slice | TUWs | Target branch | Scope | Exit evidence |
| --- | --- | --- | --- | --- |
| G6-A | `LFOS-G6-W09-T001`-`LFOS-G6-W09-T005` | `codex/lawos-g6-analytics-read-model-foundation` | AnalyticsEvent, MatterProfitability, ClientProfitability, UtilizationMetric, RealizationMetric | No source mutation, invoice/payment/time join, client group aggregation, capacity denominator, billed-vs-standard value tests. |
| G6-B | `LFOS-G6-W09-T006`-`LFOS-G6-W09-T010` | `codex/lawos-g6-analytics-dashboard-export-closeout` | AR aging dashboard, client health dashboard, practice P&L dashboard, analytics export, G6 Analytics closeout | Finance permission, conflict/matter detail omission, role-based visibility, export audit/masking, read-model-only evidence. |
| G6-C | `LFOS-G6-W10-T001`-`LFOS-G6-W10-T004` | `codex/lawos-g6-ai-policy-retrieval-audit` | ModelPolicy, RetrievalRequest, permission-aware retrieval, PromptLog | Matter sensitivity routing, Matter required, unauthorized document not retrieved, prompt audit tests. |
| G6-D | `LFOS-G6-W10-T005`-`LFOS-G6-W10-T008` | `codex/lawos-g6-ai-output-review-controls` | AIOutput, Citation, human review queue, AI disable switch | Candidate default state, citation required for confirm, confirm/reject audit, dark-launch off tests. |
| G6-E | `LFOS-G6-W10-T009`-`LFOS-G6-W10-T012` | `codex/lawos-g6-ai-legal-workflows-closeout` | Legal workflow model, workflow builder UI, AI output export, G6 AI closeout | Human approval step, no auto-final legal decision, privilege-label inheritance, AI cannot bypass ACL evidence. |
| G6-F | `LFOS-G6-W11-T001`-`LFOS-G6-W11-T005` | `codex/lawos-g6-portal-rfi-foundation` | ExternalUser, PortalMatterProjection, ExternalACL, RFIRequest, RFIResponse upload | User/Employee separation, internal memo excluded, shared-only access, due date/status, upload security placeholder tests. |
| G6-G | `LFOS-G6-W11-T006`-`LFOS-G6-W11-T010` | `codex/lawos-g6-portal-data-room-closeout` | Client approval, secure link viewer, DataRoom, portal audit, G6 Portal closeout | Approval audit, expiry/watermark/MFA, room-level ACL, external view/upload audit, no internal data exposure evidence. |

## TUW Coverage

| TUW | Work | Required evidence |
| --- | --- | --- |
| `LFOS-G6-W09-T001` | AnalyticsEvent contract | No source mutation test. |
| `LFOS-G6-W09-T002` | MatterProfitability read model | Invoice/payment/time join test. |
| `LFOS-G6-W09-T003` | ClientProfitability read model | Client group aggregation test. |
| `LFOS-G6-W09-T004` | UtilizationMetric | Capacity denominator test. |
| `LFOS-G6-W09-T005` | RealizationMetric | Billed vs standard value test. |
| `LFOS-G6-W09-T006` | AR aging dashboard | Finance permission test. |
| `LFOS-G6-W09-T007` | ClientHealth UI | Conflict/matter detail omission. |
| `LFOS-G6-W09-T008` | Practice P&L dashboard | Role-based visibility test. |
| `LFOS-G6-W09-T009` | Analytics export control | Export audit and masking test. |
| `LFOS-G6-W09-T010` | G6 Analytics closeout | Read-model-only evidence. |
| `LFOS-G6-W10-T001` | AI policy schema | Matter sensitivity routing test. |
| `LFOS-G6-W10-T002` | RetrievalRequest schema | Matter required test. |
| `LFOS-G6-W10-T003` | Permission-aware retrieval service | Unauthorized doc not retrieved. |
| `LFOS-G6-W10-T004` | PromptLog schema | Prompt audit test. |
| `LFOS-G6-W10-T005` | AIOutput schema | Candidate default state test. |
| `LFOS-G6-W10-T006` | Citation ledger | Citation required for confirm. |
| `LFOS-G6-W10-T007` | Human review queue | Confirm/reject audit test. |
| `LFOS-G6-W10-T008` | AI disable switch | Dark launch off test. |
| `LFOS-G6-W10-T009` | Legal workflow model | Human approval step test. |
| `LFOS-G6-W10-T010` | Workflow builder UI | No auto-final legal decision. |
| `LFOS-G6-W10-T011` | AI output export control | Privilege label inheritance. |
| `LFOS-G6-W10-T012` | G6 AI closeout | AI cannot bypass ACL evidence. |
| `LFOS-G6-W11-T001` | ExternalUser schema | User/Employee separation test. |
| `LFOS-G6-W11-T002` | PortalMatterProjection | Internal memo excluded test. |
| `LFOS-G6-W11-T003` | ExternalACL model | Shared-only access test. |
| `LFOS-G6-W11-T004` | RFIRequest schema/API | Due date/status test. |
| `LFOS-G6-W11-T005` | RFIResponse upload flow | Upload virus/permission placeholder. |
| `LFOS-G6-W11-T006` | Client approval flow | Approval audit test. |
| `LFOS-G6-W11-T007` | Secure link viewer | Expiry/watermark/MFA test. |
| `LFOS-G6-W11-T008` | DataRoom schema/API | Room-level ACL test. |
| `LFOS-G6-W11-T009` | Portal audit coverage | External view/upload events. |
| `LFOS-G6-W11-T010` | G6 Portal closeout | No internal data exposure evidence. |

## Entry Validation

```sh
npm run client-matter:g5f:validate
npm run client-matter:g6:plan:validate
npm run rp15:analytics-core:validate
npm run rp16:governance-core:validate
npm run rp17:ai-governance-core:validate
npm run rp18:ai-legal-workflows-core:validate
npm run rp19:client-portal-core:validate
npm run rp20:data-room-vdr-core:validate
npm run validate
```

The G6 plan validator confirms that all 32 G6 TUWs are represented, that
Analytics, Governance/DLP, AI Governance, AI Legal Workflows, Client Portal,
and Data Room descriptor evidence exists, that R-005/R-007/R-009/R-015 controls
are preserved, that G5 Finance handoff remains required before analytics, AI,
or portal runtime, and that G6 runtime readiness remains open.

## Gate Boundary

G6 remains open. Planning artifacts, descriptor catalogs, generated
RP15/RP16/RP17/RP18/RP19/RP20 closeout packs, and contract validators are entry
evidence only.

G6 must not claim Analytics, AI, Portal, or Data Room runtime readiness before
G1, G2, G3, G4, and G5 evidence is human-reviewed or explicitly stubbed behind
fail-closed tests.
