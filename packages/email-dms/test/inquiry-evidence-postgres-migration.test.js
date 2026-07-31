import assert from "node:assert/strict";
import test from "node:test";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { listEmailDmsPostgresMigrations } from "../src/migrations/index.js";

const TENANT_A = "tenant-inquiry-evidence-migration-a";
const TENANT_B = "tenant-inquiry-evidence-migration-b";

test("CL-P3-W01-T01 inquiry evidence migration은 중복 키·파일 관계·tenant RLS를 강제하고 본문 열을 만들지 않는다", async (t) => {
  const migrations = listEmailDmsPostgresMigrations();
  assert.equal(migrations[1].id, "002_inquiry_evidence");
  assert.match(migrations[1].checksum, /^[a-f0-9]{64}$/u);
  assert.doesNotMatch(
    migrations[1].sql,
    /\b(mime_bytes|body_html|body_text|access_token|refresh_token)\b/iu,
  );

  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  for (const migration of migrations) {
    await fixture.adminPool.query(migration.sql);
  }
  const schema = await fixture.adminPool.query(
    `SELECT
       relation.relname AS table_name,
       relation.relrowsecurity AS rls_enabled,
       relation.relforcerowsecurity AS rls_forced,
       (
         SELECT array_agg(column_name ORDER BY ordinal_position)
           FROM information_schema.columns
          WHERE table_schema = 'lawos_email_dms'
            AND table_name = relation.relname
       ) AS columns
       FROM pg_class AS relation
       JOIN pg_namespace AS namespace
         ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'lawos_email_dms'
        AND relation.relname IN (
          'inquiry_email_evidence',
          'inquiry_evidence_file_objects'
        )
      ORDER BY relation.relname`,
  );
  assert.equal(schema.rows.length, 2);
  for (const table of schema.rows) {
    assert.equal(table.rls_enabled, true);
    assert.equal(table.rls_forced, true);
    assert.equal(table.columns.includes("mime_bytes"), false);
    assert.equal(table.columns.includes("body_html"), false);
  }

  await fixture.adminPool.query(
    "GRANT USAGE ON SCHEMA lawos_email_dms TO lawos_app",
  );
  await fixture.adminPool.query(
    `GRANT SELECT, INSERT, UPDATE
       ON lawos_email_dms.inquiry_email_evidence,
          lawos_email_dms.inquiry_evidence_file_objects
       TO lawos_app`,
  );
  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT_A },
    (client) => client.query(
      `INSERT INTO lawos_email_dms.inquiry_email_evidence
         (tenant_id, inquiry_email_evidence_id, mailbox_address,
          graph_immutable_message_id, internet_message_id, subject,
          sender, recipients, received_at, attachment_manifest,
          capture_status, retention_policy_ref, legal_hold_state,
          captured_by, captured_at)
       VALUES
         ($1, 'evidence-migration-a', 'intake@example.invalid',
          'immutable-message-migration-a',
          '<inquiry-migration-a@example.invalid>', 'Synthetic inquiry',
          '{"address":"sender@example.invalid"}'::jsonb, '[]'::jsonb,
          '2026-07-30T07:00:00.000Z', '[]'::jsonb, 'failed',
          'retention-inquiry', 'none', 'user-migration',
          '2026-07-30T07:01:00.000Z')`,
      [TENANT_A],
    ),
  );

  await assert.rejects(
    withPostgresTransaction(
      fixture.appPool,
      { tenant_id: TENANT_A },
      (client) => client.query(
        `INSERT INTO lawos_email_dms.inquiry_email_evidence
           (tenant_id, inquiry_email_evidence_id, mailbox_address,
            graph_immutable_message_id, internet_message_id, subject,
            sender, recipients, received_at, attachment_manifest,
            capture_status, retention_policy_ref, legal_hold_state,
            captured_by, captured_at)
         VALUES
           ($1, 'evidence-migration-duplicate',
            'intake@example.invalid', 'other-immutable-id',
            '<inquiry-migration-a@example.invalid>', 'Duplicate',
            '{"address":"sender@example.invalid"}'::jsonb, '[]'::jsonb,
            '2026-07-30T07:00:00.000Z', '[]'::jsonb, 'failed',
            'retention-inquiry', 'none', 'user-migration',
            '2026-07-30T07:01:00.000Z')`,
        [TENANT_A],
      ),
    ),
  );

  const hidden = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT_B },
    (client) => client.query(
      "SELECT inquiry_email_evidence_id FROM lawos_email_dms.inquiry_email_evidence",
    ),
    { readOnly: true },
  );
  assert.deepEqual(hidden.rows, []);
});
