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
  "packages/settlement/src/settlement-run-service.js",
  "packages/settlement/src/credit-service.js",
  "apps/api/src/finance-runtime-context.js",
  "apps/web/src/components/FinanceSurface.jsx",
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
requirePatterns("packages/time-expense/src/fee-arrangement-service.js", [/billing_profile_id/, /rate_overrides/]);
requirePatterns("packages/time-expense/src/expense-service.js", [/receipt_document_id/, /expense.create/]);
requirePatterns("packages/time-expense/src/disbursement-service.js", [/vendor_ref/, /disbursement.create/]);
requirePatterns("packages/billing/src/wip-service.js", [/generateWipFromApprovedItems/, /lockWipSnapshot/, /immutable_snapshot/]);
requirePatterns("packages/billing/src/prebill-service.js", [/createPreBill/, /applyWriteDownOff/, /partner_reviewer_id/]);
requirePatterns("packages/billing/src/invoice-service.js", [/createInvoiceFromPreBill/, /generateInvoiceLines/, /correctInvoice/, /mutates_issued_invoice: false/]);
requirePatterns("packages/billing/src/tax-invoice-service.js", [/createTaxInvoice/, /tax_registration_ref/]);
requirePatterns("packages/payments/src/payment-service.js", [/importPayment/, /bank_reference/]);
requirePatterns("packages/payments/src/matching-service.js", [/matchPaymentToInvoice/, /amount_paid/]);
requirePatterns("packages/payments/src/ar-service.js", [/computeArBalance/, /createArAgingSnapshot/]);
requirePatterns("packages/payments/src/journal-service.js", [/createJournalEntry/, /not balanced/, /posts_gl_entries: true/]);
requirePatterns("packages/payments/src/accounting-export-service.js", [/createAccountingExport/, /credential_material_included: false/]);
requirePatterns("packages/payments/src/tax-export-service.js", [/createTaxExport/, /credential_material_included: false/]);
requirePatterns("packages/settlement/src/settlement-run-service.js", [/createSettlementRun/, /payment_match_refs/]);
requirePatterns("packages/settlement/src/credit-service.js", [/assignWorkingCredit/, /credit_percent/]);
requirePatterns("apps/api/src/finance-runtime-context.js", [
  /FINANCE_BOUNDED_CONTEXT/,
  /runtime_write_ready: true/,
  /production_ready_claim: false/,
  /handleFinancePaymentImport/,
  /bank_reference_included: false/,
]);
requirePatterns("apps/web/src/components/FinanceSurface.jsx", [
  /data-cmp-g7-finance-surface="true"/,
  /fetchFinanceTimeEntries/,
  /fetchFinanceInvoices/,
  /fetchFinanceArAging/,
]);
requirePatterns("packages/billing/test/runtime-services.test.js", [/settlement/, /WorkingCredit/, /not mutating issued invoices|mutating issued invoices/]);
requirePatterns("apps/api/test/cmp-r4-g7-finance.test.js", [/persist time\/payment state across restart/, /hide finance secrets/, /WIP and AR aging/]);

rejectPatterns("apps/web/src/components/FinanceSurface.jsx", [/mockData|from "\.\.\/data\/mockData/]);

if (failures.length > 0) {
  console.error("CMP R4 G7 validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("CMP R4 G7 validation passed.");
console.log("g7_runtime_tuws_with_evidence: 26/26");
console.log("remaining_g7_tuw: none");
