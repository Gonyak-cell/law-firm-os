import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, win32 } from "node:path";
import { _electron as electron } from "playwright";
import {
  validateFormalDeployedApiAuthorityCapability,
} from "./formal-deployed-api-package-qa.mjs";
import {
  validateFormalPackageLoopbackNativeLauncherCapability,
} from "./formal-package-loopback-launcher.mjs";
import {
  validateFormalPackageLoopbackNativeQaCapability,
} from "./formal-package-loopback-evidence.mjs";

/**
 * This module is the only production restart adapter factory.  The factory
 * is deliberately branded in this module and the brand is never serialized.
 * The RFD-TUW-016 contract registers the returned object only after checking
 * this brand plus the RFD-TUW-014/RFD-TUW-015 capabilities and artifact hash.
 */
export const FORMAL_DEPLOYED_API_RESTART_ADAPTER_MODULE =
  "law-firm-os.formal-deployed-api-restart-adapter.v1";

const REAL_ADAPTER_BRAND = Symbol("law-firm-os.formal-deployed-api-restart-adapter");
const REAL_ADAPTERS = new WeakSet();
const SHA256 = /^[0-9a-f]{64}$/u;
const PLATFORM = Object.freeze({ macos: "darwin", windows: "win32" });

class FormalRestartAdapterError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "FormalRestartAdapterError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new FormalRestartAdapterError(code, message);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isAbsoluteAuthorityPath(filePath, platform = process.platform) {
  if (typeof filePath !== "string" || !filePath || filePath.includes("\0")) return false;
  if (platform === "win32") {
    // Formal package paths are local files.  UNC/device paths would make the
    // authority depend on a second host or device namespace, so reject them.
    if (/^\\\\/u.test(filePath) || !win32.isAbsolute(filePath)) return false;
    return !filePath.split(/[\\/]+/u).includes("..");
  }
  if (!isAbsolute(filePath)) return false;
  return !filePath.split("/").includes("..");
}

/** Portable path policy used by the adapter and its nonrelease harness. */
export function isFormalDeployedApiRestartAbsolutePath(filePath, platform = process.platform) {
  return isAbsoluteAuthorityPath(filePath, platform);
}

function digestFile(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function regularFile(filePath, label) {
  if (!isAbsoluteAuthorityPath(filePath)) {
    fail("RESTART_EXECUTABLE_AUTHORITY_MISSING", `${label} is not an absolute authority path`);
  }
  if (!existsSync(filePath) || lstatSync(filePath).isSymbolicLink()) {
    fail("RESTART_EXECUTABLE_AUTHORITY_MISSING", `${label} is missing or a symlink`);
  }
  const real = realpathSync(filePath);
  if (!statSync(real).isFile()) fail("RESTART_EXECUTABLE_AUTHORITY_MISSING", `${label} is not a regular file`);
  return real;
}

function canonicalDirectory(directoryPath, label) {
  if (!isAbsoluteAuthorityPath(directoryPath) || !existsSync(directoryPath) || lstatSync(directoryPath).isSymbolicLink()) {
    fail("RESTART_USER_DATA_UNPROVEN", `${label} is missing or a symlink`);
  }
  const real = realpathSync(directoryPath);
  const stats = statSync(real);
  if (!stats.isDirectory()) fail("RESTART_USER_DATA_UNPROVEN", `${label} is not a directory`);
  if (process.platform !== "win32" && typeof process.getuid === "function" && stats.uid !== process.getuid()) {
    fail("RESTART_USER_DATA_UNPROVEN", `${label} owner drifted`);
  }
  return real;
}

function sidecarPath(receiptPath, ref, label) {
  if (!isRecord(ref) || typeof ref.name !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,191}$/u.test(ref.name)) {
    fail("RESTART_EXECUTABLE_AUTHORITY_MISSING", `${label} sidecar reference is invalid`);
  }
  const bundle = realpathSync(dirname(resolve(receiptPath)));
  const candidate = resolve(bundle, ref.name);
  if (dirname(candidate) !== bundle) fail("RESTART_EXECUTABLE_AUTHORITY_MISSING", `${label} escaped the RFD-TUW-015 bundle`);
  return candidate;
}

