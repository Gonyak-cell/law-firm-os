import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));

export function checksumPostgresMigration(sql) {
  const normalized = String(sql).replace(/\r\n/gu, "\n").trimEnd() + "\n";
  return createHash("sha256").update(normalized).digest("hex");
}

function loadMigration(id, fileName) {
  const sql = readFileSync(join(moduleDirectory, "migrations", fileName), "utf8");
  return Object.freeze({ id, file_name: fileName, sql, checksum: checksumPostgresMigration(sql) });
}

export const POSTGRES_FOUNDATION_MIGRATIONS = Object.freeze([
  loadMigration("001_repository_port_v2", "001_repository_port_v2.sql"),
  loadMigration("002_identity_ledger", "002_identity_ledger.sql"),
  loadMigration("003_domain_ledger", "003_domain_ledger.sql"),
  loadMigration("004_dms_upload_runtime", "004_dms_upload_runtime.sql"),
]);

export function listPostgresFoundationMigrations() {
  return POSTGRES_FOUNDATION_MIGRATIONS;
}
