#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MATTER_VAULT_RUNTIME_BACKUP_SCHEMA_VERSION = "law-firm-os.matter-vault-runtime-backup.v0.1";
export const MATTER_VAULT_RUNTIME_RESTORE_SCHEMA_VERSION = "law-firm-os.matter-vault-runtime-restore.v0.1";
export const MATTER_VAULT_RUNTIME_BACKUP_MANIFEST_FILE = "lawos-runtime-store-backup-manifest.json";

export const MATTER_VAULT_RUNTIME_STORE_FILES = Object.freeze([
  { key: "hrxStorePath", bounded_context: "hrx", file_name: "hrx-store.json" },
  { key: "masterDataStorePath", bounded_context: "master-data", file_name: "master-data-store.json" },
  { key: "matterStorePath", bounded_context: "matter", file_name: "matter-store.json" },
  { key: "dmsStorePath", bounded_context: "dms", file_name: "dms-store.json" },
  { key: "crmStorePath", bounded_context: "crm", file_name: "crm-store.json" },
  { key: "intakeStorePath", bounded_context: "intake", file_name: "intake-store.json" },
  { key: "crmMasterDataStorePath", bounded_context: "crm-master-data", file_name: "crm-master-data-store.json" },
  { key: "financeStorePath", bounded_context: "finance", file_name: "finance-store.json" },
  { key: "analyticsStorePath", bounded_context: "analytics", file_name: "analytics-store.json" },
  { key: "aiStorePath", bounded_context: "ai-governance", file_name: "ai-store.json" },
  { key: "portalStorePath", bounded_context: "client-portal", file_name: "portal-store.json" },
  { key: "uiReadinessStorePath", bounded_context: "ui-readiness", file_name: "ui-readiness-store.json" },
  {
    key: "enterpriseReadinessStorePath",
    bounded_context: "enterprise-readiness",
    file_name: "enterprise-readiness-store.json"
  }
]);

function secondsBetween(startNs, endNs = process.hrtime.bigint()) {
  const seconds = Number(endNs - startNs) / 1_000_000_000;
  return Number(seconds.toFixed(6));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function timestampSlug(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function toDate(value) {
  const raw = typeof value === "function" ? value() : value;
  return raw ? new Date(raw) : new Date();
}

function defaultRuntimeStoreDir() {
  return process.env.MATTER_DESKTOP_RUNTIME_STORE_DIR || resolve("artifacts/runtime-stores");
}

function defaultBackupRoot() {
  return process.env.MATTER_VAULT_BACKUP_ROOT || resolve("artifacts/backups/matter-vault-runtime-stores");
}

function resolveInside(root, target) {
  const resolvedRoot = resolve(root);
  const resolvedTarget = resolve(resolvedRoot, target);
  const rel = relative(resolvedRoot, resolvedTarget);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`Refusing path outside backup boundary: ${target}`);
  }
  return resolvedTarget;
}

