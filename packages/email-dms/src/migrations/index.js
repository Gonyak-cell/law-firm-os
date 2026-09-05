import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

function migration(id, fileName) {
  const sql = readFileSync(new URL(fileName, import.meta.url), "utf8");
  return Object.freeze({
    id,
    file_name: fileName,
    sql,
    checksum: createHash("sha256")
      .update(sql.replace(/\r\n/gu, "\n").trimEnd() + "\n")
      .digest("hex"),
  });
}

export const EMAIL_DMS_POSTGRES_MIGRATIONS = Object.freeze([
  migration("001_m365_connection", "./001_m365_connection.sql"),
  migration("002_inquiry_evidence", "./002_inquiry_evidence.sql"),
  migration("003_email_filing_correction", "./003_email_filing_correction.sql"),
  migration("004_outlook_conversation_sync", "./004_outlook_conversation_sync.sql"),
  migration("005_outlook_desktop_installation", "./005_outlook_desktop_installation.sql"),
  migration("006_outlook_desktop_release_trust", "./006_outlook_desktop_release_trust.sql"),
  migration("007_outlook_desktop_assignment", "./007_outlook_desktop_assignment.sql"),
  migration("008_outlook_desktop_trusted_current_read", "./008_outlook_desktop_trusted_current_read.sql"),
  migration("009_outlook_desktop_legacy_windows_compatibility", "./009_outlook_desktop_legacy_windows_compatibility.sql"),
  migration("010_internal_unsigned_installation_authority", "./010_internal_unsigned_installation_authority.sql"),
]);

export function listEmailDmsPostgresMigrations() {
  return EMAIL_DMS_POSTGRES_MIGRATIONS;
}
