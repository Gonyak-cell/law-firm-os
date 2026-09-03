import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import {
  EXTERNAL_PILOT_UPDATE_CHANNEL,
  EXTERNAL_PILOT_UPDATE_SCHEMA,
  INTERNAL_UNSIGNED_UPDATE_CHANNEL,
  INTERNAL_UNSIGNED_UPDATE_SCHEMA,
  INTERNAL_UPDATE_KEY_ID,
  createUpdateController,
  signUpdateMetadata,
} from "../src/main/updates.js";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const trustedPublicKeys = { [INTERNAL_UPDATE_KEY_ID]: publicKey };

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function internalMetadata(version, artifactBytes) {
  return {
    version,
    channel: "internal",
    keyId: INTERNAL_UPDATE_KEY_ID,
    artifactSha256: digest(artifactBytes),
    artifactBytes: artifactBytes.length,
  };
}

function internalUnsignedMetadata(version, artifactBytes, overrides = {}) {
  return {
    schemaVersion: INTERNAL_UNSIGNED_UPDATE_SCHEMA,
    releaseId: "amic-os-internal-0.1.32",
    version,
    channel: INTERNAL_UNSIGNED_UPDATE_CHANNEL,
    lawosTenantId: "amic-internal",
    installationId: "JWS-GALAXYBOOK-amic-os",
    appId: "com.amic.matter.desktop.internal",
    keyId: INTERNAL_UPDATE_KEY_ID,
    sourceSha: "a".repeat(40),
    sourceTree: "b".repeat(40),
    artifactFilename: `AMIC-OS-internal-${version}-win-x64.exe`,
    artifactSha256: digest(artifactBytes),
    artifactBytes: artifactBytes.length,
    releaseManifestSha256: "c".repeat(64),
    authenticodeStatus: "not_signed",
    distribution: "private",
    managedDeviceOnly: true,
    publicReleaseAllowed: false,
    generatedAt: "2026-09-03T10:00:00.000Z",
    expiresAt: "2026-09-10T10:00:00.000Z",
    ...overrides,
  };
}

test("signed update applies only after Ed25519 verification", async () => {
  const controller = createUpdateController({
    currentVersion: "0.1.0",
    trustedPublicKeys,
  });
  const artifactBytes = Buffer.from("signed-internal-update");
  const metadata = internalMetadata("0.1.1", artifactBytes);
  const signature = signUpdateMetadata(metadata, privateKey);

  assert.deepEqual(await controller.applyUpdate({ metadata, signature: "bad-signature" }), {
    state: "denied",
    reason: "signature_check_failed",
  });
  assert.equal(controller.activeVersion(), "0.1.0");

  assert.deepEqual(await controller.applyUpdate({ metadata, signature }), {
    state: "blocked",
    reason: "download_verification_required",
  });
  assert.equal(controller.activeVersion(), "0.1.0");

  const applied = await controller.applyUpdate({ metadata, signature, artifactBytes });
  assert.equal(applied.state, "updated");
  assert.equal(applied.version, "0.1.1");
  assert.equal(applied.previousVersion, "0.1.0");
});

test("signed rollback returns to last verified internal version", async () => {
  const controller = createUpdateController({
    currentVersion: "0.1.0",
    trustedPublicKeys,
  });
  const updateBytes = Buffer.from("new-version");
  const rollbackBytes = Buffer.from("old-version");
  const updateMetadata = internalMetadata("0.1.1", updateBytes);
  const rollbackMetadata = internalMetadata("0.1.0", rollbackBytes);

  await controller.applyUpdate({
    metadata: updateMetadata,
    signature: signUpdateMetadata(updateMetadata, privateKey),
    artifactBytes: updateBytes,
  });
  const rolledBack = await controller.rollback({
    metadata: rollbackMetadata,
    signature: signUpdateMetadata(rollbackMetadata, privateKey),
    artifactBytes: rollbackBytes,
  });

  assert.equal(rolledBack.state, "rolled_back");
  assert.equal(rolledBack.version, "0.1.0");
  assert.equal(controller.activeVersion(), "0.1.0");
});

