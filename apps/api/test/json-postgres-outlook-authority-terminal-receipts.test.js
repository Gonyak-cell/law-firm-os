import assert from "node:assert/strict";
import test from "node:test";
import { createOutlookAuthorityMigrationRunReceipt } from "../../../packages/persistence/src/postgres/migration-runner.js";
import {
  createPublicResult, createReplayReceipt, createTerminal, terminalSha256,
} from "../src/json-postgres-outlook-authority-terminal-receipts.js";

const digest = (character) => character.repeat(64);
const bindings = () => ({ operation_binding_sha256: digest("1"),
  claim_sha256: digest("2"), packet_sha256: digest("3"),
  approval_receipt_sha256: digest("4"), registry_sha256: digest("5"),
  database_target_receipt_sha256: digest("b"),
  authority_catalog_sha256: digest("6"), migration_catalog_sha256: digest("7"),
  role_bootstrap_sha256: digest("8") });
const counts = (overrides = {}) => ({
  authorization_claim_write_attempt_count: 1,
  authorization_claim_write_committed_count: 1,
  postgres_mutation_attempt_count: 3, postgres_mutation_committed_count: 3,
  secretsmanager_put_secret_value_attempt_count: 3,
  secretsmanager_put_secret_value_committed_count: 3,
  production_write_count: 7, ...overrides,
});
function runReceipt() {
  return createOutlookAuthorityMigrationRunReceipt({
    identity: { session_user: "lawos_admin", current_user: "lawos_admin",
      database_name: "lawos", database_oid: "42", backend_pid: 7 },
    migrations: [
      { id: "001_alpha", checksum: digest("c"), applied: true },
      { id: "002_beta", checksum: digest("d"), applied: true },
    ], progress: { outlook_authority_replay_verified: false,
      migration_applied_count: 2, postgres_transaction_attempted_count: 2,
      postgres_transaction_committed_count: 2,
      role_configuration_transaction_attempted_count: 1,
      role_configuration_transaction_committed_count: 1,
      outlook_assignment_transaction_committed: true },
    pauseExpectation: { schema_version:
        "lawos.outlook-authority-role-bootstrap-receipt.v1",
      role_bootstrap_sha256: digest("8"), authority_manifest_sha256: digest("6"),
      database_target_receipt_sha256: digest("b"),
      migration_catalog_sha256: digest("7") },
    postflight: { role_bootstrap_sha256: digest("8"),
      authority_postflight_sha256: digest("a") },
  });
}
function passTerminal() {
  const receipt = runReceipt();
  return createTerminal({ schema_version:
      "law-firm-os.json-postgres-outlook-authority-terminal.v1",
    status: "PASS", bindings: bindings(), recorded_at: "2026-08-17T08:00:00.000Z",
    ...counts(), result: { outcome: "PASS", migration_applied_count: 2,
      role_configuration_transaction_committed_count: 1,
      outlook_database_role_count: 4, outlook_login_role_count: 3,
      outlook_tenant_authority_count: 3, outlook_membership_edge_count: 4,
      synthetic_wildcard_count: 0,
      migration_run_receipt_sha256: receipt.migration_run_receipt_sha256,
      authority_postflight_sha256: receipt.authority_postflight_sha256,
      password_returned: false, secret_material_returned: false }, failure: null,
    postgres_receipt: { kind: "run", receipt } });
}
function secretUnknown() {
  const terminal = passTerminal();
  return createTerminal({ ...terminal, status: "PARTIAL",
    ...counts({ secretsmanager_put_secret_value_attempt_count: 1,
      secretsmanager_put_secret_value_committed_count: null,
      production_write_count: null }), result: null,
    failure: { error_code: "LAWOS_OUTLOOK_SECRET_COMMIT_UNKNOWN",
      failure_phase: "secret-publication", post_state_sha256: digest("a") } });
}
function publicValue(terminal, overrides = {}) {
  return { outcome: "PASS", operation_binding_sha256: digest("1"),
    terminal_state: "PASS", terminal_sha256: terminalSha256(terminal),
    postgres_receipt: { kind: "run",
      receipt_sha256:
        terminal.postgres_receipt.receipt.migration_run_receipt_sha256 },
    replay_receipt_sha256: null, ...counts(), ...overrides };
}

test("replay receipt is deterministic and invocation-local zero-write", () => {
  const terminal = passTerminal();
  const replay = createReplayReceipt({ operationBindingSha256: digest("1"),
    claimSha256: digest("2"), claimWriteAttempted: false,
    claimWriteCommitted: false, terminal });
  assert.equal(replay.authorization_claim_write_attempt_count, 0);
  assert.equal(replay.production_write_count, 0);
  assert.deepEqual(createReplayReceipt({ operationBindingSha256: digest("1"),
    claimSha256: digest("2"), claimWriteAttempted: false,
    claimWriteCommitted: false, terminal }), replay);
  const attempted = createReplayReceipt({ operationBindingSha256: digest("1"),
    claimSha256: digest("2"), claimWriteAttempted: true,
    claimWriteCommitted: false, terminal });
  assert.equal(attempted.authorization_claim_write_attempt_count, 1);
  assert.notEqual(attempted.replay_receipt_sha256, replay.replay_receipt_sha256);
});

