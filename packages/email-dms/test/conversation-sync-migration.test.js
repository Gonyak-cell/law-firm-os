import assert from "node:assert/strict";
import test from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
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
  assert.doesNotMatch(migration.sql, /\b(access_token|refresh_token|client_secret|client_state text|delta_link)\b/iu);
  assert.match(migration.sql, /client_state_hash text NOT NULL/u);
  assert.match(migration.sql, /UNIQUE \(tenant_id, m365_connection_id, resource\)/u);
  assert.match(migration.sql, /UNIQUE \(tenant_id, dedupe_key\)/u);
  assert.match(migration.sql, /provider_subscription_id text NOT NULL/u);
  assert.match(migration.sql, /result_code text/u);
  assert.match(migration.sql, /graph_notification_receipts_immutable/u);
  assert.match(migration.sql, /graph_sync_audit_events_immutable/u);
  assert.equal((migration.sql.match(/ENABLE ROW LEVEL SECURITY/gu) ?? []).length, 7);
});

test("OUTM-27 PostgreSQL receipts and audit rows are tenant-isolated and immutable", async (t) => {
  // Given
  const migrations = listEmailDmsPostgresMigrations();
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await fixture.adminPool.query(migrations[0].sql);
  await fixture.adminPool.query(migrations[2].sql);
  const triggers = await fixture.adminPool.query(
    `SELECT trigger.tgname
       FROM pg_trigger AS trigger
       JOIN pg_class AS relation ON relation.oid = trigger.tgrelid
       JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'lawos_email_dms'
        AND trigger.tgname IN (
          'graph_notification_receipts_immutable',
          'graph_sync_audit_events_immutable'
        )
      ORDER BY trigger.tgname`,
  );
  assert.deepEqual(triggers.rows.map(({ tgname }) => tgname), [
    "graph_notification_receipts_immutable",
    "graph_sync_audit_events_immutable",
  ]);
  await fixture.adminPool.query("GRANT USAGE ON SCHEMA lawos_email_dms TO lawos_app");
  await fixture.adminPool.query("GRANT SELECT, INSERT, UPDATE, DELETE ON lawos_email_dms.graph_notification_receipts, lawos_email_dms.graph_sync_audit_events TO lawos_app");
  await withPostgresTransaction(fixture.appPool, { tenant_id: "tenant-outm27-a" }, async (client) => {
    await client.query(
      `INSERT INTO lawos_email_dms.graph_notification_receipts
         (tenant_id, receipt_id, subscription_id, provider_subscription_id,
          source, resource, notification_kind, message_id, change_type,
          received_at, payload_sha256)
       VALUES ($1, 'receipt-outm27', 'subscription-outm27', 'provider-outm27',
               'webhook', 'me/mailFolders(''inbox'')/messages', 'message', 'message-outm27',
               'created', '2026-08-08T00:00:00.000Z', $2)`,
      ["tenant-outm27-a", "a".repeat(64)],
    );
    await client.query(
      `INSERT INTO lawos_email_dms.graph_sync_audit_events
         (tenant_id, event_id, event_type, object_id, actor_id, occurred_at)
       VALUES ($1, 'audit-outm27', 'graph_notification.webhook_enqueued',
               'job-outm27', 'graph-notification-intake',
               '2026-08-08T00:00:00.000Z')`,
      ["tenant-outm27-a"],
    );
  });

  // When / Then
  const hidden = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-outm27-b" },
    (client) => client.query("SELECT receipt_id FROM lawos_email_dms.graph_notification_receipts"),
    { readOnly: true },
  );
  assert.deepEqual(hidden.rows, []);
  await assert.rejects(
    withPostgresTransaction(fixture.appPool, { tenant_id: "tenant-outm27-a" }, (client) => client.query("UPDATE lawos_email_dms.graph_notification_receipts SET change_type = 'created' WHERE receipt_id = 'receipt-outm27'")),
    (error) => error.safe_error_code === "POSTGRES_OPERATION_FAILED" && error.postgres_code === "P0001",
  );
  await assert.rejects(
    withPostgresTransaction(fixture.appPool, { tenant_id: "tenant-outm27-a" }, (client) => client.query("DELETE FROM lawos_email_dms.graph_sync_audit_events WHERE event_id = 'audit-outm27'")),
    (error) => error.safe_error_code === "POSTGRES_OPERATION_FAILED" && error.postgres_code === "P0001",
  );
});
