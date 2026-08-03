import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  authorizeAuthorityAction,
  runValidation,
  validateAuthorityCheckpoint,
} from "../validate-rf13-dist-authority-checkpoint.mjs";

const SCHEMA_VERSION_LITERAL = "law-firm-os.rf13-dist.authority-checkpoint.v1";
const CHECKPOINT_ID_LITERAL = "RFD-TUW-003";
const SOURCE_SHA_LITERAL = "34d16954f54a188f93b087e3bc4ad1bce99c049f";
const STATUS_KEYS_LITERAL = [
  "commit_merge",
  "apple_signing_notary",
  "windows_signing",
  "staging_api",
  "production_api",
  "rollback_ownership",
];
const OWNER_ROLES_LITERAL = {
  commit_merge: "release_owner",
  apple_signing_notary: "apple_signing_owner",
  windows_signing: "windows_signing_owner",
  staging_api: "staging_api_owner",
  production_api: "production_api_owner",
  rollback_ownership: "rollback_owner",
};
const REASON_CODES_LITERAL = {
  commit_merge: "external_authority_required",
  apple_signing_notary: "external_authority_required",
  windows_signing: "external_authority_required",
  staging_api: "external_authority_required",
  production_api: "external_authority_required",
  rollback_ownership: "owner_confirmation_required",
};
const SCRIPT_PATH = fileURLToPath(new URL("../validate-rf13-dist-authority-checkpoint.mjs", import.meta.url));

const CANONICAL_FIXTURE = {
  schema_version: SCHEMA_VERSION_LITERAL,
  checkpoint_id: CHECKPOINT_ID_LITERAL,
  source_sha: SOURCE_SHA_LITERAL,
  read_only: true,
  statuses: Object.fromEntries(STATUS_KEYS_LITERAL.map((key) => [key, "blocked"])),
  owner_roles: structuredClone(OWNER_ROLES_LITERAL),
  reason_codes: structuredClone(REASON_CODES_LITERAL),
};

function fixture() {
  return structuredClone(CANONICAL_FIXTURE);
}

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "rf13-authority-"));
}

