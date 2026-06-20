import { appendIntakeAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function executeConflictSearch({ repository, search, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(search, "tenant_id");
  requiredString(search, "conflict_check_id");
  const replay = repository.getIdempotency({ tenant_id: search.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  const aliases = Object.freeze([...(search.aliases ?? [])]);
  const relationshipRefs = Object.freeze([...(search.relationship_refs ?? [])]);

  return repository.transaction((tx) => {
    const record = tx.create({
      ...search,
      model_type: "ConflictSearch",
      conflict_search_id: search.conflict_search_id,
      aliases,
      relationship_refs: relationshipRefs,
      hit_count: search.hit_count ?? 0,
      raw_query_included: false,
      status: "executed",
    });
    const auditEvent = appendIntakeAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "conflict.search.executed",
        object_type: "ConflictSearch",
        object_id: record.conflict_search_id,
        idempotency_key,
        metadata: { alias_count: aliases.length, relationship_ref_count: relationshipRefs.length },
      },
    });
    const response = Object.freeze({ outcome: "created", conflict_search: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "conflict_search_execute", response });
    return response;
  });
}
