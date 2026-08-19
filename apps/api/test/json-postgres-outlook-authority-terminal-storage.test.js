import assert from "node:assert/strict";
import test from "node:test";
import { createOutlookAuthorityMigrationRunReceipt } from "../../../packages/persistence/src/postgres/migration-runner.js";
import { createTerminal } from "../src/json-postgres-outlook-authority-terminal-receipts.js";
import {
  readTerminal,
  terminalDigest,
  terminalKey,
  writeTerminal,
} from "../src/json-postgres-outlook-authority-terminal-storage.js";

const NOW = Date.parse("2026-08-17T08:00:00.000Z");
const EXPIRES = "2026-08-18T08:00:00.000Z";
const BUCKET = "lawos-prod-program-input-770880870480";
const OWNER = "770880870480";
const KMS = "arn:aws:kms:ap-northeast-2:770880870480:key/75868150-c892-47fc-8bea-17caa1808127";
const digest = (character) => character.repeat(64);
const bindings = (overrides = {}) => ({
  operation_binding_sha256: digest("1"), claim_sha256: digest("2"),
  packet_sha256: digest("3"), approval_receipt_sha256: digest("4"),
  registry_sha256: digest("5"), database_target_receipt_sha256: digest("b"),
  authority_catalog_sha256: digest("6"),
  migration_catalog_sha256: digest("7"), role_bootstrap_sha256: digest("8"),
  ...overrides,
});
function terminal() {
  const receipt = createOutlookAuthorityMigrationRunReceipt({
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
  return createTerminal({ status: "PASS", bindings: bindings(),
    schema_version: "law-firm-os.json-postgres-outlook-authority-terminal.v1",
    recorded_at: "2026-08-17T08:00:00.000Z",
    authorization_claim_write_attempt_count: 1,
    authorization_claim_write_committed_count: 1,
    postgres_mutation_attempt_count: 3, postgres_mutation_committed_count: 3,
    secretsmanager_put_secret_value_attempt_count: 3,
    secretsmanager_put_secret_value_committed_count: 3,
    production_write_count: 7,
    result: { outcome: "PASS", migration_applied_count: 2,
      role_configuration_transaction_committed_count: 1,
      outlook_database_role_count: 4, outlook_login_role_count: 3,
      outlook_tenant_authority_count: 6, outlook_membership_edge_count: 5,
      synthetic_wildcard_count: 0,
      migration_run_receipt_sha256: receipt.migration_run_receipt_sha256,
      authority_postflight_sha256: receipt.authority_postflight_sha256,
      password_returned: false,
      secret_material_returned: false }, failure: null,
    postgres_receipt: { kind: "run", receipt } });
}
function missing() {
  return Object.assign(new Error("missing"), { name: "NoSuchKey",
    $metadata: { httpStatusCode: 404 } });
}
function exists() {
  return Object.assign(new Error("exists"), { name: "PreconditionFailed",
    $metadata: { httpStatusCode: 412 } });
}
function fakeS3({ responseLoss = false } = {}) {
  let stored = null;
  const commands = [];
  let puts = 0;
  let gets = 0;
  return { get stored() { return stored; }, get commands() { return commands; },
    get puts() { return puts; }, get gets() { return gets; },
    drift(key, value) { stored = { ...stored, [key]: value }; },
    replaceBody(bytes) { stored = { ...stored, Body: bytes,
      ContentLength: bytes.byteLength }; },
    async send(command) {
      const input = command.input;
      commands.push(input);
      if (input.IfNoneMatch === "*") {
        puts += 1;
        if (stored) throw exists();
        stored = { Body: Buffer.from(input.Body),
          ContentLength: Buffer.byteLength(input.Body),
          ContentType: input.ContentType,
          ServerSideEncryption: input.ServerSideEncryption,
          SSEKMSKeyId: input.SSEKMSKeyId, ObjectLockMode: input.ObjectLockMode,
          ObjectLockRetainUntilDate: input.ObjectLockRetainUntilDate,
          ChecksumSHA256: input.ChecksumSHA256, VersionId: "terminal-version-1" };
        if (responseLoss) throw new Error("synthetic response loss");
        return { VersionId: stored.VersionId };
      }
      gets += 1;
      if (!stored) throw missing();
      return { ...stored, Body: Buffer.from(stored.Body) };
    } };
}
const options = (client, expected = bindings()) => ({ bindings: expected,
  bucket: BUCKET, expectedBucketOwner: OWNER, kmsKeyId: KMS,
  approvalExpiresAt: EXPIRES, client, now: NOW });

test("terminal storage writes and reads exact Object-Locked canonical bytes", async () => {
  const client = fakeS3();
  const value = terminal();
  assert.equal(terminalKey(bindings()),
    `program-approval-audit/outlook-authority-terminal/${digest("1")}/${digest("2")}.json`);
  const written = await writeTerminal({ terminal: value, ...options(client) });
  assert.equal(written.outcome, "written");
  assert.equal(written.terminal_sha256, terminalDigest(value));
  assert.equal(client.puts, 1);
  assert.deepEqual({ ContentType: client.stored.ContentType,
    ServerSideEncryption: client.stored.ServerSideEncryption,
    SSEKMSKeyId: client.stored.SSEKMSKeyId,
    ObjectLockMode: client.stored.ObjectLockMode }, {
    ContentType: "application/json", ServerSideEncryption: "aws:kms",
    SSEKMSKeyId: KMS, ObjectLockMode: "COMPLIANCE" });
  assert.deepEqual({ ExpectedBucketOwner: client.commands[0].ExpectedBucketOwner,
    IfNoneMatch: client.commands[0].IfNoneMatch,
    ChecksumAlgorithm: client.commands[0].ChecksumAlgorithm }, {
    ExpectedBucketOwner: OWNER, IfNoneMatch: "*", ChecksumAlgorithm: "SHA256" });
  const read = await readTerminal(options(client));
  assert.equal(read.outcome, "pass");
  assert.deepEqual(read.terminal, value);
  assert.equal(client.commands[1].ChecksumMode, "ENABLED");
  assert.equal((await readTerminal({ ...options(client),
    now: Date.parse(EXPIRES) + 60_000 })).outcome, "pass");
  const { role_bootstrap_sha256: _unknown, ...beforeBootstrap } = bindings();
  assert.equal((await readTerminal(options(client, beforeBootstrap)))
    .terminal.bindings.role_bootstrap_sha256, digest("8"));
});

test("terminal storage reconciles response loss and rejects conflicting bytes", async () => {
  const lost = fakeS3({ responseLoss: true });
  assert.equal((await writeTerminal({ terminal: terminal(),
    ...options(lost) })).outcome, "existing");
  assert.deepEqual([lost.puts, lost.gets], [1, 1]);
  const conflict = fakeS3();
  const partialBindings = bindings({ role_bootstrap_sha256: null });
  const partial = createTerminal({ ...terminal(), status: "PARTIAL",
    bindings: partialBindings, postgres_mutation_attempt_count: 0,
    postgres_mutation_committed_count: 0,
    secretsmanager_put_secret_value_attempt_count: 0,
    secretsmanager_put_secret_value_committed_count: 0,
    production_write_count: 1, result: null,
    failure: { error_code: "LAWOS_OUTLOOK_DATABASE_SECRET",
      failure_phase: "credential-input", post_state_sha256: null },
    postgres_receipt: null });
  await writeTerminal({ terminal: partial, ...options(conflict, partialBindings) });
  await assert.rejects(writeTerminal({ terminal: terminal(),
    ...options(conflict) }), { code: "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_CONFLICT" });
});

test("terminal storage rejects absent, metadata, content, and binding drift", async (t) => {
  assert.deepEqual(await readTerminal(options(fakeS3())), { outcome: "absent" });
  for (const error of [
    Object.assign(new Error("missing bucket"), { name: "NoSuchBucket",
      $metadata: { httpStatusCode: 404 } }),
    Object.assign(new Error("generic 404"), {
      $metadata: { httpStatusCode: 404 } }),
  ]) {
    const client = { send: async () => { throw error; } };
    await assert.rejects(readTerminal(options(client)), (observed) =>
      observed === error);
  }
  const scenarios = [
    ["ContentType", "text/plain"], ["ServerSideEncryption", "AES256"],
    ["SSEKMSKeyId", `${KMS}-wrong`], ["ObjectLockMode", "GOVERNANCE"],
    ["ObjectLockRetainUntilDate", new Date(NOW - 1)], ["VersionId", ""],
    ["VersionId", " terminal-version-1 "],
    ["ChecksumSHA256", Buffer.alloc(32, 9).toString("base64")],
    ["ContentLength", 1], ["ContentLength", "123"],
  ];
  for (const [field, value] of scenarios) await t.test(field, async () => {
    const client = fakeS3();
    await writeTerminal({ terminal: terminal(), ...options(client) });
    client.drift(field, value);
    await assert.rejects(readTerminal(options(client)),
      { code: "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_CONFLICT" });
  });
  const content = fakeS3();
  await writeTerminal({ terminal: terminal(), ...options(content) });
  content.replaceBody(Buffer.from("{}\n"));
  await assert.rejects(readTerminal(options(content)),
    { code: "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_CONFLICT" });
  const target = fakeS3();
  await writeTerminal({ terminal: terminal(), ...options(target) });
  await assert.rejects(readTerminal(options(target,
    bindings({ database_target_receipt_sha256: digest("c") }))),
  { code: "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_CONFLICT" });
});

test("terminal storage rejects future evidence before S3 access", async () => {
  const client = fakeS3();
  await assert.rejects(writeTerminal({ terminal: createTerminal({ ...terminal(),
    recorded_at: "2026-08-17T08:00:00.001Z" }), ...options(client) }),
  { code: "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_BINDING" });
  assert.deepEqual([client.puts, client.gets], [0, 0]);
});