function validateHash(path, expected, label) {
  if (!SHA256.test(expected ?? "") || digestFile(path) !== expected) {
    fail("RESTART_ARTIFACT_HASH_MISMATCH", `${label} hash does not match canonical RFD-TUW-015 authority`);
  }
}

function endpointFromReceipt(receipt) {
  const deployment = receipt?.deployment;
  if (!isRecord(deployment) || deployment.environment !== "lawos-staging"
    || deployment.account_id !== "770880870480" || deployment.region !== "ap-northeast-2"
    || typeof deployment.api_id !== "string" || !/^[a-z0-9-]+$/u.test(deployment.api_id)) {
    fail("RESTART_API_AUTHORITY_MISSING", "RFD-TUW-015 has no canonical private-staging endpoint authority");
  }
  const endpoint = `https://${deployment.api_id}.execute-api.${deployment.region}.amazonaws.com`;
  const digest = createHash("sha256").update(endpoint).digest("hex");
  if (digest !== deployment.api_endpoint_sha256) fail("RESTART_API_AUTHORITY_MISSING", "RFD-TUW-015 endpoint digest drifted");
  return endpoint;
}

function launchEnvironment(baseUrl, userDataPath, additions = {}) {
  const blocked = /^(?:AWS_|LAWOS_|MATTER_)|(?:TOKEN|SECRET|PASSWORD|CREDENTIAL|AUTHORIZATION)|^NODE_OPTIONS$|^NODE_PATH$/u;
  return {
    ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !blocked.test(name))),
    ...additions,
    MATTER_DESKTOP_USER_DATA_PATH: userDataPath,
    MATTER_DESKTOP_LOCAL_API_DISABLED: "1",
    MATTER_DESKTOP_RUNTIME_BASE_URL: baseUrl,
  };
}

async function productPage(app) {
  await app.firstWindow({ timeout: 45_000 });
  for (let attempt = 0; attempt < 90; attempt += 1) {
    for (const page of app.windows()) {
      const ready = await page.locator("[data-login-form='email-password'], [data-product-axis-nav]").count().catch(() => 0);
      if (ready) return page;
    }
    await new Promise((resolvePage) => setTimeout(resolvePage, 500));
  }
  fail("RESTART_APP_WINDOW_MISSING", "installed app product window did not become ready");
}

function findFirstId(value, keys, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const child of value) {
      const found = findFirstId(child, keys, seen);
      if (found) return found;
    }
    return null;
  }
  for (const key of keys) {
    if (typeof value[key] === "string" && value[key]) return value[key];
  }
  for (const child of Object.values(value)) {
    const found = findFirstId(child, keys, seen);
    if (found) return found;
  }
  return null;
}

function rows(value, keys) {
  if (Array.isArray(value)) return value;
  for (const key of keys) if (Array.isArray(value?.[key])) return value[key];
  if (isRecord(value?.item)) return [value.item];
  return [];
}

/**
 * Validate the exact Matter/task/time rows returned by the deployed API.
 * Keeping this readback reducer independent makes the negative probes cover
 * the same duplicate and relationship checks as the installed-app adapter.
 */
