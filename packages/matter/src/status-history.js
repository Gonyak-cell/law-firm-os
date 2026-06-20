function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createMatterStatusHistoryEntry(input = {}) {
  for (const field of ["tenant_id", "matter_id", "from_status", "to_status", "actor_id", "reason", "audit_ref"]) {
    if (typeof input[field] !== "string" || input[field].trim() === "") throw new TypeError(`${field} is required`);
  }
  if (input.from_status === input.to_status) throw new Error("Matter status history cannot append no-op transition");
  return Object.freeze({
    status_history_id: input.status_history_id ?? `status:${input.tenant_id}:${input.matter_id}:${Date.now()}`,
    tenant_id: input.tenant_id,
    matter_id: input.matter_id,
    from_status: input.from_status,
    to_status: input.to_status,
    actor_id: input.actor_id,
    reason: input.reason,
    audit_ref: input.audit_ref,
    changed_at: input.changed_at ?? new Date().toISOString(),
    append_only: true,
  });
}

export function createMatterStatusHistoryStore(seed = []) {
  const entries = seed.map((entry) => clone(createMatterStatusHistoryEntry(entry)));
  return Object.freeze({
    append(input) {
      const entry = createMatterStatusHistoryEntry(input);
      entries.push(clone(entry));
      return entry;
    },
    list(query = {}) {
      return Object.freeze(
        entries
          .filter((entry) => !query.tenant_id || entry.tenant_id === query.tenant_id)
          .filter((entry) => !query.matter_id || entry.matter_id === query.matter_id)
          .map((entry) => Object.freeze(clone(entry))),
      );
    },
    update() {
      throw new Error("Matter status history is append-only");
    },
  });
}
