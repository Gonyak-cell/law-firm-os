import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import {
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { canonicalizeJson } from "./runtime-safety-approval-contract.mjs";

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  if (Array.isArray(value)) value.forEach((item) => deepFreeze(item, seen));
  else Object.values(value).forEach((child) => deepFreeze(child, seen));
  return Object.freeze(value);
}

export const SCHEMA_VERSION = "law-firm-os.rf13-dist.authority-checkpoint.v1";
export const CHECKPOINT_ID = "RFD-TUW-003";
export const STATUS_VALUES = Object.freeze(["available", "blocked", "not-required"]);
export const STATUS_KEYS = Object.freeze([
  "commit_merge",
  "apple_signing_notary",
  "windows_signing",
  "staging_api",
  "production_api",
  "rollback_ownership",
]);

export const CANONICAL_OWNER_ROLES = Object.freeze({
  commit_merge: "release_owner",
  apple_signing_notary: "apple_signing_owner",
  windows_signing: "windows_signing_owner",
  staging_api: "staging_api_owner",
  production_api: "production_api_owner",
  rollback_ownership: "rollback_owner",
});

const BLOCK_REASON_CODES = Object.freeze({
  commit_merge: "external_authority_required",
  apple_signing_notary: "external_authority_required",
  windows_signing: "external_authority_required",
  staging_api: "external_authority_required",
  production_api: "external_authority_required",
  rollback_ownership: "owner_confirmation_required",
});
const AVAILABLE_REASON_CODE = "status_available_requires_authoritative_receipt";
const NOT_REQUIRED_REASON_CODE = "not_required_for_current_scope";
export const REASON_CODES_BY_STATUS = Object.freeze({
  blocked: BLOCK_REASON_CODES,
  available: Object.freeze(Object.fromEntries(STATUS_KEYS.map((key) => [key, AVAILABLE_REASON_CODE]))),
  "not-required": Object.freeze(Object.fromEntries(STATUS_KEYS.map((key) => [key, NOT_REQUIRED_REASON_CODE]))),
});

// This is intentionally a separate signed receipt schema. The status checkpoint
// above is a read-only inventory and never grants authority. The production
// allowlist is empty until a separately reviewed owner key is recorded here.
export const HUMAN_AUTHORITY_RECEIPT_SCHEMA = "law-firm-os.rf13-dist.human-authority-receipt.v1";
export const RF13_HUMAN_AUTHORITY_SCHEMA = HUMAN_AUTHORITY_RECEIPT_SCHEMA;
export const RF13_DIST_HUMAN_AUTHORITY_SCHEMA = HUMAN_AUTHORITY_RECEIPT_SCHEMA;
export const RF13_DIST_HUMAN_AUTHORITY_RECEIPT_SCHEMA = HUMAN_AUTHORITY_RECEIPT_SCHEMA;
export const HUMAN_AUTHORITY_SIGNATURE_ALGORITHM = "Ed25519";
export const HUMAN_AUTHORITY_ACTIONS = Object.freeze([
  "canary_acceptance",
  "production_go_live",
]);
export const HUMAN_AUTHORITY_RELEASE_SCOPES = Object.freeze([
  "macos_canary",
  "macos_primary",
  "all_platforms",
]);
export const HUMAN_AUTHORITY_ENVIRONMENTS = Object.freeze(["canary", "production"]);
export const TRUSTED_HUMAN_AUTHORITY_KEYS = deepFreeze([]);
export const HUMAN_AUTHORITY_TRUSTED_KEYS = TRUSTED_HUMAN_AUTHORITY_KEYS;
export const RF13_HUMAN_AUTHORITY_TRUSTED_KEYS = TRUSTED_HUMAN_AUTHORITY_KEYS;

const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const SAFE_IDENTIFIER_PATTERN = /^[a-z][a-z0-9_]*$/u;
const SECRET_KEY_PATTERN = /(?:^|[_-])(?:secret|token|password|credential(?:s)?|private[_-]?key|api[_-]?key|access[_-]?key|authorization|auth(?:entication|orization)?)(?:$|[_-])/u;
const SECRET_VALUE_PATTERNS = Object.freeze([
  /-----BEGIN [^-\n]*PRIVATE KEY-----/iu,
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/u,
  /\b(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}\b/u,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/u,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/u,
  /\b(?:secret|token|password|credential)\s*[:=]\s*\S+/iu,
  /\b(?:secret|token|password|credential)\b/iu,
]);

const TOP_LEVEL_KEYS = Object.freeze([
  "schema_version",
  "checkpoint_id",
  "source_sha",
  "read_only",
  "statuses",
  "owner_roles",
  "reason_codes",
]);

const HUMAN_AUTHORITY_PAYLOAD_KEYS = Object.freeze([
  "schema_version",
  "receipt_id",
  "release_id",
  "environment",
  "action",
  "source_sha",
  "source_tree",
  "artifact_sha256",
  "release_scope",
  "canary_user_count",
  "issued_at",
  "expires_at",
  "nonce",
  "template",
]);
const HUMAN_AUTHORITY_SIGNATURE_KEYS = Object.freeze([
  "algorithm",
  "key_id",
  "fingerprint_sha256",
  "signature_sha256",
  "path",
]);
const HUMAN_AUTHORITY_TOP_LEVEL_KEYS = Object.freeze([
  ...HUMAN_AUTHORITY_PAYLOAD_KEYS,
  "signature",
]);
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const HUMAN_AUTHORITY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,159}$/u;
const HUMAN_AUTHORITY_NONCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,159}$/u;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const RELATIVE_SIGNATURE_PATH_PATTERN = /^[A-Za-z0-9._/-]+$/u;
const TEST_ONLY_KEY_PATTERN = /^TEST_ONLY(?:_|$)/u;
const HUMAN_AUTHORITY_CAPABILITIES = new WeakSet();

export class AuthorityCheckpointValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "AuthorityCheckpointValidationError";
    this.code = code;
    this.details = details;
  }
}

export class HumanAuthorityReceiptValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "HumanAuthorityReceiptValidationError";
    this.code = code;
    this.details = details;
  }
}

export const Rf13HumanAuthorityValidationError = HumanAuthorityReceiptValidationError;

function fail(code, message, details = {}) {
  throw new AuthorityCheckpointValidationError(code, message, details);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertSha(value, fieldName) {
  if (typeof value !== "string" || !SHA_PATTERN.test(value)) {
    fail("INVALID_SOURCE_SHA", `${fieldName} must be a lowercase 40-character SHA-1`, { field: fieldName });
  }
}

function assertExactKeys(value, expectedKeys, fieldName) {
  if (!isRecord(value)) fail("INVALID_SHAPE", `${fieldName} must be an object`, { field: fieldName });
  const actualKeys = Object.keys(value);
  const expected = new Set(expectedKeys);
  const actual = new Set(actualKeys);
  const missing = expectedKeys.filter((key) => !actual.has(key));
  const unknown = actualKeys.filter((key) => !expected.has(key));
  if (missing.length > 0) {
    fail("MISSING_KEY", `required keys are missing from ${fieldName}`, { field: fieldName, missing_count: missing.length });
  }
  if (unknown.length > 0) {
    fail("UNKNOWN_KEY", `unknown keys are not permitted in ${fieldName}`, { field: fieldName, unknown_count: unknown.length });
  }
}

function scanForSecrets(value, seen = new WeakSet()) {
  if (typeof value === "string") {
    if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
      fail("SECRET_MATERIAL", "secret-like value material is not permitted", { category: "secret_like_value", count: 1 });
    }
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (seen.has(value)) fail("INVALID_SHAPE", "checkpoint contains a cyclic object");
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item) => scanForSecrets(item, seen));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.replace(/([a-z0-9])([A-Z])/gu, "$1_$2").toLowerCase();
    if (SECRET_KEY_PATTERN.test(normalizedKey)) {
      fail("SECRET_KEY", "secret-like keys are not permitted", { category: "secret_like_key", count: 1 });
    }
    scanForSecrets(child, seen);
  }
}

function validateOwnerRoles(value) {
  assertExactKeys(value, STATUS_KEYS, "owner_roles");
  for (const key of STATUS_KEYS) {
    if (typeof value[key] !== "string" || !SAFE_IDENTIFIER_PATTERN.test(value[key]) || value[key] !== CANONICAL_OWNER_ROLES[key]) {
      fail("INVALID_OWNER_ROLE", "owner role is outside the closed canonical role map", { field: "owner_roles", category: "closed_owner_role_set" });
    }
  }
}

function validateReasonCodes(value, statuses) {
  assertExactKeys(value, STATUS_KEYS, "reason_codes");
  for (const key of STATUS_KEYS) {
    const expected = REASON_CODES_BY_STATUS[statuses[key]][key];
    if (value[key] !== expected || !SAFE_IDENTIFIER_PATTERN.test(value[key])) {
      fail("INVALID_REASON_CODE", "reason code is not consistent with the status inventory", { field: "reason_codes", category: "status_reason_mismatch" });
    }
  }
}

export function validateAuthorityCheckpoint(checkpoint, { expectedSourceSha } = {}) {
  if (!isRecord(checkpoint)) fail("INVALID_SHAPE", "checkpoint must be a JSON object");
  assertSha(expectedSourceSha, "expected source SHA");
  scanForSecrets(checkpoint);
  assertExactKeys(checkpoint, TOP_LEVEL_KEYS, "checkpoint");
  if (checkpoint.schema_version !== SCHEMA_VERSION) {
    fail("SCHEMA_VERSION_MISMATCH", `schema_version must equal ${SCHEMA_VERSION}`, { field: "schema_version" });
  }
  if (checkpoint.checkpoint_id !== CHECKPOINT_ID) {
    fail("CHECKPOINT_ID_MISMATCH", `checkpoint_id must equal ${CHECKPOINT_ID}`, { field: "checkpoint_id" });
  }
  assertSha(checkpoint.source_sha, "source_sha");
  if (checkpoint.source_sha !== expectedSourceSha) {
    fail("SOURCE_SHA_MISMATCH", "checkpoint source SHA does not match the expected artifact SHA", { field: "source_sha", category: "source_sha_mismatch" });
  }
  if (checkpoint.read_only !== true) {
    fail("READ_ONLY_REQUIRED", "checkpoint must declare read_only=true", { field: "read_only" });
  }
  assertExactKeys(checkpoint.statuses, STATUS_KEYS, "statuses");
  for (const key of STATUS_KEYS) {
    if (typeof checkpoint.statuses[key] !== "string" || !STATUS_VALUES.includes(checkpoint.statuses[key])) {
      fail("INVALID_STATUS", "status value is outside the closed status enum", { field: "statuses", category: "invalid_status_enum" });
    }
  }
  validateOwnerRoles(checkpoint.owner_roles);
  validateReasonCodes(checkpoint.reason_codes, checkpoint.statuses);
  return Object.freeze({
    schema_version: checkpoint.schema_version,
    checkpoint_id: checkpoint.checkpoint_id,
    source_sha: checkpoint.source_sha,
    read_only: checkpoint.read_only,
    statuses: Object.freeze(Object.fromEntries(STATUS_KEYS.map((key) => [key, checkpoint.statuses[key]]))),
    owner_roles: Object.freeze(Object.fromEntries(STATUS_KEYS.map((key) => [key, checkpoint.owner_roles[key]]))),
    reason_codes: Object.freeze(Object.fromEntries(STATUS_KEYS.map((key) => [key, checkpoint.reason_codes[key]]))),
  });
}

