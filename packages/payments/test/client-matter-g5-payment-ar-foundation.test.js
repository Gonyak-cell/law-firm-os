import assert from "node:assert/strict";
import test from "node:test";

import {
  PAYMENTS_G5D_TUW_COVERAGE,
  createPaymentsG5ARAgingDescriptor,
  createPaymentsG5ARBalanceDescriptor,
  createPaymentsG5PaymentImportDescriptor,
  createPaymentsG5PaymentMatchingDescriptor,
  createPaymentsG5PaymentSchemaDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g5d_validator";
const matter_id = "matter_g5d";

function payment(overrides = {}) {
  return {
    payment_id: "payment_g5d_001",
    tenant_id,
    matter_id,
    import_ref: "bank_import_g5d_001",
    idempotency_key: "idem_g5d_001",
    amount: 1200,
    status: "unmatched",
    ...overrides,
  };
}

function importBatch(overrides = {}) {
  return {
    import_batch_id: "import_batch_g5d_001",
    tenant_id,
    import_ref: "bank_import_g5d_001",
    idempotency_key: "idem_g5d_001",
    ...overrides,
  };
}

function invoice(overrides = {}) {
  return {
    invoice_id: "invoice_g5d_001",
    tenant_id,
    matter_id,
    issue_status: "issued",
    amount: 1200,
    outstanding_amount: 1200,
    ...overrides,
  };
}

function match(overrides = {}) {
  return {
    match_id: "match_g5d_001",
    tenant_id,
    matter_id,
    payment_id: "payment_g5d_001",
    invoice_id: "invoice_g5d_001",
    match_type: "partial",
    amount: 600,
    ...overrides,
  };
}

function arBalance(overrides = {}) {
  return {
    ar_balance_id: "ar_g5d_001",
    tenant_id,
    matter_id,
    invoice_id: "invoice_g5d_001",
    outstanding_amount: 1200,
    editable_source_object: false,
    ...overrides,
  };
}

function agingSnapshot(overrides = {}) {
  return {
    aging_snapshot_id: "aging_g5d_001",
    tenant_id,
    matter_id,
    as_of_date: "2026-06-19",
    bucket: "1_30",
    bucket_amount: 1200,
    balance_refs: ["ar_g5d_001"],
    editable_source_object: false,
    ...overrides,
  };
}

test("G5-D payment schema descriptor preserves imported and unmatched states", () => {
  const descriptor = createPaymentsG5PaymentSchemaDescriptor({
    tenant_id,
    matter_id,
    payment: payment(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.status, "unmatched");
  assert.equal(descriptor.payment_schema_receipt.imported_unmatched_state_tested, true);
  assert.equal(descriptor.payment_schema_receipt.payment_persisted, false);

  const blocked = createPaymentsG5PaymentSchemaDescriptor({
    tenant_id,
    matter_id,
    payment: payment({ status: "matched", amount: 0 }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("payment_imported_unmatched_state_required"));
  assert.ok(blocked.blocked_claims.includes("payment_amount_required"));
});

test("G5-D payment import descriptor requires duplicate import idempotency", () => {
  const descriptor = createPaymentsG5PaymentImportDescriptor({
    tenant_id,
    import_batch: importBatch(),
    payment: payment(),
    idempotency_key: "idem_g5d_001",
    duplicate_import_attempt: true,
    second_payment_created: false,
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.payment_import_receipt.duplicate_import_idempotency_tested, true);
  assert.equal(descriptor.payment_import_receipt.second_payment_created, false);
  assert.equal(descriptor.payment_import_receipt.payment_persisted, false);

  const blocked = createPaymentsG5PaymentImportDescriptor({
    tenant_id,
    import_batch: importBatch({ idempotency_key: "" }),
    payment: payment({ idempotency_key: "" }),
    duplicate_import_attempt: false,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("payment_import_idempotency_key_required"));
  assert.ok(blocked.blocked_claims.includes("payment_import_duplicate_attempt_blocked"));
});

test("G5-D payment matching descriptor allows partial matching without duplicate cash", () => {
  const descriptor = createPaymentsG5PaymentMatchingDescriptor({
    tenant_id,
    matter_id,
    payment: payment(),
    invoice: invoice(),
    match: match(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.match_amount, 600);
  assert.equal(descriptor.payment_match_receipt.partial_match_tested, true);
  assert.equal(descriptor.payment_match_receipt.duplicate_cash_recognized, false);

  const blocked = createPaymentsG5PaymentMatchingDescriptor({
    tenant_id,
    matter_id,
    payment: payment({ amount: 500 }),
    invoice: invoice({ outstanding_amount: 500 }),
    match: match({ amount: 800, duplicate_cash_recognized: true }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("payment_match_overallocation_blocked"));
  assert.ok(blocked.blocked_claims.includes("payment_match_duplicate_cash_blocked"));
});

test("G5-D ARBalance descriptor derives AR from issued invoice evidence", () => {
  const descriptor = createPaymentsG5ARBalanceDescriptor({
    tenant_id,
    matter_id,
    invoice: invoice(),
    ar_balance: arBalance(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.outstanding_amount, 1200);
  assert.equal(descriptor.ar_balance_receipt.invoice_issue_creates_ar_tested, true);
  assert.equal(descriptor.ar_balance_receipt.ar_balance_persisted, false);

  const blocked = createPaymentsG5ARBalanceDescriptor({
    tenant_id,
    matter_id,
    invoice: invoice({ issue_status: "draft", amount: 1200 }),
    ar_balance: arBalance({ outstanding_amount: 900, editable_source_object: true }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("ar_balance_invoice_issue_source_required"));
  assert.ok(blocked.blocked_claims.includes("ar_balance_amount_reconciliation_required"));
  assert.ok(blocked.blocked_claims.includes("ar_balance_editable_source_blocked"));
});

test("G5-D AR aging descriptor requires bucket calculation from ARBalance", () => {
  const descriptor = createPaymentsG5ARAgingDescriptor({
    tenant_id,
    matter_id,
    ar_balance: arBalance(),
    aging_snapshot: agingSnapshot(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.bucket, "1_30");
  assert.equal(descriptor.ar_aging_receipt.aging_bucket_tested, true);
  assert.equal(descriptor.ar_aging_receipt.ar_aging_persisted, false);
  assert.equal(PAYMENTS_G5D_TUW_COVERAGE.length, 5);

  const blocked = createPaymentsG5ARAgingDescriptor({
    tenant_id,
    matter_id,
    ar_balance: arBalance(),
    aging_snapshot: agingSnapshot({ bucket: "unknown", bucket_amount: 900, balance_refs: [] }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("ar_aging_bucket_required"));
  assert.ok(blocked.blocked_claims.includes("ar_aging_balance_ref_required"));
  assert.ok(blocked.blocked_claims.includes("ar_aging_bucket_calculation_required"));
});
