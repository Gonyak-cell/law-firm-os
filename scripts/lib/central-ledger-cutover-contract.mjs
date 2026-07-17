import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

export const CUT_DEPENDENCY_BUNDLE_SCHEMA = "law-firm-os.runtime-safety.cut-dependency-bundle.v1";
export const CUT_SOURCE_INVENTORY_SCHEMA = "law-firm-os.runtime-safety.cut-source-inventory.v1";

export const CUT_REQUIRED_SOURCE_PATHS = Object.freeze([
  ".omo/plans/lawos-runtime-safety-147-command-catalog-20260717.md",
  "apps/api/src/home-dashboard-operational-state.js",
  "apps/api/src/home-dashboard-runtime-context.js",
  "apps/api/src/store-path-manifest.js",
  "packages/analytics/src/refresh-job-service.js",
  "packages/persistence/src/postgres/migrations/001_repository_port_v2.sql",
  "packages/persistence/src/postgres/migrations/002_identity_ledger.sql",
  "packages/persistence/src/postgres/migrations/003_domain_ledger.sql",
  "packages/persistence/src/postgres/migrations/004_dms_upload_runtime.sql",
  "scripts/generate-central-ledger-cutover-dependency-bundle.mjs",
  "scripts/generate-central-ledger-cutover-inventory.mjs",
  "scripts/lib/central-ledger-cutover-contract.mjs",
  "scripts/lib/offline-capability-outcome.mjs",
  "scripts/lib/runtime-safety-command-catalog.mjs",
  "scripts/lib/runtime-safety-decision-gate.mjs",
  "scripts/run-central-ledger-cutover.mjs",
  "scripts/run-offline-capability-outcome.mjs",
  "scripts/validate-central-ledger-cutover-readiness.mjs",
  "scripts/validate-offline-capability-decision.mjs",
  "scripts/validate-project-readiness-outcome.mjs",
  "scripts/validate-readiness-authority-decision.mjs",
  "workbook/lawos-offline-action-conflict-decision-packet-2026-07-17.json",
  "workbook/lawos-readiness-authority-decision-packet-2026-07-17.json",
  "workbook/lawos-runtime-safety-evidence/evidence-rerun-manifest-v0.2.json",
  "workbook/lawos-runtime-safety-evidence/RS-CUT-001/approval-packet.json",
  "workbook/lawos-runtime-safety-evidence/RS-CUT-004/decision-packet.json",
  "workbook/lawos-runtime-safety-evidence/RS-CUT-008/production-authorization.json",
]);

export const CUT_DEPENDENCY_SLOTS = Object.freeze([
  Object.freeze({ key: "dms-receipt", tuw_id: "RS-DMS-009", kind: "receipt" }),
  Object.freeze({ key: "dms-outcome", tuw_id: "RS-DMS-009", kind: "dms-source-readiness" }),
  Object.freeze({ key: "prj-005", tuw_id: "RS-PRJ-005", kind: "receipt" }),
  Object.freeze({ key: "prj-006", tuw_id: "RS-PRJ-006", kind: "receipt" }),
  Object.freeze({ key: "prj-outcome", tuw_id: "RS-PRJ-006", kind: "prj-outcome" }),
  ...Array.from({ length: 6 }, (_, index) => Object.freeze({ key: `off-00${index + 1}`, tuw_id: `RS-OFF-00${index + 1}`, kind: "receipt" })),
  Object.freeze({ key: "off-outcome", tuw_id: "RS-OFF-006", kind: "off-outcome" }),
  Object.freeze({ key: "cut-001", tuw_id: "RS-CUT-001", kind: "receipt" }),
]);

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  throw error;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function git(root, ...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function closedObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("CUT_SCHEMA", `${label} must be an object`);
  const extras = Object.keys(value).filter((key) => !keys.includes(key));
  if (extras.length > 0) fail("CUT_SCHEMA", `${label} contains unsupported fields`, { extras });
}

