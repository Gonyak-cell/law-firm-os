import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import { closeSync, constants, existsSync, fstatSync, lstatSync, openSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

export const TRUST_REGISTRY_SCHEMA_VERSION = "law-firm-os.external-release-trust-registry.v1";
export const TRUST_ROOT_POLICY_SCHEMA_VERSION = "law-firm-os.external-release-trust-root-policy.v1";
const PRODUCTION_TRUST_INSTALLATION_ROOT = fileURLToPath(new URL("../../config/external-release/", import.meta.url));
const PRODUCTION_ROOT_PUBLIC_KEY_PATH = path.join(PRODUCTION_TRUST_INSTALLATION_ROOT, "root-public-key.spki.pem");
const PRODUCTION_REGISTRY_PATH = path.join(PRODUCTION_TRUST_INSTALLATION_ROOT, "trust-registry.json");
const PRODUCTION_REGISTRY_SIGNATURE_PATH = path.join(PRODUCTION_TRUST_INSTALLATION_ROOT, "trust-registry.json.sig");
// Deliberately unconfigured in source. A production root is installed only by
// the external governance owner; no bundle/input may make a caller key trusted.
export const PRODUCTION_TRUST_ROOT_POLICY = Object.freeze({
  schema_version: TRUST_ROOT_POLICY_SCHEMA_VERSION,
  configured: false,
  installation_root: PRODUCTION_TRUST_INSTALLATION_ROOT,
  root_public_key_path: PRODUCTION_ROOT_PUBLIC_KEY_PATH,
  root_public_key_spki_sha256: null,
  registry_installation_path: PRODUCTION_REGISTRY_PATH,
  registry_sha256: null,
  registry_signature_installation_path: PRODUCTION_REGISTRY_SIGNATURE_PATH,
  registry_signature_sha256: null,
  registry_serial: null,
  root_signed_registry_required: true,
});
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const LAWOS_TENANT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const ENTRA_TENANT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const POLICY_KEYS = Object.freeze([
  "configured",
  "installation_root",
  "registry_installation_path",
  "registry_serial",
  "registry_sha256",
  "registry_signature_installation_path",
  "registry_signature_sha256",
  "root_public_key_path",
  "root_public_key_spki_sha256",
  "root_signed_registry_required",
  "schema_version",
]);

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

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, keys) {
  return isRecord(value) && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
}

