import assert from "node:assert/strict";
import test from "node:test";

import {
  JSON_POSTGRES_PRODUCTION_OUTLOOK_RUNTIME_ENTRIES,
  validateJsonPostgresProductionOutlookRuntimeEntries,
} from "../lib/json-postgres-production-artifact.mjs";

const MIGRATION_ENTRY =
  "packages/email-dms/src/migrations/008_outlook_desktop_trusted_current_read.sql";

test("production Outlook runtime allowlist admits migration 008", () => {
  const candidate = [...new Set([
    ...JSON_POSTGRES_PRODUCTION_OUTLOOK_RUNTIME_ENTRIES,
    MIGRATION_ENTRY,
  ])].sort();
  assert.doesNotThrow(
    () => validateJsonPostgresProductionOutlookRuntimeEntries(candidate),
  );
  assert.equal(
    JSON_POSTGRES_PRODUCTION_OUTLOOK_RUNTIME_ENTRIES.includes(
      MIGRATION_ENTRY,
    ),
    true,
  );
});
