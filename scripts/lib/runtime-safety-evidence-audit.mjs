import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { EXECUTION_STATES, validateRuntimeSafetyEvidence } from "./runtime-safety-evidence-contract.mjs";
import { isAllowedRuntimeSafetyEvidencePath } from "./runtime-safety-evidence-materializer.mjs";

export const LEGACY_REQUIRED_FIELDS = Object.freeze([
  "schema_version",
  "tuw_id",
  "implementation_state",
  "execution_state",
  "source_sha",
  "tree",
  "profile",
  "command",
  "exit_code",
  "started_at",
  "finished_at",
  "safe_counts",
  "claims",
]);

export const EXPECTED_LEGACY_AUDIT = Object.freeze({
  legacy_receipt_count: 113,
  complete_legacy_receipt_count: 8,
  missing_required_field_receipt_count: 105,
  missing_started_at_count: 105,
  missing_finished_at_count: 105,
  missing_safe_counts_count: 87,
  missing_profile_count: 75,
  missing_command_count: 21,
  missing_exit_code_count: 21,
  invalid_execution_state_count: 88,
});

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function git(repoRoot, args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function parseRuntimeSafetyTuwIds(planText) {
  const ids = planText.split("\n")
    .map((line) => line.match(/^\| `(RS-[A-Z]+-\d{3})` \|/)?.[1])
    .filter(Boolean);
  if (ids.length !== 147 || new Set(ids).size !== 147) throw new Error("governing plan must contain exactly 147 unique TUW rows");
  return ids;
}

export function auditLegacyRuntimeSafetyEvidence({ evidenceRoot, planText }) {
  const plannedIds = parseRuntimeSafetyTuwIds(planText);
  const planned = new Set(plannedIds);
  const directories = readdirSync(evidenceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^RS-[A-Z]+-\d{3}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const unknown_directories = directories.filter((id) => !planned.has(id));
  const rows = [];
  const missingFields = Object.fromEntries(LEGACY_REQUIRED_FIELDS.map((field) => [field, []]));
  let complete = 0;
  let invalidExecutionState = 0;
  for (const id of plannedIds) {
    const legacyPath = join(evidenceRoot, id, "command-evidence.json");
    const v02Path = join(evidenceRoot, id, "command-evidence.v0.2.json");
    if (!existsSync(legacyPath)) continue;
    const receipt = readJson(legacyPath);
    const missing = LEGACY_REQUIRED_FIELDS.filter((field) => !(field in receipt));
    for (const field of missing) missingFields[field].push(id);
    if (missing.length === 0) complete += 1;
    if (!EXECUTION_STATES.includes(receipt.execution_state)) invalidExecutionState += 1;
    rows.push({
      tuw_id: id,
      legacy_path: relative(process.cwd(), legacyPath).replaceAll("\\", "/"),
      legacy_sha256: sha256File(legacyPath),
      selected_schema: existsSync(v02Path) ? "v0.2" : "v0.1",
      v0_2_present: existsSync(v02Path),
      missing_fields: missing,
      execution_state_valid: EXECUTION_STATES.includes(receipt.execution_state),
    });
  }
  const summary = {
    legacy_receipt_count: rows.length,
    complete_legacy_receipt_count: complete,
    missing_required_field_receipt_count: rows.filter((row) => row.missing_fields.length > 0).length,
    missing_started_at_count: missingFields.started_at.length,
    missing_finished_at_count: missingFields.finished_at.length,
    missing_safe_counts_count: missingFields.safe_counts.length,
    missing_profile_count: missingFields.profile.length,
    missing_command_count: missingFields.command.length,
    missing_exit_code_count: missingFields.exit_code.length,
    invalid_execution_state_count: invalidExecutionState,
  };
  const drift = Object.entries(EXPECTED_LEGACY_AUDIT)
    .filter(([key, expected]) => summary[key] !== expected)
    .map(([key, expected]) => ({ key, expected, actual: summary[key] }));
  return Object.freeze({
    verdict: drift.length === 0 && unknown_directories.length === 0 ? "PASS" : "FAIL",
    mode: "audit",
    planned_tuw_count: plannedIds.length,
    ...summary,
    unknown_directories,
    drift,
    missing_field_ids: missingFields,
    rows,
  });
}

function validateLegacyBinding(receipt, legacyPath) {
  if (!receipt.legacy_evidence || typeof receipt.legacy_evidence !== "object") return "missing legacy_evidence binding";
  if (receipt.legacy_evidence.path !== legacyPath.replaceAll("\\", "/")) return "legacy_evidence path mismatch";
  if (receipt.legacy_evidence.sha256 !== sha256File(legacyPath)) return "legacy_evidence hash mismatch";
  return null;
}

function validateLineage({ repoRoot, evidenceRoot, id, receipt }) {
  const runManifestPath = join(evidenceRoot, id, "run-manifest.json");
  if (!existsSync(runManifestPath)) return ["missing run-manifest.json"];
  const manifest = readJson(runManifestPath);
  const failures = [];
  if (manifest.target_source_sha !== receipt.target_source_sha || manifest.target_tree !== receipt.target_tree) failures.push("run manifest target binding mismatch");
  if (!/^[0-9a-f]{40}$/.test(manifest.evidence_commit ?? "")) failures.push("run manifest evidence_commit is invalid");
  if (failures.length) return failures;
  try {
    git(repoRoot, ["cat-file", "-e", `${manifest.evidence_commit}^{commit}`]);
    git(repoRoot, ["merge-base", "--is-ancestor", receipt.target_source_sha, manifest.evidence_commit]);
    const changed = git(repoRoot, ["diff-tree", "--no-commit-id", "--name-only", "-r", manifest.evidence_commit]).split("\n").filter(Boolean);
    if (changed.length === 0 || changed.some((path) => !isAllowedRuntimeSafetyEvidencePath(path))) failures.push("evidence commit contains a non-allowlisted path");
  } catch {
    failures.push("evidence lineage is not reachable from the target source");
  }
  return failures;
}

export function validateStrictRuntimeSafetyEvidence({
  repoRoot,
  evidenceRoot,
  planText,
  allowedOutputRoots = [],
  requireClean = true,
}) {
  const plannedIds = parseRuntimeSafetyTuwIds(planText);
  const failures = [];
  if (requireClean) {
    const porcelain = git(repoRoot, ["status", "--porcelain=v1"]);
    if (porcelain) failures.push({ code: "STRICT_DIRTY_SOURCE", detail: "source checkout is not clean" });
  }
  let valid = 0;
  for (const id of plannedIds) {
    const path = join(evidenceRoot, id, "command-evidence.v0.2.json");
    if (!existsSync(path)) {
      failures.push({ tuw_id: id, code: "STRICT_V0_2_MISSING" });
      continue;
    }
    let receipt;
    try {
      receipt = readJson(path);
      validateRuntimeSafetyEvidence(receipt, { allowedOutputRoots });
    } catch (error) {
      failures.push({ tuw_id: id, code: error.code ?? "STRICT_RECEIPT", detail: error.message });
      continue;
    }
    if (receipt.tuw_id !== id) failures.push({ tuw_id: id, code: "STRICT_TUW_ID_MISMATCH" });
    try {
      git(repoRoot, ["cat-file", "-e", `${receipt.target_source_sha}^{commit}`]);
      const tree = git(repoRoot, ["rev-parse", `${receipt.target_source_sha}^{tree}`]);
      if (tree !== receipt.target_tree) failures.push({ tuw_id: id, code: "STRICT_TREE_MISMATCH" });
    } catch {
      failures.push({ tuw_id: id, code: "STRICT_TARGET_MISSING" });
    }
    const legacyPath = join(evidenceRoot, id, "command-evidence.json");
    if (existsSync(legacyPath)) {
      const relativeLegacyPath = relative(repoRoot, legacyPath);
      const issue = validateLegacyBinding(receipt, relativeLegacyPath);
      if (issue) failures.push({ tuw_id: id, code: "STRICT_LEGACY_BINDING", detail: issue });
    }
    for (const issue of validateLineage({ repoRoot, evidenceRoot, id, receipt })) {
      failures.push({ tuw_id: id, code: "STRICT_LINEAGE", detail: issue });
    }
    valid += 1;
  }
  return Object.freeze({
    verdict: failures.length === 0 ? "PASS" : "FAIL",
    mode: "strict",
    planned_tuw_count: plannedIds.length,
    valid_v0_2_count: valid,
    failure_count: failures.length,
    failures,
  });
}
