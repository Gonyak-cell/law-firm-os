import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import { chmod, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { cpus, arch, platform, release, totalmem } from "node:os";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  DESKTOP_RENDERER_DIGEST_ALGORITHM,
  validateDesktopBuildManifest,
} from "./matter-desktop-provenance.mjs";
import {
  assertDesktopArtifactPrivacyValidation,
  validateDesktopArtifactPrivacyEvidence,
  validateRf13DistPrivacyMemberReceiptStructure,
} from "./matter-desktop-artifact-privacy.mjs";
import {
  readApprovedProgramBytes,
  readApprovedSourceBytes,
} from "./json-postgres-program-files.mjs";

export const COLD_START_SCHEMA = "law-firm-os.matter-desktop-cold-start.v2";
export const REQUIRED_RUN_COUNT = 5;
export const PERCENTILE_METHOD = "linear_interpolation_(n-1)";
export const FORMAL_COLD_START_CHANNEL = "formal";
export const DESKTOP_MEMBER_DIGEST_ALGORITHM = "sha256(sorted type sha256 file manifest with ./ relative paths)";
export const COLD_START_STATUSES = Object.freeze([
  "PASS",
  "BLOCKED_BY_ARTIFACT",
  "BLOCKED_BY_EXECUTION_GUARD",
  "FAILED_CLOSED",
  "RECOVERY_REQUIRED",
]);

// A receipt is evidence, not a cache.  Keep the acceptance window deliberately
// bounded so a copied/stale PASS cannot become a current baseline.
export const MAX_RECEIPT_FRESHNESS_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

const GIT_OBJECT_PATTERN = /^[0-9a-f]{40}$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9._-]+$/u;
const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{15,127}$/u;
const MAX_JSON_EVIDENCE_BYTES = 64 * 1024 * 1024;
const MAX_ARCHIVE_EVIDENCE_BYTES = 512 * 1024 * 1024;
const MAX_SESSION_FIXTURE_FILE_BYTES = 64 * 1024 * 1024;
const MAX_SESSION_FIXTURE_TOTAL_BYTES = 256 * 1024 * 1024;
const FORBIDDEN_ARTIFACT_MARKERS = /(?:QA_ONLY|QA-ONLY|qa_only|internal|candidate|dev|private-local|synthetic)/u;
const PACKAGE_MANIFEST_RELATIVE_PATHS = Object.freeze([
  path.join("Contents", "Resources", "matter-build-manifest.json"),
  path.join("resources", "matter-build-manifest.json"),
]);
const RECEIPT_KEYS = Object.freeze([
  "schema_version",
  "generated_at",
  "status",
  "blockers",
  "required_run_count",
  "run_count",
  "percentile_method",
  "median_ms",
  "p95_ms",
  "artifact",
  "renderer",
  "source",
  "host_fingerprint",
  "user_data_root",
  "runs",
  "inputs",
  "claims",
]);
const RUN_KEYS = Object.freeze([
  "run_index",
  "run_id",
  "user_data_path_digest",
  "isolated_user_data_created",
  "cleanup_attempted",
  "cleanup_succeeded",
  "post_cleanup_exists",
  "process_start_at",
  "renderer_ready_at",
  "home_ready_at",
  "duration_ms",
  "exit_code",
  "signal",
  "error_count",
  "console_count",
  "console_error_count",
  "home_ready_observed",
  "host_fingerprint",
]);
const RUN_FAILURE_KEYS = Object.freeze(["error"]);
const STATS_KEYS = Object.freeze(["path", "bytes", "file_count", "sha256", "algorithm"]);
const ARTIFACT_KEYS = Object.freeze([
  ...STATS_KEYS,
  "manifest_path",
  "manifest_sha256",
  "manifest",
  "packaged_manifest_path",
  "executable_path",
  "executable_sha256",
  "authority",
]);
const SOURCE_KEYS = Object.freeze(["source_sha", "source_tree", "source_dirty", "checked"]);
const INPUT_KEYS = Object.freeze([
  "artifact_manifest_path",
  "artifact_path",
  "rf13_dist_manifest_path",
  "expected_source_sha",
]);
const AUTHORITY_KEYS = Object.freeze([
  "rf13_dist_manifest_path",
  "rf13_dist_manifest_sha256",
  "release_index_path",
  "release_index_sha256",
  "artifact_id",
  "indexed_artifact_sha256",
  "privacy_receipt_path",
  "privacy_receipt_sha256",
  "member_manifest_path",
  "member_manifest_sha256",
]);
const RF13_ARCHIVE_ARTIFACT_KINDS = new Set([
  "zip_archive",
  "dmg_image",
  "unsigned_package_zip",
  "nsis_installer",
]);
const LIVE_COLD_START_AUTHORITY_VALIDATIONS = new WeakSet();
const COLD_START_AUTHORITY_DETAILS = new WeakMap();
const LIVE_COLD_START_MEASUREMENT_VALIDATIONS = new WeakSet();
const COLD_START_MEASUREMENT_DETAILS = new WeakMap();
const CANONICAL_COLD_START_PRODUCER = "run-matter-desktop-cold-start-probe:fixed-electron-playwright-observer:v1";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertExactKeys(value, expectedKeys, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  const actual = Object.keys(value).toSorted();
  const expected = [...expectedKeys].toSorted();
  assert.deepEqual(actual, expected, `${label} keys must match the closed schema`);
}

function assertSha256(value, label) {
  assert.match(String(value ?? ""), SHA256_PATTERN, `${label} must be a full SHA-256`);
}

function assertRegularFile(filePath, label) {
  assertPathIsAbsolute(filePath, label);
  assert.equal(existsSync(filePath), true, `${label} is missing: ${filePath}`);
  const fileStat = lstatSync(filePath);
  assert.equal(fileStat.isSymbolicLink(), false, `${label} must not be a symlink`);
  assert.equal(fileStat.isFile(), true, `${label} must be a regular file`);
}

function canonicalPath(value, label) {
  assertPathIsAbsolute(value, label);
  return path.resolve(value);
}

function isWithin(rootPath, childPath) {
  const root = path.resolve(rootPath);
  const child = path.resolve(childPath);
  return child === root || child.startsWith(`${root}${path.sep}`);
}

function assertContainedPath(rootPath, childPath, label, { allowRoot = false } = {}) {
  const root = canonicalPath(rootPath, `${label} root`);
  const child = canonicalPath(childPath, label);
  assert.ok(isWithin(root, child) && (allowRoot || child !== root), `${label} must be contained by the artifact root`);
  return child;
}

function canonicalJsonHash(value) {
  return sha256(JSON.stringify(value));
}

function assertFreshTimestamp(value, label, nowMs, { allowNull = false } = {}) {
  if (allowNull && value === null) return null;
  const parsed = isoTimestamp(value, label);
  assert.ok(parsed <= nowMs + MAX_CLOCK_SKEW_MS, `${label} cannot be in the future`);
  assert.ok(nowMs - parsed <= MAX_RECEIPT_FRESHNESS_MS, `${label} is stale`);
  return parsed;
}

function assertPathIsAbsolute(value, label) {
  assert.equal(typeof value, "string", `${label} is required`);
  assert.ok(path.isAbsolute(value), `${label} must be an absolute path`);
  assert.equal(path.resolve(value), value, `${label} must be normalized`);
}

function compareCodePointText(left, right) {
  const leftPoints = Array.from(left, (value) => value.codePointAt(0));
  const rightPoints = Array.from(right, (value) => value.codePointAt(0));
  const limit = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < limit; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) return leftPoints[index] - rightPoints[index];
  }
  return leftPoints.length - rightPoints.length;
}

function walkFiles(rootPath, { includeSymlinks = true } = {}) {
  assertPathIsAbsolute(rootPath, "bundle path");
  assert.equal(existsSync(rootPath), true, `bundle path is missing: ${rootPath}`);
  const rootStat = lstatSync(rootPath);
  assert.equal(rootStat.isSymbolicLink(), false, "bundle path must not be a symlink");
  const rootRealPath = realpathSync(rootPath);
  const visitedDirectories = new Set();
  const files = [];
  const visit = (currentPath) => {
    const currentStat = lstatSync(currentPath);
    if (currentStat.isSymbolicLink()) {
      throw new Error(`bundle traversal encountered an unexpected symlink directory: ${currentPath}`);
    }
    if (currentStat.isDirectory()) {
      const currentRealPath = realpathSync(currentPath);
      if (!currentRealPath.startsWith(`${rootRealPath}${path.sep}`) && currentRealPath !== rootRealPath) {
        throw new Error(`bundle symlink escapes its root: ${currentPath}`);
      }
      if (visitedDirectories.has(currentRealPath)) return;
      visitedDirectories.add(currentRealPath);
    }
    const entries = readdirSync(currentPath, { withFileTypes: true })
      .toSorted((left, right) => compareCodePointText(left.name, right.name));
    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name);
      const stat = lstatSync(absolutePath);
      if (stat.isSymbolicLink()) {
        let target;
        let linkText;
        try {
          target = realpathSync(absolutePath);
          linkText = readlinkSync(absolutePath, "utf8");
        } catch (error) {
          throw new Error(`bundle symlink is broken or looping: ${absolutePath}`, { cause: error });
        }
        if (!target.startsWith(`${rootRealPath}${path.sep}`) && target !== rootRealPath) {
          throw new Error(`bundle symlink escapes its root: ${absolutePath}`);
        }
        const targetStat = statSync(target);
        if (!targetStat.isDirectory() && !targetStat.isFile()) {
          throw new Error(`bundle symlink target type is unsupported: ${absolutePath}`);
        }
        try {
          const targetAfterPath = realpathSync(absolutePath);
          if (targetAfterPath !== target) {
            throw new Error(`bundle symlink target changed during inspection: ${absolutePath}`);
          }
          const targetAfterStat = statSync(targetAfterPath);
          if (!targetAfterStat.isDirectory() && !targetAfterStat.isFile()) {
            throw new Error(`bundle symlink target type changed during inspection: ${absolutePath}`);
          }
        } catch (error) {
          if (String(error?.message ?? "").includes("target changed during inspection")
            || String(error?.message ?? "").includes("target type changed during inspection")) throw error;
          throw new Error(`bundle symlink is broken or looping: ${absolutePath}`, { cause: error });
        }
        if (includeSymlinks) files.push({ path: absolutePath, type: "symlink", linkText });
      } else if (stat.isDirectory()) {
        visit(absolutePath);
      } else if (stat.isFile()) {
        files.push({ path: absolutePath, type: "file" });
      } else {
        throw new Error(`bundle contains an unsupported filesystem entry: ${entry.name}`);
      }
    }
  };
  if (rootStat.isDirectory()) visit(rootPath);
  else if (rootStat.isFile()) files.push({ path: rootPath, type: "file" });
  else throw new Error("bundle root must be a regular file or directory");
  return files;
}

function canonicalBundleMemberManifest(fileManifest, { includeTypes = false } = {}) {
  return fileManifest
    .toSorted((left, right) => compareCodePointText(left.path, right.path))
    .map((file) => includeTypes
      ? `${file.type} ${file.sha256}  ${file.path}\n`
      : `${file.sha256}  ${file.path}\n`)
    .join("");
}

export function measureBundle(rootPath, options = {}) {
  const files = walkFiles(rootPath, options);
  const includeTypes = options.includeTypes !== false;
  const rootIsFile = statSync(rootPath).isFile();
  const fileManifest = files.map(({ path: filePath, type, linkText }) => {
    const relativePath = rootIsFile
      ? path.basename(filePath)
      : path.relative(rootPath, filePath).split(path.sep).join("/");
    const bytes = type === "symlink" ? Buffer.from(linkText, "utf8") : readFileSync(filePath);
    return {
      path: `./${relativePath}`,
      type,
      bytes: bytes.byteLength,
      sha256: sha256(bytes),
    };
  }).toSorted((left, right) => compareCodePointText(left.path, right.path));
  const canonicalManifest = canonicalBundleMemberManifest(fileManifest, { includeTypes });
  return Object.freeze({
    path: rootPath,
    bytes: fileManifest.reduce((sum, file) => sum + file.bytes, 0),
    file_count: fileManifest.length,
    sha256: sha256(canonicalManifest),
    algorithm: includeTypes
      ? DESKTOP_MEMBER_DIGEST_ALGORITHM
      : rootIsFile ? "sha256(file)" : DESKTOP_RENDERER_DIGEST_ALGORITHM,
  });
}

