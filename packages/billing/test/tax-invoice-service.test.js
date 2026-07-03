import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateKoreanBusinessIncomeWithholding,
  createFinanceRepository,
  createTaxInvoice,
} from "../src/index.js";

test("Korean 3.3 percent business-income withholding splits national and local tax", () => {
  const result = calculateKoreanBusinessIncomeWithholding({ gross_amount: 1_000_000 });
  assert.equal(result.income_tax_amount, 30_000);
  assert.equal(result.local_income_tax_amount, 3_000);
  assert.equal(result.total_withholding_amount, 33_000);
  assert.equal(result.net_payable_amount, 967_000);
  assert.equal(result.withholding_rate, 0.033);
  assert.equal(result.external_vendor_sandbox_claim, false);
});

test("TaxInvoice can carry local 3.3 percent withholding without vendor sandbox claim", () => {
  const repository = createFinanceRepository();
  repository.create({
    model_type: "Invoice",
    invoice_id: "invoice-tax-withholding-001",
    tenant_id: "tenant-tax-withholding",
    matter_id: "matter-tax-withholding",
    amount_due: 1_000_000,
    status: "issued",
  });
  const result = createTaxInvoice({
    repository,
    actor_id: "user-tax-withholding",
    idempotency_key: "tax-withholding-001",
    tax_invoice: {
      tax_invoice_id: "tax-invoice-withholding-001",
      tenant_id: "tenant-tax-withholding",
      invoice_id: "invoice-tax-withholding-001",
      tax_registration_ref: "local-tax-registration-ref",
      withholding_profile: "kr_3_3_business_income",
    },
  });

  assert.equal(result.outcome, "created");
  assert.equal(result.tax_invoice.withholding_amount, 33_000);
  assert.equal(result.tax_invoice.net_payable_amount, 967_000);
  assert.equal(result.tax_invoice.withholding.external_vendor_sandbox_claim, false);
});
