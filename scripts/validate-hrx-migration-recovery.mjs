import { createHash } from "node:crypto";
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { loadHrxCoreMigrations } from "../packages/hrx/src/migrations/index.js";
import { createHrxMigrationSafetyService } from "../packages/hrx/src/migrations/safety.js";
import { createFileHrxStore } from "../packages/hrx/src/store/file-store.js";

const usage = "usage: node scripts/validate-hrx-migration-recovery.mjs";
const fixedTimestamp = "2026-07-15T09:00:00+09:00";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function snapshotHash(snapshot) {
  return sha256(JSON.stringify(snapshot));
}

function quoteIdentifier(value) {
  if (!/^[a-z0-9_]+$/i.test(value)) throw new Error(`unsafe SQLite identifier: ${value}`);
  return `"${value}"`;
}

function openDatabase(filePath, options) {
  const database = new DatabaseSync(filePath, options ?? {});
  database.exec("PRAGMA foreign_keys = ON");
  if (!options?.readOnly) database.exec("PRAGMA journal_mode = DELETE");
  return database;
}

function normalizedSql(value) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function sqliteSnapshot(database) {
  const objects = database.prepare(`
    SELECT type, name, sql
    FROM sqlite_master
    WHERE name NOT LIKE 'sqlite_%'
    ORDER BY type, name
  `).all().map((row) => ({
    type: row.type,
    name: row.name,
    sql: normalizedSql(row.sql),
  }));
  const tables = objects.filter(({ type }) => type === "table").map(({ name }) => name);
  const rows = Object.fromEntries(tables.map((table) => {
    const tableRows = database.prepare(`SELECT * FROM ${quoteIdentifier(table)}`).all()
      .map((row) => Object.fromEntries(Object.entries(row)))
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
    return [table, tableRows];
  }));
  const integrity = database.prepare("PRAGMA integrity_check").all().map(({ integrity_check: result }) => result);
  const foreignKeyErrors = database.prepare("PRAGMA foreign_key_check").all();
  return Object.freeze({
    schema_sha256: sha256(JSON.stringify(objects)),
    data_sha256: sha256(JSON.stringify(rows)),
    table_count: tables.length,
    row_count: Object.values(rows).reduce((sum, tableRows) => sum + tableRows.length, 0),
    integrity_check: integrity.join(","),
    foreign_key_error_count: foreignKeyErrors.length,
  });
}

function applySqliteMigrations(database, migrations, label) {
  const receipts = [];
  for (const migration of migrations) {
    try {
      database.exec("BEGIN IMMEDIATE");
      database.exec(migration.sql);
      database.exec("COMMIT");
    } catch (error) {
      try { database.exec("ROLLBACK"); } catch {}
      throw new Error(`${label} failed at ${migration.id}: ${error.message}`);
    }
    receipts.push(Object.freeze({ id: migration.id, sql_sha256: sha256(migration.sql) }));
  }
  return Object.freeze(receipts);
}

function syntheticEmployee(employeeId) {
  return {
    tenant_id: "tenant-mg006",
    employee_id: employeeId,
    display_name: "MG006 Synthetic Employee",
    status: "active",
  };
}

function auditCanonicalRerun(root) {
  const filePath = path.join(root, "canonical-rerun.json");
  let store = createFileHrxStore({ filePath });
  store.query("insert", { table: "hrx_employees", row: syntheticEmployee("employee-rerun") });
  let service = createHrxMigrationSafetyService({ store, clock: () => fixedTimestamp });
  const before = service.preflight();
  const first = service.migrate();
  const firstHash = snapshotHash(store.snapshot());
  store.close();

  store = createFileHrxStore({ filePath });
  service = createHrxMigrationSafetyService({ store, clock: () => fixedTimestamp });
  const secondPreflight = service.preflight();
  const second = service.migrate();
  const secondHash = snapshotHash(store.snapshot());
  store.close();

  store = createFileHrxStore({ filePath });
  const reopenedHash = snapshotHash(store.snapshot());
  store.close();

  const migrationCount = loadHrxCoreMigrations().length;
  const firstAppliedCount = first.results.filter(({ applied }) => applied).length;
  const rerunAppliedCount = second.results.filter(({ applied }) => applied).length;
  assert(before.pending_migration_ids.length === migrationCount, "canonical first preflight did not expose every pending migration");
  assert(secondPreflight.pending_migration_ids.length === 0, "canonical rerun still has pending migrations");
  assert(secondPreflight.applied_migration_ids.length === migrationCount, "canonical rerun lost applied migration receipts");
  assert(firstAppliedCount === migrationCount, "canonical first run did not apply every migration");
  assert(rerunAppliedCount === 0, "canonical rerun reapplied migrations");
  assert(firstHash === secondHash && firstHash === reopenedHash, "canonical rerun changed durable state");
  return Object.freeze({
    migration_count: migrationCount,
    first_pending_count: before.pending_migration_ids.length,
    first_applied_count: firstAppliedCount,
    rerun_pending_count: secondPreflight.pending_migration_ids.length,
    rerun_already_applied_count: secondPreflight.applied_migration_ids.length,
    rerun_applied_count: rerunAppliedCount,
    first_snapshot_sha256: firstHash,
    rerun_snapshot_sha256: secondHash,
    reopened_snapshot_sha256: reopenedHash,
    idempotent: true,
  });
}

