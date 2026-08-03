import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  ADAPTER_FIXTURE_SCHEMA,
  BLOCKED_BY_DEPLOYED_API,
  CHECKPOINT_ID,
  SCHEMA_VERSION,
  buildSyntheticRfd015Receipt,
  createSyntheticRestartAdapter,
  assertFormalDeployedApiRestartCapability,
  getFormalDeployedApiRestartCapability,
  observeFormalDeployedApiRestartProcessExit,
  closeFormalDeployedApiRestartProcess,
  assertFormalDeployedApiRestartProcessExit,
  cleanupFormalDeployedApiRestartProcess,
  runFormalDeployedApiRestartQaTestOnly,
  runFormalDeployedApiRestartQa,
  sha256,
  validateFormalDeployedApiRestartReceipt,
} from "../lib/formal-deployed-api-restart-contract.mjs";
import {
  sha256Bytes,
} from "../lib/formal-deployed-api-package-qa.mjs";
import {
  formalRestartMondayFor,
  inspectFormalRestartDurableReadback,
  inspectFormalRestartIsolation,
  isFormalDeployedApiRestartAbsolutePath,
} from "../lib/formal-deployed-api-restart-adapter.mjs";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const ARTIFACT_SHA = "c".repeat(64);
const API_ENDPOINT = "https://abcdefgh12.execute-api.ap-northeast-2.amazonaws.com";
function options(overrides = {}) {
  const rfd015Receipt = buildSyntheticRfd015Receipt({ sourceSha: SOURCE_SHA, sourceTree: SOURCE_TREE, artifactSha256: ARTIFACT_SHA, apiEndpoint: API_ENDPOINT });
  return {
    rfd015Receipt,
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
    expectedArtifactSha256: ARTIFACT_SHA,
    expectedApiEndpoint: API_ENDPOINT,
    adapter: createSyntheticRestartAdapter({
      binding: { source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, artifact_sha256: ARTIFACT_SHA, api_endpoint: API_ENDPOINT },
    }),
    ...overrides,
  };
}
const API_ENDPOINT_SHA = sha256Bytes(API_ENDPOINT);

test("RFD-TUW-016 runner refuses synthetic authority and adapters", async () => {
  const runnerResult = await runFormalDeployedApiRestartQa(options());
  assert.equal(runnerResult.verdict, BLOCKED_BY_DEPLOYED_API);
  assert.equal(runnerResult.blocked_code, "DEPLOYED_API_RECEIPT_TEST_ONLY");
});

test("RFD-TUW-016 refuses to claim deployed-API PASS without an authoritative RFD-TUW-015 receipt", async () => {
  const receipt = await runFormalDeployedApiRestartQa({
    adapter: createSyntheticRestartAdapter({ binding: { source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, artifact_sha256: ARTIFACT_SHA, api_endpoint: API_ENDPOINT } }),
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
    expectedArtifactSha256: ARTIFACT_SHA,
    expectedApiEndpoint: API_ENDPOINT,
  });
  assert.equal(receipt.verdict, BLOCKED_BY_DEPLOYED_API);
  assert.notEqual(receipt.verdict, "PASS");
  assert.equal(receipt.authoritative.rfd015_receipt_present, false);
  assert.equal(validateFormalDeployedApiRestartReceipt(receipt).verdict, BLOCKED_BY_DEPLOYED_API);
});

test("RFD-TUW-016 blocked receipts cannot overstate the RFD015 v3 capability bindings", async () => {
  const receipt = await runFormalDeployedApiRestartQa({
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
    expectedArtifactSha256: ARTIFACT_SHA,
    expectedApiEndpoint: API_ENDPOINT,
  });
  for (const field of [
    "rfd015_capability_schema_version",
    "rfd015_authority_sha256",
    "rfd015_api_artifact_sha256",
    "rfd015_manifest_sha256",
    "rfd015_executed_package_sha256",
    "rfd015_transcript_sha256",
    "rfd015_package_qa_receipt_sha256",
    "rfd015_package_qa_transcript_sha256",
    "rfd015_package_qa_privacy_corpus_sha256",
  ]) assert.equal(receipt.authoritative[field], null, field);
  assert.equal(validateFormalDeployedApiRestartReceipt(receipt).verdict, BLOCKED_BY_DEPLOYED_API);
});

