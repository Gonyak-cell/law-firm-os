import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  createMatterDesktopSyntheticRuntimeFixture,
  materializeMatterDesktopSyntheticRuntimeFixture,
} from "./matter-desktop-synthetic-runtime.mjs";
import {
  readDesktopBuildSourceIdentity,
  validateDesktopBuildManifest,
} from "./matter-desktop-provenance.mjs";
import {
  FORMAL_PACKAGE_LOOPBACK_PEOPLE_COUNT,
} from "./formal-package-loopback-evidence.mjs";

export {
  FORMAL_PACKAGE_LOOPBACK_PEOPLE_COUNT,
  FORMAL_PACKAGE_LOOPBACK_QA_LIMITATION,
  FORMAL_PACKAGE_LOOPBACK_QA_SCHEMA,
  FORMAL_PACKAGE_LOOPBACK_QA_TUW,
  formalPackageLoopbackFileReference,
  readFormalPackageLoopbackLivePrivacyValidations,
  readFormalPackageLoopbackNativeQaReceipt,
  validateFormalPackageLoopbackNativeQaCapability,
  validateFormalPackageLoopbackQaReceipt,
  writeFormalPackageLoopbackQaReceipt,
} from "./formal-package-loopback-evidence.mjs";
export {
  FORMAL_PACKAGE_LOOPBACK_TRANSCRIPT_SCHEMA,
  canonicalFormalPackageLoopbackJson,
  readFormalPackageLoopbackTranscript,
  validateFormalPackageLoopbackTranscript,
  writeFormalPackageLoopbackTranscript,
} from "./formal-package-loopback-transcript.mjs";
export {
  FORMAL_PACKAGE_LOOPBACK_LAUNCH_ATTESTATION_SCHEMA,
  FORMAL_PACKAGE_LOOPBACK_LAUNCH_CAPABILITY_SCHEMA,
  FORMAL_PACKAGE_LOOPBACK_LAUNCH_ENV,
  claimFormalPackageLoopbackNativeLauncher,
  validateFormalPackageLoopbackNativeLauncherCapability,
} from "./formal-package-loopback-launcher.mjs";

const GIT_SHA_PATTERN = /^[0-9a-f]{40}$/u;
const ALLOWED_PACKAGE_ENV_KEYS = new Set([
  "MATTER_DESKTOP_ENV_FILE",
  "MATTER_DESKTOP_LOCAL_API_DISABLED",
  "MATTER_DESKTOP_RUNTIME_BASE_URL",
  "MATTER_DESKTOP_USER_DATA_PATH",
]);
const ALLOWED_BASE_ENV_KEYS = new Set([
  "APPDATA",
  "COMSPEC",
  "HOME",
  "HOMEDRIVE",
  "HOMEPATH",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "LOCALAPPDATA",
  "LOGNAME",
  "NUMBER_OF_PROCESSORS",
  "OS",
  "PATH",
  "PATHEXT",
  "PROCESSOR_ARCHITECTURE",
  "SYSTEMROOT",
  "TEMP",
  "TMP",
  "TMPDIR",
  "TZ",
  "USER",
  "USERPROFILE",
  "USERNAME",
  "WINDIR",
]);
const FORBIDDEN_ENV_NAME = /(?:^|_)(?:ACCESS_KEY|AUTHORIZATION|COOKIE|CREDENTIALS?|PASSWORD|PRIVATE_KEY|SECRET|SESSION|TOKEN)(?:_|$)/iu;
const FORBIDDEN_ENV_PREFIX = /^(?:AWS_|LAWOS_|MATTER_R4_|MATTER_OPERATOR_|MATTER_VAULT_R4_)/iu;
const LOOPBACK_API_ENV_KEYS = new Set([
  "LAWOS_DATA_SCOPE",
  "LAWOS_DEPLOYMENT_COMMIT",
  "LAWOS_HRX_MEMBER_CONTACT_SOURCE_PATH",
  "LAWOS_HRX_MEMBER_PHOTO_SOURCE_PATH",
  "LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH",
  "LAWOS_IDENTITY_TENANT_ID",
]);
const FOUNDATION_FIXTURE_PATH = new URL("../../packages/matter/test/fixtures/matter-small-firm-foundation.fixture.json", import.meta.url);
const MODULE_REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const MATTER_ID = "matter-rfd-tuw-014";
const MATTER_CODE = "RFD-014-2026-001";
const SEEDED_TASK_ID = "task-rfd-tuw-014-queue";
const SEEDED_TASK_TITLE = "[RFD-014] formal loopback queue task";

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  assert.ok(text, `${label} is required`);
  return text;
}

