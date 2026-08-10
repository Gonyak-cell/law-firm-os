export function appendBuilderAudit(repository, event) {
  return repository.appendAudit({
    event_id: event.event_id,
    tenant_id: event.tenant_id,
    actor_id: event.actor_id,
    action: event.action,
    object_type: event.object_type,
    object_id: event.object_id,
    decision: event.decision ?? "allow",
    reason: event.reason,
    occurred_at: event.occurred_at,
    metadata: {
      ...(event.metadata ?? {}),
      raw_body_included: false,
      raw_template_body_included: false,
      raw_provider_payload_included: false,
      raw_contact_values_included: false,
      document_bytes_included: false,
    },
  });
}

export function appendBuilderTimeline(repository, event) {
  return repository.upsert({
    model_type: "MatterTimelineEvent",
    resource_id: event.event_id,
    event_id: event.event_id,
    tenant_id: event.tenant_id,
    matter_id: event.matter_id,
    occurred_at: event.occurred_at,
    type: event.type,
    title: event.title,
    source_ref: event.source_ref,
    source_module: "matter-builder",
    source_object_id: event.source_object_id,
    safe_summary: event.safe_summary,
    raw_body_included: false,
    raw_provider_payload_included: false,
    raw_contact_values_included: false,
    document_bytes_included: false,
  });
}
