import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign as signBytes } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  INTERNAL_UNSIGNED_REVOCATION_SCHEMA,
  INTERNAL_UNSIGNED_ROLLBACK_SCHEMA,
  INTERNAL_UNSIGNED_UPDATE_CHANNEL,
  INTERNAL_UNSIGNED_UPDATE_SCHEMA,
  INTERNAL_UPDATE_KEY_ID,
  canonicalizeUpdateMetadata,
  signUpdateMetadataBytes,
} from "../../apps/desktop/src/main/updates.js";
import {
  AMIC_INTERNAL_BASELINE_DOCUMENT_SCHEMA,
  AMIC_INTERNAL_BASELINE_ENVELOPE_SCHEMA,
  createAmicInternalDistributionAwsCliAdapter,
  AMIC_INTERNAL_BASELINE_PUBLICATION_RECEIPT_SCHEMA,
  AMIC_INTERNAL_METADATA_SIGNING_SECRET_SCHEMA,
  AMIC_INTERNAL_PUBLICATION_RECEIPT_SCHEMA,
  AMIC_INTERNAL_PROVENANCE_SCHEMA,
  executeAmicInternalDistributionPublication,
  amicInternalBaselineScopeKey,
  amicInternalChannelScopeKey,
  parseAmicInternalMetadataSigningSecret,
  sanitizeAmicInternalBaselinePublicationReceipt,
  sanitizeAmicInternalPublicationReceipt,
} from "../lib/amic-os-internal-distribution-publication.mjs";
import { createDesktopBuildManifest } from "../lib/matter-desktop-provenance.mjs";
import {
  AMIC_INTERNAL_BASELINE_READBACK_RECEIPT_SCHEMA,
  AMIC_INTERNAL_READBACK_RECEIPT_SCHEMA,
  verifyAmicInternalBaselineReadback,
  verifyAmicInternalDistributionReadback,
} from "../lib/amic-os-internal-distribution-readback.mjs";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const NOW = Date.parse("2026-09-03T11:00:00.000Z");
const ACCOUNT_ID = "770880870480";
const REGION = "ap-northeast-2";
const KMS_KEY_ARN = `arn:aws:kms:${REGION}:${ACCOUNT_ID}:key/11111111-1111-4111-8111-111111111111`;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function release() {
  return {
    releaseId: "amic-os-internal-0.1.32",
    releaseSequence: 32,
    version: "0.1.32",
    lawosTenantId: "amic-internal",
    installationId: "JWS-GALAXYBOOK-amic-os",
    appId: "com.amic.matter.desktop.internal",
    keyId: INTERNAL_UPDATE_KEY_ID,
    sourceSha: "a".repeat(40),
    sourceTree: "b".repeat(40),
    platform: "win32",
    architecture: "x64",
    predecessor: {
      releaseId: "amic-os-internal-0.1.31",
      version: "0.1.31",
      sourceSha: "1".repeat(40),
      sourceTree: "2".repeat(40),
    },
    generatedAt: "2026-09-03T10:00:00.000Z",
    expiresAt: "2026-09-10T10:00:00.000Z",
  };
}

function revocations({
  revision = 1,
  revokedReleaseIds = [],
  revokedArtifactSha256s = [],
} = {}) {
  return {
    schemaVersion: INTERNAL_UNSIGNED_REVOCATION_SCHEMA,
    revocationId: `amic-os-internal-revocations-${String(revision).padStart(4, "0")}`,
    revision,
    channel: INTERNAL_UNSIGNED_UPDATE_CHANNEL,
    lawosTenantId: "amic-internal",
    appId: "com.amic.matter.desktop.internal",
    keyId: INTERNAL_UPDATE_KEY_ID,
    revokedReleaseIds,
    revokedArtifactSha256s,
    generatedAt: "2026-09-03T10:00:00.000Z",
    expiresAt: "2026-09-10T10:00:00.000Z",
  };
}

function rollbackAuthorization() {
  const predecessorBytes = Buffer.from("previous-known-good-installer");
  const predecessor = release().predecessor;
  const filename = "AMIC-OS-internal-0.1.31-win-x64.exe";
  const artifactSha256 = sha256(predecessorBytes);
  const targetMetadata = {
    schemaVersion: INTERNAL_UNSIGNED_UPDATE_SCHEMA,
    releaseId: predecessor.releaseId,
    version: predecessor.version,
    channel: INTERNAL_UNSIGNED_UPDATE_CHANNEL,
    lawosTenantId: "amic-internal",
    installationId: "JWS-GALAXYBOOK-amic-os",
    appId: "com.amic.matter.desktop.internal",
    keyId: INTERNAL_UPDATE_KEY_ID,
    sourceSha: predecessor.sourceSha,
    sourceTree: predecessor.sourceTree,
    predecessorReleaseId: "amic-os-internal-0.1.30",
    predecessorVersion: "0.1.30",
    predecessorSourceSha: "3".repeat(40),
    predecessorSourceTree: "4".repeat(40),
    releaseSequence: 31,
    platform: "win32",
    architecture: "x64",
    artifactFilename: filename,
    artifactObjectKey: [
      INTERNAL_UNSIGNED_UPDATE_CHANNEL,
      "win32",
      "x64",
      predecessor.version,
      predecessor.sourceSha,
      artifactSha256,
      filename,
    ].join("/"),
    artifactSha256,
    artifactBytes: predecessorBytes.length,
    artifactVersionId: "s3-version-current-001",
    releaseManifestSha256: "c".repeat(64),
    authenticodeStatus: "not_signed",
    distribution: "private",
    managedDeviceOnly: true,
    publicReleaseAllowed: false,
    generatedAt: "2026-09-03T10:00:00.000Z",
    expiresAt: "2026-09-10T10:00:00.000Z",
  };
  const targetMetadataSha256 = signUpdateMetadataBytes(targetMetadata, privateKey).metadataSha256;
  const current = release();
  return {
    schemaVersion: INTERNAL_UNSIGNED_ROLLBACK_SCHEMA,
    rollbackId: "amic-os-rollback-0.1.32-to-0.1.31-001",
    channel: INTERNAL_UNSIGNED_UPDATE_CHANNEL,
    lawosTenantId: current.lawosTenantId,
    installationId: current.installationId,
    appId: current.appId,
    keyId: current.keyId,
    fromReleaseId: current.releaseId,
    fromVersion: current.version,
    fromSourceSha: current.sourceSha,
    fromSourceTree: current.sourceTree,
    targetReleaseId: predecessor.releaseId,
    targetVersion: predecessor.version,
    targetSourceSha: predecessor.sourceSha,
    targetSourceTree: predecessor.sourceTree,
    targetArtifactSha256: artifactSha256,
    targetArtifactVersionId: targetMetadata.artifactVersionId,
    targetMetadata,
    targetMetadataSha256,
    revocationRevision: 1,
    reasonCode: "operator_verified_regression",
    generatedAt: "2026-09-03T10:30:00.000Z",
    expiresAt: "2026-09-03T12:30:00.000Z",
  };
}

