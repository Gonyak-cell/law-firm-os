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
      allocation_status: payment.allocation_status ?? "unallocated",
      allocated_amount: payment.allocated_amount ?? 0,
      unallocated_amount: payment.unallocated_amount ?? amount,
      applied_amount: payment.applied_amount ?? 0,
      unapplied_amount: payment.unapplied_amount ?? amount,
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

export function confirmBankReceipt({
  repository,
  bank_transaction_id,
  payment = {},
  actor_id,
  idempotency_key,
} = {}) {
  const tenantId = requiredString(payment, "tenant_id");
  const bankTransactionId = requiredString({ bank_transaction_id }, "bank_transaction_id");
  const transaction = repository.get({
    tenant_id: tenantId,
    model_type: "BankTransaction",
    bank_transaction_id: bankTransactionId,
  });
  if (!transaction || transaction.direction !== "inflow") throw new Error("confirmed bank receipt requires an inflow BankTransaction");
  const existing = repository.list({ tenant_id: tenantId, model_type: "Payment" })
    .find((row) => row.bank_transaction_id === bankTransactionId);
  if (existing) {
    const replay = repository.getIdempotency({ tenant_id: tenantId, idempotency_key });
    if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
    throw new Error("BankTransaction already has a Payment");
  }
  const classification = repository.list({
    tenant_id: tenantId,
    model_type: "BankTransactionClassification",
    bank_transaction_id: bankTransactionId,
  }).find((row) => row.category === "client_receipt" && row.status === "confirmed");
  const receivedAt = payment.received_at ?? transaction.occurred_at ?? transaction.date;
  const date = String(receivedAt).slice(0, 10);
  const amount = Number(transaction.amount);
  const currency = transaction.currency ?? "KRW";
  const duplicateCandidates = repository.list({ tenant_id: tenantId, model_type: "Payment" })
    .filter((row) => !row.bank_transaction_id)
    .filter((row) => Number(row.amount) === amount && row.currency === currency)
    .filter((row) => String(row.received_at ?? row.payment_date ?? row.imported_at ?? "").slice(0, 10) === date)
    .map((row) => row.payment_id);
  return importPayment({
    repository,
    payment: {
      ...payment,
      tenant_id: tenantId,
      bank_transaction_id: bankTransactionId,
      bank_reference: payment.bank_reference ?? `bank-transaction:${bankTransactionId}`,
      client_group_id: payment.client_group_id ?? classification?.client_group_id ?? null,
      amount,
      currency,
      received_at: receivedAt,
      status: duplicateCandidates.length > 0 ? "duplicate_review" : payment.status,
      duplicate_review_required: duplicateCandidates.length > 0,
      duplicate_candidate_payment_ids: duplicateCandidates,
      revenue_effect: "none_until_allocated",
    },
    actor_id,
    idempotency_key,
  });
}
