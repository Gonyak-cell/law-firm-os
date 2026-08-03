import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { authorizeHrxApiRequest } from "../../apps/api/src/middleware/hrx-authz.js";
import {
  buildFormalDeployedApiChainSuccessOutput,
  buildFormalDeployedApiAuthorityBlockedReceipt,
  FORMAL_DEPLOYED_API_CHAIN_OUTPUT_SCHEMA,
  readFormalDeployedApiPackageQaReceipt,
  validateFormalDeployedApiAuthorityCapability,
  validateFormalDeployedApiPackageQaReceipt,
  validatePrivateStagingEndpointContract,
  writeFormalDeployedApiPackageQaReceipt,
} from "../lib/formal-deployed-api-package-qa.mjs";
import { canonicalReceiptBytes, sha256Bytes, sidecarRef } from "../lib/formal-deployed-api-io.mjs";
import {
  FORMAL_DEPLOYED_API_QA_CREDENTIAL_SCHEMA,
  mintFormalDeployedApiCredentialAccountCapability,
  readFormalDeployedApiCredentialFile,
  validateFormalDeployedApiCredential,
  validateFormalDeployedApiCredentialAccountCapability,
} from "../lib/formal-deployed-api-inputs.mjs";
import { runFormalDeployedApiRestartQaFromCanonicalChain } from "../lib/formal-deployed-api-restart-contract.mjs";
import { buildFormalDeployedApiIdentityRows } from "../lib/formal-deployed-api-scenario.mjs";
import { validateFormalDeployedApiRawTranscript } from "../lib/formal-deployed-api-transcript.mjs";
import { PRIVATE_STAGING_PRE_SUITE_RECEIPT_KINDS } from "../lib/private-staging-execution-receipt.mjs";
import {
  API_ID,
  ENDPOINT,
  ENDPOINT_SHA,
  SOURCE_SHA,
  SOURCE_TREE,
  TENANT_ID,
  createHandAuthoredRfd015PassBundle,
  validTranscript,
} from "./helpers/formal-deployed-api-v3-fixture.mjs";

const ROOT = resolve(import.meta.dirname, "../..");
const PUBLIC_JS = resolve(ROOT, "scripts/run-formal-deployed-api-package-qa.mjs");
const POSIX_LAUNCHER = resolve(ROOT, "scripts/run-formal-deployed-api-package-qa.sh");
const WINDOWS_LAUNCHER = resolve(ROOT, "scripts/run-formal-deployed-api-package-qa.ps1");
const INTERNAL_RUNNER = resolve(ROOT, "scripts/internal/run-formal-deployed-api-package-qa.mjs");
const INTERNAL_MAIN = resolve(ROOT, "scripts/internal/formal-deployed-api-package-qa-main.mjs");
const VALIDATOR = resolve(ROOT, "scripts/validate-formal-deployed-api-package-qa.mjs");

function transcriptOptions(fixture) {
  return {
    platform: "macos",
    sourceSha: SOURCE_SHA,
    endpointSha256: ENDPOINT_SHA,
    artifactSha256: fixture.receipt.package.artifact_sha256,
    manifestSha256: fixture.receipt.package.manifest_sha256,
    executedPackageSha256: fixture.receipt.package.executed_package_sha256,
    executablePathSha256: fixture.receipt.package.executable_path_sha256,
    expectedUsers: fixture.expectedUsers,
    expectedTenantId: TENANT_ID,
  };
}