function releaseManifestPathForArtifact(artifactPath) {
  if (!existsSync(artifactPath) || !statSync(artifactPath).isDirectory()) return null;
  for (const relativePath of PACKAGE_MANIFEST_RELATIVE_PATHS) {
    const candidate = path.join(artifactPath, relativePath);
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function clonePublicManifest(manifest) {
  return JSON.parse(JSON.stringify(manifest));
}

function rejectArtifact(reason, details = {}) {
  const error = new Error(reason);
  error.code = "BLOCKED_BY_ARTIFACT";
  error.details = details;
  throw error;
}

function assertFormalMarkerFree(value, label) {
  const serialized = JSON.stringify(value);
  if (FORBIDDEN_ARTIFACT_MARKERS.test(serialized)) {
    rejectArtifact(`${label} contains an internal, candidate, synthetic, private-local, or QA_ONLY marker`);
  }
}

function validateExpectedSha(value, label = "expected source SHA") {
  if (!GIT_OBJECT_PATTERN.test(String(value ?? ""))) rejectArtifact(`${label} must be a full 40-character Git SHA`);
  return value;
}

function validateSourceState(sourceState, expectedSourceSha, expectedSourceTree = null) {
  if (!sourceState) rejectArtifact("exact source identity and cleanliness are required");
  const sourceSha = sourceState.source_sha ?? sourceState.sourceSha;
  const sourceDirty = sourceState.source_dirty ?? sourceState.sourceDirty;
  if (sourceDirty === true) rejectArtifact("source worktree is dirty");
  if (sourceDirty !== false) rejectArtifact("source cleanliness is not proven");
  if (sourceSha !== expectedSourceSha) rejectArtifact("source SHA does not match the exact artifact SHA", {
    expected_source_sha: expectedSourceSha,
    source_sha: sourceSha,
  });
  const sourceTree = sourceState.source_tree ?? sourceState.sourceTree;
  if (!sourceTree) rejectArtifact("exact source tree identity is required");
  if (expectedSourceTree && sourceTree !== expectedSourceTree) rejectArtifact("source tree does not match the exact artifact tree", {
    expected_source_tree: expectedSourceTree,
    source_tree: sourceTree,
  });
  return {
    source_sha: sourceSha,
    ...(sourceTree ? { source_tree: sourceTree } : {}),
    source_dirty: false,
    checked: true,
  };
}

function validateManifestEnvelope(manifest, expectedSourceSha) {
  if (manifest.channel !== FORMAL_COLD_START_CHANNEL) rejectArtifact("cold-start probe accepts only the formal release channel");
  try {
    validateDesktopBuildManifest(manifest);
  } catch (error) {
    rejectArtifact(`formal build manifest is invalid: ${error.message}`);
  }
  if (manifest.source_sha !== expectedSourceSha) rejectArtifact("formal manifest source SHA does not match expected source SHA");
  if (manifest.source_dirty !== false) rejectArtifact("formal manifest source_dirty must be false");
  if (manifest.effective_runtime_mode !== "none" || manifest.runtime_included !== false) {
    rejectArtifact("formal artifact must not include a bundled runtime");
  }
  if (manifest.runtime_data_class !== "none" || manifest.non_distributable !== false || manifest.distributable !== true) {
    rejectArtifact("formal artifact must be distributable with runtime data class none");
  }
  if (manifest.public_release_claim !== false || manifest.production_go_live_claim !== false) {
    rejectArtifact("formal manifest cannot claim public release or production go-live");
  }
  if (manifest.app_id !== "com.amic.matter.desktop") rejectArtifact("formal manifest app_id is not the formal app ID");
  assertFormalMarkerFree(manifest, "formal manifest");
  return manifest;
}

function validateSourceTree(sourceTree) {
  if (!GIT_OBJECT_PATTERN.test(String(sourceTree ?? ""))) rejectArtifact("formal manifest source_tree must be a full Git tree SHA");
  return sourceTree;
}

function compareManifest(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function repoRelativeFile(repoRoot, relativePath, label) {
  assertPathIsAbsolute(repoRoot, "repoRoot");
  assert.equal(typeof relativePath, "string", `${label} is required`);
  assert.equal(relativePath.length > 0, true, `${label} is required`);
  assert.equal(path.isAbsolute(relativePath), false, `${label} must be repository-relative`);
  assert.equal(relativePath.includes("\\"), false, `${label} must use POSIX separators`);
  assert.equal(path.posix.normalize(relativePath), relativePath, `${label} must be normalized`);
  assert.equal(relativePath.split("/").includes(".."), false, `${label} cannot escape the repository root`);
  const root = realpathSync(repoRoot);
  const absolute = path.resolve(root, relativePath);
  assert.ok(isWithin(root, absolute) && absolute !== root, `${label} must be contained by the repository root`);
  assertRegularFile(absolute, label);
  assert.equal(realpathSync(absolute), absolute, `${label} must not traverse a symlink`);
  return absolute;
}

function readPinnedEvidenceBytes(filePath, label, {
  expectedByteSize = null,
  expectedSha256 = null,
  maxBytes = MAX_JSON_EVIDENCE_BYTES,
} = {}) {
  assertPathIsAbsolute(filePath, label);
  const resolved = realpathSync(filePath);
  assert.equal(resolved, filePath, `${label} must not traverse a symlink`);
  const container = path.dirname(filePath);
  assert.equal(realpathSync(container), container, `${label} container must not traverse a symlink`);
  let bytes;
  try {
    if (expectedSha256 === null) {
      bytes = readApprovedProgramBytes(filePath, {
        approvedRoots: [container],
        maxBytes,
      });
    } else {
      assertSha256(expectedSha256, `${label} expected SHA-256`);
      const pinnedByteSize = expectedByteSize ?? lstatSync(filePath).size;
      bytes = readApprovedSourceBytes(filePath, {
        approvedRoots: [container],
        expectedByteSize: pinnedByteSize,
        expectedSha256,
        maxBytes,
      });
    }
  } catch (error) {
    throw new Error(`${label} changed while it was read`, { cause: error });
  }
  return bytes;
}

function parsePinnedJson(bytes, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    assert.fail(`${label} is not valid JSON: ${error.message}`);
  }
}

function validateAuthorityEvidence(authority, {
  artifactStats,
  artifactManifestSha256,
  expectedSourceSha,
  expectedSourceTree,
  expectedVersion,
  expectedPlatform,
  repoRoot,
  nowMs,
} = {}) {
  assertExactKeys(authority, AUTHORITY_KEYS, "artifact authority");
  assertSha256(authority.rf13_dist_manifest_sha256, "RF13-DIST manifest SHA-256");
  assertSha256(authority.release_index_sha256, "release index SHA-256");
  assertSha256(authority.indexed_artifact_sha256, "indexed artifact SHA-256");
  assertSha256(authority.privacy_receipt_sha256, "RF13 privacy receipt SHA-256");
  assertSha256(authority.member_manifest_sha256, "RF13 member manifest SHA-256");
  assert.equal(typeof authority.artifact_id, "string", "artifact authority artifact_id is required");
  assert.ok(SAFE_TOKEN_PATTERN.test(authority.artifact_id), "artifact authority artifact_id is unsafe");
  const manifestPath = repoRelativeFile(repoRoot, authority.rf13_dist_manifest_path, "RF13-DIST manifest path");
  const manifestBytes = readPinnedEvidenceBytes(manifestPath, "RF13-DIST manifest", {
    expectedSha256: authority.rf13_dist_manifest_sha256,
  });
  const rf13Manifest = parsePinnedJson(manifestBytes, "RF13-DIST manifest");
  // The complete RF13-DIST gate has its own same-process capability boundary
  // (macOS, privacy, deployed API, rollback, and canary).  Cold-start must not
  // replay that final validator with serialized evidence.  Check only the
  // sealed manifest envelope here; the selected archive is independently
  // inspected by validateFormalPackagedArtifactAuthoritatively below.
  assert.equal(rf13Manifest.schema_version, "law-firm-os.rf13-dist.manifest.v1", "RF13-DIST authority schema mismatch");
  assert.equal(rf13Manifest.manifest_id, "RF13-DIST", "RF13-DIST authority manifest ID mismatch");
  assert.equal(rf13Manifest.status, "PASS", "RF13-DIST authority must be a final PASS manifest");
  assert.equal(rf13Manifest.template, false, "RF13-DIST authority cannot use a template manifest");
  assert.equal(rf13Manifest.source?.dirty, false, "RF13-DIST authority source must be clean");
  assert.equal(rf13Manifest.release?.channel, "formal", "RF13-DIST authority channel must be formal");
  assert.equal(rf13Manifest.release?.app_id, "com.amic.matter.desktop", "RF13-DIST authority app ID mismatch");
  const expectedReleaseRoot = path.posix.join(
    "apps/desktop/dist/releases",
    expectedVersion,
    expectedSourceSha,
    "formal",
  );
  assert.equal(rf13Manifest.release?.artifact_root, expectedReleaseRoot, "RF13-DIST artifact root is not bound to source/version");
  assert.equal(
    rf13Manifest.release?.release_index?.path,
    `${expectedReleaseRoot}/artifact-index.json`,
    "RF13-DIST release index path is not bound to the exact release root",
  );
  assert.equal(rf13Manifest.source.sha, expectedSourceSha, "RF13-DIST source SHA is not bound to the desktop manifest");
  assert.equal(rf13Manifest.source.tree, expectedSourceTree, "RF13-DIST source tree is not bound to the desktop manifest");
  assert.equal(rf13Manifest.release.version, expectedVersion, "RF13-DIST release version is not bound to the desktop manifest");
  const releaseIndexPath = repoRelativeFile(repoRoot, authority.release_index_path, "release index path");
  const releaseIndexBytes = readPinnedEvidenceBytes(releaseIndexPath, "release index", {
    expectedSha256: authority.release_index_sha256,
  });
  const releaseIndex = parsePinnedJson(releaseIndexBytes, "release index");
  assert.equal(rf13Manifest.release.release_index.sha256, authority.release_index_sha256, "RF13-DIST release index hash is not bound to authority");
  assert.equal(rf13Manifest.release.release_index.path, authority.release_index_path, "authority release index path is not bound to RF13-DIST");
  const indexedArtifact = rf13Manifest.artifacts.find(({ id }) => id === authority.artifact_id);
  assert.ok(indexedArtifact, "authority artifact_id is not present in RF13-DIST");
  assert.equal(indexedArtifact.platform, expectedPlatform, "indexed artifact platform is not bound to the desktop manifest");
  assert.equal(RF13_ARCHIVE_ARTIFACT_KINDS.has(indexedArtifact.kind), true, "RF13-DIST authority must select an indexed archive artifact");
  assert.equal(indexedArtifact.sha256, authority.indexed_artifact_sha256, "indexed artifact hash is not bound to RF13-DIST");
  assert.equal(releaseIndex.source_sha, expectedSourceSha, "release index source SHA is not bound to authority");
  assert.equal(releaseIndex.source_tree, expectedSourceTree, "release index source tree is not bound to authority");
  const indexedReleaseArtifact = releaseIndex.artifacts?.find(({ id }) => id === authority.artifact_id);
  assert.deepEqual(indexedReleaseArtifact, indexedArtifact, "release index artifact is not bound to RF13-DIST");
  const indexedArchivePath = repoRelativeFile(repoRoot, indexedArtifact.path, "indexed archive artifact path");
  const indexedArchiveBytes = readPinnedEvidenceBytes(indexedArchivePath, "indexed archive artifact", {
    expectedByteSize: indexedArtifact.bytes,
    expectedSha256: authority.indexed_artifact_sha256,
    maxBytes: MAX_ARCHIVE_EVIDENCE_BYTES,
  });
  const buildManifestId = expectedPlatform === "darwin" ? "macos_build_manifest" : "windows_build_manifest";
  const buildManifestArtifact = rf13Manifest.artifacts.find(({ id }) => id === buildManifestId);
  assert.ok(buildManifestArtifact, "RF13-DIST build manifest artifact is required for authority binding");
  assert.equal(buildManifestArtifact.sha256, artifactManifestSha256, "formal build manifest is not bound to RF13-DIST");
  const indexedBuildManifest = releaseIndex.artifacts?.find(({ id }) => id === buildManifestId);
  assert.deepEqual(indexedBuildManifest, buildManifestArtifact, "release index build manifest is not bound to RF13-DIST");
  const buildManifestPath = repoRelativeFile(repoRoot, buildManifestArtifact.path, "RF13 build manifest path");
  readPinnedEvidenceBytes(buildManifestPath, "RF13 build manifest", {
    expectedByteSize: buildManifestArtifact.bytes,
    expectedSha256: artifactManifestSha256,
  });
  const privacyMember = rf13Manifest.gates?.privacy?.members?.find(({ artifact_id: artifactId }) => artifactId === authority.artifact_id);
  assert.equal(rf13Manifest.gates?.privacy?.status, "PASS", "RF13-DIST privacy gate must be PASS");
  assert.ok(privacyMember?.receipt, "RF13-DIST privacy receipt is required for the selected archive artifact");
  assertExactKeys(privacyMember.receipt, ["path", "sha256"], "RF13 privacy receipt reference");
  assert.equal(privacyMember.receipt.path, authority.privacy_receipt_path, "privacy receipt path is not bound to RF13-DIST");
  assert.equal(privacyMember.receipt.sha256, authority.privacy_receipt_sha256, "privacy receipt hash is not bound to RF13-DIST");
  const privacyReceiptPath = repoRelativeFile(repoRoot, authority.privacy_receipt_path, "RF13 privacy receipt path");
  const privacyReceiptBytes = readPinnedEvidenceBytes(privacyReceiptPath, "RF13 privacy receipt", {
    expectedSha256: authority.privacy_receipt_sha256,
  });
  const privacyReceipt = parsePinnedJson(privacyReceiptBytes, "RF13 privacy receipt");
  validateRf13DistPrivacyMemberReceiptStructure(privacyReceipt, {
    artifact: indexedArtifact,
    artifactRoot: rf13Manifest.release.artifact_root,
    expectedBuildManifestSha256: buildManifestArtifact.sha256,
    expectedSourceSha,
    expectedSourceTree,
    repoRoot,
  });
  assert.equal(privacyReceipt.member_manifest_path, authority.member_manifest_path, "member manifest path is not bound to the privacy receipt");
  assert.equal(privacyReceipt.member_manifest_sha256, authority.member_manifest_sha256, "member manifest hash is not bound to the privacy receipt");
  const memberManifestPath = repoRelativeFile(repoRoot, authority.member_manifest_path, "RF13 member manifest path");
  assert.equal(path.posix.normalize(authority.member_manifest_path), authority.member_manifest_path, "member manifest path must be normalized");
  assert.ok(authority.member_manifest_path.startsWith(`${rf13Manifest.release.artifact_root}/evidence/`), "member manifest must be sealed under the RF13 evidence root");
  const memberManifestBytes = readPinnedEvidenceBytes(memberManifestPath, "RF13 member manifest", {
    expectedSha256: authority.member_manifest_sha256,
  });
  const memberManifest = parsePinnedJson(memberManifestBytes, "RF13 member manifest");
  const bundleName = path.basename(artifactStats.path);
  const prefixes = ["", `${bundleName}/`];
  const matchingPrefixes = prefixes.filter((prefix) => {
    const files = memberManifest.members
      .filter(({ type, path: memberPath }) => (type === "file" || type === "symlink") && memberPath.startsWith(prefix))
      .map(({ path: memberPath, type, sha256: digest, bytes }) => ({
        path: `./${memberPath.slice(prefix.length)}`,
        type,
        sha256: digest,
        bytes,
      }))
      .filter(({ path: memberPath }) => memberPath !== "./");
    if (files.length !== artifactStats.file_count) return false;
    if (files.reduce((sum, file) => sum + file.bytes, 0) !== artifactStats.bytes) return false;
    const canonicalManifest = canonicalBundleMemberManifest(files, { includeTypes: true });
    return sha256(canonicalManifest) === artifactStats.sha256;
  });
  assert.equal(matchingPrefixes.length, 1, "measured packaged bundle is not uniquely bound to RF13 extracted members");
  const sealedAtMs = isoTimestamp(rf13Manifest.sealed_at, "RF13-DIST sealed_at");
  assert.ok(sealedAtMs <= nowMs + MAX_CLOCK_SKEW_MS, "RF13-DIST sealed_at cannot be in the future");
  assert.ok(nowMs - sealedAtMs <= MAX_RECEIPT_FRESHNESS_MS, "RF13-DIST manifest is stale");
  return Object.freeze({
    authority: Object.freeze({ ...authority }),
    sealed_archive: Object.freeze({
      path: indexedArtifact.path,
      sha256: authority.indexed_artifact_sha256,
      bytes: indexedArchiveBytes.length,
    }),
  });
}

/**
 * Validate the exact packaged formal artifact before any process is launched.
 * The function is intentionally pure with respect to the product: it only
 * reads the supplied paths and an injected source state.
 */
export function validateFormalPackagedArtifact({
  artifactManifest,
  artifactManifestPath = null,
  artifactPath,
  rendererPath = null,
  expectedSourceSha,
  sourceState = null,
  hostPlatform = process.platform,
  requireHostPlatform = false,
  authority = null,
  repoRoot = process.cwd(),
  now = new Date(),
} = {}) {
  const exactSourceSha = validateExpectedSha(expectedSourceSha);
  const nowMs = now instanceof Date ? now.valueOf() : new Date(now).valueOf();
  assert.ok(Number.isFinite(nowMs), "artifact validation time must be valid");
  if (!artifactManifest || typeof artifactManifest !== "object") rejectArtifact("formal packaged artifact manifest is required");
  assertPathIsAbsolute(artifactPath, "artifact path");
  if (artifactManifestPath !== null) assertPathIsAbsolute(artifactManifestPath, "artifact manifest path");
  if (FORBIDDEN_ARTIFACT_MARKERS.test(path.basename(artifactPath)) || (artifactManifestPath && FORBIDDEN_ARTIFACT_MARKERS.test(path.basename(artifactManifestPath)))) {
    rejectArtifact("artifact path or manifest name identifies an internal, candidate, synthetic, private-local, or QA_ONLY artifact");
  }
  if (!existsSync(artifactPath)) rejectArtifact(`formal packaged artifact is missing: ${artifactPath}`);
  const artifactStat = lstatSync(artifactPath);
  if (artifactStat.isSymbolicLink()) rejectArtifact("formal packaged artifact path must not be a symlink");
  let artifactManifestBytes = null;
  if (artifactManifestPath) {
    try {
      assertRegularFile(artifactManifestPath, "artifact manifest");
    } catch (error) {
      rejectArtifact(error.message);
    }
  }
  if (artifactManifestPath) {
    try {
      artifactManifestBytes = readPinnedEvidenceBytes(artifactManifestPath, "artifact manifest");
    } catch (error) {
      rejectArtifact(`artifact manifest cannot be read from one pinned snapshot: ${error.message}`);
    }
    const onDiskManifest = parsePinnedJson(artifactManifestBytes, "artifact manifest");
    if (!compareManifest(onDiskManifest, artifactManifest)) rejectArtifact("supplied artifact manifest differs from the exact manifest file");
  }
  const manifest = validateManifestEnvelope(artifactManifest, exactSourceSha);
  validateSourceTree(manifest.source_tree);
  const builtAtMs = isoTimestamp(manifest.built_at, "formal manifest built_at");
  if (builtAtMs > nowMs + MAX_CLOCK_SKEW_MS) rejectArtifact("formal manifest built_at cannot be in the future");
  if (nowMs - builtAtMs > MAX_RECEIPT_FRESHNESS_MS) rejectArtifact("formal manifest is stale");
  if (requireHostPlatform) {
    const manifestPlatform = manifest.platform === "darwin" ? "darwin" : manifest.platform;
    if (manifestPlatform !== hostPlatform) rejectArtifact(`artifact platform ${manifestPlatform} does not match host ${hostPlatform}`);
  }
  const executablePath = manifest.platform === "darwin"
    ? path.join(artifactPath, "Contents", "MacOS", "matter")
    : path.join(artifactPath, "matter.exe");
  try {
    assertContainedPath(artifactPath, executablePath, "formal executable");
  } catch (error) {
    rejectArtifact(error.message);
  }
  if (!existsSync(executablePath) || !statSync(executablePath).isFile()) rejectArtifact(`formal executable is missing: ${executablePath}`);
  if (manifest.platform === "darwin" && (statSync(executablePath).mode & 0o111) === 0) rejectArtifact("formal macOS executable is not executable");
  const packagedManifestPath = releaseManifestPathForArtifact(artifactPath);
  if (packagedManifestPath) {
    try {
      assertContainedPath(artifactPath, packagedManifestPath, "packaged build manifest");
      assertRegularFile(packagedManifestPath, "packaged build manifest");
    } catch (error) {
      rejectArtifact(error.message);
    }
    let packagedManifestBytes;
    try {
      packagedManifestBytes = readPinnedEvidenceBytes(packagedManifestPath, "packaged build manifest");
    } catch (error) {
      rejectArtifact(`packaged build manifest cannot be read from one pinned snapshot: ${error.message}`);
    }
    const packagedManifest = parsePinnedJson(packagedManifestBytes, "packaged build manifest");
    if (!compareManifest(packagedManifest, manifest)) rejectArtifact("packaged build manifest does not match the exact supplied manifest");
  } else {
    rejectArtifact("formal packaged artifact is missing its packaged build manifest");
  }
  const resolvedRendererPath = rendererPath
    ? path.resolve(rendererPath)
    : manifest.platform === "darwin"
      ? path.join(artifactPath, "Contents", "Resources", "app", "src", "renderer", "web")
      : path.join(artifactPath, "resources", "app", "src", "renderer", "web");
  assertPathIsAbsolute(resolvedRendererPath, "renderer path");
  try {
    assertContainedPath(artifactPath, resolvedRendererPath, "renderer path");
  } catch (error) {
    rejectArtifact(error.message);
  }
  if (!existsSync(resolvedRendererPath) || !statSync(resolvedRendererPath).isDirectory()) {
    rejectArtifact(`formal renderer bundle is missing: ${resolvedRendererPath}`);
  }
  // The package authority follows RF13's canonical file/symlink member
  // semantics. Renderer provenance predates that contract and intentionally
  // remains a regular-file digest, so keep those two measurements explicit.
  const artifactStats = measureBundle(artifactPath, { includeSymlinks: true, includeTypes: true });
  const rendererStats = measureBundle(resolvedRendererPath, { includeSymlinks: false, includeTypes: false });
  if (rendererStats.sha256 !== manifest.renderer.sha256 || rendererStats.file_count !== manifest.renderer.file_count) {
    rejectArtifact("renderer bundle does not match the exact formal manifest", {
      expected_renderer: manifest.renderer,
      actual_renderer: rendererStats,
    });
  }
  const manifestSha256 = artifactManifestBytes ? sha256(artifactManifestBytes) : null;
  const executableSha256 = sha256(readPinnedEvidenceBytes(executablePath, "formal executable", {
    maxBytes: MAX_ARCHIVE_EVIDENCE_BYTES,
  }));
  const authorityEvidence = authority
    ? validateAuthorityEvidence(authority, {
      artifactStats,
      artifactManifestSha256: manifestSha256,
      expectedSourceSha: exactSourceSha,
      expectedSourceTree: manifest.source_tree,
      expectedVersion: manifest.version,
      expectedPlatform: manifest.platform,
      repoRoot,
      nowMs,
    })
    : null;
  const artifactEvidence = {
    ...artifactStats,
    manifest_path: artifactManifestPath,
    manifest_sha256: manifestSha256,
    manifest: clonePublicManifest(manifest),
    packaged_manifest_path: packagedManifestPath,
    executable_path: executablePath,
    executable_sha256: executableSha256,
    authority: authorityEvidence?.authority ?? null,
  };
  const source = validateSourceState(sourceState, exactSourceSha, manifest.source_tree);
  return Object.freeze({
    verdict: "PASS",
    manifest: clonePublicManifest(manifest),
    manifest_path: artifactManifestPath,
    artifact: Object.freeze(artifactEvidence),
    renderer: rendererStats,
    source,
    host_platform: hostPlatform,
    repo_root: realpathSync(repoRoot),
    sealed_archive: authorityEvidence?.sealed_archive ?? null,
  });
}

/**
 * Mint the cold-start capability only after RFD-TUW-007/RFD-TUW-018 has
 * inspected the exact archive bytes and extracted members in this process.
 * The returned object intentionally carries no serialized authority data;
 * identity in LIVE_COLD_START_AUTHORITY_VALIDATIONS is the trust boundary.
 */
export function mintColdStartAuthorityValidation({
  artifact,
  authority,
  privacyValidation,
  privacyArtifact = null,
} = {}) {
  assert.ok(artifact && artifact.verdict === "PASS", "formal packaged artifact validation is required");
  assert.ok(authority && typeof authority === "object", "sealed RF13-DIST authority is required");
  assertExactKeys(authority, AUTHORITY_KEYS, "sealed RF13-DIST authority");
  assert.ok(privacyArtifact && typeof privacyArtifact === "object", "live privacy artifact descriptor is required");
  assertDesktopArtifactPrivacyValidation(privacyValidation, {
    artifact_id: privacyArtifact.id,
    artifact_kind: privacyArtifact.kind,
    artifact_sha256: privacyArtifact.sha256,
    artifact_bytes: privacyArtifact.bytes,
    source_sha: artifact.source.source_sha,
    source_tree: artifact.source.source_tree,
    member_manifest_sha256: authority.member_manifest_sha256,
    verdict: "PASS",
  });
  assert.equal(privacyArtifact.id, authority.artifact_id, "live privacy artifact ID is not bound to RF13-DIST authority");
  assert.equal(privacyArtifact.sha256, authority.indexed_artifact_sha256, "live privacy artifact hash is not bound to RF13-DIST authority");
  assert.deepEqual(artifact.sealed_archive, {
    path: privacyArtifact.path,
    sha256: privacyArtifact.sha256,
    bytes: privacyArtifact.bytes,
  }, "live privacy artifact descriptor is not bound to the pinned RF13-DIST archive");
  const sealedAuthority = Object.fromEntries(AUTHORITY_KEYS.map((key) => [key, authority[key]]));
  const capability = Object.freeze({});
  LIVE_COLD_START_AUTHORITY_VALIDATIONS.add(capability);
  COLD_START_AUTHORITY_DETAILS.set(capability, Object.freeze({
    artifact_sha256: artifact.artifact.sha256,
    artifact_manifest_sha256: artifact.artifact.manifest_sha256,
    source_sha: artifact.source.source_sha,
    source_tree: artifact.source.source_tree,
    repo_root: artifact.repo_root,
    authority: Object.freeze(sealedAuthority),
    sealed_archive: artifact.sealed_archive,
    privacy_artifact_sha256: privacyValidation.artifact_sha256,
    privacy_member_manifest_sha256: privacyValidation.member_manifest_sha256,
  }));
  return capability;
}

export function assertColdStartAuthorityValidation(capability, expected = {}) {
  if (!capability || !LIVE_COLD_START_AUTHORITY_VALIDATIONS.has(capability)) {
    throw new Error("cold-start PASS requires an opaque same-process authority capability");
  }
  const details = COLD_START_AUTHORITY_DETAILS.get(capability);
  const labels = Object.freeze({
    rf13_dist_manifest_path: "RF13-DIST manifest path",
    rf13_dist_manifest_sha256: "RF13-DIST manifest hash",
    release_index_path: "release index path",
    release_index_sha256: "release index hash",
    artifact_id: "indexed artifact hash/ID",
    indexed_artifact_sha256: "indexed artifact hash",
    privacy_receipt_path: "privacy receipt path",
    privacy_receipt_sha256: "privacy receipt hash",
    member_manifest_path: "member manifest path",
    member_manifest_sha256: "member manifest hash",
  });
  for (const [key, value] of Object.entries(expected)) {
    if (value === undefined) continue;
    if (key.startsWith("authority.")) {
      const authorityKey = key.slice("authority.".length);
      assert.equal(details.authority[authorityKey], value, `cold-start ${labels[authorityKey] ?? "authority"} does not match ${key}`);
    } else {
      assert.equal(details[key], value, `cold-start authority does not match ${key}`);
    }
  }
  return capability;
}

function serializeCanonicalColdStartReceipt(receipt) {
  return `${JSON.stringify(receipt, null, 2)}\n`;
}

function coldStartRunSetSha256(receipt) {
  return sha256(Buffer.from(JSON.stringify(receipt.runs), "utf8"));
}

function mintColdStartMeasurementValidation({ receipt, artifact, fixtureSnapshotSha256 }) {
  assert.ok(artifact?.authority_validation, "canonical measurement requires live artifact authority");
  assertSha256(fixtureSnapshotSha256, "canonical authenticated-session snapshot SHA-256");
  assertColdStartAuthorityValidation(artifact.authority_validation, {
    artifact_sha256: receipt.artifact?.sha256,
    artifact_manifest_sha256: receipt.artifact?.manifest_sha256,
    source_sha: receipt.source?.source_sha,
    source_tree: receipt.source?.source_tree,
  });
  const serializedReceipt = serializeCanonicalColdStartReceipt(receipt);
  const capability = Object.freeze({});
  LIVE_COLD_START_MEASUREMENT_VALIDATIONS.add(capability);
  COLD_START_MEASUREMENT_DETAILS.set(capability, Object.freeze({
    producer: CANONICAL_COLD_START_PRODUCER,
    receipt_sha256: sha256(Buffer.from(serializedReceipt, "utf8")),
    receipt_bytes: Buffer.byteLength(serializedReceipt, "utf8"),
    run_set_sha256: coldStartRunSetSha256(receipt),
    artifact_sha256: receipt.artifact.sha256,
    artifact_manifest_sha256: receipt.artifact.manifest_sha256,
    source_sha: receipt.source.source_sha,
    source_tree: receipt.source.source_tree,
    fixture_snapshot_sha256: fixtureSnapshotSha256,
    artifact_authority_validation: artifact.authority_validation,
  }));
  return Object.freeze({ capability, serializedReceipt });
}

function assertColdStartMeasurementValidation(capability, receipt, receiptBytes = null) {
  if (!capability || !LIVE_COLD_START_MEASUREMENT_VALIDATIONS.has(capability)) {
    throw new Error("authoritative cold-start evidence requires an opaque canonical measurement capability");
  }
  const details = COLD_START_MEASUREMENT_DETAILS.get(capability);
  const canonicalText = serializeCanonicalColdStartReceipt(receipt);
  const canonicalBytes = Buffer.from(canonicalText, "utf8");
  if (!(Buffer.isBuffer(receiptBytes) || receiptBytes instanceof Uint8Array)) {
    throw new Error("authoritative cold-start receipt bytes must be the exact canonical producer byte buffer");
  }
  const suppliedBytes = Buffer.from(receiptBytes);
  if (!suppliedBytes.equals(canonicalBytes)) {
    throw new Error("authoritative cold-start receipt bytes are not the canonical producer serialization");
  }
  if (details.producer !== CANONICAL_COLD_START_PRODUCER
    || !SHA256_PATTERN.test(details.fixture_snapshot_sha256 ?? "")
    || details.receipt_sha256 !== sha256(suppliedBytes)
    || details.receipt_bytes !== suppliedBytes.length
    || details.run_set_sha256 !== coldStartRunSetSha256(receipt)
    || details.artifact_sha256 !== receipt.artifact?.sha256
    || details.artifact_manifest_sha256 !== receipt.artifact?.manifest_sha256
    || details.source_sha !== receipt.source?.source_sha
    || details.source_tree !== receipt.source?.source_tree) {
    throw new Error("canonical measurement capability does not match the exact cold-start receipt bytes, runs, source, or artifact");
  }
  return details;
}

/**
 * The authoritative cold-start boundary.  A serialized RF13 privacy receipt
 * is never sufficient: callers must provide the opaque capability minted by
 * the live archive/member inspection and keep it in memory through receipt
 * validation and publication.
 */
export async function validateFormalPackagedArtifactAuthoritatively({
  privacyValidation,
  privacyArtifact = null,
  ...options
} = {}) {
  const validated = validateFormalPackagedArtifact(options);
  const authorityValidation = mintColdStartAuthorityValidation({
    artifact: validated,
    authority: options.authority,
    privacyValidation,
    privacyArtifact,
  });
  return Object.freeze({ ...validated, authority_validation: authorityValidation });
}

/**
 * Same-process receipt boundary.  The sync validator intentionally rejects a
 * serialized PASS; only this async entry point may accept one, and only with
 * the opaque capability still held by the caller.
 */
export async function validateColdStartReceiptAuthoritatively(receipt, options = {}) {
  if (receipt?.status === "BLOCKED_BY_ARTIFACT" || receipt?.status === "BLOCKED_BY_EXECUTION_GUARD") {
    return Object.freeze({
      receipt: validateColdStartReceipt(receipt, { ...options, measurementValidation: null, receiptBytes: null }),
      sealed_archive: null,
    });
  }
  if (!options.measurementValidation) {
    throw new Error("authoritative cold-start evidence requires an opaque canonical measurement capability");
  }
  const validatedReceipt = validateColdStartReceipt(receipt, options);
  const measurement = assertColdStartMeasurementValidation(
    options.measurementValidation,
    receipt,
    options.receiptBytes ?? null,
  );
  const authority = COLD_START_AUTHORITY_DETAILS.get(measurement.artifact_authority_validation);
  assert.ok(authority?.sealed_archive, "canonical measurement authority lacks a pinned RF13-DIST archive descriptor");
  return Object.freeze({
    receipt: validatedReceipt,
    sealed_archive: authority.sealed_archive,
  });
}

function safeOsReleaseMajor(value) {
  const match = String(value ?? "").match(/^([0-9]+)/u);
  return match?.[1] ?? "unknown";
}

function memoryBucket(value) {
  const gib = Number(value) / (1024 ** 3);
  if (!Number.isFinite(gib) || gib <= 0) return "unknown";
  if (gib < 4) return "lt4";
  if (gib < 8) return "4to8";
  if (gib < 16) return "8to16";
  if (gib < 32) return "16to32";
  return "gte32";
}

/** Return a host fingerprint without hostname, username, home paths, or raw env. */
export function sanitizedHostFingerprint({
  platformName = platform(),
  architecture = arch(),
  osRelease = release(),
  cpuCount = cpus().length,
  memoryBytes = totalmem(),
} = {}) {
  const safe = {
    platform: SAFE_TOKEN_PATTERN.test(String(platformName)) ? String(platformName) : "unknown",
    arch: SAFE_TOKEN_PATTERN.test(String(architecture)) ? String(architecture) : "unknown",
    os_release_major: safeOsReleaseMajor(osRelease),
    cpu_count: Number.isInteger(cpuCount) && cpuCount > 0 ? cpuCount : 0,
    memory_gib_bucket: memoryBucket(memoryBytes),
  };
  return Object.freeze({
    ...safe,
    fingerprint_sha256: sha256(JSON.stringify(safe)),
    sanitized: true,
  });
}

function assertSafeHostFingerprint(value, label = "host fingerprint") {
  assert.ok(value && typeof value === "object", `${label} is required`);
  assertExactKeys(value, [
    "platform",
    "arch",
    "os_release_major",
    "cpu_count",
    "memory_gib_bucket",
    "fingerprint_sha256",
    "sanitized",
  ], label);
  assert.equal(value.sanitized, true, `${label} must be sanitized`);
  assert.match(value.fingerprint_sha256 ?? "", SHA256_PATTERN, `${label} hash is invalid`);
  for (const key of ["platform", "arch", "os_release_major", "memory_gib_bucket"]) {
    assert.equal(typeof value[key], "string", `${label}.${key} must be a string`);
    assert.match(value[key], SAFE_TOKEN_PATTERN, `${label}.${key} contains unsafe characters`);
    assert.doesNotMatch(value[key], /(?:home|user|name|tmp|private|password|secret|@)/iu, `${label} contains sensitive text`);
  }
  assert.ok(Number.isInteger(value.cpu_count) && value.cpu_count > 0, `${label}.cpu_count must be positive`);
  const canonical = {
    platform: value.platform,
    arch: value.arch,
    os_release_major: value.os_release_major,
    cpu_count: value.cpu_count,
    memory_gib_bucket: value.memory_gib_bucket,
  };
  assert.equal(value.fingerprint_sha256, sha256(JSON.stringify(canonical)), `${label} hash does not match its sanitized fields`);
  return value;
}

function isoTimestamp(value, label) {
  assert.equal(typeof value, "string", `${label} is required`);
  const parsed = new Date(value);
  assert.equal(Number.isNaN(parsed.valueOf()), false, `${label} must be an ISO timestamp`);
  assert.equal(parsed.toISOString(), value, `${label} must be canonical ISO`);
  return parsed.valueOf();
}

function finiteNonNegative(value, label) {
  assert.equal(typeof value, "number", `${label} is required`);
  assert.ok(Number.isFinite(value) && value >= 0, `${label} must be finite and non-negative`);
  return value;
}

export function validateColdStartRun(run, {
  expectedHostFingerprint = null,
  allowFailure = false,
  strictTiming = false,
  nowMs = Date.now(),
} = {}) {
  assert.ok(run && typeof run === "object", "cold-start run is required");
  const allowedKeys = Object.keys(run).includes("error") ? [...RUN_KEYS, ...RUN_FAILURE_KEYS] : RUN_KEYS;
  assertExactKeys(run, allowedKeys, "cold-start run");
  assert.ok(Number.isInteger(run.run_index) && run.run_index >= 1, "run_index must be a positive integer");
  assert.match(run.run_id ?? "", RUN_ID_PATTERN, "run_id must be an opaque identifier");
  assertSha256(run.user_data_path_digest, "user_data_path_digest");
  assert.equal(run.isolated_user_data_created, true, "isolated userData creation must be proven");
  assert.equal(typeof run.cleanup_attempted, "boolean", "cleanup_attempted must be boolean");
  assert.equal(typeof run.cleanup_succeeded, "boolean", "cleanup_succeeded must be boolean");
  assert.equal(typeof run.post_cleanup_exists, "boolean", "post_cleanup_exists must be boolean");
  if (run.cleanup_succeeded) assert.equal(run.cleanup_attempted, true, "successful cleanup must be attempted");
  if (run.post_cleanup_exists) assert.equal(run.cleanup_succeeded, false, "post-cleanup residue cannot accompany successful cleanup");
  const processStartMs = isoTimestamp(run.process_start_at, "process_start_at");
  const rendererReadyMs = isoTimestamp(run.renderer_ready_at, "renderer_ready_at");
  const homeObserved = run.home_ready_observed === true;
  const homeReadyMs = run.home_ready_at === null && allowFailure
    ? null
    : isoTimestamp(run.home_ready_at, "home_ready_at");
  assert.ok(rendererReadyMs >= processStartMs, "renderer ready must follow process start");
  if (strictTiming) {
    assertFreshTimestamp(run.process_start_at, "process_start_at", nowMs);
    assertFreshTimestamp(run.renderer_ready_at, "renderer_ready_at", nowMs);
  }
  if (run.error !== undefined) assert.equal(typeof run.error, "string", "run.error must be a string");
  const durationMs = finiteNonNegative(run.duration_ms, "duration_ms");
  if (homeObserved) {
    if (strictTiming) assertFreshTimestamp(run.home_ready_at, "home_ready_at", nowMs);
    assert.ok(homeReadyMs >= rendererReadyMs, "Home-ready must follow renderer ready");
    const expectedDurationMs = homeReadyMs - processStartMs;
    if (strictTiming) {
      assert.equal(expectedDurationMs, durationMs, "duration_ms must equal process-to-Home timestamp delta");
    } else {
      assert.ok(Math.abs(expectedDurationMs - durationMs) < 100, "duration_ms must equal process-to-Home timestamp delta");
    }
  } else if (!allowFailure) {
    throw new Error("Home-ready event is required");
  }
  assert.equal(Number.isInteger(run.exit_code), true, "exit_code must be an integer");
  assert.ok(run.signal === null || typeof run.signal === "string", "signal must be null or a string");
  for (const key of ["error_count", "console_count", "console_error_count"]) {
    assert.ok(Number.isInteger(run[key]) && run[key] >= 0, `${key} must be a non-negative integer`);
  }
  const host = assertSafeHostFingerprint(run.host_fingerprint);
  if (expectedHostFingerprint) assert.equal(host.fingerprint_sha256, expectedHostFingerprint.fingerprint_sha256, "cold-start runs must use the same host");
  assert.equal(typeof run.home_ready_observed, "boolean", "home_ready_observed must be boolean");
  return Object.freeze({
    ...run,
    host_fingerprint: host,
    duration_ms: Math.round(durationMs * 1000) / 1000,
  });
}

/** Linear interpolation on the [0,n-1] rank; p95 for five samples is between p4 and p5. */
export function percentile(values, fraction) {
  assert.ok(Array.isArray(values) && values.length > 0, "percentile requires at least one value");
  assert.ok(Number.isFinite(fraction) && fraction >= 0 && fraction <= 1, "percentile fraction must be between 0 and 1");
  const sorted = values.map((value) => finiteNonNegative(value, "percentile sample")).toSorted((left, right) => left - right);
  const position = (sorted.length - 1) * fraction;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  if (lowerIndex === upperIndex) return sorted[lowerIndex];
  const ratio = position - lowerIndex;
  return sorted[lowerIndex] + (sorted[upperIndex] - sorted[lowerIndex]) * ratio;
}

export function summarizeColdStartRuns(runs, {
  artifact,
  renderer,
  hostFingerprint,
  source,
  userDataRoot = null,
  inputs = null,
  status = "PASS",
  blockers = [],
} = {}) {
  if (!Array.isArray(runs)) throw new Error("cold-start runs must be an array");
  const expectedHostFingerprint = hostFingerprint ?? runs[0]?.host_fingerprint ?? null;
  const normalizedRuns = runs.map((run) => validateColdStartRun(run, { expectedHostFingerprint, allowFailure: true }));
  const durations = normalizedRuns.map((run) => run.duration_ms);
  const allSuccessful = normalizedRuns.length === REQUIRED_RUN_COUNT
    && normalizedRuns.every((run) => run.exit_code === 0
      && run.signal === null
      && run.error_count === 0
      && run.console_count === 0
      && run.console_error_count === 0
      && run.home_ready_observed === true
      && run.isolated_user_data_created === true
      && run.cleanup_attempted === true
      && run.cleanup_succeeded === true
      && run.post_cleanup_exists === false
      && !Object.hasOwn(run, "error"));
  const cleanupFailed = normalizedRuns.some((run) => (
    run.cleanup_attempted !== true || run.cleanup_succeeded !== true || run.post_cleanup_exists !== false
  ));
  const finalStatus = cleanupFailed
    ? "RECOVERY_REQUIRED"
    : status === "PASS"
      ? (normalizedRuns.length === REQUIRED_RUN_COUNT && allSuccessful && blockers.length === 0 ? "PASS" : "FAILED_CLOSED")
      : status;
  const finalBlockers = finalStatus === "PASS"
    ? [...blockers]
    : [...new Set([
      ...blockers,
      ...(cleanupFailed ? ["authenticated isolated userData cleanup failed; manual recovery is required"] : []),
      ...(!cleanupFailed && finalStatus !== "RECOVERY_REQUIRED"
        ? ["one or more cold-start runs did not meet the exit/error/console/Home-ready contract"]
        : []),
    ])];
  return Object.freeze({
    schema_version: COLD_START_SCHEMA,
    generated_at: new Date().toISOString(),
    status: finalStatus,
    blockers: finalBlockers,
    required_run_count: REQUIRED_RUN_COUNT,
    run_count: normalizedRuns.length,
    percentile_method: PERCENTILE_METHOD,
    median_ms: durations.length ? percentile(durations, 0.5) : null,
    p95_ms: durations.length ? percentile(durations, 0.95) : null,
    artifact: normalizedRuns.length ? artifact ?? null : null,
    renderer: normalizedRuns.length ? renderer ?? null : null,
    source: normalizedRuns.length ? source ?? null : null,
    host_fingerprint: expectedHostFingerprint,
    // Authenticated session paths are deliberately never emitted. The
    // per-run digest and opaque run ID are sufficient to correlate a private
    // cleanup audit without retaining private profile locations in evidence.
    user_data_root: null,
    runs: normalizedRuns,
    inputs: {
      artifact_manifest_path: inputs?.artifact_manifest_path ?? artifact?.manifest_path ?? null,
      artifact_path: inputs?.artifact_path ?? artifact?.path ?? null,
      rf13_dist_manifest_path: inputs?.rf13_dist_manifest_path ?? artifact?.authority?.rf13_dist_manifest_path ?? null,
      expected_source_sha: inputs?.expected_source_sha ?? source?.source_sha ?? null,
    },
    claims: {
      formal_artifact_baseline: finalStatus === "PASS",
      historical_rf13_internal_artifact_used: false,
      production_go_live: false,
      public_release: false,
    },
  });
}

function uniquePathKey(value) {
  return path.resolve(value);
}

async function assertFreshUserDataPath(userDataPath, seenPaths) {
  assertPathIsAbsolute(userDataPath, "user_data_path");
  const key = existsSync(userDataPath) ? realpathSync(userDataPath) : uniquePathKey(userDataPath);
  if (seenPaths.has(key)) throw new Error(`userData path was reused: ${userDataPath}`);
  seenPaths.add(key);
  if (existsSync(userDataPath)) {
    if (lstatSync(userDataPath).isSymbolicLink()) throw new Error(`userData path must not be a symlink: ${userDataPath}`);
    const entries = await readdir(userDataPath);
    if (entries.length > 0) throw new Error(`userData path must start empty: ${userDataPath}`);
  } else {
    await mkdir(userDataPath, { recursive: true });
  }
}

export async function createIsolatedUserDataPath(prefix = "matter-cold-start-") {
  return mkdtemp(path.join(tmpdir(), prefix));
}

async function createIsolatedUserDataRoot(prefix = "matter-cold-start-runs-") {
  return mkdtemp(path.join(tmpdir(), prefix));
}

/**
 * Measure five launches. `launchProcess` is injected so unit tests can prove
 * the contract without launching Electron; the production CLI supplies the
 * real Electron launcher.
 */
export async function measureColdStartRuns({
  artifact,
  launchProcess,
  userDataFactory = null,
  userDataRoot = null,
  hostFingerprint = sanitizedHostFingerprint(),
  runCount = REQUIRED_RUN_COUNT,
  cleanupUserData = true,
  prepareUserData = null,
} = {}) {
  assert.ok(artifact && artifact.verdict === "PASS", "a validated formal artifact is required");
  assert.equal(typeof launchProcess, "function", "launchProcess injection is required");
  assert.equal(runCount, REQUIRED_RUN_COUNT, `exactly ${REQUIRED_RUN_COUNT} cold-start runs are required`);
  assert.equal(cleanupUserData, true, "authenticated isolated userData must always be cleaned up");
  const expectedHostFingerprint = assertSafeHostFingerprint(hostFingerprint);
  const seenPaths = new Set();
  const runs = [];
  let rootCleanupFailed = false;
  const effectiveUserDataRoot = userDataRoot
    ? canonicalPath(userDataRoot, "user_data_root")
    : await createIsolatedUserDataRoot();
  if (userDataRoot) {
    if (existsSync(effectiveUserDataRoot) && lstatSync(effectiveUserDataRoot).isSymbolicLink()) {
      throw new Error("userData root must not be a symlink");
    }
    await mkdir(effectiveUserDataRoot, { recursive: true });
  }
  const makeUserDataPath = userDataFactory ?? (({ runIndex, userDataRoot: root }) => {
    const child = path.join(root, `run-${runIndex}`);
    return mkdir(child, { recursive: true }).then(() => child);
  });
  try {
    for (let runIndex = 1; runIndex <= runCount; runIndex += 1) {
      const userDataPath = await makeUserDataPath({ runIndex, userDataRoot: effectiveUserDataRoot });
      await assertFreshUserDataPath(userDataPath, seenPaths);
      const runId = randomUUID();
      const userDataPathDigest = sha256(Buffer.from(path.resolve(userDataPath), "utf8"));
      const startupLogPath = path.join(effectiveUserDataRoot, "launch-telemetry", `${runId}.log`);
      let cleanupAttempted = false;
      let cleanupSucceeded = false;
      let postCleanupExists = true;
      let launchResult;
      try {
        try {
          if (prepareUserData) {
            assert.equal(typeof prepareUserData, "function", "prepareUserData must be a function");
            await prepareUserData({
              run_index: runIndex,
              user_data_path: userDataPath,
              user_data_root: effectiveUserDataRoot,
              startup_log_path: startupLogPath,
              artifact,
              host_fingerprint: expectedHostFingerprint,
            });
          }
          launchResult = await launchProcess({
            run_index: runIndex,
            user_data_path: userDataPath,
            user_data_root: effectiveUserDataRoot,
            startup_log_path: startupLogPath,
            artifact,
            host_fingerprint: expectedHostFingerprint,
          });
        } catch (error) {
          const now = new Date().toISOString();
          launchResult = {
            process_start_at: now,
            renderer_ready_at: now,
            home_ready_at: null,
            duration_ms: 0,
            exit_code: 1,
            signal: null,
            error_count: 1,
            console_count: 0,
            console_error_count: 0,
            home_ready_observed: false,
            error: String(error?.message ?? error)
              .replaceAll(userDataPath, "<isolated-user-data>")
              .replaceAll(effectiveUserDataRoot, "<isolated-user-data-root>"),
          };
        }
      } catch (error) {
        // The nested launch/prepare guard above is intentionally exhaustive;
        // retain a closed fallback if an injected implementation violates it.
        const now = new Date().toISOString();
        launchResult = {
          process_start_at: now,
          renderer_ready_at: now,
          home_ready_at: null,
          duration_ms: 0,
          exit_code: 1,
          signal: null,
          error_count: 1,
          console_count: 0,
          console_error_count: 0,
          home_ready_observed: false,
          error: String(error?.message ?? error)
            .replaceAll(userDataPath, "<isolated-user-data>")
            .replaceAll(effectiveUserDataRoot, "<isolated-user-data-root>"),
        };
      } finally {
        cleanupAttempted = true;
        try {
          await rm(userDataPath, { recursive: true, force: true });
          cleanupSucceeded = true;
        } catch {
          cleanupSucceeded = false;
        }
        postCleanupExists = existsSync(userDataPath);
      }
      if (launchResult && typeof launchResult.error === "string") {
        launchResult = {
          ...launchResult,
          error: launchResult.error
            .replaceAll(userDataPath, "<isolated-user-data>")
            .replaceAll(effectiveUserDataRoot, "<isolated-user-data-root>")
            .replaceAll(tmpdir(), "<isolated-tmp>")
            .replaceAll(process.env.HOME ?? "", "<home>"),
        };
      }
      const run = validateColdStartRun({
        ...launchResult,
        run_index: runIndex,
        run_id: runId,
        user_data_path_digest: userDataPathDigest,
        isolated_user_data_created: true,
        cleanup_attempted: cleanupAttempted,
        cleanup_succeeded: cleanupSucceeded,
        post_cleanup_exists: postCleanupExists,
        host_fingerprint: expectedHostFingerprint,
      }, { expectedHostFingerprint, allowFailure: true });
      runs.push(run);
    }
  } finally {
    // Per-run cleanup above is the authoritative deletion boundary. Remove the
    // containing root as a second defense, including caller-supplied roots.
    try {
      await rm(effectiveUserDataRoot, { recursive: true, force: true });
      rootCleanupFailed = existsSync(effectiveUserDataRoot);
    } catch {
      rootCleanupFailed = true;
    }
  }
  return summarizeColdStartRuns(runs, {
    artifact: artifact.artifact,
    renderer: artifact.renderer,
    source: artifact.source,
    hostFingerprint: expectedHostFingerprint,
    userDataRoot: effectiveUserDataRoot,
    status: rootCleanupFailed ? "RECOVERY_REQUIRED" : "PASS",
    blockers: rootCleanupFailed ? ["authenticated isolated userData root cleanup failed; manual recovery is required"] : [],
  });
}

function sessionFixtureNodeSnapshot(nodePath, relativePath) {
  const metadata = lstatSync(nodePath, { bigint: true });
  assert.equal(metadata.isSymbolicLink(), false, "authenticated session fixture cannot contain symlinks");
  assert.ok(metadata.isDirectory() || metadata.isFile(), "authenticated session fixture contains an unsupported entry");
  if (typeof process.getuid === "function") {
    assert.equal(metadata.uid, BigInt(process.getuid()), "authenticated session fixture must be owned by the current user");
  }
  assert.equal(metadata.mode & 0o077n, 0n, "authenticated session fixture must not grant group or other permissions");
  if (metadata.isDirectory()) {
    assert.equal(metadata.mode & 0o7777n, 0o700n, "authenticated session fixture directories must use exactly mode 0700");
  } else {
    assert.equal(metadata.mode & 0o7777n, 0o600n, "authenticated session fixture files must use exactly mode 0600");
    assert.equal(metadata.nlink, 1n, "authenticated session fixture files must not be hard linked");
  }
  return Object.freeze({
    relative_path: relativePath,
    type: metadata.isDirectory() ? "directory" : "file",
    dev: metadata.dev,
    ino: metadata.ino,
    mode: metadata.mode,
    size: metadata.size,
    mtime_ns: metadata.mtimeNs,
    ctime_ns: metadata.ctimeNs,
  });
}

function sameSessionFixtureNode(left, right) {
  return left.relative_path === right.relative_path
    && left.type === right.type
    && left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.size === right.size
    && left.mtime_ns === right.mtime_ns
    && left.ctime_ns === right.ctime_ns;
}

function scanSessionFixtureMetadata(root) {
  const nodes = [];
  const visit = (currentPath, relativePath) => {
    const snapshot = sessionFixtureNodeSnapshot(currentPath, relativePath);
    nodes.push(snapshot);
    if (snapshot.type !== "directory") return;
    const entries = readdirSync(currentPath, { withFileTypes: true })
      .map(({ name }) => name)
      .toSorted(compareCodePointText);
    for (const name of entries) {
      const childRelativePath = relativePath === "." ? name : `${relativePath}/${name}`;
      visit(path.join(currentPath, name), childRelativePath);
    }
  };
  visit(root, ".");
  return nodes;
}

function capturePinnedSessionFixture(fixturePath, { repoRoot, __testHooks = null } = {}) {
  assertPathIsAbsolute(fixturePath, "authenticated session fixture");
  const root = path.resolve(fixturePath);
  const resolvedRoot = realpathSync(root);
  assert.equal(resolvedRoot, root, "authenticated session fixture must not traverse a symlink");
  assertPathIsAbsolute(repoRoot, "authenticated session repository root");
  const resolvedRepoRoot = realpathSync(repoRoot);
  assert.ok(
    !isWithin(resolvedRepoRoot, root) && !isWithin(root, resolvedRepoRoot),
    "authenticated session fixture must remain outside and disjoint from the repository",
  );
  const initialNodes = scanSessionFixtureMetadata(root);
  assert.equal(initialNodes[0]?.type, "directory", "authenticated session fixture must be a directory");
  const files = [];
  let totalBytes = 0;
  for (const node of initialNodes) {
    if (node.type !== "file") continue;
    const absolutePath = path.join(root, ...node.relative_path.split("/"));
    const bytes = readApprovedProgramBytes(absolutePath, {
      approvedRoots: [root],
      maxBytes: MAX_SESSION_FIXTURE_FILE_BYTES,
      __testHooks,
    });
    const afterRead = sessionFixtureNodeSnapshot(absolutePath, node.relative_path);
    assert.ok(sameSessionFixtureNode(node, afterRead), "authenticated session fixture changed while it was snapshotted");
    totalBytes += bytes.length;
    assert.ok(totalBytes <= MAX_SESSION_FIXTURE_TOTAL_BYTES, "authenticated session fixture exceeds its private snapshot size boundary");
    files.push(Object.freeze({
      relative_path: node.relative_path,
      bytes,
      byte_size: bytes.length,
      sha256: sha256(bytes),
    }));
  }
  const finalNodes = scanSessionFixtureMetadata(root);
  assert.equal(finalNodes.length, initialNodes.length, "authenticated session fixture changed while it was snapshotted");
  for (let index = 0; index < initialNodes.length; index += 1) {
    assert.ok(
      sameSessionFixtureNode(initialNodes[index], finalNodes[index]),
      "authenticated session fixture changed while it was snapshotted",
    );
  }
  assert.ok(
    files.some(({ relative_path: relativePath }) => relativePath === "secure-session-store.json"),
    "authenticated session fixture must contain secure-session-store.json",
  );
  const directories = initialNodes
    .filter(({ type, relative_path: relativePath }) => type === "directory" && relativePath !== ".")
    .map(({ relative_path: relativePath }) => relativePath);
  const digestRecords = [
    ...directories.map((relativePath) => ({ path: relativePath, type: "directory" })),
    ...files.map((file) => ({
      path: file.relative_path,
      type: "file",
      bytes: file.byte_size,
      sha256: file.sha256,
    })),
  ].toSorted((left, right) => compareCodePointText(left.path, right.path));
  return Object.freeze({
    directories: Object.freeze(directories),
    files: Object.freeze(files),
    total_bytes: totalBytes,
    sha256: sha256(Buffer.from(JSON.stringify(digestRecords), "utf8")),
  });
}

async function materializePrivateSessionSnapshot(captured) {
  const snapshotRoot = await mkdtemp(path.join(tmpdir(), "matter-auth-session-snapshot-"));
  try {
    await chmod(snapshotRoot, 0o700);
    for (const relativePath of captured.directories) {
      const directoryPath = path.join(snapshotRoot, ...relativePath.split("/"));
      await mkdir(directoryPath, { recursive: true, mode: 0o700 });
      await chmod(directoryPath, 0o700);
    }
    for (const file of captured.files) {
      const filePath = path.join(snapshotRoot, ...file.relative_path.split("/"));
      await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
      await writeFile(filePath, file.bytes, { flag: "wx", mode: 0o600 });
      await chmod(filePath, 0o600);
      readApprovedSourceBytes(filePath, {
        approvedRoots: [snapshotRoot],
        expectedByteSize: file.byte_size,
        expectedSha256: file.sha256,
        maxBytes: MAX_SESSION_FIXTURE_FILE_BYTES,
      });
    }
    return Object.freeze({
      root: snapshotRoot,
      directories: captured.directories,
      files: captured.files,
      total_bytes: captured.total_bytes,
      sha256: captured.sha256,
    });
  } catch (error) {
    await rm(snapshotRoot, { recursive: true, force: true });
    throw error;
  }
}

async function copyPrivateSessionSnapshot(snapshot, userDataPath) {
  for (const relativePath of snapshot.directories) {
    const targetPath = path.join(userDataPath, ...relativePath.split("/"));
    await mkdir(targetPath, { recursive: true, mode: 0o700 });
    await chmod(targetPath, 0o700);
  }
  for (const file of snapshot.files) {
    const snapshotPath = path.join(snapshot.root, ...file.relative_path.split("/"));
    const targetPath = path.join(userDataPath, ...file.relative_path.split("/"));
    const bytes = readApprovedSourceBytes(snapshotPath, {
      approvedRoots: [snapshot.root],
      expectedByteSize: file.byte_size,
      expectedSha256: file.sha256,
      maxBytes: MAX_SESSION_FIXTURE_FILE_BYTES,
    });
    await mkdir(path.dirname(targetPath), { recursive: true, mode: 0o700 });
    await writeFile(targetPath, bytes, { flag: "wx", mode: 0o600 });
    await chmod(targetPath, 0o600);
  }
}

async function createPrivateSessionSnapshot(fixturePath, options = {}) {
  return materializePrivateSessionSnapshot(capturePinnedSessionFixture(fixturePath, options));
}

export async function __testOnlySnapshotAuthenticatedSessionFixture(fixturePath, options = {}) {
  const snapshot = await createPrivateSessionSnapshot(fixturePath, options);
  try {
    return Object.freeze({
      file_count: snapshot.files.length,
      total_bytes: snapshot.total_bytes,
    });
  } finally {
    await rm(snapshot.root, { recursive: true, force: true });
  }
}

/**
 * Production measurement boundary.  It intentionally accepts no launcher,
 * factory, preparation callback, host override, or receipt input.  The fixed
 * Electron/Playwright observer is loaded from the canonical producer module,
 * and only this boundary mints measurement authority.
 */
export async function measureColdStartRunsCanonically({
  artifact,
  authenticatedSessionFixturePath,
  timeoutMs = 45_000,
} = {}) {
  assert.ok(artifact?.authority_validation, "canonical cold-start measurement requires an authoritative artifact");
  assert.ok(Number.isFinite(timeoutMs) && timeoutMs > 0 && timeoutMs <= 5 * 60_000, "canonical cold-start timeout must be between 1ms and 5 minutes");
  const artifactAuthority = COLD_START_AUTHORITY_DETAILS.get(artifact.authority_validation);
  assert.ok(artifactAuthority?.repo_root, "canonical cold-start artifact authority lacks a repository boundary");
  const fixtureSnapshot = await createPrivateSessionSnapshot(authenticatedSessionFixturePath, {
    repoRoot: artifactAuthority.repo_root,
  });
  try {
    const producer = await import("../run-matter-desktop-cold-start-probe.mjs");
    assert.equal(typeof producer.launchElectronProcess, "function", "canonical Electron/Playwright observer is unavailable");
    const receipt = await measureColdStartRuns({
      artifact,
      hostFingerprint: sanitizedHostFingerprint(),
      cleanupUserData: true,
      prepareUserData: ({ user_data_path: userDataPath }) => copyPrivateSessionSnapshot(fixtureSnapshot, userDataPath),
      launchProcess: (input) => producer.launchElectronProcess({ ...input, timeoutMs }),
    });
    const measurement = mintColdStartMeasurementValidation({
      receipt,
      artifact,
      fixtureSnapshotSha256: fixtureSnapshot.sha256,
    });
    return Object.freeze({
      receipt,
      serialized_receipt: measurement.serializedReceipt,
      measurement_validation: measurement.capability,
    });
  } finally {
    await rm(fixtureSnapshot.root, { recursive: true, force: true });
  }
}

export function sourceIdentityFromGit(repoRoot) {
  assertPathIsAbsolute(repoRoot, "repoRoot");
  const git = (args) => execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
  return {
    source_sha: git(["rev-parse", "HEAD"]),
    source_tree: git(["rev-parse", "HEAD^{tree}"]),
    source_dirty: git(["status", "--porcelain", "--untracked-files=all"]).length > 0,
  };
}

function canonicalGitOutput(repoRoot, args, label) {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    rejectArtifact(`${label} could not be proven by Git`, {
      git_arguments: args,
      exit_status: Number.isInteger(error?.status) ? error.status : null,
    });
  }
}

function canonicalGitRepoRoot(repoRoot) {
  assertPathIsAbsolute(repoRoot, "repoRoot");
  let root;
  try {
    root = realpathSync(repoRoot);
  } catch {
    rejectArtifact("repository root is missing or unreadable");
  }
  const gitRootText = canonicalGitOutput(root, ["rev-parse", "--show-toplevel"], "repository root");
  let gitRoot;
  try {
    gitRoot = realpathSync(gitRootText);
  } catch {
    rejectArtifact("Git repository root is missing or unreadable");
  }
  if (gitRoot !== root) rejectArtifact("repoRoot must be the actual Git worktree root");
  return root;
}

function gitCommitAndTree(repoRoot, sourceSha, label) {
  canonicalGitOutput(repoRoot, ["cat-file", "-e", `${sourceSha}^{commit}`], `${label} commit`);
  const commit = canonicalGitOutput(repoRoot, ["rev-parse", "--verify", `${sourceSha}^{commit}`], `${label} commit`);
  const tree = canonicalGitOutput(repoRoot, ["rev-parse", "--verify", `${sourceSha}^{tree}`], `${label} tree`);
  if (commit !== sourceSha || !GIT_OBJECT_PATTERN.test(commit) || !GIT_OBJECT_PATTERN.test(tree)) {
    rejectArtifact(`${label} must resolve to the exact full commit and tree`);
  }
  return Object.freeze({ commit, tree });
}

function gitHeadSnapshot(repoRoot) {
  const head = gitCommitAndTree(
    repoRoot,
    canonicalGitOutput(repoRoot, ["rev-parse", "--verify", "HEAD^{commit}"], "current HEAD"),
    "current HEAD",
  );
  const status = canonicalGitOutput(repoRoot, ["status", "--porcelain", "--untracked-files=all"], "current worktree status");
  return Object.freeze({ source_sha: head.commit, source_tree: head.tree, status });
}

/**
 * Prove a receipt source against immutable Git objects without exposing a
 * caller-controlled historical-source switch.  This is invoked only after an
 * opaque live archive/privacy capability has matched the receipt bindings.
 */
function validateAuthoritativeReceiptSource(repoRoot, receiptSource, expectedSnapshot = null) {
  const root = canonicalGitRepoRoot(repoRoot);
  const beforeHead = gitHeadSnapshot(root);
  const beforeSource = gitCommitAndTree(root, receiptSource.source_sha, "cold-start receipt source");
  if (beforeSource.tree !== receiptSource.source_tree) {
    rejectArtifact("cold-start receipt source tree does not match its Git commit", {
      expected_source_tree: receiptSource.source_tree,
      git_source_tree: beforeSource.tree,
    });
  }
  canonicalGitOutput(
    root,
    ["merge-base", "--is-ancestor", beforeSource.commit, beforeHead.source_sha],
    "cold-start receipt source ancestry",
  );
  const afterSource = gitCommitAndTree(root, receiptSource.source_sha, "cold-start receipt source revalidation");
  const afterHead = gitHeadSnapshot(root);
  if (beforeHead.source_sha !== afterHead.source_sha
    || beforeHead.source_tree !== afterHead.source_tree
    || beforeHead.status !== afterHead.status
    || beforeSource.commit !== afterSource.commit
    || beforeSource.tree !== afterSource.tree) {
    rejectArtifact("Git HEAD or receipt source moved during cold-start validation");
  }
  if (beforeHead.status.length > 0) rejectArtifact("source worktree is dirty");
  const snapshot = Object.freeze({
    repo_root: root,
    head_sha: beforeHead.source_sha,
    head_tree: beforeHead.source_tree,
    source_sha: beforeSource.commit,
    source_tree: beforeSource.tree,
    source_dirty: false,
  });
  if (expectedSnapshot && JSON.stringify(snapshot) !== JSON.stringify(expectedSnapshot)) {
    rejectArtifact("Git HEAD or receipt source changed across artifact validation");
  }
  return snapshot;
}

function validateClaims(claims, status) {
  assertExactKeys(claims, [
    "formal_artifact_baseline",
    "historical_rf13_internal_artifact_used",
    "production_go_live",
    "public_release",
  ], "cold-start claims");
  for (const key of [
    "formal_artifact_baseline",
    "historical_rf13_internal_artifact_used",
    "production_go_live",
    "public_release",
  ]) assert.equal(typeof claims[key], "boolean", `claims.${key} must be boolean`);
  assert.equal(claims.historical_rf13_internal_artifact_used, false, "historical RF13 internal artifact cannot be a baseline");
  assert.equal(claims.production_go_live, false, "cold-start evidence cannot claim production go-live");
  assert.equal(claims.public_release, false, "cold-start evidence cannot claim public release");
  assert.equal(claims.formal_artifact_baseline, status === "PASS", "formal artifact claim must derive from receipt status");
}

function validateInputs(inputs) {
  assertExactKeys(inputs, INPUT_KEYS, "cold-start inputs");
  for (const key of ["artifact_manifest_path", "artifact_path"]) {
    assert.ok(inputs[key] === null || typeof inputs[key] === "string", `inputs.${key} must be null or a path`);
    if (inputs[key] !== null) assertPathIsAbsolute(inputs[key], `inputs.${key}`);
  }
  assert.ok(inputs.rf13_dist_manifest_path === null || typeof inputs.rf13_dist_manifest_path === "string", "inputs.rf13_dist_manifest_path must be null or a path");
  if (inputs.rf13_dist_manifest_path !== null) {
    if (path.isAbsolute(inputs.rf13_dist_manifest_path)) {
      assert.equal(path.resolve(inputs.rf13_dist_manifest_path), inputs.rf13_dist_manifest_path, "inputs.rf13_dist_manifest_path must be normalized");
    } else {
      assert.equal(path.posix.normalize(inputs.rf13_dist_manifest_path), inputs.rf13_dist_manifest_path, "inputs.rf13_dist_manifest_path must be normalized");
      assert.equal(inputs.rf13_dist_manifest_path.split("/").includes(".."), false, "inputs.rf13_dist_manifest_path cannot escape the repository root");
    }
  }
  assert.ok(inputs.expected_source_sha === null || GIT_OBJECT_PATTERN.test(String(inputs.expected_source_sha)), "inputs.expected_source_sha must be null or a full Git SHA");
}

function validateStatsEvidence(value, label) {
  assertExactKeys(value, STATS_KEYS, label);
  assertPathIsAbsolute(value.path, `${label}.path`);
  assert.ok(Number.isSafeInteger(value.bytes) && value.bytes >= 0, `${label}.bytes must be a non-negative safe integer`);
  assert.ok(Number.isSafeInteger(value.file_count) && value.file_count > 0, `${label}.file_count must be a positive safe integer`);
  assertSha256(value.sha256, `${label}.sha256`);
  assert.equal(typeof value.algorithm, "string", `${label}.algorithm is required`);
  return value;
}

function validateSourceEvidence(source, label = "cold-start source") {
  assertExactKeys(source, SOURCE_KEYS, label);
  assert.match(source.source_sha ?? "", GIT_OBJECT_PATTERN, `${label}.source_sha must be a full Git SHA`);
  assert.match(source.source_tree ?? "", GIT_OBJECT_PATTERN, `${label}.source_tree must be a full Git tree SHA`);
  assert.equal(source.source_dirty, false, `${label}.source_dirty must be false`);
  assert.equal(source.checked, true, `${label}.checked must be true`);
  return source;
}

function validateArtifactEvidence(artifact, renderer, {
  repoRoot,
  now,
  requireAuthority,
  sourceState = null,
} = {}) {
  assertExactKeys(artifact, ARTIFACT_KEYS, "cold-start artifact");
  assertExactKeys(renderer, STATS_KEYS, "cold-start renderer");
  validateStatsEvidence(renderer, "cold-start renderer");
  assertPathIsAbsolute(artifact.manifest_path, "artifact.manifest_path");
  assertSha256(artifact.manifest_sha256, "artifact.manifest_sha256");
  assert.ok(artifact.manifest && typeof artifact.manifest === "object" && !Array.isArray(artifact.manifest), "artifact.manifest is required");
  assert.ok(artifact.packaged_manifest_path === null || typeof artifact.packaged_manifest_path === "string", "artifact.packaged_manifest_path must be null or a path");
  assertPathIsAbsolute(artifact.executable_path, "artifact.executable_path");
  assertSha256(artifact.executable_sha256, "artifact.executable_sha256");
  assertPathIsAbsolute(artifact.path, "cold-start artifact.path");
  assert.ok(Number.isSafeInteger(artifact.bytes) && artifact.bytes >= 0, "cold-start artifact.bytes must be a non-negative safe integer");
  assert.ok(Number.isSafeInteger(artifact.file_count) && artifact.file_count > 0, "cold-start artifact.file_count must be a positive safe integer");
  assertSha256(artifact.sha256, "cold-start artifact.sha256");
  assert.equal(typeof artifact.algorithm, "string", "cold-start artifact.algorithm is required");
  assert.equal(artifact.algorithm, DESKTOP_MEMBER_DIGEST_ALGORITHM, "cold-start artifact.algorithm must describe the type-aware member digest");
  assert.equal(renderer.algorithm, DESKTOP_RENDERER_DIGEST_ALGORITHM, "cold-start renderer.algorithm must describe the renderer digest");
  const expectedPackageRoot = artifact.manifest.platform === "darwin"
    ? path.resolve(path.dirname(artifact.executable_path), "../..")
    : path.dirname(artifact.executable_path);
  assert.equal(artifact.path, expectedPackageRoot, "artifact path must be the executable's package root");
  const validatedSource = sourceState ?? {
    source_sha: artifact.manifest.source_sha,
    source_tree: artifact.manifest.source_tree,
    source_dirty: false,
  };
  const validated = validateFormalPackagedArtifact({
    artifactManifest: artifact.manifest,
    artifactManifestPath: artifact.manifest_path,
    artifactPath: artifact.path,
    rendererPath: renderer.path,
    expectedSourceSha: artifact.manifest.source_sha,
    sourceState: validatedSource,
    hostPlatform: artifact.manifest.platform,
    requireHostPlatform: false,
    authority: artifact.authority,
    repoRoot,
    now,
  });
  if (requireAuthority) assert.ok(artifact.authority, "PASS receipt requires sealed RF13-DIST artifact authority");
  assert.deepEqual(validated.artifact, artifact, "receipt artifact evidence does not match current on-disk artifact");
  assert.deepEqual(validated.renderer, renderer, "receipt renderer evidence does not match current on-disk renderer");
  return validated;
}

function authoritativeReceiptCapability(receipt, artifactAuthorityValidation) {
  assert.ok(receipt.artifact && receipt.renderer && receipt.source, "authoritative cold-start receipt requires artifact, renderer, and source evidence");
  assert.ok(receipt.artifact.authority && typeof receipt.artifact.authority === "object", "authoritative cold-start receipt requires sealed RF13-DIST artifact authority");
  assertExactKeys(receipt.artifact.authority, AUTHORITY_KEYS, "sealed RF13-DIST authority");
  const authorityExpectations = Object.fromEntries(AUTHORITY_KEYS.map((key) => [
    `authority.${key}`,
    receipt.artifact.authority[key],
  ]));
  assertColdStartAuthorityValidation(artifactAuthorityValidation, {
    artifact_sha256: receipt.artifact.sha256,
    artifact_manifest_sha256: receipt.artifact.manifest_sha256,
    source_sha: receipt.source.source_sha,
    source_tree: receipt.source.source_tree,
    ...authorityExpectations,
  });
  return artifactAuthorityValidation;
}

function validateAuthoritativeArtifactEvidence(receipt, {
  repoRoot,
  now,
  measurementValidation,
  receiptBytes,
}) {
  const measurement = assertColdStartMeasurementValidation(measurementValidation, receipt, receiptBytes);
  // Both capability identities are asserted before any non-HEAD source can be accepted.
  authoritativeReceiptCapability(receipt, measurement.artifact_authority_validation);
  const sourceSnapshot = validateAuthoritativeReceiptSource(repoRoot, receipt.source);
  const validatedArtifact = validateArtifactEvidence(receipt.artifact, receipt.renderer, {
    repoRoot,
    now,
    requireAuthority: true,
    sourceState: {
      source_sha: sourceSnapshot.source_sha,
      source_tree: sourceSnapshot.source_tree,
      source_dirty: false,
    },
  });
  validateAuthoritativeReceiptSource(repoRoot, receipt.source, sourceSnapshot);
  assert.equal(receipt.source.source_sha, validatedArtifact.source.source_sha, "receipt source SHA is not bound to artifact");
  assert.equal(receipt.source.source_tree, validatedArtifact.source.source_tree, "receipt source tree is not bound to artifact");
  assert.equal(receipt.inputs.artifact_manifest_path, receipt.artifact.manifest_path, "receipt input manifest path is not bound to artifact");
  assert.equal(receipt.inputs.artifact_path, receipt.artifact.path, "receipt input artifact path is not bound to artifact");
  assert.equal(receipt.inputs.rf13_dist_manifest_path, receipt.artifact.authority.rf13_dist_manifest_path, "receipt input authority path is not bound to artifact");
  assert.equal(receipt.inputs.expected_source_sha, receipt.source.source_sha, "receipt expected source SHA is not bound to source evidence");
  return validatedArtifact;
}

function validateUserDataEvidence(receipt, normalizedRuns) {
  assert.equal(receipt.user_data_root, null, "private userData root must not be retained in evidence");
  const runIds = new Set();
  for (const run of normalizedRuns) {
    assert.equal(runIds.has(run.run_id), false, "run IDs must be unique");
    runIds.add(run.run_id);
    assert.equal(run.isolated_user_data_created, true, "isolated userData creation is not proven");
    assert.equal(run.cleanup_attempted, true, "isolated userData cleanup was not attempted");
    assert.equal(run.cleanup_succeeded, true, "isolated userData cleanup did not succeed");
    assert.equal(run.post_cleanup_exists, false, "isolated userData remains after cleanup");
  }
}

function validateRunSet(receipt, { strictTiming = false, nowMs = Date.now(), allowFailure = false } = {}) {
  const expectedHost = assertSafeHostFingerprint(receipt.host_fingerprint);
  const normalized = receipt.runs.map((run) => validateColdStartRun(run, {
    expectedHostFingerprint: expectedHost,
    allowFailure,
    strictTiming,
    nowMs,
  }));
  const indices = normalized.map(({ run_index: runIndex }) => runIndex);
  assert.equal(new Set(indices).size, indices.length, "run indices must be unique");
  assert.deepEqual([...indices].toSorted((left, right) => left - right), indices, "run indices must be ordered");
  const generatedAtMs = Date.parse(receipt.generated_at);
  for (const run of normalized) {
    assert.ok(Date.parse(run.process_start_at) <= generatedAtMs, "run process start must precede receipt generation");
    assert.ok(Date.parse(run.renderer_ready_at) <= generatedAtMs, "run renderer-ready milestone must precede receipt generation");
    if (run.home_ready_at !== null) assert.ok(Date.parse(run.home_ready_at) <= generatedAtMs, "run Home-ready milestone must precede receipt generation");
  }
  return normalized;
}

export function validateColdStartReceipt(receipt, {
  repoRoot = process.cwd(),
  now = new Date(),
  measurementValidation = null,
  receiptBytes = null,
} = {}) {
  assert.ok(receipt && typeof receipt === "object", "cold-start receipt is required");
  assertExactKeys(receipt, RECEIPT_KEYS, "cold-start receipt");
  assert.equal(receipt.schema_version, COLD_START_SCHEMA, "cold-start receipt schema mismatch");
  assert.ok(COLD_START_STATUSES.includes(receipt.status), "cold-start receipt status is invalid");
  const nowMs = now instanceof Date ? now.valueOf() : new Date(now).valueOf();
  assert.ok(Number.isFinite(nowMs), "receipt validation time must be valid");
  assertFreshTimestamp(receipt.generated_at, "generated_at", nowMs);
  assert.equal(receipt.required_run_count, REQUIRED_RUN_COUNT, "cold-start receipt required run count mismatch");
  assert.equal(receipt.percentile_method, PERCENTILE_METHOD, "cold-start receipt percentile method mismatch");
  assert.ok(Array.isArray(receipt.blockers), "cold-start receipt blockers must be an array");
  assert.ok(receipt.blockers.every((blocker) => typeof blocker === "string" && blocker.length > 0), "cold-start blockers must be non-empty strings");
  assert.equal(new Set(receipt.blockers).size, receipt.blockers.length, "cold-start blockers must be unique");
  assert.ok(Array.isArray(receipt.runs), "cold-start receipt runs must be an array");
  assert.equal(receipt.run_count, receipt.runs.length, "cold-start receipt run_count must equal run records");
  assert.ok(Number.isInteger(receipt.run_count) && receipt.run_count >= 0 && receipt.run_count <= REQUIRED_RUN_COUNT, "cold-start receipt run_count is invalid");
  validateInputs(receipt.inputs);
  validateClaims(receipt.claims, receipt.status);
  assertSafeHostFingerprint(receipt.host_fingerprint);
  assert.equal(receipt.user_data_root, null, "private userData root must not be retained in evidence");

  if (receipt.status === "BLOCKED_BY_ARTIFACT" || receipt.status === "BLOCKED_BY_EXECUTION_GUARD") {
    assert.ok(receipt.blockers.length > 0, "blocked receipt must name blockers");
    assert.equal(receipt.run_count, 0, "blocked receipt cannot contain run records");
    assert.equal(receipt.runs.length, 0, "blocked receipt cannot contain run records");
    assert.equal(receipt.median_ms, null, "blocked receipt median must be null");
    assert.equal(receipt.p95_ms, null, "blocked receipt p95 must be null");
    assert.equal(receipt.artifact, null, "blocked receipt cannot claim an artifact baseline");
    assert.equal(receipt.renderer, null, "blocked receipt cannot claim a renderer baseline");
    assert.equal(receipt.source, null, "blocked receipt cannot claim a source baseline");
    assert.equal(receipt.user_data_root, null, "blocked receipt cannot claim isolated userData");
    return receipt;
  }

  if (measurementValidation !== null) {
    assertColdStartMeasurementValidation(measurementValidation, receipt, receiptBytes);
    assert.ok(receipt.artifact && receipt.renderer && receipt.source, "authoritative observed receipt requires artifact, renderer, and source evidence");
  }

  assert.ok(receipt.run_count > 0 || receipt.status === "PASS" || receipt.status === "RECOVERY_REQUIRED", "failed-closed receipt must include any observed runs");
  if (receipt.status === "PASS") {
    assert.equal(receipt.blockers.length, 0, "PASS receipt cannot contain blockers");
    assert.equal(receipt.run_count, REQUIRED_RUN_COUNT, "PASS receipt requires five runs");
    assert.equal(receipt.runs.length, REQUIRED_RUN_COUNT, "PASS receipt requires five run records");
    assert.ok(receipt.artifact && receipt.renderer && receipt.source, "PASS receipt requires artifact, renderer, and source evidence");
    validateSourceEvidence(receipt.source);
    validateAuthoritativeArtifactEvidence(receipt, {
      repoRoot: path.resolve(repoRoot),
      now,
      measurementValidation,
      receiptBytes,
    });
    const normalized = validateRunSet(receipt, { strictTiming: true, nowMs, allowFailure: false });
    assert.deepEqual(normalized.map(({ run_index: runIndex }) => runIndex), [1, 2, 3, 4, 5], "PASS receipt run indices must be exactly 1..5");
    validateUserDataEvidence(receipt, normalized);
    assert.ok(normalized.every((run) => run.exit_code === 0
      && run.signal === null
      && run.error_count === 0
      && run.console_count === 0
      && run.console_error_count === 0
      && run.home_ready_observed === true
      && !Object.hasOwn(run, "error")), "PASS receipt contains an unsuccessful run");
    const durations = normalized.map((run) => run.duration_ms);
    assert.equal(receipt.median_ms, percentile(durations, 0.5), "receipt median does not match the five run durations");
    assert.equal(receipt.p95_ms, percentile(durations, 0.95), "receipt p95 does not match the five run durations");
    return receipt;
  }

  assert.ok(receipt.blockers.length > 0, "failed-closed receipt must name blockers");
  assert.equal(receipt.claims.formal_artifact_baseline, false, "failed-closed receipt cannot claim a formal baseline");
  if (receipt.run_count > 0) {
    const normalized = validateRunSet(receipt, { strictTiming: false, nowMs, allowFailure: true });
    if (receipt.status === "RECOVERY_REQUIRED") {
      assert.ok(
        normalized.some((run) => run.cleanup_succeeded !== true || run.post_cleanup_exists !== false)
          || receipt.blockers.some((blocker) => /userData root cleanup failed|manual recovery is required/iu.test(blocker)),
        "recovery receipt must identify cleanup residue or failure",
      );
    } else {
      validateUserDataEvidence(receipt, normalized);
    }
    if (receipt.artifact !== null || receipt.renderer !== null || receipt.source !== null) {
      assert.ok(receipt.artifact && receipt.renderer && receipt.source, "failed-closed artifact evidence must be complete");
      validateSourceEvidence(receipt.source);
      if (measurementValidation !== null) {
        validateAuthoritativeArtifactEvidence(receipt, {
          repoRoot: path.resolve(repoRoot),
          now,
          measurementValidation,
          receiptBytes,
        });
      } else {
        validateArtifactEvidence(receipt.artifact, receipt.renderer, {
          repoRoot: path.resolve(repoRoot),
          now,
          requireAuthority: false,
        });
      }
    }
  } else {
    assert.equal(receipt.median_ms, null, "empty failed-closed receipt median must be null");
    assert.equal(receipt.p95_ms, null, "empty failed-closed receipt p95 must be null");
    assert.equal(receipt.artifact, null, "empty failed-closed receipt artifact must be null");
    assert.equal(receipt.renderer, null, "empty failed-closed receipt renderer must be null");
    assert.equal(receipt.source, null, "empty failed-closed receipt source must be null");
    assert.equal(receipt.user_data_root, null, "empty failed-closed receipt userData root must be null");
  }
  return receipt;
}

export function blockedByArtifactReceipt({
  blockers,
  artifactManifestPath = null,
  artifactPath = null,
  expectedSourceSha = null,
  rf13DistManifestPath = null,
} = {}) {
  return {
    schema_version: COLD_START_SCHEMA,
    generated_at: new Date().toISOString(),
    status: "BLOCKED_BY_ARTIFACT",
    blockers: [...new Set((blockers ?? []).map((value) => String(value)))],
    required_run_count: REQUIRED_RUN_COUNT,
    run_count: 0,
    percentile_method: PERCENTILE_METHOD,
    median_ms: null,
    p95_ms: null,
    artifact: null,
    renderer: null,
    source: null,
    host_fingerprint: sanitizedHostFingerprint(),
    user_data_root: null,
    runs: [],
    inputs: {
      artifact_manifest_path: artifactManifestPath,
      artifact_path: artifactPath,
      rf13_dist_manifest_path: rf13DistManifestPath,
      expected_source_sha: expectedSourceSha,
    },
    claims: {
      formal_artifact_baseline: false,
      historical_rf13_internal_artifact_used: false,
      production_go_live: false,
      public_release: false,
    },
  };
}

export function blockedByExecutionGuardReceipt({ artifact, blockers = [] } = {}) {
  return {
    schema_version: COLD_START_SCHEMA,
    generated_at: new Date().toISOString(),
    status: "BLOCKED_BY_EXECUTION_GUARD",
    blockers: [...new Set(["--execute is required to launch the packaged artifact", ...blockers])],
    required_run_count: REQUIRED_RUN_COUNT,
    run_count: 0,
    percentile_method: PERCENTILE_METHOD,
    median_ms: null,
    p95_ms: null,
    artifact: null,
    renderer: null,
    source: null,
    host_fingerprint: sanitizedHostFingerprint(),
    user_data_root: null,
    runs: [],
    inputs: {
      artifact_manifest_path: artifact?.artifact?.manifest_path ?? null,
      artifact_path: artifact?.artifact?.path ?? null,
      rf13_dist_manifest_path: artifact?.artifact?.authority?.rf13_dist_manifest_path ?? null,
      expected_source_sha: artifact?.source?.source_sha ?? null,
    },
    claims: {
      formal_artifact_baseline: false,
      historical_rf13_internal_artifact_used: false,
      production_go_live: false,
      public_release: false,
    },
  };
}
