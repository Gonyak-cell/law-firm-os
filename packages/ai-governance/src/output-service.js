import { appendAiAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createAiOutput({ repository, ai_output, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(ai_output, "tenant_id");
  requiredString(ai_output, "matter_id");
  requiredString(ai_output, "prompt_log_id");
  const replay = repository.getIdempotency({ tenant_id: ai_output.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({
      ...ai_output,
      model_type: "AiOutput",
      status: "needs_human_review",
      promotes_ai_output_to_final: false,
      raw_output_included: false,
    });
    const reviewTask = tx.create({
      model_type: "HumanReviewTask",
      review_task_id: `review:${record.tenant_id}:${record.ai_output_id}`,
      tenant_id: record.tenant_id,
      matter_id: record.matter_id,
      ai_output_id: record.ai_output_id,
      status: "open",
      reviewer_role: "attorney_reviewer",
    });
    const auditEvent = appendAiAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "ai.output.create", object_type: "AiOutput", object_id: record.ai_output_id, idempotency_key } });
    const response = Object.freeze({ outcome: "created", ai_output: record, review_task: reviewTask, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "ai_output_create", response });
    return response;
  });
}

export function adjudicateAiOutput({ repository, tenant_id, review_task_id, decision, reviewer_id, actor_id, idempotency_key } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ review_task_id }, "review_task_id");
  requiredString({ decision }, "decision");
  requiredString({ reviewer_id }, "reviewer_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  if (!["approve_with_findings", "reject", "needs_revision"].includes(decision)) throw new Error("invalid AI review decision");
  const replay = repository.getIdempotency({ tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const task = tx.update({ tenant_id, model_type: "HumanReviewTask", review_task_id }, { status: "closed", decision, reviewer_id, updates_database_rows: true });
    const auditEvent = appendAiAuditEvent({ repository: tx, event: { tenant_id, actor_id, action: "ai.review.adjudicate", object_type: "HumanReviewTask", object_id: review_task_id, idempotency_key } });
    const response = Object.freeze({ outcome: "updated", review_task: task, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id, idempotency_key, operation: "ai_review_adjudicate", response });
    return response;
  });
}
