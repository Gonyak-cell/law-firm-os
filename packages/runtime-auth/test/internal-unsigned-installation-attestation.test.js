import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { canonicalizeJson } from "../src/runtime-safety-approval-contract.js";
import {
  INTERNAL_UNSIGNED_INSTALLATION_ATTESTATION_SCHEMA,
  createInternalUnsignedInstallationAttestationSigner,
  verifyInternalUnsignedInstallationAttestation,
} from "../src/internal-unsigned-installation-attestation.js";

const NOW = Date.parse("2026-09-05T08:00:00.000Z");
const keys = generateKeyPairSync("ed25519");
const publicKeySha = createHash("sha256").update(keys.publicKey.export({
  type: "spki", format: "der",
})).digest("hex");
const keyId = "internal-installation-test-key";
const createEnvelope = createInternalUnsignedInstallationAttestationSigner({
  privateKey: keys.privateKey, keyId, expectedPublicKeySha256: publicKeySha,
});

function document() {
  return {
    schema_version: INTERNAL_UNSIGNED_INSTALLATION_ATTESTATION_SCHEMA,
    adoption_id: "adoption-test-001", request_sha256: "a".repeat(64),
    generated_at: new Date(NOW).toISOString(),
    expires_at: new Date(NOW + 300_000).toISOString(),
    installation: {
      installation_id: "odi_synthetic_installation_000001", tenant_id: "tenant-test",
      app_id: "com.amic.matter.desktop.internal", platform: "win32", architecture: "x64",
      release_id: "release-test-001", release_sequence: 1, version: "0.1.32",
      source_sha: "1".repeat(40), source_tree: "2".repeat(40),
      installer_sha256: "3".repeat(64), installer_bytes: 1234, installer_version_id: "version-test-1",
      bootstrap_marker_sha256: "4".repeat(64), installed_receipt_sha256: "5".repeat(64),
      state_version: 1, lease_expires_at: new Date(NOW + 600_000).toISOString(),
      installation_release_binding_sha256: "6".repeat(64), release_authority_sha256: "7".repeat(64),
      status: "active", retired_at: null, release_trusted: true,
      authority_snapshot_at: new Date(NOW).toISOString(),
    },
  };
}

function verifyEnvelope(envelope, changes = {}) {
  return verifyInternalUnsignedInstallationAttestation({
    envelope, publicKey: keys.publicKey, expectedPublicKeySha256: publicKeySha,
    expectedKeyId: keyId, adoptionId: "adoption-test-001", requestSha256: "a".repeat(64),
    installationId: "odi_synthetic_installation_000001", now: NOW, ...changes,
  });
}

function signedUnchecked(value, transform = (bytes) => bytes) {
  const raw = transform(Buffer.from(`${canonicalizeJson(value)}\n`));
  return {
    document_base64: raw.toString("base64"),
    signature_base64: sign(null, raw, keys.privateKey).toString("base64"), key_id: keyId,
  };
}

test("pinned signed current installation binds exact request and returns an immutable document", () => {
  const source = document();
  const verified = verifyEnvelope(createEnvelope(source, { now: NOW }));
  assert.deepEqual(verified, source);
  assert.ok(Object.isFrozen(verified));
  assert.ok(Object.isFrozen(verified.installation));
});

test("attestation rejects replay to another request, adoption, installation, issuer, or key", () => {
  const envelope = createEnvelope(document(), { now: NOW });
  for (const changes of [
    { adoptionId: "adoption-other" }, { requestSha256: "b".repeat(64) },
    { installationId: "odi_synthetic_installation_000002" },
    { expectedKeyId: "unapproved-key" }, { expectedPublicKeySha256: "0".repeat(64) },
    { publicKey: generateKeyPairSync("ed25519").publicKey },
  ]) assert.throws(() => verifyEnvelope(envelope, changes), /attestation is invalid/u);
  assert.throws(() => createInternalUnsignedInstallationAttestationSigner({
    privateKey: keys.privateKey, keyId, expectedPublicKeySha256: "0".repeat(64),
  }), /attestation is invalid/u);
});

test("signed stale, future, overlong and lease-outliving snapshots are refused", () => {
  const envelope = createEnvelope(document(), { now: NOW });
  assert.throws(() => verifyEnvelope(envelope, { now: NOW + 300_000 }), /attestation is invalid/u);
  assert.throws(() => verifyEnvelope(envelope, { now: NOW - 1 }), /attestation is invalid/u);
  for (const mutate of [
    (value) => { value.expires_at = new Date(NOW + 300_001).toISOString(); },
    (value) => { value.installation.lease_expires_at = new Date(NOW + 299_999).toISOString(); },
    (value) => { value.installation.authority_snapshot_at = new Date(NOW - 1).toISOString(); },
    (value) => { value.generated_at = "2026-09-05T08:00:00Z"; },
  ]) {
    const value = document(); mutate(value);
    assert.throws(() => verifyEnvelope(signedUnchecked(value)), /attestation is invalid/u);
  }
});

test("signature never legitimizes invalid or expanded installation authority fields", () => {
  for (const patch of [
    { release_trusted: false }, { release_trusted: "true" }, { status: "expired" },
    { retired_at: new Date(NOW).toISOString() }, { state_version: 0 }, { state_version: "1" },
    { tenant_id: 1234 }, { architecture: "arm64" }, { platform: "darwin" },
    { app_id: "com.amic.matter.desktop" }, { source_sha: "0".repeat(39) },
    { installer_bytes: Number.MAX_SAFE_INTEGER }, { installer_version_id: "" },
    { installer_version_id: "null" },
    { caller_trusted: true },
  ]) {
    const value = document(); Object.assign(value.installation, patch);
    assert.throws(() => verifyEnvelope(signedUnchecked(value)), /attestation is invalid/u);
  }
  const expanded = document(); expanded.owner_approved = true;
  assert.throws(() => verifyEnvelope(signedUnchecked(expanded)), /attestation is invalid/u);
});

test("canonical bytes and closed envelope are required even with a valid signature", () => {
  const value = document();
  const envelope = createEnvelope(value, { now: NOW });
  assert.throws(() => verifyEnvelope({ ...envelope, trusted: true }), /attestation is invalid/u);
  assert.throws(() => verifyEnvelope({ ...envelope, document_base64: `${envelope.document_base64}\n` }), /attestation is invalid/u);
  assert.throws(() => verifyEnvelope(signedUnchecked(value, (raw) => raw.subarray(0, -1))), /attestation is invalid/u);
  assert.throws(() => verifyEnvelope(signedUnchecked(value, () => Buffer.from(JSON.stringify(value)))), /attestation is invalid/u);
  assert.throws(() => verifyEnvelope({ ...envelope, signature_base64: Buffer.alloc(64).toString("base64") }), /attestation is invalid/u);
});

test("signing rejects accessors and proxies without evaluating their data", () => {
  let reads = 0;
  const value = document();
  Object.defineProperty(value.installation, "tenant_id", { enumerable: true, get() { reads += 1; return "tenant-test"; } });
  assert.throws(() => createEnvelope(value, { now: NOW }), /attestation is invalid/u);
  assert.equal(reads, 0);
  assert.throws(() => createEnvelope(new Proxy(document(), {}), { now: NOW }), /attestation is invalid/u);
});
