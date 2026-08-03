#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readDesktopBuildSourceIdentity,
  validateDesktopBuildManifest,
} from "./lib/matter-desktop-provenance.mjs";
import {
  WINDOWS_NATIVE_QA_RECEIPT_SCHEMA,
  WINDOWS_NATIVE_QA_VALIDATION_SCHEMA,
  WindowsReleaseGateValidationError,
  evaluateWindowsReleaseGate,
  validateWindowsSigningAuthorityReceipt,
} from "./lib/matter-desktop-windows-release-gate.mjs";
import {
  WindowsNativeQaValidationError,
  validateWindowsUninstallEvidence,
} from "./lib/matter-desktop-windows-native-qa.mjs";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const NATIVE_QA_STATES = new Set(["PASS", "FAIL", "BLOCKED_BY_ARTIFACT"]);
const REQUIRED_NATIVE_SCENARIOS = [
  "nsis_install_completed",
  "forest_login_rendered",
  "signed_in",
  "restart_session_restored",
  "nsis_uninstall_completed",
  "full_install_directory_removed",
  "declared_shortcuts_removed",
  "declared_services_removed",
  "declared_registry_removed",
  "declared_update_residue_removed",
];

class WindowsNativeQaReceiptValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "WindowsNativeQaReceiptValidationError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new WindowsNativeQaReceiptValidationError(code, message);
}

function fileSha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function readJson(filePath, label) {
  let value;
  try {
    value = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    fail("JSON_INPUT_INVALID", `${label} must be readable JSON`);
  }
  return value;
}

function canonicalRepositoryFile(repoRoot, filePath, label) {
  const lexicalRoot = path.resolve(repoRoot ?? "");
  let root;
  try { root = realpathSync(repoRoot); } catch { fail("REPOSITORY_ROOT_INVALID", "repository root is unreadable"); }
  const lexicalFile = path.isAbsolute(filePath ?? "")
    ? path.resolve(filePath)
    : path.resolve(lexicalRoot, filePath ?? "");
  let relative = path.relative(lexicalRoot, lexicalFile);
  let absolute;
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    let resolvedInput;
    try { resolvedInput = realpathSync(lexicalFile); } catch { fail("ARTIFACT_FILE_MISSING", `${label} is missing`); }
    relative = path.relative(root, resolvedInput);
    if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)
      || lexicalFile !== resolvedInput) {
      fail("EVIDENCE_PATH_OUTSIDE_REPOSITORY", `${label} must remain within the repository`);
    }
    absolute = resolvedInput;
  } else {
    absolute = path.join(root, relative);
  }
  let metadata;
  try { metadata = lstatSync(absolute); } catch { fail("ARTIFACT_FILE_MISSING", `${label} is missing`); }
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    fail("ARTIFACT_FILE_INVALID", `${label} must be a regular non-symlink file`);
  }
  if (realpathSync(absolute) !== absolute) {
    fail("ARTIFACT_FILE_INVALID", `${label} cannot traverse a symlink`);
  }
  return Object.freeze({ root, absolute, relative: relative.split(path.sep).join("/"), metadata });
}

function readCanonicalRepositoryJson(repoRoot, filePath, label) {
  const file = canonicalRepositoryFile(repoRoot, filePath, label);
  const body = readFileSync(file.absolute);
  let value;
  try { value = JSON.parse(body.toString("utf8")); } catch { fail("JSON_INPUT_INVALID", `${label} must be readable JSON`); }
  const canonicalBody = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  if (!body.equals(canonicalBody)) fail("JSON_INPUT_NON_CANONICAL", `${label} must use canonical JSON bytes`);
  return Object.freeze({ ...file, body, value });
}

function resolveReceiptReference(repoRoot, reference, label) {
  const keys = reference?.receipt_id === undefined
    ? ["path", "sha256"]
    : ["path", "sha256", "receipt_id"];
  exactKeys(reference, keys, `${label} reference`);
  if (typeof reference.path !== "string"
    || reference.path.includes("\\")
    || path.posix.isAbsolute(reference.path)
    || path.posix.normalize(reference.path) !== reference.path
    || reference.path.split("/").includes("..")
    || !SHA256.test(reference.sha256 ?? "")) {
    fail("EVIDENCE_REFERENCE_INVALID", `${label} reference is invalid`);
  }
  const file = readCanonicalRepositoryJson(repoRoot, reference.path, label);
  if (fileSha256(file.absolute) !== reference.sha256
    || (reference.receipt_id !== undefined && file.value?.receipt_id !== reference.receipt_id)) {
    fail("EVIDENCE_REFERENCE_MISMATCH", `${label} reference path, hash, or receipt identifier is mismatched`);
  }
  return file;
}