test("RFD-TUW-016 restart authority is same-process opaque and serialized capability forgeries stay blocked", async () => {
  const blocked = await runFormalDeployedApiRestartQa({
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
    expectedArtifactSha256: ARTIFACT_SHA,
    expectedApiEndpoint: API_ENDPOINT,
  });
  assert.throws(
    () => getFormalDeployedApiRestartCapability(blocked),
    (error) => error.code === "RESTART_CAPABILITY_REQUIRED",
  );
  const forged = {
    schema_version: "law-firm-os.formal-deployed-api-restart-capability.v1",
    restart_receipt_sha256: "d".repeat(64),
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    api_endpoint_sha256: API_ENDPOINT_SHA,
    artifact_sha256: ARTIFACT_SHA,
    rfd015_receipt_sha256: "e".repeat(64),
    rfd015_capability_schema_version: "law-firm-os.formal-deployed-api-authority-capability.v1",
    rfd015_authority_sha256: "f".repeat(64),
    rfd015_api_artifact_sha256: "1".repeat(64),
    rfd015_manifest_sha256: "2".repeat(64),
    rfd015_executed_package_sha256: "3".repeat(64),
    rfd015_transcript_sha256: "4".repeat(64),
    rfd015_package_qa_receipt_sha256: "5".repeat(64),
    rfd015_package_qa_transcript_sha256: "6".repeat(64),
    rfd015_package_qa_privacy_corpus_sha256: "7".repeat(64),
  };
  for (const value of [forged, structuredClone(forged)]) {
    assert.throws(
      () => assertFormalDeployedApiRestartCapability(value),
      (error) => error.code === "RESTART_CAPABILITY_REQUIRED",
    );
  }
});

test("RFD-TUW-016 rejects a hand-authored complete PASS without an opaque RFD015 capability", () => {
  const state = {
    matter: { id: "matter-fabricated", tenant_id: "tenant-fabricated" },
    task: { id: "task-fabricated", matter_id: "matter-fabricated" },
    time: { id: "time-fabricated", matter_id: "matter-fabricated" },
  };
  const digest = "d".repeat(64);
  const fabricated = {
    schema_version: SCHEMA_VERSION,
    checkpoint_id: CHECKPOINT_ID,
    generated_at: "2026-07-31T00:00:00.000Z",
    verdict: "PASS",
    status: "PASS",
    authoritative: {
      rfd015_receipt_present: true,
      rfd015_receipt_sha256: digest,
      rfd015_receipt_schema_version: "law-firm-os.formal-deployed-api-package-qa.v3",
      rfd015_capability_schema_version: "law-firm-os.formal-deployed-api-authority-capability.v1",
      rfd015_authority_sha256: digest,
      rfd015_api_artifact_sha256: digest,
      rfd015_manifest_sha256: digest,
      rfd015_executed_package_sha256: digest,
      rfd015_transcript_sha256: digest,
      rfd015_package_qa_receipt_sha256: digest,
      rfd015_package_qa_transcript_sha256: digest,
      rfd015_package_qa_privacy_corpus_sha256: digest,
    },
    source: { revision: SOURCE_SHA, source_tree: SOURCE_TREE },
    deployed_api: { endpoint_sha256: API_ENDPOINT_SHA, endpoint_kind: "private-staging-deployed-api" },
    artifact: { sha256: ARTIFACT_SHA },
    identity: { user_id: "fabricated-user", tenant_id: "tenant-fabricated", user_data_hash: digest, user_data_fresh: true },
    scenarios: {
      first_login_once: true,
      full_app_exit: true,
      second_launch_session_restored_without_login: true,
      matter_state_durable: true,
      task_state_durable: true,
      time_state_durable: true,
      exact_source_api_artifact_binding: true,
      isolated_user_data: true,
      isolated_tenant: true,
      duplicate_state_zero: true,
      console_errors_zero: true,
    },
    durable_state: {
      before_restart: state,
      after_restart: structuredClone(state),
      state_sha256_before_restart: sha256(state),
      state_sha256_after_restart: sha256(state),
      before_restart_evidence: { matter_count: 1, task_count: 1, time_count: 1, duplicate_state_count: 0 },
      after_restart_evidence: { matter_count: 1, task_count: 1, time_count: 1, duplicate_state_count: 0 },
    },
    diagnostics: {
      console_error_count: 0,
      first_launch_console_error_count: 0,
      second_launch_console_error_count: 0,
      login_call_count: 1,
      second_launch_login_call_count: 0,
      adapter_error: null,
    },
    boundaries: { production_runtime_used: false, operator_token_used: false, api_write_scope: "synthetic-staging-only" },
  };
  assert.throws(
    () => validateFormalDeployedApiRestartReceipt(fabricated),
    (error) => error.code === "AUTHORITATIVE_CAPABILITY_REQUIRED",
  );
});

