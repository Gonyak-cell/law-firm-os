import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  canonicalFormalPackageLoopbackJson,
  readFormalPackageLoopbackTranscript,
} from "./formal-package-loopback-transcript.mjs";
import {
  validateFormalPackageLoopbackNativeLauncherCapability,
} from "./formal-package-loopback-launcher.mjs";
import {
  RF13_DIST_PRIVACY_MEMBER_SCHEMA,
  RF13_DIST_WINDOWS_INSTALLER_PRIVACY_BUILDER_SCHEMA,
  RF13_DIST_WINDOWS_INSTALLER_PRIVACY_NATIVE_SCHEMA,
  desktopBuildManifestSha256,
  expandedDesktopArtifactDescriptor,
  inspectExpandedDesktopArtifact,
  validateDesktopArtifactPrivacyEvidence,
  validateRf13DistPrivacyMemberReceipt,
  validateWindowsInstallerNativePrivacyEvidence,
  validateWindowsInstallerNativePrivacyReceipt,
  validateWindowsInstallerPrivacyBuilderEvidence,
  validateWindowsInstallerPrivacyBuilderReceiptStructure,
} from "./matter-desktop-artifact-privacy.mjs";
import { readValidatedWindowsNativeQaPassReceipt } from "../validate-matter-desktop-windows-native-qa-receipt.mjs";

export const FORMAL_PACKAGE_LOOPBACK_QA_SCHEMA = "law-firm-os.formal-package-loopback-qa.v3";
export const FORMAL_PACKAGE_LOOPBACK_QA_TUW = "RFD-TUW-014";
export const FORMAL_PACKAGE_LOOPBACK_QA_LIMITATION = "LOCAL_NONPACKAGED_EXACT_SOURCE_LOOPBACK_QA_ONLY";
export const FORMAL_PACKAGE_LOOPBACK_PEOPLE_COUNT = 10;

const MODULE_ROOT = path.resolve(import.meta.dirname, "../..");
const GIT_SHA = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const WINDOWS_PACKAGE_PRIVACY_ARTIFACT_ROOT = "apps/desktop/dist/win/privacy";
const RUNNERS = Object.freeze({
  macos: Object.freeze({
    entrypoint: path.join(MODULE_ROOT, "scripts/run-formal-macos-package-qa.mjs"),
    capability: "native-macos-dmg",
  }),
  windows: Object.freeze({
    entrypoint: path.join(MODULE_ROOT, "scripts/run-formal-windows-package-qa.mjs"),
    capability: "native-windows-nsis",
  }),
});
const NATIVE_QA_CAPABILITIES = new WeakSet();

function mintNativeQaCapability(value) {
  const capability = Object.freeze(value);
  NATIVE_QA_CAPABILITIES.add(capability);
  return capability;
}

