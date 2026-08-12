import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";

export const TRUST_REGISTRY_SCHEMA_VERSION = "law-firm-os.external-release-trust-registry.v1";
export const TRUST_ROOT_POLICY_SCHEMA_VERSION = "law-firm-os.external-release-trust-root-policy.v1";
// Deliberately unconfigured in source. A production root is installed only by
// the external governance owner; no bundle/input may make a caller key trusted.
export const PRODUCTION_TRUST_ROOT_POLICY = Object.freeze({
  schema_version: TRUST_ROOT_POLICY_SCHEMA_VERSION,
  configured: false,
  registry_installation_path: "config/external-release/trust-registry.json",
  root_public_key_spki_sha256: null,
  root_signed_registry_required: true,
});
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const LAWOS_TENANT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const ENTRA_TENANT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export class ExternalReleaseTrustError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ExternalReleaseTrustError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details = {}) {
  throw new ExternalReleaseTrustError(code, message, details);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function resolveTrustedRoot(rootDir) {
  if (typeof rootDir !== "string" || !rootDir || rootDir.includes("\0")) {
    fail("TRUST_ROOT_INVALID", "trusted root must be a non-empty path");
  }
  const lexicalRoot = path.resolve(rootDir);
  if (!existsSync(lexicalRoot) || lstatSync(lexicalRoot).isSymbolicLink() || !statSync(lexicalRoot).isDirectory()) {
    fail("TRUST_ROOT_INVALID", "trusted root must already be a regular directory, not a symbolic link");
  }
  const realRoot = realpathSync(lexicalRoot);
  // Ancestor aliases such as macOS /var -> /private/var are normalized to the
  // canonical root. The declared root entry itself was lstat-checked above,
  // so a caller-supplied root symlink is still rejected before any I/O.
  return realRoot;
}

export function assertStrictUtcTimestamp(value, field = "timestamp") {
  const normalized = text(value);
  if (!UTC_PATTERN.test(normalized)) fail("TRUST_TIMESTAMP_INVALID", `${field} must be an RFC 3339 UTC timestamp`, { field, value });
  const parsed = Date.parse(normalized);
  if (!Number.isFinite(parsed)) fail("TRUST_TIMESTAMP_INVALID", `${field} is invalid`, { field, value });
  const expected = new Date(parsed).toISOString();
  const canonical = normalized.endsWith("Z") && !normalized.includes(".") ? expected.replace(".000Z", "Z") : expected;
  if (canonical !== normalized) fail("TRUST_TIMESTAMP_INVALID", `${field} contains an impossible or non-canonical UTC date`, { field, value });
  return value;
}

export function resolveTrustedFile(rootDir, candidate) {
  if (typeof rootDir !== "string" || !rootDir || typeof candidate !== "string" || !candidate || candidate.includes("\0")) {
    fail("TRUST_PATH_INVALID", "trusted file root and candidate must be non-empty paths");
  }
  const root = resolveTrustedRoot(rootDir);
  const target = path.resolve(root, candidate);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) fail("TRUST_PATH_ESCAPE", "trusted file path escapes the declared root", { candidate });
  let cursor = root;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) fail("TRUST_SYMLINK_FORBIDDEN", "trusted file paths may not traverse symlinks", { candidate });
  }
  if (!existsSync(target) || !statSync(target).isFile() || lstatSync(target).isSymbolicLink()) fail("TRUST_FILE_INVALID", "trusted file path must resolve to a regular non-symlink file", { candidate });
  const real = realpathSync(target);
  const realRoot = resolveTrustedRoot(root);
  const realRelative = path.relative(realRoot, real);
  if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) fail("TRUST_PATH_ESCAPE", "trusted file realpath escapes the declared root", { candidate });
  return real;
}

