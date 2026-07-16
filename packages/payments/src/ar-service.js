import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";

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
    const invoice = balance.due_date
      ? null
      : repository.get({ tenant_id, model_type: "Invoice", invoice_id: balance.invoice_id });
    const dueDate = requireDateOnly(balance.due_date ?? invoice?.due_date, "ar_balance due_date");
    buckets[bucketForDaysPastDue(daysPastDue({ dueDate, asOf: as_of_date }))] += amount;
  }
  return buckets;
}

export function computeArBalance({ repository, tenant_id, invoice_id, actor_id, idempotency_key, ar_balance_id } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ invoice_id }, "invoice_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const replay = repository.getIdempotency({ tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const invoice = tx.get({ tenant_id, model_type: "Invoice", invoice_id });
    if (!invoice) throw new Error("Invoice not found");
    const dueDate = requireDateOnly(invoice.due_date, "invoice due_date");
    const balance = Math.max(0, Number(invoice.amount_due ?? 0) - Number(invoice.amount_paid ?? 0));
    const record = tx.upsert({
      model_type: "ARBalance",
      ar_balance_id: ar_balance_id ?? `ar:${tenant_id}:${invoice_id}`,
      tenant_id,
      matter_id: invoice.matter_id,
      invoice_id,
      billing_client_party_id: invoice.billing_client_party_id,
      due_date: dueDate,
      balance,
      status: balance === 0 ? "closed" : "open",
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
    tx.recordIdempotency({ tenant_id, idempotency_key, operation: "ar_balance_compute", response });
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
