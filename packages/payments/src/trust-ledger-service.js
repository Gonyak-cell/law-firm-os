import { randomUUID } from "node:crypto";
import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function moneyValue(value, field) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new TypeError(`${field} must be positive`);
  return Math.round(parsed * 100) / 100;
}

function balanceId({ tenant_id, matter_id, currency }) {
  return `trust_balance:${tenant_id}:${matter_id}:${currency}`;
}

function getBalance(repository, ref) {
  const current = repository.get({
    tenant_id: ref.tenant_id,
    model_type: "TrustBalance",
    trust_balance_id: balanceId(ref),
  });
  if (current) return current;
  return Object.freeze({
    model_type: "TrustBalance",
    trust_balance_id: balanceId(ref),
    tenant_id: ref.tenant_id,
    matter_id: ref.matter_id,
    client_group_id: ref.client_group_id ?? null,
    currency: ref.currency,
    available_balance: 0,
    deposit_total: 0,
    drawdown_total: 0,
    refund_total: 0,
    refund_liability_amount: 0,
    trust_account_type: ref.trust_account_type ?? "client_trust",
    segregated_client_funds: true,
    negative_trust_balance_blocked: true,
    status: "open",
  });
}

function writeBalance(tx, current, patch = {}) {
  const available = Math.round(Number(patch.available_balance ?? current.available_balance ?? 0) * 100) / 100;
  const refundLiability = Math.round(Number(patch.refund_liability_amount ?? current.refund_liability_amount ?? 0) * 100) / 100;
  if (available < 0 || refundLiability < 0) throw new Error("negative trust balance blocked");
  return tx.upsert({
    ...current,
    ...patch,
    model_type: "TrustBalance",
    available_balance: available,
    refund_liability_amount: refundLiability,
    segregated_client_funds: true,
    negative_trust_balance_blocked: true,
    updates_database_rows: current.created_at ? true : false,
  });
}

function recordAudit({ tx, record, actor_id, idempotency_key, action }) {
  return appendFinanceAuditEvent({
    repository: tx,
    event: {
      tenant_id: record.tenant_id,
      actor_id,
      action,
      object_type: "TrustLedgerEntry",
      object_id: record.trust_ledger_entry_id,
      idempotency_key,
      metadata: {
        trust_account_type: record.trust_account_type,
        segregated_client_funds: true,
        negative_trust_balance_blocked: true,
      },
    },
  });
}

function replayOrThrow(repository, tenantId, idempotencyKey) {
  const replay = repository.getIdempotency({ tenant_id: tenantId, idempotency_key: idempotencyKey });
  return replay ? Object.freeze({ ...replay.response, idempotent_replay: true }) : null;
}

