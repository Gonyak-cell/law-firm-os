#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  matterDesktopAuthenticodePowerShell,
} from "./lib/matter-desktop-authenticode.mjs";
import {
  readTrustedFileSnapshot,
  resolveTrustedRoot,
} from "./lib/external-release-trust.mjs";
import {
  requireConfiguredWindowsUpdateRollbackRunner,
  verifyWindowsFormalUpdateApproval,
} from "./lib/windows-formal-update-approval.mjs";
import {
  WINDOWS_UPDATE_RUNNER_RECEIPT_SCHEMA,
  createProductionWindowsApprovalVerifier,
  runWindowsFormalUpdateRollback,
} from "./lib/windows-formal-update-runner.mjs";
import { cleanupTemporaryDirectories } from "./lib/windows-formal-cleanup.mjs";

function fail(code, message = code) {
  throw Object.assign(new Error(message), { code });
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (typeof value !== "string" || value.length < 1 || value.includes("\0")) {
    fail("WINDOWS_RUNNER_INPUT_REQUIRED", `${name} is required`);
  }
  return value;
}

function safeRelative(value, label) {
  const normalized = value.replaceAll("\\", "/");
  if (path.posix.isAbsolute(normalized)
    || normalized.split("/").some((segment) => ["", ".", ".."].includes(segment))) {
    fail("WINDOWS_RUNNER_PATH_INVALID", `${label} must be a safe relative path`);
  }
  return normalized;
}

function requiredChild(root, candidate, label) {
  const target = path.resolve(candidate);
  if (path.dirname(target) !== path.resolve(root)) {
    fail("WINDOWS_RUNNER_PATH_INVALID", `${label} must be a dedicated child of RUNNER_TEMP`);
  }
  return target;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseCanonicalJson(bytes, label) {
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("WINDOWS_RUNNER_JSON_INVALID", `${label} is not valid JSON`);
  }
  if (!Buffer.from(`${JSON.stringify(value, null, 2)}\n`).equals(bytes)) {
    fail("WINDOWS_RUNNER_JSON_NOT_CANONICAL", `${label} must use exact canonical JSON bytes`);
  }
  return value;
}

function waitUntilSync(predicate, code, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  const signal = new Int32Array(new SharedArrayBuffer(4));
  while (Date.now() < deadline) {
    if (predicate()) return;
    Atomics.wait(signal, 0, 0, 250);
  }
  fail(code);
}

async function waitUntil(predicate, code, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  fail(code);
}

function sanitizedLaunchEnvironment(userDataPath) {
  const allowed = [
    "ALLUSERSPROFILE", "APPDATA", "ComSpec", "LOCALAPPDATA", "NUMBER_OF_PROCESSORS",
    "OS", "Path", "PATHEXT", "PROCESSOR_ARCHITECTURE", "ProgramData", "ProgramFiles",
    "ProgramFiles(x86)", "SystemDrive", "SystemRoot", "TEMP", "TMP", "USERPROFILE", "windir",
  ];
  return {
    ...Object.fromEntries(allowed.flatMap((name) => (
      process.env[name] === undefined ? [] : [[name, process.env[name]]]
    ))),
    MATTER_DESKTOP_USER_DATA_PATH: userDataPath,
    MATTER_DESKTOP_LOCAL_API_DISABLED: "1",
    MATTER_DESKTOP_OPERATOR_TOKEN: "",
    MATTER_VAULT_R4_OPERATOR_TOKEN: "",
    MATTER_R4_OPERATOR_TOKEN: "",
    MATTER_OPERATOR_TOKEN: "",
  };
}

function errorCode(error) {
  const value = typeof error?.code === "string" ? error.code : error?.name;
  return /^[A-Z0-9._-]{1,96}$/u.test(value ?? "") ? value : "WINDOWS_UPDATE_ROLLBACK_FAILED";
}

function failureReceipt(error) {
  return {
    schema_version: WINDOWS_UPDATE_RUNNER_RECEIPT_SCHEMA,
    verdict: "FAIL",
    automatic_update: false,
    primary_error_code: errorCode(error),
    primary_error_preserved: true,
    operations: [],
    launches: [],
    residue_checks: [],
    failure_cleanup: { required: false, initiated: false, completed: true },
    boundaries: {
      provider_call_performed: false,
      automatic_update: false,
      public_release_claim: false,
      production_go_live_claim: false,
    },
  };
}

