import { createHash } from "node:crypto";
import { isAbsolute, normalize, relative, resolve, sep } from "node:path";

export const EVIDENCE_SCHEMA_VERSION = "law-firm-os.runtime-safety.command-evidence.v0.2";

export const IMPLEMENTATION_STATES = Object.freeze([
  "PLANNED",
  "READY",
  "IN_PROGRESS",
  "VERIFIED",
  "BLOCKED",
  "BLOCKED_NOT_REPRODUCIBLE",
  "DISABLED_BY_APPROVED_DECISION",
]);

export const EXECUTION_STATES = Object.freeze([
  "NOT_APPLICABLE",
  "APPROVAL_REQUIRED",
  "EXECUTE_READY",
  "EXECUTED",
  "REHEARSED",
  "BLOCKED_EXTERNAL",
]);

export const EVIDENCE_PROFILES = Object.freeze([
  "source-local",
  "source-browser-local",
  "provider-neutral-local",
  "disposable-postgres",
  "internal-unsigned-package",
  "approval-packet-local-only",
  "external-authorized",
  "blocked-external",
]);

export const CLOSED_CLAIM_KEYS = Object.freeze([
  "verified",
  "source_merge_candidate",
  "dms_source_checkpoint_verified",
  "production_ready",
  "release_executed",
  "aws_mutation_executed",
  "provider_contacted",
  "idp_contacted",
  "staging_contacted",
  "production_contacted",
  "real_data_contacted",
  "windows_signing_executed",
  "cutover_executed",
  "json_authority_disabled",
  "go_live",
]);

const REQUIRED_FIELDS = Object.freeze([
  "schema_version",
  "tuw_id",
  "implementation_state",
  "execution_state",
  "target_source_sha",
  "target_tree",
  "toolchain_sha",
  "profile",
  "commands",
  "results",
  "started_at",
  "finished_at",
  "safe_counts",
  "skip_count",
  "output_path",
  "output_sha256",
  "claims",
  "external_actions",
]);

const SHA1 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const TUW_ID = /^RS-[A-Z]+-\d{3}$/;
const SAFE_KEY = /^[a-z][a-z0-9_]*$/;
const RESULT_SLICE = /^isolated:(RS-[A-Z]+-\d{3}):([a-z0-9][a-z0-9._-]*|all)$/;
const SECRET_ARG_FLAGS = new Set([
  "--api-key",
  "--authorization",
  "--client-secret",
  "--connection-string",
  "--cookie",
  "--password",
  "--postgres-url",
  "--private-key",
  "--secret",
  "--token",
]);

export class RuntimeSafetyEvidenceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "RuntimeSafetyEvidenceError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new RuntimeSafetyEvidenceError(code, message, details);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertClosedObject(value, allowedKeys, code, label) {
  if (!isRecord(value)) fail(code, `${label} must be an object`);
  const extras = Object.keys(value).filter((key) => !allowedKeys.includes(key));
  if (extras.length) fail(code, `${label} contains unsupported fields`, { extras });
}

function parseTimestamp(value, code, field) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    fail(code, `${field} must be an RFC 3339 UTC timestamp`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) fail(code, `${field} is not a valid timestamp`);
  return parsed;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function runtimeSafetyTextContainsSecretMaterial(value) {
  const text = String(value ?? "");
  return /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(text)
    || /\bBearer\s+[A-Za-z0-9._~+/-]+=*/i.test(text)
    || /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?)?:?\/\/[^\s/:@]+:[^\s@]+@/i.test(text)
    || /\b(?:authorization|api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|cookie|password|passwd|private[_-]?key|connection[_-]?string)\s*[:=]\s*[^\s,;]+/i.test(text);
}

export function runtimeSafetyArgvContainsSecretMaterial(argv) {
  if (!Array.isArray(argv)) return false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = String(argv[index] ?? "");
    if (runtimeSafetyTextContainsSecretMaterial(arg)) return true;
    const [flag, inlineValue] = arg.split("=", 2);
    if (!SECRET_ARG_FLAGS.has(flag.toLowerCase())) continue;
    if (inlineValue || argv[index + 1]) return true;
  }
  return false;
}