function assertGitSha(value, label) {
  assert.match(requiredText(value, label), GIT_SHA_PATTERN, `${label} must be a full Git SHA`);
}

function redact(value, key = "") {
  if (/(authorization|cookie|credential|email|password|secret|session|token)/iu.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, redact(child, childKey)]));
  }
  return value;
}

function parsedJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return "[NON_JSON_BODY]";
  }
}

export function redactFormalPackageDiagnostic(value) {
  return String(value ?? "")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/giu, "Bearer [REDACTED]")
    .replace(/\blocal-dev-only:[^\s"']+/giu, "local-dev-only:[REDACTED]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu, "[REDACTED_EMAIL]")
    .replace(/\b(password|secret|session|token)\b\s*[:=]\s*[^\s,;]+/giu, "$1=[REDACTED]")
    .slice(0, 500);
}

export function assertIsolatedLoopbackBaseUrl(value) {
  const url = new URL(requiredText(value, "formal QA API base URL"));
  assert.equal(url.protocol, "http:", "formal QA API must use loopback HTTP");
  assert.equal(url.hostname, "127.0.0.1", "formal QA API must use the numeric loopback host");
  assert.match(url.port, /^\d{1,5}$/u, "formal QA API must use an explicit ephemeral port");
  assert.ok(Number(url.port) > 0 && Number(url.port) <= 65_535, "formal QA API port is out of range");
  assert.equal(url.username, "", "formal QA API URL must not contain credentials");
  assert.equal(url.password, "", "formal QA API URL must not contain credentials");
  assert.equal(url.pathname, "/", "formal QA API base URL must not contain a path");
  assert.equal(url.search, "", "formal QA API base URL must not contain a query");
  assert.equal(url.hash, "", "formal QA API base URL must not contain a fragment");
  return url.origin;
}

export function formalPackageLaunchEnvironment({ baseEnv = {}, baseUrl, userDataPath, envPath } = {}) {
  const cleanBase = Object.fromEntries(Object.entries(baseEnv).filter(([name]) => (
    ALLOWED_BASE_ENV_KEYS.has(name.toUpperCase())
    && !FORBIDDEN_ENV_PREFIX.test(name)
    && !FORBIDDEN_ENV_NAME.test(name)
    && !name.startsWith("MATTER_DESKTOP_")
    && !["ELECTRON_RUN_AS_NODE", "NODE_OPTIONS"].includes(name)
  )));
  const result = {
    ...cleanBase,
    MATTER_DESKTOP_USER_DATA_PATH: requiredText(userDataPath, "formal QA userData path"),
    MATTER_DESKTOP_ENV_FILE: requiredText(envPath, "formal QA empty env path"),
    MATTER_DESKTOP_LOCAL_API_DISABLED: "1",
    MATTER_DESKTOP_RUNTIME_BASE_URL: assertIsolatedLoopbackBaseUrl(baseUrl),
  };
  assertFormalPackageLaunchEnvironment(result);
  return result;
}

export function assertFormalPackageLaunchEnvironment(env = {}) {
  for (const [name, value] of Object.entries(env)) {
    assert.equal(FORBIDDEN_ENV_PREFIX.test(name), false, `formal QA package environment contains forbidden prefix: ${name}`);
    assert.equal(FORBIDDEN_ENV_NAME.test(name), false, `formal QA package environment contains secret-like key: ${name}`);
    if (name.startsWith("MATTER_DESKTOP_")) {
      assert.equal(ALLOWED_PACKAGE_ENV_KEYS.has(name), true, `formal QA package environment contains unsupported desktop key: ${name}`);
    } else {
      assert.equal(ALLOWED_BASE_ENV_KEYS.has(name.toUpperCase()), true, `formal QA package environment contains unsupported base key: ${name}`);
    }
    assert.equal(typeof value, "string", `formal QA package environment value must be text: ${name}`);
  }
  assert.equal(env.MATTER_DESKTOP_LOCAL_API_DISABLED, "1");
  assertIsolatedLoopbackBaseUrl(env.MATTER_DESKTOP_RUNTIME_BASE_URL);
  return Object.freeze({ secret_env_injection_count: 0, operator_token_env_count: 0 });
}

