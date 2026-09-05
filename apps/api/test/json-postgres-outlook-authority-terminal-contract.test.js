import assert from "node:assert/strict";
import test from "node:test";
import {
  createOutlookAuthorityMigrationFailureSummary,
  createOutlookAuthorityMigrationRunReceipt,
} from "../../../packages/persistence/src/postgres/migration-runner.js";
import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import { CLIENT_OPERATIONS_MIGRATION_CATALOG } from "../src/client-operations-schema.js";
import { createTerminal, terminalSha256 } from "../src/json-postgres-outlook-authority-terminal-receipts.js";

const digest = (character) => character.repeat(64);
const bindings = (overrides = {}) => ({
  operation_binding_sha256: digest("1"), claim_sha256: digest("2"),
  packet_sha256: digest("3"), approval_receipt_sha256: digest("4"),
  registry_sha256: digest("5"), database_target_receipt_sha256: digest("b"),
  authority_catalog_sha256: digest("6"), migration_catalog_sha256: digest("7"),
  role_bootstrap_sha256: digest("8"), ...overrides,
});
const counts = (overrides = {}) => ({
  authorization_claim_write_attempt_count: 1,
  authorization_claim_write_committed_count: 1,
  postgres_mutation_attempt_count: 3, postgres_mutation_committed_count: 3,
  secretsmanager_put_secret_value_attempt_count: 3,
  secretsmanager_put_secret_value_committed_count: 3,
  production_write_count: 7, ...overrides,
});
const identity = { session_user: "lawos_admin", current_user: "lawos_admin",
  database_name: "lawos", database_oid: "42", backend_pid: 7 };
const pause = { schema_version:
    "lawos.outlook-authority-role-bootstrap-receipt.v1",
  role_bootstrap_sha256: digest("8"), authority_manifest_sha256: digest("6"),
  database_target_receipt_sha256: digest("b"),
  migration_catalog_sha256: digest("7") };
const rows = [
  { id: "001_alpha", checksum: digest("c"), applied: true },
  { id: "002_beta", checksum: digest("d"), applied: true },
];
function runReceipt() {
  return createOutlookAuthorityMigrationRunReceipt({ identity, migrations: rows,
    progress: { outlook_authority_replay_verified: false,
      migration_applied_count: 2, postgres_transaction_attempted_count: 2,
      postgres_transaction_committed_count: 2,
      role_configuration_transaction_attempted_count: 1,
      role_configuration_transaction_committed_count: 1,
      outlook_assignment_transaction_committed: true },
    pauseExpectation: pause, postflight: {
      role_bootstrap_sha256: digest("8"),
      authority_postflight_sha256: digest("a") } });
}
function completedAuthorityReceipt(outcome, { historical = true } = {}) {
  const migrations = CLIENT_OPERATIONS_MIGRATION_CATALOG.migrations.map(
    ({ id, checksum }, index, catalog) => ({ id, checksum,
      applied: outcome === "appended" && index === catalog.length - 1 }),
  );
  const applied = outcome === "appended" ? 1 : 0;
  const catalogSha = hashDomainValue(CLIENT_OPERATIONS_MIGRATION_CATALOG);
  const pauseCatalogSha = historical ? hashDomainValue({
    ...CLIENT_OPERATIONS_MIGRATION_CATALOG, migration_count: 79,
    migrations: CLIENT_OPERATIONS_MIGRATION_CATALOG.migrations.slice(0, -1),
  }) : catalogSha;
  return createOutlookAuthorityMigrationRunReceipt({ identity, migrations,
    progress: { outlook_authority_replay_verified: true,
      migration_applied_count: applied, postgres_transaction_attempted_count: applied,
      postgres_transaction_committed_count: applied,
      role_configuration_transaction_attempted_count: 0,
      role_configuration_transaction_committed_count: 0,
      outlook_assignment_transaction_committed: false },
    pauseExpectation: { ...pause, migration_catalog_sha256: pauseCatalogSha },
    migrationCatalogSha256: catalogSha,
    postflight: { role_bootstrap_sha256: digest("8"),
      authority_postflight_sha256: digest("a") } });
}
function failureReceipt({ unknown = false } = {}) {
  return createOutlookAuthorityMigrationFailureSummary({ identity,
    migrations: unknown ? rows : [],
    progress: { migration_phase: unknown ? "outlook_authority_paused"
      : "before_migrations", migration_applied_count: unknown ? 2 : 0,
      postgres_transaction_attempted_count: unknown ? 2 : 0,
      postgres_transaction_committed_count: unknown ? 2 : 0,
      role_configuration_transaction_attempted_count: unknown ? 1 : 0,
      role_configuration_transaction_committed_count: unknown ? null : 0,
      outlook_assignment_transaction_committed: false },
    ...(unknown ? { pauseExpectation: pause } : {}),
    authorityManifestSha256: digest("6"),
    databaseTargetReceiptSha256: digest("b"),
    migrationCatalogSha256: digest("7"), safeErrorCode: unknown
      ? "OUTLOOK_POSTGRES_COMMIT_UNKNOWN" : "OUTLOOK_APPLICATION_ROLE_PRECONDITION" });
}
const passResult = (receipt, overrides = {}) => ({ outcome: "PASS",
  migration_applied_count: 2,
  role_configuration_transaction_committed_count: 1,
  outlook_database_role_count: 4, outlook_login_role_count: 3,
  outlook_tenant_authority_count: 3, outlook_membership_edge_count: 4,
  synthetic_wildcard_count: 0,
  migration_run_receipt_sha256: receipt.migration_run_receipt_sha256,
  authority_postflight_sha256: receipt.authority_postflight_sha256,
  password_returned: false, secret_material_returned: false, ...overrides });
