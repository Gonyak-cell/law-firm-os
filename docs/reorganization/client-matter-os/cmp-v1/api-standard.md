# CMP R4 API Standard

Status: source-intake-baseline

| Domain | API Group | Mandatory Context | Write Audit Events | R4 Blocker |
| --- | --- | --- | --- | --- |
| Trust | /permissions, /admin/policies, /audit | tenant, actor, permission context, correlation | permission.evaluated, role.changed, legal_hold.changed, breakglass.used | in-memory audit/policy store |
| Party | /party-master/* | tenant, actor, Party ACL | party.created, party.updated, relationship.changed, duplicate.reviewed | no DB-backed Party repository |
| People | /api/hrx/* | tenant, actor, HR-sensitive scopes | employee.data.changed, hr.document.viewed, evaluation.accessed | User/Employee link not durable |
| CRM/Intake | /crm/*, /intake/* | tenant, actor, Party refs, conflict scope | crm.opportunity.created, conflict.search.executed, waiver.approved | Matter direct conversion possible |
| Matter | /api/matter/* | tenant, actor, clearance token, employee staffing | matter.opened, matter.member.added, matter.deadline.changed | MatterTeam user_id-only |
| Vault | /api/vault/* | tenant, actor, object ACL, legal hold, permission-before-search | document.version.created, document.downloaded, document.shared | metadata-only, no storage adapter |
| Finance | /api/revenue/* | tenant, actor, matter, employee cost permission | time_entry.approved, invoice.issued, payment.matched | no durable finance ledgers |
| Analytics | /api/analytics/* | tenant, source object permissions, masking | analytics.exported | read model freshness/masking not durable |
| AI | /api/ai/* | tenant, permission-before-AI, citation requirement | ai.retrieval.requested, ai.output.reviewed | no real retrieval/citation persistence |
| Portal | /api/portal/*, /api/data-rooms/* | external ACL, projection scope | portal.document.viewed, portal.file.uploaded | projection store/external auth absent |

## Common API Requirements

- Every write command carries tenant, actor, permission decision, audit event, and idempotency key.
- Every sensitive read emits or links an audit event.
- Safe error envelopes must not leak cross-tenant object existence.
