// Deterministic in-process tests for the CMP-G7 Revenue/Finance runtime slice.
import test from "node:test";
import assert from "node:assert/strict";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant-a";
const ACTOR = "cmp-g7-finance-ops";
const MATTER_ID = "matter-cmp-g7-runtime";
const EMPLOYEE_ID = "employee-cmp-g7-runtime";
const ROLE_ID = "role-cmp-g7-partner";
const RATE_CARD_ID = "rate-card-cmp-g7-runtime";
const FEE_ARRANGEMENT_ID = "fee-cmp-g7-runtime";
const TIME_ENTRY_ID = "time-cmp-g7-runtime";
const EXPENSE_ID = "expense-cmp-g7-runtime";
const DISBURSEMENT_ID = "disbursement-cmp-g7-runtime";
const SNAPSHOT_ID = "snapshot-cmp-g7-runtime";
const PREBILL_ID = "prebill-cmp-g7-runtime";
const INVOICE_ID = "invoice-cmp-g7-runtime";
const PAYMENT_ID = "payment-cmp-g7-runtime";
const AR_BALANCE_ID = "ar-cmp-g7-runtime";
const JOURNAL_ENTRY_ID = "journal-cmp-g7-runtime";
const SETTLEMENT_RUN_ID = "settlement-cmp-g7-runtime";

let server;
let baseUrl;

async function json(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  return { status: response.status, body: await response.json() };
}

function query(params = {}) {
  return new URLSearchParams({ tenant_id: TENANT, actor_id: ACTOR, ...params }).toString();
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("CMP-G7 health descriptor exposes Revenue/Finance after G1-G6", async () => {
  const { status, body } = await json("/api/health");
  assert.equal(status, 200);
  const revenue = body.bounded_contexts.find((context) => context.bounded_context === "revenue-finance");
  assert.ok(revenue);
  assert.equal(revenue.cmp_gate, "CMP-G7");
  assert.deepEqual(revenue.depends_on, ["CMP-G1-W01", "CMP-G2-W02", "CMP-G3-W03", "CMP-G4-W04", "CMP-G5-W05", "CMP-G6-W06"]);
  assert.equal(revenue.tuw_ids.length, 26);
  assert.equal(revenue.tuw_ids[0], "CMP-G7-W07-T001");
  assert.equal(revenue.tuw_ids.at(-1), "CMP-G7-W07-T026");
  assert.equal(revenue.runtime_readiness_claim, "runtime_api_evidence_only__durable_persistence_open");
});

test("CMP-G7 blocks time writes without Employee+Matter cost basis", async () => {
  const blocked = await json(`/api/revenue/time-entries?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      time_entry_id: "time-cmp-g7-blocked",
      matter_id: MATTER_ID,
      role_id: ROLE_ID,
      work_date: "2026-06-20",
      duration_minutes: 60,
      billable: true,
      status: "draft",
    }),
  });
  assert.equal(blocked.status, 400);
  assert.equal(blocked.body.safe_error_code, "CMP_G7_EMPLOYEE_COST_BASIS_REQUIRED");
});

test("CMP-G7 records time, rate, fee, expense, and disbursement runtime writes with audit/idempotency", async () => {
  const rate = await json(`/api/revenue/rate-cards?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      rate_card_id: RATE_CARD_ID,
      currency: "KRW",
      effective_from: "2026-01-01",
      role_rates: [{ role_id: ROLE_ID, hourly_rate: 200 }],
      idempotency_key: "cmp-g7-rate-card",
    }),
  });
  assert.equal(rate.status, 201);
  assert.equal(rate.body.command.finance_write_audit_idempotency_evidence, true);

  const fee = await json(`/api/revenue/fee-arrangements?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      fee_arrangement_id: FEE_ARRANGEMENT_ID,
      matter_id: MATTER_ID,
      billing_profile_id: "billing-profile-cmp-g7-runtime",
      rate_card_id: RATE_CARD_ID,
      rate_overrides: [{ role_id: ROLE_ID, hourly_rate: 200 }],
      idempotency_key: "cmp-g7-fee-arrangement",
    }),
  });
  assert.equal(fee.status, 201);
  assert.equal(fee.body.fee_arrangement.rate_card_id, RATE_CARD_ID);

  const timeEntry = await json(`/api/revenue/time-entries?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      time_entry_id: TIME_ENTRY_ID,
      matter_id: MATTER_ID,
      employee_id: EMPLOYEE_ID,
      role_id: ROLE_ID,
      work_date: "2026-06-20",
      narrative: "CMP G7 runtime time entry",
      duration_minutes: 120,
      billable: true,
      status: "draft",
      employee_cost_rate: 200,
      cost_basis_ref: "employee-cost-basis-cmp-g7-runtime",
      idempotency_key: "cmp-g7-time-entry",
    }),
  });
  assert.equal(timeEntry.status, 201);
  assert.equal(timeEntry.body.time_entry.employee_id, EMPLOYEE_ID);

  const workflow = await json(`/api/revenue/time-entries/${TIME_ENTRY_ID}/workflow?${query()}`, {
    method: "PATCH",
    body: JSON.stringify({
      workflow_events: [{ action: "submit" }, { action: "approve" }, { action: "lock" }],
      idempotency_key: "cmp-g7-time-workflow",
    }),
  });
  assert.equal(workflow.status, 200);
  assert.equal(workflow.body.time_entry.status, "approved");
  assert.equal(workflow.body.time_entry.locked, true);

  const expense = await json(`/api/revenue/expenses?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      expense_id: EXPENSE_ID,
      matter_id: MATTER_ID,
      employee_id: EMPLOYEE_ID,
      evidence_document_id: "dms-doc-cmp-g7-expense",
      incurred_date: "2026-06-20",
      currency: "KRW",
      amount: 300,
      billable: true,
      cost_basis_ref: "employee-cost-basis-cmp-g7-runtime",
      idempotency_key: "cmp-g7-expense",
    }),
  });
  assert.equal(expense.status, 201);
  assert.equal(expense.body.expense.evidence_document_id, "dms-doc-cmp-g7-expense");

  const disbursement = await json(`/api/revenue/disbursements?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      disbursement_id: DISBURSEMENT_ID,
      expense_id: EXPENSE_ID,
      matter_id: MATTER_ID,
      employee_id: EMPLOYEE_ID,
      currency: "KRW",
      amount: 300,
      billable: true,
      cost_basis_ref: "employee-cost-basis-cmp-g7-runtime",
      idempotency_key: "cmp-g7-disbursement",
    }),
  });
  assert.equal(disbursement.status, 201);
  assert.equal(disbursement.body.disbursement.expense_id, EXPENSE_ID);
});

