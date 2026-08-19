import assert from "node:assert/strict";
import test from "node:test";

import { hashDomainValue } from "../src/domain-ledger.js";
import {
  assertOutlookPostgresRoleConfigurationCommitUnknownError,
  assertOutlookAuthorityMigrationFailureReceipt,
  assertOutlookAuthorityMigrationRunReceipt,
  createOutlookPostgresCommitUnknownError,
  createOutlookPostgresRoleConfigurationCommitUnknownError,
  runPostgresMigrations,
} from "../src/postgres/migration-runner.js";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const SHA_C = "c".repeat(64);
const SHA_D = "d".repeat(64);
const SHA_E = "e".repeat(64);
const SIGNED_OPTIONS = Object.freeze({
  authorityManifestSha256: SHA_B,
  databaseTargetReceiptSha256: SHA_E,
  migrationCatalogSha256: SHA_C,
});

function resign(value, digestKey) {
  const { [digestKey]: ignored, ...material } = value;
  return { ...material, [digestKey]: hashDomainValue(material) };
}

function recordingPool({ commitFailure } = {}) {
  const events = [];
  const history = [];
  let pending = [];
  let inTransaction = false;
  let commitCount = 0;
  const client = {
    async query(sql, values = []) {
      const statement = String(sql).replace(/\s+/gu, " ").trim();
      events.push({ statement, values: [...values] });
      if (statement.startsWith("BEGIN")) {
        inTransaction = true;
        pending = [];
      } else if (statement === "COMMIT") {
        commitCount += 1;
        if (!commitFailure || commitFailure.commit !== commitCount
            || commitFailure.applied) {
          history.push(...pending);
        }
        pending = [];
        inTransaction = false;
        if (commitFailure?.commit === commitCount) {
          throw new Error("connection closed after COMMIT write");
        }
      } else if (statement === "ROLLBACK") {
        pending = [];
        inTransaction = false;
      } else if (statement.includes("FROM lawos_meta.schema_migrations")) {
        return { rows: history.map((row) => ({ ...row })) };
      } else if (statement.includes("to_regnamespace('lawos_meta')")) {
        return { rows: [{
          meta_schema_present: true,
          migration_ledger_present: true,
        }] };
      } else if (statement.startsWith("SELECT session_user,current_user")) {
        return { rows: [{
          session_user: "lawos_admin",
          current_user: "lawos_admin",
          database_name: "postgres",
          database_oid: "5",
          backend_pid: 1234,
        }] };
      } else if (statement.startsWith("INSERT INTO lawos_meta.schema_migrations")) {
        pending.push({
          migration_id: values[0],
          checksum: values[1],
          applied_at: new Date(0),
          applied_by: values[2],
        });
      }
      return { rows: [] };
    },
    release() {
      events.push({ statement: "RELEASE", values: [] });
    },
    get inTransaction() {
      return inTransaction;
    },
  };
  return { client, events, history, pool: { connect: async () => client } };
}

test("authority callbacks require all signed digests before connecting", async () => {
  let connected = false;
  await assert.rejects(runPostgresMigrations({
    async connect() {
      connected = true;
      throw new Error("unreachable");
    },
  }, {
    migrations: [{ id: "007_outlook_desktop_assignment", sql: "SELECT 7" }],
    onBeforeMigrations() {},
    onOutlookAuthorityPaused() {},
    onOutlookAuthorityPostMigration() {},
  }), /signed digests are required/iu);
  assert.equal(connected, false);
});

