import { PERSISTENCE_TABLES } from "./schema.js";

export const PERSISTENCE_BACKUP_SCHEMA_VERSION = "law-firm-os.persistence-backup.v0.1";

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freezeDeep(value) {
  if (Array.isArray(value)) return Object.freeze(value.map((item) => freezeDeep(item)));
  if (value && typeof value === "object") {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, freezeDeep(item)])));
  }
  return value;
}

function requireSyntheticConnection(connection) {
  if (!connection || typeof connection.snapshot !== "function" || typeof connection.replaceTable !== "function") {
    throw new TypeError("Runtime Spine persistence connection with snapshot support is required");
  }
  if (connection.capabilities?.synthetic_only !== true || connection.capabilities?.production_ready_claim !== false) {
    throw new Error("Runtime Spine backup/restore is synthetic-only before production DB approval");
  }
}

function scopedTableRows(rows = [], tenant_id) {
  if (!tenant_id) return rows;
  return rows.filter((row) => row.tenant_id === tenant_id);
}

function countTables(tables) {
  return Object.freeze(Object.fromEntries(Object.entries(tables).map(([table, rows]) => [table, rows.length])));
}

export function createPersistenceBackup(connection, { tenant_id, created_at } = {}) {
  requireSyntheticConnection(connection);
  const snapshot = connection.snapshot();
  const tables = Object.fromEntries(
    PERSISTENCE_TABLES.map((table) => {
      const rows = snapshot.tables?.[table] ?? [];
      return [table, table === "runtime_migration_history" && tenant_id ? [] : scopedTableRows(rows, tenant_id)];
    }),
  );
  return freezeDeep({
    schema_version: PERSISTENCE_BACKUP_SCHEMA_VERSION,
    synthetic_only: true,
    production_ready_claim: false,
    tenant_scope: tenant_id ?? "all",
    created_at: created_at ?? new Date(0).toISOString(),
    table_counts: countTables(tables),
    tables
  });
}

export function restorePersistenceBackup(connection, backup, { tenant_id, dryRun = false } = {}) {
  requireSyntheticConnection(connection);
  if (backup?.schema_version !== PERSISTENCE_BACKUP_SCHEMA_VERSION) {
    throw new TypeError("invalid Runtime Spine persistence backup schema");
  }
  if (backup.synthetic_only !== true || backup.production_ready_claim !== false) {
    throw new Error("Runtime Spine restore refuses non-synthetic backup claims");
  }

  const current = connection.snapshot();
  const nextTables = {};
  for (const table of PERSISTENCE_TABLES) {
    const backupRows = clone(backup.tables?.[table] ?? []);
    if (!tenant_id) {
      nextTables[table] = backupRows;
      continue;
    }
    if (table === "runtime_migration_history") {
      nextTables[table] = current.tables?.[table] ?? [];
      continue;
    }
    const retained = (current.tables?.[table] ?? []).filter((row) => row.tenant_id !== tenant_id);
    const scopedBackupRows = backupRows.filter((row) => row.tenant_id === tenant_id);
    nextTables[table] = [...retained, ...scopedBackupRows];
  }

  if (!dryRun) {
    for (const table of PERSISTENCE_TABLES) {
      connection.replaceTable(table, nextTables[table]);
    }
  }

  return freezeDeep({
    dry_run: dryRun,
    synthetic_only: true,
    production_ready_claim: false,
    tenant_scope: tenant_id ?? backup.tenant_scope ?? "all",
    restored_table_counts: countTables(nextTables)
  });
}
