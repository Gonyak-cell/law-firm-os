import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function positiveAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new TypeError("amount must be positive");
  return amount;
}

export function createExpense({ repository, expense, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(expense, "tenant_id");
  requiredString(expense, "matter_id");
  requiredString(expense, "receipt_document_id");
  const amount = positiveAmount(expense.amount);
  const replay = repository.getIdempotency({ tenant_id: expense.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({
      ...expense,
      model_type: "Expense",
      amount,
      status: expense.status ?? "submitted",
      approved_for_wip: expense.status === "approved",
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "expense.create",
        object_type: "Expense",
        object_id: record.expense_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", expense: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "expense_create", response });
    return response;
  });
}
