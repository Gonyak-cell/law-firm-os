import { normalizeOriginalEmailFiling } from "./email-filing-correction-model.js";

function codedError(code, message, status = 409) {
  return Object.assign(new Error(message), {
    code,
    safe_error_code: code,
    status,
  });
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw codedError("EMAIL_FILING_CORRECTION_ORIGINAL_NOT_FOUND", "original filing was not found", 404);
  }
  return value.trim();
}

function originalConflict() {
  return codedError(
    "EMAIL_FILING_CORRECTION_ORIGINAL_CONFLICT",
    "persisted original filing records conflict",
  );
}

function requireRecord(record) {
  if (!record) {
    throw codedError("EMAIL_FILING_CORRECTION_ORIGINAL_NOT_FOUND", "original filing was not found", 404);
  }
  return record;
}

function assertRepository(repository) {
  for (const method of ["get", "listAudit"]) {
    if (typeof repository?.[method] !== "function") {
      throw new TypeError(`original filing repository.${method} is required`);
    }
  }
}

function sameIdentity(record, expected) {
  return record.tenant_id === expected.tenant_id && record.matter_id === expected.matter_id;
}

export function createEmailFilingOriginalResolver({ repository } = {}) {
  assertRepository(repository);
  return Object.freeze({
    async resolve(input = {}) {
      const tenantId = requiredString(input, "tenant_id");
      const emailThreadId = requiredString(input, "email_thread_id");
      const thread = requireRecord(await repository.get({
        tenant_id: tenantId,
        model_type: "DmsEmailThread",
        email_thread_id: emailThreadId,
      }));
      if (
        thread.status !== "active"
        || thread.tenant_id !== tenantId
        || thread.email_thread_id !== emailThreadId
        || !Array.isArray(thread.filed_document_ids)
        || thread.filed_document_ids.length !== 1
      ) {
        throw originalConflict();
      }
      const documentId = requiredString({ document_id: thread.filed_document_ids[0] }, "document_id");
      const document = requireRecord(await repository.get({
        tenant_id: tenantId,
        model_type: "DmsDocument",
        document_id: documentId,
      }));
      if (
        !sameIdentity(document, thread)
        || document.status !== "active"
        || document.document_id !== documentId
        || document.source_email_thread_id !== emailThreadId
        || document.mime_type !== "message/rfc822"
      ) {
        throw originalConflict();
      }
      const versionId = requiredString(document, "current_version_id");
      const version = requireRecord(await repository.get({
        tenant_id: tenantId,
        model_type: "DmsDocumentVersion",
        version_id: versionId,
      }));
      if (
        !sameIdentity(version, thread)
        || version.document_id !== documentId
        || version.status !== "current"
        || version.hash_algorithm !== "sha256"
        || version.persisted !== true
        || version.sha256 !== document.latest_sha256
      ) {
        throw originalConflict();
      }
      const fileObject = requireRecord(await repository.get({
        tenant_id: tenantId,
        model_type: "DmsFileObject",
        file_object_id: requiredString(version, "file_object_id"),
      }));
      if (
        !sameIdentity(fileObject, thread)
        || fileObject.sha256 !== version.sha256
        || fileObject.mime_type !== "message/rfc822"
      ) {
        throw originalConflict();
      }
      const receipts = (await repository.listAudit({
        tenant_id: tenantId,
        object_id: emailThreadId,
      })).filter((event) => (
        event.action === "dms.email.thread.file"
        && event.object_type === "DmsEmailThread"
        && event.decision === "allow"
        && event.reason === "email_thread_filed_to_matter"
      ));
      if (
        receipts.length !== 1
        || receipts[0].actor_id !== thread.filing_user
        || receipts[0].occurred_at !== thread.filing_time
        || version.created_by !== thread.filing_user
      ) {
        throw originalConflict();
      }
      return normalizeOriginalEmailFiling({
        tenant_id: tenantId,
        email_thread_id: emailThreadId,
        document_id: documentId,
        mime_sha256: version.sha256,
        original_receipt_id: receipts[0].event_id,
        matter_id: thread.matter_id,
        actor_id: thread.filing_user,
        occurred_at: thread.filing_time,
      });
    },
  });
}