export function formalLoopbackApiEnvironment({ baseEnv = {}, syntheticEnv = {} } = {}) {
  assert.deepEqual(
    Object.keys(syntheticEnv).sort(),
    [...LOOPBACK_API_ENV_KEYS].sort(),
    "formal loopback API environment must contain only the synthetic source contract",
  );
  assert.equal(syntheticEnv.LAWOS_DATA_SCOPE, "synthetic-only");
  assertGitSha(syntheticEnv.LAWOS_DEPLOYMENT_COMMIT, "formal loopback API deployment source SHA");
  for (const name of LOOPBACK_API_ENV_KEYS) requiredText(syntheticEnv[name], `formal loopback API environment ${name}`);
  const cleanBase = Object.fromEntries(Object.entries(baseEnv).filter(([name]) => (
    ALLOWED_BASE_ENV_KEYS.has(name.toUpperCase())
    && !FORBIDDEN_ENV_PREFIX.test(name)
    && !FORBIDDEN_ENV_NAME.test(name)
    && !/^MATTER_DESKTOP_/iu.test(name)
    && !["ELECTRON_RUN_AS_NODE", "NODE_OPTIONS"].includes(name.toUpperCase())
  )));
  return Object.freeze({ ...cleanBase, ...syntheticEnv });
}

export function assertFormalPackageManifest(manifest, {
  expectedSourceSha,
  expectedSourceTree,
  expectedPlatform,
  expectedVersion,
} = {}) {
  assertGitSha(expectedSourceSha, "expected source SHA");
  assertGitSha(expectedSourceTree, "expected source tree");
  requiredText(expectedPlatform, "expected package platform");
  requiredText(expectedVersion, "expected package version");
  const validated = validateDesktopBuildManifest(manifest);
  assert.equal(validated.source_sha, expectedSourceSha, "package manifest source SHA mismatch");
  assert.equal(validated.source_tree, expectedSourceTree, "package manifest source tree mismatch");
  assert.equal(validated.platform, expectedPlatform, "package manifest platform mismatch");
  assert.equal(validated.version, expectedVersion, "package manifest version mismatch");
  assert.equal(validated.source_dirty, false, "formal package manifest must be clean");
  assert.equal(validated.channel, "formal", "package manifest must use the formal channel");
  return Object.freeze({
    source_sha: validated.source_sha,
    source_tree: validated.source_tree,
    runtime_data_mode: validated.effective_runtime_mode,
    thin_client: validated.policy.thin_client,
  });
}

function formalMatterRecords(fixture, foundation) {
  const accounts = fixture.account_seed.users;
  assert.equal(accounts.length, FORMAL_PACKAGE_LOOPBACK_PEOPLE_COUNT);
  assert.equal(foundation.people.length, FORMAL_PACKAGE_LOOPBACK_PEOPLE_COUNT);
  const people = foundation.people.map((person, index) => ({
    model_type: "Person",
    resource_id: accounts[index].user_id,
    person_id: accounts[index].user_id,
    tenant_id: fixture.tenant_id,
    role: person.role,
    display_name: fixture.roster.members[index].display_name,
    status: "active",
    active: true,
  }));
  return [
    ...people,
    {
      model_type: "Matter",
      matter_id: MATTER_ID,
      tenant_id: fixture.tenant_id,
      client_id: "client-rfd-tuw-014",
      client_display_name: "[RFD-014] synthetic client",
      client_group_id: "client-group-rfd-tuw-014",
      billing_client_party_id: "client-rfd-tuw-014",
      matter_code: MATTER_CODE,
      title: "[RFD-014] formal loopback matter",
      status: "open",
      created_by: accounts[0].user_id,
      created_at: "2026-07-27T00:00:00.000Z",
      responsible_lawyer: accounts[2].user_id,
      owner_user_id: accounts[2].user_id,
      backup_user_id: accounts[6].user_id,
      permission_envelope_id: "permission-rfd-tuw-014",
      audit_trace_id: "audit-rfd-tuw-014",
    },
    {
      model_type: "MatterTask",
      task_id: SEEDED_TASK_ID,
      tenant_id: fixture.tenant_id,
      matter_id: MATTER_ID,
      title: SEEDED_TASK_TITLE,
      status: "todo",
      created_by: accounts[2].user_id,
      assigned_to: accounts[2].user_id,
      backup_user_id: accounts[6].user_id,
      due_at: "2026-07-31T08:00:00.000+09:00",
      created_at: "2026-07-27T00:00:00.000Z",
      updated_at: "2026-07-27T00:00:00.000Z",
      permission_envelope_id: "permission-rfd-tuw-014",
      audit_trace_id: "audit-task-rfd-tuw-014",
    },
  ];
}

