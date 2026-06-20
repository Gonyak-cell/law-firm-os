import { createMatterCalendarEvent } from "./model.js";

export function changeMatterDeadline({ repository, event, new_starts_at, new_ends_at, actor_id, reason, audit } = {}) {
  if (!actor_id) throw new TypeError("actor_id is required");
  if (!reason) throw new TypeError("reason is required");
  if (!new_starts_at) throw new TypeError("new_starts_at is required");
  if (event.starts_at === new_starts_at && (event.ends_at ?? null) === (new_ends_at ?? event.ends_at ?? null)) {
    throw new Error("Matter deadline change must not be a no-op");
  }
  const next = createMatterCalendarEvent({
    ...event,
    starts_at: new_starts_at,
    ends_at: new_ends_at ?? event.ends_at,
    status: "rescheduled",
  });
  const persisted = repository.update(
    { tenant_id: next.tenant_id, model_type: "MatterCalendarEvent", event_id: next.event_id },
    next,
  );
  audit?.append?.({
    tenant_id: persisted.tenant_id,
    actor_id,
    action: "matter.deadline.change",
    object_type: "MatterCalendarEvent",
    object_id: persisted.event_id,
    decision: "allow",
    reason,
    metadata: { previous_starts_at: event.starts_at, new_starts_at },
  });
  return persisted;
}