for (const applied of [true, false]) {
  test(`007 COMMIT response loss is unknown when server applied=${applied}`, async () => {
    const fixture = recordingPool({
      commitFailure: { applied, commit: 3 },
    });
    const migrations = [
      { id: "001_before_outlook", sql: "SELECT 1" },
      { id: "007_outlook_desktop_assignment", sql: "SELECT 7" },
    ];
    await assert.rejects(runPostgresMigrations(fixture.pool, {
      migrations,
      ...SIGNED_OPTIONS,
      onBeforeMigrations() {},
      onOutlookAuthorityPaused() {
        return {
          schema_version: "lawos.outlook-authority-role-bootstrap-receipt.v1",
          role_bootstrap_sha256: SHA_A,
          authority_manifest_sha256: SHA_B,
          database_target_receipt_sha256: SHA_E,
          migration_catalog_sha256: SHA_C,
        };
      },
      onOutlookAuthorityPostMigration() {
        return {
          role_bootstrap_sha256: SHA_A,
          authority_postflight_sha256: SHA_D,
        };
      },
    }), (error) => {
      assert.equal(error.code, "LAWOS_OUTLOOK_POSTGRES_COMMIT_UNKNOWN");
      assert.equal(error.safe_error_code, "OUTLOOK_POSTGRES_COMMIT_UNKNOWN");
      assert.equal(error.postgres_transaction_committed_count, null);
      assert.equal(error.outlook_assignment_transaction_committed, null);
      const failure = assertOutlookAuthorityMigrationFailureReceipt(
        error.outlook_authority_failure,
      );
      assert.equal(failure.outcome, "partial");
      assert.equal(failure.failure_safe_error_code,
        "OUTLOOK_POSTGRES_COMMIT_UNKNOWN");
      assert.equal(failure.migration_applied_count, 1);
      assert.deepEqual(failure.migrations.map(({ id }) => id), [
        "001_before_outlook",
      ]);
      assert.equal(failure.role_configuration_transaction_committed_count, 1);
      assert.equal(failure.authority_manifest_sha256, SHA_B);
      assert.equal(failure.database_target_receipt_sha256, SHA_E);
      assert.equal(failure.migration_catalog_sha256, SHA_C);
      assert.equal(failure.postgres_mutation_attempt_count, 3);
      assert.equal(failure.postgres_mutation_committed_count, null);
      assert.equal(failure.outlook_assignment_transaction_committed, null);
      assert.throws(() => assertOutlookAuthorityMigrationFailureReceipt(
        resign({
          ...failure,
          failure_safe_error_code: "POSTGRES_OPERATION_FAILED",
        }, "failure_receipt_sha256"),
      ), /invalid/iu);
      return true;
    });
    assert.deepEqual(fixture.history.map(({ migration_id }) => migration_id),
      applied
        ? ["001_before_outlook", "007_outlook_desktop_assignment"]
        : ["001_before_outlook"]);
  });
}