function decodeDetachedSignature(bytes) {
  if (bytes.length === 64) return bytes;
  const value = bytes.toString("utf8").trim();
  if (/^[0-9a-f]{128}$/iu.test(value)) return Buffer.from(value, "hex");
  if (/^[A-Za-z0-9+/]+={0,2}$/u.test(value)) {
    const decoded = Buffer.from(value, "base64");
    if (decoded.length === 64) return decoded;
  }
  fail("TRUST_SIGNATURE_FORMAT", "detached signature must contain exactly 64 Ed25519 bytes");
}

function nonEmptyScopeArray(value, field, keyId) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => !text(item))) {
    fail("TRUST_SCOPE_INVALID", `trusted key ${field} must be a non-empty string array`, { key_id: keyId, field });
  }
  return value;
}

export function verifyTrustedRegistry({ rootDir, registryPath, registrySha256, now = Date.now() } = {}) {
  if (!registryPath || !SHA256_PATTERN.test(text(registrySha256))) fail("TRUST_REGISTRY_REQUIRED", "trusted registry path and exact SHA-256 are required");
  const target = resolveTrustedFile(rootDir, registryPath);
  const bytes = readFileSync(target);
  const actualSha256 = sha256Hex(bytes);
  if (actualSha256 !== text(registrySha256).toLowerCase()) fail("TRUST_REGISTRY_HASH_MISMATCH", "trusted registry bytes do not match the supplied exact SHA-256", { expected: registrySha256, actual: actualSha256 });
  let registry;
  try {
    registry = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    fail("TRUST_REGISTRY_JSON_INVALID", "trusted registry is not valid JSON", { error: error.message });
  }
  if (registry?.schema_version !== TRUST_REGISTRY_SCHEMA_VERSION) fail("TRUST_REGISTRY_SCHEMA_VERSION", "trusted registry schema is invalid", { actual: registry?.schema_version });
  assertStrictUtcTimestamp(registry?.generated_at, "registry.generated_at");
  const generatedAt = Date.parse(registry.generated_at);
  if (generatedAt > now) fail("TRUST_REGISTRY_TIME_INVALID", "trusted registry generated_at cannot be in the future relative to the validation clock", { generated_at: registry.generated_at, now });
  if (!Array.isArray(registry?.keys) || registry.keys.length === 0) fail("TRUST_REGISTRY_KEYS_MISSING", "trusted registry must contain at least one key");
  const seen = new Set();
  for (const key of registry.keys) {
    const keyId = text(key?.key_id);
    if (!key || typeof key !== "object" || Array.isArray(key) || !/^[A-Za-z0-9._-]+$/u.test(keyId) || seen.has(keyId)) fail("TRUST_REGISTRY_KEY_INVALID", "trusted registry key identifier is invalid or duplicated", { key_id: keyId || null });
    seen.add(keyId);
    if (key.algorithm !== "Ed25519" || !text(key.public_key_spki_pem)) fail("TRUST_REGISTRY_KEY_INVALID", "trusted registry key must declare an Ed25519 SPKI public key", { key_id: keyId });
    try {
      const publicKey = createPublicKey(key.public_key_spki_pem);
      if (publicKey.asymmetricKeyType !== "ed25519") fail("TRUST_REGISTRY_KEY_INVALID", "trusted registry public key is not Ed25519", { key_id: keyId });
    } catch (error) {
      fail("TRUST_REGISTRY_KEY_INVALID", "trusted registry public key cannot be parsed", { key_id: keyId, error: error.message });
    }
    for (const field of ["allowed_receipt_sources", "allowed_receipt_types", "allowed_pilot_ids", "allowed_lawos_tenant_ids", "allowed_entra_tenant_ids", "allowed_source_shas", "allowed_source_trees", "allowed_versions", "allowed_roles", "allowed_operations", "allowed_artifact_sha256s", "allowed_binding_sha256s"]) nonEmptyScopeArray(key[field], field, keyId);
    assertStrictUtcTimestamp(key.valid_from, "key.valid_from");
    assertStrictUtcTimestamp(key.valid_until, "key.valid_until");
    const validFrom = Date.parse(key.valid_from);
    const validUntil = Date.parse(key.valid_until);
    if (validUntil <= validFrom) fail("TRUST_REGISTRY_TIME_INVALID", "trusted registry key validity interval is invalid", { key_id: keyId });
    if (key.revoked_at != null) assertStrictUtcTimestamp(key.revoked_at, "key.revoked_at");
    // Expired or not-yet-valid keys may remain for rotation; the selected key is checked below.
  }
  return Object.freeze({ registry, target, bytes, sha256: actualSha256 });
}