test("public and untrusted update channels fail closed", async () => {
  const controller = createUpdateController({ currentVersion: "0.1.0" });
  const publicMetadata = {
    version: "1.0.0",
    channel: "public",
    keyId: INTERNAL_UPDATE_KEY_ID,
    artifactSha256: "c".repeat(64),
    artifactBytes: 1,
  };
  const internal = internalMetadata("0.1.1", Buffer.from("untrusted"));

  assert.deepEqual(await controller.applyUpdate({ metadata: publicMetadata, signature: "ignored" }), {
    state: "denied",
    reason: "public_channel_disabled",
  });
  assert.deepEqual(await controller.applyUpdate({
    metadata: internal,
    signature: signUpdateMetadata(internal, privateKey),
  }), {
    state: "denied",
    reason: "signature_check_failed",
  });
});

test("internal-unsigned updates require exact tenant, installation, app, source, and private distribution bindings", async () => {
  const artifactBytes = Buffer.from("managed-internal-unsigned-update");
  const metadata = internalUnsignedMetadata("0.1.32", artifactBytes);
  const controller = createUpdateController({
    currentVersion: "0.1.31",
    channel: INTERNAL_UNSIGNED_UPDATE_CHANNEL,
    lawosTenantId: metadata.lawosTenantId,
    installationId: metadata.installationId,
    appId: metadata.appId,
    trustedPublicKeys,
    now: () => Date.parse("2026-09-03T11:00:00.000Z"),
  });

  const applied = await controller.applyUpdate({
    metadata,
    signature: signUpdateMetadata(metadata, privateKey),
    artifactBytes,
  });

  assert.equal(applied.state, "updated");
  assert.equal(applied.version, "0.1.32");
});

test("internal-unsigned updates reject unmanaged, expired, revoked, public, or schema-drifted metadata", async () => {
  const artifactBytes = Buffer.from("managed-internal-unsigned-update");
  const metadata = internalUnsignedMetadata("0.1.32", artifactBytes);
  const controller = createUpdateController({
    currentVersion: "0.1.31",
    channel: INTERNAL_UNSIGNED_UPDATE_CHANNEL,
    lawosTenantId: metadata.lawosTenantId,
    installationId: metadata.installationId,
    appId: metadata.appId,
    revokedReleaseIds: ["amic-os-internal-revoked"],
    trustedPublicKeys,
    now: () => Date.parse("2026-09-03T11:00:00.000Z"),
  });
  const apply = async (candidate) => controller.applyUpdate({
    metadata: candidate,
    signature: signUpdateMetadata(candidate, privateKey),
    artifactBytes,
  });

  assert.deepEqual(await apply({ ...metadata, installationId: "unmanaged-device" }), {
    state: "denied",
    reason: "managed_installation_mismatch",
  });
  const expired = {
    ...metadata,
    generatedAt: "2026-08-01T10:00:00.000Z",
    expiresAt: "2026-08-08T10:00:00.000Z",
  };
  assert.deepEqual(await apply(expired), {
    state: "denied",
    reason: "metadata_expired_or_not_active",
  });
  const revoked = { ...metadata, releaseId: "amic-os-internal-revoked" };
  assert.deepEqual(await apply(revoked), {
    state: "denied",
    reason: "release_revoked",
  });
  const publicDistribution = { ...metadata, distribution: "public" };
  assert.throws(
    () => signUpdateMetadata(publicDistribution, privateKey),
    /update metadata is invalid/,
  );
  const extraField = { ...metadata, apiKey: "must-never-be-here" };
  assert.throws(
    () => signUpdateMetadata(extraField, privateKey),
    /update metadata is invalid/,
  );
});

