import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  DESKTOP_RENDERER_DIGEST_ALGORITHM,
  createDesktopBuildManifest,
} from "../lib/matter-desktop-provenance.mjs";
import {
  FORMAL_PACKAGE_LOOPBACK_TRANSCRIPT_SCHEMA,
  FORMAL_PACKAGE_LOOPBACK_QA_LIMITATION,
  FORMAL_PACKAGE_LOOPBACK_QA_SCHEMA,
  assertFormalPackageLaunchEnvironment,
  assertFormalPackageManifest,
  assertIsolatedLoopbackBaseUrl,
  formalLoopbackApiEnvironment,
  formalPackageLaunchEnvironment,
  recordFormalPackageLoopbackRequests,
  readFormalPackageLoopbackLivePrivacyValidations,
  readFormalPackageLoopbackNativeQaReceipt,
  redactFormalPackageDiagnostic,
  runFormalPackageMatterScenario,
  startFormalPackageLoopbackApi,
  validateFormalPackageLoopbackNativeQaCapability,
  validateFormalPackageLoopbackTranscript,
  validateFormalPackageLoopbackQaReceipt,
  writeFormalPackageLoopbackQaReceipt,
} from "../lib/formal-package-loopback-qa.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SOURCE_SHA = "1".repeat(40);
const SOURCE_TREE = "2".repeat(40);
const ARTIFACT_SHA = "3".repeat(64);
const MANIFEST_SHA = "4".repeat(64);
const RENDERER_SHA = "5".repeat(64);
const SCREENSHOT_SHA = "6".repeat(64);
const EXECUTED_PACKAGE_SHA = "7".repeat(64);
const MEMBER_DIGEST_SHA = "8".repeat(64);
const PRIVACY_CORPUS_SHA = "9".repeat(64);
const PRIVACY_EXPANDED_SHA = "a".repeat(64);
const PRIVACY_PACKAGED_SHA = "b".repeat(64);
const TRANSCRIPT_SHA = "c".repeat(64);
const ZIP_SHA = "d".repeat(64);
const manifestOptions = {
  expectedSourceSha: SOURCE_SHA,
  expectedSourceTree: SOURCE_TREE,
  expectedPlatform: "darwin",
  expectedVersion: "0.1.17",
};

function manifest(overrides = {}) {
  return {
    ...createDesktopBuildManifest({
      version: "0.1.17",
      sourceSha: SOURCE_SHA,
      sourceTree: SOURCE_TREE,
      sourceDirty: false,
      renderer: { sha256: RENDERER_SHA, file_count: 12, algorithm: DESKTOP_RENDERER_DIGEST_ALGORITHM },
      channel: "formal",
      platform: "darwin",
      arch: "arm64",
      appId: "com.amic.matter.desktop",
      requestedRuntimeMode: "none",
      effectiveRuntimeMode: "none",
      runtimeIncluded: false,
      runtimeDataClass: "none",
      nonDistributable: false,
      distributable: true,
      builtAt: "2026-07-31T00:00:00.000Z",
    }),
    ...overrides,
  };
}

function fileReference(filePath, sha256, scope = "repository", bytes = 128) {
  return { scope, path: filePath, sha256, bytes };
}

function action(sequence, method, path, status, bodyAction = null) {
  return {
    ui_action_present: true,
    request: { sequence, method, path, status, body_action: bodyAction },
  };
}

