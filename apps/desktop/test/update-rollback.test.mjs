import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign as signBytes } from "node:crypto";
import test from "node:test";
import {
  EXTERNAL_PILOT_UPDATE_CHANNEL,
  EXTERNAL_PILOT_UPDATE_SCHEMA,
  INTERNAL_UNSIGNED_REVOCATION_SCHEMA,
  INTERNAL_UNSIGNED_ROLLBACK_SCHEMA,
  INTERNAL_UNSIGNED_UPDATE_CHANNEL,
  INTERNAL_UNSIGNED_UPDATE_SCHEMA,
  INTERNAL_UPDATE_KEY_ID,
  canonicalizeUpdateMetadata,
  createUpdateController,
  signInternalUnsignedRevocationsBytes,
  signInternalUnsignedRollbackBytes,
  signUpdateMetadata,
  signUpdateMetadataBytes,
  verifyAndParseUpdateMetadataBytes,
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
  const metadata = {
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
    predecessorReleaseId: "amic-os-internal-0.1.31",
    predecessorVersion: "0.1.31",
    predecessorSourceSha: "1".repeat(40),
    predecessorSourceTree: "2".repeat(40),
    releaseSequence: 32,
    platform: "win32",
    architecture: "x64",
    artifactFilename: `AMIC-OS-internal-${version}-win-x64.exe`,
    artifactSha256: digest(artifactBytes),
    artifactBytes: artifactBytes.length,
    artifactVersionId: "s3-version-target-001",
    releaseManifestSha256: "c".repeat(64),
    authenticodeStatus: "not_signed",
    distribution: "private",
    managedDeviceOnly: true,
    publicReleaseAllowed: false,
    generatedAt: "2026-09-03T10:00:00.000Z",
    expiresAt: "2026-09-10T10:00:00.000Z",
    ...overrides,
  };
  metadata.artifactObjectKey = overrides.artifactObjectKey ?? [
    INTERNAL_UNSIGNED_UPDATE_CHANNEL,
    metadata.platform,
    metadata.architecture,
    metadata.version,
    metadata.sourceSha,
    metadata.artifactSha256,
    metadata.artifactFilename,
  ].join("/");
  return metadata;
}

const currentInternalArtifactBytes = Buffer.from("managed-internal-unsigned-current");
const currentInternalRelease = Object.freeze({
  currentReleaseId: "amic-os-internal-0.1.31",
  currentVersion: "0.1.31",
  currentSourceSha: "1".repeat(40),
  currentSourceTree: "2".repeat(40),
  currentReleaseSequence: 31,
  currentArtifactSha256: digest(currentInternalArtifactBytes),
  currentArtifactVersionId: "s3-version-current-001",
});

function internalUnsignedController(overrides = {}) {
  return createUpdateController({
    ...currentInternalRelease,
    channel: INTERNAL_UNSIGNED_UPDATE_CHANNEL,
    lawosTenantId: "amic-internal",
    installationId: "JWS-GALAXYBOOK-amic-os",
    appId: "com.amic.matter.desktop.internal",
    trustedKeyId: INTERNAL_UPDATE_KEY_ID,
    trustedPublicKeys,
    now: () => Date.parse("2026-09-03T11:00:00.000Z"),
    ...overrides,
  });
}

function internalUnsignedRevocations(overrides = {}) {
  return {
    schemaVersion: INTERNAL_UNSIGNED_REVOCATION_SCHEMA,
    revocationId: "amic-os-internal-revocations-0001",
    revision: 1,
    channel: INTERNAL_UNSIGNED_UPDATE_CHANNEL,
    lawosTenantId: "amic-internal",
    appId: "com.amic.matter.desktop.internal",
    keyId: INTERNAL_UPDATE_KEY_ID,
    revokedReleaseIds: [],
    revokedArtifactSha256s: [],
    generatedAt: "2026-09-03T10:00:00.000Z",
    expiresAt: "2026-09-10T10:00:00.000Z",
    ...overrides,
  };
}

