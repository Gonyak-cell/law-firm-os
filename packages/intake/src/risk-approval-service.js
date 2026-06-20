import { appendIntakeAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function approveRisk({ repository, risk_approval, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(risk_approval, "tenant_id");
  requiredString(risk_approval, "approver_id");
  const replay = repository.getIdempotency({ tenant_id: risk_approval.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const record = tx.create({
      ...risk_approval,
      model_type: "RiskApproval",
      status: "approved",
      approved_at: risk_approval.approved_at ?? new Date().toISOString(),
    });
    const auditEvent = appendIntakeAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "risk.approved",
        object_type: "RiskApproval",
        object_id: record.risk_approval_id,
        idempotency_key,
        metadata: { risk_level: record.risk_level ?? "standard" },
      },
    });
    const response = Object.freeze({ outcome: "approved", risk_approval: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "risk_approve", response });
    return response;
  });
}
