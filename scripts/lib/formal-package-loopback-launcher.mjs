import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync, rmSync } from "node:fs";
import path from "node:path";

export const FORMAL_PACKAGE_LOOPBACK_LAUNCH_ATTESTATION_SCHEMA =
  "law-firm-os.formal-package-os-launcher.v1";
export const FORMAL_PACKAGE_LOOPBACK_LAUNCH_CAPABILITY_SCHEMA =
  "law-firm-os.formal-package-os-launcher-capability.v1";
export const FORMAL_PACKAGE_LOOPBACK_LAUNCH_ENV = Object.freeze({
  attestationPath: "MATTER_FORMAL_QA_LAUNCH_ATTESTATION_PATH",
  token: "MATTER_FORMAL_QA_LAUNCH_TOKEN",
});

const ROOT = path.resolve(import.meta.dirname, "../..");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const ATTESTATION_KEYS = Object.freeze([
  "created_at", "launcher_path", "launcher_pid", "node_path", "platform",
  "runner_path", "schema_version", "token",
]);
const LAUNCHERS = Object.freeze({
  macos: Object.freeze({
    processPlatform: "darwin",
    native: Object.freeze({
      role: "native_runner",
      runnerPath: path.join(ROOT, "scripts/run-formal-macos-package-qa.mjs"),
      launcherPath: path.join(ROOT, "scripts/run-formal-macos-package-qa.sh"),
    }),
    deployed: Object.freeze({
      role: "deployed_api_runner",
      runnerPath: path.join(ROOT, "scripts/internal/run-formal-deployed-api-package-qa.mjs"),
      launcherPath: path.join(ROOT, "scripts/run-formal-deployed-api-package-qa.sh"),
    }),
    rf13Goal: Object.freeze({
      role: "rf13_goal_validator",
      runnerPath: path.join(ROOT, "scripts/internal/run-matter-rf13-debt-remediation-goal.mjs"),
      launcherPath: path.join(ROOT, "scripts/run-matter-rf13-debt-remediation-goal.sh"),
    }),
  }),
  windows: Object.freeze({
    processPlatform: "win32",
    native: Object.freeze({
      role: "native_runner",
      runnerPath: path.join(ROOT, "scripts/run-formal-windows-package-qa.mjs"),
      launcherPath: path.join(ROOT, "scripts/run-formal-windows-package-qa.ps1"),
    }),
    deployed: Object.freeze({
      role: "deployed_api_runner",
      runnerPath: path.join(ROOT, "scripts/internal/run-formal-deployed-api-package-qa.mjs"),
      launcherPath: path.join(ROOT, "scripts/run-formal-deployed-api-package-qa.ps1"),
    }),
  }),
});
const INITIAL_COMMAND_LINE = Object.freeze([...(process.report?.getReport()?.header?.commandLine ?? [])]);
const INITIAL_ENTRYPOINT = INITIAL_COMMAND_LINE.length >= 2
  ? path.resolve(INITIAL_COMMAND_LINE[1])
  : null;
const CAPABILITIES = new WeakSet();

export class FormalPackageLauncherError extends Error {
  constructor(message) {
    super(message);
    this.name = "FormalPackageLauncherError";
    this.code = "LAUNCHER_REQUIRED";
  }
}

