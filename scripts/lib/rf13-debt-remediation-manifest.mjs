import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import {
  BASELINE_SCHEMA_VERSION,
  CAPTURE_SCHEMA_VERSION,
  CHECKPOINT_ID,
  DEFAULT_EVIDENCE_DIR,
  DEFAULT_HISTORICAL_DIR,
  DEFAULT_GOAL_PATHS,
  DIFF_REDACTION_POLICY,
  GENERATOR_VERSION,
  MAX_BUFFER,
  RAW_KINDS,
  SHA_1,
  VALIDATOR_SCHEMA_VERSION,
  assertHash,
  assertRelativePath,
  bytesDescriptor,
  exactKeys,
  fail,
  freezeDeep,
  record,
  relativePath,
  sha256,
  utf8,
} from "./rf13-debt-remediation-common.mjs";
import {
  assertRawPrivacy,
  bytesEqual,
  captureStableRf13Source,
  readRf13SourceSnapshot,
  sourceStateFromBytes,
  statusCounts,
  validateNoPrivateMaterial,
} from "./rf13-debt-remediation-source.mjs";
import { buildHistoricalRf13Inventory } from "./rf13-debt-remediation-historical.mjs";

function readGoalFacts(cwd, goalPaths) {
  return goalPaths.map((path) => {
    assertRelativePath(path, "goal_path");
    const absolute = resolve(cwd, path);
    if (!existsSync(absolute)) fail("GOAL_MISSING", "required goal file is missing", { category: "goal_binding" });
    const bytes = readFileSync(absolute);
    return Object.freeze({ path, bytes: bytes.length, sha256: sha256(bytes), content: bytes });
  });
}

function goalBindingDescriptors(goalFacts) {
  return goalFacts.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 }));
}

function readStableGoalBindings(cwd, goalPaths) {
  const first = goalBindingDescriptors(readGoalFacts(cwd, goalPaths));
  const second = goalBindingDescriptors(readGoalFacts(cwd, goalPaths));
  if (JSON.stringify(first) !== JSON.stringify(second)) fail("GOAL_CHANGED_BETWEEN_CAPTURES", "goal files changed between bounded reads", { category: "goal_binding" });
  return first;
}
function outputDirectoryAllowed(cwd, outputDir) {
  const repositoryRoot = resolve(cwd);
  const absolute = resolve(repositoryRoot, outputDir);
  const rel = relativePath(repositoryRoot, absolute);
  if (!/^\.omo\/evidence\/rf13-debt-remediation-[^/]+(?:\/.*)?$/u.test(rel)) {
    fail("OUTPUT_SCOPE_INVALID", "baseline output must be under ignored RF13 debt-remediation evidence", { category: "output_scope" });
  }
  try {
    execFileSync("git", ["check-ignore", "-q", "--no-index", "--", rel], { cwd: repositoryRoot, maxBuffer: MAX_BUFFER });
  } catch {
    fail("OUTPUT_NOT_IGNORED", "baseline output directory must be ignored evidence", { category: "output_scope" });
  }
  return absolute;
}

function captureMetadata(snapshot, captureId) {
  const raw = {};
  for (const kind of RAW_KINDS) {
    const suffix = kind === "status" ? "status.porcelain-v2" : kind === "diff" ? "diff.binary" : kind === "manifest" ? "source-manifest.tsv" : `${kind}.txt`;
    raw[kind] = bytesDescriptor(`${captureId}.${suffix}`, snapshot.raw[kind]);
  }
  return {
    schema_version: CAPTURE_SCHEMA_VERSION,
    checkpoint_id: CHECKPOINT_ID,
    capture_id: captureId,
    captured_at: snapshot.captured_at,
    repository: snapshot.repository,
    raw_privacy: snapshot.raw_privacy ?? { diff_redacted: true, policy: DIFF_REDACTION_POLICY, authority_status: "NOT_APPLICABLE_MISSING_AUTHORITY", source_authority: "NOT_APPLICABLE_MISSING_ROSTER", media_authority: "NOT_APPLICABLE_MISSING_PHOTOS" },
    goal_bindings: snapshot.goal_bindings ?? [],
    source_state: snapshot.source_state,
    status_counts: snapshot.status_counts,
    raw,
  };
}