test("RFD-TUW-016 test-only RFD-TUW-015 helper cannot authorize a restart PASS", async () => {
  const receipt = await runFormalDeployedApiRestartQa({
    ...options(),
    rfd015Receipt: buildSyntheticRfd015Receipt({ sourceSha: SOURCE_SHA, sourceTree: SOURCE_TREE, artifactSha256: ARTIFACT_SHA }),
  });
  assert.equal(receipt.verdict, BLOCKED_BY_DEPLOYED_API);
  assert.equal(receipt.blocked_code, "DEPLOYED_API_RECEIPT_TEST_ONLY");
});

test("RFD-TUW-016 direct callers cannot bypass the canonical RFD-TUW-015 reader", async () => {
  const fakeActualAdapter = {
    ...createSyntheticRestartAdapter({ binding: { source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, artifact_sha256: ARTIFACT_SHA, api_endpoint: API_ENDPOINT } }),
    actual_execution: true,
    test_adapter_used: false,
  };
  const result = await runFormalDeployedApiRestartQa({
    adapter: fakeActualAdapter,
    rfd015Receipt: buildSyntheticRfd015Receipt({ sourceSha: SOURCE_SHA, sourceTree: SOURCE_TREE, artifactSha256: ARTIFACT_SHA, apiEndpoint: API_ENDPOINT }),
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
    expectedArtifactSha256: ARTIFACT_SHA,
    expectedApiEndpoint: API_ENDPOINT,
  });
  assert.equal(result.verdict, BLOCKED_BY_DEPLOYED_API);
  assert.equal(result.blocked_code, "DEPLOYED_API_RECEIPT_TEST_ONLY");
});

test("RFD-TUW-016 rejects a caller adapter before any launch method can run", async () => {
  let launched = false;
  const result = await runFormalDeployedApiRestartQa({
    adapter: {
      actual_execution: true,
      test_adapter_used: false,
      async launch() { launched = true; throw new Error("caller adapter must not run"); },
    },
    rfd015Receipt: { verdict: "PASS" },
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
    expectedArtifactSha256: ARTIFACT_SHA,
    expectedApiEndpoint: API_ENDPOINT,
  });
  assert.equal(result.verdict, "BLOCKED_BY_ARTIFACT");
  assert.equal(result.blocked_code, "RESTART_ADAPTER_INJECTION_REJECTED");
  assert.equal(launched, false);
});