test("public result exposes only validated terminal and PostgreSQL digests", () => {
  const terminal = passTerminal();
  const fresh = createPublicResult(publicValue(terminal), { terminal });
  assert.deepEqual(Object.keys(fresh).sort(), [
    "authorization_claim_write_attempt_count",
    "authorization_claim_write_committed_count", "operation_binding_sha256",
    "outcome", "postgres_mutation_attempt_count",
    "postgres_mutation_committed_count", "postgres_receipt",
    "production_write_count", "replay_receipt_sha256",
    "secretsmanager_put_secret_value_attempt_count",
    "secretsmanager_put_secret_value_committed_count", "terminal_sha256",
    "terminal_state",
  ]);
  assert.equal(JSON.stringify(fresh).includes("migrations"), false);
  assert.equal(JSON.stringify(fresh).includes("password"), false);
  const replayReceipt = createReplayReceipt({ operationBindingSha256: digest("1"),
    claimSha256: digest("2"), claimWriteAttempted: false,
    claimWriteCommitted: false, terminal });
  const replay = createPublicResult(publicValue(terminal, {
    replay_receipt_sha256: replayReceipt.replay_receipt_sha256,
    ...counts({ authorization_claim_write_attempt_count: 0,
      authorization_claim_write_committed_count: 0,
      postgres_mutation_attempt_count: 0, postgres_mutation_committed_count: 0,
      secretsmanager_put_secret_value_attempt_count: 0,
      secretsmanager_put_secret_value_committed_count: 0,
      production_write_count: 0 }) }), { terminal });
  assert.equal(replay.production_write_count, 0);
  const absent = createPublicResult({ ...publicValue(terminal), outcome: "BLOCKED",
    terminal_state: "ABSENT", terminal_sha256: null, postgres_receipt: null,
    ...counts({ postgres_mutation_attempt_count: 0,
      postgres_mutation_committed_count: 0,
      secretsmanager_put_secret_value_attempt_count: 0,
      secretsmanager_put_secret_value_committed_count: 0,
      production_write_count: 1 }) });
  assert.equal(absent.postgres_receipt, null);
  for (const invalid of [
    { ...fresh, terminal_sha256: null },
    { ...fresh, postgres_receipt: { ...fresh.postgres_receipt,
      receipt_sha256: digest("f") } },
    { ...fresh, source_sha: "must-not-leak" },
  ]) assert.throws(() => createPublicResult(invalid, { terminal }),
  { code: "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_BINDING" });
});

test("public BLOCKED binds null counts to immutable PARTIAL evidence", () => {
  const terminal = secretUnknown();
  const value = { ...publicValue(passTerminal()), outcome: "BLOCKED",
    terminal_state: "PARTIAL", terminal_sha256: terminalSha256(terminal),
    postgres_receipt: { kind: "run",
      receipt_sha256:
        terminal.postgres_receipt.receipt.migration_run_receipt_sha256 },
    ...counts({ secretsmanager_put_secret_value_attempt_count: 1,
      secretsmanager_put_secret_value_committed_count: null,
      production_write_count: null }) };
  assert.equal(createPublicResult(value, { terminal }).production_write_count, null);
  for (const committed of [0, 1]) assert.throws(() => createPublicResult({
    ...value, secretsmanager_put_secret_value_committed_count: committed,
  }, { terminal }), { code: "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_BINDING" });
});

test("PARTIAL evidence binds postflight state and pre-database zero writes", () => {
  const postRun = secretUnknown();
  for (const post_state_sha256 of [null, digest("f")]) {
    assert.throws(() => createTerminal({ ...postRun, failure: {
      ...postRun.failure, post_state_sha256,
    } }), { code: "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_BINDING" });
  }
  const base = passTerminal();
  const preDatabase = { ...base, status: "PARTIAL",
    bindings: { ...bindings(), role_bootstrap_sha256: null },
    ...counts({ postgres_mutation_attempt_count: 0,
      postgres_mutation_committed_count: 0,
      secretsmanager_put_secret_value_attempt_count: 1,
      secretsmanager_put_secret_value_committed_count: 0,
      production_write_count: 1 }), result: null,
    failure: { error_code: "LAWOS_OUTLOOK_DATABASE_SECRET",
      failure_phase: "credential-input", post_state_sha256: null },
    postgres_receipt: null };
  assert.throws(() => createTerminal(preDatabase),
    { code: "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_BINDING" });
});
