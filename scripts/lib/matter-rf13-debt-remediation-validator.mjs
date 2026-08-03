import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstat, readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

import {
  RFD_STATUSES,
  RFD_TUW_CONTRACTS,
  RFD_TUW_IDS,
  RFD039_CHANGED_PATH_ALLOWLIST,
  RF13_EVIDENCE_ROOT,
  RF13_EVIDENCE_SCHEMA,
  RF13_GOAL_ID,
  RF13_PLAN_PATH,
  RF13_PROGRESS_SCHEMA,
  RF13_RFD010_RECEIPT_PATH,
  calculateRfdPerformanceImprovementPercent,
  deriveRf13Gates,
  expectedEvidenceKind,
} from "./matter-rf13-debt-remediation-contract.mjs";
import {
  buildRf13CompletionPacket,
  hashRf13CompletionPacket,
  serializeRf13CompletionPacket,
  validateRf13CompletionAttestation,
} from "./matter-rf13-debt-remediation-attestation.mjs";
import {
  Rf13OperationalEvidenceError,
  validateColdStartProducerEvidence,
  validateFormalPackageNavigationEvidence,
  validateProfileDecisionEvidence,
  validateProfileMeasurementProducerEvidence,
  validateProfileOperationEvidence,
  validateWebFullProducerEvidence,
} from "./matter-rf13-operational-evidence.mjs";
import { readApprovedSourceBytes } from "./json-postgres-program-files.mjs";
import { validateRfd010PersistedReceiptFile } from "./rfd010-release-candidate.mjs";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const SAFE_ID = /^[a-z0-9][a-z0-9_-]*$/u;
const SAFE_PATH = /^[A-Za-z0-9._/-]+$/u;
const AUTHORITY_BLOCKABLE = new Set([
  "RFD-TUW-003", "RFD-TUW-010", "RFD-TUW-011", "RFD-TUW-012", "RFD-TUW-013",
  "RFD-TUW-015", "RFD-TUW-017", "RFD-TUW-018", "RFD-TUW-041", "RFD-TUW-042",
]);
const FIXED_KEYS = new Set([
  "schema_version", "goal_id", "plan", "path", "sha256", "source", "head_sha",
  "tree_sha", "source_manifest_sha256", "working_tree_sha256", "source_dirty",
  "units", "id", "dependencies", "status",
  "evidence", "kind", "scope", "bytes", "source_sha", "source_fingerprint_sha256",
  "source_tree", "manifest_sha256",
  "test_counts", "total", "passed", "failed", "skipped", "tuw_id", "evidence_kind",
  "fingerprint_sha256", "dirty", "producer", "producers", "implementation_dependencies",
  "tree", "scenario", "runner", "exit_code",
  "observations",
]);
const OBSERVATION_KEYS = new Set(
  Object.values(RFD_TUW_CONTRACTS).flatMap((contract) => Object.keys(contract.observations)),
);
const SECRET_KEY = /(?:^|[_-])(?:secret|token|password|credential(?:s)?|private[_-]?key|api[_-]?key|access[_-]?key|auth(?:entication|orization)?)(?:$|[_-])/iu;
const FORBIDDEN_VALUES = Object.freeze([
  /-----BEGIN [^\n-]*PRIVATE KEY-----/iu,
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/u,
  /\b(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}\b/u,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/u,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/u,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu,
  /(?<![A-Za-z0-9])(?:\+?82[- ]?)?0\d{1,2}[- ]?\d{3,4}[- ]?\d{4}(?![A-Za-z0-9])/u,
  /https?:\/\/[^/\s:@]+:[^@\s]+@/iu,
  /\b[A-Za-z0-9+/]{200,}={0,2}\b/u,
]);
const ABSOLUTE_PRIVATE_PATH = /^(?:\/Users\/|[A-Za-z]:\\)/u;

const TOP_LEVEL_KEYS = Object.freeze(["schema_version", "goal_id", "plan", "source", "units"]);
const PLAN_KEYS = Object.freeze(["path", "sha256"]);
const SOURCE_KEYS = Object.freeze([
  "head_sha", "tree_sha", "source_manifest_sha256", "working_tree_sha256", "source_dirty",
]);
const UNIT_KEYS = Object.freeze(["id", "dependencies", "status", "evidence"]);
const REF_KEYS = Object.freeze([
  "id", "kind", "scope", "path", "sha256", "bytes", "source_sha",
  "source_tree", "source_manifest_sha256", "source_fingerprint_sha256", "test_counts",
]);
const COUNT_KEYS = Object.freeze(["total", "passed", "failed", "skipped"]);
const EVIDENCE_SOURCE_KEYS = Object.freeze(["sha", "tree", "manifest_sha256", "fingerprint_sha256", "dirty"]);
const CONTENT_REFERENCE_KEYS = Object.freeze(["path", "sha256", "bytes"]);
const LINKED_RECEIPT_KEYS = Object.freeze(["tuw_id", ...CONTENT_REFERENCE_KEYS]);
const PREPARED_GOAL_VALIDATION_SESSIONS = new WeakMap();
const CONSUMED_COMPLETION_ATTESTATIONS = new Set();

export class Rf13ProgressValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "Rf13ProgressValidationError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details = {}) {
  throw new Rf13ProgressValidationError(code, message, details);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function gitBlobSha1(value) {
  return createHash("sha1").update(`blob ${value.length}\0`).update(value).digest("hex");
}

function assertExactKeys(value, expected, field) {
  if (!isRecord(value)) fail("INVALID_SHAPE", "a required object has an invalid shape", { field });
  const keys = Object.keys(value);
  const expectedSet = new Set(expected);
  const missing = expected.filter((key) => !Object.hasOwn(value, key));
  const unknownCount = keys.filter((key) => !expectedSet.has(key)).length;
  if (missing.length) fail("MISSING_KEY", "required fields are missing", { field, count: missing.length });
  if (unknownCount) fail("UNKNOWN_KEY", "unknown fields are not permitted", { field, count: unknownCount });
}

function scanForForbiddenMaterial(value, { allowAbsolutePaths = false } = {}, seen = new WeakSet()) {
  if (typeof value === "string") {
    if (
      FORBIDDEN_VALUES.some((pattern) => pattern.test(value))
      || (!allowAbsolutePaths && ABSOLUTE_PRIVATE_PATH.test(value))
    ) {
      fail("PRIVATE_OR_SECRET_MATERIAL", "private or secret-like values are not permitted", { count: 1 });
    }
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (seen.has(value)) fail("INVALID_SHAPE", "cyclic data is not permitted");
  seen.add(value);
  if (Array.isArray(value)) {
    for (const child of value) scanForForbiddenMaterial(child, { allowAbsolutePaths }, seen);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.replace(/([a-z0-9])([A-Z])/gu, "$1_$2").toLowerCase();
    if (SECRET_KEY.test(normalized) && !FIXED_KEYS.has(key) && !OBSERVATION_KEYS.has(key)) {
      fail("SECRET_KEY", "secret-like fields are not permitted", { count: 1 });
    }
    scanForForbiddenMaterial(child, { allowAbsolutePaths }, seen);
  }
}

function assertSha1(value, field) {
  if (typeof value !== "string" || !SHA1.test(value)) {
    fail("INVALID_SOURCE_SHA", "source SHA must be a lowercase 40-character commit hash", { field });
  }
}

function assertSha256(value, field) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    fail("INVALID_SHA256", "SHA-256 must be a lowercase 64-character digest", { field });
  }
}

function assertSafePath(value, field, requiredPrefix) {
  if (
    typeof value !== "string"
    || value.length === 0
    || isAbsolute(value)
    || value.includes("\\")
    || !SAFE_PATH.test(value)
    || value.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
    || (requiredPrefix && !value.startsWith(`${requiredPrefix}/`))
  ) {
    fail("UNSAFE_PATH", "only normalized repository-relative evidence paths are permitted", { field });
  }
}

function validateTestCounts(counts, field = "test_counts") {
  assertExactKeys(counts, COUNT_KEYS, field);
  for (const key of COUNT_KEYS) {
    if (!Number.isSafeInteger(counts[key]) || counts[key] < 0) {
      fail("INVALID_TEST_COUNTS", "test counts must be non-negative safe integers", { field });
    }
  }
  if (counts.total < 1 || counts.passed < 1 || counts.failed !== 0 || counts.passed + counts.failed + counts.skipped !== counts.total) {
    fail("UNSATISFIED_TEST_COUNTS", "evidence requires at least one passing test, zero failures, and balanced counts", { field });
  }
}

function sameTestCounts(left, right) {
  return COUNT_KEYS.every((key) => left[key] === right[key]);
}

