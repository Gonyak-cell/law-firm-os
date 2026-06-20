import { createDmsFolder, createDmsWorkspace } from "./model.js";
import { appendDmsAuditEvent } from "./audit.js";

export function createWorkspaceForMatter({ repository, matter, actor_id, audit_trace_id, permission_envelope_id } = {}) {
  if (!matter?.tenant_id) throw new TypeError("matter.tenant_id is required");
  if (!matter?.matter_id) throw new TypeError("matter.matter_id is required");
  const workspace = createDmsWorkspace({
    workspace_id: `workspace:${matter.matter_id}`,
    tenant_id: matter.tenant_id,
    matter_id: matter.matter_id,
    name: matter.title ?? matter.matter_id,
    status: "active",
    permission_envelope_id: permission_envelope_id ?? matter.permission_envelope_id ?? "perm:dms:workspace",
    audit_trace_id: audit_trace_id ?? matter.audit_trace_id ?? "audit:dms:workspace",
  });
  const persisted = repository.create({ ...workspace, model_type: "DmsWorkspace" });
  const root = repository.create({
    ...createDmsFolder({
      folder_id: workspace.root_folder_id,
      tenant_id: matter.tenant_id,
      matter_id: matter.matter_id,
      workspace_id: workspace.workspace_id,
      name: "Root",
      status: "active",
      permission_envelope_id: workspace.permission_envelope_id,
      audit_trace_id: workspace.audit_trace_id,
    }),
    model_type: "DmsFolder",
  });
  appendDmsAuditEvent({
    repository,
    event: {
      event_id: `dms.workspace.create:${persisted.workspace_id}`,
      tenant_id: persisted.tenant_id,
      actor_id: actor_id ?? "system",
      action: "dms.workspace.create",
      object_type: "DmsWorkspace",
      object_id: persisted.workspace_id,
      decision: "allow",
      reason: "matter_workspace_created",
      after: { workspace_id: persisted.workspace_id, root_folder_id: root.folder_id },
    },
  });
  return Object.freeze({ workspace: persisted, root_folder: root });
}
