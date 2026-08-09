import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import {
  canonicalEngagementApprovalFingerprintBinding,
  engagementApprovalRequestFingerprint,
} from "./engagement-approval-binding.js";

export const ENGAGEMENT_APPROVAL_BINDING_FIELD =
  "__lawos_engagement_approval_binding_v1";
export const ENGAGEMENT_APPROVAL_REPLAY_AUTHORITY_SCHEMA =
  "law-firm-os.intake-engagement-approval-replay-authority.v1";

const PRIVATE_AUTHORITY_KEYS = Object.freeze([
  "request_binding", "response_sha256", "schema",
]);

const COMMON_RECORD_FIELDS = Object.freeze([
  "model_type", "resource_id", "tenant_id", "owner_module", "created_at", "updated_at",
  "writes_product_state", "creates_database_rows", "updates_database_rows",
  "deletes_database_rows", "evaluates_runtime_permission", "writes_audit_event",
  "dispatches_intake_runtime", "executes_api_handler", "creates_matter",
  "g6_runtime_readiness_claim", "production_ready_claim",
]);
const ENGAGEMENT_FIELDS = Object.freeze([
  ...COMMON_RECORD_FIELDS, "engagement_id", "intake_request_id", "template_id",
  "template_document_id", "signed_document_id", "signature_ref",
  "signed_document_upload_id", "matter_id", "approver_id", "approved_at",
  "legal_client_party_id", "scope_summary", "fee_terms_id", "approval_state",
  "signed_document_sha256", "signed_upload_verified", "template_document_generated",
  "lx06_upload_verified", "status",
]);
const TEMPLATE_FIELDS = Object.freeze([
  ...COMMON_RECORD_FIELDS, "template_document_id", "intake_request_id", "engagement_id",
  "template_id", "document_title", "generation_state", "generated_at", "merge_field_count",
  "document_payload_included", "template_payload_included",
]);
const UPLOAD_FIELDS = Object.freeze([
  ...COMMON_RECORD_FIELDS, "signed_document_upload_id", "intake_request_id", "engagement_id",
  "template_document_id", "document_id", "signed_document_id", "signature_ref",
  "content_sha256", "sha256", "byte_size", "mime_type", "upload_state", "lx_registry_ref",
  "matter_id", "workspace_id", "folder_id", "title", "version_id",
  "permission_envelope_id", "audit_trace_id", "dms_document_id", "dms_version_id",
  "dms_file_object_id", "server_hash_recomputed", "bytes_included",
  "storage_pointer_ref_included",
]);
const AUDIT_FIELDS = Object.freeze([
  "tenant_id", "actor_id", "action", "object_type", "object_id", "idempotency_key",
  "event_id", "decision", "occurred_at", "created_at", "production_ready_claim",
]);
const DMS_RESULT_FIELDS = Object.freeze([
  "schema_version", "outcome", "tenant_id", "session_id", "upload_session_id",
  "committed_at", "idempotent_replay", "provider_finalize_before_metadata",
  "independent_digest_readback",
]);
const DMS_DOCUMENT_FIELDS = Object.freeze([
  "tenant_id", "document_id", "current_version_id", "title", "mime_type", "status",
]);
const DMS_VERSION_FIELDS = Object.freeze([
  "tenant_id", "version_id", "document_id", "version_number", "file_object_id",
  "sha256", "created_at", "status", "persisted",
]);
const DMS_FILE_FIELDS = Object.freeze([
  "tenant_id", "file_object_id", "sha256", "byte_size", "content_type", "mime_type",
  "status", "raw_path_exposed", "storage_pointer_ref_included", "bytes_included",
]);
const DMS_RECEIPT_FIELDS = Object.freeze([
  "tenant_id", "sha256", "byte_size", "mime_type", "raw_path_exposed",
  "storage_pointer_ref_included", "bytes_exposed",
]);
const TEMPLATE_AUDIT_METADATA = Object.freeze([
  "intake_request_id", "engagement_id", "template_id",
]);
const UPLOAD_AUDIT_METADATA = Object.freeze([
  "intake_request_id", "engagement_id", "signed_document_id", "signature_ref",
  "content_sha256", "lx_registry_ref", "dms_document_id", "dms_version_id",
  "dms_file_object_id", "server_hash_recomputed", "document_bytes_included",
  "storage_pointer_ref_included",
]);
const APPROVAL_AUDIT_METADATA = Object.freeze([
  "intake_request_id", "signed_document_id", "signature_ref", "template_id",
  "template_document_id", "signed_document_upload_id", "signed_document_sha256",
  "dms_file_object_id", "server_hash_recomputed", "document_bytes_included",
]);

function scalar(value, field) {
  if (value === null || typeof value === "string" || typeof value === "boolean"
      || (typeof value === "number" && Number.isFinite(value))) return value;
  throw new TypeError(`${field} must be a scalar`);
}

function project(input, fields) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("canonical response object is required");
  return Object.fromEntries(fields
    .filter((field) => Object.hasOwn(input, field) && input[field] !== undefined)
    .map((field) => [field, scalar(input[field], field)]));
}

function audit(event, metadataFields) {
  return Object.freeze({
    ...project(event, AUDIT_FIELDS),
    metadata: Object.freeze(project(event.metadata, metadataFields)),
  });
}