function validateOutputPath(outputPath, allowedOutputRoots) {
  if (typeof outputPath !== "string" || outputPath.length === 0 || outputPath.includes("\0")) {
    fail("EVIDENCE_OUTPUT_PATH", "output_path must be a non-empty path");
  }
  if (!isAbsolute(outputPath)) {
    const normalized = normalize(outputPath);
    if (normalized === ".." || normalized.startsWith(`..${sep}`)) {
      fail("EVIDENCE_OUTPUT_PATH", "relative output_path escapes its root");
    }
    return;
  }
  if (!Array.isArray(allowedOutputRoots) || allowedOutputRoots.length === 0) {
    fail("EVIDENCE_OUTPUT_PATH", "absolute output_path requires an allowlisted output root");
  }
  const candidate = resolve(outputPath);
  const allowed = allowedOutputRoots.some((root) => {
    const rel = relative(resolve(root), candidate);
    return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
  });
  if (!allowed) fail("EVIDENCE_OUTPUT_PATH", "output_path is outside the allowlisted roots");
}

function validateCommand(command, tuwId, expectedOrdinal) {
  assertClosedObject(command, [
    "ordinal", "argv", "cwd", "env_keys", "parser", "timeout_ms", "result_slice",
  ], "EVIDENCE_COMMAND", `commands[${expectedOrdinal - 1}]`);
  if (command.ordinal !== expectedOrdinal) fail("EVIDENCE_ORDINAL", "command ordinal is not contiguous");
  if (!Array.isArray(command.argv) || command.argv.length === 0 || command.argv.some((part) => typeof part !== "string" || part.length === 0 || /[\0\r\n]/.test(part))) {
    fail("EVIDENCE_COMMAND", "command argv must be a non-empty literal string array");
  }
  if (runtimeSafetyArgvContainsSecretMaterial(command.argv)) {
    fail("EVIDENCE_SECRET_ARGV", "command argv must not contain secret material");
  }
  if (typeof command.cwd !== "string" || command.cwd.length === 0) fail("EVIDENCE_COMMAND", "command cwd is required");
  if (!Array.isArray(command.env_keys) || command.env_keys.some((key) => typeof key !== "string" || !/^[A-Z][A-Z0-9_]*$/.test(key))) {
    fail("EVIDENCE_COMMAND", "command env_keys must be a closed uppercase key array");
  }
  if (new Set(command.env_keys).size !== command.env_keys.length) fail("EVIDENCE_COMMAND", "command env_keys contain duplicates");
  if (typeof command.parser !== "string" || !/^[a-z0-9][a-z0-9.-]*$/.test(command.parser)) fail("EVIDENCE_COMMAND", "command parser is invalid");
  if (!Number.isSafeInteger(command.timeout_ms) || command.timeout_ms < 1 || command.timeout_ms > 3_600_000) {
    fail("EVIDENCE_COMMAND", "command timeout_ms is outside the allowed range");
  }
  const slice = command.result_slice?.match(RESULT_SLICE);
  if (!slice || slice[1] !== tuwId) fail("EVIDENCE_RESULT_SLICE", "command result_slice is not isolated to the TUW");
}

function validateResult(result, tuwId, expectedOrdinal, command) {
  assertClosedObject(result, [
    "ordinal", "exit_code", "started_at", "finished_at", "output_sha256", "result_slice", "passed", "skipped",
  ], "EVIDENCE_RESULT", `results[${expectedOrdinal - 1}]`);
  if (result.ordinal !== expectedOrdinal || result.ordinal !== command.ordinal) {
    fail("EVIDENCE_ORDINAL", "command and result ordinals do not match");
  }
  if (!Number.isSafeInteger(result.exit_code)) fail("EVIDENCE_RESULT", "result exit_code must be an integer");
  if (typeof result.passed !== "boolean") fail("EVIDENCE_RESULT", "result passed must be boolean");
  if (!Number.isSafeInteger(result.skipped) || result.skipped < 0) fail("EVIDENCE_RESULT", "result skipped must be a non-negative integer");
  if (!SHA256.test(result.output_sha256 ?? "")) fail("EVIDENCE_OUTPUT_HASH", "result output_sha256 is invalid");
  const started = parseTimestamp(result.started_at, "EVIDENCE_TIMESTAMP", "result.started_at");
  const finished = parseTimestamp(result.finished_at, "EVIDENCE_TIMESTAMP", "result.finished_at");
  if (finished <= started) fail("EVIDENCE_TIMESTAMP_ORDER", "result finished_at must be after started_at");
  const slice = result.result_slice?.match(RESULT_SLICE);
  if (!slice || slice[1] !== tuwId || result.result_slice !== command.result_slice) {
    fail("EVIDENCE_RESULT_SLICE", "command and result slices do not match");
  }
}

