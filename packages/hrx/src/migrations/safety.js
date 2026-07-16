import { createHash } from "node:crypto";
import { assertHrxMigrationIsNonDestructive, loadHrxCoreMigrations, runHrxMigrations } from "./index.js";
import { assertHrxStorePort } from "../store/port.js";

export const HRX_MIGRATION_BACKUP_SCHEMA_VERSION = "law-firm-os.hrx-migration-backup.v0.1";

function hash(value) {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function guardedError(message, safeErrorCode) {
  const error = new Error(message);
  error.safe_error_code = safeErrorCode;
  return error;
}

function validateMigrations(migrations) {
  if (!Array.isArray(migrations) || migrations.length === 0) throw new TypeError("migrations must be a non-empty array");
  const ids = new Set();
  for (const migration of migrations) {
    if (!migration || typeof migration.id !== "string" || migration.id.trim() === "" || typeof migration.sql !== "string") {
      throw new TypeError("migration id and sql are required");
    }
    if (ids.has(migration.id)) throw guardedError(`Duplicate migration id: ${migration.id}`, "HRX_MIGRATION_ID_DUPLICATE");
    ids.add(migration.id);
    assertHrxMigrationIsNonDestructive(migration.sql, migration);
  }
  return migrations;
}

function tableCounts(snapshot) {
  return Object.freeze(
    Object.fromEntries(Object.entries(snapshot.tables ?? {}).map(([table, rows]) => [table, Array.isArray(rows) ? rows.length : 0])),
  );
}

export function createHrxMigrationSafetyService({
  store,
  clock = () => new Date().toISOString(),
} = {}) {
  assertHrxStorePort(store);
  if (typeof store.snapshot !== "function" || typeof store.restoreSnapshot !== "function") {
    throw new TypeError("HRX migration safety requires snapshot and restoreSnapshot support");
  }

  function preflight({ migrations = loadHrxCoreMigrations() } = {}) {
    const validated = validateMigrations(migrations);
    const snapshot = store.snapshot();
    const applied = new Map((snapshot.applied_migrations ?? []).map((migration) => [migration.id, migration]));
    const pending = [];
    const alreadyApplied = [];
    for (const migration of validated) {
      const current = applied.get(migration.id);
      if (!current) {
        pending.push(migration.id);
        continue;
      }
      if (current.hash !== hash(migration.sql)) {
        throw guardedError(`Applied migration hash mismatch: ${migration.id}`, "HRX_MIGRATION_HASH_MISMATCH");
      }
      alreadyApplied.push(migration.id);
    }
    return Object.freeze({
      outcome: "ready",
      snapshot_hash: hash(snapshot),
      pending_migration_ids: Object.freeze(pending),
      applied_migration_ids: Object.freeze(alreadyApplied),
      unknown_applied_migration_ids: Object.freeze(
        [...applied.keys()].filter((id) => !validated.some((migration) => migration.id === id)),
      ),
      table_counts: tableCounts(snapshot),
    });
  }

  function backup() {
    const state = store.snapshot();
    return Object.freeze({
      schema_version: HRX_MIGRATION_BACKUP_SCHEMA_VERSION,
      created_at: clock(),
      snapshot_hash: hash(state),
      table_counts: tableCounts(state),
      state,
    });
  }

  function restore(backupReceipt) {
    if (backupReceipt?.schema_version !== HRX_MIGRATION_BACKUP_SCHEMA_VERSION || !backupReceipt.state) {
      throw guardedError("HRX migration backup is invalid", "HRX_MIGRATION_BACKUP_INVALID");
    }
    if (hash(backupReceipt.state) !== backupReceipt.snapshot_hash) {
      throw guardedError("HRX migration backup checksum mismatch", "HRX_MIGRATION_BACKUP_CHECKSUM_MISMATCH");
    }
    const restored = store.restoreSnapshot(backupReceipt.state);
    return Object.freeze({
      outcome: "restored",
      snapshot_hash: hash(restored),
      table_counts: tableCounts(restored),
    });
  }

  function migrate({ migrations = loadHrxCoreMigrations() } = {}) {
    const migrationBackup = backup();
    const readiness = preflight({ migrations });
    try {
      const results = runHrxMigrations(store, { migrations });
      return Object.freeze({
        outcome: "migrated",
        backup: migrationBackup,
        preflight: readiness,
        results,
        snapshot_hash: hash(store.snapshot()),
      });
    } catch (error) {
      try {
        error.hrx_migration_rollback = restore(migrationBackup);
      } catch (restoreError) {
        throw new AggregateError([error, restoreError], "HRX migration failed and backup restore also failed");
      }
      throw error;
    }
  }

  return Object.freeze({ preflight, backup, restore, migrate });
}