function receipt(overrides = {}) {
  const base = {
    schema_version: FORMAL_PACKAGE_LOOPBACK_QA_SCHEMA,
    tuw_id: "RFD-TUW-014",
    platform: "macos",
    generated_at: "2026-07-31T00:00:00.000Z",
    verdict: "PASS",
    native_verdict: "PASS",
    evidence_scope: "local_exact_source_loopback_only",
    source: {
      revision: SOURCE_SHA,
      source_tree: SOURCE_TREE,
      source_dirty: false,
      renderer: { sha256: RENDERER_SHA, file_count: 12, algorithm: DESKTOP_RENDERER_DIGEST_ALGORITHM },
    },
    bindings: {
      package_artifact: fileReference("artifact.dmg", ARTIFACT_SHA),
      executed_package: {
        kind: "macos_dmg_member_executable",
        member_path: "matter.app/Contents/MacOS/matter",
        sha256: EXECUTED_PACKAGE_SHA,
        bytes: 256,
        member_digest_sha256: MEMBER_DIGEST_SHA,
      },
      package_manifest: {
        ...fileReference("manifest.json", MANIFEST_SHA),
        embedded_member_path: "matter.app/Contents/Resources/matter-build-manifest.json",
        source_sha: SOURCE_SHA,
        source_tree: SOURCE_TREE,
        renderer_sha256: RENDERER_SHA,
      },
      loopback_api: {
        source_sha: SOURCE_SHA,
        source_tree: SOURCE_TREE,
        health_source_sha: SOURCE_SHA,
        fixture_id: "rfd-tuw-014-synthetic",
      },
      runner_transcript: fileReference("transcript.json", TRANSCRIPT_SHA, "evidence"),
      artifact_privacy: {
        corpus_sha256: PRIVACY_CORPUS_SHA,
        receipts: [
          fileReference("privacy-expanded.json", PRIVACY_EXPANDED_SHA, "evidence"),
          fileReference("privacy-packaged.json", PRIVACY_PACKAGED_SHA, "evidence"),
        ],
      },
      all_source_sha_equal: true,
    },
    package: {
      channel: "formal",
      app_id: "com.amic.matter.desktop",
      thin_client: true,
      runtime_data_mode: "none",
      runtime_data_class: "none",
      bundled_local_api_present: false,
      private_local_runtime_present: false,
      operator_token_present: false,
      formal_local_api_default_disabled: true,
      bundle_member_path: "matter.app",
      artifacts: [
        { role: "dmg", ...fileReference("artifact.dmg", ARTIFACT_SHA) },
        { role: "zip", ...fileReference("artifact.zip", ZIP_SHA) },
        { role: "manifest", ...fileReference("manifest.json", MANIFEST_SHA) },
      ],
      distribution: {
        app_codesign: "pass",
        app_gatekeeper: "pass",
        app_stapler: "pass",
        dmg_codesign: "pass",
        dmg_gatekeeper: "pass",
        dmg_stapler: "pass",
        dmg_image: "pass",
      },
    },
    runtime: {
      mode: "production-auth-http",
      topology: "thin-client",
      base_url_kind: "isolated_loopback_nonpackaged",
      base_url: "http://127.0.0.1:4812",
      api_profile: "local-dev-synthetic-only",
      operator_token_used: false,
      secret_env_injection_count: 0,
      external_network_request_count: 0,
      aws_request_count: 0,
      health_status: 200,
    },
    fixture: {
      synthetic_only: true,
      people_count: 10,
      real_identity_count: 0,
      profile_photo_or_initials_count: 10,
      profile_photo_count: 4,
      profile_initials_count: 6,
    },
    scenarios: {
      forest_login_rendered: true,
      signed_in: true,
      profile_populated: true,
      people_roster_rendered: true,
      people_profile_photo_or_initials_complete: true,
      matter_queue_rendered: true,
      matter_task_created: true,
      matter_time_created: true,
      matter_time_week_locked: true,
      matter_wip_created: true,
      matter_billing_created: true,
      leave_rendered: true,
      payroll_rendered: true,
      restart_session_restored: true,
    },
    action_evidence: {
      matter_queue: { visible_count: 1, seeded_task_id: "task-rfd-tuw-014-queue" },
      matter_task: action(10, "POST", "/api/matter/ops/tasks", 201),
      matter_time: action(11, "POST", "/api/matter/ops/time-entries", 201),
      matter_time_week_submit: action(12, "POST", "/api/matter/ops/time-weeks/submit", 200),
      matter_time_week_lock: action(13, "POST", "/api/matter/ops/time-weeks/lock", 200),
      matter_wip: action(14, "POST", "/api/matter/ops/wip", 201, "generate"),
      matter_billing: action(15, "POST", "/api/matter/ops/wip", 201, "prebill"),
    },
    screenshots: [{ name: "screen", ...fileReference("screen.png", SCREENSHOT_SHA, "evidence", 256) }],
    diagnostics: { page_error_count: 0, console_error_count: 0, external_request_count: 0 },
    execution: {
      classification: "ACTUAL_NATIVE_RUNNER",
      runner_capability: "native-macos-dmg",
      process_invocation_count: 3,
      package_launch_count: 2,
      adapter_invocation_count: 6,
    },
    boundaries: {
      private_local_runtime_used: false,
      real_employee_write: false,
      staging_runtime_used: false,
      production_runtime_used: false,
      aws_write: false,
      staging_evidence: false,
      production_evidence: false,
      deployment_evidence: false,
      public_release_claim: false,
      production_go_live_claim: false,
      windows_native_claim: false,
      authenticode_claim: false,
      limitation: FORMAL_PACKAGE_LOOPBACK_QA_LIMITATION,
    },
    authenticode: null,
  };
  return { ...base, ...overrides };
}

