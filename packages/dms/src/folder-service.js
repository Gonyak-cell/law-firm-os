import { createDmsFolder } from "./model.js";
import { appendDmsAuditEvent } from "./audit.js";

export function createFolder({ repository, folder, actor_id } = {}) {
  if (!folder?.workspace_id) throw new TypeError("workspace_id is required");
  if (folder.name?.includes("..")) throw new Error("folder path traversal is blocked");
  const record = createDmsFolder({ ...folder, status: folder.status ?? "active" });
  const persisted = repository.create({ ...record, model_type: "DmsFolder" });
  appendDmsAuditEvent({
    repository,
    event: {
      event_id: `dms.folder.create:${persisted.folder_id}`,
      tenant_id: persisted.tenant_id,
      actor_id: actor_id ?? "system",
      action: "dms.folder.create",
      object_type: "DmsFolder",
      object_id: persisted.folder_id,
      decision: "allow",
      reason: "folder_created",
    },
  });
  return persisted;
}
