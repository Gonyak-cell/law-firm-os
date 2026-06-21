export function applyLifecycleFields(input = {}, { now = new Date(0).toISOString() } = {}) {
  const status = input.status ?? "active";
  const record = {
    ...input,
    status,
    retention_class: input.retention_class ?? "standard",
    created_at: input.created_at ?? now,
    updated_at: input.updated_at ?? now
  };
  if (status === "archived") record.archived_at = input.archived_at ?? now;
  if (status === "deleted") record.deleted_at = input.deleted_at ?? now;
  return Object.freeze(record);
}

export function isVisibleLifecycleRecord(record = {}, { includeDeleted = false, includeArchived = true } = {}) {
  if (!includeDeleted && record.status === "deleted") return false;
  if (!includeArchived && record.status === "archived") return false;
  return true;
}

export function markLifecycleDeleted(record = {}, { now = new Date(0).toISOString() } = {}) {
  return applyLifecycleFields({ ...record, status: "deleted", deleted_at: now, updated_at: now }, { now });
}

export function markLifecycleArchived(record = {}, { now = new Date(0).toISOString() } = {}) {
  return applyLifecycleFields({ ...record, status: "archived", archived_at: now, updated_at: now }, { now });
}
