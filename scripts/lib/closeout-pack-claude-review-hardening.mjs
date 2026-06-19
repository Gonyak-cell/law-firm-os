import { spawnSync } from "node:child_process";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const REVIEW_HARDENING_VERSION = "law-firm-os.closeout-pack-claude-review-hardening.v0.1";
export const REVIEW_RECEIPT_SCHEMA_VERSION = "law-firm-os.closeout-pack-claude-review-receipt.v0.1";
export const REVIEW_BASELINE_SCHEMA_VERSION = "law-firm-os.closeout-pack-claude-review-baseline.v0.1";
export const MAX_PROMPT_BYTES = 25 * 1024;
export const REQUIRED_MODEL = "claude-opus-4-8";
export const REQUIRED_EFFORT = "max";
export const READ_ONLY_TOOLS = Object.freeze(["Read", "Grep", "Glob"]);
export const FORBIDDEN_TOOL_PATTERNS = Object.freeze([
  "Bash",
  "Edit",
  "Write",
  "MultiEdit",
  "NotebookEdit",
  "WebFetch",
  "WebSearch",
  "mcp__",
  "connector",
  "api_mutation",
  "direct_file_write",
]);

export function normalizePackId(value) {
  const packId = String(value ?? "").trim().toUpperCase();
  if (!/^CP00-\d{3,}$/.test(packId)) throw new Error(`Expected pack id like CP00-178, got ${value}`);
  return packId;
}

export function packNumber(packId) {
  const match = /^CP00-(\d{3,})$/.exec(packId);
  return match ? Number(match[1]) : Number.NaN;
}

export function packSlug(packId) {
  return normalizePackId(packId).toLowerCase();
}

export function reviewArtifactRoot(packId) {
  return path.join("artifacts", "closeout-pack-claude-review", packSlug(packId));
}

export async function exists(relativePath) {
  try {
    await access(path.resolve(relativePath));
    return true;
  } catch {
    return false;
  }
}

export async function readJson(relativePath) {
  return JSON.parse(await readFile(path.resolve(relativePath), "utf8"));
}

export async function writeJson(relativePath, value) {
  await mkdir(path.dirname(path.resolve(relativePath)), { recursive: true });
  await writeFile(path.resolve(relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

export function byteLength(text) {
  return Buffer.byteLength(String(text), "utf8");
}

export function canonicalToolsString(tools = READ_ONLY_TOOLS) {
  return Array.isArray(tools) ? tools.join(",") : String(tools ?? "");
}

export function hasOnlyReadOnlyTools(tools) {
  const value = canonicalToolsString(tools);
  return value === canonicalToolsString(READ_ONLY_TOOLS);
}

export function containsForbiddenTool(tools) {
  const value = canonicalToolsString(tools);
  return FORBIDDEN_TOOL_PATTERNS.some((pattern) => value.includes(pattern));
}

export function detectFullDiffOrSourcePrompt(prompt) {
  const text = String(prompt ?? "");
  const patterns = [
    /diff --git /,
    /\n@@ [^\n]+ @@/,
    /\n--- [ab]\//,
    /\n\+\+\+ [ab]\//,
    /Changed file contents:/i,
    /--- packages\/.+ ---\n[\s\S]{500,}/,
    /BEGIN FULL SOURCE/i,
    /BEGIN FULL DIFF/i,
  ];
  return patterns.some((pattern) => pattern.test(text));
}

export function isImplementationLikePath(filePath) {
  return /^(apps|contracts|packages|scripts|hermes)\//.test(filePath);
}

export function getReviewSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "overall_verdict",
      "blocks_pack_closeout",
      "blocks_goal_closeout",
      "no_unresolved_p0",
      "no_unresolved_p1",
      "summary",
      "findings",
      "finding_counts",
    ],
    properties: {
      overall_verdict: { type: "string", enum: ["PASS", "PASS_WITH_FINDINGS", "BLOCK"] },
      blocks_pack_closeout: { type: "boolean" },
      blocks_goal_closeout: { type: "boolean" },
      no_unresolved_p0: { type: "boolean" },
      no_unresolved_p1: { type: "boolean" },
      summary: { type: "string" },
      findings: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "severity", "title", "file", "line", "details", "recommendation", "post_review_disposition"],
          properties: {
            id: { type: "string" },
            severity: { type: "string", enum: ["P0", "P1", "P2", "P3"] },
            title: { type: "string" },
            file: { type: "string" },
            line: { anyOf: [{ type: "integer" }, { type: "null" }] },
            details: { type: "string" },
            recommendation: { type: "string" },
            post_review_disposition: { type: "string" },
          },
        },
      },
      finding_counts: {
        type: "object",
        additionalProperties: false,
        required: ["p0", "p1", "p2", "p3", "reported_p0", "reported_p1", "reported_p2", "reported_p3"],
        properties: {
          p0: { type: "integer" },
          p1: { type: "integer" },
          p2: { type: "integer" },
          p3: { type: "integer" },
          reported_p0: { type: "integer" },
          reported_p1: { type: "integer" },
          reported_p2: { type: "integer" },
          reported_p3: { type: "integer" },
        },
      },
    },
  };
}

