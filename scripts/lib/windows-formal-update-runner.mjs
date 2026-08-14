import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import path from "node:path";
import {
  verifyProductionTrustedRegistry,
} from "./external-release-trust.mjs";
import {
  validateMatterDesktopAuthenticodeSignature,
  validateMatterDesktopAuthenticodeSignatures,
  runAfterMatterDesktopAuthenticodeVerification,
} from "./matter-desktop-authenticode.mjs";
import { cleanupFailedWindowsNsisInstallation } from "./windows-formal-native-cleanup.mjs";
import {
  WINDOWS_UPDATE_OPERATIONS,
  WINDOWS_UPDATE_APPROVAL_RECEIPT_TYPE,
} from "./windows-formal-update-approval.mjs";
import { admitWindowsFormalUpdateCandidates } from "./windows-formal-update-admission.mjs";
import {
  WINDOWS_INSTALLED_TREE_FIXED_POINT_EQUALITY_PROOF,
  WINDOWS_INSTALLED_TREE_FIXED_POINT_SEQUENCE,
  WINDOWS_INSTALLED_TREE_NATIVE_SNAPSHOT_SCHEMA,
} from "./windows-installed-tree-native-snapshot.mjs";

export const WINDOWS_UPDATE_APPROVAL_RECEIPT_SOURCE = "windows_operator";
export const WINDOWS_UPDATE_RUNNER_RECEIPT_SCHEMA =
  "law-firm-os.windows-operator-update-rollback-qa.v1";

const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_OBJECT = /^[0-9a-f]{40}$/u;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const AUTHENTICODE_FIELDS = [
  "signer_certificate_sha256", "signer_eku_oids", "signer_issuer", "signer_not_after",
  "signer_not_before", "signer_public_key_algorithm_oid", "signer_serial_number",
  "signer_signature_algorithm_oid", "signer_subject", "signer_thumbprint", "signature_type",
  "status", "status_message", "time_stamper_certificate_present", "timestamp_certificate_sha256",
  "timestamp_eku_oids", "timestamp_issuer", "timestamp_not_after", "timestamp_not_before",
  "timestamp_public_key_algorithm_oid", "timestamp_serial_number", "timestamp_signature_algorithm_oid",
  "timestamp_subject", "timestamp_thumbprint",
];
const PASS_RECEIPT_FIELDS = [
  "approval_bundle_sha256", "approval_signature_sha256", "approved_operations", "automatic_update", "boundaries",
  "candidates", "failure_cleanup", "generated_at", "launches", "operations", "residue_checks", "schema_version",
  "signer_certificate_sha1", "source_runner", "uninstalls", "verdict",
];
const PASS_CANDIDATE_FIELDS = [
  "artifact_sha256", "installed_tree", "metadata_raw_sha256", "release_manifest_sha256", "signature_raw_sha256", "source_sha", "version",
];
const PASS_OPERATION_FIELDS = ["approval_id_sha256", "initiated_at", "operation"];
const PASS_LAUNCH_FIELDS = [
  "authenticode_valid", "exact_bytes_verified", "executable_sha256", "role", "session_started", "session_stopped",
  "post_install_installed_tree", "prelaunch_installed_tree", "source_sha", "version",
];
const INSTALLED_TREE_FIELDS = [
  "bytes", "content_sha256", "directory_count", "file_count", "identity_sha256",
  "installed_executable_bytes", "installed_executable_path", "installed_executable_sha256", "schema_version",
];
const PASS_UNINSTALL_FIELDS = [
  "approval_id_sha256", "artifact_sha256", "authenticode", "authenticode_valid", "denies_write_delete", "exit_code",
  "installed_tree_path", "installed_tree_sha256", "lock_mode", "metadata_raw_sha256", "operation", "process",
  "release_manifest_sha256", "role", "signature_raw_sha256", "source_sha", "uninstaller_bytes", "uninstaller_sha256", "version",
];
const PASS_PROCESS_FIELDS = ["path_identity", "pid"];
const PASS_RESIDUE_FIELDS = ["active_session_count", "checkpoint", "entry_count", "executable_present", "uninstaller_count"];
const PASS_BOUNDARY_FIELDS = ["automatic_update", "production_go_live_claim", "provider_call_performed", "public_release_claim"];
const PASS_SOURCE_RUNNER_FIELDS = ["source_sha", "source_tree"];
const SESSION_CLOSE_FIELDS = ["exit_code", "lock_released", "pid", "process_exited"];
const REQUIRED_ADAPTERS = [
  "closeAllSessions",
  "closeSession",
  "executeCleanupLocked",
  "exists",
  "install",
  "inspectInstallation",
  "isSessionActive",
  "launch",
  "list",
  "captureInstalledTree",
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

function passReceiptFailure(message) {
  throw Object.assign(new TypeError(message), { code: "WINDOWS_UPDATE_RUNNER_PASS_RECEIPT_INVALID" });
}

function exactPassKeys(value, fields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).sort().join("\0") !== [...fields].sort().join("\0")) {
    passReceiptFailure(`${label} shape is invalid`);
  }
}