export function buildAllBlockedTemplate(sourceSha) {
  assertSha(sourceSha, "source SHA");
  return Object.freeze({
    schema_version: SCHEMA_VERSION,
    checkpoint_id: CHECKPOINT_ID,
    source_sha: sourceSha,
    read_only: true,
    statuses: Object.freeze(Object.fromEntries(STATUS_KEYS.map((key) => [key, "blocked"]))),
    owner_roles: CANONICAL_OWNER_ROLES,
    reason_codes: BLOCK_REASON_CODES,
  });
}

export function authorizeAuthorityAction(checkpoint, action) {
  if (action === undefined || action === null || action === "") {
    return Object.freeze({ action: null, action_status: null, action_authorized: false, mutation_executed: false });
  }
  if (typeof action !== "string" || !STATUS_KEYS.includes(action)) {
    fail("UNKNOWN_ACTION", "--action must name one of the six authority statuses", { category: "unknown_action", count: 1 });
  }
  fail(
    "ACTION_NOT_AUTHORIZED",
    "status inventory never authorizes mutation; a separate authoritative approval validator is required",
    { category: "status_inventory_only", count: 1 },
  );
}

function failHuman(code, message, details = {}) {
  throw new HumanAuthorityReceiptValidationError(code, message, details);
}

function assertHumanExactKeys(value, expectedKeys, fieldName) {
  if (!isRecord(value)) failHuman("HUMAN_AUTHORITY_INVALID_SHAPE", `${fieldName} must be an object`, { field: fieldName });
  const expected = new Set(expectedKeys);
  const actual = Object.keys(value);
  const missing = expectedKeys.filter((key) => !Object.hasOwn(value, key));
  const unknown = actual.filter((key) => !expected.has(key));
  if (missing.length > 0) failHuman("HUMAN_AUTHORITY_MISSING_KEY", `required keys are missing from ${fieldName}`, { field: fieldName, missing_count: missing.length });
  if (unknown.length > 0) failHuman("HUMAN_AUTHORITY_UNKNOWN_KEY", `unknown keys are not permitted in ${fieldName}`, { field: fieldName, unknown_count: unknown.length });
}

function assertSha256(value, fieldName) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    failHuman("HUMAN_AUTHORITY_INVALID_HASH", `${fieldName} must be a lowercase 64-character SHA-256`, { field: fieldName });
  }
}

function assertSafeHumanId(value, fieldName, pattern = HUMAN_AUTHORITY_ID_PATTERN) {
  if (typeof value !== "string" || !pattern.test(value)) {
    failHuman("HUMAN_AUTHORITY_INVALID_IDENTIFIER", `${fieldName} is not a safe identifier`, { field: fieldName });
  }
}

function parseHumanTimestamp(value, fieldName) {
  if (typeof value !== "string" || !UTC_TIMESTAMP_PATTERN.test(value)) {
    failHuman("HUMAN_AUTHORITY_INVALID_TIME", `${fieldName} must be an RFC 3339 UTC timestamp`, { field: fieldName });
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) failHuman("HUMAN_AUTHORITY_INVALID_TIME", `${fieldName} is invalid`, { field: fieldName });
  return parsed;
}

function normalizeHumanNow(value) {
  if (value instanceof Date) value = value.getTime();
  if (typeof value === "string") value = parseHumanTimestamp(value, "now");
  if (typeof value !== "number" || !Number.isFinite(value)) failHuman("HUMAN_AUTHORITY_INVALID_TIME", "now must be a finite timestamp");
  return value;
}

function sortedUniqueArtifactHashes(value, fieldName, { requireSorted = false } = {}) {
  if (!Array.isArray(value) || value.length === 0) {
    failHuman("HUMAN_AUTHORITY_INVALID_ARTIFACTS", `${fieldName} must be a non-empty SHA-256 array`, { field: fieldName });
  }
  const normalized = value.map((hash) => {
    assertSha256(hash, fieldName);
    return hash;
  });
  const sorted = [...normalized].sort();
  if (new Set(sorted).size !== sorted.length) {
    failHuman("HUMAN_AUTHORITY_DUPLICATE_ARTIFACT", `${fieldName} must contain unique hashes`, { field: fieldName });
  }
  if (requireSorted && canonicalizeJson(normalized) !== canonicalizeJson(sorted)) {
    failHuman("HUMAN_AUTHORITY_ARTIFACT_ORDER", `${fieldName} must be sorted lexicographically`, { field: fieldName });
  }
  return Object.freeze(sorted);
}

function normalizeExpectedArtifacts(value) {
  return sortedUniqueArtifactHashes(value, "expected artifact hashes");
}

function canonicalHumanPayload(receipt) {
  return Object.fromEntries(HUMAN_AUTHORITY_PAYLOAD_KEYS.map((key) => [key, receipt[key]]));
}

function canonicalHumanReceipt(receipt) {
  return Object.fromEntries(HUMAN_AUTHORITY_TOP_LEVEL_KEYS.map((key) => [key, receipt[key]]));
}

function sha256Canonical(value) {
  return createHash("sha256").update(Buffer.from(canonicalizeJson(value))).digest("hex");
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function validateHumanSignaturePath(value) {
  if (typeof value !== "string"
    || !value
    || value.includes("\0")
    || value.includes("\\")
    || isAbsolute(value)
    || !RELATIVE_SIGNATURE_PATH_PATTERN.test(value)) {
    failHuman("HUMAN_AUTHORITY_SIGNATURE_PATH_INVALID", "detached signature path must be a relative safe path", { field: "signature.path" });
  }
  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    failHuman("HUMAN_AUTHORITY_SIGNATURE_PATH_INVALID", "detached signature path contains an unsafe segment", { field: "signature.path" });
  }
  return value;
}

