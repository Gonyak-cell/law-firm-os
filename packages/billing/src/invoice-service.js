import { appendFinanceAuditEvent } from "./finance-audit.js";

export const INVOICE_LIFECYCLE_STATUSES = Object.freeze(["draft", "sent", "partial", "paid", "overdue", "void"]);

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

function canonicalInvoiceStatus(invoice = {}) {
  const status = invoice.lifecycle_status ?? invoice.status ?? "draft";
  if (status === "issued") return "sent";
  if (status === "partially_paid") return "partial";
  return status;
}

function requireMatchingPreBillProjection(invoice, field, expected, normalize = (value) => value) {
  if (invoice[field] !== undefined && normalize(invoice[field]) !== expected) {
    throw new Error(`invoice ${field} must match partner-approved PreBill`);
  }
}

function hasActiveInvoicePayment(repository, tenantId, invoiceId) {
  const allocations = repository.list({ tenant_id: tenantId, model_type: "PaymentAllocation", invoice_id: invoiceId });
  const reversedIds = new Set(allocations.map((row) => row.reverses_payment_allocation_id).filter(Boolean));
  const activeAllocation = allocations.some((row) =>
    row.status !== "reversed"
    && !["cancelled", "canceled", "void", "rejected", "deleted"].includes(String(row.status ?? "").toLowerCase())
    && !reversedIds.has(row.payment_allocation_id));
  const representedMatches = new Set(allocations.map((row) => row.source_payment_match_id).filter(Boolean));
  const activeLegacyMatch = repository
    .list({ tenant_id: tenantId, model_type: "PaymentMatch", invoice_id: invoiceId })
    .some((row) =>
      !["cancelled", "canceled", "void", "rejected", "deleted"].includes(String(row.status ?? "").toLowerCase())
      && !representedMatches.has(row.payment_match_id));
  return activeAllocation || activeLegacyMatch;
}

