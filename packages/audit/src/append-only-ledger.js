import { createAuditEvent, hashEventBody } from "./events.js";

export function createAuditLedger() {
  const events = [];
  const lastEventByTenant = new Map();
  const eventByTenantIdempotencyKey = new Map();
  return {
    append(input) {
      const idempotencyKey = `${input.tenant_id}:${input.idempotency_key}`;
      const existing = eventByTenantIdempotencyKey.get(idempotencyKey);
      if (existing) return existing;
      const previousTenantEvent = lastEventByTenant.get(input.tenant_id) ?? null;
      const event = createAuditEvent(input, previousTenantEvent);
      events.push(event);
      lastEventByTenant.set(event.tenant_id, event);
      eventByTenantIdempotencyKey.set(idempotencyKey, event);
      return event;
    },
    correction(originalEvent, input) {
      if (!originalEvent?.event_id) throw new Error("Correction requires original event");
      return this.append({ ...input, correction_of_event_id: originalEvent.event_id, action: "audit.correction.append" });
    },
    list({ tenant_id, principal } = {}) {
      const tenantId = tenant_id ?? principal?.tenant_id;
      if (!tenantId) throw new Error("Audit ledger list requires tenant_id or principal.tenant_id");
      return tenantScopedEvents(events, tenantId);
    },
    verify({ tenant_id } = {}) {
      return verifyHashChain(tenantScopedEvents(events, tenant_id));
    },
  };
}

export function verifyHashChain(events, { maxClockSkewMs = 5 * 60 * 1000 } = {}) {
  const tenantIndexes = new Map();
  const previousByTenant = new Map();
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const tenantIndex = (tenantIndexes.get(event.tenant_id) ?? 0) + 1;
    tenantIndexes.set(event.tenant_id, tenantIndex);
    const previous = previousByTenant.get(event.tenant_id);
    if (event.sequence_number !== tenantIndex) return { ok: false, reason: "sequence_gap", event_id: event.event_id };
    if (event.previous_event_hash !== (previous?.event_hash ?? "GENESIS")) {
      return { ok: false, reason: "previous_hash_mismatch", event_id: event.event_id };
    }
    if (Math.abs(Date.parse(event.received_at) - Date.parse(event.occurred_at)) > maxClockSkewMs) {
      return { ok: false, reason: "clock_skew_out_of_policy", event_id: event.event_id };
    }
    const { event_hash, hash_algorithm, ...body } = event;
    if (hashEventBody(body) !== event_hash) return { ok: false, reason: "event_hash_mismatch", event_id: event.event_id };
    if (hash_algorithm !== "sha256") return { ok: false, reason: "hash_algorithm_mismatch", event_id: event.event_id };
    if (event.correction_of_event_id && !events.some((candidate) => candidate.event_id === event.correction_of_event_id)) {
      return { ok: false, reason: "orphaned_correction_event", event_id: event.event_id };
    }
    previousByTenant.set(event.tenant_id, event);
  }
  return { ok: true, checked: events.length };
}

function tenantScopedEvents(events, tenantId) {
  if (!tenantId) return [...events];
  return events.filter((event) => event.tenant_id === tenantId);
}
