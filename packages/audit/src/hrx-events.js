export const HRX_AUDIT_EVENT_SCHEMA_VERSION = "law-firm-os.hrx-audit-event.v0.1";

export const HRX_AUDIT_DECISIONS = Object.freeze(["allow", "deny", "review_required", "approval_required"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new TypeError(`${field} must be a string`);
  return value.trim();
}

export function createHrxAuditEvent(input = {}) {
  const decision = requiredString(input, "decision");
  if (!HRX_AUDIT_DECISIONS.includes(decision)) {
    throw new TypeError(`decision must be one of ${HRX_AUDIT_DECISIONS.join(", ")}`);
  }
  return Object.freeze({
    schema_version: HRX_AUDIT_EVENT_SCHEMA_VERSION,
    event_id: requiredString(input, "event_id"),
    tenant_id: requiredString(input, "tenant_id"),
    actor_id: requiredString(input, "actor_id"),
    action: requiredString(input, "action"),
    object_type: requiredString(input, "object_type"),
    object_id: requiredString(input, "object_id"),
    decision,
    reason: requiredString(input, "reason"),
    source: optionalString(input, "source") ?? "hrx",
    occurred_at: optionalString(input, "occurred_at") ?? new Date().toISOString(),
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}
