import { appendDmsAuditEvent } from "../audit.js";
import { serializeFileObjectSafe } from "../file-object-service.js";

export function downloadFileObjectWithAudit({ repository, storage, tenant_id, file_object_id, actor_id, permission_decision_id } = {}) {
  if (!permission_decision_id) throw new Error("permission decision required before download");
  const fileObject = repository.get({ tenant_id, model_type: "DmsFileObject", file_object_id });
  if (!fileObject) throw new Error("file object not found");
  const object = storage.getObject({ object_id: fileObject.vault_object_id ?? fileObject.storage_pointer_ref });
  if (fileObject.sha256 && object.sha256 !== fileObject.sha256) throw new Error("file object hash mismatch");
  const audit_event = appendDmsAuditEvent({
    repository,
    event: {
      event_id: `dms.document.download:${tenant_id}:${file_object_id}:${permission_decision_id}`,
      tenant_id,
      actor_id,
      action: "dms.document.download",
      object_type: "DmsFileObject",
      object_id: file_object_id,
      decision: "allow",
      reason: "permission_decision_before_bytes",
      after: { file_object_id, sha256: object.sha256 },
      metadata: {
        permission_decision_id,
        byte_size: object.byte_size ?? fileObject.byte_size,
        mime_type: object.mime_type ?? fileObject.mime_type,
        raw_path_exposed: false,
        storage_pointer_ref_included: false,
      },
    },
  });
  return Object.freeze({
    file_object: serializeFileObjectSafe(fileObject),
    bytes: Buffer.from(object.bytes),
    sha256: object.sha256,
    byte_size: object.byte_size ?? fileObject.byte_size,
    mime_type: object.mime_type ?? fileObject.mime_type,
    audit_event,
    raw_path_exposed: false,
    storage_pointer_ref_included: false,
  });
}