function assertNoDuplicateJsonKeys(source) {
  if (typeof source !== "string") failHuman("HUMAN_AUTHORITY_JSON_INVALID", "human authority receipt must be UTF-8 JSON text");
  let index = 0;
  const length = source.length;
  const invalid = () => failHuman("HUMAN_AUTHORITY_JSON_INVALID", "human authority receipt JSON is invalid");
  const duplicate = () => failHuman("HUMAN_AUTHORITY_JSON_DUPLICATE_KEY", "human authority receipt JSON contains duplicate object keys", { category: "duplicate_json_key" });
  const skipWhitespace = () => {
    while (index < length && /\s/u.test(source[index])) index += 1;
  };
  const parseString = () => {
    if (source[index] !== '"') invalid();
    const start = index;
    index += 1;
    while (index < length) {
      const char = source[index];
      index += 1;
      if (char === '"') {
        try {
          return JSON.parse(source.slice(start, index));
        } catch {
          invalid();
        }
      }
      if (char === "\\") {
        if (index >= length) invalid();
        const escaped = source[index];
        index += 1;
        if (escaped === "u") {
          if (!/^[0-9a-f]{4}$/iu.test(source.slice(index, index + 4))) invalid();
          index += 4;
        } else if (!'"\\/bfnrt'.includes(escaped)) {
          invalid();
        }
      } else if (char.charCodeAt(0) < 0x20) {
        invalid();
      }
    }
    invalid();
  };
  const parseNumber = () => {
    const match = source.slice(index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u);
    if (!match) invalid();
    index += match[0].length;
  };
  const parseValue = () => {
    skipWhitespace();
    const char = source[index];
    if (char === "{") return parseObject();
    if (char === "[") return parseArray();
    if (char === '"') {
      parseString();
      return;
    }
    if (char === "-" || /\d/u.test(char ?? "")) {
      parseNumber();
      return;
    }
    for (const literal of ["true", "false", "null"]) {
      if (source.startsWith(literal, index)) {
        index += literal.length;
        return;
      }
    }
    invalid();
  };
  const parseArray = () => {
    index += 1;
    skipWhitespace();
    if (source[index] === "]") {
      index += 1;
      return;
    }
    while (true) {
      parseValue();
      skipWhitespace();
      if (source[index] === "]") {
        index += 1;
        return;
      }
      if (source[index] !== ",") invalid();
      index += 1;
      skipWhitespace();
    }
  };
  const parseObject = () => {
    index += 1;
    skipWhitespace();
    const keys = new Set();
    if (source[index] === "}") {
      index += 1;
      return;
    }
    while (true) {
      const key = parseString();
      if (keys.has(key)) duplicate();
      keys.add(key);
      skipWhitespace();
      if (source[index] !== ":") invalid();
      index += 1;
      parseValue();
      skipWhitespace();
      if (source[index] === "}") {
        index += 1;
        return;
      }
      if (source[index] !== ",") invalid();
      index += 1;
      skipWhitespace();
    }
  };
  parseValue();
  skipWhitespace();
  if (index !== length) invalid();
}

function validateHumanReceiptShape(value) {
  if (!isRecord(value)) failHuman("HUMAN_AUTHORITY_INVALID_SHAPE", "human authority receipt must be a JSON object");
  scanForSecrets(value);
  assertHumanExactKeys(value, HUMAN_AUTHORITY_TOP_LEVEL_KEYS, "human authority receipt");
  if (value.schema_version !== HUMAN_AUTHORITY_RECEIPT_SCHEMA) {
    failHuman("HUMAN_AUTHORITY_SCHEMA_MISMATCH", "human authority receipt schema is unsupported", { field: "schema_version" });
  }
  assertSafeHumanId(value.receipt_id, "receipt_id");
  assertSafeHumanId(value.release_id, "release_id");
  if (!HUMAN_AUTHORITY_ENVIRONMENTS.includes(value.environment)) {
    failHuman("HUMAN_AUTHORITY_ENVIRONMENT_INVALID", "human authority environment is outside the closed enum", { field: "environment" });
  }
  if (!HUMAN_AUTHORITY_ACTIONS.includes(value.action)) {
    failHuman("HUMAN_AUTHORITY_ACTION_INVALID", "human authority action is outside the closed enum", { field: "action" });
  }
  assertSha(value.source_sha, "source_sha");
  assertSha(value.source_tree, "source_tree");
  const artifactHashes = sortedUniqueArtifactHashes(value.artifact_sha256, "artifact_sha256", { requireSorted: true });
  if (!HUMAN_AUTHORITY_RELEASE_SCOPES.includes(value.release_scope)) {
    failHuman("HUMAN_AUTHORITY_SCOPE_INVALID", "human authority release scope is outside the closed enum", { field: "release_scope" });
  }
  if (value.action === "canary_acceptance") {
    if (value.environment !== "canary" || value.release_scope !== "macos_canary" || ![1, 2].includes(value.canary_user_count)) {
      failHuman("HUMAN_AUTHORITY_CANARY_SCOPE_INVALID", "canary authority must bind macos_canary and one or two users");
    }
  } else if (value.environment !== "production"
    || value.canary_user_count !== null
    || !["macos_primary", "all_platforms"].includes(value.release_scope)) {
    failHuman("HUMAN_AUTHORITY_PRODUCTION_SCOPE_INVALID", "production authority must bind a production scope and null canary user count");
  }
  const issuedAt = parseHumanTimestamp(value.issued_at, "issued_at");
  const expiresAt = parseHumanTimestamp(value.expires_at, "expires_at");
  if (expiresAt <= issuedAt) failHuman("HUMAN_AUTHORITY_TIME_WINDOW_INVALID", "expires_at must be after issued_at");
  assertSafeHumanId(value.nonce, "nonce", HUMAN_AUTHORITY_NONCE_PATTERN);
  if (value.template !== false) failHuman("HUMAN_AUTHORITY_TEMPLATE_FORBIDDEN", "signed human authority receipts must set template=false");
  assertHumanExactKeys(value.signature, HUMAN_AUTHORITY_SIGNATURE_KEYS, "human authority signature");
  if (value.signature.algorithm !== HUMAN_AUTHORITY_SIGNATURE_ALGORITHM) {
    failHuman("HUMAN_AUTHORITY_ALGORITHM_INVALID", "human authority signatures must use Ed25519", { field: "signature.algorithm" });
  }
  assertSafeHumanId(value.signature.key_id, "signature.key_id");
  assertSha256(value.signature.fingerprint_sha256, "signature.fingerprint_sha256");
  assertSha256(value.signature.signature_sha256, "signature.signature_sha256");
  validateHumanSignaturePath(value.signature.path);
  return Object.freeze({
    schema_version: value.schema_version,
    receipt_id: value.receipt_id,
    release_id: value.release_id,
    environment: value.environment,
    action: value.action,
    source_sha: value.source_sha,
    source_tree: value.source_tree,
    artifact_sha256: artifactHashes,
    release_scope: value.release_scope,
    canary_user_count: value.canary_user_count,
    issued_at: value.issued_at,
    expires_at: value.expires_at,
    nonce: value.nonce,
    template: value.template,
    signature: Object.freeze({
      algorithm: value.signature.algorithm,
      key_id: value.signature.key_id,
      fingerprint_sha256: value.signature.fingerprint_sha256,
      signature_sha256: value.signature.signature_sha256,
      path: value.signature.path,
    }),
  });
}

