import { createHash, verify as verifySignature } from "node:crypto";
import { canonicalizeJson } from "./runtime-safety-approval-contract.mjs";

export const PRIVATE_STAGING_EXECUTION_RECEIPT_SCHEMA = "law-firm-os.private-staging.execution-receipt.v1";

export const PRIVATE_STAGING_REQUIRED_RECEIPT_KINDS = Object.freeze([
  "source-baseline",
  "pr-172-adjudication",
  "source-field-contract",
  "internal-password-authority",
  "migration-engine",
  "local-postgres-validation",
  "artifact-verification",
  "exact-head-ci",
  "security-review",
  "infrastructure-deployment",
  "database-bootstrap",
  "cost-verification",
  "protected-resource-non-interference",
  "cut-005",
  "cut-006",
  "cut-007",
]);
const PRIVATE_STAGING_RECEIPT_ACTION = "lawos-private-staging-exact-head-execution";
const SOURCE_LOCAL_RECEIPT_KINDS = new Set(["source-baseline", "local-postgres-validation"]);

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9._:@/+=-]{3,256}$/u;
const SAFE_KEY = /^[a-z][a-z0-9_]{1,95}$/u;
const ALLOWED_EXECUTION_STATES = new Set(["PASS", "BLOCKED_EXTERNAL", "FAIL"]);
const ALLOWED_DATA_SCOPES = new Set(["none", "synthetic-only"]);
const ALLOWED_CONTACT_SCOPES = new Set(["none", "synthetic-mailbox-only"]);
const FORBIDDEN_KEY = /(?:^|_)(?:password|passphrase|token|authorization|api_key|client_secret|private_key|document_bytes|content_base64)(?:_|$)/iu;
const FORBIDDEN_TEXT = /(?:-----BEGIN (?:PRIVATE KEY|OPENSSH PRIVATE KEY)-----|\bBearer\s+[A-Za-z0-9._~+/=-]+|[A-Z0-9._%+-]+@(?!example\.invalid\b)[A-Z0-9.-]+\.[A-Z]{2,})/iu;

function fail(message) {
  const error = new Error(message);
  error.code = "PRIVATE_STAGING_EXECUTION_RECEIPT_INVALID";
  throw error;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertClosedObject(value, fields, label) {
  if (!isRecord(value)) fail(`${label} must be an object`);
  const extras = Object.keys(value).filter((key) => !fields.includes(key));
  if (extras.length) fail(`${label} contains unsupported fields: ${extras.join(", ")}`);
}

function requiredText(value, name, pattern = SAFE_ID) {
  const text = String(value ?? "").trim();
  if (!text || (pattern && !pattern.test(text))) fail(`${name} is invalid`);
  return text;
}

function timestamp(value, name) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value)) fail(`${name} must be an RFC 3339 UTC timestamp`);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) fail(`${name} is invalid`);
  return parsed;
}