for (const applied of [true, false]) {
  test(`role configuration COMMIT response loss preserves its closed receipt when server applied=${applied}`, async () => {
    const fixture = recordingPool({
      commitFailure: { applied, commit: 3 },
    });
    const pauseExpectation = Object.freeze({
      schema_version: "lawos.outlook-authority-role-bootstrap-receipt.v1",
      role_bootstrap_sha256: SHA_A,
      authority_manifest_sha256: SHA_B,
      database_target_receipt_sha256: SHA_E,
      migration_catalog_sha256: SHA_C,
    });
    await assert.rejects(runPostgresMigrations(fixture.pool, {
      migrations: [
        { id: "001_before_outlook", sql: "SELECT 1" },
        { id: "007_outlook_desktop_assignment", sql: "SELECT 7" },
      ],
      ...SIGNED_OPTIONS,
      onBeforeMigrations() {},
      async onOutlookAuthorityPaused(client) {
        await client.query("BEGIN");
        await client.query("SELECT 'role-configuration-mutation'");
        try {
          await client.query("COMMIT");
          return pauseExpectation;
        } catch {
          const unknown =
            createOutlookPostgresRoleConfigurationCommitUnknownError(
              pauseExpectation,
            );
          assert.deepEqual(
            assertOutlookPostgresRoleConfigurationCommitUnknownError(unknown),
            pauseExpectation,
          );
          throw unknown;
        }
      },
      onOutlookAuthorityPostMigration() {
        throw new Error("unreachable");
      },
    }), (error) => {
      assert.equal(error.code, "LAWOS_OUTLOOK_POSTGRES_COMMIT_UNKNOWN");
      const failure = assertOutlookAuthorityMigrationFailureReceipt(
        error.outlook_authority_failure,
      );
      assert.equal(failure.failure_phase, "outlook_authority_paused");
      assert.equal(failure.outcome, "partial");
      assert.equal(failure.authority_manifest_sha256, SHA_B);
      assert.equal(failure.database_target_receipt_sha256, SHA_E);
      assert.equal(failure.migration_catalog_sha256, SHA_C);
      assert.equal(failure.role_bootstrap_sha256, SHA_A);
      assert.equal(failure.postflight_role_bootstrap_sha256, null);
      assert.equal(failure.authority_postflight_sha256, null);
      assert.equal(failure.role_configuration_transaction_committed_count, null);
      assert.equal(failure.postgres_mutation_attempt_count, 2);
      assert.equal(failure.postgres_mutation_committed_count, null);
      assert.equal(failure.outlook_assignment_transaction_committed, false);
      assert.deepEqual(failure.migrations.map(({ id, applied: wasApplied }) => ({
        id, applied: wasApplied,
      })), [{ id: "001_before_outlook", applied: true }]);
      return true;
    });
    const failedCommitIndex = fixture.events.findLastIndex(
      ({ statement }) => statement === "COMMIT",
    );
    const unlockIndex = fixture.events.findLastIndex(
      ({ statement }) => statement === "SELECT pg_advisory_unlock($1)",
    );
    assert.ok(failedCommitIndex >= 0 && failedCommitIndex < unlockIndex);
    assert.equal(fixture.events.slice(failedCommitIndex + 1, unlockIndex)
      .some(({ statement }) => statement === "ROLLBACK"), false);
  });
}

test("role configuration rejects an unbound generic COMMIT unknown error", () => {
  assert.throws(
    () => assertOutlookPostgresRoleConfigurationCommitUnknownError(
      createOutlookPostgresCommitUnknownError(),
    ),
    /role configuration COMMIT unknown error is required/iu,
  );
});

