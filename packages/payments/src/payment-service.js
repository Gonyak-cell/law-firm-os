import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function importPayment({ repository, payment, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(payment, "tenant_id");
  requiredString(payment, "bank_reference");
  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("payment amount must be positive");
  const replay = repository.getIdempotency({ tenant_id: payment.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({
      ...payment,
      model_type: "Payment",
      amount,
      status: payment.status ?? "imported",
      imported_at: payment.imported_at ?? new Date().toISOString(),
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "payment.import",
        object_type: "Payment",
        object_id: record.payment_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", payment: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "payment_import", response });
    return response;
  });
}
