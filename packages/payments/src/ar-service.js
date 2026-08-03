import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";
import { projectInvoiceLifecycle } from "../../billing/src/invoice-service.js";
import {
  allocatePayment,
  reversePaymentAllocation,
} from "./payment-allocation-service.js";

const MS_PER_DAY = 86_400_000;

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function dateOnlyMs(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function requireDateOnly(value, field) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError(`${field} must be a valid ISO date`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new TypeError(`${field} must be a valid ISO date`);
  }
  return value;
}

function asOfDate(value) {
  if (value === undefined || value === null) return new Date().toISOString().slice(0, 10);
  return requireDateOnly(value, "as_of_date");
}

function daysPastDue({ dueDate, asOf }) {
  const due = dateOnlyMs(dueDate);
  const current = dateOnlyMs(asOf);
  if (due === null || current === null) return 0;
  return Math.floor((current - due) / MS_PER_DAY);
}

function bucketForDaysPastDue(days) {
  if (days <= 0) return "bucket_current";
  if (days <= 30) return "bucket_1_30";
  if (days <= 60) return "bucket_31_60";
  if (days <= 90) return "bucket_61_90";
  return "bucket_90_plus";
}

function agingBucketTotals({ repository, tenant_id, balances, as_of_date }) {
  const buckets = {
    bucket_current: 0,
    bucket_1_30: 0,
    bucket_31_60: 0,
    bucket_61_90: 0,
    bucket_90_plus: 0,
  };
  for (const balance of balances) {
    const rawAmount = Number(balance.balance ?? balance.outstanding_amount ?? 0);
    const amount = Number.isFinite(rawAmount) ? Math.max(0, rawAmount) : 0;
    if (amount === 0) continue;
    const invoice = balance.due_date
      ? null
      : repository.get({ tenant_id, model_type: "Invoice", invoice_id: balance.invoice_id });
    const dueDate = requireDateOnly(balance.due_date ?? invoice?.due_date, "ar_balance due_date");
    buckets[bucketForDaysPastDue(daysPastDue({ dueDate, asOf: as_of_date }))] += amount;
  }
  return buckets;
}

export function buildArAgingSnapshot({ repository, tenant_id, balances, as_of_date } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  const sourceBalances = Array.isArray(balances)
    ? balances
    : repository.list({ tenant_id, model_type: "ARBalance" });
  const agingAsOfDate = asOfDate(as_of_date);
  return Object.freeze({
    ...agingBucketTotals({ repository, tenant_id, balances: sourceBalances, as_of_date: agingAsOfDate }),
    balance_count: sourceBalances.length,
    as_of_date: agingAsOfDate,
    bucket_source: "due_date",
  });
}

function buildMatterArQueue({ repository, tenant_id, matter_id, as_of_date }) {
  const rows = [];
  const errors = [];
  const invoices = repository
    .list({ tenant_id, model_type: "Invoice" })
    .filter((invoice) => !matter_id || invoice.matter_id === matter_id)
    .sort((left, right) => String(left.invoice_id).localeCompare(String(right.invoice_id)));
  for (const invoice of invoices) {
    let projected;
    try {
      projected = projectInvoiceLifecycle({ invoice, as_of_date });
    } catch (error) {
      errors.push(Object.freeze({
        invoice_id: invoice.invoice_id,
        matter_id: invoice.matter_id,
        error_code: "invalid_invoice_lifecycle",
        error_message: error.message,
      }));
      continue;
    }
    if (["draft", "void"].includes(projected.lifecycle_status) || projected.outstanding_amount === 0) continue;
    let dueDate;
    try {
      dueDate = requireDateOnly(invoice.due_date, "invoice due_date");
    } catch (error) {
      errors.push(Object.freeze({
        invoice_id: invoice.invoice_id,
        matter_id: invoice.matter_id,
        error_code: "invalid_invoice_due_date",
        error_message: error.message,
      }));
      continue;
    }
    const pastDueDays = Math.max(0, daysPastDue({ dueDate, asOf: as_of_date }));
    rows.push(Object.freeze({
      invoice_id: invoice.invoice_id,
      invoice_number: invoice.invoice_number ?? null,
      matter_id: invoice.matter_id,
      billing_client_party_id: invoice.billing_client_party_id ?? null,
      currency: invoice.currency ?? "KRW",
      amount_due: Number(invoice.amount_due ?? 0),
      amount_paid: Number(invoice.amount_paid ?? 0),
      balance: projected.outstanding_amount,
      due_date: dueDate,
      days_past_due: pastDueDays,
      aging_bucket: bucketForDaysPastDue(daysPastDue({ dueDate, asOf: as_of_date })),
      lifecycle_status: projected.lifecycle_status,
    }));
  }
  rows.sort((left, right) => right.days_past_due - left.days_past_due || left.invoice_id.localeCompare(right.invoice_id));
  const buckets = {
    bucket_current: 0,
    bucket_1_30: 0,
    bucket_31_60: 0,
    bucket_61_90: 0,
    bucket_90_plus: 0,
  };
  for (const row of rows) buckets[row.aging_bucket] += row.balance;
  for (const key of Object.keys(buckets)) buckets[key] = Math.round(buckets[key] * 100) / 100;
  return Object.freeze({
    tenant_id,
    matter_id: matter_id ?? null,
    as_of_date,
    rows: Object.freeze(rows),
    errors: Object.freeze(errors),
    totals: Object.freeze({
      balance: Math.round(rows.reduce((total, row) => total + row.balance, 0) * 100) / 100,
      invoice_count: rows.length,
      error_count: errors.length,
      ...buckets,
    }),
  });
}