function validateReferenceShape(reference, unitId) {
  assertExactKeys(reference, REF_KEYS, "evidence_reference");
  if (typeof reference.id !== "string" || !SAFE_ID.test(reference.id) || !reference.id.startsWith(unitId.toLowerCase())) {
    fail("INVALID_EVIDENCE_ID", "evidence ids must be sanitized and bound to their TUW", { unit_id: unitId });
  }
  if (reference.kind !== expectedEvidenceKind(unitId)) {
    fail("EVIDENCE_KIND_MISMATCH", "evidence kind does not match the TUW acceptance contract", { unit_id: unitId });
  }
  if (!new Set(["RF13_DIST", "HISTORICAL_QA_ONLY"]).has(reference.scope)) {
    fail("INVALID_EVIDENCE_SCOPE", "evidence scope is outside the closed enum", { unit_id: unitId });
  }
  if (reference.scope === "HISTORICAL_QA_ONLY" && unitId !== "RFD-TUW-001") {
    fail("STALE_QA_EVIDENCE", "QA-only or internal RF13 evidence cannot satisfy RF13-DIST", { unit_id: unitId });
  }
  if (reference.scope === "RF13_DIST" && unitId === "RFD-TUW-001" && reference.kind === "baseline_capture") {
    fail("BASELINE_SCOPE_MISMATCH", "the historical baseline classification must remain QA-only", { unit_id: unitId });
  }
  if (unitId === "RFD-TUW-010") {
    assertSafePath(reference.path, "evidence_path");
    if (reference.path !== RF13_RFD010_RECEIPT_PATH) {
      fail("RFD010_RECEIPT_PATH_MISMATCH", "RFD-TUW-010 must use the canonical release-candidate receipt", { unit_id: unitId });
    }
  } else {
    assertSafePath(reference.path, "evidence_path", RF13_EVIDENCE_ROOT);
  }
  if (reference.path.endsWith("/progress-manifest.json") || /(?:^|[-_/])(?:internal|qa[-_]?only)(?:[-_.\/]|$)/iu.test(reference.path)) {
    fail("STALE_QA_EVIDENCE", "progress or stale internal artifacts cannot be acceptance evidence", { unit_id: unitId });
  }
  assertSha256(reference.sha256, "evidence_sha256");
  if (!Number.isSafeInteger(reference.bytes) || reference.bytes < 1) {
    fail("INVALID_EVIDENCE_BYTES", "evidence byte count must be a positive safe integer", { unit_id: unitId });
  }
  assertSha1(reference.source_sha, "evidence_source_sha");
  assertSha1(reference.source_tree, "evidence_source_tree");
  assertSha256(reference.source_manifest_sha256, "evidence_source_manifest");
  assertSha256(reference.source_fingerprint_sha256, "evidence_source_fingerprint");
  validateTestCounts(reference.test_counts);
}

async function readContentAddressedFile(repoRoot, metadata, category) {
  const absolute = resolve(repoRoot, metadata.path);
  try {
    return readApprovedSourceBytes(absolute, {
      approvedRoots: [repoRoot],
      expectedByteSize: metadata.bytes,
      expectedSha256: metadata.sha256,
    });
  } catch (error) {
    if (/outside every approved root|symlink|root identity/u.test(error?.message ?? "")) {
      fail("UNSAFE_EVIDENCE_FILE", "evidence must be a descriptor-pinned regular file inside the repository", { category });
    }
    if (/metadata drifted|digest drifted/u.test(error?.message ?? "")) {
      fail("EVIDENCE_HASH_DRIFT", "evidence bytes, identity, or SHA-256 do not match the manifest", { category });
    }
    fail("EVIDENCE_READ_FAILED", "content-addressed evidence could not be read", { category });
  }
}

function parseEvidenceJson(bytes, category) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("EVIDENCE_JSON_INVALID", "evidence must be a typed JSON receipt, not an arbitrary PASS string", { category });
  }
}

function validateEvidenceSourceIdentity(source, field = "evidence_source") {
  assertExactKeys(source, EVIDENCE_SOURCE_KEYS, field);
  assertSha1(source.sha, `${field}_sha`);
  assertSha1(source.tree, `${field}_tree`);
  assertSha256(source.manifest_sha256, `${field}_manifest`);
  assertSha256(source.fingerprint_sha256, `${field}_fingerprint`);
  if (typeof source.dirty !== "boolean") fail("INVALID_SOURCE_STATE", "source dirty state must be boolean", { field });
  return source;
}

function sameEvidenceSource(left, right) {
  return EVIDENCE_SOURCE_KEYS.every((key) => Object.is(left?.[key], right?.[key]));
}

function assertSameEvidenceSource(left, right, code, message, unitId) {
  if (!sameEvidenceSource(left, right)) fail(code, message, { unit_id: unitId });
}

