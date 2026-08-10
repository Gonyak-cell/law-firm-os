import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { decodeRecordDomainIdempotencyResponse } from "../../persistence/src/record-domain-adapter.js";
import { INTAKE_DOMAIN_DESCRIPTOR } from "./central-ledger.js";
import { decodeStoredEngagementApprovalResponse } from "./engagement-approval-response.js";

export const ENGAGEMENT_LEGACY_READINESS_SCHEMA =
  "law-firm-os.intake-engagement-legacy-idempotency-readiness.v1";
const KNOWN_NON_ENGAGEMENT_OPERATIONS = new Set([
  "clearance_token_issue", "conflict_check_create", "conflict_decision_record",
  "conflict_hit_create", "conflict_search_execute", "fee_terms_approve",
  "intake_request_create", "risk_approve", "waiver_approve",
]);

function text(value) {
  return typeof value === "string" && value.trim() ? value : null;
}

function hasCompleteAuthorityBinding(entry) {
  return text(entry?.operation)
    && text(entry.actor_id)
    && text(entry.object_type)
    && text(entry.object_id)
    && typeof entry.request_fingerprint === "string"
    && /^[a-f0-9]{64}$/u.test(entry.request_fingerprint);
}

function hasEngagementAuthorityHint(entry) {
  const key = text(entry?.idempotency_key ?? entry?.key);
  const parentRequestHash = key && hashDomainValue({ operation: "engagement_approve", key });
  return entry?.operation === "engagement_approve"
    || entry?.object_type === "Engagement"
    || entry?.operation === `request-hash:${parentRequestHash}`;
}

function hasEngagementResponseHint(entry) {
  const response = entry?.response;
  return response?.engagement?.model_type === "Engagement"
    || response?.template_document?.model_type === "EngagementTemplateDocument"
    || response?.signed_document_upload?.model_type === "EngagementSignedDocumentUpload"
    || response?.audit_event?.action === "engagement.approved";
}

function expectedAudit(event, {
  tenantId, actorId, key, action, objectType, objectId, metadata,
}) {
  if (event?.tenant_id !== tenantId
      || event?.actor_id !== actorId
      || event?.action !== action
      || event?.object_type !== objectType
      || event?.object_id !== objectId
      || event?.idempotency_key !== key
      || event?.event_id !== `intake:${action}:${tenantId}:${objectType}:${objectId}:${key}`) {
    return false;
  }
  return Object.entries(metadata).every(([field, value]) => event.metadata?.[field] === value);
}

export function hasParentEngagementApprovalCore(entry) {
  const response = entry?.response;
  const engagement = response?.engagement;
  const template = response?.template_document;
  const upload = response?.signed_document_upload;
  const key = text(entry?.idempotency_key ?? entry?.key);
  const tenantId = text(engagement?.tenant_id);
  const engagementId = text(engagement?.engagement_id);
  const intakeRequestId = text(engagement?.intake_request_id);
  const templateDocumentId = text(engagement?.template_document_id);
  const signedUploadId = text(engagement?.signed_document_upload_id);
  const signedDocumentId = text(engagement?.signed_document_id);
  const signatureRef = text(engagement?.signature_ref);
  const contentSha256 = text(engagement?.signed_document_sha256);
  const actorId = text(response?.audit_event?.actor_id);
  if (response?.outcome !== "approved" || response?.idempotent_replay !== false
      || !key || !tenantId || !engagementId || !intakeRequestId
      || !templateDocumentId || !signedUploadId || !signedDocumentId
      || !signatureRef || !contentSha256 || !actorId
      || engagement.model_type !== "Engagement" || engagement.status !== "approved"
      || engagement.signed_upload_verified !== true
      || template?.model_type !== "EngagementTemplateDocument"
      || upload?.model_type !== "EngagementSignedDocumentUpload"
      || template.tenant_id !== tenantId || upload.tenant_id !== tenantId
      || template.engagement_id !== engagementId || upload.engagement_id !== engagementId
      || template.intake_request_id !== intakeRequestId || upload.intake_request_id !== intakeRequestId
      || template.template_document_id !== templateDocumentId
      || upload.template_document_id !== templateDocumentId
      || upload.signed_document_upload_id !== signedUploadId
      || upload.document_id !== signedDocumentId || upload.signed_document_id !== signedDocumentId
      || upload.signature_ref !== signatureRef || upload.content_sha256 !== contentSha256) {
    return false;
  }
  if (!expectedAudit(response.template_audit_event, {
    tenantId, actorId, key, action: "engagement.template.generated",
    objectType: "EngagementTemplateDocument", objectId: templateDocumentId,
    metadata: { intake_request_id: intakeRequestId, engagement_id: engagementId, template_id: engagement.template_id },
  }) || !expectedAudit(response.signed_upload_audit_event, {
    tenantId, actorId, key, action: "engagement.signed_document.uploaded",
    objectType: "EngagementSignedDocumentUpload", objectId: signedUploadId,
    metadata: {
      intake_request_id: intakeRequestId, engagement_id: engagementId,
      signed_document_id: signedDocumentId, signature_ref: signatureRef,
      content_sha256: contentSha256,
    },
  }) || !expectedAudit(response.audit_event, {
    tenantId, actorId, key, action: "engagement.approved",
    objectType: "Engagement", objectId: engagementId,
    metadata: {
      intake_request_id: intakeRequestId, signed_document_id: signedDocumentId,
      signature_ref: signatureRef, template_document_id: templateDocumentId,
      signed_document_upload_id: signedUploadId, signed_document_sha256: contentSha256,
    },
  })) return false;
  const dms = response.dms_upload;
  if (dms == null) {
    return upload.dms_document_id == null && upload.dms_version_id == null
      && upload.dms_file_object_id == null && upload.server_hash_recomputed === false;
  }
  return dms.document?.document_id === upload.dms_document_id
    && dms.version?.version_id === upload.dms_version_id
    && dms.file_object?.file_object_id === upload.dms_file_object_id
    && dms.version?.file_object_id === upload.dms_file_object_id
    && dms.storage_receipt?.sha256 === contentSha256
    && Number(dms.storage_receipt?.byte_size) === Number(upload.byte_size);
}

