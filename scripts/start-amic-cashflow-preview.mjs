import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { listAmicBankClassificationEmployees } from "../apps/api/src/amic-bank-classification-directory.js";
import { createFinanceRuntimeContext } from "../apps/api/src/finance-runtime-context.js";
import { MASTER_DATA_RUNTIME_SEED } from "../apps/api/src/master-data-context.js";
import { MATTER_VAULT_REGISTERED_TENANT_ID } from "../apps/api/src/matter-vault-account-registry.js";
import { startApiServer } from "../apps/api/src/server.js";
import { autoClassifyBankTransactions } from "../packages/billing/src/bank-classification-service.js";
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
  throw new TypeError("Usage: node scripts/start-amic-cashflow-preview.mjs --xlsx <path> --pdf <path> [--port 4181]");
}

const workbookBytes = readFileSync(resolve(workbookPath));
const statementBytes = readFileSync(resolve(statementPath));
if (sha256(workbookBytes) !== manifest.sources.workbook.sha256) throw new Error("Workbook hash does not match the approved source manifest");
if (sha256(statementBytes) !== manifest.sources.statement.sha256) throw new Error("Statement hash does not match the approved source manifest");
const statementText = execFileSync("pdftotext", ["-layout", resolve(statementPath), "-"], {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});
const merged = mergeCashflowTransactions(
  parseAmicWorkbookBuffer(workbookBytes, {
    account_ref: manifest.account_ref,
    source_hash: manifest.sources.workbook.sha256,
  }),
  parseNhBankStatementText(statementText, {
    account_ref: manifest.account_ref,
    source_hash: manifest.sources.statement.sha256,
  }),
);
const sourceManifestHash = sha256(manifestBytes);
const repository = createFinanceRepository();
const employees = listAmicBankClassificationEmployees();
for (const tenantId of new Set(["tenant_cmp_g7_synthetic", MATTER_VAULT_REGISTERED_TENANT_ID])) {
  const tenantTag = sha256(tenantId).slice(0, 8);
  const tenantTransactions = merged.transactions.map((transaction) => Object.freeze({
    ...transaction,
    bank_transaction_id: `${transaction.bank_transaction_id}_${tenantTag}`,
  }));
  importBankTransactionBatch({
    repository,
    bank_import_batch: {
      bank_import_batch_id: `bank_import_${sourceManifestHash.slice(0, 16)}_${tenantTag}`,
      tenant_id: tenantId,
      source_manifest_hash: sourceManifestHash,
      account_ref: manifest.account_ref,
      transaction_count: tenantTransactions.length,
      overlap_count: merged.overlap_count,
      source_count: 2,
      production_import_approved: false,
    },
    transactions: tenantTransactions,
    actor_id: "local_cashflow_preview",
    idempotency_key: `preview-import:${sourceManifestHash}`,
  });
  autoClassifyBankTransactions({
    repository,
    tenant_id: tenantId,
    client_records: MASTER_DATA_RUNTIME_SEED.records,
    employees,
    actor_id: "local_cashflow_preview",
    idempotency_key: `preview-classification:${sourceManifestHash}`,
  });
}
const financeRuntime = createFinanceRuntimeContext({
  repository,
  clientRecords: MASTER_DATA_RUNTIME_SEED.records,
  employees,
});
const started = await startApiServer({
  host: "127.0.0.1",
  port: Number(args.get("port") ?? process.env.PORT ?? 4181),
  financeRuntime,
  analyticsFinanceRepository: repository,
});
process.stdout.write(`AMIC cashflow preview API: http://${started.host}:${started.port} (${merged.transactions.length} transactions)\n`);

async function close() {
  await new Promise((resolveClose) => started.server.close(resolveClose));
  repository.close();
}

process.once("SIGINT", () => close().finally(() => process.exit(0)));
process.once("SIGTERM", () => close().finally(() => process.exit(0)));