test("RFD-TUW-016 process lifecycle requires an OS exit observer, zero exit, and bounded wait", async () => {
  await assert.rejects(
    observeFormalDeployedApiRestartProcessExit({ exit() {} }, "missing-wait", 5),
    (error) => error.code === "FULL_EXIT_UNPROVEN",
  );
  const nonZero = {
    processExitTimeoutMs: 20,
    async exit() {},
    async waitForProcessExit() { return { exited: true, exit_code: 17 }; },
  };
  const state = await closeFormalDeployedApiRestartProcess(nonZero, "non-zero");
  assert.equal(state.exit_code, 17);
  assert.throws(() => assertFormalDeployedApiRestartProcessExit(state, "non-zero"), (error) => error.code === "FULL_EXIT_UNPROVEN");
  const never = {
    processExitTimeoutMs: 5,
    async exit() {},
    async waitForProcessExit() { return new Promise(() => {}); },
  };
  await assert.rejects(closeFormalDeployedApiRestartProcess(never, "timeout"), (error) => error.code === "FULL_EXIT_UNPROVEN");
  await assert.rejects(
    cleanupFormalDeployedApiRestartProcess({ async exit() {}, async waitForProcessExit() { return { exited: true, exit_code: 3 }; } }, "cleanup-non-zero"),
    (error) => error.code === "PROCESS_CLEANUP_FAILED",
  );
  await assert.rejects(
    cleanupFormalDeployedApiRestartProcess({ async exit() {} }, "cleanup-missing-wait"),
    (error) => error.code === "PROCESS_CLEANUP_FAILED",
  );
});

test("RFD-TUW-016 TEST_ONLY lifecycle harness observes a disposable Node process exit", async () => {
  const child = spawn(process.execPath, ["-e", "setTimeout(() => process.exit(0), 10)"], { stdio: "ignore" });
  const handle = {
    processExitTimeoutMs: 1_000,
    async exit() {},
    waitForProcessExit() {
      if (Number.isInteger(child.exitCode)) return Promise.resolve({ exited: true, exit_code: child.exitCode });
      return new Promise((resolveExit, rejectExit) => {
        child.once("exit", (code) => resolveExit({ exited: true, exit_code: code }));
        child.once("error", rejectExit);
      });
    },
  };
  const state = await closeFormalDeployedApiRestartProcess(handle, "TEST_ONLY disposable Node");
  assertFormalDeployedApiRestartProcessExit(state, "TEST_ONLY disposable Node");
});

test("RFD-TUW-016 direct adapter readback harness rejects wrong Matter relation and duplicates", () => {
  const matterId = "matter-rfd016-test-only-001";
  const base = {
    matterRows: [{ matter_id: matterId, tenant_id: "tenant_lawos_staging_cut007_a" }],
    taskRows: [{ id: "task-1", matter_id: matterId }],
    timeRows: [{ id: "time-1", matter_id: matterId }],
    matterId,
    tenantId: "tenant_lawos_staging_cut007_a",
  };
  const good = inspectFormalRestartDurableReadback(base);
  assert.deepEqual(good.state, {
    matter: { id: matterId, tenant_id: "tenant_lawos_staging_cut007_a" },
    task: { id: "task-1", matter_id: matterId },
    time: { id: "time-1", matter_id: matterId },
  });
  assert.deepEqual(good.evidence, { matter_count: 1, task_count: 1, time_count: 1, duplicate_state_count: 0 });
  assert.throws(
    () => inspectFormalRestartDurableReadback({ ...base, taskRows: [{ id: "task-1", matter_id: "matter-other" }] }),
    (error) => error.code === "DURABLE_STATE_RELATIONSHIP_MISMATCH",
  );
  assert.throws(
    () => inspectFormalRestartDurableReadback({ ...base, taskRows: [...base.taskRows, { id: "task-1", matter_id: matterId }] }),
    (error) => error.code === "DUPLICATE_DURABLE_STATE",
  );
});

