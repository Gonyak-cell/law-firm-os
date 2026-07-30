import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";

export const PAYMENT_ALLOCATION_TYPES = Object.freeze([
  "invoice_payment",
  "direct_fee",
  "client_advance",
  "trust_deposit",
  "other_non_revenue",
]);

const EXCLUDED_STATUSES = new Set(["cancelled", "canceled", "void", "rejected", "deleted"]);
const ALLOCATION_DERIVED_PAYMENT_STATUSES = new Set([
  "allocated",
  "partially_allocated",
  "matched",
  "partially_matched",
  "unallocated",
]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function money(value, field = "amount") {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || Math.abs(number * 100 - Math.round(number * 100)) > 0.000001) {
    throw new TypeError(`${field} must be positive with at most two decimal places`);
  }
  return Math.round(number * 100) / 100;
}

function activeAllocationState(repository, tenantId, paymentId) {
  const allocations = repository.list({ tenant_id: tenantId, model_type: "PaymentAllocation", payment_id: paymentId });
  const reversedIds = new Set(allocations.map((row) => optionalString(row.reverses_payment_allocation_id)).filter(Boolean));
  const activeAllocations = allocations.filter((row) => {
    return row.status !== "reversed"
      && !EXCLUDED_STATUSES.has(String(row.status ?? "").toLowerCase())
      && !reversedIds.has(row.payment_allocation_id);
  });
  const representedMatches = new Set(allocations.map((row) => optionalString(row.source_payment_match_id)).filter(Boolean));
  const legacyMatches = repository
    .list({ tenant_id: tenantId, model_type: "PaymentMatch", payment_id: paymentId })
    .filter((row) => !EXCLUDED_STATUSES.has(String(row.status ?? "").toLowerCase()))
    .filter((row) => !representedMatches.has(row.payment_match_id));
  const allocatedAmount = [...activeAllocations, ...legacyMatches]
    .reduce((total, row) => total + Number(row.amount ?? row.matched_amount ?? 0), 0);
  return { allocations, activeAllocations, legacyMatches, allocatedAmount: Math.round(allocatedAmount * 100) / 100 };
}

export function listActivePaymentAllocations({ repository, tenant_id, payment_id } = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const paymentId = requiredString({ payment_id }, "payment_id");
  return Object.freeze(activeAllocationState(repository, tenantId, paymentId).activeAllocations.map((row) => Object.freeze({ ...row })));
}

function updatePaymentProjection(repository, payment) {
  const state = activeAllocationState(repository, payment.tenant_id, payment.payment_id);
  const paymentAmount = Number(payment.amount ?? 0);
  const unallocatedAmount = Math.max(0, Math.round((paymentAmount - state.allocatedAmount) * 100) / 100);
  const allocationStatus = state.allocatedAmount === 0
    ? "unallocated"
    : unallocatedAmount === 0
      ? "allocated"
      : "partially_allocated";
  const invoiceOnly = state.activeAllocations.every((row) => row.allocation_type === "invoice_payment");
  const unallocatedStatus = ALLOCATION_DERIVED_PAYMENT_STATUSES.has(payment.status)
    ? "imported"
    : payment.status ?? "imported";
  const status = state.allocatedAmount === 0
    ? unallocatedStatus
    : invoiceOnly
      ? (unallocatedAmount === 0 ? "matched" : "partially_matched")
      : allocationStatus;
  return repository.update(
    { tenant_id: payment.tenant_id, model_type: "Payment", payment_id: payment.payment_id },
    {
      allocated_amount: state.allocatedAmount,
      unallocated_amount: unallocatedAmount,
      applied_amount: state.allocatedAmount,
      unapplied_amount: unallocatedAmount,
      allocation_status: allocationStatus,
      status,
      updates_database_rows: true,
    },
  );
}