function fail(message) {
  throw new FormalPackageLauncherError(message);
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  const expected = [...keys].sort();
  const actual = Object.keys(value).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label} fields drifted`);
}

function configuration(platform) {
  const platformConfiguration = LAUNCHERS[platform];
  if (!platformConfiguration || process.platform !== platformConfiguration.processPlatform) {
    fail("the launcher platform does not match the current operating system");
  }
  const entry = [platformConfiguration.native, platformConfiguration.deployed, platformConfiguration.rf13Goal]
    .filter(Boolean)
    .find(({ runnerPath }) => INITIAL_ENTRYPOINT === runnerPath);
  if (!entry) fail("the immutable Node entrypoint is not an allowlisted internal runner");
  return entry;
}

function parentCommandLine(platform, parentPid) {
  try {
    if (platform === "macos") {
      return execFileSync("/bin/ps", ["-ww", "-p", String(parentPid), "-o", "command="], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    }
    const systemRoot = process.env.SystemRoot ?? process.env.SYSTEMROOT ?? "C:\\Windows";
    const powershell = path.join(systemRoot, "System32/WindowsPowerShell/v1.0/powershell.exe");
    const command = `$p=Get-CimInstance Win32_Process -Filter 'ProcessId = ${parentPid}'; if ($null -eq $p) { exit 1 }; [Console]::Out.Write($p.CommandLine)`;
    return execFileSync(powershell, ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", command], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    fail("the OS launcher parent process could not be verified");
  }
}

function commandContainsPath(command, filePath, platform) {
  if (platform === "windows") {
    return command.replaceAll("/", "\\").toLowerCase()
      .includes(filePath.replaceAll("/", "\\").toLowerCase());
  }
  return command.includes(filePath);
}

function canonicalExistingPath(value, label) {
  if (typeof value !== "string" || !path.isAbsolute(value)) fail(`${label} must be absolute`);
  try {
    return realpathSync(value);
  } catch {
    fail(`${label} does not exist`);
  }
}

export function claimFormalPackageLoopbackNativeLauncher({ platform } = {}) {
  const entry = configuration(platform);
  if (Object.hasOwn(process.env, "NODE_OPTIONS") || Object.hasOwn(process.env, "NODE_PATH")) {
    fail("Node injection variables must be absent in the launcher child");
  }
  if (process.execArgv.length !== 0) fail("the launcher child must not receive Node execution options");
  const attestationPathValue = process.env[FORMAL_PACKAGE_LOOPBACK_LAUNCH_ENV.attestationPath];
  const token = process.env[FORMAL_PACKAGE_LOOPBACK_LAUNCH_ENV.token];
  if (!attestationPathValue || !token || !UUID.test(token)) fail("one-time OS launcher attestation is required");

  let metadata;
  let attestationPath;
  try {
    const stat = lstatSync(attestationPathValue);
    if (!stat.isFile() || stat.isSymbolicLink()) fail("launcher attestation must be a regular non-symlink file");
    if (process.platform !== "win32") {
      if ((stat.mode & 0o077) !== 0) fail("launcher attestation permissions are too broad");
      if (typeof process.getuid === "function" && stat.uid !== process.getuid()) fail("launcher attestation owner drifted");
    }
    attestationPath = realpathSync(attestationPathValue);
    const relative = path.relative(ROOT, attestationPath);
    if (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) {
      fail("launcher attestation must remain outside the repository");
    }
    metadata = JSON.parse(readFileSync(attestationPath, "utf8"));
  } catch (error) {
    if (error instanceof FormalPackageLauncherError) throw error;
    fail("launcher attestation is missing or invalid");
  }
  exactKeys(metadata, ATTESTATION_KEYS, "launcher attestation");
  if (metadata.schema_version !== FORMAL_PACKAGE_LOOPBACK_LAUNCH_ATTESTATION_SCHEMA
    || metadata.platform !== platform
    || metadata.token !== token
    || !UUID.test(metadata.token)
    || !Number.isSafeInteger(metadata.launcher_pid)
    || metadata.launcher_pid !== process.ppid) {
    fail("launcher attestation identity is invalid");
  }
  const createdAt = Date.parse(metadata.created_at);
  const age = Date.now() - createdAt;
  if (!Number.isFinite(createdAt) || age < -5_000 || age > 60_000) fail("launcher attestation is stale");

  const expectedLauncher = realpathSync(entry.launcherPath);
  const expectedRunner = realpathSync(entry.runnerPath);
  const expectedNode = realpathSync(process.execPath);
  if (canonicalExistingPath(metadata.launcher_path, "launcher path") !== expectedLauncher
    || canonicalExistingPath(metadata.runner_path, "runner path") !== expectedRunner
    || canonicalExistingPath(metadata.node_path, "Node path") !== expectedNode) {
    fail("launcher attestation paths drifted");
  }
  if (!commandContainsPath(parentCommandLine(platform, metadata.launcher_pid), expectedLauncher, platform)) {
    fail("the parent process is not the canonical OS launcher");
  }

  try {
    rmSync(attestationPath);
  } catch {
    fail("one-time launcher attestation could not be consumed");
  }
  delete process.env[FORMAL_PACKAGE_LOOPBACK_LAUNCH_ENV.attestationPath];
  delete process.env[FORMAL_PACKAGE_LOOPBACK_LAUNCH_ENV.token];
  const capability = Object.freeze({
    schema_version: FORMAL_PACKAGE_LOOPBACK_LAUNCH_CAPABILITY_SCHEMA,
    platform,
    role: entry.role,
    runner_path: expectedRunner,
    launcher_path: expectedLauncher,
    node_path: expectedNode,
    attestation_sha256: createHash("sha256").update(JSON.stringify(metadata)).digest("hex"),
  });
  CAPABILITIES.add(capability);
  return capability;
}

export function validateFormalPackageLoopbackNativeLauncherCapability(capability, {
  platform,
  runnerPath,
  roles,
} = {}) {
  if (!capability || !CAPABILITIES.has(capability)) fail("opaque OS launcher capability is required");
  exactKeys(capability, [
    "attestation_sha256", "launcher_path", "node_path", "platform", "role", "runner_path", "schema_version",
  ], "launcher capability");
  if (capability.schema_version !== FORMAL_PACKAGE_LOOPBACK_LAUNCH_CAPABILITY_SCHEMA
    || (platform !== undefined && capability.platform !== platform)
    || (runnerPath !== undefined && capability.runner_path !== path.resolve(runnerPath))
    || (roles !== undefined && (!Array.isArray(roles) || !roles.includes(capability.role)))) {
    fail("OS launcher capability binding drifted");
  }
  return capability;
}
