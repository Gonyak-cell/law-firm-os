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
    const paymentAmount = Number(payment.amount ?? 0);
    const alreadyApplied = tx
      .list({ tenant_id: match.tenant_id, model_type: "PaymentMatch", payment_id: match.payment_id })
      .reduce((total, item) => total + Number(item.amount ?? 0), 0);
    const paymentAvailable = Math.max(0, paymentAmount - alreadyApplied);
    const invoiceOutstanding = Math.max(0, Number(invoice.amount_due ?? 0) - Number(invoice.amount_paid ?? 0));
    if (amount > paymentAvailable) throw new Error("match amount exceeds available payment");
    if (amount > invoiceOutstanding) throw new Error("match amount exceeds invoice outstanding");
    const record = tx.create({
      ...match,
      model_type: "PaymentMatch",
      amount,
      matter_id: invoice.matter_id,
      status: "matched",
      payment_available_before: paymentAvailable,
      invoice_outstanding_before: invoiceOutstanding,
      unapplied_amount_after: paymentAvailable - amount,
      matched_at: match.matched_at ?? new Date().toISOString(),
    });
    const paid = Number(invoice.amount_paid ?? 0) + amount;
    const updatedInvoice = tx.update(
      { tenant_id: match.tenant_id, model_type: "Invoice", invoice_id: match.invoice_id },
      {
        amount_paid: paid,
        status: paid >= Number(invoice.amount_due ?? 0) ? "paid" : "partially_paid",
        updates_database_rows: true,
      },
    );
    const appliedAmount = alreadyApplied + amount;
    const unappliedAmount = Math.max(0, paymentAmount - appliedAmount);
    const updatedPayment = tx.update(
      { tenant_id: match.tenant_id, model_type: "Payment", payment_id: match.payment_id },
      {
        applied_amount: appliedAmount,
        unapplied_amount: unappliedAmount,
        status: unappliedAmount === 0 ? "matched" : "partially_matched",
        updates_database_rows: true,
      },
    );
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
    const response = Object.freeze({
      outcome: "created",
      payment_match: record,
      invoice: updatedInvoice,
      payment: updatedPayment,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "payment_match", response });
    return response;
  });
}