function validateAllocationTarget(repository, payment, allocation, amount) {
  const type = requiredString(allocation, "allocation_type");
  if (!PAYMENT_ALLOCATION_TYPES.includes(type)) throw new TypeError("allocation_type is invalid");
  const invoiceId = optionalString(allocation.invoice_id);
  if (type !== "invoice_payment" && invoiceId) throw new TypeError("invoice_id is only allowed for invoice_payment");
  const currency = optionalString(allocation.currency)?.toUpperCase() ?? optionalString(payment.currency)?.toUpperCase() ?? "KRW";
  if (currency !== optionalString(payment.currency)?.toUpperCase()) throw new Error("allocation currency must match payment currency");

  let invoice = null;
  let matterId = optionalString(allocation.matter_id) ?? optionalString(payment.matter_id);
  let clientGroupId = optionalString(allocation.client_group_id) ?? optionalString(payment.client_group_id);
  if (type === "invoice_payment") {
    requiredString(allocation, "invoice_id");
    invoice = repository.get({ tenant_id: payment.tenant_id, model_type: "Invoice", invoice_id: allocation.invoice_id });
    if (!invoice) throw new Error("invoice is required for invoice_payment");
    if (currency !== optionalString(invoice.currency)?.toUpperCase()) throw new Error("allocation currency must match invoice currency");
    const invoiceOutstanding = Math.max(0, Number(invoice.amount_due ?? 0) - Number(invoice.amount_paid ?? 0));
    if (amount > invoiceOutstanding) throw new Error("allocation amount exceeds invoice outstanding");
    matterId = optionalString(invoice.matter_id) ?? matterId;
    clientGroupId = optionalString(invoice.client_group_id) ?? clientGroupId;
  }
  if (["direct_fee", "client_advance", "trust_deposit"].includes(type)) requiredString({ client_group_id: clientGroupId }, "client_group_id");
  if (["direct_fee", "trust_deposit"].includes(type)) requiredString({ matter_id: matterId }, "matter_id");
  return { type, currency, invoice, matterId, clientGroupId };
}

function postAllocation(repository, allocation, { compatibilityPaymentMatch = null } = {}) {
  const tenantId = requiredString(allocation, "tenant_id");
  const paymentId = requiredString(allocation, "payment_id");
  requiredString(allocation, "payment_allocation_id");
  const amount = money(allocation.amount);
  const payment = repository.get({ tenant_id: tenantId, model_type: "Payment", payment_id: paymentId });
  if (!payment) throw new Error("payment is required for allocation");
  const before = activeAllocationState(repository, tenantId, paymentId);
  const available = Math.max(0, Number(payment.amount ?? 0) - before.allocatedAmount);
  if (amount > available) throw new Error("allocation amount exceeds available payment");
  const target = validateAllocationTarget(repository, payment, allocation, amount);
  const record = repository.create({
    ...allocation,
    model_type: "PaymentAllocation",
    allocation_type: target.type,
    amount,
    currency: target.currency,
    matter_id: target.matterId,
    client_group_id: target.clientGroupId,
    invoice_id: target.invoice?.invoice_id ?? null,
    status: "posted",
    allocated_at: allocation.allocated_at ?? new Date().toISOString(),
  });

  let updatedInvoice = null;
  if (target.invoice) {
    const paid = Math.round((Number(target.invoice.amount_paid ?? 0) + amount) * 100) / 100;
    updatedInvoice = repository.update(
      { tenant_id: tenantId, model_type: "Invoice", invoice_id: target.invoice.invoice_id },
      {
        amount_paid: paid,
        status: paid >= Number(target.invoice.amount_due ?? 0) ? "paid" : "partially_paid",
        updates_database_rows: true,
      },
    );
  }

  let paymentMatch = null;
  if (compatibilityPaymentMatch) {
    paymentMatch = repository.create({
      ...compatibilityPaymentMatch,
      model_type: "PaymentMatch",
      amount,
      currency: target.currency,
      matter_id: target.matterId,
      status: "matched",
      payment_available_before: available,
      invoice_outstanding_before: Number(target.invoice?.amount_due ?? 0) - Number(target.invoice?.amount_paid ?? 0),
      unapplied_amount_after: available - amount,
      matched_at: compatibilityPaymentMatch.matched_at ?? record.allocated_at,
    });
  }
  const updatedPayment = updatePaymentProjection(repository, payment);
  return { record, payment: updatedPayment, invoice: updatedInvoice, paymentMatch };
}