test("RFD-TUW-016 direct adapter harness binds Monday week start and actual userData paths", () => {
  assert.equal(formalRestartMondayFor("2026-08-02"), "2026-07-27");
  assert.equal(formalRestartMondayFor("2026-08-03"), "2026-08-03");
  const actualPath = "/tmp/rfd016-test-only-profile-canonical";
  const denied = {
    status: 400,
    body: {
      outcome: "blocked",
      safe_error_code: "HRX_QUERY_CONTEXT_FORBIDDEN",
      forbidden_query_keys: ["tenant_id"],
    },
  };
  const same = inspectFormalRestartIsolation({
    denied,
    session: { tenant_id: "tenant_lawos_staging_cut007_a" },
    handles: [
      { userDataId: "logical-profile-id", userDataPath: actualPath },
      { userDataId: "logical-profile-id", userDataPath: actualPath },
    ],
    requestedUserDataId: "logical-profile-id",
    expectedUserDataPath: actualPath,
    tenantId: "tenant_lawos_staging_cut007_a",
  });
  assert.equal(same.cross_mix, false);
  assert.equal(same.user_data_match, true);
  assert.equal(same.user_data_hash, sha256(actualPath));
  const changedPath = inspectFormalRestartIsolation({
    denied,
    session: { tenant_id: "tenant_lawos_staging_cut007_a" },
    handles: [
      { userDataId: "logical-profile-id", userDataPath: actualPath },
      { userDataId: "logical-profile-id", userDataPath: `${actualPath}-changed` },
    ],
    requestedUserDataId: "logical-profile-id",
    expectedUserDataPath: actualPath,
    tenantId: "tenant_lawos_staging_cut007_a",
  });
  assert.equal(changedPath.cross_mix, true);
  const foreign = inspectFormalRestartIsolation({
    denied: { ...denied, body: { ...denied.body, employees: [{ id: "foreign-employee" }] } },
    session: { tenant_id: "tenant_lawos_staging_cut007_a" },
    handles: [
      { userDataId: "logical-profile-id", userDataPath: actualPath },
      { userDataId: "logical-profile-id", userDataPath: actualPath },
    ],
    requestedUserDataId: "logical-profile-id",
    expectedUserDataPath: actualPath,
    tenantId: "tenant_lawos_staging_cut007_a",
  });
  assert.equal(foreign.cross_mix, true);
  assert.deepEqual(foreign.foreign_state_ids, ["foreign-employee"]);
});

test("RFD-TUW-016 portable authority paths accept local Windows files and reject UNC/traversal", () => {
  assert.equal(isFormalDeployedApiRestartAbsolutePath("C:\\Users\\qa\\matter.exe", "win32"), true);
  assert.equal(isFormalDeployedApiRestartAbsolutePath("C:/Users/qa/matter.exe", "win32"), true);
  assert.equal(isFormalDeployedApiRestartAbsolutePath("\\\\server\\share\\matter.exe", "win32"), false);
  assert.equal(isFormalDeployedApiRestartAbsolutePath("C:\\Users\\qa\\..\\matter.exe", "win32"), false);
  assert.equal(isFormalDeployedApiRestartAbsolutePath("/tmp/matter", "darwin"), true);
});

test("RFD-TUW-016 non-authoritative TEST_ONLY evaluator reaches state machine but cannot mint PASS", async () => {
  const adapter = createSyntheticRestartAdapter({
    binding: { source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, artifact_sha256: ARTIFACT_SHA, api_endpoint_sha256: API_ENDPOINT_SHA },
  });
  const result = await runFormalDeployedApiRestartQaTestOnly({
    adapter,
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    artifactSha256: ARTIFACT_SHA,
    apiEndpointSha256: API_ENDPOINT_SHA,
  });
  assert.equal(result.verdict, BLOCKED_BY_DEPLOYED_API);
  assert.equal(result.blocked_code, "SYNTHETIC_MODE_TEST_ONLY");
  assert.throws(() => getFormalDeployedApiRestartCapability(result), (error) => error.code === "RESTART_CAPABILITY_REQUIRED");
  assert.throws(() => getFormalDeployedApiRestartCapability(structuredClone(result)), (error) => error.code === "RESTART_CAPABILITY_REQUIRED");
});

