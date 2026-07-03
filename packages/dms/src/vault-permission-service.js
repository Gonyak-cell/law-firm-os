const INTERNAL_SEARCH_FIELDS = new Set([
  "searchable_text",
  "raw_text",
  "extracted_text",
  "content_text",
  "body_searchable_text",
  "ocr_searchable_text",
  "ocr_text",
  "bytes",
  "storage_pointer_ref",
]);

export function sanitizeMatterVaultSearchResult(result = {}) {
  const safe = {};
  for (const [key, value] of Object.entries(result)) {
    if (!INTERNAL_SEARCH_FIELDS.has(key)) safe[key] = value;
  }
  return Object.freeze({
    ...safe,
    raw_text_included: false,
    storage_pointer_ref_included: false,
    document_bytes_included: false,
  });
}

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
    results: Object.freeze(results.filter((result) => allowed.has(result.document_id)).map(sanitizeMatterVaultSearchResult)),
    omitted_result_count: null,
    count_leak_prevented: true,
  });
}