function ensurePathInsideRoot(root, candidate, fieldName, { relativeOnly = false } = {}) {
  if (typeof root !== "string" || !root || root.includes("\0")) failHuman("HUMAN_AUTHORITY_PATH_INVALID", "repository root is invalid");
  if (typeof candidate !== "string" || !candidate || candidate.includes("\0")) {
    failHuman("HUMAN_AUTHORITY_PATH_INVALID", `${fieldName} is invalid`, { field: fieldName });
  }
  if (relativeOnly && isAbsolute(candidate)) {
    failHuman("HUMAN_AUTHORITY_PATH_ESCAPE", `${fieldName} must remain relative to the repository root`, { field: fieldName });
  }
  if (!existsSync(root)) failHuman("HUMAN_AUTHORITY_PATH_INVALID", "repository root does not exist");
  const rootInput = resolve(root);
  let rootReal;
  try {
    rootReal = realpathSync(rootInput);
  } catch {
    failHuman("HUMAN_AUTHORITY_PATH_INVALID", "repository root cannot be resolved");
  }
  const candidateInput = resolve(isAbsolute(candidate) ? candidate : join(rootInput, candidate));
  const syntacticRelative = relative(rootInput, candidateInput);
  if (syntacticRelative === ".." || syntacticRelative.startsWith(`..${sep}`) || isAbsolute(syntacticRelative)) {
    failHuman("HUMAN_AUTHORITY_PATH_ESCAPE", `${fieldName} escapes the repository root`, { field: fieldName });
  }
  let cursor = rootInput;
  for (const part of syntacticRelative.split(sep).filter(Boolean)) {
    cursor = join(cursor, part);
    if (!existsSync(cursor)) failHuman("HUMAN_AUTHORITY_PATH_INVALID", `${fieldName} does not exist`, { field: fieldName });
    let stat;
    try {
      stat = lstatSync(cursor);
    } catch {
      failHuman("HUMAN_AUTHORITY_PATH_INVALID", `${fieldName} cannot be inspected`, { field: fieldName });
    }
    if (stat.isSymbolicLink()) failHuman("HUMAN_AUTHORITY_SYMLINK", `${fieldName} may not traverse a symlink`, { field: fieldName });
  }
  let candidateReal;
  try {
    candidateReal = realpathSync(candidateInput);
  } catch {
    failHuman("HUMAN_AUTHORITY_PATH_INVALID", `${fieldName} cannot be resolved`, { field: fieldName });
  }
  const resolvedRelative = relative(rootReal, candidateReal);
  if (resolvedRelative === ".." || resolvedRelative.startsWith(`..${sep}`) || isAbsolute(resolvedRelative)) {
    failHuman("HUMAN_AUTHORITY_PATH_ESCAPE", `${fieldName} resolves outside the repository root`, { field: fieldName });
  }
  let candidateStat;
  try {
    candidateStat = lstatSync(candidateReal);
  } catch {
    failHuman("HUMAN_AUTHORITY_PATH_INVALID", `${fieldName} cannot be inspected`, { field: fieldName });
  }
  if (!candidateStat.isFile()) failHuman("HUMAN_AUTHORITY_PATH_INVALID", `${fieldName} must be a regular file`, { field: fieldName });
  const permissionBits = candidateStat.mode & 0o777;
  if (permissionBits !== 0o600) {
    failHuman("HUMAN_AUTHORITY_FILE_MODE_INVALID", `${fieldName} must use mode 0600`, { field: fieldName });
  }
  const effectiveUid = typeof process.geteuid === "function"
    ? process.geteuid()
    : (typeof process.getuid === "function" ? process.getuid() : null);
  if (effectiveUid !== null && Number.isInteger(candidateStat.uid) && candidateStat.uid !== effectiveUid) {
    failHuman("HUMAN_AUTHORITY_FILE_OWNER_INVALID", `${fieldName} is not owned by the current effective user`, { field: fieldName });
  }
  return candidateReal;
}

function decodeDetachedSignature(value) {
  const raw = Buffer.isBuffer(value) ? value : Buffer.from(value ?? "");
  if (raw.length === 64) return raw;
  const text = raw.toString("utf8").trim();
  if (/^[0-9a-f]{128}$/iu.test(text)) return Buffer.from(text, "hex");
  if (/^[A-Za-z0-9+/]+={0,2}$/u.test(text)) {
    const decoded = Buffer.from(text, "base64");
    if (decoded.length === 64) return decoded;
  }
  failHuman("HUMAN_AUTHORITY_SIGNATURE_FORMAT", "detached signature must contain exactly 64 Ed25519 bytes");
}

