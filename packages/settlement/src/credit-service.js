import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function assignWorkingCredit({ repository, working_credit, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(working_credit, "tenant_id");
  requiredString(working_credit, "matter_id");
  requiredString(working_credit, "employee_id");
  const percent = Number(working_credit.credit_percent);
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) throw new Error("credit_percent must be between 0 and 100");
  const replay = repository.getIdempotency({ tenant_id: working_credit.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({
      ...working_credit,
      model_type: "WorkingCredit",
      credit_percent: percent,
      status: "active",
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "working_credit.assign",
        object_type: "WorkingCredit",
        object_id: record.working_credit_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", working_credit: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "working_credit_assign", response });
    return response;
  });
}
