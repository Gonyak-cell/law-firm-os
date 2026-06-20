import { appendAiAuditEvent } from "../../ai-governance/src/audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function hasHumanApproval(steps = []) {
  return steps.some((step) => step.type === "human_approval" || step.requires_human_approval === true);
}

export function createLegalWorkflow({ repository, legal_workflow, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(legal_workflow, "tenant_id");
  requiredString(legal_workflow, "matter_id");
  if (!hasHumanApproval(legal_workflow.steps)) throw new Error("legal workflow requires human approval step");
  if (legal_workflow.auto_final_legal_decision === true) throw new Error("auto final legal decision is blocked");
  const replay = repository.getIdempotency({ tenant_id: legal_workflow.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({ ...legal_workflow, model_type: "LegalWorkflow", status: "draft", auto_final_legal_decision: false });
    const auditEvent = appendAiAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "ai.legal_workflow.create", object_type: "LegalWorkflow", object_id: record.workflow_id, idempotency_key } });
    const response = Object.freeze({ outcome: "created", legal_workflow: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "ai_legal_workflow_create", response });
    return response;
  });
}