function transcript(overrides = {}) {
  const observedActions = Object.values(receipt().action_evidence)
    .filter(({ request }) => request)
    .map(({ request }) => ({ ...request, remote_loopback: true }));
  return {
    schema_version: FORMAL_PACKAGE_LOOPBACK_TRANSCRIPT_SCHEMA,
    tuw_id: "RFD-TUW-014",
    platform: "macos",
    started_at: "2026-07-31T00:00:00.000Z",
    finished_at: "2026-07-31T00:01:00.000Z",
    source: { revision: SOURCE_SHA, source_tree: SOURCE_TREE },
    artifacts: {
      package_artifact_sha256: ARTIFACT_SHA,
      executed_package_sha256: EXECUTED_PACKAGE_SHA,
      executed_member_digest_sha256: MEMBER_DIGEST_SHA,
      manifest_sha256: MANIFEST_SHA,
      privacy_receipt_sha256s: [PRIVACY_EXPANDED_SHA, PRIVACY_PACKAGED_SHA],
    },
    runtime: {
      base_url: "http://127.0.0.1:4812",
      mode: "production-auth-http",
      topology: "thin-client",
      health_source_sha: SOURCE_SHA,
    },
    execution: { ...receipt().execution },
    requests: [
      ...Array.from({ length: 9 }, (_, index) => ({
        sequence: index + 1,
        method: "GET",
        path: `/api/test/${index + 1}`,
        status: 200,
        body_action: null,
        remote_loopback: true,
      })),
      ...observedActions,
    ],
    screenshots: [{ sequence: 1, name: "screen", path: "screen.png", sha256: SCREENSHOT_SHA, bytes: 256 }],
    diagnostics: { page_errors: [], console_errors: [], external_requests: [], aws_request_count: 0 },
    ...overrides,
  };
}

const options = {
  expectedPlatform: "macos",
  expectedSourceSha: SOURCE_SHA,
  expectedSourceTree: SOURCE_TREE,
  expectedArtifactSha256: ARTIFACT_SHA,
  expectedExecutedPackageSha256: EXECUTED_PACKAGE_SHA,
  expectedManifestSha256: MANIFEST_SHA,
};
const transcriptOptions = {
  platform: "macos",
  sourceSha: SOURCE_SHA,
  sourceTree: SOURCE_TREE,
  artifactSha256: ARTIFACT_SHA,
  executedPackageSha256: EXECUTED_PACKAGE_SHA,
  manifestSha256: MANIFEST_SHA,
  executedMemberDigestSha256: MEMBER_DIGEST_SHA,
  privacyReceiptSha256s: [PRIVACY_EXPANDED_SHA, PRIVACY_PACKAGED_SHA],
};