async function fixtureArtifacts(root, { dirty = false, target = release() } = {}) {
  const paths = {
    installer: path.join(root, `AMIC-OS-internal-${target.version}-win-x64.exe`),
    build_manifest: path.join(root, "matter-build-manifest.json"),
    sbom: path.join(root, "sbom.cdx.json"),
    provenance: path.join(root, "provenance.json"),
  };
  const installerBytes = Buffer.from("synthetic-unsigned-installer\n");
  await writeFile(paths.installer, installerBytes);
  const buildManifest = createDesktopBuildManifest({
    version: target.version,
    sourceSha: target.sourceSha,
    sourceTree: target.sourceTree,
    sourceDirty: dirty,
    renderer: {
      sha256: "e".repeat(64),
      file_count: 12,
      algorithm: "sha256(sorted sha256 file manifest with ./ relative paths)",
    },
    channel: "internal",
    platform: target.platform,
    arch: target.architecture,
    appId: target.appId,
    builtAt: "2026-09-03T10:00:00.000Z",
  });
  const buildManifestBytes = Buffer.from(`${JSON.stringify(buildManifest, null, 2)}\n`);
  await writeFile(paths.build_manifest, buildManifestBytes);
  const installerSha256 = sha256(installerBytes);
  const sbom = {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    version: 1,
    metadata: {
      component: {
        type: "application",
        name: "@law-firm-os/desktop",
        version: target.version,
        properties: [
          ["law-firm-os:app-id", target.appId],
          ["law-firm-os:authenticode-status", "not_signed"],
          ["law-firm-os:credentials-included", "false"],
          ["law-firm-os:distribution", "private"],
          ["law-firm-os:installer-bytes", String(installerBytes.byteLength)],
          ["law-firm-os:installer-sha256", installerSha256],
          ["law-firm-os:internal-unsigned-privacy-audit", "true"],
          ["law-firm-os:public-release-allowed", "false"],
          ["law-firm-os:real-contact-seed-included", "false"],
          ["law-firm-os:real-photo-seed-included", "false"],
          ["law-firm-os:real-registration-seed-included", "false"],
          ["law-firm-os:source-sha", target.sourceSha],
          ["law-firm-os:source-tree", target.sourceTree],
          ["law-firm-os:version", target.version],
        ].map(([name, value]) => ({ name, value })),
      },
    },
    components: [{
      type: "file",
      "bom-ref": `urn:sha256:${installerSha256}`,
      name: path.basename(paths.installer),
      hashes: [{ alg: "SHA-256", content: installerSha256.toUpperCase() }],
    }],
  };
  const sbomBytes = Buffer.from(`${JSON.stringify(sbom, null, 2)}\n`);
  await writeFile(paths.sbom, sbomBytes);
  await writeFile(paths.provenance, `${JSON.stringify({
    schema_version: AMIC_INTERNAL_PROVENANCE_SCHEMA,
    generated_at: "2026-09-03T10:00:00.000Z",
    source_sha: target.sourceSha,
    source_tree: target.sourceTree,
    version: target.version,
    release_id: target.releaseId,
    release_sequence: target.releaseSequence,
    app_id: target.appId,
    installer_sha256: installerSha256,
    installer_bytes: installerBytes.byteLength,
    build_result_sha256: "f".repeat(64),
    build_manifest_sha256: sha256(buildManifestBytes),
    sbom_sha256: sha256(sbomBytes),
    distribution_profile: "internal-unsigned",
    authenticode_status: "NotSigned",
    internal_unsigned_privacy_audit: true,
    private_source_file_count: 17,
    private_source_digest_count: 17,
    private_source_content_match_count: 0,
    real_contact_seed_included: false,
    real_photo_seed_included: false,
    real_registration_seed_included: false,
    credentials_included: false,
    public_release: false,
    github_release_installer_asset_allowed: false,
    repository: "Gonyak-cell/law-firm-os",
    ref: "refs/heads/main",
    workflow_ref: "Gonyak-cell/law-firm-os/.github/workflows/amic-os-internal-unsigned-publish.yml@refs/heads/main",
    run_id: "12345",
    run_attempt: "1",
    runner_environment: "github-hosted",
  }, null, 2)}\n`);
  return paths;
}

function successorRelease() {
  const baseline = release();
  return {
    ...baseline,
    releaseId: "amic-os-internal-0.1.33",
    releaseSequence: 33,
    version: "0.1.33",
    sourceSha: "d".repeat(40),
    sourceTree: "e".repeat(40),
    predecessor: {
      releaseId: baseline.releaseId,
      version: baseline.version,
      sourceSha: baseline.sourceSha,
      sourceTree: baseline.sourceTree,
    },
  };
}

