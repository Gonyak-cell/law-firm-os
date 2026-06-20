# CMP R4 Object Ownership Matrix

Status: source-intake-baseline

| Object | Canonical Owner | Must Reference | Must Not Own / Leak | R4 Evidence |
| --- | --- | --- | --- | --- |
| Party / Person / Organization | Party Master | CRM, Intake, Matter, Billing | Conflict memo, matter strategy | DB-backed CRUD + duplicate/merge audit |
| BillingProfile | Party Master with Billing references | Billing/Invoice | Duplicate billing client copies | Legal vs billing client validation |
| Employee | HRX / People | MatterTeam, TimeEntry, Analytics | IAM User identity fields as Employee | UserEmployeeLink and HR-sensitive tests |
| Matter | Matter Operations | Party, Engagement, Employee, Vault, Billing | Document bytes, payment ledger | Clearance-gated opening transaction |
| MatterTeamMember | Matter Operations | Employee, role, capacity profile | User-only staffing | employee_id required tests |
| Document / DocumentVersion / FileObject | Vault/DMS | Matter, HRX, Email, Portal | Invoice ledger, raw storage path | Storage adapter + hash lineage |
| TimeEntry | Time/Billing | Employee + Matter + rate/cost basis | Payment matching | Submit/approve/lock workflow |
| Invoice / TaxInvoice | Billing | WIP/PreBill, Matter, BillingProfile | Payment final matching | Issued direct edit blocked |
| Payment / ARBalance | Finance | Invoice, Matter, BillingClient | Time narrative/conflict decision | Idempotent import/match + AR aging |
| AIOutput / Citation | AI Governance | Vault source evidence, permission decision | Final legal decision | Human review and citation required |
| ExternalUser / PortalProjection | Portal/DataRoom | Matter, Vault shared objects | Internal memo, conflict memo, AI draft | Projection-only external tests |