export function projectInvoiceLifecycle({ invoice, as_of_date } = {}) {
  const asOfDate = requireDateOnly(as_of_date ?? new Date().toISOString().slice(0, 10), "as_of_date");
  const current = canonicalInvoiceStatus(invoice);
  if (!INVOICE_LIFECYCLE_STATUSES.includes(current)) throw new Error(`unsupported invoice lifecycle status: ${current}`);
  const amountDue = Number(invoice?.amount_due ?? 0);
  const amountPaid = Number(invoice?.amount_paid ?? 0);
  const outstandingAmount = Math.max(0, Math.round((amountDue - amountPaid) * 100) / 100);
  let lifecycleStatus = current;
  if (!["draft", "void"].includes(current)) {
    if (outstandingAmount === 0) {
      lifecycleStatus = "paid";
    } else if (invoice?.due_date && invoice.due_date < asOfDate) {
      lifecycleStatus = "overdue";
    } else if (amountPaid > 0) {
      lifecycleStatus = "partial";
    } else {
      lifecycleStatus = "sent";
    }
  }
  return Object.freeze({
    ...invoice,
    lifecycle_status: lifecycleStatus,
    outstanding_amount: outstandingAmount,
    is_overdue: lifecycleStatus === "overdue",
    as_of_date: asOfDate,
  });
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
  if (prebill.matter_id !== invoice.matter_id) throw new Error("Invoice matter must match PreBill");
  const amountDue = Number(prebill.total_amount);
  const standardAmount = Number(prebill.standard_amount ?? prebill.total_amount);
  const retainerDrawdownTotal = Number(prebill.retainer_drawdown_total ?? 0);
  const successFeeApplied = prebill.success_fee_applied === true;
  const feeArrangementId = prebill.fee_arrangement_id ?? null;
  const feeArrangementType = prebill.fee_arrangement_type ?? "hourly";
  const currency = typeof prebill.currency === "string" && prebill.currency.trim() !== ""
    ? prebill.currency.trim().toUpperCase()
    : "KRW";
  const adjustmentsTotal = Number(prebill.adjustments_total ?? prebill.adjustment_total ?? 0);
  requireMatchingPreBillProjection(invoice, "amount_due", amountDue, Number);
  requireMatchingPreBillProjection(invoice, "standard_amount", standardAmount, Number);
  requireMatchingPreBillProjection(invoice, "retainer_drawdown_total", retainerDrawdownTotal, Number);
  requireMatchingPreBillProjection(invoice, "success_fee_applied", successFeeApplied);
  requireMatchingPreBillProjection(invoice, "fee_arrangement_id", feeArrangementId);
  requireMatchingPreBillProjection(invoice, "fee_arrangement_type", feeArrangementType);
  requireMatchingPreBillProjection(invoice, "currency", currency, (value) => String(value).trim().toUpperCase());
  requireMatchingPreBillProjection(invoice, "adjustments_total", adjustmentsTotal, Number);
  requireMatchingPreBillProjection(invoice, "adjustment_total", adjustmentsTotal, Number);
  const hasRequestedStatus = Boolean(invoice.status || invoice.lifecycle_status);
  const lifecycleStatus = canonicalInvoiceStatus(hasRequestedStatus ? invoice : { ...invoice, status: "issued" });
  const isLegacyIssuedCreation = invoice.lifecycle_status == null && (invoice.status == null || invoice.status === "issued");
  if (lifecycleStatus !== "draft" && !isLegacyIssuedCreation) {
    throw new Error("Invoice creation only supports draft or legacy issued status");
  }
  if (invoice.status && invoice.lifecycle_status && canonicalInvoiceStatus({ status: invoice.status }) !== canonicalInvoiceStatus({ lifecycle_status: invoice.lifecycle_status })) {
    throw new Error("invoice status and lifecycle_status must agree");
  }
  const amountPaid = Number(invoice.amount_paid ?? 0);
  if (!Number.isFinite(amountDue) || amountDue <= 0) throw new Error("invoice amount_due must be positive");
  if (!Number.isFinite(amountPaid) || amountPaid !== 0) throw new Error("new invoice amount_paid must be zero");
  if (invoice.outstanding_amount !== undefined && Number(invoice.outstanding_amount) !== amountDue) {
    throw new Error("new invoice outstanding_amount must equal amount_due");
  }
  const idempotency = {
    tenant_id: invoice.tenant_id,
    idempotency_key,
    operation: "invoice_create",
    actor_id,
    object_type: "PreBill",
    object_id: invoice.prebill_id,
    request: { invoice },
  };
  const replay = repository.getIdempotency(idempotency);
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const isDraft = lifecycleStatus === "draft";
    if (isDraft && (invoice.issued_at != null || invoice.sent_at != null || invoice.due_date != null)) {
      throw new Error("draft invoice cannot have issue, sent, or due dates");
    }
    const lifecycleAt = isDraft
      ? invoice.drafted_at ?? new Date().toISOString()
      : invoice.issued_at ?? invoice.sent_at ?? new Date().toISOString();
    requireValidInstant(lifecycleAt, isDraft ? "drafted_at" : "issued_at");
    const issuedAt = isDraft ? null : lifecycleAt;
    const dueDate = invoice.due_date !== undefined && invoice.due_date !== null
      ? requireDateOnly(invoice.due_date, "due_date")
      : isDraft
        ? null
        : isoDatePlusDays(issuedAt, invoice.payment_terms_days ?? 30);
    const legalYear = Number(invoice.legal_invoice_year ?? invoice.invoice_year ?? invoiceIssueYear(lifecycleAt));
    const legalSequence = Number(invoice.legal_invoice_sequence ?? invoice.invoice_sequence ?? nextInvoiceSequence(tx, invoice.tenant_id, legalYear));
    if (!Number.isInteger(legalSequence) || legalSequence <= 0) throw new Error("invoice legal sequence must be positive");
    const invoiceNumber = invoice.invoice_number ?? `INV-${legalYear}-${String(legalSequence).padStart(6, "0")}`;
    const existingForPreBill = tx
      .list({ tenant_id: invoice.tenant_id, model_type: "Invoice" })
      .find((item) => item.prebill_id === invoice.prebill_id);
    if (existingForPreBill) throw new Error("PreBill already has an Invoice");
    const duplicate = tx.list({ tenant_id: invoice.tenant_id, model_type: "Invoice" }).find((item) => item.invoice_number === invoiceNumber);
    if (duplicate) throw new Error("invoice legal sequence already exists");
    const record = tx.create({
      ...invoice,
      model_type: "Invoice",
      invoice_id: invoice.invoice_id ?? `invoice:${invoiceNumber}`,
      invoice_number: invoiceNumber,
      legal_invoice_year: legalYear,
      legal_invoice_sequence: legalSequence,
      status: invoice.status ?? (lifecycleStatus === "sent" ? "issued" : lifecycleStatus),
      lifecycle_status: lifecycleStatus,
      lifecycle_contract: invoice.lifecycle_contract ?? (isDraft ? "small_firm_v1" : null),
      amount_due: amountDue,
      standard_amount: standardAmount,
      retainer_drawdown_total: retainerDrawdownTotal,
      success_fee_applied: successFeeApplied,
      fee_arrangement_id: feeArrangementId,
      fee_arrangement_type: feeArrangementType,
      currency,
      adjustments_total: adjustmentsTotal,
      adjustment_total: adjustmentsTotal,
      amount_paid: amountPaid,
      outstanding_amount: amountDue,
      issued_at: issuedAt,
      sent_at: isDraft ? null : invoice.sent_at ?? issuedAt,
      drafted_at: isDraft ? lifecycleAt : invoice.drafted_at ?? null,
      due_date: dueDate,
      payment_terms_days: paymentTermsDays(invoice.payment_terms_days ?? 30),
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
        action: isDraft ? "invoice.draft.create" : "invoice.issue",
        object_type: "Invoice",
        object_id: record.invoice_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", invoice: record, invoice_lines: Object.freeze([line]), audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ ...idempotency, response });
    return response;
  });
}

