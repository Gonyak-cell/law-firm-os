export function projectVaultEventToMatterTimeline(input = {}) {
  if (!input.event_id || !input.tenant_id || !input.matter_id || !input.source_object_id) {
    throw new TypeError("event_id, tenant_id, matter_id, and source_object_id are required");
  }
  return Object.freeze({
    model_type: "MatterTimelineEvent",
    resource_id: input.event_id,
    event_id: input.event_id,
    tenant_id: input.tenant_id,
    matter_id: input.matter_id,
    occurred_at: input.occurred_at ?? new Date().toISOString(),
    type: input.event_type ?? "vault.event",
    title: input.title ?? "Vault event",
    source_module: "vault",
    source_object_id: input.source_object_id,
    source_ref: input.source_ref ?? input.source_object_id,
    safe_summary: Object.freeze({ ...(input.safe_summary ?? {}) }),
    raw_storage_path_included: false,
    document_bytes_included: false,
  });
}