function auditCanonicalFailureRollback(root) {
  const filePath = path.join(root, "canonical-failure.json");
  let store = createFileHrxStore({ filePath });
  store.query("insert", { table: "hrx_employees", row: syntheticEmployee("employee-failure") });
  const beforeHash = snapshotHash(store.snapshot());
  const migrations = Object.freeze([
    Object.freeze({ id: "mg006-before-failure", sql: "CREATE TABLE IF NOT EXISTS mg006_before_failure (id TEXT);" }),
    Object.freeze({ id: "mg006-injected-failure", sql: "CREATE TABLE IF NOT EXISTS mg006_injected_failure (id TEXT);" }),
    Object.freeze({ id: "mg006-after-failure", sql: "CREATE TABLE IF NOT EXISTS mg006_after_failure (id TEXT);" }),
  ]);
  const failingStore = {
    ...store,
    migrate(migration) {
      if (migration.id === "mg006-injected-failure") throw new Error("MG006 injected migration failure");
      return store.migrate(migration);
    },
  };
  const service = createHrxMigrationSafetyService({ store: failingStore, clock: () => fixedTimestamp });
  let rollback;
  try {
    service.migrate({ migrations });
    throw new Error("canonical injected migration failure unexpectedly succeeded");
  } catch (error) {
    if (error.message !== "MG006 injected migration failure") throw error;
    rollback = error.hrx_migration_rollback;
  }
  const after = store.snapshot();
  const afterHash = snapshotHash(after);
  const partialAppliedCount = after.applied_migrations.filter(({ id }) => id.startsWith("mg006-")).length;
  store.close();
  store = createFileHrxStore({ filePath });
  const reopenedHash = snapshotHash(store.snapshot());
  store.close();
  assert(rollback?.outcome === "restored", "canonical failure did not report a restored rollback");
  assert(partialAppliedCount === 0, "canonical failure left partial migration receipts");
  assert(beforeHash === afterHash && beforeHash === reopenedHash, "canonical failure did not restore exact durable state");
  return Object.freeze({
    injected_migration_count: migrations.length,
    failed_migration_id: "mg006-injected-failure",
    rollback_outcome: rollback.outcome,
    partial_applied_count: partialAppliedCount,
    before_snapshot_sha256: beforeHash,
    restored_snapshot_sha256: afterHash,
    reopened_snapshot_sha256: reopenedHash,
  });
}

function auditCanonicalBackupRestore(root) {
  const filePath = path.join(root, "canonical-backup.json");
  let store = createFileHrxStore({ filePath });
  store.query("insert", { table: "hrx_employees", row: syntheticEmployee("employee-backup") });
  const service = createHrxMigrationSafetyService({ store, clock: () => fixedTimestamp });
  service.migrate();
  const backup = service.backup();
  const beforeHash = snapshotHash(store.snapshot());
  store.query("insert", { table: "hrx_employees", row: syntheticEmployee("employee-after-backup") });
  const mutatedHash = snapshotHash(store.snapshot());
  const restored = service.restore(backup);
  const restoredHash = snapshotHash(store.snapshot());
  let tamperErrorCode;
  try {
    service.restore({ ...backup, state: { ...backup.state, schema_version: "tampered" } });
  } catch (error) {
    tamperErrorCode = error.safe_error_code;
  }
  const postTamperHash = snapshotHash(store.snapshot());
  store.close();
  store = createFileHrxStore({ filePath });
  const reopenedHash = snapshotHash(store.snapshot());
  store.close();
  assert(mutatedHash !== beforeHash, "canonical backup mutation did not change state");
  assert(restored.outcome === "restored", "canonical backup restore did not report restored");
  assert(beforeHash === restoredHash && beforeHash === postTamperHash && beforeHash === reopenedHash, "canonical backup restore was not exact and durable");
  assert(tamperErrorCode === "HRX_MIGRATION_BACKUP_CHECKSUM_MISMATCH", "canonical backup tamper was not rejected");
  return Object.freeze({
    backup_schema_version: backup.schema_version,
    backup_snapshot_sha256: beforeHash,
    mutated_snapshot_sha256: mutatedHash,
    restored_snapshot_sha256: restoredHash,
    reopened_snapshot_sha256: reopenedHash,
    tampered_backup_error_code: tamperErrorCode,
    restore_exact: true,
  });
}

