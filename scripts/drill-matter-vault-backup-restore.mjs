#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DERIVED_STORE_PATH_MANIFEST,
  STORE_PATH_MANIFEST,
} from "../apps/api/src/store-path-manifest.js";

export const MATTER_VAULT_RUNTIME_BACKUP_SCHEMA_VERSION = "law-firm-os.matter-vault-runtime-backup.v0.1";
export const MATTER_VAULT_RUNTIME_RESTORE_SCHEMA_VERSION = "law-firm-os.matter-vault-runtime-restore.v0.1";
export const MATTER_VAULT_RUNTIME_BACKUP_SCHEMA_VERSION_V0_2 = "law-firm-os.matter-vault-runtime-backup.v0.2";
export const MATTER_VAULT_RUNTIME_RESTORE_SCHEMA_VERSION_V0_2 = "law-firm-os.matter-vault-runtime-restore.v0.2";
export const MATTER_VAULT_RUNTIME_BACKUP_RESTORE_DRILL_SCHEMA_VERSION = "law-firm-os.matter-vault-runtime-backup-restore-drill.v0.1";
export const MATTER_VAULT_RUNTIME_BACKUP_RESTORE_DRILL_SCHEMA_VERSION_V0_2 = "law-firm-os.matter-vault-runtime-backup-restore-drill.v0.2";
export const MATTER_VAULT_RUNTIME_BACKUP_MANIFEST_FILE = "lawos-runtime-store-backup-manifest.json";

export const MATTER_VAULT_RUNTIME_STORE_FILES = Object.freeze(
  STORE_PATH_MANIFEST.map((entry) => Object.freeze({
    key: entry.key,
    env: entry.env,
    bounded_context: entry.bounded_context,
    file_name: entry.fileName,
  })),
);

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

function boolOption(value) {
  if (value === true || value === "true" || value === "1" || value === "yes") return true;
  return false;
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

function dmsObjectManifest() {
  return DERIVED_STORE_PATH_MANIFEST.find((entry) => entry.key === "dmsObjectStorePath");
}

function resolveStoreSources({ storeDir, env = process.env } = {}) {
  const resolvedStoreDir = storeDir ? resolve(storeDir) : null;
  const storeFiles = MATTER_VAULT_RUNTIME_STORE_FILES.map((definition) => {
    const envPath = env[definition.env];
    const sourcePath = envPath ? resolve(envPath) : join(resolvedStoreDir, definition.file_name);
    return Object.freeze({
      ...definition,
      source_path: sourcePath,
      source: envPath ? "env" : "store_dir",
      restore_relative_path: definition.file_name,
    });
  });
  const dmsStore = storeFiles.find((entry) => entry.key === "dmsStorePath");
  const objectManifest = dmsObjectManifest();
  const objectRoot = env[objectManifest.env]
    ? resolve(env[objectManifest.env])
    : dmsStore?.source_path
      ? `${dmsStore.source_path}${objectManifest.suffix}`
      : null;
  return Object.freeze({
    store_dir: resolvedStoreDir,
    resolved_store_paths: Object.freeze(Object.fromEntries(storeFiles.map((entry) => [entry.env, entry.source_path]))),
    dms_object_store_path: objectRoot,
    storeFiles: Object.freeze(storeFiles),
    objectStore: Object.freeze({
      key: objectManifest.key,
      env: objectManifest.env,
      bounded_context: objectManifest.bounded_context,
      source_path: objectRoot,
      restore_relative_path: `${dmsStore?.file_name ?? "dms-store.json"}${objectManifest.suffix}`,
      type: "directory",
    }),
  });
}

async function listObjectStoreFiles(rootPath) {
  if (!rootPath) return [];
  const rootStat = await safeStat(rootPath);
  if (!rootStat?.isDirectory()) return [];
  const files = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (entry.isFile() && (entry.name.endsWith(".bin") || entry.name.endsWith(".json"))) {
        files.push(fullPath);
      }
    }
  }
  await walk(rootPath);
  files.sort();
  return files;
}

