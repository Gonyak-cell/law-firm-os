import { checksumMigration, listRuntimeSpinePersistenceMigrations } from "./migrations/index.js";

export function runRuntimeSpineMigrations(connection, { migrations = listRuntimeSpinePersistenceMigrations(), dryRun = false } = {}) {
  if (!connection || typeof connection.select !== "function" || typeof connection.insert !== "function") {
    throw new TypeError("Runtime Spine persistence connection is required");
  }

  const history = connection.select("runtime_migration_history");
  const results = [];
  for (const migration of migrations) {
    if (!migration || typeof migration.id !== "string") throw new TypeError("migration id is required");
    const checksum = checksumMigration(migration);
    const alreadyApplied = history.some((entry) => entry.id === migration.id);
    if (alreadyApplied) {
      results.push(Object.freeze({ id: migration.id, applied: false, dry_run: dryRun, checksum }));
      continue;
    }
    if (!dryRun) {
      connection.insert("runtime_migration_history", {
        id: migration.id,
        checksum,
        applied_at: migration.applied_at ?? new Date(0).toISOString()
      });
    }
    results.push(Object.freeze({ id: migration.id, applied: !dryRun, dry_run: dryRun, checksum }));
  }
  return Object.freeze(results);
}

export function rollbackRuntimeSpineMigrations(connection, { migrations = listRuntimeSpinePersistenceMigrations(), dryRun = false } = {}) {
  if (!connection || typeof connection.select !== "function" || typeof connection.replaceTable !== "function") {
    throw new TypeError("Runtime Spine persistence connection is required");
  }
  const migrationIds = new Set(migrations.map((migration) => migration.id));
  const history = connection.select("runtime_migration_history");
  const retained = history.filter((entry) => !migrationIds.has(entry.id));
  if (!dryRun) connection.replaceTable("runtime_migration_history", retained);
  return Object.freeze({
    dry_run: dryRun,
    removed: history.length - retained.length,
    retained: retained.length,
    rollback_note: "RS-1A rollback affects synthetic migration history only."
  });
}