function scenarioPage() {
  const locator = (selector = "") => ({
    async waitFor() {},
    locator(child) { return locator(`${selector} ${child}`); },
    getByRole(_role, options = {}) { return locator(`${selector} role=${options.name ?? ""}`); },
    getByLabel(label) { return locator(`${selector} label=${label}`); },
    getByText(text) { return locator(`${selector} text=${text}`); },
    filter() { return locator(selector); },
    first() { return locator(selector); },
    last() { return locator(selector); },
    async click() {},
    async fill() {},
    async selectOption() {},
    async getAttribute(name) { return name === "aria-selected" ? "true" : null; },
    async count() {
      if (selector.includes("live-data-error")) return 0;
      if (selector.includes("matter-ops-priority-row")) return 1;
      return 1;
    },
    async evaluateAll() {
      return Array.from({ length: 10 }, (_, index) => ({ photo: index < 5, initials: index < 5 ? "" : `P${index + 1}` }));
    },
  });
  return {
    locator,
    async waitForFunction() {},
  };
}

function scenarioRuntime() {
  let sequence = 0;
  return {
    account: { user_id: "synthetic-user-1" },
    fixture: { safe_counts: { real_identity_count: 0 } },
    scenario: {
      seeded_task_id: "task-rfd-tuw-014-queue",
      matter_id: "matter-rfd-tuw-014",
      matter_code: "RFD-014-2026-001",
    },
    requests: {
      checkpoint: () => sequence,
      waitFor: async ({ method, path: requestPath, status, bodyAction }) => ({
        sequence: ++sequence,
        method,
        path: requestPath,
        status,
        body: bodyAction ? { action: bodyAction } : null,
      }),
    },
  };
}

test("RFD-TUW-014 accepts only a numeric isolated loopback endpoint", () => {
  assert.equal(assertIsolatedLoopbackBaseUrl("http://127.0.0.1:4812"), "http://127.0.0.1:4812");
  for (const endpoint of [
    "http://0.0.0.0:4812",
    "http://localhost:4812",
    "https://127.0.0.1:4812",
    "http://127.0.0.1:4812/staging",
    "http://user:secret@127.0.0.1:4812",
  ]) assert.throws(() => assertIsolatedLoopbackBaseUrl(endpoint));
});

test("RFD-TUW-014 package environment strips tokens, AWS variables, and private runtime controls", () => {
  const env = formalPackageLaunchEnvironment({
    baseEnv: {
      PATH: "/usr/bin",
      AWS_ACCESS_KEY_ID: "must-not-cross",
      DATABASE_URL: "postgres://user:password@example.invalid/db",
      HTTP_PROXY: "http://proxy.example.invalid",
      HTTPS_PROXY: "http://proxy.example.invalid",
      ALL_PROXY: "socks5://proxy.example.invalid",
      NO_PROXY: "127.0.0.1",
      SSH_AUTH_SOCK: "/tmp/agent.sock",
      LAWOS_SESSION_SECRET: "must-not-cross",
      MATTER_DESKTOP_OPERATOR_TOKEN: "must-not-cross",
      MATTER_DESKTOP_RUNTIME_MODE: "private-local",
      MATTER_VAULT_R4_OPERATOR_TOKEN: "must-not-cross",
      NODE_OPTIONS: "--require injected.js",
      UNCLASSIFIED_RUNTIME_INJECTION: "must-not-cross",
    },
    baseUrl: "http://127.0.0.1:4812",
    userDataPath: "/tmp/formal-user-data",
    envPath: "/tmp/formal-empty.env",
  });
  assert.deepEqual(Object.keys(env).sort(), [
    "MATTER_DESKTOP_ENV_FILE",
    "MATTER_DESKTOP_LOCAL_API_DISABLED",
    "MATTER_DESKTOP_RUNTIME_BASE_URL",
    "MATTER_DESKTOP_USER_DATA_PATH",
    "PATH",
  ]);
  assert.deepEqual(assertFormalPackageLaunchEnvironment(env), {
    secret_env_injection_count: 0,
    operator_token_env_count: 0,
  });
  assert.throws(() => assertFormalPackageLaunchEnvironment({
    ...env,
    MATTER_DESKTOP_OPERATOR_TOKEN: "injected",
  }), /secret-like key|unsupported desktop key/u);
  assert.throws(() => assertFormalPackageLaunchEnvironment({
    ...env,
    UNCLASSIFIED_RUNTIME_INJECTION: "injected",
  }), /unsupported base key/u);
});

