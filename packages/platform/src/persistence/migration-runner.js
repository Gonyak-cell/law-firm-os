export function createMigrationRunner({ migrations = [] } = {}) {
  return Object.freeze({
    migrations: Object.freeze([...migrations]),
    plan() {
      return Object.freeze(migrations.map((migration) => Object.freeze({ id: migration.id, checksum: migration.checksum ?? null })));
    },
    run({ applied = new Set() } = {}) {
      const executed = [];
      for (const migration of migrations) {
        if (applied.has(migration.id)) continue;
        migration.up?.();
        executed.push(migration.id);
      }
      return Object.freeze({ executed: Object.freeze(executed), rollback_available: migrations.every((migration) => typeof migration.down === "function") });
    },
  });
}
