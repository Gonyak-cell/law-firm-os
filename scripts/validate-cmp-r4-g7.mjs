#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const REQUIRED_FILES = [
  "packages/billing/src/finance-repository.js",
  "packages/time-expense/src/time-entry-service.js",
  "packages/time-expense/src/rate-card-service.js",
  "packages/time-expense/src/fee-arrangement-service.js",
  "packages/time-expense/src/expense-service.js",
  "packages/time-expense/src/disbursement-service.js",
  "packages/billing/src/wip-service.js",
  "packages/billing/src/prebill-service.js",
  "packages/billing/src/invoice-service.js",
  "packages/billing/src/tax-invoice-service.js",
  "packages/payments/src/payment-service.js",
  "packages/payments/src/matching-service.js",
  "packages/payments/src/ar-service.js",
  "packages/payments/src/journal-service.js",
  "packages/payments/src/accounting-export-service.js",
  "packages/payments/src/tax-export-service.js",
  "packages/payments/src/trust-ledger-service.js",
  "packages/settlement/src/settlement-run-service.js",
  "packages/settlement/src/credit-service.js",
  "apps/api/src/finance-runtime-context.js",
  "apps/web/src/components/FinanceSurface.jsx",
  "apps/web/src/components/MattersSurface.jsx",
  "apps/web/src/data/apiClient.js",
  "scripts/validate-cmp-r4-g7.mjs",
  "docs/reorganization/client-matter-os/cmp-v1/r4-g7-closeout.md",
];

const REQUIRED_TESTS = [
  "packages/billing/test/runtime-services.test.js",
  "apps/api/test/cmp-r4-g7-finance.test.js",
  "apps/web/test/ui-regression.test.mjs",
];

const REQUIRED_EVIDENCE = Array.from({ length: 26 }, (_, index) =>
  `docs/reorganization/client-matter-os/cmp-v1/evidence/cmp-g7-${String(index + 1).padStart(3, "0")}.md`,
);

const failures = [];

for (const file of [...REQUIRED_FILES, ...REQUIRED_TESTS, ...REQUIRED_EVIDENCE]) {
  if (!existsSync(path.join(ROOT, file))) failures.push(`missing:${file}`);
}

function requirePatterns(file, patterns) {
  const source = readFileSync(path.join(ROOT, file), "utf8");
  for (const pattern of patterns) {
    if (!pattern.test(source)) failures.push(`missing marker:${file}:${pattern.source}`);
  }
}

function rejectPatterns(file, patterns) {
  const source = readFileSync(path.join(ROOT, file), "utf8");
  for (const pattern of patterns) {
    if (pattern.test(source)) failures.push(`forbidden marker:${file}:${pattern.source}`);
  }
}

