# Canonical Glossary

Status: Proposed
Gate: `G0`
TUW: `LFOS-G0-W00-T004`

| Term | Definition | Boundary |
| --- | --- | --- |
| Client-Matter OS | The integrated operating system for law firm relationship, intake, matter, document, revenue, analytics, AI, portal, and operations workflows. | Product-level name; not an ERP/CRM split. |
| Party | Any person, organization, fund, SPC, government body, law firm, counterparty, referral source, or related entity. | Canonical owner: Party Master. |
| Person | A natural person Party or contactable individual. | Do not duplicate as CRM contact, matter participant, or portal user. |
| Organization | A company, institution, law firm, accounting firm, government body, fund, SPC, or other organization Party. | Do not duplicate in Billing or Conflict DB. |
| ClientGroup | Relationship group for affiliates, sponsor/portfolio, fund structures, or key-client management. | Canonical owner: Party Master. |
| Relationship | A directed or typed relation between Parties, such as affiliate, officer, shareholder, GP/LP, sponsor, portfolio, referral. | Canonical owner: Party Master. |
| Relationship Client | Long-term commercial relationship account. | CRM role on top of Party/ClientGroup. |
| Prospective Client | A Party in consultation, pitch, RFP, or opportunity stage. | Pre-Matter; must feed Intake if legal work is possible. |
| Legal Client | Actual legal-service recipient or engagement client. | Engagement/Matter role, not necessarily the billing client. |
| Billing Client | The billing/tax invoice recipient. | BillingProfile role; may differ from Legal Client. |
| Counterparty | Party adverse or opposite to the client in a Matter or potential Matter. | Party role; must be conflict searchable. |
| Opportunity | Pre-Matter business opportunity. | Cannot directly create a Matter. |
| IntakeRequest | Formal request to evaluate whether the firm may accept work. | Mandatory gate between Opportunity and Matter. |
| ConflictCheck | Conflict search execution record. | Owned by Intake; not a CRM activity. |
| Waiver | Consent or conflict waiver evidence. | Owned by Intake; not broadly visible in CRM. |
| Engagement | Approved scope and engagement basis for legal work. | Required before Matter opening. |
| Matter | Post-clearance legal work object. | Operational source after Matter opening. |
| DMS Workspace | Matter-bound document/email workspace. | Owned by DMS; references Matter and Party. |
| WIP | Approved but unbilled work in progress. | Billing-owned revenue ledger object. |
| ARBalance | Outstanding receivable balance. | Finance-owned object. |
| AIOutput | AI-generated candidate output. | Untrusted until human review and citation policy pass. |
| ExternalUser | Client portal user. | Not a User or Employee. |
| Employee | Internal lawyer/staff HR object. | HRX-owned; not a Matter child. |

## Prohibited Synonyms

| Old / ambiguous term | Preferred term |
| --- | --- |
| ERP | Revenue & Finance Operations, when referring to time/billing/payment/AR/settlement. |
| CRM | Client Growth, when referring to relationship, pipeline, pitch, RFP, referral, campaign. |
| PMS | Matter Operations, when referring to post-engagement matter execution. |
| DMS | Knowledge Workspace, when emphasizing email, version, privilege, and reusable knowledge. |
| AI | AI Governance & Legal Workflows, when control, authority, and review matter. |
