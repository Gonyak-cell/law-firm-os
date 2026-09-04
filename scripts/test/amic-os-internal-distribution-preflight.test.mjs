import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  INTERNAL_UNSIGNED_REVOCATION_SCHEMA,
  INTERNAL_UNSIGNED_ROLLBACK_SCHEMA,
  INTERNAL_UNSIGNED_UPDATE_CHANNEL,
  INTERNAL_UPDATE_KEY_ID,
  canonicalizeUpdateMetadata,
} from "../../apps/desktop/src/main/updates.js";
import { createDesktopBuildManifest } from "../lib/matter-desktop-provenance.mjs";
import {
  AMIC_INTERNAL_PREFLIGHT_RECEIPT_SCHEMA,
  prepareAmicInternalUnsignedPublication,
} from "../lib/amic-os-internal-distribution-preflight.mjs";
import { AMIC_INTERNAL_PROVENANCE_SCHEMA } from "../lib/amic-os-internal-distribution-publication.mjs";

const NOW = Date.parse("2026-09-04T00:00:00.000Z");
const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const VERSION = "0.1.32";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function base64(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64");
}

function release() {
  return {
    releaseId: "amic-os-internal-0.1.32",
    releaseSequence: 32,
    version: VERSION,
    lawosTenantId: "amic-internal",
    installationId: "JWS-GALAXYBOOK-amic-os",
    appId: "com.amic.matter.desktop.internal",
    keyId: INTERNAL_UPDATE_KEY_ID,
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    platform: "win32",
    architecture: "x64",
    predecessor: {
      releaseId: "amic-os-internal-0.1.31",
      version: "0.1.31",
      sourceSha: "1".repeat(40),
      sourceTree: "2".repeat(40),
    },
    generatedAt: "2026-09-03T23:00:00.000Z",
    expiresAt: "2026-09-10T23:00:00.000Z",
  };
}

function revocations() {
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
    generatedAt: "2026-09-03T23:00:00.000Z",
    expiresAt: "2026-09-10T23:00:00.000Z",
  };
}

