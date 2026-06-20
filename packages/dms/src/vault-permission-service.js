export function createMatterVaultPermissionEnvelope({ tenant_id, matter_id, vault_workspace_id, actor_id, permission_decision_id } = {}) {
  if (!tenant_id || !matter_id || !vault_workspace_id || !actor_id || !permission_decision_id) {
    throw new TypeError("tenant_id, matter_id, vault_workspace_id, actor_id, and permission_decision_id are required");
  }
  return Object.freeze({
    tenant_id,
    matter_id,
    vault_workspace_id,
    actor_id,
    permission_decision_id,
    inherited_from_matter: true,
    count_leak_prevented: true,
  });
}

export function filterMatterVaultSearchResults({ permission_decision_id, results = [], allowed_document_ids = [] } = {}) {
  if (!permission_decision_id) throw new Error("permission decision required before Matter-Vault search");
  const allowed = new Set(allowed_document_ids);
  return Object.freeze({
    results: Object.freeze(results.filter((result) => allowed.has(result.document_id)).map((result) => Object.freeze({ ...result, raw_text_included: false }))),
    omitted_result_count: null,
    count_leak_prevented: true,
  });
}