export function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

export function runGitStatus() {
  const result = spawnSync("git", ["status", "--porcelain=v1", "-z"], { encoding: "buffer", maxBuffer: 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git status failed: ${result.stderr.toString("utf8")}`);
  const entries = result.stdout.toString("utf8").split("\0").filter(Boolean);
  const rows = entries.map((entry) => {
    const status = entry.slice(0, 2);
    const file = entry.slice(3);
    return { status, file, untracked: status === "??", modified: status.includes("M"), added: status.includes("A") };
  });
  return rows;
}

export async function readPlanPack(packId) {
  const plan = await readJson("docs/closeout-pack-plan/closeout-pack-plan.json");
  const pack = plan.packs?.find((candidate) => candidate.pack_id === packId);
  if (!pack) {
    const manifest = await readManifestIfPresent(packId);
    if (manifest?.plan_binding_snapshot?.pack_id === packId) return manifest.plan_binding_snapshot;
    throw new Error(`${packId} is not present in docs/closeout-pack-plan/closeout-pack-plan.json`);
  }
  return pack;
}

export async function readManifestIfPresent(packId) {
  const manifestPath = path.join("docs", "closeout-packs", packSlug(packId), "manifest.json");
  if (!(await exists(manifestPath))) return null;
  return readJson(manifestPath);
}

export function validationCommandList(packId) {
  void packId;
  const commands = [
    "npm run closeout-pack-plan:validate",
    "npm run closeout-pack:validate",
    "npm test",
    "npm run validate",
    "npm run spec:requirements:validate",
    "npm run weighted:validate",
    "npm run fullplan:validate",
    "npm run goal:closeout:validate",
    "npm run rp00:control-plane:validate",
    "git diff --check",
  ];
  return Object.freeze(commands);
}

export function detectAuthFailureText(text) {
  return /not logged in|please run \/login|auth required|authentication failed|login required/i.test(String(text ?? ""));
}

export function detectToolCallShapedOutput(text) {
  return /<function_calls>|<\/function_calls>|"type"\s*:\s*"tool_use"|"tool_call"|function_call|^\s*(Read|Grep|Glob|Bash)\s*\(/im.test(
    String(text ?? ""),
  );
}

export function parseStrictJsonText(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return { ok: false, error: "stdout_0_bytes" };
  if (trimmed.startsWith("```") || /```json/i.test(trimmed)) {
    return { ok: false, error: "fenced_json_or_prose_output" };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch (error) {
    return { ok: false, error: `malformed_json: ${error.message}` };
  }
}

export function validateParsedReviewShape(parsedReview) {
  const errors = [];
  if (!parsedReview || typeof parsedReview !== "object") errors.push("parsed_review must be an object");
  for (const field of [
    "overall_verdict",
    "blocks_pack_closeout",
    "blocks_goal_closeout",
    "no_unresolved_p0",
    "no_unresolved_p1",
    "summary",
    "findings",
    "finding_counts",
  ]) {
    if (parsedReview?.[field] === undefined) errors.push(`parsed_review missing ${field}`);
  }
  if (!["PASS", "PASS_WITH_FINDINGS", "BLOCK"].includes(parsedReview?.overall_verdict)) {
    errors.push("parsed_review overall_verdict must be PASS, PASS_WITH_FINDINGS, or BLOCK");
  }
  if (!Array.isArray(parsedReview?.findings)) errors.push("parsed_review findings must be an array");
  for (const field of ["p0", "p1", "p2", "p3", "reported_p0", "reported_p1", "reported_p2", "reported_p3"]) {
    if (typeof parsedReview?.finding_counts?.[field] !== "number") errors.push(`parsed_review finding_counts.${field} must be a number`);
  }
  return errors;
}

export async function countValidReceipts(packId, receiptPath) {
  const root = reviewArtifactRoot(packId);
  if (!(await exists(root))) return 0;
  const entries = await readdir(path.resolve(root));
  let count = 0;
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const candidate = path.join(root, entry);
    if (receiptPath && path.resolve(candidate) === path.resolve(receiptPath)) {
      // Count below through normal path too.
    }
    try {
      const json = await readJson(candidate);
      if (json.schema_version === REVIEW_RECEIPT_SCHEMA_VERSION && json.pack_id === packId && json.valid_review === true) {
        count += 1;
      }
    } catch {}
  }
  return count;
}

export function normalizeRawClaudeReviewReceipt({ packId, request, raw, rawPath, requestPath, root }) {
  const invalidReasons = [];
  const stdout = raw.stdout ?? "";
  const stderr = raw.stderr ?? "";
  const combined = `${stdout}\n${stderr}`;
  if (raw.status !== 0 && detectAuthFailureText(combined)) invalidReasons.push("auth_failure");
  if (byteLength(stdout) === 0) invalidReasons.push("stdout_0_bytes");
  if (detectToolCallShapedOutput(combined)) invalidReasons.push("tool_call_shaped_output");

  let cliOutput = null;
  let parsedReview = null;
  if (invalidReasons.length === 0) {
    const parsed = parseStrictJsonText(stdout);
    if (!parsed.ok) {
      invalidReasons.push(parsed.error);
    } else {
      cliOutput = parsed.value;
      const cliErrorText = [
        cliOutput?.api_error_status,
        cliOutput?.error,
        cliOutput?.message,
        cliOutput?.is_error === true ? cliOutput?.result : null,
        stderr,
      ]
        .filter(Boolean)
        .join("\n");
      if (cliOutput?.is_error === true || detectAuthFailureText(cliErrorText)) invalidReasons.push("auth_or_cli_error");
      if ((cliOutput?.permission_denials ?? []).length > 0) invalidReasons.push("permission_denials_present");
      if (typeof cliOutput?.result === "string") {
        if (/```/.test(cliOutput.result)) invalidReasons.push("fenced_json_with_prose");
        if (detectToolCallShapedOutput(cliOutput.result)) invalidReasons.push("tool_call_shaped_output");
      }
      if (cliOutput?.structured_output && typeof cliOutput.structured_output === "object") {
        parsedReview = cliOutput.structured_output;
      } else {
        invalidReasons.push("structured_output_missing");
      }
    }
  }

  const shapeErrors = parsedReview ? validateParsedReviewShape(parsedReview) : ["parsed_review missing"];
  if (shapeErrors.length > 0) invalidReasons.push(...shapeErrors.map((error) => `required_field_error: ${error}`));

  const counts = parsedReview?.finding_counts ?? {};
  const noBlockingFindings = (counts.p0 ?? 1) === 0 && (counts.p1 ?? 1) === 0 && (counts.p2 ?? 1) === 0;
  const closeoutEligible =
    invalidReasons.length === 0 &&
    ["PASS", "PASS_WITH_FINDINGS"].includes(parsedReview?.overall_verdict) &&
    parsedReview?.blocks_pack_closeout !== true &&
    parsedReview?.blocks_goal_closeout !== true &&
    noBlockingFindings;

  return {
    schema_version: REVIEW_RECEIPT_SCHEMA_VERSION,
    pack_id: normalizePackId(packId),
    normalized_at: new Date().toISOString(),
    status: invalidReasons.length === 0 ? "valid_review" : "invalid_review",
    valid_review: invalidReasons.length === 0,
    closeout_eligible: closeoutEligible,
    invalid_reason: invalidReasons.length === 0 ? null : invalidReasons.join("; "),
    baseline_ref: path.join(root, "review-baseline.json"),
    request_ref: requestPath,
    readiness_ref: path.join(root, "readiness-report.json"),
    raw_output_ref: rawPath,
    review_execution: {
      source: "claude_cli",
      runner: "scripts/run-closeout-pack-claude-review.mjs",
      model: request.model ?? REQUIRED_MODEL,
      effort: request.effort ?? REQUIRED_EFFORT,
      read_only: true,
      permission_mode: "dontAsk",
      tools: canonicalToolsString(request.tools ?? READ_ONLY_TOOLS),
      output_format: "json",
      json_schema: true,
      status: raw.status,
      signal: raw.signal,
      session_id: cliOutput?.session_id ?? raw.claude_cli?.session_id ?? null,
      uuid: cliOutput?.uuid ?? raw.claude_cli?.uuid ?? null,
      total_cost_usd: cliOutput?.total_cost_usd ?? raw.claude_cli?.total_cost_usd ?? null,
      permission_denials: cliOutput?.permission_denials ?? raw.claude_cli?.permission_denials ?? [],
    },
    raw_output: {
      stdout_bytes: byteLength(stdout),
      stderr_bytes: byteLength(stderr),
      api_error_status: cliOutput?.api_error_status ?? raw.claude_cli?.api_error_status ?? null,
      terminal_reason: cliOutput?.terminal_reason ?? raw.claude_cli?.terminal_reason ?? null,
    },
    parsed_review: parsedReview,
  };
}

export function validateReviewReceiptObject(packId, receipt) {
  const errors = [];
  const add = (message) => errors.push(message);
  const requireEqual = (actual, expected, label) => {
    if (actual !== expected) add(`${label} must be ${expected}, got ${actual}`);
  };
  const requireTrue = (actual, label) => {
    if (actual !== true) add(`${label} must be true`);
  };
  requireEqual(receipt.schema_version, REVIEW_RECEIPT_SCHEMA_VERSION, "schema_version");
  requireEqual(receipt.pack_id, normalizePackId(packId), "pack_id");
  requireTrue(receipt.valid_review, "valid_review");
  requireTrue(receipt.closeout_eligible, "closeout_eligible");
  requireEqual(receipt.invalid_reason, null, "invalid_reason");
  requireEqual(receipt.review_execution?.source, "claude_cli", "review source");
  requireEqual(receipt.review_execution?.runner, "scripts/run-closeout-pack-claude-review.mjs", "runner");
  requireEqual(receipt.review_execution?.model, REQUIRED_MODEL, "model");
  requireEqual(receipt.review_execution?.effort, REQUIRED_EFFORT, "effort");
  requireTrue(receipt.review_execution?.read_only, "read_only");
  requireEqual(receipt.review_execution?.permission_mode, "dontAsk", "permission_mode");
  requireEqual(receipt.review_execution?.tools, canonicalToolsString(READ_ONLY_TOOLS), "tools");
  requireEqual(receipt.review_execution?.status, 0, "raw status");
  if (!receipt.review_execution?.session_id) add("session_id is required");
  if (!receipt.review_execution?.uuid) add("uuid is required");
  if (typeof receipt.review_execution?.total_cost_usd !== "number") add("total_cost_usd must be a number");
  if ((receipt.review_execution?.permission_denials ?? []).length !== 0) add("permission_denials must be empty");
  if ((receipt.raw_output?.stdout_bytes ?? 0) <= 0) add("stdout_bytes must be greater than 0");
  if (!["PASS", "PASS_WITH_FINDINGS"].includes(receipt.parsed_review?.overall_verdict)) add("overall_verdict must be PASS or PASS_WITH_FINDINGS");
  if (receipt.parsed_review?.blocks_pack_closeout === true) add("blocks_pack_closeout must not be true");
  if (receipt.parsed_review?.blocks_goal_closeout === true) add("blocks_goal_closeout must not be true");
  for (const severity of ["p0", "p1", "p2"]) {
    requireEqual(receipt.parsed_review?.finding_counts?.[severity], 0, `${severity} finding count`);
  }
  return errors;
}