export function allocatePayment({
  repository,
  allocation,
  actor_id,
  idempotency_key,
  compatibility_payment_match = null,
} = {}) {
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString({ idempotency_key }, "idempotency_key");
  const tenantId = requiredString(allocation, "tenant_id");
  const replay = repository.getIdempotency({ tenant_id: tenantId, idempotency_key: idempotencyKey });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const posted = postAllocation(tx, allocation, { compatibilityPaymentMatch: compatibility_payment_match });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: tenantId,
        actor_id: actorId,
        action: compatibility_payment_match ? "payment.match" : "payment.allocate",
        object_type: compatibility_payment_match ? "PaymentMatch" : "PaymentAllocation",
        object_id: compatibility_payment_match?.payment_match_id ?? posted.record.payment_allocation_id,
        idempotency_key: idempotencyKey,
      },
    });
    const response = Object.freeze({
      outcome: "created",
      payment_allocation: posted.record,
      payment_match: posted.paymentMatch,
      invoice: posted.invoice,
      payment: posted.payment,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({ tenant_id: tenantId, idempotency_key: idempotencyKey, operation: "payment_allocate", response });
    return response;
  });
}

function postReversal(repository, original, reversal) {
  const state = activeAllocationState(repository, original.tenant_id, original.payment_id);
  if (!state.activeAllocations.some((row) => row.payment_allocation_id === original.payment_allocation_id)) {
    throw new Error("payment allocation is not active");
  }
  if (state.allocations.some((row) => row.reverses_payment_allocation_id === original.payment_allocation_id)) {
    throw new Error("payment allocation is already reversed");
  }
  const record = repository.create({
    ...original,
    ...reversal,
    model_type: "PaymentAllocation",
    payment_allocation_id: requiredString(reversal, "payment_allocation_id"),
    status: "reversed",
    reverses_payment_allocation_id: original.payment_allocation_id,
    reversed_at: reversal.reversed_at ?? new Date().toISOString(),
  });
  let invoice = null;
  if (original.allocation_type === "invoice_payment") {
    const current = repository.get({ tenant_id: original.tenant_id, model_type: "Invoice", invoice_id: original.invoice_id });
    if (!current) throw new Error("invoice is required for allocation reversal");
    const paid = Math.max(0, Math.round((Number(current.amount_paid ?? 0) - Number(original.amount ?? 0)) * 100) / 100);
    invoice = repository.update(
      { tenant_id: original.tenant_id, model_type: "Invoice", invoice_id: original.invoice_id },
      {
        amount_paid: paid,
        status: paid === 0 ? "issued" : paid >= Number(current.amount_due ?? 0) ? "paid" : "partially_paid",
        updates_database_rows: true,
      },
    );
  }
  const payment = repository.get({ tenant_id: original.tenant_id, model_type: "Payment", payment_id: original.payment_id });
  return { record, invoice, payment: updatePaymentProjection(repository, payment) };
}

