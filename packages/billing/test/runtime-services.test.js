import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  approvePreBillWithoutAdjustment,
  applyWriteDownOff,
  createFinanceRepository,
  createInvoiceFromPreBill,
  createPreBill,
  createTaxInvoice,
  generateInvoiceLines,
  generateWipFromApprovedItems,
  lockWipSnapshot,
  correctInvoice,
} from "../src/index.js";
import {
  approveTimeEntryForWip,
  createDisbursement,
  createExpense,
  createFeeArrangement,
  createRateCard,
  createTimeEntry,
} from "../../time-expense/src/index.js";
import {
  computeArBalance,
  createAccountingExport,
  createAccountingCsvExport,
  createArAgingSnapshot,
  createJournalEntry,
  createTaxExport,
  drawdownTrustToInvoice,
  getTrustBalanceReport,
  importPayment,
  matchPaymentToInvoice,
  receiveTrustDeposit,
  recordTrustRefundLiability,
} from "../../payments/src/index.js";
import { assignWorkingCredit, createSettlementRun } from "../../settlement/src/index.js";

const TENANT = "tenant-cmp-g7";
const MATTER = "matter-cmp-g7";
const ACTOR = "user-cmp-g7";

function buildFinanceChain(repository = createFinanceRepository()) {
  const rate = createRateCard({
    repository,
    rate_card: {
      rate_card_id: "rate-g7-001",
      tenant_id: TENANT,
      currency: "KRW",
      effective_from: "2026-06-20",
      role_rates: [{ role_id: "partner", hourly_rate: 400000 }],
    },
    actor_id: ACTOR,
    idempotency_key: "rate-1",
  });
  createFeeArrangement({
    repository,
    fee_arrangement: {
      fee_arrangement_id: "fee-arrangement-g7-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      billing_profile_id: "billing-profile-g7",
      rate_card_id: "rate-g7-001",
    },
    rate_card: rate.rate_card,
    actor_id: ACTOR,
    idempotency_key: "fee-arrangement-1",
  });
  createTimeEntry({
    repository,
    time_entry: {
      time_entry_id: "time-g7-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      role_id: "partner",
      work_date: "2026-06-20",
      narrative: "Draft agreement",
      duration_minutes: 60,
      billable: true,
    },
    actor_id: ACTOR,
    idempotency_key: "time-1",
  });
  approveTimeEntryForWip({ repository, tenant_id: TENANT, time_entry_id: "time-g7-001", actor_id: ACTOR, idempotency_key: "time-approve-1" });
  createExpense({
    repository,
    expense: {
      expense_id: "expense-g7-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      receipt_document_id: "receipt-doc-1",
      amount: 50000,
      currency: "KRW",
      status: "approved",
    },
    actor_id: ACTOR,
    idempotency_key: "expense-1",
  });
  createDisbursement({
    repository,
    disbursement: {
      disbursement_id: "disbursement-g7-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      vendor_ref: "vendor-1",
      amount: 30000,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "disbursement-1",
  });
  const wip = generateWipFromApprovedItems({
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    rate_card: rate.rate_card,
    actor_id: ACTOR,
    idempotency_key: "wip-1",
  });
  const snapshot = lockWipSnapshot({
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    wip_item_ids: wip.wip_items.map((item) => item.wip_item_id),
    wip_snapshot_id: "snapshot-g7-001",
    actor_id: ACTOR,
    idempotency_key: "snapshot-1",
  });
  const prebill = createPreBill({
    repository,
    prebill: {
      prebill_id: "prebill-g7-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      wip_snapshot_id: snapshot.wip_snapshot.wip_snapshot_id,
      partner_reviewer_id: ACTOR,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "prebill-1",
  });
  const adjusted = applyWriteDownOff({
    repository,
    adjustment: {
      adjustment_id: "adjustment-g7-001",
      tenant_id: TENANT,
      prebill_id: prebill.prebill.prebill_id,
      reason_code: "partner_discount",
      amount: 30000,
    },
    actor_id: ACTOR,
    idempotency_key: "adjustment-1",
  });
  generateInvoiceLines({
    repository,
    tenant_id: TENANT,
    invoice_id: "invoice-preview-g7-001",
    prebill_id: adjusted.prebill.prebill_id,
    actor_id: ACTOR,
    idempotency_key: "line-preview-1",
  });
  const invoice = createInvoiceFromPreBill({
    repository,
    invoice: {
      invoice_id: "invoice-g7-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      prebill_id: adjusted.prebill.prebill_id,
      billing_client_party_id: "party-client-g7",
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "invoice-1",
  });
  const tax = createTaxInvoice({
    repository,
    tax_invoice: {
      tax_invoice_id: "tax-invoice-g7-001",
      tenant_id: TENANT,
      invoice_id: invoice.invoice.invoice_id,
      tax_registration_ref: "vat-reg-1",
      tax_rate: 0.1,
    },
    actor_id: ACTOR,
    idempotency_key: "tax-invoice-1",
  });
  correctInvoice({
    repository,
    correction: {
      invoice_correction_id: "invoice-correction-g7-001",
      tenant_id: TENANT,
      invoice_id: invoice.invoice.invoice_id,
      reason_code: "address_fix",
    },
    actor_id: ACTOR,
    idempotency_key: "invoice-correction-1",
  });
  const payment = importPayment({
    repository,
    payment: {
      payment_id: "payment-g7-001",
      tenant_id: TENANT,
      bank_reference: "bank-ref-hidden",
      amount: invoice.invoice.amount_due,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "payment-1",
  });
  const match = matchPaymentToInvoice({
    repository,
    match: {
      payment_match_id: "payment-match-g7-001",
      tenant_id: TENANT,
      payment_id: payment.payment.payment_id,
      invoice_id: invoice.invoice.invoice_id,
      amount: invoice.invoice.amount_due,
    },
    actor_id: ACTOR,
    idempotency_key: "match-1",
  });
  const ar = computeArBalance({ repository, tenant_id: TENANT, invoice_id: invoice.invoice.invoice_id, actor_id: ACTOR, idempotency_key: "ar-1" });
  const aging = createArAgingSnapshot({ repository, tenant_id: TENANT, actor_id: ACTOR, idempotency_key: "aging-1", ar_aging_snapshot_id: "aging-g7-001" });
  const journal = createJournalEntry({
    repository,
    journal_entry: {
      journal_entry_id: "journal-g7-001",
      tenant_id: TENANT,
      source_ref: invoice.invoice.invoice_id,
      lines: [
        { account: "ar", debit: invoice.invoice.amount_due, credit: 0 },
        { account: "revenue", debit: 0, credit: invoice.invoice.amount_due },
      ],
    },
    actor_id: ACTOR,
    idempotency_key: "journal-1",
  });
  createAccountingExport({
    repository,
    accounting_export: {
      accounting_export_id: "accounting-export-g7-001",
      tenant_id: TENANT,
      journal_entry_refs: [journal.journal_entry.journal_entry_id],
    },
    actor_id: ACTOR,
    idempotency_key: "accounting-export-1",
  });
  createTaxExport({
    repository,
    tax_export: {
      tax_export_id: "tax-export-g7-001",
      tenant_id: TENANT,
      tax_invoice_refs: [tax.tax_invoice.tax_invoice_id],
    },
    actor_id: ACTOR,
    idempotency_key: "tax-export-1",
  });
  createSettlementRun({
    repository,
    settlement_run: {
      settlement_run_id: "settlement-g7-001",
      tenant_id: TENANT,
      payment_match_refs: [match.payment_match.payment_match_id],
    },
    actor_id: ACTOR,
    idempotency_key: "settlement-1",
  });
  assignWorkingCredit({
    repository,
    working_credit: {
      working_credit_id: "credit-g7-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      employee_id: "employee-g7-originator",
      credit_percent: 25,
    },
    actor_id: ACTOR,
    idempotency_key: "credit-1",
  });
  return { invoice, ar, aging };
}

test("G7 finance repository persists state, audit, and idempotency across reopen", () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "finance-g7-")), "finance.json");
  const repository = createFinanceRepository({ filePath: storePath });
  buildFinanceChain(repository);
  repository.close();

  const reopened = createFinanceRepository({ filePath: storePath });
  assert.equal(reopened.list({ tenant_id: TENANT, model_type: "Invoice" }).length, 1);
  assert.equal(reopened.getIdempotency({ tenant_id: TENANT, idempotency_key: "invoice-1" }).operation, "invoice_create");
  assert.equal(reopened.listAudit({ tenant_id: TENANT }).some((event) => event.action === "settlement.run.close"), true);
});