function rollbackTo({ current, targetMetadata, revocationRevision = 1 }) {
  return {
    schemaVersion: INTERNAL_UNSIGNED_ROLLBACK_SCHEMA,
    rollbackId: `${current.releaseId}-rollback-to-${targetMetadata.version}`,
    channel: INTERNAL_UNSIGNED_UPDATE_CHANNEL,
    lawosTenantId: current.lawosTenantId,
    installationId: current.installationId,
    appId: current.appId,
    keyId: current.keyId,
    fromReleaseId: current.releaseId,
    fromVersion: current.version,
    fromSourceSha: current.sourceSha,
    fromSourceTree: current.sourceTree,
    targetReleaseId: targetMetadata.releaseId,
    targetVersion: targetMetadata.version,
    targetSourceSha: targetMetadata.sourceSha,
    targetSourceTree: targetMetadata.sourceTree,
    targetArtifactSha256: targetMetadata.artifactSha256,
    targetArtifactVersionId: targetMetadata.artifactVersionId,
    targetMetadata,
    targetMetadataSha256: signUpdateMetadataBytes(targetMetadata, privateKey).metadataSha256,
    revocationRevision,
    reasonCode: "operator_verified_regression",
    generatedAt: "2026-09-03T10:30:00.000Z",
    expiresAt: "2026-09-03T12:30:00.000Z",
  };
}

class FakeAwsDistribution {
  constructor({
    publicAccess = true,
    failGetKind = null,
    rollbackTargetPresent = true,
    predecessorControlPresent = rollbackTargetPresent,
    raceControlKind = null,
  } = {}) {
    this.publicAccess = publicAccess;
    this.failGetKind = failGetKind;
    this.objects = new Map();
    this.puts = [];
    this.raceControlKind = raceControlKind;
    if (predecessorControlPresent) this.seedPredecessorBaselineControl();
    if (rollbackTargetPresent) this.seedRollbackTarget();
  }

  seedObject({ key, versionId, kind, bytes, target }) {
    const digest = sha256(bytes);
    const stored = {
      bytes,
      checksumSha256: Buffer.from(digest, "hex").toString("base64"),
      kmsKeyArn: KMS_KEY_ARN,
      retainUntil: "2027-09-04T11:00:00.000Z",
      versionId,
      etag: `\"${digest.slice(0, 32)}\"`,
      metadata: {
        "artifact-sha256": digest,
        "artifact-kind": kind,
        "source-sha": target.sourceSha,
        "source-tree": target.sourceTree,
        "release-id": target.releaseId,
      },
    };
    this.objects.set(`${key}?versionId=${versionId}`, stored);
    return {
      kind,
      key,
      version_id: versionId,
      sha256: digest,
      bytes: bytes.byteLength,
    };
  }

  seedPredecessorBaselineControl({
    targetMetadata = rollbackAuthorization().targetMetadata,
  } = {}) {
    const target = {
      releaseId: targetMetadata.releaseId,
      version: targetMetadata.version,
      sourceSha: targetMetadata.sourceSha,
      sourceTree: targetMetadata.sourceTree,
      lawosTenantId: targetMetadata.lawosTenantId,
      installationId: targetMetadata.installationId,
    };
    const signed = signUpdateMetadataBytes(targetMetadata, privateKey);
    const updateMetadata = this.seedObject({
      key: "internal-unsigned/test/predecessor/update-metadata.json",
      versionId: "predecessor-update-version",
      kind: "update_metadata",
      bytes: signed.metadataBytes,
      target,
    });
    const updateMetadataSignature = this.seedObject({
      key: "internal-unsigned/test/predecessor/update-metadata.sig",
      versionId: "predecessor-update-signature-version",
      kind: "update_metadata_signature",
      bytes: signed.signatureBytes,
      target,
    });
    const placeholder = (kind, suffix, digest) => ({
      kind,
      key: `internal-unsigned/test/predecessor/${suffix}`,
      version_id: `predecessor-${kind}-version`,
      sha256: digest,
      bytes: kind.endsWith("signature") ? 64 : 512,
    });
    const document = {
      schema_version: AMIC_INTERNAL_BASELINE_DOCUMENT_SCHEMA,
      publication_mode: "baseline",
      channel: INTERNAL_UNSIGNED_UPDATE_CHANNEL,
      lawos_tenant_id: targetMetadata.lawosTenantId,
      installation_id: targetMetadata.installationId,
      app_id: targetMetadata.appId,
      key_id: targetMetadata.keyId,
      platform: targetMetadata.platform,
      architecture: targetMetadata.architecture,
      release_id: targetMetadata.releaseId,
      release_sequence: targetMetadata.releaseSequence,
      version: targetMetadata.version,
      source_sha: targetMetadata.sourceSha,
      source_tree: targetMetadata.sourceTree,
      generated_at: targetMetadata.generatedAt,
      expires_at: targetMetadata.expiresAt,
      release_manifest: placeholder("release_manifest", "release-manifest.json", "5".repeat(64)),
      release_manifest_signature: placeholder(
        "release_manifest_signature",
        "release-manifest.sig",
        "6".repeat(64),
      ),
      update_metadata: updateMetadata,
      update_metadata_signature: updateMetadataSignature,
      channel_pointer_published: false,
      rollback_authorization_published: false,
      runtime_discoverable: false,
      public_release_allowed: false,
    };
    const documentBytes = Buffer.from(`${canonicalizeUpdateMetadata(document)}\n`);
    const signature = signBytes(null, documentBytes, privateKey);
    const envelope = {
      schema_version: AMIC_INTERNAL_BASELINE_ENVELOPE_SCHEMA,
      key_id: targetMetadata.keyId,
      document_base64: documentBytes.toString("base64"),
      signature_base64: signature.toString("base64"),
      document_sha256: sha256(documentBytes),
      signature_sha256: sha256(signature),
      baseline_marker_written_after_all_object_readbacks: true,
      channel_pointer_published: false,
      rollback_authorization_published: false,
      runtime_discoverable: false,
      public_release_allowed: false,
    };
    const markerBytes = Buffer.from(`${canonicalizeUpdateMetadata(envelope)}\n`);
    this.seedObject({
      key: amicInternalBaselineScopeKey(target),
      versionId: "predecessor-baseline-marker-version",
      kind: "baseline_marker",
      bytes: markerBytes,
      target,
    });
  }

