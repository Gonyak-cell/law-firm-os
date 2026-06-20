import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
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
  createArAgingSnapshot,
  createJournalEntry,
  createTaxExport,
  importPayment,
  matchPaymentToInvoice,
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