function requirePass(condition, message) {
  if (!condition) passReceiptFailure(message);
}

function passIso(value, label) {
  requirePass(typeof value === "string"
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value, `${label} timestamp is invalid`);
}

function passSha(value, label) {
  requirePass(SHA256.test(value ?? ""), `${label} digest is invalid`);
}

function validateInstalledTreeSummary(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).sort().join("\0") !== [...INSTALLED_TREE_FIELDS].sort().join("\0")) {
    throw new TypeError(`${label} shape is invalid`);
  }
  const executablePath = value.installed_executable_path;
  const executableBody = typeof executablePath === "string" && executablePath.startsWith("./")
    ? executablePath.slice(2)
    : "";
  if (value.schema_version !== WINDOWS_INSTALLED_TREE_NATIVE_SNAPSHOT_SCHEMA
    || !SHA256.test(value.content_sha256 ?? "")
    || !SHA256.test(value.identity_sha256 ?? "")
    || !SHA256.test(value.installed_executable_sha256 ?? "")
    || !Number.isInteger(value.file_count) || value.file_count < 1
    || !Number.isInteger(value.directory_count) || value.directory_count < 1
    || !Number.isSafeInteger(value.bytes) || value.bytes < 1
    || !Number.isSafeInteger(value.installed_executable_bytes) || value.installed_executable_bytes < 1
    || value.installed_executable_bytes > value.bytes
    || !/^\.\/(?!\.\.\/)[^\\:\0\r\n]+\.exe$/iu.test(executablePath ?? "")
    || path.posix.normalize(executableBody) !== executableBody
    || executablePath !== executablePath.normalize("NFC")) {
    throw new TypeError(`${label} binding is invalid`);
  }
  return value;
}

function passInstalledTree(value, label) {
  try {
    validateInstalledTreeSummary(value, label);
  } catch (error) {
    passReceiptFailure(error.message);
  }
}

function installedTreeFieldsMatch(actual, expected, { includeIdentity = true } = {}) {
  return INSTALLED_TREE_FIELDS.every((field) => (
    (!includeIdentity && field === "identity_sha256") || actual[field] === expected[field]
  ));
}

function passCandidate(value, label) {
  exactPassKeys(value, PASS_CANDIDATE_FIELDS, label);
  requirePass(VERSION.test(value.version ?? ""), `${label} version is invalid`);
  requirePass(GIT_OBJECT.test(value.source_sha ?? ""), `${label} source SHA is invalid`);
  for (const field of ["artifact_sha256", "metadata_raw_sha256", "signature_raw_sha256", "release_manifest_sha256"]) {
    passSha(value[field], `${label}.${field}`);
  }
  passInstalledTree(value.installed_tree, `${label}.installed_tree`);
}