test("CMP-G7 generates WIP, immutable PreBill, and idempotent invoice issue with line reconciliation", async () => {
  const wip = await json(`/api/revenue/wip/generate?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID, idempotency_key: "cmp-g7-wip-generate" }),
  });
  assert.equal(wip.status, 201);
  assert.ok(wip.body.wip_items.length >= 3);
  assert.equal(wip.body.descriptor.approved_billable_item_count, wip.body.wip_items.length);

  const snapshot = await json(`/api/revenue/wip/lock-snapshots?${query()}`, {
    method: "POST",
    body: JSON.stringify({ snapshot_id: SNAPSHOT_ID, matter_id: MATTER_ID, idempotency_key: "cmp-g7-wip-snapshot" }),
  });
  assert.equal(snapshot.status, 201);
  assert.equal(snapshot.body.snapshot.immutable, true);

  const prebill = await json(`/api/revenue/prebills?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      prebill_id: PREBILL_ID,
      snapshot_id: SNAPSHOT_ID,
      review_status: "partner_approved",
      partner_reviewer_id: "employee-cmp-g7-partner",
      idempotency_key: "cmp-g7-prebill",
    }),
  });
  assert.equal(prebill.status, 201);

  const adjustment = await json(`/api/revenue/adjustments?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      adjustment_id: "adjustment-cmp-g7-runtime",
      prebill_id: PREBILL_ID,
      adjustment_type: "write_down",
      amount: 100,
      reason_code: "partner_discount",
      approval_status: "approved",
      approver_id: "employee-cmp-g7-partner",
      idempotency_key: "cmp-g7-adjustment",
    }),
  });
  assert.equal(adjustment.status, 201);

  const invoice = await json(`/api/revenue/invoices?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      invoice_id: INVOICE_ID,
      prebill_id: PREBILL_ID,
      issue_status: "issued",
      currency: "KRW",
      idempotency_key: "cmp-g7-invoice-issue",
    }),
  });
  assert.equal(invoice.status, 201);
  assert.equal(invoice.body.descriptors.issue.invoice_issue_receipt.idempotent_issue_tested, true);
  assert.equal(invoice.body.descriptors.line_reconciliation.invoice_line_receipt.wip_to_invoice_reconciliation_tested, true);

  const replay = await json(`/api/revenue/invoices?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      invoice_id: INVOICE_ID,
      prebill_id: PREBILL_ID,
      issue_status: "issued",
      currency: "KRW",
      idempotency_key: "cmp-g7-invoice-issue",
    }),
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.outcome, "idempotent_replay");
  assert.equal(replay.body.duplicate_side_effect_blocked, true);
});

test("CMP-G7 records tax invoice, correction, and billing UI masking", async () => {
  const taxInvoice = await json(`/api/revenue/tax-invoices?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      tax_invoice_id: "tax-invoice-cmp-g7-runtime",
      invoice_id: INVOICE_ID,
      transmission_events: [{ action: "issue" }, { action: "transmit" }, { action: "failure" }],
      idempotency_key: "cmp-g7-tax-invoice",
    }),
  });
  assert.equal(taxInvoice.status, 201);
  assert.equal(taxInvoice.body.descriptor.tax_invoice_receipt.issue_transmit_fail_tested, true);

  const correction = await json(`/api/revenue/invoice-corrections?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      correction_id: "correction-cmp-g7-runtime",
      invoice_id: INVOICE_ID,
      correction_type: "credit_note",
      reason_code: "client_adjustment",
      idempotency_key: "cmp-g7-invoice-correction",
    }),
  });
  assert.equal(correction.status, 201);
  assert.equal(correction.body.descriptor.correction_receipt.direct_edit_blocked_tested, true);

  const billingUi = await json(`/api/revenue/ui/billing?${query({ invoice_id: INVOICE_ID, actor_role: "associate" })}`);
  assert.equal(billingUi.status, 200);
  assert.equal(billingUi.body.billing_ui.masked_amount, "masked");
  assert.equal(billingUi.body.billing_ui.unauthorized_amount_leak, false);
});

test("CMP-G7 handles payment import, partial match, AR balance, aging, journal, and exports", async () => {
  const arBalance = await json(`/api/revenue/ar/balances?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      ar_balance_id: AR_BALANCE_ID,
      invoice_id: INVOICE_ID,
      idempotency_key: "cmp-g7-ar-balance",
    }),
  });
  assert.equal(arBalance.status, 201);
  assert.equal(arBalance.body.descriptor.ar_balance_receipt.invoice_issue_creates_ar_tested, true);

  const aging = await json(`/api/revenue/ar/aging?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      aging_snapshot_id: "aging-cmp-g7-runtime",
      ar_balance_id: AR_BALANCE_ID,
      as_of_date: "2026-06-20",
      bucket: "current",
      idempotency_key: "cmp-g7-ar-aging",
    }),
  });
  assert.equal(aging.status, 201);
  assert.equal(aging.body.descriptor.ar_aging_receipt.aging_bucket_tested, true);

  const payment = await json(`/api/revenue/payments/import?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      payment_id: PAYMENT_ID,
      invoice_id: INVOICE_ID,
      import_batch_id: "payment-import-cmp-g7-runtime",
      import_ref: "bank-import-cmp-g7-runtime",
      amount: 100,
      idempotency_key: "cmp-g7-payment-import",
    }),
  });
  assert.equal(payment.status, 201);
  assert.equal(payment.body.descriptors.schema.payment_schema_receipt.imported_unmatched_state_tested, true);
  assert.equal(payment.body.descriptors.import.payment_import_receipt.duplicate_import_idempotency_tested, true);

  const match = await json(`/api/revenue/payments/${PAYMENT_ID}/match?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      match_id: "match-cmp-g7-runtime",
      invoice_id: INVOICE_ID,
      match_type: "partial",
      amount: 100,
      idempotency_key: "cmp-g7-payment-match",
    }),
  });
  assert.equal(match.status, 200);
  assert.equal(match.body.descriptor.payment_match_receipt.partial_match_tested, true);

  const journal = await json(`/api/revenue/journal-entries?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      journal_entry_id: JOURNAL_ENTRY_ID,
      matter_id: MATTER_ID,
      lines: [
        { side: "debit", amount: 100 },
        { side: "credit", amount: 100 },
      ],
      source_events: [{ event_id: "audit-cmp-g7-payment" }],
      idempotency_key: "cmp-g7-journal-entry",
    }),
  });
  assert.equal(journal.status, 201);
  assert.equal(journal.body.descriptor.journal_entry_receipt.balanced_entry_tested, true);

  const accountingExport = await json(`/api/revenue/accounting-exports?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      export_batch_id: "accounting-export-cmp-g7-runtime",
      export_format: "csv",
      journal_entry_ids: [JOURNAL_ENTRY_ID],
      export_audit_ref: "audit-cmp-g7-accounting-export",
      idempotency_key: "cmp-g7-accounting-export",
    }),
  });
  assert.equal(accountingExport.status, 201);
  assert.equal(accountingExport.body.descriptor.accounting_export_receipt.export_audit_tested, true);

  const vatTaxExport = await json(`/api/revenue/vat-tax-exports?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      tax_export_id: "vat-tax-export-cmp-g7-runtime",
      period_id: "period-cmp-g7-runtime",
      period_locked: true,
      tax_total: 10,
      invoice_tax_summaries: [{ invoice_id: INVOICE_ID, tax_amount: 10 }],
      idempotency_key: "cmp-g7-vat-tax-export",
    }),
  });
  assert.equal(vatTaxExport.status, 201);
  assert.equal(vatTaxExport.body.descriptor.vat_tax_export_receipt.period_lock_tested, true);
});

