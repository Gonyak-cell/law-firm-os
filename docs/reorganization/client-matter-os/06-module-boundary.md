# Module Boundary Plan

Status: Proposed
Gate: `G0`
TUW: `LFOS-G0-W00-T007`

## Boundary Matrix

| Module | Owns | References | Must not own |
| --- | --- | --- | --- |
| Platform / IAM / Audit | Tenant, actor context, permission, object ACL, ethical wall, legal hold, audit event, break-glass | Every module's objects | Business source objects. |
| Party & Relationship Master | Party, Person, Organization, ClientGroup, Relationship, ContactPoint, BillingProfile | Audit and permissions | Opportunity, Matter, Invoice, Payment, AIOutput. |
| Client Growth / CRM | Lead, Opportunity, CRMActivity, Proposal, Campaign, Referral, KeyClientPlan | Party, ClientGroup, Relationship, masked Matter summary | Conflict memo, matter strategy, document body, billing detail. |
| Intake / Conflict / Engagement | IntakeRequest, ConflictCheck, ConflictHit, Waiver, Engagement, FeeTerms, Approval | Party, Relationship, Opportunity, Fee estimate refs | Matter tasks, document body, invoice, payment. |
| Matter Management | Matter, MatterMember, MatterTask, Deadline, Calendar, StatusHistory, ClosingRecord | Party, Engagement, DMS refs, Billing summary | Document bytes, AR ledger, settlement run, AI final judgment. |
| DMS / Email / Knowledge Workspace | Document, DocumentVersion, EmailThread, PrivilegeLabel, SecureLink, Redaction | Matter, Party, Permission | Invoice ledger, AR, CRM pipeline. |
| Time / Expense / Billing | TimeEntry, Expense, WIP, PreBill, Invoice, TaxInvoice, WriteOff | Matter, BillingProfile, RateCard, FeeTerms | Payment final matching, settlement run. |
| Finance / Payments / Settlement | Payment, ARBalance, JournalExport, VATExport, SettlementRun | Invoice, Matter, BillingClient | Time narrative source text, conflict decision. |
| Analytics / BI | Read models, metrics, dashboard snapshots, exports | Audit/event stream, Matter, Invoice, Payment, CRM summary | Source object mutation. |
| AI Governance / Legal Workflows | AIJob, RetrievalPolicy, PromptLog, OutputLog, Citation, ReviewStatus, WorkflowStep | Matter, DMS index, Permission, Audit | Final legal decision, permission decision, invoice issue. |
| Client Portal / Data Room | ExternalUser, RFI, SecureLink viewer, PortalProjection, DataRoom | Matter, DMS, Client | Internal memo, conflict memo, AI draft. |
| Admin / Operations | Tenant settings, release candidate, deployment run, observability, incident runbook | Audit and platform state | Direct business data mutation. |
| HRX People Module | Employee, CapacityProfile, HRDocument, EvaluationRecord, Candidate | User identity reference, workload read models | Client contact, external user, matter participant. |
| External Integrations / Migration | IntegrationConnection, CredentialRef, SyncJob, MigrationBatch, ReconciliationRun | Canonical source objects | Secret material exposure, duplicate Party creation. |

## Gate Sequence

| Gate | Scope | Cannot start until |
| --- | --- | --- |
| G0 | Reorganization baseline | Source package analyzed. |
| G1 | Platform / IAM / Audit | G0 ownership and boundary accepted. |
| G2 | Party Master | G1 tenant/actor/audit design is ready. |
| G3 | CRM + Intake | G1/G2 are sufficient for fail-closed reference. |
| G4 | Matter + DMS | G3 produces clearance/engagement evidence. |
| G5 | Billing + Finance | G4 Matter and DMS baselines are runtime-safe. |
| G6 | Analytics + AI + Portal | G4/G5 expose permission-aware read models. |
| G7 | Enterprise hardening | G1-G6 evidence exists. |

## Critical Negative Rule

`Opportunity -> Matter` is prohibited. The only allowed path is:

Opportunity -> IntakeRequest -> ConflictCheck -> Risk/Waiver/Engagement ->
ClearanceToken -> MatterOpening.