function resolveArtifact(root, path) {
  if (typeof path !== "string" || !path || isAbsolute(path)) fail("CUT_ARTIFACT_PATH", "artifact path must be repository-relative");
  const candidate = resolve(root, path);
  const rel = relative(resolve(root), candidate);
  if (rel === ".." || rel.startsWith("../") || !existsSync(candidate)) fail("CUT_ARTIFACT_PATH", "artifact path is missing or escapes the repository", { path });
  return candidate;
}

function artifactState(entry, value) {
  if (entry.kind === "receipt") {
    return {
      verified: value?.claims?.verified === true,
      source_sha: value?.target_source_sha,
      implementation_state: value?.implementation_state,
      execution_state: value?.execution_state,
    };
  }
  if (entry.kind === "dms-source-readiness") {
    return { verified: value?.claims?.source_checkpoint_verified === true, source_sha: value?.source_sha, outcome: value?.verdict };
  }
  return { verified: value?.verified === true, source_sha: value?.source_sha, outcome: value?.outcome };
}

export function validateCutDependencyBundle(bundle, { root = process.cwd(), expectedSourceSha, expectedSourceTree } = {}) {
  closedObject(bundle, ["schema_version", "source_sha", "source_tree", "artifacts", "claims"], "dependency bundle");
  if (bundle.schema_version !== CUT_DEPENDENCY_BUNDLE_SCHEMA) fail("CUT_SCHEMA", "unsupported dependency bundle schema");
  if (bundle.source_sha !== expectedSourceSha || bundle.source_tree !== expectedSourceTree) fail("CUT_SOURCE", "dependency bundle source binding does not match");
  closedObject(bundle.claims, ["external_actions_executed", "real_data_used", "release_executed", "go_live"], "dependency bundle claims");
  if (Object.values(bundle.claims).some((value) => value !== false && value !== 0)) fail("CUT_CLAIM", "dependency bundle contains an external or release claim");
  if (!Array.isArray(bundle.artifacts) || bundle.artifacts.length !== CUT_DEPENDENCY_SLOTS.length) fail("CUT_DEPENDENCY_CARDINALITY", "dependency bundle artifact cardinality is invalid");
  const byKey = new Map();
  for (const entry of bundle.artifacts) {
    closedObject(entry, ["key", "tuw_id", "kind", "path", "sha256", "source_sha"], "dependency artifact");
    if (byKey.has(entry.key)) fail("CUT_DEPENDENCY_DUPLICATE", "dependency artifact key is duplicated", { key: entry.key });
    byKey.set(entry.key, entry);
  }
  const states = {};
  for (const slot of CUT_DEPENDENCY_SLOTS) {
    const entry = byKey.get(slot.key);
    if (!entry || entry.tuw_id !== slot.tuw_id || entry.kind !== slot.kind) fail("CUT_DEPENDENCY_SLOT", "dependency artifact slot does not match", { key: slot.key });
    const bytes = readFileSync(resolveArtifact(root, entry.path));
    if (sha256(bytes) !== entry.sha256) fail("CUT_DEPENDENCY_HASH", "dependency artifact hash drifted", { key: slot.key });
    let value;
    try { value = JSON.parse(bytes); } catch { fail("CUT_DEPENDENCY_JSON", "dependency artifact is not JSON", { key: slot.key }); }
    const state = artifactState(entry, value);
    if (state.source_sha !== entry.source_sha) fail("CUT_DEPENDENCY_SOURCE", "dependency artifact source SHA drifted", { key: slot.key });
    states[slot.key] = state;
  }

  const blockers = [];
  if (!states["dms-receipt"].verified || !states["dms-outcome"].verified) blockers.push("RS-DMS-009");
  const prjTerminal = states["prj-outcome"].verified && states["prj-outcome"].outcome === "approved";
  if (!states["prj-005"].verified || !states["prj-006"].verified || !prjTerminal) blockers.push("RS-PRJ-005/006");
  const offTerminal = states["off-outcome"].verified && ["enabled", "disabled"].includes(states["off-outcome"].outcome);
  if (!offTerminal || Array.from({ length: 6 }, (_, index) => states[`off-00${index + 1}`]).some((state) => !state.verified)) blockers.push("RS-OFF-001..006");
  if (!states["cut-001"].verified) blockers.push("RS-CUT-001");
  return Object.freeze({
    valid: true,
    dependency_satisfied: blockers.length === 0,
    blockers: Object.freeze(blockers),
    artifact_count: bundle.artifacts.length,
    external_actions_executed: 0,
  });
}