function validateTrustKey(value, { testOnly }) {
  const keys = [
    "key_id",
    "algorithm",
    "public_key_spki_pem",
    "fingerprint_sha256",
    "owner",
    "actions",
    "release_scopes",
  ];
  assertHumanExactKeys(value, keys, "human authority trust key");
  assertSafeHumanId(value.key_id, "trust key.key_id");
  if (value.algorithm !== HUMAN_AUTHORITY_SIGNATURE_ALGORITHM) failHuman("HUMAN_AUTHORITY_ALGORITHM_INVALID", "trust key algorithm must be Ed25519");
  if (typeof value.public_key_spki_pem !== "string"
    || !value.public_key_spki_pem.includes("BEGIN PUBLIC KEY")
    || /PRIVATE KEY/iu.test(value.public_key_spki_pem)) {
    failHuman("HUMAN_AUTHORITY_PUBLIC_KEY_INVALID", "trust key must provide an SPKI public key");
  }
  assertSha256(value.fingerprint_sha256, "trust key.fingerprint_sha256");
  assertSafeHumanId(value.owner, "trust key.owner");
  if (!Array.isArray(value.actions) || value.actions.length === 0 || new Set(value.actions).size !== value.actions.length
    || value.actions.some((action) => !HUMAN_AUTHORITY_ACTIONS.includes(action))) {
    failHuman("HUMAN_AUTHORITY_POLICY_INVALID", "trust key actions are outside the closed authority policy");
  }
  if (!Array.isArray(value.release_scopes) || value.release_scopes.length === 0 || new Set(value.release_scopes).size !== value.release_scopes.length
    || value.release_scopes.some((scope) => !HUMAN_AUTHORITY_RELEASE_SCOPES.includes(scope))) {
    failHuman("HUMAN_AUTHORITY_POLICY_INVALID", "trust key release scopes are outside the closed authority policy");
  }
  if (testOnly && (!TEST_ONLY_KEY_PATTERN.test(value.key_id) || !TEST_ONLY_KEY_PATTERN.test(value.owner))) {
    failHuman("HUMAN_AUTHORITY_TEST_KEY_MARKER_REQUIRED", "test-only trust keys must carry an explicit TEST_ONLY key and owner marker");
  }
  if (!testOnly && (TEST_ONLY_KEY_PATTERN.test(value.key_id) || TEST_ONLY_KEY_PATTERN.test(value.owner))) {
    failHuman("HUMAN_AUTHORITY_TEST_KEY_FORBIDDEN", "TEST_ONLY trust keys cannot enter the operational allowlist");
  }
  let publicKey;
  try {
    publicKey = createPublicKey(value.public_key_spki_pem);
  } catch {
    failHuman("HUMAN_AUTHORITY_PUBLIC_KEY_INVALID", "trust key public key cannot be parsed");
  }
  if (publicKey.asymmetricKeyType !== "ed25519") failHuman("HUMAN_AUTHORITY_ALGORITHM_INVALID", "trust key public key is not Ed25519");
  const actualFingerprint = sha256Bytes(publicKey.export({ type: "spki", format: "der" }));
  if (actualFingerprint !== value.fingerprint_sha256) {
    failHuman("HUMAN_AUTHORITY_FINGERPRINT_MISMATCH", "trust key fingerprint does not match its public key");
  }
  return Object.freeze({
    ...value,
    actions: Object.freeze([...value.actions]),
    release_scopes: Object.freeze([...value.release_scopes]),
    publicKey,
  });
}

function resolveTrustKeys({ testOnly, testOnlyTrustedKeys, options }) {
  if (options.trustedKeys !== undefined) {
    failHuman("HUMAN_AUTHORITY_TRUST_STORE_OVERRIDE", "operational authority verification uses the tracked allowlist only");
  }
  if (testOnlyTrustedKeys !== undefined && !Array.isArray(testOnlyTrustedKeys)) {
    failHuman("HUMAN_AUTHORITY_POLICY_INVALID", "testOnlyTrustedKeys must be an array");
  }
  const configured = testOnly ? (testOnlyTrustedKeys ?? []) : TRUSTED_HUMAN_AUTHORITY_KEYS;
  if (!testOnly && Array.isArray(testOnlyTrustedKeys) && testOnlyTrustedKeys.length > 0) {
    failHuman("HUMAN_AUTHORITY_TEST_KEY_REQUIRED", "test-only trust keys require explicit testOnly=true");
  }
  const validated = configured.map((key) => validateTrustKey(key, { testOnly }));
  if (new Set(validated.map((key) => key.key_id)).size !== validated.length) {
    failHuman("HUMAN_AUTHORITY_POLICY_INVALID", "trust key ids must be unique");
  }
  return validated;
}

function requireExpectedHumanBindings(options) {
  const required = [
    "expectedReleaseId",
    "expectedEnvironment",
    "expectedSourceSha",
    "expectedSourceTree",
    "expectedArtifactSha256",
    "expectedAction",
    "expectedReleaseScope",
  ];
  for (const field of required) {
    if (options[field] === undefined || options[field] === null) {
      failHuman("HUMAN_AUTHORITY_EXPECTED_BINDING_REQUIRED", `${field} is required to verify human authority`);
    }
  }
  assertSafeHumanId(options.expectedReleaseId, "expectedReleaseId");
  if (!HUMAN_AUTHORITY_ENVIRONMENTS.includes(options.expectedEnvironment)) {
    failHuman("HUMAN_AUTHORITY_ENVIRONMENT_INVALID", "expectedEnvironment is outside the closed authority enum");
  }
  assertSha(options.expectedSourceSha, "expectedSourceSha");
  assertSha(options.expectedSourceTree, "expectedSourceTree");
  const expectedArtifacts = normalizeExpectedArtifacts(options.expectedArtifactSha256);
  if (!HUMAN_AUTHORITY_ACTIONS.includes(options.expectedAction)) failHuman("HUMAN_AUTHORITY_ACTION_INVALID", "expectedAction is outside the closed authority enum");
  if (!HUMAN_AUTHORITY_RELEASE_SCOPES.includes(options.expectedReleaseScope)) failHuman("HUMAN_AUTHORITY_SCOPE_INVALID", "expectedReleaseScope is outside the closed authority enum");
  if (options.expectedAction === "canary_acceptance"
    && (options.expectedEnvironment !== "canary" || options.expectedReleaseScope !== "macos_canary" || ![1, 2].includes(options.expectedCanaryUserCount))) {
    failHuman("HUMAN_AUTHORITY_CANARY_SCOPE_INVALID", "expected canary authority must bind macos_canary and one or two users");
  }
  if (options.expectedAction === "production_go_live"
    && (options.expectedEnvironment !== "production" || options.expectedReleaseScope === "macos_canary" || options.expectedCanaryUserCount !== null)) {
    failHuman("HUMAN_AUTHORITY_PRODUCTION_SCOPE_INVALID", "expected production authority must bind production scope and null canary user count");
  }
  return Object.freeze({
    releaseId: options.expectedReleaseId,
    environment: options.expectedEnvironment,
    sourceSha: options.expectedSourceSha,
    sourceTree: options.expectedSourceTree,
    artifactSha256: expectedArtifacts,
    action: options.expectedAction,
    releaseScope: options.expectedReleaseScope,
    canaryUserCount: options.expectedCanaryUserCount,
  });
}