function verifyGitSourceIdentity(repoRoot, source, code, unitId) {
  validateEvidenceSourceIdentity(source);
  if (source.dirty !== false) fail(code, "lineage evidence requires a clean source", { unit_id: unitId });
  let tree;
  let manifest;
  try {
    tree = execFileSync("git", ["rev-parse", `${source.sha}^{tree}`], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    manifest = execFileSync("git", ["ls-tree", "-r", "-z", "--full-tree", source.sha], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    fail(code, "lineage source is not a readable commit in this repository", { unit_id: unitId });
  }
  if (tree !== source.tree || sha256(manifest) !== source.manifest_sha256) {
    fail(code, "lineage source tree or manifest digest is stale", { unit_id: unitId });
  }
}

async function validateContentReference(repoRoot, value, field, suffixPattern) {
  assertExactKeys(value, CONTENT_REFERENCE_KEYS, field);
  assertSafePath(value.path, `${field}_path`);
  assertSha256(value.sha256, `${field}_sha256`);
  if (!Number.isSafeInteger(value.bytes) || value.bytes < 1) {
    fail("INVALID_EVIDENCE_BYTES", "content-addressed file byte count must be positive", { field });
  }
  if (suffixPattern && !suffixPattern.test(value.path)) {
    fail("RFD_PERFORMANCE_ARTIFACT_MISMATCH", "performance artifact path has an unexpected type", { field });
  }
  const bytes = await readContentAddressedFile(repoRoot, value, field);
  return Object.freeze({ reference: Object.freeze({ ...value }), bytes });
}

function sameHostFingerprint(left, right) {
  return left?.fingerprint_sha256 === right?.fingerprint_sha256
    && left?.platform === right?.platform
    && left?.arch === right?.arch
    && left?.os_release_major === right?.os_release_major
    && left?.cpu_count === right?.cpu_count
    && left?.memory_gib_bucket === right?.memory_gib_bucket
    && left?.sanitized === true
    && right?.sanitized === true;
}

async function validateLinkedReceipt(repoRoot, link, expectedTuwId, unitId) {
  assertExactKeys(link, LINKED_RECEIPT_KEYS, "linked_receipt");
  if (link.tuw_id !== expectedTuwId) {
    fail("RFD_LINEAGE_RECEIPT_SWAPPED", "linked receipt TUW identity is swapped", { unit_id: unitId });
  }
  assertSafePath(link.path, "linked_receipt_path", RF13_EVIDENCE_ROOT);
  assertSha256(link.sha256, "linked_receipt_sha256");
  if (!Number.isSafeInteger(link.bytes) || link.bytes < 1) {
    fail("INVALID_EVIDENCE_BYTES", "linked receipt byte count must be positive", { unit_id: unitId });
  }
  const bytes = await readContentAddressedFile(repoRoot, link, "linked_receipt");
  const receipt = parseEvidenceJson(bytes, "linked_receipt");
  scanForForbiddenMaterial(receipt);
  if (
    receipt?.schema_version !== RF13_EVIDENCE_SCHEMA
    || receipt.goal_id !== RF13_GOAL_ID
    || receipt.tuw_id !== expectedTuwId
    || receipt.evidence_kind !== expectedEvidenceKind(expectedTuwId)
    || receipt.scope !== "RF13_DIST"
  ) {
    fail("RFD_LINEAGE_RECEIPT_SWAPPED", "linked receipt content does not match its required TUW", { unit_id: unitId });
  }
  validateEvidenceSourceIdentity(receipt.source, "linked_receipt_source");
  return Object.freeze({ link: Object.freeze({ ...link }), receipt });
}

function assertLinkedReceiptEqual(left, right, code, unitId) {
  if (!LINKED_RECEIPT_KEYS.every((key) => Object.is(left?.[key], right?.[key]))) {
    fail(code, "lineage receipt does not match the accepted manifest reference", { unit_id: unitId });
  }
}

function linkForManifestReference(tuwId, reference) {
  return reference ? {
    tuw_id: tuwId,
    path: reference.path,
    sha256: reference.sha256,
    bytes: reference.bytes,
  } : null;
}

function receiptSourceFromOutcome(outcome) {
  return outcome ? {
    sha: outcome.source_sha,
    tree: outcome.source_tree,
    manifest_sha256: outcome.source_manifest_sha256,
    fingerprint_sha256: outcome.source_fingerprint_sha256,
    dirty: outcome.source_dirty,
  } : null;
}

function sameContentReference(left, right) {
  return CONTENT_REFERENCE_KEYS.every((key) => Object.is(left?.[key], right?.[key]));
}

function verifyDirectParentAndChangedPaths(repoRoot, baseline, candidate, unitId) {
  let parent;
  let changedPaths;
  try {
    parent = execFileSync("git", ["rev-parse", `${candidate.sha}^`], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    changedPaths = execFileSync("git", ["diff", "--name-only", "-z", baseline.sha, candidate.sha, "--"], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    }).toString("utf8").split("\0").filter(Boolean);
  } catch {
    fail("RFD039_PARENT_BASELINE_MISMATCH", "candidate parent and changed paths could not be verified", { unit_id: unitId });
  }
  if (parent !== baseline.sha) {
    fail("RFD039_PARENT_BASELINE_MISMATCH", "candidate must be a direct child of the measured baseline", { unit_id: unitId });
  }
  if (
    JSON.stringify(changedPaths) !== JSON.stringify(RFD039_CHANGED_PATH_ALLOWLIST)
  ) {
    fail("RFD039_CHANGED_PATHS_MISMATCH", "candidate changed paths exceed the exact experiment allowlist", { unit_id: unitId });
  }
}

function operationalAuthority(authorities, unitId, name) {
  return authorities?.[unitId]?.[name];
}

function rethrowOperational(error, fallbackCode, unitId) {
  if (error instanceof Rf13ProgressValidationError) throw error;
  const code = error instanceof Rf13OperationalEvidenceError ? error.code : fallbackCode;
  fail(code, "specialized operational evidence failed authoritative validation", { unit_id: unitId });
}

function coldStartMeasurementShape(summary) {
  return Object.freeze({
    ...summary,
    artifact: Object.freeze({
      source: summary.source,
      formal_artifact: summary.archive,
      renderer_sha256: summary.renderer_sha256,
      renderer_file_count: summary.renderer_file_count,
      build_manifest_sha256: summary.build_manifest_sha256,
    }),
  });
}

async function validateRfd038Observations(repoRoot, observations, receiptSource, authorities) {
  const unitId = "RFD-TUW-038";
  const coldStart = await validateContentReference(
    repoRoot,
    observations.cold_start_receipt,
    "rfd038_cold_start_receipt",
    /\.json$/u,
  );
  try {
    const measurement = coldStartMeasurementShape(await validateColdStartProducerEvidence({
      bytes: coldStart.bytes,
      reference: coldStart.reference,
      repoRoot,
      receiptSource,
      coldStartAuthority: operationalAuthority(authorities, unitId, "coldStart"),
      requirePass: true,
      now: operationalAuthority(authorities, unitId, "now"),
      unitId,
    }));
    return Object.freeze({ kind: "BASELINE", measurement });
  } catch (error) {
    rethrowOperational(error, "RFD038_COLD_START_RECEIPT_INVALID", unitId);
  }
}

async function validateRfd039Observations(repoRoot, observations, receiptSource, authorities) {
  const unitId = "RFD-TUW-039";
  assertExactKeys(observations.dependency_receipts, ["rfd037", "rfd038"], "rfd039_dependency_receipts");
  const [rfd037, rfd038] = await Promise.all([
    validateLinkedReceipt(repoRoot, observations.dependency_receipts.rfd037, "RFD-TUW-037", unitId),
    validateLinkedReceipt(repoRoot, observations.dependency_receipts.rfd038, "RFD-TUW-038", unitId),
  ]);
  const baseline = await validateRfd038Observations(repoRoot, rfd038.receipt.observations, rfd038.receipt.source, authorities);
  const packageReceipt = await validateContentReference(
    repoRoot,
    observations.package_qa_receipt,
    "rfd039_package_qa_receipt",
    /\.json$/u,
  );
  const packageTranscript = await validateContentReference(
    repoRoot,
    observations.package_qa_transcript,
    "rfd039_package_qa_transcript",
    /\.json$/u,
  );
  validateEvidenceSourceIdentity(observations.parent_baseline_source, "parent_baseline_source");
  verifyGitSourceIdentity(repoRoot, observations.parent_baseline_source, "RFD039_PARENT_BASELINE_MISMATCH", unitId);
  assertSameEvidenceSource(
    rfd037.receipt.source,
    receiptSource,
    "RFD039_DEPENDENCY_SOURCE_MISMATCH",
    "RFD-TUW-037 receipt is not bound to the candidate source",
    unitId,
  );
  assertSameEvidenceSource(
    observations.parent_baseline_source,
    baseline.measurement.source,
    "RFD039_PARENT_BASELINE_MISMATCH",
    "candidate parent does not match the accepted RFD-TUW-038 baseline",
    unitId,
  );
  if (
    !Array.isArray(observations.changed_paths)
    || JSON.stringify(observations.changed_paths) !== JSON.stringify(RFD039_CHANGED_PATH_ALLOWLIST)
  ) {
    fail("RFD039_CHANGED_PATHS_MISMATCH", "receipt changed paths do not equal the exact experiment allowlist", { unit_id: unitId });
  }
  verifyDirectParentAndChangedPaths(repoRoot, observations.parent_baseline_source, receiptSource, unitId);
  try {
    const packageQa = validateFormalPackageNavigationEvidence({
      receiptBytes: packageReceipt.bytes,
      receiptReference: packageReceipt.reference,
      transcriptBytes: packageTranscript.bytes,
      transcriptReference: packageTranscript.reference,
      receiptSource,
      authorityCapability: operationalAuthority(authorities, unitId, "packageQa"),
    });
    const candidateArtifact = Object.freeze({
      source: Object.freeze({ ...receiptSource }),
      formal_artifact: packageQa.primary_artifact,
      renderer_sha256: packageQa.renderer_sha256,
      renderer_file_count: packageQa.renderer_file_count,
      build_manifest_sha256: packageQa.build_manifest_sha256,
    });
    return Object.freeze({
      kind: "CANDIDATE",
      dependency_receipts: Object.freeze({
        rfd037: rfd037.link,
        rfd038: rfd038.link,
      }),
      baseline: baseline.measurement,
      parent_baseline_source: Object.freeze({ ...observations.parent_baseline_source }),
      candidate_artifact: candidateArtifact,
      package_qa: packageQa,
    });
  } catch (error) {
    rethrowOperational(error, "RFD039_PACKAGE_QA_RECEIPT_INVALID", unitId);
  }
}

function packageContainsArchive(packageQa, archive) {
  return packageQa.package_artifacts.some((artifact) => (
    artifact.sha256 === archive.sha256
    && artifact.bytes === archive.bytes
    && (artifact.scope !== "repository" || artifact.path === archive.path)
  ));
}

async function validateRfd040Observations(repoRoot, observations, receiptSource, authorities) {
  const unitId = "RFD-TUW-040";
  assertExactKeys(observations.lineage_receipts, ["baseline", "candidate"], "rfd040_lineage_receipts");
  const [baselineReceipt, candidateReceipt] = await Promise.all([
    validateLinkedReceipt(repoRoot, observations.lineage_receipts.baseline, "RFD-TUW-038", unitId),
    validateLinkedReceipt(repoRoot, observations.lineage_receipts.candidate, "RFD-TUW-039", unitId),
  ]);
  const baseline = await validateRfd038Observations(
    repoRoot,
    baselineReceipt.receipt.observations,
    baselineReceipt.receipt.source,
    authorities,
  );
  const candidate = await validateRfd039Observations(
    repoRoot,
    candidateReceipt.receipt.observations,
    candidateReceipt.receipt.source,
    authorities,
  );
  assertLinkedReceiptEqual(
    observations.lineage_receipts.baseline,
    candidate.dependency_receipts.rfd038,
    "RFD040_BASELINE_RECEIPT_MISMATCH",
    unitId,
  );
  if (!sameContentReference(observations.package_qa_receipt, candidate.package_qa.receipt_reference)
    || !sameContentReference(observations.package_qa_transcript, candidate.package_qa.transcript_reference)) {
    fail("RFD040_PACKAGE_QA_RECEIPT_MISMATCH", "RFD040 must reuse the accepted candidate package QA receipt and transcript", { unit_id: unitId });
  }
  const candidateColdStart = await validateContentReference(
    repoRoot,
    observations.candidate_cold_start_receipt,
    "rfd040_candidate_cold_start_receipt",
    /\.json$/u,
  );
  let candidateMeasurement;
  try {
    candidateMeasurement = coldStartMeasurementShape(await validateColdStartProducerEvidence({
      bytes: candidateColdStart.bytes,
      reference: candidateColdStart.reference,
      repoRoot,
      receiptSource: candidateReceipt.receipt.source,
      coldStartAuthority: operationalAuthority(authorities, unitId, "coldStart"),
      requirePass: false,
      now: operationalAuthority(authorities, unitId, "now"),
      unitId,
    }));
  } catch (error) {
    rethrowOperational(error, "RFD040_COLD_START_RECEIPT_INVALID", unitId);
  }
  if (!packageContainsArchive(candidate.package_qa, candidateMeasurement.archive)
    || candidateMeasurement.renderer_sha256 !== candidate.package_qa.renderer_sha256
    || candidateMeasurement.renderer_file_count !== candidate.package_qa.renderer_file_count
    || candidateMeasurement.build_manifest_sha256 !== candidate.package_qa.build_manifest_sha256) {
    fail("RFD040_CANDIDATE_ARTIFACT_MISMATCH", "candidate cold-start receipt is not the accepted packaged QA artifact", { unit_id: unitId });
  }
  if (
    !sameHostFingerprint(baseline.measurement.host, candidateMeasurement.host)
    || baseline.measurement.method !== candidateMeasurement.method
  ) {
    fail("RFD040_HOST_METHOD_MISMATCH", "baseline and candidate must use the same sanitized host and percentile method", { unit_id: unitId });
  }
  const medianImprovement = calculateRfdPerformanceImprovementPercent(
    baseline.measurement.median_ms,
    candidateMeasurement.median_ms,
  );
  const p95Improvement = calculateRfdPerformanceImprovementPercent(
    baseline.measurement.p95_ms,
    candidateMeasurement.p95_ms,
  );
  const improvement = Math.max(medianImprovement, p95Improvement);
  const qualifying = candidateMeasurement.errors === 0
    && (medianImprovement >= 10 || p95Improvement >= 10);
  if (
    (qualifying && observations.decision !== "ADOPTED_MEASURED_GAIN")
    || (!qualifying && observations.decision !== "REVERTED_NO_GAIN")
  ) {
    fail("MEASUREMENT_DECISION_MISMATCH", "adopt/revert decision does not match recomputed gain and errors", { unit_id: unitId });
  }
  const webFull = await validateContentReference(
    repoRoot,
    observations.web_full_receipt,
    "rfd040_web_full_receipt",
    /\.json$/u,
  );
  try {
    await validateWebFullProducerEvidence({
      bytes: webFull.bytes,
      reference: webFull.reference,
      receiptSource: candidateReceipt.receipt.source,
      attestation: operationalAuthority(authorities, unitId, "webFullAttestation"),
    });
  } catch (error) {
    rethrowOperational(error, "RFD040_WEB_FULL_RECEIPT_INVALID", unitId);
  }
  assertExactKeys(observations.final_state, ["source", "formal_artifact"], "rfd040_final_state");
  verifyGitSourceIdentity(repoRoot, observations.final_state.source, "RFD040_FINAL_SOURCE_MISMATCH", unitId);
  const finalArtifact = (await validateContentReference(
    repoRoot,
    observations.final_state.formal_artifact,
    "rfd040_final_artifact",
    /\.(?:dmg|exe|zip)$/u,
  )).reference;
  assertSameEvidenceSource(
    observations.final_state.source,
    receiptSource,
    "RFD040_FINAL_SOURCE_MISMATCH",
    "final source does not match the RFD-TUW-040 acceptance receipt",
    unitId,
  );
  const expectedSource = qualifying ? candidateMeasurement.source : baseline.measurement.source;
  const expectedArtifact = qualifying
    ? candidateMeasurement.archive
    : baseline.measurement.archive;
  if (!sameEvidenceSource(observations.final_state.source, expectedSource)
    || !sameContentReference(finalArtifact, expectedArtifact)) {
    fail(
      qualifying ? "RFD040_FALSE_ADOPTION" : "RFD040_FALSE_REVERT",
      "final source and artifact do not match the selected decision branch",
      { unit_id: unitId },
    );
  }
  return Object.freeze({
    kind: "DECISION",
    lineage_receipts: Object.freeze({
      baseline: baselineReceipt.link,
      candidate: candidateReceipt.link,
    }),
    baseline: baseline.measurement,
    candidate: candidateMeasurement,
    decision: observations.decision,
    improvement_percent: improvement,
    median_improvement_percent: medianImprovement,
    p95_improvement_percent: p95Improvement,
    final_source: Object.freeze({ ...observations.final_state.source }),
  });
}

async function validateRfd041Observations(repoRoot, observations, receiptSource, authorities) {
  const unitId = "RFD-TUW-041";
  const measurement = await validateContentReference(
    repoRoot,
    observations.measurement_receipt,
    "rfd041_measurement_receipt",
    /\.json$/u,
  );
  const unitAuthority = authorities?.[unitId];
  let measurementPolicy;
  try {
    measurementPolicy = validateProfileMeasurementProducerEvidence({
      bytes: measurement.bytes,
      reference: measurement.reference,
      receiptSource,
      attestation: unitAuthority?.measurementAttestation,
    });
  } catch (error) {
    rethrowOperational(error, "RFD041_PROFILE_MEASUREMENT_INVALID", unitId);
  }
  const operation = await validateContentReference(
    repoRoot,
    observations.profile_operation_receipt,
    "rfd041_profile_operation_receipt",
    /\.json$/u,
  );
  try {
    const profileOperation = await validateProfileOperationEvidence({
      bytes: operation.bytes,
      reference: operation.reference,
      measurementReference: measurement.reference,
      acceptedMeasurement: measurementPolicy,
      repoRoot,
      priorPromoteExecutionAuthority: unitAuthority?.priorPromoteExecutionAuthority,
      receiptSource,
      attestation: unitAuthority?.operationAttestation,
    });
    return Object.freeze({ kind: "PROFILE_OPERATION", measurement_reference: measurement.reference, measurement_policy: measurementPolicy, profile_operation: profileOperation });
  } catch (error) {
    rethrowOperational(error, "RFD041_PROFILE_OPERATION_RECEIPT_INVALID", unitId);
  }
}

async function validateRfd042Observations(repoRoot, observations, receiptSource, authorities) {
  const unitId = "RFD-TUW-042";
  const linked = await validateLinkedReceipt(repoRoot, observations.rfd041_receipt, "RFD-TUW-041", unitId);
  assertSameEvidenceSource(
    linked.receipt.source,
    receiptSource,
    "RFD042_RFD041_SOURCE_MISMATCH",
    "RFD-TUW-042 and its accepted RFD-TUW-041 operation must share the same source seal",
    unitId,
  );
  const rfd041 = await validateRfd041Observations(repoRoot, linked.receipt.observations, linked.receipt.source, authorities);
  const decision = await validateContentReference(
    repoRoot,
    observations.decision_receipt,
    "rfd042_decision_receipt",
    /\.json$/u,
  );
  const unitAuthority = authorities?.[unitId];
  try {
    const profileDecision = await validateProfileDecisionEvidence({
      bytes: decision.bytes,
      reference: decision.reference,
      measurementReference: rfd041.measurement_reference,
      repoRoot,
      acceptedMeasurement: rfd041.measurement_policy,
      acceptedOperation: rfd041.profile_operation,
      attestation: unitAuthority?.decisionAttestation,
    });
    return Object.freeze({ kind: "PROFILE_DECISION", rfd041_receipt: linked.link, profile_decision: profileDecision });
  } catch (error) {
    rethrowOperational(error, "RFD042_PROFILE_DECISION_RECEIPT_INVALID", unitId);
  }
}

async function validateRfdSpecializedObservations(repoRoot, unitId, observations, receiptSource, authorities) {
  if (unitId === "RFD-TUW-038") return validateRfd038Observations(repoRoot, observations, receiptSource, authorities);
  if (unitId === "RFD-TUW-039") return validateRfd039Observations(repoRoot, observations, receiptSource, authorities);
  if (unitId === "RFD-TUW-040") return validateRfd040Observations(repoRoot, observations, receiptSource, authorities);
  if (unitId === "RFD-TUW-041") return validateRfd041Observations(repoRoot, observations, receiptSource, authorities);
  if (unitId === "RFD-TUW-042") return validateRfd042Observations(repoRoot, observations, receiptSource, authorities);
  return undefined;
}

function validateObservationValue(value, rule) {
  if (isRecord(rule) && Object.hasOwn(rule, "specialized")) return;
  if (isRecord(rule) && Object.hasOwn(rule, "one_of")) {
    const valid = rule.one_of.some((candidate) => {
      try {
        validateObservationValue(value, candidate);
        return true;
      } catch (error) {
        if (error instanceof Rf13ProgressValidationError) return false;
        throw error;
      }
    });
    if (!valid) fail("OBSERVABLE_MISMATCH", "an observable is outside its closed acceptance enum");
    return;
  }
  if (isRecord(rule) && Object.hasOwn(rule, "number")) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < rule.number[0] || value > rule.number[1]) {
      fail("OBSERVABLE_MISMATCH", "a measured observable is outside its accepted range");
    }
    return;
  }
  if (!Object.is(value, rule)) fail("OBSERVABLE_MISMATCH", "an observable does not meet its binary acceptance condition");
}

