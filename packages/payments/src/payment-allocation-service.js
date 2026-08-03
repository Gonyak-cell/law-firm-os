import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";

export {
  backfillPaymentMatchesAsAllocations,
  buildPaymentAllocationMigrationPlan,
} from "./payment-allocation-migration.js";

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

function invoiceLifecycleStatus(invoice) {
  const status = invoice.lifecycle_status ?? invoice.status;
  if (status === "issued") return "sent";
  if (status === "partially_paid") return "partial";
  return status;
}

function invoicePaymentPatch(invoice, paid) {
  const fullyPaid = paid >= Number(invoice.amount_due ?? 0);
  const lifecycleStatus = fullyPaid ? "paid" : paid > 0 ? "partial" : "sent";
  const canonicalStatus = invoice.lifecycle_contract === "small_firm_v1";
  const outstandingAmount = Math.max(0, Math.round((Number(invoice.amount_due ?? 0) - paid) * 100) / 100);
  return {
    amount_paid: paid,
    outstanding_amount: outstandingAmount,
    lifecycle_status: lifecycleStatus,
    status: fullyPaid
      ? "paid"
      : paid > 0
        ? canonicalStatus ? "partial" : "partially_paid"
        : canonicalStatus ? "sent" : "issued",
    updates_database_rows: true,
  };
}

function requireMatchingInvoiceProvenance(payment, allocation, invoice) {
  const paymentMatterId = optionalString(payment.matter_id);
  const invoiceMatterId = optionalString(invoice.matter_id);
  if (paymentMatterId && invoiceMatterId && paymentMatterId !== invoiceMatterId) {
    throw new Error("payment Matter must match Invoice Matter");
  }
  const paymentClientGroupId = optionalString(payment.client_group_id);
  const invoiceClientGroupId = optionalString(invoice.client_group_id);
  if (paymentClientGroupId && invoiceClientGroupId && paymentClientGroupId !== invoiceClientGroupId) {
    throw new Error("payment client group must match Invoice client group");
  }
  const allocationMatterId = optionalString(allocation.matter_id);
  if (allocationMatterId && invoiceMatterId && allocationMatterId !== invoiceMatterId) {
    throw new Error("allocation Matter must match Invoice Matter");
  }
  const allocationClientGroupId = optionalString(allocation.client_group_id);
  if (allocationClientGroupId && invoiceClientGroupId && allocationClientGroupId !== invoiceClientGroupId) {
    throw new Error("allocation client group must match Invoice client group");
  }
}

function requireMatchingAllocationProvenance(payment, allocation) {
  const paymentMatterId = optionalString(payment.matter_id);
  const allocationMatterId = optionalString(allocation.matter_id);
  if (paymentMatterId && allocationMatterId && paymentMatterId !== allocationMatterId) {
    throw new Error("payment Matter must match allocation Matter");
  }
  const paymentClientGroupId = optionalString(payment.client_group_id);
  const allocationClientGroupId = optionalString(allocation.client_group_id);
  if (paymentClientGroupId && allocationClientGroupId && paymentClientGroupId !== allocationClientGroupId) {
    throw new Error("payment client group must match allocation client group");
  }
}