function writeReceipt(root, name, receipt) {
  const path = join(root, name);
  writeFileSync(path, canonicalReceiptBytes(receipt), { mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
}

function validCredentialInput() {
  return {
    schema_version: FORMAL_DEPLOYED_API_QA_CREDENTIAL_SCHEMA,
    endpoint: {
      environment: "lawos-staging",
      stack_name: "lawos-private-staging",
      account_id: "770880870480",
      region: "ap-northeast-2",
      api_id: API_ID,
      api_base_url: ENDPOINT,
      data_scope: "synthetic-only",
      production: false,
    },
    account: {
      email: "synthetic-rfd015@example.invalid",
      password: "synthetic-no-network-password",
      tenant_id: TENANT_ID,
      other_tenant_id: "tenant-negative-reviewer-8157",
      matter_id: "matter-synthetic-rfd015",
    },
    authority: {
      trust_registry_path: "trust-registry.json",
      trust_registry_sha256: "a".repeat(64),
      exact_head_packet_path: "exact-head-packet.json",
      approval_receipt_path: "approval-receipt.json",
      approval_signature_path: "approval-receipt.sig",
      package_artifact_path: "package.dmg",
      package_manifest_path: "package-manifest.json",
      package_qa_receipt_path: "package-qa-receipt.json",
      synthetic_identity_manifest_path: "synthetic-identities.json",
      execution_receipts: PRIVATE_STAGING_PRE_SUITE_RECEIPT_KINDS.map((kind) => ({
        kind,
        receipt_path: `${kind}.json`,
        signature_path: `${kind}.sig`,
      })),
    },
  };
}

test("RFD-TUW-015 endpoint policy accepts only the exact HTTPS API Gateway origin", () => {
  const endpoint = { environment: "lawos-staging", stack_name: "lawos-private-staging", account_id: "770880870480", region: "ap-northeast-2", api_id: API_ID, api_base_url: ENDPOINT, data_scope: "synthetic-only", production: false };
  assert.equal(validatePrivateStagingEndpointContract(endpoint).endpoint_sha256, ENDPOINT_SHA);
  for (const drift of [
    { api_base_url: ENDPOINT.replace("https:", "http:") },
    { api_base_url: `${ENDPOINT}/stage` },
    { production: true },
    { api_id: "9mg4liadm6", api_base_url: "https://9mg4liadm6.execute-api.ap-northeast-2.amazonaws.com" },
  ]) assert.throws(() => validatePrivateStagingEndpointContract({ ...endpoint, ...drift }));
});

test("RFD-TUW-015 credential account authority is loader-bound, opaque, and no-network", () => {
  const root = mkdtempSync(join(tmpdir(), "rfd015-credential-capability-"));
  const path = join(root, "credential.json");
  const input = validCredentialInput();
  writeFileSync(path, canonicalReceiptBytes(input), { mode: 0o600 });
  chmodSync(path, 0o600);
  try {
    const credential = readFormalDeployedApiCredentialFile(path, { rootDir: ROOT });
    const capability = mintFormalDeployedApiCredentialAccountCapability(credential, {
      tenantId: TENANT_ID,
      otherTenantId: input.account.other_tenant_id,
      matterId: input.account.matter_id,
    });
    const account = validateFormalDeployedApiCredentialAccountCapability(capability, {
      tenantId: TENANT_ID,
      otherTenantId: input.account.other_tenant_id,
      matterId: input.account.matter_id,
    });
    assert.deepEqual(account, {
      email: input.account.email,
      matter_id: input.account.matter_id,
      other_tenant_id: input.account.other_tenant_id,
      password: input.account.password,
      tenant_id: TENANT_ID,
    });
    assert.equal(Object.isFrozen(account), true);
    assert.deepEqual(Object.keys(capability), ["schema_version"]);
    assert.doesNotMatch(JSON.stringify(capability), /synthetic-rfd015|password|tenant-synthetic|matter-synthetic/u);
    assert.equal(JSON.stringify(capability).includes(input.account.other_tenant_id), false);
    assert.throws(
      () => validateFormalDeployedApiCredentialAccountCapability(structuredClone(capability)),
      (error) => error.code === "FORMAL_DEPLOYED_API_QA_CREDENTIAL_CAPABILITY",
    );
    assert.throws(
      () => validateFormalDeployedApiCredentialAccountCapability(capability, { tenantId: "tenant-drift", matterId: input.account.matter_id }),
      (error) => error.code === "FORMAL_DEPLOYED_API_QA_CREDENTIAL_CAPABILITY",
    );
    assert.throws(
      () => validateFormalDeployedApiCredentialAccountCapability(capability, {
        tenantId: TENANT_ID,
        otherTenantId: "tenant-negative-wrong-8157",
        matterId: input.account.matter_id,
      }),
      (error) => error.code === "FORMAL_DEPLOYED_API_QA_CREDENTIAL_CAPABILITY",
    );
    assert.throws(
      () => mintFormalDeployedApiCredentialAccountCapability(validateFormalDeployedApiCredential(input), {
        tenantId: TENANT_ID,
        otherTenantId: input.account.other_tenant_id,
        matterId: input.account.matter_id,
      }),
      (error) => error.code === "FORMAL_DEPLOYED_API_QA_CREDENTIAL_CAPABILITY",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("RFD-TUW-015 to RFD-TUW-016 seam fails closed before network without live chain capabilities", async () => {
  const result = await runFormalDeployedApiRestartQaFromCanonicalChain();
  assert.equal(result.receipt.verdict, "BLOCKED_BY_ARTIFACT");
  assert.equal(result.receipt.blocked_code, "RFD016_CHAIN_REQUIRED");
  assert.equal(result.receipt.boundaries.production_runtime_used, false);
  assert.equal(result.receipt.boundaries.api_write_scope, "none");
  assert.equal(result.capability, null);
  assert.equal(result.receiptPath, null);
});

test("RFD-TUW-015 canonical chain success output reports both receipt artifacts without secret material", () => {
  const root = mkdtempSync(join(tmpdir(), "rfd015-chain-output-"));
  const rfd015Receipt = {
    verdict: "PASS",
    boundaries: {
      production_contact_count: 0,
      production_write_count: 0,
      real_data_contact_count: 0,
      release_executed: false,
    },
  };
  const rfd016Receipt = {
    checkpoint_id: "RFD-TUW-016",
    verdict: "PASS",
    status: "PASS",
    boundaries: {
      production_runtime_used: false,
      operator_token_used: false,
      api_write_scope: "synthetic-staging-only",
    },
  };
  const rfd015ReceiptPath = writeReceipt(root, "rfd015-receipt.json", rfd015Receipt);
  const rfd016ReceiptPath = writeReceipt(root, "rfd016-restart-receipt.json", rfd016Receipt);
  const rfd015Validation = {
    valid: true,
    verdict: "PASS",
    actual_deployment_pass: true,
    receipt_sha256: sha256Bytes(canonicalReceiptBytes(rfd015Receipt)),
  };
  try {
    const output = buildFormalDeployedApiChainSuccessOutput({
      rfd015ReceiptPath,
      rfd015Receipt,
      rfd015Validation,
      rfd016ReceiptPath,
      rfd016Receipt,
      rootDir: ROOT,
    });
    assert.equal(output.schema_version, FORMAL_DEPLOYED_API_CHAIN_OUTPUT_SCHEMA);
    assert.equal(output.verdict, "PASS");
    assert.equal(output.status, "PASS");
    assert.deepEqual(Object.keys(output.rfd015).sort(), [
      "actual_deployment_pass", "checkpoint_id", "production_contact_count", "production_write_count",
      "real_data_contact_count", "receipt_path", "receipt_sha256", "release_executed", "status",
    ]);
    assert.deepEqual(Object.keys(output.rfd016).sort(), [
      "api_write_scope", "checkpoint_id", "operator_token_used", "production_runtime_used",
      "receipt_path", "receipt_sha256", "status",
    ]);
    assert.equal(output.rfd015.checkpoint_id, "RFD-TUW-015");
    assert.equal(output.rfd015.receipt_path, realpathSync(rfd015ReceiptPath));
    assert.equal(output.rfd016.checkpoint_id, "RFD-TUW-016");
    assert.equal(output.rfd016.receipt_path, realpathSync(rfd016ReceiptPath));
    assert.equal(output.rfd016.receipt_sha256, sha256Bytes(canonicalReceiptBytes(rfd016Receipt)));
    assert.equal(Object.isFrozen(output.rfd015), true);
    assert.equal(Object.isFrozen(output.rfd016), true);
    assert.doesNotMatch(JSON.stringify(output), /(?:password|credential|authorization|access[_-]?token|@)/iu);
    const mainSource = readFileSync(INTERNAL_MAIN, "utf8");
    assert.match(mainSource, /rfd016ReceiptPath:\s*restart\.receiptPath/u);
    assert.match(mainSource, /JSON\.stringify\(output, null, 2\)/u);
    assert.throws(
      () => buildFormalDeployedApiChainSuccessOutput({
        rfd015ReceiptPath,
        rfd015Receipt,
        rfd015Validation: { ...rfd015Validation, receipt_sha256: "f".repeat(64) },
        rfd016ReceiptPath,
        rfd016Receipt,
        rootDir: ROOT,
      }),
      (error) => error.code === "FORMAL_DEPLOYED_API_QA_CHAIN_OUTPUT",
    );
    const alternateRestartPath = writeReceipt(root, "alternate-restart-receipt.json", rfd016Receipt);
    assert.throws(
      () => buildFormalDeployedApiChainSuccessOutput({
        rfd015ReceiptPath,
        rfd015Receipt,
        rfd015Validation,
        rfd016ReceiptPath: alternateRestartPath,
        rfd016Receipt,
        rootDir: ROOT,
      }),
      (error) => error.code === "FORMAL_DEPLOYED_API_QA_CHAIN_OUTPUT_PATH",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("RFD-TUW-015 scenario joins ten tenant-bound employee login mappings", () => {
  const expectedUsers = Array.from({ length: 10 }, (_, index) => ({ userId: `user-${index}`, employeeId: `employee-${index}` }));
  const employeeRows = expectedUsers.map(({ employeeId }, index) => ({ tenant_id: TENANT_ID, employee_id: employeeId, display_name: `Synthetic Person ${index}` }));
  const linkRows = expectedUsers.map(({ employeeId, userId }) => ({ tenant_id: TENANT_ID, employee_id: employeeId, user_id: userId, purpose: "login_mapping" }));
  const rows = buildFormalDeployedApiIdentityRows({ employeeRows, linkRows, expectedUsers, tenantId: TENANT_ID });
  assert.equal(rows.length, 10);
  assert.equal(new Set(rows.map((row) => row.user_id_sha256)).size, 10);
  assert.ok(rows.every((row) => row.classification === "approved-synthetic" && row.initials_sha256));
  assert.throws(() => buildFormalDeployedApiIdentityRows({ employeeRows, linkRows: [...linkRows.slice(0, 9), { ...linkRows[0] }], expectedUsers, tenantId: TENANT_ID }), /login links/u);
  assert.throws(() => buildFormalDeployedApiIdentityRows({ employeeRows, linkRows: linkRows.map((row, index) => index === 0 ? { ...row, user_id: "unapproved-user" } : row), expectedUsers, tenantId: TENANT_ID }), /approved synthetic identity/u);
});

test("RFD-TUW-015 other-tenant probe uses the API's fail-closed denial contract", () => {
  const denial = authorizeHrxApiRequest({ method: "GET", pathname: "/api/hrx/employees", query: { tenant_id: "another-synthetic-tenant" } });
  assert.equal(denial.status, 400);
  assert.equal(denial.body.outcome, "blocked");
  assert.equal(denial.body.safe_error_code, "HRX_QUERY_CONTEXT_FORBIDDEN");
  assert.deepEqual(denial.body.forbidden_query_keys, ["tenant_id"]);
  assert.equal(Object.hasOwn(denial.body, "employees"), false);
});

test("RFD-TUW-015 public validator rejects a complete hand-authored PASS", () => {
  const fixture = createHandAuthoredRfd015PassBundle();
  try {
    assert.throws(() => validateFormalDeployedApiPackageQaReceipt(fixture.receipt), (error) => error.code === "FORMAL_DEPLOYED_API_QA_AUTHORITY_REQUIRED");
    const clone = structuredClone(fixture.receipt);
    assert.throws(() => validateFormalDeployedApiPackageQaReceipt(clone), /canonical raw-authority reader/u);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("RFD-TUW-015 rejects a complete raw bundle without the opaque live RFD014 capability", () => {
  const fixture = createHandAuthoredRfd015PassBundle();
  try {
    assert.throws(
      () => readFormalDeployedApiPackageQaReceipt(fixture.receiptPath, { rootDir: ROOT }),
      (error) => error.code === "FORMAL_DEPLOYED_API_QA_PACKAGE_CAPABILITY",
    );
    const forgedCapability = {
      platform: "macos", source_sha: SOURCE_SHA, source_tree: SOURCE_TREE,
      artifact_sha256: fixture.receipt.package.artifact_sha256,
      executed_package_sha256: fixture.receipt.package.executed_package_sha256,
      manifest_sha256: fixture.receipt.package.manifest_sha256,
      privacy_corpus_sha256: "2".repeat(64), verdict: "PASS", native_verdict: "PASS",
      authoritative: true, runner_capability: "native-macos-dmg",
      receipt_sha256: fixture.receipt.package.package_qa_receipt_sha256,
      transcript_sha256: fixture.receipt.package.package_qa_transcript_sha256,
    };
    assert.throws(
      () => readFormalDeployedApiPackageQaReceipt(fixture.receiptPath, { rootDir: ROOT, packageQaCapability: forgedCapability }),
      (error) => error.code === "FORMAL_DEPLOYED_API_QA_PACKAGE_CAPABILITY",
    );
    assert.throws(() => validateFormalDeployedApiAuthorityCapability(structuredClone(forgedCapability)), /canonical reader/u);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("RFD-TUW-015 signed endpoint authority rejects a self-labelled alternate staging API", () => {
  const fixture = createHandAuthoredRfd015PassBundle();
  try {
    const receipt = structuredClone(fixture.receipt);
    receipt.deployment.api_id = "ijklmnop12";
    receipt.deployment.api_endpoint_sha256 = sha256Bytes("https://ijklmnop12.execute-api.ap-northeast-2.amazonaws.com");
    const path = writeReceipt(fixture.root, "alternate-endpoint.json", receipt);
    assert.throws(() => readFormalDeployedApiPackageQaReceipt(path, { rootDir: ROOT }), /signed endpoint/u);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("RFD-TUW-015 package authority rejects artifact and executed-process substitution", () => {
  const fixture = createHandAuthoredRfd015PassBundle();
  try {
    const replacement = Buffer.from("substituted-artifact");
    writeFileSync(join(fixture.root, "substituted.dmg"), replacement, { mode: 0o600 });
    const receipt = structuredClone(fixture.receipt);
    receipt.authority.package.artifact = sidecarRef("substituted.dmg", replacement);
    receipt.package.artifact_sha256 = receipt.authority.package.artifact.sha256;
    receipt.package.artifact_bytes = receipt.authority.package.artifact.bytes;
    const path = writeReceipt(fixture.root, "substituted-receipt.json", receipt);
    assert.throws(() => readFormalDeployedApiPackageQaReceipt(path, { rootDir: ROOT }), /Expected values/u);
    const processDrift = structuredClone(fixture.transcript);
    processDrift.process_events[0].executable_sha256 = "f".repeat(64);
    assert.throws(() => validateFormalDeployedApiRawTranscript(processDrift, transcriptOptions(fixture)), /executedPackageSha256|Expected values/u);
    writeFileSync(join(fixture.root, fixture.refs.package.qa_transcript.name), "tampered package transcript", { mode: 0o600 });
    assert.throws(() => readFormalDeployedApiPackageQaReceipt(fixture.receiptPath, { rootDir: ROOT }), /raw bytes/u);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("RFD-TUW-015 transcript rejects telemetry, endpoint, operator, and error gaps", () => {
  const fixture = createHandAuthoredRfd015PassBundle();
  try {
    const cases = [
      (value) => value.telemetry_boundary_events.shift(),
      (value) => { value.network_events[0].origin_sha256 = "f".repeat(64); },
      (value) => { value.network_events[0].operator_header_count = 1; },
      (value) => value.console_events.push({ sequence: 1, event_sha256: "f".repeat(64) }),
      (value) => value.process_error_events.push({ sequence: 1, event_sha256: "f".repeat(64) }),
    ];
    for (const mutate of cases) {
      const value = structuredClone(fixture.transcript);
      mutate(value);
      assert.throws(() => validateFormalDeployedApiRawTranscript(value, transcriptOptions(fixture)));
    }
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("RFD-TUW-015 transcript requires ten unique identities and an exact zero-visibility tenant denial", () => {
  const fixture = createHandAuthoredRfd015PassBundle();
  try {
    const cases = [
      (value) => value.identity_rows.pop(),
      (value) => { value.identity_rows[9] = { ...value.identity_rows[0], sequence: 10 }; },
      (value) => { value.identity_rows[0].classification = "unclassified"; },
      (value) => value.other_tenant_rows.push({ sequence: 1, row_sha256: "f".repeat(64) }),
      (value) => { value.other_tenant_observation.status = 200; },
      (value) => { value.other_tenant_observation.requested_tenant_sha256 = value.other_tenant_observation.signed_tenant_sha256; },
      (value) => { value.other_tenant_observation.safe_error_code = "HRX_TENANT_NOT_FOUND"; },
      (value) => { value.other_tenant_observation.forbidden_query_keys = []; },
      (value) => { value.other_tenant_observation.employees_field_present = true; },
      (value) => { value.other_tenant_observation.visible_count = 1; },
    ];
    for (const mutate of cases) {
      const value = structuredClone(fixture.transcript);
      mutate(value);
      assert.throws(() => validateFormalDeployedApiRawTranscript(value, transcriptOptions(fixture)));
    }
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("RFD-TUW-015 transcript rejects missing replay and duplicate durable readback", () => {
  const fixture = createHandAuthoredRfd015PassBundle();
  try {
    for (const mutate of [
      (value) => { value.mutation_events.find((row) => row.kind === "task" && row.attempt === 2).replay = false; },
      (value) => { value.readback_events.find((row) => row.kind === "billing").occurrence_count = 2; },
    ]) {
      const value = structuredClone(fixture.transcript);
      mutate(value);
      assert.throws(() => validateFormalDeployedApiRawTranscript(value, transcriptOptions(fixture)));
    }
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("RFD-TUW-015 production execution requires the fixed OS launcher", async () => {
  const originalArgv1 = process.argv[1];
  try {
    process.argv[1] = PUBLIC_JS;
    const module = await import("../lib/formal-deployed-api-package-qa.mjs");
    assert.equal(module.runActualFormalDeployedApiPackageQa, undefined);
    assert.doesNotMatch(readFileSync(INTERNAL_MAIN, "utf8"), /\bexport\s+(?:async\s+)?function\s+run/u);
    const eraser = "data:text/javascript,delete%20process.env.NODE_OPTIONS%3Bdelete%20process.env.NODE_PATH%3Bprocess.execArgv.length%3D0%3Bprocess.argv.length%3D1";
    for (const entrypoint of [PUBLIC_JS, INTERNAL_RUNNER, INTERNAL_MAIN]) {
      const result = spawnSync(process.execPath, ["--import", eraser, entrypoint, "--platform", "macos"], { cwd: ROOT, encoding: "utf8" });
      assert.equal(result.status, 2);
      assert.match(result.stderr, /LAUNCHER_REQUIRED/u);
      assert.doesNotMatch(result.stderr, /FORMAL_DEPLOYED_API_QA_ARGUMENT/u);
    }
    if (process.platform === "darwin") {
      for (const injectedEnv of [
        { NODE_OPTIONS: `--import=${eraser}` },
        { NODE_PATH: "/tmp/rfd015-forbidden-node-path" },
      ]) {
        const result = spawnSync(POSIX_LAUNCHER, ["--platform", "macos"], { cwd: ROOT, env: { ...process.env, ...injectedEnv }, encoding: "utf8" });
        assert.equal(result.status, 2);
        assert.match(result.stderr, /LAUNCHER_REQUIRED/u);
        assert.doesNotMatch(result.stderr, /FORMAL_DEPLOYED_API_QA_ARGUMENT/u);
      }
      const sanitized = spawnSync(POSIX_LAUNCHER, [], { cwd: ROOT, env: process.env, encoding: "utf8" });
      assert.equal(sanitized.status, 1);
      assert.match(sanitized.stderr, /FORMAL_DEPLOYED_API_QA_ARGUMENT/u);
    }
    const scripts = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts;
    assert.match(scripts["matter-desktop:formal-deployed-api-qa:macos"], /\$PWD\/scripts\/run-formal-deployed-api-package-qa\.sh/u);
    assert.match(scripts["matter-desktop:formal-deployed-api-qa:windows"], /run-formal-deployed-api-package-qa\.ps1/u);
    assert.match(readFileSync(WINDOWS_LAUNCHER, "utf8"), /NODE_OPTIONS[\s\S]*NODE_PATH[\s\S]*internal\/run-formal-deployed-api-package-qa\.mjs/u);
  } finally {
    process.argv[1] = originalArgv1;
  }
});

test("RFD-TUW-015 file-only validator blocks a serialized claimed PASS and an explicit authority blocker", () => {
  const fixture = createHandAuthoredRfd015PassBundle();
  const blockedRoot = mkdtempSync(join(tmpdir(), "rfd015-blocked-"));
  chmodSync(blockedRoot, 0o700);
  try {
    const replay = spawnSync(process.execPath, [VALIDATOR, "--receipt", fixture.receiptPath], { cwd: ROOT, encoding: "utf8" });
    assert.equal(replay.status, 2, replay.stderr);
    assert.match(replay.stderr, /BLOCKED_BY_AUTHORITY/u);
    const blocked = buildFormalDeployedApiAuthorityBlockedReceipt({ expectedSourceSha: SOURCE_SHA, sourceTree: SOURCE_TREE, platform: "macos" });
    const blockedPath = join(blockedRoot, "blocked.json");
    writeFormalDeployedApiPackageQaReceipt(blockedPath, blocked, { rootDir: ROOT });
    const result = spawnSync(process.execPath, [VALIDATOR, "--receipt", blockedPath], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stdout, /BLOCKED_BY_AUTHORITY/u);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
    rmSync(blockedRoot, { recursive: true, force: true });
  }
});

test("RFD-TUW-015 canonical reader rejects symlink and non-0600 receipt files", () => {
  const fixture = createHandAuthoredRfd015PassBundle();
  try {
    chmodSync(fixture.receiptPath, 0o644);
    assert.throws(() => readFormalDeployedApiPackageQaReceipt(fixture.receiptPath, { rootDir: ROOT }), /0600/u);
    chmodSync(fixture.receiptPath, 0o600);
    const link = join(fixture.root, "receipt-link.json");
    symlinkSync(fixture.receiptPath, link);
    assert.throws(() => readFormalDeployedApiPackageQaReceipt(link, { rootDir: ROOT }), /non-symlink/u);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});
