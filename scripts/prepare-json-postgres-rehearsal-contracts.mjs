#!/usr/bin/env node
import { join } from "node:path";
import {
  listPostgresFoundationMigrations,
} from "../packages/persistence/src/postgres/migration-catalog.js";
import {
  createJsonPostgresPostWriteRunbookContract,
  createJsonPostgresRehearsalBackupRetentionContract,
  createJsonPostgresRehearsalDmsProviderContract,
  createJsonPostgresRehearsalMigrationCatalog,
  createJsonPostgresRehearsalPerformanceBudget,
} from "./lib/json-postgres-rehearsal-contracts.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new TypeError(`${name} is required`);
  }
  return value;
}

const corpus = readPrivateProgramJson(
  option("--corpus"),
  "migration corpus",
);
if (corpus?.schema_version !== "law-firm-os.json-postgres-migration-corpus.v1"
  || corpus.data_scope !== "approved-real-manifest"
  || !Array.isArray(corpus.domains)
  || !Array.isArray(corpus.accounts)) {
  throw new Error("migration corpus is invalid");
}
const records = corpus.domains.flatMap((domain) => domain.records ?? []);
const realDmsObjectCount = records.filter((record) =>
  record.record_type === "DmsFileObject"
  && record.payload?.synthetic_only !== true).length;
const outputDir = createPrivateProgramOutputDirectory(
  option("--output-dir"),
);
const migrationCatalog = createJsonPostgresRehearsalMigrationCatalog(
  listPostgresFoundationMigrations(),
);
const dmsProvider = createJsonPostgresRehearsalDmsProviderContract();
const backupRetention =
  createJsonPostgresRehearsalBackupRetentionContract();
const performanceBudget = createJsonPostgresRehearsalPerformanceBudget({
  recordCount: records.length,
  accountCount: corpus.accounts.length,
  tenantCount: 1,
  dmsObjectCount: realDmsObjectCount,
});
const postWriteRunbook = createJsonPostgresPostWriteRunbookContract();
const files = {
  migration_catalog: writePrivateProgramJson(
    join(outputDir, "migration-catalog.json"),
    migrationCatalog,
  ),
  dms_provider_contract: writePrivateProgramJson(
    join(outputDir, "dms-provider-contract.json"),
    dmsProvider,
  ),
  backup_retention_contract: writePrivateProgramJson(
    join(outputDir, "backup-retention-contract.json"),
    backupRetention,
  ),
  performance_acceptance: writePrivateProgramJson(
    join(outputDir, "w12-performance-budget.json"),
    performanceBudget,
  ),
  post_write_runbook: writePrivateProgramJson(
    join(outputDir, "post-write-runbook-contract.json"),
    postWriteRunbook,
  ),
};
const summary = writePrivateProgramJson(
  join(outputDir, "rehearsal-contract-summary.json"),
  {
    schema_version:
      "law-firm-os.json-postgres-rehearsal-contract-summary.v1",
    data_scope: corpus.data_scope,
    migration_catalog_sha256: migrationCatalog.catalog_sha256,
    dms_provider_contract_sha256: dmsProvider.contract_sha256,
    backup_retention_contract_sha256: backupRetention.contract_sha256,
    performance_acceptance_sha256: performanceBudget.budget_sha256,
    post_write_runbook_sha256: postWriteRunbook.contract_sha256,
    record_count: records.length,
    account_count: corpus.accounts.length,
    tenant_count: 1,
    real_dms_object_count: realDmsObjectCount,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  },
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  output_dir: outputDir,
  summary_path: summary.path,
  summary_sha256: summary.sha256,
  migration_catalog_sha256: migrationCatalog.catalog_sha256,
  dms_provider_contract_sha256: dmsProvider.contract_sha256,
  backup_retention_contract_sha256: backupRetention.contract_sha256,
  performance_acceptance_sha256: performanceBudget.budget_sha256,
  post_write_runbook_sha256: postWriteRunbook.contract_sha256,
  record_count: records.length,
  account_count: corpus.accounts.length,
  real_dms_object_count: realDmsObjectCount,
  output_file_count: Object.keys(files).length + 1,
  sensitive_material_returned: false,
}, null, 2)}\n`);
