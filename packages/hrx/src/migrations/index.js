import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertHrxStorePort } from "../store/port.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const HRX_CORE_MIGRATIONS = Object.freeze([
  Object.freeze({
    id: "001_hrx_core",
    filename: "001_hrx_core.sql",
  }),
]);

const UNSAFE_SQL_PATTERNS = Object.freeze([
  /\bDROP\s+TABLE\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bALTER\s+TABLE\b[^;]*\bDROP\b/i,
]);

export function readHrxMigration(filename) {
  return readFileSync(resolve(__dirname, filename), "utf8");
}

export function assertHrxMigrationIsNonDestructive(sql, { id = "unknown" } = {}) {
  for (const pattern of UNSAFE_SQL_PATTERNS) {
    if (pattern.test(sql)) {
      throw new Error(`HRX migration ${id} contains unsafe SQL pattern: ${pattern}`);
    }
  }
  return true;
}

export function loadHrxCoreMigrations() {
  return HRX_CORE_MIGRATIONS.map((migration) => {
    const sql = readHrxMigration(migration.filename);
    assertHrxMigrationIsNonDestructive(sql, migration);
    return Object.freeze({ ...migration, sql });
  });
}

export function runHrxMigrations(store, { migrations = loadHrxCoreMigrations() } = {}) {
  assertHrxStorePort(store);
  const results = [];
  for (const migration of migrations) {
    assertHrxMigrationIsNonDestructive(migration.sql, migration);
    results.push(store.migrate(migration));
  }
  return Object.freeze(results);
}
