export function createOutboxEvent(input = {}) {
  if (!input.event_id || !input.tenant_id || !input.event_type || !input.aggregate_id) {
    throw new TypeError("event_id, tenant_id, event_type, and aggregate_id are required");
  }
  return Object.freeze({
    event_id: input.event_id,
    tenant_id: input.tenant_id,
    event_type: input.event_type,
    aggregate_type: input.aggregate_type ?? "MatterVault",
    aggregate_id: input.aggregate_id,
    payload: Object.freeze({ ...(input.payload ?? {}) }),
    status: input.status ?? "pending",
    retry_count: input.retry_count ?? 0,
    created_at: input.created_at ?? new Date().toISOString(),
    processed_at: input.processed_at ?? null,
  });
}

export function enqueueOutboxEvent({ repository, event } = {}) {
  const record = createOutboxEvent(event);
  return repository.create({ ...record, resource_id: record.event_id });
}
