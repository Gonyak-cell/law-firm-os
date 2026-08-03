import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  mkdtempSync,
  openSync,
  readSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  COLD_START_SCHEMA,
  validateFormalPackagedArtifactAuthoritatively,
} from "./matter-desktop-cold-start-contract.mjs";
import {
  RF13_DIST_PRIVACY_MEMBER_SCHEMA,
  buildDesktopArtifactPrivacyCorpus,
  desktopArtifactPrivacyCorpusSha256,
  validateDesktopArtifactPrivacyEvidence,
} from "./matter-desktop-artifact-privacy.mjs";
import {
  FORMAL_PACKAGE_LOOPBACK_QA_SCHEMA,
  readFormalPackageLoopbackLivePrivacyValidations,
  readFormalPackageLoopbackNativeQaReceipt,
} from "./formal-package-loopback-evidence.mjs";
import {
  FORMAL_PACKAGE_LOOPBACK_TRANSCRIPT_SCHEMA,
} from "./formal-package-loopback-transcript.mjs";
import {
  validateFormalPackageLoopbackNativeLauncherCapability,
} from "./formal-package-loopback-launcher.mjs";
import {
  RFD039_CHANGED_PATH_ALLOWLIST,
  RF13_EVIDENCE_SCHEMA,
} from "./matter-rf13-debt-remediation-contract.mjs";
import { readApprovedSourceBytes } from "./json-postgres-program-files.mjs";
import {
  readRf13OperationalContentReference,
} from "./matter-rf13-operational-attestation.mjs";
import { readOwnerOnlyProductionEvidence } from "./profile-media-production-evidence-files.mjs";

export const RF13_GOAL_OPERATIONAL_INPUT_SCHEMA =
  "law-firm-os.rf13.goal-operational-inputs.v1";

const INTERNAL_RUNNER_PATH = path.resolve(
  import.meta.dirname,
  "../internal/run-matter-rf13-debt-remediation-goal.mjs",
);
const MODULE_REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const TRUST_REGISTRY_PIN_ENV = "LAWOS_OWNER_TRUST_REGISTRY_SHA256";
const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const OPERATIONAL_INPUT_MAX_BYTES = 256 * 1024;
const TRUST_REGISTRY_MAX_BYTES = 1024 * 1024;
const APPROVAL_RECEIPT_MAX_BYTES = 256 * 1024;
const ATTESTATION_PACKET_MAX_BYTES = 2 * 1024 * 1024;
const SIGNATURE_MAX_BYTES = 4096;
const INPUT_KEYS = Object.freeze([
  "schema_version",
  "trust_registry_path",
  "authenticated_session_fixture_path",
  "exchange_root",
  "web_full_attestation_receipt_path",
  "web_full_attestation_signature_path",
  "profile_measurement_attestation_packet_path",
  "profile_measurement_attestation_receipt_path",
  "profile_measurement_attestation_signature_path",
  "profile_operation_attestation_receipt_path",
  "profile_operation_attestation_signature_path",
  "profile_decision_attestation_receipt_path",
  "profile_decision_attestation_signature_path",
]);
const EXTERNAL_INPUT_LIMITS = Object.freeze({
  trust_registry_path: TRUST_REGISTRY_MAX_BYTES,
  web_full_attestation_receipt_path: APPROVAL_RECEIPT_MAX_BYTES,
  web_full_attestation_signature_path: SIGNATURE_MAX_BYTES,
  profile_measurement_attestation_packet_path: ATTESTATION_PACKET_MAX_BYTES,
  profile_measurement_attestation_receipt_path: APPROVAL_RECEIPT_MAX_BYTES,
  profile_measurement_attestation_signature_path: SIGNATURE_MAX_BYTES,
  profile_operation_attestation_receipt_path: APPROVAL_RECEIPT_MAX_BYTES,
  profile_operation_attestation_signature_path: SIGNATURE_MAX_BYTES,
  profile_decision_attestation_receipt_path: APPROVAL_RECEIPT_MAX_BYTES,
  profile_decision_attestation_signature_path: SIGNATURE_MAX_BYTES,
});

export class MatterRf13GoalOperationalAuthorityError extends Error {
  constructor(code, message, { blocked = false } = {}) {
    super(message);
    this.name = "MatterRf13GoalOperationalAuthorityError";
    this.code = code;
    this.blocked = blocked;
  }
}

function fail(code, message, options) {
  throw new MatterRf13GoalOperationalAuthorityError(code, message, options);
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function record(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("RF13_GOAL_OPERATIONAL_INPUT_INVALID", `${label} must be an object`);
  }
  return value;
}