async function validateBoundFileSet(repoRoot, files, expectedPaths, unitId, {
  field, mismatchCode, untrustedCode,
}) {
  if (!Array.isArray(files)) {
    fail(mismatchCode, `receipt ${field}s must be an ordered array`, { unit_id: unitId });
  }
  const paths = files.map((file) => file?.path);
  if (JSON.stringify(paths) !== JSON.stringify(expectedPaths)) {
    fail(mismatchCode, `receipt ${field} set does not match the TUW contract`, { unit_id: unitId });
  }
  const validated = [];
  for (const file of files) {
    assertExactKeys(file, ["path", "sha256"], field);
    assertSafePath(file.path, `${field}_path`);
    assertSha256(file.sha256, `${field}_sha256`);
    const bytes = await readContentAddressedFile(repoRoot, {
      path: file.path,
      sha256: file.sha256,
      bytes: (await lstat(resolve(repoRoot, file.path)).catch(() => ({ size: -1 }))).size,
    }, field);
    if (!bytes.length) fail(untrustedCode, `receipt ${field} cannot be empty`, { unit_id: unitId });
    validated.push(Object.freeze({
      path: file.path,
      sha256: file.sha256,
      git_blob_sha1: gitBlobSha1(bytes),
    }));
  }
  return Object.freeze(validated);
}

async function validateProducerSet(repoRoot, producers, contract, unitId) {
  return validateBoundFileSet(repoRoot, producers, contract.producer_paths, unitId, {
    field: "producer",
    mismatchCode: "PRODUCER_SET_MISMATCH",
    untrustedCode: "UNTRUSTED_PRODUCER",
  });
}

async function validateImplementationDependencySet(repoRoot, dependencies, contract, unitId) {
  return validateBoundFileSet(
    repoRoot,
    dependencies,
    contract.implementation_dependency_paths,
    unitId,
    {
      field: "implementation_dependency",
      mismatchCode: "IMPLEMENTATION_DEPENDENCY_SET_MISMATCH",
      untrustedCode: "UNTRUSTED_IMPLEMENTATION_DEPENDENCY",
    },
  );
}

async function readContractProducerSet(repoRoot, contract, unitId) {
  const producers = [];
  for (const path of contract.producer_paths) {
    assertSafePath(path, "producer_path");
    let bytes;
    try {
      bytes = await readFile(resolve(repoRoot, path));
    } catch {
      fail("UNTRUSTED_PRODUCER", "canonical producer source could not be read", { unit_id: unitId });
    }
    if (!bytes.length) fail("UNTRUSTED_PRODUCER", "canonical producer source cannot be empty", { unit_id: unitId });
    producers.push(Object.freeze({ path, sha256: sha256(bytes), git_blob_sha1: gitBlobSha1(bytes) }));
  }
  return Object.freeze(producers);
}

