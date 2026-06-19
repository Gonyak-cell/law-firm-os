import { createHrxAuditEvent } from "./hrx-events.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createHrxAuditEventStore(seed = []) {
  const events = [];
  const eventIds = new Set();

  function append(input) {
    const event = createHrxAuditEvent(input);
    if (eventIds.has(event.event_id)) throw new Error(`Duplicate HRX audit event: ${event.event_id}`);
    eventIds.add(event.event_id);
    events.push(clone(event));
    return clone(event);
  }

  for (const event of seed) append(event);

  return Object.freeze({
    append,
    list(query = {}) {
      return Object.freeze(
        events
          .filter((event) => !query.tenant_id || event.tenant_id === query.tenant_id)
          .filter((event) => !query.object_id || event.object_id === query.object_id)
          .map((event) => Object.freeze(clone(event))),
      );
    },
  });
}

export function recordHrxSensitiveAccess({ store, event }) {
  if (!store || typeof store.append !== "function") throw new TypeError("HRX audit store append port is required");
  return store.append(event);
}
