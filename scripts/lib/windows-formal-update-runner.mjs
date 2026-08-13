import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import {
  verifyProductionTrustedRegistry,
} from "./external-release-trust.mjs";
import {
  runAfterMatterDesktopAuthenticodeVerification,
} from "./matter-desktop-authenticode.mjs";
import { cleanupFailedWindowsNsisInstallation } from "./windows-formal-native-cleanup.mjs";
import {
  WINDOWS_UPDATE_OPERATIONS,
  WINDOWS_UPDATE_APPROVAL_RECEIPT_TYPE,
} from "./windows-formal-update-approval.mjs";
import { admitWindowsFormalUpdateCandidates } from "./windows-formal-update-admission.mjs";

export const WINDOWS_UPDATE_APPROVAL_RECEIPT_SOURCE = "windows_operator";
export const WINDOWS_UPDATE_RUNNER_RECEIPT_SCHEMA =
  "law-firm-os.windows-operator-update-rollback-qa.v1";

const SHA256 = /^[0-9a-f]{64}$/u;
const REQUIRED_ADAPTERS = [
  "closeAllSessions",
  "closeSession",
  "executeCleanup",
  "exists",
  "install",
  "inspectInstallation",
  "isSessionActive",
  "launch",
  "list",
  "confirmOperation",
  "readAuthenticode",
  "readFile",
  "residue",
  "uninstall",
  "waitForRemoval",
  "waitForUninstalled",
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalReceipt(rawBytes) {
  let receipt;
  try {
    receipt = JSON.parse(rawBytes.toString("utf8"));
  } catch {
    throw new TypeError("raw Windows approval receipt is not valid JSON");
  }
  const canonicalBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
  if (!canonicalBytes.equals(rawBytes)) {
    throw new TypeError("raw Windows approval receipt must use exact canonical JSON bytes");
  }
  return receipt;
}

function detachedSignature(bytes) {
  if (bytes.length === 64) return bytes;
  const value = bytes.toString("utf8").trim();
  if (/^[0-9a-f]{128}$/iu.test(value)) return Buffer.from(value, "hex");
  if (/^[A-Za-z0-9+/]+={0,2}$/u.test(value)) {
    const decoded = Buffer.from(value, "base64");
    if (decoded.length === 64 && decoded.toString("base64") === value) return decoded;
  }
  throw new TypeError("Windows approval signature must contain exactly 64 Ed25519 bytes");
}

function requireEveryAllowed(key, field, values) {
  const allowed = key?.[field];
  if (!Array.isArray(allowed) || values.some((value) => !allowed.includes(value))) {
    throw new Error(`production-root approval key does not authorize ${field}`);
  }
}

function activeRegistryKey(key, now) {
  return key?.revoked_at == null
    && Date.parse(key?.valid_from ?? "") <= now
    && Date.parse(key?.valid_until ?? "") >= now;
}

export function createProductionWindowsApprovalVerifier({
  approvalSignatureBytes,
  verifyProductionRegistry = verifyProductionTrustedRegistry,
  now = () => Date.now(),
} = {}) {
  const signatureBytes = Buffer.from(approvalSignatureBytes ?? []);
  if (signatureBytes.length < 1) throw new TypeError("raw Windows approval signature bytes are required");
  if (typeof verifyProductionRegistry !== "function" || typeof now !== "function") {
    throw new TypeError("production registry verifier and clock are required");
  }

  return async ({ raw_bytes: rawInput, required_receipt_type: requiredReceiptType } = {}) => {
    if (requiredReceiptType !== WINDOWS_UPDATE_APPROVAL_RECEIPT_TYPE) {
      throw new Error("production-root approval receipt type is invalid");
    }
    const rawBytes = Buffer.from(rawInput ?? []);
    if (rawBytes.length < 1) throw new TypeError("raw Windows approval receipt bytes are required");

    // This has no caller-selected trust path or digest. The source policy remains
    // governance-installed and deliberately fails closed while unconfigured.
    const registryTrust = verifyProductionRegistry();
    const receipt = canonicalReceipt(rawBytes);
    const key = registryTrust?.registry?.keys?.find(
      (candidate) => candidate.key_id === receipt?.update_key?.key_id,
    );
    const clock = Number(now());
    if (!Number.isFinite(clock) || !key || !activeRegistryKey(key, clock)) {
      throw new Error("production-root Windows approval key is missing, inactive, or revoked");
    }

    requireEveryAllowed(key, "allowed_receipt_sources", [WINDOWS_UPDATE_APPROVAL_RECEIPT_SOURCE]);
    requireEveryAllowed(key, "allowed_receipt_types", [WINDOWS_UPDATE_APPROVAL_RECEIPT_TYPE]);
    requireEveryAllowed(key, "allowed_pilot_ids", [receipt.pilot_id]);
    requireEveryAllowed(key, "allowed_lawos_tenant_ids", [receipt.lawos_tenant_id]);
    requireEveryAllowed(key, "allowed_entra_tenant_ids", [receipt.entra_tenant_id]);
    requireEveryAllowed(key, "allowed_source_shas", [
      receipt.candidates?.baseline?.source_sha,
      receipt.candidates?.target?.source_sha,
    ]);
    requireEveryAllowed(key, "allowed_source_trees", [
      receipt.candidates?.baseline?.source_tree,
      receipt.candidates?.target?.source_tree,
    ]);
    requireEveryAllowed(key, "allowed_versions", [
      receipt.candidates?.baseline?.version,
      receipt.candidates?.target?.version,
    ]);
    requireEveryAllowed(key, "allowed_roles", ["baseline", "target"]);
    requireEveryAllowed(key, "allowed_operations", WINDOWS_UPDATE_OPERATIONS);
    requireEveryAllowed(key, "allowed_artifact_sha256s", [
      receipt.candidates?.baseline?.artifact_sha256,
      receipt.candidates?.target?.artifact_sha256,
    ]);
    requireEveryAllowed(key, "allowed_binding_sha256s", [
      receipt.tenant_config_sha256,
      receipt.candidates?.baseline?.release_manifest_sha256,
      receipt.candidates?.target?.release_manifest_sha256,
    ]);

    const publicKey = createPublicKey(key.public_key_spki_pem);
    const publicKeySha256 = sha256(publicKey.export({ type: "spki", format: "der" }));
    if (publicKey.asymmetricKeyType !== "ed25519"
      || !SHA256.test(publicKeySha256)
      || publicKeySha256 !== receipt.update_key?.public_key_spki_sha256
      || !verifySignature(null, rawBytes, publicKey, detachedSignature(signatureBytes))) {
      throw new Error("production-root Windows approval signature or update-key binding is invalid");
    }
    return {
      receipt,
      registry_root_verified: true,
      trust_verified: true,
      update_public_key: publicKey,
    };
  };
}

function assertOperationActive(approval, operation, now) {
  if (Date.parse(approval.expires_at) <= now
    || Date.parse(approval.authorizations[operation].expires_at) <= now) {
    throw new Error(`signed approval for ${operation} expired before execution`);
  }
}

function errorCode(error) {
  const value = typeof error?.code === "string" ? error.code : error?.name;
  return /^[A-Z0-9._-]{1,96}$/u.test(value ?? "") ? value : "WINDOWS_UPDATE_ROLLBACK_FAILED";
}

function assertResidueClear(residue, label) {
  if (residue?.executable_present !== false
    || residue?.uninstaller_count !== 0
    || residue?.entry_count !== 0
    || residue?.active_session_count !== 0) {
    throw Object.assign(new Error(`${label} left Windows installation or session residue`), {
      code: "WINDOWS_RESIDUE_PRESENT",
    });
  }
  return Object.freeze({
    checkpoint: label,
    executable_present: false,
    uninstaller_count: 0,
    entry_count: 0,
    active_session_count: 0,
  });
}

function assertInstallation(installation, role, candidate) {
  if (!installation || typeof installation.executable_path !== "string"
    || typeof installation.uninstaller_path !== "string"
    || installation.version !== candidate.version
    || installation.source_sha !== candidate.source_sha
    || installation.source_tree !== candidate.source_tree) {
    throw new Error(`${role} installed identity does not match the signed candidate`);
  }
}

function operationDigest(approvalId) {
  return sha256(Buffer.from(approvalId));
}

function receiptBody({ verdict, approval, operations, launches, residueChecks, failureCleanup }) {
  return {
    schema_version: WINDOWS_UPDATE_RUNNER_RECEIPT_SCHEMA,
    verdict,
    automatic_update: false,
    ...(approval ? {
      approval_bundle_sha256: approval.approval_bundle_sha256,
      signer_certificate_sha1: approval.authenticode_signer_certificate_sha1,
    } : {}),
    operations: Object.freeze(operations),
    launches: Object.freeze(launches),
    residue_checks: Object.freeze(residueChecks),
    failure_cleanup: failureCleanup,
    boundaries: Object.freeze({
      provider_call_performed: false,
      automatic_update: false,
      public_release_claim: false,
      production_go_live_claim: false,
    }),
  };
}

export async function runWindowsFormalUpdateRollback({
  platform = process.platform,
  executionInput,
  verifiedApproval,
  adapters,
  now = () => Date.now(),
} = {}) {
  if (platform !== "win32") throw new Error("formal Windows update/rollback executor requires a Windows host");
  if (!adapters || typeof now !== "function"
    || typeof adapters.installDir !== "string"
    || REQUIRED_ADAPTERS.some((name) => typeof adapters[name] !== "function")) {
    throw new TypeError("complete Windows update/rollback native adapters are required");
  }

  const admission = await admitWindowsFormalUpdateCandidates({
    executionInput,
    verifiedApproval,
    readFile: adapters.readFile,
    readAuthenticode: adapters.readAuthenticode,
    now: Number(now()),
  });

  const initiated = new Set();
  const operations = [];
  const launches = [];
  const residueChecks = [];
  const executableSha256 = new Map();
  let mutationStarted = false;
  let currentInstallation = null;

  async function initiate(operation) {
    if (initiated.has(operation)) throw new Error(`operator initiation ${operation} was already consumed`);
    assertOperationActive(admission.approval, operation, Number(now()));
    const expectedApprovalId = admission.approval.authorizations[operation].approval_id;
    const approvalIdSha256 = operationDigest(expectedApprovalId);
    const confirmation = await adapters.confirmOperation({
      operation,
      approvalIdSha256,
    });
    if (confirmation !== true) {
      throw new Error(`operator did not separately initiate ${operation}`);
    }
    const clock = Number(now());
    assertOperationActive(admission.approval, operation, clock);
    initiated.add(operation);
    operations.push(Object.freeze({
      operation,
      approval_id_sha256: approvalIdSha256,
      initiated_at: new Date(clock).toISOString(),
    }));
  }

  async function closeChecked(session, role) {
    await adapters.closeSession(session);
    if (await adapters.isSessionActive(session)) {
      throw Object.assign(new Error(`${role} application session remained active`), {
        code: "WINDOWS_SESSION_RESIDUE",
      });
    }
  }

  async function launchChecked(role, installation) {
    const candidate = admission[role].candidate;
    assertInstallation(installation, role, candidate);
    const firstBytes = Buffer.from(await adapters.readFile(installation.executable_path));
    const observedSha256 = sha256(firstBytes);
    const expectedSha256 = executableSha256.get(role) ?? observedSha256;
    if (role === "baseline" && executableSha256.has(role) && observedSha256 !== expectedSha256) {
      throw new Error("rollback baseline executable bytes differ from the original baseline installation");
    }
    executableSha256.set(role, expectedSha256);
    const executableAuthenticode = await adapters.readAuthenticode(installation.executable_path);
    let session;
    const inspection = await runAfterMatterDesktopAuthenticodeVerification({
      records: [admission[role].authenticode, executableAuthenticode],
      expectedCertificateSha1: admission.approval.authenticode_signer_certificate_sha1,
      expectedExecutableSha256: expectedSha256,
      actualExecutableSha256: observedSha256,
      action: async () => {
        const immediateSha256 = sha256(Buffer.from(await adapters.readFile(installation.executable_path)));
        if (immediateSha256 !== observedSha256) {
          throw Object.assign(new Error(`${role} executable changed after verification and before launch`), {
            code: "WINDOWS_EXECUTABLE_CHANGED",
          });
        }
        session = await adapters.launch({ role, executablePath: installation.executable_path });
        if (!(await adapters.isSessionActive(session))) {
          throw Object.assign(new Error(`${role} application session did not remain active`), {
            code: "WINDOWS_SESSION_NOT_ACTIVE",
          });
        }
      },
    });
    launches.push(Object.freeze({
      role,
      version: candidate.version,
      source_sha: candidate.source_sha,
      executable_sha256: observedSha256,
      authenticode_valid: inspection.verification.signature_count === 2,
      exact_bytes_verified: inspection.executable_parity.byte_identical === true,
      session_started: true,
      session_stopped: false,
    }));
    await closeChecked(session, role);
    launches[launches.length - 1] = Object.freeze({ ...launches.at(-1), session_stopped: true });
  }

  async function installAndLaunch(operation, role) {
    await initiate(operation);
    const installerPath = admission[role].locator.installer_path;
    const expectedInstallerSha256 = admission[role].artifact_sha256;
    const installerBytes = Buffer.from(await adapters.readFile(installerPath));
    const observedInstallerSha256 = sha256(installerBytes);
    if (installerBytes.length !== admission[role].candidate.artifact_bytes
      || observedInstallerSha256 !== expectedInstallerSha256) {
      throw new Error(`${role} installer changed after admission and before NSIS execution`);
    }
    const currentInstallerAuthenticode = await adapters.readAuthenticode(installerPath);
    await runAfterMatterDesktopAuthenticodeVerification({
      records: [admission[role].authenticode, currentInstallerAuthenticode],
      expectedCertificateSha1: admission.approval.authenticode_signer_certificate_sha1,
      expectedExecutableSha256: expectedInstallerSha256,
      actualExecutableSha256: observedInstallerSha256,
      action: async () => {
        const immediateInstallerSha256 = sha256(Buffer.from(await adapters.readFile(installerPath)));
        if (immediateInstallerSha256 !== observedInstallerSha256) {
          throw Object.assign(new Error(`${role} installer changed immediately before NSIS execution`), {
            code: "WINDOWS_INSTALLER_CHANGED",
          });
        }
        mutationStarted = true;
        await adapters.install({ role, installerPath });
      },
    });
    currentInstallation = await adapters.inspectInstallation({ role });
    await launchChecked(role, currentInstallation);
  }

  async function uninstallAndCheck(operation, role, checkpoint) {
    await initiate(operation);
    await adapters.uninstall({ role, uninstallerPath: currentInstallation.uninstaller_path });
    await adapters.waitForUninstalled({ role });
    currentInstallation = null;
    residueChecks.push(assertResidueClear(await adapters.residue(), checkpoint));
  }

  try {
    await installAndLaunch("baseline_install", "baseline");
    await installAndLaunch("target_update", "target");
    await uninstallAndCheck(
      "target_uninstall_for_rollback",
      "target",
      "target_uninstalled_before_baseline_rollback",
    );
    await installAndLaunch("baseline_rollback", "baseline");
    await uninstallAndCheck("final_uninstall", "baseline", "final_uninstall");
    return Object.freeze({
      ...receiptBody({
        verdict: "PASS",
        approval: admission.approval,
        operations,
        launches,
        residueChecks,
        failureCleanup: Object.freeze({ required: false, initiated: false, completed: true }),
      }),
      candidates: Object.freeze({
        baseline: Object.freeze({
          version: admission.baseline.candidate.version,
          source_sha: admission.baseline.candidate.source_sha,
          artifact_sha256: admission.baseline.artifact_sha256,
          metadata_raw_sha256: admission.baseline.metadata_raw_sha256,
        }),
        target: Object.freeze({
          version: admission.target.candidate.version,
          source_sha: admission.target.candidate.source_sha,
          artifact_sha256: admission.target.artifact_sha256,
          metadata_raw_sha256: admission.target.metadata_raw_sha256,
        }),
      }),
      approved_operations: Object.freeze([...WINDOWS_UPDATE_OPERATIONS]),
    });
  } catch (primaryError) {
    let cleanup = Object.freeze({ required: mutationStarted, initiated: false, completed: !mutationStarted });
    if (mutationStarted) {
      try {
        await initiate("failure_cleanup");
        let sessionCleanupError = null;
        try {
          await adapters.closeAllSessions();
        } catch (error) {
          sessionCleanupError = error;
        }
        const nativeCleanup = cleanupFailedWindowsNsisInstallation({
          installDir: adapters.installDir,
          priorError: primaryError,
          exists: adapters.exists,
          list: adapters.list,
          execute: adapters.executeCleanup,
          waitForRemoval: adapters.waitForRemoval,
          warn: adapters.warn,
        });
        try {
          const residue = assertResidueClear(await adapters.residue(), "failure_cleanup");
          residueChecks.push(residue);
        } catch (residueError) {
          cleanup = Object.freeze({
            required: true,
            initiated: true,
            completed: false,
            native: nativeCleanup,
            error_code: errorCode(residueError),
          });
          throw residueError;
        }
        cleanup = Object.freeze({
          required: true,
          initiated: true,
          completed: sessionCleanupError === null && nativeCleanup.completed,
          native: nativeCleanup,
          error_code: sessionCleanupError === null ? null : errorCode(sessionCleanupError),
        });
      } catch (cleanupError) {
        if (cleanup.initiated !== true) {
          cleanup = Object.freeze({
            required: true,
            initiated: initiated.has("failure_cleanup"),
            completed: false,
            error_code: errorCode(cleanupError),
          });
        }
      }
    }
    Object.defineProperty(primaryError, "windows_update_rollback", {
      configurable: true,
      enumerable: true,
      value: Object.freeze({
        ...receiptBody({
          verdict: "FAIL",
          operations,
          launches,
          residueChecks,
          failureCleanup: cleanup,
        }),
        primary_error_code: errorCode(primaryError),
        primary_error_preserved: true,
      }),
    });
    throw primaryError;
  }
}
