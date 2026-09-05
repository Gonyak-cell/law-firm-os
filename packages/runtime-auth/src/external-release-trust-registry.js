import { verify as verifySignature } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertStrictUtcTimestamp,
  assertValidationClock,
  deepFreeze,
  externalReleaseAuthorityBindingSha256,
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
export const SCHEMA_GOVERNANCE_INSTALLATION_SCHEMA_VERSION = "law-firm-os.schema-governance-installation.v1";
export const SCHEMA_GOVERNANCE_TRUST_ANCHOR = Object.freeze({
  installation_root: "/opt/lawos-schema-governance",
  root_public_key_spki_sha256: "bee700a24abf39d58644709dcc497bde7fbdcffb28ce0f8cbf995d7c81cfa0da",
  registry_serial: 2026090601,
});
const SCHEMA_GOVERNANCE_FILES = Object.freeze({
  "root-public-key.spki.pem": 4096,
  "trust-registry.json": 128 * 1024,
  "trust-registry.json.sig": 64,
});
const SCHEMA_GOVERNANCE_SCOPE = Object.freeze({
  allowed_receipt_sources: "law-firm-os",
  allowed_receipt_types: "lawos-json-postgres-production-cutover-owner-approval",
  allowed_pilot_ids: "amic-os-outlook",
  allowed_lawos_tenant_ids: "lawos-production",
  allowed_entra_tenant_ids: "2f10d109-c2ad-43a4-a813-4dea28119e52",
  allowed_versions: "law-firm-os.json-postgres-execution-packet.v2",
  allowed_roles: "owner",
  allowed_operations: "lawos-json-postgres-production-cutover",
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
  const rootPublicKeySnapshot = readTrustedFileSnapshot(installationRoot, policy.root_public_key_path, { maxBytes: 4096 });
  const registrySnapshot = readTrustedFileSnapshot(installationRoot, policy.registry_installation_path, { maxBytes: 128 * 1024 });
  const registrySignatureSnapshot = readTrustedFileSnapshot(installationRoot, policy.registry_signature_installation_path, { maxBytes: 4096 });
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

export function verifySchemaGovernanceTrustedRegistry(options = {}) {
  let anchor = SCHEMA_GOVERNANCE_TRUST_ANCHOR;
  let now = Date.now();
  if (!isRecord(options)) fail("TRUST_ROOT_OVERRIDE_FORBIDDEN", "schema governance accepts no caller-selected trust material");
  if (Object.keys(options).length > 0) {
    if (!hasExactKeys(options, ["testOnlyInstallation", "now"])
      || process.env.NODE_ENV !== "test"
      || !hasExactKeys(options.testOnlyInstallation, [...Object.keys(anchor), "test_only"])
      || options.testOnlyInstallation.test_only !== true) {
      fail("TRUST_ROOT_OVERRIDE_FORBIDDEN", "schema governance accepts no caller-selected trust material");
    }
    anchor = options.testOnlyInstallation;
    now = options.now;
  }
  let root;
  try {
    root = resolveTrustedRoot(anchor.installation_root);
  } catch {
    fail("SCHEMA_GOVERNANCE_NOT_INSTALLED", "the fixed schema governance installation is unavailable");
  }
  const manifestSnapshot = readTrustedFileSnapshot(root, "installation.json", { maxBytes: 4096 });
  let manifest;
  try {
    manifest = JSON.parse(manifestSnapshot.bytes.toString("utf8"));
  } catch {
    fail("SCHEMA_GOVERNANCE_INSTALLATION_INVALID", "schema governance installation is not valid JSON");
  }
  if (!hasExactKeys(manifest, ["schema_version", "registry_serial", "files"])
    || manifest.schema_version !== SCHEMA_GOVERNANCE_INSTALLATION_SCHEMA_VERSION
    || manifest.registry_serial !== anchor.registry_serial
    || !hasExactKeys(manifest.files, Object.keys(SCHEMA_GOVERNANCE_FILES))) {
    fail("SCHEMA_GOVERNANCE_INSTALLATION_INVALID", "schema governance file table or serial drifted");
  }
  const identities = new Set([manifestSnapshot.identity]);
  for (const [name, maxBytes] of Object.entries(SCHEMA_GOVERNANCE_FILES)) {
    const entry = manifest.files[name];
    if (!hasExactKeys(entry, ["sha256", "size_bytes"])
      || !SHA256_PATTERN.test(entry.sha256 ?? "")
      || !Number.isSafeInteger(entry.size_bytes) || entry.size_bytes < 1
      || entry.size_bytes > maxBytes) fail("SCHEMA_GOVERNANCE_INSTALLATION_INVALID", "schema governance file entry is invalid");
    const snapshot = readTrustedFileSnapshot(root, name, { maxBytes });
    if (identities.has(snapshot.identity)
      || snapshot.bytes.length !== entry.size_bytes
      || sha256Hex(snapshot.bytes) !== entry.sha256) fail("SCHEMA_GOVERNANCE_INSTALLATION_INVALID", "installed schema governance bytes drifted from the file table");
    identities.add(snapshot.identity);
  }
  // The layer is installed after the code artifact is finalized. Its file table
  // locates bytes; authority still comes from this source-pinned root and serial.
  const trust = verifyRootSignedRegistry({
    schema_version: TRUST_ROOT_POLICY_SCHEMA_VERSION,
    configured: true,
    installation_root: root,
    root_public_key_path: path.join(root, "root-public-key.spki.pem"),
    root_public_key_spki_sha256: anchor.root_public_key_spki_sha256,
    registry_installation_path: path.join(root, "trust-registry.json"),
    registry_sha256: manifest.files["trust-registry.json"].sha256,
    registry_signature_installation_path: path.join(root, "trust-registry.json.sig"),
    registry_signature_sha256: manifest.files["trust-registry.json.sig"].sha256,
    registry_serial: anchor.registry_serial,
    root_signed_registry_required: true,
  }, now);
  for (const key of trust.registry.keys) {
    if (Object.entries(SCHEMA_GOVERNANCE_SCOPE).some(([field, value]) =>
      key[field].length !== 1 || key[field][0] !== value)) fail("SCHEMA_GOVERNANCE_SCOPE_INVALID", "schema governance leaf exceeds the fixed schema operation scope");
    for (const field of ["allowed_source_shas", "allowed_source_trees", "allowed_artifact_sha256s", "allowed_binding_sha256s"]) {
      const pattern = field === "allowed_source_shas" || field === "allowed_source_trees" ? /^[0-9a-f]{40}$/u : SHA256_PATTERN;
      if (key[field].length !== 1 || !pattern.test(key[field][0])) fail("SCHEMA_GOVERNANCE_SCOPE_INVALID", "schema governance requires one exact source and artifact per leaf");
    }
    const binding = externalReleaseAuthorityBindingSha256({
      pilot_id: key.allowed_pilot_ids[0],
      lawos_tenant_id: key.allowed_lawos_tenant_ids[0],
      entra_tenant_id: key.allowed_entra_tenant_ids[0],
      source_sha: key.allowed_source_shas[0],
      source_tree: key.allowed_source_trees[0],
      version: key.allowed_versions[0],
    });
    if (key.allowed_binding_sha256s[0] !== binding) fail("SCHEMA_GOVERNANCE_SCOPE_INVALID", "schema governance authority binding drifted");
  }
  const installedTrust = Object.freeze({ ...trust, installationSha256: sha256Hex(manifestSnapshot.bytes) });
  MODULE_VERIFIED_REGISTRIES.add(installedTrust);
  ROOT_VERIFIED_REGISTRIES.add(installedTrust);
  return installedTrust;
}

export function isModuleVerifiedRegistry(value) {
  return MODULE_VERIFIED_REGISTRIES.has(value);
}

export function isRootVerifiedRegistry(value) {
  return ROOT_VERIFIED_REGISTRIES.has(value);
}