function writeReceipt(receiptPath, value) {
  const bytes = Buffer.from(`${JSON.stringify({
    ...value,
    generated_at: new Date().toISOString(),
  }, null, 2)}\n`);
  writeFileSync(receiptPath, bytes, { flag: "wx", mode: 0o600 });
  return sha256(bytes);
}

let fallbackReceiptPath = null;
let receiptCreated = false;

async function main() {
  if (process.platform !== "win32") {
    fail("WINDOWS_HOST_REQUIRED", "formal Windows update/rollback executor requires a Windows host");
  }

  const runnerTemp = resolveTrustedRoot(requiredEnvironment("RUNNER_TEMP"));
  const artifactRoot = resolveTrustedRoot(requiredEnvironment("MATTER_WINDOWS_UPDATE_ARTIFACT_ROOT"));
  const receiptPath = requiredChild(
    runnerTemp,
    requiredEnvironment("MATTER_WINDOWS_UPDATE_RECEIPT_PATH"),
    "receipt path",
  );
  fallbackReceiptPath = receiptPath;
  const installDir = requiredChild(
    runnerTemp,
    requiredEnvironment("MATTER_WINDOWS_UPDATE_INSTALL_DIR"),
    "install directory",
  );
  const userDataPath = `${installDir}-userdata`;
  if (existsSync(receiptPath) || existsSync(installDir) || existsSync(userDataPath)) {
    fail("WINDOWS_RUNNER_DIRECTORY_NOT_CLEAN", "dedicated install and session directories must not already exist");
  }
  const sourceRunner = {
    source_sha: requiredEnvironment("MATTER_WINDOWS_UPDATE_RUNNER_SOURCE_SHA"),
    source_tree: requiredEnvironment("MATTER_WINDOWS_UPDATE_RUNNER_SOURCE_TREE"),
  };
  if (!/^[0-9a-f]{40}$/u.test(sourceRunner.source_sha)
    || !/^[0-9a-f]{40}$/u.test(sourceRunner.source_tree)) {
    fail("WINDOWS_RUNNER_SOURCE_INVALID", "runner source SHA and tree must be full lowercase Git object IDs");
  }

  const snapshot = (reference, label) => readTrustedFileSnapshot(
    artifactRoot,
    safeRelative(requiredEnvironment(reference), label),
  );
  const executionInputSnapshot = snapshot(
    "MATTER_WINDOWS_UPDATE_EXECUTION_INPUT",
    "execution input",
  );
  const approvalReceiptSnapshot = snapshot(
    "MATTER_WINDOWS_UPDATE_APPROVAL_RECEIPT",
    "approval receipt",
  );
  const approvalSignatureSnapshot = snapshot(
    "MATTER_WINDOWS_UPDATE_APPROVAL_SIGNATURE",
    "approval signature",
  );
  const executionInput = parseCanonicalJson(executionInputSnapshot.bytes, "Windows execution input");
  const confirmationDir = resolveTrustedRoot(
    requiredEnvironment("MATTER_WINDOWS_UPDATE_CONFIRMATION_DIR"),
  );
  if (readdirSync(confirmationDir).length !== 0) {
    fail("WINDOWS_OPERATION_PRECONFIRMATION_FORBIDDEN", "operation confirmation directory must start empty");
  }

  const productionApprovalVerifier = createProductionWindowsApprovalVerifier({
    approvalSignatureBytes: approvalSignatureSnapshot.bytes,
  });
  requireConfiguredWindowsUpdateRollbackRunner({
    platform: process.platform,
    productionApprovalVerifier,
  });
  const verifiedApproval = await verifyWindowsFormalUpdateApproval({
    approvalBundleBytes: approvalReceiptSnapshot.bytes,
    verifyApprovalBundle: productionApprovalVerifier,
  });

  const artifactSnapshot = (relativePath) => readTrustedFileSnapshot(
    artifactRoot,
    safeRelative(relativePath, "candidate artifact path"),
  );
  const installedSnapshot = (absolutePath) => {
    const relative = path.relative(installDir, absolutePath);
    if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      fail("WINDOWS_INSTALLED_PATH_INVALID", "installed path escapes the dedicated install directory");
    }
    return readTrustedFileSnapshot(installDir, relative);
  };
  const resolveCandidatePath = (filePath) => artifactSnapshot(filePath).target;
  const readAny = async (filePath) => (
    path.isAbsolute(filePath) ? installedSnapshot(filePath).bytes : artifactSnapshot(filePath).bytes
  );
  const authenticode = async (filePath) => {
    const target = path.isAbsolute(filePath) ? installedSnapshot(filePath).target : resolveCandidatePath(filePath);
    return JSON.parse(execFileSync("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      matterDesktopAuthenticodePowerShell(),
    ], {
      encoding: "utf8",
      env: { ...sanitizedLaunchEnvironment(userDataPath), MATTER_AUTHENTICODE_PATH: target },
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    }).trim());
  };

  const sessions = new Set();
  const sessionActive = (session) => session?.exitCode === null && session?.signalCode === null;
  const closeSession = async (session) => {
    if (!sessionActive(session)) return;
    execFileSync("taskkill.exe", ["/PID", String(session.pid), "/T", "/F"], {
      stdio: "ignore",
      env: sanitizedLaunchEnvironment(userDataPath),
      windowsHide: true,
    });
    await waitUntil(() => !sessionActive(session), "WINDOWS_SESSION_RESIDUE");
  };
  const entries = () => (existsSync(installDir) ? readdirSync(installDir) : []);
  const uninstallerNames = () => entries().filter((name) => /^uninstall.*\.exe$/iu.test(name));

  const adapters = {
    installDir,
    readFile: readAny,
    readAuthenticode: authenticode,
    async confirmOperation({ operation, approvalIdSha256 }) {
      const responseName = `${operation}.approval`;
      if (existsSync(path.join(confirmationDir, responseName))) {
        fail("WINDOWS_OPERATION_PRECONFIRMATION_FORBIDDEN", `operator confirmation for ${operation} was supplied too early`);
      }
      process.stdout.write(`${JSON.stringify({ waiting_for_operation: operation })}\n`);
      await waitUntil(
        () => existsSync(path.join(confirmationDir, responseName)),
        "WINDOWS_OPERATION_CONFIRMATION_REQUIRED",
        10 * 60_000,
      );
      const response = readTrustedFileSnapshot(confirmationDir, responseName);
      const confirmation = response.bytes.toString("utf8").replace(/\r?\n$/u, "");
      if (!/^[A-Z0-9][A-Z0-9._-]{7,127}$/u.test(confirmation)
        || sha256(Buffer.from(confirmation)) !== approvalIdSha256) {
        fail("WINDOWS_OPERATION_CONFIRMATION_INVALID", `operator confirmation for ${operation} is invalid`);
      }
      unlinkSync(response.target);
      return true;
    },
    async install({ installerPath }) {
      execFileSync(resolveCandidatePath(installerPath), ["/S", `/D=${installDir}`], {
        stdio: "inherit",
        env: sanitizedLaunchEnvironment(userDataPath),
        windowsHide: true,
      });
    },
    async inspectInstallation() {
      const executablePath = path.join(installDir, "matter.exe");
      const names = uninstallerNames();
      if (names.length !== 1) {
        fail("WINDOWS_UNINSTALLER_INVALID", "installed NSIS package must expose exactly one uninstaller");
      }
      const manifestBytes = installedSnapshot(
        path.join(installDir, "resources", "matter-build-manifest.json"),
      ).bytes;
      const manifest = parseCanonicalJson(manifestBytes, "installed build manifest");
      return {
        executable_path: installedSnapshot(executablePath).target,
        uninstaller_path: installedSnapshot(path.join(installDir, names[0])).target,
        version: manifest.version,
        source_sha: manifest.source_sha,
        source_tree: manifest.source_tree,
      };
    },
    async launch({ executablePath }) {
      mkdirSync(userDataPath, { recursive: true });
      const session = spawn(executablePath, ["--disable-gpu"], {
        env: sanitizedLaunchEnvironment(userDataPath),
        stdio: "ignore",
        windowsHide: false,
      });
      sessions.add(session);
      await new Promise((resolve, reject) => {
        session.once("spawn", resolve);
        session.once("error", reject);
      });
      await waitUntil(() => sessionActive(session), "WINDOWS_SESSION_NOT_ACTIVE", 5_000);
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      if (!sessionActive(session)) {
        fail("WINDOWS_SESSION_NOT_ACTIVE", "installed Matter session exited during launch smoke");
      }
      return session;
    },
    closeSession,
    isSessionActive: async (session) => sessionActive(session),
    async closeAllSessions() {
      for (const session of sessions) await closeSession(session).catch(() => {});
    },
    async uninstall({ uninstallerPath }) {
      execFileSync(uninstallerPath, ["/S"], {
        stdio: "inherit",
        env: sanitizedLaunchEnvironment(userDataPath),
        windowsHide: true,
      });
    },
    async waitForUninstalled() {
      await waitUntil(
        () => !existsSync(installDir) || entries().length === 0,
        "WINDOWS_UNINSTALL_RESIDUE",
        45_000,
      );
    },
    async residue() {
      return {
        executable_present: existsSync(path.join(installDir, "matter.exe")),
        uninstaller_count: uninstallerNames().length,
        entry_count: entries().length,
        active_session_count: [...sessions].filter(sessionActive).length,
      };
    },
    exists: existsSync,
    list: (directory) => (existsSync(directory) ? readdirSync(directory) : []),
    executeCleanup: (filePath, args) => execFileSync(filePath, args, {
      stdio: "ignore",
      env: sanitizedLaunchEnvironment(userDataPath),
      windowsHide: true,
    }),
    waitForRemoval: (filePath) => waitUntilSync(
      () => !existsSync(filePath),
      "WINDOWS_EXECUTABLE_RESIDUE",
    ),
    warn: (warning) => process.stderr.write(`${JSON.stringify({
      warning: warning.warning,
      error_code: warning.error_code,
      residue_present: warning.residue_present === true,
    })}\n`),
  };

  let cleanupPermitted = false;
  try {
    const result = await runWindowsFormalUpdateRollback({
      executionInput,
      verifiedApproval,
      adapters,
    });
    const receipt = {
      ...result,
      approval_signature_sha256: sha256(approvalSignatureSnapshot.bytes),
      source_runner: sourceRunner,
    };
    const receiptSha256 = writeReceipt(receiptPath, receipt);
    receiptCreated = true;
    cleanupPermitted = true;
    process.stdout.write(`${JSON.stringify({
      verdict: receipt.verdict,
      receipt_sha256: receiptSha256,
      automatic_update: false,
      operations: receipt.operations.map(({ operation }) => operation),
    })}\n`);
  } catch (error) {
    const receipt = error.windows_update_rollback ?? failureReceipt(error);
    cleanupPermitted = receipt.failure_cleanup.initiated === true;
    writeReceipt(receiptPath, receipt);
    receiptCreated = true;
    process.stderr.write(`${JSON.stringify({
      verdict: "FAIL",
      primary_error_code: receipt.primary_error_code,
      receipt_written: true,
    })}\n`);
    // Exit 2 means this invocation exclusively created a sanitized failure receipt.
    process.exitCode = 2;
  } finally {
    if (cleanupPermitted) {
      cleanupTemporaryDirectories([
        userDataPath,
        ...(!existsSync(installDir) || readdirSync(installDir).length === 0 ? [installDir] : []),
      ], { priorError: process.exitCode ? new Error("operator sequence failed") : null });
    }
  }
}

main().catch((error) => {
  if (fallbackReceiptPath !== null) {
    writeReceipt(fallbackReceiptPath, failureReceipt(error));
    receiptCreated = true;
  }
  process.stderr.write(`${JSON.stringify({
    verdict: "FAIL",
    primary_error_code: errorCode(error),
    receipt_written: receiptCreated,
  })}\n`);
  process.exitCode = receiptCreated ? 2 : 1;
});