export function receiveTrustDeposit({ repository, deposit, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(deposit, "tenant_id");
  requiredString(deposit, "matter_id");
  const amount = moneyValue(deposit.amount, "amount");
  const currency = deposit.currency ?? "KRW";
  const replay = replayOrThrow(repository, deposit.tenant_id, idempotency_key);
  if (replay) return replay;

  return repository.transaction((tx) => {
    const current = getBalance(tx, {
      tenant_id: deposit.tenant_id,
      matter_id: deposit.matter_id,
      client_group_id: deposit.client_group_id,
      currency,
      trust_account_type: deposit.trust_account_type,
    });
    const record = tx.create({
      ...deposit,
      model_type: "TrustLedgerEntry",
      trust_ledger_entry_id: deposit.trust_ledger_entry_id ?? `trust_ledger_deposit_${randomUUID()}`,
      amount,
      currency,
      entry_type: "deposit",
      invoice_id: null,
      drawdown_amount: 0,
      refund_liability_delta: amount,
      trust_account_type: deposit.trust_account_type ?? current.trust_account_type ?? "client_trust",
      segregated_client_funds: true,
      negative_trust_balance_blocked: true,
      posted_at: deposit.posted_at ?? new Date().toISOString(),
      status: "posted",
    });
    const balance = writeBalance(tx, current, {
      client_group_id: deposit.client_group_id ?? current.client_group_id ?? null,
      available_balance: Number(current.available_balance ?? 0) + amount,
      deposit_total: Number(current.deposit_total ?? 0) + amount,
      refund_liability_amount: Number(current.refund_liability_amount ?? 0) + amount,
      status: "open",
    });
    const auditEvent = recordAudit({ tx, record, actor_id, idempotency_key, action: "trust_ledger.deposit.receive" });
    const response = Object.freeze({
      outcome: "created",
      trust_ledger_entry: record,
      trust_balance: balance,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "trust_deposit_receive", response });
    return response;
  });
}

export function drawdownTrustToInvoice({ repository, drawdown, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(drawdown, "tenant_id");
  requiredString(drawdown, "matter_id");
  requiredString(drawdown, "invoice_id");
  const amount = moneyValue(drawdown.amount, "amount");
  const currency = drawdown.currency ?? "KRW";
  const replay = replayOrThrow(repository, drawdown.tenant_id, idempotency_key);
  if (replay) return replay;

  return repository.transaction((tx) => {
    const invoice = tx.get({ tenant_id: drawdown.tenant_id, model_type: "Invoice", invoice_id: drawdown.invoice_id });
    if (!invoice) throw new Error("invoice is required for trust drawdown");
    if (invoice.matter_id !== drawdown.matter_id) throw new Error("trust drawdown matter mismatch");
    const current = getBalance(tx, { tenant_id: drawdown.tenant_id, matter_id: drawdown.matter_id, currency });
    const available = Number(current.available_balance ?? 0);
    if (amount > available) throw new Error("negative trust balance blocked");
    const invoiceOutstanding = Math.max(0, Number(invoice.amount_due ?? 0) - Number(invoice.amount_paid ?? 0));
    if (amount > invoiceOutstanding) throw new Error("trust drawdown exceeds invoice outstanding");
    const record = tx.create({
      ...drawdown,
      model_type: "TrustLedgerEntry",
      trust_ledger_entry_id: drawdown.trust_ledger_entry_id ?? `trust_ledger_drawdown_${randomUUID()}`,
      amount,
      currency,
      entry_type: "drawdown",
      drawdown_amount: amount,
      refund_liability_delta: -amount,
      trust_account_type: current.trust_account_type ?? "client_trust",
      segregated_client_funds: true,
      negative_trust_balance_blocked: true,
      posted_at: drawdown.posted_at ?? new Date().toISOString(),
      status: "posted",
    });
    const balance = writeBalance(tx, current, {
      available_balance: available - amount,
      drawdown_total: Number(current.drawdown_total ?? 0) + amount,
      refund_liability_amount: Number(current.refund_liability_amount ?? 0) - amount,
      status: available - amount === 0 ? "cleared" : "open",
    });
    const paid = Number(invoice.amount_paid ?? 0) + amount;
    const updatedInvoice = tx.update(
      { tenant_id: drawdown.tenant_id, model_type: "Invoice", invoice_id: drawdown.invoice_id },
      {
        amount_paid: paid,
        trust_drawdown_amount: Number(invoice.trust_drawdown_amount ?? 0) + amount,
        status: paid >= Number(invoice.amount_due ?? 0) ? "paid" : "partially_paid",
        updates_database_rows: true,
      },
    );
    const auditEvent = recordAudit({ tx, record, actor_id, idempotency_key, action: "trust_ledger.drawdown.invoice" });
    const response = Object.freeze({
      outcome: "created",
      trust_ledger_entry: record,
      trust_balance: balance,
      invoice: updatedInvoice,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "trust_drawdown_invoice", response });
    return response;
  });
}

export function recordTrustRefundLiability({ repository, refund, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(refund, "tenant_id");
  requiredString(refund, "matter_id");
  const amount = moneyValue(refund.amount, "amount");
  const currency = refund.currency ?? "KRW";
  const replay = replayOrThrow(repository, refund.tenant_id, idempotency_key);
  if (replay) return replay;

  return repository.transaction((tx) => {
    const current = getBalance(tx, { tenant_id: refund.tenant_id, matter_id: refund.matter_id, currency });
    const available = Number(current.available_balance ?? 0);
    if (amount > available) throw new Error("negative trust balance blocked");
    const record = tx.create({
      ...refund,
      model_type: "TrustLedgerEntry",
      trust_ledger_entry_id: refund.trust_ledger_entry_id ?? `trust_ledger_refund_${randomUUID()}`,
      amount,
      currency,
      entry_type: "refund_liability",
      invoice_id: null,
      drawdown_amount: 0,
      refund_liability_delta: -amount,
      refund_liability_recognized: true,
      trust_account_type: current.trust_account_type ?? "client_trust",
      segregated_client_funds: true,
      negative_trust_balance_blocked: true,
      posted_at: refund.posted_at ?? new Date().toISOString(),
      status: "posted",
    });
    const balance = writeBalance(tx, current, {
      available_balance: available - amount,
      refund_total: Number(current.refund_total ?? 0) + amount,
      refund_liability_amount: Number(current.refund_liability_amount ?? 0) - amount,
      status: available - amount === 0 ? "cleared" : "open",
    });
    const auditEvent = recordAudit({ tx, record, actor_id, idempotency_key, action: "trust_ledger.refund_liability.record" });
    const response = Object.freeze({
      outcome: "created",
      trust_ledger_entry: record,
      trust_balance: balance,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "trust_refund_liability", response });
    return response;
  });
}

export function getTrustBalanceReport({ repository, tenant_id, matter_id, currency } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  const items = repository
    .list({ tenant_id, model_type: "TrustBalance", matter_id })
    .filter((item) => !currency || item.currency === currency)
    .map((item) => Object.freeze({ ...item, segregated_client_funds: true, negative_trust_balance_blocked: true }));
  const summary = items.reduce(
    (total, item) => ({
      available_balance: total.available_balance + Number(item.available_balance ?? 0),
      refund_liability_amount: total.refund_liability_amount + Number(item.refund_liability_amount ?? 0),
      deposit_total: total.deposit_total + Number(item.deposit_total ?? 0),
      drawdown_total: total.drawdown_total + Number(item.drawdown_total ?? 0),
      refund_total: total.refund_total + Number(item.refund_total ?? 0),
    }),
    { available_balance: 0, refund_liability_amount: 0, deposit_total: 0, drawdown_total: 0, refund_total: 0 },
  );
  return Object.freeze({
    items: Object.freeze(items),
    summary: Object.freeze({
      ...summary,
      tenant_id,
      matter_id: matter_id ?? null,
      currency: currency ?? null,
      segregated_client_funds: true,
      negative_trust_balance_blocked: true,
      production_ready_claim: false,
    }),
  });
}