function auditSqliteRecovery(root) {
  const databasePath = path.join(root, "checkpoint-025.sqlite");
  const backupPath = path.join(root, "checkpoint-025.backup.sqlite");
  const migrations = loadHrxCoreMigrations();
  let database = openDatabase(databasePath);
  const checkpointReceipts = applySqliteMigrations(database, migrations.slice(0, 25), "SQLite checkpoint 025");
  database.exec(`
    INSERT INTO hrx_employees (
      tenant_id, employee_id, display_name, status, source_ref, created_at, updated_at
    ) VALUES (
      'tenant-mg006', 'employee-sqlite', 'MG006 Synthetic Employee', 'active',
      'Synthetic:MG006:employee', '${fixedTimestamp}', '${fixedTimestamp}'
    )
  `);
  const checkpointSnapshot = sqliteSnapshot(database);
  database.close();
  copyFileSync(databasePath, backupPath);
  const backupFileSha256 = sha256(readFileSync(backupPath));

  database = openDatabase(databasePath);
  const upgradeReceipts = applySqliteMigrations(database, migrations.slice(25), "SQLite checkpoint upgrade");
  const firstFinalSnapshot = sqliteSnapshot(database);
  database.close();

  database = openDatabase(databasePath);
  database.exec("CREATE TABLE mg006_restore_noise (id TEXT)");
  database.exec("UPDATE hrx_employees SET display_name = 'MG006 Mutated Employee' WHERE employee_id = 'employee-sqlite'");
  const mutatedSnapshot = sqliteSnapshot(database);
  database.close();
  copyFileSync(backupPath, databasePath);
  const restoredFileSha256 = sha256(readFileSync(databasePath));

  database = openDatabase(databasePath);
  const restoredCheckpointSnapshot = sqliteSnapshot(database);
  const restoredUpgradeReceipts = applySqliteMigrations(database, migrations.slice(25), "SQLite restored checkpoint upgrade");
  const restoredFinalSnapshot = sqliteSnapshot(database);
  const beforeFailureSnapshot = sqliteSnapshot(database);
  let failureMessage;
  try {
    database.exec("BEGIN IMMEDIATE");
    database.exec(`
      CREATE TABLE mg006_partial_commit (id TEXT);
      UPDATE hrx_employees SET display_name = 'MG006 Partial Employee' WHERE employee_id = 'employee-sqlite';
      INSERT INTO mg006_missing_table (id) VALUES ('fail');
    `);
    database.exec("COMMIT");
  } catch (error) {
    failureMessage = error.message;
    try { database.exec("ROLLBACK"); } catch {}
  }
  const afterFailureSnapshot = sqliteSnapshot(database);
  const partialObjectCount = Number(database.prepare(`
    SELECT count(*) AS count FROM sqlite_master WHERE name = 'mg006_partial_commit'
  `).get().count);
  database.close();

  database = openDatabase(databasePath, { readOnly: true });
  const reopenedFinalSnapshot = sqliteSnapshot(database);
  database.close();

  assert(checkpointReceipts.length === 25, "SQLite checkpoint 025 receipt count mismatch");
  const expectedUpgradeCount = migrations.length - 25;
  assert(
    upgradeReceipts.length === expectedUpgradeCount && restoredUpgradeReceipts.length === expectedUpgradeCount,
    "SQLite upgrade receipt count mismatch",
  );
  assert(backupFileSha256 === restoredFileSha256, "SQLite restored file does not match backup bytes");
  assert(checkpointSnapshot.schema_sha256 === restoredCheckpointSnapshot.schema_sha256, "SQLite checkpoint schema was not restored");
  assert(checkpointSnapshot.data_sha256 === restoredCheckpointSnapshot.data_sha256, "SQLite checkpoint rows were not restored");
  assert(mutatedSnapshot.data_sha256 !== checkpointSnapshot.data_sha256, "SQLite mutation did not alter data before restore");
  assert(firstFinalSnapshot.schema_sha256 === restoredFinalSnapshot.schema_sha256, "SQLite re-upgrade schema differs after restore");
  assert(firstFinalSnapshot.data_sha256 === restoredFinalSnapshot.data_sha256, "SQLite re-upgrade data differs after restore");
  assert(/no such table: mg006_missing_table/.test(failureMessage ?? ""), "SQLite injected transaction failure did not occur");
  assert(partialObjectCount === 0, "SQLite failed transaction left a schema object");
  assert(beforeFailureSnapshot.schema_sha256 === afterFailureSnapshot.schema_sha256, "SQLite failed transaction changed schema");
  assert(beforeFailureSnapshot.data_sha256 === afterFailureSnapshot.data_sha256, "SQLite failed transaction changed rows");
  assert(beforeFailureSnapshot.schema_sha256 === reopenedFinalSnapshot.schema_sha256, "SQLite failed transaction schema changed after reopen");
  assert(beforeFailureSnapshot.data_sha256 === reopenedFinalSnapshot.data_sha256, "SQLite failed transaction rows changed after reopen");
  assert(reopenedFinalSnapshot.integrity_check === "ok" && reopenedFinalSnapshot.foreign_key_error_count === 0, "SQLite recovered database integrity failed");
  return Object.freeze({
    checkpoint: 25,
    checkpoint_migration_count: checkpointReceipts.length,
    upgrade_migration_count: upgradeReceipts.length,
    backup_file_sha256: backupFileSha256,
    restored_file_sha256: restoredFileSha256,
    checkpoint_schema_sha256: checkpointSnapshot.schema_sha256,
    restored_checkpoint_schema_sha256: restoredCheckpointSnapshot.schema_sha256,
    checkpoint_data_sha256: checkpointSnapshot.data_sha256,
    restored_checkpoint_data_sha256: restoredCheckpointSnapshot.data_sha256,
    first_final_schema_sha256: firstFinalSnapshot.schema_sha256,
    restored_final_schema_sha256: restoredFinalSnapshot.schema_sha256,
    first_final_data_sha256: firstFinalSnapshot.data_sha256,
    restored_final_data_sha256: restoredFinalSnapshot.data_sha256,
    injected_failure: failureMessage,
    partial_schema_object_count: partialObjectCount,
    failed_transaction_schema_sha256_before: beforeFailureSnapshot.schema_sha256,
    failed_transaction_schema_sha256_after: afterFailureSnapshot.schema_sha256,
    failed_transaction_data_sha256_before: beforeFailureSnapshot.data_sha256,
    failed_transaction_data_sha256_after: afterFailureSnapshot.data_sha256,
    reopened_schema_sha256: reopenedFinalSnapshot.schema_sha256,
    reopened_data_sha256: reopenedFinalSnapshot.data_sha256,
    integrity_check: reopenedFinalSnapshot.integrity_check,
    foreign_key_error_count: reopenedFinalSnapshot.foreign_key_error_count,
    backup_restore_exact: true,
    transaction_rollback_exact: true,
  });
}

export function auditHrxMigrationRecovery() {
  const root = mkdtempSync(path.join(tmpdir(), "lawos-mg006-"));
  try {
    const report = {
      tuw: "MG-006",
      verdict: "PASS",
      migration_count: loadHrxCoreMigrations().length,
      canonical_rerun: auditCanonicalRerun(root),
      canonical_failure_rollback: auditCanonicalFailureRollback(root),
      canonical_backup_restore: auditCanonicalBackupRestore(root),
      sqlite_recovery: auditSqliteRecovery(root),
      partial_commit_count: 0,
      external_write_count: 0,
    };
    return Object.freeze({ ...report, report_sha256: sha256(JSON.stringify(report)) });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const args = process.argv.slice(2);
  if (args.some((argument) => ["-h", "--help"].includes(argument))) {
    console.log(usage);
  } else if (args.length) {
    throw new Error(usage);
  } else {
    console.log(JSON.stringify(auditHrxMigrationRecovery(), null, 2));
  }
}
