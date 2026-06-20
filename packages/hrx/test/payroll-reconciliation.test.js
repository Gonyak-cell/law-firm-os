import assert from "node:assert/strict";
import test from "node:test";
import { createPayrollReconciliationSummary } from "../src/payroll-reconciliation.js";

test("payroll reconciliation stores provider result metadata only", () => {
  const summary = createPayrollReconciliationSummary({
    tenant_id: "tenant-a",
    reconciliation_id: "recon-001",
    preview_id: "pay-preview-001",
    provider_result_ref: "ProviderResult:001",
    provider_result_metadata: {
      batch_id: "provider-batch-001",
      status: "accepted_with_mismatches",
    },
    mismatch_count: 2,
  });
  assert.equal(summary.raw_provider_payload_included, false);
  assert.equal(summary.disbursement_instruction_included, false);
  assert.equal(summary.human_review_required, true);
});

test("payroll reconciliation rejects raw provider and pay fields", () => {
  assert.throws(
    () =>
      createPayrollReconciliationSummary({
        tenant_id: "tenant-a",
        reconciliation_id: "recon-raw",
        preview_id: "pay-preview-001",
        provider_result_ref: "ProviderResult:raw",
        raw_provider_payload: { net_pay: 100 },
      }),
    /raw_provider_payload/,
  );
  assert.throws(
    () =>
      createPayrollReconciliationSummary({
        tenant_id: "tenant-a",
        reconciliation_id: "recon-field",
        preview_id: "pay-preview-001",
        provider_result_ref: "ProviderResult:field",
        provider_result_metadata: { net_pay: "100" },
      }),
    /sensitive field/,
  );
});
