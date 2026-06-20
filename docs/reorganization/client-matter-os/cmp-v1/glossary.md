# CMP R4 Glossary

Status: source-intake-baseline

| Term | Definition | Boundary |
| --- | --- | --- |
| Client | A commercial/legal client represented through Party Master and BillingProfile references. | Client is not a Matter, Employee, or IAM User. |
| Party | Canonical Person or Organization record used by CRM, Intake, Matter, Billing, and Portal. | Party owns identity and relationships, not conflict memo or matter strategy. |
| Matter | The execution ledger for approved legal work after Intake/conflict/engagement clearance. | Matter cannot be created directly from Opportunity. |
| Employee | People/HRX workforce object used for staffing, capacity, time, and HR workflows. | Employee is not an IAM User session authority. |
| User | Authentication/session principal. | User may link to Employee through controlled UserEmployeeLink only. |
| Vault | Storage, version, hash-lineage, search, email filing, HR document envelope, and RAG evidence boundary. | Metadata-only API is not R4 Vault. |
| R4 runtime-write-ready | Persistence + write API + permission + audit + state/idempotency evidence. | Not satisfied by descriptor/API evidence alone. |
| R5/R6 owner-decision-ready | Enterprise controls, migration, UAT, DR, monitoring, compliance, and go/no-go package. | Requires owner decision; no self-approval. |
