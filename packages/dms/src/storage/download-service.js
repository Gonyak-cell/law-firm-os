import { appendDmsAuditEvent } from '../audit.js';
import { serializeFileObjectSafe } from '../file-object-service.js';

export function downloadFileObjectWithAudit({ repository, storage, tenant_id, file_object_id, actor_id, permission_decision_id } = {}) {
  if (!permission_decision_id) throw new Error('permission decision required before download');
  const fileObject = repository.get({ tenant_id, model_type: 'DmsFileObject', file_object_id });
  if (!fileObject) throw new Error('file object not found');
  const object = storage.getObject({ object_id: fileObject.vault_object_id ?? fileObject.storage_pointer_ref });
  const audit_event = appendDmsAuditEvent({
    repository,
    event: {
      event_id: 'dms.document.download:' + tenant_id + ':' + file_object_id,
      tenant_id,
      actor_id,
      action: 'document.downloaded',
      object_type: 'DmsFileObject',
      object_id: file_object_id,
      decision: 'allow',
      reason: 'permission_decision_before_bytes',
    },
  });
  return Object.freeze({ file_object: serializeFileObjectSafe(fileObject), sha256: object.sha256, audit_event, document_bytes_returned_to_matter: false });
}
