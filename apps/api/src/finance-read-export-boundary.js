import { buildArAgingSnapshot, createArAgingSnapshot } from "../../../packages/payments/src/ar-service.js";
import { createAccountingCsvExport } from "../../../packages/payments/src/accounting-export-service.js";
import { getTrustBalanceReport } from "../../../packages/payments/src/trust-ledger-service.js";

// Read/export composition only. Route authorization, per-item permission
// trimming, response envelopes, and sensitive-read audit receipts remain in
// finance-runtime-context.js. The domain services below remain responsible for
// their existing calculation, transaction, idempotency, and write boundaries.

export function sanitizeFinanceReadItem(record = {}) {
  const { bank_reference, lines, credential_material, ...safe } = record;
  return Object.freeze({
    ...safe,
    bank_reference_included: false,
    journal_lines_included: false,
    credential_material_included: false,
    production_ready_claim: false,
  });
}

function sanitizeAccountingExport(record = {}) {
  return Object.freeze({
    accounting_export_id: record.accounting_export_id,
    tenant_id: record.tenant_id,
    export_format: record.export_format,
    status: record.status,
    from_date: record.from_date,
    to_date: record.to_date,
    csv_text: record.csv_text,
    csv_sha256: record.csv_sha256,
    row_count: record.row_count,
    debit_total: record.debit_total,
    credit_total: record.credit_total,
    balanced: record.balanced,
    bank_reference_included: false,
    credential_material_included: false,
    raw_journal_payload_included: false,
    production_ready_claim: false,
  });
}

const SENSITIVE_AUDIT_KEY = /(?:^|_)(?:raw(?:_.*)?payload|journal_lines?|credential(?:_material)?|password|passphrase|token|secret|bank_reference|source_payload|access_key|private_key)(?:$|_)/iu;
const SENSITIVE_AUDIT_MARKERS = new Set([
  "raw_payload_included",
  "credential_material_included",
  "bank_reference_included",
  "journal_lines_included",
  "raw_journal_payload_included",
]);

function sanitizeAuditValue(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(sanitizeAuditValue));
  if (!value || typeof value !== "object") return value;
  const safe = {};
  for (const [key, nested] of Object.entries(value)) {
    if (SENSITIVE_AUDIT_MARKERS.has(key)) {
      safe[key] = false;
      continue;
    }
    if (SENSITIVE_AUDIT_KEY.test(key)) continue;
    safe[key] = sanitizeAuditValue(nested);
  }
  return Object.freeze(safe);
}

export function sanitizeFinanceAuditEvent(event = {}) {
  return sanitizeAuditValue(event);
}

function trustBalanceReportFromRecords({ records, tenant_id, matter_id, currency }) {
  const items = records
    .filter((item) => item.tenant_id === tenant_id)
    .filter((item) => !matter_id || item.matter_id === matter_id)
    .filter((item) => !currency || item.currency === currency)
    .map((item) => Object.freeze({
      ...item,
      segregated_client_funds: true,
      negative_trust_balance_blocked: true,
    }));
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

export function runFinanceTrustBalanceRead({ repository, tenant_id, matter_id, currency, sourceRecords } = {}) {
  const report = Array.isArray(sourceRecords)
    ? trustBalanceReportFromRecords({ records: sourceRecords, tenant_id, matter_id, currency })
    : getTrustBalanceReport({ repository, tenant_id, matter_id, currency });
  return Object.freeze({
    items: Object.freeze(report.items.map(sanitizeFinanceReadItem)),
    summary: report.summary,
  });
}

export function runFinanceArAgingRead({
  repository,
  tenant_id,
  actor_id,
  as_of_date,
  idempotency_key,
  ar_aging_snapshot_id,
  sourceRecords,
  sourceRecordCount,
} = {}) {
  let snapshots = repository.list({ tenant_id, model_type: "ARAgingSnapshot" });
  if (as_of_date) snapshots = snapshots.filter((snapshot) => snapshot.as_of_date === as_of_date);
  let generatedSnapshot = false;
  const sourceWasTrimmed = Array.isArray(sourceRecords)
    && Number.isFinite(sourceRecordCount)
    && sourceRecords.length < sourceRecordCount;
  if (sourceWasTrimmed) {
    const existing = snapshots[0] ?? null;
    const visibleSnapshot = buildArAgingSnapshot({
      repository,
      tenant_id,
      balances: sourceRecords,
      as_of_date,
    });
    snapshots = [{
      ...(existing ?? {}),
      ...visibleSnapshot,
      model_type: "ARAgingSnapshot",
      ar_aging_snapshot_id: existing?.ar_aging_snapshot_id
        ?? ar_aging_snapshot_id
        ?? `ar_aging_api_${tenant_id}_${as_of_date ?? "latest"}`,
      tenant_id,
      status: "generated",
      generated_at: existing?.generated_at ?? null,
    }];
    generatedSnapshot = existing === null;
  } else if (snapshots.length === 0) {
    const created = createArAgingSnapshot({
      repository,
      tenant_id,
      actor_id,
      idempotency_key: idempotency_key ?? `api-ar-aging:${tenant_id}:${as_of_date ?? "latest"}`,
      ar_aging_snapshot_id: ar_aging_snapshot_id ?? `ar_aging_api_${tenant_id}_${as_of_date ?? "latest"}`,
      as_of_date,
    });
    snapshots = [created.ar_aging_snapshot];
    generatedSnapshot = true;
  }
  return Object.freeze({
    items: Object.freeze(snapshots.map(sanitizeFinanceReadItem)),
    generated_snapshot: generatedSnapshot,
  });
}

export function listFinanceAccountingJournalEntries({ repository, tenant_id, from_date, to_date } = {}) {
  const dateKey = (value) => typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : "";
  return repository
    .list({ tenant_id, model_type: "JournalEntry" })
    .filter((entry) => {
      const postedDate = dateKey(entry.posted_at ?? entry.created_at ?? entry.updated_at);
      return (!from_date || !postedDate || postedDate >= from_date)
        && (!to_date || !postedDate || postedDate <= to_date);
    });
}

export function runFinanceAccountingCsvExport({
  repository,
  tenant_id,
  from_date,
  to_date,
  actor_id,
  idempotency_key,
  accounting_export_id,
  journal_entries,
} = {}) {
  const result = createAccountingCsvExport({
    repository,
    tenant_id,
    from_date,
    to_date,
    actor_id,
    idempotency_key,
    accounting_export_id,
    journal_entries,
  });
  return Object.freeze({
    ...result,
    accounting_export: sanitizeAccountingExport(result.accounting_export),
    audit_event: sanitizeFinanceAuditEvent(result.audit_event),
  });
}

export function runFinanceAuditRead({ repository, tenant_id } = {}) {
  const items = repository
    .listAudit({ tenant_id })
    .map(sanitizeFinanceAuditEvent);
  return Object.freeze({ items: Object.freeze(items) });
}