function formalFinanceRecords(fixture) {
  return [
    {
      model_type: "RateCard",
      rate_card_id: "rate-rfd-tuw-014",
      tenant_id: fixture.tenant_id,
      currency: "KRW",
      effective_from: "2026-07-01",
      role_rates: [
        { role_id: "attorney", hourly_rate: 100_000 },
        { role_id: "partner", hourly_rate: 100_000 },
      ],
      status: "active",
    },
    {
      model_type: "FeeArrangement",
      fee_arrangement_id: "fee-rfd-tuw-014",
      tenant_id: fixture.tenant_id,
      matter_id: MATTER_ID,
      billing_profile_id: "billing-profile-rfd-tuw-014",
      rate_card_id: "rate-rfd-tuw-014",
      type: "hourly",
      arrangement_type: "hourly",
      status: "active",
    },
  ];
}

function setSyntheticRuntimeEnvironment(materialized, tenantId, sourceSha) {
  const syntheticEnv = {
    LAWOS_DATA_SCOPE: "synthetic-only",
    LAWOS_DEPLOYMENT_COMMIT: sourceSha,
    LAWOS_HRX_MEMBER_CONTACT_SOURCE_PATH: materialized.contactPath,
    LAWOS_HRX_MEMBER_PHOTO_SOURCE_PATH: materialized.photosPath,
    LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH: materialized.rosterPath,
    LAWOS_IDENTITY_TENANT_ID: tenantId,
  };
  const cleanEnvironment = formalLoopbackApiEnvironment({ baseEnv: process.env, syntheticEnv });
  const touchedNames = new Set([
    ...Object.keys(process.env).filter((name) => !Object.hasOwn(cleanEnvironment, name)),
    ...Object.keys(syntheticEnv),
  ]);
  const previous = Object.fromEntries([...touchedNames].map((name) => [name, process.env[name]]));
  for (const name of Object.keys(process.env)) {
    if (!Object.hasOwn(cleanEnvironment, name)) delete process.env[name];
  }
  Object.assign(process.env, syntheticEnv);
  return () => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  };
}

export function recordFormalPackageLoopbackRequests(server) {
  const rows = [];
  server.on("request", (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const row = {
      sequence: rows.length + 1,
      method: request.method ?? "GET",
      path: url.pathname,
      status: null,
      body: null,
      request_complete: false,
      remote_loopback: ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(request.socket?.remoteAddress),
    };
    rows.push(row);
    const chunks = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => {
      row.body = redact(parsedJson(Buffer.concat(chunks).toString("utf8")));
      row.request_complete = true;
    });
    response.once("finish", () => {
      row.status = response.statusCode;
    });
  });
  return Object.freeze({
    checkpoint: () => rows.length,
    snapshot() {
      return Object.freeze(rows.map((row) => {
        assert.equal(row.remote_loopback, true, `request ${row.sequence} did not originate from loopback`);
        assert.equal(row.request_complete, true, `request ${row.sequence} did not complete its request body`);
        assert.ok(Number.isInteger(row.status), `request ${row.sequence} did not complete`);
        return Object.freeze({
          sequence: row.sequence,
          method: row.method,
          path: row.path,
          status: row.status,
          body_action: row.body?.action ?? null,
          remote_loopback: row.remote_loopback,
        });
      }));
    },
    async waitFor({ after = 0, method, path: expectedPath, status, bodyAction, timeoutMs = 20_000 } = {}) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const match = rows.slice(after).find((row) => (
          row.request_complete
          && row.method === method
          && row.path === expectedPath
          && row.status === status
          && (!bodyAction || row.body?.action === bodyAction)
        ));
        if (match) {
          assert.equal(match.remote_loopback, true, `${method} ${expectedPath} did not originate from loopback`);
          return match;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      throw new Error(`formal QA API request missing: ${method} ${expectedPath} ${status}${bodyAction ? ` action=${bodyAction}` : ""}`);
    },
  });
}

