# Matter-Vault Event Taxonomy

Required durable events include matter.opened, matter.vault_link.created, vault.workspace.created, vault.folder.created, document.uploaded, document.version.created, document.viewed, document.downloaded, document.shared, privilege_label.changed, legal_hold.applied, email.filed, vault.search.executed, ai.retrieval.requested, and portal.projection.published.

Every write and sensitive read must carry tenant_id, actor_id, permission decision context, object reference, hashable payload metadata, and safe omission rules for raw paths and bytes.
