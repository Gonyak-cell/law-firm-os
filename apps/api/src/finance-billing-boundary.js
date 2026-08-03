import { approveTimeEntryForWip, createTimeEntry } from "../../../packages/time-expense/src/time-entry-service.js";
import { createFeeArrangement, findFeeArrangementForMatter } from "../../../packages/time-expense/src/fee-arrangement-service.js";
import { createExpense } from "../../../packages/time-expense/src/expense-service.js";
import { createDisbursement } from "../../../packages/time-expense/src/disbursement-service.js";
import { generateWipFromApprovedItems, lockWipSnapshot } from "../../../packages/billing/src/wip-service.js";
import {
  applyWriteDownOff,
  approvePreBillWithoutAdjustment,
  createPreBill,
  rejectPreBill,
} from "../../../packages/billing/src/prebill-service.js";
import { createInvoiceFromPreBill } from "../../../packages/billing/src/invoice-service.js";
import { importPayment } from "../../../packages/payments/src/payment-service.js";
import {
  allocatePayment,
  loadPaymentAllocationReferences,
} from "../../../packages/payments/src/payment-allocation-service.js";
import { matchPaymentToInvoice } from "../../../packages/payments/src/matching-service.js";
import { parsePreBillApprovalInput } from "./finance-prebill-boundary.js";

/**
 * Billing/payment runtime composition only. Authorization, response envelopes,
 * safe error mapping, and route dispatch remain in finance-runtime-context.js.
 * Each domain service owns its transaction, idempotency, and audit receipt.
 */

export function runFinanceBillingTimeEntryCreate({ repository, time_entry, actor_id, idempotency_key } = {}) {
  return createTimeEntry({ repository, time_entry, actor_id, idempotency_key });
}

export function runFinanceBillingTimeEntryApprove({ repository, tenant_id, time_entry_id, actor_id, idempotency_key } = {}) {
  return approveTimeEntryForWip({ repository, tenant_id, time_entry_id, actor_id, idempotency_key });
}

export function runFinanceBillingExpenseCreate({ repository, expense, actor_id, idempotency_key } = {}) {
  return createExpense({ repository, expense, actor_id, idempotency_key });
}

export function runFinanceBillingDisbursementCreate({ repository, disbursement, actor_id, idempotency_key } = {}) {
  return createDisbursement({ repository, disbursement, actor_id, idempotency_key });
}

export function runFinanceBillingFeeArrangementCreate({
  repository,
  fee_arrangement,
  rate_card,
  actor_id,
  idempotency_key,
} = {}) {
  const canonicalRateCard = rate_card ?? repository.get({
    tenant_id: fee_arrangement?.tenant_id,
    model_type: "RateCard",
    rate_card_id: fee_arrangement?.rate_card_id,
  });
  return createFeeArrangement({
    repository,
    fee_arrangement,
    rate_card: canonicalRateCard,
    actor_id,
    idempotency_key,
  });
}

export function runFinanceBillingWipGenerate({
  repository,
  tenant_id,
  matter_id,
  rate_card_id,
  fee_arrangement,
  fee_arrangement_id,
  actor_id,
  idempotency_key,
} = {}) {
  const rateCard = repository.get({
    tenant_id,
    model_type: "RateCard",
    rate_card_id: rate_card_id ?? "rate_cmp_g7_seed",
  });
  const feeArrangement = fee_arrangement ?? findFeeArrangementForMatter({
    repository,
    tenant_id,
    matter_id,
    fee_arrangement_id,
  });
  return generateWipFromApprovedItems({
    repository,
    tenant_id,
    matter_id,
    rate_card: rateCard,
    fee_arrangement: feeArrangement,
    actor_id,
    idempotency_key,
  });
}

export function runFinanceBillingWipSnapshotLock({
  repository,
  tenant_id,
  matter_id,
  wip_item_ids,
  wip_snapshot_id,
  actor_id,
  idempotency_key,
} = {}) {
  return lockWipSnapshot({
    repository,
    tenant_id,
    matter_id,
    wip_item_ids,
    wip_snapshot_id,
    actor_id,
    idempotency_key,
  });
}

export function runFinanceBillingPreBillCreate({ repository, prebill, actor_id, idempotency_key } = {}) {
  return createPreBill({ repository, prebill, actor_id, idempotency_key });
}

export function runFinanceBillingPreBillApprove({ repository, body, tenant_id, prebill_id, actor_id, idempotency_key } = {}) {
  const approvalBody = body ?? { tenant_id, prebill_id };
  const operation = Object.hasOwn(approvalBody, "adjustment")
    ? applyWriteDownOff({
        repository,
        adjustment: parsePreBillApprovalInput(approvalBody),
        actor_id,
        idempotency_key,
      })
    : approvePreBillWithoutAdjustment({
        repository,
        tenant_id,
        prebill_id,
        actor_id,
        idempotency_key,
      });
  return operation;
}

