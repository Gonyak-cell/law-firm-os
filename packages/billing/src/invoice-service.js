import { appendFinanceAuditEvent } from "./finance-audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function requireValidInstant(value, field) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError(`${field} must be a valid date`);
  return date;
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

function paymentTermsDays(value) {
  const days = Number(value ?? 30);
  if (!Number.isInteger(days) || days < 0) throw new TypeError("payment_terms_days must be a non-negative integer");
  return days;
}

function isoDatePlusDays(value, days) {
  const date = requireValidInstant(value, "issued_at");
  date.setUTCDate(date.getUTCDate() + paymentTermsDays(days));
  return date.toISOString().slice(0, 10);
}

function invoiceIssueYear(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.getUTCFullYear() : new Date().getUTCFullYear();
}

function nextInvoiceSequence(repository, tenant_id, year) {
  return (
    repository
      .list({ tenant_id, model_type: "Invoice" })
      .filter((invoice) => Number(invoice.legal_invoice_year ?? invoice.invoice_year) === year)
      .reduce((max, invoice) => Math.max(max, Number(invoice.legal_invoice_sequence ?? invoice.invoice_sequence ?? 0)), 0) + 1
  );
}

export function generateInvoiceLines({ repository, tenant_id, invoice_id, prebill_id, actor_id, idempotency_key } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ invoice_id }, "invoice_id");
  requiredString({ prebill_id }, "prebill_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const prebill = repository.get({ tenant_id, model_type: "PreBill", prebill_id });
  if (!prebill) throw new Error("PreBill not found");
  const replay = repository.getIdempotency({ tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const line = tx.create({
      model_type: "InvoiceLine",
      invoice_line_id: `line:${invoice_id}:fees`,
      tenant_id,
      matter_id: prebill.matter_id,
      invoice_id,
      prebill_id,
      line_type: "fees",
      amount: Number(prebill.total_amount ?? 0),
      standard_amount: Number(prebill.standard_amount ?? prebill.total_amount ?? 0),
      retainer_drawdown_amount: Number(prebill.retainer_drawdown_total ?? 0),
      success_fee_applied: prebill.success_fee_applied === true,
      fee_arrangement_id: prebill.fee_arrangement_id ?? null,
      fee_arrangement_type: prebill.fee_arrangement_type ?? "hourly",
      currency: prebill.currency ?? "KRW",
      status: "generated",
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id,
        actor_id,
        action: "invoice.line.generate",
        object_type: "Invoice",
        object_id: invoice_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", invoice_lines: Object.freeze([line]), audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id, idempotency_key, operation: "invoice_line_generate", response });
    return response;
  });
}

export function createInvoiceFromPreBill({ repository, invoice, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(invoice, "tenant_id");
  requiredString(invoice, "matter_id");
  requiredString(invoice, "prebill_id");
  requiredString(invoice, "billing_client_party_id");
  const prebill = repository.get({ tenant_id: invoice.tenant_id, model_type: "PreBill", prebill_id: invoice.prebill_id });
  if (!prebill || prebill.status !== "partner_approved") throw new Error("Invoice requires partner-approved PreBill");
  const replay = repository.getIdempotency({ tenant_id: invoice.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const issuedAt = invoice.issued_at ?? new Date().toISOString();
    requireValidInstant(issuedAt, "issued_at");
    const dueDate = invoice.due_date !== undefined && invoice.due_date !== null
      ? requireDateOnly(invoice.due_date, "due_date")
      : isoDatePlusDays(issuedAt, invoice.payment_terms_days ?? 30);
    const legalYear = Number(invoice.legal_invoice_year ?? invoice.invoice_year ?? invoiceIssueYear(issuedAt));
    const legalSequence = Number(invoice.legal_invoice_sequence ?? invoice.invoice_sequence ?? nextInvoiceSequence(tx, invoice.tenant_id, legalYear));
    if (!Number.isInteger(legalSequence) || legalSequence <= 0) throw new Error("invoice legal sequence must be positive");
    const invoiceNumber = invoice.invoice_number ?? `INV-${legalYear}-${String(legalSequence).padStart(6, "0")}`;
    const duplicate = tx.list({ tenant_id: invoice.tenant_id, model_type: "Invoice" }).find((item) => item.invoice_number === invoiceNumber);
    if (duplicate) throw new Error("invoice legal sequence already exists");
    const record = tx.create({
      ...invoice,
      model_type: "Invoice",
      invoice_id: invoice.invoice_id ?? `invoice:${invoiceNumber}`,
      invoice_number: invoiceNumber,
      legal_invoice_year: legalYear,
      legal_invoice_sequence: legalSequence,
      status: invoice.status ?? "issued",
      amount_due: invoice.amount_due ?? prebill.total_amount,
      standard_amount: invoice.standard_amount ?? prebill.standard_amount ?? prebill.total_amount,
      retainer_drawdown_total: invoice.retainer_drawdown_total ?? prebill.retainer_drawdown_total ?? 0,
      success_fee_applied: invoice.success_fee_applied ?? prebill.success_fee_applied ?? false,
      fee_arrangement_id: invoice.fee_arrangement_id ?? prebill.fee_arrangement_id ?? null,
      fee_arrangement_type: invoice.fee_arrangement_type ?? prebill.fee_arrangement_type ?? "hourly",
      amount_paid: 0,
      issued_at: issuedAt,
      due_date: dueDate,
      mutates_issued_invoice: false,
    });
    const line = tx.create({
      model_type: "InvoiceLine",
      invoice_line_id: `line:${record.invoice_id}:fees`,
      tenant_id: record.tenant_id,
      matter_id: record.matter_id,
      invoice_id: record.invoice_id,
      prebill_id: record.prebill_id,
      line_type: "fees",
      amount: Number(record.amount_due ?? 0),
      standard_amount: Number(record.standard_amount ?? record.amount_due ?? 0),
      retainer_drawdown_amount: Number(record.retainer_drawdown_total ?? 0),
      success_fee_applied: record.success_fee_applied === true,
      fee_arrangement_id: record.fee_arrangement_id ?? null,
      fee_arrangement_type: record.fee_arrangement_type ?? "hourly",
      currency: record.currency ?? "KRW",
      status: "generated",
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "invoice.issue",
        object_type: "Invoice",
        object_id: record.invoice_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", invoice: record, invoice_lines: Object.freeze([line]), audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "invoice_create", response });
    return response;
  });
}

export function correctInvoice({ repository, correction, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(correction, "tenant_id");
  requiredString(correction, "invoice_id");
  requiredString(correction, "reason_code");
  const replay = repository.getIdempotency({ tenant_id: correction.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const invoice = tx.get({ tenant_id: correction.tenant_id, model_type: "Invoice", invoice_id: correction.invoice_id });
    if (!invoice) throw new Error("Invoice not found");
    const record = tx.create({
      ...correction,
      model_type: "InvoiceCorrection",
      status: "issued",
      original_invoice_locked: true,
      corrected_amount_due: correction.corrected_amount_due ?? invoice.amount_due,
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "invoice.correction.issue",
        object_type: "InvoiceCorrection",
        object_id: record.invoice_correction_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", invoice_correction: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "invoice_correction_issue", response });
    return response;
  });
}