for (const [name, options, expectedCode] of [
  ["changed actual Electron userData", { changedActualUserData: true }, "ISOLATION_MIX"],
  ["foreign tenant rows", { foreignRows: true }, "ISOLATION_MIX"],
  ["second exit non-zero", { nonZeroExit: true }, "FULL_EXIT_UNPROVEN"],
  ["second exit observer rejection", { rejectExit: true }, "FULL_EXIT_UNPROVEN"],
]) {
  test(`RFD-TUW-016 TEST_ONLY evaluator rejects ${name}`, async () => {
    const adapter = createSyntheticRestartAdapter({
      binding: { source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, artifact_sha256: ARTIFACT_SHA, api_endpoint_sha256: API_ENDPOINT_SHA },
      ...options,
    });
    const result = await runFormalDeployedApiRestartQaTestOnly({ adapter, sourceSha: SOURCE_SHA, sourceTree: SOURCE_TREE, artifactSha256: ARTIFACT_SHA, apiEndpointSha256: API_ENDPOINT_SHA });
    assert.equal(result.verdict, "FAIL");
    assert.equal(result.blocked_code, expectedCode);
  });
}

test("RFD-TUW-016 refuses a loopback or non-PASS RFD-TUW-015 receipt as deployed API authority", async () => {
  const blocked = await runFormalDeployedApiRestartQa({
    ...options(),
    rfd015Receipt: buildSyntheticRfd015Receipt({ sourceSha: SOURCE_SHA, sourceTree: SOURCE_TREE, artifactSha256: ARTIFACT_SHA, apiEndpoint: "http://127.0.0.1:4180" }),
  });
  assert.equal(blocked.verdict, BLOCKED_BY_DEPLOYED_API);
  assert.equal(blocked.blocked_code, "DEPLOYED_API_RECEIPT_TEST_ONLY");
});

test("RFD-TUW-016 source and artifact drift are blocked before any adapter launch", async () => {
  const sourceDrift = await runFormalDeployedApiRestartQa({ ...options(), expectedSourceSha: "d".repeat(40) });
  const artifactDrift = await runFormalDeployedApiRestartQa({ ...options(), expectedArtifactSha256: "e".repeat(64) });
  assert.equal(sourceDrift.verdict, BLOCKED_BY_DEPLOYED_API);
  assert.equal(artifactDrift.verdict, BLOCKED_BY_DEPLOYED_API);
});

test("RFD-TUW-016 fails closed when binding, isolation, console, or login metrics are not proven", async () => {
  const result = await runFormalDeployedApiRestartQa({
    ...options(),
    adapter: createSyntheticRestartAdapter({ binding: { source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, artifact_sha256: ARTIFACT_SHA, api_endpoint: API_ENDPOINT } }),
  });
  assert.equal(result.verdict, BLOCKED_BY_DEPLOYED_API);
  assert.equal(result.blocked_code, "DEPLOYED_API_RECEIPT_TEST_ONLY");
});

for (const [name, adapterOptions, code] of [
  ["stale session", { staleSession: true }, "SESSION_NOT_RESTORED"],
  ["changed userData", { changedUserData: true }, "USER_DATA_MIX"],
  ["changed tenant", { changedTenant: true }, "TENANT_MIX"],
  ["missing durable state", { missingDurableState: true }, "DURABLE_STATE_MISSING"],
  ["duplicate durable state", { duplicateState: true }, "DUPLICATE_DURABLE_STATE"],
  ["console errors", { consoleErrors: ["render error"] }, "CONSOLE_ERRORS_PRESENT"],
  ["no-op exit", { noOpExit: true }, "FULL_EXIT_UNPROVEN"],
  ["runtime source mismatch", { sourceMismatch: true }, "RUNTIME_BINDING_MISMATCH"],
]) {
  test(`RFD-TUW-016 adversarial fake adapter rejects ${name}`, async () => {
    const result = await runFormalDeployedApiRestartQa(options({
      adapter: createSyntheticRestartAdapter({
        binding: { source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, artifact_sha256: ARTIFACT_SHA, api_endpoint: API_ENDPOINT },
        ...adapterOptions,
      }),
    }));
    assert.equal(result.verdict, BLOCKED_BY_DEPLOYED_API);
    assert.equal(result.blocked_code, "DEPLOYED_API_RECEIPT_TEST_ONLY");
    assert.notEqual(result.diagnostics.adapter_error.code, code);
    assert.doesNotMatch(JSON.stringify(result), /render error|lawos_session_v1|password|secret/iu);
  });
}

