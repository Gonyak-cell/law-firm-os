import { createDmsRepository } from "../../../dms/src/repository.js";

export const TENANT_ID = "tenant-outm20";
export const THREAD_ID = "email-thread-outm20";
export const DOCUMENT_ID = "doc:email-thread-outm20:original-mime";
export const VERSION_ID = "version:email-thread-outm20:original-mime:1";
export const FILE_OBJECT_ID = "file:email-thread-outm20:original-mime";
export const MIME_SHA256 = "a".repeat(64);
export const RECEIPT_ID = `outlook.email.file:${TENANT_ID}:${THREAD_ID}`;
export const MATTER_A = "matter-a";
export const MATTER_B = "matter-b";
export const MATTER_C = "matter-c";
export const ORIGINAL_ACTOR_ID = "user-original-filer";
export const CORRECTION_ACTOR_ID = "user-corrector";
export const ORIGINAL_OCCURRED_AT = "2026-08-08T01:00:00.000Z";
export const SESSION = Object.freeze({ session_id: "session-outm20" });

export function originalFiling(overrides = {}) {
  return Object.freeze({
    tenant_id: TENANT_ID,
    email_thread_id: THREAD_ID,
    document_id: DOCUMENT_ID,
    mime_sha256: MIME_SHA256,
    original_receipt_id: RECEIPT_ID,
    matter_id: MATTER_A,
    actor_id: ORIGINAL_ACTOR_ID,
    occurred_at: ORIGINAL_OCCURRED_AT,
    ...overrides,
  });
}

export function seedOriginalFiling(repository, overrides = {}) {
  const original = originalFiling(overrides);
  const versionId = overrides.version_id ?? VERSION_ID;
  const fileObjectId = overrides.file_object_id ?? FILE_OBJECT_ID;
  repository.transaction((tx) => {
    tx.create({
      model_type: "DmsEmailThread",
      tenant_id: original.tenant_id,
      matter_id: original.matter_id,
      email_thread_id: original.email_thread_id,
      subject: "OUTM-20 원본 이메일",
      status: "active",
      permission_envelope_id: "perm:outm20",
      audit_trace_id: "audit:outm20",
      filing_user: original.actor_id,
      filing_time: original.occurred_at,
      filing_mode: "manual",
      filed_document_ids: [original.document_id],
    });
    tx.create({
      model_type: "DmsDocument",
      tenant_id: original.tenant_id,
      matter_id: original.matter_id,
      document_id: original.document_id,
      workspace_id: `workspace:${original.matter_id}`,
      folder_id: `folder:${original.matter_id}:00_Email`,
      title: "OUTM-20 원본 이메일.eml",
      status: "active",
      current_version_id: versionId,
      permission_envelope_id: "perm:outm20",
      audit_trace_id: "audit:outm20",
      mime_type: "message/rfc822",
      source_email_thread_id: original.email_thread_id,
      latest_sha256: original.mime_sha256,
    });
    tx.create({
      model_type: "DmsDocumentVersion",
      tenant_id: original.tenant_id,
      matter_id: original.matter_id,
      version_id: versionId,
      document_id: original.document_id,
      version_number: 1,
      status: "current",
      file_object_id: fileObjectId,
      created_by: original.actor_id,
      created_at: original.occurred_at,
      hash_algorithm: "sha256",
      sha256: original.mime_sha256,
      persisted: true,
      permission_envelope_id: "perm:outm20",
      audit_trace_id: "audit:outm20",
    });
    tx.create({
      model_type: "DmsFileObject",
      tenant_id: original.tenant_id,
      matter_id: original.matter_id,
      file_object_id: fileObjectId,
      storage_pointer_ref: `vault:${fileObjectId}`,
      sha256: original.mime_sha256,
      byte_size: 1_024,
      mime_type: "message/rfc822",
      permission_envelope_id: "perm:outm20",
      audit_trace_id: "audit:outm20",
    });
    tx.appendAudit({
      event_id: original.original_receipt_id,
      tenant_id: original.tenant_id,
      actor_id: original.actor_id,
      action: "dms.email.thread.file",
      object_type: "DmsEmailThread",
      object_id: original.email_thread_id,
      decision: "allow",
      reason: "email_thread_filed_to_matter",
      occurred_at: original.occurred_at,
      metadata: {
        matter_id: original.matter_id,
        document_id: original.document_id,
        mime_sha256: original.mime_sha256,
      },
    });
  });
  return original;
}

export function createOriginalFilingRepository(options = {}) {
  const repository = createDmsRepository(options);
  seedOriginalFiling(repository);
  return repository;
}

export function correctionInput(overrides = {}) {
  return {
    session: SESSION,
    email_thread_id: THREAD_ID,
    target_matter_id: MATTER_B,
    reason: "담당 Matter 정정",
    idempotency_key: "outm20-correction-a-to-b",
    prior_placement_id: null,
    ...overrides,
  };
}

export function serviceDependencies(overrides = {}) {
  return {
    resolve_principal: ({ session }) => session === SESSION
      ? { tenant_id: TENANT_ID, actor_id: CORRECTION_ACTOR_ID }
      : null,
    authorize_matter: () => true,
    ...overrides,
  };
}