export function queryMatterArQueue({ repository, tenant_id, matter_id, as_of_date } = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const matterId = matter_id === undefined || matter_id === null ? null : requiredString({ matter_id }, "matter_id");
  const agingAsOfDate = asOfDate(as_of_date);
  return buildMatterArQueue({ repository, tenant_id: tenantId, matter_id: matterId, as_of_date: agingAsOfDate });
}

export function computeArBalance({ repository, tenant_id, invoice_id, actor_id, idempotency_key, ar_balance_id } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ invoice_id }, "invoice_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const idempotency = {
    tenant_id,
    idempotency_key,
    operation: "ar_balance_compute",
    actor_id,
    object_type: "Invoice",
    object_id: invoice_id,
    request: { tenant_id, invoice_id, ar_balance_id: ar_balance_id ?? null },
  };
  const replay = repository.getIdempotency(idempotency);
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const invoice = tx.get({ tenant_id, model_type: "Invoice", invoice_id });
    if (!invoice) throw new Error("Invoice not found");
    const projected = projectInvoiceLifecycle({ invoice });
    const excluded = ["draft", "void"].includes(projected.lifecycle_status);
    const dueDate = excluded ? invoice.due_date ?? null : requireDateOnly(invoice.due_date, "invoice due_date");
    const balance = excluded ? 0 : projected.outstanding_amount;
    const record = tx.upsert({
      model_type: "ARBalance",
      ar_balance_id: ar_balance_id ?? `ar:${tenant_id}:${invoice_id}`,
      tenant_id,
      matter_id: invoice.matter_id,
      invoice_id,
      billing_client_party_id: invoice.billing_client_party_id,
      due_date: dueDate,
      balance,
      lifecycle_status: projected.lifecycle_status,
      status: projected.lifecycle_status === "void" ? "void" : balance === 0 ? "closed" : "open",
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id,
        actor_id,
        action: "ar.balance.compute",
        object_type: "ARBalance",
        object_id: record.ar_balance_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "updated", ar_balance: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ ...idempotency, response });
    return response;
  });
}

export function reconcileMatterArQueue({
  repository,
  tenant_id,
  matter_id,
  as_of_date,
  actor_id,
  idempotency_key,
} = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const matterId = matter_id === undefined || matter_id === null ? null : requiredString({ matter_id }, "matter_id");
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString({ idempotency_key }, "idempotency_key");
  const agingAsOfDate = asOfDate(as_of_date);
  const idempotency = {
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
    operation: "matter_ar_reconcile",
    actor_id: actorId,
    object_type: matterId ? "Matter" : "ARBalance",
    object_id: matterId ?? "tenant-ar-queue",
    request: {
      tenant_id: tenantId,
      matter_id: matterId,
      as_of_date: as_of_date ?? null,
    },
  };
  const replay = repository.getIdempotency(idempotency);
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const balances = [];
    const invoices = tx
      .list({ tenant_id: tenantId, model_type: "Invoice" })
      .filter((invoice) => !matterId || invoice.matter_id === matterId);
    for (const invoice of invoices) {
      const projected = projectInvoiceLifecycle({ invoice, as_of_date: agingAsOfDate });
      const existing = tx
        .list({ tenant_id: tenantId, model_type: "ARBalance", invoice_id: invoice.invoice_id })
        .at(-1);
      if (["draft", "void"].includes(projected.lifecycle_status) && !existing) continue;
      const dueDate = ["draft", "void"].includes(projected.lifecycle_status)
        ? invoice.due_date ?? existing?.due_date ?? null
        : requireDateOnly(invoice.due_date, "invoice due_date");
      const balance = ["draft", "void"].includes(projected.lifecycle_status) ? 0 : projected.outstanding_amount;
      const pastDueDays = dueDate ? Math.max(0, daysPastDue({ dueDate, asOf: agingAsOfDate })) : 0;
      balances.push(tx.upsert({
        model_type: "ARBalance",
        ar_balance_id: existing?.ar_balance_id ?? `ar:${tenantId}:${invoice.invoice_id}`,
        tenant_id: tenantId,
        matter_id: invoice.matter_id,
        invoice_id: invoice.invoice_id,
        billing_client_party_id: invoice.billing_client_party_id ?? null,
        due_date: dueDate,
        balance,
        days_past_due: pastDueDays,
        aging_bucket: dueDate ? bucketForDaysPastDue(daysPastDue({ dueDate, asOf: agingAsOfDate })) : null,
        lifecycle_status: projected.lifecycle_status,
        status: projected.lifecycle_status === "void" ? "void" : balance === 0 ? "closed" : "open",
        reconciled_at: new Date().toISOString(),
      }));
    }
    const queue = buildMatterArQueue({
      repository: tx,
      tenant_id: tenantId,
      matter_id: matterId,
      as_of_date: agingAsOfDate,
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "matter.ar.reconcile",
        object_type: matterId ? "Matter" : "ARBalance",
        object_id: matterId ?? "tenant-ar-queue",
        idempotency_key: idempotencyKey,
        metadata: { balance_count: balances.length, queue_count: queue.rows.length },
      },
    });
    const response = Object.freeze({
      outcome: "updated",
      ar_balances: Object.freeze(balances),
      ar_queue: queue,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({ ...idempotency, response });
    return response;
  });
}

