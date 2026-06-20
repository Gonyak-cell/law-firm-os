export const DMS_RUNTIME_MIGRATIONS = Object.freeze([
  Object.freeze({
    id: "001_dms_vault_runtime",
    description: "Create Vault/DMS runtime metadata, idempotency, and audit tables.",
    sql_ref: "packages/dms/src/migrations/001_dms_vault_runtime.sql",
  }),
]);

export function runDmsMigrations(store) {
  if (store?.applyMigration) {
    for (const migration of DMS_RUNTIME_MIGRATIONS) store.applyMigration(migration);
  }
  return DMS_RUNTIME_MIGRATIONS;
}