test("RFD-TUW-016 blocked validator rejects secret diagnostics and scenario overclaims", async () => {
  const blocked = await runFormalDeployedApiRestartQa({ expectedSourceSha: SOURCE_SHA, expectedSourceTree: SOURCE_TREE, expectedArtifactSha256: ARTIFACT_SHA, expectedApiEndpoint: API_ENDPOINT });
  const secret = structuredClone(blocked);
  secret.diagnostics.adapter_error.message = "secret: lawos_session_v1.real";
  assert.throws(() => validateFormalDeployedApiRestartReceipt(secret), (error) => error.code === "SECRET_MATERIAL");
  const scenario = structuredClone(blocked);
  scenario.scenarios.full_app_exit = true;
  assert.throws(() => validateFormalDeployedApiRestartReceipt(scenario), (error) => error.code === "SCENARIO_OVERSTATED");
});

test("RFD-TUW-016 validator rejects dishonest blocked receipts with nested PASS claims", async () => {
  const blocked = await runFormalDeployedApiRestartQa({ expectedSourceSha: SOURCE_SHA, expectedSourceTree: SOURCE_TREE, expectedArtifactSha256: ARTIFACT_SHA, expectedApiEndpoint: API_ENDPOINT });
  for (const [name, mutate, code] of [
    ["authority", (value) => { value.authoritative.rfd015_receipt_present = true; }, "AUTHORITATIVE_RECEIPT_OVERSTATED"],
    ["scenario", (value) => { value.scenarios.first_login_once = true; }, "SCENARIO_OVERSTATED"],
    ["production boundary", (value) => { value.boundaries.production_runtime_used = true; }, "BOUNDARY_VIOLATION"],
    ["diagnostic", (value) => { value.diagnostics.console_error_count = 0; }, "DIAGNOSTIC_OVERSTATED"],
  ]) {
    const mutated = structuredClone(blocked);
    mutate(mutated);
    assert.throws(() => validateFormalDeployedApiRestartReceipt(mutated), (error) => error.code === code, name);
  }
});