function passCandidateMatches(actual, expected, label) {
  passCandidate(actual, label);
  passCandidate(expected, `${label} expected binding`);
  for (const field of PASS_CANDIDATE_FIELDS.filter((field) => field !== "installed_tree")) {
    requirePass(actual[field] === expected[field], `${label}.${field} differs from expected binding`);
  }
  requirePass(
    installedTreeFieldsMatch(actual.installed_tree, expected.installed_tree),
    `${label}.installed_tree differs from expected binding`,
  );
}

function passAuthenticode(record, expectedCertificateSha1, label) {
  exactPassKeys(record, AUTHENTICODE_FIELDS, label);
  try {
    const verification = validateMatterDesktopAuthenticodeSignature(record, {
      expectedCertificateSha1,
    });
    requirePass(verification.signature_count === 1, `${label} validation was incomplete`);
  } catch (error) {
    passReceiptFailure(`${label} Authenticode validation failed: ${error.message}`);
  }
}

/**
 * Validate the exact PASS receipt emitted by the Windows update/rollback CLI.
 * expectedBinding is intentionally explicit and narrow:
 * { approval_bundle_sha256, signer_certificate_sha1,
 *   candidates: { baseline, target } }, where each candidate has the seven
 *   PASS_CANDIDATE_FIELDS above. The function returns true only after every
 *   emitted field and row has been checked against that binding.
 */