  seedRollbackTarget() {
    const target = rollbackAuthorization().targetMetadata;
    const bytes = Buffer.from("previous-known-good-installer");
    this.objects.set(`${target.artifactObjectKey}?versionId=${target.artifactVersionId}`, {
      bytes,
      checksumSha256: Buffer.from(target.artifactSha256, "hex").toString("base64"),
      kmsKeyArn: KMS_KEY_ARN,
      retainUntil: "2027-09-04T11:00:00.000Z",
      versionId: target.artifactVersionId,
      metadata: {
        "artifact-sha256": target.artifactSha256,
        "artifact-kind": "installer",
        "source-sha": target.sourceSha,
        "source-tree": target.sourceTree,
        "release-id": target.releaseId,
      },
    });
  }

  async inspectGovernance() {
    return {
      identity: { Account: ACCOUNT_ID },
      location: { LocationConstraint: REGION },
      versioning: { Status: "Enabled" },
      publicAccess: { PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: this.publicAccess,
      } },
      objectLock: { ObjectLockConfiguration: { ObjectLockEnabled: "Enabled" } },
      encryption: { ServerSideEncryptionConfiguration: { Rules: [{
        ApplyServerSideEncryptionByDefault: {
          SSEAlgorithm: "aws:kms",
          KMSMasterKeyID: KMS_KEY_ARN,
        },
      }] } },
      ownership: { OwnershipControls: { Rules: [{ ObjectOwnership: "BucketOwnerEnforced" }] } },
      logging: { LoggingEnabled: {
        TargetBucket: "amic-os-internal-access-logs",
        TargetPrefix: `${"s3-access"}/${ACCOUNT_ID}/`,
      } },
    };
  }

  async putObject(input) {
    const bytes = await import("node:fs/promises").then((fs) => fs.readFile(input.bodyPath));
    if (this.raceControlKind === input.metadata["artifact-kind"]) {
      this.raceControlKind = null;
      const racingBytes = Buffer.from("competing-control-version");
      const racingDigest = sha256(racingBytes);
      this.objects.set(`${input.key}?versionId=competing-control-version`, {
        ...input,
        bytes: racingBytes,
        checksumSha256: Buffer.from(racingDigest, "hex").toString("base64"),
        versionId: "competing-control-version",
        etag: `\"${racingDigest.slice(0, 32)}\"`,
        metadata: {
          ...input.metadata,
          "artifact-sha256": racingDigest,
        },
      });
    }
    const current = [...this.objects.entries()]
      .filter(([locator]) => locator.startsWith(`${input.key}?versionId=`))
      .at(-1)?.[1] ?? null;
    if (input.ifNoneMatch === "*" && current) throw new Error("PreconditionFailed");
    if (input.ifMatch != null && input.ifMatch !== current?.etag) {
      throw new Error("PreconditionFailed");
    }
    const versionId = `version-${String(this.puts.length + 1).padStart(3, "0")}`;
    const stored = {
      ...input,
      bytes,
      versionId,
      etag: `\"${sha256(bytes).slice(0, 32)}\"`,
    };
    this.objects.set(`${input.key}?versionId=${versionId}`, stored);
    this.puts.push({
      key: input.key,
      kind: input.metadata["artifact-kind"],
      versionId,
      ifMatch: input.ifMatch,
      ifNoneMatch: input.ifNoneMatch,
    });
    return { VersionId: versionId };
  }

  async listObjectVersions({ prefix }) {
    const versions = [];
    for (const [locator, stored] of this.objects) {
      const key = locator.slice(0, locator.indexOf("?versionId="));
      if (key.startsWith(prefix)) {
        versions.push({ Key: key, VersionId: stored.versionId, IsLatest: false });
      }
    }
    if (versions.length) versions.at(-1).IsLatest = true;
    return { Versions: versions, DeleteMarkers: [] };
  }

  response(stored) {
    return {
      VersionId: stored.versionId,
      ContentLength: stored.bytes.length,
      ServerSideEncryption: "aws:kms",
      SSEKMSKeyId: stored.kmsKeyArn,
      ChecksumSHA256: stored.checksumSha256,
      ObjectLockMode: "COMPLIANCE",
      ObjectLockRetainUntilDate: stored.retainUntil,
      Metadata: stored.metadata,
      ETag: stored.etag,
    };
  }

  async headObject(input) {
    const stored = this.objects.get(`${input.key}?versionId=${input.versionId}`);
    if (!stored) throw new Error("NoSuchVersion");
    return this.response(stored);
  }

  async getObject(input) {
    const stored = this.objects.get(`${input.key}?versionId=${input.versionId}`);
    if (!stored) throw new Error("NoSuchVersion");
    return {
      ...this.response(stored),
      body_bytes: stored.bytes.length,
      body_sha256: this.failGetKind === stored.metadata["artifact-kind"]
        ? "0".repeat(64)
        : sha256(stored.bytes),
    };
  }

  async getObjectBody(input) {
    const stored = this.objects.get(`${input.key}?versionId=${input.versionId}`);
    return { ...this.response(stored), body: Buffer.from(stored.bytes) };
  }

  async probeAnonymousAccess() {
    return { s3_status: 403, cloudfront_status: 403 };
  }
}

function bindings() {
  return {
    accountId: ACCOUNT_ID,
    region: REGION,
    bucket: "amic-os-internal-artifacts",
    accessLogBucket: "amic-os-internal-access-logs",
    kmsKeyArn: KMS_KEY_ARN,
    retainUntil: "2027-09-04T11:00:00.000Z",
  };
}

