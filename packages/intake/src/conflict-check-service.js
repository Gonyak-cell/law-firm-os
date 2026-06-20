import { createHash } from "node:crypto";
import { appendIntakeAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function hashConflictSnapshot(snapshot) {
  return createHash("sha256").update(JSON.stringify(snapshot ?? {})).digest("hex");
}

export function createConflictCheck({ repository, conflict_check, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(conflict_check, "tenant_id");
  const replay = repository.getIdempotency({ tenant_id: conflict_check.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const snapshot = Object.freeze({
      ...(conflict_check.party_snapshot ?? {}),
      recorded_by: actor_id,
      recorded_at: conflict_check.snapshot_recorded_at ?? new Date().toISOString(),
    });
    const record = tx.create({
      ...conflict_check,
      model_type: "ConflictCheck",
      party_snapshot: snapshot,
      snapshot_hash: conflict_check.snapshot_hash ?? hashConflictSnapshot(snapshot),
      snapshot_recorded_at: snapshot.recorded_at,
      status: conflict_check.status ?? "snapshot_recorded",
      owner_user_id: conflict_check.owner_user_id ?? actor_id,
    });
    const auditEvent = appendIntakeAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "conflict.check.create",
        object_type: "ConflictCheck",
        object_id: record.conflict_check_id,
        idempotency_key,
        metadata: { snapshot_hash: record.snapshot_hash },
      },
    });
    const response = Object.freeze({ outcome: "created", conflict_check: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "conflict_check_create", response });
    return response;
  });
}