async function validateBaselineReceipt(repoRoot, reference, bytes, planSha256) {
  const receipt = parseEvidenceJson(bytes, "baseline");
  scanForForbiddenMaterial(receipt, { allowAbsolutePaths: true });
  if (receipt?.schema_version !== "law-firm-os.rf13-debt-remediation-baseline.v2" || receipt?.checkpoint_id !== "RFD-TUW-001") {
    fail("BASELINE_CONTRACT_MISMATCH", "baseline receipt identity is invalid", { unit_id: "RFD-TUW-001" });
  }
  const first = receipt?.capture?.first?.source_state;
  const second = receipt?.capture?.second?.source_state;
  const stateKeys = [
    "source_sha", "source_tree", "source_dirty", "diff_sha256", "status_sha256",
    "manifest_sha256", "working_tree_sha256",
  ];
  if (
    !isRecord(first)
    || !isRecord(second)
    || stateKeys.some((key) => !Object.is(first[key], second[key]))
    || receipt.capture.byte_equivalent !== true
    || receipt.capture.files_changed_between_captures !== 0
  ) {
    fail("BASELINE_CAPTURE_DRIFT", "the two baseline source captures are not byte-equivalent", { unit_id: "RFD-TUW-001" });
  }
  if (
    first.source_sha !== reference.source_sha
    || first.source_tree !== reference.source_tree
    || first.working_tree_sha256 !== reference.source_fingerprint_sha256
    || receipt.sealed_source_manifest_sha256 !== reference.source_manifest_sha256
  ) {
    fail("SOURCE_BINDING_DRIFT", "baseline source identity does not match its evidence reference", { unit_id: "RFD-TUW-001" });
  }
  const producers = await validateProducerSet(
    repoRoot,
    receipt.producers,
    RFD_TUW_CONTRACTS["RFD-TUW-001"],
    "RFD-TUW-001",
  );
  const plan = Array.isArray(receipt.goals)
    ? receipt.goals.find((goal) => goal?.path === RF13_PLAN_PATH)
    : undefined;
  if (
    plan?.sha256 !== planSha256
    || receipt?.historical_rf13?.classification !== "QA_ONLY"
    || receipt.historical_rf13.distributable !== false
    || receipt.historical_rf13.formal_release_allowed !== false
    || receipt.historical_rf13.canonical_selection?.status !== "NONE"
    || receipt.verdict !== "PASS_BASELINE_CAPTURED_QA_ONLY"
  ) {
    fail("STALE_QA_CLASSIFICATION_INVALID", "historical RF13 must be bound and classified only as non-distributable QA", { unit_id: "RFD-TUW-001" });
  }
  if (!sameTestCounts(reference.test_counts, { total: 2, passed: 2, failed: 0, skipped: 0 })) {
    fail("BASELINE_TEST_COUNTS_INVALID", "baseline evidence must represent both matching captures", { unit_id: "RFD-TUW-001" });
  }
  for (const capture of [receipt.capture.first, receipt.capture.second]) {
    const rawFiles = [capture?.metadata, ...Object.values(capture?.raw ?? {})];
    for (const raw of rawFiles) {
      if (!raw?.path || !SAFE_PATH.test(raw.path) || raw.path.includes("/")) {
        fail("BASELINE_CONTRACT_MISMATCH", "baseline raw capture paths are not sanitized", { unit_id: "RFD-TUW-001" });
      }
      await readContentAddressedFile(repoRoot, {
        ...raw,
        path: `${RF13_EVIDENCE_ROOT}/${raw.path}`,
      }, "baseline_raw_capture");
    }
  }
  const historical = receipt.historical_rf13.files?.find((file) => (
    file?.role === "rf13-evidence-manifest.json" && file?.generation === "initial"
  ));
  if (
    receipt.historical_rf13.directory !== ".omo/evidence/rf13-final-gate-20260731"
    || historical?.path !== "rf13-evidence-manifest.json"
  ) {
    fail("STALE_QA_CLASSIFICATION_INVALID", "historical manifest identity is not the reviewed QA-only artifact", { unit_id: "RFD-TUW-001" });
  }
  assertSha256(historical.sha256, "historical_manifest_sha256");
  if (!Number.isSafeInteger(historical.bytes) || historical.bytes < 1) {
    fail("INVALID_EVIDENCE_BYTES", "historical manifest byte count is invalid", { unit_id: "RFD-TUW-001" });
  }
  await readContentAddressedFile(repoRoot, {
    ...historical,
    path: `${receipt.historical_rf13.directory}/${historical.path}`,
  }, "historical_qa_only");
  return Object.freeze({
    candidate_valid: true,
    accepted: true,
    evidence_sha256: reference.sha256,
    source_sha: first.source_sha,
    source_tree: first.source_tree,
    source_manifest_sha256: reference.source_manifest_sha256,
    source_fingerprint_sha256: first.working_tree_sha256,
    source_dirty: first.source_dirty,
    producers,
    implementation_dependencies: Object.freeze([]),
    observations: Object.freeze({
      captures_byte_equivalent: true,
      historical_artifact_qa_only: true,
      historical_artifact_not_distributable: true,
    }),
  });
}

async function validateGenericReceipt(repoRoot, unit, reference, bytes, operationalAuthorities) {
  const receipt = parseEvidenceJson(bytes, "acceptance");
  scanForForbiddenMaterial(receipt);
  assertExactKeys(receipt, [
    "schema_version", "goal_id", "tuw_id", "evidence_kind", "scope", "source",
    "producers", "implementation_dependencies", "scenario", "test_counts", "observations",
  ], "evidence_receipt");
  if (
    receipt.schema_version !== RF13_EVIDENCE_SCHEMA
    || receipt.goal_id !== RF13_GOAL_ID
    || receipt.tuw_id !== unit.id
    || receipt.evidence_kind !== reference.kind
    || receipt.scope !== "RF13_DIST"
    || reference.scope !== "RF13_DIST"
  ) {
    fail("EVIDENCE_IDENTITY_MISMATCH", "typed receipt identity or RF13-DIST scope is invalid", { unit_id: unit.id });
  }
  validateEvidenceSourceIdentity(receipt.source);
  if (
    receipt.source.sha !== reference.source_sha
    || receipt.source.tree !== reference.source_tree
    || receipt.source.manifest_sha256 !== reference.source_manifest_sha256
    || receipt.source.fingerprint_sha256 !== reference.source_fingerprint_sha256
    || typeof receipt.source.dirty !== "boolean"
  ) {
    fail("SOURCE_BINDING_DRIFT", "receipt source identity does not match its content-addressed reference", { unit_id: unit.id });
  }
  const contract = RFD_TUW_CONTRACTS[unit.id];
  if (contract.clean_source && receipt.source.dirty !== false) {
    fail("CLEAN_SOURCE_REQUIRED", "this TUW requires clean exact-source evidence", { unit_id: unit.id });
  }
  assertExactKeys(receipt.scenario, ["id", "runner", "exit_code"], "scenario");
  if (receipt.scenario.id !== reference.kind || receipt.scenario.runner !== contract.runner || receipt.scenario.exit_code !== 0) {
    fail("SCENARIO_CONTRACT_MISMATCH", "receipt was not produced by the required successful scenario", { unit_id: unit.id });
  }
  validateTestCounts(receipt.test_counts);
  if (!sameTestCounts(receipt.test_counts, reference.test_counts)) {
    fail("TEST_COUNT_DRIFT", "receipt test counts do not match the evidence reference", { unit_id: unit.id });
  }
  const producers = await validateProducerSet(repoRoot, receipt.producers, contract, unit.id);
  const implementationDependencies = await validateImplementationDependencySet(
    repoRoot,
    receipt.implementation_dependencies,
    contract,
    unit.id,
  );
  assertExactKeys(receipt.observations, Object.keys(contract.observations), "observations");
  for (const [key, rule] of Object.entries(contract.observations)) {
    validateObservationValue(receipt.observations[key], rule);
  }
  const specializedEvidence = await validateRfdSpecializedObservations(
    repoRoot,
    unit.id,
    receipt.observations,
    receipt.source,
    operationalAuthorities,
  );
  return Object.freeze({
    candidate_valid: true,
    accepted: true,
    evidence_sha256: reference.sha256,
    source_sha: receipt.source.sha,
    source_tree: receipt.source.tree,
    source_manifest_sha256: receipt.source.manifest_sha256,
    source_fingerprint_sha256: receipt.source.fingerprint_sha256,
    source_dirty: receipt.source.dirty,
    producers,
    implementation_dependencies: implementationDependencies,
    observations: Object.freeze({ ...receipt.observations }),
    performance_lineage: new Set(["RFD-TUW-038", "RFD-TUW-039", "RFD-TUW-040"]).has(unit.id)
      ? specializedEvidence
      : undefined,
    profile_evidence: new Set(["RFD-TUW-041", "RFD-TUW-042"]).has(unit.id)
      ? specializedEvidence
      : undefined,
    native_qa: unit.id === "RFD-TUW-013" ? receipt.observations.native_qa : undefined,
    windows_release: unit.id === "RFD-TUW-013" ? receipt.observations.windows_release : undefined,
  });
}

async function validateCanonicalRfd010Receipt(repoRoot, reference, bytes) {
  let receipt = parseEvidenceJson(bytes, "rfd010_release_candidate");
  scanForForbiddenMaterial(receipt);
  let canonicalValidatorPass = true;
  try {
    receipt = validateRfd010PersistedReceiptFile(resolve(repoRoot, reference.path), { repoRoot });
  } catch {
    canonicalValidatorPass = false;
  }
  if (
    receipt.verdict !== "PASS"
    || receipt.local_verdict !== "PASS"
    || receipt.observed.source_dirty !== false
    || receipt.observed.dirty_entry_count !== 0
    || receipt.input.expected_source_sha !== reference.source_sha
    || receipt.input.expected_source_tree !== reference.source_tree
    || receipt.observed.source_sha !== reference.source_sha
    || receipt.observed.source_tree !== reference.source_tree
  ) {
    fail("RFD010_SOURCE_SEAL_UNSATISFIED", "RFD-TUW-010 does not seal the referenced clean SHA and tree", { unit_id: "RFD-TUW-010" });
  }
  const requiredLocalChecks = [
    "diff_check", "status_empty", "head_matches_expected_sha", "tree_matches_expected_tree",
    "release_authorized_branch", "package_versions_consistent", "lockfile_versions_bound",
    "formal_artifact_root", "artifact_root_collision", "local_tag_collision",
    "local_release_manifest_collision", "artifact_records_unique", "artifact_file_collision",
  ];
  if (requiredLocalChecks.some((name) => receipt.checks[name]?.status !== "PASS")) {
    fail("RFD010_SOURCE_SEAL_UNSATISFIED", "RFD-TUW-010 local release-candidate checks are not all PASS", { unit_id: "RFD-TUW-010" });
  }
  return Object.freeze({
    candidate_valid: true,
    accepted: canonicalValidatorPass,
    canonical_validator_pass: canonicalValidatorPass,
    evidence_sha256: reference.sha256,
    source_sha: reference.source_sha,
    source_tree: reference.source_tree,
    source_manifest_sha256: reference.source_manifest_sha256,
    source_fingerprint_sha256: reference.source_fingerprint_sha256,
    source_dirty: false,
    producers: await readContractProducerSet(repoRoot, RFD_TUW_CONTRACTS["RFD-TUW-010"], "RFD-TUW-010"),
    implementation_dependencies: Object.freeze([]),
    observations: Object.freeze({
      source_commit_sealed: true,
      release_sha_unique: true,
      remote_states_separated: true,
      artifact_collisions: 0,
    }),
    rfd010_release_authority_status: receipt.release_authority_status,
  });
}

