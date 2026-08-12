import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import {
  EXTERNAL_PILOT_UPDATE_CHANNEL,
  EXTERNAL_PILOT_UPDATE_SCHEMA,
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
