import assert from "node:assert/strict";
import test from "node:test";

import {
  PAYMENTS_G5E_TUW_COVERAGE,
  createPaymentsG5AccountingExportDescriptor,
  createPaymentsG5JournalEntryDescriptor,
  createPaymentsG5VatTaxExportDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g5e_validator";
const matter_id = "matter_g5e";

function journalEntry(overrides = {}) {
  return {
    journal_entry_id: "journal_g5e_001",
    tenant_id,
    matter_id,
    source_ref: "invoice_g5e_001",
    lines: [
      { line_id: "journal_line_debit", side: "debit", account_code: "1100", amount: 1200 },
      { line_id: "journal_line_credit", side: "credit", account_code: "4000", amount: 1200 },
    ],
    posted_to_gl: false,
    ...overrides,
  };
}

function sourceEvent(overrides = {}) {
  return {
    event_id: "invoice_issued_g5e_001",
    event_type: "invoice_issued",
    tenant_id,
    matter_id,
    amount: 1200,
    ...overrides,
  };
}

function exportBatch(overrides = {}) {
  return {
    export_batch_id: "accounting_export_g5e_001",
    tenant_id,
    export_format: "csv",
    dispatched_runtime: false,
    ...overrides,
  };
}

function taxExport(overrides = {}) {
  return {
    tax_export_id: "vat_export_g5e_001",
    tenant_id,
    period_id: "period_2026_06",
    tax_total: 120,
    exported_without_lock: false,
    ...overrides,
  };
}

function period(overrides = {}) {
  return {
    period_id: "period_2026_06",
    locked: true,
    ...overrides,
  };
}

function invoiceTaxSummary(overrides = {}) {
  return {
    invoice_id: "invoice_g5e_001",
    tenant_id,
    matter_id,
    tax_amount: 120,
    ...overrides,
  };
}

test("G5-E JournalEntry descriptor requires balanced entry evidence", () => {
  const descriptor = createPaymentsG5JournalEntryDescriptor({
    tenant_id,
    matter_id,
    journal_entry: journalEntry(),
    source_events: [sourceEvent()],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.debit_total, 1200);
  assert.equal(descriptor.credit_total, 1200);
  assert.equal(descriptor.journal_entry_receipt.balanced_entry_tested, true);
  assert.equal(descriptor.journal_entry_receipt.journal_entry_persisted, false);

  const blocked = createPaymentsG5JournalEntryDescriptor({
    tenant_id,
    matter_id,
    journal_entry: journalEntry({
      lines: [
        { line_id: "journal_line_debit", side: "debit", account_code: "1100", amount: 1200 },
        { line_id: "journal_line_credit", side: "credit", account_code: "4000", amount: 900 },
      ],
      posted_to_gl: true,
    }),
    source_events: [],
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("journal_entry_source_event_required"));
  assert.ok(blocked.blocked_claims.includes("journal_entry_balanced_entry_required"));
  assert.ok(blocked.blocked_claims.includes("journal_entry_posting_blocked"));
});

test("G5-E accounting export descriptor requires export audit evidence", () => {
  const descriptor = createPaymentsG5AccountingExportDescriptor({
    tenant_id,
    export_batch: exportBatch(),
    journal_entries: [journalEntry()],
    audit_evidence: { export_audit_ref: "audit_export_g5e_001" },
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.accounting_export_receipt.export_audit_tested, true);
  assert.equal(descriptor.accounting_export_receipt.export_file_written, false);
  assert.equal(descriptor.accounting_export_receipt.dispatched_runtime, false);

  const blocked = createPaymentsG5AccountingExportDescriptor({
    tenant_id,
    export_batch: exportBatch({ export_format: "", dispatched_runtime: true }),
    journal_entries: [journalEntry({ lines: [{ side: "debit", amount: 1200 }] })],
    audit_evidence: {},
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("accounting_export_audit_evidence_required"));
  assert.ok(blocked.blocked_claims.includes("accounting_export_balanced_entry_required"));
  assert.ok(blocked.blocked_claims.includes("accounting_export_runtime_dispatch_blocked"));
});

test("G5-E VAT tax export descriptor requires period lock evidence", () => {
  const descriptor = createPaymentsG5VatTaxExportDescriptor({
    tenant_id,
    tax_export: taxExport(),
    period: period(),
    invoice_tax_summaries: [invoiceTaxSummary()],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.tax_total, 120);
  assert.equal(descriptor.summary_tax_total, 120);
  assert.equal(descriptor.vat_tax_export_receipt.period_lock_tested, true);
  assert.equal(descriptor.vat_tax_export_receipt.tax_export_persisted, false);
  assert.equal(PAYMENTS_G5E_TUW_COVERAGE.length, 3);

  const blocked = createPaymentsG5VatTaxExportDescriptor({
    tenant_id,
    tax_export: taxExport({ tax_total: 200, exported_without_lock: true }),
    period: period({ locked: false }),
    invoice_tax_summaries: [invoiceTaxSummary()],
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("vat_tax_export_period_lock_required"));
  assert.ok(blocked.blocked_claims.includes("vat_tax_export_amount_reconciliation_required"));
});
