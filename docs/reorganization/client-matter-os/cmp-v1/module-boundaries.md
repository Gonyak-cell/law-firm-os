# CMP R4 Module Boundaries

Status: source-intake-baseline

| Module | Owns | References | Must Not Do |
| --- | --- | --- | --- |
| Trust | Tenant, actor, permission context, policy, ACL, wall, hold, audit | All domains | Bypass durable audit or allow ungated data routes |
| Party Master | Party, Person, Organization, relationships, billing profile references | CRM, Matter, Billing | Own conflict memo, matter strategy, or payment ledger |
| People/HRX | Employee, employment profile, UserEmployeeLink, capacity, leave, HR docs metadata | Matter, Vault, Analytics | Use IAM User as Employee or store HR document body |
| CRM/Intake | Lead, Opportunity, IntakeRequest, ConflictCheck, Waiver, Engagement, FeeTerms | Party, Matter clearance | Create Matter before clearance |
| Matter | Matter, team, tasks, deadlines, status history | Party, Employee, Vault, Billing | Own document bytes or payment matching |
| Vault/DMS | FileObject, Document, versions, hash lineage, search ACL, email filing | Matter, HRX, Portal, AI | Expose raw storage path or ignore legal hold |
| Finance | TimeEntry, WIP, Invoice, Payment, AR, Settlement | Matter, Employee, BillingProfile | Own conflict decision or document storage |
| AI/Portal | AI output/citation/review, external projection/DataRoom | Vault, Matter, Permission | Retrieve without permission or expose internal data externally |