export async function validateRf13EvidenceReference({
  repoRoot,
  unit,
  reference,
  planSha256,
  operationalAuthorities,
}) {
  validateReferenceShape(reference, unit.id);
  const bytes = await readContentAddressedFile(repoRoot, reference, "acceptance");
  if (unit.id === "RFD-TUW-001") return validateBaselineReceipt(repoRoot, reference, bytes, planSha256);
  if (unit.id === "RFD-TUW-010") return validateCanonicalRfd010Receipt(repoRoot, reference, bytes);
  return validateGenericReceipt(repoRoot, unit, reference, bytes, operationalAuthorities);
}

function validateManifestShape(manifest, { expectedPlanSha256, currentSource, structureOnly }) {
  scanForForbiddenMaterial(manifest);
  assertExactKeys(manifest, TOP_LEVEL_KEYS, "manifest");
  if (manifest.schema_version !== RF13_PROGRESS_SCHEMA || manifest.goal_id !== RF13_GOAL_ID) {
    fail("MANIFEST_IDENTITY_MISMATCH", "manifest schema or goal identity is invalid");
  }
  assertExactKeys(manifest.plan, PLAN_KEYS, "plan");
  if (manifest.plan.path !== RF13_PLAN_PATH) fail("PLAN_PATH_MISMATCH", "manifest plan path is not canonical");
  assertSha256(manifest.plan.sha256, "plan_sha256");
  if (manifest.plan.sha256 !== expectedPlanSha256) fail("PLAN_HASH_DRIFT", "manifest plan SHA-256 does not match the current workbook");
  assertExactKeys(manifest.source, SOURCE_KEYS, "source");
  assertSha1(manifest.source.head_sha, "manifest_head_sha");
  assertSha1(manifest.source.tree_sha, "manifest_tree_sha");
  assertSha256(manifest.source.source_manifest_sha256, "manifest_source_manifest");
  assertSha256(manifest.source.working_tree_sha256, "manifest_working_tree_sha256");
  if (typeof manifest.source.source_dirty !== "boolean") fail("INVALID_SOURCE_STATE", "source_dirty must be boolean");
  if (!structureOnly && currentSource && (
    manifest.source.head_sha !== currentSource.source_sha
    || manifest.source.tree_sha !== currentSource.source_tree
    || manifest.source.source_manifest_sha256 !== currentSource.source_manifest_sha256
    || manifest.source.working_tree_sha256 !== currentSource.working_tree_sha256
    || manifest.source.source_dirty !== currentSource.source_dirty
  )) {
    fail("SOURCE_SNAPSHOT_DRIFT", "progress manifest source identity is stale", { category: "source_state" });
  }
  if (!Array.isArray(manifest.units)) fail("INVALID_SHAPE", "units must be an array", { field: "units" });
}

function validateUnitsShape(units) {
  const canonical = new Set(RFD_TUW_IDS);
  const ids = [];
  const evidenceIds = new Set();
  const evidencePaths = new Set();
  for (const unit of units) {
    assertExactKeys(unit, UNIT_KEYS, "unit");
    if (typeof unit.id !== "string" || !canonical.has(unit.id)) {
      fail("UNEXPECTED_TUW", "manifest contains an unknown TUW id", { count: 1 });
    }
    ids.push(unit.id);
    if (!Array.isArray(unit.dependencies) || unit.dependencies.some((value) => typeof value !== "string")) {
      fail("INVALID_DEPENDENCIES", "TUW dependencies must be an ordered string array", { unit_id: unit.id });
    }
    if (JSON.stringify(unit.dependencies) !== JSON.stringify(RFD_TUW_CONTRACTS[unit.id].dependencies)) {
      fail("DEPENDENCY_MISMATCH", "TUW dependencies do not match the workbook contract", { unit_id: unit.id });
    }
    if (!RFD_STATUSES.includes(unit.status)) fail("INVALID_STATUS", "TUW status is outside the closed enum", { unit_id: unit.id });
    if (unit.status === "BLOCKED_BY_AUTHORITY" && !AUTHORITY_BLOCKABLE.has(unit.id)) {
      fail("INAPPROPRIATE_BLOCK_STATUS", "this TUW cannot claim an authority blocker", { unit_id: unit.id });
    }
    if (!Array.isArray(unit.evidence) || unit.evidence.length > 1) {
      fail("INVALID_EVIDENCE_CARDINALITY", "each TUW accepts at most one canonical acceptance receipt", { unit_id: unit.id });
    }
    for (const reference of unit.evidence) {
      validateReferenceShape(reference, unit.id);
      if (evidenceIds.has(reference.id) || evidencePaths.has(reference.path)) {
        fail("DUPLICATE_EVIDENCE", "evidence ids and paths must be unique", { unit_id: unit.id });
      }
      evidenceIds.add(reference.id);
      evidencePaths.add(reference.path);
    }
  }
  const duplicateCount = ids.length - new Set(ids).size;
  if (duplicateCount) fail("DUPLICATE_TUW", "each RFD TUW must occur exactly once", { count: duplicateCount });
  const missingCount = RFD_TUW_IDS.filter((id) => !ids.includes(id)).length;
  if (missingCount || ids.length !== RFD_TUW_IDS.length) {
    fail("MISSING_TUW", "all 42 RFD TUWs must occur exactly once", { count: missingCount });
  }
  if (JSON.stringify(ids) !== JSON.stringify(RFD_TUW_IDS)) {
    fail("TUW_ORDER_MISMATCH", "TUWs must remain in canonical workbook order");
  }
}

function validateRfdPerformanceLineage(manifest, outcomes) {
  const references = new Map(manifest.units.map((unit) => [unit.id, unit.evidence[0]]));
  const next = new Map(outcomes);
  const rfd039 = outcomes.get("RFD-TUW-039");
  if (rfd039) {
    const rfd037 = outcomes.get("RFD-TUW-037");
    const rfd038 = outcomes.get("RFD-TUW-038");
    if (rfd037?.accepted !== true || rfd038?.accepted !== true) {
      fail("RFD039_DEPENDENCY_RECEIPT_MISSING", "RFD-TUW-039 requires accepted RFD-TUW-037 and RFD-TUW-038 receipts", { unit_id: "RFD-TUW-039" });
    }
    assertLinkedReceiptEqual(
      rfd039.performance_lineage.dependency_receipts.rfd037,
      linkForManifestReference("RFD-TUW-037", references.get("RFD-TUW-037")),
      "RFD039_DEPENDENCY_RECEIPT_MISMATCH",
      "RFD-TUW-039",
    );
    assertLinkedReceiptEqual(
      rfd039.performance_lineage.dependency_receipts.rfd038,
      linkForManifestReference("RFD-TUW-038", references.get("RFD-TUW-038")),
      "RFD039_DEPENDENCY_RECEIPT_MISMATCH",
      "RFD-TUW-039",
    );
    assertSameEvidenceSource(
      receiptSourceFromOutcome(rfd037),
      rfd039.performance_lineage.candidate_artifact.source,
      "RFD039_DEPENDENCY_SOURCE_MISMATCH",
      "accepted RFD-TUW-037 receipt is stale for the candidate",
      "RFD-TUW-039",
    );
    assertSameEvidenceSource(
      receiptSourceFromOutcome(rfd038),
      rfd039.performance_lineage.parent_baseline_source,
      "RFD039_PARENT_BASELINE_MISMATCH",
      "accepted RFD-TUW-038 receipt is stale for the parent baseline",
      "RFD-TUW-039",
    );
    next.set("RFD-TUW-039", Object.freeze({ ...rfd039, performance_lineage_verified: true }));
  }
  const rfd040 = outcomes.get("RFD-TUW-040");
  if (rfd040) {
    const rfd038 = outcomes.get("RFD-TUW-038");
    const acceptedRfd039 = next.get("RFD-TUW-039");
    if (rfd038?.accepted !== true || acceptedRfd039?.accepted !== true || acceptedRfd039.performance_lineage_verified !== true) {
      fail("RFD040_DEPENDENCY_RECEIPT_MISSING", "RFD-TUW-040 requires the accepted baseline and candidate receipt chain", { unit_id: "RFD-TUW-040" });
    }
    assertLinkedReceiptEqual(
      rfd040.performance_lineage.lineage_receipts.baseline,
      linkForManifestReference("RFD-TUW-038", references.get("RFD-TUW-038")),
      "RFD040_BASELINE_RECEIPT_MISMATCH",
      "RFD-TUW-040",
    );
    assertLinkedReceiptEqual(
      rfd040.performance_lineage.lineage_receipts.candidate,
      linkForManifestReference("RFD-TUW-039", references.get("RFD-TUW-039")),
      "RFD040_CANDIDATE_RECEIPT_MISMATCH",
      "RFD-TUW-040",
    );
    assertSameEvidenceSource(
      receiptSourceFromOutcome(rfd038),
      rfd040.performance_lineage.baseline.artifact.source,
      "RFD040_BASELINE_RECEIPT_MISMATCH",
      "RFD-TUW-040 baseline receipt source is stale",
      "RFD-TUW-040",
    );
    assertSameEvidenceSource(
      receiptSourceFromOutcome(acceptedRfd039),
      rfd040.performance_lineage.candidate.artifact.source,
      "RFD040_CANDIDATE_RECEIPT_MISMATCH",
      "RFD-TUW-040 candidate receipt source is stale",
      "RFD-TUW-040",
    );
    next.set("RFD-TUW-040", Object.freeze({ ...rfd040, performance_lineage_verified: true }));
  }
  return next;
}

