import assert from "node:assert/strict";
import test from "node:test";
import { selectClientOperationsMigrationTarget } from "../../../apps/api/src/client-operations-schema.js";
import { checksumPostgresMigration } from "../src/postgres/migration-catalog.js";
import { runPostgresMigrations } from "../src/postgres/migration-runner.js";

const INTERNAL = "309_client_internal_unsigned_installation_authority";
const CORPORATE = "016_dms_corporate_workspace";
const SHA80 = "2ef366427d98ed297ab376c8fc7e6a255cf6a054d0eaa660dc6fb7e13c814f79";
const SHA81 = "8de3211a545ebb7c50813990d15f6abc215ffd23a7d09ba2149d9b37fd96e8c7";
const authority = selectClientOperationsMigrationTarget(SHA80).migrations;
const combined = selectClientOperationsMigrationTarget(SHA81).migrations;
const historical = authority.filter(({ id }) => id !== INTERNAL);
const ledger = (migrations) => migrations.map(({ id, sql }) => ({
  migration_id: id, checksum: checksumPostgresMigration(sql),
}));

function options(migrations, migrationCatalogSha256) {
  return {
    migrations, migrationCatalogSha256,
    authorityManifestSha256: "a".repeat(64),
    databaseTargetReceiptSha256: "b".repeat(64),
    allowedHistoricalGapIds: migrations.some(({ id }) => id === CORPORATE) ? [CORPORATE] : [],
    onBeforeMigrations: async () => undefined,
    onOutlookAuthorityPaused: async () => { throw new Error("role mutation must not be reached"); },
    onOutlookAuthorityPostMigration: async () => { throw new Error("postflight must not be reached"); },
    onInternalUnsignedInstallationAuthorityPostMigration: async () => { throw new Error("internal postflight must not be reached"); },
  };
}

test("reviewed transition pins both target digest and exact SQL catalog before acquiring a database connection", async (t) => {
  const changedCorporate = combined.map((migration) => migration.id === CORPORATE
    ? { ...migration, sql: `${migration.sql}\n-- unreviewed mutation` } : migration);
  const changedInternal = authority.map((migration) => migration.id === INTERNAL
    ? { ...migration, sql: "SELECT 1;" } : migration);
  for (const scenario of [
    { name: "80 SQL with81 target digest", migrations: authority, sha: SHA81 },
    { name: "81 SQL with80 target digest", migrations: combined, sha: SHA80 },
    { name: "unreviewed016 SQL", migrations: changedCorporate, sha: SHA81 },
    { name: "unreviewed309 SQL", migrations: changedInternal, sha: SHA80 },
    { name: "DMS-only80 source", migrations: combined.filter(({ id }) => id !== INTERNAL), sha: SHA81 },
    { name: "unreviewed82 source", migrations: [...combined, { id: "999_unknown_transition", sql: "SELECT 999;" }], sha: SHA81 },
    { name: "unknown digest", migrations: combined, sha: "f".repeat(64) },
  ]) {
    await t.test(scenario.name, async () => {
      let connected = false;
      await assert.rejects(runPostgresMigrations({ async connect() {
        connected = true;
        throw new Error("database connection must not be attempted");
      } }, options(scenario.migrations, scenario.sha)), /exact reviewed catalog/u);
      assert.equal(connected, false);
    });
  }
});

function readOnlyHistoryPool(rows) {
  const statements = [];
  return {
    statements,
    pool: { async connect() { return {
      async query(sql) {
        const statement = String(sql).replace(/\s+/gu, " ").trim();
        statements.push(statement);
        assert.match(statement, /^(?:SELECT|BEGIN|COMMIT|ROLLBACK)\b/u,
          "invalid source states must never execute DDL or ledger mutations");
        if (statement.startsWith("SELECT session_user,current_user")) return { rows: [{
          session_user: "lawos_admin", current_user: "lawos_admin",
          database_name: "lawos", database_oid: "42", backend_pid: 1234,
        }] };
        if (statement.includes("to_regnamespace('lawos_meta')")) return { rows: [{
          meta_schema_present: true, migration_ledger_present: true,
        }] };
        if (statement.includes("FROM lawos_meta.schema_migrations")) return { rows };
        return { rows: [] };
      },
      release() { statements.push("RELEASE"); },
    }; } },
  };
}

test("reviewed transitions reject every unapproved prior ledger before DDL", async (t) => {
  const dmsOnly = ledger(combined.filter(({ id }) => id !== INTERNAL));
  for (const scenario of [
    { name: "foundation15 directly to80", rows: ledger(historical.slice(0, 15)), target: authority, sha: SHA80 },
    { name: "pre007 prefix76 directly to80", rows: ledger(historical.slice(0, 76)), target: authority, sha: SHA80 },
    { name: "79 directly to81", rows: ledger(historical), target: combined, sha: SHA81 },
    { name: "DMS-only80 to80", rows: dmsOnly, target: authority, sha: SHA80 },
    { name: "DMS-only80 to81", rows: dmsOnly, target: combined, sha: SHA81 },
    { name: "81 cannot downgrade to80", rows: ledger(combined), target: authority, sha: SHA80 },
    { name: "missing prior row at81 target", rows: ledger(authority.filter(({ id }) => id !== "149_hrx_049_hrx_directory_authority")), target: combined, sha: SHA81 },
    { name: "unknown prior row at81 target", rows: [...ledger(authority), { migration_id: "999_unknown_prior", checksum: "f".repeat(64) }], target: combined, sha: SHA81 },
    { name: "309 checksum drift", rows: ledger(authority).map((row) => row.migration_id === INTERNAL ? { ...row, checksum: "0".repeat(64) } : row), target: combined, sha: SHA81, code: "LAWOS_POSTGRES_MIGRATION_CHECKSUM_MISMATCH" },
  ]) {
    await t.test(scenario.name, async () => {
      const fixture = readOnlyHistoryPool(scenario.rows);
      await assert.rejects(runPostgresMigrations(fixture.pool, options(scenario.target, scenario.sha)), (error) => {
        assert.equal(error.code, scenario.code ?? "LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED");
        assert.equal(error.outlook_authority_failure.postgres_mutation_attempt_count, 0);
        assert.equal(error.outlook_authority_failure.postgres_mutation_committed_count, 0);
        assert.equal(error.outlook_authority_failure.role_configuration_transaction_committed_count, 0);
        return true;
      });
      assert.equal(fixture.statements.filter((sql) => sql === "BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY").length, 1);
      assert.equal(fixture.statements.at(-2), "SELECT pg_advisory_unlock($1)");
      assert.equal(fixture.statements.at(-1), "RELEASE");
    });
  }
});

test("combined81 rejects a claimed prior80 approval instead of replacing the original79 authority", async () => {
  const fixture = readOnlyHistoryPool(ledger(authority));
  const input = options(combined, SHA81);
  input.onBeforeMigrations = async () => ({
    schema_version: "lawos.outlook-authority-role-bootstrap-receipt.v1",
    authority_manifest_sha256: input.authorityManifestSha256,
    database_target_receipt_sha256: input.databaseTargetReceiptSha256,
    migration_catalog_sha256: SHA80,
    role_bootstrap_sha256: "c".repeat(64),
  });
  await assert.rejects(runPostgresMigrations(fixture.pool, input), (error) => {
    assert.match(error.message, /signed digest mismatch/u);
    assert.equal(error.outlook_authority_failure.postgres_mutation_attempt_count, 0);
    assert.equal(error.outlook_authority_failure.postgres_mutation_committed_count, 0);
    return true;
  });
  assert.equal(fixture.statements.at(-1), "RELEASE");
});
