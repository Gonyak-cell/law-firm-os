import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
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
    const balance = Math.max(0, Number(invoice.amount_due ?? 0) - Number(invoice.amount_paid ?? 0));
    const record = tx.upsert({
      model_type: "ARBalance",
      ar_balance_id: ar_balance_id ?? `ar:${tenant_id}:${invoice_id}`,
      tenant_id,
      matter_id: invoice.matter_id,
      invoice_id,
      billing_client_party_id: invoice.billing_client_party_id,
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

export function createArAgingSnapshot({ repository, tenant_id, actor_id, idempotency_key, ar_aging_snapshot_id } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const balances = repository.list({ tenant_id, model_type: "ARBalance" });
  const replay = repository.getIdempotency({ tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({
      model_type: "ARAgingSnapshot",
      ar_aging_snapshot_id: ar_aging_snapshot_id ?? `ar-aging:${tenant_id}:${Date.now()}`,
      tenant_id,
      bucket_current: balances.filter((item) => Number(item.balance) === 0).reduce((sum, item) => sum + Number(item.balance), 0),
      bucket_1_30: balances.filter((item) => Number(item.balance) > 0).reduce((sum, item) => sum + Number(item.balance), 0),
      bucket_31_60: 0,
      bucket_61_90: 0,
      bucket_90_plus: 0,
      balance_count: balances.length,
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