export function verifyProductionTrustedRegistry() {
  if (!PRODUCTION_TRUST_ROOT_POLICY.configured || !PRODUCTION_TRUST_ROOT_POLICY.root_public_key_spki_sha256) {
    fail("TRUST_ROOT_NOT_CONFIGURED", "the versioned production trust-root policy has no installed governance root");
  }
  fail("TRUST_ROOT_NOT_CONFIGURED", "production trust-root installation is not available to the validator");
}

export function verifyDetachedReceipt({ rootDir, receiptRef, receiptBytes, receipt, registry, expectedReceiptType, expectedReceiptSource, expectedPilotId, expectedLawosTenantId, expectedEntraTenantId, expectedSourceSha, expectedSourceTree, expectedVersion, expectedRole, expectedOperation, expectedArtifactSha256, expectedBindingSha256, now = Date.now() } = {}) {
  if (!registry?.registry?.keys || !receipt || !Buffer.isBuffer(receiptBytes)) fail("TRUST_RECEIPT_INPUT_INVALID", "receipt bytes, parsed receipt, and trusted registry are required");
  if (!LAWOS_TENANT_ID_PATTERN.test(text(expectedLawosTenantId)) || !ENTRA_TENANT_ID_PATTERN.test(text(expectedEntraTenantId)) || text(expectedLawosTenantId) === text(expectedEntraTenantId)) fail("TRUST_TENANT_SCOPE_REQUIRED", "expected LawOS and Entra tenant IDs must be valid, distinct namespace values for receipt trust validation");
  const signatureRef = receiptRef?.signature_ref;
  if (!signatureRef || typeof signatureRef !== "object" || !SHA256_PATTERN.test(text(signatureRef.sha256))) fail("TRUST_SIGNATURE_REQUIRED", "receipt detached signature path and exact SHA-256 are required");
  const receiptTarget = resolveTrustedFile(rootDir, receiptRef.path);
  const actualReceiptSha256 = sha256Hex(receiptBytes);
  if (actualReceiptSha256 !== text(receiptRef.sha256).toLowerCase()) fail("TRUST_RECEIPT_HASH_MISMATCH", "receipt bytes do not match the declared SHA-256", { expected: receiptRef.sha256, actual: actualReceiptSha256 });
  const signatureTarget = resolveTrustedFile(rootDir, signatureRef.path);
  const signatureBytes = readFileSync(signatureTarget);
  const actualSignatureSha256 = sha256Hex(signatureBytes);
  if (actualSignatureSha256 !== text(signatureRef.sha256).toLowerCase()) fail("TRUST_SIGNATURE_HASH_MISMATCH", "detached signature bytes do not match the declared SHA-256", { expected: signatureRef.sha256, actual: actualSignatureSha256 });
  const keyId = text(receipt.key_id);
  const key = registry.registry.keys.find((entry) => entry.key_id === keyId);
  if (!key) fail("TRUSTED_KEY_NOT_FOUND", "receipt key_id is not present in the trusted registry", { key_id: keyId || null });
  if (key.revoked_at != null) fail("TRUSTED_KEY_REVOKED", "receipt key is revoked", { key_id: keyId });
  assertStrictUtcTimestamp(receipt.issued_at, "receipt.issued_at");
  assertStrictUtcTimestamp(receipt.expires_at, "receipt.expires_at");
  const issuedAt = Date.parse(receipt.issued_at);
  const expiresAt = Date.parse(receipt.expires_at);
  const validFrom = Date.parse(key.valid_from);
  const validUntil = Date.parse(key.valid_until);
  if (expiresAt <= issuedAt || expiresAt <= now || issuedAt < validFrom || issuedAt > validUntil || issuedAt > now || now < validFrom || now > validUntil) fail("TRUST_RECEIPT_TIME_INVALID", "receipt issued_at/expires_at is not ordered or is outside the trusted key/current validity window", { key_id: keyId });
  if (receipt.receipt_type !== expectedReceiptType || receipt.receipt_source !== expectedReceiptSource || receipt.pilot_id !== expectedPilotId) fail("TRUST_RECEIPT_SCOPE_MISMATCH", "receipt source, type, or pilot scope does not match the gate", { key_id: keyId, expectedReceiptType, expectedReceiptSource, expectedPilotId });
  if (receipt.lawos_tenant_id !== expectedLawosTenantId || receipt.entra_tenant_id !== expectedEntraTenantId) fail("TRUST_RECEIPT_TENANT_SCOPE_MISMATCH", "receipt LawOS and Entra tenant IDs do not exactly match the expected pilot namespaces", { key_id: keyId, expectedLawosTenantId, expectedEntraTenantId, actualLawosTenantId: receipt.lawos_tenant_id, actualEntraTenantId: receipt.entra_tenant_id });
  const exactFields = [
    ["source_sha", expectedSourceSha],
    ["source_tree", expectedSourceTree],
    ["version", expectedVersion],
    ["role", expectedRole],
    ["operation", expectedOperation],
    ["artifact_sha256", expectedArtifactSha256],
    ["binding_sha256", expectedBindingSha256],
  ];
  for (const [field, expectedValue] of exactFields) {
    if (expectedValue == null || (Array.isArray(expectedValue) && expectedValue.length === 0)) continue;
    const allowedValues = Array.isArray(expectedValue) ? expectedValue : [expectedValue];
    if (!allowedValues.includes(receipt[field])) fail("TRUST_RECEIPT_SCOPE_MISMATCH", `receipt ${field} does not match the expected authority scope`, { key_id: keyId, field, expected: allowedValues, actual: receipt[field] });
  }
  if (!key.allowed_receipt_sources.includes(receipt.receipt_source)
      || !key.allowed_receipt_types.includes(receipt.receipt_type)
      || !key.allowed_pilot_ids.includes(receipt.pilot_id)
      || !key.allowed_lawos_tenant_ids.includes(expectedLawosTenantId)
      || !key.allowed_entra_tenant_ids.includes(expectedEntraTenantId)
      || !key.allowed_source_shas.includes(receipt.source_sha)
      || !key.allowed_source_trees.includes(receipt.source_tree)
      || !key.allowed_versions.includes(receipt.version)
      || !key.allowed_roles.includes(receipt.role)
      || !key.allowed_operations.includes(receipt.operation)
      || !key.allowed_artifact_sha256s.includes(receipt.artifact_sha256)
      || !key.allowed_binding_sha256s.includes(receipt.binding_sha256)) fail("TRUSTED_KEY_SCOPE_MISMATCH", "trusted key scope does not authorize this receipt source, type, pilot, tenant, source, version, role, operation, artifact, and binding namespace combination", { key_id: keyId });
  const signature = decodeDetachedSignature(signatureBytes);
  if (!verifySignature(null, receiptBytes, key.public_key_spki_pem, signature)) fail("TRUST_SIGNATURE_INVALID", "detached Ed25519 signature does not verify against the exact receipt bytes", { key_id: keyId });
  return Object.freeze({ valid: true, key_id: keyId, receipt_sha256: actualReceiptSha256, signature_sha256: actualSignatureSha256, issued_at: receipt.issued_at, expires_at: receipt.expires_at, receipt_path: receiptTarget, signature_path: signatureTarget });
}