export function runFinanceBillingPreBillReject({
  repository,
  tenant_id,
  prebill_id,
  reason_code,
  actor_id,
  idempotency_key,
} = {}) {
  return rejectPreBill({ repository, tenant_id, prebill_id, reason_code, actor_id, idempotency_key });
}

export function runFinanceBillingInvoiceIssue({ repository, invoice, actor_id, idempotency_key } = {}) {
  return createInvoiceFromPreBill({ repository, invoice, actor_id, idempotency_key });
}

export function runFinanceBillingPaymentImport({ repository, payment, actor_id, idempotency_key } = {}) {
  return importPayment({ repository, payment, actor_id, idempotency_key });
}

export function runFinanceBillingPaymentMatchCreate({ repository, match, actor_id, idempotency_key } = {}) {
  return matchPaymentToInvoice({ repository, match, actor_id, idempotency_key });
}

function canonicalMatterId(value, source) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new TypeError(`${source} matter_id must be a string`);
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

function canonicalReferenceId(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function relatedPaymentMatterRecords({ repository, tenant_id, payment_id, invoice_id } = {}) {
  const related = [];
  for (const model_type of ["PaymentMatch", "PaymentAllocation"]) {
    for (const record of repository.list({ tenant_id, model_type })) {
      if ((payment_id && record.payment_id === payment_id) || (invoice_id && record.invoice_id === invoice_id)) {
        related.push(record);
      }
    }
  }
  return related;
}

function canonicalPaymentMatterIds({ repository, tenant_id, request, payment, invoice, payment_id, invoice_id, requireMatter = false, rejectContradictory = true } = {}) {
  const sources = [
    ["request", request?.matter_id],
    ["Payment", payment?.matter_id],
    ["Invoice", invoice?.matter_id],
  ];
  for (const record of relatedPaymentMatterRecords({ repository, tenant_id, payment_id, invoice_id })) {
    sources.push([record.model_type, record.matter_id]);
  }
  const normalized = sources
    .map(([source, value]) => canonicalMatterId(value, source))
    .filter(Boolean);
  const matters = [...new Set(normalized)];
  if (rejectContradictory && matters.length > 1) throw new Error("payment Matter scope mismatch");
  if (requireMatter && matters.length === 0) throw new Error("payment Matter scope is required");
  return matters.length > 0 ? matters : [null];
}

function loadPaymentMatchReferences({ repository, match, tenant_id } = {}) {
  const matchTenant = canonicalReferenceId(match?.tenant_id, "tenant_id");
  if (tenant_id !== undefined && String(tenant_id).trim() !== matchTenant) {
    throw new Error("payment match tenant mismatch");
  }
  return loadPaymentAllocationReferences({
    repository,
    allocation: {
      ...match,
      tenant_id: matchTenant,
      allocation_type: "invoice_payment",
    },
  });
}

export function financePaymentMatchMatterIds({ repository, match, tenant_id, rejectContradictory = true } = {}) {
  const canonicalTenant = canonicalReferenceId(tenant_id ?? match?.tenant_id, "tenant_id");
  const { payment, invoice } = loadPaymentMatchReferences({ repository, match, tenant_id: canonicalTenant });
  const paymentId = canonicalReferenceId(match.payment_id, "payment_id");
  const invoiceId = canonicalReferenceId(match.invoice_id, "invoice_id");
  return canonicalPaymentMatterIds({
    repository,
    tenant_id: canonicalTenant,
    request: match,
    payment,
    invoice,
    payment_id: paymentId,
    invoice_id: invoiceId,
    requireMatter: true,
    rejectContradictory,
  });
}

export function financePaymentAllocationMatterIds({ repository, allocation, tenant_id, rejectContradictory = true } = {}) {
  const canonicalAllocation = { ...allocation, tenant_id: tenant_id ?? allocation?.tenant_id };
  const { payment, invoice } = loadPaymentAllocationReferences({
    repository,
    allocation: canonicalAllocation,
  });
  const canonicalTenant = canonicalReferenceId(canonicalAllocation.tenant_id, "tenant_id");
  const paymentId = canonicalReferenceId(allocation.payment_id, "payment_id");
  const invoiceId = allocation.invoice_id === undefined || allocation.invoice_id === null
    ? null
    : canonicalReferenceId(allocation.invoice_id, "invoice_id");
  return canonicalPaymentMatterIds({
    repository,
    tenant_id: canonicalTenant,
    request: allocation,
    payment,
    invoice,
    payment_id: paymentId,
    invoice_id: invoiceId,
    requireMatter: allocation.allocation_type === "invoice_payment",
    rejectContradictory,
  });
}

export function runFinanceBillingPaymentAllocationCreate({ repository, allocation, actor_id, idempotency_key } = {}) {
  return allocatePayment({ repository, allocation, actor_id, idempotency_key });
}
