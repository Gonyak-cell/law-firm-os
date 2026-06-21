import { createHash } from "node:crypto";
import { TENANT_BASE_SCHEMA } from "../schema.js";

export const RUNTIME_SPINE_PERSISTENCE_MIGRATIONS = Object.freeze([
  Object.freeze({
    id: "001_runtime_spine_tenant_base",
    description: "Create synthetic tenant base schema and migration history for Runtime Spine RS-1A.",
    schema: TENANT_BASE_SCHEMA,
    up: Object.freeze({
      create_tables: Object.freeze(["runtime_tenants", "runtime_migration_history"])
    }),
    down: Object.freeze({
      rollback_note: "Synthetic-only migration history can be reset by removing the test store file."
    })
  })
]);

export function checksumMigration(migration) {
  return createHash("sha256").update(JSON.stringify({
    id: migration.id,
    description: migration.description,
    up: migration.up,
    down: migration.down
  })).digest("hex");
}

export function listRuntimeSpinePersistenceMigrations() {
  return RUNTIME_SPINE_PERSISTENCE_MIGRATIONS;
}
