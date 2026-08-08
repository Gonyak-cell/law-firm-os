function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(input, field, fallback = null) {
  const value = input?.[field];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function frozenList(value) {
  return Object.freeze(Array.isArray(value) ? value.map((item) => Object.freeze({ ...(item ?? {}) })) : []);
}

export const OUTLOOK_EMAIL_OBJECT_FIELDS = Object.freeze([
  "email_id",
  "graph_message_id",
  "canonical_graph_message_id",
  "rest_message_id",
  "internet_message_id",
  "conversation_id",
  "item_key",
  "matter_id",
  "from",
  "to",
  "cc",
  "bcc",
  "subject",
  "body_ref",
  "body_preview",
  "sent_at",
  "received_at",
  "mailbox_ref",
  "account_ref",
  "attachment_metadata",
  "filing_user",
]);

export function createEmailThread(input = {}) {
  const graphMessageId = optionalString(input, "graph_message_id", input.message_ids?.[0] ?? input.email_thread_id);
  const internetMessageId = optionalString(input, "internet_message_id", input.message_ids?.[1] ?? graphMessageId);
  const conversationId = optionalString(input, "conversation_id", input.email_thread_id);
  const filingUser = optionalString(input, "filing_user", input.actor_id ?? "unknown_filer");
  return Object.freeze({
    model_type: "DmsEmailThread",
    tenant_id: requiredString(input, "tenant_id"),
    matter_id: requiredString(input, "matter_id"),
    email_thread_id: requiredString(input, "email_thread_id"),
    email_id: optionalString(input, "email_id", `email:${requiredString(input, "email_thread_id")}`),
    graph_message_id: graphMessageId,
    canonical_graph_message_id: input.canonical_graph_message_id ?? null,
    rest_message_id: input.rest_message_id ?? null,
    internet_message_id: internetMessageId,
    conversation_id: conversationId,
    item_key: input.item_key ?? null,
    subject: requiredString(input, "subject"),
    from: Object.freeze(input.from ?? {}),
    to: frozenList(input.to),
    cc: frozenList(input.cc),
    bcc: frozenList(input.bcc),
    body_ref: optionalString(input, "body_ref", `body-ref:${requiredString(input, "email_thread_id")}`),
    body_preview: optionalString(input, "body_preview", ""),
    sent_at: optionalString(input, "sent_at", optionalString(input, "received_at", new Date().toISOString())),
    received_at: optionalString(input, "received_at", optionalString(input, "sent_at", new Date().toISOString())),
    mailbox_ref: optionalString(input, "mailbox_ref", "mailbox:outlook:addin"),
    account_ref: optionalString(input, "account_ref", "account:outlook:addin"),
    attachment_metadata: frozenList(input.attachment_metadata ?? input.attachments),
    filing_user: filingUser,
    filing_time: optionalString(input, "filing_time", new Date().toISOString()),
    filing_mode: optionalString(input, "filing_mode", "manual"),
    confidentiality: optionalString(input, "confidentiality", "internal"),
    privilege: optionalString(input, "privilege", "undetermined"),
    ai_processed: input.ai_processed === true,
    raw_body_included: false,
    provider_payload_included: false,
    field_contract: OUTLOOK_EMAIL_OBJECT_FIELDS,
    field_contract_count: OUTLOOK_EMAIL_OBJECT_FIELDS.length,
    status: input.status ?? "active",
    message_ids: Object.freeze(input.message_ids ?? [graphMessageId, internetMessageId].filter(Boolean)),
    filed_document_ids: Object.freeze(input.filed_document_ids ?? []),
    permission_envelope_id: input.permission_envelope_id ?? "perm:email-dms",
    audit_trace_id: input.audit_trace_id ?? "audit:email-dms",
    credential_material_included: false,
  });
}