test("RFD-TUW-014 loopback API environment keeps only its synthetic source contract", () => {
  const syntheticEnv = {
    LAWOS_DATA_SCOPE: "synthetic-only",
    LAWOS_DEPLOYMENT_COMMIT: SOURCE_SHA,
    LAWOS_HRX_MEMBER_CONTACT_SOURCE_PATH: "/tmp/synthetic/contacts.json",
    LAWOS_HRX_MEMBER_PHOTO_SOURCE_PATH: "/tmp/synthetic/photos",
    LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH: "/tmp/synthetic/roster.json",
    LAWOS_IDENTITY_TENANT_ID: "tenant-rfd-tuw-014-synthetic",
  };
  const env = formalLoopbackApiEnvironment({
    baseEnv: {
      PATH: "/usr/bin",
      AWS_PROFILE: "must-not-cross",
      DATABASE_URL: "postgres://user:password@example.invalid/db",
      PGHOST: "database.example.invalid",
      MYSQL_HOST: "database.example.invalid",
      HTTP_PROXY: "http://proxy.example.invalid",
      HTTPS_PROXY: "http://proxy.example.invalid",
      ALL_PROXY: "socks5://proxy.example.invalid",
      NO_PROXY: "127.0.0.1",
      SSH_AUTH_SOCK: "/tmp/agent.sock",
      GOOGLE_APPLICATION_CREDENTIALS: "/tmp/cloud.json",
      UNCLASSIFIED_MODE_SWITCH: "private",
      GITHUB_TOKEN: "must-not-cross",
      LAWOS_SESSION_SECRET: "must-not-cross",
      MATTER_DESKTOP_OPERATOR_TOKEN: "must-not-cross",
      MATTER_OPERATOR_TOKEN: "must-not-cross",
      NODE_OPTIONS: "--require injected.js",
    },
    syntheticEnv,
  });
  assert.deepEqual(env, { PATH: "/usr/bin", ...syntheticEnv });
  assert.throws(() => formalLoopbackApiEnvironment({
    baseEnv: {},
    syntheticEnv: { ...syntheticEnv, MATTER_OPERATOR_TOKEN: "injected" },
  }), /only the synthetic source contract/u);
});

test("RFD-TUW-014 request evidence comes from completed loopback request events", () => {
  const server = new EventEmitter();
  const recorder = recordFormalPackageLoopbackRequests(server);
  const request = new EventEmitter();
  Object.assign(request, {
    method: "POST",
    url: "/api/matter/ops/wip",
    socket: { remoteAddress: "127.0.0.1" },
  });
  const response = new EventEmitter();
  response.statusCode = 201;
  server.emit("request", request, response);
  request.emit("data", Buffer.from('{"action":"generate"}'));
  request.emit("end");
  response.emit("finish");
  assert.deepEqual(recorder.snapshot(), [{
    sequence: 1,
    method: "POST",
    path: "/api/matter/ops/wip",
    status: 201,
    body_action: "generate",
    remote_loopback: true,
  }]);

  const cancelledRequest = new EventEmitter();
  Object.assign(cancelledRequest, {
    method: "POST",
    url: "/api/matter/ops/tasks",
    socket: { remoteAddress: "127.0.0.1" },
  });
  const cancelledResponse = new EventEmitter();
  cancelledResponse.statusCode = 201;
  server.emit("request", cancelledRequest, cancelledResponse);
  cancelledResponse.emit("finish");
  assert.throws(() => recorder.snapshot(), /did not complete its request body/u);
});