export function reversePaymentAllocation({ repository, reversal, actor_id, idempotency_key } = {}) {
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString({ idempotency_key }, "idempotency_key");
  const tenantId = requiredString(reversal, "tenant_id");
  const originalId = requiredString(reversal, "reverses_payment_allocation_id");
  requiredString(reversal, "reason_code");
  const replay = repository.getIdempotency({ tenant_id: tenantId, idempotency_key: idempotencyKey });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const original = tx.get({ tenant_id: tenantId, model_type: "PaymentAllocation", payment_allocation_id: originalId });
    if (!original) throw new Error("payment allocation not found");
    const reversed = postReversal(tx, original, reversal);
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "payment.allocation.reverse",
        object_type: "PaymentAllocation",
        object_id: reversed.record.payment_allocation_id,
        idempotency_key: idempotencyKey,
      },
    });
    const response = Object.freeze({
      outcome: "created",
      reversed_allocation: reversed.record,
      invoice: reversed.invoice,
      payment: reversed.payment,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({ tenant_id: tenantId, idempotency_key: idempotencyKey, operation: "payment_allocation_reverse", response });
    return response;
  });
}

export function reallocateDirectFeeToInvoice({
  repository,
  tenant_id,
  payment_allocation_id,
  reversal_payment_allocation_id,
  invoice_payment_allocation_id,
  invoice_id,
  reason_code,
  actor_id,
  idempotency_key,
} = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString({ idempotency_key }, "idempotency_key");
  requiredString({ reason_code }, "reason_code");
  const replay = repository.getIdempotency({ tenant_id: tenantId, idempotency_key: idempotencyKey });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const original = tx.get({
      tenant_id: tenantId,
      model_type: "PaymentAllocation",
      payment_allocation_id: requiredString({ payment_allocation_id }, "payment_allocation_id"),
    });
    if (!original || original.allocation_type !== "direct_fee") throw new Error("active direct_fee allocation is required");
    const reversed = postReversal(tx, original, {
      payment_allocation_id: reversal_payment_allocation_id,
      reason_code,
      actor_id: actorId,
    });
    const posted = postAllocation(tx, {
      payment_allocation_id: invoice_payment_allocation_id,
      tenant_id: tenantId,
      payment_id: original.payment_id,
      allocation_type: "invoice_payment",
      invoice_id,
      amount: original.amount,
      currency: original.currency,
      allocated_at: new Date().toISOString(),
      actor_id: actorId,
      reason_code,
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "payment.reallocate_to_invoice",
        object_type: "PaymentAllocation",
        object_id: posted.record.payment_allocation_id,
        idempotency_key: idempotencyKey,
      },
    });
    const response = Object.freeze({
      outcome: "created",
      reversed_allocation: reversed.record,
      payment_allocation: posted.record,
      invoice: posted.invoice,
      payment: posted.payment,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({ tenant_id: tenantId, idempotency_key: idempotencyKey, operation: "payment_reallocate_to_invoice", response });
    return response;
  });
}

export function buildPaymentAllocationMigrationPlan({ repository, tenant_id } = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const payments = repository.list({ tenant_id: tenantId, model_type: "Payment" });
  const matches = repository
    .list({ tenant_id: tenantId, model_type: "PaymentMatch" })
    .filter((row) => !EXCLUDED_STATUSES.has(String(row.status ?? "").toLowerCase()));
  const allocations = repository.list({ tenant_id: tenantId, model_type: "PaymentAllocation" });
  const representedMatches = new Set(allocations.map((row) => optionalString(row.source_payment_match_id)).filter(Boolean));
  const matchesByPayment = new Map();
  for (const match of matches) {
    const rows = matchesByPayment.get(match.payment_id) ?? [];
    rows.push(match);
    matchesByPayment.set(match.payment_id, rows);
  }
  const invoicePaymentBackfill = matches
    .filter((match) => !representedMatches.has(match.payment_match_id))
    .map((match) => ({
      payment_allocation_id: `allocation:${match.payment_match_id}`,
      tenant_id: tenantId,
      payment_id: match.payment_id,
      invoice_id: match.invoice_id,
      allocation_type: "invoice_payment",
      amount: Number(match.amount ?? match.matched_amount ?? 0),
      currency: match.currency ?? null,
      matter_id: match.matter_id ?? null,
      allocated_at: match.matched_at ?? match.created_at ?? null,
      source_payment_match_id: match.payment_match_id,
    }))
    .sort((left, right) => left.payment_allocation_id.localeCompare(right.payment_allocation_id));
  const matchedPayments = payments
    .filter((row) => matchesByPayment.has(row.payment_id))
    .map((row) => ({
      payment_id: row.payment_id,
      payment_amount: Number(row.amount ?? 0),
      matched_amount: matchesByPayment.get(row.payment_id).reduce((total, match) => total + Number(match.amount ?? match.matched_amount ?? 0), 0),
    }))
    .sort((left, right) => left.payment_id.localeCompare(right.payment_id));
  const allocatedPaymentIds = new Set(allocations.map((row) => row.payment_id));
  const unallocatedPayments = payments
    .filter((row) => !matchesByPayment.has(row.payment_id) && !allocatedPaymentIds.has(row.payment_id))
    .map((row) => ({ payment_id: row.payment_id, amount: Number(row.amount ?? 0), currency: row.currency ?? null }))
    .sort((left, right) => left.payment_id.localeCompare(right.payment_id));
  return Object.freeze({
    tenant_id: tenantId,
    invoice_payment_backfill: Object.freeze(invoicePaymentBackfill),
    matched_payments: Object.freeze(matchedPayments),
    unallocated_payments: Object.freeze(unallocatedPayments),
    auto_promoted_revenue_count: 0,
    dry_run: true,
  });
}