function deepFreeze(value) {
  if (!isRecord(value) && !Array.isArray(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function assertValidationClock(now) {
  if (!Number.isFinite(now) || now < 0) fail("TRUST_VALIDATION_CLOCK_INVALID", "trust validation clock must be a finite non-negative epoch timestamp");
}

function parseEd25519PublicSpki(value, code, message, details = {}) {
  const pem = Buffer.isBuffer(value) ? value.toString("utf8") : value;
  const match = typeof pem === "string"
    ? /^-----BEGIN PUBLIC KEY-----\r?\n([A-Za-z0-9+/\r\n]+={0,2})\r?\n-----END PUBLIC KEY-----\r?\n?$/u.exec(pem)
    : null;
  const encoded = match?.[1].replace(/\r?\n/gu, "") ?? "";
  if (!match || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/u.test(encoded)) fail(code, message, details);
  const inputDer = Buffer.from(encoded, "base64");
  if (inputDer.length === 0 || inputDer.toString("base64") !== encoded) fail(code, message, details);
  let publicKey;
  try {
    publicKey = createPublicKey({ key: inputDer, format: "der", type: "spki" });
  } catch (error) {
    fail(code, message, { ...details, error: error.message });
  }
  const canonicalDer = publicKey.export({ type: "spki", format: "der" });
  if (publicKey.asymmetricKeyType !== "ed25519" || !canonicalDer.equals(inputDer)) fail(code, message, details);
  return { publicKey, canonicalDer };
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

function sameFileSnapshot(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs
    && left.birthtimeNs === right.birthtimeNs;
}

function fileSnapshotIdentity(metadata, target) {
  return metadata.dev === 0n && metadata.ino === 0n ? `path:${target}` : `inode:${metadata.dev}:${metadata.ino}`;
}

export function readTrustedFileSnapshot(rootDir, candidate) {
  const root = resolveTrustedRoot(rootDir);
  const target = resolveTrustedFile(root, candidate);
  const noFollow = constants.O_NOFOLLOW ?? 0;
  let descriptor;
  try {
    descriptor = openSync(target, constants.O_RDONLY | noFollow);
    const before = fstatSync(descriptor, { bigint: true });
    if (!before.isFile()) fail("TRUST_FILE_INVALID", "trusted file descriptor must identify a regular file", { candidate });
    if (before.nlink !== 1n) fail("TRUST_HARDLINK_FORBIDDEN", "trusted files must have exactly one filesystem link", { candidate, link_count: Number(before.nlink) });
    const openedPath = lstatSync(target, { bigint: true });
    if (!openedPath.isFile() || openedPath.isSymbolicLink() || !sameFileSnapshot(before, openedPath)) fail("TRUST_FILE_CHANGED", "trusted file changed identity before its bytes were read", { candidate });
    const openedTarget = realpathSync(target);
    const openedRelative = path.relative(root, openedTarget);
    if (openedRelative.startsWith("..") || path.isAbsolute(openedRelative)) fail("TRUST_PATH_ESCAPE", "opened trusted file descriptor escapes the declared root", { candidate });
    if (!sameFileSnapshot(before, statSync(openedTarget, { bigint: true }))) fail("TRUST_FILE_CHANGED", "trusted file changed identity before its bytes were read", { candidate });
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    const closedPath = lstatSync(target, { bigint: true });
    const closedTarget = realpathSync(target);
    const closedRelative = path.relative(root, closedTarget);
    if (!closedPath.isFile()
        || closedPath.isSymbolicLink()
        || !sameFileSnapshot(before, after)
        || !sameFileSnapshot(after, closedPath)
        || after.size !== BigInt(bytes.length)
        || closedRelative.startsWith("..")
        || path.isAbsolute(closedRelative)
        || !sameFileSnapshot(after, statSync(closedTarget, { bigint: true }))) fail("TRUST_FILE_CHANGED", "trusted file changed identity or bytes while being read", { candidate });
    return Object.freeze({ target, identity: fileSnapshotIdentity(before, target), bytes });
  } catch (error) {
    if (error instanceof ExternalReleaseTrustError) throw error;
    fail("TRUST_FILE_INVALID", "trusted file could not be opened as a stable regular non-symlink snapshot", { candidate, error: error.message });
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
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

function parseAndValidateTrustedRegistry({ bytes, target, registrySha256, now, expectedRegistrySerial = null, forbiddenPublicKeySpkiSha256 = null }) {
  assertValidationClock(now);
  let registry;
  try {
    registry = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    fail("TRUST_REGISTRY_JSON_INVALID", "trusted registry is not valid JSON", { error: error.message });
  }
  if (!isRecord(registry) || registry.schema_version !== TRUST_REGISTRY_SCHEMA_VERSION) fail("TRUST_REGISTRY_SCHEMA_VERSION", "trusted registry schema is invalid", { actual: registry?.schema_version });
  if (registry.registry_serial != null && (!Number.isSafeInteger(registry.registry_serial) || registry.registry_serial < 1)) fail("TRUST_REGISTRY_SERIAL_INVALID", "trusted registry serial must be a positive safe integer", { actual: registry.registry_serial });
  if (expectedRegistrySerial != null && registry.registry_serial !== expectedRegistrySerial) fail("TRUST_REGISTRY_ROLLBACK", "trusted registry serial does not match the versioned production policy pin", { expected: expectedRegistrySerial, actual: registry.registry_serial ?? null });
  assertStrictUtcTimestamp(registry.generated_at, "registry.generated_at");
  const generatedAt = Date.parse(registry.generated_at);
  if (generatedAt > now) fail("TRUST_REGISTRY_TIME_INVALID", "trusted registry generated_at cannot be in the future relative to the validation clock", { generated_at: registry.generated_at, now });
  if (!Array.isArray(registry.keys) || registry.keys.length === 0) fail("TRUST_REGISTRY_KEYS_MISSING", "trusted registry must contain at least one key");
  const seenKeyIds = new Set();
  const seenPublicKeys = new Set();
  for (const key of registry.keys) {
    const keyId = text(key?.key_id);
    if (!isRecord(key) || !/^[A-Za-z0-9._-]+$/u.test(keyId) || seenKeyIds.has(keyId)) fail("TRUST_REGISTRY_KEY_INVALID", "trusted registry key identifier is invalid or duplicated", { key_id: keyId || null });
    seenKeyIds.add(keyId);
    if (key.algorithm !== "Ed25519" || !text(key.public_key_spki_pem)) fail("TRUST_REGISTRY_KEY_INVALID", "trusted registry key must declare an Ed25519 SPKI public key", { key_id: keyId });
    const { canonicalDer } = parseEd25519PublicSpki(key.public_key_spki_pem, "TRUST_REGISTRY_KEY_INVALID", "trusted registry public key must be an Ed25519 PUBLIC KEY/SPKI PEM", { key_id: keyId });
    const publicKeySpkiSha256 = sha256Hex(canonicalDer);
    if (publicKeySpkiSha256 === forbiddenPublicKeySpkiSha256) fail("TRUST_REGISTRY_ROOT_KEY_REUSE", "the production root key cannot also be a receipt-signing leaf key", { key_id: keyId, public_key_spki_sha256: publicKeySpkiSha256 });
    if (seenPublicKeys.has(publicKeySpkiSha256)) fail("TRUST_REGISTRY_DUPLICATE_LEAF_KEY", "trusted registry leaf keys must not reuse the same Ed25519 SPKI", { key_id: keyId, public_key_spki_sha256: publicKeySpkiSha256 });
    seenPublicKeys.add(publicKeySpkiSha256);
    for (const field of ["allowed_receipt_sources", "allowed_receipt_types", "allowed_pilot_ids", "allowed_lawos_tenant_ids", "allowed_entra_tenant_ids", "allowed_source_shas", "allowed_source_trees", "allowed_versions", "allowed_roles", "allowed_operations", "allowed_artifact_sha256s", "allowed_binding_sha256s"]) nonEmptyScopeArray(key[field], field, keyId);
    assertStrictUtcTimestamp(key.valid_from, "key.valid_from");
    assertStrictUtcTimestamp(key.valid_until, "key.valid_until");
    const validFrom = Date.parse(key.valid_from);
    const validUntil = Date.parse(key.valid_until);
    if (validUntil <= validFrom) fail("TRUST_REGISTRY_TIME_INVALID", "trusted registry key validity interval is invalid", { key_id: keyId });
    if (key.revoked_at != null) assertStrictUtcTimestamp(key.revoked_at, "key.revoked_at");
    // Expired or not-yet-valid keys may remain for rotation; the selected key is checked below.
  }
  return Object.freeze({ registry: deepFreeze(registry), target, bytes, sha256: registrySha256 });
}

export function verifyTrustedRegistry({ rootDir, registryPath, registrySha256, now = Date.now() } = {}) {
  if (!registryPath || !SHA256_PATTERN.test(text(registrySha256))) fail("TRUST_REGISTRY_REQUIRED", "trusted registry path and exact SHA-256 are required");
  const { target, bytes } = readTrustedFileSnapshot(rootDir, registryPath);
  const actualSha256 = sha256Hex(bytes);
  if (actualSha256 !== text(registrySha256).toLowerCase()) fail("TRUST_REGISTRY_HASH_MISMATCH", "trusted registry bytes do not match the supplied exact SHA-256", { expected: registrySha256, actual: actualSha256 });
  return parseAndValidateTrustedRegistry({ bytes, target, registrySha256: actualSha256, now });
}

function verifyRootSignedRegistry(policy, now) {
  if (policy?.schema_version !== TRUST_ROOT_POLICY_SCHEMA_VERSION || policy.root_signed_registry_required !== true) fail("TRUST_ROOT_POLICY_INVALID", "production trust-root policy schema or signature requirement is invalid");
  if (policy.configured !== true
      || !SHA256_PATTERN.test(text(policy.root_public_key_spki_sha256))
      || !SHA256_PATTERN.test(text(policy.registry_sha256))
      || !SHA256_PATTERN.test(text(policy.registry_signature_sha256))
      || !Number.isSafeInteger(policy.registry_serial)
      || policy.registry_serial < 1) {
    fail("TRUST_ROOT_NOT_CONFIGURED", "the versioned production trust-root policy has no installed governance root");
  }
  assertValidationClock(now);
  const installationRoot = resolveTrustedRoot(policy.installation_root);
  const rootPublicKeySnapshot = readTrustedFileSnapshot(installationRoot, policy.root_public_key_path);
  const registrySnapshot = readTrustedFileSnapshot(installationRoot, policy.registry_installation_path);
  const registrySignatureSnapshot = readTrustedFileSnapshot(installationRoot, policy.registry_signature_installation_path);
  const rootPublicKeyTarget = rootPublicKeySnapshot.target;
  const registryTarget = registrySnapshot.target;
  const registrySignatureTarget = registrySignatureSnapshot.target;
  if (new Set([rootPublicKeySnapshot.identity, registrySnapshot.identity, registrySignatureSnapshot.identity]).size !== 3) fail("TRUST_ROOT_POLICY_INVALID", "root key, registry, and registry signature must be distinct regular files");

  const rootPublicKeyBytes = rootPublicKeySnapshot.bytes;
  const { publicKey: rootPublicKey, canonicalDer: rootPublicKeySpki } = parseEd25519PublicSpki(rootPublicKeyBytes, "TRUST_ROOT_KEY_INVALID", "production root public key must be an Ed25519 PUBLIC KEY/SPKI PEM");
  const rootPublicKeySpkiSha256 = sha256Hex(rootPublicKeySpki);
  if (rootPublicKeySpkiSha256 !== policy.root_public_key_spki_sha256) fail("TRUST_ROOT_KEY_DIGEST_MISMATCH", "production root public-key SPKI does not match the versioned policy pin", { expected: policy.root_public_key_spki_sha256, actual: rootPublicKeySpkiSha256 });

  const registryBytes = registrySnapshot.bytes;
  const registrySha256 = sha256Hex(registryBytes);
  if (registrySha256 !== policy.registry_sha256) fail("TRUST_REGISTRY_HASH_MISMATCH", "production registry bytes do not match the versioned policy pin", { expected: policy.registry_sha256, actual: registrySha256 });
  const registrySignatureBytes = registrySignatureSnapshot.bytes;
  const registrySignatureSha256 = sha256Hex(registrySignatureBytes);
  if (registrySignatureSha256 !== policy.registry_signature_sha256) fail("TRUST_REGISTRY_SIGNATURE_HASH_MISMATCH", "production registry signature bytes do not match the versioned policy pin", { expected: policy.registry_signature_sha256, actual: registrySignatureSha256 });
  if (registrySignatureBytes.length !== 64) fail("TRUST_REGISTRY_SIGNATURE_FORMAT", "production registry signature must be exactly 64 raw Ed25519 bytes");
  if (!verifySignature(null, registryBytes, rootPublicKey, registrySignatureBytes)) fail("TRUST_REGISTRY_SIGNATURE_INVALID", "production registry signature does not verify over the exact pinned registry bytes");

  const registryTrust = parseAndValidateTrustedRegistry({
    bytes: registryBytes,
    target: registryTarget,
    registrySha256,
    now,
    expectedRegistrySerial: policy.registry_serial,
    forbiddenPublicKeySpkiSha256: rootPublicKeySpkiSha256,
  });
  return Object.freeze({
    ...registryTrust,
    registryTrust,
    anchorPath: rootPublicKeyTarget,
    anchorSha256: rootPublicKeySpkiSha256,
    registrySignaturePath: registrySignatureTarget,
    registrySignatureSha256,
    registrySerial: policy.registry_serial,
    policySchemaVersion: policy.schema_version,
  });
}

export function verifyProductionTrustedRegistry(options = {}) {
  if (!isRecord(options)) fail("TRUST_ROOT_OVERRIDE_FORBIDDEN", "production trust-root verification accepts no caller-selected paths or digests");
  const optionKeys = Object.keys(options);
  if (optionKeys.length === 0) return verifyRootSignedRegistry(PRODUCTION_TRUST_ROOT_POLICY, Date.now());
  if (optionKeys.some((key) => key !== "testOnlyPolicy" && key !== "now") || !Object.prototype.hasOwnProperty.call(options, "testOnlyPolicy")) fail("TRUST_ROOT_OVERRIDE_FORBIDDEN", "production trust-root verification accepts no caller-selected paths or digests");
  const testOnlyPolicy = options.testOnlyPolicy;
  if (process.env.NODE_ENV !== "test"
      || !hasExactKeys(testOnlyPolicy, [...POLICY_KEYS, "test_only"])
      || testOnlyPolicy.test_only !== true) {
    fail("TEST_TRUST_ROOT_FORBIDDEN", "a synthetic production trust policy is allowed only through the explicit NODE_ENV=test API");
  }
  const policy = { ...testOnlyPolicy };
  delete policy.test_only;
  return verifyRootSignedRegistry(policy, options.now ?? Date.now());
}

export function verifyDetachedReceipt({ rootDir, receiptRef, receiptBytes: suppliedReceiptBytes, receipt: suppliedReceipt, registry, expectedReceiptType, expectedReceiptSource, expectedPilotId, expectedLawosTenantId, expectedEntraTenantId, expectedSourceSha, expectedSourceTree, expectedVersion, expectedRole, expectedOperation, expectedArtifactSha256, expectedBindingSha256, now = Date.now() } = {}) {
  assertValidationClock(now);
  if (!registry?.registry?.keys) fail("TRUST_RECEIPT_INPUT_INVALID", "a verified trusted registry is required");
  if (!LAWOS_TENANT_ID_PATTERN.test(text(expectedLawosTenantId)) || !ENTRA_TENANT_ID_PATTERN.test(text(expectedEntraTenantId)) || text(expectedLawosTenantId) === text(expectedEntraTenantId)) fail("TRUST_TENANT_SCOPE_REQUIRED", "expected LawOS and Entra tenant IDs must be valid, distinct namespace values for receipt trust validation");
  const signatureRef = receiptRef?.signature_ref;
  if (!signatureRef || typeof signatureRef !== "object" || !SHA256_PATTERN.test(text(signatureRef.sha256))) fail("TRUST_SIGNATURE_REQUIRED", "receipt detached signature path and exact SHA-256 are required");
  const receiptSnapshot = readTrustedFileSnapshot(rootDir, receiptRef.path);
  const { target: receiptTarget, bytes: receiptBytes } = receiptSnapshot;
  const actualReceiptSha256 = sha256Hex(receiptBytes);
  if (actualReceiptSha256 !== text(receiptRef.sha256).toLowerCase()) fail("TRUST_RECEIPT_HASH_MISMATCH", "receipt bytes do not match the declared SHA-256", { expected: receiptRef.sha256, actual: actualReceiptSha256 });
  let receipt;
  try {
    receipt = JSON.parse(receiptBytes.toString("utf8"));
  } catch (error) {
    fail("TRUST_RECEIPT_JSON_INVALID", "signed receipt bytes are not valid JSON", { error: error.message });
  }
  if (!isRecord(receipt)) fail("TRUST_RECEIPT_JSON_INVALID", "signed receipt bytes must contain a JSON object");
  if (suppliedReceiptBytes != null && (!Buffer.isBuffer(suppliedReceiptBytes) || !suppliedReceiptBytes.equals(receiptBytes))) fail("TRUST_RECEIPT_SNAPSHOT_MISMATCH", "caller-supplied receipt bytes do not match the internally read signed snapshot");
  if (suppliedReceipt != null && !isDeepStrictEqual(suppliedReceipt, receipt)) fail("TRUST_RECEIPT_SNAPSHOT_MISMATCH", "caller-supplied parsed receipt does not match the internally parsed signed snapshot");
  const signatureSnapshot = readTrustedFileSnapshot(rootDir, signatureRef.path);
  const { target: signatureTarget, bytes: signatureBytes } = signatureSnapshot;
  if (receiptSnapshot.identity === signatureSnapshot.identity) fail("TRUST_RECEIPT_FILE_REUSE", "receipt bytes and detached signature must be distinct regular files");
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
  const expectedReceiptTypes = Array.isArray(expectedReceiptType) ? expectedReceiptType : [expectedReceiptType];
  const expectedReceiptSources = Array.isArray(expectedReceiptSource) ? expectedReceiptSource : [expectedReceiptSource];
  if (!expectedReceiptTypes.includes(receipt.receipt_type) || !expectedReceiptSources.includes(receipt.receipt_source) || receipt.pilot_id !== expectedPilotId) fail("TRUST_RECEIPT_SCOPE_MISMATCH", "receipt source, type, or pilot scope does not match the gate", { key_id: keyId, expectedReceiptType: expectedReceiptTypes, expectedReceiptSource: expectedReceiptSources, expectedPilotId });
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
  return Object.freeze({ valid: true, key_id: keyId, receipt: deepFreeze(receipt), receipt_bytes: receiptBytes, receipt_sha256: actualReceiptSha256, signature_sha256: actualSignatureSha256, issued_at: receipt.issued_at, expires_at: receipt.expires_at, receipt_path: receiptTarget, signature_path: signatureTarget });
}
