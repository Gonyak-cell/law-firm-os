#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  MAX_PROMPT_BYTES,
  READ_ONLY_TOOLS,
  REQUIRED_EFFORT,
  REQUIRED_MODEL,
  byteLength,
  canonicalToolsString,
  containsForbiddenTool,
  detectAuthFailureText,
  detectFullDiffOrSourcePrompt,
  exists,
  hasOnlyReadOnlyTools,
  normalizePackId,
  parseArgs,
  readJson,
  reviewArtifactRoot,
  writeJson,
} from "./lib/closeout-pack-claude-review-hardening.mjs";
import { readFile } from "node:fs/promises";

const args = parseArgs(process.argv.slice(2));
const packId = normalizePackId(args._[0]);
const root = args.dir ?? reviewArtifactRoot(packId);
const errors = [];
const warnings = [];

async function requireFile(relativePath, label) {
  if (!(await exists(relativePath))) errors.push(`${label} missing: ${relativePath}`);
}

const requestPath = path.join(root, "review-request.json");
const baselinePath = path.join(root, "review-baseline.json");
const scopePath = path.join(root, "changed-file-scope.json");
const reportPath = path.join(root, "validation-report.json");
const promptPath = path.join(root, "prompt.txt");

for (const [file, label] of [
  [requestPath, "review request"],
  [baselinePath, "review baseline"],
  [scopePath, "changed file scope"],
  [reportPath, "validation report"],
  [promptPath, "prompt"],
]) {
  await requireFile(file, label);
}

let request = null;
let baseline = null;
let scope = null;
let report = null;
let prompt = "";
if (errors.length === 0) {
  request = await readJson(requestPath);
  baseline = await readJson(baselinePath);
  scope = await readJson(scopePath);
  report = await readJson(reportPath);
  prompt = await readFile(path.resolve(promptPath), "utf8");
}

if (request) {
  if (request.model !== REQUIRED_MODEL) errors.push(`model must be ${REQUIRED_MODEL}`);
  if (request.effort !== REQUIRED_EFFORT) errors.push(`effort must be ${REQUIRED_EFFORT}`);
  if (request.permission_mode !== "dontAsk") errors.push("permission_mode must be dontAsk");
  if (request.read_only !== true) errors.push("request must be read_only");
  if (request.tools_string === "" || canonicalToolsString(request.tools) === "") errors.push('--tools "" is forbidden for CP00 review hardening');
  if (!hasOnlyReadOnlyTools(request.tools)) errors.push(`tools must be ${canonicalToolsString(READ_ONLY_TOOLS)}`);
  if (containsForbiddenTool(request.tools)) errors.push("forbidden mutation or shell tool present");
  if (!request.json_schema_ref || !(await exists(request.json_schema_ref))) errors.push("review schema missing");
}

if (baseline) {
  if (!["read_tools_used", "curated_excerpts_with_hashes"].includes(baseline.source_inspection_mode)) {
    errors.push("source_inspection_mode must be read_tools_used or curated_excerpts_with_hashes");
  }
  if (baseline.summary_only_review_allowed === true && (baseline.summary_only_prohibited_reasons ?? []).length > 0) {
    errors.push("summary_only review is incorrectly allowed despite prohibited reasons");
  }
}

if (scope?.active_untracked_implementation_files_omitted?.length > 0) {
  errors.push(`active untracked implementation file(s) omitted: ${scope.active_untracked_implementation_files_omitted.join(", ")}`);
}

const promptBytes = byteLength(prompt);
if (promptBytes > MAX_PROMPT_BYTES) errors.push(`prompt size ${promptBytes} exceeds ${MAX_PROMPT_BYTES}`);
if (detectFullDiffOrSourcePrompt(prompt)) errors.push("prompt contains full diff/source patterns");
if (report?.prompt_contains_full_diff_or_source === true) errors.push("validation-report marks prompt as containing full diff/source");
if (report?.prompt_size_ok !== true) errors.push("validation-report prompt_size_ok must be true");

let authPreflight = { status: "not_run" };
if (errors.length === 0) {
  const auth = spawnSync(
    "claude",
    [
      "-p",
      "Return exactly this JSON object and nothing else: {\"ok\":true,\"purpose\":\"closeout-pack-review-readiness-auth-preflight\"}",
      "--model",
      REQUIRED_MODEL,
      "--effort",
      REQUIRED_EFFORT,
      "--permission-mode",
      "dontAsk",
      "--tools",
      canonicalToolsString(READ_ONLY_TOOLS),
      "--output-format",
      "json",
    ],
    { cwd: process.cwd(), encoding: "utf8", maxBuffer: 1024 * 1024, timeout: 90_000 },
  );
  authPreflight = {
    status: auth.status === 0 ? "passed" : "failed",
    exit_code: auth.status,
    signal: auth.signal,
    stdout_bytes: byteLength(auth.stdout ?? ""),
    stderr_bytes: byteLength(auth.stderr ?? ""),
    stdout_excerpt: (auth.stdout ?? "").slice(0, 500),
    stderr_excerpt: (auth.stderr ?? "").slice(0, 500),
  };
  if (auth.status !== 0 || detectAuthFailureText(`${auth.stdout ?? ""}\n${auth.stderr ?? ""}`)) {
    errors.push("Claude auth preflight failed before review execution");
  }
} else {
  warnings.push("auth preflight skipped because static readiness checks failed; this is not a review attempt");
}

const readiness = {
  schema_version: "law-firm-os.closeout-pack-claude-review-readiness.v0.1",
  pack_id: packId,
  status: errors.length === 0 ? "ready" : "not_ready",
  ready: errors.length === 0,
  checked_at: new Date().toISOString(),
  prompt_bytes: promptBytes,
  auth_preflight: authPreflight,
  errors,
  warnings,
  review_attempt_counted: false,
};
await writeJson(path.join(root, "readiness-report.json"), readiness);

if (errors.length > 0) {
  console.error("Closeout pack Claude review readiness failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Closeout pack Claude review readiness passed for ${packId}.`);
console.log(`readiness: ${path.join(root, "readiness-report.json")}`);