function exactKeys(value, expected, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label} fields drifted`);
}

function sha(value, label, pattern = SHA256) {
  assert.match(value ?? "", pattern, `${label} is invalid`);
}

function portableMemberPath(value, label) {
  assert.ok(typeof value === "string" && value.length > 0 && !path.posix.isAbsolute(value), `${label} is invalid`);
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
  assert.equal(normalized, value.replaceAll("\\", "/"), `${label} is not canonical`);
  assert.equal(normalized === ".." || normalized.startsWith("../"), false, `${label} escaped the package`);
  return normalized;
}

function timestamp(value, label) {
  assert.equal(new Date(value).toISOString(), value, `${label} must be a canonical ISO timestamp`);
}

function count(value, label, { positive = false } = {}) {
  assert.ok(Number.isSafeInteger(value) && value >= (positive ? 1 : 0), `${label} is invalid`);
}

function portableRelative(root, target, label) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  assert.ok(relative && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative), `${label} escaped its root`);
  return relative.split(path.sep).join("/");
}

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function validateFileReference(reference, label) {
  exactKeys(reference, ["bytes", "path", "scope", "sha256"], `${label} reference`);
  assert.ok(["evidence", "repository"].includes(reference.scope), `${label} scope is invalid`);
  assert.ok(typeof reference.path === "string" && reference.path.length > 0 && !path.isAbsolute(reference.path), `${label} path is invalid`);
  assert.equal(reference.path.split("/").includes(".."), false, `${label} path escaped its scope`);
  sha(reference.sha256, `${label} SHA-256`);
  count(reference.bytes, `${label} bytes`, { positive: true });
}

function resolveFileReference(reference, roots, label) {
  validateFileReference(reference, label);
  const root = reference.scope === "repository" ? roots.repositoryRoot : roots.evidenceRoot;
  const candidate = path.resolve(root, ...reference.path.split("/"));
  portableRelative(root, candidate, label);
  assert.equal(existsSync(candidate), true, `${label} is missing`);
  assert.equal(lstatSync(candidate).isSymbolicLink(), false, `${label} must not be a symlink`);
  const real = realpathSync(candidate);
  portableRelative(realpathSync(root), real, label);
  const stats = statSync(real);
  assert.equal(stats.isFile(), true, `${label} must be a regular file`);
  assert.equal(stats.size, reference.bytes, `${label} byte count mismatch`);
  assert.equal(sha256File(real), reference.sha256, `${label} hash mismatch`);
  return real;
}

function readCanonicalReferencedJson(reference, roots, label) {
  const filePath = resolveFileReference(reference, roots, label);
  const bytes = readFileSync(filePath);
  const value = JSON.parse(bytes.toString("utf8"));
  assert.deepEqual(bytes, canonicalFormalPackageLoopbackJson(value), `${label} must use canonical JSON bytes`);
  return Object.freeze({ filePath, value });
}

export function formalPackageLoopbackFileReference(filePath, {
  rootPath,
  scope,
} = {}) {
  assert.ok(["evidence", "repository"].includes(scope), "file reference scope is invalid");
  assert.equal(existsSync(filePath), true, "referenced evidence file is missing");
  assert.equal(lstatSync(filePath).isSymbolicLink(), false, "referenced evidence file must not be a symlink");
  const real = realpathSync(filePath);
  const stats = statSync(real);
  assert.equal(stats.isFile(), true, "referenced evidence must be a regular file");
  return Object.freeze({
    scope,
    path: portableRelative(realpathSync(rootPath), real, "referenced evidence"),
    sha256: sha256File(real),
    bytes: stats.size,
  });
}

function validateRenderer(renderer) {
  exactKeys(renderer, ["algorithm", "file_count", "sha256"], "receipt renderer");
  sha(renderer.sha256, "receipt renderer SHA-256");
  count(renderer.file_count, "receipt renderer file count", { positive: true });
  assert.ok(typeof renderer.algorithm === "string" && renderer.algorithm.length > 0);
}

function validateBindings(bindings, expected) {
  exactKeys(bindings, [
    "all_source_sha_equal", "artifact_privacy", "executed_package", "loopback_api",
    "package_artifact", "package_manifest", "runner_transcript",
  ], "receipt bindings");
  validateFileReference(bindings.package_artifact, "package artifact");
  assert.equal(bindings.package_artifact.sha256, expected.expectedArtifactSha256);
  exactKeys(bindings.executed_package, ["bytes", "kind", "member_digest_sha256", "member_path", "sha256"], "executed package binding");
  assert.ok(typeof bindings.executed_package.kind === "string" && bindings.executed_package.kind.length > 0);
  portableMemberPath(bindings.executed_package.member_path, "executed package member path");
  sha(bindings.executed_package.sha256, "executed package SHA-256");
  sha(bindings.executed_package.member_digest_sha256, "executed member digest");
  count(bindings.executed_package.bytes, "executed package bytes", { positive: true });
  assert.equal(bindings.executed_package.sha256, expected.expectedExecutedPackageSha256);
  exactKeys(bindings.package_manifest, [
    "bytes", "embedded_member_path", "path", "renderer_sha256", "scope", "sha256",
    "source_sha", "source_tree",
  ], "package manifest binding");
  validateFileReference({
    scope: bindings.package_manifest.scope,
    path: bindings.package_manifest.path,
    sha256: bindings.package_manifest.sha256,
    bytes: bindings.package_manifest.bytes,
  }, "package manifest");
  portableMemberPath(bindings.package_manifest.embedded_member_path, "embedded package manifest path");
  assert.equal(bindings.package_manifest.sha256, expected.expectedManifestSha256);
  assert.equal(bindings.package_manifest.source_sha, expected.expectedSourceSha);
  assert.equal(bindings.package_manifest.source_tree, expected.expectedSourceTree);
  sha(bindings.package_manifest.renderer_sha256, "package manifest renderer SHA-256");
  exactKeys(bindings.loopback_api, ["fixture_id", "health_source_sha", "source_sha", "source_tree"], "loopback API binding");
  assert.equal(bindings.loopback_api.source_sha, expected.expectedSourceSha);
  assert.equal(bindings.loopback_api.source_tree, expected.expectedSourceTree);
  assert.equal(bindings.loopback_api.health_source_sha, expected.expectedSourceSha);
  assert.ok(typeof bindings.loopback_api.fixture_id === "string" && bindings.loopback_api.fixture_id.length > 0);
  validateFileReference(bindings.runner_transcript, "runner transcript");
  exactKeys(bindings.artifact_privacy, ["corpus_sha256", "receipts"], "artifact privacy binding");
  sha(bindings.artifact_privacy.corpus_sha256, "privacy corpus SHA-256");
  assert.ok(Array.isArray(bindings.artifact_privacy.receipts) && bindings.artifact_privacy.receipts.length >= 2);
  bindings.artifact_privacy.receipts.forEach((reference, index) => validateFileReference(reference, `privacy receipt ${index + 1}`));
  assert.deepEqual(
    bindings.artifact_privacy.receipts.map(({ sha256: value }) => value),
    [...new Set(bindings.artifact_privacy.receipts.map(({ sha256: value }) => value))].sort(),
    "privacy receipt hashes must be unique and sorted",
  );
  assert.equal(bindings.all_source_sha_equal, true);
}

function validateRuntime(runtime) {
  exactKeys(runtime, [
    "api_profile", "aws_request_count", "base_url", "base_url_kind", "external_network_request_count",
    "health_status", "mode", "operator_token_used", "secret_env_injection_count", "topology",
  ], "receipt runtime");
  const baseUrl = new URL(runtime.base_url);
  assert.equal(baseUrl.protocol, "http:");
  assert.equal(baseUrl.hostname, "127.0.0.1");
  assert.match(baseUrl.port, /^\d{1,5}$/u);
  assert.ok(Number(baseUrl.port) > 0 && Number(baseUrl.port) <= 65_535);
  assert.equal(baseUrl.username, "");
  assert.equal(baseUrl.password, "");
  assert.equal(baseUrl.pathname, "/");
  assert.equal(baseUrl.search, "");
  assert.equal(baseUrl.hash, "");
  assert.equal(runtime.mode, "production-auth-http");
  assert.equal(runtime.topology, "thin-client");
  assert.equal(runtime.base_url_kind, "isolated_loopback_nonpackaged");
  assert.equal(runtime.api_profile, "local-dev-synthetic-only");
  assert.equal(runtime.operator_token_used, false);
  assert.equal(runtime.secret_env_injection_count, 0);
  assert.equal(runtime.external_network_request_count, 0);
  assert.equal(runtime.aws_request_count, 0);
  assert.equal(runtime.health_status, 200);
}

function validatePackage(value, platform) {
  const platformKeys = platform === "macos"
    ? ["bundle_member_path", "distribution"]
    : ["nsis_install_completed", "nsis_uninstall_completed"];
  exactKeys(value, [
    "app_id", "artifacts", "bundled_local_api_present", "channel", "formal_local_api_default_disabled",
    "operator_token_present", "private_local_runtime_present", "runtime_data_class", "runtime_data_mode",
    "thin_client", ...platformKeys,
  ], "receipt package");
  assert.equal(value.channel, "formal");
  assert.equal(value.app_id, "com.amic.matter.desktop");
  assert.equal(value.thin_client, true);
  assert.equal(value.runtime_data_mode, "none");
  assert.equal(value.runtime_data_class, "none");
  assert.equal(value.bundled_local_api_present, false);
  assert.equal(value.private_local_runtime_present, false);
  assert.equal(value.operator_token_present, false);
  assert.equal(value.formal_local_api_default_disabled, true);
  assert.ok(Array.isArray(value.artifacts) && value.artifacts.length > 0);
  value.artifacts.forEach((artifact, index) => {
    exactKeys(artifact, ["bytes", "path", "role", "scope", "sha256"], `package artifact ${index + 1}`);
    assert.ok(typeof artifact.role === "string" && artifact.role.length > 0);
    validateFileReference({ scope: artifact.scope, path: artifact.path, sha256: artifact.sha256, bytes: artifact.bytes }, `package artifact ${artifact.role}`);
  });
  assert.equal(new Set(value.artifacts.map(({ role }) => role)).size, value.artifacts.length, "package artifact roles must be unique");
  if (platform === "macos") {
    assert.ok(portableMemberPath(value.bundle_member_path, "macOS bundle member path").endsWith(".app"));
    assert.deepEqual(value.artifacts.map(({ role }) => role).sort(), ["dmg", "manifest", "zip"]);
    exactKeys(value.distribution, [
      "app_codesign", "app_gatekeeper", "app_stapler", "dmg_codesign", "dmg_gatekeeper",
      "dmg_image", "dmg_stapler",
    ], "macOS distribution");
    Object.values(value.distribution).forEach((result) => assert.equal(result, "pass"));
  } else {
    assert.deepEqual(value.artifacts.map(({ role }) => role).sort(), [
      "blockmap", "installer", "manifest", "package_zip", "unpacked_executable",
    ]);
    assert.equal(value.nsis_install_completed, true);
    assert.equal(value.nsis_uninstall_completed, true);
  }
}

function packageArtifact(receipt, role, id, kind) {
  const artifact = receipt.package.artifacts.find((row) => row.role === role);
  assert.ok(artifact, `${role} package artifact is required`);
  return Object.freeze({ id, kind, sha256: artifact.sha256, bytes: artifact.bytes });
}

function packageArtifactPath(receipt, role, roots) {
  const reference = receipt.package.artifacts.find((row) => row.role === role);
  assert.ok(reference, `${role} package artifact is required`);
  return resolveFileReference({
    scope: reference.scope,
    path: reference.path,
    sha256: reference.sha256,
    bytes: reference.bytes,
  }, roots, `${role} package artifact`);
}

export async function readFormalPackageLoopbackLivePrivacyValidations(receiptPath, {
  launcherCapability,
  repositoryRoot,
  evidenceRoot,
  expectedPlatform,
  expectedPrivacyArtifactRoot = null,
  corpus,
  executedRootPath,
} = {}) {
  validateFormalPackageLoopbackNativeLauncherCapability(launcherCapability, {
    platform: expectedPlatform,
    roles: ["native_runner", "deployed_api_runner", "rf13_goal_validator"],
  });
  const roots = {
    repositoryRoot: realpathSync(repositoryRoot),
    evidenceRoot: realpathSync(evidenceRoot),
  };
  portableRelative(roots.evidenceRoot, receiptPath, "formal package receipt");
  assert.equal(lstatSync(receiptPath).isSymbolicLink(), false, "formal package receipt must not be a symlink");
  const receiptBytes = readFileSync(receiptPath);
  const receipt = JSON.parse(receiptBytes.toString("utf8"));
  assert.deepEqual(receiptBytes, canonicalFormalPackageLoopbackJson(receipt), "formal package receipt must use canonical JSON bytes");
  assert.equal(receipt.schema_version, FORMAL_PACKAGE_LOOPBACK_QA_SCHEMA);
  assert.equal(receipt.platform, expectedPlatform);
  const manifestPath = resolveFileReference({
    scope: receipt.bindings.package_manifest.scope,
    path: receipt.bindings.package_manifest.path,
    sha256: receipt.bindings.package_manifest.sha256,
    bytes: receipt.bindings.package_manifest.bytes,
  }, roots, "package manifest");
  const buildManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const sidecars = receipt.bindings.artifact_privacy.receipts.map((reference, index) => ({
    reference,
    ...readCanonicalReferencedJson(reference, roots, `artifact privacy sidecar ${index + 1}`),
  }));
  assert.equal(lstatSync(executedRootPath).isSymbolicLink(), false, "executed package root must not be a symlink");
  const resolvedExecutedRoot = realpathSync(executedRootPath);
  assert.equal(statSync(resolvedExecutedRoot).isDirectory(), true, "executed package root must be a directory");
  const executedInspection = await inspectExpandedDesktopArtifact({
    rootPath: resolvedExecutedRoot,
    buildManifest,
    corpus,
    displayBase: roots.repositoryRoot,
  });
  assert.equal(
    executedInspection.member_manifest_sha256,
    receipt.bindings.executed_package.member_digest_sha256,
    "executed package member digest drifted from the native receipt",
  );

  if (expectedPlatform === "macos") {
    assert.ok(typeof expectedPrivacyArtifactRoot === "string" && expectedPrivacyArtifactRoot.length > 0);
    assert.deepEqual(
      sidecars.map(({ value }) => value.schema_version).sort(),
      [RF13_DIST_PRIVACY_MEMBER_SCHEMA, RF13_DIST_PRIVACY_MEMBER_SCHEMA],
    );
    const roles = new Map([["macos_dmg", "dmg"], ["macos_zip", "zip"]]);
    const validations = {};
    for (const { value } of sidecars) {
      const role = roles.get(value.artifact_id);
      assert.ok(role, `unexpected macOS privacy artifact: ${value.artifact_id}`);
      const artifact = packageArtifact(receipt, role, value.artifact_id, value.artifact_kind);
      validations[value.artifact_id] = await validateDesktopArtifactPrivacyEvidence({
        receipt: value,
        artifact,
        artifactPath: packageArtifactPath(receipt, role, roots),
        artifactRoot: expectedPrivacyArtifactRoot,
        expectedRootName: receipt.package.bundle_member_path,
        buildManifest,
        corpus,
        repoRoot: roots.repositoryRoot,
        displayBase: roots.repositoryRoot,
      });
      roles.delete(value.artifact_id);
    }
    assert.equal(roles.size, 0, "macOS privacy evidence is incomplete");
    return Object.freeze(validations);
  }

  assert.equal(expectedPlatform, "windows");
  assert.deepEqual(sidecars.map(({ value }) => value.schema_version).sort(), [
    RF13_DIST_PRIVACY_MEMBER_SCHEMA,
    RF13_DIST_PRIVACY_MEMBER_SCHEMA,
    RF13_DIST_WINDOWS_INSTALLER_PRIVACY_BUILDER_SCHEMA,
    RF13_DIST_WINDOWS_INSTALLER_PRIVACY_NATIVE_SCHEMA,
  ].sort());
  const generic = new Map(sidecars
    .filter(({ value }) => value.schema_version === RF13_DIST_PRIVACY_MEMBER_SCHEMA)
    .map(({ value }) => [value.artifact_id, value]));
  assert.deepEqual([...generic.keys()].sort(), ["windows_package_directory", "windows_package_zip"]);
  const packageZipPath = packageArtifactPath(receipt, "package_zip", roots);
  const packageZipSuffix = "-unsigned.zip";
  assert.equal(packageZipPath.endsWith(packageZipSuffix), true, "Windows package ZIP path is not canonical");
  const packageDirectoryPath = packageZipPath.slice(0, -packageZipSuffix.length);
  assert.equal(lstatSync(packageDirectoryPath).isSymbolicLink(), false, "Windows package directory must not be a symlink");
  assert.equal(statSync(packageDirectoryPath).isDirectory(), true, "Windows package directory is missing");
  portableRelative(roots.repositoryRoot, realpathSync(packageDirectoryPath), "Windows package directory");
  const packageDirectoryInspection = await inspectExpandedDesktopArtifact({
    rootPath: packageDirectoryPath,
    buildManifest,
    corpus,
    displayBase: roots.repositoryRoot,
  });
  const packageDirectoryArtifact = expandedDesktopArtifactDescriptor({
    id: "windows_package_directory",
    inspection: packageDirectoryInspection,
  });
  const packageDirectoryValidation = await validateDesktopArtifactPrivacyEvidence({
    receipt: generic.get("windows_package_directory"),
    artifact: packageDirectoryArtifact,
    artifactPath: packageDirectoryPath,
    artifactRoot: WINDOWS_PACKAGE_PRIVACY_ARTIFACT_ROOT,
    buildManifest,
    corpus,
    repoRoot: roots.repositoryRoot,
    displayBase: roots.repositoryRoot,
  });
  validateRf13DistPrivacyMemberReceipt(generic.get("windows_package_directory"), {
    artifact: packageDirectoryArtifact,
    artifactRoot: WINDOWS_PACKAGE_PRIVACY_ARTIFACT_ROOT,
    expectedBuildManifestSha256: desktopBuildManifestSha256(buildManifest),
    expectedSourceSha: buildManifest.source_sha,
    expectedSourceTree: buildManifest.source_tree,
    repoRoot: roots.repositoryRoot,
    validation: packageDirectoryValidation,
  });
  const packageZipArtifact = packageArtifact(
    receipt,
    "package_zip",
    "windows_package_zip",
    "unsigned_package_zip",
  );
  const packageZipValidation = await validateDesktopArtifactPrivacyEvidence({
    receipt: generic.get("windows_package_zip"),
    artifact: packageZipArtifact,
    artifactPath: packageZipPath,
    artifactRoot: WINDOWS_PACKAGE_PRIVACY_ARTIFACT_ROOT,
    expectedRootName: path.basename(packageDirectoryPath),
    buildManifest,
    corpus,
    repoRoot: roots.repositoryRoot,
    displayBase: roots.repositoryRoot,
  });
  validateRf13DistPrivacyMemberReceipt(generic.get("windows_package_zip"), {
    artifact: packageZipArtifact,
    artifactRoot: WINDOWS_PACKAGE_PRIVACY_ARTIFACT_ROOT,
    expectedBuildManifestSha256: desktopBuildManifestSha256(buildManifest),
    expectedSourceSha: buildManifest.source_sha,
    expectedSourceTree: buildManifest.source_tree,
    repoRoot: roots.repositoryRoot,
    validation: packageZipValidation,
  });
  const builder = sidecars.find(({ value }) => value.schema_version === RF13_DIST_WINDOWS_INSTALLER_PRIVACY_BUILDER_SCHEMA)?.value;
  const native = sidecars.find(({ value }) => value.schema_version === RF13_DIST_WINDOWS_INSTALLER_PRIVACY_NATIVE_SCHEMA)?.value;
  assert.ok(builder && native, "Windows installer privacy evidence is incomplete");
  const installer = packageArtifact(receipt, "installer", "windows_installer", "nsis_installer");
  const strictNative = readValidatedWindowsNativeQaPassReceipt({
    receiptPath: path.join(roots.repositoryRoot, ...native.native_qa_receipt.path.split("/")),
    repoRoot: roots.repositoryRoot,
  });
  assert.deepEqual(strictNative.reference, native.native_qa_receipt, "Windows native privacy receipt drifted from strict RFD013 evidence");
  const sourcePayloadPath = path.dirname(strictNative.validationOptions.unpackedExecutablePath);
  const embeddedBuildManifestPath = path.relative(
    sourcePayloadPath,
    strictNative.validationOptions.embeddedBuildManifestPath,
  ).split(path.sep).join("/");
  const builderValidation = await validateWindowsInstallerPrivacyBuilderEvidence({
    receipt: builder,
    artifact: installer,
    artifactPath: packageArtifactPath(receipt, "installer", roots),
    buildManifest,
    sourcePayloadPath,
    corpus,
    displayBase: roots.repositoryRoot,
    embeddedBuildManifestPath,
  });
  const installedExecutablePath = path.join(resolvedExecutedRoot, "matter.exe");
  assert.equal(statSync(installedExecutablePath).size, receipt.bindings.executed_package.bytes);
  assert.equal(sha256File(installedExecutablePath), receipt.bindings.executed_package.sha256);
  const validation = validateWindowsInstallerNativePrivacyEvidence({
    receipt: native,
    artifact: installer,
    repoRoot: roots.repositoryRoot,
    installedRootInspection: executedInspection,
    builderValidation,
    nativeQaValidationOptions: strictNative.validationOptions,
  });
  validateWindowsInstallerNativePrivacyReceipt(native, {
    artifact: installer,
    builderReceipt: builder,
    expectedSourceSha: receipt.source.revision,
    expectedSourceTree: receipt.source.source_tree,
    validation,
  });
  return Object.freeze({
    windows_package_directory: packageDirectoryValidation,
    windows_package_zip: packageZipValidation,
    windows_installer: validation,
  });
}

function validateNativeArtifactPrivacy(receipt, roots, {
  buildManifest,
  expectedPrivacyArtifactRoot,
  expectedPrivacyCorpusSha256,
  privacyValidations,
} = {}) {
  sha(expectedPrivacyCorpusSha256, "expected privacy corpus SHA-256");
  assert.equal(
    receipt.bindings.artifact_privacy.corpus_sha256,
    expectedPrivacyCorpusSha256,
    "privacy corpus drifted from the runner's shared RFD006 corpus",
  );
  const sidecars = receipt.bindings.artifact_privacy.receipts.map((reference, index) => ({
    reference,
    ...readCanonicalReferencedJson(reference, roots, `artifact privacy sidecar ${index + 1}`),
  }));
  const schemas = sidecars.map(({ value }) => value.schema_version).sort();
  if (receipt.platform === "macos") {
    exactKeys(privacyValidations, ["macos_dmg", "macos_zip"], "macOS live privacy validations");
    assert.deepEqual(schemas, [RF13_DIST_PRIVACY_MEMBER_SCHEMA, RF13_DIST_PRIVACY_MEMBER_SCHEMA]);
    assert.ok(typeof expectedPrivacyArtifactRoot === "string" && expectedPrivacyArtifactRoot.length > 0);
    const expectedBuildManifestSha256 = desktopBuildManifestSha256(buildManifest);
    const artifacts = new Map([
      ["macos_dmg", packageArtifact(receipt, "dmg", "macos_dmg", "dmg_image")],
      ["macos_zip", packageArtifact(receipt, "zip", "macos_zip", "zip_archive")],
    ]);
    for (const { value } of sidecars) {
      const artifact = artifacts.get(value.artifact_id);
      assert.ok(artifact, `unexpected macOS privacy artifact: ${value.artifact_id}`);
      validateRf13DistPrivacyMemberReceipt(value, {
        artifact,
        artifactRoot: expectedPrivacyArtifactRoot,
        expectedBuildManifestSha256,
        expectedSourceSha: receipt.source.revision,
        expectedSourceTree: receipt.source.source_tree,
        repoRoot: roots.repositoryRoot,
        validation: privacyValidations[value.artifact_id],
      });
      assert.equal(
        value.member_manifest_sha256,
        receipt.bindings.executed_package.member_digest_sha256,
        "macOS privacy member digest drifted from the executed mounted app",
      );
      artifacts.delete(value.artifact_id);
    }
    assert.equal(artifacts.size, 0, "macOS privacy sidecars are incomplete");
    return;
  }

  assert.deepEqual(schemas, [
    RF13_DIST_PRIVACY_MEMBER_SCHEMA,
    RF13_DIST_PRIVACY_MEMBER_SCHEMA,
    RF13_DIST_WINDOWS_INSTALLER_PRIVACY_BUILDER_SCHEMA,
    RF13_DIST_WINDOWS_INSTALLER_PRIVACY_NATIVE_SCHEMA,
  ].sort());
  exactKeys(
    privacyValidations,
    ["windows_package_directory", "windows_package_zip", "windows_installer"],
    "Windows live privacy validations",
  );
  const genericSidecars = new Map(sidecars
    .filter(({ value }) => value.schema_version === RF13_DIST_PRIVACY_MEMBER_SCHEMA)
    .map(({ value }) => [value.artifact_id, value]));
  assert.deepEqual([...genericSidecars.keys()].sort(), ["windows_package_directory", "windows_package_zip"]);
  const expectedBuildManifestSha256 = desktopBuildManifestSha256(buildManifest);
  const packageDirectory = genericSidecars.get("windows_package_directory");
  const packageDirectoryArtifact = {
    id: "windows_package_directory",
    kind: "expanded_directory",
    sha256: packageDirectory.artifact_sha256,
    bytes: packageDirectory.artifact_bytes,
  };
  validateRf13DistPrivacyMemberReceipt(packageDirectory, {
    artifact: packageDirectoryArtifact,
    artifactRoot: WINDOWS_PACKAGE_PRIVACY_ARTIFACT_ROOT,
    expectedBuildManifestSha256,
    expectedSourceSha: receipt.source.revision,
    expectedSourceTree: receipt.source.source_tree,
    repoRoot: roots.repositoryRoot,
    validation: privacyValidations.windows_package_directory,
  });
  const packageZip = genericSidecars.get("windows_package_zip");
  const packageZipArtifact = packageArtifact(
    receipt,
    "package_zip",
    "windows_package_zip",
    "unsigned_package_zip",
  );
  validateRf13DistPrivacyMemberReceipt(packageZip, {
    artifact: packageZipArtifact,
    artifactRoot: WINDOWS_PACKAGE_PRIVACY_ARTIFACT_ROOT,
    expectedBuildManifestSha256,
    expectedSourceSha: receipt.source.revision,
    expectedSourceTree: receipt.source.source_tree,
    repoRoot: roots.repositoryRoot,
    validation: privacyValidations.windows_package_zip,
  });
  assert.equal(
    packageDirectory.member_manifest_sha256,
    packageZip.member_manifest_sha256,
    "Windows package directory and ZIP member digests differ",
  );
  const builderSidecar = sidecars.find(({ value }) => value.schema_version === RF13_DIST_WINDOWS_INSTALLER_PRIVACY_BUILDER_SCHEMA);
  const nativeSidecar = sidecars.find(({ value }) => value.schema_version === RF13_DIST_WINDOWS_INSTALLER_PRIVACY_NATIVE_SCHEMA);
  const builder = builderSidecar?.value;
  const native = nativeSidecar?.value;
  assert.ok(builder && native && builderSidecar && nativeSidecar, "Windows installer privacy sidecars are incomplete");
  const installer = packageArtifact(receipt, "installer", "windows_installer", "nsis_installer");
  validateWindowsInstallerPrivacyBuilderReceiptStructure(builder, {
    artifact: installer,
    expectedSourceSha: receipt.source.revision,
    expectedSourceTree: receipt.source.source_tree,
  });
  assert.deepEqual(native.builder_receipt, {
    path: builderSidecar.reference.path,
    sha256: builderSidecar.reference.sha256,
    bytes: builderSidecar.reference.bytes,
    schema_version: builder.schema_version,
    receipt_id: builder.receipt_id,
  }, "Windows native privacy receipt is not bound to the referenced builder receipt");
  const nativeQa = readCanonicalReferencedJson({
    scope: "repository",
    path: native.native_qa_receipt.path,
    sha256: native.native_qa_receipt.sha256,
    bytes: native.native_qa_receipt.bytes,
  }, roots, "strict RFD013 native receipt");
  assert.equal(nativeQa.value.schema_version, native.native_qa_receipt.schema_version);
  assert.equal(nativeQa.value.receipt_id, native.native_qa_receipt.receipt_id);
  assert.equal(
    nativeQa.filePath,
    realpathSync(path.join(roots.evidenceRoot, "rfd-tuw-013-windows-native-qa.json")),
    "strict RFD013 native receipt path drifted from the native evidence root",
  );
  validateWindowsInstallerNativePrivacyReceipt(native, {
    artifact: installer,
    builderReceipt: builder,
    expectedSourceSha: receipt.source.revision,
    expectedSourceTree: receipt.source.source_tree,
    validation: privacyValidations.windows_installer,
  });
  assert.equal(
    native.installed_root_member_manifest_sha256,
    receipt.bindings.executed_package.member_digest_sha256,
    "Windows installed-root privacy digest drifted from the executed package",
  );
}

function validateScenarios(value, platform) {
  const windowsKeys = platform === "windows" ? ["nsis_install_completed", "nsis_uninstall_completed"] : [];
  exactKeys(value, [
    "forest_login_rendered", "leave_rendered", "matter_billing_created", "matter_queue_rendered",
    "matter_task_created", "matter_time_created", "matter_time_week_locked", "matter_wip_created",
    "payroll_rendered", "people_profile_photo_or_initials_complete", "people_roster_rendered",
    "profile_populated", "restart_session_restored", "signed_in", ...windowsKeys,
  ], "receipt scenarios");
  Object.values(value).forEach((result) => assert.equal(result, true));
}

function validateActions(value, transcriptRequests = null) {
  exactKeys(value, [
    "matter_billing", "matter_queue", "matter_task", "matter_time", "matter_time_week_lock",
    "matter_time_week_submit", "matter_wip",
  ], "receipt action evidence");
  exactKeys(value.matter_queue, ["seeded_task_id", "visible_count"], "Matter queue evidence");
  count(value.matter_queue.visible_count, "Matter queue visible count", { positive: true });
  assert.ok(typeof value.matter_queue.seeded_task_id === "string" && value.matter_queue.seeded_task_id.length > 0);
  const expectations = {
    matter_task: ["POST", "/api/matter/ops/tasks", 201, null],
    matter_time: ["POST", "/api/matter/ops/time-entries", 201, null],
    matter_time_week_submit: ["POST", "/api/matter/ops/time-weeks/submit", 200, null],
    matter_time_week_lock: ["POST", "/api/matter/ops/time-weeks/lock", 200, null],
    matter_wip: ["POST", "/api/matter/ops/wip", 201, "generate"],
    matter_billing: ["POST", "/api/matter/ops/wip", 201, "prebill"],
  };
  for (const [name, expected] of Object.entries(expectations)) {
    exactKeys(value[name], ["request", "ui_action_present"], `${name} action evidence`);
    assert.equal(value[name].ui_action_present, true);
    exactKeys(value[name].request, ["body_action", "method", "path", "sequence", "status"], `${name} request evidence`);
    const [method, requestPath, status, bodyAction] = expected;
    assert.deepEqual(
      [value[name].request.method, value[name].request.path, value[name].request.status, value[name].request.body_action],
      [method, requestPath, status, bodyAction],
    );
    count(value[name].request.sequence, `${name} request sequence`, { positive: true });
    if (transcriptRequests) {
      const row = transcriptRequests[value[name].request.sequence - 1];
      assert.ok(row, `${name} transcript request is missing`);
      assert.deepEqual(
        [row.sequence, row.method, row.path, row.status, row.body_action],
        [value[name].request.sequence, method, requestPath, status, bodyAction],
        `${name} action is not bound to the raw transcript`,
      );
    }
  }
}

function validateReceiptFields(receipt, expected, transcript = null) {
  exactKeys(receipt, [
    "action_evidence", "authenticode", "bindings", "boundaries", "diagnostics", "evidence_scope",
    "execution", "fixture", "generated_at", "native_verdict", "package", "platform", "runtime",
    "scenarios", "schema_version", "screenshots", "source", "tuw_id", "verdict",
  ], "formal package receipt");
  assert.equal(receipt.schema_version, FORMAL_PACKAGE_LOOPBACK_QA_SCHEMA);
  assert.equal(receipt.tuw_id, FORMAL_PACKAGE_LOOPBACK_QA_TUW);
  assert.equal(receipt.platform, expected.expectedPlatform);
  assert.ok(Object.hasOwn(RUNNERS, receipt.platform));
  timestamp(receipt.generated_at, "receipt generated_at");
  assert.equal(receipt.native_verdict, "PASS");
  assert.equal(receipt.evidence_scope, "local_exact_source_loopback_only");
  if (receipt.platform === "windows" && receipt.verdict !== "PASS") assert.equal(receipt.verdict, "BLOCKED_AUTHENTICODE");
  else assert.equal(receipt.verdict, "PASS");

  exactKeys(receipt.source, ["renderer", "revision", "source_dirty", "source_tree"], "receipt source");
  assert.equal(receipt.source.revision, expected.expectedSourceSha);
  assert.equal(receipt.source.source_tree, expected.expectedSourceTree);
  assert.equal(receipt.source.source_dirty, false);
  validateRenderer(receipt.source.renderer);
  validateBindings(receipt.bindings, expected);
  assert.equal(
    receipt.bindings.artifact_privacy.receipts.length,
    receipt.platform === "windows" ? 4 : 2,
    `${receipt.platform} native receipt privacy sidecar count drifted`,
  );
  validatePackage(receipt.package, receipt.platform);
  const primaryArtifactRole = receipt.platform === "macos" ? "dmg" : "installer";
  const primaryArtifact = receipt.package.artifacts.find(({ role }) => role === primaryArtifactRole);
  assert.ok(primaryArtifact, `${primaryArtifactRole} package artifact is required`);
  assert.deepEqual(
    { scope: primaryArtifact.scope, path: primaryArtifact.path, sha256: primaryArtifact.sha256, bytes: primaryArtifact.bytes },
    receipt.bindings.package_artifact,
    "primary package artifact drifted from its binding",
  );
  const manifestArtifact = receipt.package.artifacts.find(({ role }) => role === "manifest");
  assert.ok(manifestArtifact, "package manifest artifact is required");
  assert.deepEqual(
    { scope: manifestArtifact.scope, path: manifestArtifact.path, sha256: manifestArtifact.sha256, bytes: manifestArtifact.bytes },
    {
      scope: receipt.bindings.package_manifest.scope,
      path: receipt.bindings.package_manifest.path,
      sha256: receipt.bindings.package_manifest.sha256,
      bytes: receipt.bindings.package_manifest.bytes,
    },
    "package manifest artifact drifted from its binding",
  );
  validateRuntime(receipt.runtime);

  exactKeys(receipt.fixture, [
    "people_count", "profile_initials_count", "profile_photo_count", "profile_photo_or_initials_count",
    "real_identity_count", "synthetic_only",
  ], "receipt fixture");
  assert.equal(receipt.fixture.synthetic_only, true);
  assert.equal(receipt.fixture.people_count, FORMAL_PACKAGE_LOOPBACK_PEOPLE_COUNT);
  assert.equal(receipt.fixture.real_identity_count, 0);
  assert.equal(receipt.fixture.profile_photo_or_initials_count, FORMAL_PACKAGE_LOOPBACK_PEOPLE_COUNT);
  assert.equal(receipt.fixture.profile_photo_count + receipt.fixture.profile_initials_count, FORMAL_PACKAGE_LOOPBACK_PEOPLE_COUNT);
  validateScenarios(receipt.scenarios, receipt.platform);
  validateActions(receipt.action_evidence, transcript?.requests);

  assert.ok(Array.isArray(receipt.screenshots) && receipt.screenshots.length > 0);
  receipt.screenshots.forEach((row, index) => {
    exactKeys(row, ["bytes", "name", "path", "scope", "sha256"], `receipt screenshot ${index + 1}`);
    assert.ok(typeof row.name === "string" && row.name.length > 0);
    validateFileReference({ scope: row.scope, path: row.path, sha256: row.sha256, bytes: row.bytes }, `receipt screenshot ${index + 1}`);
  });
  exactKeys(receipt.diagnostics, ["console_error_count", "external_request_count", "page_error_count"], "receipt diagnostics");
  assert.deepEqual(receipt.diagnostics, { page_error_count: 0, console_error_count: 0, external_request_count: 0 });
  exactKeys(receipt.execution, [
    "adapter_invocation_count", "classification", "package_launch_count", "process_invocation_count",
    "runner_capability",
  ], "receipt execution");
  assert.equal(receipt.execution.classification, "ACTUAL_NATIVE_RUNNER");
  assert.equal(receipt.execution.runner_capability, RUNNERS[receipt.platform].capability);
  count(receipt.execution.process_invocation_count, "receipt process invocation count", { positive: true });
  assert.ok(receipt.execution.package_launch_count >= 2);
  assert.ok(receipt.execution.adapter_invocation_count >= 6);
  if (transcript) assert.deepEqual(receipt.execution, transcript.execution, "receipt execution counts drifted from transcript");

  exactKeys(receipt.boundaries, [
    "authenticode_claim", "aws_write", "deployment_evidence", "limitation", "private_local_runtime_used",
    "production_evidence", "production_go_live_claim", "production_runtime_used", "public_release_claim",
    "real_employee_write", "staging_evidence", "staging_runtime_used", "windows_native_claim",
  ], "receipt boundaries");
  assert.equal(receipt.boundaries.private_local_runtime_used, false);
  assert.equal(receipt.boundaries.real_employee_write, false);
  assert.equal(receipt.boundaries.staging_runtime_used, false);
  assert.equal(receipt.boundaries.production_runtime_used, false);
  assert.equal(receipt.boundaries.aws_write, false);
  assert.equal(receipt.boundaries.staging_evidence, false);
  assert.equal(receipt.boundaries.production_evidence, false);
  assert.equal(receipt.boundaries.deployment_evidence, false);
  assert.equal(receipt.boundaries.public_release_claim, false);
  assert.equal(receipt.boundaries.production_go_live_claim, false);
  assert.equal(receipt.boundaries.windows_native_claim, receipt.platform === "windows");
  assert.equal(receipt.boundaries.limitation, FORMAL_PACKAGE_LOOPBACK_QA_LIMITATION);
  if (receipt.platform === "windows") {
    exactKeys(receipt.authenticode, ["blocker", "valid"], "receipt Authenticode");
    if (receipt.verdict === "PASS") {
      assert.equal(receipt.authenticode.valid, true);
      assert.equal(receipt.authenticode.blocker, null);
    } else {
      assert.equal(receipt.authenticode.valid, false);
      assert.ok(typeof receipt.authenticode.blocker === "string" && receipt.authenticode.blocker.length > 0);
    }
    assert.equal(receipt.boundaries.authenticode_claim, receipt.authenticode.valid);
  } else {
    assert.equal(receipt.authenticode, null);
    assert.equal(receipt.boundaries.authenticode_claim, false);
  }
  return receipt;
}

export function validateFormalPackageLoopbackQaReceipt(receipt, expected = {}) {
  validateReceiptFields(receipt, expected, expected.transcript ?? null);
  return Object.freeze({
    valid: true,
    verdict: "TEST_ONLY",
    native_verdict: "NOT_RUN",
    authoritative: false,
    blocker: "CANONICAL_NATIVE_RUNNER_READER_REQUIRED",
    claimed_verdict: receipt.verdict,
  });
}

export function validateFormalPackageLoopbackNativeQaCapability(capability, expected = {}) {
  if (!capability || !NATIVE_QA_CAPABILITIES.has(capability)) {
    throw new Error("formal package native QA capability was not issued by the canonical native reader");
  }
  exactKeys(capability, [
    "artifact_sha256", "authoritative", "executed_package_sha256", "manifest_sha256",
    "native_verdict", "platform", "privacy_corpus_sha256", "receipt_sha256",
    "runner_capability", "source_sha", "source_tree", "transcript_sha256", "verdict",
  ], "formal package native QA capability");
  assert.equal(capability.authoritative, true);
  assert.equal(capability.native_verdict, "PASS");
  for (const [key, value] of Object.entries(expected)) {
    if (value !== undefined) assert.equal(capability[key], value, `formal package native QA capability ${key} mismatch`);
  }
  return capability;
}

export function writeFormalPackageLoopbackQaReceipt(filePath, receipt, expected = {}, {
  launcherCapability,
} = {}) {
  const runner = RUNNERS[receipt?.platform];
  assert.ok(runner, "formal package receipt platform is invalid");
  validateFormalPackageLoopbackNativeLauncherCapability(launcherCapability, {
    platform: receipt.platform,
    runnerPath: runner.entrypoint,
    roles: ["native_runner"],
  });
  validateReceiptFields(receipt, expected);
  const bytes = canonicalFormalPackageLoopbackJson(receipt);
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporaryPath, bytes, { flag: "wx", mode: 0o600 });
    renameSync(temporaryPath, filePath);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
  return Object.freeze({ path: filePath, sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.byteLength });
}

export function readFormalPackageLoopbackNativeQaReceipt(receiptPath, {
  launcherCapability,
  repositoryRoot,
  evidenceRoot,
  executedPackagePath = null,
  expectedPlatform,
  expectedSourceSha,
  expectedSourceTree,
  expectedArtifactSha256,
  expectedExecutedPackageSha256,
  expectedManifestSha256,
  expectedPrivacyArtifactRoot = null,
  expectedPrivacyCorpusSha256,
  privacyValidations,
} = {}) {
  const runner = RUNNERS[expectedPlatform];
  try {
    assert.ok(runner);
    validateFormalPackageLoopbackNativeLauncherCapability(launcherCapability, {
      platform: expectedPlatform,
      roles: ["native_runner", "deployed_api_runner", "rf13_goal_validator"],
    });
  } catch {
    return Object.freeze({
      valid: false,
      verdict: "BLOCKED_BY_RUNNER_CAPABILITY",
      native_verdict: "NOT_RUN",
      authoritative: false,
      blocker: "ACTUAL_PLATFORM_RUNNER_REQUIRED",
    });
  }
  const roots = {
    repositoryRoot: realpathSync(repositoryRoot),
    evidenceRoot: realpathSync(evidenceRoot),
  };
  portableRelative(roots.evidenceRoot, receiptPath, "formal package receipt");
  assert.equal(lstatSync(receiptPath).isSymbolicLink(), false, "formal package receipt must not be a symlink");
  const receiptBytes = readFileSync(receiptPath);
  const receipt = JSON.parse(receiptBytes.toString("utf8"));
  assert.deepEqual(receiptBytes, canonicalFormalPackageLoopbackJson(receipt), "formal package receipt must use canonical JSON bytes");
  const expected = {
    expectedPlatform,
    expectedSourceSha,
    expectedSourceTree,
    expectedArtifactSha256,
    expectedExecutedPackageSha256,
    expectedManifestSha256,
  };
  validateReceiptFields(receipt, expected);
  resolveFileReference(receipt.bindings.package_artifact, roots, "package artifact");
  const manifestPath = resolveFileReference({
    scope: receipt.bindings.package_manifest.scope,
    path: receipt.bindings.package_manifest.path,
    sha256: receipt.bindings.package_manifest.sha256,
    bytes: receipt.bindings.package_manifest.bytes,
  }, roots, "package manifest");
  const buildManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.equal(buildManifest.source_sha, expectedSourceSha, "resolved package manifest source SHA mismatch");
  assert.equal(buildManifest.source_tree, expectedSourceTree, "resolved package manifest source tree mismatch");
  assert.equal(buildManifest.renderer?.sha256, receipt.source.renderer.sha256, "resolved package renderer digest mismatch");
  const transcriptPath = resolveFileReference(receipt.bindings.runner_transcript, roots, "runner transcript");
  const transcriptRead = readFormalPackageLoopbackTranscript(transcriptPath, {
    platform: expectedPlatform,
    sourceSha: expectedSourceSha,
    sourceTree: expectedSourceTree,
    artifactSha256: expectedArtifactSha256,
    executedPackageSha256: expectedExecutedPackageSha256,
    manifestSha256: expectedManifestSha256,
    executedMemberDigestSha256: receipt.bindings.executed_package.member_digest_sha256,
    privacyReceiptSha256s: receipt.bindings.artifact_privacy.receipts.map(({ sha256: value }) => value),
  });
  assert.equal(transcriptRead.sha256, receipt.bindings.runner_transcript.sha256);
  assert.equal(transcriptRead.bytes, receipt.bindings.runner_transcript.bytes);
  assert.ok(
    Date.parse(receipt.generated_at) >= Date.parse(transcriptRead.transcript.finished_at),
    "formal package receipt predates its native transcript",
  );
  assert.equal(transcriptRead.transcript.runtime.base_url, receipt.runtime.base_url, "receipt runtime drifted from transcript");
  assert.equal(
    transcriptRead.transcript.runtime.health_source_sha,
    receipt.bindings.loopback_api.health_source_sha,
    "loopback health source drifted from transcript",
  );
  validateReceiptFields(receipt, expected, transcriptRead.transcript);
  for (const artifact of receipt.package.artifacts) {
    resolveFileReference(artifact, roots, `package artifact ${artifact.role}`);
  }
  validateNativeArtifactPrivacy(receipt, roots, {
    buildManifest,
    expectedPrivacyArtifactRoot,
    expectedPrivacyCorpusSha256,
    privacyValidations,
  });
  assert.deepEqual(
    receipt.screenshots.map(({ bytes, name, path: filePath, sha256: value }, index) => ({
      sequence: index + 1,
      name,
      path: filePath,
      sha256: value,
      bytes,
    })),
    transcriptRead.transcript.screenshots,
    "receipt screenshots drifted from the native transcript",
  );
  for (const screenshot of receipt.screenshots) {
    resolveFileReference({ scope: screenshot.scope, path: screenshot.path, sha256: screenshot.sha256, bytes: screenshot.bytes }, roots, "receipt screenshot");
  }
  if (expectedPlatform === "macos") {
    assert.ok(executedPackagePath, "mounted DMG executable path is required");
    assert.equal(existsSync(executedPackagePath), true, "mounted DMG executable is missing");
    assert.equal(lstatSync(executedPackagePath).isSymbolicLink(), false, "mounted DMG executable must not be a symlink");
    assert.equal(statSync(executedPackagePath).size, receipt.bindings.executed_package.bytes);
    assert.equal(sha256File(executedPackagePath), expectedExecutedPackageSha256);
  }
  return mintNativeQaCapability({
    platform: expectedPlatform,
    source_sha: expectedSourceSha,
    source_tree: expectedSourceTree,
    artifact_sha256: expectedArtifactSha256,
    executed_package_sha256: expectedExecutedPackageSha256,
    manifest_sha256: expectedManifestSha256,
    privacy_corpus_sha256: expectedPrivacyCorpusSha256,
    verdict: receipt.verdict,
    native_verdict: receipt.native_verdict,
    authoritative: true,
    runner_capability: runner.capability,
    receipt_sha256: createHash("sha256").update(receiptBytes).digest("hex"),
    transcript_sha256: transcriptRead.sha256,
  });
}