test("Outlook authority callbacks preserve one client and the pause transaction boundary", async () => {
  const fixture = recordingPool();
  const callbacks = [];
  const migrations = [
    { id: "001_before_outlook", file_name: "001.sql", sql: "SELECT 1" },
    {
      id: "306_client_outlook_desktop_assignment",
      source_migration_id: "007_outlook_desktop_assignment",
      file_name: "007.sql",
      sql: "SELECT 7",
    },
  ];
  const result = await runPostgresMigrations(fixture.pool, {
    migrations,
    ...SIGNED_OPTIONS,
    async onBeforeMigrations(client, catalog) {
      callbacks.push(["before", client, client.inTransaction, catalog]);
      await client.query("SELECT 'before-callback'");
    },
    onOutlookAuthorityPaused(client, catalog) {
      callbacks.push(["paused", client, client.inTransaction, catalog]);
      return {
        schema_version: "lawos.outlook-authority-role-bootstrap-receipt.v1",
        role_bootstrap_sha256: SHA_A,
        authority_manifest_sha256: SHA_B,
        database_target_receipt_sha256: SHA_E,
        migration_catalog_sha256: SHA_C,
      };
    },
    onOutlookAuthorityPostMigration(client, catalog) {
      callbacks.push(["post", client, client.inTransaction, catalog]);
      return {
        role_bootstrap_sha256: SHA_A,
        authority_postflight_sha256: SHA_D,
      };
    },
  });

  assert.deepEqual(callbacks.map(([phase, , inTransaction]) => (
    [phase, inTransaction]
  )), [["before", true], ["paused", false], ["post", true]]);
  assert.ok(callbacks.every(([, client]) => client === fixture.client));
  assert.ok(callbacks.every(([, , , catalog]) => Object.isFrozen(catalog)));
  assert.deepEqual(callbacks[0][3], [
    {
      id: "001_before_outlook",
      source_migration_id: null,
      file_name: "001.sql",
      checksum: result.migrations[0].checksum,
    },
    {
      id: "306_client_outlook_desktop_assignment",
      source_migration_id: "007_outlook_desktop_assignment",
      file_name: "007.sql",
      checksum: result.migrations[1].checksum,
    },
  ]);
  assert.deepEqual(result.migrations[1], {
    id: "306_client_outlook_desktop_assignment",
    checksum: result.migrations[1].checksum,
    applied: true,
  });
  assert.equal(result.schema_version,
    "lawos.outlook-authority-migration-run-receipt.v1");
  assert.equal(result.migration_applied_count, 2);
  assert.equal(result.role_configuration_transaction_committed_count, 1);
  assert.equal(result.postgres_mutation_attempt_count, 3);
  assert.equal(result.postgres_mutation_committed_count, 3);
  assert.equal(result.role_bootstrap_sha256, SHA_A);
  assert.equal(result.postflight_role_bootstrap_sha256, SHA_A);
  assert.equal(result.authority_postflight_sha256, SHA_D);
  assert.equal(result.database_target_receipt_sha256, SHA_E);
  assert.equal(assertOutlookAuthorityMigrationRunReceipt(result, {
    database_target_receipt_sha256: SHA_E,
  }).database_target_receipt_sha256, SHA_E);
  assert.throws(() => assertOutlookAuthorityMigrationRunReceipt(result, {
    database_target_receipt_sha256: SHA_D,
  }), /expectation mismatch/iu);
  assert.equal(result.outlook_assignment_transaction_committed, true);
  assert.deepEqual(result.database, { oid: "5", name: "postgres" });
  assert.match(result.migration_run_receipt_sha256, /^[a-f0-9]{64}$/u);
  assert.throws(() => assertOutlookAuthorityMigrationRunReceipt(
    resign({
      ...result,
      migrations: [result.migrations[0], {
        ...result.migrations[1], applied: false,
      }],
      migration_applied_count: 1,
      postgres_mutation_attempt_count: 2,
      postgres_mutation_committed_count: 2,
    }, "migration_run_receipt_sha256"),
  ), /invalid/iu);
  assert.throws(() => assertOutlookAuthorityMigrationRunReceipt(result, {
    migration_catalog: [{ id: "001_wrong", checksum: SHA_A }],
  }), /catalog mismatch/iu);
  assert.throws(() => assertOutlookAuthorityMigrationRunReceipt(
    resign({
      ...result,
      migrations: result.migrations.slice(0, 1),
      migration_applied_count: 1,
      postgres_mutation_attempt_count: 2,
      postgres_mutation_committed_count: 2,
    }, "migration_run_receipt_sha256"),
    { migration_catalog: callbacks[0][3] },
  ), /catalog mismatch/iu);
  const beforeIndex = fixture.events.findIndex(
    ({ statement }) => statement === "SELECT 'before-callback'",
  );
  const firstDdlIndex = fixture.events.findIndex(({ statement }) => (
    statement === "CREATE SCHEMA IF NOT EXISTS lawos_meta"
  ));
  assert.equal(firstDdlIndex, -1);
  const pauseIndex = fixture.events.findIndex(({ statement }) => (
    statement.startsWith("CREATE TEMP TABLE outlook_authority_expected_receipt")
  ));
  const assignmentIndex = fixture.events.findIndex(({ statement }) => statement === "SELECT 7");
  const historyIndex = fixture.events.findIndex(({ statement, values }) => (
    statement.startsWith("INSERT INTO lawos_meta.schema_migrations")
      && values[0] === "306_client_outlook_desktop_assignment"
  ));
  const finalCommitIndex = fixture.events.findLastIndex(({ statement }) => statement === "COMMIT");
  assert.ok(pauseIndex < assignmentIndex);
  assert.ok(assignmentIndex < historyIndex);
  assert.ok(historyIndex < finalCommitIndex);
});

