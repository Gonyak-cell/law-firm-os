# Matter-Vault API and Data Model Specification v1.0

작성 기준일: 2026-06-20

## 1. Boundary

Matter owns case execution. Vault owns evidence objects. Integration is through MatterVaultLink, orchestrated commands, permission/audit inheritance, and projection read models.

## 2. API Matrix

| Method | Route | Purpose | Required Context | Audit Event | R4 Gate |
|---|---|---|---|---|---|
| POST | /api/matters | Matter opening orchestrator | tenant_id, actor_id, clearance_token_id, idempotency_key | matter.opened, vault.workspace.created | Blocks if clearance missing/stale; creates MatterVaultLink |
| GET | /api/matters/:matter_id/command-center | Matter aggregate with vault summary | tenant_id, actor_id, permission decision | matter.command_center.viewed | Returns vault summary without denied counts |
| GET | /api/matters/:matter_id/vault-summary | Matter-scoped Vault summary | tenant_id, actor_id, matter_id | matter.vault_summary.viewed | No raw storage path, no bytes |
| POST | /api/matters/:matter_id/documents | Matter UX upload facade | tenant_id, actor_id, file, idempotency_key | document.version.created | Delegates to Vault service; Matter never owns bytes |
| GET | /api/matters/:matter_id/timeline | Matter timeline with Vault events | tenant_id, actor_id, permission decision | matter.timeline.viewed | Safe summaries only |
| POST | /api/vault/workspaces | Matter-scoped Vault workspace create | tenant_id, actor_id, matter_id, permission_envelope_id | vault.workspace.created | Only Matter opening/orchestrator can call in production |
| POST | /api/vault/folders | Folder create | tenant_id, actor_id, vault_workspace_id | vault.folder.created | Path permission validated |
| POST | /api/vault/documents/upload | Document upload | tenant_id, actor_id, matter_id, workspace_id, file, idempotency_key | document.version.created | Storage-backed; hash lineage created |
| GET | /api/vault/documents/:document_id | Document metadata | tenant_id, actor_id, permission decision | document.viewed | Sensitive read audit if metadata privileged |
| POST | /api/vault/documents/:document_id/versions | Immutable version create | tenant_id, actor_id, file, idempotency_key | document.version.created | Previous version superseded, not mutated |
| GET | /api/vault/file-objects/:file_object_id/download | Authorized byte download | tenant_id, actor_id, permission decision | document.downloaded | No permission, no bytes |
| POST | /api/vault/documents/:document_id/checkout-locks | Checkout lock | tenant_id, actor_id, document_id | document.locked | Concurrent edit blocked |
| POST | /api/vault/documents/:document_id/privilege-label | Privilege label | tenant_id, actor_id, label | privilege_label.changed | AI/search exclusion applied |
| POST | /api/vault/documents/:document_id/legal-hold | Legal hold apply/release | tenant_id, actor_id, hold_id, approval | legal_hold.applied | Delete/share/export blocked by policy |
| POST | /api/vault/email/filings | Email filing to Matter Vault | tenant_id, actor_id, matter_id, thread metadata, attachments | email.filed | Duplicates detected; no credential leakage |
| POST | /api/vault/search | Permission-aware search | tenant_id, actor_id, permission_decision_id, query | vault.search.executed | Unauthorized results absent and count hidden |
| POST | /api/ai/retrieval-requests | Permission-before-AI retrieval | tenant_id, actor_id, matter_id, permission_decision_id | ai.retrieval.requested | Only directly visible documents can be retrieved |
| POST | /api/portal/matter-projections | Portal projection publish | tenant_id, actor_id, matter_id, source_document_ids | portal.projection.published | Projection-only; internal memo/conflict memo excluded |

## 3. Data Model Ownership

| Object | Owner | Fields | Notes |
|---|---|---|---|
| Matter | packages/matter | matter_id, tenant_id, matter_number, status, legal_client_party_id, permission_envelope_id | Owns case/work execution; references Vault only |
| MatterVaultLink | packages/matter | tenant_id, matter_id, vault_workspace_id, default_folder_id, permission_envelope_id, status | Bridge between separate Matter app and Vault app |
| VaultWorkspace | packages/dms | vault_workspace_id, tenant_id, workspace_type, matter_id, permission_envelope_id, status | Matter-scoped evidence workspace |
| DmsFolder | packages/dms | folder_id, workspace_id, path, permission_ref | Folder path under Vault workspace |
| DmsDocument | packages/dms | document_id, workspace_id, matter_id, title, current_version_id, privilege_label_id, legal_hold_status | Metadata owner for document |
| DocumentVersion | packages/dms | version_id, document_id, file_object_id, version_number, sha256, status | Immutable version lineage |
| FileObject | packages/dms/storage | file_object_id, storage_ref, provider, sha256, byte_size, mime_type | Opaque storage pointer; raw path never exposed |
| EmailThread | packages/email-dms | email_thread_id, matter_id, subject, filed_at, source_provider | Email evidence thread |
| EmailAttachment | packages/email-dms | attachment_id, email_thread_id, file_object_id, document_id | Attachment vaulted as file/document |
| VaultSearchIndex | packages/dms/search | index_row_id, document_id, version_id, permission_snapshot, searchable_text_ref | Permission-filtered index |
| RagEvidenceSource | packages/ai-governance | retrieval_id, document_id, version_id, permission_decision_id, citation_ref | AI source grounding ledger |
| MatterTimelineEvent | packages/matter | event_id, matter_id, source_module, source_object_id, event_type, safe_summary | Matter timeline projection from Vault events |
| AuditEvent | packages/audit | event_id, tenant_id, actor, action, object, hash, previous_hash | Durable append-only audit |

## 4. Event Taxonomy

| Event | Producer | Object Type | Object ID | When |
|---|---|---|---|---|
| matter.opened | MatterOpeningOrchestrator | Matter | matter_id | When clearance-gated Matter is created |
| matter.vault_link.created | MatterService | MatterVaultLink | matter_id:vault_workspace_id | When link is persisted |
| vault.workspace.created | VaultService | VaultWorkspace | vault_workspace_id | When workspace is created for Matter |
| vault.folder.created | VaultService | DmsFolder | folder_id | Folder create |
| document.uploaded | VaultDocumentService | DmsDocument | document_id | Initial upload |
| document.version.created | VaultVersionService | DocumentVersion | version_id | Version create |
| document.viewed | VaultDocumentService | DmsDocument | document_id | Metadata or document view |
| document.downloaded | VaultStorageService | FileObject | file_object_id | Authorized bytes returned |
| document.shared | VaultSharingService | SecureLink | secure_link_id | External secure link created |
| privilege_label.changed | VaultSecurityService | PrivilegeLabel | document_id | Privilege or confidentiality changed |
| legal_hold.applied | VaultSecurityService | LegalHold | hold_id | Hold applied |
| email.filed | EmailFilingService | EmailThread | email_thread_id | Email filed to Matter |
| vault.search.executed | VaultSearchService | SearchRun | search_run_id | Permission-aware search |
| ai.retrieval.requested | AIGovernanceService | RetrievalRequest | retrieval_id | Permission-before-AI retrieval |
| portal.projection.published | PortalProjectionService | PortalProjection | projection_id | External projection |

## 5. R4 Non-Negotiables

- No raw storage path in any API response.
- No document bytes from Matter service.
- No Vault workspace before clearance-gated Matter opening.
- No search/AI/portal projection without permission decision.
- Every write and sensitive read must append durable audit.
- MatterTeam must use employee_id for staffing; user_id is actor context only.
