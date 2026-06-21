# Matter-Vault Ownership Boundary

- Matter owns case execution, status, tasks, deadlines, team, matter number, and client/work ledgers.
- Vault/DMS owns document metadata, versions, file objects, storage references, email filings, legal hold, privilege labels, secure links, search index rows, and RAG evidence sources.
- MatterVaultLink is the bridge: tenant_id, matter_id, vault_workspace_id, default_folder_id, permission_envelope_id, status, source_transaction_id, and audit_event_id.
- Matter never stores document bytes or raw storage paths.
- Vault never mutates Matter status, tasks, deadlines, or billing state.
- Vault workspace creation is blocked until clearance-gated Matter opening succeeds.
