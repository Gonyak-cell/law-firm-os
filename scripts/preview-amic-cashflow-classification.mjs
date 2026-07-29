import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MASTER_DATA_RUNTIME_SEED } from "../apps/api/src/master-data-context.js";
import { listAmicBankClassificationEmployees } from "../apps/api/src/amic-bank-classification-directory.js";
import {
  autoClassifyBankTransactions,
  summarizeBankTransactionClassifications,
} from "../packages/billing/src/bank-classification-service.js";
import { importBankTransactionBatch } from "../packages/billing/src/bank-transaction-service.js";
import { createFinanceRepository } from "../packages/billing/src/finance-repository.js";
import {
  mergeCashflowTransactions,
  parseAmicWorkbookBuffer,
  parseNhBankStatementText,
  sha256,
} from "../packages/import-data/src/index.js";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const manifestBytes = readFileSync(resolve(repoRoot, "workbook/amic-cashflow-source-manifest-2026-07-28.json"));
const manifest = JSON.parse(manifestBytes.toString("utf8"));
const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith("--")) pairs.push([value.slice(2), values[index + 1]]);
  return pairs;
}, []));
const workbookPath = args.get("xlsx");
const statementPath = args.get("pdf");
if (!workbookPath || !statementPath) {
  throw new TypeError("Usage: node scripts/preview-amic-cashflow-classification.mjs --xlsx <path> --pdf <path>");
}

const workbookBytes = readFileSync(resolve(workbookPath));
const statementBytes = readFileSync(resolve(statementPath));
if (sha256(workbookBytes) !== manifest.sources.workbook.sha256) throw new Error("Workbook hash does not match the approved source manifest");
if (sha256(statementBytes) !== manifest.sources.statement.sha256) throw new Error("Statement hash does not match the approved source manifest");

const statementText = execFileSync("pdftotext", ["-layout", resolve(statementPath), "-"], {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});
const workbookTransactions = parseAmicWorkbookBuffer(workbookBytes, {
  account_ref: manifest.account_ref,
  source_hash: manifest.sources.workbook.sha256,
});
const statementTransactions = parseNhBankStatementText(statementText, {
  account_ref: manifest.account_ref,
  source_hash: manifest.sources.statement.sha256,
});
const merged = mergeCashflowTransactions(workbookTransactions, statementTransactions);
const tenantId = "tenant_amic_matter_vault";
const sourceManifestHash = sha256(manifestBytes);
const repository = createFinanceRepository();
importBankTransactionBatch({
  repository,
  bank_import_batch: {
    bank_import_batch_id: `bank_import_${sourceManifestHash.slice(0, 24)}`,
    tenant_id: tenantId,
    source_manifest_hash: sourceManifestHash,
    account_ref: manifest.account_ref,
    transaction_count: merged.transactions.length,
    overlap_count: merged.overlap_count,
    source_count: 2,
    production_import_approved: false,
  },
  transactions: merged.transactions,
  actor_id: "source_classification_rehearsal",
  idempotency_key: `classification-import:${sourceManifestHash}`,
});
const classified = autoClassifyBankTransactions({
  repository,
  tenant_id: tenantId,
  client_records: MASTER_DATA_RUNTIME_SEED.records,
  employees: listAmicBankClassificationEmployees(),
  actor_id: "source_classification_rehearsal",
  idempotency_key: `classification-apply:${sourceManifestHash}`,
});
const classifications = repository.list({ tenant_id: tenantId, model_type: "BankTransactionClassification" });
const julyRows = classifications.filter((row) => row.transaction_month === "2026-07");
const payrollRows = classifications.filter((row) => row.primary_type === "payroll");
const julyPayrollRows = julyRows.filter((row) => row.primary_type === "payroll");
const july = summarizeBankTransactionClassifications(julyRows);
const payrollCategories = [...julyRows
  .filter((row) => row.primary_type === "payroll")
  .reduce((groups, row) => {
    const current = groups.get(row.payroll_category) ?? {
      category: row.payroll_category,
      transaction_count: 0,
      amount: 0,
    };
    current.transaction_count += 1;
    current.amount += row.amount;
    groups.set(row.payroll_category, current);
    return groups;
  }, new Map())
  .values()];
const julyPrimary = Object.fromEntries(july.primary_types.map((row) => [row.primary_type, row]));
const preview = {
  schema_version: "law-firm-os.finance.bank-classification-preview.v1",
  mode: "preview_only",
  source_manifest_hash: sourceManifestHash,
  source_payload_included: false,
  counterparty_values_included: false,
  individual_payroll_values_included: false,
  production_write_performed: false,
  coverage: {
    transaction_count: merged.transactions.length,
    classification_count: classifications.length,
    confirmed_count: classified.summary.confirmed_count,
    review_count: classified.summary.review_count,
    unclassified_count: merged.transactions.length - classifications.length,
  },
  linkage: {
    registered_client_receipt_count: classifications.filter((row) => row.category === "client_receipt" && row.client_group_id).length,
    payroll_transaction_count: payrollRows.length,
    payroll_employee_linked_count: payrollRows.filter((row) => row.employee_id).length,
    payroll_employee_unresolved_count: payrollRows.filter((row) => !row.employee_id).length,
    july_payroll_employee_linked_count: julyPayrollRows.filter((row) => row.employee_id).length,
  },
  all_periods: classified.summary,
  july_2026: {
    summary: july,
    sales_amount: julyPrimary.sales?.amount ?? 0,
    operating_expense_amount: julyPrimary.operating_expense?.amount ?? 0,
    payroll_payment_amount: julyPrimary.payroll?.amount ?? 0,
    non_operating_amount: julyPrimary.non_operating?.amount ?? 0,
    payroll_categories: payrollCategories,
  },
};

const payroll = preview.july_2026;
const checks = [
  preview.coverage.transaction_count === 620,
  preview.coverage.classification_count === 620,
  preview.coverage.confirmed_count === 620,
  preview.coverage.review_count === 0,
  preview.coverage.unclassified_count === 0,
  preview.linkage.payroll_transaction_count === 58,
  preview.linkage.payroll_employee_linked_count === 52,
  preview.linkage.payroll_employee_unresolved_count === 6,
  preview.linkage.july_payroll_employee_linked_count === 10,
  payroll.payroll_payment_amount === 91_065_979,
  payroll.payroll_categories.reduce((sum, row) => sum + row.amount, 0) === payroll.payroll_payment_amount,
  payroll.summary.transaction_count === 103,
];
if (checks.includes(false)) throw new Error("Cashflow classification preview did not satisfy the approved invariants");
repository.close();
process.stdout.write(`${JSON.stringify({ ...preview, classification_invariants_passed: true }, null, 2)}\n`);