function validateSafeCounts(value) {
  if (!isRecord(value) || Object.keys(value).length === 0) fail("EVIDENCE_SAFE_COUNTS", "safe_counts must be a non-empty object");
  for (const [key, count] of Object.entries(value)) {
    if (!SAFE_KEY.test(key) || !Number.isSafeInteger(count) || count < 0) {
      fail("EVIDENCE_SAFE_COUNTS", "safe_counts contains an invalid key or count", { key });
    }
  }
}

function validateClaims(value, additionalClaimKeys) {
  const allowed = [...CLOSED_CLAIM_KEYS, ...(additionalClaimKeys ?? [])];
  assertClosedObject(value, allowed, "EVIDENCE_CLAIMS", "claims");
  if (typeof value.verified !== "boolean") fail("EVIDENCE_CLAIMS", "claims.verified is required and must be boolean");
  for (const [key, claim] of Object.entries(value)) {
    if (!SAFE_KEY.test(key) || typeof claim !== "boolean") fail("EVIDENCE_CLAIMS", "all claims must be closed booleans", { key });
  }
}

function validateExternalActions(actions) {
  if (!Array.isArray(actions)) fail("EVIDENCE_EXTERNAL_ACTIONS", "external_actions must be an array");
  for (const [index, action] of actions.entries()) {
    assertClosedObject(action, [
      "action", "environment", "executed", "approval_id", "user_instruction_sha256",
    ], "EVIDENCE_EXTERNAL_ACTIONS", `external_actions[${index}]`);
    if (typeof action.action !== "string" || !/^[a-z][a-z0-9._-]*$/.test(action.action)) fail("EVIDENCE_EXTERNAL_ACTIONS", "external action name is invalid");
    if (typeof action.environment !== "string" || !/^[a-z][a-z0-9._-]*$/.test(action.environment)) fail("EVIDENCE_EXTERNAL_ACTIONS", "external action environment is invalid");
    if (typeof action.executed !== "boolean") fail("EVIDENCE_EXTERNAL_ACTIONS", "external action executed must be boolean");
    if (action.executed && (typeof action.approval_id !== "string" || !SHA256.test(action.user_instruction_sha256 ?? ""))) {
      fail("EVIDENCE_EXTERNAL_ACTIONS", "executed external actions require approval and user instruction bindings");
    }
  }
}