function rollback() {
  const current = release();
  const targetFilename = "AMIC-OS-internal-0.1.31-win-x64.exe";
  const targetMetadata = {
    schemaVersion: "law-firm-os.matter-desktop-internal-unsigned-update.v2",
    releaseId: current.predecessor.releaseId,
    version: current.predecessor.version,
    channel: INTERNAL_UNSIGNED_UPDATE_CHANNEL,
    lawosTenantId: current.lawosTenantId,
    installationId: current.installationId,
    appId: current.appId,
    keyId: current.keyId,
    sourceSha: current.predecessor.sourceSha,
    sourceTree: current.predecessor.sourceTree,
    predecessorReleaseId: "amic-os-internal-0.1.30",
    predecessorVersion: "0.1.30",
    predecessorSourceSha: "3".repeat(40),
    predecessorSourceTree: "4".repeat(40),
    releaseSequence: 31,
    platform: "win32",
    architecture: "x64",
    artifactFilename: targetFilename,
    artifactObjectKey: [
      INTERNAL_UNSIGNED_UPDATE_CHANNEL,
      "win32",
      "x64",
      current.predecessor.version,
      current.predecessor.sourceSha,
      "c".repeat(64),
      targetFilename,
    ].join("/"),
    artifactSha256: "c".repeat(64),
    artifactBytes: 1024,
    artifactVersionId: "s3-version-031",
    releaseManifestSha256: "e".repeat(64),
    authenticodeStatus: "not_signed",
    distribution: "private",
    managedDeviceOnly: true,
    publicReleaseAllowed: false,
    generatedAt: "2026-09-03T23:00:00.000Z",
    expiresAt: "2026-09-10T23:00:00.000Z",
  };
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
    targetReleaseId: current.predecessor.releaseId,
    targetVersion: current.predecessor.version,
    targetSourceSha: current.predecessor.sourceSha,
    targetSourceTree: current.predecessor.sourceTree,
    targetArtifactSha256: "c".repeat(64),
    targetArtifactVersionId: "s3-version-031",
    targetMetadata,
    targetMetadataSha256: sha256(
      Buffer.from(`${canonicalizeUpdateMetadata(targetMetadata)}\n`),
    ),
    revocationRevision: 1,
    reasonCode: "operator_verified_regression",
    generatedAt: "2026-09-03T23:30:00.000Z",
    expiresAt: "2026-09-04T01:00:00.000Z",
  };
}

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "amic-os-publish-preflight-"));
  const repo = path.join(root, "repo");
  const runner = path.join(root, "runner");
  await mkdir(path.join(repo, "apps/desktop/dist/win-unpacked/resources"), { recursive: true });
  await mkdir(runner);
  const installerPath = path.join(repo, `apps/desktop/dist/AMIC-OS-internal-${VERSION}-win-x64.exe`);
  const installerBytes = Buffer.from("synthetic internal unsigned installer\n");
  await writeFile(installerPath, installerBytes);
  const manifest = createDesktopBuildManifest({
    version: VERSION,
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    sourceDirty: false,
    renderer: {
      sha256: "e".repeat(64),
      file_count: 12,
      algorithm: "sha256(sorted sha256 file manifest with ./ relative paths)",
    },
    channel: "internal",
    platform: "win32",
    arch: "x64",
    appId: "com.amic.matter.desktop.internal",
    builtAt: "2026-09-03T23:15:00.000Z",
  });
  await writeFile(
    path.join(repo, "apps/desktop/dist/win-unpacked/resources/matter-build-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  const privacy = {
    valid: true,
    file_count: 50,
    finding_count: 0,
    forbidden_path_count: 0,
    findings: [],
    bundled_local_api: false,
    roster_included: false,
    contacts_included: false,
    photos_included: false,
    registration_seed_included: false,
    credential_file_included: false,
    private_key_file_included: false,
    opaque_asar_included: false,
    private_source_file_count: 17,
    private_source_digest_count: 17,
    private_source_content_match_count: 0,
    private_source_content_scan: "verified",
  };
  const buildResult = {
    verdict: "PASS",
    installer: `apps/desktop/dist/AMIC-OS-internal-${VERSION}-win-x64.exe`,
    installer_sha256: sha256(installerBytes),
    installer_bytes: installerBytes.byteLength,
    release_channel: "internal",
    app_id: "com.amic.matter.desktop.internal",
    distribution_profile: "internal-unsigned",
    installer_source_sha: SOURCE_SHA,
    installer_source_tree: SOURCE_TREE,
    installer_source_dirty: false,
    installer_build_manifest: "apps/desktop/dist/win-unpacked/resources/matter-build-manifest.json",
    installer_internal_unsigned_marker: true,
    internal_unsigned_privacy_audit: privacy,
    windows_authenticode_signing: false,
    windows_authenticode_not_signed_verified: true,
    windows_authenticode_signature_verified: false,
    windows_authenticode_timestamp_verified: false,
    windows_authenticode_signer_certificate_sha1: null,
    windows_authenticode_signer: null,
    windows_authenticode_timestamps: [],
  };
  const buildResultPath = path.join(runner, "build-result.json");
  await writeFile(buildResultPath, `${JSON.stringify(buildResult, null, 2)}\n`);
  const rawSbomPath = path.join(runner, "raw-sbom.json");
  await writeFile(rawSbomPath, `${JSON.stringify({
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    version: 1,
    metadata: { component: { type: "application", name: "law-firm-os", version: VERSION } },
    components: [{ type: "library", name: "electron", version: "42.7.0", "bom-ref": "electron" }],
  })}\n`);
  return { root, repo, runner, buildResult, buildResultPath, rawSbomPath };
}

function options(fixture, overrides = {}) {
  return {
    repoRoot: fixture.repo,
    outputDir: path.join(fixture.runner, "prepared"),
    buildResultPath: fixture.buildResultPath,
    rawSbomPath: fixture.rawSbomPath,
    releaseBase64: base64(release()),
    revocationsBase64: base64(revocations()),
    rollbackBase64: base64(rollback()),
    bindings: {
      accountId: "770880870480",
      region: "ap-northeast-2",
      bucket: "amic-os-internal-artifacts",
      accessLogBucket: "amic-os-internal-access-logs",
      kmsKeyArn: "arn:aws:kms:ap-northeast-2:770880870480:key/11111111-1111-4111-8111-111111111111",
      retainUntil: "2027-09-05T00:00:00.000Z",
    },
    runner: {
      repository: "Gonyak-cell/law-firm-os",
      ref: "refs/heads/main",
      sha: SOURCE_SHA,
      workflowRef: "Gonyak-cell/law-firm-os/.github/workflows/amic-os-internal-unsigned-publish.yml@refs/heads/main",
      runId: "12345",
      runAttempt: "1",
      environment: "github-hosted",
    },
    now: NOW,
    ...overrides,
  };
}

