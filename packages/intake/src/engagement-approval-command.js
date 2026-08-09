import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { sha256Hex } from "../../dms/src/storage/storage-adapter.js";
import {
  canonicalEngagementApprovalFingerprintBinding,
  engagementApprovalRequestFingerprint,
  engagementDmsDocument,
  engagementTemplateDocument,
  ENGAGEMENT_APPROVAL_OPERATION,
} from "./engagement-approval-binding.js";

export { ENGAGEMENT_APPROVAL_OPERATION } from "./engagement-approval-binding.js";

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
  const callerSha = String(
    engagement.signed_document_upload?.content_sha256
      ?? engagement.signed_document_upload?.sha256
      ?? "",
  ).trim().replace(/^sha256:/u, "");
  if (bytes && callerSha && callerSha !== sha256Hex(bytes)) {
    throw new Error("signed document hash mismatch");
  }
  const canonicalEngagement = canonicalEngagementApprovalFingerprintBinding({
    engagement, actor_id: actorId, bytes,
  });
  const template = engagementTemplateDocument(canonicalEngagement);
  const document = engagementDmsDocument(canonicalEngagement, template);
  const keyHash = hashDomainValue({ tenant_id: tenantId, idempotency_key: idempotencyKey });
  const requestFingerprint = engagementApprovalRequestFingerprint({
    engagement: canonicalEngagement, actor_id: actorId,
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
    engagement: canonicalEngagement,
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