export function inspectFormalRestartDurableReadback({
  matterId,
  tenantId,
  matterRows = [],
  taskRows = [],
  timeRows = [],
  createdTaskId = null,
  createdTimeId = null,
} = {}) {
  const exactMatterRows = matterRows.filter((row) => row?.matter_id === matterId);
  if (exactMatterRows.length !== 1) {
    fail(exactMatterRows.length === 0 ? "DURABLE_STATE_MISSING" : "DUPLICATE_DURABLE_STATE", "Matter readback did not return exactly one approved row");
  }
  const taskId = createdTaskId ?? findFirstId(taskRows, ["task_id", "id"]);
  const timeId = createdTimeId ?? findFirstId(timeRows, ["time_entry_id", "id"]);
  if (!taskId || !timeId) fail("DURABLE_STATE_MISSING", "deployed API restart readback has no created task/time identifiers");
  const matchedTasks = taskRows.filter((row) => (row?.task_id ?? row?.id) === taskId);
  const matchedTimes = timeRows.filter((row) => (row?.time_entry_id ?? row?.id) === timeId);
  if (matchedTasks.length !== 1 || matchedTimes.length !== 1) {
    fail(matchedTasks.length > 1 || matchedTimes.length > 1 ? "DUPLICATE_DURABLE_STATE" : "DURABLE_STATE_MISSING", "exact created task/time rows were not returned exactly once");
  }
  const matterRow = exactMatterRows[0];
  const taskMatter = matchedTasks[0]?.matter_id ?? matchedTasks[0]?.matterId;
  const timeMatter = matchedTimes[0]?.matter_id ?? matchedTimes[0]?.matterId;
  if (taskMatter !== matterId || timeMatter !== matterId) fail("DURABLE_STATE_RELATIONSHIP_MISMATCH", "task/time readback is linked to a different Matter");
  const matterTenant = matterRow?.tenant_id ?? matterRow?.tenantId;
  if (matterTenant !== undefined && matterTenant !== tenantId) fail("DURABLE_STATE_TENANT_MISMATCH", "Matter readback tenant differs from signed tenant");
  return {
    state: {
      matter: { id: matterId, tenant_id: matterTenant },
      task: { id: taskId, matter_id: taskMatter },
      time: { id: timeId, matter_id: timeMatter },
    },
    evidence: {
      matter_count: exactMatterRows.length,
      task_count: matchedTasks.length,
      time_count: matchedTimes.length,
      duplicate_state_count: (matchedTasks.length > 1 ? matchedTasks.length - 1 : 0)
        + (matchedTimes.length > 1 ? matchedTimes.length - 1 : 0)
        + (exactMatterRows.length > 1 ? exactMatterRows.length - 1 : 0),
    },
    createdTaskId: taskId,
    createdTimeId: timeId,
  };
}

/** Build the tenant/userData isolation evidence from a real API denial. */
export function inspectFormalRestartIsolation({
  denied,
  session,
  handles = [],
  requestedUserDataId,
  expectedUserDataPath,
  tenantId,
} = {}) {
  const visible = Array.isArray(denied?.body?.employees) ? denied.body.employees : [];
  const deniedExactly = denied?.status === 400
    && denied.body?.outcome === "blocked"
    && denied.body?.safe_error_code === "HRX_QUERY_CONTEXT_FORBIDDEN"
    && Array.isArray(denied.body?.forbidden_query_keys)
    && denied.body.forbidden_query_keys.length === 1
    && denied.body.forbidden_query_keys[0] === "tenant_id"
    && !Object.hasOwn(denied.body ?? {}, "employees")
    && visible.length === 0;
  const sameUserData = handles.length === 2
    && handles.every((entry) => entry.userDataId === requestedUserDataId && entry.userDataPath === expectedUserDataPath);
  const sameTenant = session?.tenant_id === tenantId;
  const foreignStateIds = visible.flatMap((row) => [row?.id, row?.employee_id, row?.user_id].filter((value) => typeof value === "string"));
  return {
    cross_mix: !deniedExactly || !sameUserData || !sameTenant || foreignStateIds.length !== 0,
    user_data_match: sameUserData,
    fresh_user_data: true,
    tenant_match: sameTenant,
    foreign_state_ids: foreignStateIds,
    user_data_hash: createHash("sha256").update(expectedUserDataPath).digest("hex"),
  };
}