export function applyMatterPayment({
  repository,
  tenant_id,
  matter_id,
  payment_id,
  invoice_id,
  amount,
  payment_allocation_id,
  as_of_date,
  actor_id,
  idempotency_key,
} = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const matterId = requiredString({ matter_id }, "matter_id");
  const paymentId = requiredString({ payment_id }, "payment_id");
  const invoiceId = requiredString({ invoice_id }, "invoice_id");
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString({ idempotency_key }, "idempotency_key");
  const agingAsOfDate = asOfDate(as_of_date);
  const idempotency = {
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
    operation: "matter_payment_apply",
    actor_id: actorId,
    object_type: "Matter",
    object_id: matterId,
    request: {
      tenant_id: tenantId,
      matter_id: matterId,
      payment_id: paymentId,
      invoice_id: invoiceId,
      amount,
      payment_allocation_id: payment_allocation_id ?? null,
      as_of_date: as_of_date ?? null,
    },
  };
  const replay = repository.getIdempotency(idempotency);
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const payment = tx.get({ tenant_id: tenantId, model_type: "Payment", payment_id: paymentId });
    if (!payment) throw new Error("Payment not found");
    const invoice = tx.get({ tenant_id: tenantId, model_type: "Invoice", invoice_id: invoiceId });
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.matter_id !== matterId) throw new Error("Invoice matter mismatch");
    if (payment.matter_id && payment.matter_id !== matterId) throw new Error("Payment matter mismatch");
    const projected = projectInvoiceLifecycle({ invoice, as_of_date: agingAsOfDate });
    if (["draft", "void", "paid"].includes(projected.lifecycle_status)) {
      throw new Error("Matter payment requires an outstanding sent invoice");
    }
    const allocated = allocatePayment({
      repository: tx,
      allocation: {
        payment_allocation_id: payment_allocation_id ?? `allocation:${paymentId}:${invoiceId}:${idempotencyKey}`,
        tenant_id: tenantId,
        matter_id: matterId,
        payment_id: paymentId,
        invoice_id: invoiceId,
        allocation_type: "invoice_payment",
        amount,
        currency: payment.currency ?? invoice.currency ?? "KRW",
      },
      actor_id: actorId,
      idempotency_key: `${idempotencyKey}:allocation`,
    });
    const reconciled = reconcileMatterArQueue({
      repository: tx,
      tenant_id: tenantId,
      matter_id: matterId,
      as_of_date: agingAsOfDate,
      actor_id: actorId,
      idempotency_key: `${idempotencyKey}:ar`,
    });
    const arBalance = reconciled.ar_balances.find((balance) => balance.invoice_id === invoiceId) ?? null;
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "matter.payment.apply",
        object_type: "Matter",
        object_id: matterId,
        idempotency_key: idempotencyKey,
        metadata: { payment_id: paymentId, invoice_id: invoiceId, amount: Number(amount) },
      },
    });
    const response = Object.freeze({
      outcome: "updated",
      payment_allocation: allocated.payment_allocation,
      payment: allocated.payment,
      invoice: allocated.invoice,
      ar_balance: arBalance,
      ar_queue: reconciled.ar_queue,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({ ...idempotency, response });
    return response;
  });
}

function paymentAllocationScopeNotFound() {
  return Object.assign(new Error("Payment allocation not found"), {
    status: 404,
    status_code: 404,
  });
}

