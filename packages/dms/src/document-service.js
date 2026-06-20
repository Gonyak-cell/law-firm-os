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

export function uploadDocument({
  repository,
  storage,
  document,
  bytes,
  actor_id,
  idempotency_key,
} = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  assertStorageAdapter(storage);
  const replay = repository.getIdempotency({ tenant_id: document?.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const version_id = document.current_version_id ?? `version:${document.document_id}:1`;
    const object_id = createVaultObjectId({
      tenant_id: document.tenant_id,
      matter_id: document.matter_id,
      document_id: document.document_id,
      version_id,
    });
    const receipt = storage.putObject({
      object_id,
      bytes,
      content_type: document.mime_type ?? "application/octet-stream",
    });
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
    const persisted = tx.create({
      ...createDmsDocument({
        ...document,
        status: document.status ?? "active",
        current_version_id: version.version_id,
      }),
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
  });
}
