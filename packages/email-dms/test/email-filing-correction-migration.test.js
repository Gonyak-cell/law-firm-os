import assert from "node:assert/strict";
import test from "node:test";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { listEmailDmsPostgresMigrations } from "../src/migrations/index.js";

test("OUTM-20 migration defines an append-only tenant-scoped placement chain", () => {
  // Given: the Email DMS migration catalog.
  const migrations = listEmailDmsPostgresMigrations();

  // When: the filing-correction migration is inspected.
  const migration = migrations.find((value) => value.id === "003_email_filing_correction");

  // Then: it enforces immutable identity, one child per prior placement, and RLS.
  assert.ok(migration);
  assert.match(migration.checksum, /^[a-f0-9]{64}$/u);
  assert.match(migration.sql, /CREATE TABLE IF NOT EXISTS lawos_email_dms\.email_filing_placements/iu);
  assert.match(migration.sql, /UNIQUE \(tenant_id, idempotency_key\)/iu);
  assert.match(migration.sql, /prior_placement_id/iu);
  assert.match(migration.sql, /CREATE UNIQUE INDEX[\s\S]+prior_placement_id/iu);
  assert.match(migration.sql, /FOREIGN KEY \([\s\S]+prior_placement_id[\s\S]+REFERENCES lawos_email_dms\.email_filing_placements/iu);
  assert.match(migration.sql, /source_matter_id[\s\S]+target_matter_id[\s\S]+DEFERRABLE INITIALLY DEFERRED/iu);
  assert.match(migration.sql, /ENABLE ROW LEVEL SECURITY/iu);
  assert.match(migration.sql, /FORCE ROW LEVEL SECURITY/iu);
  assert.match(migration.sql, /reject_email_filing_placement_mutation/iu);
  assert.doesNotMatch(migration.sql, /\b(mime_bytes|body_html|body_text)\b/iu);
});

test("OUTM-20 PostgreSQL migration enforces chain identity, append-only writes, and tenant RLS", async (t) => {
  // Given: migration 003 applied to a real disposable PostgreSQL database.
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const migrations = listEmailDmsPostgresMigrations();
  const migration = migrations[2];
  await fixture.adminPool.query(migrations[0].sql);
  await fixture.adminPool.query(migration.sql);
  await fixture.adminPool.query(
    `GRANT USAGE ON SCHEMA lawos_email_dms TO lawos_app;
     GRANT SELECT, INSERT, UPDATE, DELETE
       ON lawos_email_dms.email_filing_placements TO lawos_app;
     GRANT SELECT
       ON lawos_email_dms.email_filing_current_placements TO lawos_app`,
  );
  const columns = [
    "tenant_id", "placement_id", "event_kind", "correction_id", "email_thread_id",
    "document_id", "mime_sha256", "original_receipt_id", "source_matter_id",
    "target_matter_id", "reason", "reason_hash", "actor_id", "occurred_at",
    "idempotency_key", "payload_fingerprint", "prior_placement_id", "status",
  ];
  const original = [
    "tenant-a", "placement-origin", "original", "origin-a", "thread-a", "document-a",
    "a".repeat(64), "receipt-a", "matter-a", "matter-a", "", "b".repeat(64),
    "user-a", "2026-08-08T01:00:00.000Z", "original-key", "c".repeat(64), null, "original",
  ];
  const insertSql = `INSERT INTO lawos_email_dms.email_filing_placements
    (${columns.join(", ")}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(", ")})`;
  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-a" },
    (client) => client.query(insertSql, original),
  );

  // When/Then: a child whose source does not equal its parent's target is rejected at commit.
  const invalidChild = [
    "tenant-a", "placement-invalid", "correction", "correction-invalid", "thread-a", "document-a",
    "a".repeat(64), "receipt-a", "matter-c", "matter-b", "잘못된 출발", "d".repeat(64),
    "user-b", "2026-08-08T02:00:00.000Z", "invalid-key", "e".repeat(64),
    "placement-origin", "applied",
  ];
  await assert.rejects(withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-a" },
    (client) => client.query(insertSql, invalidChild),
  ));

  // When: a valid A-to-B correction is appended.
  const validChild = [
    "tenant-a", "placement-valid", "correction", "correction-valid", "thread-a", "document-a",
    "a".repeat(64), "receipt-a", "matter-a", "matter-b", "Matter 정정", "f".repeat(64),
    "user-b", "2026-08-08T02:00:00.000Z", "valid-key", "0".repeat(64),
    "placement-origin", "applied",
  ];
  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-a" },
    (client) => client.query(insertSql, validChild),
  );

  // Then: the leaf projection is B, mutation is blocked, and another tenant sees no row.
  const current = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-a" },
    (client) => client.query(
      "SELECT placement_id, target_matter_id FROM lawos_email_dms.email_filing_current_placements",
    ),
    { readOnly: true },
  );
  assert.deepEqual(current.rows, [{ placement_id: "placement-valid", target_matter_id: "matter-b" }]);
  await assert.rejects(withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-a" },
    (client) => client.query(
      "UPDATE lawos_email_dms.email_filing_placements SET reason = 'overwrite' WHERE placement_id = 'placement-valid'",
    ),
  ));
  const hidden = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-b" },
    (client) => client.query("SELECT placement_id FROM lawos_email_dms.email_filing_current_placements"),
    { readOnly: true },
  );
  assert.deepEqual(hidden.rows, []);
});
