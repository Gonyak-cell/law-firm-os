import { verify as verifySignature } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import {
  assertStrictUtcTimestamp,
  assertValidationClock,
  decodeDetachedSignature,
  deepFreeze,
  ENTRA_TENANT_ID_PATTERN,
  fail,
  isRecord,
  LAWOS_TENANT_ID_PATTERN,
  readTrustedFileSnapshot,
  SHA256_PATTERN,
  sha256Hex,
  text,
} from "./external-release-trust-common.js";
import {
  isModuleVerifiedRegistry,
  isRootVerifiedRegistry,
} from "./external-release-trust-registry.js";

const DETACHED_RECEIPT_BYTES_KEYS = new Set([
  "expectedArtifactSha256",
  "expectedBindingSha256",
  "expectedEntraTenantId",
  "expectedLawosTenantId",
  "expectedOperation",
  "expectedPilotId",
  "expectedReceiptSource",
  "expectedReceiptType",
  "expectedRole",
  "expectedSourceSha",
  "expectedSourceTree",
  "expectedVersion",
  "now",
  "receiptBytes",
  "registry",
  "signatureBytes",
]);

function verifyDetachedReceiptBytesCore(options, rootVerifiedRequired) {
  if (!isRecord(options) || Object.keys(options).some((key) => !DETACHED_RECEIPT_BYTES_KEYS.has(key))) {
    fail("TRUST_RECEIPT_INPUT_INVALID", "in-memory receipt verification accepts only verified registry, receipt/signature bytes, and expected server scope");
  }
  const {
    registry,
    receiptBytes: suppliedReceiptBytes,
    signatureBytes: suppliedSignatureBytes,
    expectedReceiptType,
    expectedReceiptSource,
    expectedPilotId,
    expectedLawosTenantId,
    expectedEntraTenantId,
    expectedSourceSha,
    expectedSourceTree,
    expectedVersion,
    expectedRole,
    expectedOperation,
    expectedArtifactSha256,
    expectedBindingSha256,
    now = Date.now(),
  } = options;
  assertValidationClock(now);
  const registryIsVerified = rootVerifiedRequired
    ? isRootVerifiedRegistry(registry)
    : isModuleVerifiedRegistry(registry);
  if (!registryIsVerified || !registry?.registry?.keys) fail("TRUST_RECEIPT_INPUT_INVALID", rootVerifiedRequired ? "a root-signed registry object issued by verifyProductionTrustedRegistry is required" : "a registry object verified by this module is required");
  if (!Buffer.isBuffer(suppliedReceiptBytes) || !Buffer.isBuffer(suppliedSignatureBytes)) fail("TRUST_RECEIPT_INPUT_INVALID", "receiptBytes and signatureBytes must be Buffer snapshots");
  if (!LAWOS_TENANT_ID_PATTERN.test(text(expectedLawosTenantId)) || !ENTRA_TENANT_ID_PATTERN.test(text(expectedEntraTenantId)) || text(expectedLawosTenantId) === text(expectedEntraTenantId)) fail("TRUST_TENANT_SCOPE_REQUIRED", "expected LawOS and Entra tenant IDs must be valid, distinct namespace values for receipt trust validation");
  const receiptBytes = Buffer.from(suppliedReceiptBytes);
  const signatureBytes = Buffer.from(suppliedSignatureBytes);
  const actualReceiptSha256 = sha256Hex(receiptBytes);
  let receipt;
  try {
    receipt = JSON.parse(receiptBytes.toString("utf8"));
  } catch (error) {
    fail("TRUST_RECEIPT_JSON_INVALID", "signed receipt bytes are not valid JSON", { error: error.message });
  }
  if (!isRecord(receipt)) fail("TRUST_RECEIPT_JSON_INVALID", "signed receipt bytes must contain a JSON object");
  const actualSignatureSha256 = sha256Hex(signatureBytes);
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
  return Object.freeze({ valid: true, key_id: keyId, receipt: deepFreeze(receipt), receipt_bytes: receiptBytes, receipt_sha256: actualReceiptSha256, signature_sha256: actualSignatureSha256, issued_at: receipt.issued_at, expires_at: receipt.expires_at });
}

export function verifyDetachedReceiptBytes(options = {}) {
  return verifyDetachedReceiptBytesCore(options, true);
}

export function verifyDetachedReceipt({ rootDir, receiptRef, receiptBytes: suppliedReceiptBytes, receipt: suppliedReceipt, registry, expectedReceiptType, expectedReceiptSource, expectedPilotId, expectedLawosTenantId, expectedEntraTenantId, expectedSourceSha, expectedSourceTree, expectedVersion, expectedRole, expectedOperation, expectedArtifactSha256, expectedBindingSha256, now = Date.now() } = {}) {
  assertValidationClock(now);
  if (!isModuleVerifiedRegistry(registry) || !registry?.registry?.keys) fail("TRUST_RECEIPT_INPUT_INVALID", "a registry object verified by this module is required");
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
  const byteOptions = {
    registry,
    receiptBytes,
    signatureBytes,
    expectedReceiptType,
    expectedReceiptSource,
    expectedPilotId,
    expectedLawosTenantId,
    expectedEntraTenantId,
    expectedSourceSha,
    expectedSourceTree,
    expectedVersion,
    expectedRole,
    expectedOperation,
    expectedArtifactSha256,
    expectedBindingSha256,
    now,
  };
  const verification = isRootVerifiedRegistry(registry)
    ? verifyDetachedReceiptBytes(byteOptions)
    : verifyDetachedReceiptBytesCore(byteOptions, false);
  return Object.freeze({ ...verification, receipt_path: receiptTarget, signature_path: signatureTarget });
}
