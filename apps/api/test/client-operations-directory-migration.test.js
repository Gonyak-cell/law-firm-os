import assert from "node:assert/strict";
import test from "node:test";
import { checksumPostgresMigration } from "../../../packages/persistence/src/postgres/migration-catalog.js";
import {
  listClientOperationsPostgresMigrations,
  runClientOperationsPostgresMigrations,
  verifyClientOperationsPostgresMigrations,
} from "../src/client-operations-schema.js";
import {
  createOutlookAuthorityPostgresFixture,
  runOutlookAuthorityPostgresMigrations,
} from "./support/outlook-authority-postgres-fixture.js";

const DIRECTORY = "149_hrx_049_hrx_directory_authority";
const CATALOG = listClientOperationsPostgresMigrations();
const DIRECTORY_SQL = CATALOG.find(({ id }) => id === DIRECTORY).sql;
const HISTORY = CATALOG.map(({ id, sql }) => ({
  migration_id: id,
  checksum: checksumPostgresMigration(sql),
}));
const PRE_DIRECTORY = HISTORY.filter(({ migration_id }) => migration_id !== DIRECTORY);
const COLUMNS = Object.freeze({
  hrx_employees: ["mobile_phone", "photo_object_id", "photo_sha256", "photo_byte_size", "photo_content_type", "photo_version_id"],
  hrx_employment_profiles: ["legal_entity_id", "affiliation", "department", "organization_group", "country", "start_date"],
});

function historyPool(rows, calls) {
  return { connect: async () => ({
    async query(sql, values) {
      calls.push({ sql, values });
      return { rows: sql.includes("FROM lawos_meta.schema_migrations") ? rows : [] };
    },
    release() {},
  }) };
}

test("completed client history missing only HRX directory runs only 149", async () => {
  const calls = [];
  const result = await runClientOperationsPostgresMigrations(historyPool(PRE_DIRECTORY, calls));
  assert.deepEqual(result.filter(({ applied }) => applied).map(({ id }) => id), [DIRECTORY]);
  assert.equal(calls.filter(({ sql }) => sql === DIRECTORY_SQL).length, 1);
  assert.deepEqual(calls.filter(({ sql }) => sql.startsWith("INSERT INTO lawos_meta.schema_migrations"))
    .map(({ values }) => values[0]), [DIRECTORY]);
});

test("directory gap does not permit unrelated history or checksum drift", async (t) => {
  const scenarios = [
    ["foundation hole", PRE_DIRECTORY.filter(({ migration_id }) => !migration_id.startsWith("011_"))],
    ["other HRX hole", PRE_DIRECTORY.filter(({ migration_id }) => !migration_id.startsWith("148_"))],
    ["projection hole", PRE_DIRECTORY.filter(({ migration_id }) => !migration_id.startsWith("200_"))],
    ["unknown migration", [...PRE_DIRECTORY, { migration_id: "999_unknown", checksum: "0".repeat(64) }]],
    ["duplicate migration", [PRE_DIRECTORY[0], ...PRE_DIRECTORY]],
    ["existing checksum drift", PRE_DIRECTORY.map((row, index) => index === 0 ? { ...row, checksum: "0".repeat(64) } : row), "LAWOS_POSTGRES_MIGRATION_CHECKSUM_MISMATCH"],
    ["applied directory checksum drift", HISTORY.map((row) => row.migration_id === DIRECTORY ? { ...row, checksum: "0".repeat(64) } : row), "LAWOS_POSTGRES_MIGRATION_CHECKSUM_MISMATCH"],
  ];
  for (const [name, rows, code = "LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED"] of scenarios) {
    await t.test(name, async () => {
      const calls = [];
      await assert.rejects(runClientOperationsPostgresMigrations(historyPool(rows, calls)), { code });
      assert.equal(calls.some(({ sql }) => sql === "BEGIN" || sql === DIRECTORY_SQL
        || sql.startsWith("INSERT INTO lawos_meta.schema_migrations")), false);
    });
  }
});

