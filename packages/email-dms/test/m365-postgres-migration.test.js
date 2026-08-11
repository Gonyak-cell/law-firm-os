import assert from "node:assert/strict";
import test from "node:test";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { listEmailDmsPostgresMigrations } from "../src/migrations/index.js";

test("CL-P3-W00-T01 M365Connection migration은 token 열 없이 사용자 고유성과 tenant RLS를 강제한다", async (t) => {
  const migrations = listEmailDmsPostgresMigrations();
  assert.deepEqual(
    migrations.map(({ id }) => id),
    [
      "001_m365_connection",
      "002_inquiry_evidence",
      "003_email_filing_correction",
      "004_outlook_conversation_sync",
      "005_outlook_desktop_installation",
    ],
  );
  assert.equal(migrations[0].id, "001_m365_connection");
  assert.match(migrations[0].checksum, /^[a-f0-9]{64}$/u);
  assert.doesNotMatch(
    migrations[0].sql,
    /\b(access_token|refresh_token|client_secret)\b/iu,
  );

  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await fixture.adminPool.query(migrations[0].sql);
  const schema = await fixture.adminPool.query(
    `SELECT
       to_regclass('lawos_email_dms.m365_connections')::text AS table_name,
       relation.relrowsecurity AS rls_enabled,
       relation.relforcerowsecurity AS rls_forced,
       (
         SELECT array_agg(column_name ORDER BY ordinal_position)
           FROM information_schema.columns
          WHERE table_schema = 'lawos_email_dms'
            AND table_name = 'm365_connections'
       ) AS columns
       FROM pg_class AS relation
       JOIN pg_namespace AS namespace
         ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'lawos_email_dms'
        AND relation.relname = 'm365_connections'`,
  );
  assert.equal(schema.rows[0].table_name, "lawos_email_dms.m365_connections");
  assert.equal(schema.rows[0].rls_enabled, true);
  assert.equal(schema.rows[0].rls_forced, true);
  assert.equal(schema.rows[0].columns.includes("credential_ref"), true);
  assert.equal(schema.rows[0].columns.includes("access_token"), false);
  assert.equal(schema.rows[0].columns.includes("refresh_token"), false);

  await fixture.adminPool.query(
    "GRANT USAGE ON SCHEMA lawos_email_dms TO lawos_app",
  );
  await fixture.adminPool.query(
    "GRANT SELECT, INSERT, UPDATE ON lawos_email_dms.m365_connections TO lawos_app",
  );
  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-email-dms-a" },
    (client) => client.query(
      `INSERT INTO lawos_email_dms.m365_connections
         (tenant_id, m365_connection_id, user_id, entra_subject_id,
          mailbox_address_hash, credential_ref, granted_scopes,
          consented_at, expires_at, state_version)
       VALUES ($1, 'm365-connection-a', 'user-a', 'subject-a', $2,
               'aws-secrets-manager:synthetic/m365/a',
               ARRAY['Calendars.ReadWrite', 'Mail.Read', 'offline_access'],
               '2026-07-30T06:00:00.000Z',
               '2026-08-30T06:00:00.000Z', 1)`,
      ["tenant-email-dms-a", "a".repeat(64)],
    ),
  );
  const hidden = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-email-dms-b" },
    (client) => client.query(
      "SELECT m365_connection_id FROM lawos_email_dms.m365_connections",
    ),
    { readOnly: true },
  );
  assert.deepEqual(hidden.rows, []);
  await assert.rejects(
    withPostgresTransaction(
      fixture.appPool,
      { tenant_id: "tenant-email-dms-a" },
      (client) => client.query(
        `INSERT INTO lawos_email_dms.m365_connections
           (tenant_id, m365_connection_id, user_id, entra_subject_id,
            mailbox_address_hash, credential_ref, granted_scopes,
            consented_at, expires_at, state_version)
         VALUES ($1, 'm365-connection-duplicate-user', 'user-a', 'subject-a',
                 $2, 'aws-secrets-manager:synthetic/m365/duplicate',
                 ARRAY['Mail.Read'],
                 '2026-07-30T06:00:00.000Z',
                 '2026-08-30T06:00:00.000Z', 1)`,
        ["tenant-email-dms-a", "b".repeat(64)],
      ),
    ),
  );
});
