import { createDmsDocument, createDmsDocumentVersion } from "./model.js";
import { appendDmsAuditEvent } from "./audit.js";
import { assertStorageAdapter } from "./storage/storage-adapter.js";
import { createFileObjectRecord } from "./file-object-service.js";
import { createVaultObjectId } from "./vault-object.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function errorCode(error, fallback) {
  const code = error?.safe_error_code ?? error?.code;
  return typeof code === "string" && /^[A-Z0-9_]+$/u.test(code) ? code : fallback;
}

function annotateError(error, fields) {
  try {
    Object.assign(error, fields);
    return error;
  } catch {
    return Object.assign(new Error(error?.message ?? "DMS upload failed"), {
      code: error?.code,
      safe_error_code: error?.safe_error_code,
      status: error?.status,
      ...fields,
    });
  }
}

export function uploadDocument({
  repository,
  storage,
  document,
  bytes,
  actor_id,
  idempotency_key,
  beforePersist,
} = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  assertStorageAdapter(storage);
  if (typeof beforePersist === "function" && typeof storage.quarantineCommittedObject !== "function") {
    throw new TypeError("storage adapter missing quarantineCommittedObject for guarded upload");
  }
  if (typeof beforePersist === "function" && typeof storage.recordCommittedObjectQuarantine !== "function") {
    throw new TypeError("storage adapter missing durable quarantine record for guarded upload");
  }
  const replay = repository.getIdempotency({ tenant_id: document?.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    let receipt;
    try {
      if (typeof beforePersist === "function") {
        const result = beforePersist({ phase: "before_storage", document, bytes, actor_id, idempotency_key });
        if (result && typeof result.then === "function") throw new TypeError("DMS beforePersist callback must be synchronous");
      }
      const version_id = document.current_version_id ?? `version:${document.document_id}:1`;
      const object_id = createVaultObjectId({
        tenant_id: document.tenant_id,
        matter_id: document.matter_id,
        document_id: document.document_id,
        version_id,
      });
      receipt = storage.putObject({
        tenant_id: document.tenant_id,
        object_id,
        bytes,
        content_type: document.mime_type ?? "application/octet-stream",
      });
      if (typeof beforePersist === "function") {
        const result = beforePersist({ phase: "after_storage", document, bytes, actor_id, idempotency_key, receipt });
        if (result && typeof result.then === "function") throw new TypeError("DMS beforePersist callback must be synchronous");
      }
      const fileObject = tx.create({
        ...createFileObjectRecord({
          file_object_id: `file:${version_id}`,
          tenant_id: document.tenant_id,
          matter_id: document.matter_id,
          storage_pointer_ref: receipt.storage_pointer_ref,
          sha256: receipt.sha256,
          byte_size: receipt.byte_size,
          mime_type: receipt.mime_type,
          permission_envelope_id: document.permission_envelope_id,
          audit_trace_id: document.audit_trace_id,
        }),
        model_type: "DmsFileObject",
        vault_object_id: object_id,
      });
      const version = tx.create({
        ...createDmsDocumentVersion({
          version_id,
          document_id: document.document_id,
          tenant_id: document.tenant_id,
          matter_id: document.matter_id,
          version_number: 1,
          status: "current",
          file_object_id: fileObject.file_object_id,
          created_by: actor_id,
          sha256: receipt.sha256,
          permission_envelope_id: document.permission_envelope_id,
          audit_trace_id: document.audit_trace_id,
        }),
        model_type: "DmsDocumentVersion",
        sha256: receipt.sha256,
        persisted: true,
      });
      const persistedDocument = createDmsDocument({
        ...document,
        status: document.status ?? "active",
        current_version_id: version.version_id,
      });
      const persisted = tx.create({
        ...document,
        ...persistedDocument,
        owner_user_id: document.owner_user_id ?? actor_id,
        registered_account_email: document.registered_account_email ?? null,
        registered_account: document.registered_account ?? null,
        account_linkage: document.account_linkage ?? null,
        model_type: "DmsDocument",
        latest_sha256: receipt.sha256,
      });
      const audit = appendDmsAuditEvent({
        repository: tx,
        event: {
          event_id: `dms.document.upload:${persisted.document_id}`,
          tenant_id: persisted.tenant_id,
          actor_id,
          action: "dms.document.upload",
          object_type: "DmsDocument",
          object_id: persisted.document_id,
          decision: "allow",
          reason: "document_uploaded_to_vault",
          after: { document_id: persisted.document_id, version_id: version.version_id },
        },
      });
      const response = Object.freeze({
        outcome: "created",
        document: persisted,
        version,
        file_object: fileObject,
        storage_receipt: receipt,
        audit_event: audit,
        idempotent_replay: false,
      });
      tx.recordIdempotency({
        tenant_id: persisted.tenant_id,
        idempotency_key,
        operation: "dms_document_upload",
        response,
      });
      return response;
    } catch (error) {
      if (!receipt) throw error;
      let cleanupState = "pending";
      let cleanupErrorCode = null;
      let cleanupRecordRef = null;
      try {
        const deletion = typeof storage.deleteCommittedObject === "function"
          ? storage.deleteCommittedObject({ tenant_id: document.tenant_id, object_id: receipt.object_id, expected_sha256: receipt.sha256 })
          : null;
        if (deletion && typeof deletion.then === "function") throw new TypeError("storage cleanup must be synchronous");
        if (deletion?.deleted === true || deletion?.already_absent === true) cleanupState = "deleted";
        else throw Object.assign(new Error("committed object cleanup was not confirmed"), { safe_error_code: "DMS_COMMITTED_DELETE_UNCONFIRMED" });
      } catch (deleteError) {
        cleanupErrorCode = errorCode(deleteError, "DMS_COMMITTED_DELETE_FAILED");
        // A failed delete cannot be treated as harmless: move the object out
        // of the readable namespace before returning the authority error.
        try {
          const quarantine = storage.quarantineCommittedObject({ tenant_id: document.tenant_id, object_id: receipt.object_id, expected_sha256: receipt.sha256, reason: cleanupErrorCode });
          if (quarantine && typeof quarantine.then === "function") throw new TypeError("storage quarantine must be synchronous");
          if (quarantine?.quarantined === true || quarantine?.already_absent === true) {
            cleanupState = "quarantined";
            cleanupRecordRef = quarantine?.record_ref ?? null;
          }
          else throw Object.assign(new Error("committed object quarantine was not confirmed"), { safe_error_code: "DMS_COMMITTED_QUARANTINE_UNCONFIRMED" });
        } catch (quarantineError) {
          cleanupErrorCode = errorCode(quarantineError, cleanupErrorCode ?? "DMS_COMMITTED_QUARANTINE_FAILED");
          try {
            const durable = storage.recordCommittedObjectQuarantine({
              tenant_id: document.tenant_id,
              object_id: receipt.object_id,
              expected_sha256: receipt.sha256,
              reason: cleanupErrorCode,
              permission_envelope_id: document.permission_envelope_id,
              audit_trace_id: document.audit_trace_id,
            });
            if (durable?.durable_quarantine === true && typeof durable.record_ref === "string") {
              cleanupState = "durably_quarantined";
              cleanupRecordRef = durable.record_ref;
            } else {
              throw Object.assign(new Error("durable committed object quarantine was not confirmed"), { safe_error_code: "DMS_COMMITTED_QUARANTINE_RECORD_UNCONFIRMED" });
            }
          } catch (durableError) {
            cleanupErrorCode = errorCode(durableError, cleanupErrorCode ?? "DMS_COMMITTED_QUARANTINE_RECORD_FAILED");
          }
        }
      }
      throw annotateError(error, { cleanup_state: cleanupState, cleanup_error_code: cleanupErrorCode, cleanup_record_ref: cleanupRecordRef });
    }
  });
}