test("RFD-TUW-014 scenario producer counts actual adapters and rejects a cancelled capture", async () => {
  const captures = [];
  const navigations = [];
  const result = await runFormalPackageMatterScenario({
    page: scenarioPage(),
    runtime: scenarioRuntime(),
    navigate: async (...args) => navigations.push(args),
    capture: async (name) => {
      captures.push(name);
      return { name, path: `${name}.png`, scope: "evidence", sha256: SCREENSHOT_SHA, bytes: 1 };
    },
  });
  assert.equal(result.adapter_invocation_count, navigations.length + captures.length);
  assert.equal(result.adapter_invocation_count, 9);
  assert.deepEqual(
    Object.values(result.action_evidence).filter((row) => row.request).map(({ request }) => (
      [request.sequence, request.method, request.path, request.status, request.body_action]
    )),
    [
      [1, "POST", "/api/matter/ops/tasks", 201, null],
      [2, "POST", "/api/matter/ops/time-entries", 201, null],
      [3, "POST", "/api/matter/ops/time-weeks/submit", 200, null],
      [4, "POST", "/api/matter/ops/time-weeks/lock", 200, null],
      [5, "POST", "/api/matter/ops/wip", 201, "generate"],
      [6, "POST", "/api/matter/ops/wip", 201, "prebill"],
    ],
  );

  let cancelledCaptureCount = 0;
  await assert.rejects(runFormalPackageMatterScenario({
    page: scenarioPage(),
    runtime: scenarioRuntime(),
    navigate: async () => {},
    capture: async () => {
      cancelledCaptureCount += 1;
      throw new Error("capture cancelled");
    },
  }), /capture cancelled/u);
  assert.equal(cancelledCaptureCount, 1);
});

test("RFD-TUW-014 failure diagnostics redact credentials before assertion output", () => {
  const value = redactFormalPackageDiagnostic(
    "Bearer abc.def token=raw-token password=raw-password local-dev-only:user@example.invalid user@example.invalid",
  );
  for (const forbidden of ["abc.def", "raw-token", "raw-password", "user@example.invalid"]) {
    assert.equal(value.includes(forbidden), false);
  }
});

test("RFD-TUW-014 formal manifest is thin-client only and source/tree bound", () => {
  assert.deepEqual(assertFormalPackageManifest(manifest(), manifestOptions), {
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    runtime_data_mode: "none",
    thin_client: true,
  });
  assert.throws(
    () => assertFormalPackageManifest(manifest({ effective_runtime_mode: "private-local" }), manifestOptions),
    /effective runtime mode must equal requested runtime mode/u,
  );
  assert.throws(
    () => assertFormalPackageManifest(manifest({ source_sha: "9".repeat(40) }), manifestOptions),
    /source SHA mismatch/u,
  );
});

test("RFD-TUW-014 rejects forged v1, partial policy, unknown fields, and canonical policy mismatch", () => {
  const cases = [
    manifest({ schema_version: "law-firm-os.matter-desktop-build-provenance.v1" }),
    manifest({ policy: { thin_client: true, api_target: "external_authenticated_api" } }),
    manifest({ unknown_formal_claim: true }),
    manifest({ runtime_included: true }),
    manifest({ platform: "win32", arch: "x64" }),
    manifest({ version: "0.1.18" }),
  ];
  for (const value of cases) {
    assert.throws(() => assertFormalPackageManifest(value, manifestOptions));
  }
});

test("RFD-TUW-014 rejects a different import root or in-worktree API state before starting an adapter", async () => {
  await assert.rejects(startFormalPackageLoopbackApi({
    repoRoot: path.join(ROOT, "different-source"),
    stateRoot: path.join(tmpdir(), "formal-loopback-no-start"),
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
  }), /repository root does not match/u);
  await assert.rejects(startFormalPackageLoopbackApi({
    repoRoot: ROOT,
    stateRoot: path.join(ROOT, ".formal-loopback-must-not-start"),
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
  }), /state must remain outside/u);
});