test("G7 finance runtime chain creates WIP through settlement without mutating issued invoices", () => {
  const repository = createFinanceRepository();
  const { invoice, ar, aging } = buildFinanceChain(repository);
  assert.equal(invoice.invoice.mutates_issued_invoice, false);
  assert.match(invoice.invoice.due_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(ar.ar_balance.due_date, invoice.invoice.due_date);
  assert.equal(ar.ar_balance.balance, 0);
  assert.equal(aging.ar_aging_snapshot.balance_count, 1);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "WorkingCredit" })[0].credit_percent, 25);
  assert.throws(
    () =>
      createJournalEntry({
        repository,
        journal_entry: {
          journal_entry_id: "journal-unbalanced",
          tenant_id: TENANT,
          source_ref: "bad",
          lines: [
            { account: "ar", debit: 10, credit: 0 },
            { account: "revenue", debit: 0, credit: 9 },
          ],
        },
        actor_id: ACTOR,
        idempotency_key: "journal-bad",
      }),
    /not balanced/,
  );
});

function buildFeeArrangementInvoice({ suffix, type, terms = {}, timeEntries = [{ duration_minutes: 60 }], expectedType = type }) {
  const repository = createFinanceRepository();
  const matterId = `${MATTER}-${suffix}`;
  const rate = createRateCard({
    repository,
    rate_card: {
      rate_card_id: `rate-g7-b11-${suffix}`,
      tenant_id: TENANT,
      currency: "KRW",
      effective_from: "2026-07-01",
      role_rates: [{ role_id: "partner", hourly_rate: 100000 }],
    },
    actor_id: ACTOR,
    idempotency_key: `rate-b11-${suffix}`,
  });
  const fee = createFeeArrangement({
    repository,
    fee_arrangement: {
      fee_arrangement_id: `fee-g7-b11-${suffix}`,
      tenant_id: TENANT,
      matter_id: matterId,
      billing_profile_id: `billing-profile-g7-b11-${suffix}`,
      rate_card_id: rate.rate_card.rate_card_id,
      type,
      ...terms,
    },
    rate_card: rate.rate_card,
    actor_id: ACTOR,
    idempotency_key: `fee-b11-${suffix}`,
  });

  for (const [index, entry] of timeEntries.entries()) {
    createTimeEntry({
      repository,
      time_entry: {
        time_entry_id: `time-g7-b11-${suffix}-${index}`,
        tenant_id: TENANT,
        matter_id: matterId,
        role_id: "partner",
        work_date: "2026-07-02",
        narrative: `B11 ${suffix} time ${index}`,
        duration_minutes: entry.duration_minutes,
        billable: true,
      },
      actor_id: ACTOR,
      idempotency_key: `time-b11-${suffix}-${index}`,
    });
    approveTimeEntryForWip({
      repository,
      tenant_id: TENANT,
      time_entry_id: `time-g7-b11-${suffix}-${index}`,
      actor_id: ACTOR,
      idempotency_key: `time-b11-${suffix}-${index}-approve`,
    });
  }

  const wip = generateWipFromApprovedItems({
    repository,
    tenant_id: TENANT,
    matter_id: matterId,
    rate_card: rate.rate_card,
    fee_arrangement: fee.fee_arrangement,
    actor_id: ACTOR,
    idempotency_key: `wip-b11-${suffix}`,
  });
  const snapshot = lockWipSnapshot({
    repository,
    tenant_id: TENANT,
    matter_id: matterId,
    wip_item_ids: wip.wip_items.map((item) => item.wip_item_id),
    wip_snapshot_id: `snapshot-g7-b11-${suffix}`,
    actor_id: ACTOR,
    idempotency_key: `snapshot-b11-${suffix}`,
  });
  const prebill = createPreBill({
    repository,
    prebill: {
      prebill_id: `prebill-g7-b11-${suffix}`,
      tenant_id: TENANT,
      matter_id: matterId,
      wip_snapshot_id: snapshot.wip_snapshot.wip_snapshot_id,
      partner_reviewer_id: ACTOR,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: `prebill-b11-${suffix}`,
  });
  const approved = approvePreBillWithoutAdjustment({
    repository,
    tenant_id: TENANT,
    prebill_id: prebill.prebill.prebill_id,
    actor_id: ACTOR,
    idempotency_key: `prebill-b11-${suffix}-approve`,
  });
  const invoice = createInvoiceFromPreBill({
    repository,
    invoice: {
      invoice_id: `invoice-g7-b11-${suffix}`,
      tenant_id: TENANT,
      matter_id: matterId,
      prebill_id: approved.prebill.prebill_id,
      billing_client_party_id: `party-g7-b11-${suffix}`,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: `invoice-b11-${suffix}`,
  });
  assert.equal(fee.fee_arrangement.type, expectedType);
  return { fee, wip, snapshot, prebill: approved, invoice };
}

test("G7 fee arrangement types branch WIP prebill and invoice calculations", () => {
  const hourly = buildFeeArrangementInvoice({ suffix: "hourly", type: "hourly" });
  assert.equal(hourly.snapshot.wip_snapshot.total_amount, 100000);
  assert.equal(hourly.invoice.invoice.amount_due, 100000);
  assert.equal(hourly.invoice.invoice.fee_arrangement_type, "hourly");

  const fixed = buildFeeArrangementInvoice({
    suffix: "fixed",
    type: "fixed",
    terms: { fixed_fee_amount: 250000 },
    timeEntries: [{ duration_minutes: 60 }, { duration_minutes: 30 }],
  });
  assert.deepEqual(fixed.wip.wip_items.map((item) => item.amount), [250000, 0]);
  assert.equal(fixed.snapshot.wip_snapshot.total_amount, 250000);
  assert.equal(fixed.prebill.prebill.total_amount, 250000);
  assert.equal(fixed.invoice.invoice.amount_due, 250000);
  assert.equal(fixed.invoice.invoice.fee_arrangement_type, "fixed");

  const pendingSuccess = buildFeeArrangementInvoice({
    suffix: "success-pending",
    type: "success_fee",
    terms: { upfront_fee_amount: 100000, success_fee_amount: 500000, success_condition_met: false },
  });
  assert.equal(pendingSuccess.invoice.invoice.amount_due, 100000);
  assert.equal(pendingSuccess.invoice.invoice.success_fee_applied, false);

  const earnedSuccess = buildFeeArrangementInvoice({
    suffix: "success-earned",
    type: "success_fee",
    terms: { upfront_fee_amount: 100000, success_fee_amount: 500000, success_condition_met: true },
  });
  assert.equal(earnedSuccess.snapshot.wip_snapshot.total_amount, 600000);
  assert.equal(earnedSuccess.invoice.invoice.amount_due, 600000);
  assert.equal(earnedSuccess.invoice.invoice.success_fee_applied, true);

  const retainer = buildFeeArrangementInvoice({
    suffix: "retainer",
    type: "retainer",
    terms: { retainer_amount: 150000 },
    timeEntries: [{ duration_minutes: 120 }],
  });
  assert.equal(retainer.snapshot.wip_snapshot.standard_amount, 200000);
  assert.equal(retainer.snapshot.wip_snapshot.retainer_drawdown_total, 150000);
  assert.equal(retainer.snapshot.wip_snapshot.total_amount, 50000);
  assert.equal(retainer.invoice.invoice.amount_due, 50000);
  assert.equal(retainer.invoice.invoice.retainer_drawdown_total, 150000);
});

test("G7 trust ledger separates deposits drawdowns refund liabilities and blocks negative balances", () => {
  const repository = createFinanceRepository();
  repository.create({
    model_type: "Invoice",
    invoice_id: "invoice-trust-g7-b12",
    tenant_id: TENANT,
    matter_id: MATTER,
    billing_client_party_id: "party-client-g7",
    amount_due: 300000,
    amount_paid: 0,
    currency: "KRW",
    status: "issued",
  });

  const deposit = receiveTrustDeposit({
    repository,
    deposit: {
      trust_ledger_entry_id: "trust-ledger-deposit-g7-b12",
      tenant_id: TENANT,
      matter_id: MATTER,
      client_group_id: "client-group-g7",
      amount: 500000,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "trust-deposit-b12-1",
  });
  assert.equal(deposit.trust_balance.available_balance, 500000);
  assert.equal(deposit.trust_balance.refund_liability_amount, 500000);
  assert.equal(deposit.trust_ledger_entry.segregated_client_funds, true);

  const drawdown = drawdownTrustToInvoice({
    repository,
    drawdown: {
      trust_ledger_entry_id: "trust-ledger-drawdown-g7-b12",
      tenant_id: TENANT,
      matter_id: MATTER,
      invoice_id: "invoice-trust-g7-b12",
      amount: 300000,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "trust-drawdown-b12-1",
  });
  assert.equal(drawdown.invoice.amount_due, 300000);
  assert.equal(drawdown.invoice.amount_paid, 300000);
  assert.equal(drawdown.invoice.trust_drawdown_amount, 300000);
  assert.equal(drawdown.invoice.status, "paid");
  assert.equal(drawdown.trust_balance.available_balance, 200000);
  assert.equal(drawdown.trust_balance.drawdown_total, 300000);
  assert.equal(drawdown.trust_balance.refund_liability_amount, 200000);

  assert.throws(
    () =>
      drawdownTrustToInvoice({
        repository,
        drawdown: {
          trust_ledger_entry_id: "trust-ledger-overdraw-g7-b12",
          tenant_id: TENANT,
          matter_id: MATTER,
          invoice_id: "invoice-trust-g7-b12",
          amount: 1,
          currency: "KRW",
        },
        actor_id: ACTOR,
        idempotency_key: "trust-overdraw-b12-1",
      }),
    /trust drawdown exceeds invoice outstanding/,
  );

  const refund = recordTrustRefundLiability({
    repository,
    refund: {
      trust_ledger_entry_id: "trust-ledger-refund-g7-b12",
      tenant_id: TENANT,
      matter_id: MATTER,
      amount: 200000,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "trust-refund-b12-1",
  });
  assert.equal(refund.trust_balance.available_balance, 0);
  assert.equal(refund.trust_balance.refund_total, 200000);
  assert.equal(refund.trust_balance.refund_liability_amount, 0);

  assert.throws(
    () =>
      recordTrustRefundLiability({
        repository,
        refund: {
          trust_ledger_entry_id: "trust-ledger-negative-refund-g7-b12",
          tenant_id: TENANT,
          matter_id: MATTER,
          amount: 1,
          currency: "KRW",
        },
        actor_id: ACTOR,
        idempotency_key: "trust-negative-refund-b12-1",
      }),
    /negative trust balance blocked/,
  );

  const report = getTrustBalanceReport({ repository, tenant_id: TENANT, matter_id: MATTER, currency: "KRW" });
  assert.equal(report.items.length, 1);
  assert.equal(report.summary.deposit_total, 500000);
  assert.equal(report.summary.drawdown_total, 300000);
  assert.equal(report.summary.refund_total, 200000);
  assert.equal(report.summary.available_balance, 0);
  assert.equal(report.summary.negative_trust_balance_blocked, true);
});

test("G7 prebill approval without adjustment and payment matching preserve unapplied cash", () => {
  const repository = createFinanceRepository();
  repository.create({
    model_type: "WipSnapshot",
    wip_snapshot_id: "snapshot-no-adjustment-g7",
    tenant_id: TENANT,
    matter_id: MATTER,
    total_amount: 100000,
    immutable_snapshot: true,
  });

  const prebill = createPreBill({
    repository,
    prebill: {
      prebill_id: "prebill-no-adjustment-g7",
      tenant_id: TENANT,
      matter_id: MATTER,
      wip_snapshot_id: "snapshot-no-adjustment-g7",
      partner_reviewer_id: ACTOR,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "prebill-no-adjustment-1",
  });
  const approved = approvePreBillWithoutAdjustment({
    repository,
    tenant_id: TENANT,
    prebill_id: prebill.prebill.prebill_id,
    actor_id: ACTOR,
    idempotency_key: "prebill-no-adjustment-approve-1",
  });
  assert.equal(approved.prebill.status, "partner_approved");
  assert.equal(approved.prebill.approved_without_adjustment, true);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "BillingAdjustment" }).length, 0);

  const invoice = createInvoiceFromPreBill({
    repository,
    invoice: {
      invoice_id: "invoice-no-adjustment-g7",
      tenant_id: TENANT,
      matter_id: MATTER,
      prebill_id: prebill.prebill.prebill_id,
      billing_client_party_id: "party-client-g7",
      currency: "KRW",
      issued_at: "2026-07-02T00:00:00.000Z",
    },
    actor_id: ACTOR,
    idempotency_key: "invoice-no-adjustment-1",
  });
  assert.equal(invoice.invoice.invoice_number, "INV-2026-000001");
  assert.equal(invoice.invoice.due_date, "2026-08-01");

  const payment = importPayment({
    repository,
    payment: {
      payment_id: "payment-overpayment-g7",
      tenant_id: TENANT,
      bank_reference: "bank-overpayment-hidden",
      amount: 120000,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "payment-overpayment-1",
  });
  const partial = matchPaymentToInvoice({
    repository,
    match: {
      payment_match_id: "payment-match-partial-g7",
      tenant_id: TENANT,
      payment_id: payment.payment.payment_id,
      invoice_id: invoice.invoice.invoice_id,
      amount: 40000,
    },
    actor_id: ACTOR,
    idempotency_key: "match-partial-1",
  });
  assert.equal(partial.invoice.status, "partially_paid");
  assert.equal(partial.payment.status, "partially_matched");
  assert.equal(partial.payment.unapplied_amount, 80000);

  const finalMatch = matchPaymentToInvoice({
    repository,
    match: {
      payment_match_id: "payment-match-overpayment-g7",
      tenant_id: TENANT,
      payment_id: payment.payment.payment_id,
      invoice_id: invoice.invoice.invoice_id,
      amount: 60000,
    },
    actor_id: ACTOR,
    idempotency_key: "match-overpayment-1",
  });
  assert.equal(finalMatch.invoice.status, "paid");
  assert.equal(finalMatch.payment.status, "partially_matched");
  assert.equal(finalMatch.payment.unapplied_amount, 20000);
});

test("G7 invoice due dates are mandatory before AR balance and aging", () => {
  const repository = createFinanceRepository();
  repository.create({
    model_type: "WipSnapshot",
    wip_snapshot_id: "snapshot-due-date-g7",
    tenant_id: TENANT,
    matter_id: MATTER,
    total_amount: 100000,
    immutable_snapshot: true,
  });

  const prebill = createPreBill({
    repository,
    prebill: {
      prebill_id: "prebill-due-date-g7",
      tenant_id: TENANT,
      matter_id: MATTER,
      wip_snapshot_id: "snapshot-due-date-g7",
      partner_reviewer_id: ACTOR,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "prebill-due-date-1",
  });
  const approved = approvePreBillWithoutAdjustment({
    repository,
    tenant_id: TENANT,
    prebill_id: prebill.prebill.prebill_id,
    actor_id: ACTOR,
    idempotency_key: "prebill-due-date-approve-1",
  });

  assert.throws(
    () =>
      createInvoiceFromPreBill({
        repository,
        invoice: {
          invoice_id: "invoice-invalid-due-date-g7",
          tenant_id: TENANT,
          matter_id: MATTER,
          prebill_id: approved.prebill.prebill_id,
          billing_client_party_id: "party-client-g7",
          currency: "KRW",
          due_date: "2026-02-31",
        },
        actor_id: ACTOR,
        idempotency_key: "invoice-invalid-due-date-1",
      }),
    /due_date must be a valid ISO date/,
  );
  assert.throws(
    () =>
      createInvoiceFromPreBill({
        repository,
        invoice: {
          invoice_id: "invoice-invalid-issued-at-g7",
          tenant_id: TENANT,
          matter_id: MATTER,
          prebill_id: approved.prebill.prebill_id,
          billing_client_party_id: "party-client-g7",
          currency: "KRW",
          issued_at: "not-a-date",
        },
        actor_id: ACTOR,
        idempotency_key: "invoice-invalid-issued-at-1",
      }),
    /issued_at must be a valid date/,
  );

  const invoice = createInvoiceFromPreBill({
    repository,
    invoice: {
      invoice_id: "invoice-valid-due-date-g7",
      tenant_id: TENANT,
      matter_id: MATTER,
      prebill_id: approved.prebill.prebill_id,
      billing_client_party_id: "party-client-g7",
      currency: "KRW",
      issued_at: "2026-07-02T00:00:00.000Z",
      payment_terms_days: 45,
    },
    actor_id: ACTOR,
    idempotency_key: "invoice-valid-due-date-1",
  });
  assert.equal(invoice.invoice.due_date, "2026-08-16");

  repository.upsert({
    model_type: "Invoice",
    invoice_id: "invoice-missing-due-date-g7",
    tenant_id: TENANT,
    matter_id: MATTER,
    billing_client_party_id: "party-client-g7",
    amount_due: 100,
    amount_paid: 0,
    status: "issued",
  });
  assert.throws(
    () =>
      computeArBalance({
        repository,
        tenant_id: TENANT,
        invoice_id: "invoice-missing-due-date-g7",
        actor_id: ACTOR,
        idempotency_key: "ar-missing-due-date-1",
      }),
    /invoice due_date must be a valid ISO date/,
  );

  repository.upsert({
    model_type: "ARBalance",
    ar_balance_id: "ar-missing-due-date-g7",
    tenant_id: TENANT,
    matter_id: MATTER,
    invoice_id: "invoice-absent-due-date-g7",
    balance: 100,
    status: "open",
  });
  assert.throws(
    () =>
      createArAgingSnapshot({
        repository,
        tenant_id: TENANT,
        actor_id: ACTOR,
        idempotency_key: "aging-missing-due-date-1",
        ar_aging_snapshot_id: "aging-missing-due-date-g7",
        as_of_date: "2026-07-15",
      }),
    /ar_balance due_date must be a valid ISO date/,
  );
});

test("G7 accounting CSV export filters period and preserves debit credit balance", () => {
  const repository = createFinanceRepository();
  createJournalEntry({
    repository,
    journal_entry: {
      journal_entry_id: "journal-g7-july",
      tenant_id: TENANT,
      matter_id: MATTER,
      source_ref: "invoice-g7-july",
      currency: "KRW",
      posted_at: "2026-07-05T00:00:00.000Z",
      lines: [
        { account: "ar", debit: 1000, credit: 0 },
        { account: "revenue", debit: 0, credit: 1000 },
      ],
    },
    actor_id: ACTOR,
    idempotency_key: "journal-july-1",
  });
  createJournalEntry({
    repository,
    journal_entry: {
      journal_entry_id: "journal-g7-june",
      tenant_id: TENANT,
      matter_id: MATTER,
      source_ref: "invoice-g7-june",
      currency: "KRW",
      posted_at: "2026-06-25T00:00:00.000Z",
      lines: [
        { account: "ar", debit: 500, credit: 0 },
        { account: "revenue", debit: 0, credit: 500 },
      ],
    },
    actor_id: ACTOR,
    idempotency_key: "journal-june-1",
  });

  const exported = createAccountingCsvExport({
    repository,
    tenant_id: TENANT,
    from_date: "2026-07-01",
    to_date: "2026-07-31",
    actor_id: ACTOR,
    idempotency_key: "accounting-csv-july-1",
  }).accounting_export;

  assert.equal(exported.row_count, 2);
  assert.equal(exported.debit_total, 1000);
  assert.equal(exported.credit_total, 1000);
  assert.equal(exported.balanced, true);
  assert.equal(exported.bank_reference_included, false);
  assert.equal(exported.credential_material_included, false);
  assert.equal(exported.raw_journal_payload_included, false);
  assert.equal(exported.csv_sha256.length, 64);
  assert.match(exported.csv_text, /^journal_entry_id,posting_date,source_ref,matter_id,account,debit,credit,currency/);
  assert.match(exported.csv_text, /journal-g7-july/);
  assert.doesNotMatch(exported.csv_text, /journal-g7-june/);
});

test("G7 AR aging buckets use invoice due dates instead of fixed 1-30 buckets", () => {
  const repository = createFinanceRepository();
  for (const balance of [
    ["ar-current", "invoice-current", "2026-07-20", 100],
    ["ar-1-30", "invoice-1-30", "2026-07-01", 200],
    ["ar-31-60", "invoice-31-60", "2026-06-10", 300],
    ["ar-61-90", "invoice-61-90", "2026-05-10", 400],
    ["ar-90-plus", "invoice-90-plus", "2026-04-10", 500],
  ]) {
    const [ar_balance_id, invoice_id, due_date, balanceAmount] = balance;
    repository.upsert({
      model_type: "Invoice",
      invoice_id,
      tenant_id: TENANT,
      matter_id: MATTER,
      billing_client_party_id: "party-client-g7",
      amount_due: balanceAmount,
      amount_paid: 0,
      due_date,
      status: "issued",
    });
    repository.upsert({
      model_type: "ARBalance",
      ar_balance_id,
      tenant_id: TENANT,
      matter_id: MATTER,
      invoice_id,
      balance: balanceAmount,
      status: "open",
    });
  }

  const aging = createArAgingSnapshot({
    repository,
    tenant_id: TENANT,
    actor_id: ACTOR,
    idempotency_key: "aging-buckets-1",
    ar_aging_snapshot_id: "aging-buckets-g7",
    as_of_date: "2026-07-15",
  }).ar_aging_snapshot;

  assert.equal(aging.bucket_current, 100);
  assert.equal(aging.bucket_1_30, 200);
  assert.equal(aging.bucket_31_60, 300);
  assert.equal(aging.bucket_61_90, 400);
  assert.equal(aging.bucket_90_plus, 500);
  assert.equal(aging.as_of_date, "2026-07-15");
  assert.equal(aging.bucket_source, "due_date");
});
