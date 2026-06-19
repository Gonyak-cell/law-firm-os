import assert from "node:assert/strict";
import test from "node:test";

import {
  BILLING_G5C_TUW_COVERAGE,
  createBillingG5BillingUiDescriptor,
  createBillingG5CBillingCloseoutDescriptor,
  createBillingG5InvoiceCorrectionDescriptor,
  createBillingG5InvoiceIssueDescriptor,
  createBillingG5InvoiceLineReconciliationDescriptor,
  createBillingG5TaxInvoiceDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g5c_validator";
const matter_id = "matter_g5c";

function prebill(overrides = {}) {
  return {
    prebill_id: "prebill_g5c_001",
    tenant_id,
    matter_id,
    review_status: "partner_approved",
    approved_at: "2026-06-19T08:00:00Z",
    ...overrides,
  };
}

function invoice(overrides = {}) {
  return {
    invoice_id: "invoice_g5c_001",
    tenant_id,
    matter_id,
    prebill_id: "prebill_g5c_001",
    idempotency_key: "idem_g5c_001",
    issue_status: "issued",
    amount: 1200,
    ...overrides,
  };
}

function wipItem(overrides = {}) {
  return {
    wip_item_id: "wip_g5c_001",
    tenant_id,
    matter_id,
    amount: 1200,
    status: "locked",
    ...overrides,
  };
}

function invoiceLine(overrides = {}) {
  return {
    invoice_line_id: "line_g5c_001",
    tenant_id,
    matter_id,
    wip_item_id: "wip_g5c_001",
    amount: 1200,
    ...overrides,
  };
}

function taxInvoice(overrides = {}) {
  return {
    tax_invoice_id: "tax_g5c_001",
    tenant_id,
    matter_id,
    invoice_id: "invoice_g5c_001",
    status: "transmit_failed",
    ...overrides,
  };
}

function transmissionEvents() {
  return [
    { action: "issue", event_id: "tax_event_issue" },
    { action: "transmit", event_id: "tax_event_transmit" },
    { action: "fail", event_id: "tax_event_fail", reason_code: "gateway_timeout" },
  ];
}

function issuedInvoice(overrides = {}) {
  return {
    invoice_id: "invoice_g5c_001",
    tenant_id,
    matter_id,
    issue_status: "issued",
    amount: 1200,
    ...overrides,
  };
}

function correction(overrides = {}) {
  return {
    correction_id: "correction_g5c_001",
    tenant_id,
    matter_id,
    invoice_id: "invoice_g5c_001",
    correction_type: "credit_note",
    reason_code: "client_billing_query",
    direct_edit_attempted: true,
    issued_invoice_mutated: false,
    ...overrides,
  };
}

test("G5-C invoice issue descriptor requires idempotent issue evidence", () => {
  const descriptor = createBillingG5InvoiceIssueDescriptor({
    tenant_id,
    matter_id,
    prebill: prebill(),
    invoice: invoice(),
    idempotency_key: "idem_g5c_001",
    duplicate_issue_attempt: true,
    second_invoice_created: false,
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.invoice_issue_receipt.idempotent_issue_tested, true);
  assert.equal(descriptor.invoice_issue_receipt.second_invoice_created, false);
  assert.equal(descriptor.invoice_issue_receipt.invoice_persisted, false);

  const blocked = createBillingG5InvoiceIssueDescriptor({
    tenant_id,
    matter_id,
    prebill: prebill(),
    invoice: invoice({ idempotency_key: "" }),
    duplicate_issue_attempt: false,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("invoice_issue_idempotency_key_required"));
  assert.ok(blocked.blocked_claims.includes("invoice_issue_duplicate_attempt_blocked"));
});

test("G5-C invoice line descriptor reconciles generated lines back to WIP", () => {
  const descriptor = createBillingG5InvoiceLineReconciliationDescriptor({
    tenant_id,
    matter_id,
    invoice_lines: [invoiceLine()],
    wip_items: [wipItem()],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.invoice_line_total, 1200);
  assert.equal(descriptor.wip_total, 1200);
  assert.equal(descriptor.invoice_line_receipt.wip_to_invoice_reconciliation_tested, true);
  assert.equal(descriptor.invoice_line_receipt.invoice_lines_persisted, false);

  const blocked = createBillingG5InvoiceLineReconciliationDescriptor({
    tenant_id,
    matter_id,
    invoice_lines: [invoiceLine({ wip_item_id: "wip_missing", amount: 800 })],
    wip_items: [wipItem()],
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("invoice_line_unmatched_wip_ref_blocked"));
  assert.ok(blocked.blocked_claims.includes("invoice_line_wip_total_mismatch"));
});

test("G5-C TaxInvoice descriptor requires issue transmit and fail evidence", () => {
  const descriptor = createBillingG5TaxInvoiceDescriptor({
    tenant_id,
    matter_id,
    invoice: invoice(),
    tax_invoice: taxInvoice(),
    transmission_events: transmissionEvents(),
    duplicate_transmit_attempt: true,
    duplicate_transmission_created: false,
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.tax_invoice_receipt.issue_transmit_fail_tested, true);
  assert.equal(descriptor.tax_invoice_receipt.duplicate_transmit_blocked, true);
  assert.equal(descriptor.tax_invoice_receipt.tax_invoice_persisted, false);

  const blocked = createBillingG5TaxInvoiceDescriptor({
    tenant_id,
    matter_id,
    invoice: invoice(),
    tax_invoice: taxInvoice(),
    transmission_events: [{ action: "issue" }],
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("tax_invoice_transmit_event_required"));
  assert.ok(blocked.blocked_claims.includes("tax_invoice_failure_event_required"));
});

test("G5-C invoice correction descriptor blocks direct issued-invoice edits", () => {
  const descriptor = createBillingG5InvoiceCorrectionDescriptor({
    tenant_id,
    matter_id,
    issued_invoice: issuedInvoice(),
    correction: correction(),
    direct_edit_attempt: true,
    issued_invoice_mutated: false,
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.correction_receipt.direct_edit_blocked_tested, true);
  assert.equal(descriptor.correction_receipt.issued_invoice_mutated, false);

  const blocked = createBillingG5InvoiceCorrectionDescriptor({
    tenant_id,
    matter_id,
    issued_invoice: issuedInvoice(),
    correction: correction({ issued_invoice_mutated: true }),
    direct_edit_attempt: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("invoice_correction_direct_edit_blocked"));
});

test("G5-C billing UI descriptor masks role-restricted invoice details", () => {
  const descriptor = createBillingG5BillingUiDescriptor({
    tenant_id,
    actor_role: "matter_viewer",
    invoice: invoice(),
    ui_state: {
      amount_masked: true,
      detail_masked: true,
      amount_visible: false,
      detail_visible: false,
    },
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.billing_ui_receipt.role_based_detail_masking_tested, true);
  assert.equal(descriptor.billing_ui_receipt.restricted_amounts_visible, false);
  assert.equal(descriptor.billing_ui_receipt.raw_invoice_payload_loaded, false);

  const blocked = createBillingG5BillingUiDescriptor({
    tenant_id,
    actor_role: "matter_viewer",
    invoice: invoice(),
    ui_state: {
      amount_masked: false,
      detail_masked: false,
      amount_visible: true,
      detail_visible: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("billing_ui_role_detail_mask_required"));
  assert.ok(blocked.blocked_claims.includes("billing_ui_unauthorized_amount_leak_blocked"));
});

test("G5-C closeout descriptor summarizes invoice tax and billing UI evidence", () => {
  const issue = createBillingG5InvoiceIssueDescriptor({
    tenant_id,
    matter_id,
    prebill: prebill(),
    invoice: invoice(),
    idempotency_key: "idem_g5c_001",
    duplicate_issue_attempt: true,
    second_invoice_created: false,
  });
  const lines = createBillingG5InvoiceLineReconciliationDescriptor({
    tenant_id,
    matter_id,
    invoice_lines: [invoiceLine()],
    wip_items: [wipItem()],
  });
  const tax = createBillingG5TaxInvoiceDescriptor({
    tenant_id,
    matter_id,
    invoice: invoice(),
    tax_invoice: taxInvoice(),
    transmission_events: transmissionEvents(),
  });
  const correctionDescriptor = createBillingG5InvoiceCorrectionDescriptor({
    tenant_id,
    matter_id,
    issued_invoice: issuedInvoice(),
    correction: correction(),
    direct_edit_attempt: true,
    issued_invoice_mutated: false,
  });
  const ui = createBillingG5BillingUiDescriptor({
    tenant_id,
    actor_role: "matter_viewer",
    invoice: invoice(),
    ui_state: {
      amount_masked: true,
      detail_masked: true,
      amount_visible: false,
      detail_visible: false,
    },
  });

  const closeout = createBillingG5CBillingCloseoutDescriptor({
    tenant_id,
    descriptors: [issue, lines, tax, correctionDescriptor, ui],
    time_to_invoice_evidence: {
      prebill_approved_at: "2026-06-19T08:00:00Z",
      invoice_issue_requested_at: "2026-06-19T08:12:00Z",
      elapsed_minutes: 12,
    },
    command_evidence: { commands_passed: true },
    pr_state: { is_draft: true },
    upstream_disposition: "G1/G2/G3/G4 evidence remains draft-review gated",
    human_review_disposition: "pending_human_review",
  });

  assert.equal(closeout.outcome, "review_required");
  assert.deepEqual(closeout.tuw_coverage, [
    "LFOS-G5-W07-T011",
    "LFOS-G5-W07-T012",
    "LFOS-G5-W07-T013",
    "LFOS-G5-W07-T014",
    "LFOS-G5-W07-T015",
    "LFOS-G5-W07-T016",
  ]);
  assert.equal(closeout.idempotent_issue_tested, true);
  assert.equal(closeout.wip_to_invoice_reconciliation_tested, true);
  assert.equal(closeout.issue_transmit_fail_tested, true);
  assert.equal(closeout.direct_edit_blocked_tested, true);
  assert.equal(closeout.role_based_detail_masking_tested, true);
  assert.equal(closeout.time_to_invoice_evidence_recorded, true);
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
  assert.equal(BILLING_G5C_TUW_COVERAGE.length, 6);
});