test("RFD-TUW-014 classifies a caller-crafted PASS receipt as TEST_ONLY", () => {
  assert.deepEqual(validateFormalPackageLoopbackQaReceipt(receipt(), options), {
    valid: true,
    verdict: "TEST_ONLY",
    native_verdict: "NOT_RUN",
    authoritative: false,
    blocker: "CANONICAL_NATIVE_RUNNER_READER_REQUIRED",
    claimed_verdict: "PASS",
  });
  assert.throws(
    () => writeFormalPackageLoopbackQaReceipt(path.join(tmpdir(), "forged-rfd014-pass.json"), receipt(), options),
    /opaque OS launcher capability is required/u,
  );
});

test("RFD-TUW-014 canonical transcript binds real invocation counts and action request sequences", () => {
  const raw = transcript();
  assert.equal(validateFormalPackageLoopbackTranscript(raw, transcriptOptions), raw);
  assert.equal(validateFormalPackageLoopbackQaReceipt(receipt(), { ...options, transcript: raw }).verdict, "TEST_ONLY");

  const missingInvocation = structuredClone(raw);
  missingInvocation.execution.package_launch_count = 0;
  assert.throws(() => validateFormalPackageLoopbackTranscript(missingInvocation, transcriptOptions), /package launches/u);

  const forgedAction = structuredClone(raw);
  forgedAction.requests[14].body_action = "generate";
  assert.throws(
    () => validateFormalPackageLoopbackQaReceipt(receipt(), { ...options, transcript: forgedAction }),
    /not bound to the raw transcript/u,
  );

  assert.throws(
    () => validateFormalPackageLoopbackTranscript({ ...raw, fake_adapter: true }, transcriptOptions),
    /fields drifted/u,
  );

  assert.throws(
    () => validateFormalPackageLoopbackTranscript({
      ...raw,
      artifacts: { ...raw.artifacts, privacy_receipt_sha256s: [PRIVACY_EXPANDED_SHA, "f".repeat(64)] },
    }, transcriptOptions),
    /privacy receipts drifted/u,
  );

  assert.throws(
    () => validateFormalPackageLoopbackTranscript({
      ...raw,
      runtime: { ...raw.runtime, base_url: "http://user:secret@127.0.0.1:4812" },
    }, transcriptOptions),
    /Expected values to be strictly equal/u,
  );
});

test("RFD-TUW-014 canonical reader blocks non-runner callers before reading fake evidence", async () => {
  assert.deepEqual(readFormalPackageLoopbackNativeQaReceipt("/does-not-exist/fake.json", {
    repositoryRoot: ROOT,
    evidenceRoot: tmpdir(),
    ...options,
  }), {
    valid: false,
    verdict: "BLOCKED_BY_RUNNER_CAPABILITY",
    native_verdict: "NOT_RUN",
    authoritative: false,
    blocker: "ACTUAL_PLATFORM_RUNNER_REQUIRED",
  });
  assert.throws(
    () => validateFormalPackageLoopbackNativeQaCapability({
      platform: "macos",
      authoritative: true,
      native_verdict: "PASS",
    }),
    /was not issued by the canonical native reader/u,
  );
  await assert.rejects(readFormalPackageLoopbackLivePrivacyValidations("/does-not-exist/fake.json", {
    repositoryRoot: ROOT,
    evidenceRoot: tmpdir(),
    expectedPlatform: "macos",
    corpus: {},
    executedRootPath: "/does-not-exist/fake.app",
  }), /opaque OS launcher capability is required/u);
});

