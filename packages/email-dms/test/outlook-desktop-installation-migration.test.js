import assert from "node:assert/strict";
import test from "node:test";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { listEmailDmsPostgresMigrations } from "../src/migrations/index.js";

const TABLES = [
  "outlook_desktop_installations",
  "outlook_desktop_installation_nonces",
  "outlook_desktop_installation_idempotency",
  "outlook_desktop_installation_audit_events",
];

function installationValues(suffix, userId = "user-install-a") {
  return [
    "tenant-install-a",
    `odi_${suffix}`,
    userId,
    `subject-${userId}`,
    `MCowBQYDK2VwAyEA${suffix.padEnd(44, "a")}`,
    suffix.padEnd(64, "a").slice(0, 64),
    "darwin",
    "0.1.26",
    "1".repeat(40),
    "2026-08-11T00:00:00.000Z",
    "2026-08-11T00:00:00.000Z",
    "2026-08-18T00:00:00.000Z",
  ];
}

async function insertInstallation(client, values) {
  return client.query(
    `INSERT INTO lawos_email_dms.outlook_desktop_installations
       (tenant_id, installation_id, user_id, entra_subject_id,
        device_public_key, device_key_fingerprint, platform, app_version,
        source_sha, registered_at, last_seen_at, lease_expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    values,
  );
}

test("desktop installation migration defines tokenless tenant-RLS lifecycle authority", async (t) => {
  const migrations = listEmailDmsPostgresMigrations();
  assert.deepEqual(
    migrations.map(({ id }) => id),
    [
      "001_m365_connection",
      "002_inquiry_evidence",
      "003_email_filing_correction",
      "004_outlook_conversation_sync",
      "005_outlook_desktop_installation",
      "006_outlook_desktop_release_trust",
      "007_outlook_desktop_assignment",
      "008_outlook_desktop_trusted_current_read",
      "009_outlook_desktop_legacy_windows_compatibility",
      "010_internal_unsigned_installation_authority",
    ],
  );
  const migration = migrations.find(
    ({ id }) => id === "005_outlook_desktop_installation",
  );
  assert.ok(migration);
  assert.match(migration.checksum, /^[a-f0-9]{64}$/u);
  for (const table of TABLES) assert.match(migration.sql, new RegExp(`\\b${table}\\b`, "u"));
  assert.match(migration.sql, /ENABLE ROW LEVEL SECURITY/iu);
  assert.match(migration.sql, /FORCE ROW LEVEL SECURITY/iu);
  assert.match(migration.sql, /WITH CHECK\s*\(tenant_id\s*=\s*lawos_security\.current_tenant_id\(\)\)/iu);
  assert.doesNotMatch(
    migration.sql,
    /\b(device_private_key|access_token|refresh_token|client_secret|credential_ref|email_address)\b/iu,
  );

  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  for (const item of migrations.slice(0, 5)) {
    await fixture.adminPool.query(item.sql);
  }

  const schema = await fixture.adminPool.query(
    `SELECT relation.relname AS table_name,
            relation.relrowsecurity AS rls_enabled,
            relation.relforcerowsecurity AS rls_forced
       FROM pg_class AS relation
       JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'lawos_email_dms'
        AND relation.relname = ANY($1::text[])
      ORDER BY relation.relname`,
    [TABLES],
  );
  assert.deepEqual(
    schema.rows.map(({ table_name }) => table_name),
    [...TABLES].sort(),
  );
  assert.equal(schema.rows.every(({ rls_enabled }) => rls_enabled), true);
  assert.equal(schema.rows.every(({ rls_forced }) => rls_forced), true);

  const columns = await fixture.adminPool.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'lawos_email_dms'
        AND table_name = 'outlook_desktop_installations'
      ORDER BY ordinal_position`,
  );
  const columnNames = columns.rows.map(({ column_name }) => column_name);
  for (const required of [
    "tenant_id",
    "installation_id",
    "user_id",
    "entra_subject_id",
    "device_public_key",
    "device_key_fingerprint",
    "platform",
    "app_version",
    "source_sha",
    "registered_at",
    "last_seen_at",
    "lease_expires_at",
    "retired_at",
    "retire_reason",
    "state_version",
  ]) {
    assert.equal(columnNames.includes(required), true, required);
  }
  assert.equal(columnNames.some((name) => /token|private_key|credential_ref/iu.test(name)), false);

  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-install-a" },
    async (client) => {
      await insertInstallation(client, installationValues("1"));
      await insertInstallation(client, installationValues("2"));
    },
  );
  const sameUser = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-install-a" },
    (client) => client.query(
      `SELECT installation_id
         FROM lawos_email_dms.outlook_desktop_installations
        WHERE user_id = 'user-install-a'
        ORDER BY installation_id`,
    ),
    { readOnly: true },
  );
  assert.deepEqual(
    sameUser.rows.map(({ installation_id }) => installation_id),
    ["odi_1", "odi_2"],
  );

  const hidden = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-install-b" },
    (client) => client.query(
      "SELECT installation_id FROM lawos_email_dms.outlook_desktop_installations",
    ),
    { readOnly: true },
  );
  assert.deepEqual(hidden.rows, []);

  await assert.rejects(
    withPostgresTransaction(
      fixture.appPool,
      { tenant_id: "tenant-install-b" },
      (client) => insertInstallation(client, installationValues("3")),
    ),
  );
  await assert.rejects(
    withPostgresTransaction(
      fixture.appPool,
      { tenant_id: "tenant-install-a" },
      (client) => {
        const values = installationValues("5", "user-install-b");
        values[5] = installationValues("1")[5];
        return insertInstallation(client, values);
      },
    ),
  );
  await assert.rejects(
    withPostgresTransaction(
      fixture.appPool,
      { tenant_id: "tenant-install-a" },
      (client) => {
        const values = installationValues("4");
        values[3] = null;
        return insertInstallation(client, values);
      },
    ),
  );

  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-install-a" },
    (client) => client.query(
      `INSERT INTO lawos_email_dms.outlook_desktop_installation_audit_events
         (tenant_id, event_id, installation_id, user_id, entra_subject_id,
          event_type, request_id, idempotency_key, state_version, occurred_at)
       VALUES
         ('tenant-install-a', 'audit-install-1', 'odi_1', 'user-install-a',
          'subject-user-install-a', 'registered', 'request-install-1',
          'idempotency-install-1', 1, clock_timestamp())`,
    ),
  );
  await assert.rejects(
    withPostgresTransaction(
      fixture.appPool,
      { tenant_id: "tenant-install-a" },
      (client) => client.query(
        `UPDATE lawos_email_dms.outlook_desktop_installation_audit_events
            SET event_type = 'tampered'
          WHERE event_id = 'audit-install-1'`,
      ),
    ),
  );
});