function assertHumanReceiptBindings(receipt, expected) {
  if (receipt.source_sha !== expected.sourceSha
    || receipt.source_tree !== expected.sourceTree
    || receipt.release_id !== expected.releaseId
    || receipt.environment !== expected.environment
    || receipt.action !== expected.action
    || receipt.release_scope !== expected.releaseScope
    || receipt.canary_user_count !== expected.canaryUserCount
    || canonicalizeJson(receipt.artifact_sha256) !== canonicalizeJson(expected.artifactSha256)) {
    failHuman("HUMAN_AUTHORITY_BINDING_MISMATCH", "human authority receipt does not bind the expected source, scope, or artifacts");
  }
}

export function readRf13HumanAuthorityReceipt(options = {}) {
  const {
    receiptPath,
    repoRoot,
    expectedReceiptId,
    expectedReleaseId,
    expectedEnvironment,
    expectedSourceSha,
    expectedSourceTree,
    expectedArtifactSha256,
    expectedArtifactHashes,
    expectedAction,
    expectedReleaseScope,
    expectedCanaryUserCount,
    now = Date.now(),
    testOnly = false,
    testOnlyTrustedKeys,
  } = options;
  if (receiptPath === undefined || receiptPath === null || receiptPath === "") {
    return Object.freeze({ receipt: null, capability: null, status: "BLOCKED_BY_AUTHORITY", reason_code: "AUTHORITY_RECEIPT_MISSING" });
  }
  if (typeof testOnly !== "boolean") {
    failHuman("HUMAN_AUTHORITY_TEST_MODE_INVALID", "testOnly must be a boolean");
  }
  if (expectedArtifactSha256 !== undefined && expectedArtifactHashes !== undefined
    && canonicalizeJson(expectedArtifactSha256) !== canonicalizeJson(expectedArtifactHashes)) {
    failHuman("HUMAN_AUTHORITY_ALIAS_CONFLICT", "expected artifact hash aliases disagree");
  }
  const expected = requireExpectedHumanBindings({
    expectedReleaseId,
    expectedEnvironment,
    expectedSourceSha,
    expectedSourceTree,
    expectedArtifactSha256: expectedArtifactSha256 ?? expectedArtifactHashes,
    expectedAction,
    expectedReleaseScope,
    expectedCanaryUserCount,
  });
  if (!testOnly && Object.hasOwn(options, "now")) {
    failHuman("HUMAN_AUTHORITY_CLOCK_OVERRIDE", "operational authority verification uses the process wall clock");
  }
  const currentTime = normalizeHumanNow(testOnly ? now : Date.now());
  if (testOnly !== true && testOnlyTrustedKeys !== undefined && testOnlyTrustedKeys.length > 0) {
    failHuman("HUMAN_AUTHORITY_TEST_KEY_REQUIRED", "test-only trust keys require explicit testOnly=true");
  }
  const receiptFile = ensurePathInsideRoot(repoRoot, receiptPath, "receipt path");
  let rawReceipt;
  try {
    rawReceipt = readFileSync(receiptFile);
  } catch {
    failHuman("HUMAN_AUTHORITY_READ_FAILED", "human authority receipt cannot be read");
  }
  const rawReceiptText = rawReceipt.toString("utf8");
  assertNoDuplicateJsonKeys(rawReceiptText);
  let parsedReceipt;
  try {
    parsedReceipt = JSON.parse(rawReceiptText);
  } catch {
    failHuman("HUMAN_AUTHORITY_JSON_INVALID", "human authority receipt JSON is invalid");
  }
  const receipt = validateHumanReceiptShape(parsedReceipt);
  assertHumanReceiptBindings(receipt, expected);
  if (expectedReceiptId !== undefined && receipt.receipt_id !== expectedReceiptId) {
    failHuman("HUMAN_AUTHORITY_RECEIPT_ID_MISMATCH", "human authority receipt id does not match the expected receipt id");
  }
  const issuedAt = parseHumanTimestamp(receipt.issued_at, "issued_at");
  const expiresAt = parseHumanTimestamp(receipt.expires_at, "expires_at");
  if (currentTime < issuedAt) failHuman("HUMAN_AUTHORITY_NOT_YET_VALID", "human authority receipt is not yet valid");
  if (currentTime >= expiresAt) failHuman("HUMAN_AUTHORITY_EXPIRED", "human authority receipt is expired");

  const signatureFile = ensurePathInsideRoot(repoRoot, receipt.signature.path, "signature path", { relativeOnly: true });
  let rawSignature;
  try {
    rawSignature = readFileSync(signatureFile);
  } catch {
    failHuman("HUMAN_AUTHORITY_SIGNATURE_READ_FAILED", "detached authority signature cannot be read");
  }
  const signatureDigest = sha256Bytes(rawSignature);
  if (signatureDigest !== receipt.signature.signature_sha256) {
    failHuman("HUMAN_AUTHORITY_SIGNATURE_HASH_MISMATCH", "detached authority signature hash does not match its descriptor");
  }
  const signature = decodeDetachedSignature(rawSignature);
  const trustedKeys = resolveTrustKeys({ testOnly, testOnlyTrustedKeys, options });
  const key = trustedKeys.find((entry) => entry.key_id === receipt.signature.key_id);
  if (!key) failHuman("HUMAN_AUTHORITY_KEY_NOT_APPROVED", "human authority signer is not in the tracked allowlist");
  if (key.fingerprint_sha256 !== receipt.signature.fingerprint_sha256) {
    failHuman("HUMAN_AUTHORITY_FINGERPRINT_MISMATCH", "human authority signer fingerprint does not match the tracked key");
  }
  if (!key.actions.includes(receipt.action) || !key.release_scopes.includes(receipt.release_scope)) {
    failHuman("HUMAN_AUTHORITY_POLICY_DENIED", "human authority signer policy does not cover this action and scope");
  }
  const signedPayload = Buffer.from(canonicalizeJson(canonicalHumanPayload(receipt)));
  let signatureValid = false;
  try {
    signatureValid = verifySignature(null, signedPayload, key.publicKey, signature);
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) failHuman("HUMAN_AUTHORITY_SIGNATURE_INVALID", "detached authority signature is invalid");
  const normalizedReceiptSha = sha256Canonical(canonicalHumanReceipt(receipt));
  const signedPayloadSha = sha256Bytes(signedPayload);
  const capability = Object.freeze({
    capability_type: "rf13-human-authority",
    capability_version: 1,
    test_only: testOnly === true,
    receipt_id: receipt.receipt_id,
    release_id: receipt.release_id,
    environment: receipt.environment,
    action: receipt.action,
    source_sha: receipt.source_sha,
    source_tree: receipt.source_tree,
    artifact_sha256: Object.freeze([...receipt.artifact_sha256]),
    release_scope: receipt.release_scope,
    canary_user_count: receipt.canary_user_count,
    issued_at: receipt.issued_at,
    expires_at: receipt.expires_at,
    nonce: receipt.nonce,
    key_id: key.key_id,
    owner: key.owner,
    fingerprint_sha256: key.fingerprint_sha256,
    key_fingerprint_sha256: key.fingerprint_sha256,
    signature_sha256: receipt.signature.signature_sha256,
    receipt_sha256: normalizedReceiptSha,
    signed_payload_sha256: signedPayloadSha,
  });
  HUMAN_AUTHORITY_CAPABILITIES.add(capability);
  return Object.freeze({ receipt, capability, status: "PASS" });
}

