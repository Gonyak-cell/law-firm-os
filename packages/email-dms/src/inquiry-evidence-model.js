import { createHash } from "node:crypto";

export const INQUIRY_CAPTURE_STATUSES = Object.freeze([
  "pending_link",
  "complete",
  "failed",
]);

export const INQUIRY_EVIDENCE_OBJECT_KINDS = Object.freeze([
  "original_mime",
  "sanitized_display",
]);

export const INQUIRY_EVIDENCE_SCAN_STATUSES = Object.freeze([
  "pending",
  "clean",
  "quarantined",
  "failed",
]);

export const INQUIRY_EVIDENCE_LEGAL_HOLD_STATES = Object.freeze([
  "none",
  "held",
]);

const FORBIDDEN_EVIDENCE_FIELDS = Object.freeze([
  "mime_bytes",
  "raw_bytes",
  "body",
  "body_html",
  "body_text",
  "provider_payload",
  "access_token",
  "refresh_token",
]);

function requiredString(input, field, maxLength = 512) {
  const value = input?.[field];
  if (
    typeof value !== "string"
    || value.trim() === ""
    || value.trim().length > maxLength
  ) {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
}

function optionalString(input, field, maxLength = 512) {
  const value = input?.[field];
  if (value === null || value === undefined || value === "") return null;
  return requiredString(input, field, maxLength);
}

function requiredInstant(input, field) {
  const value = requiredString(input, field);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    throw new TypeError(`${field} must be a valid instant`);
  }
  return new Date(milliseconds).toISOString();
}

function sha256(value, field) {
  const digest = requiredString({ [field]: value }, field, 64).toLowerCase();
  if (!/^[a-f0-9]{64}$/u.test(digest)) {
    throw new TypeError(`${field} must be a lowercase SHA-256 digest`);
  }
  return digest;
}

function byteSize(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${field} must be a non-negative safe integer`);
  }
  return value;
}

function enumValue(value, allowed, field) {
  const normalized = requiredString({ [field]: value }, field);
  if (!allowed.includes(normalized)) {
    throw new TypeError(`${field} is invalid`);
  }
  return normalized;
}

function rejectRawEvidence(input) {
  for (const field of FORBIDDEN_EVIDENCE_FIELDS) {
    if (input?.[field] !== null && input?.[field] !== undefined) {
      throw new TypeError(`${field} cannot be stored in inquiry evidence`);
    }
  }
}

export function normalizeEvidenceMailboxAddress(value) {
  const address = requiredString(
    { mailbox_address: value },
    "mailbox_address",
    320,
  ).normalize("NFKC").toLowerCase();
  if (
    !address.includes("@")
    || /[\u0000-\u001f\u007f\s]/u.test(address)
  ) {
    throw new TypeError("mailbox_address is invalid");
  }
  return address;
}

function normalizeInternetMessageId(value) {
  const messageId = optionalString(
    { internet_message_id: value },
    "internet_message_id",
    998,
  );
  return messageId?.normalize("NFKC").toLowerCase() ?? null;
}

function normalizeGraphMessageId(value) {
  return optionalString(
    { graph_immutable_message_id: value },
    "graph_immutable_message_id",
    512,
  );
}

function messageIdentity({
  internet_message_id,
  graph_immutable_message_id,
} = {}) {
  const internetMessageId = normalizeInternetMessageId(internet_message_id);
  const graphMessageId = normalizeGraphMessageId(
    graph_immutable_message_id,
  );
  if (!internetMessageId && !graphMessageId) {
    throw new TypeError(
      "internet_message_id or graph_immutable_message_id is required",
    );
  }
  return Object.freeze({
    kind: internetMessageId ? "internet" : "graph-immutable",
    value: internetMessageId ?? graphMessageId,
    internet_message_id: internetMessageId,
    graph_immutable_message_id: graphMessageId,
  });
}

function digestId(prefix, input) {
  return `${prefix}_${createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")
    .slice(0, 32)}`;
}

export function inquiryEmailEvidenceId(input = {}) {
  const identity = messageIdentity(input);
  return digestId("inquiry_email_evidence", {
    tenant_id: requiredString(input, "tenant_id"),
    mailbox_address: normalizeEvidenceMailboxAddress(input.mailbox_address),
    message_identity_kind: identity.kind,
    message_identity_value: identity.value,
  });
}

export function inquiryEvidenceFileObjectId(input = {}) {
  return digestId("inquiry_evidence_file", {
    tenant_id: requiredString(input, "tenant_id"),
    inquiry_email_evidence_id: requiredString(
      input,
      "inquiry_email_evidence_id",
    ),
    object_kind: enumValue(
      input.object_kind,
      INQUIRY_EVIDENCE_OBJECT_KINDS,
      "object_kind",
    ),
  });
}

function emailParty(value, field) {
  const input = typeof value === "string"
    ? { address: value }
    : value;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${field} must be an email party`);
  }
  return Object.freeze({
    display_name: optionalString(
      { display_name: input.display_name ?? input.name },
      "display_name",
      200,
    ),
    address: normalizeEvidenceMailboxAddress(
      input.address ?? input.email,
    ),
  });
}