export function createCutSourceInventory({ root = process.cwd(), sourceSha, dependencyBundle } = {}) {
  const sourceTree = git(root, "rev-parse", `${sourceSha}^{tree}`);
  const dependency = validateCutDependencyBundle(dependencyBundle, { root, expectedSourceSha: sourceSha, expectedSourceTree: sourceTree });
  const files = CUT_REQUIRED_SOURCE_PATHS.map((path) => {
    const row = git(root, "ls-tree", sourceSha, "--", path).split(/\s+/u);
    if (row.length < 4 || row[1] !== "blob") fail("CUT_SOURCE_PATH", "required source path is absent from the source commit", { path });
    const bytes = execFileSync("git", ["show", `${sourceSha}:${path}`], { cwd: root });
    return Object.freeze({ path, blob_oid: row[2], sha256: sha256(bytes) });
  });
  return Object.freeze({
    schema_version: CUT_SOURCE_INVENTORY_SCHEMA,
    source_sha: sourceSha,
    source_tree: sourceTree,
    files: Object.freeze(files),
    dependency_artifact_count: dependency.artifact_count,
    dependency_satisfied: dependency.dependency_satisfied,
    blockers: dependency.blockers,
    claims: Object.freeze({ external_actions_executed: 0, db_writes: 0, real_data_used: false, release_executed: false, go_live: false }),
  });
}

export function validateCutSourceInventory(inventory, { root = process.cwd(), dependencyBundle } = {}) {
  closedObject(inventory, ["schema_version", "source_sha", "source_tree", "files", "dependency_artifact_count", "dependency_satisfied", "blockers", "claims"], "source inventory");
  if (inventory.schema_version !== CUT_SOURCE_INVENTORY_SCHEMA) fail("CUT_SCHEMA", "unsupported source inventory schema");
  const rebuilt = createCutSourceInventory({ root, sourceSha: inventory.source_sha, dependencyBundle });
  if (JSON.stringify(rebuilt) !== JSON.stringify(inventory)) fail("CUT_SOURCE_INVENTORY_DRIFT", "source inventory does not match exact source or dependency bundle");
  return Object.freeze({ valid: true, source_sha: inventory.source_sha, source_tree: inventory.source_tree, dependency_satisfied: inventory.dependency_satisfied, blockers: inventory.blockers });
}

export function createCutDependencyBundle({ root = process.cwd(), sourceSha, artifacts } = {}) {
  const sourceTree = git(root, "rev-parse", `${sourceSha}^{tree}`);
  if (!Array.isArray(artifacts)) fail("CUT_DEPENDENCY_CARDINALITY", "artifacts must be an array");
  const normalized = artifacts.map((entry) => {
    const slot = CUT_DEPENDENCY_SLOTS.find((candidate) => candidate.key === entry.key);
    if (!slot) fail("CUT_DEPENDENCY_SLOT", "unknown dependency artifact key", { key: entry.key });
    const bytes = readFileSync(resolveArtifact(root, entry.path));
    let value;
    try { value = JSON.parse(bytes); } catch { fail("CUT_DEPENDENCY_JSON", "dependency artifact is not JSON", { key: entry.key }); }
    const state = artifactState(slot, value);
    if (!/^[0-9a-f]{40}$/u.test(state.source_sha ?? "")) fail("CUT_DEPENDENCY_SOURCE", "dependency artifact lacks a source SHA", { key: entry.key });
    return Object.freeze({ ...slot, path: entry.path, sha256: sha256(bytes), source_sha: state.source_sha });
  });
  return Object.freeze({
    schema_version: CUT_DEPENDENCY_BUNDLE_SCHEMA,
    source_sha: sourceSha,
    source_tree: sourceTree,
    artifacts: Object.freeze(normalized),
    claims: Object.freeze({ external_actions_executed: 0, real_data_used: false, release_executed: false, go_live: false }),
  });
}