export function classifyEngagementApprovalIdempotency(entry) {
  if (!entry) return "absent";
  if (hasCompleteAuthorityBinding(entry)) return "current";
  return hasEngagementAuthorityHint(entry) || hasParentEngagementApprovalCore(entry)
    ? "legacy_unresolved"
    : "other";
}

function hasValidCurrentEngagementAuthority(entry) {
  if (!hasCompleteAuthorityBinding(entry)
      || entry.operation !== "engagement_approve"
      || entry.object_type !== "Engagement") return false;
  const decoded = decodeStoredEngagementApprovalResponse(entry.response, {
    actor_id: entry.actor_id,
  });
  if (decoded.state !== "valid") return false;
  const canonical = decoded.response;
  return hasParentEngagementApprovalCore({ ...entry, response: canonical })
    && entry.object_id === canonical.engagement.engagement_id
    && entry.actor_id === canonical.audit_event.actor_id
    && entry.request_hash === entry.request_fingerprint
    && entry.request_fingerprint === decoded.replay_authority_digest;
}

export function inspectEngagementLegacyIdempotencyEntries(entries = []) {
  const unresolved = [];
  let malformedAuthorityCount = 0;
  let absentAuthorityCount = 0;
  let partialAuthorityCount = 0;
  let invalidCurrentAuthorityCount = 0;
  for (const entry of entries) {
    let decoded;
    try {
      decoded = decodeRecordDomainIdempotencyResponse(entry.response, { inspection: true });
    } catch {
      malformedAuthorityCount += 1;
      unresolved.push(hashDomainValue({
        key: entry?.key ?? null,
        request_hash: entry?.request_hash ?? null,
        authority_state: "decode_failed",
      }));
      continue;
    }
    const normalized = {
      idempotency_key: entry.key,
      request_hash: entry.request_hash,
      operation: decoded.authority?.operation ?? `request-hash:${entry.request_hash}`,
      actor_id: decoded.authority?.actor_id ?? null,
      object_type: decoded.authority?.object_type ?? null,
      object_id: decoded.authority?.object_id ?? null,
      request_fingerprint: decoded.authority?.request_fingerprint ?? null,
      response: decoded.response,
    };
    const parentRequestHash = hashDomainValue({ operation: "engagement_approve", key: entry.key });
    const operationHint = decoded.authority?.operation ?? decoded.authority_operation_hint;
    const ambiguousAuthority = (decoded.authority_state === "partial"
      || decoded.authority_state === "malformed")
      && !KNOWN_NON_ENGAGEMENT_OPERATIONS.has(operationHint);
    const candidate = entry.request_hash === parentRequestHash
      || hasEngagementAuthorityHint(normalized)
      || hasEngagementResponseHint(normalized)
      || ambiguousAuthority
      || hasParentEngagementApprovalCore(normalized);
    if (!candidate || (decoded.authority_state === "valid"
      && hasValidCurrentEngagementAuthority(normalized))) continue;
    if (decoded.authority_state === "malformed") malformedAuthorityCount += 1;
    else if (decoded.authority_state === "absent") absentAuthorityCount += 1;
    else if (decoded.authority_state === "partial") partialAuthorityCount += 1;
    else invalidCurrentAuthorityCount += 1;
    unresolved.push(hashDomainValue({
      key: entry.key,
      request_hash: entry.request_hash,
      authority_state: decoded.authority_state,
      response: decoded.response,
    }));
  }
  return Object.freeze({
    schema_version: ENGAGEMENT_LEGACY_READINESS_SCHEMA,
    ready: unresolved.length === 0,
    inspected_idempotency_count: entries.length,
    legacy_unresolved_count: unresolved.length,
    absent_authority_count: absentAuthorityCount,
    partial_authority_count: partialAuthorityCount,
    malformed_authority_count: malformedAuthorityCount,
    invalid_current_authority_count: invalidCurrentAuthorityCount,
    inventory_sha256: hashDomainValue([...unresolved].sort()),
    raw_ids_included: false,
    raw_keys_included: false,
    response_payloads_included: false,
    production_ready_claim: false,
  });
}

export async function inspectPostgresEngagementLegacyIdempotency({ ledger, tenant_id } = {}) {
  if (!ledger || typeof ledger.listIdempotency !== "function") {
    throw new TypeError("PostgreSQL domain ledger is required");
  }
  const entries = await ledger.listIdempotency({
    tenant_id,
    domain_id: INTAKE_DOMAIN_DESCRIPTOR.domain_id,
  });
  return inspectEngagementLegacyIdempotencyEntries(entries);
}
