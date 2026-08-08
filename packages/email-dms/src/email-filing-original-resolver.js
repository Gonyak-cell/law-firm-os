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

function assertDependencies(repository, documentStateReader) {
  for (const method of ["get", "getIdempotency", "listAudit"]) {
    if (typeof repository?.[method] !== "function") {
      throw new TypeError(`original filing repository.${method} is required`);
    }
  }
  if (
    documentStateReader != null
    && typeof documentStateReader?.getDocumentState !== "function"
  ) {
    throw new TypeError("original filing document_state_reader.getDocumentState is required");
  }
}

function filingReceiptKey(thread, sha256) {
  return `outlook-email-file:${thread.email_thread_id}:${sha256}:dms`;
}

function exactFilingReceipt(receipt, thread, documentId, sha256) {
  return receipt?.tenant_id === thread.tenant_id
    && receipt.idempotency_key === filingReceiptKey(thread, sha256)
    && (
      receipt.operation === "outlook_email_file"
      || /^request-hash:[a-f0-9]{64}$/u.test(receipt.operation ?? "")
    )
    && receipt.created_at === thread.filing_time
    && receipt.response?.email_thread_id === thread.email_thread_id
    && receipt.response?.matter_id === thread.matter_id
    && Array.isArray(receipt.response?.filed_document_ids)
    && receipt.response.filed_document_ids.length === 1
    && receipt.response.filed_document_ids[0] === documentId;
}

function exactAuditReceipt(receipt, thread, documentId, sha256) {
  const common = receipt?.tenant_id === thread.tenant_id
    && receipt.actor_id === thread.filing_user
    && receipt.action === "dms.email.thread.file"
    && receipt.object_type === "DmsEmailThread"
    && receipt.object_id === thread.email_thread_id;
  const rich = receipt?.decision !== undefined
    || receipt?.reason !== undefined
    || receipt?.occurred_at !== undefined
    || receipt?.metadata !== undefined;
  const optionalMetadataMatches = (
    (receipt?.metadata?.matter_id === undefined
      || receipt.metadata.matter_id === thread.matter_id)
    && (receipt?.metadata?.document_id === undefined
      || receipt.metadata.document_id === documentId)
    && (receipt?.metadata?.mime_sha256 === undefined
      || receipt.metadata.mime_sha256 === sha256)
  );
  return common && (rich ? (
    receipt.decision === "allow"
      && receipt.reason === "email_thread_filed_to_matter"
      && receipt.occurred_at === thread.filing_time
      && optionalMetadataMatches
  ) : (
    receipt.payload?.source_payload_included === false
      && /^[a-f0-9]{64}$/u.test(receipt.payload?.imported_event_hash ?? "")
  ));
}

async function localDocumentState(repository, tenantId, documentId) {
  const document = await repository.get({
    tenant_id: tenantId,
    model_type: "DmsDocument",
    document_id: documentId,
  });
  if (!document) return null;
  const version = await repository.get({
    tenant_id: tenantId,
    model_type: "DmsDocumentVersion",
    version_id: document.current_version_id,
  });
  const fileObject = version && await repository.get({
    tenant_id: tenantId,
    model_type: "DmsFileObject",
    file_object_id: version.file_object_id,
  });
  return {
    document,
    versions: version ? [version] : [],
    file_objects: fileObject ? [fileObject] : [],
  };
}