function recipients(value) {
  if (!Array.isArray(value)) {
    throw new TypeError("recipients must be an array");
  }
  return Object.freeze(value.map((recipient, index) => {
    const party = emailParty(recipient, `recipients[${index}]`);
    const recipientType = enumValue(
      recipient?.recipient_type ?? recipient?.type ?? "to",
      ["to", "cc", "bcc"],
      `recipients[${index}].recipient_type`,
    );
    return Object.freeze({ ...party, recipient_type: recipientType });
  }));
}

function attachmentManifest(value) {
  if (!Array.isArray(value)) {
    throw new TypeError("attachment_manifest must be an array");
  }
  return Object.freeze(value.map((attachment, index) => {
    if (!attachment || typeof attachment !== "object") {
      throw new TypeError(`attachment_manifest[${index}] is invalid`);
    }
    return Object.freeze({
      attachment_id: optionalString(
        { attachment_id: attachment.attachment_id },
        "attachment_id",
        512,
      ),
      file_name: requiredString(
        { file_name: attachment.file_name ?? attachment.name },
        "file_name",
        255,
      ),
      byte_size: byteSize(
        attachment.byte_size ?? attachment.size,
        `attachment_manifest[${index}].byte_size`,
      ),
      mime_type: requiredString(
        { mime_type: attachment.mime_type ?? attachment.content_type },
        "mime_type",
        255,
      ).toLowerCase(),
    });
  }));
}

function optionalFileObjectId(value, field) {
  return optionalString({ [field]: value }, field);
}

export function normalizeInquiryEmailEvidence(input = {}) {
  rejectRawEvidence(input);
  if (
    input.model_type !== undefined
    && input.model_type !== "InquiryEmailEvidence"
  ) {
    throw new TypeError("InquiryEmailEvidence.model_type is invalid");
  }
  const mailboxAddress = normalizeEvidenceMailboxAddress(
    input.mailbox_address,
  );
  const identity = messageIdentity(input);
  const expectedId = inquiryEmailEvidenceId({
    ...input,
    mailbox_address: mailboxAddress,
    ...identity,
  });
  const evidenceId = requiredString(input, "inquiry_email_evidence_id");
  if (evidenceId !== expectedId) {
    throw new TypeError(
      "inquiry_email_evidence_id does not match its message identity",
    );
  }
  const captureStatus = enumValue(
    input.capture_status,
    INQUIRY_CAPTURE_STATUSES,
    "capture_status",
  );
  const leadId = optionalString(input, "lead_id");
  const mimeFileObjectId = optionalFileObjectId(
    input.mime_file_object_id,
    "mime_file_object_id",
  );
  const displayFileObjectId = optionalFileObjectId(
    input.display_file_object_id,
    "display_file_object_id",
  );
  const mimeSha256 = input.mime_sha256 == null
    ? null
    : sha256(input.mime_sha256, "mime_sha256");
  const mimeByteSize = input.mime_byte_size == null
    ? null
    : byteSize(input.mime_byte_size, "mime_byte_size");
  if (
    captureStatus !== "failed"
    && (
      !mimeFileObjectId
      || !displayFileObjectId
      || !mimeSha256
      || mimeByteSize === null
    )
  ) {
    throw new TypeError(
      "captured inquiry evidence requires original and display file objects",
    );
  }
  if (captureStatus === "complete" && !leadId) {
    throw new TypeError("complete inquiry evidence requires lead_id");
  }
  return Object.freeze({
    model_type: "InquiryEmailEvidence",
    inquiry_email_evidence_id: evidenceId,
    tenant_id: requiredString(input, "tenant_id"),
    mailbox_address: mailboxAddress,
    lead_id: leadId,
    graph_immutable_message_id: identity.graph_immutable_message_id,
    internet_message_id: identity.internet_message_id,
    conversation_id: optionalString(input, "conversation_id", 512),
    mime_file_object_id: mimeFileObjectId,
    mime_sha256: mimeSha256,
    mime_byte_size: mimeByteSize,
    subject:
      typeof input.subject === "string"
        ? input.subject.trim().slice(0, 998)
        : "",
    sender: emailParty(input.sender, "sender"),
    recipients: recipients(input.recipients ?? []),
    received_at: requiredInstant(input, "received_at"),
    display_file_object_id: displayFileObjectId,
    attachment_manifest: attachmentManifest(
      input.attachment_manifest ?? [],
    ),
    capture_status: captureStatus,
    retention_policy_ref: requiredString(
      input,
      "retention_policy_ref",
    ),
    legal_hold_state: enumValue(
      input.legal_hold_state ?? "none",
      INQUIRY_EVIDENCE_LEGAL_HOLD_STATES,
      "legal_hold_state",
    ),
    captured_by: requiredString(input, "captured_by"),
    captured_at: requiredInstant(input, "captured_at"),
    raw_content_included: false,
    credential_material_included: false,
    production_ready_claim: false,
  });
}