test("a failed role-configuration callback counts one attempted mutation", async () => {
  const fixture = recordingPool();
  await assert.rejects(runPostgresMigrations(fixture.pool, {
    migrations: [
      { id: "001_before_outlook", sql: "SELECT 1" },
      { id: "007_outlook_desktop_assignment", sql: "SELECT 7" },
    ],
    ...SIGNED_OPTIONS,
    onBeforeMigrations() {},
    onOutlookAuthorityPaused() {
      throw Object.assign(new Error("role configuration rejected"), {
        code: "LAWOS_ROLE_CONFIGURATION_REJECTED",
        safe_error_code: "secret/raw coercive code !!",
      });
    },
    onOutlookAuthorityPostMigration() {
      throw new Error("unreachable");
    },
  }), (error) => {
    assert.equal(error.outlook_authority_failure.outcome, "partial");
    assert.equal(error.outlook_authority_failure.database_target_receipt_sha256,
      SHA_E);
    assert.equal(error.outlook_authority_failure.authority_manifest_sha256,
      SHA_B);
    assert.equal(error.outlook_authority_failure.migration_catalog_sha256,
      SHA_C);
    assert.equal(
      error.outlook_authority_failure.role_configuration_transaction_committed_count,
      0,
    );
    assert.equal(error.outlook_authority_failure.postgres_mutation_attempt_count, 2);
    assert.equal(error.outlook_authority_failure.postgres_mutation_committed_count, 1);
    assert.equal(
      error.outlook_authority_failure.failure_safe_error_code,
      "POSTGRES_OPERATION_FAILED",
    );
    return true;
  });
});

test("malformed pause material fails before the 007 transaction begins", async () => {
  const fixture = recordingPool();
  await assert.rejects(runPostgresMigrations(fixture.pool, {
    migrations: [{
      id: "007_outlook_desktop_assignment",
      sql: "SELECT 7",
    }],
    ...SIGNED_OPTIONS,
    onBeforeMigrations() {},
    onOutlookAuthorityPaused() {
      return {
        schema_version: "lawos.outlook-authority-role-bootstrap-receipt.v1",
        role_bootstrap_sha256: SHA_A,
        authority_manifest_sha256: SHA_B,
        database_target_receipt_sha256: SHA_E,
        migration_catalog_sha256: "not-a-digest",
      };
    },
    onOutlookAuthorityPostMigration() {
      throw new Error("unreachable");
    },
  }), TypeError);
  assert.equal(fixture.events.filter(({ statement }) => statement === "BEGIN").length, 0);
  assert.equal(fixture.events.filter(({ statement }) => (
    statement === "BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY"
  )).length, 1);
  assert.equal(fixture.events.some(({ statement }) => statement === "SELECT 7"), false);
});

for (const digestField of [
  "authority_manifest_sha256",
  "database_target_receipt_sha256",
  "migration_catalog_sha256",
]) {
  test(`pause ${digestField} mismatch preserves signed inputs and never begins 007`, async () => {
    const fixture = recordingPool();
    await assert.rejects(runPostgresMigrations(fixture.pool, {
      migrations: [{
        id: "007_outlook_desktop_assignment",
        sql: "SELECT 7",
      }],
      ...SIGNED_OPTIONS,
      onBeforeMigrations() {},
      onOutlookAuthorityPaused() {
        return {
          schema_version: "lawos.outlook-authority-role-bootstrap-receipt.v1",
          role_bootstrap_sha256: SHA_A,
          authority_manifest_sha256: SHA_B,
          database_target_receipt_sha256: SHA_E,
          migration_catalog_sha256: SHA_C,
          [digestField]: SHA_D,
        };
      },
      onOutlookAuthorityPostMigration() {
        throw new Error("unreachable");
      },
    }), (error) => {
      const failure = error.outlook_authority_failure;
      assert.equal(failure.authority_manifest_sha256, SHA_B);
      assert.equal(failure.database_target_receipt_sha256, SHA_E);
      assert.equal(failure.migration_catalog_sha256, SHA_C);
      assert.equal(failure.outcome, "partial");
      return true;
    });
    assert.equal(fixture.events.some(
      ({ statement }) => statement === "SELECT 7",
    ), false);
  });
}

