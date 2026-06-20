import { randomUUID } from "node:crypto";

export const MASTER_DATA_AUDIT_SOURCE = "master-data-runtime";

export function appendMasterDataAuditEvent(
  audit,
  { tenant_id, actor_id, action, object_type, object_id, decision = "allow", reason, metadata = {} } = {},
) {
  if (!audit || typeof audit.append !== "function") throw new TypeError("audit store with append is required");
  for (const [field, value] of Object.entries({ tenant_id, actor_id, action, object_type, object_id, decision, reason })) {
    if (typeof value !== "string" || value.trim() === "") throw new TypeError(`Master Data audit ${field} is required`);
  }
  return audit.append({
    event_id: `master_data_evt_${randomUUID()}`,
    tenant_id,
    actor_id,
    action,
    object_type,
    object_id,
    decision,
    reason,
    source: MASTER_DATA_AUDIT_SOURCE,
    metadata,
  });
}