export async function startFormalPackageLoopbackApi({ repoRoot, stateRoot, expectedSourceSha, expectedSourceTree } = {}) {
  assertGitSha(expectedSourceSha, "loopback API source SHA");
  assertGitSha(expectedSourceTree, "loopback API source tree");
  const resolvedRepoRoot = path.resolve(requiredText(repoRoot, "loopback API repository root"));
  assert.equal(resolvedRepoRoot, MODULE_REPO_ROOT, "loopback API repository root does not match the imported exact source");
  const resolvedStateRoot = path.resolve(requiredText(stateRoot, "loopback API state root"));
  const stateRelativeToRepo = path.relative(resolvedRepoRoot, resolvedStateRoot);
  assert.ok(
    stateRelativeToRepo === ".."
      || stateRelativeToRepo.startsWith(`..${path.sep}`)
      || path.isAbsolute(stateRelativeToRepo),
    "loopback API state must remain outside the source worktree",
  );
  const sourceIdentity = readDesktopBuildSourceIdentity(resolvedRepoRoot);
  assert.equal(sourceIdentity.sourceSha, expectedSourceSha, "loopback API source SHA mismatch");
  assert.equal(sourceIdentity.sourceTree, expectedSourceTree, "loopback API source tree mismatch");
  assert.equal(sourceIdentity.sourceDirty, false, `loopback API source is dirty: ${sourceIdentity.sourceDirtyPaths.join(", ")}`);
  mkdirSync(resolvedStateRoot, { recursive: true });
  const fixture = createMatterDesktopSyntheticRuntimeFixture();
  const foundation = JSON.parse(readFileSync(FOUNDATION_FIXTURE_PATH, "utf8"));
  assert.equal(fixture.safe_counts.employee_count, FORMAL_PACKAGE_LOOPBACK_PEOPLE_COUNT);
  assert.equal(fixture.safe_counts.real_identity_count, 0);
  assert.equal(foundation.synthetic_only, true);
  assert.equal(foundation.people.length, FORMAL_PACKAGE_LOOPBACK_PEOPLE_COUNT);
  const materialized = await materializeMatterDesktopSyntheticRuntimeFixture({
    targetRoot: path.join(resolvedStateRoot, "synthetic-source"),
  });
  const restoreEnvironment = setSyntheticRuntimeEnvironment(materialized, fixture.tenant_id, expectedSourceSha);
  let api;
  try {
    const [serverModule, sessionModule, stepUpModule, desktopModule, matterRepositoryModule, financeRepositoryModule] = await Promise.all([
      import("../../apps/api/src/server.js"),
      import("../../apps/api/src/session-auth.js"),
      import("../../apps/api/src/hrx-step-up-token.js"),
      import("../../apps/desktop/src/main/local-api.js"),
      import("../../packages/matter/src/repository.js"),
      import("../../packages/billing/src/finance-repository.js"),
    ]);
    const storePaths = desktopModule.desktopRuntimeStorePaths({
      env: { MATTER_DESKTOP_RUNTIME_STORE_DIR: path.join(resolvedStateRoot, "runtime-stores") },
      userDataPath: resolvedStateRoot,
    });
    const matterRepository = matterRepositoryModule.createMatterRepository({
      filePath: storePaths.matterStorePath,
      seedRecords: formalMatterRecords(fixture, foundation),
    });
    const financeRepository = financeRepositoryModule.createFinanceRepository({
      filePath: storePaths.financeStorePath,
      seedRecords: formalFinanceRecords(fixture),
    });
    const stepUpAuthority = stepUpModule.createHrxStepUpAuthority();
    const sessionAuth = sessionModule.createApiSessionAuth({
      seed: fixture.account_seed,
      trustedTenantId: fixture.tenant_id,
      profile: "local-dev",
      secret: `rfd-tuw-014-${expectedSourceSha}`,
      securityAuditStorePath: storePaths.securityAuditStorePath,
      credentialStorePath: storePaths.authCredentialStorePath,
      passwordResetTokenStorePath: storePaths.authPasswordResetStorePath,
      stepUpAuthority,
    });
    api = await serverModule.startApiServer({
      port: 0,
      runtimeProfile: "local-dev",
      stepUpAuthority,
      sessionAuth,
      matterRepository,
      financeRepository,
      ...storePaths,
    });
    assert.equal(api.host, "127.0.0.1");
    const baseUrl = assertIsolatedLoopbackBaseUrl(`http://127.0.0.1:${api.port}`);
    const requests = recordFormalPackageLoopbackRequests(api.server);
    const health = await fetch(`${baseUrl}/api/health`).then(async (response) => ({
      status: response.status,
      body: await response.json(),
    }));
    assert.equal(health.status, 200);
    assert.equal(health.body?.source_revision, expectedSourceSha);
    assert.equal(health.body?.runtime_profile, "local-dev");
    assert.equal(health.body?.synthetic_login_enabled, true);
    return Object.freeze({
      baseUrl,
      source_sha: expectedSourceSha,
      source_tree: expectedSourceTree,
      fixture,
      materialized,
      account: fixture.account_seed.users[0],
      stepUpAuthority,
      health,
      requests,
      scenario: Object.freeze({
        matter_id: MATTER_ID,
        matter_code: MATTER_CODE,
        seeded_task_id: SEEDED_TASK_ID,
        seeded_task_title: SEEDED_TASK_TITLE,
      }),
      async close() {
        if (api.server.listening) await new Promise((resolve) => api.server.close(resolve));
        restoreEnvironment();
      },
    });
  } catch (error) {
    if (api?.server?.listening) await new Promise((resolve) => api.server.close(resolve));
    restoreEnvironment();
    throw error;
  }
}