test("postflight failure rolls back only 007 and reports committed partial progress", async () => {
  const fixture = recordingPool();
  await assert.rejects(runPostgresMigrations(fixture.pool, {
    migrations: [
      { id: "001_before_outlook", sql: "SELECT 1" },
      { id: "007_outlook_desktop_assignment", sql: "SELECT 7" },
    ],
    ...SIGNED_OPTIONS,
    onBeforeMigrations() {},
    onOutlookAuthorityPaused() {
      return {
        schema_version: "lawos.outlook-authority-role-bootstrap-receipt.v1",
        role_bootstrap_sha256: SHA_A,
        authority_manifest_sha256: SHA_B,
        database_target_receipt_sha256: SHA_E,
        migration_catalog_sha256: SHA_C,
      };
    },
    onOutlookAuthorityPostMigration() {
      throw new Error("postflight rejected");
    },
  }), (error) => {
    assert.equal(error.message, "postflight rejected");
    assert.equal(error.migration_phase, "outlook_authority_migration");
    assert.equal(error.migration_applied_count, 1);
    assert.equal(error.postgres_transaction_attempted_count, 2);
    assert.equal(error.postgres_transaction_committed_count, 1);
    assert.equal(error.role_configuration_transaction_committed_count, 1);
    assert.equal(error.role_bootstrap_sha256, SHA_A);
    assert.equal(error.outlook_authority_failure.outcome, "partial");
    assert.equal(error.outlook_authority_failure.postgres_mutation_attempt_count, 3);
    assert.equal(error.outlook_authority_failure.postgres_mutation_committed_count, 2);
    assert.equal(error.outlook_authority_failure.outlook_assignment_transaction_committed,
      false);
    assert.match(error.outlook_authority_failure.failure_receipt_sha256,
      /^[a-f0-9]{64}$/u);
    const failure = error.outlook_authority_failure;
    assert.throws(() => assertOutlookAuthorityMigrationFailureReceipt(
      failure,
      { database_target_receipt_sha256: SHA_D },
    ), /expectation mismatch/iu);
    assert.throws(() => assertOutlookAuthorityMigrationFailureReceipt(
      resign({ ...failure, session_user: null }, "failure_receipt_sha256"),
    ), /invalid/iu);
    assert.throws(() => assertOutlookAuthorityMigrationFailureReceipt(
      resign({
        ...failure, outlook_assignment_transaction_committed: true,
      }, "failure_receipt_sha256"),
    ), /invalid/iu);
    assert.throws(() => assertOutlookAuthorityMigrationFailureReceipt(
      resign({
        ...failure,
        migrations: [...failure.migrations, {
          id: "007_outlook_desktop_assignment",
          checksum: SHA_D,
          applied: false,
        }],
      }, "failure_receipt_sha256"),
    ), /invalid/iu);
    return true;
  });
  assert.deepEqual(fixture.history.map(({ migration_id }) => migration_id), [
    "001_before_outlook",
  ]);
  const rollbackIndex = fixture.events.findLastIndex(
    ({ statement }) => statement === "ROLLBACK",
  );
  const unlockIndex = fixture.events.findLastIndex(
    ({ statement }) => statement === "SELECT pg_advisory_unlock($1)",
  );
  assert.ok(rollbackIndex >= 0 && rollbackIndex < unlockIndex);
});
