import { appendFinanceAuditEvent } from "./finance-audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function roundCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError("amount must be finite");
  return Math.round(number);
}

export function calculateKoreanBusinessIncomeWithholding({
  gross_amount,
  income_tax_rate = 0.03,
  local_income_tax_rate = 0.003,
} = {}) {
  const grossAmount = roundCurrency(gross_amount);
  if (grossAmount < 0) throw new TypeError("gross_amount must be non-negative");
  const incomeTax = roundCurrency(grossAmount * Number(income_tax_rate));
  const localIncomeTax = roundCurrency(grossAmount * Number(local_income_tax_rate));
  const totalWithholding = incomeTax + localIncomeTax;
  return Object.freeze({
    gross_amount: grossAmount,
    income_tax_rate: Number(income_tax_rate),
    local_income_tax_rate: Number(local_income_tax_rate),
    withholding_rate: Number((Number(income_tax_rate) + Number(local_income_tax_rate)).toFixed(4)),
    income_tax_amount: incomeTax,
    local_income_tax_amount: localIncomeTax,
    total_withholding_amount: totalWithholding,
    net_payable_amount: grossAmount - totalWithholding,
    withholding_profile: "kr_3_3_business_income",
    external_vendor_sandbox_claim: false,
    production_ready_claim: false,
  });
}

export function createTaxInvoice({ repository, tax_invoice, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(tax_invoice, "tenant_id");
  requiredString(tax_invoice, "invoice_id");
  requiredString(tax_invoice, "tax_registration_ref");
  const invoice = repository.get({ tenant_id: tax_invoice.tenant_id, model_type: "Invoice", invoice_id: tax_invoice.invoice_id });
  if (!invoice) throw new Error("Invoice not found");
  const replay = repository.getIdempotency({ tenant_id: tax_invoice.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const taxAmount = Number((Number(invoice.amount_due ?? 0) * Number(tax_invoice.tax_rate ?? 0.1)).toFixed(2));
    const withholding = tax_invoice.withholding_profile === "kr_3_3_business_income" ||
      tax_invoice.withholding_required === true
      ? calculateKoreanBusinessIncomeWithholding({ gross_amount: invoice.amount_due })
      : null;
    const record = tx.create({
      ...tax_invoice,
      model_type: "TaxInvoice",
      matter_id: invoice.matter_id,
      status: "issued",
      taxable_amount: invoice.amount_due,
      tax_amount: taxAmount,
      withholding,
      withholding_amount: withholding?.total_withholding_amount ?? 0,
      net_payable_amount: withholding?.net_payable_amount ?? invoice.amount_due,
      issued_at: tax_invoice.issued_at ?? new Date().toISOString(),
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "tax_invoice.issue",
        object_type: "TaxInvoice",
        object_id: record.tax_invoice_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", tax_invoice: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "tax_invoice_issue", response });
    return response;
  });
}
