#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const resultDir = path.resolve("docs/claude-review-results");
const resultPath = path.join(resultDir, "goal1-claude-review.json");
const requestedModel = "claude-opus-4-8";
const requestedEffort = "max";
await mkdir(resultDir, { recursive: true });

const prompt = String.raw`
Perform a read-only independent Claude Code review of the Law Firm OS Goal 1 foundation slice.

Rules:
- Do not edit files.
- Do not mark PASS because packets exist; review the actual referenced files.
- Use the review packets:
  - docs/claude-review-packets/goal1-c00-rp00.json
  - docs/claude-review-packets/goal1-c01-rp01.json
  - docs/claude-review-packets/goal1-c02-rp02.json
  - docs/claude-review-packets/goal1-c03-rp03.json
- Review package.json, hermes/project.json, scripts/validate-goal1-foundation.mjs, contracts, packages/domain, packages/authz, and packages/audit.
- Do not treat docs/claude-review-results/goal1-claude-review.json as an input finding target; this run overwrites that file after your review completes.
- Do not run Bash or shell commands. Local Hermes/npm validation command evidence is collected outside this Claude Code review.

Return JSON only, with this shape:
{
  "overall_verdict": "PASS | PASS_WITH_FINDINGS | BLOCK",
  "blocks_goal1_closeout": true,
  "per_gate": {
    "C00": { "verdict": "PASS | PASS_WITH_FINDINGS | BLOCK", "summary": "..." },
    "C01": { "verdict": "PASS | PASS_WITH_FINDINGS | BLOCK", "summary": "..." },
    "C02": { "verdict": "PASS | PASS_WITH_FINDINGS | BLOCK", "summary": "..." },
    "C03": { "verdict": "PASS | PASS_WITH_FINDINGS | BLOCK", "summary": "..." }
  },
  "findings": [
    {
      "severity": "P0_BLOCKER | P1_MUST_FIX | P2_SHOULD_FIX | P3_NOTE",
      "title": "...",
      "file": "...",
      "line": null,
      "details": "...",
      "recommendation": "..."
    }
  ],
  "evidence_commands_run": ["..."],
  "review_notes": "..."
}
`;

const command = [
  "claude",
  "-p",
  "--model",
  requestedModel,
  "--permission-mode",
  "dontAsk",
  "--tools",
  "Read,Grep,Glob",
  "--max-budget-usd",
  "2",
  "--effort",
  requestedEffort,
  prompt,
];

const startedAt = new Date().toISOString();
const authCheck = spawnSync("claude", ["-p", "--model", requestedModel, "--effort", requestedEffort, "Return exactly: CLAUDE_CODE_AUTH_CHECK"], {
  cwd: process.cwd(),
  encoding: "utf8",
  maxBuffer: 1024 * 1024,
});

if (authCheck.status !== 0) {
  const reviewRecord = {
    schema_version: "law-firm-os.goal1-claude-review-result.v0.1",
    status: "review_failed_auth_required",
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    command: command.slice(0, -1),
    requested_model: requestedModel,
    requested_effort: requestedEffort,
    exit_code: authCheck.status,
    signal: authCheck.signal,
    stdout: authCheck.stdout ?? "",
    stderr: authCheck.stderr ?? "",
    parse_error: "Claude Code auth preflight failed before review execution.",
    parsed_review: null,
  };
  await writeFile(resultPath, `${JSON.stringify(reviewRecord, null, 2)}\n`);
  console.error("Goal 1 Claude review did not complete because Claude Code auth preflight failed.");
  console.error(`result: ${path.relative(process.cwd(), resultPath)}`);
  if (reviewRecord.stderr.trim()) console.error(reviewRecord.stderr.trim());
  if (reviewRecord.stdout.trim()) console.error(reviewRecord.stdout.trim());
  process.exit(1);
}

const result = spawnSync(command[0], command.slice(1), {
  cwd: process.cwd(),
  encoding: "utf8",
  maxBuffer: 1024 * 1024 * 10,
});

const stdout = result.stdout ?? "";
const stderr = result.stderr ?? "";
let parsedReview = null;
let parseError = null;

function extractJson(text) {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fencedMatch) return fencedMatch[1].trim();
  if (trimmed.startsWith("```")) {
    const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    if (match) return match[1].trim();
  }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

try {
  parsedReview = JSON.parse(extractJson(stdout));
} catch (error) {
  parseError = error.message;
}

const reviewRecord = {
  schema_version: "law-firm-os.goal1-claude-review-result.v0.1",
  status: result.status === 0 && parsedReview ? "review_completed" : "review_failed",
  started_at: startedAt,
  finished_at: new Date().toISOString(),
  command: command.slice(0, -1),
  requested_model: requestedModel,
  requested_effort: requestedEffort,
  exit_code: result.status,
  signal: result.signal,
  stdout,
  stderr,
  parse_error: parseError,
  parsed_review: parsedReview,
};

await writeFile(resultPath, `${JSON.stringify(reviewRecord, null, 2)}\n`);

if (reviewRecord.status !== "review_completed") {
  console.error("Goal 1 Claude review did not complete.");
  console.error(`result: ${path.relative(process.cwd(), resultPath)}`);
  if (stderr.trim()) console.error(stderr.trim());
  if (stdout.trim()) console.error(stdout.trim());
  process.exit(1);
}

console.log("Goal 1 Claude review completed.");
console.log(`result: ${path.relative(process.cwd(), resultPath)}`);
