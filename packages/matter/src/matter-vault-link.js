const MATTER_VAULT_LINK_STATUSES = Object.freeze(["active", "suspended", "closed", "rolled_back"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createMatterVaultLink(input = {}) {
  const status = input.status ?? "active";
  if (!MATTER_VAULT_LINK_STATUSES.includes(status)) {
    throw new TypeError(`status must be one of ${MATTER_VAULT_LINK_STATUSES.join(", ")}`);
  }
  const tenantId = requiredString(input, "tenant_id");
  const matterId = requiredString(input, "matter_id");
  const vaultWorkspaceId = requiredString(input, "vault_workspace_id");
  const permissionEnvelopeId = requiredString(input, "permission_envelope_id");
  const sourceTransactionId = requiredString(input, "source_transaction_id");
  const auditEventId = requiredString(input, "audit_event_id");
  return Object.freeze({
    model_type: "MatterVaultLink",
    tenant_id: tenantId,
    matter_id: matterId,
    vault_workspace_id: vaultWorkspaceId,
    default_folder_id: input.default_folder_id ?? null,
    permission_envelope_id: permissionEnvelopeId,
    status,
    source_transaction_id: sourceTransactionId,
    audit_event_id: auditEventId,
    created_by_actor_id: requiredString(input, "created_by_actor_id"),
    created_at: input.created_at ?? new Date().toISOString(),
    resource_id: `${matterId}:${vaultWorkspaceId}`,
    matter_owns_case_execution: true,
    vault_owns_document_bytes: true,
    raw_storage_path_included: false,
    document_bytes_included: false,
    vault_mutates_matter_status: false,
    creates_database_rows: true,
    writes_product_state: true,
  });
}

export function serializeMatterVaultLinkSafe(link = {}) {
  return Object.freeze({
    tenant_id: link.tenant_id,
    matter_id: link.matter_id,
    vault_workspace_id: link.vault_workspace_id,
    default_folder_id: link.default_folder_id ?? null,
    permission_envelope_id: link.permission_envelope_id,
    status: link.status,
    raw_storage_path_included: false,
    document_bytes_included: false,
    vault_mutates_matter_status: false,
  });
}

export function createMatterVaultSummary({ link, workspace = null, documents = [] } = {}) {
  if (!link) return null;
  const activeDocuments = documents.filter((document) => document.status !== "deleted");
  return Object.freeze({
    tenant_id: link.tenant_id,
    matter_id: link.matter_id,
    vault_workspace_id: link.vault_workspace_id,
    default_folder_id: link.default_folder_id ?? null,
    workspace_status: workspace?.status ?? link.status,
    document_count: activeDocuments.length,
    legal_hold_count: activeDocuments.filter((document) => document.legal_hold_id || document.legal_hold_status === "active").length,
    privilege_label_count: activeDocuments.filter((document) => document.privilege_label_id).length,
    omitted_denied_count: null,
    count_leak_prevented: true,
    raw_storage_path_included: false,
    document_bytes_included: false,
    production_ready_claim: false,
  });
}

export function assertMatterVaultBoundary({ matterStoresDocumentBytes = false, vaultMutatesMatterStatus = false } = {}) {
  if (matterStoresDocumentBytes) throw new Error("Matter must not store document bytes");
  if (vaultMutatesMatterStatus) throw new Error("Vault must not mutate Matter status");
  return Object.freeze({
    matter_owns_case_execution: true,
    vault_owns_document_bytes: true,
    boundary_enforced: true,
  });
}
