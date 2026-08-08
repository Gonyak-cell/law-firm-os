export const OWNER_BLOCKED_PUBLISH_STATE = Object.freeze({
  status: "owner_blocked",
  owner_approval_ref_included: false,
  vault_document_created: false,
  document_bytes_included: false,
  production_ready_claim: false,
});

export function safeTemplate(template) {
  return Object.freeze({
    template_id: template.template_id,
    template_version: template.template_version,
    template_hash: template.template_hash,
    label: template.label,
    category: "document",
    merge_field_count: template.merge_schema.length,
    merge_fields: Object.freeze(template.merge_schema.map((field) => field.key)),
    signer_roles: Object.freeze(template.signer_roles.map((role) => Object.freeze({ role_id: role.role_id, required: role.required }))),
    requires_approval: true,
    approval_receipt_present: true,
    raw_template_body_included: false,
    raw_contact_values_included: false,
    production_ready_claim: false,
  });
}

export function safeDraft(record) {
  return Object.freeze({
    draft_id: record.draft_id,
    matter_id: record.matter_id,
    template_id: record.template_id,
    template_version: record.template_version,
    template_hash: record.template_hash,
    input_fingerprint: record.input_fingerprint,
    title: record.title,
    status: record.status,
    safe_excerpt: record.safe_excerpt ?? null,
    merge_field_count: record.merge_field_count,
    signer_role_count: record.signer_role_count,
    approval_state: record.approval_state,
    publish_state: record.publish_state,
    immutable: record.immutable === true,
    raw_body_included: false,
    raw_template_body_included: false,
    raw_contact_values_included: false,
    document_bytes_included: false,
    production_ready_claim: false,
  });
}

export function safeApprovalReceipt(receipt) {
  if (!receipt) return null;
  return Object.freeze({
    receipt_id: receipt.receipt_id,
    approval_request_id: receipt.approval_request_id,
    approved_at: receipt.approved_at,
    input_hash: receipt.input_hash,
    input_fingerprint: receipt.input_fingerprint,
    template_hash: receipt.template_hash,
    receipt_hash: receipt.receipt_hash,
    approved_by_ref_included: false,
    raw_body_included: false,
    raw_contact_values_included: false,
  });
}

export function safeApproval(record) {
  return Object.freeze({
    approval_request_id: record.approval_request_id,
    draft_id: record.draft_id,
    matter_id: record.matter_id,
    status: record.status,
    decision: record.decision ?? null,
    reviewer_role: "owner",
    input_fingerprint: record.input_fingerprint,
    template_id: record.template_id,
    template_version: record.template_version,
    template_hash: record.template_hash,
    approval_receipt: safeApprovalReceipt(record.approval_receipt),
    reviewer_user_ref_included: false,
    owner_approval_ref_included: false,
    raw_body_included: false,
    raw_contact_values_included: false,
    production_ready_claim: false,
  });
}

export function safeArtifact(record) {
  if (!record) return null;
  return Object.freeze({
    artifact_id: record.artifact_id,
    draft_id: record.draft_id,
    document_id: record.document_id,
    version_id: record.version_id,
    file_object_id: record.file_object_id,
    filename: record.filename,
    mime_type: record.mime_type,
    byte_size: record.byte_size,
    sha256: record.sha256,
    generator_version: record.generator_version,
    template_id: record.template_id,
    template_version: record.template_version,
    template_hash: record.template_hash,
    input_hash: record.input_hash,
    approval_receipt_id: record.approval_receipt_id,
    status: record.status,
    immutable: record.status === "finalized",
    signer_snapshot_count: record.signer_snapshot_count,
    document_bytes_included: false,
    raw_body_included: false,
    raw_contact_values_included: false,
    raw_storage_path_included: false,
  });
}

export function safeOutbox(record) {
  if (!record) return null;
  return Object.freeze({
    outbox_event_id: record.outbox_event_id,
    aggregate_id: record.aggregate_id,
    event_type: record.event_type,
    status: record.status,
    attempt_count: record.attempt_count,
    artifact_id: record.artifact_id,
    occurred_at: record.occurred_at,
    raw_payload_included: false,
    document_bytes_included: false,
    raw_contact_values_included: false,
  });
}
