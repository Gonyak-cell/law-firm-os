import assert from "node:assert/strict";
import { createHash, createPublicKey, verify as verifyBytes } from "node:crypto";
import {
  INTERNAL_UNSIGNED_UPDATE_CHANNEL,
  INTERNAL_UPDATE_KEY_ID,
  canonicalizeUpdateMetadata,
  verifyAndParseInternalUnsignedRevocationsBytes,
  verifyAndParseInternalUnsignedRollbackBytes,
  verifyAndParseUpdateMetadataBytes,
} from "../../apps/desktop/src/main/updates.js";
import {
  AMIC_INTERNAL_BASELINE_DOCUMENT_SCHEMA,
  AMIC_INTERNAL_BASELINE_ENVELOPE_SCHEMA,
  AMIC_INTERNAL_CHANNEL_DOCUMENT_SCHEMA,
  AMIC_INTERNAL_CHANNEL_ENVELOPE_SCHEMA,
  AMIC_INTERNAL_RELEASE_MANIFEST_SCHEMA,
  amicInternalBaselineScopeKey,
  amicInternalChannelScopeKey,
  verifyAmicInternalRollbackTargetArtifact,
} from "./amic-os-internal-distribution-publication.mjs";

export const AMIC_INTERNAL_READBACK_RECEIPT_SCHEMA =
  "law-firm-os.amic-internal-unsigned-independent-readback.v1";
export const AMIC_INTERNAL_BASELINE_READBACK_RECEIPT_SCHEMA =
  "law-firm-os.amic-internal-unsigned-baseline-independent-readback.v1";

const SHA256 = /^[0-9a-f]{64}$/u;
const VERSION_ID = /^[A-Za-z0-9][A-Za-z0-9._+=/-]{0,1023}$/u;
const BUCKET = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/u;
const OBJECT_MAX_BYTES = Object.freeze({
  installer: 2 * 1024 * 1024 * 1024,
  build_manifest: 16 * 1024 * 1024,
  sbom: 64 * 1024 * 1024,
  provenance: 16 * 1024 * 1024,
  release_manifest: 1024 * 1024,
  release_manifest_signature: 64,
  update_metadata: 64 * 1024,
  update_metadata_signature: 64,
  revocations: 64 * 1024,
  revocations_signature: 64,
  rollback: 64 * 1024,
  rollback_signature: 64,
  rollback_target_metadata: 64 * 1024,
  rollback_target_metadata_signature: 64,
  channel_document: 1024 * 1024,
  channel_signature: 64,
  channel_pointer: 2 * 1024 * 1024,
  baseline_marker: 2 * 1024 * 1024,
});
const ARTIFACT_KINDS = Object.freeze(["build_manifest", "installer", "provenance", "sbom"]);
const RELEASE_MANIFEST_FIELDS = Object.freeze([
  "app_id",
  "architecture",
  "artifacts",
  "authenticode_status",
  "channel",
  "credentials_included",
  "distribution",
  "expires_at",
  "generated_at",
  "installation_id",
  "lawos_tenant_id",
  "managed_device_only",
  "platform",
  "predecessor",
  "public_release_allowed",
  "real_contact_seed_included",
  "real_photo_seed_included",
  "real_registration_seed_included",
  "release_id",
  "release_sequence",
  "schema_version",
  "source_sha",
  "source_tree",
  "version",
]);