export function validateWindowsFormalUpdateRunnerPassReceipt(receipt, expectedBinding) {
  exactPassKeys(receipt, PASS_RECEIPT_FIELDS, "Windows update runner PASS receipt");
  exactPassKeys(expectedBinding, ["approval_bundle_sha256", "candidates", "signer_certificate_sha1"], "expected runner binding");
  requirePass(receipt.schema_version === WINDOWS_UPDATE_RUNNER_RECEIPT_SCHEMA, "runner PASS schema is invalid");
  requirePass(receipt.verdict === "PASS" && receipt.automatic_update === false, "runner PASS verdict or update mode is invalid");
  passSha(receipt.approval_bundle_sha256, "runner approval bundle");
  requirePass(receipt.approval_bundle_sha256 === expectedBinding.approval_bundle_sha256, "runner approval bundle differs from expected binding");
  passSha(receipt.approval_signature_sha256, "runner approval signature");
  passIso(receipt.generated_at, "runner receipt");
  exactPassKeys(receipt.source_runner, PASS_SOURCE_RUNNER_FIELDS, "runner source");
  requirePass(GIT_OBJECT.test(receipt.source_runner.source_sha ?? "")
    && GIT_OBJECT.test(receipt.source_runner.source_tree ?? ""), "runner source identity is invalid");
  requirePass(/^[0-9A-F]{40}$/u.test(receipt.signer_certificate_sha1 ?? ""), "runner signer certificate is invalid");
  requirePass(receipt.signer_certificate_sha1 === expectedBinding.signer_certificate_sha1, "runner signer differs from expected binding");
  exactPassKeys(expectedBinding.candidates, ["baseline", "target"], "expected runner candidates");
  for (const role of ["baseline", "target"]) passCandidateMatches(receipt.candidates?.[role], expectedBinding.candidates?.[role], `candidate.${role}`);
  exactPassKeys(receipt.candidates, ["baseline", "target"], "runner candidates");

  exactPassKeys(receipt.boundaries, PASS_BOUNDARY_FIELDS, "runner boundaries");
  for (const field of PASS_BOUNDARY_FIELDS) requirePass(receipt.boundaries[field] === false, `runner boundary ${field} must be false`);
  exactPassKeys(receipt.failure_cleanup, ["completed", "initiated", "required"], "runner failure cleanup");
  requirePass(receipt.failure_cleanup.required === false && receipt.failure_cleanup.initiated === false && receipt.failure_cleanup.completed === true, "runner PASS failure cleanup state is invalid");
  requirePass(Array.isArray(receipt.approved_operations)
    && receipt.approved_operations.join("\0") === WINDOWS_UPDATE_OPERATIONS.join("\0"), "runner approved operation set is invalid");

  const operationOrder = [
    "baseline_install", "target_update", "target_uninstall_for_rollback", "baseline_rollback", "final_uninstall",
  ];
  requirePass(Array.isArray(receipt.operations) && receipt.operations.length === operationOrder.length, "runner operation count is invalid");
  const operationIds = new Set();
  for (const [index, operation] of receipt.operations.entries()) {
    exactPassKeys(operation, PASS_OPERATION_FIELDS, `runner operation ${index}`);
    requirePass(operation.operation === operationOrder[index], `runner operation ${index} is out of order`);
    passSha(operation.approval_id_sha256, `runner operation ${operation.operation} approval`);
    requirePass(!operationIds.has(operation.approval_id_sha256), "runner operation approval IDs must be unique");
    operationIds.add(operation.approval_id_sha256);
    passIso(operation.initiated_at, `runner operation ${operation.operation}`);
    requirePass(Date.parse(operation.initiated_at) <= Date.parse(receipt.generated_at), `runner operation ${operation.operation} is after receipt generation`);
  }

  const launchRoles = ["baseline", "target", "baseline"];
  requirePass(Array.isArray(receipt.launches) && receipt.launches.length === launchRoles.length, "runner launch count is invalid");
  for (const [index, launch] of receipt.launches.entries()) {
    exactPassKeys(launch, PASS_LAUNCH_FIELDS, `runner launch ${index}`);
    const candidate = receipt.candidates[launchRoles[index]];
    requirePass(launch.role === launchRoles[index] && launch.version === candidate.version && launch.source_sha === candidate.source_sha, `runner launch ${index} identity is invalid`);
    passSha(launch.executable_sha256, `runner launch ${index} executable`);
    passInstalledTree(launch.post_install_installed_tree, `runner launch ${index} post-install tree`);
    passInstalledTree(launch.prelaunch_installed_tree, `runner launch ${index} prelaunch tree`);
    // NTFS identity digests contain host-bound volume/file IDs. Bind portable
    // bytes to the candidate and require the operator identity to stay fixed.
    requirePass(
      installedTreeFieldsMatch(launch.post_install_installed_tree, candidate.installed_tree, { includeIdentity: false })
        && installedTreeFieldsMatch(launch.prelaunch_installed_tree, candidate.installed_tree, { includeIdentity: false })
        && launch.post_install_installed_tree.identity_sha256 === launch.prelaunch_installed_tree.identity_sha256,
      `runner launch ${index} installed tree differs from its admitted candidate or changed before launch`,
    );
    requirePass(
      launch.executable_sha256 === candidate.installed_tree.installed_executable_sha256,
      `runner launch ${index} executable differs from its admitted candidate`,
    );
    for (const field of ["authenticode_valid", "exact_bytes_verified", "session_started", "session_stopped"]) requirePass(launch[field] === true, `runner launch ${index}.${field} must be true`);
  }
  requirePass(receipt.launches[0].executable_sha256 === receipt.launches[2].executable_sha256, "rollback baseline executable bytes differ");

  const uninstallRoles = ["target", "baseline"];
  const uninstallOperations = ["target_uninstall_for_rollback", "final_uninstall"];
  requirePass(Array.isArray(receipt.uninstalls) && receipt.uninstalls.length === uninstallRoles.length, "runner locked uninstall count is invalid");
  for (const [index, uninstall] of receipt.uninstalls.entries()) {
    exactPassKeys(uninstall, PASS_UNINSTALL_FIELDS, `runner uninstall ${index}`);
    const role = uninstallRoles[index];
    const operation = uninstallOperations[index];
    const candidate = receipt.candidates[role];
    exactPassKeys(uninstall.process, PASS_PROCESS_FIELDS, `runner uninstall ${index} process`);
    requirePass(uninstall.role === role && uninstall.operation === operation, `runner uninstall ${index} identity is invalid`);
    requirePass(uninstall.version === candidate.version && uninstall.source_sha === candidate.source_sha
      && uninstall.artifact_sha256 === candidate.artifact_sha256
      && uninstall.metadata_raw_sha256 === candidate.metadata_raw_sha256
      && uninstall.signature_raw_sha256 === candidate.signature_raw_sha256
      && uninstall.release_manifest_sha256 === candidate.release_manifest_sha256, `runner uninstall ${index} candidate binding is invalid`);
    passSha(uninstall.approval_id_sha256, `runner uninstall ${index} approval`);
    const operationRecord = receipt.operations.find(({ operation: value }) => value === operation);
    requirePass(operationRecord?.approval_id_sha256 === uninstall.approval_id_sha256, `runner uninstall ${index} approval is not bound to its operation`);
    requirePass(/^\./u.test(uninstall.installed_tree_path) && !uninstall.installed_tree_path.includes("..") && /\.exe$/iu.test(uninstall.installed_tree_path), `runner uninstall ${index} installed path is invalid`);
    passSha(uninstall.installed_tree_sha256, `runner uninstall ${index} installed tree`);
    passSha(uninstall.uninstaller_sha256, `runner uninstall ${index} uninstaller`);
    requirePass(uninstall.installed_tree_sha256 === uninstall.uninstaller_sha256, `runner uninstall ${index} tree digest differs from uninstaller digest`);
    requirePass(Number.isSafeInteger(uninstall.uninstaller_bytes) && uninstall.uninstaller_bytes > 0, `runner uninstall ${index} byte count is invalid`);
    passAuthenticode(uninstall.authenticode, receipt.signer_certificate_sha1, `runner uninstall ${index}`);
    requirePass(uninstall.authenticode_valid === true && uninstall.lock_mode === "FileShare.Read" && uninstall.denies_write_delete === true && uninstall.exit_code === 0, `runner uninstall ${index} lock or exit evidence is invalid`);
    requirePass(Number.isSafeInteger(uninstall.process.pid) && uninstall.process.pid > 0 && uninstall.process.path_identity === "pid_executable_path", `runner uninstall ${index} process identity is invalid`);
  }

  const residueCheckpoints = ["target_uninstalled_before_baseline_rollback", "final_uninstall"];
  requirePass(Array.isArray(receipt.residue_checks) && receipt.residue_checks.length === residueCheckpoints.length, "runner residue check count is invalid");
  for (const [index, residue] of receipt.residue_checks.entries()) {
    exactPassKeys(residue, PASS_RESIDUE_FIELDS, `runner residue ${index}`);
    requirePass(residue.checkpoint === residueCheckpoints[index]
      && residue.executable_present === false
      && residue.uninstaller_count === 0
      && residue.entry_count === 0
      && residue.active_session_count === 0, `runner residue ${index} is not clear`);
  }
  return true;
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

function assertInstallation(installation, role, candidate, installDir, installedTree) {
  const executableRelativePath = typeof installation?.executable_path === "string"
    ? path.win32.relative(path.win32.resolve(installDir), path.win32.resolve(installation.executable_path))
    : "";
  if (!installation || typeof installation.executable_path !== "string"
    || typeof installation.uninstaller_path !== "string"
    || !executableRelativePath || executableRelativePath.startsWith(`..${path.win32.sep}`)
    || path.win32.isAbsolute(executableRelativePath)
    || `./${executableRelativePath.replaceAll("\\", "/")}` !== installedTree.installed_executable_path
    || installation.version !== candidate.version
    || installation.source_sha !== candidate.source_sha
    || installation.source_tree !== candidate.source_tree) {
    throw new Error(`${role} installed identity does not match the signed candidate`);
  }
}

function installedTreeMismatch(role, message, code = "WINDOWS_INSTALLED_TREE_MISMATCH") {
  throw Object.assign(new Error(`${role} installed tree ${message}`), { code });
}

function summarizeInstalledTree(inventory, expected, role) {
  try {
    validateInstalledTreeSummary(expected, `${role} admitted installed tree`);
  } catch (error) {
    installedTreeMismatch(role, `admitted binding is invalid: ${error.message}`);
  }
  const native = inventory?.native;
  if (!inventory || typeof inventory !== "object"
    || native?.schema_version !== WINDOWS_INSTALLED_TREE_NATIVE_SNAPSHOT_SCHEMA
    || native.filesystem !== "NTFS"
    || native.fixed_point_exact !== true
    || native.equality_proof !== WINDOWS_INSTALLED_TREE_FIXED_POINT_EQUALITY_PROOF
    || !Array.isArray(native.fixed_point_sequence)
    || native.fixed_point_sequence.join("\0") !== WINDOWS_INSTALLED_TREE_FIXED_POINT_SEQUENCE.join("\0")
    || native.reparse_point_count !== 0
    || native.alternate_data_stream_count !== 0
    || native.hard_link_count !== 0
    || !Array.isArray(inventory.files)) {
    installedTreeMismatch(role, "native snapshot is incomplete");
  }
  const executableRows = inventory.files.filter(({ path: filePath }) => (
    filePath === expected.installed_executable_path
  ));
  if (executableRows.length !== 1) {
    installedTreeMismatch(role, "does not contain the exact admitted main executable path");
  }
  const executable = executableRows[0];
  const observed = Object.freeze({
    schema_version: native.schema_version,
    content_sha256: inventory.sha256,
    identity_sha256: native.identity_sha256,
    file_count: inventory.file_count,
    directory_count: native.directory_count,
    bytes: inventory.bytes,
    installed_executable_path: executable.path,
    installed_executable_sha256: executable.sha256,
    installed_executable_bytes: executable.bytes,
  });
  try {
    validateInstalledTreeSummary(observed, `${role} observed installed tree`);
  } catch (error) {
    installedTreeMismatch(role, `native snapshot is invalid: ${error.message}`);
  }
  if (!installedTreeFieldsMatch(observed, expected, { includeIdentity: false })) {
    installedTreeMismatch(role, "content, counts, bytes, or main executable differ from the admitted candidate");
  }
  return observed;
}

function assertLockedUninstallerEvidence(evidence, role, expectedCertificateSha1, installerAuthenticode) {
  const process = evidence?.process;
  if (!evidence || typeof evidence !== "object"
    || typeof evidence.installed_tree_path !== "string"
    || evidence.installed_tree_path.length < 3
    || !evidence.installed_tree_path.startsWith("./")
    || !SHA256.test(evidence.sha256 ?? "")
    || !SHA256.test(evidence.installed_tree_sha256 ?? "")
    || !Number.isSafeInteger(evidence.bytes)
    || evidence.bytes < 1
    || !evidence.authenticode
    || evidence.lock_mode !== "FileShare.Read"
    || evidence.denies_write_delete !== true
    || evidence.authenticode_valid !== true
    || evidence.exit_code !== 0
    || !process
    || !Number.isSafeInteger(process.pid)
    || process.pid <= 0
    || process.path_identity !== "pid_executable_path") {
    throw Object.assign(new Error(`${role} uninstaller did not provide a complete locked execution receipt`), {
      code: "WINDOWS_UNINSTALLER_LOCK_UNVERIFIED",
    });
  }
  try {
    const verification = validateMatterDesktopAuthenticodeSignatures(
      [installerAuthenticode, evidence.authenticode],
      { expectedCertificateSha1 },
    );
    if (verification.signature_count !== 2) throw new Error("uninstaller Authenticode verification was incomplete");
  } catch (error) {
    throw Object.assign(new Error(`${role} uninstaller Authenticode receipt was not independently verified`), {
      code: "WINDOWS_UNINSTALLER_AUTHENTICODE_UNVERIFIED",
      cause: error,
    });
  }
  return evidence;
}

function operationDigest(approvalId) {
  return sha256(Buffer.from(approvalId));
}

function receiptBody({ verdict, approval, operations, launches, uninstalls, residueChecks, failureCleanup }) {
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
    uninstalls: Object.freeze(uninstalls),
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
  installedTreeBindings,
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
  if (!installedTreeBindings || typeof installedTreeBindings !== "object"
    || Array.isArray(installedTreeBindings)
    || Object.keys(installedTreeBindings).sort().join("\0") !== "baseline\0target") {
    throw new TypeError("exact baseline and target installed-tree bindings are required");
  }
  const expectedInstalledTrees = Object.freeze(Object.fromEntries(["baseline", "target"].map((role) => {
    const binding = validateInstalledTreeSummary(
      installedTreeBindings[role],
      `${role} admitted installed tree`,
    );
    return [role, Object.freeze({ ...binding })];
  })));

  const initiated = new Set();
  const operations = [];
  const launches = [];
  const uninstalls = [];
  const residueChecks = [];
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
    const operationEvidence = Object.freeze({
      operation,
      approval_id_sha256: approvalIdSha256,
      initiated_at: new Date(clock).toISOString(),
    });
    operations.push(operationEvidence);
    return operationEvidence;
  }

  async function closeChecked(session, role) {
    const closure = await adapters.closeSession(session);
    if (!closure || typeof closure !== "object" || Array.isArray(closure)
      || Object.keys(closure).sort().join("\0") !== SESSION_CLOSE_FIELDS.join("\0")
      || !Number.isSafeInteger(closure.pid) || closure.pid <= 0
      || closure.pid !== session?.pid
      || !Number.isInteger(closure.exit_code)
      || closure.process_exited !== true
      || closure.lock_released !== true) {
      throw Object.assign(new Error(`${role} application session close was not independently observed`), {
        code: "WINDOWS_SESSION_CLOSE_UNVERIFIED",
      });
    }
    if (await adapters.isSessionActive(session)) {
      throw Object.assign(new Error(`${role} application session remained active`), {
        code: "WINDOWS_SESSION_RESIDUE",
      });
    }
  }

  async function captureInstalledTree(role, checkpoint) {
    return summarizeInstalledTree(
      await adapters.captureInstalledTree({ role, checkpoint }),
      expectedInstalledTrees[role],
      role,
    );
  }

  async function launchChecked(role, installation, postInstallInstalledTree) {
    const candidate = admission[role].candidate;
    const expectedInstalledTree = expectedInstalledTrees[role];
    assertInstallation(installation, role, candidate, adapters.installDir, expectedInstalledTree);
    const firstBytes = Buffer.from(await adapters.readFile(installation.executable_path));
    const observedSha256 = sha256(firstBytes);
    const expectedSha256 = expectedInstalledTree.installed_executable_sha256;
    if (firstBytes.length !== expectedInstalledTree.installed_executable_bytes
      || observedSha256 !== expectedSha256) {
      installedTreeMismatch(role, "main executable bytes differ from the admitted candidate");
    }
    const executableAuthenticode = await adapters.readAuthenticode(installation.executable_path);
    let session;
    let prelaunchInstalledTree;
    const inspection = await runAfterMatterDesktopAuthenticodeVerification({
      records: [admission[role].authenticode, executableAuthenticode],
      expectedCertificateSha1: admission.approval.authenticode_signer_certificate_sha1,
      expectedExecutableSha256: expectedSha256,
      actualExecutableSha256: observedSha256,
      action: async () => {
        const immediateBytes = Buffer.from(await adapters.readFile(installation.executable_path));
        const immediateSha256 = sha256(immediateBytes);
        if (immediateBytes.length !== expectedInstalledTree.installed_executable_bytes
          || immediateSha256 !== expectedSha256) {
          throw Object.assign(new Error(`${role} executable changed after verification and before launch`), {
            code: "WINDOWS_EXECUTABLE_CHANGED",
          });
        }
        prelaunchInstalledTree = await captureInstalledTree(role, "prelaunch");
        if (!installedTreeFieldsMatch(
          postInstallInstalledTree,
          prelaunchInstalledTree,
        )) {
          installedTreeMismatch(
            role,
            "native content or identity changed between install and launch",
            "WINDOWS_INSTALLED_TREE_CHANGED",
          );
        }
        session = await adapters.launch({
          role,
          executablePath: installation.executable_path,
          expectedSha256,
          expectedAuthenticode: executableAuthenticode,
          expectedCertificateSha1: admission.approval.authenticode_signer_certificate_sha1,
        });
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
      post_install_installed_tree: postInstallInstalledTree,
      prelaunch_installed_tree: prelaunchInstalledTree,
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
        await adapters.install({
          role,
          installerPath,
          expectedSha256: expectedInstallerSha256,
          expectedAuthenticode: currentInstallerAuthenticode,
          expectedCertificateSha1: admission.approval.authenticode_signer_certificate_sha1,
        });
      },
    });
    currentInstallation = await adapters.inspectInstallation({ role });
    assertInstallation(
      currentInstallation,
      role,
      admission[role].candidate,
      adapters.installDir,
      expectedInstalledTrees[role],
    );
    const postInstallInstalledTree = await captureInstalledTree(role, "post_install");
    await launchChecked(role, currentInstallation, postInstallInstalledTree);
  }

  async function uninstallAndCheck(operation, role, checkpoint) {
    const operationEvidence = await initiate(operation);
    const candidate = admission[role].candidate;
    const evidence = assertLockedUninstallerEvidence(
      await adapters.uninstall({ role, uninstallerPath: currentInstallation.uninstaller_path }),
      role,
      admission.approval.authenticode_signer_certificate_sha1,
      admission[role].authenticode,
    );
    uninstalls.push(Object.freeze({
      operation: operationEvidence.operation,
      approval_id_sha256: operationEvidence.approval_id_sha256,
      role,
      version: candidate.version,
      source_sha: candidate.source_sha,
      artifact_sha256: candidate.artifact_sha256,
      metadata_raw_sha256: admission[role].metadata_raw_sha256,
      signature_raw_sha256: admission[role].signature_raw_sha256,
      release_manifest_sha256: candidate.release_manifest_sha256,
      installed_tree_path: evidence.installed_tree_path,
      installed_tree_sha256: evidence.installed_tree_sha256,
      uninstaller_sha256: evidence.sha256,
      uninstaller_bytes: evidence.bytes,
      authenticode: evidence.authenticode,
      authenticode_valid: evidence.authenticode_valid,
      lock_mode: evidence.lock_mode,
      denies_write_delete: evidence.denies_write_delete,
      process: Object.freeze({
        pid: evidence.process.pid,
        path_identity: evidence.process.path_identity,
      }),
      exit_code: evidence.exit_code,
    }));
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
        uninstalls,
        residueChecks,
        failureCleanup: Object.freeze({ required: false, initiated: false, completed: true }),
      }),
      candidates: Object.freeze({
        baseline: Object.freeze({
          version: admission.baseline.candidate.version,
          source_sha: admission.baseline.candidate.source_sha,
          artifact_sha256: admission.baseline.artifact_sha256,
          metadata_raw_sha256: admission.baseline.metadata_raw_sha256,
          signature_raw_sha256: admission.baseline.signature_raw_sha256,
          release_manifest_sha256: admission.baseline.candidate.release_manifest_sha256,
          installed_tree: expectedInstalledTrees.baseline,
        }),
        target: Object.freeze({
          version: admission.target.candidate.version,
          source_sha: admission.target.candidate.source_sha,
          artifact_sha256: admission.target.artifact_sha256,
          metadata_raw_sha256: admission.target.metadata_raw_sha256,
          signature_raw_sha256: admission.target.signature_raw_sha256,
          release_manifest_sha256: admission.target.candidate.release_manifest_sha256,
          installed_tree: expectedInstalledTrees.target,
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
        const nativeCleanup = await cleanupFailedWindowsNsisInstallation({
          installDir: adapters.installDir,
          priorError: primaryError,
          exists: adapters.exists,
          list: adapters.list,
          executeLocked: adapters.executeCleanupLocked,
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
          uninstalls,
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