export function createDraftInvoiceFromPreBill({ repository, invoice, actor_id, idempotency_key } = {}) {
  return createInvoiceFromPreBill({
    repository,
    invoice: {
      ...invoice,
      status: "draft",
      lifecycle_status: "draft",
      lifecycle_contract: "small_firm_v1",
    },
    actor_id,
    idempotency_key,
  });
}

export function transitionInvoiceLifecycle({
  repository,
  tenant_id,
  invoice_id,
  to_status,
  as_of_date,
  transition_at,
  reason_code,
  actor_id,
  idempotency_key,
} = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const invoiceId = requiredString({ invoice_id }, "invoice_id");
  const target = requiredString({ to_status }, "to_status");
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString({ idempotency_key }, "idempotency_key");
  if (!INVOICE_LIFECYCLE_STATUSES.includes(target)) throw new Error(`unsupported invoice lifecycle status: ${target}`);
  const idempotency = {
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
    operation: "invoice_lifecycle_transition",
    actor_id: actorId,
    object_type: "Invoice",
    object_id: invoiceId,
    request: {
      tenant_id: tenantId,
      invoice_id: invoiceId,
      to_status: target,
      as_of_date: as_of_date ?? null,
      transition_at: transition_at ?? null,
      reason_code: reason_code ?? null,
    },
  };
  const replay = repository.getIdempotency(idempotency);
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const invoice = tx.get({ tenant_id: tenantId, model_type: "Invoice", invoice_id: invoiceId });
    if (!invoice) throw new Error("Invoice not found");
    const projected = projectInvoiceLifecycle({ invoice, as_of_date });
    const currentStatus = canonicalInvoiceStatus(invoice);
    const allowed = {
      draft: ["sent", "void"],
      sent: ["partial", "paid", "overdue", "void"],
      partial: ["paid", "overdue", "void"],
      overdue: ["partial", "paid", "void"],
      paid: [],
      void: [],
    };
    if (!allowed[currentStatus].includes(target)) {
      throw new Error(`invalid invoice lifecycle transition: ${currentStatus} -> ${target}`);
    }
    const occurredAt = transition_at ?? new Date().toISOString();
    requireValidInstant(occurredAt, "transition_at");
    const patch = {
      status: target,
      lifecycle_status: target,
      lifecycle_contract: "small_firm_v1",
      updates_database_rows: true,
    };
    if (target === "sent") {
      patch.sent_at = occurredAt;
      patch.issued_at = invoice.issued_at ?? occurredAt;
      patch.due_date = invoice.due_date ?? isoDatePlusDays(occurredAt, invoice.payment_terms_days ?? 30);
    }
    if (target === "partial" && !(Number(invoice.amount_paid ?? 0) > 0 && Number(invoice.amount_paid) < Number(invoice.amount_due ?? 0))) {
      throw new Error("partial invoice requires a positive outstanding payment");
    }
    if (target === "paid" && Number(invoice.amount_paid ?? 0) < Number(invoice.amount_due ?? 0)) {
      throw new Error("paid invoice requires full payment");
    }
    if (target === "overdue") {
      const asOfDate = requireDateOnly(as_of_date ?? occurredAt.slice(0, 10), "as_of_date");
      const dueDate = requireDateOnly(invoice.due_date, "invoice due_date");
      if (dueDate >= asOfDate || projected.outstanding_amount === 0) throw new Error("overdue invoice requires past due outstanding balance");
      patch.overdue_at = occurredAt;
    }
    if (target === "void") {
      if (hasActiveInvoicePayment(tx, tenantId, invoiceId)) {
        throw new Error("Invoice with active payment allocation cannot be voided");
      }
      patch.void_reason_code = requiredString({ reason_code }, "reason_code");
      patch.voided_at = occurredAt;
      patch.voided_by = actorId;
    }
    const updated = tx.update({ tenant_id: tenantId, model_type: "Invoice", invoice_id: invoiceId }, patch);
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: tenantId,
        actor_id: actorId,
        action: `invoice.lifecycle.${target}`,
        object_type: "Invoice",
        object_id: invoiceId,
        idempotency_key: idempotencyKey,
        metadata: { from_status: currentStatus, to_status: target },
      },
    });
    const response = Object.freeze({
      outcome: "updated",
      invoice: updated,
      previous_status: currentStatus,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({ ...idempotency, response });
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