function exactDocumentBinding(state, thread, documentId, { specialized }) {
  const document = requireRecord(state?.document);
  const versionId = requiredString(document, "current_version_id");
  const version = requireRecord(state?.versions?.find((entry) => (
    entry.version_id === versionId
  )) ?? state?.version);
  const fileObject = requireRecord(state?.file_objects?.find((entry) => (
    entry.file_object_id === version.file_object_id
  )) ?? state?.file_object);
  const mimeType = fileObject.mime_type ?? fileObject.content_type;
  if (
    document.tenant_id !== thread.tenant_id
    || document.matter_id !== thread.matter_id
    || document.document_id !== documentId
    || document.status !== "active"
    || (document.source_email_thread_id !== undefined
      && document.source_email_thread_id !== thread.email_thread_id)
    || (document.mime_type !== undefined && document.mime_type !== "message/rfc822")
    || version.tenant_id !== thread.tenant_id
    || version.version_id !== versionId
    || version.document_id !== documentId
    || version.file_object_id !== fileObject.file_object_id
    || (version.matter_id !== undefined && version.matter_id !== thread.matter_id)
    || (version.status !== undefined && version.status !== "current")
    || (version.hash_algorithm !== undefined && version.hash_algorithm !== "sha256")
    || (version.persisted !== undefined && version.persisted !== true)
    || fileObject.tenant_id !== thread.tenant_id
    || (fileObject.matter_id !== undefined && fileObject.matter_id !== thread.matter_id)
    || fileObject.sha256 !== version.sha256
    || mimeType !== "message/rfc822"
    || (specialized && fileObject.status !== "committed")
    || (document.latest_sha256 !== undefined && document.latest_sha256 !== version.sha256)
  ) throw originalConflict();
  return Object.freeze({ document, version, file_object: fileObject });
}

function bindingKey(tenantId, emailThreadId) {
  return `${tenantId}\u001f${emailThreadId}`;
}

export function createEmailFilingOriginalResolver({
  repository,
  document_state_reader: documentStateReader = null,
} = {}) {
  assertDependencies(repository, documentStateReader);
  const bindings = new Map();
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
      ) throw originalConflict();
      const documentId = requiredString({ document_id: thread.filed_document_ids[0] }, "document_id");
      const state = documentStateReader
        ? await documentStateReader.getDocumentState({
          tenant_id: tenantId,
          document_id: documentId,
        })
        : await localDocumentState(repository, tenantId, documentId);
      const { version, file_object: fileObject } = exactDocumentBinding(
        state,
        thread,
        documentId,
        { specialized: documentStateReader != null },
      );
      const receipts = (await repository.listAudit({
        tenant_id: tenantId,
        object_id: emailThreadId,
      })).filter((event) => event.action === "dms.email.thread.file");
      const filingReceipt = await repository.getIdempotency({
        tenant_id: tenantId,
        idempotency_key: filingReceiptKey(thread, version.sha256),
      });
      if (
        receipts.length !== 1
        || !exactAuditReceipt(receipts[0], thread, documentId, version.sha256)
        || !exactFilingReceipt(filingReceipt, thread, documentId, version.sha256)
        || version.created_by !== thread.filing_user
      ) throw originalConflict();
      const original = normalizeOriginalEmailFiling({
        tenant_id: tenantId,
        email_thread_id: emailThreadId,
        document_id: documentId,
        mime_sha256: version.sha256,
        original_receipt_id: receipts[0].event_id,
        matter_id: thread.matter_id,
        actor_id: thread.filing_user,
        occurred_at: thread.filing_time,
      });
      bindings.set(bindingKey(tenantId, emailThreadId), Object.freeze({
        tenant_id: tenantId,
        email_thread_id: emailThreadId,
        original_receipt_id: original.original_receipt_id,
        original_matter_id: original.matter_id,
        document_id: documentId,
        document_version_id: version.version_id,
        file_object_id: fileObject.file_object_id,
        mime_sha256: version.sha256,
      }));
      return original;
    },
    getDocumentBinding(input = {}) {
      const tenantId = requiredString(input, "tenant_id");
      const emailThreadId = requiredString(input, "email_thread_id");
      const binding = bindings.get(bindingKey(tenantId, emailThreadId));
      if (
        !binding
        || input.document_id !== binding.document_id
        || input.mime_sha256 !== binding.mime_sha256
        || input.original_receipt_id !== binding.original_receipt_id
      ) throw originalConflict();
      return binding;
    },
  });
}