function assertSafeValue(value, path = "receipt") {
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) fail(`${path} must contain only finite non-negative numbers`);
    return;
  }
  if (typeof value === "string") {
    if (FORBIDDEN_TEXT.test(value)) fail(`${path} contains forbidden credential, authorization, or non-synthetic email material`);
    if (value.length > 2048) fail(`${path} string is too long for a safe receipt`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 256) fail(`${path} contains too many entries`);
    value.forEach((entry, index) => assertSafeValue(entry, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) fail(`${path} contains an unsupported value`);
  for (const [key, entry] of Object.entries(value)) {
    if (!SAFE_KEY.test(key)) fail(`${path}.${key} uses an unsafe field name`);
    if (FORBIDDEN_KEY.test(key) && entry !== false && entry !== 0 && entry !== null) fail(`${path}.${key} may not carry sensitive material`);
    assertSafeValue(entry, `${path}.${key}`);
  }
}

function validateSafeCounts(value) {
  if (!isRecord(value) || Object.keys(value).length === 0) fail("safe_counts must be a non-empty object");
  for (const [key, count] of Object.entries(value)) {
    if (!SAFE_KEY.test(key) || typeof count !== "number" || !Number.isFinite(count) || count < 0) fail(`safe_counts.${key} must be a finite non-negative number`);
  }
}

function validateDigests(value) {
  if (!isRecord(value) || Object.keys(value).length === 0) fail("digests must be a non-empty object");
  for (const [key, digest] of Object.entries(value)) {
    if (!SAFE_KEY.test(key) || !SHA256.test(digest ?? "")) fail(`digests.${key} must be a SHA-256 digest`);
  }
}

function validateClaims(value) {
  if (!isRecord(value) || Object.keys(value).length === 0) fail("claims must be a non-empty object");
  for (const [key, claim] of Object.entries(value)) {
    if (FORBIDDEN_KEY.test(key) && claim !== false) fail(`claims.${key} may not carry sensitive material`);
    if (!SAFE_KEY.test(key) || typeof claim !== "boolean") fail(`claims.${key} must be boolean`);
  }
  for (const requiredFalse of ["secret_material_returned", "raw_pii_returned", "production_contacted", "real_data_contacted"]) {
    if (value[requiredFalse] !== false) fail(`claims.${requiredFalse} must be false`);
  }
}

export function sha256ExecutionReceipt(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function validatePrivateStagingExecutionReceipt(receipt, expected = {}) {
  assertClosedObject(receipt, [
    "schema_version",
    "receipt_id",
    "receipt_kind",
    "key_id",
    "approval_id",
    "owner_instruction_sha256",
    "execution_state",
    "started_at",
    "finished_at",
    "command",
    "exit_code",
    "profile",
    "environment",
    "data_scope",
    "contact_scope",
    "source_sha",
    "source_tree",
    "artifact_sha256",
    "safe_counts",
    "digests",
    "claims",
    "blockers",
  ], "execution receipt");
  if (receipt.schema_version !== PRIVATE_STAGING_EXECUTION_RECEIPT_SCHEMA) fail("execution receipt schema is invalid");
  requiredText(receipt.receipt_id, "receipt_id");
  if (!PRIVATE_STAGING_REQUIRED_RECEIPT_KINDS.includes(receipt.receipt_kind)) fail("receipt_kind is not allowed");
  requiredText(receipt.key_id, "key_id");
  requiredText(receipt.approval_id, "approval_id");
  if (!SHA256.test(receipt.owner_instruction_sha256 ?? "")) fail("owner_instruction_sha256 is invalid");
  if (!ALLOWED_EXECUTION_STATES.has(receipt.execution_state)) fail("execution_state is not allowed");
  const startedAt = timestamp(receipt.started_at, "started_at");
  const finishedAt = timestamp(receipt.finished_at, "finished_at");
  if (finishedAt < startedAt) fail("finished_at precedes started_at");
  if (typeof receipt.command !== "string" || !receipt.command.trim() || /[\r\n\0]/u.test(receipt.command) || receipt.command.length > 2048) fail("command must be a single non-empty safe line");
  if (!Number.isInteger(receipt.exit_code) || receipt.exit_code < 0 || receipt.exit_code > 255) fail("exit_code is invalid");
  if (receipt.execution_state === "PASS" && receipt.exit_code !== 0) fail("PASS receipt exit_code must be zero");
  requiredText(receipt.profile, "profile", /^[A-Za-z0-9._:@/+=-]{2,128}$/u);
  requiredText(receipt.environment, "environment", /^[a-z0-9-]{3,64}$/u);
  if (!ALLOWED_DATA_SCOPES.has(receipt.data_scope)) fail("data_scope is invalid");
  if (!ALLOWED_CONTACT_SCOPES.has(receipt.contact_scope)) fail("contact_scope is invalid");
  if (!SHA1.test(receipt.source_sha ?? "") || !SHA1.test(receipt.source_tree ?? "")) fail("source SHA/tree binding is invalid");
  if (!SHA256.test(receipt.artifact_sha256 ?? "")) fail("artifact_sha256 is invalid");
  validateSafeCounts(receipt.safe_counts);
  validateDigests(receipt.digests);
  validateClaims(receipt.claims);
  if (!Array.isArray(receipt.blockers) || receipt.blockers.some((item) => typeof item !== "string" || !/^[A-Z0-9_]{3,128}$/u.test(item))) fail("blockers must contain only safe blocker codes");
  if (receipt.execution_state === "PASS" && receipt.blockers.length !== 0) fail("PASS receipt cannot contain blockers");
  for (const [field, pattern] of [["sourceSha", SHA1], ["sourceTree", SHA1], ["artifactSha256", SHA256], ["ownerInstructionSha256", SHA256]]) {
    if (expected[field] != null && (!pattern.test(expected[field]) || receipt[field === "sourceSha" ? "source_sha" : field === "sourceTree" ? "source_tree" : field === "artifactSha256" ? "artifact_sha256" : "owner_instruction_sha256"] !== expected[field])) {
      fail(`${field} binding does not match`);
    }
  }
  if (expected.approvalId != null && receipt.approval_id !== expected.approvalId) fail("approvalId binding does not match");
  if (expected.executionState != null && receipt.execution_state !== expected.executionState) fail("executionState binding does not match");
  assertSafeValue(receipt);
  return Object.freeze({
    valid: true,
    receipt_id: receipt.receipt_id,
    receipt_kind: receipt.receipt_kind,
    execution_state: receipt.execution_state,
    canonical_sha256: sha256ExecutionReceipt(canonicalizeJson(receipt)),
  });
}

export function verifyPrivateStagingExecutionReceipt({ receipt, signature, publicKey, expected } = {}) {
  const result = validatePrivateStagingExecutionReceipt(receipt, expected);
  const bytes = Buffer.isBuffer(signature) ? signature : Buffer.from(signature ?? "", "base64");
  if (bytes.length !== 64 || !verifySignature(null, Buffer.from(canonicalizeJson(receipt)), publicKey, bytes)) fail("execution receipt signature is invalid");
  return Object.freeze({ ...result, signature_valid: true });
}

export function privateStagingReceiptSignerScope(receiptKind) {
  if (!PRIVATE_STAGING_REQUIRED_RECEIPT_KINDS.includes(receiptKind)) fail("receipt signer scope kind is not allowed");
  return Object.freeze({
    role: "owner",
    action: PRIVATE_STAGING_RECEIPT_ACTION,
    environment: SOURCE_LOCAL_RECEIPT_KINDS.has(receiptKind) ? "source-local" : "lawos-staging",
  });
}

export function resolvePrivateStagingReceiptSigner(registry, keyId, now = Date.now(), context = {}) {
  if (!isRecord(registry) || registry.schema_version !== "law-firm-os.runtime-safety.approval-trust-registry.v1" || !Array.isArray(registry.keys)) fail("owner trust registry is invalid");
  const key = registry.keys.find((entry) => entry?.key_id === keyId);
  if (!isRecord(context)) fail("receipt signer scope context is invalid");
  const expectedRole = requiredText(context.expectedRole, "signer.expectedRole");
  const expectedAction = requiredText(context.expectedAction, "signer.expectedAction");
  const expectedEnvironment = requiredText(context.expectedEnvironment, "signer.expectedEnvironment");
  if (context.receiptEnvironment !== expectedEnvironment) fail("receipt signer environment does not match the receipt");
  if (!key || key.algorithm !== "Ed25519" || !Array.isArray(key.roles) || !key.roles.includes(expectedRole)) fail("receipt signer role is not authorized");
  if (!Array.isArray(key.actions) || !key.actions.includes(expectedAction)) fail("receipt signer action is not authorized");
  if (!Array.isArray(key.environments) || !key.environments.includes(expectedEnvironment)) fail("receipt signer environment is not authorized");
  if (key.revoked_at != null) fail("receipt signer is revoked");
  const validFrom = timestamp(key.valid_from, "signer.valid_from");
  const validUntil = timestamp(key.valid_until, "signer.valid_until");
  const startedAt = Number(context.receiptStartedAt);
  const finishedAt = Number(context.receiptFinishedAt);
  if (![now, startedAt, finishedAt].every(Number.isFinite) || finishedAt < startedAt) fail("receipt signer validation time is invalid");
  if (now < validFrom || now > validUntil || startedAt < validFrom || finishedAt > validUntil) fail("receipt signer is outside its validity interval");
  if (typeof key.public_key_spki_pem !== "string" || !key.public_key_spki_pem.includes("BEGIN PUBLIC KEY")) fail("receipt signer public key is invalid");
  return Object.freeze({ key_id: key.key_id, public_key_spki_pem: key.public_key_spki_pem, role: expectedRole, action: expectedAction, environment: expectedEnvironment });
}

export function validatePrivateStagingReceiptSet(receipts, expected = {}) {
  if (!Array.isArray(receipts)) fail("receipt set must be an array");
  const results = receipts.map((receipt) => validatePrivateStagingExecutionReceipt(receipt, expected));
  const ids = new Set(results.map((result) => result.receipt_id));
  const kinds = new Set(results.map((result) => result.receipt_kind));
  if (ids.size !== results.length || kinds.size !== results.length) fail("receipt set contains duplicate ids or kinds");
  const requiredKinds = expected.requiredKinds ?? PRIVATE_STAGING_REQUIRED_RECEIPT_KINDS;
  const missingKinds = requiredKinds.filter((kind) => !kinds.has(kind));
  if (missingKinds.length) fail(`receipt set is missing required kinds: ${missingKinds.join(", ")}`);
  return Object.freeze({
    valid: true,
    receipt_count: results.length,
    pass_count: results.filter((result) => result.execution_state === "PASS").length,
    missing_kind_count: 0,
  });
}
