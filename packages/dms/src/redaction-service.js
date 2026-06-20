export function createRedactionMetadata(input = {}) {
  if (!input.redaction_id) throw new TypeError("redaction_id is required");
  return Object.freeze({
    model_type: "DmsRedaction",
    tenant_id: input.tenant_id,
    matter_id: input.matter_id,
    redaction_id: input.redaction_id,
    document_id: input.document_id,
    ranges: Object.freeze(input.ranges ?? []),
    reason: input.reason ?? "privilege",
    raw_bytes_exposed: false,
  });
}

export function exportRedactedDocument({ document, redactions = [] } = {}) {
  return Object.freeze({
    document_id: document.document_id,
    title: document.title,
    redaction_count: redactions.length,
    raw_bytes_included: false,
    storage_pointer_ref_included: false,
  });
}
