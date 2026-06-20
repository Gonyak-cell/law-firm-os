import { appendIntakeAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createConflictHit({ repository, hit, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(hit, "tenant_id");
  requiredString(hit, "audit_hint_ref");
  const replay = repository.getIdempotency({ tenant_id: hit.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const record = tx.create({
      ...hit,
      model_type: "ConflictHit",
      status: hit.status ?? "review_required",
      owner_user_id: hit.owner_user_id ?? actor_id,
    });
    const auditEvent = appendIntakeAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "conflict.hit.create",
        object_type: "ConflictHit",
        object_id: record.conflict_hit_id,
        idempotency_key,
        metadata: { hit_source: record.hit_source, severity: record.severity },
      },
    });
    const response = Object.freeze({ outcome: "created", conflict_hit: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "conflict_hit_create", response });
    return response;
  });
}
