#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const resultPath = path.resolve("docs/claude-review-results/goal1-claude-review.json");
const errors = [];

let record;
try {
  record = JSON.parse(await readFile(resultPath, "utf8"));
} catch (error) {
  console.error("Goal 1 Claude review result validation failed:");
  console.error(`- missing or unreadable result file: ${path.relative(process.cwd(), resultPath)}`);
  console.error(`- ${error.message}`);
  process.exit(1);
}

if (record.schema_version !== "law-firm-os.goal1-claude-review-result.v0.1") {
  errors.push("schema_version mismatch");
}
if (record.status !== "review_completed") {
  errors.push(`review status must be review_completed, got ${record.status}`);
}
if (record.exit_code !== 0) {
  errors.push(`Claude Code exit_code must be 0, got ${record.exit_code}`);
}
if (record.requested_model !== "claude-opus-4-8") {
  errors.push(`Claude Code review must request claude-opus-4-8, got ${record.requested_model}`);
}
if (record.requested_effort !== "max") {
  errors.push(`Claude Code review effort must be max, got ${record.requested_effort}`);
}
if (!Array.isArray(record.command) || !record.command.includes("--model") || !record.command.includes("claude-opus-4-8")) {
  errors.push("Claude Code command must include --model claude-opus-4-8");
}
if (!Array.isArray(record.command) || !record.command.includes("--effort") || !record.command.includes("max")) {
  errors.push("Claude Code command must include --effort max");
}

const review = record.parsed_review;
if (!review) {
  errors.push("parsed_review is required");
} else {
  if (!["PASS", "PASS_WITH_FINDINGS"].includes(review.overall_verdict)) {
    errors.push(`overall_verdict must be PASS or PASS_WITH_FINDINGS, got ${review.overall_verdict}`);
  }
  if (review.blocks_goal1_closeout === true) {
    errors.push("Claude review blocks Goal 1 closeout");
  }
  for (const gate of ["C00", "C01", "C02", "C03"]) {
    const verdict = review.per_gate?.[gate]?.verdict;
    if (!["PASS", "PASS_WITH_FINDINGS"].includes(verdict)) {
      errors.push(`${gate} verdict must be PASS or PASS_WITH_FINDINGS, got ${verdict}`);
    }
  }
  for (const finding of review.findings ?? []) {
    if (["P0_BLOCKER", "P1_MUST_FIX"].includes(finding.severity)) {
      errors.push(`blocking Claude finding remains: ${finding.severity} ${finding.title}`);
    }
  }
  if (!Array.isArray(review.evidence_commands_run)) {
    errors.push("Claude review must include evidence_commands_run array");
  }
}

if (errors.length > 0) {
  console.error("Goal 1 Claude review result validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Goal 1 Claude review result validation passed.");
console.log(`overall_verdict: ${review.overall_verdict}`);
console.log(`requested_model: ${record.requested_model}`);
console.log(`requested_effort: ${record.requested_effort}`);
if (review.evidence_commands_run.length === 0) {
  console.log("note: Claude Code review completed without Bash command evidence; use local Hermes/npm validation output as command evidence.");
}