test("internal-unsigned publication uploads every exact object and moves the signed channel pointer last", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "amic-os-publication-test-"));
  try {
    const aws = new FakeAwsDistribution();
    const receipt = await executeAmicInternalDistributionPublication({
      aws,
      bindings: bindings(),
      release: release(),
      artifactPaths: await fixtureArtifacts(root),
      revocations: revocations(),
      rollback: rollbackAuthorization(),
      privateKey,
      now: NOW,
    });
    assert.equal(receipt.schema_version, AMIC_INTERNAL_PUBLICATION_RECEIPT_SCHEMA);
    assert.equal(receipt.state, "PASS");
    assert.equal(receipt.object_count, 17);
    assert.equal(receipt.exact_head_readback_complete, true);
    assert.equal(receipt.exact_get_readback_complete, true);
    assert.equal(receipt.rollback_target_artifact_readback_complete, true);
    assert.equal(receipt.predecessor_control_kind, "baseline");
    assert.equal(receipt.rollback_target_metadata_renewed, false);
    assert.equal(receipt.channel_pointer_moved_last, true);
    assert.equal(receipt.public_installer_uploaded, false);
    assert.equal(receipt.github_release_installer_asset_allowed, false);
    assert.equal(aws.puts.at(-1).kind, "channel_pointer");
    assert.equal(aws.puts.at(-1).ifNoneMatch, "*");
    assert.equal(aws.puts.at(-1).ifMatch, null);
    assert.match(aws.puts.at(-1).key, /\/channel\/[0-9a-f]{32}\/[0-9a-f]{32}\/win32\/x64\/current\.json$/u);
    assert.equal(aws.puts.filter(({ kind }) => kind === "installer").length, 1);
    assert.equal(JSON.stringify(receipt).includes("PRIVATE KEY"), false);
    assert.match(receipt.receipt_sha256, /^[0-9a-f]{64}$/u);

    const readback = await verifyAmicInternalDistributionReadback({
      aws,
      bindings: bindings(),
      channelPointer: receipt.channel_pointer,
      trustedPublicKey: publicKey,
      expectedPublicKeySha256: sha256(publicKey.export({ type: "spki", format: "der" })),
      cloudFrontDomain: "d111111abcdef8.cloudfront.net",
      now: NOW,
    });
    assert.equal(readback.schema_version, AMIC_INTERNAL_READBACK_RECEIPT_SCHEMA);
    assert.equal(readback.state, "PASS");
    assert.equal(readback.exact_version_read_count, 18);
    assert.equal(readback.rollback_target_artifact_readback_complete, true);
    assert.equal(readback.anonymous_s3_denied, true);
    assert.equal(readback.unsigned_cloudfront_denied, true);
    assert.equal(readback.public_installer_available, false);
    assert.match(readback.receipt_sha256, /^[0-9a-f]{64}$/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("baseline publication creates no channel or rollback and is independently readable exactly once per scope", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "amic-os-baseline-publication-test-"));
  try {
    const aws = new FakeAwsDistribution({ rollbackTargetPresent: false });
    const input = {
      aws,
      bindings: bindings(),
      release: release(),
      artifactPaths: await fixtureArtifacts(root),
      privateKey,
      publicationMode: "baseline",
      now: NOW,
    };
    const receipt = await executeAmicInternalDistributionPublication(input);
    assert.equal(receipt.schema_version, AMIC_INTERNAL_BASELINE_PUBLICATION_RECEIPT_SCHEMA);
    assert.equal(receipt.state, "PASS");
    assert.equal(receipt.publication_mode, "baseline");
    assert.equal(receipt.object_count, 9);
    assert.equal(receipt.channel_history_absent_before_publication, true);
    assert.equal(receipt.channel_pointer_published, false);
    assert.equal(receipt.rollback_authorization_published, false);
    assert.equal(receipt.runtime_discoverable, false);
    assert.equal(aws.puts.at(-1).kind, "baseline_marker");
    assert.equal(aws.puts.at(-1).ifNoneMatch, "*");
    assert.equal(aws.puts.at(-1).ifMatch, null);
    assert.match(aws.puts.at(-1).key, /\/baseline\/[0-9a-f]{32}\/[0-9a-f]{32}\/win32\/x64\/established\.json$/u);
    assert.equal(aws.puts.some(({ kind }) => kind === "channel_pointer"), false);
    assert.equal(aws.puts.some(({ kind }) => kind.startsWith("rollback")), false);
    assert.equal(aws.puts.some(({ kind }) => kind.startsWith("revocations")), false);

    const readback = await verifyAmicInternalBaselineReadback({
      aws,
      bindings: bindings(),
      baselineMarker: receipt.baseline_marker,
      trustedPublicKey: publicKey,
      expectedPublicKeySha256: sha256(publicKey.export({ type: "spki", format: "der" })),
      cloudFrontDomain: "d111111abcdef8.cloudfront.net",
      now: NOW,
    });
    assert.equal(readback.schema_version, AMIC_INTERNAL_BASELINE_READBACK_RECEIPT_SCHEMA);
    assert.equal(readback.state, "PASS");
    assert.equal(readback.exact_version_read_count, 9);
    assert.equal(readback.baseline_established, true);
    assert.equal(readback.baseline_marker_only_version, true);
    assert.equal(readback.channel_history_absent, true);
    assert.equal(readback.channel_pointer_published, false);
    assert.equal(readback.rollback_authorization_published, false);
    assert.equal(readback.runtime_discoverable, false);
    assert.equal(readback.anonymous_s3_denied, true);
    assert.equal(readback.unsigned_cloudfront_denied, true);

    const publicReceipt = sanitizeAmicInternalBaselinePublicationReceipt(receipt);
    assert.equal(publicReceipt.raw_object_key_included, false);
    assert.equal(publicReceipt.raw_version_id_included, false);
    assert.equal(JSON.stringify(publicReceipt).includes(receipt.baseline_marker.key), false);
    assert.equal(JSON.stringify(publicReceipt).includes(receipt.baseline_marker.version_id), false);

    aws.seedObject({
      key: amicInternalChannelScopeKey(release()),
      versionId: "unexpected-channel-version",
      kind: "channel_pointer",
      bytes: Buffer.from("unexpected-channel"),
      target: release(),
    });
    await assert.rejects(
      verifyAmicInternalBaselineReadback({
        aws,
        bindings: bindings(),
        baselineMarker: receipt.baseline_marker,
        trustedPublicKey: publicKey,
        expectedPublicKeySha256: sha256(publicKey.export({ type: "spki", format: "der" })),
        cloudFrontDomain: "d111111abcdef8.cloudfront.net",
        now: NOW,
      }),
      /baseline scope already has a channel version/u,
    );

    await assert.rejects(
      executeAmicInternalDistributionPublication(input),
      /baseline scope already has immutable history/u,
    );
    assert.equal(aws.puts.length, 9);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an independently verified baseline and then the current channel anchor each successor", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "amic-os-baseline-successor-test-"));
  try {
    const aws = new FakeAwsDistribution({ rollbackTargetPresent: false });
    const baselineReceipt = await executeAmicInternalDistributionPublication({
      aws,
      bindings: bindings(),
      release: release(),
      artifactPaths: await fixtureArtifacts(root),
      privateKey,
      publicationMode: "baseline",
      now: NOW,
    });
    const baselineReadback = await verifyAmicInternalBaselineReadback({
      aws,
      bindings: bindings(),
      baselineMarker: baselineReceipt.baseline_marker,
      trustedPublicKey: publicKey,
      expectedPublicKeySha256: sha256(publicKey.export({ type: "spki", format: "der" })),
      cloudFrontDomain: "d111111abcdef8.cloudfront.net",
      now: NOW,
    });
    assert.equal(baselineReadback.baseline_established, true);

    const targetRef = baselineReceipt.objects.update_metadata;
    const targetStored = aws.objects.get(`${targetRef.key}?versionId=${targetRef.version_id}`);
    const targetMetadata = JSON.parse(targetStored.bytes.toString("utf8"));
    const current = successorRelease();
    const retainedRevocations = {
      revokedReleaseIds: ["amic-os-internal-retired-0.0.1"],
      revokedArtifactSha256s: ["0".repeat(64)],
    };
    const successorRoot = path.join(root, "successor");
    await mkdir(successorRoot);
    const successorReceipt = await executeAmicInternalDistributionPublication({
      aws,
      bindings: bindings(),
      release: current,
      artifactPaths: await fixtureArtifacts(successorRoot, { target: current }),
      revocations: revocations(retainedRevocations),
      rollback: rollbackTo({ current, targetMetadata }),
      privateKey,
      publicationMode: "successor",
      now: NOW,
    });
    assert.equal(successorReceipt.publication_mode, "successor");
    assert.equal(successorReceipt.predecessor_control_kind, "baseline");
    assert.equal(successorReceipt.rollback_target_artifact_readback_complete, true);
    assert.equal(successorReceipt.rollback_target_metadata_renewed, false);
    const firstPointerPut = aws.puts.filter(({ kind }) => kind === "channel_pointer")[0];
    assert.equal(firstPointerPut.ifNoneMatch, "*");
    assert.equal(firstPointerPut.ifMatch, null);
    const successorReadback = await verifyAmicInternalDistributionReadback({
      aws,
      bindings: bindings(),
      channelPointer: successorReceipt.channel_pointer,
      trustedPublicKey: publicKey,
      expectedPublicKeySha256: sha256(publicKey.export({ type: "spki", format: "der" })),
      cloudFrontDomain: "d111111abcdef8.cloudfront.net",
      now: NOW,
    });
    assert.equal(successorReadback.publication_mode, "successor");
    assert.equal(successorReadback.exact_version_read_count, 18);
    assert.equal(successorReadback.rollback_target_artifact_readback_complete, true);

    const currentTargetRef = successorReceipt.objects.update_metadata;
    const currentTargetStored = aws.objects.get(
      `${currentTargetRef.key}?versionId=${currentTargetRef.version_id}`,
    );
    const currentTargetMetadata = JSON.parse(currentTargetStored.bytes.toString("utf8"));
    const next = {
      ...current,
      releaseId: "amic-os-internal-0.1.34",
      releaseSequence: 34,
      version: "0.1.34",
      sourceSha: "f".repeat(40),
      sourceTree: "0".repeat(40),
      predecessor: {
        releaseId: current.releaseId,
        version: current.version,
        sourceSha: current.sourceSha,
        sourceTree: current.sourceTree,
      },
    };
    const nextRoot = path.join(root, "next-successor");
    await mkdir(nextRoot);
    const nextArtifacts = await fixtureArtifacts(nextRoot, { target: next });
    const writesBeforeRegression = aws.puts.length;
    await assert.rejects(
      executeAmicInternalDistributionPublication({
        aws,
        bindings: bindings(),
        release: next,
        artifactPaths: nextArtifacts,
        revocations: revocations(retainedRevocations),
        rollback: rollbackTo({ current: next, targetMetadata: currentTargetMetadata }),
        privateKey,
        publicationMode: "successor",
        now: NOW,
      }),
      /revocation revision must advance/u,
    );
    assert.equal(aws.puts.length, writesBeforeRegression);
    await assert.rejects(
      executeAmicInternalDistributionPublication({
        aws,
        bindings: bindings(),
        release: next,
        artifactPaths: nextArtifacts,
        revocations: revocations({ revision: 2 }),
        rollback: rollbackTo({
          current: next,
          targetMetadata: currentTargetMetadata,
          revocationRevision: 2,
        }),
        privateKey,
        publicationMode: "successor",
        now: NOW,
      }),
      /revoked release cannot be removed/u,
    );
    assert.equal(aws.puts.length, writesBeforeRegression);
    const nextReceipt = await executeAmicInternalDistributionPublication({
      aws,
      bindings: bindings(),
      release: next,
      artifactPaths: nextArtifacts,
      revocations: revocations({ revision: 2, ...retainedRevocations }),
      rollback: rollbackTo({
        current: next,
        targetMetadata: currentTargetMetadata,
        revocationRevision: 2,
      }),
      privateKey,
      publicationMode: "successor",
      now: NOW,
    });
    assert.equal(nextReceipt.publication_mode, "successor");
    assert.equal(nextReceipt.predecessor_control_kind, "channel");
    assert.equal(nextReceipt.rollback_target_artifact_readback_complete, true);
    assert.equal(nextReceipt.rollback_target_metadata_renewed, false);
    const pointerPuts = aws.puts.filter(({ kind }) => kind === "channel_pointer");
    assert.equal(pointerPuts.length, 2);
    assert.equal(pointerPuts[1].ifNoneMatch, null);
    assert.equal(
      pointerPuts[1].ifMatch,
      aws.objects.get(
        `${successorReceipt.channel_pointer.key}?versionId=${successorReceipt.channel_pointer.version_id}`,
      ).etag,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("successor renews rollback metadata without trusting an expired predecessor window", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "amic-os-expired-predecessor-test-"));
  try {
    const aws = new FakeAwsDistribution({
      rollbackTargetPresent: true,
      predecessorControlPresent: false,
    });
    const activeTarget = rollbackAuthorization().targetMetadata;
    aws.seedPredecessorBaselineControl({
      targetMetadata: {
        ...activeTarget,
        generatedAt: "2026-08-01T10:00:00.000Z",
        expiresAt: "2026-08-20T10:00:00.000Z",
      },
    });
    const receipt = await executeAmicInternalDistributionPublication({
      aws,
      bindings: bindings(),
      release: release(),
      artifactPaths: await fixtureArtifacts(root),
      revocations: revocations(),
      rollback: rollbackAuthorization(),
      privateKey,
      publicationMode: "successor",
      now: NOW,
    });
    assert.equal(receipt.predecessor_control_kind, "baseline");
    assert.equal(receipt.rollback_target_metadata_renewed, true);
    assert.equal(aws.puts.at(-1).kind, "channel_pointer");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("successor refuses an existing but non-current rollback target before new writes", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "amic-os-successor-lineage-test-"));
  try {
    const aws = new FakeAwsDistribution({ rollbackTargetPresent: false });
    await executeAmicInternalDistributionPublication({
      aws,
      bindings: bindings(),
      release: release(),
      artifactPaths: await fixtureArtifacts(root),
      privateKey,
      publicationMode: "baseline",
      now: NOW,
    });
    aws.seedRollbackTarget();
    const staleTarget = rollbackAuthorization().targetMetadata;
    const current = {
      ...successorRelease(),
      predecessor: {
        releaseId: staleTarget.releaseId,
        version: staleTarget.version,
        sourceSha: staleTarget.sourceSha,
        sourceTree: staleTarget.sourceTree,
      },
    };
    const successorRoot = path.join(root, "stale-successor");
    await mkdir(successorRoot);
    const writesBefore = aws.puts.length;
    await assert.rejects(
      executeAmicInternalDistributionPublication({
        aws,
        bindings: bindings(),
        release: current,
        artifactPaths: await fixtureArtifacts(successorRoot, { target: current }),
        revocations: revocations(),
        rollback: rollbackTo({ current, targetMetadata: staleTarget }),
        privateKey,
        publicationMode: "successor",
        now: NOW,
      }),
      /Expected values to be strictly equal/u,
    );
    assert.equal(aws.puts.length, writesBefore);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("publication refuses a missing rollback target before uploading the next release", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "amic-os-publication-missing-rollback-"));
  try {
    const aws = new FakeAwsDistribution({
      rollbackTargetPresent: false,
      predecessorControlPresent: true,
    });
    await assert.rejects(
      executeAmicInternalDistributionPublication({
        aws,
        bindings: bindings(),
        release: release(),
        artifactPaths: await fixtureArtifacts(root),
        revocations: revocations(),
        rollback: rollbackAuthorization(),
        privateKey,
        now: NOW,
      }),
      /NoSuchVersion/u,
    );
    assert.equal(aws.puts.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("independent readback rejects a tampered immutable object even when its locator is unchanged", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "amic-os-readback-tamper-"));
  try {
    const aws = new FakeAwsDistribution();
    const receipt = await executeAmicInternalDistributionPublication({
      aws,
      bindings: bindings(),
      release: release(),
      artifactPaths: await fixtureArtifacts(root),
      revocations: revocations(),
      rollback: rollbackAuthorization(),
      privateKey,
      now: NOW,
    });
    const installer = receipt.objects.installer;
    const stored = aws.objects.get(`${installer.key}?versionId=${installer.version_id}`);
    stored.bytes = Buffer.alloc(stored.bytes.length, 0x78);
    await assert.rejects(
      verifyAmicInternalDistributionReadback({
        aws,
        bindings: bindings(),
        channelPointer: receipt.channel_pointer,
        trustedPublicKey: publicKey,
        expectedPublicKeySha256: sha256(publicKey.export({ type: "spki", format: "der" })),
        cloudFrontDomain: "d111111abcdef8.cloudfront.net",
        now: NOW,
      }),
      /installer artifact body hash differs/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("publication never moves the channel pointer when an exact GET readback differs", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "amic-os-publication-failure-"));
  try {
    const aws = new FakeAwsDistribution({ failGetKind: "update_metadata" });
    await assert.rejects(
      executeAmicInternalDistributionPublication({
        aws,
        bindings: bindings(),
        release: release(),
        artifactPaths: await fixtureArtifacts(root),
        revocations: revocations(),
        rollback: rollbackAuthorization(),
        privateKey,
        now: NOW,
      }),
      /update_metadata GET digest differs/u,
    );
    assert.equal(aws.puts.some(({ kind }) => kind === "channel_pointer"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("conditional control commit refuses a competing channel writer", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "amic-os-publication-race-"));
  try {
    const aws = new FakeAwsDistribution({ raceControlKind: "channel_pointer" });
    await assert.rejects(
      executeAmicInternalDistributionPublication({
        aws,
        bindings: bindings(),
        release: release(),
        artifactPaths: await fixtureArtifacts(root),
        revocations: revocations(),
        rollback: rollbackAuthorization(),
        privateKey,
        now: NOW,
      }),
      /PreconditionFailed/u,
    );
    assert.equal(aws.puts.some(({ kind }) => kind === "channel_pointer"), false);
    assert.equal(
      [...aws.objects.keys()].some((locator) =>
        locator.endsWith("?versionId=competing-control-version")),
      true,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("publication refuses incomplete public-access governance and dirty source provenance before upload", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "amic-os-publication-governance-"));
  try {
    const publicAws = new FakeAwsDistribution({ publicAccess: false });
    await assert.rejects(
      executeAmicInternalDistributionPublication({
        aws: publicAws,
        bindings: bindings(),
        release: release(),
        artifactPaths: await fixtureArtifacts(root),
        revocations: revocations(),
        rollback: rollbackAuthorization(),
        privateKey,
        now: NOW,
      }),
      /public access block is incomplete/u,
    );
    assert.equal(publicAws.puts.length, 0);

    const dirtyRoot = path.join(root, "dirty");
    await mkdir(dirtyRoot);
    const cleanAws = new FakeAwsDistribution();
    await assert.rejects(
      executeAmicInternalDistributionPublication({
        aws: cleanAws,
        bindings: bindings(),
        release: release(),
        artifactPaths: await fixtureArtifacts(dirtyRoot, { dirty: true }),
        revocations: revocations(),
        rollback: rollbackAuthorization(),
        privateKey,
        now: NOW,
      }),
      /build manifest source is dirty/u,
    );
    assert.equal(cleanAws.puts.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("metadata signing secret parser accepts only the closed Ed25519 secret and public receipt removes locators", () => {
  const pem = privateKey.export({ type: "pkcs8", format: "pem" });
  const parsed = parseAmicInternalMetadataSigningSecret(JSON.stringify({
    schema_version: AMIC_INTERNAL_METADATA_SIGNING_SECRET_SCHEMA,
    key_id: INTERNAL_UPDATE_KEY_ID,
    private_key_pkcs8_pem: pem,
  }));
  assert.equal(parsed.keyId, INTERNAL_UPDATE_KEY_ID);
  assert.equal(parsed.privateKey.asymmetricKeyType, "ed25519");
  assert.throws(
    () => parseAmicInternalMetadataSigningSecret(JSON.stringify({
      schema_version: AMIC_INTERNAL_METADATA_SIGNING_SECRET_SCHEMA,
      key_id: INTERNAL_UPDATE_KEY_ID,
      private_key_pkcs8_pem: pem,
      api_key: "forbidden",
    })),
    /exact closed schema/u,
  );

  const privateReceipt = {
    schema_version: AMIC_INTERNAL_PUBLICATION_RECEIPT_SCHEMA,
    state: "PASS",
    release_id: "amic-os-internal-0.1.32",
    release_sequence: 32,
    version: "0.1.32",
    source_sha: "a".repeat(40),
    source_tree: "b".repeat(40),
    object_count: 17,
    channel_pointer: {
      key: "internal-unsigned/channel/private/current.json",
      version_id: "private-version-id",
      sha256: "c".repeat(64),
    },
    exact_head_readback_complete: true,
    exact_get_readback_complete: true,
    rollback_target_artifact_readback_complete: true,
    predecessor_control_kind: "baseline",
    rollback_target_metadata_renewed: true,
    channel_pointer_moved_last: true,
    authenticode_status: "not_signed",
    private_distribution: true,
    public_installer_uploaded: false,
    github_release_installer_asset_allowed: false,
    receipt_sha256: "d".repeat(64),
  };
  const safe = sanitizeAmicInternalPublicationReceipt(privateReceipt);
  assert.equal(safe.raw_bucket_included, false);
  assert.equal(safe.raw_object_key_included, false);
  assert.equal(safe.raw_version_id_included, false);
  assert.equal(safe.rollback_target_artifact_readback_complete, true);
  assert.equal(safe.predecessor_control_kind, "baseline");
  assert.equal(safe.rollback_target_metadata_renewed, true);
  assert.equal(JSON.stringify(safe).includes(privateReceipt.channel_pointer.key), false);
  assert.equal(JSON.stringify(safe).includes(privateReceipt.channel_pointer.version_id), false);
});

test("anonymous-access adapter probes only the exact private S3 and CloudFront object", async () => {
  const calls = [];
  const aws = createAmicInternalDistributionAwsCliAdapter({
    region: REGION,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { status: 403 };
    },
  });
  const result = await aws.probeAnonymousAccess({
    bucket: "amic-os-internal-artifacts",
    region: REGION,
    cloudFrontDomain: "d111111abcdef8.cloudfront.net",
    key: "internal-unsigned/channel/scope/current.json",
  });
  assert.deepEqual(result, { s3_status: 403, cloudfront_status: 403 });
  assert.deepEqual(calls.map(({ url }) => url), [
    `https://amic-os-internal-artifacts.s3.${REGION}.amazonaws.com/internal-unsigned/channel/scope/current.json`,
    "https://d111111abcdef8.cloudfront.net/internal-unsigned/channel/scope/current.json",
  ]);
  assert.equal(calls.every(({ options }) => options.method === "HEAD"), true);
  await assert.rejects(
    aws.probeAnonymousAccess({
      bucket: "amic.os.internal",
      region: REGION,
      cloudFrontDomain: "d111111abcdef8.cloudfront.net",
      key: "internal-unsigned/channel/scope/current.json",
    }),
    /bucket is invalid/u,
  );
});