export function validateRuntimeSafetyEvidence(receipt, options = {}) {
  if (!isRecord(receipt)) fail("EVIDENCE_TYPE", "evidence receipt must be an object");
  const missing = REQUIRED_FIELDS.filter((field) => !(field in receipt));
  if (missing.length) fail("EVIDENCE_MISSING_FIELD", "evidence receipt is missing required fields", { missing });
  if (receipt.schema_version !== EVIDENCE_SCHEMA_VERSION) fail("EVIDENCE_SCHEMA", "unsupported evidence schema_version");
  if (!TUW_ID.test(receipt.tuw_id ?? "")) fail("EVIDENCE_TUW_ID", "tuw_id is invalid");
  if (!IMPLEMENTATION_STATES.includes(receipt.implementation_state)) fail("EVIDENCE_IMPLEMENTATION_STATE", "implementation_state is invalid");
  if (!EXECUTION_STATES.includes(receipt.execution_state)) fail("EVIDENCE_EXECUTION_STATE", "execution_state is invalid");
  if (!EVIDENCE_PROFILES.includes(receipt.profile)) fail("EVIDENCE_PROFILE", "profile is invalid");
  if (!SHA1.test(receipt.target_source_sha ?? "")) fail("EVIDENCE_TARGET_SHA", "target_source_sha must be a lowercase 40-hex Git SHA");
  if (!SHA1.test(receipt.target_tree ?? "")) fail("EVIDENCE_TARGET_TREE", "target_tree must be a lowercase 40-hex Git tree");
  if (!SHA1.test(receipt.toolchain_sha ?? "")) fail("EVIDENCE_TOOLCHAIN_SHA", "toolchain_sha must be a lowercase 40-hex Git SHA");

  const started = parseTimestamp(receipt.started_at, "EVIDENCE_TIMESTAMP", "started_at");
  const finished = parseTimestamp(receipt.finished_at, "EVIDENCE_TIMESTAMP", "finished_at");
  if (finished <= started) fail("EVIDENCE_TIMESTAMP_ORDER", "finished_at must be after started_at");

  if (!Array.isArray(receipt.commands) || receipt.commands.length === 0) fail("EVIDENCE_COMMAND", "commands must be a non-empty array");
  if (!Array.isArray(receipt.results) || receipt.results.length !== receipt.commands.length) {
    fail("EVIDENCE_ORDINAL", "commands and results must have the same cardinality");
  }
  for (const [index, command] of receipt.commands.entries()) validateCommand(command, receipt.tuw_id, index + 1);
  for (const [index, result] of receipt.results.entries()) validateResult(result, receipt.tuw_id, index + 1, receipt.commands[index]);
  const slices = receipt.results.map((result) => result.result_slice);
  if (new Set(slices).size !== slices.length || (slices.length > 1 && slices.some((slice) => slice.endsWith(":all")))) {
    fail("EVIDENCE_RESULT_SLICE_OVERLAP", "result slices overlap");
  }

  validateSafeCounts(receipt.safe_counts);
  if (!Number.isSafeInteger(receipt.skip_count) || receipt.skip_count < 0) fail("EVIDENCE_SKIP_COUNT", "skip_count must be a non-negative integer");
  validateOutputPath(receipt.output_path, options.allowedOutputRoots);
  if (!SHA256.test(receipt.output_sha256 ?? "")) fail("EVIDENCE_OUTPUT_HASH", "output_sha256 must be lowercase 64-hex");
  if (options.outputBytes !== undefined && sha256(options.outputBytes) !== receipt.output_sha256) {
    fail("EVIDENCE_OUTPUT_HASH_DRIFT", "output content does not match output_sha256");
  }
  validateClaims(receipt.claims, options.additionalClaimKeys);
  validateExternalActions(receipt.external_actions);

  if (receipt.claims.verified) {
    if (!["VERIFIED", "DISABLED_BY_APPROVED_DECISION"].includes(receipt.implementation_state)) {
      fail("EVIDENCE_VERIFIED_INCONSISTENT", "verified claim requires a verified or approved-disabled implementation state");
    }
    if (receipt.skip_count !== 0 || receipt.results.some((result) => result.exit_code !== 0 || !result.passed || result.skipped !== 0)) {
      fail("EVIDENCE_VERIFIED_INCONSISTENT", "verified evidence cannot contain failures or skips");
    }
  }
  if (receipt.execution_state === "BLOCKED_EXTERNAL" && receipt.external_actions.every((action) => !action.executed)) {
    fail("EVIDENCE_BLOCKED_EXTERNAL", "BLOCKED_EXTERNAL requires a hash-bound authorized attempt");
  }
  if (receipt.execution_state === "APPROVAL_REQUIRED" && receipt.external_actions.some((action) => action.executed)) {
    fail("EVIDENCE_EXTERNAL_ACTIONS", "APPROVAL_REQUIRED evidence cannot execute external actions");
  }

  return Object.freeze({
    valid: true,
    schema_version: receipt.schema_version,
    tuw_id: receipt.tuw_id,
    command_count: receipt.commands.length,
    output_sha256: receipt.output_sha256,
  });
}

export function hashRuntimeSafetyOutput(value) {
  return sha256(value);
}
