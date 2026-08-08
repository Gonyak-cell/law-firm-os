const DIGEST = /^[a-f0-9]{64}$/u;

export function auditList(repository, tenantId, objectId) {
  return typeof repository.listAudit === "function"
    ? repository.listAudit({ tenant_id: tenantId, object_id: objectId })
    : [];
}

export function hasAudit(events, { action, objectType, objectId }) {
  return events.some((event) => (
    (event.action === action
      || event.event_type === action
      || (action === "dms.document.upload" && event.event_type === "dms.document.metadata_committed"))
    && event.object_type === objectType
    && event.object_id === objectId
    && (event.decision == null || event.decision === "allow")
    && (event.status == null || ["allow", "allowed", "active", "committed", "success", "succeeded"].includes(event.status))
  ));
}

export function idempotency(repository, tenantId, key, predicate = () => true) {
  if (typeof repository.getIdempotency !== "function") return false;
  const entry = repository.getIdempotency({ tenant_id: tenantId, idempotency_key: key });
  return Boolean(entry && predicate(entry));
}

async function authorityDocumentState({ repository, authority, tenantId, documentId }) {
  if (typeof authority?.getDocumentState === "function") {
    try {
      return await authority.getDocumentState({ tenant_id: tenantId, document_id: documentId });
    } catch {
      return null;
    }
  }
  const document = repository.get({ tenant_id: tenantId, model_type: "DmsDocument", document_id: documentId });
  if (!document) return null;
  const version = repository.get({
    tenant_id: tenantId,
    model_type: "DmsDocumentVersion",
    version_id: document.current_version_id,
  });
  const fileObject = version?.file_object_id
    ? repository.get({ tenant_id: tenantId, model_type: "DmsFileObject", file_object_id: version.file_object_id })
    : null;
  return { document, versions: version ? [version] : [], file_objects: fileObject ? [fileObject] : [], audit_events: auditList(repository, tenantId, documentId) };
}

export async function resolveVerifiedDocument({ repository, authority, tenantId, matterId, documentId, threadId, attachmentId } = {}) {
  const state = await authorityDocumentState({ repository, authority, tenantId, documentId });
  const document = state?.document;
  const version = state?.versions?.find((entry) => entry.version_id === document?.current_version_id);
  const fileObject = state?.file_objects?.find((entry) => entry.file_object_id === version?.file_object_id);
  const digest = document?.latest_sha256 ?? version?.sha256;
  if (
    !document
    || document.tenant_id !== tenantId
    || document.matter_id !== matterId
    || document.status !== "active"
    || (document.source_email_thread_id && document.source_email_thread_id !== threadId)
    || (attachmentId && document.source_attachment_id && document.source_attachment_id !== attachmentId)
    || !version
    || version.document_id !== document.document_id
    || version.tenant_id !== tenantId
    || (version.matter_id && version.matter_id !== matterId)
    || (version.status && !["current", "active"].includes(version.status))
    || version.persisted === false
    || !fileObject
    || (fileObject.tenant_id && fileObject.tenant_id !== tenantId)
    || (fileObject.matter_id && fileObject.matter_id !== matterId)
    || !DIGEST.test(digest ?? "")
    || version.sha256 !== digest
    || fileObject.sha256 !== digest
    || (fileObject.status && !["committed", "active"].includes(fileObject.status))
  ) return null;
  return Object.freeze({
    document,
    version,
    fileObject,
    auditEvents: state.audit_events ?? auditList(repository, tenantId, document.document_id),
  });
}