export const readAndVerifyRf13HumanAuthorityReceipt = readRf13HumanAuthorityReceipt;
export const verifyRf13HumanAuthorityReceipt = readRf13HumanAuthorityReceipt;

export function assertRf13HumanAuthorityCapability(capability, expected = {}) {
  if (!isRecord(capability) || !HUMAN_AUTHORITY_CAPABILITIES.has(capability)) {
    failHuman("HUMAN_AUTHORITY_CAPABILITY_INVALID", "authority capability is not minted by the verifier");
  }
  if (capability.test_only === true) {
    failHuman("HUMAN_AUTHORITY_TEST_CAPABILITY_FORBIDDEN", "test-only authority capabilities are not operational");
  }
  const required = ["releaseId", "environment", "action", "sourceSha", "sourceTree", "artifactSha256", "releaseScope", "canaryUserCount"];
  for (const field of required) {
    if (expected[field] === undefined) failHuman("HUMAN_AUTHORITY_CAPABILITY_BINDING_REQUIRED", `${field} is required when consuming an authority capability`);
  }
  const expectedBindings = requireExpectedHumanBindings({
    expectedReleaseId: expected.releaseId,
    expectedEnvironment: expected.environment,
    expectedSourceSha: expected.sourceSha,
    expectedSourceTree: expected.sourceTree,
    expectedArtifactSha256: expected.artifactSha256,
    expectedAction: expected.action,
    expectedReleaseScope: expected.releaseScope,
    expectedCanaryUserCount: expected.canaryUserCount,
  });
  if (capability.release_id !== expectedBindings.releaseId
    || capability.environment !== expectedBindings.environment
    || capability.source_sha !== expectedBindings.sourceSha
    || capability.source_tree !== expectedBindings.sourceTree
    || capability.action !== expectedBindings.action
    || capability.release_scope !== expectedBindings.releaseScope
    || capability.canary_user_count !== expectedBindings.canaryUserCount
    || canonicalizeJson(capability.artifact_sha256) !== canonicalizeJson(expectedBindings.artifactSha256)) {
    failHuman("HUMAN_AUTHORITY_CAPABILITY_BINDING_MISMATCH", "authority capability does not bind the expected source, scope, or artifacts");
  }
  if (expected.receiptId !== undefined && capability.receipt_id !== expected.receiptId) {
    failHuman("HUMAN_AUTHORITY_CAPABILITY_BINDING_MISMATCH", "authority capability receipt id does not match the expected receipt id");
  }
  if (Object.hasOwn(expected, "now")) {
    failHuman("HUMAN_AUTHORITY_CLOCK_OVERRIDE", "operational capability verification uses the process wall clock");
  }
  const currentTime = Date.now();
  const issuedAt = parseHumanTimestamp(capability.issued_at, "capability.issued_at");
  const expiresAt = parseHumanTimestamp(capability.expires_at, "capability.expires_at");
  if (currentTime < issuedAt) failHuman("HUMAN_AUTHORITY_NOT_YET_VALID", "authority capability is not yet valid");
  if (currentTime >= expiresAt) failHuman("HUMAN_AUTHORITY_EXPIRED", "authority capability is expired");
  return capability;
}

export const assertHumanAuthorityCapability = assertRf13HumanAuthorityCapability;
