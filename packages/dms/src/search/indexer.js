export function createSearchIndexEnvelope({ document, version, extracted_text_ref, privilege } = {}) {
  if (!document?.document_id) throw new TypeError("document is required");
  return Object.freeze({
    model_type: "DmsSearchIndex",
    tenant_id: document.tenant_id,
    matter_id: document.matter_id,
    index_id: `idx:${document.document_id}`,
    document_id: document.document_id,
    version_id: version?.version_id ?? document.current_version_id,
    extracted_text_ref: extracted_text_ref ?? null,
    privilege_label_id: privilege?.label_id ?? document.privilege_label_id ?? null,
    indexed_fields: Object.freeze(["title", "matter_id", "version_id"]),
    raw_text_included: false,
    storage_pointer_ref_included: false,
  });
}