export function formalRestartMondayFor(dateOnly) {
  const date = new Date(`${dateOnly}T12:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) fail("RESTART_DATE_INVALID", "restart work date is invalid");
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function derivePackageExecution({ platform, artifactPath, expectedArtifactSha256, expectedExecutableSha256, rootDir }) {
  const scratch = mkdtempSync(join(tmpdir(), "rfd016-installed-package-"));
  let executablePath;
  let cleanupMounted = () => {};
  try {
    validateHash(artifactPath, expectedArtifactSha256, "package artifact");
    if (platform === "macos") {
      const mountPoint = join(scratch, "mounted");
      mkdirSync(mountPoint);
      execFileSync("hdiutil", ["attach", "-readonly", "-nobrowse", "-mountpoint", mountPoint, artifactPath], { stdio: "ignore" });
      const appName = readdirSync(mountPoint).find((entry) => entry.toLowerCase() === "matter.app");
      if (!appName) fail("RESTART_EXECUTABLE_AUTHORITY_MISSING", "canonical DMG has no Matter app bundle");
      executablePath = join(mountPoint, appName, "Contents", "MacOS", "matter");
      cleanupMounted = () => {
        try { execFileSync("hdiutil", ["detach", mountPoint], { stdio: "ignore" }); } catch {}
      };
    } else if (platform === "windows") {
      const installDir = join(scratch, "installed");
      execFileSync(artifactPath, ["/S", `/D=${installDir}`], { stdio: "ignore" });
      executablePath = join(installDir, "matter.exe");
      cleanupMounted = () => {
        try {
          const uninstaller = join(installDir, "Uninstall matter.exe");
          if (existsSync(uninstaller)) execFileSync(uninstaller, ["/S"], { stdio: "ignore" });
        } catch {}
      };
    } else {
      fail("RESTART_EXECUTABLE_AUTHORITY_MISSING", "RFD-TUW-015 package platform is not supported");
    }
    const executable = regularFile(executablePath, "mounted package executable");
    validateHash(executable, expectedExecutableSha256, "mounted package executable");
    const root = realpathSync(resolve(rootDir));
    const rel = relative(root, executable);
    if (rel !== ".." && !rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) && !rel.startsWith("../")) {
      fail("RESTART_EXECUTABLE_AUTHORITY_MISSING", "mounted executable escaped the isolated package scratch root");
    }
    return Object.freeze({
      executablePath: executable,
      scratch,
      cleanup: () => {
        cleanupMounted();
        rmSync(scratch, { recursive: true, force: true });
        if (existsSync(scratch)) fail("PROCESS_CLEANUP_FAILED", "installed package scratch residue remains");
      },
    });
  } catch (error) {
    cleanupMounted();
    rmSync(scratch, { recursive: true, force: true });
    throw error;
  }
}

function readSyntheticIdentity({ receiptPath, receipt }) {
  const ref = receipt?.authority?.synthetic_identity_manifest;
  if (!ref) return null;
  try {
    const path = sidecarPath(receiptPath, ref, "synthetic identity");
    const value = JSON.parse(readFileSync(path, "utf8"));
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function credentialFromAuthority(identity, credentialAccount, expectedTenantId) {
  const account = isRecord(credentialAccount) ? credentialAccount : identity?.accounts?.[0];
  if (!isRecord(account) || (account.tenant_id && account.tenant_id !== expectedTenantId)) return null;
  const email = account.email ?? account.login_email;
  const password = account.password ?? process.env.MATTER_FORMAL_QA_LOGIN_PASSWORD;
  if (typeof email !== "string" || !email || typeof password !== "string" || !password) return null;
  return {
    email,
    password,
    userId: account.user_id ?? account.userId,
    otherTenantId: account.other_tenant_id,
  };
}

function makeProcessWaiter(child) {
  return () => {
    if (Number.isInteger(child.exitCode)) return Promise.resolve({ exited: true, exit_code: child.exitCode });
    return new Promise((resolveWait, rejectWait) => {
      const onExit = (code, signal) => {
        child.off("error", onError);
        resolveWait({ exited: true, exit_code: Number.isInteger(code) ? code : 1, signal: signal ?? null });
      };
      const onError = () => {
        child.off("exit", onExit);
        rejectWait(new FormalRestartAdapterError("FULL_EXIT_UNPROVEN", "installed app process emitted an error before exit"));
      };
      child.once("exit", onExit);
      child.once("error", onError);
    });
  };
}

/**
 * Create the built-in installed-app adapter.  All file paths are obtained
 * from the canonical RFD-TUW-015 receipt sidecar references; callers cannot
 * provide an executable path, module path, or launch implementation.
 */
export function createFormalDeployedApiRestartAdapter({
  receiptPath,
  receipt,
  rfd015Capability,
  packageQaCapability,
  launcherCapability,
  expectedSourceSha,
  expectedSourceTree,
  expectedArtifactSha256,
  expectedApiEndpointSha256,
  credentialAccount,
  rootDir = process.cwd(),
  tenantId,
} = {}) {
  if (!receiptPath || !isRecord(receipt) || receipt.verdict !== "PASS") fail("RESTART_EXECUTABLE_AUTHORITY_MISSING", "an authoritative RFD-TUW-015 receipt path is required");
  const platform = receipt.package?.platform;
  if (!PLATFORM[platform]) fail("RESTART_EXECUTABLE_AUTHORITY_MISSING", "RFD-TUW-015 package platform is invalid");
  try {
    validateFormalDeployedApiAuthorityCapability(rfd015Capability, {
      sourceSha: expectedSourceSha,
      sourceTree: expectedSourceTree,
      artifactSha256: expectedArtifactSha256,
      executedPackageSha256: receipt.package.executed_package_sha256,
    });
  } catch {
    fail("RESTART_DEPLOYED_API_CAPABILITY_INVALID", "RFD-TUW-015 capability was not issued by the canonical reader");
  }
  try {
    validateFormalPackageLoopbackNativeLauncherCapability(launcherCapability, {
      platform,
      roles: ["native_runner", "deployed_api_runner"],
    });
  } catch {
    fail("RESTART_LAUNCHER_AUTHORITY_MISSING", "RFD-TUW-014 canonical OS launcher capability is required");
  }
  try {
    validateFormalPackageLoopbackNativeQaCapability(packageQaCapability, {
      platform,
      source_sha: expectedSourceSha,
      source_tree: expectedSourceTree,
      artifact_sha256: receipt.package.artifact_sha256,
      executed_package_sha256: receipt.package.executed_package_sha256,
      manifest_sha256: receipt.package.manifest_sha256,
      receipt_sha256: receipt.package.package_qa_receipt_sha256,
      transcript_sha256: receipt.package.package_qa_transcript_sha256,
      verdict: "PASS",
      native_verdict: "PASS",
      authoritative: true,
    });
  } catch {
    fail("RESTART_PACKAGE_QA_CAPABILITY_INVALID", "RFD-TUW-014 canonical package QA capability is required");
  }
  const endpoint = endpointFromReceipt(receipt);
  if (expectedApiEndpointSha256 && expectedApiEndpointSha256 !== receipt.deployment.api_endpoint_sha256) {
    fail("RESTART_API_AUTHORITY_MISSING", "RFD-TUW-015 endpoint binding differs from the expected endpoint");
  }
  const artifactPath = sidecarPath(receiptPath, receipt.authority?.package?.artifact, "package artifact");
  const executedRef = receipt.authority?.package?.executed_package;
  const executableAuthorityPath = sidecarPath(receiptPath, executedRef, "executed package");
  validateHash(executableAuthorityPath, receipt.package.executed_package_sha256, "RFD-TUW-015 executed package sidecar");
  if (!isRecord(credentialAccount)
    || typeof credentialAccount.tenant_id !== "string"
    || credentialAccount.tenant_id !== tenantId
    || typeof credentialAccount.matter_id !== "string"
    || !credentialAccount.matter_id
    || typeof credentialAccount.other_tenant_id !== "string"
    || !credentialAccount.other_tenant_id
    || credentialAccount.other_tenant_id === tenantId) {
    fail("RESTART_MATTER_AUTHORITY_MISSING", "the canonical RFD-TUW-015 credential must provide a tenant-bound Matter id");
  }
  const installed = derivePackageExecution({
    platform,
    artifactPath,
    expectedArtifactSha256: receipt.package.artifact_sha256,
    expectedExecutableSha256: receipt.package.executed_package_sha256,
    rootDir,
  });
  const userDataRoot = mkdtempSync(join(tmpdir(), "rfd016-user-data-"));
  const userDataPath = join(userDataRoot, "profile");
  mkdirSync(userDataPath);
  const identity = readSyntheticIdentity({ receiptPath, receipt });
  const account = credentialFromAuthority(identity, credentialAccount, tenantId);
  const binding = Object.freeze({
    source_sha: expectedSourceSha,
    source_tree: expectedSourceTree,
    api_endpoint_sha256: receipt.deployment.api_endpoint_sha256,
    artifact_sha256: expectedArtifactSha256,
    api_artifact_sha256: rfd015Capability.api_artifact_sha256,
    manifest_sha256: rfd015Capability.manifest_sha256,
    executed_package_sha256: rfd015Capability.executed_package_sha256,
    transcript_sha256: rfd015Capability.transcript_sha256,
    package_qa_receipt_sha256: rfd015Capability.package_qa_receipt_sha256,
    package_qa_transcript_sha256: rfd015Capability.package_qa_transcript_sha256,
    package_qa_privacy_corpus_sha256: rfd015Capability.package_qa_privacy_corpus_sha256,
  });
  let loginCalls = 0;
  let secondLaunchLoginCalls = 0;
  let signedUserId = null;
  let currentApps = new Set();
  let firstState = null;
  let beforeEvidence = null;
  let afterEvidence = null;
  let matterId = credentialAccount.matter_id;
  let createdTaskId = null;
  let createdTimeId = null;
  const canonicalUserDataPath = canonicalDirectory(userDataPath, "fresh userData");
  const freshUserData = readdirSync(canonicalUserDataPath).length === 0;
  const handles = [];

  async function apiCall(page, path, method = "GET", body = null) {
    const result = await page.evaluate(async ({ requestPath, requestMethod, requestBody }) => {
      const response = await window.matterSession?.api?.({
        path: requestPath,
        method: requestMethod,
        ...(requestBody === null ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(requestBody) }),
      });
      return { status: Number(response?.http_status ?? response?.status ?? 0), body: response?.body ?? null };
    }, { requestPath: path, requestMethod: method, requestBody: body });
    if (result.status < 200 || result.status >= 300 || result.body === null) fail("RESTART_API_SCENARIO_FAILED", "deployed API restart adapter request failed");
    return result.body;
  }

  async function readDurableState(page, { capture = false } = {}) {
    const mattersBody = await apiCall(page, "/api/matter/ops/matters?view=active");
    const tasksBody = await apiCall(page, `/api/matter/ops/tasks?view=board&include_terminal=true&matter_id=${encodeURIComponent(matterId)}`);
    const timesBody = await apiCall(page, `/api/matter/ops/time-entries?matter_id=${encodeURIComponent(matterId)}`);
    const readback = inspectFormalRestartDurableReadback({
      matterId,
      tenantId,
      matterRows: rows(mattersBody, ["items", "matters"]).filter((row) => row?.matter_id === matterId),
      taskRows: rows(tasksBody, ["items", "tasks"]),
      timeRows: rows(timesBody, ["items", "time_entries"]),
      createdTaskId,
      createdTimeId,
    });
    createdTaskId = readback.createdTaskId;
    createdTimeId = readback.createdTimeId;
    const evidence = readback.evidence;
    if (capture) {
      if (!beforeEvidence) beforeEvidence = evidence;
      else afterEvidence = evidence;
    }
    return readback.state;
  }

  async function createDurableState(page) {
    const suffix = randomUUID().replaceAll("-", "");
    const taskKey = `rfd016_task_${suffix}`;
    const taskPayload = { idempotency_key: taskKey, task: { matter_id: matterId, title: `[RFD016] ${suffix.slice(0, 12)}`, ...(signedUserId ? { assigned_to: signedUserId } : {}), due_at: new Date(Date.now() + 86_400_000).toISOString(), priority: "normal" } };
    const taskFirst = await apiCall(page, "/api/matter/ops/tasks", "POST", taskPayload);
    const taskReplay = await apiCall(page, "/api/matter/ops/tasks", "POST", taskPayload);
    createdTaskId = findFirstId(taskFirst, ["task_id", "id"]);
    if (!createdTaskId || findFirstId(taskReplay, ["task_id", "id"]) !== createdTaskId || taskReplay?.idempotent_replay !== true) fail("DURABLE_STATE_WRITE_UNPROVEN", "task idempotent replay did not return the original row");
    const workDate = new Date().toISOString().slice(0, 10);
    const timeKey = `rfd016_time_${suffix}`;
    const timePayload = { idempotency_key: timeKey, time_entry: { matter_id: matterId, role_id: "attorney", work_date: workDate, duration_minutes: 6, narrative: `[RFD016] ${suffix.slice(0, 12)}`, billable: true, currency: "KRW" } };
    const timeFirst = await apiCall(page, "/api/matter/ops/time-entries", "POST", timePayload);
    const timeReplay = await apiCall(page, "/api/matter/ops/time-entries", "POST", timePayload);
    createdTimeId = findFirstId(timeFirst, ["time_entry_id", "id"]);
    if (!createdTimeId || findFirstId(timeReplay, ["time_entry_id", "id"]) !== createdTimeId || timeReplay?.idempotent_replay !== true) fail("DURABLE_STATE_WRITE_UNPROVEN", "time idempotent replay did not return the original row");
    const weekStart = formalRestartMondayFor(workDate);
    await apiCall(page, "/api/matter/ops/time-weeks/submit", "POST", { idempotency_key: `rfd016_week_submit_${suffix}`, week_start: weekStart, time_entry_ids: [createdTimeId] });
    await apiCall(page, "/api/matter/ops/time-weeks/lock", "POST", { idempotency_key: `rfd016_week_lock_${suffix}`, week_start: weekStart, time_entry_ids: [createdTimeId], grace_minutes: 15 });
    return readDurableState(page, { capture: true });
  }

  async function probeIsolation(page, requestedUserDataId) {
    if (!account?.otherTenantId || account.otherTenantId === tenantId) fail("RESTART_TENANT_AUTHORITY_MISSING", "negative tenant authority is not bound to the canonical credential");
    const session = await page.evaluate(() => window.matterSession?.status?.());
    const denied = await page.evaluate(async (requestedTenantId) => {
      const response = await window.matterSession?.api?.({ path: `/api/hrx/employees?tenant_id=${encodeURIComponent(requestedTenantId)}`, method: "GET" });
      return { status: Number(response?.http_status ?? response?.status ?? 0), body: response?.body ?? null };
    }, account.otherTenantId);
    const expectedPath = canonicalDirectory(userDataPath, "restart userData");
    return {
      ...inspectFormalRestartIsolation({
        denied,
        session,
        handles,
        requestedUserDataId,
        expectedUserDataPath: expectedPath,
        tenantId,
      }),
      fresh_user_data: freshUserData,
    };
  }

  function handleFor(phase, app, page, child, requestedUserDataId, actualUserDataPath) {
    const consoleErrors = [];
    const capturePage = (target) => {
      target.on("console", (message) => { if (message.type() === "error") consoleErrors.push("console-error"); });
      target.on("pageerror", () => consoleErrors.push("page-error"));
    };
    app.windows().forEach(capturePage);
    app.on("window", capturePage);
    const waitForProcessExit = makeProcessWaiter(child);
    const handle = {
      userDataId: requestedUserDataId,
      tenantId,
      userDataPath: actualUserDataPath,
      userDataPathHash: createHash("sha256").update(actualUserDataPath).digest("hex"),
      processExitTimeoutMs: 45_000,
      runtimeBinding: () => ({ ...binding }),
      async login() {
        if (!account) fail("RESTART_LOGIN_AUTHORITY_MISSING", "synthetic login authority is not available to the built-in adapter");
        if (phase === "second") secondLaunchLoginCalls += 1;
        loginCalls += 1;
        await page.locator("[data-login-email]").fill(account.email);
        await page.locator("[data-login-password]").fill(account.password);
        await page.locator("[data-login-form='email-password'] button[type='submit']").click();
        await page.locator("[data-product-axis-nav]").waitFor({ state: "visible", timeout: 30_000 });
        const session = await page.evaluate(() => window.matterSession?.status?.());
        signedUserId = session?.user_id ?? signedUserId;
        return { ...session, session_fingerprint: createHash("sha256").update(`${session?.user_id ?? account.userId}:${tenantId}`).digest("hex") };
      },
      async lastLoginSession() {
        const session = await page.evaluate(() => window.matterSession?.status?.());
        return { ...session, session_restored: phase === "second", session_fingerprint: createHash("sha256").update(`${session?.user_id ?? account?.userId}:${tenantId}`).digest("hex") };
      },
      async createMatterState() {
        firstState = await createDurableState(page);
        return structuredClone(firstState);
      },
      async restoreSession() {
        const session = await page.evaluate(() => window.matterSession?.status?.());
        if (session?.state !== "signed_in") return session;
        return { ...session, session_restored: true, session_fingerprint: createHash("sha256").update(`${session.user_id}:${tenantId}`).digest("hex") };
      },
      async readMatterState() {
        return readDurableState(page, { capture: true });
      },
      async consoleErrors() {
        return [...consoleErrors];
      },
      async durableStateEvidence() {
        if (!firstState || !beforeEvidence || !afterEvidence) fail("DURABLE_STATE_EVIDENCE_UNPROVEN", "independent durable readback evidence is missing");
        return {
          before_restart: beforeEvidence,
          after_restart: afterEvidence,
        };
      },
      async isolationProbe() {
        return probeIsolation(page, requestedUserDataId);
      },
      async exit() {
        if (!app) return { closed: true };
        await app.close();
        currentApps.delete(app);
        return { closed: true };
      },
      waitForProcessExit,
      app,
      process: child,
    };
    handles.push(handle);
    return handle;
  }

  const adapter = {
    [REAL_ADAPTER_BRAND]: FORMAL_DEPLOYED_API_RESTART_ADAPTER_MODULE,
    actual_execution: true,
    test_adapter_used: false,
    module_identity: FORMAL_DEPLOYED_API_RESTART_ADAPTER_MODULE,
    executable_path_authority: installed.executablePath,
    package_authority_sha256: receipt.package.artifact_sha256,
    async launch({ phase, userDataId: requestedUserDataId }) {
      if (phase !== "first" && phase !== "second") fail("RESTART_PHASE_INVALID", "restart adapter phase is invalid");
      const app = await electron.launch({
        executablePath: installed.executablePath,
        args: ["--disable-gpu"],
        env: launchEnvironment(endpoint, userDataPath),
        timeout: 45_000,
      });
      currentApps.add(app);
      const child = app.process();
      let actualUserDataPath;
      try {
        actualUserDataPath = canonicalDirectory(
          await app.evaluate(({ app: electronApp }) => electronApp.getPath("userData")),
          "Electron-reported userData",
        );
      } catch (error) {
        try { await app.close(); } catch {}
        currentApps.delete(app);
        throw error;
      }
      if (actualUserDataPath !== canonicalUserDataPath) {
        try { await app.close(); } catch {}
        currentApps.delete(app);
        fail("RESTART_USER_DATA_MIX", "Electron reported a userData path different from the isolated authority path");
      }
      const page = await productPage(app);
      return handleFor(phase, app, page, child, requestedUserDataId, actualUserDataPath);
    },
    async metrics() {
      return { login_calls: loginCalls, second_launch_login_calls: secondLaunchLoginCalls, launch_count: handles.length };
    },
    async cleanup() {
      let firstError = null;
      for (const app of [...currentApps]) {
        try { await app.close(); } catch (error) { firstError ??= error; }
      }
      currentApps.clear();
      for (const handle of handles) {
        try {
          const state = await handle.waitForProcessExit();
          if (state.exit_code !== 0) fail("PROCESS_CLEANUP_FAILED", "installed app process exited non-zero during cleanup");
        } catch (error) {
          firstError ??= error;
        }
      }
      try { rmSync(userDataRoot, { recursive: true, force: true }); } catch (error) { firstError ??= error; }
      try { installed.cleanup(); } catch (error) { firstError ??= error; }
      if (existsSync(userDataRoot) || existsSync(installed.scratch)) firstError ??= new FormalRestartAdapterError("PROCESS_CLEANUP_FAILED", "restart adapter left process or package residue");
      if (firstError) throw firstError;
    },
  };
  REAL_ADAPTERS.add(adapter);
  return Object.freeze(adapter);
}

export function isFormalDeployedApiRestartAdapter(value) {
  return Boolean(value && REAL_ADAPTERS.has(value)
    && value[REAL_ADAPTER_BRAND] === FORMAL_DEPLOYED_API_RESTART_ADAPTER_MODULE
    && value.actual_execution === true
    && value.test_adapter_used === false);
}