test("publication preflight binds a clean NotSigned package, SBOM, lineage, and no-seed evidence", async () => {
  const value = await fixture();
  try {
    const result = await prepareAmicInternalUnsignedPublication(options(value));
    assert.equal(result.schema_version, AMIC_INTERNAL_PREFLIGHT_RECEIPT_SCHEMA);
    assert.equal(result.state, "PASS");
    assert.equal(result.output_file_count, 8);
    assert.equal(result.installer_sha256, value.buildResult.installer_sha256);
    const provenance = JSON.parse(await readFile(result.paths.provenance, "utf8"));
    assert.equal(provenance.schema_version, AMIC_INTERNAL_PROVENANCE_SCHEMA);
    assert.equal(provenance.authenticode_status, "NotSigned");
    assert.equal(provenance.internal_unsigned_privacy_audit, true);
    assert.equal(provenance.real_contact_seed_included, false);
    assert.equal(provenance.real_photo_seed_included, false);
    assert.equal(provenance.real_registration_seed_included, false);
    assert.equal(provenance.credentials_included, false);
    assert.equal(provenance.public_release, false);
    const sbom = JSON.parse(await readFile(result.paths.sbom, "utf8"));
    const properties = Object.fromEntries(
      sbom.metadata.component.properties.map(({ name, value: propertyValue }) => [name, propertyValue]),
    );
    assert.equal(properties["law-firm-os:installer-sha256"], value.buildResult.installer_sha256);
    assert.equal(properties["law-firm-os:authenticode-status"], "not_signed");
    assert.equal(properties["law-firm-os:real-photo-seed-included"], "false");
    assert.equal(sbom.components.some(({ "bom-ref": ref }) => ref === `urn:sha256:${result.installer_sha256}`), true);
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});

test("baseline preflight emits no revocation or rollback input", async () => {
  const value = await fixture();
  try {
    const result = await prepareAmicInternalUnsignedPublication(options(value, {
      publicationMode: "baseline",
      revocationsBase64: undefined,
      rollbackBase64: undefined,
    }));
    assert.equal(result.schema_version, AMIC_INTERNAL_PREFLIGHT_RECEIPT_SCHEMA);
    assert.equal(result.state, "PASS");
    assert.equal(result.publication_mode, "baseline");
    assert.equal(result.output_file_count, 6);
    assert.equal(result.revocation_revision, null);
    assert.equal(result.rollback_id, null);
    assert.equal(Object.hasOwn(result.paths, "revocations"), false);
    assert.equal(Object.hasOwn(result.paths, "rollback"), false);
    await assert.rejects(
      prepareAmicInternalUnsignedPublication(options(value, {
        outputDir: path.join(value.runner, "prepared-with-rollback"),
        publicationMode: "baseline",
        revocationsBase64: undefined,
        rollbackBase64: base64(rollback()),
      })),
      /baseline preflight cannot include rollback authorization/u,
    );
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});

test("publication preflight fails before output on a privacy or predecessor mismatch", async () => {
  const value = await fixture();
  try {
    const releaseWithExtraField = release();
    releaseWithExtraField.api_key = "must-never-be-carried-through";
    await assert.rejects(
      prepareAmicInternalUnsignedPublication(options(value, {
        releaseBase64: base64(releaseWithExtraField),
      })),
      /release document schema differs/u,
    );
    const releaseWithExtraPredecessorField = release();
    releaseWithExtraPredecessorField.predecessor.object_key = "private/control/key";
    await assert.rejects(
      prepareAmicInternalUnsignedPublication(options(value, {
        releaseBase64: base64(releaseWithExtraPredecessorField),
      })),
      /release predecessor schema differs/u,
    );
    await assert.rejects(
      prepareAmicInternalUnsignedPublication(options(value, {
        bindings: {
          ...options(value).bindings,
          metadata_signing_private_key: "must-never-be-carried-through",
        },
      })),
      /distribution bindings schema differs/u,
    );
    const unsafe = structuredClone(value.buildResult);
    unsafe.internal_unsigned_privacy_audit.photos_included = true;
    await writeFile(value.buildResultPath, `${JSON.stringify(unsafe, null, 2)}\n`);
    await assert.rejects(
      prepareAmicInternalUnsignedPublication(options(value)),
      /photos_included differs/u,
    );
    await writeFile(value.buildResultPath, `${JSON.stringify(value.buildResult, null, 2)}\n`);
    const wrongRollback = rollback();
    wrongRollback.targetReleaseId = "amic-os-internal-0.1.30";
    wrongRollback.targetMetadata.releaseId = wrongRollback.targetReleaseId;
    wrongRollback.targetMetadataSha256 = sha256(
      Buffer.from(`${canonicalizeUpdateMetadata(wrongRollback.targetMetadata)}\n`),
    );
    await assert.rejects(
      prepareAmicInternalUnsignedPublication(options(value, {
        rollbackBase64: base64(wrongRollback),
      })),
      /Expected values to be strictly equal/u,
    );
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});
