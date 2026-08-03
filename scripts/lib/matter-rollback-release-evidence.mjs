import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import {
  validateMacosReleaseBoundaryReceipt,
  validateRf13DistMacosReleaseSidecar,
} from "./matter-desktop-macos-release-boundary.mjs";
import { validateDesktopBuildManifest } from "./matter-desktop-provenance.mjs";
import { acquireMatterRollbackMacosLiveValidation } from "./matter-rollback-macos-live.mjs";
import {
  SHA1,
  SHA256,
  canonicalExistingFile,
  exactKeys,
  fail,
  isRecord,
  readJsonFile,
  requiredText,
  sha256Bytes,
  validateFileDescriptor,
} from "./matter-rollback-io.mjs";

export const MATTER_ROLLBACK_TARGET_MANIFEST_SCHEMA = "law-firm-os.matter-rollback.target-manifest.v2";
export const MATTER_ROLLBACK_ACTION = "lawos-matter-rollback";
export const MATTER_ROLLBACK_EXECUTION_ACTION = `${MATTER_ROLLBACK_ACTION}:execute`;
export const MATTER_ROLLBACK_ATTEST_ACTION = `${MATTER_ROLLBACK_ACTION}:attest`;
export const MATTER_ROLLBACK_SEAL_ACTION = `${MATTER_ROLLBACK_ACTION}:seal`;
export const MATTER_ROLLBACK_PRODUCTION_AUTHORITY_ACTION = `${MATTER_ROLLBACK_ACTION}:production-authority`;

const SAFE_SCHEMA = /^[A-Za-z0-9._:-]{1,128}$/u;
const SAFE_S3_BUCKET = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u;

function jsonFromDescriptor(descriptor, label, options = {}) {
  const validated = validateFileDescriptor(descriptor, label, options);
  try {
    return JSON.parse(readFileSync(validated.path, "utf8"));
  } catch {
    fail("MATTER_ROLLBACK_JSON", `${label} is not valid JSON`);
  }
}

function canonicalDirectory(candidate, label) {
  if (typeof candidate !== "string" || !isAbsolute(candidate)) fail("MATTER_ROLLBACK_PATH", `${label} must be absolute`);
  const path = resolve(candidate);
  if (!existsSync(path) || lstatSync(path).isSymbolicLink() || !statSync(path).isDirectory() || realpathSync(path) !== path) {
    fail("MATTER_ROLLBACK_PATH", `${label} must be a canonical non-symlink directory`);
  }
  return path;
}

function inside(root, candidate, label, { directory = false } = {}) {
  const path = directory ? canonicalDirectory(candidate, label) : canonicalExistingFile(candidate, label);
  const rel = relative(root, path);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    fail("MATTER_ROLLBACK_PATH", `${label} must remain inside the declared release root`);
  }
  return path;
}

function validateGitSource(source, repoRoot) {
  exactKeys(source, ["sha", "tree"], "manifest source");
  requiredText(source.sha, "source.sha", SHA1);
  requiredText(source.tree, "source.tree", SHA1);
  let tree;
  try {
    execFileSync("git", ["-C", repoRoot, "cat-file", "-e", `${source.sha}^{commit}`], { stdio: "ignore" });
    tree = execFileSync("git", ["-C", repoRoot, "rev-parse", `${source.sha}^{tree}`], { encoding: "utf8" }).trim();
  } catch {
    fail("MATTER_ROLLBACK_SOURCE_PROVENANCE", "manifest source commit is not present in the repository");
  }
  if (tree !== source.tree) fail("MATTER_ROLLBACK_SOURCE_PROVENANCE", "manifest source tree does not belong to its commit");
}

function validateCompatibility(value) {
  exactKeys(value, ["version", "readable_versions", "data_rollback_required"], "schema compatibility");
  requiredText(value.version, "schema version", SAFE_SCHEMA);
  if (!Array.isArray(value.readable_versions) || value.readable_versions.length === 0
    || new Set(value.readable_versions).size !== value.readable_versions.length
    || value.readable_versions.some((entry) => typeof entry !== "string" || !SAFE_SCHEMA.test(entry))
    || !value.readable_versions.includes(value.version)
    || value.data_rollback_required !== false) {
    fail("MATTER_ROLLBACK_SCHEMA_INCOMPATIBLE", "schema compatibility is invalid or requires a data rollback");
  }
}

