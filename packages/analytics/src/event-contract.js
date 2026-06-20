import { appendAnalyticsAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function recordAnalyticsEvent({ repository, analytics_event, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(analytics_event, "tenant_id");
  requiredString(analytics_event, "event_type");
  if (!Array.isArray(analytics_event.source_refs) || analytics_event.source_refs.length === 0) throw new Error("source_refs are required");
  if (analytics_event.mutates_source_object === true || analytics_event.writes_product_state === true) {
    throw new Error("AnalyticsEvent cannot mutate source objects");
  }
  const replay = repository.getIdempotency({ tenant_id: analytics_event.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({
      ...analytics_event,
      model_type: "AnalyticsEvent",
      occurred_at: analytics_event.occurred_at ?? new Date().toISOString(),
      source_refs: Object.freeze(analytics_event.source_refs.map((ref) => Object.freeze({ ...ref }))),
      mutates_source_object: false,
    });
    const auditEvent = appendAnalyticsAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "analytics.event.record",
        object_type: "AnalyticsEvent",
        object_id: record.analytics_event_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", analytics_event: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "analytics_event_record", response });
    return response;
  });
}