test("real PostgreSQL directory upgrade preserves history and rows, rolls back failures, and replays zero", async (t) => {
  const fixture = await createOutlookAuthorityPostgresFixture(t);
  if (!fixture) return;
  await runOutlookAuthorityPostgresMigrations(fixture);
  const { adminPool, bootstrapPool } = fixture;

  // Reconstruct the old schema only inside this disposable synthetic database.
  for (const [table, columns] of Object.entries(COLUMNS)) {
    await adminPool.query(`ALTER TABLE lawos_hrx.${table} ${columns.map((column) => `DROP COLUMN ${column}`).join(", ")}`);
  }
  await adminPool.query("DELETE FROM lawos_meta.schema_migrations WHERE migration_id = $1", [DIRECTORY]);
  await bootstrapPool.query(`INSERT INTO lawos_hrx.hrx_employees
    (tenant_id, employee_id, display_name) VALUES ('tenant_synthetic_directory', 'employee_synthetic', 'Synthetic employee')`);
  await bootstrapPool.query(`INSERT INTO lawos_hrx.hrx_employment_profiles
    (tenant_id, profile_id, employee_id, employment_type, effective_from)
    VALUES ('tenant_synthetic_directory', 'profile_synthetic', 'employee_synthetic', 'full_time', '2026-01-01')`);
  const readHistory = async () => (await adminPool.query(
    "SELECT migration_id, checksum, applied_at, applied_by FROM lawos_meta.schema_migrations ORDER BY migration_id",
  )).rows;
  const beforeHistory = await readHistory();
  assert.equal(beforeHistory.length, CATALOG.length - 1);
  const readRows = async () => Promise.all(Object.entries(COLUMNS).map(async ([table, columns]) =>
    (await bootstrapPool.query(`SELECT to_jsonb(row) - $1::text[] AS record FROM lawos_hrx.${table} row`, [columns])).rows));
  const beforeRows = await readRows();
  const readSecurity = async () => (await adminPool.query(`SELECT relname, relowner, relacl, relrowsecurity, relforcerowsecurity
    FROM pg_class WHERE oid IN ('lawos_hrx.hrx_employees'::regclass, 'lawos_hrx.hrx_employment_profiles'::regclass)
    ORDER BY relname`)).rows;
  const beforeSecurity = await readSecurity();
  const readColumns = async () => (await adminPool.query(`SELECT table_name, column_name
    FROM information_schema.columns WHERE table_schema = 'lawos_hrx' AND column_name = ANY($1::text[])
    AND table_name = ANY($2::text[]) ORDER BY table_name, column_name`,
  [Object.values(COLUMNS).flat(), Object.keys(COLUMNS)])).rows;
  assert.deepEqual(await readColumns(), []);

  const failingPool = { connect: async () => {
    const client = await adminPool.connect();
    return {
      query(sql, values) {
        if (sql.startsWith("INSERT INTO lawos_meta.schema_migrations") && values[0] === DIRECTORY) {
          throw Object.assign(new Error("synthetic ledger insertion failure"), { code: "23514" });
        }
        return client.query(sql, values);
      },
      release: () => client.release(),
    };
  } };
  await assert.rejects(runClientOperationsPostgresMigrations(failingPool));
  assert.deepEqual(await readHistory(), beforeHistory);
  assert.deepEqual(await readColumns(), []);
  assert.deepEqual(await readRows(), beforeRows);

  const upgraded = await runClientOperationsPostgresMigrations(adminPool, { appliedBy: "synthetic-directory-upgrade" });
  assert.deepEqual(upgraded.filter(({ applied }) => applied).map(({ id }) => id), [DIRECTORY]);
  const afterHistory = await readHistory();
  assert.deepEqual(afterHistory.filter(({ migration_id }) => migration_id !== DIRECTORY), beforeHistory);
  assert.equal(afterHistory.find(({ migration_id }) => migration_id === DIRECTORY).applied_by, "synthetic-directory-upgrade");
  assert.deepEqual(await readColumns(), Object.entries(COLUMNS).sort().flatMap(([table_name, columns]) =>
    [...columns].sort().map((column_name) => ({ table_name, column_name }))));
  assert.notEqual((await adminPool.query("SELECT to_regclass('lawos_hrx.idx_hrx_employment_profiles_legal_entity') AS relation")).rows[0].relation, null);
  assert.deepEqual(await readRows(), beforeRows);
  assert.deepEqual(await readSecurity(), beforeSecurity);
  assert.equal((await verifyClientOperationsPostgresMigrations(adminPool)).length, CATALOG.length);

  const replay = await runClientOperationsPostgresMigrations(adminPool, { appliedBy: "synthetic-directory-replay" });
  assert.equal(replay.every(({ applied }) => !applied), true);
  assert.deepEqual(await readHistory(), afterHistory);
});