requirePatterns("packages/billing/src/finance-repository.js", [/filePath/, /recordIdempotency/, /appendAudit/, /transaction\(fn\)/]);
requirePatterns("packages/time-expense/src/time-entry-service.js", [/createTimeEntry/, /approveTimeEntryForWip/, /billable/]);
requirePatterns("packages/time-expense/src/rate-card-service.js", [/createRateCard/, /role_rates/, /hourly_rate/]);
requirePatterns("packages/time-expense/src/fee-arrangement-service.js", [/billing_profile_id/, /rate_overrides/, /FEE_ARRANGEMENT_TYPES/, /fixed_fee_amount/, /success_fee_amount/, /retainer_amount/]);
requirePatterns("packages/time-expense/src/expense-service.js", [/receipt_document_id/, /expense.create/]);
requirePatterns("packages/time-expense/src/disbursement-service.js", [/vendor_ref/, /disbursement.create/]);
requirePatterns("packages/billing/src/wip-service.js", [/generateWipFromApprovedItems/, /lockWipSnapshot/, /immutable_snapshot/, /fee_arrangement.fixed/, /fee_arrangement.success_fee/, /fee_arrangement.retainer_drawdown/]);
requirePatterns("packages/billing/src/prebill-service.js", [/createPreBill/, /applyWriteDownOff/, /approvePreBillWithoutAdjustment/, /rejectPreBill/, /partner_reviewer_id/, /retainer_drawdown_total/, /fee_arrangement_type/]);
requirePatterns("packages/billing/src/invoice-service.js", [/createInvoiceFromPreBill/, /generateInvoiceLines/, /correctInvoice/, /legal_invoice_sequence/, /mutates_issued_invoice: false/, /retainer_drawdown_total/, /fee_arrangement_type/]);
requirePatterns("packages/billing/src/tax-invoice-service.js", [/createTaxInvoice/, /tax_registration_ref/]);
requirePatterns("packages/payments/src/payment-service.js", [/importPayment/, /bank_reference/]);
requirePatterns("packages/payments/src/matching-service.js", [/matchPaymentToInvoice/, /amount_paid/, /unapplied_amount/]);
requirePatterns("packages/payments/src/ar-service.js", [/computeArBalance/, /createArAgingSnapshot/]);
requirePatterns("packages/payments/src/journal-service.js", [/createJournalEntry/, /not balanced/, /posts_gl_entries: true/]);
requirePatterns("packages/payments/src/accounting-export-service.js", [/createAccountingExport/, /createAccountingCsvExport/, /buildAccountingExportCsv/, /credential_material_included: false/]);
requirePatterns("packages/payments/src/tax-export-service.js", [/createTaxExport/, /credential_material_included: false/]);
requirePatterns("packages/payments/src/trust-ledger-service.js", [/receiveTrustDeposit/, /drawdownTrustToInvoice/, /recordTrustRefundLiability/, /getTrustBalanceReport/, /segregated_client_funds/, /negative trust balance blocked/]);
requirePatterns("packages/settlement/src/settlement-run-service.js", [/createSettlementRun/, /payment_match_refs/]);
requirePatterns("packages/settlement/src/credit-service.js", [/assignWorkingCredit/, /credit_percent/]);
requirePatterns("apps/api/src/finance-runtime-context.js", [
  /FINANCE_BOUNDED_CONTEXT/,
  /runtime_write_ready: true/,
  /production_ready_claim: false/,
  /appendFinanceSensitiveReadAudit/,
  /finance_sensitive_read_allowed_after_permission_gate/,
  /sensitive_read_audit_required: true/,
  /handleFinancePaymentImport/,
  /handleFinanceTimeEntryApprove/,
  /handleFinanceExpenseCreate/,
  /handleFinanceDisbursementCreate/,
  /handleFinanceFeeArrangementCreate/,
  /handleFinanceWipSnapshotLock/,
  /handleFinancePreBillCreate/,
  /handleFinancePreBillApprove/,
  /handleFinancePreBillReject/,
  /handleFinanceInvoiceIssue/,
  /handleFinanceAccountingExportCsv/,
  /handleFinancePaymentMatchCreate/,
  /\/api\/finance\/prebills\/approve/,
  /\/api\/finance\/prebills\/reject/,
  /\/api\/finance\/fee-arrangements/,
  /\/api\/finance\/payment-matches/,
  /\/api\/finance\/accounting-export\.csv/,
  /handleFinanceTrustDepositCreate/,
  /handleFinanceTrustDrawdownCreate/,
  /handleFinanceTrustRefundCreate/,
  /handleFinanceTrustBalances/,
  /\/api\/finance\/trust-balances/,
  /\/api\/finance\/trust-deposits/,
  /\/api\/finance\/trust-drawdowns/,
  /\/api\/finance\/trust-refunds/,
  /bank_reference_included: false/,
]);
requirePatterns("apps/web/src/components/FinanceSurface.jsx", [
  /data-cmp-g7-finance-surface="true"/,
  /fetchFinanceTimeEntries/,
  /fetchFinanceInvoices/,
  /fetchFinanceArAging/,
]);
requirePatterns("apps/web/src/components/MattersSurface.jsx", [
  /data-matter-time-entry-form/,
  /data-matter-time-entry-timer-action/,
  /handleTimeEntryFormChange/,
  /handleToggleTimeTimer/,
  /data-matter-prebill-review-action/,
  /data-matter-invoice-issue-action/,
  /data-matter-payment-match-action/,
  /handleCreatePreBillReview/,
  /handleIssueInvoice/,
  /handleMatchPayment/,
  /partner_approved/,
]);
requirePatterns("apps/web/src/data/apiClient.js", [
  /createFinancePreBill/,
  /approveFinancePreBill/,
  /issueFinanceInvoice/,
  /matchFinancePayment/,
  /financePermissionContext/,
  /const timeEntryId = uiRuntimeId\("time_ui"\)/,
  /idempotency_key: timeEntryId/,
  /billable/,
]);
requirePatterns("packages/billing/test/runtime-services.test.js", [/settlement/, /WorkingCredit/, /not mutating issued invoices|mutating issued invoices/, /approval without adjustment/, /unapplied cash/, /accounting CSV export filters period/, /fee arrangement types branch WIP prebill and invoice calculations/, /trust ledger separates deposits drawdowns refund liabilities/]);
requirePatterns("apps/api/test/cmp-r4-g7-finance.test.js", [/persist time\/payment state across restart/, /hide finance secrets/, /sensitive reads write durable allow audits/, /finance:accounting_export:read/, /WIP and AR aging/, /api-fee-arrangement-g7-b11/, /api-wip-snapshot-g7-b14/, /api-prebill-g7-b04-approve/, /api-invoice-g7-b05/, /api-payment-match-g7-b06-final/, /finance_partner_role_required/, /api-accounting-export-g7-b17/, /api-trust-ledger-g7-b12/]);

rejectPatterns("apps/web/src/components/FinanceSurface.jsx", [/mockData|from "\.\.\/data\/mockData/]);
rejectPatterns("apps/web/src/data/apiClient.js", [/idempotency_key:\s*`ui-time:\$\{matterId\}`/]);

if (failures.length > 0) {
  console.error("CMP R4 G7 validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("CMP R4 G7 validation passed.");
console.log("g7_runtime_tuws_with_evidence: 26/26");
console.log("remaining_g7_tuw: none");
