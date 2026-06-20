import { createDmsDocumentVersion } from "./model.js";
import { appendDmsAuditEvent } from "./audit.js";

export function assertVersionImmutable(version = {}) {
  if (["current", "superseded", "locked", "held"].includes(version.status) && version.persisted === true) {
    throw new Error("DocumentVersion is immutable after persistence");
  }
}

export function createDocumentVersion({ repository, version, actor_id } = {}) {
  const record = createDmsDocumentVersion({ ...version, status: version.status ?? "current" });
  const persisted = repository.create({ ...record, model_type: "DmsDocumentVersion", persisted: true });
  appendDmsAuditEvent({
    repository,
    event: {
      event_id: `dms.version.create:${persisted.version_id}`,
      tenant_id: persisted.tenant_id,
      actor_id: actor_id ?? persisted.created_by,
      action: "dms.version.create",
      object_type: "DmsDocumentVersion",
      object_id: persisted.version_id,
      decision: "allow",
      reason: "version_created",
      after: { version_number: persisted.version_number },
    },
  });
  return persisted;
}
