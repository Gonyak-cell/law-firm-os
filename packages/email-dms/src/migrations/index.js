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
]);

export function listEmailDmsPostgresMigrations() {
  return EMAIL_DMS_POSTGRES_MIGRATIONS;
}
