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
  requiredString(decision, "conflict_decision_id");
  requiredString(decision, "conflict_check_id");
  requiredString(decision, "reviewer_id");
  if (!DECISIONS.includes(decision.decision)) throw new Error(`Conflict decision must be one of ${DECISIONS.join(", ")}`);
  const replay = repository.getIdempotency({ tenant_id: decision.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const hitIds = Object.freeze(
      Array.isArray(decision.conflict_hit_ids)
        ? decision.conflict_hit_ids.filter((value) => typeof value === "string" && value.trim() !== "")
        : tx.list({ tenant_id: decision.tenant_id, model_type: "ConflictHit", conflict_check_id: decision.conflict_check_id })
          .map((hit) => hit.conflict_hit_id),
    );
    const record = tx.create({
      ...decision,
      model_type: "ConflictDecision",
      status: decision.decision === "clear" ? "cleared" : "review_required",
      conflict_hit_ids: hitIds,
      decided_at: decision.decided_at ?? new Date().toISOString(),
    });
    const nextHitStatus = decision.decision === "clear" ? "cleared" : decision.decision === "block" ? "blocked" : "review_required";
    for (const conflict_hit_id of hitIds) {
      tx.update(
        { tenant_id: decision.tenant_id, model_type: "ConflictHit", conflict_hit_id },
        {
          status: nextHitStatus,
          reviewer_id: decision.reviewer_id,
          review_decision_id: record.conflict_decision_id,
          updates_database_rows: true,
        },
      );
    }
    tx.update(
      { tenant_id: decision.tenant_id, model_type: "ConflictCheck", conflict_check_id: decision.conflict_check_id },
      {
        status: decision.decision === "clear" ? "cleared" : decision.decision === "block" ? "blocked" : "review_required",
        reviewer_id: decision.reviewer_id,
        review_decision: decision.decision,
        review_decision_id: record.conflict_decision_id,
        review_decision_recorded_at: record.decided_at,
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
        metadata: {
          decision: record.decision,
          reviewer_id: record.reviewer_id,
          conflict_check_id: record.conflict_check_id,
          reviewed_hit_count: hitIds.length,
          clearance_link_ready: record.decision === "clear",
        },
      },
    });
    const response = Object.freeze({ outcome: "created", conflict_decision: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "conflict_decision_record", response });
    return response;
  });
}
