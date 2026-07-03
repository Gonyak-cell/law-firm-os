import { appendIntakeAuditEvent } from "./audit.js";
import { uploadDocument } from "../../dms/src/document-service.js";
import { sha256Hex } from "../../dms/src/storage/storage-adapter.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function positiveNumber(input, field) {
  const value = Number(input?.[field]);
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${field} must be positive`);
  return value;
}

function normalizeSha256(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim().replace(/^sha256:/, "");
}

function signedDocumentBytesFor(engagement) {
  const upload = engagement.signed_document_upload ?? {};
  const bytesBase64 = upload.bytes_base64 ?? upload.content_base64 ?? engagement.signed_document_bytes_base64;
  if (typeof bytesBase64 === "string" && bytesBase64.trim() !== "") return Buffer.from(bytesBase64, "base64");
  if (typeof upload.content_text === "string" && upload.content_text !== "") return Buffer.from(upload.content_text);
  return null;
}

function templateDocumentFor(engagement) {
  const template = engagement.template_document ?? {};
  return Object.freeze({
    ...template,
    model_type: "EngagementTemplateDocument",
    template_document_id: template.template_document_id ?? engagement.template_document_id ?? `template_document:${engagement.engagement_id}`,
    tenant_id: engagement.tenant_id,
    intake_request_id: engagement.intake_request_id,
    engagement_id: engagement.engagement_id,
    template_id: engagement.template_id ?? template.template_id ?? "matter_engagement_letter",
    document_title: template.document_title ?? "위임계약서",
    generation_state: "generated",
    generated_at: template.generated_at ?? engagement.approved_at ?? new Date().toISOString(),
    merge_field_count: Number(template.merge_field_count ?? 3),
    document_payload_included: false,
    template_payload_included: false,
    production_ready_claim: false,
  });
}

function dmsDocumentForSignedUpload(engagement, templateDocument) {
  const upload = engagement.signed_document_upload ?? {};
  const documentId = upload.document_id ?? upload.signed_document_id ?? engagement.signed_document_id;
  return Object.freeze({
    tenant_id: engagement.tenant_id,
    matter_id: upload.matter_id ?? engagement.matter_id ?? `intake:${engagement.intake_request_id}`,
    workspace_id: upload.workspace_id ?? `workspace:intake:${engagement.intake_request_id}`,
    folder_id: upload.folder_id ?? null,
    document_id: documentId,
    title: upload.title ?? templateDocument.document_title ?? "Signed engagement letter",
    status: "active",
    current_version_id: upload.version_id ?? `version:${documentId}:1`,
    permission_envelope_id: upload.permission_envelope_id ?? `perm:${engagement.tenant_id}:${documentId}`,
    audit_trace_id: upload.audit_trace_id ?? `audit:${engagement.tenant_id}:${documentId}`,
    mime_type: upload.mime_type ?? "application/pdf",
  });
}

function signedUploadFor(engagement, templateDocument, dmsUpload = null) {
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
  const receipt = dmsUpload?.storage_receipt ?? null;
  const documentId = upload.document_id ?? upload.signed_document_id ?? engagement.signed_document_id;
  const signatureRef = upload.signature_ref ?? engagement.signature_ref;
  const callerContentSha256 = upload.content_sha256 ?? upload.sha256;
  const callerSha256 = normalizeSha256(callerContentSha256);
  const contentSha256 = receipt?.sha256 ?? callerContentSha256;
  requiredString({ document_id: documentId }, "document_id");
  requiredString({ signature_ref: signatureRef }, "signature_ref");
  requiredString({ content_sha256: contentSha256 }, "content_sha256");
  if (documentId !== engagement.signed_document_id) throw new Error("signed document upload mismatch");
  if (signatureRef !== engagement.signature_ref) throw new Error("signed document signature mismatch");
  if (!signatureRef.startsWith("signature:")) throw new Error("signature_ref must be a signature receipt");
  if (receipt && callerSha256 && callerSha256 !== receipt.sha256) throw new Error("signed document hash mismatch");
  return Object.freeze({
    ...safeUpload,
    model_type: "EngagementSignedDocumentUpload",
    signed_document_upload_id: upload.signed_document_upload_id ?? engagement.signed_document_upload_id ?? `signed_upload:${engagement.engagement_id}`,
    tenant_id: engagement.tenant_id,
    intake_request_id: engagement.intake_request_id,
    engagement_id: engagement.engagement_id,
    template_document_id: templateDocument.template_document_id,
    document_id: documentId,
    signed_document_id: documentId,
    signature_ref: signatureRef,
    content_sha256: contentSha256,
    byte_size: receipt?.byte_size ?? positiveNumber(upload, "byte_size"),
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

function uploadSignedDocumentBytes({ dms_repository, dms_storage, engagement, templateDocument, actor_id, idempotency_key } = {}) {
  const bytes = signedDocumentBytesFor(engagement);
  if (!bytes) return null;
  if (!dms_repository || !dms_storage) throw new Error("signed document bytes require DMS repository and storage");
  const upload = engagement.signed_document_upload ?? {};
  const callerSha256 = normalizeSha256(upload.content_sha256 ?? upload.sha256);
  const serverSha256 = sha256Hex(bytes);
  if (callerSha256 && callerSha256 !== serverSha256) throw new Error("signed document hash mismatch");
  return uploadDocument({
    repository: dms_repository,
    storage: dms_storage,
    document: dmsDocumentForSignedUpload(engagement, templateDocument),
    bytes,
    actor_id,
    idempotency_key: `engagement-signed-document:${idempotency_key}`,
  });
}

export function approveEngagement({ repository, engagement, actor_id, idempotency_key, dms_repository, dms_storage } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(engagement, "tenant_id");
  requiredString(engagement, "engagement_id");
  requiredString(engagement, "intake_request_id");
  requiredString(engagement, "signed_document_id");
  requiredString(engagement, "signature_ref");
  const replay = repository.getIdempotency({ tenant_id: engagement.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const templateDocument = tx.create(templateDocumentFor(engagement));
    const dmsUpload = uploadSignedDocumentBytes({
      dms_repository,
      dms_storage,
      engagement,
      templateDocument,
      actor_id,
      idempotency_key,
    });
    const signedUpload = tx.create(signedUploadFor(engagement, templateDocument, dmsUpload));
    const { template_document, signed_document_upload, signed_document_bytes_base64, ...engagementRecordInput } = engagement;
    void signed_document_bytes_base64;
    const record = tx.create({
      ...engagementRecordInput,
      model_type: "Engagement",
      template_id: templateDocument.template_id,
      template_document_id: templateDocument.template_document_id,
      signed_document_upload_id: signedUpload.signed_document_upload_id,
      signed_document_sha256: signedUpload.content_sha256,
      signed_upload_verified: true,
      template_document_generated: true,
      lx06_upload_verified: true,
      status: "approved",
      approved_at: engagement.approved_at ?? new Date().toISOString(),
    });
    const templateAuditEvent = appendIntakeAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "engagement.template.generated",
        object_type: "EngagementTemplateDocument",
        object_id: templateDocument.template_document_id,
        idempotency_key,
        metadata: {
          intake_request_id: record.intake_request_id,
          engagement_id: record.engagement_id,
          template_id: record.template_id,
        },
      },
    });
    const signedUploadAuditEvent = appendIntakeAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "engagement.signed_document.uploaded",
        object_type: "EngagementSignedDocumentUpload",
        object_id: signedUpload.signed_document_upload_id,
        idempotency_key,
        metadata: {
          intake_request_id: record.intake_request_id,
          engagement_id: record.engagement_id,
          signed_document_id: signedUpload.signed_document_id,
          signature_ref: signedUpload.signature_ref,
          content_sha256: signedUpload.content_sha256,
          lx_registry_ref: signedUpload.lx_registry_ref,
          dms_document_id: signedUpload.dms_document_id,
          dms_version_id: signedUpload.dms_version_id,
          dms_file_object_id: signedUpload.dms_file_object_id,
          server_hash_recomputed: signedUpload.server_hash_recomputed,
          document_bytes_included: false,
          storage_pointer_ref_included: false,
        },
      },
    });
    const auditEvent = appendIntakeAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "engagement.approved",
        object_type: "Engagement",
        object_id: record.engagement_id,
        idempotency_key,
        metadata: {
          intake_request_id: record.intake_request_id,
          signed_document_id: record.signed_document_id,
          signature_ref: record.signature_ref,
          template_id: record.template_id,
          template_document_id: record.template_document_id,
          signed_document_upload_id: record.signed_document_upload_id,
          signed_document_sha256: record.signed_document_sha256,
          dms_file_object_id: signedUpload.dms_file_object_id,
          server_hash_recomputed: signedUpload.server_hash_recomputed,
          document_bytes_included: false,
        },
      },
    });
    const response = Object.freeze({
      outcome: "approved",
      engagement: record,
      template_document: templateDocument,
      signed_document_upload: signedUpload,
      dms_upload: dmsUpload,
      template_audit_event: templateAuditEvent,
      signed_upload_audit_event: signedUploadAuditEvent,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "engagement_approve", response });
    return response;
  });
}