test("CMP-G7 records locked settlement run, credits, approval, finance UI masking, evidence, and audit", async () => {
  const settlementRun = await json(`/api/revenue/settlement-runs?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      settlement_run_id: SETTLEMENT_RUN_ID,
      period_id: "period-cmp-g7-runtime",
      matter_id: MATTER_ID,
      idempotency_key: "cmp-g7-settlement-run",
    }),
  });
  assert.equal(settlementRun.status, 201);
  assert.equal(settlementRun.body.descriptor.settlement_run_receipt.run_lock_tested, true);

  const origination = await json(`/api/revenue/settlement-runs/${SETTLEMENT_RUN_ID}/credits/origination?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      matter_id: MATTER_ID,
      origination_credits: [{ tenant_id: TENANT, matter_id: MATTER_ID, partner_id: "employee-cmp-g7-originator", allocation_percent: 100 }],
      idempotency_key: "cmp-g7-origination-credit",
    }),
  });
  assert.equal(origination.status, 201);
  assert.equal(origination.body.descriptor.origination_credit_receipt.allocation_sum_tested, true);

  const working = await json(`/api/revenue/settlement-runs/${SETTLEMENT_RUN_ID}/credits/working?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      matter_id: MATTER_ID,
      working_credits: [{ tenant_id: TENANT, matter_id: MATTER_ID, partner_id: "employee-cmp-g7-worker", role: "working_partner", allocation_percent: 50 }],
      idempotency_key: "cmp-g7-working-credit",
    }),
  });
  assert.equal(working.status, 201);
  assert.equal(working.body.descriptor.working_credit_receipt.role_allocation_tested, true);

  const approval = await json(`/api/revenue/settlement-runs/${SETTLEMENT_RUN_ID}/approval?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      matter_id: MATTER_ID,
      approval_status: "approved",
      approver_id: "employee-cmp-g7-finance",
      idempotency_key: "cmp-g7-settlement-approval",
    }),
  });
  assert.equal(approval.status, 200);
  assert.equal(approval.body.descriptor.approval_workflow_receipt.direct_edit_blocked_tested, true);

  const financeUi = await json(`/api/revenue/ui/finance?${query({ actor_role: "associate" })}`);
  assert.equal(financeUi.status, 200);
  assert.equal(financeUi.body.finance_ui.allocation_summary, "masked");
  assert.equal(financeUi.body.finance_ui.raw_settlement_payload_loaded, false);

  const evidence = await json(`/api/revenue/runtime/evidence?${query()}`);
  assert.equal(evidence.status, 200);
  assert.equal(evidence.body.evidence.cmp_gate, "CMP-G7");
  assert.equal(evidence.body.evidence.tuw_ids.length, 26);
  assert.equal(evidence.body.evidence.cost_basis_guard_enforced, true);
  assert.equal(evidence.body.evidence.finance_write_audit_idempotency_enforced, true);
  assert.equal(evidence.body.evidence.runtime_readiness, "runtime_api_evidence_only__durable_persistence_open");

  const audit = await json(`/api/revenue/audit?${query()}`);
  assert.equal(audit.status, 200);
  assert.equal(audit.body.verification.ok, true);
  assert.ok(audit.body.events.length >= 20);
  assert.ok(audit.body.idempotency_receipts.some((receipt) => receipt.idempotency_key === "cmp-g7-invoice-issue"));
});