function requestEvidence(row) {
  return Object.freeze({
    sequence: row.sequence,
    method: row.method,
    path: row.path,
    status: row.status,
    body_action: row.body?.action ?? null,
  });
}

function localDateTimeInput(daysFromNow = 2) {
  const value = new Date(Date.now() + daysFromNow * 86_400_000);
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export async function runFormalPackageMatterScenario({ page, navigate, capture, runtime } = {}) {
  assert.ok(page && typeof page.locator === "function", "formal QA page adapter is required");
  assert.equal(typeof navigate, "function", "formal QA navigate adapter is required");
  assert.equal(typeof capture, "function", "formal QA capture adapter is required");
  const screenshots = [];
  let adapterInvocationCount = 0;
  const invokeNavigate = async (...args) => {
    adapterInvocationCount += 1;
    return navigate(...args);
  };
  const invokeCapture = async (...args) => {
    adapterInvocationCount += 1;
    return capture(...args);
  };

  await invokeNavigate("people-org-chart", "people");
  const orgChart = page.locator('[data-hr-org-chart="true"]');
  await orgChart.waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForFunction(
    (expected) => document.querySelectorAll('[data-hr-org-chart="true"] .hr-org-person .hr-roster-avatar').length === expected,
    FORMAL_PACKAGE_LOOPBACK_PEOPLE_COUNT,
    { timeout: 20_000 },
  );
  const avatarKinds = await orgChart.locator(".hr-org-person .hr-roster-avatar").evaluateAll((nodes) => nodes.map((node) => ({
    photo: Boolean(node.querySelector("img")?.getAttribute("src")),
    initials: node.querySelector("img") ? "" : (node.textContent ?? "").trim(),
  })));
  assert.equal(avatarKinds.length, FORMAL_PACKAGE_LOOPBACK_PEOPLE_COUNT);
  assert.equal(avatarKinds.every((row) => row.photo || row.initials.length > 0), true);
  screenshots.push(await invokeCapture("formal-people-10", '[data-hr-org-chart="true"]'));

  await invokeNavigate("matter-today", "matters");
  const queueScreen = page.locator('[data-matter-small-firm-screen="matter-today"]');
  await queueScreen.waitFor({ state: "visible", timeout: 20_000 });
  assert.equal(await queueScreen.locator(".live-data-error").count(), 0);
  const seededQueueItem = queueScreen.locator(`[data-task-id="${runtime.scenario.seeded_task_id}"]`);
  await seededQueueItem.waitFor({ state: "visible", timeout: 20_000 });
  const queueVisibleCount = await queueScreen.locator(".matter-ops-priority-row").count();
  assert.ok(queueVisibleCount > 0);
  screenshots.push(await invokeCapture("formal-matter-queue", '[data-matter-small-firm-screen="matter-today"]'));

  await invokeNavigate("matter-work", "matters");
  const workScreen = page.locator('[data-matter-small-firm-screen="matter-work"]');
  await workScreen.waitFor({ state: "visible", timeout: 20_000 });
  const newTaskButton = workScreen.getByRole("button", { name: "새 업무", exact: true });
  await newTaskButton.waitFor({ state: "visible", timeout: 20_000 });
  await newTaskButton.click();
  const taskForm = page.locator('[data-matter-quick-task-form="true"]');
  await taskForm.waitFor({ state: "visible", timeout: 20_000 });
  const taskTitle = "[RFD-014] package-created task";
  await taskForm.getByLabel("사건").selectOption(runtime.scenario.matter_id);
  await taskForm.getByLabel("제목").fill(taskTitle);
  await taskForm.getByLabel("담당").fill(runtime.account.user_id);
  await taskForm.getByLabel("기한").fill(localDateTimeInput());
  await taskForm.getByLabel("우선순위").selectOption("high");
  let checkpoint = runtime.requests.checkpoint();
  await taskForm.locator('[data-matter-task-create-submit="true"]').click();
  const taskRequest = await runtime.requests.waitFor({
    after: checkpoint,
    method: "POST",
    path: "/api/matter/ops/tasks",
    status: 201,
  });
  await taskForm.locator('[data-matter-task-create-status="data"]').waitFor({ state: "visible", timeout: 20_000 });
  await workScreen.getByText(taskTitle, { exact: true }).first().waitFor({ state: "visible", timeout: 20_000 });
  screenshots.push(await invokeCapture("formal-matter-task", '[data-matter-small-firm-screen="matter-work"]'));

  await invokeNavigate("matter-time-billing", "matters");
  const timeScreen = page.locator('[data-matter-small-firm-screen="matter-time-billing"]');
  await timeScreen.waitFor({ state: "visible", timeout: 20_000 });
  const timeForm = page.locator('[data-matter-quick-time-entry="true"]');
  await timeForm.waitFor({ state: "visible", timeout: 20_000 });
  await timeForm.locator("select").first().selectOption(runtime.scenario.matter_id);
  await timeForm.locator('input[type="date"]').fill(new Date().toISOString().slice(0, 10));
  await timeForm.locator('input[type="number"]').fill("90");
  await timeForm.getByLabel("역할").selectOption("attorney");
  await timeForm.getByLabel("청구 여부").selectOption("billable");
  await timeForm.locator("input").last().fill("RFD-014 formal package time entry");
  checkpoint = runtime.requests.checkpoint();
  await timeForm.getByRole("button", { name: "저장", exact: true }).click();
  const timeRequest = await runtime.requests.waitFor({
    after: checkpoint,
    method: "POST",
    path: "/api/matter/ops/time-entries",
    status: 201,
  });
  await page.locator('[data-matter-time-mutation-status="data"]').waitFor({ state: "visible", timeout: 20_000 });

  let weeklyRow = page.locator(`[data-time-week-actor="${runtime.account.user_id}"]`);
  await weeklyRow.waitFor({ state: "visible", timeout: 20_000 });
  checkpoint = runtime.requests.checkpoint();
  await weeklyRow.getByRole("button", { name: "주간 제출", exact: true }).click();
  const submitRequest = await runtime.requests.waitFor({
    after: checkpoint,
    method: "POST",
    path: "/api/matter/ops/time-weeks/submit",
    status: 200,
  });
  weeklyRow = page.locator(`[data-time-week-actor="${runtime.account.user_id}"]`);
  await weeklyRow.waitFor({ state: "visible", timeout: 20_000 });
  checkpoint = runtime.requests.checkpoint();
  await weeklyRow.getByRole("button", { name: "주간 잠금", exact: true }).click();
  const lockRequest = await runtime.requests.waitFor({
    after: checkpoint,
    method: "POST",
    path: "/api/matter/ops/time-weeks/lock",
    status: 200,
  });
  await page.locator('[data-time-week-mutation-status="data"]').waitFor({ state: "visible", timeout: 20_000 });

  await invokeNavigate("matter-list", "matters");
  const matterScreen = page.locator('[data-matter-small-firm-screen="matter-list"]');
  await matterScreen.waitFor({ state: "visible", timeout: 20_000 });
  const matterRow = matterScreen.locator("tbody tr").filter({ hasText: runtime.scenario.matter_code });
  await matterRow.getByRole("button", { name: "사건 열기", exact: true }).click();
  const overlay = page.locator('[data-matter-record-workspace="right-panel"]');
  await overlay.waitFor({ state: "visible", timeout: 20_000 });
  const billingTab = overlay.locator('[data-matter-detail-tabs="five"]').getByRole("tab", { name: "시간·청구" });
  if (await billingTab.getAttribute("aria-selected") !== "true") await billingTab.click();
  const wipButton = overlay.getByRole("button", { name: "청구 준비", exact: true });
  await wipButton.waitFor({ state: "visible", timeout: 20_000 });
  checkpoint = runtime.requests.checkpoint();
  await wipButton.click({ timeout: 20_000 });
  const wipRequest = await runtime.requests.waitFor({
    after: checkpoint,
    method: "POST",
    path: "/api/matter/ops/wip",
    status: 201,
    bodyAction: "generate",
  });
  const billingAction = overlay.locator('[data-matter-prebill-review-action="true"]:visible');
  await billingAction.waitFor({ state: "visible", timeout: 20_000 });
  const createPrebillButton = billingAction.locator('[data-matter-prebill-create-action="true"]');
  checkpoint = runtime.requests.checkpoint();
  await createPrebillButton.click({ timeout: 20_000 });
  const billingRequest = await runtime.requests.waitFor({
    after: checkpoint,
    method: "POST",
    path: "/api/matter/ops/wip",
    status: 201,
    bodyAction: "prebill",
  });
  screenshots.push(await invokeCapture("formal-matter-time-wip-billing", '[data-matter-record-workspace="right-panel"]'));

  const profilePhotoCount = avatarKinds.filter((row) => row.photo).length;
  return Object.freeze({
    adapter_invocation_count: adapterInvocationCount,
    screenshots,
    fixture: Object.freeze({
      synthetic_only: true,
      people_count: avatarKinds.length,
      real_identity_count: runtime.fixture.safe_counts.real_identity_count,
      profile_photo_or_initials_count: avatarKinds.length,
      profile_photo_count: profilePhotoCount,
      profile_initials_count: avatarKinds.length - profilePhotoCount,
    }),
    scenarios: Object.freeze({
      people_roster_rendered: avatarKinds.length === FORMAL_PACKAGE_LOOPBACK_PEOPLE_COUNT,
      people_profile_photo_or_initials_complete: avatarKinds.every((row) => row.photo || row.initials.length > 0),
      matter_queue_rendered: queueVisibleCount > 0,
      matter_task_created: true,
      matter_time_created: true,
      matter_time_week_locked: true,
      matter_wip_created: true,
      matter_billing_created: true,
    }),
    action_evidence: Object.freeze({
      matter_queue: Object.freeze({ visible_count: queueVisibleCount, seeded_task_id: runtime.scenario.seeded_task_id }),
      matter_task: Object.freeze({ ui_action_present: true, request: requestEvidence(taskRequest) }),
      matter_time: Object.freeze({ ui_action_present: true, request: requestEvidence(timeRequest) }),
      matter_time_week_submit: Object.freeze({ ui_action_present: true, request: requestEvidence(submitRequest) }),
      matter_time_week_lock: Object.freeze({ ui_action_present: true, request: requestEvidence(lockRequest) }),
      matter_wip: Object.freeze({ ui_action_present: true, request: requestEvidence(wipRequest) }),
      matter_billing: Object.freeze({ ui_action_present: true, request: requestEvidence(billingRequest) }),
    }),
  });
}

export function observeFormalQaExternalRequests(page, baseUrl) {
  const allowedOrigin = assertIsolatedLoopbackBaseUrl(baseUrl);
  const external = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) return;
    if (url.origin === allowedOrigin) return;
    external.push(Object.freeze({ method: request.method(), origin: url.origin, path: url.pathname }));
  });
  return external;
}