function pass(overrides = {}) {
  const receipt = runReceipt();
  return createTerminal({ schema_version:
      "law-firm-os.json-postgres-outlook-authority-terminal.v1",
    status: "PASS", bindings: bindings(), recorded_at: "2026-08-17T08:00:00.000Z",
    ...counts(), result: passResult(receipt), failure: null,
    postgres_receipt: { kind: "run", receipt }, ...overrides });
}
function completedAuthorityPass(outcome, options) {
  const receipt = completedAuthorityReceipt(outcome, options);
  return pass({
    bindings: bindings({ migration_catalog_sha256: receipt.migration_catalog_sha256 }),
    ...counts({ postgres_mutation_attempt_count: receipt.postgres_mutation_attempt_count,
      postgres_mutation_committed_count: receipt.postgres_mutation_committed_count,
      secretsmanager_put_secret_value_attempt_count: 0,
      secretsmanager_put_secret_value_committed_count: 0,
      production_write_count: 1 + receipt.postgres_mutation_committed_count }),
    result: passResult(receipt, { migration_applied_count: receipt.migration_applied_count,
      role_configuration_transaction_committed_count: 0 }),
    postgres_receipt: { kind: "run", receipt },
  });
}
function preDatabasePartial(overrides = {}) {
  return createTerminal({ schema_version:
      "law-firm-os.json-postgres-outlook-authority-terminal.v1",
    status: "PARTIAL", bindings: bindings({ role_bootstrap_sha256: null }),
    recorded_at: "2026-08-17T08:00:00.000Z",
    ...counts({ postgres_mutation_attempt_count: 0,
      postgres_mutation_committed_count: 0,
      secretsmanager_put_secret_value_attempt_count: 0,
      secretsmanager_put_secret_value_committed_count: 0,
      production_write_count: 1 }), result: null,
    failure: { error_code: "LAWOS_OUTLOOK_DATABASE_SECRET",
      failure_phase: "credential-input", post_state_sha256: null },
    postgres_receipt: null, ...overrides });
}

test("terminal contract closes complete run and failure receipts", () => {
  const terminal = pass();
  assert.match(terminalSha256(terminal), /^[a-f0-9]{64}$/u);
  assert.equal(terminal.postgres_receipt.receipt.migrations.length, 2);
  const receipt = failureReceipt();
  const partial = createTerminal({ ...preDatabasePartial(),
    failure: { error_code: "LAWOS_OUTLOOK_APPLICATION_ROLE_PRECONDITION",
      failure_phase: "postgres-precondition",
      post_state_sha256: receipt.failure_receipt_sha256 },
    postgres_receipt: { kind: "failure", receipt } });
  assert.equal(partial.postgres_receipt.receipt.failure_phase,
    "before_migrations");
});

test("terminal PASS binds appended and verified authority runs with no role-secret writes", () => {
  for (const outcome of ["appended", "verified"]) {
    for (const historical of [false, true]) {
      const terminal = completedAuthorityPass(outcome, { historical });
      assert.equal(terminal.postgres_receipt.receipt.outcome, outcome);
      assert.equal(terminal.postgres_receipt.receipt.schema_version,
        `lawos.outlook-authority-migration-run-receipt.v${historical ? 2 : 1}`);
      assert.equal(terminal.result.role_configuration_transaction_committed_count, 0);
      assert.equal(terminal.result.migration_applied_count, outcome === "appended" ? 1 : 0);
      assert.equal(terminal.postgres_mutation_committed_count, outcome === "appended" ? 1 : 0);
      assert.equal(terminal.secretsmanager_put_secret_value_attempt_count, 0);
      assert.equal(terminal.secretsmanager_put_secret_value_committed_count, 0);
      assert.equal(terminal.production_write_count, outcome === "appended" ? 2 : 1);
      assert.match(terminalSha256(terminal), /^[a-f0-9]{64}$/u);
    }
  }
});