export function loadPaymentAllocationReferences({ repository, allocation } = {}) {
  const tenantId = requiredString(allocation, "tenant_id");
  const paymentId = requiredString(allocation, "payment_id");
  const payment = repository.get({ tenant_id: tenantId, model_type: "Payment", payment_id: paymentId });
  if (!payment) throw new Error("payment is required for allocation");
  let invoice = null;
  if (allocation.allocation_type === "invoice_payment") {
    const invoiceId = requiredString(allocation, "invoice_id");
    invoice = repository.get({ tenant_id: tenantId, model_type: "Invoice", invoice_id: invoiceId });
    if (!invoice) throw new Error("invoice is required for invoice_payment");
  }
  return Object.freeze({ payment, invoice });
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

function validateAllocationTarget(payment, allocation, amount, canonicalInvoice) {
  const type = requiredString(allocation, "allocation_type");
  if (!PAYMENT_ALLOCATION_TYPES.includes(type)) throw new TypeError("allocation_type is invalid");
  requireMatchingAllocationProvenance(payment, allocation);
  const invoiceId = optionalString(allocation.invoice_id);
  if (type !== "invoice_payment" && invoiceId) throw new TypeError("invoice_id is only allowed for invoice_payment");
  const currency = optionalString(allocation.currency)?.toUpperCase() ?? optionalString(payment.currency)?.toUpperCase() ?? "KRW";
  if (currency !== optionalString(payment.currency)?.toUpperCase()) throw new Error("allocation currency must match payment currency");

  let invoice = null;
  let matterId = optionalString(allocation.matter_id) ?? optionalString(payment.matter_id);
  let clientGroupId = optionalString(allocation.client_group_id) ?? optionalString(payment.client_group_id);
  if (type === "invoice_payment") {
    requiredString(allocation, "invoice_id");
    invoice = canonicalInvoice;
    if (!invoice) throw new Error("invoice is required for invoice_payment");
    requireMatchingInvoiceProvenance(payment, allocation, invoice);
    if (["draft", "void"].includes(invoiceLifecycleStatus(invoice))) {
      throw new Error("invoice_payment requires a sent invoice");
    }
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
  const { payment, invoice } = loadPaymentAllocationReferences({ repository, allocation });
  const before = activeAllocationState(repository, tenantId, paymentId);
  const available = Math.max(0, Number(payment.amount ?? 0) - before.allocatedAmount);
  if (amount > available) throw new Error("allocation amount exceeds available payment");
  const target = validateAllocationTarget(payment, allocation, amount, invoice);
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
      invoicePaymentPatch(target.invoice, paid),
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
  const objectType = compatibility_payment_match ? "PaymentMatch" : "PaymentAllocation";
  const objectId = compatibility_payment_match?.payment_match_id ?? allocation.payment_allocation_id;
  const idempotency = {
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
    operation: "payment_allocate",
    actor_id: actorId,
    object_type: objectType,
    object_id: objectId,
    request: {
      allocation,
      compatibility_payment_match,
    },
  };
  const replay = repository.getIdempotency(idempotency);
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
    tx.recordIdempotency({ ...idempotency, response });
    return response;
  });
}

function postReversal(repository, original, reversal, actorId) {
  const state = activeAllocationState(repository, original.tenant_id, original.payment_id);
  if (!state.activeAllocations.some((row) => row.payment_allocation_id === original.payment_allocation_id)) {
    throw new Error("payment allocation is not active");
  }
  if (state.allocations.some((row) => row.reverses_payment_allocation_id === original.payment_allocation_id)) {
    throw new Error("payment allocation is already reversed");
  }
  const record = repository.create({
    ...original,
    model_type: "PaymentAllocation",
    payment_allocation_id: requiredString(reversal, "payment_allocation_id"),
    status: "reversed",
    reverses_payment_allocation_id: original.payment_allocation_id,
    actor_id: actorId,
    reason_code: requiredString(reversal, "reason_code"),
    reversed_at: reversal.reversed_at ?? new Date().toISOString(),
  });
  let invoice = null;
  if (original.allocation_type === "invoice_payment") {
    const current = repository.get({ tenant_id: original.tenant_id, model_type: "Invoice", invoice_id: original.invoice_id });
    if (!current) throw new Error("invoice is required for allocation reversal");
    const paid = Math.max(0, Math.round((Number(current.amount_paid ?? 0) - Number(original.amount ?? 0)) * 100) / 100);
    invoice = repository.update(
      { tenant_id: original.tenant_id, model_type: "Invoice", invoice_id: original.invoice_id },
      invoicePaymentPatch(current, paid),
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
  const idempotency = {
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
    operation: "payment_allocation_reverse",
    actor_id: actorId,
    object_type: "PaymentAllocation",
    object_id: requiredString(reversal, "payment_allocation_id"),
    request: { reversal },
  };
  const replay = repository.getIdempotency(idempotency);
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const original = tx.get({ tenant_id: tenantId, model_type: "PaymentAllocation", payment_allocation_id: originalId });
    if (!original) throw new Error("payment allocation not found");
    const reversed = postReversal(tx, original, reversal, actorId);
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
    tx.recordIdempotency({ ...idempotency, response });
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
    }, actorId);
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
