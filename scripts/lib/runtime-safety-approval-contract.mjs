import { createHash, verify as verifySignature } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const SHA1 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const APPROVAL_SCHEMA = "law-firm-os.runtime-safety.approval.v1";
const REGISTRY_SCHEMA = "law-firm-os.runtime-safety.approval-trust-registry.v1";

export class RuntimeSafetyApprovalError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "RuntimeSafetyApprovalError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new RuntimeSafetyApprovalError(code, message, details);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertClosedObject(value, allowed, code, label) {
  if (!isRecord(value)) fail(code, `${label} must be an object`);
  const extras = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extras.length) fail(code, `${label} contains unsupported fields`, { extras });
}

function parseTime(value, code, field) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    fail(code, `${field} must be an RFC 3339 UTC timestamp`);
  }
  const time = Date.parse(value);
  if (!Number.isFinite(time)) fail(code, `${field} is invalid`);
  return time;
}

export function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalizeJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("APPROVAL_CANONICAL_JSON", "non-finite numbers are not valid canonical JSON");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalizeJson).join(",")}]`;
  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalizeJson(value[key])}`).join(",")}}`;
  }
  fail("APPROVAL_CANONICAL_JSON", "value is not representable as canonical JSON");
}

export function resolveNoSymlinkPath(root, candidate, { mustExist = true } = {}) {
  if (typeof root !== "string" || typeof candidate !== "string" || !root || !candidate || candidate.includes("\0")) {
    fail("APPROVAL_PATH", "root and candidate must be non-empty paths");
  }
  if (!existsSync(root)) fail("APPROVAL_PATH", "fixture root does not exist");
  const rootInput = resolve(root);
  const rootReal = realpathSync(root);
  const candidateInput = resolve(isAbsolute(candidate) ? candidate : join(rootInput, candidate));
  const syntacticRelative = relative(rootInput, candidateInput);
  if (syntacticRelative === ".." || syntacticRelative.startsWith(`..${sep}`) || isAbsolute(syntacticRelative)) {
    fail("APPROVAL_PATH_ESCAPE", "candidate path escapes the declared root");
  }

  let cursor = rootInput;
  for (const part of syntacticRelative.split(sep).filter(Boolean)) {
    cursor = join(cursor, part);
    if (!existsSync(cursor)) {
      if (mustExist) fail("APPROVAL_PATH", "candidate path does not exist");
      continue;
    }
    if (lstatSync(cursor).isSymbolicLink()) fail("APPROVAL_SYMLINK", "symlinks are not allowed in approval paths");
  }
  if (mustExist && !existsSync(candidateInput)) fail("APPROVAL_PATH", "candidate path does not exist");
  if (existsSync(candidateInput)) {
    const candidateReal = realpathSync(candidateInput);
    const resolvedRelative = relative(rootReal, candidateReal);
    if (resolvedRelative === ".." || resolvedRelative.startsWith(`..${sep}`) || isAbsolute(resolvedRelative)) {
      fail("APPROVAL_PATH_ESCAPE", "resolved candidate path escapes the declared root");
    }
    return candidateReal;
  }
  return join(realpathSync(dirname(candidateInput)), basename(candidateInput));
}

function decodeSignature(bytes) {
  if (bytes.length === 64) return bytes;
  const text = bytes.toString("utf8").trim();
  if (/^[0-9a-f]{128}$/i.test(text)) return Buffer.from(text, "hex");
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(text)) {
    const decoded = Buffer.from(text, "base64");
    if (decoded.length === 64) return decoded;
  }
  fail("APPROVAL_SIGNATURE_FORMAT", "detached signature must be raw, hex, or base64 Ed25519 bytes");
}

function validateRegistry(registry, now) {
  assertClosedObject(registry, ["schema_version", "generated_at", "keys"], "APPROVAL_REGISTRY", "trust registry");
  if (registry.schema_version !== REGISTRY_SCHEMA) fail("APPROVAL_REGISTRY", "unsupported trust registry schema");
  if (!Array.isArray(registry.keys) || registry.keys.length === 0) fail("APPROVAL_REGISTRY", "trust registry must contain keys");
  const ids = new Set();
  for (const key of registry.keys) {
    assertClosedObject(key, [
      "key_id", "algorithm", "public_key_spki_pem", "roles", "actions", "environments", "valid_from", "valid_until", "revoked_at",
    ], "APPROVAL_REGISTRY", "trust registry key");
    if (typeof key.key_id !== "string" || !/^[A-Za-z0-9._-]+$/.test(key.key_id) || ids.has(key.key_id)) fail("APPROVAL_REGISTRY", "registry key_id is invalid or duplicated");
    ids.add(key.key_id);
    if (key.algorithm !== "Ed25519") fail("APPROVAL_ALGORITHM", "only Ed25519 registry keys are allowed");
    if (typeof key.public_key_spki_pem !== "string" || !key.public_key_spki_pem.includes("BEGIN PUBLIC KEY")) fail("APPROVAL_REGISTRY", "registry public key must be SPKI PEM");
    for (const field of ["roles", "actions", "environments"]) {
      if (!Array.isArray(key[field]) || key[field].length === 0 || key[field].some((item) => typeof item !== "string" || !item)) fail("APPROVAL_REGISTRY", `registry ${field} must be a non-empty string array`);
    }
    const validFrom = parseTime(key.valid_from, "APPROVAL_REGISTRY", "key.valid_from");
    const validUntil = parseTime(key.valid_until, "APPROVAL_REGISTRY", "key.valid_until");
    if (validUntil <= validFrom) fail("APPROVAL_REGISTRY", "registry key validity interval is invalid");
    if (key.revoked_at !== null && key.revoked_at !== undefined) parseTime(key.revoked_at, "APPROVAL_REGISTRY", "key.revoked_at");
    if (now < validFrom || now > validUntil) {
      // The selected key emits the precise validity error later; other inactive keys may remain in the registry.
    }
  }
}

function validateReceiptShape(receipt) {
  if (isRecord(receipt) && Object.keys(receipt).some((key) => /public.*key|signing.*key/i.test(key))) {
    fail("APPROVAL_SELF_SIGNING", "approval receipts may not carry their own trust key");
  }
  assertClosedObject(receipt, [
    "schema_version",
    "approval_id",
    "key_id",
    "role",
    "decision",
    "packet_sha256",
    "source_sha",
    "source_tree",
    "action",
    "environment",
    "signed_at",
    "expires_at",
    "data_scope",
    "contact_scope",
  ], "APPROVAL_RECEIPT", "approval receipt");
  if (receipt.schema_version !== APPROVAL_SCHEMA) fail("APPROVAL_RECEIPT", "unsupported approval receipt schema");
  for (const field of ["approval_id", "key_id", "role", "action", "environment"]) {
    if (typeof receipt[field] !== "string" || !/^[A-Za-z0-9._:-]+$/.test(receipt[field])) fail("APPROVAL_RECEIPT", `${field} is invalid`);
  }
  if (!["approved", "rejected"].includes(receipt.decision)) fail("APPROVAL_RECEIPT", "decision must be approved or rejected");
  if (!SHA256.test(receipt.packet_sha256 ?? "")) fail("APPROVAL_RECEIPT", "packet_sha256 is invalid");
  if (!SHA1.test(receipt.source_sha ?? "") || !SHA1.test(receipt.source_tree ?? "")) fail("APPROVAL_RECEIPT", "source SHA/tree binding is invalid");
  if (!Array.isArray(receipt.data_scope) || !Array.isArray(receipt.contact_scope) || [...receipt.data_scope, ...receipt.contact_scope].some((entry) => typeof entry !== "string")) {
    fail("APPROVAL_SCOPE", "data_scope and contact_scope must be string arrays");
  }
}

export function validateRuntimeSafetyApprovalPayload(options) {
  const {
    registryBytes,
    receiptBytes,
    signatureBytes,
    expectedRegistrySha256,
    expectedRole,
    expectedAction,
    expectedEnvironment,
    expectedPacketSha256,
    expectedSourceSha,
    expectedSourceTree,
    allowedDataScope = [],
    allowedContactScope = [],
    now = Date.now(),
  } = options ?? {};
  const rawRegistry = Buffer.isBuffer(registryBytes) ? registryBytes : Buffer.from(registryBytes ?? "");
  const rawReceipt = Buffer.isBuffer(receiptBytes) ? receiptBytes : Buffer.from(receiptBytes ?? "");
  const rawSignature = Buffer.isBuffer(signatureBytes) ? signatureBytes : Buffer.from(signatureBytes ?? "");
  if (!SHA256.test(expectedRegistrySha256 ?? "") || sha256Hex(rawRegistry) !== expectedRegistrySha256) {
    fail("APPROVAL_REGISTRY_DIGEST", "trust registry digest does not match");
  }
  let registry;
  let receipt;
  try {
    registry = JSON.parse(rawRegistry);
    receipt = JSON.parse(rawReceipt);
  } catch {
    fail("APPROVAL_JSON", "registry and receipt must contain valid JSON");
  }
  validateRegistry(registry, now);
  validateReceiptShape(receipt);
  const key = registry.keys.find((entry) => entry.key_id === receipt.key_id);
  if (!key) fail("APPROVAL_KEY", "receipt key_id is not present in the trust registry");
  if (key.algorithm !== "Ed25519") fail("APPROVAL_ALGORITHM", "receipt key is not Ed25519");
  if (key.revoked_at !== null && key.revoked_at !== undefined) fail("APPROVAL_REVOKED", "receipt key is revoked");
  const signedAt = parseTime(receipt.signed_at, "APPROVAL_TIME", "signed_at");
  const expiresAt = parseTime(receipt.expires_at, "APPROVAL_TIME", "expires_at");
  const validFrom = parseTime(key.valid_from, "APPROVAL_REGISTRY", "key.valid_from");
  const validUntil = parseTime(key.valid_until, "APPROVAL_REGISTRY", "key.valid_until");
  if (expiresAt <= signedAt || now > expiresAt) fail("APPROVAL_EXPIRED", "approval receipt is expired");
  if (signedAt < validFrom || signedAt > validUntil || now > validUntil) fail("APPROVAL_KEY_TIME", "approval key is outside its validity interval");
  if (receipt.role !== expectedRole || !key.roles.includes(expectedRole)) fail("APPROVAL_ROLE", "approval role is not authorized");
  if (receipt.action !== expectedAction || !key.actions.includes(expectedAction)) fail("APPROVAL_ACTION", "approval action is not authorized");
  if (receipt.environment !== expectedEnvironment || !key.environments.includes(expectedEnvironment)) fail("APPROVAL_ENVIRONMENT", "approval environment is not authorized");
  if (receipt.packet_sha256 !== expectedPacketSha256) fail("APPROVAL_PACKET", "approval packet binding does not match");
  if (receipt.source_sha !== expectedSourceSha || receipt.source_tree !== expectedSourceTree) fail("APPROVAL_SOURCE", "approval source binding does not match");
  if (receipt.data_scope.some((scope) => !allowedDataScope.includes(scope)) || receipt.contact_scope.some((scope) => !allowedContactScope.includes(scope))) {
    fail("APPROVAL_SCOPE", "approval requests data or contact scope outside the allowed boundary");
  }
  const signature = decodeSignature(rawSignature);
  const canonicalBytes = Buffer.from(canonicalizeJson(receipt));
  if (!verifySignature(null, canonicalBytes, key.public_key_spki_pem, signature)) fail("APPROVAL_SIGNATURE", "detached approval signature is invalid");
  return Object.freeze({
    valid: true,
    decision: receipt.decision,
    approval_id: receipt.approval_id,
    key_id: receipt.key_id,
    registry_sha256: expectedRegistrySha256,
    receipt_sha256: sha256Hex(canonicalBytes),
    signed_at: receipt.signed_at,
    expires_at: receipt.expires_at,
  });
}

export function validateRuntimeSafetyApprovalBundle(options) {
  const {
    registryPath,
    expectedRegistrySha256,
    receiptPath,
    signaturePath = receiptPath ? `${receiptPath}.sig` : undefined,
    expectedRole,
    expectedAction,
    expectedEnvironment,
    expectedPacketSha256,
    expectedSourceSha,
    expectedSourceTree,
    allowedDataScope = [],
    allowedContactScope = [],
    now = Date.now(),
    fixtureRoot,
  } = options ?? {};

  if (!registryPath || !expectedRegistrySha256) fail("APPROVAL_REQUIRED", "trust registry path and exact digest are required");
  if (!SHA256.test(expectedRegistrySha256)) fail("APPROVAL_REGISTRY_DIGEST", "expected trust registry digest is invalid");
  if (!receiptPath || !signaturePath) fail("APPROVAL_REQUIRED", "approval receipt and detached signature are required");

  const resolveInput = (candidate) => fixtureRoot
    ? resolveNoSymlinkPath(fixtureRoot, candidate)
    : (() => {
      if (!isAbsolute(candidate) || !existsSync(candidate) || lstatSync(candidate).isSymbolicLink()) fail("APPROVAL_PATH", "approval paths must be existing absolute non-symlink files");
      return realpathSync(candidate);
    })();

  const registryFile = resolveInput(registryPath);
  const receiptFile = resolveInput(receiptPath);
  const signatureFile = resolveInput(signaturePath);
  const registryBytes = readFileSync(registryFile);
  const actualRegistrySha256 = sha256Hex(registryBytes);
  if (actualRegistrySha256 !== expectedRegistrySha256) fail("APPROVAL_REGISTRY_DIGEST", "trust registry digest does not match");

  return validateRuntimeSafetyApprovalPayload({
    registryBytes,
    receiptBytes: readFileSync(receiptFile),
    signatureBytes: readFileSync(signatureFile),
    expectedRegistrySha256: actualRegistrySha256,
    expectedRole,
    expectedAction,
    expectedEnvironment,
    expectedPacketSha256,
    expectedSourceSha,
    expectedSourceTree,
    allowedDataScope,
    allowedContactScope,
    now,
  });
}