function storagePointerReference(value) {
  const reference = requiredString(
    { storage_pointer_ref: value },
    "storage_pointer_ref",
    1024,
  );
  if (!/^vault:\/\/[A-Za-z0-9._:-]+\/[A-Za-z0-9._~/-]+$/u.test(reference)) {
    throw new TypeError(
      "storage_pointer_ref must be an opaque committed DMS vault reference",
    );
  }
  return reference;
}

function mimeTypeForObject(value, objectKind) {
  const mimeType = requiredString(
    { mime_type: value },
    "mime_type",
    255,
  ).toLowerCase();
  if (
    objectKind === "original_mime"
      ? mimeType !== "message/rfc822"
      : !/^text\/(?:html|plain)(?:\s*;\s*charset=utf-8)?$/u.test(mimeType)
  ) {
    throw new TypeError("mime_type does not match object_kind");
  }
  return mimeType;
}

export function normalizeInquiryEvidenceFileObject(input = {}) {
  rejectRawEvidence(input);
  if (
    input.model_type !== undefined
    && input.model_type !== "InquiryEvidenceFileObject"
  ) {
    throw new TypeError("InquiryEvidenceFileObject.model_type is invalid");
  }
  const objectKind = enumValue(
    input.object_kind,
    INQUIRY_EVIDENCE_OBJECT_KINDS,
    "object_kind",
  );
  const expectedId = inquiryEvidenceFileObjectId({
    tenant_id: input.tenant_id,
    inquiry_email_evidence_id: input.inquiry_email_evidence_id,
    object_kind: objectKind,
  });
  const fileObjectId = requiredString(
    input,
    "inquiry_evidence_file_object_id",
  );
  if (fileObjectId !== expectedId) {
    throw new TypeError(
      "inquiry_evidence_file_object_id does not match its evidence and kind",
    );
  }
  return Object.freeze({
    model_type: "InquiryEvidenceFileObject",
    inquiry_evidence_file_object_id: fileObjectId,
    tenant_id: requiredString(input, "tenant_id"),
    inquiry_email_evidence_id: requiredString(
      input,
      "inquiry_email_evidence_id",
    ),
    object_kind: objectKind,
    storage_pointer_ref: storagePointerReference(
      input.storage_pointer_ref,
    ),
    sha256: sha256(input.sha256, "sha256"),
    byte_size: byteSize(input.byte_size, "byte_size"),
    mime_type: mimeTypeForObject(input.mime_type, objectKind),
    scan_status: enumValue(
      input.scan_status,
      INQUIRY_EVIDENCE_SCAN_STATUSES,
      "scan_status",
    ),
    retention_policy_id: requiredString(input, "retention_policy_id"),
    legal_hold_state: enumValue(
      input.legal_hold_state ?? "none",
      INQUIRY_EVIDENCE_LEGAL_HOLD_STATES,
      "legal_hold_state",
    ),
    kms_key_ref: requiredString(input, "kms_key_ref", 1024),
    created_by: requiredString(input, "created_by"),
    created_at: requiredInstant(input, "created_at"),
    immutable_original: objectKind === "original_mime",
    raw_path_exposed: false,
    bytes_included: false,
    credential_material_included: false,
    production_ready_claim: false,
  });
}