test("RFD-TUW-014 immutable process command line defeats a mutable argv runner spoof", () => {
  const moduleUrl = new URL("../lib/formal-package-loopback-evidence.mjs", import.meta.url).href;
  const fakeRunner = path.join(ROOT, "scripts/run-formal-macos-package-qa.mjs");
  const script = `
    process.argv[1] = ${JSON.stringify(fakeRunner)};
    const { readFormalPackageLoopbackNativeQaReceipt } = await import(${JSON.stringify(moduleUrl)});
    process.stdout.write(JSON.stringify(readFormalPackageLoopbackNativeQaReceipt("/does-not-exist/fake.json", {
      expectedPlatform: "macos"
    })));
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
    encoding: "utf8",
    env: { PATH: process.env.PATH ?? "" },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    valid: false,
    verdict: "BLOCKED_BY_RUNNER_CAPABILITY",
    native_verdict: "NOT_RUN",
    authoritative: false,
    blocker: "ACTUAL_PLATFORM_RUNNER_REQUIRED",
  });
});

test("RFD-TUW-014 fails closed on source drift, private-local mode, missing actions, console errors, or deployment claims", () => {
  const mutations = [
    (value) => { value.bindings.loopback_api.source_sha = "9".repeat(40); },
    (value) => { value.bindings.package_manifest.sha256 = "9".repeat(64); },
    (value) => { value.bindings.executed_package.sha256 = "9".repeat(64); },
    (value) => { value.package.runtime_data_mode = "private-local"; },
    (value) => { value.scenarios.matter_wip_created = false; },
    (value) => { delete value.action_evidence.matter_billing; },
    (value) => { value.diagnostics.console_error_count = 1; },
    (value) => { value.boundaries.production_evidence = true; },
    (value) => { value.runtime.base_url = "https://api.example.test"; },
  ];
  for (const mutate of mutations) {
    const value = structuredClone(receipt());
    mutate(value);
    assert.throws(() => validateFormalPackageLoopbackQaReceipt(value, options));
  }
});

test("RFD-TUW-014 keeps Windows native PASS independent from an Authenticode blocker", () => {
  const macPackage = receipt().package;
  const {
    bundle_member_path: _bundleMemberPath,
    distribution: _distribution,
    ...commonPackage
  } = macPackage;
  const value = receipt({
    platform: "windows",
    verdict: "BLOCKED_AUTHENTICODE",
    bindings: {
      ...receipt().bindings,
      package_artifact: fileReference("installer.exe", ARTIFACT_SHA),
      artifact_privacy: {
        corpus_sha256: PRIVACY_CORPUS_SHA,
        receipts: [
          fileReference("privacy-windows-directory.json", PRIVACY_EXPANDED_SHA, "evidence"),
          fileReference("privacy-windows-zip.json", PRIVACY_PACKAGED_SHA, "evidence"),
          fileReference("privacy-windows-installer-builder.json", "e".repeat(64), "evidence"),
          fileReference("privacy-windows-installer-native.json", "f".repeat(64), "evidence"),
        ],
      },
    },
    package: {
      ...commonPackage,
      artifacts: [
        { role: "installer", ...fileReference("installer.exe", ARTIFACT_SHA) },
        { role: "blockmap", ...fileReference("installer.exe.blockmap", "e".repeat(64)) },
        { role: "package_zip", ...fileReference("package.zip", "f".repeat(64)) },
        { role: "unpacked_executable", ...fileReference("matter.exe", EXECUTED_PACKAGE_SHA) },
        { role: "manifest", ...fileReference("manifest.json", MANIFEST_SHA) },
      ],
      nsis_install_completed: true,
      nsis_uninstall_completed: true,
    },
    scenarios: {
      ...receipt().scenarios,
      nsis_install_completed: true,
      nsis_uninstall_completed: true,
    },
    authenticode: {
      valid: false,
      blocker: "No approved Authenticode provider or certificate is configured",
    },
    execution: {
      ...receipt().execution,
      runner_capability: "native-windows-nsis",
    },
    boundaries: {
      ...receipt().boundaries,
      windows_native_claim: true,
    },
  });
  const validation = validateFormalPackageLoopbackQaReceipt(value, {
    ...options,
    expectedPlatform: "windows",
  });
  assert.equal(validation.verdict, "TEST_ONLY");
  assert.equal(validation.claimed_verdict, "BLOCKED_AUTHENTICODE");
  const missingPackageSurfaces = structuredClone(value);
  missingPackageSurfaces.bindings.artifact_privacy.receipts = missingPackageSurfaces.bindings.artifact_privacy.receipts.slice(2);
  assert.throws(
    () => validateFormalPackageLoopbackQaReceipt(missingPackageSurfaces, {
      ...options,
      expectedPlatform: "windows",
    }),
    /privacy sidecar count drifted/u,
  );
});