test("external pilot update is pinned to app, tenant namespaces, approval, and active metadata", async () => {
  const artifactBytes = Buffer.from("external-pilot-update-bytes");
  const tenantConfigSha256 = "e".repeat(64);
  const now = Date.parse("2026-08-12T02:00:00.000Z");
  const controller = createUpdateController({
    currentVersion: "0.1.0",
    channel: EXTERNAL_PILOT_UPDATE_CHANNEL,
    pilotId: "firm-a-pilot",
    lawosTenantId: "lawos-firm-a",
    entraTenantId: "11111111-1111-4111-8111-111111111111",
    appId: "com.amic.matter.desktop",
    tenantConfigSha256,
    approvalId: "approval-firm-a-001",
    trustedPublicKeys,
    now: () => now,
  });
  const metadata = {
    schemaVersion: EXTERNAL_PILOT_UPDATE_SCHEMA,
    version: "0.1.1",
    channel: EXTERNAL_PILOT_UPDATE_CHANNEL,
    pilotId: "firm-a-pilot",
    lawosTenantId: "lawos-firm-a",
    entraTenantId: "11111111-1111-4111-8111-111111111111",
    appId: "com.amic.matter.desktop",
    tenantConfigSha256,
    keyId: INTERNAL_UPDATE_KEY_ID,
    sourceSha: "a".repeat(40),
    sourceTree: "b".repeat(40),
    artifactFilename: "macos/matter.zip",
    artifactSha256: digest(artifactBytes),
    artifactBytes: artifactBytes.length,
    releaseManifestSha256: "f".repeat(64),
    generatedAt: "2026-08-12T02:00:00.000Z",
    expiresAt: "2026-08-20T00:00:00.000Z",
    approvalId: "approval-firm-a-001",
    approvalExpiresAt: "2026-09-01T00:00:00.000Z",
  };
  const mismatched = { ...metadata, tenantConfigSha256: "0".repeat(64) };
  const wrongApp = { ...metadata, appId: "com.example.other.desktop" };

  assert.deepEqual(await controller.applyUpdate({
    metadata: wrongApp,
    signature: signUpdateMetadata(wrongApp, privateKey),
    artifactBytes,
  }), {
    state: "denied",
    reason: "app_identity_mismatch",
  });

  assert.deepEqual(await controller.applyUpdate({
    metadata: mismatched,
    signature: signUpdateMetadata(mismatched, privateKey),
    artifactBytes,
  }), {
    state: "denied",
    reason: "tenant_configuration_mismatch",
  });
  assert.equal((await controller.applyUpdate({
    metadata,
    signature: signUpdateMetadata(metadata, privateKey),
    artifactBytes,
  })).state, "updated");
});

test("external pilot update rejects expired metadata and mismatched downloaded bytes", async () => {
  const expectedBytes = Buffer.from("approved-external-pilot-update");
  const base = {
    schemaVersion: EXTERNAL_PILOT_UPDATE_SCHEMA,
    version: "0.1.1",
    channel: EXTERNAL_PILOT_UPDATE_CHANNEL,
    pilotId: "firm-a-pilot",
    lawosTenantId: "lawos-firm-a",
    entraTenantId: "11111111-1111-4111-8111-111111111111",
    appId: "com.amic.matter.desktop",
    tenantConfigSha256: "e".repeat(64),
    keyId: INTERNAL_UPDATE_KEY_ID,
    sourceSha: "a".repeat(40),
    sourceTree: "b".repeat(40),
    artifactFilename: "macos/matter.zip",
    artifactSha256: digest(expectedBytes),
    artifactBytes: expectedBytes.length,
    releaseManifestSha256: "f".repeat(64),
    generatedAt: "2026-08-12T01:00:00.000Z",
    expiresAt: "2026-08-12T03:00:00.000Z",
    approvalId: "approval-firm-a-001",
    approvalExpiresAt: "2026-09-01T00:00:00.000Z",
  };
  const controller = createUpdateController({
    currentVersion: "0.1.0",
    channel: EXTERNAL_PILOT_UPDATE_CHANNEL,
    pilotId: base.pilotId,
    lawosTenantId: base.lawosTenantId,
    entraTenantId: base.entraTenantId,
    appId: base.appId,
    tenantConfigSha256: base.tenantConfigSha256,
    approvalId: base.approvalId,
    trustedPublicKeys,
    now: () => Date.parse("2026-08-12T02:00:00.000Z"),
  });

  assert.deepEqual(await controller.applyUpdate({
    metadata: base,
    signature: signUpdateMetadata(base, privateKey),
  }), { state: "blocked", reason: "download_verification_required" });
  assert.deepEqual(await controller.applyUpdate({
    metadata: base,
    signature: signUpdateMetadata(base, privateKey),
    artifactBytes: Buffer.from("wrong"),
  }), { state: "blocked", reason: "artifact_size_mismatch" });
  const sameSizeWrongBytes = Buffer.alloc(expectedBytes.length, 0x78);
  assert.deepEqual(await controller.applyUpdate({
    metadata: base,
    signature: signUpdateMetadata(base, privateKey),
    artifactBytes: sameSizeWrongBytes,
  }), { state: "blocked", reason: "artifact_sha256_mismatch" });

  const expired = {
    ...base,
    generatedAt: "2026-08-10T01:00:00.000Z",
    expiresAt: "2026-08-11T03:00:00.000Z",
  };
  assert.deepEqual(await controller.applyUpdate({
    metadata: expired,
    signature: signUpdateMetadata(expired, privateKey),
    artifactBytes: expectedBytes,
  }), { state: "denied", reason: "metadata_expired_or_not_active" });
  assert.equal(controller.activeVersion(), "0.1.0");
});
