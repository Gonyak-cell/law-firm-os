import { appendIntakeAuditEvent } from "./audit.js";

const DECISIONS = Object.freeze(["clear", "block", "waiver_required"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function decideConflict({ repository, decision, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(decision, "tenant_id");
  requiredString(decision, "conflict_check_id");
  requiredString(decision, "reviewer_id");
  if (!DECISIONS.includes(decision.decision)) throw new Error(`Conflict decision must be one of ${DECISIONS.join(", ")}`);
  const replay = repository.getIdempotency({ tenant_id: decision.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const record = tx.create({
      ...decision,
      model_type: "ConflictDecision",
      status: decision.decision === "clear" ? "cleared" : "review_required",
      decided_at: decision.decided_at ?? new Date().toISOString(),
    });
    tx.update(
      { tenant_id: decision.tenant_id, model_type: "ConflictCheck", conflict_check_id: decision.conflict_check_id },
      {
        status: decision.decision === "clear" ? "cleared" : "review_required",
        updates_database_rows: true,
      },
    );
    const auditEvent = appendIntakeAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "conflict.decision.record",
        object_type: "ConflictDecision",
        object_id: record.conflict_decision_id,
        idempotency_key,
        metadata: { decision: record.decision },
      },
    });
    const response = Object.freeze({ outcome: "created", conflict_decision: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "conflict_decision_record", response });
    return response;
  });
}
