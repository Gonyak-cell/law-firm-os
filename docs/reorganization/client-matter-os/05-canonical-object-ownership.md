# Canonical Object Ownership

Status: Proposed
Gate: `G0`
TUW: `LFOS-G0-W00-T005`

## Ownership Matrix

| Object | Canonical owner | Duplicate rule |
| --- | --- | --- |
| Party | Party & Relationship Master | Must not be recreated by CRM, Intake, Matter, Billing, DMS, or Conflict. |
| Person | Party & Relationship Master | Must not be recreated as local Contact. |
| Organization | Party & Relationship Master | Must not be recreated as Billing client or Conflict entity. |
| ClientGroup | Party & Relationship Master | Must be referenced by CRM, Billing, and Analytics. |
| Relationship | Party & Relationship Master | Must be directed and auditable. |
| ContactPoint | Party & Relationship Master | Must be referenced, not copied. |
| BillingProfile | Party & Relationship Master, with Billing as strong downstream consumer | Proposed by `ADR-G0-001`; Billing owns workflow state, not Party identity. |
| Lead | Client Growth / CRM | Must reference Party or create Party candidate through approved flow. |
| Opportunity | Client Growth / CRM | Must not equal Matter. |
| CRMActivity | Client Growth / CRM | Must not contain unguarded matter strategy or conflict memo. |
| IntakeRequest | Intake / Conflict / Engagement | Required before ConflictCheck. |
| ConflictCheck | Intake / Conflict / Engagement | Snapshot record; not a CRM search note. |
| ConflictHit | Intake / Conflict / Engagement | Visibility restricted. |
| Waiver | Intake / Conflict / Engagement | Restricted to matter team/risk roles. |
| Engagement | Intake / Conflict / Engagement | Required for Matter opening. |
| Matter | Matter Management | Requires clearance/engagement evidence. |
| MatterMember | Matter Management | Drives matter ACL. |
| MatterTask | Matter Management | Operational task, not CRM follow-up. |
| MatterCalendarEvent | Matter Management | Critical deadline changes require audit. |
| Document | DMS / Email / Knowledge Workspace | Document bytes and metadata are DMS-owned. |
| DocumentVersion | DMS / Email / Knowledge Workspace | Immutable version ownership. |
| EmailThread | DMS / Email / Knowledge Workspace | Matter filing controlled by DMS/email module. |
| TimeEntry | Time / Expense / Billing | Matter required. |
| WIP | Time / Expense / Billing | Generated from approved time/expense. |
| PreBill | Time / Expense / Billing | Partner review required. |
| Invoice | Time / Expense / Billing | Direct edit after issue prohibited. |
| TaxInvoice | Time / Expense / Billing | Idempotent issue/transmit/correct flow required. |
| Payment | Finance / Payments / Settlement | Import and matching controlled by Finance. |
| ARBalance | Finance / Payments / Settlement | Derived from invoice/payment ledger. |
| SettlementRun | Finance / Payments / Settlement | Lock/reversal flow required. |
| AnalyticsMetric | Analytics / BI | Read-model only. |
| AIOutput | AI Governance / Legal Workflows | Candidate until human reviewed. |
| ExternalUser | Client Portal / Data Room | Must not be User or Employee. |
| Employee | HRX People Module | Must not be Party, ExternalUser, or Matter child. |
| AuditEvent | Platform / IAM / Audit | Non-bypassable durable event. |

## G0 Open Decision

`BillingProfile` ownership is proposed in
`14-billing-profile-ownership-adr.md`: Party & Relationship Master owns the
canonical profile; Billing owns downstream workflow state that references it.