test("terminal PASS rejects forged role, migration, secret-write, and catalog evidence in every mode", () => {
  const committed = pass();
  const appended = completedAuthorityPass("appended");
  const verified = completedAuthorityPass("verified");
  for (const terminal of [committed, appended, verified]) {
    const receipt = terminal.postgres_receipt.receipt;
    const secretWrites = receipt.outcome === "committed" ? 0 : 3;
    const { migration_run_receipt_sha256: ignored, ...material } = receipt;
    const malformed = { ...material,
      role_configuration_transaction_committed_count:
        receipt.outcome === "committed" ? 0 : 1 };
    for (const changes of [
      { result: { ...terminal.result, role_configuration_transaction_committed_count:
        receipt.outcome === "committed" ? 0 : 1 } },
      { result: { ...terminal.result, migration_applied_count:
        terminal.result.migration_applied_count + 1 } },
      { secretsmanager_put_secret_value_attempt_count: secretWrites,
        secretsmanager_put_secret_value_committed_count: secretWrites,
        production_write_count: 1 + receipt.postgres_mutation_committed_count + secretWrites },
      { secretsmanager_put_secret_value_attempt_count:
        terminal.secretsmanager_put_secret_value_attempt_count + 1 },
      { postgres_receipt: { kind: "run", receipt: { ...malformed,
        migration_run_receipt_sha256: hashDomainValue(malformed) } } },
      { bindings: { ...terminal.bindings, migration_catalog_sha256: digest("f") } },
      { postgres_receipt: { kind: "run", receipt: { ...receipt,
        migration_run_receipt_sha256: digest("f") } } },
    ]) assert.throws(() => createTerminal({ ...terminal, ...changes }),
    { code: "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_BINDING" });
  }
  for (const changes of [
    { historical_migration_catalog_sha256: digest("f") },
    { migrations: appended.postgres_receipt.receipt.migrations.map((row, index) =>
      index === 79 ? { ...row, checksum: digest("f") } : row) },
  ]) {
    const { migration_run_receipt_sha256: ignored, ...material } = {
      ...appended.postgres_receipt.receipt, ...changes,
    };
    const receipt = { ...material, migration_run_receipt_sha256: hashDomainValue(material) };
    assert.throws(() => createTerminal({ ...appended,
      result: { ...appended.result, migration_run_receipt_sha256: receipt.migration_run_receipt_sha256 },
      postgres_receipt: { kind: "run", receipt } }),
    { code: "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_BINDING" });
  }
});

test("terminal contract rejects key, count, phase, and nested receipt drift", () => {
  const terminal = pass();
  for (const make of [
    () => pass({ production_write_count: 6 }),
    () => pass({ result: passResult(terminal.postgres_receipt.receipt,
      { password: "must-not-be-stored" }) }),
    () => pass({ postgres_receipt: { ...terminal.postgres_receipt,
      receipt: { ...terminal.postgres_receipt.receipt,
        migration_applied_count: 1 } } }),
    () => preDatabasePartial({ postgres_mutation_attempt_count: 1,
      postgres_mutation_committed_count: 1, production_write_count: 2 }),
    () => preDatabasePartial({ failure: { error_code: "LAWOS_SYNTHETIC_FAILURE",
      failure_phase: "unknown", post_state_sha256: null } }),
  ]) assert.throws(make, { code: "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_BINDING" });
});

test("terminal contract preserves only the genuinely unknown commit surface", () => {
  const secretRun = runReceipt();
  const secretUnknown = createTerminal({ ...pass(), status: "PARTIAL",
    ...counts({ secretsmanager_put_secret_value_attempt_count: 1,
      secretsmanager_put_secret_value_committed_count: null,
      production_write_count: null }), result: null,
    failure: { error_code: "LAWOS_OUTLOOK_SECRET_COMMIT_UNKNOWN",
      failure_phase: "secret-publication", post_state_sha256: digest("a") },
    postgres_receipt: { kind: "run", receipt: secretRun } });
  assert.equal(secretUnknown.secretsmanager_put_secret_value_committed_count, null);
  const unknown = failureReceipt({ unknown: true });
  const postgresUnknown = createTerminal({ ...preDatabasePartial(),
    bindings: bindings(), postgres_mutation_attempt_count: 3,
    postgres_mutation_committed_count: null, production_write_count: null,
    failure: { error_code: "LAWOS_OUTLOOK_POSTGRES_COMMIT_UNKNOWN",
      failure_phase: "postgres-bootstrap",
      post_state_sha256: unknown.failure_receipt_sha256 },
    postgres_receipt: { kind: "failure", receipt: unknown } });
  assert.equal(postgresUnknown.postgres_mutation_committed_count, null);
  const claimUnknown = preDatabasePartial({
    authorization_claim_write_committed_count: null, production_write_count: null,
    failure: { error_code: "LAWOS_OUTLOOK_AUTHORIZATION_CLAIM_COMMIT_UNKNOWN",
      failure_phase: "authorization-claim", post_state_sha256: digest("e") } });
  assert.equal(claimUnknown.authorization_claim_write_committed_count, null);
});