test("RFD-TUW-016 CLI adapter fixture is explicitly test-only and cannot emit PASS", () => {
  const root = mkdtempSync(join(tmpdir(), "rfd016-cli-"));
  try {
    const adapterFixturePath = join(root, "adapter-fixture.json");
    const receiptPath = join(root, "rfd016.json");
    writeFileSync(adapterFixturePath, `${JSON.stringify({
      schema_version: ADAPTER_FIXTURE_SCHEMA,
      binding: { source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, api_endpoint_sha256: API_ENDPOINT_SHA, artifact_sha256: ARTIFACT_SHA },
      options: {},
    })}\n`, { mode: 0o600 });
    const runner = spawnSync(process.execPath, [
      "scripts/run-formal-deployed-api-restart-qa.mjs",
      "--adapter-fixture", adapterFixturePath,
      "--receipt", receiptPath,
      "--source-sha", SOURCE_SHA,
      "--source-tree", SOURCE_TREE,
      "--artifact-sha256", ARTIFACT_SHA,
      "--api-endpoint", API_ENDPOINT,
    ], { cwd: process.cwd(), encoding: "utf8" });
    assert.equal(runner.status, 2, runner.stderr);
    const written = JSON.parse(readFileSync(receiptPath, "utf8"));
    assert.equal(written.verdict, BLOCKED_BY_DEPLOYED_API);
    assert.equal(written.blocked_code, "SYNTHETIC_MODE_TEST_ONLY");
    assert.doesNotMatch(JSON.stringify(written), /(?:session_token|access_token|refresh_token|password\s*[:=]|secret\s*[:=]|lawos_session_v1)/iu);
    const validator = spawnSync(process.execPath, [
      "scripts/validate-formal-deployed-api-restart-qa.mjs",
      "--receipt", receiptPath,
    ], { cwd: process.cwd(), encoding: "utf8" });
    assert.equal(validator.status, 2, validator.stderr);
    assert.equal(JSON.parse(validator.stdout).verdict, BLOCKED_BY_DEPLOYED_API);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("RFD-TUW-016 --synthetic is always an honest deployed-API blocker", () => {
  const root = mkdtempSync(join(tmpdir(), "rfd016-cli-synthetic-"));
  try {
    const receiptPath = join(root, "rfd016.json");
    const runner = spawnSync(process.execPath, [
      "scripts/run-formal-deployed-api-restart-qa.mjs",
      "--synthetic",
      "--receipt", receiptPath,
      "--source-sha", SOURCE_SHA,
      "--source-tree", SOURCE_TREE,
      "--artifact-sha256", ARTIFACT_SHA,
      "--api-endpoint", API_ENDPOINT,
    ], { cwd: process.cwd(), encoding: "utf8" });
    assert.equal(runner.status, 2, runner.stderr);
    const written = JSON.parse(readFileSync(receiptPath, "utf8"));
    assert.equal(written.verdict, BLOCKED_BY_DEPLOYED_API);
    assert.equal(written.blocked_code, "SYNTHETIC_MODE_TEST_ONLY");
    validateFormalDeployedApiRestartReceipt(written);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("RFD-TUW-016 CLI without RFD-TUW-015 authority writes an honest deployed-API blocker", () => {
  const root = mkdtempSync(join(tmpdir(), "rfd016-cli-blocked-"));
  try {
    const receiptPath = join(root, "rfd016.json");
    const runner = spawnSync(process.execPath, [
      "scripts/run-formal-deployed-api-restart-qa.mjs",
      "--synthetic",
      "--receipt", receiptPath,
      "--source-sha", SOURCE_SHA,
      "--artifact-sha256", ARTIFACT_SHA,
      "--api-endpoint", API_ENDPOINT,
    ], { cwd: process.cwd(), encoding: "utf8" });
    assert.equal(runner.status, 2, runner.stderr);
    const written = JSON.parse(readFileSync(receiptPath, "utf8"));
    assert.equal(written.verdict, BLOCKED_BY_DEPLOYED_API);
    assert.equal(written.authoritative.rfd015_receipt_present, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("RFD-TUW-016 CLI rejects an unallowlisted adapter module instead of trusting self-reported execution", () => {
  const root = mkdtempSync(join(tmpdir(), "rfd016-cli-module-"));
  try {
    const modulePath = join(root, "fake-adapter.mjs");
    const receiptPath = join(root, "rfd016.json");
    writeFileSync(modulePath, "export const actual_execution=true; export const test_adapter_used=false; export function createAdapter(){ return {}; }\n", { mode: 0o600 });
    const runner = spawnSync(process.execPath, [
      "scripts/run-formal-deployed-api-restart-qa.mjs",
      "--adapter-module", modulePath,
      "--receipt", receiptPath,
    ], { cwd: process.cwd(), encoding: "utf8" });
    assert.equal(runner.status, 1);
    assert.match(runner.stderr, /ADAPTER_MODULE_UNAVAILABLE/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("RFD-TUW-016 standalone CLI cannot carry opaque chain capabilities", () => {
  const root = mkdtempSync(join(tmpdir(), "rfd016-cli-chain-required-"));
  try {
    const receiptPath = join(root, "rfd016.json");
    const runner = spawnSync(process.execPath, [
      "scripts/run-formal-deployed-api-restart-qa.mjs",
      "--receipt", receiptPath,
      "--rfd015-receipt", join(root, "rfd015.json"),
    ], { cwd: process.cwd(), encoding: "utf8" });
    assert.equal(runner.status, 1);
    assert.match(runner.stderr, /CHAIN_REQUIRED/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
