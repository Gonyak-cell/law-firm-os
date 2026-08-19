import { verify as verifySignature } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertStrictUtcTimestamp,
  assertValidationClock,
  deepFreeze,
  fail,
  hasExactKeys,
  isRecord,
  parseEd25519PublicSpki,
  readTrustedFileSnapshot,
  resolveTrustedRoot,
  SHA256_PATTERN,
  sha256Hex,
  text,
} from "./external-release-trust-common.js";

export const TRUST_REGISTRY_SCHEMA_VERSION = "law-firm-os.external-release-trust-registry.v1";
export const TRUST_ROOT_POLICY_SCHEMA_VERSION = "law-firm-os.external-release-trust-root-policy.v1";
const PRODUCTION_TRUST_INSTALLATION_ROOT = fileURLToPath(new URL("../../../config/external-release/", import.meta.url));
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
const MODULE_VERIFIED_REGISTRIES = new WeakSet();
const ROOT_VERIFIED_REGISTRIES = new WeakSet();
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
  const verifiedRegistry = Object.freeze({ registry: deepFreeze(registry), target, bytes, sha256: registrySha256 });
  MODULE_VERIFIED_REGISTRIES.add(verifiedRegistry);
  return verifiedRegistry;
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
  const productionTrust = Object.freeze({
    ...registryTrust,
    registryTrust,
    anchorPath: rootPublicKeyTarget,
    anchorSha256: rootPublicKeySpkiSha256,
    registrySignaturePath: registrySignatureTarget,
    registrySignatureSha256,
    registrySerial: policy.registry_serial,
    policySchemaVersion: policy.schema_version,
  });
  MODULE_VERIFIED_REGISTRIES.add(productionTrust);
  ROOT_VERIFIED_REGISTRIES.add(registryTrust);
  ROOT_VERIFIED_REGISTRIES.add(productionTrust);
  return productionTrust;
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

export function isModuleVerifiedRegistry(value) {
  return MODULE_VERIFIED_REGISTRIES.has(value);
}

export function isRootVerifiedRegistry(value) {
  return ROOT_VERIFIED_REGISTRIES.has(value);
}
