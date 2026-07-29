import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  mergeCashflowTransactions,
  parseAmicWorkbookBuffer,
  parseNhBankStatementText,
  sha256,
  summarizeCashflowTransactions,
} from "../packages/import-data/src/index.js";
import { importBankTransactionBatch } from "../packages/billing/src/bank-transaction-service.js";
import { createFinanceDomainSnapshot } from "../packages/billing/src/central-ledger.js";
import { createFinanceRepository } from "../packages/billing/src/finance-repository.js";

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
  throw new TypeError("Usage: node scripts/preview-amic-cashflow-import.mjs --xlsx <path> --pdf <path>");
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
const july = summarizeCashflowTransactions(merged.transactions, { month: "2026-07" });
const sourceManifestHash = sha256(manifestBytes);
const rehearsalRepository = createFinanceRepository();
const rehearsalInput = {
  repository: rehearsalRepository,
  bank_import_batch: {
    bank_import_batch_id: `bank_import_${sourceManifestHash.slice(0, 24)}`,
    tenant_id: "tenant_amic_matter_vault",
    source_manifest_hash: sourceManifestHash,
    account_ref: manifest.account_ref,
    transaction_count: merged.transactions.length,
    overlap_count: merged.overlap_count,
    source_count: 2,
    production_import_approved: false,
  },
  transactions: merged.transactions,
  actor_id: "source_preview_rehearsal",
  idempotency_key: `preview:${sourceManifestHash}`,
};
const rehearsal = importBankTransactionBatch(rehearsalInput);
const rehearsalReplay = importBankTransactionBatch(rehearsalInput);
const domain = createFinanceDomainSnapshot({
  repositories: [{ source_id: "amic-cashflow-preview", repository: rehearsalRepository }],
  tenant_id: "tenant_amic_matter_vault",
});
rehearsalRepository.close();
const preview = {
  schema_version: "law-firm-os.finance.cashflow-import-preview.v1",
  mode: "preview_only",
  source_payload_included: false,
  counterparty_values_included: false,
  account_number_included: false,
  production_write_performed: false,
  sources: {
    workbook: { transaction_count: workbookTransactions.length, sha256_verified: true },
    statement: { transaction_count: statementTransactions.length, sha256_verified: true },
  },
  reconciliation: {
    overlap_count: merged.overlap_count,
    statement_new_count: merged.statement_new_count,
    union_transaction_count: merged.transactions.length,
  },
  july_2026: july,
  local_rehearsal: {
    transaction_count: rehearsal.transaction_count,
    idempotency_replayed: rehearsalReplay.idempotent_replay,
    invariant_passed: domain.inventory.reconciliation.invariant_passed,
    source_payload_persisted: false,
    durable_write_performed: false,
    production_write_performed: false,
  },
};

const expected = manifest.expected_reconciliation;
const checks = [
  workbookTransactions.length === manifest.sources.workbook.expected_transaction_count,
  statementTransactions.length === manifest.sources.statement.expected_transaction_count,
  merged.overlap_count === expected.overlap_count,
  merged.statement_new_count === expected.statement_new_count,
  merged.transactions.length === expected.union_transaction_count,
  july.total_inflow === expected.july_2026.total_inflow,
  july.total_outflow === expected.july_2026.total_outflow,
  july.net_movement === expected.july_2026.net_movement,
  july.current_balance === expected.july_2026.current_balance,
  rehearsal.transaction_count === expected.union_transaction_count,
  rehearsalReplay.idempotent_replay === true,
  domain.inventory.reconciliation.invariant_passed === true,
];
if (checks.includes(false)) throw new Error("Cashflow preview does not reconcile with the approved source manifest");
process.stdout.write(`${JSON.stringify({ ...preview, reconciliation_passed: true }, null, 2)}\n`);