function validateRfdProfileLineage(manifest, outcomes) {
  const rfd042 = outcomes.get("RFD-TUW-042");
  if (!rfd042) return outcomes;
  const rfd041 = outcomes.get("RFD-TUW-041");
  if (rfd041?.accepted !== true) {
    fail("RFD042_RFD041_RECEIPT_MISSING", "RFD-TUW-042 requires the accepted RFD-TUW-041 operation receipt", { unit_id: "RFD-TUW-042" });
  }
  const reference = manifest.units.find(({ id }) => id === "RFD-TUW-041")?.evidence?.[0];
  assertLinkedReceiptEqual(
    rfd042.profile_evidence.rfd041_receipt,
    linkForManifestReference("RFD-TUW-041", reference),
    "RFD042_RFD041_RECEIPT_MISMATCH",
    "RFD-TUW-042",
  );
  return outcomes;
}

function isDependencySatisfied(unit, evidenceOutcomes) {
  return unit.status === "COMPLETE"
    && evidenceOutcomes.get(unit.id)?.accepted === true
    && evidenceOutcomes.get(unit.id)?.source_sealed === true;
}

function sourceSealMatches(outcome, source) {
  return outcome?.source_sha === source.head_sha
    && outcome?.source_tree === source.tree_sha
    && outcome?.source_manifest_sha256 === source.source_manifest_sha256
    && outcome?.source_fingerprint_sha256 === source.working_tree_sha256
    && outcome?.source_dirty === false;
}

function completionSourceSealMatches(unitId, outcomes, source, completeIds) {
  if (sourceSealMatches(outcomes.get(unitId), source)) return true;
  const rfd039 = outcomes.get("RFD-TUW-039");
  const rfd040 = outcomes.get("RFD-TUW-040");
  if (
    new Set(["RFD-TUW-037", "RFD-TUW-038"]).has(unitId)
    && completeIds.has("RFD-TUW-039")
    && rfd039?.performance_lineage_verified === true
    && (sourceSealMatches(rfd039, source)
      || (completeIds.has("RFD-TUW-040")
        && rfd040?.performance_lineage_verified === true
        && sourceSealMatches(rfd040, source)))
  ) return true;
  return unitId === "RFD-TUW-039"
    && completeIds.has("RFD-TUW-040")
    && rfd040?.performance_lineage_verified === true
    && sourceSealMatches(rfd040, source);
}

function sameSourceState(left, right) {
  return left?.source_sha === right?.source_sha
    && left?.source_tree === right?.source_tree
    && left?.source_manifest_sha256 === right?.source_manifest_sha256
    && left?.working_tree_sha256 === right?.working_tree_sha256
    && left?.source_dirty === right?.source_dirty;
}

function verifyCompletionFileGitBlobs(repoRoot, currentSourceSha, outcomes, unitIds) {
  for (const unitId of unitIds) {
    const outcome = outcomes.get(unitId);
    const sourceSha = new Set(["RFD-TUW-037", "RFD-TUW-038", "RFD-TUW-039"]).has(unitId)
      ? outcome?.source_sha
      : currentSourceSha;
    const files = [
      ...(outcome?.producers ?? []).map((file) => ({ file, kind: "PRODUCER" })),
      ...(outcome?.implementation_dependencies ?? []).map((file) => ({
        file,
        kind: "IMPLEMENTATION_DEPENDENCY",
      })),
    ];
    for (const { file, kind } of files) {
      let committedBlob;
      try {
        committedBlob = execFileSync("git", ["rev-parse", `${sourceSha}:${file.path}`], {
          cwd: repoRoot,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        }).trim();
      } catch {
        fail(`${kind}_NOT_IN_SEALED_SOURCE`, "a completion-bound source file is absent from the sealed source", { unit_id: unitId });
      }
      if (committedBlob !== file.git_blob_sha1) {
        fail(`${kind}_GIT_BLOB_MISMATCH`, "a completion-bound source file differs from its sealed Git blob", { unit_id: unitId });
      }
    }
  }
}

async function validateRfd037ParserSupplyChain(repoRoot, sourceSha) {
  let packageBytes;
  let lockBytes;
  let architectureBytes;
  let generatorBytes;
  try {
    [packageBytes, lockBytes, architectureBytes, generatorBytes] = [
      "package.json",
      "package-lock.json",
      "scripts/lib/matter-rf13-architecture-evidence.mjs",
      "scripts/generate-matter-rf13-architecture-evidence.mjs",
    ].map((path) => execFileSync("git", ["show", `${sourceSha}:${path}`], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    }));
  } catch {
    fail("RFD037_PARSER_DEPENDENCY_UNBOUND", "RFD-TUW-037 parser supply-chain inputs are missing");
  }
  if (![architectureBytes, generatorBytes].some((bytes) => bytes.toString("utf8").includes("@babel/parser"))) return;
  let packageJson;
  let lockJson;
  try {
    packageJson = JSON.parse(packageBytes);
    lockJson = JSON.parse(lockBytes);
  } catch {
    fail("RFD037_PARSER_DEPENDENCY_UNBOUND", "RFD-TUW-037 parser supply-chain manifests are invalid");
  }
  const declared = packageJson.dependencies?.["@babel/parser"] ?? packageJson.devDependencies?.["@babel/parser"];
  const locked = lockJson.packages?.[""]?.dependencies?.["@babel/parser"]
    ?? lockJson.packages?.[""]?.devDependencies?.["@babel/parser"];
  if (typeof declared !== "string" || locked !== declared) {
    fail("RFD037_PARSER_DEPENDENCY_UNBOUND", "RFD-TUW-037 directly imports @babel/parser without a root package and lockfile declaration");
  }
}

function frozenManifestSnapshot(manifest) {
  let snapshot;
  try {
    snapshot = structuredClone(manifest);
  } catch {
    fail("INVALID_SHAPE", "manifest must be an in-memory data object");
  }
  const freeze = (value) => {
    if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) freeze(child);
    return Object.freeze(value);
  };
  return freeze(snapshot);
}

function retainedOperationalAuthorities(authorities) {
  if (!authorities || typeof authorities !== "object" || Array.isArray(authorities)) return authorities;
  return Object.freeze(Object.fromEntries(Object.entries(authorities).map(([unitId, authority]) => [
    unitId,
    authority && typeof authority === "object" && !Array.isArray(authority)
      ? Object.freeze({ ...authority })
      : authority,
  ])));
}

async function prepareCompletionEvidence(manifest, currentSource, outcomes, { repoRoot } = {}) {
  const complete = manifest.units.filter((unit) => unit.status === "COMPLETE");
  const completeIds = new Set(complete.map((unit) => unit.id));
  if (complete.length === 0) return null;
  if (
    !currentSource
    || currentSource.source_dirty !== false
    || manifest.source.source_dirty !== false
  ) {
    fail("UNSEALED_COMPLETION_SOURCE", "COMPLETE requires the validator's current clean sealed source");
  }
  for (const unit of complete) {
    if (!completionSourceSealMatches(unit.id, outcomes, manifest.source, completeIds)) {
      fail("SOURCE_SEAL_MISMATCH", "COMPLETE evidence is not bound to the shared current source seal", {
        unit_id: unit.id,
      });
    }
  }
  const rfd010 = outcomes.get("RFD-TUW-010");
  if (rfd010?.candidate_valid !== true) {
    fail("MISSING_RFD010_SOURCE_SEAL", "COMPLETE requires the canonical validated RFD-TUW-010 source-seal receipt");
  }
  if (!sourceSealMatches(rfd010, manifest.source)) {
    fail("RFD010_SOURCE_SEAL_MISMATCH", "RFD-TUW-010 does not match the current clean source seal");
  }
  verifyCompletionFileGitBlobs(repoRoot, manifest.source.head_sha, outcomes, [
    ...new Set(["RFD-TUW-010", ...complete.map((unit) => unit.id)]),
  ]);
  if (complete.some((unit) => unit.id === "RFD-TUW-037")) {
    await validateRfd037ParserSupplyChain(repoRoot, outcomes.get("RFD-TUW-037").source_sha);
  }
  const packet = buildRf13CompletionPacket({ manifest, outcomes });
  const packetBytes = serializeRf13CompletionPacket(packet);
  const packetSha256 = hashRf13CompletionPacket(packet);
  if (sha256(packetBytes) !== packetSha256) {
    fail("RF13_COMPLETION_PACKET_INVALID", "canonical completion packet bytes do not match their digest");
  }
  return Object.freeze({
    packet,
    packetBytes,
    packetSha256,
    source: Object.freeze({ ...currentSource }),
    completeIds,
  });
}

function attachCompletionAttestation(manifest, outcomes, completion, completionAttestation) {
  const complete = manifest.units.filter((unit) => unit.status === "COMPLETE");
  let attestation;
  try {
    attestation = validateRf13CompletionAttestation(completion.packet, completionAttestation);
  } catch (error) {
    fail(error.code ?? "RF13_COMPLETION_ATTESTATION_INVALID", error.message);
  }
  if (attestation.packet_sha256 !== completion.packetSha256) {
    fail("RF13_COMPLETION_ATTESTATION_INVALID", "completion attestation is not bound to the prepared packet");
  }
  const rfd010 = outcomes.get("RFD-TUW-010");
  if (rfd010.canonical_validator_pass !== true) {
    fail("RFD010_RECEIPT_INVALID", "RFD-TUW-010 canonical receipt failed its dedicated validator");
  }
  return Object.freeze({
    attestation,
    outcomes: new Map([...outcomes].map(([id, outcome]) => [
      id,
      Object.freeze({
        ...outcome,
        source_sealed: completionSourceSealMatches(id, outcomes, manifest.source, completion.completeIds),
        trusted_attestation: complete.some((unit) => unit.id === id) ? attestation : undefined,
      }),
    ])),
  });
}

