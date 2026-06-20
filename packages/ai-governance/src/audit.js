function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function appendAiAuditEvent({ repository, event } = {}) {
  requiredString(event, "tenant_id");
  requiredString(event, "actor_id");
  requiredString(event, "action");
  requiredString(event, "object_type");
  requiredString(event, "object_id");
  const eventId =
    event.event_id ??
    `ai:${event.action}:${event.tenant_id}:${event.object_type}:${event.object_id}:${event.idempotency_key ?? "single"}`;
  return repository.appendAudit({
    ...event,
    event_id: eventId,
    decision: event.decision ?? "allow",
    occurred_at: event.occurred_at ?? new Date().toISOString(),
    metadata: event.metadata ?? {},
    production_ready_claim: false,
  });
}