export function reverseMatterPaymentAllocation({
  repository,
  tenant_id,
  matter_id,
  payment_id,
  payment_allocation_id,
  reversal_payment_allocation_id,
  reason_code,
  as_of_date,
  idempotency_as_of_date = as_of_date,
  actor_id,
  idempotency_key,
} = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const matterId = requiredString({ matter_id }, "matter_id");
  const paymentId = requiredString({ payment_id }, "payment_id");
  const allocationId = requiredString({ payment_allocation_id }, "payment_allocation_id");
  const reversalId = reversal_payment_allocation_id
    ? requiredString({ reversal_payment_allocation_id }, "reversal_payment_allocation_id")
    : `reversal:${allocationId}:${requiredString({ idempotency_key }, "idempotency_key")}`;
  const reasonCode = requiredString({ reason_code }, "reason_code");
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString({ idempotency_key }, "idempotency_key");
  const agingAsOfDate = asOfDate(as_of_date);
  const idempotency = {
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
    operation: "matter_payment_allocation_reverse",
    actor_id: actorId,
    object_type: "Matter",
    object_id: matterId,
    request: {
      tenant_id: tenantId,
      matter_id: matterId,
      payment_id: paymentId,
      payment_allocation_id: allocationId,
      reversal_payment_allocation_id: reversalId,
      reason_code: reasonCode,
      as_of_date: idempotency_as_of_date ?? null,
    },
  };
  const replay = repository.getIdempotency(idempotency);
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const original = tx.get({
      tenant_id: tenantId,
      model_type: "PaymentAllocation",
      payment_allocation_id: allocationId,
    });
    if (!original) throw Object.assign(new Error("Payment allocation not found"), { status: 404 });
    const payment = tx.get({
      tenant_id: tenantId,
      model_type: "Payment",
      payment_id: original.payment_id,
    });
    const invoice = original.invoice_id
      ? tx.get({
          tenant_id: tenantId,
          model_type: "Invoice",
          invoice_id: original.invoice_id,
        })
      : null;
    if (
      original.matter_id !== matterId
      || original.payment_id !== paymentId
      || !payment
      || payment.matter_id !== matterId
      || (original.invoice_id && (!invoice || invoice.matter_id !== matterId))
    ) {
      throw paymentAllocationScopeNotFound();
    }
    const reversed = reversePaymentAllocation({
      repository: tx,
      reversal: {
        payment_allocation_id: reversalId,
        tenant_id: tenantId,
        reverses_payment_allocation_id: allocationId,
        reason_code: reasonCode,
      },
      actor_id: actorId,
      idempotency_key: `${idempotencyKey}:allocation`,
    });
    const reconciled = reconcileMatterArQueue({
      repository: tx,
      tenant_id: tenantId,
      matter_id: matterId,
      as_of_date: agingAsOfDate,
      actor_id: actorId,
      idempotency_key: `${idempotencyKey}:ar`,
    });
    const arBalance = original.invoice_id
      ? reconciled.ar_balances.find((balance) => balance.invoice_id === original.invoice_id) ?? null
      : null;
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "matter.payment.allocation.reverse",
        object_type: "Matter",
        object_id: matterId,
        idempotency_key: idempotencyKey,
        metadata: {
          payment_id: original.payment_id,
          invoice_id: original.invoice_id ?? null,
          payment_allocation_id: original.payment_allocation_id,
          reversal_payment_allocation_id: reversed.reversed_allocation.payment_allocation_id,
          reason_code: reasonCode,
        },
      },
    });
    const response = Object.freeze({
      outcome: "updated",
      reversed_allocation: reversed.reversed_allocation,
      payment: reversed.payment,
      invoice: reversed.invoice,
      ar_balance: arBalance,
      ar_queue: reconciled.ar_queue,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({ ...idempotency, response });
    return response;
  });
}

export function createArAgingSnapshot({ repository, tenant_id, actor_id, idempotency_key, ar_aging_snapshot_id, as_of_date } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const balances = repository.list({ tenant_id, model_type: "ARBalance" });
  const agingAsOfDate = asOfDate(as_of_date);
  const buckets = agingBucketTotals({ repository, tenant_id, balances, as_of_date: agingAsOfDate });
  const replay = repository.getIdempotency({ tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({
      model_type: "ARAgingSnapshot",
      ar_aging_snapshot_id: ar_aging_snapshot_id ?? `ar-aging:${tenant_id}:${Date.now()}`,
      tenant_id,
      ...buckets,
      balance_count: balances.length,
      as_of_date: agingAsOfDate,
      bucket_source: "due_date",
      generated_at: new Date().toISOString(),
      status: "generated",
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id,
        actor_id,
        action: "ar.aging.snapshot",
        object_type: "ARAgingSnapshot",
        object_id: record.ar_aging_snapshot_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", ar_aging_snapshot: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id, idempotency_key, operation: "ar_aging_snapshot", response });
    return response;
  });
}