export function canonicalEngagementDmsUploadResult(result) {
  if (result == null) return null;
  return Object.freeze({
    ...project(result, DMS_RESULT_FIELDS),
    document: Object.freeze(project(result.document, DMS_DOCUMENT_FIELDS)),
    version: Object.freeze(project(result.version, DMS_VERSION_FIELDS)),
    file_object: Object.freeze(project(result.file_object, DMS_FILE_FIELDS)),
    storage_receipt: Object.freeze(project(result.storage_receipt, DMS_RECEIPT_FIELDS)),
    audit_event: result.audit_event == null
      ? null
      : Object.freeze(project(result.audit_event, ["event_id", "raw_payload_included"])),
  });
}

export function canonicalEngagementApprovalResponse(response) {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    throw new TypeError("engagement approval response is required");
  }
  return Object.freeze({
    outcome: scalar(response.outcome, "outcome"),
    engagement: Object.freeze(project(response.engagement, ENGAGEMENT_FIELDS)),
    template_document: Object.freeze(project(response.template_document, TEMPLATE_FIELDS)),
    signed_document_upload: Object.freeze(project(response.signed_document_upload, UPLOAD_FIELDS)),
    dms_upload: canonicalEngagementDmsUploadResult(response.dms_upload),
    template_audit_event: audit(response.template_audit_event, TEMPLATE_AUDIT_METADATA),
    signed_upload_audit_event: audit(response.signed_upload_audit_event, UPLOAD_AUDIT_METADATA),
    audit_event: audit(response.audit_event, APPROVAL_AUDIT_METADATA),
    idempotent_replay: scalar(response.idempotent_replay, "idempotent_replay"),
  });
}

function responseBinding(response, actorId) {
  return canonicalEngagementApprovalFingerprintBinding({
    engagement: {
      ...response.engagement,
      template_document: response.template_document,
      signed_document_upload: response.signed_document_upload,
    },
    actor_id: actorId,
  });
}

export function storedEngagementApprovalResponse({ response, binding, actor_id } = {}) {
  const canonicalResponse = canonicalEngagementApprovalResponse(response);
  const canonicalBinding = canonicalEngagementApprovalFingerprintBinding({
    engagement: binding,
    actor_id,
  });
  if (hashDomainValue(binding) !== hashDomainValue(canonicalBinding)
      || hashDomainValue(canonicalBinding) !== hashDomainValue(responseBinding(canonicalResponse, actor_id))) {
    throw new TypeError("engagement approval binding does not match the canonical response");
  }
  const responseSha256 = hashDomainValue(canonicalResponse);
  return Object.freeze({
    ...canonicalResponse,
    [ENGAGEMENT_APPROVAL_BINDING_FIELD]: Object.freeze({
      schema: ENGAGEMENT_APPROVAL_REPLAY_AUTHORITY_SCHEMA,
      request_binding: canonicalBinding,
      response_sha256: responseSha256,
    }),
  });
}

export function engagementApprovalReplayAuthorityDigest({
  request_fingerprint,
  response_sha256,
} = {}) {
  if (typeof request_fingerprint !== "string" || !/^[a-f0-9]{64}$/u.test(request_fingerprint)
      || typeof response_sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(response_sha256)) {
    throw new TypeError("engagement approval replay authority digests are required");
  }
  return hashDomainValue({
    schema: ENGAGEMENT_APPROVAL_REPLAY_AUTHORITY_SCHEMA,
    request_fingerprint,
    response_sha256,
  });
}

function exactPrivateAuthority(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify(PRIVATE_AUTHORITY_KEYS)
    && value.schema === ENGAGEMENT_APPROVAL_REPLAY_AUTHORITY_SCHEMA
    && value.request_binding && typeof value.request_binding === "object"
    && !Array.isArray(value.request_binding)
    && typeof value.response_sha256 === "string"
    && /^[a-f0-9]{64}$/u.test(value.response_sha256);
}

export function decodeStoredEngagementApprovalResponse(value, { actor_id } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)
      || !Object.hasOwn(value, ENGAGEMENT_APPROVAL_BINDING_FIELD)) {
    return Object.freeze({
      state: "missing", response: null, request_fingerprint: null,
      replay_authority_digest: null,
    });
  }
  try {
    const publicResponse = { ...value };
    const authority = publicResponse[ENGAGEMENT_APPROVAL_BINDING_FIELD];
    delete publicResponse[ENGAGEMENT_APPROVAL_BINDING_FIELD];
    if (!exactPrivateAuthority(authority)) throw new TypeError("engagement approval replay authority is malformed");
    const canonicalResponse = canonicalEngagementApprovalResponse(publicResponse);
    const canonicalBinding = canonicalEngagementApprovalFingerprintBinding({
      engagement: authority.request_binding,
      actor_id,
    });
    const responseSha256 = hashDomainValue(canonicalResponse);
    const requestFingerprint = engagementApprovalRequestFingerprint({
      engagement: canonicalBinding,
      actor_id,
    });
    if (hashDomainValue(publicResponse) !== hashDomainValue(canonicalResponse)
        || authority.response_sha256 !== responseSha256
        || hashDomainValue(authority.request_binding) !== hashDomainValue(canonicalBinding)
        || hashDomainValue(canonicalBinding) !== hashDomainValue(responseBinding(canonicalResponse, actor_id))) {
      throw new TypeError("engagement approval replay authority does not match the response");
    }
    return Object.freeze({
      state: "valid",
      response: canonicalResponse,
      request_fingerprint: requestFingerprint,
      replay_authority_digest: engagementApprovalReplayAuthorityDigest({
        request_fingerprint: requestFingerprint,
        response_sha256: responseSha256,
      }),
    });
  } catch {
    return Object.freeze({
      state: "malformed", response: null, request_fingerprint: null,
      replay_authority_digest: null,
    });
  }
}