export async function createMatterVaultRuntimeBackup({
  storeDir = defaultRuntimeStoreDir(),
  env = process.env,
  backupRoot = defaultBackupRoot(),
  backupDir,
  now,
  requireFiles = true,
  realClientDataUsed = false
} = {}) {
  const startedNs = process.hrtime.bigint();
  const generatedAt = toDate(now);
  const sources = resolveStoreSources({ storeDir, env });
  const resolvedStoreDir = sources.store_dir;
  const resolvedBackupDir = resolve(backupDir ?? join(backupRoot, timestampSlug(generatedAt)));
  const storesBackupDir = join(resolvedBackupDir, "stores");
  await mkdir(storesBackupDir, { recursive: true });

  const files = [];
  const missing_store_files = [];
  let newestMtimeMs = null;
  let backup_total_bytes = 0;

  for (const definition of sources.storeFiles) {
    const sourcePath = definition.source_path;
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
      restore_relative_path: definition.restore_relative_path,
      type: "store_file",
      byte_length: bytes.byteLength,
      sha256: digest,
      source_mtime: sourceStat.mtime.toISOString()
    });
  }

  const objectFiles = await listObjectStoreFiles(sources.objectStore.source_path);
  for (const sourcePath of objectFiles) {
    const sourceStat = await safeStat(sourcePath);
    if (!sourceStat?.isFile()) continue;
    const relativeObjectPath = relative(sources.objectStore.source_path, sourcePath);
    const bytes = await readFile(sourcePath);
    const digest = sha256(bytes);
    const backup_relative_path = join("objects", relativeObjectPath);
    const targetPath = resolveInside(resolvedBackupDir, backup_relative_path);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, bytes);

    newestMtimeMs = newestMtimeMs === null ? sourceStat.mtimeMs : Math.max(newestMtimeMs, sourceStat.mtimeMs);
    backup_total_bytes += bytes.byteLength;
    files.push({
      key: sources.objectStore.key,
      env: sources.objectStore.env,
      bounded_context: sources.objectStore.bounded_context,
      file_name: relativeObjectPath,
      source_path: sourcePath,
      backup_relative_path,
      restore_relative_path: join(sources.objectStore.restore_relative_path, relativeObjectPath),
      type: "dms_object_store_file",
      byte_length: bytes.byteLength,
      sha256: digest,
      source_mtime: sourceStat.mtime.toISOString(),
    });
  }

  if (requireFiles && files.length === 0) {
    throw new Error(`No runtime store files found under ${resolvedStoreDir}`);
  }

  const containsRealClientData = Boolean(realClientDataUsed);
  const backupSchemaVersion = containsRealClientData
    ? MATTER_VAULT_RUNTIME_BACKUP_SCHEMA_VERSION_V0_2
    : MATTER_VAULT_RUNTIME_BACKUP_SCHEMA_VERSION;
  const manifest = {
    schema_version: backupSchemaVersion,
    receipt_type: "matter_vault_runtime_store_backup",
    contract_ref: "UPL-A-09",
    daily_backup_job_contract_ref: "workbook/wave1-internal-uplift-tuw-backlog-2026-07-02.md#UPL-A-09",
    outcome: files.length > 0 ? "passed" : "empty",
    synthetic_only: !containsRealClientData,
    production_ready_claim: false,
    go_live_claim: false,
    production_restore_executed: false,
    real_client_data_used: containsRealClientData,
    backup_created: files.length > 0,
    generated_at: generatedAt.toISOString(),
    store_dir: resolvedStoreDir,
    resolved_store_paths: sources.resolved_store_paths,
    dms_object_store_path: sources.objectStore.source_path,
    backup_includes_dms_object_store: objectFiles.length > 0,
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

  const backupSchemaAllowed = new Set([
    MATTER_VAULT_RUNTIME_BACKUP_SCHEMA_VERSION,
    MATTER_VAULT_RUNTIME_BACKUP_SCHEMA_VERSION_V0_2,
  ]);
  if (!backupSchemaAllowed.has(manifest.schema_version)) {
    throw new TypeError("invalid Matter-Vault runtime backup schema");
  }
  if (manifest.production_ready_claim !== false || manifest.go_live_claim !== false || manifest.production_restore_executed !== false) {
    throw new Error("Matter-Vault runtime restore refuses unsafe production/go-live claims");
  }
  if (manifest.schema_version === MATTER_VAULT_RUNTIME_BACKUP_SCHEMA_VERSION && manifest.synthetic_only !== true) {
    throw new Error("Matter-Vault runtime restore refuses v0.1 non-synthetic backup claims");
  }
  if (
    manifest.schema_version === MATTER_VAULT_RUNTIME_BACKUP_SCHEMA_VERSION_V0_2
    && (manifest.synthetic_only !== false || manifest.real_client_data_used !== true)
  ) {
    throw new Error("Matter-Vault runtime restore v0.2 requires explicit real_client_data_used=true");
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

    const restorePath = resolveInside(resolvedRestoreDir, file.restore_relative_path ?? file.file_name);
    await mkdir(dirname(restorePath), { recursive: true });
    await writeFile(restorePath, bytes);
    restored_total_bytes += bytes.byteLength;
    files.push({
      key: file.key,
      bounded_context: file.bounded_context,
      file_name: file.file_name,
      type: file.type ?? "store_file",
      restore_path: restorePath,
      restore_relative_path: file.restore_relative_path ?? file.file_name,
      byte_length: bytes.byteLength,
      expected_sha256: file.sha256,
      actual_sha256: actualSha256,
      checksum_match
    });
  }

  return {
    schema_version: manifest.schema_version === MATTER_VAULT_RUNTIME_BACKUP_SCHEMA_VERSION_V0_2
      ? MATTER_VAULT_RUNTIME_RESTORE_SCHEMA_VERSION_V0_2
      : MATTER_VAULT_RUNTIME_RESTORE_SCHEMA_VERSION,
    backup_schema_version: manifest.schema_version,
    receipt_type: "matter_vault_runtime_store_restore",
    contract_ref: manifest.contract_ref ?? "UPL-A-09",
    daily_backup_job_contract_ref: manifest.daily_backup_job_contract_ref,
    outcome: checksum_mismatch_count === 0 ? "passed" : "failed",
    synthetic_only: manifest.synthetic_only === true,
    production_ready_claim: false,
    go_live_claim: false,
    production_restore_executed: false,
    real_client_data_used: manifest.real_client_data_used === true,
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
    ["finance-store.json", "finance", [{ record_id: "invoice_upl_a09_synthetic", matter_id: "matter_upl_a09_synthetic" }]],
    ["security-audit-events.ndjson", "api-security-audit", [{ audit_event_id: "security_audit_upl_a09_synthetic", action: "backup.drill.synthetic" }]],
  ];

  for (const [fileName, boundedContext, records] of fixtures) {
    if (fileName.endsWith(".ndjson")) {
      await writeFile(join(storeDir, fileName), records.map((record) => JSON.stringify({
        ...record,
        bounded_context: boundedContext,
        synthetic_only: true,
        production_ready_claim: false,
        real_client_data_used: false,
        occurred_at: seededAt,
      })).join("\n") + "\n", "utf8");
      continue;
    }
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
  const objectDir = join(storeDir, "dms-store.json.objects", "upl-a09");
  const objectBytes = Buffer.from("UPL-A-09 synthetic DMS object bytes\n", "utf8");
  await mkdir(objectDir, { recursive: true });
  await writeFile(join(objectDir, "document_upl_a09_synthetic.bin"), objectBytes);
  await writeJson(join(objectDir, "document_upl_a09_synthetic.json"), {
    object_id: "document_upl_a09_synthetic",
    byte_length: objectBytes.byteLength,
    sha256: sha256(objectBytes),
    synthetic_only: true,
    production_ready_claim: false,
  });
}

export async function runMatterVaultBackupRestoreDrill({
  storeDir,
  backupRoot = defaultBackupRoot(),
  restoreDir,
  receiptPath,
  now,
  realClientDataUsed = false
} = {}) {
  const seeded_synthetic_runtime_store = !storeDir;
  if (realClientDataUsed && seeded_synthetic_runtime_store) {
    throw new Error("backup/restore v0.2 real-client-data drill requires an explicit storeDir");
  }
  let drillStoreDir = storeDir ? resolve(storeDir) : null;
  if (!drillStoreDir) {
    const tempRoot = await mkdtemp(join(tmpdir(), "lawos-matter-vault-backup-drill-"));
    drillStoreDir = join(tempRoot, "runtime-stores");
    await seedSyntheticRuntimeStores(drillStoreDir);
  }

  const backup = await createMatterVaultRuntimeBackup({ storeDir: drillStoreDir, backupRoot, now, realClientDataUsed });
  const restore = await restoreMatterVaultRuntimeBackup({
    backupDir: backup.backup_dir,
    restoreDir,
    now
  });
  const containsRealClientData = Boolean(realClientDataUsed);
  const receipt = {
    schema_version: containsRealClientData
      ? MATTER_VAULT_RUNTIME_BACKUP_RESTORE_DRILL_SCHEMA_VERSION_V0_2
      : MATTER_VAULT_RUNTIME_BACKUP_RESTORE_DRILL_SCHEMA_VERSION,
    receipt_type: "matter_vault_runtime_backup_restore_drill",
    contract_ref: "UPL-A-09",
    outcome: backup.outcome === "passed" && restore.outcome === "passed" ? "passed" : "failed",
    synthetic_only: !containsRealClientData,
    production_ready_claim: false,
    go_live_claim: false,
    production_restore_executed: false,
    real_client_data_used: containsRealClientData,
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
  const realClientDataUsed = boolOption(options["real-client-data-used"]);

  if (command === "backup") {
    const receipt = await createMatterVaultRuntimeBackup({ storeDir, backupRoot, backupDir, realClientDataUsed });
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
    const receipt = await runMatterVaultBackupRestoreDrill({ storeDir, backupRoot, restoreDir, receiptPath, realClientDataUsed });
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
