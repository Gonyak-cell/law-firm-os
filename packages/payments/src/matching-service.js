import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function matchPaymentToInvoice({ repository, match, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(match, "tenant_id");
  requiredString(match, "payment_id");
  requiredString(match, "invoice_id");
  const amount = Number(match.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("match amount must be positive");
  const replay = repository.getIdempotency({ tenant_id: match.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const payment = tx.get({ tenant_id: match.tenant_id, model_type: "Payment", payment_id: match.payment_id });
    const invoice = tx.get({ tenant_id: match.tenant_id, model_type: "Invoice", invoice_id: match.invoice_id });
    if (!payment || !invoice) throw new Error("payment and invoice are required for matching");
    if (amount > Number(payment.amount ?? 0)) throw new Error("match amount exceeds payment");
    const record = tx.create({
      ...match,
      model_type: "PaymentMatch",
      amount,
      matter_id: invoice.matter_id,
      status: "matched",
      matched_at: match.matched_at ?? new Date().toISOString(),
    });
    const paid = Number(invoice.amount_paid ?? 0) + amount;
    tx.update(
      { tenant_id: match.tenant_id, model_type: "Invoice", invoice_id: match.invoice_id },
      {
        amount_paid: paid,
        status: paid >= Number(invoice.amount_due ?? 0) ? "paid" : "partially_paid",
        updates_database_rows: true,
      },
    );
    tx.update({ tenant_id: match.tenant_id, model_type: "Payment", payment_id: match.payment_id }, { status: "matched", updates_database_rows: true });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "payment.match",
        object_type: "PaymentMatch",
        object_id: record.payment_match_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", payment_match: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "payment_match", response });
    return response;
  });
}
