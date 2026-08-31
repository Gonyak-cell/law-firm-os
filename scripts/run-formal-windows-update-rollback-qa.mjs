#!/usr/bin/env node
import { execFileSync } from "node:child_process";
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
  validateMatterDesktopAuthenticodeSignature,
} from "./lib/matter-desktop-authenticode.mjs";
import {
  DESKTOP_INSTALLED_TREE_NATIVE_SNAPSHOT_SCHEMA,
  DESKTOP_INSTALLED_TREE_SBOM_SCHEMA,
} from "./lib/matter-desktop-provenance.mjs";
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
import { openWindowsLockedExecutable } from "./lib/windows-locked-executable.mjs";
import { captureWindowsInstalledTreeNativeSnapshot } from "./lib/windows-installed-tree-native-snapshot.mjs";

const SHA256 = /^[0-9a-f]{64}$/u;

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

function exactSbomProperties(sbom) {
  const entries = sbom?.metadata?.component?.properties;
  if (!Array.isArray(entries)) {
    fail("WINDOWS_INSTALLED_TREE_SBOM_INVALID", "installed-tree SBOM metadata properties are required");
  }
  const properties = Object.create(null);
  for (const entry of entries) {
    if (typeof entry?.name !== "string" || typeof entry?.value !== "string"
      || properties[entry.name] !== undefined) {
      fail("WINDOWS_INSTALLED_TREE_SBOM_INVALID", "installed-tree SBOM properties are invalid or duplicated");
    }
    properties[entry.name] = entry.value;
  }
  return properties;
}

function positiveInteger(value, label) {
  if (!/^[1-9][0-9]*$/u.test(value ?? "")) {
    fail("WINDOWS_INSTALLED_TREE_SBOM_INVALID", `${label} is invalid`);
  }
  const result = Number(value);
  if (!Number.isSafeInteger(result)) {
    fail("WINDOWS_INSTALLED_TREE_SBOM_INVALID", `${label} exceeds the safe integer range`);
  }
  return result;
}

