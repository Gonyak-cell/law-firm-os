export function createMatterVaultPortalProjection(input = {}) {
  if (!input.permission_decision_id || !input.tenant_id || !input.matter_id) {
    throw new TypeError("permission_decision_id, tenant_id, and matter_id are required");
  }
  const sourceDocumentIds = Array.isArray(input.source_document_ids) ? input.source_document_ids : [];
  const excluded = new Set([...(input.internal_memo_ids ?? []), ...(input.privileged_document_ids ?? [])]);
  return Object.freeze({
    tenant_id: input.tenant_id,
    matter_id: input.matter_id,
    portal_projection_id: input.portal_projection_id ?? `portal:${input.matter_id}:matter-vault`,
    visible_document_ids: Object.freeze(sourceDocumentIds.filter((documentId) => !excluded.has(documentId))),
    internal_memo_excluded: true,
    privileged_document_excluded: true,
    projection_only: true,
    document_bytes_included: false,
  });
}
