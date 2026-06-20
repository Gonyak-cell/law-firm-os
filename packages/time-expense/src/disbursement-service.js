import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createDisbursement({ repository, disbursement, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(disbursement, "tenant_id");
  requiredString(disbursement, "matter_id");
  requiredString(disbursement, "vendor_ref");
  const amount = Number(disbursement.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new TypeError("amount must be positive");
  const replay = repository.getIdempotency({ tenant_id: disbursement.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({
      ...disbursement,
      model_type: "Disbursement",
      amount,
      status: disbursement.status ?? "approved",
      recoverable: disbursement.recoverable !== false,
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "disbursement.create",
        object_type: "Disbursement",
        object_id: record.disbursement_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", disbursement: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "disbursement_create", response });
    return response;
  });
}