function exactKeys(value, keys, label) {
  record(value, label);
  if (JSON.stringify(Object.keys(value).toSorted()) !== JSON.stringify([...keys].toSorted())) {
    fail("RF13_GOAL_OPERATIONAL_INPUT_INVALID", `${label} fields do not match the closed schema`);
  }
}

function parseJson(bytes, code, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(code, `${label} is not valid JSON`);
  }
}

function sameSnapshot(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.nlink === right.nlink
    && left.uid === right.uid
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function within(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".."
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative));
}

function canonicalRepoRoot(repoRoot) {
  try {
    if (typeof repoRoot !== "string" || !path.isAbsolute(repoRoot)
      || path.resolve(repoRoot) !== repoRoot || realpathSync(repoRoot) !== repoRoot) throw new Error();
    const gitRoot = realpathSync(execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim());
    if (gitRoot !== repoRoot) throw new Error();
    return repoRoot;
  } catch {
    fail("RF13_GOAL_OPERATIONAL_SOURCE_INVALID", "the fixed repository root is not canonical");
  }
}

function gitText(repoRoot, args, code = "RF13_GOAL_OPERATIONAL_SOURCE_INVALID") {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    fail(code, "the required immutable Git relationship could not be proven");
  }
}

function exactCleanSource(repoRoot) {
  const before = gitText(repoRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (before) {
    fail(
      "RF13_GOAL_OPERATIONAL_SOURCE_DIRTY",
      "full RF13 operational validation requires a clean exact source",
      { blocked: true },
    );
  }
  const sha = gitText(repoRoot, ["rev-parse", "HEAD^{commit}"]);
  const tree = gitText(repoRoot, ["rev-parse", "HEAD^{tree}"]);
  const after = gitText(repoRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (!SHA1.test(sha) || !SHA1.test(tree) || after
    || gitText(repoRoot, ["rev-parse", "HEAD^{commit}"]) !== sha
    || gitText(repoRoot, ["rev-parse", "HEAD^{tree}"]) !== tree) {
    fail("RF13_GOAL_OPERATIONAL_SOURCE_DRIFT", "Git source changed during operational preparation");
  }
  return Object.freeze({ sha, tree, dirty: false });
}

function readRepoPinnedBytes(repoRoot, relativePath, {
  expectedBytes,
  expectedSha256,
  maxBytes = 32 * 1024 * 1024,
  label = "repository evidence",
} = {}) {
  if (typeof relativePath !== "string" || path.isAbsolute(relativePath)
    || relativePath.includes("\\")
    || relativePath.split("/").some((part) => !part || part === "." || part === "..")
    || !Number.isSafeInteger(maxBytes) || maxBytes < 1
    || !SHA256.test(expectedSha256 ?? "")) {
    fail("RF13_GOAL_OPERATIONAL_EVIDENCE_INVALID", `${label} path is invalid`);
  }
  const target = path.resolve(repoRoot, ...relativePath.split("/"));
  try {
    if (!within(repoRoot, target)) throw new Error("evidence escaped repository");
    const metadata = lstatSync(target, { bigint: true });
    if (!metadata.isFile() || metadata.size < 1n || metadata.size > BigInt(maxBytes)
      || metadata.size > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("unsafe evidence metadata");
    const byteSize = Number(metadata.size);
    if (expectedBytes !== undefined && expectedBytes !== byteSize) throw new Error("evidence size drifted");
    return readApprovedSourceBytes(target, {
      approvedRoots: [repoRoot],
      expectedByteSize: expectedBytes ?? byteSize,
      expectedSha256,
      maxBytes,
    });
  } catch {
    fail("RF13_GOAL_OPERATIONAL_EVIDENCE_INVALID", `${label} is not a stable content-addressed repository file`);
  }
}

// Package archives can exceed the shared bounded-reader's 512 MiB ceiling.
// Keep this descriptor-pinned streaming verifier only for those large binary
// artifacts; bounded JSON/member-manifest reads use readApprovedSourceBytes.
function verifyRepoPinnedFile(repoRoot, relativePath, {
  expectedBytes,
  expectedSha256,
  maxBytes,
  label,
} = {}) {
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 1
    || !Number.isSafeInteger(maxBytes) || maxBytes < expectedBytes
    || !SHA256.test(expectedSha256 ?? "")) {
    fail("RF13_GOAL_OPERATIONAL_EVIDENCE_INVALID", `${label} descriptor is invalid`);
  }
  if (typeof relativePath !== "string" || path.isAbsolute(relativePath)
    || relativePath.includes("\\")
    || relativePath.split("/").some((part) => !part || part === "." || part === "..")) {
    fail("RF13_GOAL_OPERATIONAL_EVIDENCE_INVALID", `${label} path is invalid`);
  }
  const target = path.resolve(repoRoot, ...relativePath.split("/"));
  const parent = path.dirname(target);
  let descriptor;
  try {
    if (!within(repoRoot, target) || realpathSync(parent) !== parent || realpathSync(target) !== target) {
      throw new Error("file escaped repository");
    }
    const parentBefore = lstatSync(parent, { bigint: true });
    const before = lstatSync(target, { bigint: true });
    if (!parentBefore.isDirectory() || !before.isFile() || before.nlink !== 1n
      || before.size !== BigInt(expectedBytes) || before.size > BigInt(maxBytes)
      || !Number.isInteger(constants.O_NOFOLLOW)) throw new Error("unsafe file metadata");
    descriptor = openSync(target, constants.O_RDONLY | (constants.O_CLOEXEC ?? 0) | constants.O_NOFOLLOW);
    const opened = fstatSync(descriptor, { bigint: true });
    if (!sameSnapshot(before, opened)) throw new Error("file changed before open");
    const digest = createHash("sha256");
    const buffer = Buffer.allocUnsafe(1024 * 1024);
    let offset = 0;
    while (offset < expectedBytes) {
      const count = readSync(descriptor, buffer, 0, Math.min(buffer.length, expectedBytes - offset), offset);
      if (!Number.isSafeInteger(count) || count <= 0) throw new Error("short file read");
      digest.update(buffer.subarray(0, count));
      offset += count;
    }
    if (readSync(descriptor, buffer, 0, 1, expectedBytes) !== 0) throw new Error("file grew during read");
    const openedAfter = fstatSync(descriptor, { bigint: true });
    const after = lstatSync(target, { bigint: true });
    const parentAfter = lstatSync(parent, { bigint: true });
    if (digest.digest("hex") !== expectedSha256
      || !sameSnapshot(opened, openedAfter) || !sameSnapshot(openedAfter, after)
      || !sameSnapshot(parentBefore, parentAfter)
      || realpathSync(parent) !== parent || realpathSync(target) !== target) {
      throw new Error("file changed during read");
    }
    return target;
  } catch {
    fail("RF13_GOAL_OPERATIONAL_EVIDENCE_INVALID", `${label} is not a stable content-addressed repository file`);
  } finally {
    if (descriptor !== undefined) {
      try { closeSync(descriptor); } catch {}
    }
  }
}

function verifyPinnedAbsoluteFile(root, target, {
  expectedBytes,
  expectedSha256,
  maxBytes = 4 * 1024 * 1024 * 1024,
  label,
} = {}) {
  const relative = path.relative(root, target);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    fail("RF13_GOAL_OPERATIONAL_EVIDENCE_INVALID", `${label} escaped its fixed root`);
  }
  return verifyRepoPinnedFile(root, relative.split(path.sep).join("/"), {
    expectedBytes,
    expectedSha256,
    maxBytes,
    label,
  });
}

function readOperationalContent(repoRoot, reference, schemaVersion, label) {
  try {
    return readRf13OperationalContentReference({
      repoRoot,
      reference: Object.freeze({
        path: reference?.path,
        sha256: reference?.sha256,
        bytes: reference?.bytes,
        schema_version: schemaVersion,
      }),
      expectedSchema: schemaVersion,
    });
  } catch {
    fail("RF13_GOAL_OPERATIONAL_EVIDENCE_INVALID", `${label} is not stable content-addressed RF13 evidence`);
  }
}

function unitEvidenceReceipt(repoRoot, manifest, unitId) {
  const unit = manifest?.units?.find((candidate) => candidate?.id === unitId);
  if (!unit || unit.status !== "COMPLETE" || !Array.isArray(unit.evidence) || unit.evidence.length !== 1) {
    fail(
      "RF13_GOAL_OPERATIONAL_EVIDENCE_UNAVAILABLE",
      `${unitId} must be COMPLETE with exactly one evidence reference before operational preparation`,
      { blocked: true },
    );
  }
  const content = readOperationalContent(repoRoot, unit.evidence[0], RF13_EVIDENCE_SCHEMA, `${unitId} evidence`);
  if (content.value?.tuw_id !== unitId || content.value?.schema_version !== RF13_EVIDENCE_SCHEMA) {
    fail("RF13_GOAL_OPERATIONAL_EVIDENCE_INVALID", `${unitId} evidence identity drifted`);
  }
  return content.value;
}

function assertSource(repoRoot, value, label) {
  if (!value || !SHA1.test(value.sha ?? "") || !SHA1.test(value.tree ?? "") || value.dirty !== false) {
    fail("RF13_GOAL_OPERATIONAL_LINEAGE_INVALID", `${label} is not an exact clean source`);
  }
  if (gitText(repoRoot, ["rev-parse", `${value.sha}^{tree}`], "RF13_GOAL_OPERATIONAL_LINEAGE_INVALID") !== value.tree) {
    fail("RF13_GOAL_OPERATIONAL_LINEAGE_INVALID", `${label} tree does not match Git`);
  }
}

function validateLineage(repoRoot, manifest, receipts, currentSource) {
  for (const [label, source] of [
    ["baseline", receipts.rfd038.source],
    ["candidate", receipts.rfd039.source],
    ["final", receipts.rfd040.source],
  ]) assertSource(repoRoot, source, label);
  const parents = gitText(repoRoot, ["rev-list", "--parents", "-n", "1", receipts.rfd039.source.sha], "RF13_GOAL_OPERATIONAL_LINEAGE_INVALID")
    .split(/\s+/u);
  if (parents.length !== 2 || parents[1] !== receipts.rfd038.source.sha) {
    fail("RF13_GOAL_OPERATIONAL_LINEAGE_INVALID", "candidate must be the direct single-parent child of the baseline");
  }
  const changed = execFileSync("git", [
    "diff", "--name-only", "-z", receipts.rfd038.source.sha, receipts.rfd039.source.sha, "--",
  ], { cwd: repoRoot, stdio: ["ignore", "pipe", "ignore"] })
    .toString("utf8").split("\0").filter(Boolean);
  if (JSON.stringify(changed) !== JSON.stringify(RFD039_CHANGED_PATH_ALLOWLIST)) {
    fail("RF13_GOAL_OPERATIONAL_LINEAGE_INVALID", "candidate changed paths exceed the exact RF13 experiment allowlist");
  }
  const finalState = receipts.rfd040.observations?.final_state;
  const decision = receipts.rfd040.observations?.decision;
  const expected = decision === "ADOPTED_MEASURED_GAIN"
    ? receipts.rfd039.source
    : decision === "REVERTED_NO_GAIN"
      ? receipts.rfd038.source
      : null;
  if (!expected || finalState?.source?.sha !== expected.sha || finalState.source.tree !== expected.tree
    || finalState.source.dirty !== false
    || receipts.rfd040.source.sha !== currentSource.sha
    || receipts.rfd040.source.tree !== currentSource.tree
    || manifest?.source?.head_sha !== currentSource.sha
    || manifest?.source?.tree_sha !== currentSource.tree
    || manifest?.source?.source_dirty !== false) {
    fail("RF13_GOAL_OPERATIONAL_FINAL_STATE_INVALID", "final decision state is not bound to the current clean source");
  }
}

function externalOwnerOnlyDirectory(value, repoRoot, label) {
  try {
    if (typeof value !== "string" || !path.isAbsolute(value) || path.resolve(value) !== value
      || realpathSync(value) !== value || within(repoRoot, value)
      || typeof process.getuid !== "function" || !Number.isSafeInteger(process.getuid())) {
      throw new Error("invalid external directory path");
    }
    const metadata = lstatSync(value, { bigint: true });
    if (!metadata.isDirectory() || metadata.isSymbolicLink()
      || metadata.uid !== BigInt(process.getuid())
      || (metadata.mode & 0o077n) !== 0n
      || (metadata.mode & 0o500n) !== 0o500n) {
      throw new Error("external directory is not owner-only");
    }
    return value;
  } catch {
    fail("RF13_GOAL_OPERATIONAL_INPUT_INVALID", `${label} must be a canonical owner-only directory outside the repository`);
  }
}

function readExternalInputs(operationalInputsPath, repoRoot, env) {
  let inputBytes;
  try {
    inputBytes = readOwnerOnlyProductionEvidence(operationalInputsPath, {
      repoRoot,
      maxBytes: OPERATIONAL_INPUT_MAX_BYTES,
    });
  } catch {
    fail("RF13_GOAL_OPERATIONAL_INPUT_INVALID", "operational input must be an owner-only pinned JSON file outside the repository");
  }
  const inputs = parseJson(inputBytes, "RF13_GOAL_OPERATIONAL_INPUT_INVALID", "operational input");
  exactKeys(inputs, INPUT_KEYS, "operational input");
  if (inputs.schema_version !== RF13_GOAL_OPERATIONAL_INPUT_SCHEMA) {
    fail("RF13_GOAL_OPERATIONAL_INPUT_INVALID", "operational input schema drifted");
  }
  externalOwnerOnlyDirectory(
    inputs.authenticated_session_fixture_path,
    repoRoot,
    "authenticated session fixture",
  );
  externalOwnerOnlyDirectory(inputs.exchange_root, repoRoot, "signing exchange root");
  const loaded = {};
  for (const [key, maxBytes] of Object.entries(EXTERNAL_INPUT_LIMITS)) {
    try {
      loaded[key] = readOwnerOnlyProductionEvidence(inputs[key], { repoRoot, maxBytes });
    } catch {
      fail("RF13_GOAL_OPERATIONAL_INPUT_INVALID", `${key} is not a pinned owner-only file outside the repository`);
    }
  }
  const registryPin = env[TRUST_REGISTRY_PIN_ENV];
  if (!registryPin) {
    fail(
      "RF13_GOAL_OPERATIONAL_TRUST_AUTHORITY_REQUIRED",
      `${TRUST_REGISTRY_PIN_ENV} must independently pin the external registry`,
      { blocked: true },
    );
  }
  if (!SHA256.test(registryPin) || hash(loaded.trust_registry_path) !== registryPin) {
    fail("RF13_GOAL_OPERATIONAL_TRUST_REGISTRY_INVALID", "external trust registry digest does not match its independent environment pin");
  }
  return Object.freeze({ inputs: Object.freeze({ ...inputs }), loaded: Object.freeze(loaded), registryPin });
}

function attestation(loaded, registryPin, receiptKey, signatureKey, packetKey) {
  return Object.freeze({
    registryBytes: loaded.trust_registry_path,
    receiptBytes: loaded[receiptKey],
    signatureBytes: loaded[signatureKey],
    expectedRegistrySha256: registryPin,
    ...(packetKey ? { packetBytes: loaded[packetKey] } : {}),
  });
}

async function mintColdStartCapability(repoRoot, receipt, corpus, label) {
  if (receipt?.schema_version !== COLD_START_SCHEMA || receipt.status !== "PASS"
    || receipt.artifact?.manifest?.platform !== "darwin") {
    fail("RF13_GOAL_OPERATIONAL_ARTIFACT_INVALID", `${label} must be a canonical macOS PASS cold-start receipt`);
  }
  const authority = receipt.artifact.authority;
  const rf13Bytes = readRepoPinnedBytes(repoRoot, authority?.rf13_dist_manifest_path, {
    expectedSha256: authority?.rf13_dist_manifest_sha256,
    maxBytes: 8 * 1024 * 1024,
    label: `${label} RF13-DIST manifest`,
  });
  const rf13 = parseJson(rf13Bytes, "RF13_GOAL_OPERATIONAL_ARTIFACT_INVALID", `${label} RF13-DIST manifest`);
  const privacyArtifact = rf13?.artifacts?.find(({ id }) => id === authority?.artifact_id);
  const privacyMember = rf13?.gates?.privacy?.members?.find(({ artifact_id: id }) => id === authority?.artifact_id);
  if (!privacyArtifact || privacyArtifact.sha256 !== authority.indexed_artifact_sha256
    || privacyMember?.receipt?.path !== authority.privacy_receipt_path
    || privacyMember.receipt.sha256 !== authority.privacy_receipt_sha256) {
    fail("RF13_GOAL_OPERATIONAL_ARTIFACT_INVALID", `${label} sealed archive authority drifted`);
  }
  const privacyBytes = readRepoPinnedBytes(repoRoot, authority.privacy_receipt_path, {
    expectedSha256: authority.privacy_receipt_sha256,
    maxBytes: 16 * 1024 * 1024,
    label: `${label} privacy receipt`,
  });
  const privacyReceipt = parseJson(privacyBytes, "RF13_GOAL_OPERATIONAL_ARTIFACT_INVALID", `${label} privacy receipt`);
  if (privacyReceipt.schema_version !== RF13_DIST_PRIVACY_MEMBER_SCHEMA
    || privacyReceipt.member_manifest_path !== authority.member_manifest_path
    || privacyReceipt.member_manifest_sha256 !== authority.member_manifest_sha256) {
    fail("RF13_GOAL_OPERATIONAL_ARTIFACT_INVALID", `${label} privacy receipt binding drifted`);
  }
  readRepoPinnedBytes(repoRoot, authority.member_manifest_path, {
    expectedSha256: authority.member_manifest_sha256,
    maxBytes: 128 * 1024 * 1024,
    label: `${label} member manifest`,
  });
  verifyRepoPinnedFile(repoRoot, privacyArtifact.path, {
    expectedBytes: privacyArtifact.bytes,
    expectedSha256: privacyArtifact.sha256,
    maxBytes: 4 * 1024 * 1024 * 1024,
    label: `${label} sealed archive`,
  });
  const archivePath = path.resolve(repoRoot, ...privacyArtifact.path.split("/"));
  let privacyValidation;
  try {
    privacyValidation = await validateDesktopArtifactPrivacyEvidence({
      receipt: privacyReceipt,
      artifact: privacyArtifact,
      artifactPath: archivePath,
      artifactRoot: rf13.release.artifact_root,
      expectedRootName: "matter.app",
      buildManifest: receipt.artifact.manifest,
      corpus,
      repoRoot,
      displayBase: repoRoot,
    });
  } catch {
    fail("RF13_GOAL_OPERATIONAL_ARTIFACT_INVALID", `${label} failed live private-data archive reinspection`);
  }
  let validated;
  try {
    validated = await validateFormalPackagedArtifactAuthoritatively({
      artifactManifest: receipt.artifact.manifest,
      artifactManifestPath: receipt.artifact.manifest_path,
      artifactPath: receipt.artifact.path,
      rendererPath: receipt.renderer.path,
      expectedSourceSha: receipt.source.source_sha,
      sourceState: {
        source_sha: receipt.source.source_sha,
        source_tree: receipt.source.source_tree,
        source_dirty: false,
      },
      hostPlatform: "darwin",
      requireHostPlatform: true,
      authority,
      repoRoot,
      privacyValidation,
      privacyArtifact,
    });
  } catch {
    fail("RF13_GOAL_OPERATIONAL_ARTIFACT_INVALID", `${label} failed live formal artifact validation`);
  }
  return validated.authority_validation;
}

function resolveFormalReference(reference, repoRoot, evidenceRoot, label) {
  if (!reference || !["repository", "evidence"].includes(reference.scope)
    || typeof reference.path !== "string" || path.isAbsolute(reference.path)
    || reference.path.includes("\\") || reference.path.split("/").some((part) => !part || part === "." || part === "..")) {
    fail("RF13_GOAL_OPERATIONAL_PACKAGE_INVALID", `${label} reference is invalid`);
  }
  const root = reference.scope === "repository" ? repoRoot : evidenceRoot;
  const target = path.resolve(root, ...reference.path.split("/"));
  if (!within(root, target)) fail("RF13_GOAL_OPERATIONAL_PACKAGE_INVALID", `${label} escaped its fixed evidence root`);
  return target;
}

function packagePrivacyRootRelative(receipt, repoRoot, evidenceRoot) {
  const roots = new Set(receipt.bindings.artifact_privacy.receipts.map((reference) => {
    const absolute = resolveFormalReference(reference, repoRoot, evidenceRoot, "package privacy sidecar");
    return path.dirname(path.dirname(absolute));
  }));
  if (roots.size !== 1) fail("RF13_GOAL_OPERATIONAL_PACKAGE_INVALID", "package privacy sidecars do not share one exact artifact root");
  const absolute = [...roots][0];
  if (!within(repoRoot, absolute)) fail("RF13_GOAL_OPERATIONAL_PACKAGE_INVALID", "package privacy artifact root escaped the repository");
  return path.relative(repoRoot, absolute).split(path.sep).join("/");
}

async function attachReadOnlyDmg(dmgPath, action) {
  if (process.platform !== "darwin") {
    fail("RF13_GOAL_OPERATIONAL_NATIVE_HOST_UNAVAILABLE", "macOS is required for canonical RF13 package authority", { blocked: true });
  }
  const mountRoot = mkdtempSync(path.join(tmpdir(), "matter-rf13-goal-dmg-"));
  let attached = false;
  let detachFailed = false;
  let result;
  let failure;
  try {
    execFileSync("/usr/bin/hdiutil", [
      "attach", "-readonly", "-nobrowse", "-noautoopen", "-mountpoint", mountRoot, dmgPath,
    ], { stdio: ["ignore", "ignore", "ignore"] });
    attached = true;
    const appNames = readdirSync(mountRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.endsWith(".app"))
      .map(({ name }) => name);
    if (appNames.length !== 1) throw new Error("DMG must contain exactly one app bundle");
    const appBundle = path.join(mountRoot, appNames[0]);
    const executable = path.join(appBundle, "Contents/MacOS/matter");
    if (lstatSync(appBundle).isSymbolicLink() || !statSync(appBundle).isDirectory()
      || lstatSync(executable).isSymbolicLink() || !statSync(executable).isFile()) {
      throw new Error("mounted executable is unsafe");
    }
    result = await action({ appBundle, executable });
  } catch (error) {
    failure = error;
  } finally {
    if (attached) {
      try {
        execFileSync("/usr/bin/hdiutil", ["detach", mountRoot], { stdio: ["ignore", "ignore", "ignore"] });
      } catch {
        detachFailed = true;
      }
    }
    rmSync(mountRoot, { recursive: true, force: true });
  }
  if (detachFailed) {
    fail("RF13_GOAL_OPERATIONAL_NATIVE_ARTIFACT_UNAVAILABLE", "canonical read-only DMG inspection could not complete and clean up", { blocked: true });
  }
  if (failure instanceof MatterRf13GoalOperationalAuthorityError) throw failure;
  if (failure && attached) {
    fail("RF13_GOAL_OPERATIONAL_PACKAGE_INVALID", "mounted package evidence failed canonical live validation");
  }
  if (failure) {
    fail("RF13_GOAL_OPERATIONAL_NATIVE_ARTIFACT_UNAVAILABLE", "canonical read-only DMG inspection is unavailable", { blocked: true });
  }
  return result;
}

async function mintPackageCapability({ repoRoot, launcherCapability, rfd039, corpus }) {
  const observation = rfd039.observations;
  const receiptContent = readOperationalContent(
    repoRoot,
    observation.package_qa_receipt,
    FORMAL_PACKAGE_LOOPBACK_QA_SCHEMA,
    "RFD039 package QA receipt",
  );
  const receipt = receiptContent.value;
  if (receipt.platform !== "macos") {
    fail("RF13_GOAL_OPERATIONAL_PACKAGE_INVALID", "RFD039 package authority must use the macOS formal receipt");
  }
  const transcriptReference = receipt.bindings?.runner_transcript;
  const observedTranscript = observation.package_qa_transcript;
  if (!transcriptReference
    || transcriptReference.path !== observedTranscript?.path
    || transcriptReference.sha256 !== observedTranscript.sha256
    || transcriptReference.bytes !== observedTranscript.bytes) {
    fail("RF13_GOAL_OPERATIONAL_PACKAGE_INVALID", "package receipt and RF13 transcript reference are swapped");
  }
  readOperationalContent(
    repoRoot,
    observedTranscript,
    FORMAL_PACKAGE_LOOPBACK_TRANSCRIPT_SCHEMA,
    "RFD039 package QA transcript",
  );
  const receiptPath = path.resolve(repoRoot, ...observation.package_qa_receipt.path.split("/"));
  const evidenceRoot = path.dirname(receiptPath);
  const privacyArtifactRoot = packagePrivacyRootRelative(receipt, repoRoot, evidenceRoot);
  const dmgReference = receipt.package?.artifacts?.find(({ role }) => role === "dmg");
  const dmgPath = resolveFormalReference(dmgReference, repoRoot, evidenceRoot, "macOS DMG");
  verifyPinnedAbsoluteFile(dmgReference.scope === "repository" ? repoRoot : evidenceRoot, dmgPath, {
    expectedBytes: dmgReference.bytes,
    expectedSha256: dmgReference.sha256,
    label: "macOS DMG",
  });
  const privacyCorpusSha256 = desktopArtifactPrivacyCorpusSha256(corpus);
  return attachReadOnlyDmg(dmgPath, async ({ appBundle, executable }) => {
    const privacyValidations = await readFormalPackageLoopbackLivePrivacyValidations(receiptPath, {
      launcherCapability,
      repositoryRoot: repoRoot,
      evidenceRoot,
      expectedPlatform: "macos",
      expectedPrivacyArtifactRoot: privacyArtifactRoot,
      corpus,
      executedRootPath: appBundle,
    });
    return readFormalPackageLoopbackNativeQaReceipt(receiptPath, {
      launcherCapability,
      repositoryRoot: repoRoot,
      evidenceRoot,
      executedPackagePath: executable,
      expectedPlatform: "macos",
      expectedSourceSha: rfd039.source.sha,
      expectedSourceTree: rfd039.source.tree,
      expectedArtifactSha256: receipt.bindings.package_artifact.sha256,
      expectedExecutedPackageSha256: receipt.bindings.executed_package.sha256,
      expectedManifestSha256: receipt.bindings.package_manifest.sha256,
      expectedPrivacyArtifactRoot: privacyArtifactRoot,
      expectedPrivacyCorpusSha256: privacyCorpusSha256,
      privacyValidations,
    });
  });
}

export function validateMatterRf13GoalLauncherCapability(launcherCapability) {
  try {
    return validateFormalPackageLoopbackNativeLauncherCapability(launcherCapability, {
      platform: "macos",
      runnerPath: INTERNAL_RUNNER_PATH,
      roles: ["rf13_goal_validator"],
    });
  } catch {
    fail(
      "RF13_GOAL_OPERATIONAL_LAUNCHER_REQUIRED",
      "full RF13 operational validation requires the canonical macOS wrapper",
      { blocked: true },
    );
  }
}

export async function prepareMatterRf13GoalOperationalAuthority({
  manifest,
  operationalInputsPath,
  launcherCapability,
} = {}) {
  validateMatterRf13GoalLauncherCapability(launcherCapability);
  const root = canonicalRepoRoot(MODULE_REPO_ROOT);
  const sourceBefore = exactCleanSource(root);
  const external = readExternalInputs(operationalInputsPath, root, process.env);
  const receipts = Object.freeze(Object.fromEntries([
    "RFD-TUW-038", "RFD-TUW-039", "RFD-TUW-040", "RFD-TUW-041", "RFD-TUW-042",
  ].map((unitId) => [unitId.toLowerCase().replaceAll("-", ""), unitEvidenceReceipt(root, manifest, unitId)])));
  const normalizedReceipts = Object.freeze({
    rfd038: receipts.rfdtuw038,
    rfd039: receipts.rfdtuw039,
    rfd040: receipts.rfdtuw040,
    rfd041: receipts.rfdtuw041,
    rfd042: receipts.rfdtuw042,
  });
  validateLineage(root, manifest, normalizedReceipts, sourceBefore);

  let corpus;
  try {
    corpus = await buildDesktopArtifactPrivacyCorpus({ repoRoot: root, env: process.env });
  } catch {
    fail(
      "RF13_GOAL_OPERATIONAL_PRIVACY_AUTHORITY_REQUIRED",
      "the canonical private-data corpus is unavailable for live artifact reinspection",
      { blocked: true },
    );
  }
  const baselineCold = readOperationalContent(
    root,
    normalizedReceipts.rfd038.observations.cold_start_receipt,
    COLD_START_SCHEMA,
    "RFD038 cold-start receipt",
  ).value;
  const candidateCold = readOperationalContent(
    root,
    normalizedReceipts.rfd040.observations.candidate_cold_start_receipt,
    COLD_START_SCHEMA,
    "RFD040 cold-start receipt",
  ).value;
  const baselineCapability = await mintColdStartCapability(root, baselineCold, corpus, "RFD038 baseline");
  const candidateCapability = await mintColdStartCapability(root, candidateCold, corpus, "RFD040 candidate");
  const packageCapability = await mintPackageCapability({
    repoRoot: root,
    launcherCapability,
    rfd039: normalizedReceipts.rfd039,
    corpus,
  });

  const { loaded, registryPin } = external;
  let authorities = Object.freeze({
    "RFD-TUW-038": Object.freeze({ coldStart: baselineCapability }),
    "RFD-TUW-039": Object.freeze({ packageQa: packageCapability }),
    "RFD-TUW-040": Object.freeze({
      coldStart: candidateCapability,
      packageQa: packageCapability,
      webFullAttestation: attestation(
        loaded,
        registryPin,
        "web_full_attestation_receipt_path",
        "web_full_attestation_signature_path",
      ),
    }),
    "RFD-TUW-041": Object.freeze({
      measurementAttestation: attestation(
        loaded,
        registryPin,
        "profile_measurement_attestation_receipt_path",
        "profile_measurement_attestation_signature_path",
        "profile_measurement_attestation_packet_path",
      ),
      operationAttestation: attestation(
        loaded,
        registryPin,
        "profile_operation_attestation_receipt_path",
        "profile_operation_attestation_signature_path",
      ),
    }),
    "RFD-TUW-042": Object.freeze({
      decisionAttestation: attestation(
        loaded,
        registryPin,
        "profile_decision_attestation_receipt_path",
        "profile_decision_attestation_signature_path",
      ),
    }),
  });
  const completionAttestation = attestation(
    loaded,
    registryPin,
    "completion_attestation_receipt_path",
    "completion_attestation_signature_path",
  );
  const sourceAfter = exactCleanSource(root);
  if (sourceAfter.sha !== sourceBefore.sha || sourceAfter.tree !== sourceBefore.tree) {
    fail("RF13_GOAL_OPERATIONAL_SOURCE_DRIFT", "Git source changed while operational capabilities were prepared");
  }
  let consumed = false;
  return Object.freeze({
    takeAuthorities() {
      if (consumed || !authorities) {
        fail("RF13_GOAL_OPERATIONAL_AUTHORITY_REPLAY", "prepared operational authority is one-time only");
      }
      consumed = true;
      return authorities;
    },
    completionAttestation,
    dispose() {
      authorities = null;
    },
  });
}

export function isMatterRf13GoalOperationalBlocked(error) {
  return error instanceof MatterRf13GoalOperationalAuthorityError && error.blocked === true;
}
