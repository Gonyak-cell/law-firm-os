import { createHash } from "node:crypto";

const MATTER_AUDIT_DECISIONS = Object.freeze(["allow", "deny", "review_required", "blocked"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createMatterAuditEvent(input = {}) {
  const decision = requiredString(input, "decision");
  if (!MATTER_AUDIT_DECISIONS.includes(decision)) {
    throw new TypeError(`decision must be one of ${MATTER_AUDIT_DECISIONS.join(", ")}`);
  }
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
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  };
  const hashInput = JSON.stringify(event);
  return Object.freeze({
    ...event,
    event_hash: createHash("sha256").update(hashInput).digest("hex"),
  });
}

export function appendMatterAuditEvent({ repository, event } = {}) {
  const normalized = createMatterAuditEvent(event);
  repository?.appendAudit?.(normalized);
  return normalized;
}
