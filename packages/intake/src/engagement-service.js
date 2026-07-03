import { appendIntakeAuditEvent } from "./audit.js";

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

function signedUploadFor(engagement, templateDocument) {
  const upload = engagement.signed_document_upload ?? {};
  const documentId = upload.document_id ?? upload.signed_document_id ?? engagement.signed_document_id;
  const signatureRef = upload.signature_ref ?? engagement.signature_ref;
  const contentSha256 = upload.content_sha256 ?? upload.sha256;
  requiredString({ document_id: documentId }, "document_id");
  requiredString({ signature_ref: signatureRef }, "signature_ref");
  requiredString({ content_sha256: contentSha256 }, "content_sha256");
  if (documentId !== engagement.signed_document_id) throw new Error("signed document upload mismatch");
  if (signatureRef !== engagement.signature_ref) throw new Error("signed document signature mismatch");
  if (!signatureRef.startsWith("signature:")) throw new Error("signature_ref must be a signature receipt");
  return Object.freeze({
    ...upload,
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
    byte_size: positiveNumber(upload, "byte_size"),
    mime_type: upload.mime_type ?? "application/pdf",
    upload_state: "uploaded",
    lx_registry_ref: upload.lx_registry_ref ?? "LX-06",
    bytes_included: false,
    storage_pointer_ref_included: false,
    production_ready_claim: false,
  });
}

export function approveEngagement({ repository, engagement, actor_id, idempotency_key } = {}) {
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
    const signedUpload = tx.create(signedUploadFor(engagement, templateDocument));
    const { template_document, signed_document_upload, ...engagementRecordInput } = engagement;
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
        },
      },
    });
    const response = Object.freeze({
      outcome: "approved",
      engagement: record,
      template_document: templateDocument,
      signed_document_upload: signedUpload,
      template_audit_event: templateAuditEvent,
      signed_upload_audit_event: signedUploadAuditEvent,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "engagement_approve", response });
    return response;
  });
}
