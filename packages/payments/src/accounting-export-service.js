import { createHash } from "node:crypto";
import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";

const CSV_FIELDS = Object.freeze([
  "journal_entry_id",
  "posting_date",
  "source_ref",
  "matter_id",
  "account",
  "debit",
  "credit",
  "currency",
]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function moneyValue(value) {
  return Math.round(numberValue(value) * 100) / 100;
}

function dateKey(value) {
  return typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : "";
}

function isInDateWindow(record = {}, fromDate, toDate) {
  const postedDate = dateKey(record.posted_at ?? record.created_at ?? record.updated_at);
  if (fromDate && postedDate && postedDate < fromDate) return false;
  if (toDate && postedDate && postedDate > toDate) return false;
  return true;
}

function csvCell(value) {
  const rawText = value === undefined || value === null ? "" : String(value);
  const text = typeof value === "string" && /^[=+\-@\t\r]/u.test(rawText) ? `'${rawText}` : rawText;
  return /[",\n\r]/u.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

export function buildAccountingExportCsv({ repository, tenant_id, from_date, to_date, journal_entries } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  if (from_date && to_date && from_date > to_date) throw new Error("from_date must be before to_date");
  const journalEntries = (Array.isArray(journal_entries)
    ? journal_entries
    : repository.list({ tenant_id, model_type: "JournalEntry" }))
    .filter((entry) => isInDateWindow(entry, from_date, to_date));
  const rows = [];
  let debitTotal = 0;
  let creditTotal = 0;
  for (const entry of journalEntries) {
    const lines = Array.isArray(entry.lines) ? entry.lines : [];
    const entryDebit = moneyValue(lines.reduce((total, line) => total + numberValue(line.debit), 0));
    const entryCredit = moneyValue(lines.reduce((total, line) => total + numberValue(line.credit), 0));
    if (Math.abs(entryDebit - entryCredit) > 0.001) throw new Error("journal entry is not balanced");
    for (const line of lines) {
      const debit = moneyValue(line.debit);
      const credit = moneyValue(line.credit);
      debitTotal += debit;
      creditTotal += credit;
      rows.push(Object.freeze({
        journal_entry_id: entry.journal_entry_id,
        posting_date: dateKey(entry.posted_at ?? entry.created_at),
        source_ref: entry.source_ref,
        matter_id: entry.matter_id ?? "",
        account: line.account,
        debit,
        credit,
        currency: entry.currency ?? line.currency ?? "KRW",
      }));
    }
  }
  const csvText = `${[
    CSV_FIELDS.join(","),
    ...rows.map((row) => CSV_FIELDS.map((field) => csvCell(row[field])).join(",")),
  ].join("\n")}\n`;
  return Object.freeze({
    csv_text: csvText,
    csv_sha256: sha256(csvText),
    row_count: rows.length,
    journal_entry_count: journalEntries.length,
    journal_entry_refs: Object.freeze(journalEntries.map((entry) => entry.journal_entry_id)),
    debit_total: moneyValue(debitTotal),
    credit_total: moneyValue(creditTotal),
    balanced: Math.abs(debitTotal - creditTotal) <= 0.001,
    from_date: from_date ?? null,
    to_date: to_date ?? null,
    bank_reference_included: false,
    credential_material_included: false,
    raw_journal_payload_included: false,
    production_ready_claim: false,
  });
}

export function createAccountingExport({ repository, accounting_export, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(accounting_export, "tenant_id");
  const refs = accounting_export.journal_entry_refs ?? [];
  if (!Array.isArray(refs) || refs.length === 0) throw new Error("accounting export requires journal_entry_refs");
  const replay = repository.getIdempotency({ tenant_id: accounting_export.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.upsert({
      ...accounting_export,
      model_type: "AccountingExport",
      status: "ready_for_review",
      credential_material_included: false,
      generated_at: accounting_export.generated_at ?? new Date().toISOString(),
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "accounting.export.create",
        object_type: "AccountingExport",
        object_id: record.accounting_export_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", accounting_export: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "accounting_export_create", response });
    return response;
  });
}

export function createAccountingCsvExport({ repository, tenant_id, from_date, to_date, actor_id, idempotency_key, accounting_export_id, journal_entries } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const replay = repository.getIdempotency({ tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const csv = buildAccountingExportCsv({ repository: tx, tenant_id, from_date, to_date, journal_entries });
    const record = tx.create({
      model_type: "AccountingExport",
      accounting_export_id: accounting_export_id ?? `accounting-export:${tenant_id}:${from_date ?? "start"}:${to_date ?? "end"}`,
      tenant_id,
      export_format: "csv",
      status: "ready_for_review",
      from_date: csv.from_date,
      to_date: csv.to_date,
      journal_entry_refs: csv.journal_entry_refs,
      csv_text: csv.csv_text,
      csv_sha256: csv.csv_sha256,
      row_count: csv.row_count,
      debit_total: csv.debit_total,
      credit_total: csv.credit_total,
      balanced: csv.balanced,
      bank_reference_included: false,
      credential_material_included: false,
      raw_journal_payload_included: false,
      generated_at: new Date().toISOString(),
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "accounting.export.csv.create",
        object_type: "AccountingExport",
        object_id: record.accounting_export_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", accounting_export: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id, idempotency_key, operation: "accounting_csv_export_create", response });
    return response;
  });
}
