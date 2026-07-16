import { createMatterCoreRecord } from "./model.js";

const PRIMARY_ID_FIELDS = Object.freeze({
  MatterClient: "client_id",
  Matter: "matter_id",
  MatterMember: "member_id",
  MatterTask: "task_id",
  MatterCalendarEvent: "event_id",
  MatterChecklist: "checklist_id",
  MatterWorktree: "worktree_id",
  MatterWorktreeNode: "node_id",
  MatterWorktreeTemplate: "template_id",
  MatterWorktreeTemplateNode: "template_node_id",
});

export function primaryIdOf(record) {
  const field = PRIMARY_ID_FIELDS[record.model_type];
  return field ? record[field] : record.resource_id ?? record.id;
}

export function normalizeRepositoryRecord(input = {}) {
  if (typeof input.model_type !== "string" || input.model_type.trim() === "") {
    throw new TypeError("model_type is required");
  }
  const record = PRIMARY_ID_FIELDS[input.model_type]
    ? { ...input, ...createMatterCoreRecord(input.model_type, input) }
    : { ...input };
  if (typeof record.tenant_id !== "string" || record.tenant_id.trim() === "") {
    throw new TypeError("tenant_id is required");
  }
  const resourceId = primaryIdOf(record);
  if (typeof resourceId !== "string" || resourceId.trim() === "") {
    throw new TypeError(`${record.model_type} resource id is required`);
  }
  return Object.freeze({
    ...record,
    resource_id: resourceId,
    writes_product_state: true,
    creates_database_rows: record.creates_database_rows ?? true,
  });
}

export function repositoryRecordKey(record) {
  return `${record.tenant_id}:${record.model_type}:${primaryIdOf(record)}`;
}

export function repositoryRefKey(ref = {}) {
  const field = PRIMARY_ID_FIELDS[ref.model_type];
  const id = ref.id ?? ref.resource_id ?? (field ? ref[field] : undefined);
  return `${ref.tenant_id}:${ref.model_type}:${id}`;
}