function relativePath(repoRoot, filePath) {
  const relative = path.relative(realpathSync(repoRoot), realpathSync(filePath));
  if (relative.startsWith("..") || path.isAbsolute(relative)) fail("EVIDENCE_PATH_OUTSIDE_REPOSITORY", "evidence path must remain within the repository");
  return relative.split(path.sep).join("/");
}

function repositoryPath(repoRoot, filePath) {
  const relative = path.relative(path.resolve(repoRoot), path.resolve(filePath));
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    fail("ARTIFACT_PATH_OUTSIDE_REPOSITORY", "package artifact path must remain within the repository");
  }
  return relative.split(path.sep).join("/");
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("SCHEMA_KEYS_MISMATCH", `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("SCHEMA_KEYS_MISMATCH", `${label} keys do not match the closed schema`);
  }
}

function regularFileRecord(filePath, label) {
  let metadata;
  try { metadata = lstatSync(filePath); } catch { fail("ARTIFACT_FILE_MISSING", `${label} is missing`); }
  if (!metadata.isFile() || metadata.isSymbolicLink()) fail("ARTIFACT_FILE_INVALID", `${label} must be a regular non-symlink file`);
  return Object.freeze({ sha256: fileSha256(filePath), bytes: metadata.size });
}

function canonicalArtifactLayout(options) {
  let currentVersion;
  try {
    currentVersion = JSON.parse(readFileSync(path.join(options.repoRoot, "apps/desktop/package.json"), "utf8")).version;
  } catch {
    fail("CURRENT_VERSION_BINDING_MISMATCH", "current desktop package version is unreadable");
  }
  if (currentVersion !== options.expectedVersion) {
    fail("CURRENT_VERSION_BINDING_MISMATCH", "native PASS version is not the current desktop package version");
  }
  const releaseRoot = path.join(path.resolve(options.repoRoot), "apps/desktop/dist");
  let releaseRootMetadata;
  try { releaseRootMetadata = lstatSync(releaseRoot); } catch { fail("RELEASE_ROOT_MISSING", "current desktop release root is missing"); }
  if (!releaseRootMetadata.isDirectory() || releaseRootMetadata.isSymbolicLink()) {
    fail("RELEASE_ROOT_INVALID", "current desktop release root must be a regular directory");
  }
  const expected = {
    releaseRoot,
    installerPath: path.join(releaseRoot, `matter-${options.expectedVersion}-win-x64.exe`),
    blockmapPath: path.join(releaseRoot, `matter-${options.expectedVersion}-win-x64.exe.blockmap`),
    packageZipPath: path.join(releaseRoot, `win/matter-${options.expectedVersion}-win32-x64-unsigned.zip`),
    installerManifestPath: path.join(releaseRoot, `win/matter-${options.expectedVersion}-win-installer-manifest.json`),
    installerManifestSignaturePath: path.join(releaseRoot, `win/matter-${options.expectedVersion}-win-installer-manifest.json.sig`),
    unpackedExecutablePath: path.join(releaseRoot, "win-unpacked/matter.exe"),
    buildManifestPath: path.join(releaseRoot, `win/matter-${options.expectedVersion}-win-build-manifest.json`),
    embeddedBuildManifestPath: path.join(releaseRoot, "win-unpacked/resources/matter-build-manifest.json"),
    windowsBuildReceiptPath: path.join(path.resolve(options.repoRoot), "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md"),
  };
  for (const key of [
    "installerPath",
    "blockmapPath",
    "packageZipPath",
    "installerManifestPath",
    "installerManifestSignaturePath",
    "unpackedExecutablePath",
    "buildManifestPath",
    "embeddedBuildManifestPath",
    "windowsBuildReceiptPath",
  ]) {
    let providedPath;
    let expectedPath;
    try {
      providedPath = realpathSync(options[key] ?? "");
      expectedPath = realpathSync(expected[key]);
    } catch {
      fail("ARTIFACT_FILE_MISSING", `${key} is missing`);
    }
    if (providedPath !== expectedPath) {
      fail("CANONICAL_ARTIFACT_PATH_MISMATCH", `${key} is not the current versioned release artifact path`);
    }
  }
  return expected;
}

function validateFileDescriptor(descriptor, { repoRoot, filePath, label }) {
  exactKeys(descriptor, ["path", "sha256", "bytes"], label);
  const record = regularFileRecord(filePath, label);
  if (descriptor.path !== repositoryPath(repoRoot, filePath)
    || descriptor.sha256 !== record.sha256
    || descriptor.bytes !== record.bytes) {
    fail("PACKAGE_ARTIFACT_BINDING_MISMATCH", `${label} path, hash, or byte length is mismatched`);
  }
  return record;
}

function validateFormalBuildManifests(options, layout) {
  const externalRecord = regularFileRecord(layout.buildManifestPath, "external build manifest");
  const embeddedRecord = regularFileRecord(layout.embeddedBuildManifestPath, "embedded build manifest");
  let external;
  let embedded;
  try {
    external = validateDesktopBuildManifest(JSON.parse(readFileSync(layout.buildManifestPath, "utf8")));
    embedded = validateDesktopBuildManifest(JSON.parse(readFileSync(layout.embeddedBuildManifestPath, "utf8")));
  } catch {
    fail("BUILD_MANIFEST_INVALID", "package build manifest is not a strict canonical v2 manifest");
  }
  const authorityFields = (manifest) => {
    const { built_at: _nonAuthorityTimestamp, ...authoritative } = manifest;
    return authoritative;
  };
  if (JSON.stringify(authorityFields(external)) !== JSON.stringify(authorityFields(embedded))) {
    fail("BUILD_MANIFEST_PARITY_MISMATCH", "external and embedded build manifests differ beyond their non-authority build timestamp");
  }
  for (const manifest of [external, embedded]) {
    if (manifest.source_sha !== options.expectedSourceSha
      || manifest.source_tree !== options.expectedSourceTree
      || manifest.version !== options.expectedVersion
      || manifest.source_dirty !== false
      || manifest.channel !== "formal"
      || manifest.platform !== "win32"
      || manifest.arch !== "x64"
      || manifest.requested_runtime_mode !== "none"
      || manifest.effective_runtime_mode !== "none"
      || manifest.runtime_included !== false
      || manifest.runtime_data_class !== "none"
      || manifest.policy.thin_client !== true
      || manifest.distributable !== true
      || manifest.non_distributable !== false) {
      fail("BUILD_MANIFEST_SOURCE_MISMATCH", "package build manifest is stale, dirty, non-formal, or not privacy-safe thin-client output");
    }
  }
  return Object.freeze({ externalRecord, embeddedRecord });
}

function validateReference(reference, { repoRoot, filePath, expectedReceiptId, label }) {
  if (!reference || typeof reference !== "object" || Array.isArray(reference)) fail("EVIDENCE_REFERENCE_INVALID", `${label} reference is invalid`);
  const expectedPath = relativePath(repoRoot, filePath);
  const expectedSha256 = fileSha256(filePath);
  if (reference.path !== expectedPath || reference.sha256 !== expectedSha256) {
    fail("EVIDENCE_REFERENCE_MISMATCH", `${label} reference path or hash is mismatched`);
  }
  if (expectedReceiptId !== undefined && reference.receipt_id !== expectedReceiptId) {
    fail("EVIDENCE_REFERENCE_MISMATCH", `${label} receipt identifier is mismatched`);
  }
}

function validateCommon(receipt, options) {
  exactKeys(receipt, [
    "schema_version",
    "receipt_id",
    "tuw_id",
    "generated_at",
    "native_qa",
    "windows_release",
    "reason_code",
    "release",
    "source",
    "package",
    "runtime",
    "identity",
    "scenarios",
    "parity",
    "uninstall",
    "authenticode",
    "screenshots",
    "diagnostics",
    "boundaries",
  ], "Windows native QA receipt");
  if (receipt?.schema_version !== WINDOWS_NATIVE_QA_RECEIPT_SCHEMA) {
    fail("RECEIPT_SCHEMA_MISMATCH", "historical Windows package QA receipts cannot satisfy RFD-TUW-013");
  }
  if (receipt.tuw_id !== "RFD-TUW-013" || typeof receipt.receipt_id !== "string" || receipt.receipt_id.length < 3) {
    fail("RECEIPT_ID_MISMATCH", "Windows native QA receipt identity is invalid");
  }
  if (!Number.isFinite(Date.parse(receipt.generated_at ?? ""))) fail("RECEIPT_TIME_INVALID", "Windows native QA receipt time is invalid");
  exactKeys(receipt.release, ["id", "version", "channel"], "release binding");
  exactKeys(receipt.source, ["revision", "source_tree", "source_dirty"], "source binding");
  exactKeys(receipt.authenticode, ["authority_receipt", "signatures", "signature_state", "signer_binding"], "Authenticode result");
  exactKeys(receipt.boundaries, [
    "native_windows_executed",
    "public_release_claim",
    "production_go_live_claim",
    "historical_receipt_accepted",
    "certificate_secret_recorded",
    "authenticode_claim",
  ], "claim boundaries");
  if (!NATIVE_QA_STATES.has(receipt.native_qa) || receipt.native_qa !== options.expectedNativeQa) {
    fail("NATIVE_QA_STATE_MISMATCH", "Windows native QA state does not match the explicitly expected state");
  }
  if (!receipt.source || receipt.source.revision !== options.expectedSourceSha || receipt.source.source_tree !== options.expectedSourceTree) {
    fail("SOURCE_BINDING_MISMATCH", "Windows native QA receipt is stale or source-mismatched");
  }
  if (!SHA1.test(receipt.source.revision ?? "") || !SHA1.test(receipt.source.source_tree ?? "")) {
    fail("SOURCE_BINDING_INVALID", "Windows native QA source binding is invalid");
  }
  if (receipt.release?.id !== options.expectedReleaseId
    || receipt.release?.version !== options.expectedVersion
    || receipt.release?.channel !== "formal") {
    fail("RELEASE_BINDING_MISMATCH", "Windows native QA receipt version or release ID is stale");
  }
  if (receipt.boundaries?.public_release_claim !== false
    || receipt.boundaries?.production_go_live_claim !== false
    || receipt.boundaries?.historical_receipt_accepted !== false
    || receipt.boundaries?.certificate_secret_recorded !== false) {
    fail("CLAIM_BOUNDARY_INVALID", "Windows native QA receipt exceeds its release or secret boundary");
  }
}

function validateAuthorityReference(receipt, options) {
  validateReference(receipt.authenticode?.authority_receipt, {
    repoRoot: options.repoRoot,
    filePath: options.authorityReceiptPath,
    expectedReceiptId: options.authorityReceipt.receipt_id,
    label: "authority receipt",
  });
  return validateWindowsSigningAuthorityReceipt(options.authorityReceipt, {
    expectedSourceSha: options.expectedSourceSha,
    expectedSourceTree: options.expectedSourceTree,
    expectedReleaseId: options.expectedReleaseId,
    expectedVersion: options.expectedVersion,
    expectedInstallerSha256: options.expectedInstallerSha256,
    now: options.now,
  });
}

function validateBlockedReceipt(receipt, options) {
  const authority = validateAuthorityReference(receipt, options);
  if (authority.status !== "BLOCKED_BY_AUTHORITY"
    || receipt.windows_release !== "BLOCKED_BY_AUTHORITY"
    || receipt.reason_code !== "CURRENT_EXACT_SHA_NATIVE_EXECUTION_ABSENT"
    || receipt.boundaries.native_windows_executed !== false
    || receipt.boundaries.authenticode_claim !== false
    || receipt.package !== null
    || receipt.runtime !== null
    || receipt.identity !== null
    || receipt.scenarios !== null
    || receipt.parity !== null
    || receipt.uninstall !== null
    || receipt.authenticode.signatures !== null
    || receipt.authenticode.signature_state !== "NOT_EXECUTED"
    || receipt.authenticode.signer_binding !== null
    || receipt.screenshots?.length !== 0
    || receipt.diagnostics !== null) {
    fail("INVALID_BLOCKED_ARTIFACT_RECEIPT", "blocked artifact receipt contains an execution or release claim");
  }
  return Object.freeze({
    native_qa: receipt.native_qa,
    windows_release: receipt.windows_release,
    source_sha: receipt.source.revision,
    version: receipt.release.version,
    authoritative_execution: false,
  });
}

function validateFailedReceipt(receipt) {
  if (receipt.source.source_dirty !== false
    || receipt.windows_release !== "FAIL"
    || receipt.reason_code !== "WINDOWS_NATIVE_QA_EXECUTION_FAILED"
    || typeof receipt.boundaries.native_windows_executed !== "boolean"
    || receipt.boundaries.authenticode_claim !== false
    || receipt.package !== null
    || receipt.runtime !== null
    || receipt.identity !== null
    || receipt.scenarios !== null
    || receipt.parity !== null
    || receipt.uninstall !== null
    || receipt.authenticode?.authority_receipt !== null
    || receipt.authenticode?.signatures !== null
    || receipt.authenticode?.signature_state !== "FAILED_OR_INCOMPLETE"
    || receipt.authenticode?.signer_binding !== null
    || receipt.screenshots?.length !== 0
    || !Number.isSafeInteger(receipt.diagnostics?.page_error_count)
    || receipt.diagnostics.page_error_count < 0
    || !Number.isSafeInteger(receipt.diagnostics?.console_error_count)
    || receipt.diagnostics.console_error_count < 0
    || receipt.diagnostics?.execution_error_count !== 1) {
    fail("INVALID_FAILED_RECEIPT", "failed native receipt contains a success, artifact, or release claim");
  }
  return Object.freeze({
    native_qa: "FAIL",
    windows_release: "FAIL",
    source_sha: receipt.source.revision,
    version: receipt.release.version,
    native_windows_executed: receipt.boundaries.native_windows_executed,
    authoritative_execution: false,
  });
}

function allTrue(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length > 0
    && Object.values(value).every((entry) => entry === true);
}

function validateExecutedReceipt(receipt, options) {
  if (receipt.source.source_dirty !== false || receipt.boundaries.native_windows_executed !== true) {
    fail("NATIVE_EXECUTION_BOUNDARY_INVALID", "native PASS requires a clean exact-source Windows execution");
  }
  let currentSourceIdentity;
  try {
    currentSourceIdentity = readDesktopBuildSourceIdentity(options.repoRoot);
  } catch {
    fail("CURRENT_SOURCE_BINDING_MISMATCH", "native PASS requires an independently readable Git source identity");
  }
  const sourceDirtyPaths = currentSourceIdentity.sourceDirtyPaths.filter((filePath) => !filePath.startsWith("artifacts/"));
  if (currentSourceIdentity.sourceSha !== options.expectedSourceSha
    || currentSourceIdentity.sourceTree !== options.expectedSourceTree
    || sourceDirtyPaths.length !== 0) {
    fail("CURRENT_SOURCE_BINDING_MISMATCH", "native PASS must bind the current clean full source SHA and tree");
  }
  const layout = canonicalArtifactLayout(options);
  const manifestRecords = validateFormalBuildManifests(options, layout);
  exactKeys(receipt.package, [
    "release_root",
    "installer",
    "blockmap",
    "package_zip",
    "installer_manifest",
    "installer_manifest_signature",
    "unpacked_executable",
    "installed_executable",
    "build_manifest",
    "embedded_build_manifest",
    "windows_build_receipt",
    "release_artifact_sha256",
  ], "package");
  if (receipt.package.release_root !== repositoryPath(options.repoRoot, layout.releaseRoot)) {
    fail("CANONICAL_ARTIFACT_PATH_MISMATCH", "package release root is not the current desktop distribution root");
  }
  const installerRecord = validateFileDescriptor(receipt.package.installer, {
    repoRoot: options.repoRoot,
    filePath: layout.installerPath,
    label: "installer",
  });
  const blockmapRecord = validateFileDescriptor(receipt.package.blockmap, {
    repoRoot: options.repoRoot,
    filePath: layout.blockmapPath,
    label: "installer blockmap",
  });
  const packageZipRecord = validateFileDescriptor(receipt.package.package_zip, {
    repoRoot: options.repoRoot,
    filePath: layout.packageZipPath,
    label: "unsigned Windows package zip",
  });
  const installerManifestRecord = validateFileDescriptor(receipt.package.installer_manifest, {
    repoRoot: options.repoRoot,
    filePath: layout.installerManifestPath,
    label: "Windows installer manifest",
  });
  const installerManifestSignatureRecord = validateFileDescriptor(receipt.package.installer_manifest_signature, {
    repoRoot: options.repoRoot,
    filePath: layout.installerManifestSignaturePath,
    label: "Windows installer manifest signature",
  });
  const unpackedExecutableRecord = validateFileDescriptor(receipt.package.unpacked_executable, {
    repoRoot: options.repoRoot,
    filePath: layout.unpackedExecutablePath,
    label: "unpacked executable",
  });
  validateFileDescriptor(receipt.package.build_manifest, {
    repoRoot: options.repoRoot,
    filePath: layout.buildManifestPath,
    label: "external build manifest",
  });
  validateFileDescriptor(receipt.package.embedded_build_manifest, {
    repoRoot: options.repoRoot,
    filePath: layout.embeddedBuildManifestPath,
    label: "embedded build manifest",
  });
  const windowsBuildReceiptRecord = validateFileDescriptor(receipt.package.windows_build_receipt, {
    repoRoot: options.repoRoot,
    filePath: layout.windowsBuildReceiptPath,
    label: "Windows build receipt",
  });
  if (receipt.package.build_manifest.sha256 !== manifestRecords.externalRecord.sha256
    || receipt.package.embedded_build_manifest.sha256 !== manifestRecords.embeddedRecord.sha256) {
    fail("BUILD_MANIFEST_PARITY_MISMATCH", "receipt manifest descriptors are not bound to the canonical manifest bytes");
  }
  exactKeys(receipt.package.installed_executable, ["path_kind", "sha256", "bytes", "matches_unpacked"], "installed executable");
  if (receipt.package.installed_executable.path_kind !== "isolated_native_install"
    || receipt.package.installed_executable.sha256 !== unpackedExecutableRecord.sha256
    || receipt.package.installed_executable.bytes !== unpackedExecutableRecord.bytes
    || receipt.package.installed_executable.matches_unpacked !== true) {
    fail("PACKAGE_ARTIFACT_BINDING_MISMATCH", "installed executable descriptor does not match the canonical unpacked executable bytes");
  }
  if (options.expectedInstallerSha256 !== installerRecord.sha256
    || options.expectedUnpackedExecutableSha256 !== unpackedExecutableRecord.sha256) {
    fail("PACKAGE_ARTIFACT_BINDING_MISMATCH", "expected package hashes do not match the current canonical artifact bytes");
  }
  exactKeys(receipt.parity, [
    "installed_executable_matches_unpacked",
    "source_sha_matches_manifest",
    "source_tree_matches_manifest",
  ], "package parity");
  if (receipt.parity.installed_executable_matches_unpacked !== true
    || receipt.parity.source_sha_matches_manifest !== true
    || receipt.parity.source_tree_matches_manifest !== true) {
    fail("PACKAGE_PARITY_MISMATCH", "native PASS parity claims must all be true");
  }
  const expectedReleaseArtifactSha256 = [...new Set([
    packageZipRecord.sha256,
    installerManifestRecord.sha256,
    installerManifestSignatureRecord.sha256,
    manifestRecords.externalRecord.sha256,
    windowsBuildReceiptRecord.sha256,
    installerRecord.sha256,
    blockmapRecord.sha256,
  ])].sort();
  if (!Array.isArray(receipt.package.release_artifact_sha256)
    || JSON.stringify(receipt.package.release_artifact_sha256) !== JSON.stringify(expectedReleaseArtifactSha256)) {
    fail("PACKAGE_ARTIFACT_BINDING_MISMATCH", "native PASS release artifact hashes do not exactly match current package members");
  }
  if (!allTrue(receipt.scenarios)
    || REQUIRED_NATIVE_SCENARIOS.some((scenario) => receipt.scenarios[scenario] !== true)) {
    fail("NATIVE_SCENARIO_FAILED", "native PASS receipt contains an incomplete scenario");
  }
  if (receipt.diagnostics?.page_error_count !== 0 || receipt.diagnostics?.console_error_count !== 0) {
    fail("NATIVE_DIAGNOSTIC_FAILURE", "native PASS receipt contains runtime errors");
  }
  validateReference(receipt.uninstall?.inventory, {
    repoRoot: options.repoRoot,
    filePath: options.inventoryPath,
    label: "uninstall inventory",
  });
  const uninstallSummary = validateWindowsUninstallEvidence(options.inventory);
  const installedExecutables = options.inventory?.before?.install_directory?.files?.filter(
    (entry) => String(entry?.relative_path ?? "").toLowerCase() === "matter.exe",
  ) ?? [];
  if (installedExecutables.length !== 1
    || installedExecutables[0].sha256 !== unpackedExecutableRecord.sha256
    || installedExecutables[0].bytes !== unpackedExecutableRecord.bytes) {
    fail("INSTALLED_EXECUTABLE_INVENTORY_MISMATCH", "pre-uninstall inventory does not bind the installed executable to the canonical package bytes");
  }
  if (JSON.stringify(receipt.uninstall.summary) !== JSON.stringify(uninstallSummary)) {
    fail("UNINSTALL_SUMMARY_MISMATCH", "receipt uninstall summary does not match the full native inventory");
  }
  const authority = validateAuthorityReference(receipt, options);
  const decision = evaluateWindowsReleaseGate({
    nativeQa: receipt.native_qa,
    signatures: receipt.authenticode.signatures,
    authorityReceipt: options.authorityReceipt,
    sourceSha: options.expectedSourceSha,
    sourceTree: options.expectedSourceTree,
    releaseId: options.expectedReleaseId,
    version: options.expectedVersion,
    installerSha256: installerRecord.sha256,
    installedExecutableSha256: unpackedExecutableRecord.sha256,
    now: options.now,
  });
  if (receipt.windows_release !== decision.windows_release
    || receipt.reason_code !== decision.reason_code
    || receipt.authenticode.signature_state !== decision.signature_state
    || JSON.stringify(receipt.authenticode.signer_binding) !== JSON.stringify(decision.signer_binding)
    || receipt.boundaries.authenticode_claim !== (decision.windows_release === "PASS")) {
    fail("RELEASE_DECISION_MISMATCH", "receipt release decision does not match signatures and current authority");
  }
  if (receipt.windows_release === "FAIL") {
    fail("WINDOWS_RELEASE_FAILED", "Windows signature integrity or authorization validation failed");
  }
  if (!Array.isArray(receipt.screenshots)
    || receipt.screenshots.length === 0
    || receipt.screenshots.some(({ sha256: digest }) => !SHA256.test(digest ?? ""))) {
    fail("SCREENSHOT_EVIDENCE_INVALID", "native PASS screenshots are missing or invalid");
  }
  return Object.freeze({
    native_qa: receipt.native_qa,
    windows_release: receipt.windows_release,
    source_sha: receipt.source.revision,
    version: receipt.release.version,
    installer_sha256: installerRecord.sha256,
    signer_authority: authority.status,
    installed_file_count: uninstallSummary.installed_file_count,
    authoritative_execution: true,
  });
}

export function validateWindowsNativeQaReceipt(receipt, options = {}) {
  validateCommon(receipt, options);
  if (!options.repoRoot) fail("VALIDATION_INPUT_MISSING", "repository root is required");
  if (receipt.native_qa === "FAIL") return validateFailedReceipt(receipt);
  if (!options.authorityReceipt || !options.authorityReceiptPath) {
    fail("VALIDATION_INPUT_MISSING", "repository root and current authority receipt are required");
  }
  return receipt.native_qa === "BLOCKED_BY_ARTIFACT"
    ? validateBlockedReceipt(receipt, options)
    : validateExecutedReceipt(receipt, options);
}

export function readValidatedWindowsNativeQaPassReceipt({ receiptPath, repoRoot, now } = {}) {
  if (!receiptPath || !repoRoot) fail("VALIDATION_INPUT_MISSING", "strict receipt path and repository root are required");
  const receiptFile = readCanonicalRepositoryJson(repoRoot, receiptPath, "strict RFD-TUW-013 native QA receipt");
  if (path.basename(receiptFile.absolute) !== "rfd-tuw-013-windows-native-qa.json"
    || receiptFile.value?.schema_version !== WINDOWS_NATIVE_QA_RECEIPT_SCHEMA
    || receiptFile.value?.native_qa !== "PASS") {
    fail("RECEIPT_SCHEMA_MISMATCH", "strict native PASS receipt schema, basename, or state is invalid");
  }
  const authority = resolveReceiptReference(receiptFile.root, receiptFile.value.authenticode?.authority_receipt, "authority receipt");
  const inventory = resolveReceiptReference(receiptFile.root, receiptFile.value.uninstall?.inventory, "uninstall inventory");
  let version;
  try { version = JSON.parse(readFileSync(path.join(receiptFile.root, "apps/desktop/package.json"), "utf8")).version; } catch {
    fail("CURRENT_VERSION_BINDING_MISMATCH", "current desktop package version is unreadable");
  }
  let sourceIdentity;
  try { sourceIdentity = readDesktopBuildSourceIdentity(receiptFile.root); } catch {
    fail("CURRENT_SOURCE_BINDING_MISMATCH", "current Git source identity is unreadable");
  }
  const releaseRoot = path.join(receiptFile.root, "apps/desktop/dist");
  const installerPath = path.join(releaseRoot, `matter-${version}-win-x64.exe`);
  const unpackedExecutablePath = path.join(releaseRoot, "win-unpacked/matter.exe");
  const validationOptions = Object.freeze({
    repoRoot: receiptFile.root,
    authorityReceipt: authority.value,
    authorityReceiptPath: authority.absolute,
    inventory: inventory.value,
    inventoryPath: inventory.absolute,
    installerPath,
    blockmapPath: `${installerPath}.blockmap`,
    packageZipPath: path.join(releaseRoot, `win/matter-${version}-win32-x64-unsigned.zip`),
    installerManifestPath: path.join(releaseRoot, `win/matter-${version}-win-installer-manifest.json`),
    installerManifestSignaturePath: path.join(releaseRoot, `win/matter-${version}-win-installer-manifest.json.sig`),
    unpackedExecutablePath,
    buildManifestPath: path.join(releaseRoot, `win/matter-${version}-win-build-manifest.json`),
    embeddedBuildManifestPath: path.join(releaseRoot, "win-unpacked/resources/matter-build-manifest.json"),
    windowsBuildReceiptPath: path.join(receiptFile.root, "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md"),
    expectedSourceSha: sourceIdentity.sourceSha,
    expectedSourceTree: sourceIdentity.sourceTree,
    expectedVersion: version,
    expectedReleaseId: authority.value?.release?.id,
    expectedNativeQa: "PASS",
    expectedInstallerSha256: regularFileRecord(installerPath, "installer").sha256,
    expectedUnpackedExecutableSha256: regularFileRecord(unpackedExecutablePath, "unpacked executable").sha256,
    ...(now === undefined ? {} : { now }),
  });
  const result = validateWindowsNativeQaReceipt(receiptFile.value, validationOptions);
  return Object.freeze({
    receipt: receiptFile.value,
    reference: Object.freeze({
      path: receiptFile.relative,
      sha256: fileSha256(receiptFile.absolute),
      bytes: receiptFile.metadata.size,
      schema_version: receiptFile.value.schema_version,
      receipt_id: receiptFile.value.receipt_id,
    }),
    result,
    validationOptions,
  });
}

function parseArgs(argv) {
  const options = {};
  const valueFlags = new Map([
    ["--receipt", "receiptPath"],
    ["--authority", "authorityReceiptPath"],
    ["--inventory", "inventoryPath"],
    ["--installer", "installerPath"],
    ["--blockmap", "blockmapPath"],
    ["--package-zip", "packageZipPath"],
    ["--installer-manifest", "installerManifestPath"],
    ["--installer-manifest-signature", "installerManifestSignaturePath"],
    ["--unpacked-executable", "unpackedExecutablePath"],
    ["--build-manifest", "buildManifestPath"],
    ["--embedded-build-manifest", "embeddedBuildManifestPath"],
    ["--windows-build-receipt", "windowsBuildReceiptPath"],
    ["--source-sha", "expectedSourceSha"],
    ["--source-tree", "expectedSourceTree"],
    ["--version", "expectedVersion"],
    ["--release-id", "expectedReleaseId"],
    ["--expected-native-qa", "expectedNativeQa"],
    ["--report", "reportPath"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") { options.help = true; continue; }
    const equals = argument.indexOf("=");
    const flag = equals === -1 ? argument : argument.slice(0, equals);
    const key = valueFlags.get(flag);
    if (!key) fail("INVALID_ARGUMENT", "unknown validator option");
    const value = equals === -1 ? argv[++index] : argument.slice(equals + 1);
    if (!value || value.startsWith("--")) fail("INVALID_ARGUMENT", `${flag} requires a value`);
    options[key] = key.endsWith("Path") ? path.resolve(value) : value;
  }
  return options;
}

function usage() {
  return [
    "Usage: node scripts/validate-matter-desktop-windows-native-qa-receipt.mjs --receipt PATH --authority PATH --source-sha SHA --source-tree TREE --version VERSION --release-id ID --expected-native-qa PASS --inventory PATH --installer PATH --blockmap PATH --package-zip PATH --installer-manifest PATH --installer-manifest-signature PATH --unpacked-executable PATH --build-manifest PATH --embedded-build-manifest PATH --windows-build-receipt PATH [--report PATH]",
    "For a truthful non-executed receipt, use --expected-native-qa BLOCKED_BY_ARTIFACT and omit artifact/inventory paths.",
    "For a sanitized negative receipt, use --expected-native-qa FAIL; authority/artifact/inventory paths are optional.",
  ].join("\n");
}

function writeReport(reportPath, report) {
  if (!reportPath) return;
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
    if (options.help) { process.stdout.write(`${usage()}\n`); return 0; }
    for (const key of ["receiptPath", "expectedSourceSha", "expectedSourceTree", "expectedVersion", "expectedReleaseId", "expectedNativeQa"]) {
      if (!options[key]) fail("INVALID_ARGUMENT", `required validation input is missing: ${key}`);
    }
    if (!SHA1.test(options.expectedSourceSha) || !SHA1.test(options.expectedSourceTree) || !NATIVE_QA_STATES.has(options.expectedNativeQa)) {
      fail("INVALID_ARGUMENT", "expected source SHA/tree or native QA state is invalid");
    }
    if (options.expectedNativeQa === "PASS") {
      for (const key of [
        "authorityReceiptPath",
        "inventoryPath",
        "installerPath",
        "blockmapPath",
        "packageZipPath",
        "installerManifestPath",
        "installerManifestSignaturePath",
        "unpackedExecutablePath",
        "buildManifestPath",
        "embeddedBuildManifestPath",
        "windowsBuildReceiptPath",
      ]) {
        if (!options[key] || !existsSync(options[key])) fail("INVALID_ARGUMENT", `native PASS input is missing: ${key}`);
      }
    }
    if (options.expectedNativeQa === "BLOCKED_BY_ARTIFACT"
      && (!options.authorityReceiptPath || !existsSync(options.authorityReceiptPath))) {
      fail("INVALID_ARGUMENT", "blocked artifact validation requires the current authority receipt");
    }
    const repoRoot = process.cwd();
    const receipt = readJson(options.receiptPath, "native QA receipt");
    const authorityReceipt = options.authorityReceiptPath && existsSync(options.authorityReceiptPath)
      ? readJson(options.authorityReceiptPath, "authority receipt")
      : undefined;
    const inventory = options.inventoryPath ? readJson(options.inventoryPath, "uninstall inventory") : undefined;
    const result = validateWindowsNativeQaReceipt(receipt, {
      ...options,
      repoRoot,
      authorityReceipt,
      inventory,
      expectedInstallerSha256: options.installerPath ? fileSha256(options.installerPath) : undefined,
      expectedUnpackedExecutableSha256: options.unpackedExecutablePath ? fileSha256(options.unpackedExecutablePath) : undefined,
    });
    const report = {
      schema_version: WINDOWS_NATIVE_QA_VALIDATION_SCHEMA,
      validator: "matter-desktop-windows-native-qa-receipt",
      verdict: "PASS",
      ...result,
    };
    writeReport(options.reportPath, report);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return 0;
  } catch (error) {
    const known = error instanceof WindowsNativeQaReceiptValidationError
      || error instanceof WindowsReleaseGateValidationError
      || error instanceof WindowsNativeQaValidationError;
    const report = {
      schema_version: WINDOWS_NATIVE_QA_VALIDATION_SCHEMA,
      validator: "matter-desktop-windows-native-qa-receipt",
      verdict: "FAIL",
      code: known ? error.code : "WINDOWS_NATIVE_QA_VALIDATION_FAILED",
      message: known ? error.message : "Windows native QA validation failed",
    };
    try { writeReport(options?.reportPath, report); } catch {}
    process.stderr.write(`${JSON.stringify(report)}\n`);
    return 1;
  }
}

function canonicalPath(filePath) {
  try { return realpathSync(filePath); } catch { return null; }
}

if (canonicalPath(process.argv[1]) === canonicalPath(fileURLToPath(import.meta.url))) {
  process.exitCode = main();
}
