function visibleToActor(entry, actor = {}) {
  if (entry.silent === true || entry.hidden_from_actor === true) return false;
  if (!entry.required_scope) return true;
  return Array.isArray(actor.scopes) && actor.scopes.includes(entry.required_scope);
}

export function buildMatterTimelineReadModel({ entries = [], actor = {}, tenant_id, matter_id } = {}) {
  const visible_entries = entries
    .filter((entry) => (!tenant_id || entry.tenant_id === tenant_id) && (!matter_id || entry.matter_id === matter_id))
    .filter((entry) => visibleToActor(entry, actor))
    .map((entry) =>
      Object.freeze({
        event_id: entry.event_id,
        tenant_id: entry.tenant_id,
        matter_id: entry.matter_id,
        occurred_at: entry.occurred_at,
        type: entry.type,
        title: entry.title,
        source_ref: entry.source_ref ?? null,
      }),
    );
  return Object.freeze({
    tenant_id,
    matter_id,
    visible_entries: Object.freeze(visible_entries),
    omitted_entry_count: null,
    count_leak_prevented: true,
  });
}