function captureSummary(captureId, metadataPath, metadataBytes, metadataSha, metadata) {
  return {
    capture_id: captureId,
    metadata: { path: metadataPath, bytes: metadataBytes, sha256: metadataSha },
    raw: metadata.raw,
    raw_privacy: metadata.raw_privacy,
    goal_bindings: metadata.goal_bindings,
    source_state: metadata.source_state,
    status_counts: metadata.status_counts,
  };
}

function writeJson(path, value) {
  return writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

async function writeCaptureFiles(outputDir, snapshot, captureId, metadata) {
  for (const kind of RAW_KINDS) {
    await writeFile(join(outputDir, metadata.raw[kind].path), snapshot.raw[kind], { mode: 0o600 });
  }
  const metadataPath = join(outputDir, `${captureId}.json`);
  const metadataBytes = utf8(`${JSON.stringify(metadata, null, 2)}\n`);
  await writeFile(metadataPath, metadataBytes, { mode: 0o600 });
  return {
    path: `${captureId}.json`,
    bytes: metadataBytes.length,
    sha256: sha256(metadataBytes),
  };
}

async function writeGoalCopies(outputDir, goals) {
  const result = [];
  for (let index = 0; index < goals.length; index += 1) {
    const goal = goals[index];
    const rawPath = `goal-${index + 1}.bytes`;
    await writeFile(join(outputDir, rawPath), goal.content, { mode: 0o600 });
    result.push({ path: goal.path, bytes: goal.bytes, sha256: goal.sha256, raw_path: rawPath });
  }
  return result;
}


export async function generateRf13DebtRemediationBaseline({
  cwd = process.cwd(),
  outputDir = DEFAULT_EVIDENCE_DIR,
  historicalDir = DEFAULT_HISTORICAL_DIR,
  goalPaths = DEFAULT_GOAL_PATHS,
  maxAttempts = 3,
  readSnapshot = readRf13SourceSnapshot,
  now = () => new Date().toISOString(),
} = {}) {
  const repositoryRoot = resolve(cwd);
  const absoluteOutput = outputDirectoryAllowed(repositoryRoot, outputDir);
  const goalAwareReadSnapshot = (args) => ({
    ...readSnapshot(args),
    goal_bindings: readStableGoalBindings(repositoryRoot, goalPaths),
  });
  const stable = captureStableRf13Source({ cwd: repositoryRoot, maxAttempts, readSnapshot: goalAwareReadSnapshot, now });
  assertRawPrivacy(stable.first, repositoryRoot);
  assertRawPrivacy(stable.second, repositoryRoot);
  const goalFacts = readGoalFacts(repositoryRoot, goalPaths);
  const goalBindings = goalBindingDescriptors(goalFacts);
  if (JSON.stringify(stable.first.goal_bindings) !== JSON.stringify(goalBindings) || JSON.stringify(stable.second.goal_bindings) !== JSON.stringify(goalBindings)) fail("GOAL_CHANGED_AFTER_CAPTURE", "goal files changed after stable source capture", { category: "goal_binding" });
  await mkdir(absoluteOutput, { recursive: true, mode: 0o700 });
  const firstMetadata = captureMetadata(stable.first, "capture-1");
  const secondMetadata = captureMetadata(stable.second, "capture-2");
  const firstMetaFile = await writeCaptureFiles(absoluteOutput, stable.first, "capture-1", firstMetadata);
  const secondMetaFile = await writeCaptureFiles(absoluteOutput, stable.second, "capture-2", secondMetadata);
  const goals = await writeGoalCopies(absoluteOutput, goalFacts);
  const historical = buildHistoricalRf13Inventory({ cwd: repositoryRoot, historicalDir });
  const firstSummary = captureSummary("capture-1", firstMetaFile.path, firstMetaFile.bytes, firstMetaFile.sha256, firstMetadata);
  const secondSummary = captureSummary("capture-2", secondMetaFile.path, secondMetaFile.bytes, secondMetaFile.sha256, secondMetadata);
  const baseline = {
    schema_version: BASELINE_SCHEMA_VERSION,
    checkpoint_id: CHECKPOINT_ID,
    generator: {
      name: "rf13-debt-remediation-baseline",
      version: GENERATOR_VERSION,
      read_only: true,
      writes_scope: relativePath(repositoryRoot, absoluteOutput),
    },
    generated_at: String(now()),
    repository: {
      worktree_label: "repository-root",
      branch: stable.first.repository.branch,
      head: stable.first.source_state.source_sha,
      tree: stable.first.source_state.source_tree,
      source_dirty: stable.first.source_state.source_dirty,
      status_counts: stable.first.status_counts,
    },
    capture: {
      retry_limit: maxAttempts,
      attempts: stable.attempts,
      byte_equivalent: true,
      files_changed_between_captures: 0,
      first: firstSummary,
      second: secondSummary,
    },
    goals,
    historical_rf13: historical,
    non_claims: {
      clean_source: false,
      formal_distribution: false,
      signing: false,
      notarization: false,
      staging_deployment: false,
      production_deployment: false,
      go_live: false,
    },
    point_in_time: {
      current_drift: "NOT_EVALUATED_POINT_IN_TIME",
      later_worktree_drift_does_not_invalidate_stored_capture: true,
    },
    verdict: "PASS_BASELINE_CAPTURED_QA_ONLY",
  };
  validateNoPrivateMaterial(baseline, { cwd: repositoryRoot });
  await writeJson(join(absoluteOutput, "baseline-manifest.json"), baseline);
  return Object.freeze({
    manifestPath: join(absoluteOutput, "baseline-manifest.json"),
    baseline: freezeDeep(baseline),
    stable,
  });
}


function readBoundedFile(root, descriptor, field) {
  if (!record(descriptor)) fail("RAW_CAPTURE_SCHEMA_INVALID", `${field} descriptor is invalid`, { field });
  exactKeys(descriptor, ["path", "bytes", "sha256"], field);
  assertRelativePath(descriptor.path, `${field}.path`);
  if (!Number.isInteger(descriptor.bytes) || descriptor.bytes < 0) fail("RAW_CAPTURE_SCHEMA_INVALID", `${field} byte count is invalid`, { field });
  assertHash(descriptor.sha256, `${field}.sha256`);
  const absolute = resolve(root, descriptor.path);
  if (!absolute.startsWith(`${resolve(root)}${sep}`) && absolute !== resolve(root)) fail("RAW_CAPTURE_PATH_ESCAPE", "raw capture path escapes evidence directory", { field });
  if (!existsSync(absolute)) fail("RAW_CAPTURE_MISSING", "raw capture artifact is missing", { field });
  const stat = lstatSync(absolute);
  if (stat.isSymbolicLink() || !stat.isFile()) fail("RAW_CAPTURE_UNSAFE", "raw capture artifact must be a regular file", { field });
  const bytes = readFileSync(absolute);
  if (bytes.length !== descriptor.bytes || sha256(bytes) !== descriptor.sha256) fail("RAW_CAPTURE_HASH_MISMATCH", "raw capture artifact bytes do not match the manifest", { field });
  return bytes;
}

function validateCaptureSummary(root, summary, expectedCaptureId) {
  exactKeys(summary, ["capture_id", "metadata", "raw", "raw_privacy", "goal_bindings", "source_state", "status_counts"], `capture.${expectedCaptureId}`);
  if (summary.capture_id !== expectedCaptureId) fail("RAW_CAPTURE_SCHEMA_INVALID", "capture id does not match its slot", { field: "capture_id" });
  const metadataBytes = readBoundedFile(root, summary.metadata, `${expectedCaptureId}.metadata`);
  if (summary.metadata.path !== `${expectedCaptureId}.json`) fail("RAW_CAPTURE_SCHEMA_INVALID", "capture metadata path is invalid", { field: "metadata.path" });
  let metadata;
  try { metadata = JSON.parse(metadataBytes.toString("utf8")); } catch { fail("RAW_CAPTURE_SCHEMA_INVALID", "capture metadata JSON is invalid", { field: "metadata" }); }
  exactKeys(metadata, ["schema_version", "checkpoint_id", "capture_id", "captured_at", "repository", "raw_privacy", "goal_bindings", "source_state", "status_counts", "raw"], `${expectedCaptureId}.metadata`);
  exactKeys(metadata.repository, ["branch"], `${expectedCaptureId}.metadata.repository`);
  if (metadata.schema_version !== CAPTURE_SCHEMA_VERSION || metadata.checkpoint_id !== CHECKPOINT_ID || metadata.capture_id !== expectedCaptureId) fail("RAW_CAPTURE_SCHEMA_INVALID", "capture metadata identity is invalid", { field: "metadata.identity" });
  exactKeys(metadata.raw_privacy, ["diff_redacted", "policy", "authority_status", "source_authority", "media_authority"], `${expectedCaptureId}.metadata.raw_privacy`);
  if (JSON.stringify(summary.raw_privacy) !== JSON.stringify(metadata.raw_privacy)) fail("RAW_CAPTURE_BINDING_MISMATCH", "capture privacy policy is not bound to metadata", { field: "raw_privacy" });
  if (!Array.isArray(metadata.goal_bindings) || metadata.goal_bindings.length === 0 || JSON.stringify(summary.goal_bindings) !== JSON.stringify(metadata.goal_bindings)) fail("GOAL_BINDING_MISMATCH", "capture goal bindings are not bound to metadata", { category: "goal_binding" });
  for (const [index, goal] of metadata.goal_bindings.entries()) {
    exactKeys(goal, ["path", "bytes", "sha256"], `goal_bindings.${index}`);
    assertRelativePath(goal.path, `goal_bindings.${index}.path`);
    if (!Number.isInteger(goal.bytes) || goal.bytes < 0) fail("GOAL_BINDING_INVALID", "capture goal byte count is invalid", { category: "goal_binding" });
    assertHash(goal.sha256, `goal_bindings.${index}.sha256`);
  }
  if (metadata.raw_privacy.diff_redacted !== true || metadata.raw_privacy.policy !== DIFF_REDACTION_POLICY || !["BOUND", "NOT_APPLICABLE_MISSING_AUTHORITY"].includes(metadata.raw_privacy.authority_status) || (!metadata.raw_privacy.source_authority.startsWith("BOUND") && !metadata.raw_privacy.source_authority.startsWith("NOT_APPLICABLE")) || (!metadata.raw_privacy.media_authority.startsWith("BOUND") && !metadata.raw_privacy.media_authority.startsWith("NOT_APPLICABLE"))) fail("RAW_CAPTURE_SCHEMA_INVALID", "capture diff privacy policy is invalid", { field: "metadata.raw_privacy" });
  exactKeys(summary.raw, RAW_KINDS, `${expectedCaptureId}.raw`);
  exactKeys(metadata.raw, RAW_KINDS, `${expectedCaptureId}.metadata.raw`);
  const rawBytes = {};
  for (const kind of RAW_KINDS) {
    const summaryDescriptor = summary.raw[kind];
    const metadataDescriptor = metadata.raw[kind];
    if (JSON.stringify(summaryDescriptor) !== JSON.stringify(metadataDescriptor)) fail("RAW_CAPTURE_BINDING_MISMATCH", "capture raw descriptor is not bound to metadata", { field: `${expectedCaptureId}.${kind}` });
    rawBytes[kind] = readBoundedFile(root, summaryDescriptor, `${expectedCaptureId}.${kind}`);
  }
  const sourceSha = rawBytes.head.toString("utf8").trim();
  const sourceTree = rawBytes.tree.toString("utf8").trim();
  assertHash(sourceSha, `${expectedCaptureId}.source_sha`, SHA_1);
  assertHash(sourceTree, `${expectedCaptureId}.source_tree`, SHA_1);
  const expectedState = sourceStateFromBytes({ sourceSha, sourceTree, statusBytes: rawBytes.status, diffBytes: rawBytes.diff, manifestBytes: rawBytes.manifest });
  if (JSON.stringify(metadata.source_state) !== JSON.stringify(expectedState) || JSON.stringify(summary.source_state) !== JSON.stringify(expectedState)) fail("RAW_CAPTURE_BINDING_MISMATCH", "capture source state does not match raw bytes", { field: `${expectedCaptureId}.source_state` });
  if (JSON.stringify(metadata.status_counts) !== JSON.stringify(statusCounts(rawBytes.status)) || JSON.stringify(summary.status_counts) !== JSON.stringify(statusCounts(rawBytes.status))) fail("RAW_CAPTURE_BINDING_MISMATCH", "capture status counts do not match raw bytes", { field: `${expectedCaptureId}.status_counts` });
  assertRawPrivacy({ raw: rawBytes }, root);
  return Object.freeze({ metadata, raw_privacy: metadata.raw_privacy, goal_bindings: metadata.goal_bindings, source_state: expectedState, status_counts: statusCounts(rawBytes.status), raw: rawBytes });
}

function validateBaselineRepositoryBinding(baselineRepository, first, second) {
  exactKeys(baselineRepository, ["worktree_label", "branch", "head", "tree", "source_dirty", "status_counts"], "repository");
  if (baselineRepository.worktree_label !== "repository-root") fail("BASELINE_REPOSITORY_BINDING", "baseline repository label is invalid", { category: "repository_binding" });
  if (baselineRepository.branch !== first.metadata.repository.branch || baselineRepository.branch !== second.metadata.repository.branch) fail("BASELINE_REPOSITORY_BINDING", "baseline branch is not bound to both captures", { category: "repository_binding" });
  if (baselineRepository.head !== first.source_state.source_sha || baselineRepository.head !== second.source_state.source_sha) fail("BASELINE_REPOSITORY_BINDING", "baseline HEAD is not bound to both captures", { category: "repository_binding" });
  if (baselineRepository.tree !== first.source_state.source_tree || baselineRepository.tree !== second.source_state.source_tree) fail("BASELINE_REPOSITORY_BINDING", "baseline tree is not bound to both captures", { category: "repository_binding" });
  if (baselineRepository.source_dirty !== first.source_state.source_dirty || baselineRepository.source_dirty !== second.source_state.source_dirty) fail("BASELINE_REPOSITORY_BINDING", "baseline dirty state is not bound to both captures", { category: "repository_binding" });
  if (JSON.stringify(baselineRepository.status_counts) !== JSON.stringify(first.status_counts) || JSON.stringify(baselineRepository.status_counts) !== JSON.stringify(second.status_counts)) fail("BASELINE_REPOSITORY_BINDING", "baseline status counts are not bound to both captures", { category: "repository_binding" });
}

function validateNonClaims(nonClaims) {
  const keys = ["clean_source", "formal_distribution", "signing", "notarization", "staging_deployment", "production_deployment", "go_live"];
  exactKeys(nonClaims, keys, "non_claims");
  if (keys.some((key) => nonClaims[key] !== false)) fail("BASELINE_NON_CLAIMS_INVALID", "baseline non-claims must remain false", { category: "non_claims" });
}

function validatePointInTime(pointInTime) {
  exactKeys(pointInTime, ["current_drift", "later_worktree_drift_does_not_invalidate_stored_capture"], "point_in_time");
  if (pointInTime.current_drift !== "NOT_EVALUATED_POINT_IN_TIME" || pointInTime.later_worktree_drift_does_not_invalidate_stored_capture !== true) fail("BASELINE_POINT_IN_TIME_INVALID", "baseline point-in-time policy is invalid", { category: "point_in_time" });
}
function compareCaptureRaw(first, second) {
  return RAW_KINDS.every((kind) => bytesEqual(first.raw[kind], second.raw[kind]));
}

function compareCurrentSourceState(baselineCapture, current) {
  const changed = [];
  for (const key of ["source_sha", "source_tree", "source_dirty", "diff_sha256", "status_sha256", "manifest_sha256", "working_tree_sha256"]) {
    if (baselineCapture.source_state[key] !== current.source_state[key]) changed.push(`source_state.${key}`);
  }
  if (JSON.stringify(baselineCapture.status_counts) !== JSON.stringify(current.status_counts)) changed.push("status_counts");
  return changed;
}

function safeCurrentGoalDrift(cwd, baselineGoals) {
  const drift = [];
  for (const goal of baselineGoals) {
    const absolute = resolve(cwd, goal.path);
    if (!existsSync(absolute)) {
      drift.push({ path: goal.path, status: "MISSING" });
      continue;
    }
    const bytes = readFileSync(absolute);
    const currentSha = sha256(bytes);
    if (bytes.length !== goal.bytes || currentSha !== goal.sha256) drift.push({ path: goal.path, status: "CHANGED", baseline_sha256: goal.sha256, current_sha256: currentSha });
  }
  return drift;
}

function compareHistoricalFiles(baselineInventory, currentInventory) {
  const baselineByPath = new Map((baselineInventory.files ?? []).map((file) => [file.path, file]));
  const currentByPath = new Map((currentInventory.files ?? []).map((file) => [file.path, file]));
  const changed = [];
  for (const [path, current] of currentByPath) {
    const baseline = baselineByPath.get(path);
    if (!baseline) changed.push({ path, status: "ADDED" });
    else if (baseline.bytes !== current.bytes || baseline.sha256 !== current.sha256) changed.push({ path, status: "CHANGED" });
  }
  for (const [path] of baselineByPath) if (!currentByPath.has(path)) changed.push({ path, status: "MISSING" });
  return changed;
}

function conflictPaths(inventory, conflict) {
  const paths = new Set();
  for (const file of inventory.files ?? []) {
    if (conflict.key.startsWith("artifact:") && file.kind === "artifact_hashes") {
      if ((file.entries ?? []).some((entry) => `artifact:${entry.path}` === conflict.key)) paths.add(file.path);
    } else if (conflict.key.startsWith("source:") && file.kind === "source_state") {
      if (Object.hasOwn(file.fingerprint ?? {}, conflict.key.slice("source:".length))) paths.add(file.path);
    } else if (conflict.key.startsWith("receipt:") && file.role === conflict.key.slice("receipt:".length)) {
      paths.add(file.path);
    }
  }
  return paths;
}

function validateHistoricalContract(baselineInventory, currentInventory) {
  exactKeys(baselineInventory, ["directory", "classification", "distributable", "formal_release_allowed", "formal_release_block_reason", "files", "generations", "conflicts", "canonical_selection", "conflict_disclosure"], "historical_rf13");
  if (baselineInventory.classification !== "QA_ONLY" || baselineInventory.distributable !== false || baselineInventory.formal_release_allowed !== false) fail("HISTORICAL_RELEASE_NOT_QUARANTINED", "historical RF13 evidence must remain QA_ONLY and non-distributable", { category: "historical_release" });
  if (baselineInventory.canonical_selection?.status !== "NONE" || baselineInventory.canonical_selection?.generation !== null) fail("HISTORICAL_CANONICAL_SELECTION", "historical RF13 generations cannot be auto-selected", { category: "historical_conflict" });
  const baselineNames = (baselineInventory.generations ?? []).map((generation) => generation.name).sort();
  const currentNames = (currentInventory.generations ?? []).map((generation) => generation.name).sort();
  const baselineNameSet = new Set(baselineNames);
  const currentNameSet = new Set(currentNames);
  if (baselineNames.some((name) => !currentNameSet.has(name))) fail("HISTORICAL_INVENTORY_COLLAPSED", "historical RF13 generation inventory is incomplete", { category: "historical_inventory" });
  const baselinePaths = new Set((baselineInventory.files ?? []).map((file) => file.path));
  const baselineFilesByPath = new Map((baselineInventory.files ?? []).map((file) => [file.path, file]));
  const currentFilesByPathMap = new Map((currentInventory.files ?? []).map((file) => [file.path, file]));
  const currentFilesByGeneration = new Map();
  for (const file of currentInventory.files ?? []) {
    if (!currentFilesByGeneration.has(file.generation)) currentFilesByGeneration.set(file.generation, []);
    currentFilesByGeneration.get(file.generation).push(file.path);
  }
  for (const name of currentNames) {
    if (!baselineNameSet.has(name) && (currentFilesByGeneration.get(name) ?? []).some((path) => baselinePaths.has(path))) {
      fail("HISTORICAL_INVENTORY_COLLAPSED", "historical RF13 generation inventory is incomplete", { category: "historical_inventory" });
    }
  }
  const baselineConflictKeys = (baselineInventory.conflicts ?? []).map((entry) => entry.key).sort();
  const currentConflictKeys = (currentInventory.conflicts ?? []).map((entry) => entry.key).sort();
  const baselineConflictSet = new Set(baselineConflictKeys);
  for (const key of currentConflictKeys) {
    if (baselineConflictSet.has(key)) continue;
    const paths = conflictPaths(currentInventory, currentInventory.conflicts.find((entry) => entry.key === key));
    const allAdded = paths.size > 0 && [...paths].every((path) => !baselinePaths.has(path));
    const allNewlyClassified = paths.size > 0 && [...paths].every((path) => baselineFilesByPath.get(path)?.kind !== currentFilesByPathMap.get(path)?.kind);
    if (!allAdded && !allNewlyClassified) fail("HISTORICAL_CONFLICT_COLLAPSED", "historical RF13 conflicts are missing or silently resolved", { category: "historical_conflict" });
  }
  for (const key of baselineConflictKeys) {
    if (!currentConflictKeys.includes(key)) fail("HISTORICAL_CONFLICT_COLLAPSED", "historical RF13 conflicts are missing or silently resolved", { category: "historical_conflict" });
  }
  for (const conflict of baselineInventory.conflicts) {
    if (conflict.resolution !== "UNRESOLVED_CONFLICT" || conflict.canonical_generation !== null || conflict.formal_release_allowed !== false || conflict.qa_only !== true) fail("HISTORICAL_CONFLICT_RESOLUTION", "historical conflict is not fail-closed", { category: "historical_conflict" });
  }
  const currentByName = new Map(currentInventory.generations.map((generation) => [generation.name, generation]));
  for (const generation of baselineInventory.generations) {
    const current = currentByName.get(generation.name);
    if (generation.supersession?.canonical !== false) fail("HISTORICAL_CANONICAL_SELECTION", "historical generation is marked canonical", { category: "historical_conflict" });
    const expectedStatus = current?.supersession?.status;
    if (generation.supersession?.status !== expectedStatus) fail("HISTORICAL_SUPERSESSION_MISMATCH", "historical supersession status is inconsistent", { category: "historical_conflict" });
  }
  const historicalChanges = compareHistoricalFiles(baselineInventory, currentInventory);
  if (historicalChanges.length === 0) {
    const currentByKey = new Map((currentInventory.conflicts ?? []).map((entry) => [entry.key, entry]));
    const stableValues = (entry) => (entry?.values ?? []).map((value) => ({ generation: value.generation, value: value.value }));
    for (const baselineConflict of baselineInventory.conflicts) {
      const currentConflict = currentByKey.get(baselineConflict.key);
      if (JSON.stringify(stableValues(baselineConflict)) !== JSON.stringify(stableValues(currentConflict))) {
        fail("HISTORICAL_CONFLICT_VALUES_MISMATCH", "historical conflict values are not fully bound", { category: "historical_conflict" });
      }
    }
  }
  return historicalChanges;
}

function validateGoals(root, baselineGoals) {
  exactKeys({ goals: baselineGoals }, ["goals"], "goals.wrapper");
  if (!Array.isArray(baselineGoals) || baselineGoals.length === 0) fail("GOAL_BINDING_INVALID", "goal bindings are missing", { category: "goal_binding" });
  for (const [index, goal] of baselineGoals.entries()) {
    exactKeys(goal, ["path", "bytes", "sha256", "raw_path"], `goals.${index}`);
    assertRelativePath(goal.path, `goals.${index}.path`);
    assertRelativePath(goal.raw_path, `goals.${index}.raw_path`);
    assertHash(goal.sha256, `goals.${index}.sha256`);
    if (!Number.isInteger(goal.bytes) || goal.bytes < 0) fail("GOAL_BINDING_INVALID", "goal byte count is invalid", { category: "goal_binding" });
    const raw = readBoundedFile(root, { path: goal.raw_path, bytes: goal.bytes, sha256: goal.sha256 }, `goals.${index}.raw`);
    if (raw.length !== goal.bytes || sha256(raw) !== goal.sha256) fail("GOAL_BINDING_MISMATCH", "goal raw bytes do not match the bound hash", { category: "goal_binding" });
  }
}


function validateCaptureRetry(capture) {
  const retryLimitValid = Number.isInteger(capture.retry_limit) && capture.retry_limit >= 1 && capture.retry_limit <= 10;
  const attemptsValid = Number.isInteger(capture.attempts) && capture.attempts >= 1 && capture.attempts <= capture.retry_limit;
  const changedCountValid = Number.isInteger(capture.files_changed_between_captures) && capture.files_changed_between_captures >= 0;
  const equivalenceConsistent = (capture.byte_equivalent === true && capture.files_changed_between_captures === 0)
    || (capture.byte_equivalent !== true && capture.files_changed_between_captures > 0);
  if (!retryLimitValid || !attemptsValid || !changedCountValid || !equivalenceConsistent) {
    fail("CAPTURE_RETRY_METADATA_INVALID", "capture retry metadata is impossible or inconsistent", { category: "capture_retry" });
  }
}

export function validateRf13DebtRemediationBaseline({
  manifestPath,
  cwd = process.cwd(),
  historicalDir,
  strictCurrent = false,
} = {}) {
  if (typeof manifestPath !== "string" || manifestPath.length === 0) fail("INVALID_ARGUMENT", "an explicit baseline manifest path is required", { category: "argument" });
  const repositoryRoot = resolve(cwd);
  const absoluteManifest = resolve(repositoryRoot, manifestPath);
  if (!existsSync(absoluteManifest)) fail("BASELINE_MANIFEST_MISSING", "baseline manifest is missing", { category: "manifest" });
  let baseline;
  try { baseline = JSON.parse(readFileSync(absoluteManifest, "utf8")); } catch { fail("BASELINE_JSON_INVALID", "baseline manifest JSON is invalid", { category: "manifest" }); }
  validateNoPrivateMaterial(baseline, { cwd: repositoryRoot });
  exactKeys(baseline, ["schema_version", "checkpoint_id", "generator", "generated_at", "repository", "capture", "goals", "historical_rf13", "non_claims", "point_in_time", "verdict"], "baseline");
  if (baseline.schema_version !== BASELINE_SCHEMA_VERSION || baseline.checkpoint_id !== CHECKPOINT_ID || baseline.verdict !== "PASS_BASELINE_CAPTURED_QA_ONLY") fail("BASELINE_SCHEMA_INVALID", "baseline identity or verdict is invalid", { category: "manifest" });
  if (baseline.generator?.read_only !== true) fail("GENERATOR_NOT_READ_ONLY", "baseline generator must declare read_only", { category: "generator" });
  exactKeys(baseline.capture, ["retry_limit", "attempts", "byte_equivalent", "files_changed_between_captures", "first", "second"], "capture");
  validateCaptureRetry(baseline.capture);
  if (baseline.capture.byte_equivalent !== true || baseline.capture.files_changed_between_captures !== 0) fail("CAPTURE_NOT_STABLE", "baseline does not prove two equivalent captures", { category: "capture" });
  const evidenceRoot = dirname(absoluteManifest);
  const first = validateCaptureSummary(evidenceRoot, baseline.capture.first, "capture-1");
  const second = validateCaptureSummary(evidenceRoot, baseline.capture.second, "capture-2");
  if (!compareCaptureRaw(first, second)) fail("CAPTURES_NOT_EQUIVALENT", "raw captures are not byte-equivalent", { category: "capture" });
  validateBaselineRepositoryBinding(baseline.repository, first, second);
  validateNonClaims(baseline.non_claims);
  validatePointInTime(baseline.point_in_time);
  validateGoals(evidenceRoot, baseline.goals);
  const baselineGoalBindings = baseline.goals.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 }));
  if (JSON.stringify(first.goal_bindings) !== JSON.stringify(second.goal_bindings) || JSON.stringify(first.goal_bindings) !== JSON.stringify(baselineGoalBindings)) fail("GOAL_BINDING_MISMATCH", "baseline goals are not bound to both stable captures", { category: "goal_binding" });
  const currentHistoricalDir = historicalDir ?? baseline.historical_rf13.directory;
  const historicalNow = buildHistoricalRf13Inventory({ cwd: repositoryRoot, historicalDir: currentHistoricalDir });
  const historicalDrift = validateHistoricalContract(baseline.historical_rf13, historicalNow);
  if (historicalDrift.some((entry) => entry.status === "MISSING")) {
    fail("HISTORICAL_ARTIFACT_MISSING", "a historical RF13 evidence input is missing", { category: "historical_inventory" });
  }
  const current = readRf13SourceSnapshot({ cwd: repositoryRoot, captureId: "current" });
  const sourceDrift = compareCurrentSourceState(first, current);
  const goalDrift = safeCurrentGoalDrift(repositoryRoot, baseline.goals);
  const currentDrift = {
    classification: sourceDrift.length || goalDrift.length || historicalDrift.length ? "DRIFT_FROM_CAPTURE" : "MATCHES_CAPTURE",
    source_fields: sourceDrift,
    goals: goalDrift,
    historical_files: historicalDrift,
    baseline_authenticity: "VERIFIED",
  };
  if (strictCurrent && currentDrift.classification !== "MATCHES_CAPTURE") fail("CURRENT_DRIFT", "current worktree differs from the stored point-in-time baseline", { category: "current_drift" });
  return freezeDeep({
    schema_version: VALIDATOR_SCHEMA_VERSION,
    checkpoint_id: CHECKPOINT_ID,
    validator: "rf13-debt-remediation-baseline",
    verdict: "PASS",
    baseline_authenticity: "VERIFIED",
    capture: {
      byte_equivalent: true,
      files_changed_between_captures: 0,
      attempts: baseline.capture.attempts,
    },
    historical: {
      classification: baseline.historical_rf13.classification,
      conflict_detected: baseline.historical_rf13.conflicts.length > 0,
      formal_release_allowed: false,
      generations: baseline.historical_rf13.generations.map((generation) => generation.name),
      conflict_count: baseline.historical_rf13.conflicts.length,
    },
    current_drift: currentDrift,
  });
}
