import { sha256Hex } from "../../dms/src/storage/storage-adapter.js";
import { hashDomainValue } from "../../persistence/src/domain-ledger.js";

export const ENGAGEMENT_APPROVAL_OPERATION = "engagement_approve";

const ENGAGEMENT_FIELDS = Object.freeze([
  "engagement_id", "tenant_id", "intake_request_id", "template_id",
  "template_document_id", "signed_document_id", "signature_ref",
  "signed_document_upload_id", "matter_id", "approver_id", "legal_client_party_id",
  "scope_summary", "fee_terms_id",
]);
const TEMPLATE_FIELDS = Object.freeze([
  "template_document_id", "template_id", "document_title", "merge_field_count",
]);
const UPLOAD_FIELDS = Object.freeze([
  "signed_document_upload_id", "document_id", "signed_document_id",
  "template_document_id", "signature_ref", "byte_size", "mime_type",
  "lx_registry_ref", "matter_id", "workspace_id", "folder_id", "title",
  "version_id", "permission_envelope_id", "audit_trace_id",
]);
const NUMBER_FIELDS = new Set(["byte_size", "merge_field_count"]);

function requiredText(value, field) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function canonicalField(value, field) {
  if (value === null) return null;
  if (NUMBER_FIELDS.has(field)) {
    if (typeof value !== "number" || !Number.isSafeInteger(value)
        || value < (field === "byte_size" ? 1 : 0)) {
      throw new TypeError(`${field} must be a valid number`);
    }
    return value;
  }
  if (typeof value !== "string") throw new TypeError(`${field} must be a string`);
  return value;
}

function normalizedSha256(value, field) {
  if (value == null) return null;
  if (typeof value !== "string") throw new TypeError(`${field} must be a SHA-256 digest`);
  const digest = value.trim().replace(/^sha256:/u, "");
  if (!/^[a-f0-9]{64}$/u.test(digest)) throw new TypeError(`${field} must be a SHA-256 digest`);
  return digest;
}

function presentFields(input, fields) {
  return Object.fromEntries(fields
    .filter((field) => Object.hasOwn(input ?? {}, field) && input[field] !== undefined)
    .map((field) => [field, canonicalField(input[field], field)]));
}

export function canonicalEngagementApprovalInput(engagement, bytes) {
  const safe = presentFields(engagement, ENGAGEMENT_FIELDS);
  const upload = presentFields(engagement?.signed_document_upload, UPLOAD_FIELDS);
  const contentSha = normalizedSha256(engagement?.signed_document_upload?.content_sha256, "content_sha256");
  const aliasSha = normalizedSha256(engagement?.signed_document_upload?.sha256, "sha256");
  if (contentSha && aliasSha && contentSha !== aliasSha) {
    throw new TypeError("signed document SHA-256 aliases do not match");
  }
  if (Object.hasOwn(engagement ?? {}, "template_document")) {
    safe.template_document = Object.freeze(presentFields(engagement.template_document, TEMPLATE_FIELDS));
  }
  safe.signed_document_upload = Object.freeze({
    ...upload,
    content_sha256: bytes ? sha256Hex(bytes) : contentSha ?? aliasSha,
    byte_size: bytes?.byteLength ?? upload.byte_size ?? null,
  });
  return Object.freeze(safe);
}

export function engagementTemplateDocument(engagement) {
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
    merge_field_count: template.merge_field_count ?? 3,
    document_payload_included: false,
    template_payload_included: false,
    production_ready_claim: false,
  });
}

export function engagementDmsDocument(engagement, template) {
  const upload = engagement.signed_document_upload ?? {};
  const documentId = upload.document_id ?? upload.signed_document_id ?? engagement.signed_document_id;
  return Object.freeze({
    tenant_id: engagement.tenant_id,
    matter_id: upload.matter_id ?? engagement.matter_id ?? `intake:${engagement.intake_request_id}`,
    workspace_id: upload.workspace_id ?? `workspace:intake:${engagement.intake_request_id}`,
    folder_id: upload.folder_id ?? null,
    document_id: documentId,
    title: upload.title ?? template.document_title ?? "Signed engagement letter",
    status: "active",
    current_version_id: upload.version_id ?? `version:${documentId}:1`,
    permission_envelope_id: upload.permission_envelope_id ?? `perm:${engagement.tenant_id}:${documentId}`,
    audit_trace_id: upload.audit_trace_id ?? `audit:${engagement.tenant_id}:${documentId}`,
    mime_type: upload.mime_type ?? "application/pdf",
  });
}

export function canonicalEngagementApprovalFingerprintBinding({ engagement, actor_id, bytes = null } = {}) {
  const actorId = requiredText(actor_id, "actor_id");
  const canonical = canonicalEngagementApprovalInput({ ...engagement, approver_id: actorId }, bytes);
  const template = engagementTemplateDocument(canonical);
  const document = engagementDmsDocument(canonical, template);
  const upload = canonical.signed_document_upload;
  return canonicalEngagementApprovalInput({
    ...canonical,
    template_id: template.template_id,
    template_document_id: template.template_document_id,
    signed_document_upload_id: upload.signed_document_upload_id ?? `signed_upload:${canonical.engagement_id}`,
    template_document: template,
    signed_document_upload: {
      ...upload,
      signed_document_upload_id: upload.signed_document_upload_id ?? `signed_upload:${canonical.engagement_id}`,
      document_id: document.document_id,
      signed_document_id: document.document_id,
      template_document_id: template.template_document_id,
      signature_ref: canonical.signature_ref,
      matter_id: document.matter_id,
      workspace_id: document.workspace_id,
      folder_id: document.folder_id,
      title: document.title,
      version_id: document.current_version_id,
      permission_envelope_id: document.permission_envelope_id,
      audit_trace_id: document.audit_trace_id,
      mime_type: document.mime_type,
      lx_registry_ref: upload.lx_registry_ref ?? "LX-06",
    },
  }, bytes);
}

export function engagementApprovalRequestFingerprint({ engagement, actor_id, bytes = null } = {}) {
  return hashDomainValue({
    operation: ENGAGEMENT_APPROVAL_OPERATION,
    actor_id,
    engagement: canonicalEngagementApprovalFingerprintBinding({ engagement, actor_id, bytes }),
  });
}
