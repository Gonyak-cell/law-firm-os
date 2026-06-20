function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createEmailThread(input = {}) {
  return Object.freeze({
    model_type: "DmsEmailThread",
    tenant_id: requiredString(input, "tenant_id"),
    matter_id: requiredString(input, "matter_id"),
    email_thread_id: requiredString(input, "email_thread_id"),
    subject: requiredString(input, "subject"),
    status: input.status ?? "active",
    message_ids: Object.freeze(input.message_ids ?? []),
    filed_document_ids: Object.freeze(input.filed_document_ids ?? []),
    permission_envelope_id: input.permission_envelope_id ?? "perm:email-dms",
    audit_trace_id: input.audit_trace_id ?? "audit:email-dms",
    credential_material_included: false,
  });
}