function installedTreeBindingFromSbom(sbom, candidate, role) {
  const properties = exactSbomProperties(sbom);
  const property = (name) => properties[`law-firm-os:${name}`];
  const executablePath = property("installed-executable-path");
  const executableBody = typeof executablePath === "string" && executablePath.startsWith("./")
    ? executablePath.slice(2)
    : "";
  const executableRows = (Array.isArray(sbom?.components) ? sbom.components : []).filter((component) => (
    component?.type === "file" && component?.name === executablePath
  ));
  const executableHashes = executableRows[0]?.hashes?.filter(({ alg }) => alg === "SHA-256") ?? [];
  const executableByteProperties = executableRows[0]?.properties?.filter(
    ({ name }) => name === "law-firm-os:file-bytes",
  ) ?? [];
  const executableSha256 = property("installed-executable-sha256");
  if (sbom?.bomFormat !== "CycloneDX"
    || sbom.specVersion !== "1.5"
    || sbom.metadata?.component?.version !== candidate.version
    || property("schema-version") !== DESKTOP_INSTALLED_TREE_SBOM_SCHEMA
    || property("source-sha") !== candidate.source_sha
    || property("source-tree") !== candidate.source_tree
    || property("installer-sha256") !== candidate.artifact_sha256
    || property("installed-file-content-complete") !== "true"
    || property("installed-directory-identity-complete") !== "true"
    || property("native-snapshot-schema-version") !== DESKTOP_INSTALLED_TREE_NATIVE_SNAPSHOT_SCHEMA
    || property("native-filesystem") !== "NTFS"
    || property("native-fixed-point-sequence") !== "B0->I1->B1->I2->B2"
    || property("native-fixed-point-exact") !== "true"
    || property("reparse-point-count") !== "0"
    || property("alternate-data-stream-count") !== "0"
    || property("authenticode-valid") !== "true"
    || !SHA256.test(property("installed-tree-sha256") ?? "")
    || !SHA256.test(property("native-identity-sha256") ?? "")
    || !SHA256.test(executableSha256 ?? "")
    || !/^\.\/(?!\.\.\/)[^\\:\0\r\n]+\.exe$/iu.test(executablePath ?? "")
    || path.posix.normalize(executableBody) !== executableBody
    || executablePath !== executablePath.normalize("NFC")
    || executableRows.length !== 1
    || executableHashes.length !== 1
    || executableHashes[0].content?.toLowerCase() !== executableSha256
    || executableByteProperties.length !== 1) {
    fail("WINDOWS_INSTALLED_TREE_SBOM_INVALID", `${role} installed-tree SBOM differs from the admitted candidate`);
  }
  return Object.freeze({
    schema_version: property("native-snapshot-schema-version"),
    content_sha256: property("installed-tree-sha256"),
    identity_sha256: property("native-identity-sha256"),
    file_count: positiveInteger(property("installed-tree-file-count"), `${role} installed-tree file count`),
    directory_count: positiveInteger(property("native-directory-count"), `${role} installed-tree directory count`),
    bytes: positiveInteger(property("installed-tree-bytes"), `${role} installed-tree byte count`),
    installed_executable_path: executablePath,
    installed_executable_sha256: executableSha256,
    installed_executable_bytes: positiveInteger(
      executableByteProperties[0].value,
      `${role} installed executable byte count`,
    ),
  });
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

async function settleLockedSession(session, pid) {
  if (!session || session.released) return;
  try {
    if (pid) await session.waitForProcessExit(pid);
    const release = await session.release();
    if (release?.released !== true || session.released !== true) {
      fail("WINDOWS_EXECUTABLE_LOCK_RELEASE_UNVERIFIED", "locked executable release was not observed");
    }
  } catch (error) {
    if (session.released) throw error;
    try {
      const abort = await session.abort();
      if (abort?.released !== true || session.released !== true) {
        fail("WINDOWS_EXECUTABLE_LOCK_ABORT_UNVERIFIED", "locked executable abort was not observed");
      }
    } catch (abortError) {
      throw Object.assign(
        new AggregateError([error, abortError], "locked executable settlement and abort both failed"),
        { code: "WINDOWS_EXECUTABLE_LOCK_SETTLEMENT_FAILED" },
      );
    }
    throw error;
  }
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
    uninstalls: [],
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
  const generatedAt = value.generated_at ?? new Date().toISOString();
  const bytes = Buffer.from(`${JSON.stringify({
    ...value,
    generated_at: generatedAt,
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
  const installedTreeBindings = Object.freeze(Object.fromEntries(["baseline", "target"].map((role) => {
    const candidateDirectory = path.posix.dirname(
      safeRelative(executionInput[role]?.installer_path ?? "", `${role} installer path`),
    );
    const sbomSnapshot = artifactSnapshot(
      path.posix.join(candidateDirectory, "windows-installed-tree-sbom.cdx.json"),
    );
    const sbom = parseCanonicalJson(sbomSnapshot.bytes, `${role} installed-tree SBOM`);
    return [role, installedTreeBindingFromSbom(sbom, verifiedApproval.candidates[role], role)];
  })));
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
  const sessionStatus = async (session) => {
    if (!Number.isSafeInteger(session?.pid) || session.pid <= 0 || !session.lockedSession) {
      fail("WINDOWS_SESSION_PID_INVALID", "installed Matter session PID is not natively tracked");
    }
    const status = await session.lockedSession.status(session.pid);
    if (status.pid !== session.pid || status.path_identity !== "pid_executable_path"
      || status.active === status.process_exited
      || (status.active && status.exit_code !== null)
      || (status.process_exited && !Number.isInteger(status.exit_code))) {
      fail("WINDOWS_SESSION_STATUS_UNVERIFIED", "native Matter session status proof is incomplete");
    }
    return status;
  };
  const abortMatterSession = async (session) => {
    const abort = await session.lockedSession.abort();
    if (abort?.released !== true || session.lockedSession.released !== true
      || (abort.child_present && (abort.process_exited !== true
        || !Number.isInteger(abort.exit_code)
        || !Number.isSafeInteger(abort.pid) || abort.pid <= 0))
      || (!abort.child_present && (abort.pid !== null
        || abort.process_exited !== null || abort.exit_code !== null))
      || (session.pid !== null && (!abort.child_present || abort.pid !== session.pid))) {
      fail("WINDOWS_SESSION_ABORT_UNVERIFIED", "failed Matter session abort was not natively observed");
    }
    sessions.delete(session);
    return abort;
  };
  const settleMatterSession = async (session, { requireLive }) => {
    if (!session || !sessions.has(session) || !session.lockedSession) {
      fail("WINDOWS_SESSION_INVALID", "installed Matter session is not tracked");
    }
    if (session.closeEvidence) {
      if (session.lockedSession.released !== true) {
        fail("WINDOWS_SESSION_CLOSE_UNVERIFIED", "closed Matter session state changed unexpectedly");
      }
      return session.closeEvidence;
    }
    if (session.pid === null) {
      await abortMatterSession(session);
      return null;
    }
    if (session.lockedSession.released === true) {
      fail("WINDOWS_SESSION_CLOSE_UNVERIFIED", "Matter executable lock was released without close evidence");
    }
    const beforeStop = await sessionStatus(session);
    if (requireLive && !beforeStop.active) {
      fail("WINDOWS_SESSION_NOT_ACTIVE", "installed Matter session exited before controlled close");
    }
    const stopped = beforeStop.active
      ? await session.lockedSession.stop(session.pid)
      : beforeStop;
    const afterStop = await sessionStatus(session);
    if (stopped.pid !== session.pid || stopped.process_exited !== true
      || !Number.isInteger(stopped.exit_code)
      || afterStop.pid !== session.pid || afterStop.process_exited !== true
      || afterStop.active !== false || afterStop.exit_code !== stopped.exit_code) {
      fail("WINDOWS_SESSION_EXIT_UNVERIFIED", "installed Matter session exit was not observed");
    }
    const release = await session.lockedSession.release();
    if (release?.released !== true || session.lockedSession.released !== true) {
      fail("WINDOWS_SESSION_LOCK_RELEASE_UNVERIFIED", "installed Matter executable lock release was not observed");
    }
    session.closeEvidence = Object.freeze({
      exit_code: stopped.exit_code,
      lock_released: true,
      pid: session.pid,
      process_exited: true,
    });
    return session.closeEvidence;
  };
  const closeSession = (session) => settleMatterSession(session, { requireLive: true });
  const entries = () => (existsSync(installDir) ? readdirSync(installDir) : []);
  const uninstallerNames = () => entries().filter((name) => /^uninstall.*\.exe$/iu.test(name));
  const lockedUninstaller = async (uninstallerPath) => {
    const inventory = captureWindowsInstalledTreeNativeSnapshot(installDir);
    const relativePath = path.relative(installDir, uninstallerPath).split(path.sep).join("/");
    if (!relativePath || relativePath.startsWith("../") || path.isAbsolute(relativePath)) {
      fail("WINDOWS_UNINSTALLER_PATH_INVALID", "installed uninstaller escaped the dedicated install directory");
    }
    const installedTreePath = `./${relativePath}`;
    const inventoryEntry = inventory.files.find(({ path: candidatePath }) => candidatePath === installedTreePath);
    if (!inventoryEntry) {
      fail("WINDOWS_UNINSTALLER_INVENTORY_MISMATCH", `installed-tree inventory is missing ${installedTreePath}`);
    }
    const session = await openWindowsLockedExecutable({
      executablePath: uninstallerPath,
      expectedSha256: inventoryEntry.sha256,
    });
    let processRecord;
    let waitResult;
    try {
      const verification = validateMatterDesktopAuthenticodeSignature(
        session.inspection.authenticode,
        { expectedCertificateSha1: verifiedApproval.authenticode_signer_certificate_sha1 },
      );
      processRecord = await session.launch(["/S"], {
        cwd: installDir,
        processTreePolicy: "verified-bootstrap",
      });
      waitResult = await session.waitForProcessExit(processRecord.pid);
      if (waitResult.exit_code !== 0) {
        fail("WINDOWS_UNINSTALLER_EXIT", "locked NSIS uninstaller returned a non-zero exit code");
      }
      return Object.freeze({
        path: installedTreePath,
        installed_tree_path: installedTreePath,
        installed_tree_sha256: inventoryEntry.sha256,
        sha256: session.inspection.sha256,
        uninstaller_bytes: session.inspection.bytes,
        bytes: session.inspection.bytes,
        authenticode: session.inspection.authenticode,
        authenticode_valid: verification.signature_count === 1,
        lock_mode: session.inspection.lock_mode,
        denies_write_delete: session.inspection.denies_write_delete,
        process: Object.freeze({
          pid: processRecord.pid,
          path_identity: processRecord.path_identity,
          process_tree_policy: processRecord.process_tree_policy,
        }),
        exit_code: waitResult.exit_code,
      });
    } finally {
      await settleLockedSession(session, processRecord?.pid);
    }
  };

  const adapters = {
    installDir,
    readFile: readAny,
    readAuthenticode: authenticode,
    async captureInstalledTree() {
      return captureWindowsInstalledTreeNativeSnapshot(installDir);
    },
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
    async install({ installerPath, expectedSha256, expectedCertificateSha1 }) {
      const lockedSession = await openWindowsLockedExecutable({
        executablePath: resolveCandidatePath(installerPath),
        expectedSha256,
      });
      let processRecord;
      try {
        validateMatterDesktopAuthenticodeSignature(
          lockedSession.inspection.authenticode,
          { expectedCertificateSha1 },
        );
        processRecord = await lockedSession.launch(["/S", `/D=${installDir}`], {
          cwd: artifactRoot,
          processTreePolicy: "verified-bootstrap",
        });
        const result = await lockedSession.waitForProcessExit(processRecord.pid);
        if (result.exit_code !== 0) fail("WINDOWS_INSTALLER_EXIT", "locked NSIS installer returned a non-zero exit code");
      } finally {
        await settleLockedSession(lockedSession, processRecord?.pid);
      }
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
    async launch({ executablePath, expectedSha256, expectedCertificateSha1 }) {
      mkdirSync(userDataPath, { recursive: true });
      const lockedSession = await openWindowsLockedExecutable({ executablePath, expectedSha256 });
      const session = { pid: null, lockedSession, closeEvidence: null };
      sessions.add(session);
      let processRecord;
      try {
        validateMatterDesktopAuthenticodeSignature(
          lockedSession.inspection.authenticode,
          { expectedCertificateSha1 },
        );
        processRecord = await lockedSession.launch(["--disable-gpu"], { cwd: installDir });
        session.pid = processRecord.pid;
        if (!(await sessionStatus(session)).active) {
          fail("WINDOWS_SESSION_NOT_ACTIVE", "installed Matter session exited before launch smoke");
        }
        const smokeDeadline = Date.now() + 3_000;
        while (Date.now() < smokeDeadline) {
          if (!(await sessionStatus(session)).active || lockedSession.released === true) {
            fail("WINDOWS_SESSION_NOT_ACTIVE", "installed Matter session exited during launch smoke");
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        if (!(await sessionStatus(session)).active || lockedSession.released === true) {
          fail("WINDOWS_SESSION_NOT_ACTIVE", "installed Matter session exited at the launch smoke boundary");
        }
        return session;
      } catch (error) {
        try {
          await abortMatterSession(session);
        } catch (abortError) {
          throw Object.assign(
            new AggregateError([error, abortError], "Matter launch and locked-session abort both failed"),
            { code: "WINDOWS_SESSION_ABORT_FAILED" },
          );
        }
        throw error;
      }
    },
    closeSession,
    isSessionActive: async (session) => {
      if (session?.closeEvidence) return false;
      return (await sessionStatus(session)).active;
    },
    async closeAllSessions() {
      const failures = [];
      for (const session of sessions) {
        try {
          await settleMatterSession(session, { requireLive: false });
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length > 0) {
        throw Object.assign(
          new AggregateError(failures, "one or more Matter sessions could not be closed"),
          { code: "WINDOWS_SESSION_CLEANUP_FAILED" },
        );
      }
    },
    async uninstall({ uninstallerPath }) {
      return lockedUninstaller(uninstallerPath);
    },
    async waitForUninstalled() {
      await waitUntil(
        () => !existsSync(installDir) || entries().length === 0,
        "WINDOWS_UNINSTALL_RESIDUE",
        45_000,
      );
    },
    async residue() {
      let activeSessionCount = 0;
      for (const session of sessions) {
        if (session.closeEvidence) {
          if (session.closeEvidence.process_exited !== true
            || session.closeEvidence.lock_released !== true
            || session.lockedSession.released !== true) {
            fail("WINDOWS_SESSION_CLOSE_UNVERIFIED", "closed Matter session proof is incomplete");
          }
          continue;
        }
        if (session.pid === null) {
          fail("WINDOWS_SESSION_CLOSE_UNVERIFIED", "an unproved Matter launch remains tracked");
        }
        if ((await sessionStatus(session)).active) {
          activeSessionCount += 1;
        } else {
          fail("WINDOWS_SESSION_CLOSE_UNVERIFIED", "exited Matter session lacks verified lock release evidence");
        }
      }
      return {
        executable_present: existsSync(path.join(installDir, "matter.exe")),
        uninstaller_count: uninstallerNames().length,
        entry_count: entries().length,
        active_session_count: activeSessionCount,
      };
    },
    exists: existsSync,
    list: (directory) => (existsSync(directory) ? readdirSync(directory) : []),
    async executeCleanupLocked(filePath, args) {
      if (!Array.isArray(args) || args.length !== 1 || args[0] !== "/S") {
        fail("WINDOWS_UNINSTALLER_ARGUMENTS_INVALID", "failure cleanup requires silent NSIS uninstall");
      }
      return lockedUninstaller(filePath);
    },
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
      installedTreeBindings,
      adapters,
    });
    const generatedAt = new Date().toISOString();
    const receipt = {
      ...result,
      approval_signature_sha256: sha256(approvalSignatureSnapshot.bytes),
      source_runner: sourceRunner,
      generated_at: generatedAt,
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
