import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { relative, sep } from "node:path";

/**
 * Shared schema, error, and byte/path primitives for the RFD-TUW-001
 * capture, historical-inventory, and manifest-validation boundaries.
 */
export const BASELINE_SCHEMA_VERSION = "law-firm-os.rf13-debt-remediation-baseline.v2";
export const CAPTURE_SCHEMA_VERSION = "law-firm-os.rf13-debt-remediation-capture.v1";
export const VALIDATOR_SCHEMA_VERSION = "law-firm-os.rf13-debt-remediation-baseline-validator.v1";
export const CHECKPOINT_ID = "RFD-TUW-001";
export const GENERATOR_VERSION = "rf13-debt-remediation-baseline/2";
export const DEFAULT_EVIDENCE_DIR = ".omo/evidence/rf13-debt-remediation-20260731";
export const DEFAULT_HISTORICAL_DIR = ".omo/evidence/rf13-final-gate-20260731";
export const DEFAULT_GOAL_PATHS = Object.freeze([
  "workbook/matter-rf13-maintenance-debt-remediation-plan-2026-07-31.md",
  "workbook/matter-small-firm-os-implementation-goal-2026-07-30.md",
]);

export const HASH_256 = /^[0-9a-f]{64}$/u;
export const SHA_1 = /^[0-9a-f]{40}$/u;
export const MAX_BUFFER = 512 * 1024 * 1024;
export const RAW_KINDS = Object.freeze(["status", "diff", "manifest", "head", "tree"]);
export const SENSITIVE_KEY = /(?:roster|photo|contact|email|phone|display[_-]?name|employee|person|user[_-]?id|registration|account|credential|token|password|secret|private[_-]?key)/iu;
export const PROTECTED_VALUE = /(?:@amic\.(?:kr|law)\b|\b(?:user|emp)_amic_[a-z0-9_]+\b)/iu;
export const RAW_TEST_PRIVATE_MARKER = /\b(?:PRIVATE_(?:ROSTER|PHOTO|CONTACT)_(?:VALUE|HASH|DATA)|REAL_(?:ROSTER|PHOTO)_(?:VALUE|HASH|DATA)|PROTECTED_(?:ROSTER|PHOTO)_(?:VALUE|HASH|DATA))\b/u;
export const DIFF_EMAIL = /\b[A-Z0-9._%+-]+@amic\.(?:kr|law)\b/giu;
export const DIFF_USER_ID = /\b(?:user|emp)_amic_[a-z0-9_]+\b/giu;
export const DIFF_DOMAIN = /@amic\.(?:kr|law)\b/giu;
export const DIFF_REDACTION = "[redacted-source-value]";
export const DIFF_REDACTION_POLICY = "protected-source-values-v1";

export class Rf13BaselineError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "Rf13BaselineError";
    this.code = code;
    this.details = safeDetails(details);
  }
}

function safeDetails(details) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return {};
  const safe = {};
  for (const [key, value] of Object.entries(details)) {
    if (["category", "field", "count", "attempts", "classification", "kind", "status"].includes(key)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") safe[key] = value;
    }
  }
  return safe;
}

export function fail(code, message, details = {}) {
  throw new Rf13BaselineError(code, message, details);
}

export function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function utf8(value) {
  return Buffer.from(String(value), "utf8");
}

export function gitBuffer(cwd, args) {
  try {
    return execFileSync("git", args, { cwd, maxBuffer: MAX_BUFFER });
  } catch {
    fail("GIT_READ_FAILED", "git source capture failed", { category: "git_read" });
  }
}

export function gitText(cwd, args) {
  return gitBuffer(cwd, args).toString("utf8").trim();
}

export function splitNul(buffer) {
  return buffer.toString("utf8").split("\0").filter(Boolean);
}

export function assertRelativePath(value, field = "path") {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    fail("INVALID_PATH", "a safe repository-relative path is required", { field });
  }
  if (value.startsWith("/") || value.startsWith("\\") || value.split(/[\\/]/u).includes("..")) {
    fail("INVALID_PATH", "absolute or parent paths are not permitted", { field });
  }
  return value;
}

export function relativePath(root, absolutePath) {
  const rel = relative(root, absolutePath).split(sep).join("/");
  return assertRelativePath(rel);
}

export function bytesDescriptor(path, bytes) {
  return Object.freeze({ path, bytes: bytes.length, sha256: sha256(bytes) });
}

export function freezeDeep(value) {
  if (!value || typeof value !== "object") return value;
  if (Object.isFrozen(value)) return value;
  Object.values(value).forEach(freezeDeep);
  return Object.freeze(value);
}

export function exactKeys(value, expected, field) {
  if (!record(value)) fail("SCHEMA_INVALID", `${field} must be an object`, { field });
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(required)) fail("SCHEMA_INVALID", `${field} has unexpected keys`, { field });
}

export function assertHash(value, field, pattern = HASH_256) {
  if (typeof value !== "string" || !pattern.test(value)) fail("SCHEMA_INVALID", `${field} contains an invalid hash`, { field });
}
