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
  loadMigration("005_domain_runtime_authority", "005_domain_runtime_authority.sql"),
  loadMigration("006_entra_oidc_authority", "006_entra_oidc_authority.sql"),
  loadMigration("007_break_glass_multi_approval", "007_break_glass_multi_approval.sql"),
  loadMigration("008_dms_permanent_delete_approval", "008_dms_permanent_delete_approval.sql"),
  loadMigration("009_authenticated_tenant_context", "009_authenticated_tenant_context.sql"),
  loadMigration("010_internal_password_directory", "010_internal_password_directory.sql"),
  loadMigration("011_identity_session_membership_authority", "011_identity_session_membership_authority.sql"),
  loadMigration("012_outlook_document_source_identity", "012_outlook_document_source_identity.sql"),
  loadMigration("013_dms_precedent_search", "013_dms_precedent_search.sql"),
  loadMigration("014_docusign_outbox", "014_docusign_outbox.sql"),
  loadMigration("015_external_tenant_provisioning", "015_external_tenant_provisioning.sql"),
  loadMigration("016_dms_corporate_workspace", "016_dms_corporate_workspace.sql"),
]);

export function listPostgresFoundationMigrations() {
  return POSTGRES_FOUNDATION_MIGRATIONS;
}
