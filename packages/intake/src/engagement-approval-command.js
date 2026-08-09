import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { sha256Hex } from "../../dms/src/storage/storage-adapter.js";

export const ENGAGEMENT_APPROVAL_OPERATION = "engagement_approve";

function requiredText(value, field) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function exactBytes(engagement) {
  const upload = engagement.signed_document_upload ?? {};
  const value = upload.bytes_base64 ?? upload.content_base64
    ?? engagement.signed_document_bytes_base64;
  if (typeof value === "string" && value.trim()) return Buffer.from(value, "base64");
  if (typeof upload.content_text === "string" && upload.content_text !== "") {
    return Buffer.from(upload.content_text);
  }
  return null;
}

function safeEngagementBinding(engagement, bytes) {
  const upload = engagement.signed_document_upload ?? {};
  const {
    bytes_base64,
    content_base64,
    content_text,
    document_bytes_base64,
    signed_document_bytes_base64,
    ...safeUpload
  } = upload;
  void bytes_base64;
  void content_base64;
  void content_text;
  void document_bytes_base64;
  void signed_document_bytes_base64;
  return {
    ...engagement,
    signed_document_bytes_base64: undefined,
    signed_document_upload: {
      ...safeUpload,
      content_sha256: bytes ? sha256Hex(bytes) : safeUpload.content_sha256 ?? safeUpload.sha256 ?? null,
      byte_size: bytes?.byteLength ?? safeUpload.byte_size ?? null,
    },
  };
}

function templateDocument(engagement) {
  const template = engagement.template_document ?? {};
  return Object.freeze({
    ...template,
    model_type: "EngagementTemplateDocument",
    template_document_id: template.template_document_id
      ?? engagement.template_document_id
      ?? `template_document:${engagement.engagement_id}`,
    tenant_id: engagement.tenant_id,
    intake_request_id: engagement.intake_request_id,
    engagement_id: engagement.engagement_id,
    template_id: engagement.template_id ?? template.template_id ?? "matter_engagement_letter",
    document_title: template.document_title ?? "위임계약서",
    generation_state: "generated",
    merge_field_count: Number(template.merge_field_count ?? 3),
    document_payload_included: false,
    template_payload_included: false,
    production_ready_claim: false,
  });
}

function dmsDocument(engagement, template) {
  const upload = engagement.signed_document_upload ?? {};
  const documentId = upload.document_id ?? upload.signed_document_id ?? engagement.signed_document_id;
  const versionId = upload.version_id ?? `version:${documentId}:1`;
  return Object.freeze({
    tenant_id: engagement.tenant_id,
    matter_id: upload.matter_id ?? engagement.matter_id ?? `intake:${engagement.intake_request_id}`,
    workspace_id: upload.workspace_id ?? `workspace:intake:${engagement.intake_request_id}`,
    folder_id: upload.folder_id ?? null,
    document_id: documentId,
    title: upload.title ?? template.document_title ?? "Signed engagement letter",
    status: "active",
    current_version_id: versionId,
    permission_envelope_id: upload.permission_envelope_id ?? `perm:${engagement.tenant_id}:${documentId}`,
    audit_trace_id: upload.audit_trace_id ?? `audit:${engagement.tenant_id}:${documentId}`,
    mime_type: upload.mime_type ?? "application/pdf",
  });
}

export function engagementApprovalError(code, message, { retryable = false, status = 409 } = {}) {
  return Object.assign(new Error(message), {
    code: `LAWOS_${code}`,
    safe_error_code: code,
    retryable,
    status,
  });
}

export function prepareEngagementApproval({ engagement, actor_id, idempotency_key } = {}) {
  const tenantId = requiredText(engagement?.tenant_id, "tenant_id");
  const engagementId = requiredText(engagement?.engagement_id, "engagement_id");
  requiredText(engagement?.intake_request_id, "intake_request_id");
  requiredText(engagement?.signed_document_id, "signed_document_id");
  requiredText(engagement?.signature_ref, "signature_ref");
  const actorId = requiredText(actor_id, "actor_id");
  const idempotencyKey = requiredText(idempotency_key, "idempotency_key");
  const bytes = exactBytes(engagement);
  const template = templateDocument(engagement);
  const document = dmsDocument(engagement, template);
  const keyHash = hashDomainValue({ tenant_id: tenantId, idempotency_key: idempotencyKey });
  const requestFingerprint = hashDomainValue({
    operation: ENGAGEMENT_APPROVAL_OPERATION,
    actor_id: actorId,
    engagement: safeEngagementBinding(engagement, bytes),
  });
  const sessionId = `dms-upload:engagement:${keyHash}`;
  const objectId = `object:${document.current_version_id}`;
  return Object.freeze({
    tenant_id: tenantId,
    engagement_id: engagementId,
    actor_id: actorId,
    idempotency_key: idempotencyKey,
    request_fingerprint: requestFingerprint,
    claim_id: hashDomainValue({ operation: ENGAGEMENT_APPROVAL_OPERATION, tenant_id: tenantId, key_hash: keyHash }),
    engagement,
    template_document: template,
    bytes,
    dms: Object.freeze({
      document,
      session_id: sessionId,
      idempotency_key: `engagement-signed-document:${idempotencyKey}`,
      version_id: document.current_version_id,
      object_id: objectId,
      expected_sha256: bytes ? sha256Hex(bytes) : null,
      expected_byte_size: bytes?.byteLength ?? null,
      content_type: document.mime_type,
    }),
  });
}

export function intakeMetadataGuard(prepared) {
  if (!prepared.bytes) return null;
  return Object.freeze({
    schema_version: "law-firm-os.dms-external-metadata-guard.v1",
    provider: "lawos-intake",
    tenant_id: prepared.tenant_id,
    claim_id: prepared.claim_id,
    request_fingerprint: prepared.request_fingerprint,
    session_id: prepared.dms.session_id,
    idempotency_key: prepared.dms.idempotency_key,
    document_id: prepared.dms.document.document_id,
    version_id: prepared.dms.version_id,
    object_id: prepared.dms.object_id,
    expected_sha256: prepared.dms.expected_sha256,
    expected_byte_size: prepared.dms.expected_byte_size,
    content_type: prepared.dms.content_type,
    actor_id: prepared.actor_id,
  });
}

export function assertEngagementDmsSession(prepared, session) {
  const guard = session?.provider_receipt?.completion_authority;
  const expected = intakeMetadataGuard(prepared);
  if (!expected || !guard || hashDomainValue(guard) !== hashDomainValue(expected)
      || session.tenant_id !== prepared.tenant_id
      || session.session_id !== prepared.dms.session_id
      || session.idempotency_key !== prepared.dms.idempotency_key
      || session.document_id !== prepared.dms.document.document_id
      || session.version_id !== prepared.dms.version_id
      || session.object_id !== prepared.dms.object_id
      || session.expected_sha256 !== prepared.dms.expected_sha256
      || session.expected_byte_size !== prepared.dms.expected_byte_size
      || session.content_type !== prepared.dms.content_type
      || session.actor_id !== prepared.actor_id) {
    throw engagementApprovalError(
      "INTAKE_ENGAGEMENT_DMS_AUTHORITY_MISMATCH",
      "DMS upload session does not match the engagement approval",
    );
  }
  return session;
}
