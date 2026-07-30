import { allocatePayment } from "./payment-allocation-service.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function matchPaymentToInvoice({ repository, match, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(match, "tenant_id");
  requiredString(match, "payment_match_id");
  requiredString(match, "payment_id");
  requiredString(match, "invoice_id");
  const amount = Number(match.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("match amount must be positive");
  const result = allocatePayment({
    repository,
    allocation: {
      payment_allocation_id: match.payment_allocation_id ?? `allocation:${match.payment_match_id}`,
      tenant_id: match.tenant_id,
      payment_id: match.payment_id,
      invoice_id: match.invoice_id,
      allocation_type: "invoice_payment",
      amount,
      currency: match.currency,
      allocated_at: match.matched_at,
      source_payment_match_id: match.payment_match_id,
      actor_id,
    },
    compatibility_payment_match: match,
    actor_id,
    idempotency_key,
  });
  return Object.freeze({
    outcome: result.outcome,
    payment_match: result.payment_match,
    payment_allocation: result.payment_allocation,
    invoice: result.invoice,
    payment: result.payment,
    audit_event: result.audit_event,
    idempotent_replay: result.idempotent_replay,
  });
}
