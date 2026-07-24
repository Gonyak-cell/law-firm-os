#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  createJsonPostgresRecordAuthority,
  validateJsonPostgresRecordAuthority,
} from "../packages/persistence/src/postgres/source-adjudication.js";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new TypeError(`${name} is required`);
  }
  return value;
}

function repeated(name) {
  const values = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] !== name) continue;
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new TypeError(`${name} is required`);
    }
    values.push(value);
  }
  return values;
}

function expectedCount(name) {
  const value = Number(option(name));
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative integer`);
  }
  return value;
}

function git(...args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error(
    "record authority finalization requires a clean exact-head worktree",
  );
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
const inventory = readPrivateProgramJson(
  option("--inventory"),
  "safe source inventory",
);
const recommendations = readPrivateProgramJson(
  option("--recommendations"),
  "source adjudication recommendations",
);
const residualComparison = readPrivateProgramJson(
  option("--residual-comparison"),
  "residual structural comparison",
);
const authority = createJsonPostgresRecordAuthority({
  inventory,
  recommendations,
  residualComparison,
  decisionSetRef: option("--decision-set-ref"),
  ownerDecisionRef: option("--owner-decision-ref"),
  sourceSha,
  sourceTree,
  rootPriority: repeated("--root-priority"),
  canonicalMasterSourceRef: option("--canonical-master-source-ref"),
  crmProjectionSourceRef: option("--crm-projection-source-ref"),
  masterDataResidualRecordRefs:
    repeated("--master-data-residual-record-ref"),
});
validateJsonPostgresRecordAuthority(authority, {
  inventory,
  recommendations,
  residualComparison,
});
const expected = {
  source_count: expectedCount("--expected-source-count"),
  root_priority_record_decision_count:
    expectedCount("--expected-root-priority-record-decision-count"),
  canonical_master_record_decision_count:
    expectedCount("--expected-canonical-master-record-decision-count"),
  residual_record_count: expectedCount("--expected-residual-record-count"),
  duplicate_email_count: expectedCount("--expected-duplicate-email-count"),
  duplicate_matter_code_count:
    expectedCount("--expected-duplicate-matter-code-count"),
};
const observed = {
  source_count: authority.safe_counts.source_count,
  root_priority_record_decision_count:
    authority.record_decisions.filter((decision) =>
      decision.reason_code === "OWNER_ROOT_PRIORITY").length,
  canonical_master_record_decision_count:
    authority.record_decisions.filter((decision) =>
      decision.reason_code === "CANONICAL_MASTER_DATA").length,
  residual_record_count: authority.safe_counts.residual_record_count,
  duplicate_email_count: authority.safe_counts.duplicate_email_count,
  duplicate_matter_code_count:
    authority.safe_counts.duplicate_matter_code_count,
};
if (JSON.stringify(observed) !== JSON.stringify(expected)) {
  throw new Error("record authority expected counts drifted");
}
const outputDir = createPrivateProgramOutputDirectory(
  option("--output-dir"),
);
const manifest = writePrivateProgramJson(
  join(outputDir, "record-authority-manifest.json"),
  authority,
);
const summary = writePrivateProgramJson(
  join(outputDir, "record-authority-summary.json"),
  {
    schema_version:
      "law-firm-os.json-postgres-record-authority-summary.v1",
    source_sha: sourceSha,
    source_tree: sourceTree,
    inventory_content_sha256: authority.inventory_content_sha256,
    recommendation_sha256: authority.recommendation_sha256,
    residual_comparison_sha256:
      authority.policy.residual_comparison_sha256,
    authority_sha256: authority.authority_sha256,
    expected_counts: expected,
    observed_counts: observed,
    safe_counts: authority.safe_counts,
    claims: authority.claims,
  },
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  source_sha: sourceSha,
  source_tree: sourceTree,
  authority_sha256: authority.authority_sha256,
  manifest_path: manifest.path,
  manifest_file_sha256: manifest.sha256,
  summary_path: summary.path,
  summary_file_sha256: summary.sha256,
  expected_counts: expected,
  safe_counts: authority.safe_counts,
  source_mutated: false,
  postgres_mutated: false,
  production_contacted: false,
}, null, 2)}\n`);
