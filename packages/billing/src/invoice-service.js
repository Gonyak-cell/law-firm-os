import { appendFinanceAuditEvent } from "./finance-audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
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
    const record = tx.create({
      ...invoice,
      model_type: "Invoice",
      status: invoice.status ?? "issued",
      amount_due: invoice.amount_due ?? prebill.total_amount,
      amount_paid: 0,
      issued_at: invoice.issued_at ?? new Date().toISOString(),
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