export function backfillPaymentMatchesAsAllocations({
  repository,
  tenant_id,
  actor_id,
  idempotency_key,
  dry_run = true,
} = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const plan = buildPaymentAllocationMigrationPlan({ repository, tenant_id: tenantId });
  if (dry_run) return plan;
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString({ idempotency_key }, "idempotency_key");
  const replay = repository.getIdempotency({ tenant_id: tenantId, idempotency_key: idempotencyKey });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const created = [];
    for (const candidate of plan.invoice_payment_backfill) {
      const match = tx.get({
        tenant_id: tenantId,
        model_type: "PaymentMatch",
        payment_match_id: candidate.source_payment_match_id,
      });
      const payment = tx.get({ tenant_id: tenantId, model_type: "Payment", payment_id: candidate.payment_id });
      const invoice = tx.get({ tenant_id: tenantId, model_type: "Invoice", invoice_id: candidate.invoice_id });
      if (!match || !payment || !invoice) throw new Error("PaymentMatch backfill requires Payment and Invoice");
      if (payment.currency !== invoice.currency) throw new Error("PaymentMatch backfill currency mismatch");
      created.push(tx.create({
        ...candidate,
        model_type: "PaymentAllocation",
        amount: Number(candidate.amount),
        currency: candidate.currency ?? payment.currency,
        matter_id: candidate.matter_id ?? invoice.matter_id ?? payment.matter_id ?? null,
        client_group_id: invoice.client_group_id ?? payment.client_group_id ?? null,
        status: "posted",
        allocated_at: candidate.allocated_at ?? match.matched_at ?? match.created_at,
        actor_id: actorId,
        reason_code: "legacy_payment_match_backfill",
        migration_backfill: true,
      }));
    }
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "payment.allocation.backfill",
        object_type: "PaymentAllocation",
        object_id: "legacy-payment-match-backfill",
        idempotency_key: idempotencyKey,
        metadata: {
          created_count: created.length,
          unmatched_payment_count: plan.unallocated_payments.length,
          automatic_revenue_promotion_applied: false,
        },
      },
    });
    const response = Object.freeze({
      outcome: "created",
      created_count: created.length,
      payment_allocations: Object.freeze(created),
      unallocated_payments: plan.unallocated_payments,
      auto_promoted_revenue_count: 0,
      audit_event: auditEvent,
      dry_run: false,
      idempotent_replay: false,
    });
    tx.recordIdempotency({ tenant_id: tenantId, idempotency_key: idempotencyKey, operation: "payment_allocation_backfill", response });
    return response;
  });
}