function matterRf13ProgressResult(state, outcomes, { sourceSealed = false } = {}) {
  const { manifest, structureOnly, evidenceVerified } = state;
  const gates = deriveRf13Gates(manifest.units, outcomes, { sourceSealed });
  const gateComplete = sourceSealed
    && Object.values(gates).every((status) => status === "PASS" || status === "PASS_MACOS_PRIMARY");
  const satisfied = new Set(manifest.units
    .filter((unit) => isDependencySatisfied(unit, outcomes))
    .map((unit) => unit.id));
  const counts = Object.fromEntries(RFD_STATUSES.map((status) => [
    status,
    manifest.units.filter((unit) => unit.status === status).length,
  ]));
  return Object.freeze({
    validator: "matter-rf13-debt-remediation-goal",
    verdict: structureOnly ? "PASS_STRUCTURE" : gateComplete ? "PASS" : "INCOMPLETE",
    structural_ok: true,
    goal_complete: !structureOnly && gateComplete,
    source_sealed: !structureOnly && sourceSealed,
    total_units: manifest.units.length,
    counts: Object.freeze(counts),
    evidence_verified: evidenceVerified,
    gates,
    incomplete_units: Object.freeze(RFD_TUW_IDS.filter((id) => !satisfied.has(id))),
  });
}

async function prepareMatterRf13ProgressState(manifestInput, {
  repoRoot,
  expectedPlanSha256,
  currentSource,
  readCurrentSource,
  operationalAuthorities,
  structureOnly = false,
} = {}) {
  const manifest = frozenManifestSnapshot(manifestInput);
  const initialSource = currentSource ? Object.freeze({ ...currentSource }) : currentSource;
  const retainedAuthorities = retainedOperationalAuthorities(operationalAuthorities);
  validateManifestShape(manifest, { expectedPlanSha256, currentSource: initialSource, structureOnly });
  validateUnitsShape(manifest.units);
  let evidenceOutcomes = new Map();
  let evidenceVerified = 0;
  let completion = null;

  if (!structureOnly) {
    for (const unit of manifest.units) {
      if (unit.evidence.length === 1) {
        evidenceOutcomes.set(unit.id, await validateRf13EvidenceReference({
          repoRoot,
          unit,
          reference: unit.evidence[0],
          planSha256: expectedPlanSha256,
          operationalAuthorities: retainedAuthorities,
        }));
        evidenceVerified += 1;
      }
      const needsAcceptance = unit.status === "COMPLETE";
      if (needsAcceptance && evidenceOutcomes.get(unit.id)?.candidate_valid !== true) {
        fail("MISSING_ACCEPTANCE_EVIDENCE", "terminal TUW status requires its typed observable acceptance receipt", { unit_id: unit.id });
      }
    }
    evidenceOutcomes = validateRfdProfileLineage(
      manifest,
      validateRfdPerformanceLineage(manifest, evidenceOutcomes),
    );
    const byId = new Map(manifest.units.map((unit) => [unit.id, unit]));
    for (const unit of manifest.units.filter((candidate) => candidate.status === "COMPLETE")) {
      const incompleteDependencies = unit.dependencies.filter((id) => (
        byId.get(id)?.status !== "COMPLETE" || evidenceOutcomes.get(id)?.candidate_valid !== true
      ));
      if (incompleteDependencies.length) {
        fail("IMPOSSIBLE_DEPENDENCY_COMPLETION", "a COMPLETE TUW has unsatisfied dependencies", {
          unit_id: unit.id,
          count: incompleteDependencies.length,
        });
      }
    }
    const hasComplete = manifest.units.some((unit) => unit.status === "COMPLETE");
    if (hasComplete) {
      if (!initialSource || initialSource.source_dirty !== false || manifest.source.source_dirty !== false) {
        fail("UNSEALED_COMPLETION_SOURCE", "COMPLETE requires the validator's current clean sealed source");
      }
      if (typeof readCurrentSource !== "function") {
        fail("SOURCE_RECAPTURE_REQUIRED", "COMPLETE requires a fresh source recapture after evidence validation");
      }
      const afterEvidence = await readCurrentSource();
      if (!sameSourceState(initialSource, afterEvidence)) {
        fail("SOURCE_CHANGED_DURING_VALIDATION", "source changed while completion evidence was being validated");
      }
      const beforeSeal = await readCurrentSource();
      if (!sameSourceState(afterEvidence, beforeSeal)) {
        fail("SOURCE_CHANGED_DURING_VALIDATION", "source changed before completion evidence was sealed");
      }
      completion = await prepareCompletionEvidence(
        manifest,
        beforeSeal,
        evidenceOutcomes,
        { repoRoot },
      );
      const afterPacket = await readCurrentSource();
      if (!sameSourceState(beforeSeal, afterPacket)) {
        fail("SOURCE_CHANGED_DURING_VALIDATION", "source changed while the completion packet was prepared");
      }
    }
  }

  return Object.freeze({
    manifest,
    structureOnly,
    outcomes: evidenceOutcomes,
    evidenceVerified,
    initialSource,
    readCurrentSource,
    completion,
    retainedAuthorities,
  });
}

async function finalizeMatterRf13ProgressState(state, {
  completionPacketBytes,
  completionAttestation,
  rejectAttestationReplay = false,
} = {}) {
  const { completion, readCurrentSource } = state;
  if (!completion || typeof readCurrentSource !== "function") {
    fail("RF13_PREPARED_SESSION_INCOMPLETE", "prepared completion state is unavailable");
  }
  if (!Buffer.isBuffer(completionPacketBytes)
    || !completionPacketBytes.equals(completion.packetBytes)
    || !serializeRf13CompletionPacket(completion.packet).equals(completion.packetBytes)
    || sha256(completion.packetBytes) !== completion.packetSha256) {
    fail("RF13_PREPARED_PACKET_MISMATCH", "completion requires the exact canonical prepared packet bytes");
  }
  const beforeAttestation = await readCurrentSource();
  if (!sameSourceState(completion.source, beforeAttestation)) {
    fail("SOURCE_CHANGED_DURING_VALIDATION", "source changed after the completion packet was prepared");
  }
  const sealed = attachCompletionAttestation(
    state.manifest,
    state.outcomes,
    completion,
    completionAttestation,
  );
  const attestationReplayKey = [
    sealed.attestation.registry_sha256,
    sealed.attestation.approval_receipt_sha256,
    sha256(completionAttestation.signatureBytes),
  ].join(":");
  if (rejectAttestationReplay
    && CONSUMED_COMPLETION_ATTESTATIONS.has(attestationReplayKey)) {
    fail("RF13_COMPLETION_ATTESTATION_REPLAY", "completion attestation was already consumed by a prepared session");
  }
  const beforeVerdict = await readCurrentSource();
  if (!sameSourceState(completion.source, beforeVerdict)) {
    fail("SOURCE_CHANGED_DURING_VALIDATION", "source changed before the completion verdict was emitted");
  }
  if (rejectAttestationReplay) {
    CONSUMED_COMPLETION_ATTESTATIONS.add(attestationReplayKey);
  }
  return matterRf13ProgressResult(state, sealed.outcomes, { sourceSealed: true });
}

function preparedGoalSessionCapability() {
  const target = Object.create(null);
  Object.defineProperty(target, "toJSON", {
    enumerable: false,
    value() {
      fail("RF13_PREPARED_SESSION_SERIALIZATION", "prepared Goal session capabilities cannot be serialized");
    },
  });
  return Object.freeze(new Proxy(target, {}));
}

export async function prepareMatterRf13GoalValidationSession(manifest, options = {}) {
  const state = await prepareMatterRf13ProgressState(manifest, options);
  if (!state.completion || state.structureOnly) {
    fail("RF13_PREPARED_SESSION_INCOMPLETE", "prepared Goal validation requires completion-bound evidence");
  }
  const sessionCapability = preparedGoalSessionCapability();
  PREPARED_GOAL_VALIDATION_SESSIONS.set(sessionCapability, state);
  return Object.freeze({
    completionPacketBytes: Buffer.from(state.completion.packetBytes),
    completionPacketSha256: state.completion.packetSha256,
    sessionCapability,
  });
}

export async function finalizeMatterRf13GoalValidationSession(input = {}) {
  assertExactKeys(
    input,
    ["sessionCapability", "completionPacketBytes", "completionAttestation"],
    "prepared Goal finalization",
  );
  const state = PREPARED_GOAL_VALIDATION_SESSIONS.get(input.sessionCapability);
  if (!state) {
    fail("RF13_PREPARED_SESSION_REPLAY", "prepared Goal session capability is foreign or already consumed");
  }
  PREPARED_GOAL_VALIDATION_SESSIONS.delete(input.sessionCapability);
  return finalizeMatterRf13ProgressState(state, {
    completionPacketBytes: input.completionPacketBytes,
    completionAttestation: input.completionAttestation,
    rejectAttestationReplay: true,
  });
}

export async function validateMatterRf13Progress(manifest, {
  repoRoot,
  expectedPlanSha256,
  currentSource,
  readCurrentSource,
  completionAttestation,
  operationalAuthorities,
  structureOnly = false,
} = {}) {
  const state = await prepareMatterRf13ProgressState(manifest, {
    repoRoot,
    expectedPlanSha256,
    currentSource,
    readCurrentSource,
    operationalAuthorities,
    structureOnly,
  });
  if (!state.completion) return matterRf13ProgressResult(state, state.outcomes);
  if (!completionAttestation) {
    fail("TRUSTED_COMPLETION_ATTESTATION_REQUIRED", "COMPLETE requires an externally pinned signed attestation of the exact evidence packet", {
      packet_sha256: state.completion.packetSha256,
    });
  }
  return finalizeMatterRf13ProgressState(state, {
    completionPacketBytes: state.completion.packetBytes,
    completionAttestation,
  });
}

export function hashRf13Bytes(value) {
  return sha256(value);
}