function signedInternalUnsignedCandidate(metadata) {
  const signedMetadata = signUpdateMetadataBytes(metadata, privateKey);
  const signedRevocations = signInternalUnsignedRevocationsBytes(
    internalUnsignedRevocations(),
    privateKey,
  );
  return { signedMetadata, signedRevocations };
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

test("internal-unsigned updates verify exact raw bytes and every managed release binding", async () => {
  const artifactBytes = Buffer.from("managed-internal-unsigned-update");
  const metadata = internalUnsignedMetadata("0.1.32", artifactBytes);
  const controller = internalUnsignedController();
  const { signedMetadata, signedRevocations } = signedInternalUnsignedCandidate(metadata);

  assert.deepEqual(await controller.applyUpdate({
    metadata,
    signature: signUpdateMetadata(metadata, privateKey),
    artifactBytes,
  }), { state: "denied", reason: "exact_metadata_bytes_required" });

  const applied = await controller.applyUpdateBytes({
    metadataBytes: signedMetadata.metadataBytes,
    signatureBytes: signedMetadata.signatureBytes,
    revocationBytes: signedRevocations.revocationBytes,
    revocationSignatureBytes: signedRevocations.signatureBytes,
    artifactBytes,
  });

  assert.equal(applied.state, "updated");
  assert.equal(applied.version, "0.1.32");
  assert.equal(applied.previousVersion, "0.1.31");
  assert.equal(applied.metadataSha256, signedMetadata.metadataSha256);
  assert.equal(applied.artifactVersionId, metadata.artifactVersionId);
  assert.match(applied.receiptSha256, /^[0-9a-f]{64}$/u);
  assert.deepEqual(controller.activeState(), {
    releaseId: metadata.releaseId,
    version: metadata.version,
    sourceSha: metadata.sourceSha,
    sourceTree: metadata.sourceTree,
    releaseSequence: metadata.releaseSequence,
    artifactSha256: metadata.artifactSha256,
    artifactVersionId: metadata.artifactVersionId,
    metadataSha256: signedMetadata.metadataSha256,
    revocationRevision: 1,
    previousReleaseId: currentInternalRelease.currentReleaseId,
  });
});

test("internal-unsigned streaming handoff binds one prepared candidate to the exact staged receipt", () => {
  const artifactBytes = Buffer.from("managed-internal-unsigned-streamed-update");
  const metadata = internalUnsignedMetadata("0.1.32", artifactBytes);
  const controller = internalUnsignedController();
  const { signedMetadata, signedRevocations } = signedInternalUnsignedCandidate(metadata);
  const prepared = controller.prepareUpdateBytes({
    metadataBytes: signedMetadata.metadataBytes,
    signatureBytes: signedMetadata.signatureBytes,
    revocationBytes: signedRevocations.revocationBytes,
    revocationSignatureBytes: signedRevocations.signatureBytes,
  });
  assert.equal(prepared.state, "prepared");
  assert.equal(Object.isFrozen(prepared.candidate), true);
  assert.equal(controller.activeVersion(), "0.1.31");

  assert.deepEqual(controller.confirmStagedUpdate({
    candidate: { ...prepared.candidate },
    staged: {
      state: "staged",
      releaseId: metadata.releaseId,
      version: metadata.version,
      artifactSha256: metadata.artifactSha256,
      artifactBytes: metadata.artifactBytes,
      artifactVersionId: metadata.artifactVersionId,
      localPathIncluded: false,
      automaticReplacement: false,
    },
  }), { state: "denied", reason: "prepared_candidate_required" });

  assert.deepEqual(controller.confirmStagedUpdate({
    candidate: prepared.candidate,
    staged: {
      state: "staged",
      releaseId: metadata.releaseId,
      version: metadata.version,
      artifactSha256: "0".repeat(64),
      artifactBytes: metadata.artifactBytes,
      artifactVersionId: metadata.artifactVersionId,
      localPathIncluded: false,
      automaticReplacement: false,
    },
  }), { state: "denied", reason: "staged_candidate_mismatch" });

  const verified = controller.confirmStagedUpdate({
    candidate: prepared.candidate,
    staged: {
      state: "staged",
      releaseId: metadata.releaseId,
      version: metadata.version,
      artifactSha256: metadata.artifactSha256,
      artifactBytes: metadata.artifactBytes,
      artifactVersionId: metadata.artifactVersionId,
      localPathIncluded: false,
      automaticReplacement: false,
    },
  });
  assert.equal(verified.state, "staged_verified");
  assert.equal(verified.localPathIncluded, false);
  assert.equal(verified.signedUrlIncluded, false);
  assert.match(verified.receiptSha256, /^[0-9a-f]{64}$/u);
  assert.equal(controller.activeVersion(), "0.1.31");
});

test("internal-unsigned raw metadata rejects tamper, noncanonical bytes, wrong scope, expiry, and unsigned revocations", async () => {
  const artifactBytes = Buffer.from("managed-internal-unsigned-update");
  const metadata = internalUnsignedMetadata("0.1.32", artifactBytes);
  const controller = internalUnsignedController();
  const signedRevocations = signInternalUnsignedRevocationsBytes(
    internalUnsignedRevocations(),
    privateKey,
  );
  const apply = async (candidate, revocations = signedRevocations) => {
    const signed = signUpdateMetadataBytes(candidate, privateKey);
    return controller.applyUpdateBytes({
      metadataBytes: signed.metadataBytes,
      signatureBytes: signed.signatureBytes,
      revocationBytes: revocations?.revocationBytes,
      revocationSignatureBytes: revocations?.signatureBytes,
      artifactBytes,
    });
  };

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

  const signed = signUpdateMetadataBytes(metadata, privateKey);
  const tampered = Buffer.concat([signed.metadataBytes.subarray(0, -1), Buffer.from(" \n")]);
  assert.deepEqual(await controller.applyUpdateBytes({
    metadataBytes: tampered,
    signatureBytes: signed.signatureBytes,
    revocationBytes: signedRevocations.revocationBytes,
    revocationSignatureBytes: signedRevocations.signatureBytes,
    artifactBytes,
  }), { state: "denied", reason: "signature_check_failed" });

  const noncanonicalBytes = Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`);
  const noncanonicalSignature = signBytes(null, noncanonicalBytes, privateKey);
  assert.deepEqual(verifyAndParseUpdateMetadataBytes({
    metadataBytes: noncanonicalBytes,
    signatureBytes: noncanonicalSignature,
    trustedKeyId: INTERNAL_UPDATE_KEY_ID,
    trustedPublicKeys,
  }), { valid: false, reason: "noncanonical_document_bytes" });

  assert.deepEqual(await apply(metadata, null), {
    state: "denied",
    reason: "signed_revocations_required",
  });

  const revoked = signInternalUnsignedRevocationsBytes(
    internalUnsignedRevocations({
      revocationId: "amic-os-internal-revocations-0002",
      revision: 2,
      revokedReleaseIds: [metadata.releaseId],
    }),
    privateKey,
  );
  assert.deepEqual(await apply(metadata, revoked), {
    state: "denied",
    reason: "release_revoked",
  });

  const publicDistribution = { ...metadata, distribution: "public" };
  assert.throws(
    () => signUpdateMetadataBytes(publicDistribution, privateKey),
    /update metadata is invalid/,
  );
  const extraField = { ...metadata, apiKey: "must-never-be-here" };
  assert.throws(
    () => signUpdateMetadataBytes(extraField, privateKey),
    /update metadata is invalid/,
  );
});

test("internal-unsigned update rejects replay, lineage drift, partial download, hash mismatch, and unauthorized downgrade", async () => {
  const artifactBytes = Buffer.from("managed-internal-unsigned-update");
  const metadata = internalUnsignedMetadata("0.1.32", artifactBytes);
  const signed = signedInternalUnsignedCandidate(metadata);
  const request = (overrides = {}) => ({
    metadataBytes: signed.signedMetadata.metadataBytes,
    signatureBytes: signed.signedMetadata.signatureBytes,
    revocationBytes: signed.signedRevocations.revocationBytes,
    revocationSignatureBytes: signed.signedRevocations.signatureBytes,
    artifactBytes,
    ...overrides,
  });

  assert.deepEqual(await internalUnsignedController().applyUpdateBytes(request({
    artifactBytes: artifactBytes.subarray(0, artifactBytes.length - 1),
  })), { state: "blocked", reason: "artifact_size_mismatch" });
  assert.deepEqual(await internalUnsignedController().applyUpdateBytes(request({
    artifactBytes: Buffer.alloc(artifactBytes.length, 0x78),
  })), { state: "blocked", reason: "artifact_sha256_mismatch" });

  const lineageDrift = internalUnsignedMetadata("0.1.32", artifactBytes, {
    predecessorSourceSha: "9".repeat(40),
  });
  const lineageSigned = signedInternalUnsignedCandidate(lineageDrift);
  assert.deepEqual(await internalUnsignedController().applyUpdateBytes({
    metadataBytes: lineageSigned.signedMetadata.metadataBytes,
    signatureBytes: lineageSigned.signedMetadata.signatureBytes,
    revocationBytes: lineageSigned.signedRevocations.revocationBytes,
    revocationSignatureBytes: lineageSigned.signedRevocations.signatureBytes,
    artifactBytes,
  }), { state: "denied", reason: "predecessor_lineage_mismatch" });

  const controller = internalUnsignedController();
  assert.equal((await controller.applyUpdateBytes(request())).state, "updated");
  assert.deepEqual(await controller.applyUpdateBytes(request()), {
    state: "denied",
    reason: "release_replay",
  });

  const downgradeBytes = Buffer.from("unauthorized-older-release");
  const downgrade = internalUnsignedMetadata("0.1.30", downgradeBytes, {
    releaseId: "amic-os-internal-0.1.30-unapproved",
    releaseSequence: 30,
    predecessorReleaseId: metadata.releaseId,
    predecessorVersion: metadata.version,
    predecessorSourceSha: metadata.sourceSha,
    predecessorSourceTree: metadata.sourceTree,
    sourceSha: "3".repeat(40),
    sourceTree: "4".repeat(40),
    artifactVersionId: "s3-version-unapproved-downgrade",
  });
  const downgradeSigned = signUpdateMetadataBytes(downgrade, privateKey);
  assert.deepEqual(await controller.applyUpdateBytes({
    metadataBytes: downgradeSigned.metadataBytes,
    signatureBytes: downgradeSigned.signatureBytes,
    revocationBytes: signed.signedRevocations.revocationBytes,
    revocationSignatureBytes: signed.signedRevocations.signatureBytes,
    artifactBytes: downgradeBytes,
  }), { state: "denied", reason: "release_sequence_not_newer" });
});

test("internal-unsigned rollback requires a current signed one-time authorization for the previous known-good release", async () => {
  const updateBytes = Buffer.from("managed-internal-unsigned-update");
  const update = internalUnsignedMetadata("0.1.32", updateBytes);
  const updateSigned = signedInternalUnsignedCandidate(update);
  const controller = internalUnsignedController();
  assert.equal((await controller.applyUpdateBytes({
    metadataBytes: updateSigned.signedMetadata.metadataBytes,
    signatureBytes: updateSigned.signedMetadata.signatureBytes,
    revocationBytes: updateSigned.signedRevocations.revocationBytes,
    revocationSignatureBytes: updateSigned.signedRevocations.signatureBytes,
    artifactBytes: updateBytes,
  })).state, "updated");

  const target = internalUnsignedMetadata("0.1.31", currentInternalArtifactBytes, {
    releaseId: currentInternalRelease.currentReleaseId,
    sourceSha: currentInternalRelease.currentSourceSha,
    sourceTree: currentInternalRelease.currentSourceTree,
    releaseSequence: currentInternalRelease.currentReleaseSequence,
    artifactVersionId: currentInternalRelease.currentArtifactVersionId,
    predecessorReleaseId: "amic-os-internal-0.1.30",
    predecessorVersion: "0.1.30",
    predecessorSourceSha: "3".repeat(40),
    predecessorSourceTree: "4".repeat(40),
  });
  const targetSigned = signUpdateMetadataBytes(target, privateKey);
  assert.deepEqual(await controller.rollbackUpdateBytes({
    metadataBytes: targetSigned.metadataBytes,
    signatureBytes: targetSigned.signatureBytes,
    revocationBytes: updateSigned.signedRevocations.revocationBytes,
    revocationSignatureBytes: updateSigned.signedRevocations.signatureBytes,
    artifactBytes: currentInternalArtifactBytes,
  }), { state: "denied", reason: "signed_rollback_authorization_required" });

  const authorization = {
    schemaVersion: INTERNAL_UNSIGNED_ROLLBACK_SCHEMA,
    rollbackId: "amic-os-rollback-0.1.32-to-0.1.31-001",
    channel: INTERNAL_UNSIGNED_UPDATE_CHANNEL,
    lawosTenantId: target.lawosTenantId,
    installationId: target.installationId,
    appId: target.appId,
    keyId: INTERNAL_UPDATE_KEY_ID,
    fromReleaseId: update.releaseId,
    fromVersion: update.version,
    fromSourceSha: update.sourceSha,
    fromSourceTree: update.sourceTree,
    targetReleaseId: target.releaseId,
    targetVersion: target.version,
    targetSourceSha: target.sourceSha,
    targetSourceTree: target.sourceTree,
    targetArtifactSha256: target.artifactSha256,
    targetArtifactVersionId: target.artifactVersionId,
    targetMetadata: target,
    targetMetadataSha256: targetSigned.metadataSha256,
    revocationRevision: 1,
    reasonCode: "operator_verified_regression",
    generatedAt: "2026-09-03T10:30:00.000Z",
    expiresAt: "2026-09-03T12:30:00.000Z",
  };
  const rollbackSigned = signInternalUnsignedRollbackBytes(authorization, privateKey);
  const rolledBack = await controller.rollbackUpdateBytes({
    metadataBytes: targetSigned.metadataBytes,
    signatureBytes: targetSigned.signatureBytes,
    rollbackBytes: rollbackSigned.rollbackBytes,
    rollbackSignatureBytes: rollbackSigned.signatureBytes,
    revocationBytes: updateSigned.signedRevocations.revocationBytes,
    revocationSignatureBytes: updateSigned.signedRevocations.signatureBytes,
    artifactBytes: currentInternalArtifactBytes,
  });
  assert.equal(rolledBack.state, "rolled_back");
  assert.equal(rolledBack.version, "0.1.31");
  assert.equal(rolledBack.rollbackId, authorization.rollbackId);
  assert.match(rolledBack.receiptSha256, /^[0-9a-f]{64}$/u);
  assert.equal(controller.activeVersion(), "0.1.31");
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
