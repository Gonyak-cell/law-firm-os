import { createHash } from "node:crypto";

const DECISIONS = Object.freeze(["allow", "deny", "review_required", "blocked"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createDmsAuditEvent(input = {}) {
  const decision = requiredString(input, "decision");
  if (!DECISIONS.includes(decision)) throw new TypeError(`decision must be one of ${DECISIONS.join(", ")}`);
  const event = {
    event_id: requiredString(input, "event_id"),
    tenant_id: requiredString(input, "tenant_id"),
    actor_id: requiredString(input, "actor_id"),
    action: requiredString(input, "action"),
    object_type: requiredString(input, "object_type"),
    object_id: requiredString(input, "object_id"),
    decision,
    reason: requiredString(input, "reason"),
    occurred_at: input.occurred_at ?? new Date().toISOString(),
    before: Object.freeze({ ...(input.before ?? {}) }),
    after: Object.freeze({ ...(input.after ?? {}) }),
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  };
  return Object.freeze({
    ...event,
    event_hash: createHash("sha256").update(JSON.stringify(event)).digest("hex"),
  });
}

export function appendDmsAuditEvent({ repository, event } = {}) {
  const normalized = createDmsAuditEvent(event);
  repository?.appendAudit?.(normalized);
  return normalized;
}