function exactFields(value, fields, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} is not an object`);
  assert.deepEqual(Object.keys(value).sort(), [...fields].sort(), `${label} schema differs`);
  return value;
}

function canonicalBytes(value) {
  return Buffer.from(`${canonicalizeUpdateMetadata(value)}\n`);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalBase64(value, label) {
  assert.equal(typeof value, "string", `${label} is not base64 text`);
  const bytes = Buffer.from(value, "base64");
  assert.ok(bytes.byteLength > 0 && bytes.toString("base64") === value, `${label} is not canonical base64`);
  return bytes;
}

function parseCanonicalJson(bytes, label) {
  let source;
  try { source = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw new Error(`${label} is not valid UTF-8`); }
  assert.equal(source.includes("\0"), false, `${label} contains a NUL byte`);
  let value;
  try { value = JSON.parse(source); }
  catch { throw new Error(`${label} is not valid JSON`); }
  assert.deepEqual(Buffer.from(bytes), canonicalBytes(value), `${label} is not canonical JSON`);
  return value;
}

function verifyDetached(documentBytes, signatureBytes, publicKey, label) {
  assert.equal(signatureBytes.byteLength, 64, `${label} signature length differs`);
  assert.equal(
    verifyBytes(null, documentBytes, publicKey, signatureBytes),
    true,
    `${label} signature is invalid`,
  );
}

function validateObjectRef(value, label, expectedKind = null) {
  exactFields(value, ["bytes", "key", "kind", "sha256", "version_id"], label);
  assert.ok(Object.hasOwn(OBJECT_MAX_BYTES, value.kind), `${label} kind is invalid`);
  if (expectedKind) assert.equal(value.kind, expectedKind, `${label} kind differs`);
  assert.match(value.sha256, SHA256, `${label} digest is invalid`);
  assert.ok(
    Number.isSafeInteger(value.bytes)
      && value.bytes > 0
      && value.bytes <= OBJECT_MAX_BYTES[value.kind],
    `${label} byte count is invalid`,
  );
  assert.match(value.version_id, VERSION_ID, `${label} VersionId is invalid`);
  assert.equal(typeof value.key, "string");
  assert.ok(value.key.startsWith("internal-unsigned/"), `${label} key escaped its prefix`);
  return value;
}

async function readExactObject({ aws, bindings, ref, label }) {
  validateObjectRef(ref, label);
  const response = await aws.getObjectBody({
    bucket: bindings.bucket,
    key: ref.key,
    versionId: ref.version_id,
    expectedOwner: bindings.accountId,
  });
  assert.equal(response?.VersionId, ref.version_id, `${label} VersionId differs`);
  assert.equal(Number(response?.ContentLength), ref.bytes, `${label} byte count differs`);
  assert.equal(response?.ServerSideEncryption, "aws:kms", `${label} encryption differs`);
  assert.equal(response?.SSEKMSKeyId, bindings.kmsKeyArn, `${label} KMS key differs`);
  assert.equal(
    response?.ChecksumSHA256,
    Buffer.from(ref.sha256, "hex").toString("base64"),
    `${label} provider checksum differs`,
  );
  assert.equal(response?.ObjectLockMode, "COMPLIANCE", `${label} Object Lock mode differs`);
  assert.equal(
    new Date(response?.ObjectLockRetainUntilDate).toISOString(),
    bindings.retainUntil,
    `${label} retention differs`,
  );
  assert.equal(response?.Metadata?.["artifact-sha256"], ref.sha256, `${label} metadata hash differs`);
  assert.equal(response?.Metadata?.["artifact-kind"], ref.kind, `${label} metadata kind differs`);
  const body = Buffer.from(response?.body ?? []);
  assert.equal(body.byteLength, ref.bytes, `${label} body is partial`);
  assert.equal(sha256(body), ref.sha256, `${label} body hash differs`);
  return body;
}

function assertCurrentWindow(document, now, label) {
  assert.equal(new Date(document.generated_at).toISOString(), document.generated_at, `${label} generated_at differs`);
  assert.equal(new Date(document.expires_at).toISOString(), document.expires_at, `${label} expires_at differs`);
  assert.ok(Date.parse(document.generated_at) <= now, `${label} is not active yet`);
  assert.ok(Date.parse(document.expires_at) > now, `${label} is expired`);
}

function assertCurrentCamelWindow(document, now, label) {
  assert.equal(new Date(document.generatedAt).toISOString(), document.generatedAt, `${label} generatedAt differs`);
  assert.equal(new Date(document.expiresAt).toISOString(), document.expiresAt, `${label} expiresAt differs`);
  assert.ok(Date.parse(document.generatedAt) <= now, `${label} is not active yet`);
  assert.ok(Date.parse(document.expiresAt) > now, `${label} is expired`);
}

function validateBindings(bindings) {
  exactFields(bindings, [
    "accessLogBucket",
    "accountId",
    "bucket",
    "kmsKeyArn",
    "region",
    "retainUntil",
  ], "readback bindings");
  assert.match(bindings.accountId ?? "", /^[0-9]{12}$/u, "readback AWS account is invalid");
  assert.match(bindings.region ?? "", /^[a-z]{2}(?:-gov)?-[a-z]+-\d$/u, "readback AWS region is invalid");
  assert.match(bindings.bucket ?? "", BUCKET, "readback artifact bucket is invalid");
  assert.match(bindings.accessLogBucket ?? "", BUCKET, "readback access-log bucket is invalid");
  assert.match(
    bindings.kmsKeyArn ?? "",
    new RegExp(`^arn:aws:kms:${bindings.region}:${bindings.accountId}:key/[0-9a-f-]{36}$`, "u"),
    "readback KMS key ARN is invalid",
  );
  assert.equal(new Date(bindings.retainUntil).toISOString(), bindings.retainUntil);
  return bindings;
}

function validateTrustRoot(trustedPublicKey, expectedPublicKeySha256) {
  const publicKey = trustedPublicKey?.type === "public"
    ? trustedPublicKey
    : createPublicKey(trustedPublicKey);
  assert.equal(publicKey.asymmetricKeyType, "ed25519", "readback trust root must be Ed25519");
  const publicDer = publicKey.export({ type: "spki", format: "der" });
  assert.equal(sha256(publicDer), expectedPublicKeySha256, "readback public key fingerprint differs");
  return publicKey;
}

async function listExactControlHistory({ aws, bindings, key, label }) {
  const response = await aws.listObjectVersions({
    bucket: bindings.bucket,
    prefix: key,
    expectedOwner: bindings.accountId,
  });
  const versions = Array.isArray(response?.Versions) ? response.Versions : [];
  const deleteMarkers = Array.isArray(response?.DeleteMarkers) ? response.DeleteMarkers : [];
  assert.equal(
    [...versions, ...deleteMarkers].every((entry) => entry?.Key === key),
    true,
    `${label} history escaped its exact key`,
  );
  return Object.freeze({ versions, deleteMarkers });
}

export async function verifyAmicInternalBaselineReadback({
  aws,
  bindings,
  baselineMarker,
  trustedPublicKey,
  expectedPublicKeySha256,
  cloudFrontDomain,
  now = Date.now(),
} = {}) {
  assert.ok(aws?.getObjectBody && aws?.listObjectVersions && aws?.probeAnonymousAccess,
    "baseline independent readback adapter is incomplete");
  validateBindings(bindings);
  const publicKey = validateTrustRoot(trustedPublicKey, expectedPublicKeySha256);
  validateObjectRef(baselineMarker, "baseline marker", "baseline_marker");
  assert.ok(
    baselineMarker.key.startsWith("internal-unsigned/baseline/"),
    "baseline marker key is invalid",
  );

  const markerBytes = await readExactObject({
    aws,
    bindings,
    ref: baselineMarker,
    label: "baseline marker",
  });
  const envelope = exactFields(parseCanonicalJson(markerBytes, "baseline marker"), [
    "baseline_marker_written_after_all_object_readbacks",
    "channel_pointer_published",
    "document_base64",
    "document_sha256",
    "key_id",
    "public_release_allowed",
    "rollback_authorization_published",
    "runtime_discoverable",
    "schema_version",
    "signature_base64",
    "signature_sha256",
  ], "baseline marker");
  assert.equal(envelope.schema_version, AMIC_INTERNAL_BASELINE_ENVELOPE_SCHEMA);
  assert.equal(envelope.key_id, INTERNAL_UPDATE_KEY_ID);
  assert.equal(envelope.baseline_marker_written_after_all_object_readbacks, true);
  assert.equal(envelope.channel_pointer_published, false);
  assert.equal(envelope.rollback_authorization_published, false);
  assert.equal(envelope.runtime_discoverable, false);
  assert.equal(envelope.public_release_allowed, false);
  const documentBytes = canonicalBase64(envelope.document_base64, "baseline document");
  const signatureBytes = canonicalBase64(envelope.signature_base64, "baseline signature");
  assert.equal(sha256(documentBytes), envelope.document_sha256);
  assert.equal(sha256(signatureBytes), envelope.signature_sha256);
  verifyDetached(documentBytes, signatureBytes, publicKey, "baseline document");

  const baseline = exactFields(parseCanonicalJson(documentBytes, "baseline document"), [
    "app_id",
    "architecture",
    "channel",
    "channel_pointer_published",
    "expires_at",
    "generated_at",
    "installation_id",
    "key_id",
    "lawos_tenant_id",
    "platform",
    "publication_mode",
    "public_release_allowed",
    "release_id",
    "release_manifest",
    "release_manifest_signature",
    "release_sequence",
    "rollback_authorization_published",
    "runtime_discoverable",
    "schema_version",
    "source_sha",
    "source_tree",
    "update_metadata",
    "update_metadata_signature",
    "version",
  ], "baseline document");
  assert.equal(baseline.schema_version, AMIC_INTERNAL_BASELINE_DOCUMENT_SCHEMA);
  assert.equal(baseline.publication_mode, "baseline");
  assert.equal(baseline.channel, INTERNAL_UNSIGNED_UPDATE_CHANNEL);
  assert.equal(baseline.app_id, "com.amic.matter.desktop.internal");
  assert.equal(baseline.key_id, INTERNAL_UPDATE_KEY_ID);
  assert.equal(baseline.platform, "win32");
  assert.equal(baseline.architecture, "x64");
  assert.equal(baseline.channel_pointer_published, false);
  assert.equal(baseline.rollback_authorization_published, false);
  assert.equal(baseline.runtime_discoverable, false);
  assert.equal(baseline.public_release_allowed, false);
  assertCurrentWindow(baseline, now, "baseline document");

  const scope = {
    lawosTenantId: baseline.lawos_tenant_id,
    installationId: baseline.installation_id,
  };
  const expectedBaselineKey = amicInternalBaselineScopeKey(scope);
  const expectedChannelKey = amicInternalChannelScopeKey(scope);
  assert.equal(baselineMarker.key, expectedBaselineKey, "baseline marker scope key differs");
  const [baselineHistory, channelHistory] = await Promise.all([
    listExactControlHistory({
      aws,
      bindings,
      key: expectedBaselineKey,
      label: "baseline marker",
    }),
    listExactControlHistory({
      aws,
      bindings,
      key: expectedChannelKey,
      label: "baseline channel",
    }),
  ]);
  assert.equal(baselineHistory.deleteMarkers.length, 0,
    "baseline marker history contains a delete marker");
  assert.equal(baselineHistory.versions.length, 1,
    "baseline marker must be the only immutable version in its scope");
  assert.equal(baselineHistory.versions[0]?.VersionId, baselineMarker.version_id,
    "baseline marker history VersionId differs");
  assert.equal(baselineHistory.versions[0]?.IsLatest, true,
    "baseline marker is not the current immutable version");
  assert.equal(channelHistory.versions.length, 0,
    "baseline scope already has a channel version");
  assert.equal(channelHistory.deleteMarkers.length, 0,
    "baseline scope already has a channel delete marker");

  const metadataNames = [
    "release_manifest",
    "release_manifest_signature",
    "update_metadata",
    "update_metadata_signature",
  ];
  for (const name of metadataNames) validateObjectRef(baseline[name], name, name);
  const metadataBodies = Object.fromEntries(await Promise.all(metadataNames.map(async (name) => [
    name,
    await readExactObject({ aws, bindings, ref: baseline[name], label: name }),
  ])));
  verifyDetached(
    metadataBodies.release_manifest,
    metadataBodies.release_manifest_signature,
    publicKey,
    "release manifest",
  );
  const manifest = exactFields(
    parseCanonicalJson(metadataBodies.release_manifest, "release manifest"),
    RELEASE_MANIFEST_FIELDS,
    "release manifest",
  );
  assert.equal(manifest.schema_version, AMIC_INTERNAL_RELEASE_MANIFEST_SCHEMA);
  for (const [left, right] of [
    [manifest.release_id, baseline.release_id],
    [manifest.release_sequence, baseline.release_sequence],
    [manifest.version, baseline.version],
    [manifest.source_sha, baseline.source_sha],
    [manifest.source_tree, baseline.source_tree],
    [manifest.lawos_tenant_id, baseline.lawos_tenant_id],
    [manifest.installation_id, baseline.installation_id],
  ]) assert.equal(left, right, "release manifest differs from baseline document");
  assert.equal(manifest.authenticode_status, "not_signed");
  assert.equal(manifest.distribution, "private");
  assert.equal(manifest.managed_device_only, true);
  assert.equal(manifest.public_release_allowed, false);
  assert.equal(manifest.real_contact_seed_included, false);
  assert.equal(manifest.real_photo_seed_included, false);
  assert.equal(manifest.real_registration_seed_included, false);
  assert.equal(manifest.credentials_included, false);
  assertCurrentWindow(manifest, now, "release manifest");
  assert.deepEqual(Object.keys(manifest.artifacts).sort(), ARTIFACT_KINDS);
  for (const kind of ARTIFACT_KINDS) {
    validateObjectRef(manifest.artifacts[kind], `${kind} artifact`, kind);
  }

  const allObjectRefs = [
    baselineMarker,
    ...metadataNames.map((name) => baseline[name]),
    ...ARTIFACT_KINDS.map((kind) => manifest.artifacts[kind]),
  ];
  assert.equal(allObjectRefs.length, 9);
  assert.equal(
    new Set(allObjectRefs.map(({ key, version_id: versionId }) => `${key}\0${versionId}`)).size,
    9,
    "baseline readback object references are not unique",
  );
  let sourceArtifactByteCount = 0;
  for (const kind of ARTIFACT_KINDS) {
    const artifact = await readExactObject({
      aws,
      bindings,
      ref: manifest.artifacts[kind],
      label: `${kind} artifact`,
    });
    sourceArtifactByteCount += artifact.byteLength;
    assert.ok(Number.isSafeInteger(sourceArtifactByteCount));
  }

  const update = verifyAndParseUpdateMetadataBytes({
    metadataBytes: metadataBodies.update_metadata,
    signatureBytes: metadataBodies.update_metadata_signature,
    trustedKeyId: INTERNAL_UPDATE_KEY_ID,
    trustedPublicKeys: { [INTERNAL_UPDATE_KEY_ID]: publicKey },
  });
  assert.equal(update.valid, true, `baseline update metadata failed: ${update.reason}`);
  assert.equal(update.metadata.releaseId, baseline.release_id);
  assert.equal(update.metadata.releaseSequence, baseline.release_sequence);
  assert.equal(update.metadata.version, baseline.version);
  assert.equal(update.metadata.sourceSha, baseline.source_sha);
  assert.equal(update.metadata.sourceTree, baseline.source_tree);
  assert.equal(update.metadata.lawosTenantId, baseline.lawos_tenant_id);
  assert.equal(update.metadata.installationId, baseline.installation_id);
  assert.equal(update.metadata.appId, baseline.app_id);
  assert.equal(update.metadata.platform, baseline.platform);
  assert.equal(update.metadata.architecture, baseline.architecture);
  assert.equal(update.metadata.releaseManifestSha256, baseline.release_manifest.sha256);
  assert.equal(update.metadata.artifactObjectKey, manifest.artifacts.installer.key);
  assert.equal(update.metadata.artifactVersionId, manifest.artifacts.installer.version_id);
  assert.equal(update.metadata.artifactSha256, manifest.artifacts.installer.sha256);
  assert.equal(update.metadata.artifactBytes, manifest.artifacts.installer.bytes);
  assert.equal(update.metadata.predecessorReleaseId, manifest.predecessor.release_id);
  assert.equal(update.metadata.predecessorVersion, manifest.predecessor.version);
  assert.equal(update.metadata.predecessorSourceSha, manifest.predecessor.source_sha);
  assert.equal(update.metadata.predecessorSourceTree, manifest.predecessor.source_tree);
  assertCurrentCamelWindow(update.metadata, now, "baseline update metadata");

  const anonymous = await aws.probeAnonymousAccess({
    bucket: bindings.bucket,
    region: bindings.region,
    cloudFrontDomain,
    key: baselineMarker.key,
  });
  assert.ok([401, 403, 404].includes(anonymous?.s3_status), "anonymous S3 baseline access did not fail closed");
  assert.ok([401, 403, 404].includes(anonymous?.cloudfront_status),
    "unsigned CloudFront baseline access did not fail closed");

  const receipt = {
    schema_version: AMIC_INTERNAL_BASELINE_READBACK_RECEIPT_SCHEMA,
    state: "PASS",
    publication_mode: "baseline",
    release_id: baseline.release_id,
    release_sequence: baseline.release_sequence,
    version: baseline.version,
    source_sha: baseline.source_sha,
    source_tree: baseline.source_tree,
    object_count: 9,
    exact_version_read_count: 9,
    public_key_sha256: expectedPublicKeySha256,
    baseline_marker_sha256: baselineMarker.sha256,
    artifact_sha256: manifest.artifacts.installer.sha256,
    artifact_bytes: manifest.artifacts.installer.bytes,
    update_metadata_sha256: baseline.update_metadata.sha256,
    channel_pointer_published: false,
    channel_history_absent: true,
    rollback_authorization_published: false,
    runtime_discoverable: false,
    baseline_established: true,
    baseline_marker_only_version: true,
    anonymous_s3_denied: true,
    unsigned_cloudfront_denied: true,
    authenticode_status: "not_signed",
    private_distribution: true,
    public_installer_available: false,
    raw_object_locator_included: false,
    raw_secret_included: false,
    source_artifact_byte_count: sourceArtifactByteCount,
  };
  return Object.freeze({
    ...receipt,
    receipt_sha256: sha256(canonicalBytes(receipt)),
  });
}

export async function verifyAmicInternalDistributionReadback({
  aws,
  bindings,
  channelPointer,
  trustedPublicKey,
  expectedPublicKeySha256,
  cloudFrontDomain,
  now = Date.now(),
} = {}) {
  assert.ok(
    aws?.headObject && aws?.getObject && aws?.getObjectBody && aws?.probeAnonymousAccess,
    "independent readback adapter is incomplete",
  );
  validateBindings(bindings);
  const publicKey = validateTrustRoot(trustedPublicKey, expectedPublicKeySha256);
  assert.match(channelPointer?.sha256 ?? "", SHA256, "channel pointer digest is invalid");
  assert.match(channelPointer?.version_id ?? "", VERSION_ID, "channel pointer VersionId is invalid");
  assert.ok(channelPointer?.key?.startsWith("internal-unsigned/channel/"), "channel pointer key is invalid");

  const pointerBytes = await readExactObject({
    aws,
    bindings,
    ref: {
      kind: "channel_pointer",
      key: channelPointer.key,
      version_id: channelPointer.version_id,
      sha256: channelPointer.sha256,
      bytes: channelPointer.bytes,
    },
    label: "channel pointer",
  });
  const envelope = exactFields(parseCanonicalJson(pointerBytes, "channel pointer"), [
    "channel_pointer_moved_after_all_object_readbacks",
    "document_base64",
    "document_object",
    "document_sha256",
    "key_id",
    "public_release_allowed",
    "schema_version",
    "signature_base64",
    "signature_object",
    "signature_sha256",
  ], "channel pointer");
  assert.equal(envelope.schema_version, AMIC_INTERNAL_CHANNEL_ENVELOPE_SCHEMA);
  assert.equal(envelope.key_id, INTERNAL_UPDATE_KEY_ID);
  assert.equal(envelope.channel_pointer_moved_after_all_object_readbacks, true);
  assert.equal(envelope.public_release_allowed, false);
  validateObjectRef(envelope.document_object, "channel document object", "channel_document");
  validateObjectRef(envelope.signature_object, "channel signature object", "channel_signature");
  const channelBytes = canonicalBase64(envelope.document_base64, "channel document");
  const channelSignature = canonicalBase64(envelope.signature_base64, "channel document signature");
  assert.equal(sha256(channelBytes), envelope.document_sha256);
  assert.equal(sha256(channelSignature), envelope.signature_sha256);
  verifyDetached(channelBytes, channelSignature, publicKey, "channel document");
  assert.deepEqual(
    await readExactObject({ aws, bindings, ref: envelope.document_object, label: "channel document object" }),
    channelBytes,
  );
  assert.deepEqual(
    await readExactObject({ aws, bindings, ref: envelope.signature_object, label: "channel signature object" }),
    channelSignature,
  );

  const channel = exactFields(parseCanonicalJson(channelBytes, "channel document"), [
    "app_id",
    "architecture",
    "channel",
    "expires_at",
    "generated_at",
    "installation_id",
    "key_id",
    "lawos_tenant_id",
    "platform",
    "public_release_allowed",
    "release_id",
    "release_manifest",
    "release_manifest_signature",
    "release_sequence",
    "revocations",
    "revocations_signature",
    "rollback",
    "rollback_signature",
    "rollback_target_metadata",
    "rollback_target_metadata_signature",
    "schema_version",
    "source_sha",
    "source_tree",
    "update_metadata",
    "update_metadata_signature",
    "version",
  ], "channel document");
  assert.equal(channel.schema_version, AMIC_INTERNAL_CHANNEL_DOCUMENT_SCHEMA);
  assert.equal(channel.channel, INTERNAL_UNSIGNED_UPDATE_CHANNEL);
  assert.equal(channel.app_id, "com.amic.matter.desktop.internal");
  assert.equal(channel.platform, "win32");
  assert.equal(channel.architecture, "x64");
  assert.equal(channel.key_id, INTERNAL_UPDATE_KEY_ID);
  assert.equal(channel.public_release_allowed, false);
  assertCurrentWindow(channel, now, "channel document");

  const namedRefs = [
    "release_manifest",
    "release_manifest_signature",
    "update_metadata",
    "update_metadata_signature",
    "revocations",
    "revocations_signature",
    "rollback",
    "rollback_signature",
    "rollback_target_metadata",
    "rollback_target_metadata_signature",
  ];
  for (const name of namedRefs) validateObjectRef(channel[name], name, name);
  const bodies = Object.fromEntries(await Promise.all(namedRefs.map(async (name) => [
    name,
    await readExactObject({ aws, bindings, ref: channel[name], label: name }),
  ])));

  verifyDetached(
    bodies.release_manifest,
    bodies.release_manifest_signature,
    publicKey,
    "release manifest",
  );
  const manifest = exactFields(parseCanonicalJson(bodies.release_manifest, "release manifest"), [
    "app_id",
    "architecture",
    "artifacts",
    "authenticode_status",
    "channel",
    "credentials_included",
    "distribution",
    "expires_at",
    "generated_at",
    "installation_id",
    "lawos_tenant_id",
    "managed_device_only",
    "platform",
    "predecessor",
    "public_release_allowed",
    "real_contact_seed_included",
    "real_photo_seed_included",
    "real_registration_seed_included",
    "release_id",
    "release_sequence",
    "schema_version",
    "source_sha",
    "source_tree",
    "version",
  ], "release manifest");
  assert.equal(manifest.schema_version, AMIC_INTERNAL_RELEASE_MANIFEST_SCHEMA);
  for (const field of [
    [manifest.release_id, channel.release_id],
    [manifest.release_sequence, channel.release_sequence],
    [manifest.version, channel.version],
    [manifest.source_sha, channel.source_sha],
    [manifest.source_tree, channel.source_tree],
    [manifest.lawos_tenant_id, channel.lawos_tenant_id],
    [manifest.installation_id, channel.installation_id],
  ]) assert.equal(field[0], field[1], "release manifest differs from channel document");
  assert.equal(manifest.authenticode_status, "not_signed");
  assert.equal(manifest.distribution, "private");
  assert.equal(manifest.managed_device_only, true);
  assert.equal(manifest.public_release_allowed, false);
  assert.equal(manifest.real_contact_seed_included, false);
  assert.equal(manifest.real_photo_seed_included, false);
  assert.equal(manifest.real_registration_seed_included, false);
  assert.equal(manifest.credentials_included, false);
  assertCurrentWindow(manifest, now, "release manifest");

  const artifactKinds = ["build_manifest", "installer", "provenance", "sbom"];
  assert.deepEqual(Object.keys(manifest.artifacts).sort(), artifactKinds);
  for (const kind of artifactKinds) {
    validateObjectRef(manifest.artifacts[kind], `${kind} artifact`, kind);
  }
  const allObjectRefs = [
    {
      kind: "channel_pointer",
      key: channelPointer.key,
      version_id: channelPointer.version_id,
      sha256: channelPointer.sha256,
      bytes: channelPointer.bytes,
    },
    envelope.document_object,
    envelope.signature_object,
    ...namedRefs.map((name) => channel[name]),
    ...artifactKinds.map((kind) => manifest.artifacts[kind]),
  ];
  assert.equal(allObjectRefs.length, 17);
  assert.equal(
    new Set(allObjectRefs.map(({ key, version_id: versionId }) => `${key}\0${versionId}`)).size,
    17,
    "readback object references are not unique",
  );
  let sourceArtifactByteCount = 0;
  for (const kind of artifactKinds) {
    const artifact = await readExactObject({
      aws,
      bindings,
      ref: manifest.artifacts[kind],
      label: `${kind} artifact`,
    });
    sourceArtifactByteCount += artifact.byteLength;
    assert.ok(Number.isSafeInteger(sourceArtifactByteCount));
  }

  const update = verifyAndParseUpdateMetadataBytes({
    metadataBytes: bodies.update_metadata,
    signatureBytes: bodies.update_metadata_signature,
    trustedKeyId: INTERNAL_UPDATE_KEY_ID,
    trustedPublicKeys: { [INTERNAL_UPDATE_KEY_ID]: publicKey },
  });
  assert.equal(update.valid, true, `update metadata failed: ${update.reason}`);
  assert.equal(update.metadata.releaseId, channel.release_id);
  assert.equal(update.metadata.releaseSequence, channel.release_sequence);
  assert.equal(update.metadata.sourceSha, channel.source_sha);
  assert.equal(update.metadata.sourceTree, channel.source_tree);
  assert.equal(update.metadata.releaseManifestSha256, channel.release_manifest.sha256);
  assert.equal(update.metadata.artifactObjectKey, manifest.artifacts.installer.key);
  assert.equal(update.metadata.artifactVersionId, manifest.artifacts.installer.version_id);
  assert.equal(update.metadata.artifactSha256, manifest.artifacts.installer.sha256);
  assert.equal(update.metadata.artifactBytes, manifest.artifacts.installer.bytes);
  assert.equal(update.metadata.version, channel.version);
  assert.equal(update.metadata.lawosTenantId, channel.lawos_tenant_id);
  assert.equal(update.metadata.installationId, channel.installation_id);
  assert.equal(update.metadata.appId, channel.app_id);
  assert.equal(update.metadata.platform, channel.platform);
  assert.equal(update.metadata.architecture, channel.architecture);
  assert.equal(update.metadata.predecessorReleaseId, manifest.predecessor.release_id);
  assert.equal(update.metadata.predecessorVersion, manifest.predecessor.version);
  assert.equal(update.metadata.predecessorSourceSha, manifest.predecessor.source_sha);
  assert.equal(update.metadata.predecessorSourceTree, manifest.predecessor.source_tree);
  assertCurrentCamelWindow(update.metadata, now, "update metadata");

  const revocations = verifyAndParseInternalUnsignedRevocationsBytes({
    revocationBytes: bodies.revocations,
    signatureBytes: bodies.revocations_signature,
    trustedKeyId: INTERNAL_UPDATE_KEY_ID,
    trustedPublicKeys: { [INTERNAL_UPDATE_KEY_ID]: publicKey },
  });
  assert.equal(revocations.valid, true, `revocations failed: ${revocations.reason}`);
  assert.equal(revocations.revocations.lawosTenantId, channel.lawos_tenant_id);
  assert.equal(revocations.revocations.appId, channel.app_id);
  assert.equal(revocations.revocations.revokedReleaseIds.includes(channel.release_id), false);
  assert.equal(revocations.revocations.revokedArtifactSha256s.includes(update.metadata.artifactSha256), false);
  assertCurrentCamelWindow(revocations.revocations, now, "revocations");

  const rollback = verifyAndParseInternalUnsignedRollbackBytes({
    rollbackBytes: bodies.rollback,
    signatureBytes: bodies.rollback_signature,
    trustedKeyId: INTERNAL_UPDATE_KEY_ID,
    trustedPublicKeys: { [INTERNAL_UPDATE_KEY_ID]: publicKey },
  });
  assert.equal(rollback.valid, true, `rollback authorization failed: ${rollback.reason}`);
  assert.equal(rollback.rollback.fromReleaseId, channel.release_id);
  assert.equal(rollback.rollback.fromVersion, channel.version);
  assert.equal(rollback.rollback.fromSourceSha, channel.source_sha);
  assert.equal(rollback.rollback.fromSourceTree, channel.source_tree);
  assert.equal(rollback.rollback.revocationRevision, revocations.revocations.revision);
  assert.equal(rollback.rollback.targetReleaseId, manifest.predecessor.release_id);
  assert.equal(rollback.rollback.targetVersion, manifest.predecessor.version);
  assert.equal(rollback.rollback.targetSourceSha, manifest.predecessor.source_sha);
  assert.equal(rollback.rollback.targetSourceTree, manifest.predecessor.source_tree);
  assertCurrentCamelWindow(rollback.rollback, now, "rollback authorization");
  const rollbackTarget = verifyAndParseUpdateMetadataBytes({
    metadataBytes: bodies.rollback_target_metadata,
    signatureBytes: bodies.rollback_target_metadata_signature,
    trustedKeyId: INTERNAL_UPDATE_KEY_ID,
    trustedPublicKeys: { [INTERNAL_UPDATE_KEY_ID]: publicKey },
  });
  assert.equal(
    rollbackTarget.valid,
    true,
    `rollback target metadata failed: ${rollbackTarget.reason}`,
  );
  assert.deepEqual(
    rollbackTarget.metadata,
    rollback.rollback.targetMetadata,
    "rollback target metadata differs from its signed authorization",
  );
  assert.equal(
    rollbackTarget.metadataSha256,
    rollback.rollback.targetMetadataSha256,
  );
  assert.equal(
    rollbackTarget.metadata.artifactSha256,
    rollback.rollback.targetArtifactSha256,
  );
  assert.equal(
    rollbackTarget.metadata.artifactVersionId,
    rollback.rollback.targetArtifactVersionId,
  );
  assertCurrentCamelWindow(rollbackTarget.metadata, now, "rollback target metadata");
  assert.equal(
    revocations.revocations.revokedReleaseIds.includes(rollbackTarget.metadata.releaseId),
    false,
    "rollback target release is revoked",
  );
  assert.equal(
    revocations.revocations.revokedArtifactSha256s.includes(
      rollbackTarget.metadata.artifactSha256,
    ),
    false,
    "rollback target artifact is revoked",
  );
  await verifyAmicInternalRollbackTargetArtifact({
    aws,
    bindings,
    rollback: rollback.rollback,
    now,
  });

  const anonymous = await aws.probeAnonymousAccess({
    bucket: bindings.bucket,
    region: bindings.region,
    cloudFrontDomain,
    key: channelPointer.key,
  });
  assert.ok([401, 403, 404].includes(anonymous?.s3_status), "anonymous S3 access did not fail closed");
  assert.ok([401, 403, 404].includes(anonymous?.cloudfront_status), "unsigned CloudFront access did not fail closed");

  const receipt = {
    schema_version: AMIC_INTERNAL_READBACK_RECEIPT_SCHEMA,
    state: "PASS",
    publication_mode: "successor",
    release_id: channel.release_id,
    release_sequence: channel.release_sequence,
    version: channel.version,
    source_sha: channel.source_sha,
    source_tree: channel.source_tree,
    object_count: 17,
    exact_version_read_count: 18,
    public_key_sha256: expectedPublicKeySha256,
    channel_pointer_sha256: channelPointer.sha256,
    artifact_sha256: manifest.artifacts.installer.sha256,
    artifact_bytes: manifest.artifacts.installer.bytes,
    update_metadata_sha256: channel.update_metadata.sha256,
    revocation_revision: revocations.revocations.revision,
    rollback_id: rollback.rollback.rollbackId,
    rollback_target_metadata_sha256: rollbackTarget.metadataSha256,
    rollback_target_artifact_readback_complete: true,
    anonymous_s3_denied: true,
    unsigned_cloudfront_denied: true,
    authenticode_status: "not_signed",
    private_distribution: true,
    public_installer_available: false,
    raw_object_locator_included: false,
    raw_secret_included: false,
    source_artifact_byte_count: sourceArtifactByteCount,
  };
  return Object.freeze({
    ...receipt,
    receipt_sha256: sha256(canonicalBytes(receipt)),
  });
}
