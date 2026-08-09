import { appendIntakeAuditEvent } from "./audit.js";
import {
  ENGAGEMENT_APPROVAL_OPERATION,
  engagementApprovalError,
} from "./engagement-approval-command.js";

function positiveNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new TypeError(`${field} must be positive`);
  return number;
}

function normalizeSha256(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().replace(/^sha256:/u, "");
}

function signedUploadFor(prepared, templateDocument, dmsUpload) {
  const upload = prepared.engagement.signed_document_upload ?? {};
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
  const receipt = dmsUpload?.storage_receipt ?? null;
  const documentId = upload.document_id ?? upload.signed_document_id
    ?? prepared.engagement.signed_document_id;
  const signatureRef = upload.signature_ref ?? prepared.engagement.signature_ref;
  const callerSha = normalizeSha256(upload.content_sha256 ?? upload.sha256);
  const contentSha = receipt?.sha256 ?? upload.content_sha256 ?? upload.sha256;
  if (documentId !== prepared.engagement.signed_document_id) throw new Error("signed document upload mismatch");
  if (signatureRef !== prepared.engagement.signature_ref) throw new Error("signed document signature mismatch");
  if (!signatureRef.startsWith("signature:")) throw new Error("signature_ref must be a signature receipt");
  if (typeof contentSha !== "string" || !contentSha.trim()) throw new TypeError("content_sha256 is required");
  if (receipt && callerSha && callerSha !== receipt.sha256) throw new Error("signed document hash mismatch");
  return Object.freeze({
    ...safeUpload,
    model_type: "EngagementSignedDocumentUpload",
    signed_document_upload_id: upload.signed_document_upload_id
      ?? prepared.engagement.signed_document_upload_id
      ?? `signed_upload:${prepared.engagement_id}`,
    tenant_id: prepared.tenant_id,
    intake_request_id: prepared.engagement.intake_request_id,
    engagement_id: prepared.engagement_id,
    template_document_id: templateDocument.template_document_id,
    document_id: documentId,
    signed_document_id: documentId,
    signature_ref: signatureRef,
    content_sha256: contentSha,
    byte_size: receipt?.byte_size ?? positiveNumber(upload.byte_size, "byte_size"),
    mime_type: upload.mime_type ?? "application/pdf",
    upload_state: "uploaded",
    lx_registry_ref: upload.lx_registry_ref ?? "LX-06",
    dms_document_id: dmsUpload?.document?.document_id ?? null,
    dms_version_id: dmsUpload?.version?.version_id ?? null,
    dms_file_object_id: dmsUpload?.file_object?.file_object_id ?? null,
    server_hash_recomputed: Boolean(receipt),
    bytes_included: false,
    storage_pointer_ref_included: false,
    production_ready_claim: false,
  });
}

export function engagementApprovalReplay(repository, prepared) {
  const replay = repository.getIdempotency({
    tenant_id: prepared.tenant_id,
    idempotency_key: prepared.idempotency_key,
  });
  if (!replay) return null;
  if (replay.operation !== ENGAGEMENT_APPROVAL_OPERATION
      || replay.actor_id !== prepared.actor_id
      || replay.object_type !== "Engagement"
      || replay.object_id !== prepared.engagement_id
      || replay.request_fingerprint !== prepared.request_fingerprint) {
    throw engagementApprovalError(
      "IDEMPOTENCY_KEY_REUSED",
      "engagement approval idempotency key was reused",
    );
  }
  return Object.freeze({ ...replay.response, idempotent_replay: true });
}

export function persistEngagementApproval({ repository, prepared, dms_upload = null, occurred_at } = {}) {
  const occurredAt = new Date(occurred_at).toISOString();
  return repository.transaction((tx) => {
    const replay = engagementApprovalReplay(tx, prepared);
    if (replay) return replay;
    const templateDocument = tx.create({
      ...prepared.template_document,
      generated_at: prepared.template_document.generated_at ?? occurredAt,
      created_at: occurredAt,
      updated_at: occurredAt,
    });
    const signedUpload = tx.create({
      ...signedUploadFor(prepared, templateDocument, dms_upload),
      created_at: occurredAt,
      updated_at: occurredAt,
    });
    const { template_document, signed_document_upload, signed_document_bytes_base64, ...safeEngagement } = prepared.engagement;
    void template_document;
    void signed_document_upload;
    void signed_document_bytes_base64;
    const record = tx.create({
      ...safeEngagement,
      model_type: "Engagement",
      template_id: templateDocument.template_id,
      template_document_id: templateDocument.template_document_id,
      signed_document_upload_id: signedUpload.signed_document_upload_id,
      signed_document_sha256: signedUpload.content_sha256,
      signed_upload_verified: true,
      template_document_generated: true,
      lx06_upload_verified: true,
      status: "approved",
      approved_at: prepared.engagement.approved_at ?? occurredAt,
      created_at: occurredAt,
      updated_at: occurredAt,
    });
    const audit = (action, objectType, objectId, metadata) => appendIntakeAuditEvent({
      repository: tx,
      event: {
        tenant_id: prepared.tenant_id,
        actor_id: prepared.actor_id,
        action,
        object_type: objectType,
        object_id: objectId,
        idempotency_key: prepared.idempotency_key,
        metadata,
        occurred_at: occurredAt,
        created_at: occurredAt,
      },
    });
    const templateAuditEvent = audit("engagement.template.generated", "EngagementTemplateDocument", templateDocument.template_document_id, {
      intake_request_id: record.intake_request_id, engagement_id: record.engagement_id, template_id: record.template_id,
    });
    const signedUploadAuditEvent = audit("engagement.signed_document.uploaded", "EngagementSignedDocumentUpload", signedUpload.signed_document_upload_id, {
      intake_request_id: record.intake_request_id, engagement_id: record.engagement_id,
      signed_document_id: signedUpload.signed_document_id, signature_ref: signedUpload.signature_ref,
      content_sha256: signedUpload.content_sha256, lx_registry_ref: signedUpload.lx_registry_ref,
      dms_document_id: signedUpload.dms_document_id, dms_version_id: signedUpload.dms_version_id,
      dms_file_object_id: signedUpload.dms_file_object_id, server_hash_recomputed: signedUpload.server_hash_recomputed,
      document_bytes_included: false, storage_pointer_ref_included: false,
    });
    const auditEvent = audit("engagement.approved", "Engagement", record.engagement_id, {
      intake_request_id: record.intake_request_id, signed_document_id: record.signed_document_id,
      signature_ref: record.signature_ref, template_id: record.template_id,
      template_document_id: record.template_document_id,
      signed_document_upload_id: record.signed_document_upload_id,
      signed_document_sha256: record.signed_document_sha256,
      dms_file_object_id: signedUpload.dms_file_object_id,
      server_hash_recomputed: signedUpload.server_hash_recomputed,
      document_bytes_included: false,
    });
    const response = Object.freeze({
      outcome: "approved", engagement: record, template_document: templateDocument,
      signed_document_upload: signedUpload, dms_upload, template_audit_event: templateAuditEvent,
      signed_upload_audit_event: signedUploadAuditEvent, audit_event: auditEvent, idempotent_replay: false,
    });
    tx.recordIdempotency({
      tenant_id: prepared.tenant_id,
      idempotency_key: prepared.idempotency_key,
      operation: ENGAGEMENT_APPROVAL_OPERATION,
      object_type: "Engagement",
      object_id: prepared.engagement_id,
      actor_id: prepared.actor_id,
      request_fingerprint: prepared.request_fingerprint,
      response,
      created_at: occurredAt,
    });
    return response;
  });
}