async function writeJson(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function safeStat(filePath) {
  try {
    return await stat(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export async function createMatterVaultRuntimeBackup({
  storeDir = defaultRuntimeStoreDir(),
  backupRoot = defaultBackupRoot(),
  backupDir,
  now,
  requireFiles = true
} = {}) {
  const startedNs = process.hrtime.bigint();
  const generatedAt = toDate(now);
  const resolvedStoreDir = resolve(storeDir);
  const resolvedBackupDir = resolve(backupDir ?? join(backupRoot, timestampSlug(generatedAt)));
  const storesBackupDir = join(resolvedBackupDir, "stores");
  await mkdir(storesBackupDir, { recursive: true });

  const files = [];
  const missing_store_files = [];
  let newestMtimeMs = null;
  let backup_total_bytes = 0;

  for (const definition of MATTER_VAULT_RUNTIME_STORE_FILES) {
    const sourcePath = join(resolvedStoreDir, definition.file_name);
    const sourceStat = await safeStat(sourcePath);
    if (!sourceStat?.isFile()) {
      missing_store_files.push({ ...definition, source_path: sourcePath });
      continue;
    }

    const bytes = await readFile(sourcePath);
    const digest = sha256(bytes);
    const backup_relative_path = join("stores", definition.file_name);
    await writeFile(resolveInside(resolvedBackupDir, backup_relative_path), bytes);

    newestMtimeMs = newestMtimeMs === null ? sourceStat.mtimeMs : Math.max(newestMtimeMs, sourceStat.mtimeMs);
    backup_total_bytes += bytes.byteLength;
    files.push({
      ...definition,
      source_path: sourcePath,
      backup_relative_path,
      byte_length: bytes.byteLength,
      sha256: digest,
      source_mtime: sourceStat.mtime.toISOString()
    });
  }

  if (requireFiles && files.length === 0) {
    throw new Error(`No runtime store files found under ${resolvedStoreDir}`);
  }

  const manifest = {
    schema_version: MATTER_VAULT_RUNTIME_BACKUP_SCHEMA_VERSION,
    receipt_type: "matter_vault_runtime_store_backup",
    contract_ref: "UPL-A-09",
    daily_backup_job_contract_ref: "workbook/wave1-internal-uplift-tuw-backlog-2026-07-02.md#UPL-A-09",
    outcome: files.length > 0 ? "passed" : "empty",
    synthetic_only: true,
    production_ready_claim: false,
    go_live_claim: false,
    production_restore_executed: false,
    real_client_data_used: false,
    backup_created: files.length > 0,
    generated_at: generatedAt.toISOString(),
    store_dir: resolvedStoreDir,
    backup_dir: resolvedBackupDir,
    manifest_path: join(resolvedBackupDir, MATTER_VAULT_RUNTIME_BACKUP_MANIFEST_FILE),
    known_store_file_count: MATTER_VAULT_RUNTIME_STORE_FILES.length,
    backup_file_count: files.length,
    backup_total_bytes,
    rpo_seconds_measured:
      newestMtimeMs === null ? null : Number(Math.max(0, (generatedAt.getTime() - newestMtimeMs) / 1000).toFixed(6)),
    backup_duration_seconds: secondsBetween(startedNs),
    missing_store_files,
    files
  };

  await writeJson(manifest.manifest_path, manifest);
  return manifest;
}

export async function restoreMatterVaultRuntimeBackup({ backupDir, restoreDir, now } = {}) {
  if (!backupDir) throw new Error("backupDir is required for restore");
  const startedNs = process.hrtime.bigint();
  const generatedAt = toDate(now);
  const resolvedBackupDir = resolve(backupDir);
  const resolvedRestoreDir = resolve(restoreDir ?? join(dirname(resolvedBackupDir), `${basename(resolvedBackupDir)}-restored`));
  const manifestPath = join(resolvedBackupDir, MATTER_VAULT_RUNTIME_BACKUP_MANIFEST_FILE);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  if (manifest.schema_version !== MATTER_VAULT_RUNTIME_BACKUP_SCHEMA_VERSION) {
    throw new TypeError("invalid Matter-Vault runtime backup schema");
  }
  if (manifest.synthetic_only !== true || manifest.production_ready_claim !== false || manifest.go_live_claim !== false) {
    throw new Error("Matter-Vault runtime restore refuses non-synthetic backup claims");
  }

  await mkdir(resolvedRestoreDir, { recursive: true });
  let restored_total_bytes = 0;
  let checksum_mismatch_count = 0;
  const files = [];

  for (const file of manifest.files ?? []) {
    const sourcePath = resolveInside(resolvedBackupDir, file.backup_relative_path);
    const bytes = await readFile(sourcePath);
    const actualSha256 = sha256(bytes);
    const checksum_match = actualSha256 === file.sha256;
    if (!checksum_match) checksum_mismatch_count += 1;

    const restorePath = resolveInside(resolvedRestoreDir, file.file_name);
    await writeFile(restorePath, bytes);
    restored_total_bytes += bytes.byteLength;
    files.push({
      key: file.key,
      bounded_context: file.bounded_context,
      file_name: file.file_name,
      restore_path: restorePath,
      byte_length: bytes.byteLength,
      expected_sha256: file.sha256,
      actual_sha256: actualSha256,
      checksum_match
    });
  }

  return {
    schema_version: MATTER_VAULT_RUNTIME_RESTORE_SCHEMA_VERSION,
    backup_schema_version: manifest.schema_version,
    receipt_type: "matter_vault_runtime_store_restore",
    contract_ref: manifest.contract_ref ?? "UPL-A-09",
    daily_backup_job_contract_ref: manifest.daily_backup_job_contract_ref,
    outcome: checksum_mismatch_count === 0 ? "passed" : "failed",
    synthetic_only: true,
    production_ready_claim: false,
    go_live_claim: false,
    production_restore_executed: false,
    real_client_data_used: false,
    generated_at: generatedAt.toISOString(),
    backup_generated_at: manifest.generated_at,
    backup_dir: resolvedBackupDir,
    restore_dir: resolvedRestoreDir,
    backup_manifest_path: manifestPath,
    backup_file_count: manifest.backup_file_count,
    restored_file_count: files.length,
    restored_total_bytes,
    checksum_mismatch_count,
    rpo_seconds_measured: manifest.rpo_seconds_measured,
    rto_seconds_measured: secondsBetween(startedNs),
    files
  };
}

async function seedSyntheticRuntimeStores(storeDir) {
  await mkdir(storeDir, { recursive: true });
  const seededAt = new Date().toISOString();
  const fixtures = [
    ["matter-store.json", "matter", [{ record_id: "matter_upl_a09_synthetic", tenant_id: "tenant_upl_a09" }]],
    ["dms-store.json", "dms", [{ record_id: "document_upl_a09_synthetic", matter_id: "matter_upl_a09_synthetic" }]],
    ["finance-store.json", "finance", [{ record_id: "invoice_upl_a09_synthetic", matter_id: "matter_upl_a09_synthetic" }]]
  ];

  for (const [fileName, boundedContext, records] of fixtures) {
    await writeJson(join(storeDir, fileName), {
      schema_version: "law-firm-os.synthetic-runtime-store.v0.1",
      bounded_context: boundedContext,
      seeded_for: "UPL-A-09 backup restore drill",
      synthetic_only: true,
      production_ready_claim: false,
      real_client_data_used: false,
      seeded_at: seededAt,
      records
    });
  }
}

export async function runMatterVaultBackupRestoreDrill({
  storeDir,
  backupRoot = defaultBackupRoot(),
  restoreDir,
  receiptPath,
  now
} = {}) {
  const seeded_synthetic_runtime_store = !storeDir;
  let drillStoreDir = storeDir ? resolve(storeDir) : null;
  if (!drillStoreDir) {
    const tempRoot = await mkdtemp(join(tmpdir(), "lawos-matter-vault-backup-drill-"));
    drillStoreDir = join(tempRoot, "runtime-stores");
    await seedSyntheticRuntimeStores(drillStoreDir);
  }

  const backup = await createMatterVaultRuntimeBackup({ storeDir: drillStoreDir, backupRoot, now });
  const restore = await restoreMatterVaultRuntimeBackup({
    backupDir: backup.backup_dir,
    restoreDir,
    now
  });
  const receipt = {
    schema_version: "law-firm-os.matter-vault-runtime-backup-restore-drill.v0.1",
    receipt_type: "matter_vault_runtime_backup_restore_drill",
    contract_ref: "UPL-A-09",
    outcome: backup.outcome === "passed" && restore.outcome === "passed" ? "passed" : "failed",
    synthetic_only: true,
    production_ready_claim: false,
    go_live_claim: false,
    production_restore_executed: false,
    real_client_data_used: false,
    seeded_synthetic_runtime_store,
    backup,
    restore
  };

  if (receiptPath) await writeJson(receiptPath, receipt);
  return receipt;
}

function parseArgs(argv) {
  const first = argv[0];
  const command = first && !first.startsWith("--") ? first : "drill";
  const tokens = command === first ? argv.slice(1) : argv;
  const options = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = tokens[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return { command, options };
}

async function main(argv = process.argv.slice(2)) {
  const { command, options } = parseArgs(argv);
  const storeDir = options["store-dir"];
  const backupRoot = options["backup-root"];
  const backupDir = options["backup-dir"];
  const restoreDir = options["restore-dir"];
  const receiptPath = options["receipt-path"];

  if (command === "backup") {
    const receipt = await createMatterVaultRuntimeBackup({ storeDir, backupRoot, backupDir });
    if (receiptPath) await writeJson(receiptPath, receipt);
    console.log(JSON.stringify(receipt, null, 2));
    return;
  }

  if (command === "restore") {
    const receipt = await restoreMatterVaultRuntimeBackup({ backupDir, restoreDir });
    if (receiptPath) await writeJson(receiptPath, receipt);
    console.log(JSON.stringify(receipt, null, 2));
    return;
  }

  if (command === "drill") {
    const receipt = await runMatterVaultBackupRestoreDrill({ storeDir, backupRoot, restoreDir, receiptPath });
    console.log(JSON.stringify(receipt, null, 2));
    return;
  }

  throw new Error(`Unknown backup/restore command: ${command}`);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedFile && existsSync(invokedFile) && resolve(invokedFile) === currentFile) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exit(1);
  });
}