function cleanedTempRoot(testContext) {
  const root = tempRoot();
  testContext.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function writeFixture(root, content = fixture()) {
  const path = join(root, "authority-checkpoint.json");
  writeFileSync(path, typeof content === "string" ? content : JSON.stringify(content));
  return path;
}

function assertRejected(mutator, expectedCode) {
  const input = fixture();
  mutator(input);
  assert.throws(() => validateAuthorityCheckpoint(input, { expectedSourceSha: SOURCE_SHA_LITERAL }), (error) => {
    assert.equal(error.code, expectedCode);
    return true;
  });
}

test("valid all-blocked checkpoint passes as credential-free read-only evidence", (testContext) => {
  const validated = validateAuthorityCheckpoint(fixture(), { expectedSourceSha: SOURCE_SHA_LITERAL });
  assert.equal(validated.schema_version, SCHEMA_VERSION_LITERAL);
  assert.equal(validated.checkpoint_id, CHECKPOINT_ID_LITERAL);
  assert.equal(validated.source_sha, SOURCE_SHA_LITERAL);
  assert.equal(validated.read_only, true);
  assert.deepEqual(Object.keys(validated.statuses), STATUS_KEYS_LITERAL);
  assert.deepEqual(Object.values(validated.statuses), STATUS_KEYS_LITERAL.map(() => "blocked"));
  assert.deepEqual(validated.owner_roles, OWNER_ROLES_LITERAL);
  assert.deepEqual(validated.reason_codes, REASON_CODES_LITERAL);
  const authorization = authorizeAuthorityAction(validated);
  assert.deepEqual(authorization, { action: null, action_status: null, action_authorized: false, mutation_executed: false });
  const path = writeFixture(cleanedTempRoot(testContext));
  const readOnlyRun = runValidation({ checkpointPath: path, expectedSourceSha: SOURCE_SHA_LITERAL });
  assert.equal(readOnlyRun.verdict, "PASS");
  assert.equal(readOnlyRun.mutation_executed, false);
});
test("missing and unknown keys are rejected", () => {
  assertRejected((input) => { delete input.statuses.production_api; }, "MISSING_KEY");
  assertRejected((input) => { input.statuses.unexpected = "blocked"; }, "UNKNOWN_KEY");
  assertRejected((input) => { input.owner_roles.rollback = "rollback_owner"; }, "UNKNOWN_KEY");
});

test("plan enum is hyphenated and underscore spelling is rejected", () => {
  assertRejected((input) => { input.statuses.production_api = "not_required"; }, "INVALID_STATUS");
  const input = fixture();
  input.statuses.production_api = "not-required";
  input.reason_codes.production_api = "not_required_for_current_scope";
  assert.equal(validateAuthorityCheckpoint(input, { expectedSourceSha: SOURCE_SHA_LITERAL }).statuses.production_api, "not-required");
});

test("secret-like keys and values are rejected", () => {
  assertRejected((input) => { input.credentials = { api_token: "ghp_012345678901234567890123456789" }; }, "SECRET_KEY");
  assertRejected((input) => { input.statuses.production_api = "token: ghp_012345678901234567890123456789"; }, "SECRET_MATERIAL");
});

test("source SHA mismatch is rejected", () => {
  assertRejected((input) => { input.source_sha = "0".repeat(40); }, "SOURCE_SHA_MISMATCH");
});

test("owner and reason map values require safe identifiers", () => {
  assertRejected((input) => { input.owner_roles.rollback_ownership = "nobody"; }, "INVALID_OWNER_ROLE");
  assertRejected((input) => { input.reason_codes.rollback_ownership = "unexplained"; }, "INVALID_REASON_CODE");
});

test("reason codes are closed and consistent with available and not-required statuses", () => {
  const available = fixture();
  for (const key of STATUS_KEYS_LITERAL) {
    available.statuses[key] = "available";
    available.reason_codes[key] = "status_available_requires_authoritative_receipt";
  }
  assert.equal(validateAuthorityCheckpoint(available, { expectedSourceSha: SOURCE_SHA_LITERAL }).statuses.commit_merge, "available");

  const notRequired = fixture();
  for (const key of STATUS_KEYS_LITERAL) {
    notRequired.statuses[key] = "not-required";
    notRequired.reason_codes[key] = "not_required_for_current_scope";
  }
  assert.equal(validateAuthorityCheckpoint(notRequired, { expectedSourceSha: SOURCE_SHA_LITERAL }).statuses.commit_merge, "not-required");

  assertRejected((input) => {
    input.statuses.production_api = "available";
    input.reason_codes.production_api = "external_authority_required";
  }, "INVALID_REASON_CODE");
});

test("blocked action fails closed and requires a separate authoritative validator", () => {
  const validated = validateAuthorityCheckpoint(fixture(), { expectedSourceSha: SOURCE_SHA_LITERAL });
  assert.throws(() => authorizeAuthorityAction(validated, "production_api"), (error) => {
    assert.equal(error.code, "ACTION_NOT_AUTHORIZED");
    assert.match(error.message, /separate authoritative approval validator is required/u);
    return true;
  });
});

test("not-required action fails closed and never authorizes mutation", () => {
  const input = fixture();
  input.statuses.commit_merge = "not-required";
  input.reason_codes.commit_merge = "not_required_for_current_scope";
  const validated = validateAuthorityCheckpoint(input, { expectedSourceSha: SOURCE_SHA_LITERAL });
  assert.throws(() => authorizeAuthorityAction(validated, "commit_merge"), (error) => {
    assert.equal(error.code, "ACTION_NOT_AUTHORIZED");
    assert.match(error.message, /separate authoritative approval validator is required/u);
    return true;
  });
});

test("available action is still denied because this is only a status inventory", () => {
  const input = fixture();
  for (const key of STATUS_KEYS_LITERAL) {
    input.statuses[key] = "available";
    input.reason_codes[key] = "status_available_requires_authoritative_receipt";
  }
  const validated = validateAuthorityCheckpoint(input, { expectedSourceSha: SOURCE_SHA_LITERAL });
  assert.throws(() => authorizeAuthorityAction(validated, "production_api"), (error) => {
    assert.equal(error.code, "ACTION_NOT_AUTHORIZED");
    assert.match(error.message, /status inventory never authorizes mutation/u);
    return true;
  });
});

test("malformed JSON returns a stable safe error without echoing fake credential input", (testContext) => {
  const fakeCredentialFragment = "FAKE_CREDENTIAL_FRAGMENT_7f3b";
  const path = writeFixture(cleanedTempRoot(testContext), `{"source_sha":"${fakeCredentialFragment}",`);
  assert.throws(() => runValidation({ checkpointPath: path, expectedSourceSha: SOURCE_SHA_LITERAL }), (error) => {
    assert.equal(error.code, "CHECKPOINT_JSON_INVALID");
    assert.equal(error.message, "checkpoint JSON is invalid");
    assert.doesNotMatch(error.message, new RegExp(fakeCredentialFragment, "u"));
    return true;
  });
  const cli = spawnSync(process.execPath, [SCRIPT_PATH, "--checkpoint", path, "--source-sha", SOURCE_SHA_LITERAL], { encoding: "utf8" });
  assert.equal(cli.status, 1);
  assert.doesNotMatch(cli.stderr, new RegExp(fakeCredentialFragment, "u"));
  assert.match(cli.stderr, /CHECKPOINT_JSON_INVALID/u);
});

test("valid JSON CLI failures do not echo secret-bearing or arbitrary unknown key names", (testContext) => {
  const secretMarker = "FAKE_SECRET_BEARING_KEY_MARKER";
  const secretInput = fixture();
  secretInput.fake_secret_bearing_key = secretMarker;
  const secretPath = writeFixture(cleanedTempRoot(testContext), secretInput);
  const secretCli = spawnSync(process.execPath, [SCRIPT_PATH, "--checkpoint", secretPath, "--source-sha", SOURCE_SHA_LITERAL], { encoding: "utf8" });
  assert.equal(secretCli.status, 1);
  assert.match(secretCli.stderr, /SECRET_KEY/u);
  assert.doesNotMatch(`${secretCli.stdout}${secretCli.stderr}`, new RegExp(secretMarker, "u"));

  const unknownMarker = "ARBITRARY_UNKNOWN_KEY_MARKER";
  const unknownInput = fixture();
  unknownInput.arbitrary_unknown_field = unknownMarker;
  const unknownPath = writeFixture(cleanedTempRoot(testContext), unknownInput);
  const unknownCli = spawnSync(process.execPath, [SCRIPT_PATH, "--checkpoint", unknownPath, "--source-sha", SOURCE_SHA_LITERAL], { encoding: "utf8" });
  assert.equal(unknownCli.status, 1);
  assert.match(unknownCli.stderr, /UNKNOWN_KEY/u);
  assert.doesNotMatch(`${unknownCli.stdout}${unknownCli.stderr}`, new RegExp(unknownMarker, "u"));
});

test("clean-style CLI requires explicit checkpoint and source SHA, and template writes nothing", (testContext) => {
  const root = cleanedTempRoot(testContext);
  const path = writeFixture(root);
  const valid = spawnSync(process.execPath, [SCRIPT_PATH, "--checkpoint", path, "--source-sha", SOURCE_SHA_LITERAL], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(valid.status, 0);
  assert.equal(valid.stderr, "");
  assert.equal(JSON.parse(valid.stdout).verdict, "PASS");

  const missingInputs = spawnSync(process.execPath, [SCRIPT_PATH], { cwd: root, encoding: "utf8" });
  assert.equal(missingInputs.status, 1);
  assert.match(missingInputs.stderr, /explicit --source-sha/u);

  const template = spawnSync(process.execPath, [SCRIPT_PATH, "--template", "--source-sha", SOURCE_SHA_LITERAL], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(template.status, 0);
  const generated = JSON.parse(template.stdout);
  assert.deepEqual(generated, { ...fixture() });

  const templateAction = spawnSync(process.execPath, [SCRIPT_PATH, "--template", "--source-sha", SOURCE_SHA_LITERAL, "--action", "production_api"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(templateAction.status, 1);
  assert.equal(templateAction.stdout, "");
  assert.match(templateAction.stderr, /cannot be combined with --action/u);

  assert.deepEqual(readdirSync(root), ["authority-checkpoint.json"]);
});

test("symlinked CLI entrypoint runs validation and cannot silently pass", (testContext) => {
  const root = cleanedTempRoot(testContext);
  const checkpointPath = writeFixture(root);
  const symlinkPath = join(root, "validator-link.mjs");
  symlinkSync(SCRIPT_PATH, symlinkPath, "file");

  const valid = spawnSync(process.execPath, [symlinkPath, "--checkpoint", checkpointPath, "--source-sha", SOURCE_SHA_LITERAL], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(valid.status, 0);
  assert.notEqual(valid.stdout, "");
  assert.equal(JSON.parse(valid.stdout).verdict, "PASS");

  const invalidInput = fixture();
  invalidInput.source_sha = "0".repeat(40);
  const invalidPath = writeFixture(root, invalidInput);
  const invalid = spawnSync(process.execPath, [symlinkPath, "--checkpoint", invalidPath, "--source-sha", SOURCE_SHA_LITERAL], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(invalid.status, 1);
  assert.equal(invalid.stdout, "");
  assert.match(invalid.stderr, /SOURCE_SHA_MISMATCH/u);
});
