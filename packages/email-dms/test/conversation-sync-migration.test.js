import assert from "node:assert/strict";
import test from "node:test";

import { listEmailDmsPostgresMigrations } from "../src/migrations/index.js";

test("OUTM-25..27 migration defines tenant-isolated policy, subscription, cursor, queue, receipt, audit, and idempotency tables", () => {
  // Given
  const migrations = listEmailDmsPostgresMigrations();

  // When
  const migration = migrations.find(({ id }) => id === "003_outlook_conversation_sync");

  // Then
  assert.ok(migration);
  for (const table of [
    "conversation_policies",
    "graph_subscriptions",
    "graph_delta_cursors",
    "graph_notification_jobs",
    "graph_notification_receipts",
    "graph_sync_audit_events",
    "graph_sync_idempotency",
  ]) {
    assert.match(migration.sql, new RegExp(`CREATE TABLE IF NOT EXISTS lawos_email_dms\\.${table}`, "u"));
  }
  assert.doesNotMatch(migration.sql, /\b(access_token|refresh_token|client_secret|client_state text)\b/iu);
  assert.match(migration.sql, /client_state_hash text NOT NULL/u);
  assert.match(migration.sql, /UNIQUE \(tenant_id, m365_connection_id, resource\)/u);
  assert.match(migration.sql, /UNIQUE \(tenant_id, subscription_id, resource, message_id\)/u);
  assert.equal((migration.sql.match(/ENABLE ROW LEVEL SECURITY/gu) ?? []).length, 7);
});