function validateApi(api, source, repoRoot) {
  exactKeys(api, ["artifact", "s3", "environment_sha256", "health"], "manifest api");
  const artifact = validateFileDescriptor(api.artifact, "API artifact", {
    repoRoot,
    immutableBinding: source.sha,
  });
  exactKeys(api.s3, ["bucket", "key", "version_id"], "API S3 artifact");
  requiredText(api.s3.bucket, "API S3 bucket", SAFE_S3_BUCKET);
  requiredText(api.s3.key, "API S3 key", /^[A-Za-z0-9!_.*'()/-]{8,1024}$/u);
  requiredText(api.s3.version_id, "API S3 version", /^[A-Za-z0-9._~+/=-]{1,1024}$/u);
  if (api.s3.version_id === "null" || api.s3.key.includes("..")
    || !api.s3.key.includes(source.sha) || !api.s3.key.includes(artifact.sha256)) {
    fail("MATTER_ROLLBACK_MUTABLE_PATH", "API S3 artifact is not exact source/hash/version bound");
  }
  requiredText(api.environment_sha256, "API environment SHA-256", SHA256);
  exactKeys(api.health, ["status", "source_revision"], "API health expectation");
  if (api.health.status !== "ok" || api.health.source_revision !== source.sha) {
    fail("MATTER_ROLLBACK_HEALTH_EXPECTATION", "API health expectation is not exact-source bound");
  }
}

function validateMacosEvidence(desktop, source, now, macosLiveValidation) {
  exactKeys(desktop, ["platform", "archive", "release_evidence"], "manifest desktop");
  if (desktop.platform !== "macos") fail("MATTER_ROLLBACK_PLATFORM", "RFD-TUW-017 only supports isolated macOS rollback");
  const archive = validateFileDescriptor(desktop.archive, "desktop archive", { immutableBinding: source.sha });
  const evidence = desktop.release_evidence;
  exactKeys(evidence, [
    "checkpoint_id", "repo_root", "receipt", "approved_intake", "build_manifest", "release_manifest",
    "dist_receipt", "application_path", "disk_image_path", "windows_native_qa",
  ], "RFD-TUW-012 release evidence");
  if (evidence.checkpoint_id !== "RFD-TUW-012" || evidence.windows_native_qa !== null) {
    fail("MATTER_ROLLBACK_RELEASE_EVIDENCE", "macOS rollback requires RFD-TUW-012 and must not claim RFD-TUW-013 execution");
  }
  const releaseRoot = canonicalDirectory(evidence.repo_root, "RFD-TUW-012 release root");
  inside(releaseRoot, evidence.receipt.path, "RFD-TUW-012 receipt");
  inside(releaseRoot, evidence.approved_intake.path, "RFD-TUW-012 approved intake");
  inside(releaseRoot, evidence.build_manifest.path, "RFD-TUW-012 build manifest");
  inside(releaseRoot, evidence.release_manifest.path, "RFD-TUW-012 release manifest");
  inside(releaseRoot, evidence.dist_receipt.path, "RFD-TUW-012 RF13-DIST receipt");
  const receiptDescriptor = validateFileDescriptor(evidence.receipt, "RFD-TUW-012 receipt");
  const receipt = jsonFromDescriptor(evidence.receipt, "RFD-TUW-012 receipt");
  const approval = jsonFromDescriptor(evidence.approved_intake, "RFD-TUW-012 approved intake");
  let manifest;
  try {
    manifest = validateDesktopBuildManifest(jsonFromDescriptor(evidence.build_manifest, "RFD-TUW-012 build manifest"));
  } catch {
    fail("MATTER_ROLLBACK_RELEASE_EVIDENCE", "RFD-TUW-012 build manifest failed canonical v2 validation");
  }
  const releaseManifest = jsonFromDescriptor(evidence.release_manifest, "RFD-TUW-012 release manifest");
  const distReceiptDescriptor = validateFileDescriptor(evidence.dist_receipt, "RFD-TUW-012 RF13-DIST receipt");
  const distReceipt = jsonFromDescriptor(evidence.dist_receipt, "RFD-TUW-012 RF13-DIST receipt");
  const appPath = inside(releaseRoot, evidence.application_path, "RFD-TUW-012 application", { directory: true });
  const dmgPath = inside(releaseRoot, evidence.disk_image_path, "RFD-TUW-012 disk image");
  const stageRoot = canonicalDirectory(dirname(appPath), "RFD-TUW-012 SHA-scoped release stage");
  for (const [candidate, label] of [
    [evidence.receipt.path, "RFD-TUW-012 receipt"],
    [evidence.approved_intake.path, "RFD-TUW-012 approved intake"],
    [evidence.build_manifest.path, "RFD-TUW-012 build manifest"],
    [evidence.release_manifest.path, "RFD-TUW-012 release manifest"],
    [evidence.dist_receipt.path, "RFD-TUW-012 RF13-DIST receipt"],
    [dmgPath, "RFD-TUW-012 disk image"],
  ]) inside(stageRoot, candidate, label);
  const expectedReleaseRoot = relative(releaseRoot, stageRoot).split(sep).join("/");
  let validation;
  try {
    validation = validateMacosReleaseBoundaryReceipt(receipt, {
      repoRoot: releaseRoot,
      manifest,
      manifestPath: inside(releaseRoot, evidence.build_manifest.path, "RFD-TUW-012 build manifest"),
      appPath,
      dmgPath,
      approval,
      releaseManifest,
      receiptFileSha256: receiptDescriptor.sha256,
      expectedSourceSha: source.sha,
      expectedSourceTree: source.tree,
      expectedReleaseRoot,
      now: new Date(now).toISOString(),
    });
  } catch {
    fail("MATTER_ROLLBACK_RELEASE_EVIDENCE", "structured RFD-TUW-012 signing/notary evidence was rejected");
  }
  let liveSidecarValidation;
  try {
    liveSidecarValidation = validateRf13DistMacosReleaseSidecar(distReceipt, {
      liveValidation: macosLiveValidation,
      expectedSourceSha: source.sha,
      expectedSourceTree: source.tree,
      expectedArtifactSha256: validation.disk_image_sha256,
      expectedReceiptSha256: receiptDescriptor.sha256,
    });
  } catch {
    fail("MATTER_ROLLBACK_RELEASE_EVIDENCE", "RFD-TUW-012 same-process live authority was rejected");
  }
  if (validation.verdict !== "STRUCTURAL_ONLY"
    || validation.receipt_verdict !== "PASS"
    || validation.authoritative !== false
    || receipt.execution?.mode !== "native_live"
    || validation.disk_image_sha256 !== receipt.artifacts.disk_image.sha256
    || liveSidecarValidation.verdict !== "PASS"
    || liveSidecarValidation.authoritative !== true) {
    fail("MATTER_ROLLBACK_RELEASE_EVIDENCE", "RFD-TUW-012 did not bind the exact disk image");
  }
  return Object.freeze({
    archive_sha256: archive.sha256,
    package_manifest_sha256: evidence.build_manifest.sha256,
    disk_image_sha256: validation.disk_image_sha256,
    application_sha256: validation.application_sha256,
    release_receipt_sha256: receiptDescriptor.sha256,
    rf13_dist_receipt_sha256: distReceiptDescriptor.sha256,
  });
}

function validateAuthority(authority, repoRoot) {
  exactKeys(authority, ["action", "owner_role", "attestor_role", "trust_registry"], "rollback authority");
  if (authority.action !== MATTER_ROLLBACK_ACTION || authority.owner_role === authority.attestor_role) {
    fail("MATTER_ROLLBACK_AUTHORITY_MISMATCH", "rollback owner and independent attestor roles must be distinct");
  }
  requiredText(authority.owner_role, "rollback owner role", /^[A-Za-z0-9._:-]{2,64}$/u);
  requiredText(authority.attestor_role, "rollback attestor role", /^[A-Za-z0-9._:-]{2,64}$/u);
  const registry = jsonFromDescriptor(authority.trust_registry, "rollback trust registry", { privateFile: true, repoRoot });
  if (registry?.schema_version !== "law-firm-os.runtime-safety.approval-trust-registry.v1" || !Array.isArray(registry.keys)) {
    fail("MATTER_ROLLBACK_AUTHORITY_MISMATCH", "rollback trust registry is invalid");
  }
  const owner = registry.keys.find((key) => key.roles?.includes(authority.owner_role)
    && [MATTER_ROLLBACK_ACTION, MATTER_ROLLBACK_EXECUTION_ACTION].every((action) => key.actions?.includes(action)));
  const attestor = registry.keys.find((key) => key.roles?.includes(authority.attestor_role)
    && [MATTER_ROLLBACK_ATTEST_ACTION, MATTER_ROLLBACK_SEAL_ACTION].every((action) => key.actions?.includes(action)));
  if (!owner || !attestor || owner.key_id === attestor.key_id) {
    fail("MATTER_ROLLBACK_AUTHORITY_MISMATCH", "independent owner and attestor keys are not registered");
  }
}

export function validateMatterRollbackTargetManifest(manifest, {
  repoRoot = process.cwd(),
  now = Date.now(),
  macosLiveValidation = null,
} = {}) {
  validateMatterRollbackTargetManifestEnvelope(manifest);
  validateGitSource(manifest.source, repoRoot);
  validateCompatibility(manifest.schema_compatibility);
  validateApi(manifest.api, manifest.source, repoRoot);
  validateAuthority(manifest.rollback_authority, repoRoot);
  const desktopValidation = validateMacosEvidence(manifest.desktop, manifest.source, now, macosLiveValidation);
  return Object.freeze({ manifest, desktop_validation: desktopValidation });
}

export function validateMatterRollbackTargetManifestEnvelope(manifest) {
  exactKeys(manifest, [
    "schema_version", "manifest_id", "environment", "source", "schema_compatibility",
    "api", "desktop", "rollback_authority",
  ], "rollback target manifest");
  if (manifest.schema_version !== MATTER_ROLLBACK_TARGET_MANIFEST_SCHEMA
    || !new Set(["staging", "production"]).has(manifest.environment)) {
    fail("MATTER_ROLLBACK_MANIFEST_SCHEMA", "rollback target manifest schema or environment is invalid");
  }
  requiredText(manifest.manifest_id, "manifest_id");
  exactKeys(manifest.source, ["sha", "tree"], "manifest source");
  requiredText(manifest.source.sha, "source.sha", SHA1);
  requiredText(manifest.source.tree, "source.tree", SHA1);
  return manifest;
}

export function readMatterRollbackTargetManifest(candidate, {
  repoRoot = process.cwd(),
  now = Date.now(),
  macosLiveValidation = null,
} = {}) {
  const ref = readJsonFile(resolve(candidate), "rollback target manifest", { privateFile: true, repoRoot });
  const validation = validateMatterRollbackTargetManifest(ref.value, { repoRoot, now, macosLiveValidation });
  return Object.freeze({ path: ref.path, bytes: ref.bytes, sha256: ref.sha256, manifest: ref.value, validation });
}

export function readMatterRollbackTargetManifestLive(candidate, options = {}) {
  const ref = readJsonFile(resolve(candidate), "rollback target manifest", {
    privateFile: true,
    repoRoot: options.repoRoot ?? process.cwd(),
  });
  validateMatterRollbackTargetManifestEnvelope(ref.value);
  const macosLiveValidation = acquireMatterRollbackMacosLiveValidation(ref.value, options);
  return readMatterRollbackTargetManifest(ref.path, { ...options, macosLiveValidation });
}

export function validateManifestReference(value, label, {
  repoRoot = process.cwd(),
  now = Date.now(),
  macosLiveValidation = null,
} = {}) {
  exactKeys(value, ["path", "sha256", "bytes", "manifest"], label);
  const ref = readMatterRollbackTargetManifest(value.path, { repoRoot, now, macosLiveValidation });
  if (ref.sha256 !== value.sha256 || ref.bytes !== value.bytes
    || sha256Bytes(JSON.stringify(ref.manifest)) !== sha256Bytes(JSON.stringify(value.manifest))) {
    fail("MATTER_ROLLBACK_MANIFEST_REFERENCE", `${label} file or embedded manifest drifted`);
  }
  return ref;
}

export function assertMutuallyCompatible(current, target) {
  if (!current.schema_compatibility.readable_versions.includes(target.schema_compatibility.version)
    || !target.schema_compatibility.readable_versions.includes(current.schema_compatibility.version)) {
    fail("MATTER_ROLLBACK_SCHEMA_INCOMPATIBLE", "A and B schema compatibility is not bidirectional");
  }
}

export function assertSharedAuthority(current, target) {
  const left = current.rollback_authority;
  const right = target.rollback_authority;
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    fail("MATTER_ROLLBACK_AUTHORITY_MISMATCH", "A and B rollback authority bindings differ");
  }
}

export function assertDistinctTargets(current, target) {
  if (current.source.sha === target.source.sha || current.source.tree === target.source.tree
    || current.api.artifact.sha256 === target.api.artifact.sha256
    || current.desktop.release_evidence.build_manifest.sha256 === target.desktop.release_evidence.build_manifest.sha256) {
    fail("MATTER_ROLLBACK_SAME_TARGET", "rollback A and B targets must be distinct");
  }
}
