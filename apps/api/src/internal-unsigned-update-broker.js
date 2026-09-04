import {
  createHash,
  createPrivateKey,
  createPublicKey,
  verify as verifyBytes,
} from "node:crypto";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { getSignedUrl as cloudFrontSignedUrl } from "@aws-sdk/cloudfront-signer";

export const INTERNAL_UNSIGNED_UPDATE_AUTHORIZE_PATH =
  "/api/desktop/internal-updates/authorize";
export const INTERNAL_UNSIGNED_UPDATE_BROKER_SCHEMA =
  "law-firm-os.amic-internal-unsigned-download-authorization.v1";
export const INTERNAL_UNSIGNED_CLOUDFRONT_SIGNER_SECRET_SCHEMA =
  "law-firm-os.amic-internal-cloudfront-signer.v1";
export const INTERNAL_UNSIGNED_UPDATE_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "amic-internal-unsigned-update",
  contract_schema_version: INTERNAL_UNSIGNED_UPDATE_BROKER_SCHEMA,
  endpoints: Object.freeze([`POST ${INTERNAL_UNSIGNED_UPDATE_AUTHORIZE_PATH}`]),
  authentication: "signed-session-plus-trusted-current-installation",
  download_authority: "short-lived-cloudfront-signed-url",
  url_ttl_seconds: 300,
  renderer_receives_signed_url: false,
  aws_credentials_returned: false,
  private_key_material_returned: false,
  public_release_allowed: false,
  fail_closed: true,
});

const DISTRIBUTION_PREFIX = "internal-unsigned/";
const UPDATE_SCHEMA = "law-firm-os.matter-desktop-internal-unsigned-update.v2";
const ROLLBACK_SCHEMA = "law-firm-os.matter-desktop-internal-unsigned-rollback.v2";
const CHANNEL_DOCUMENT_SCHEMA =
  "law-firm-os.amic-internal-unsigned-channel.v2";
const CHANNEL_ENVELOPE_SCHEMA =
  "law-firm-os.amic-internal-unsigned-channel-envelope.v1";
const APP_ID = "com.amic.matter.desktop.internal";
const UPDATE_KEY_ID = "matter-internal-update-key-v1";
const MAX_DOCUMENT_BYTES = 64 * 1024;
const MAX_SIGNATURE_BYTES = 1024;
const MAX_INSTALLER_BYTES = 2 * 1024 * 1024 * 1024;
const DEFAULT_URL_TTL_SECONDS = 300;

const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_OBJECT = /^[0-9a-f]{40}$/u;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const VERSION_ID = /^[A-Za-z0-9][A-Za-z0-9._+=/-]{0,1023}$/u;
const OBJECT_KEY = /^[A-Za-z0-9][A-Za-z0-9._+\-/]{0,1023}$/u;
const BUCKET = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/u;
const CLOUDFRONT_DOMAIN = /^d[a-z0-9]{3,62}\.cloudfront\.net$/u;
const KEY_PAIR_ID = /^[A-Z0-9]{8,128}$/u;
const KMS_KEY_ARN = /^arn:aws:kms:([a-z0-9-]+):([0-9]{12}):key\/([0-9a-f-]{36})$/u;
const SECRETS_MANAGER_ARN =
  /^arn:aws:secretsmanager:([a-z0-9-]+):([0-9]{12}):secret:[A-Za-z0-9/_+=.@-]+$/u;

const CHANNEL_DOCUMENT_FIELDS = Object.freeze([
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
]);
const CHANNEL_ENVELOPE_FIELDS = Object.freeze([
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
]);
const UPDATE_FIELDS = Object.freeze([
  "architecture",
  "appId",
  "artifactBytes",
  "artifactFilename",
  "artifactObjectKey",
  "artifactSha256",
  "artifactVersionId",
  "authenticodeStatus",
  "channel",
  "distribution",
  "expiresAt",
  "generatedAt",
  "installationId",
  "keyId",
  "lawosTenantId",
  "managedDeviceOnly",
  "platform",
  "predecessorReleaseId",
  "predecessorSourceSha",
  "predecessorSourceTree",
  "predecessorVersion",
  "publicReleaseAllowed",
  "releaseId",
  "releaseManifestSha256",
  "releaseSequence",
  "schemaVersion",
  "sourceSha",
  "sourceTree",
  "version",
]);
const ROLLBACK_FIELDS = Object.freeze([
  "appId",
  "channel",
  "expiresAt",
  "fromReleaseId",
  "fromSourceSha",
  "fromSourceTree",
  "fromVersion",
  "generatedAt",
  "installationId",
  "keyId",
  "lawosTenantId",
  "reasonCode",
  "revocationRevision",
  "rollbackId",
  "schemaVersion",
  "targetArtifactSha256",
  "targetArtifactVersionId",
  "targetMetadata",
  "targetMetadataSha256",
  "targetReleaseId",
  "targetSourceSha",
  "targetSourceTree",
  "targetVersion",
]);

export class InternalUnsignedUpdateBrokerError extends Error {
  constructor(code, message, status = 503) {
    super(message);
    this.name = "InternalUnsignedUpdateBrokerError";
    this.safe_error_code = code;
    this.status = status;
  }
}

function fail(code, message, status = 503) {
  throw new InternalUnsignedUpdateBrokerError(code, message, status);
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]),
    );
  }
  return value;
}

function canonicalBytes(value) {
  return Buffer.from(`${JSON.stringify(canonicalValue(value))}\n`);
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function exactFields(value, expected) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
    && JSON.stringify(Object.keys(value).sort())
      === JSON.stringify([...expected].sort());
}

function canonicalIso(value) {
  return typeof value === "string"
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function activeWindow(value, now, maximumMs = 31 * 24 * 60 * 60 * 1000) {
  return canonicalIso(value.generated_at ?? value.generatedAt)
    && canonicalIso(value.expires_at ?? value.expiresAt)
    && Date.parse(value.generated_at ?? value.generatedAt) <= now
    && Date.parse(value.expires_at ?? value.expiresAt) > now
    && Date.parse(value.expires_at ?? value.expiresAt)
      - Date.parse(value.generated_at ?? value.generatedAt) <= maximumMs;
}

function safeObjectKey(value) {
  return typeof value === "string"
    && value.startsWith(DISTRIBUTION_PREFIX)
    && OBJECT_KEY.test(value)
    && !value.split("/").some((segment) => !segment || segment === "." || segment === "..");
}

function parseCanonicalJson(bytes, label) {
  if (!(bytes instanceof Uint8Array)
      || bytes.byteLength < 2
      || bytes.byteLength > MAX_DOCUMENT_BYTES) {
    fail("INTERNAL_UPDATE_DOCUMENT_INVALID", `${label} bytes are invalid`);
  }
  let value;
  try {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (source.includes("\0")) throw new TypeError("NUL is forbidden");
    value = JSON.parse(source);
  } catch {
    fail("INTERNAL_UPDATE_DOCUMENT_INVALID", `${label} JSON is invalid`);
  }
  if (!canonicalBytes(value).equals(Buffer.from(bytes))) {
    fail("INTERNAL_UPDATE_DOCUMENT_NONCANONICAL", `${label} is not canonical`);
  }
  return value;
}

function exactBase64(value, label, maximumBytes) {
  if (typeof value !== "string" || !value) {
    fail("INTERNAL_UPDATE_DOCUMENT_INVALID", `${label} is invalid`);
  }
  const bytes = Buffer.from(value, "base64");
  if (!bytes.byteLength
      || bytes.byteLength > maximumBytes
      || bytes.toString("base64") !== value) {
    fail("INTERNAL_UPDATE_DOCUMENT_INVALID", `${label} is invalid`);
  }
  return bytes;
}

function objectRef(value, expectedKind) {
  if (!exactFields(value, ["bytes", "key", "kind", "sha256", "version_id"])
      || value.kind !== expectedKind
      || !safeObjectKey(value.key)
      || !VERSION_ID.test(value.version_id ?? "")
      || !SHA256.test(value.sha256 ?? "")
      || !Number.isSafeInteger(value.bytes)
      || value.bytes < 1
      || value.bytes > (expectedKind.endsWith("signature")
        ? MAX_SIGNATURE_BYTES
        : MAX_DOCUMENT_BYTES)) {
    fail("INTERNAL_UPDATE_OBJECT_REFERENCE_INVALID", `${expectedKind} reference is invalid`);
  }
  return Object.freeze({ ...value });
}

function channelScopeKey(tenantId, installationId) {
  const tenant = digest(Buffer.from(tenantId)).slice(0, 32);
  const installation = digest(Buffer.from(installationId)).slice(0, 32);
  return `${DISTRIBUTION_PREFIX}channel/${tenant}/${installation}/win32/x64/current.json`;
}

function bodyStream(body, maximumBytes) {
  return (async function* chunks() {
    if (typeof body?.transformToByteArray === "function") {
      const bytes = Buffer.from(await body.transformToByteArray());
      if (bytes.byteLength > maximumBytes) {
        fail("INTERNAL_UPDATE_OBJECT_TOO_LARGE", "Internal update object exceeded its bound");
      }
      yield bytes;
      return;
    }
    if (!body || typeof body[Symbol.asyncIterator] !== "function") {
      fail("INTERNAL_UPDATE_OBJECT_INVALID", "Internal update object body is unavailable");
    }
    let total = 0;
    for await (const value of body) {
      const chunk = Buffer.from(value);
      total += chunk.byteLength;
      if (total > maximumBytes) {
        fail("INTERNAL_UPDATE_OBJECT_TOO_LARGE", "Internal update object exceeded its bound");
      }
      yield chunk;
    }
  }());
}

async function readBody(body, maximumBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of bodyStream(body, maximumBytes)) {
    chunks.push(chunk);
    total += chunk.byteLength;
  }
  if (!total) fail("INTERNAL_UPDATE_OBJECT_INVALID", "Internal update object is empty");
  return Buffer.concat(chunks, total);
}

async function readExactObject({ client, bucket, accountId, kmsKeyArn, key, ref = null, kind }) {
  let response;
  try {
    response = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ...(ref ? { VersionId: ref.version_id } : {}),
      ExpectedBucketOwner: accountId,
      ChecksumMode: "ENABLED",
    }));
  } catch {
    fail("INTERNAL_UPDATE_OBJECT_UNAVAILABLE", "Internal update object is unavailable");
  }
  const maximumBytes = kind.endsWith("signature")
    ? MAX_SIGNATURE_BYTES
    : MAX_DOCUMENT_BYTES;
  const bytes = await readBody(response.Body, maximumBytes);
  const sha256 = digest(bytes);
  const expectedChecksum = Buffer.from(sha256, "hex").toString("base64");
  if (response.ServerSideEncryption !== "aws:kms"
      || response.SSEKMSKeyId !== kmsKeyArn
      || Number(response.ContentLength) !== bytes.byteLength
      || response.ChecksumSHA256 !== expectedChecksum
      || response.Metadata?.["artifact-kind"] !== kind
      || response.Metadata?.["artifact-sha256"] !== sha256
      || (ref && (response.VersionId !== ref.version_id
        || ref.bytes !== bytes.byteLength
        || ref.sha256 !== sha256))) {
    fail("INTERNAL_UPDATE_OBJECT_BINDING_MISMATCH", "Internal update object binding differs");
  }
  return Object.freeze({ bytes, sha256 });
}

function verifyEd25519({ bytes, signature, publicKey }) {
  try {
    return signature.byteLength === 64
      && verifyBytes(null, bytes, publicKey, signature);
  } catch {
    return false;
  }
}

function validateChannel({ envelopeBytes, tenantId, installationId, metadataPublicKey, now }) {
  const envelope = parseCanonicalJson(envelopeBytes, "channel envelope");
  if (!exactFields(envelope, CHANNEL_ENVELOPE_FIELDS)
      || envelope.schema_version !== CHANNEL_ENVELOPE_SCHEMA
      || envelope.key_id !== UPDATE_KEY_ID
      || envelope.channel_pointer_moved_after_all_object_readbacks !== true
      || envelope.public_release_allowed !== false
      || !SHA256.test(envelope.document_sha256 ?? "")
      || !SHA256.test(envelope.signature_sha256 ?? "")) {
    fail("INTERNAL_UPDATE_CHANNEL_INVALID", "Internal update channel envelope is invalid");
  }
  const documentBytes = exactBase64(
    envelope.document_base64,
    "channel document",
    MAX_DOCUMENT_BYTES,
  );
  const signatureBytes = exactBase64(
    envelope.signature_base64,
    "channel signature",
    MAX_SIGNATURE_BYTES,
  );
  if (digest(documentBytes) !== envelope.document_sha256
      || digest(signatureBytes) !== envelope.signature_sha256
      || !verifyEd25519({ bytes: documentBytes, signature: signatureBytes, publicKey: metadataPublicKey })) {
    fail("INTERNAL_UPDATE_CHANNEL_SIGNATURE_INVALID", "Internal update channel signature is invalid");
  }
  const channel = parseCanonicalJson(documentBytes, "channel document");
  if (!exactFields(channel, CHANNEL_DOCUMENT_FIELDS)
      || channel.schema_version !== CHANNEL_DOCUMENT_SCHEMA
      || channel.channel !== "internal-unsigned"
      || channel.lawos_tenant_id !== tenantId
      || channel.installation_id !== installationId
      || channel.app_id !== APP_ID
      || channel.platform !== "win32"
      || channel.architecture !== "x64"
      || channel.key_id !== UPDATE_KEY_ID
      || channel.public_release_allowed !== false
      || !IDENTIFIER.test(channel.release_id ?? "")
      || !Number.isSafeInteger(channel.release_sequence)
      || channel.release_sequence < 1
      || !VERSION.test(channel.version ?? "")
      || !GIT_OBJECT.test(channel.source_sha ?? "")
      || !GIT_OBJECT.test(channel.source_tree ?? "")
      || !activeWindow(channel, now)) {
    fail("INTERNAL_UPDATE_CHANNEL_SCOPE_MISMATCH", "Internal update channel scope differs");
  }
  const refs = Object.freeze({
    release_manifest: objectRef(channel.release_manifest, "release_manifest"),
    release_manifest_signature: objectRef(
      channel.release_manifest_signature,
      "release_manifest_signature",
    ),
    update_metadata: objectRef(channel.update_metadata, "update_metadata"),
    update_metadata_signature: objectRef(
      channel.update_metadata_signature,
      "update_metadata_signature",
    ),
    revocations: objectRef(channel.revocations, "revocations"),
    revocations_signature: objectRef(
      channel.revocations_signature,
      "revocations_signature",
    ),
    rollback: objectRef(channel.rollback, "rollback"),
    rollback_signature: objectRef(
      channel.rollback_signature,
      "rollback_signature",
    ),
    rollback_target_metadata: objectRef(
      channel.rollback_target_metadata,
      "rollback_target_metadata",
    ),
    rollback_target_metadata_signature: objectRef(
      channel.rollback_target_metadata_signature,
      "rollback_target_metadata_signature",
    ),
  });
  const documentObject = objectRef(envelope.document_object, "channel_document");
  const signatureObject = objectRef(envelope.signature_object, "channel_signature");
  if (documentObject.sha256 !== envelope.document_sha256
      || documentObject.bytes !== documentBytes.byteLength
      || signatureObject.sha256 !== envelope.signature_sha256
      || signatureObject.bytes !== signatureBytes.byteLength) {
    fail("INTERNAL_UPDATE_CHANNEL_OBJECT_MISMATCH", "Internal update channel object differs");
  }
  return Object.freeze({ channel, refs });
}

function artifactObjectKey(metadata) {
  return [
    DISTRIBUTION_PREFIX.replace(/\/$/u, ""),
    metadata.platform,
    metadata.architecture,
    metadata.version,
    metadata.sourceSha,
    metadata.artifactSha256,
    metadata.artifactFilename,
  ].join("/");
}

function validateUpdateMetadata({ metadataBytes, signatureBytes, metadataPublicKey, channel, tenantId, installationId, now }) {
  if (!verifyEd25519({ bytes: metadataBytes, signature: signatureBytes, publicKey: metadataPublicKey })) {
    fail("INTERNAL_UPDATE_METADATA_SIGNATURE_INVALID", "Internal update metadata signature is invalid");
  }
  const metadata = parseCanonicalJson(metadataBytes, "update metadata");
  if (!exactFields(metadata, UPDATE_FIELDS)
      || metadata.schemaVersion !== UPDATE_SCHEMA
      || metadata.channel !== "internal-unsigned"
      || metadata.lawosTenantId !== tenantId
      || metadata.installationId !== installationId
      || metadata.appId !== APP_ID
      || metadata.keyId !== UPDATE_KEY_ID
      || metadata.platform !== "win32"
      || metadata.architecture !== "x64"
      || metadata.authenticodeStatus !== "not_signed"
      || metadata.distribution !== "private"
      || metadata.managedDeviceOnly !== true
      || metadata.publicReleaseAllowed !== false
      || !IDENTIFIER.test(metadata.releaseId ?? "")
      || !VERSION.test(metadata.version ?? "")
      || !GIT_OBJECT.test(metadata.sourceSha ?? "")
      || !GIT_OBJECT.test(metadata.sourceTree ?? "")
      || !IDENTIFIER.test(metadata.predecessorReleaseId ?? "")
      || !VERSION.test(metadata.predecessorVersion ?? "")
      || !GIT_OBJECT.test(metadata.predecessorSourceSha ?? "")
      || !GIT_OBJECT.test(metadata.predecessorSourceTree ?? "")
      || !Number.isSafeInteger(metadata.releaseSequence)
      || metadata.releaseSequence < 1
      || typeof metadata.artifactFilename !== "string"
      || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/u.test(metadata.artifactFilename)
      || !SHA256.test(metadata.artifactSha256 ?? "")
      || !VERSION_ID.test(metadata.artifactVersionId ?? "")
      || !SHA256.test(metadata.releaseManifestSha256 ?? "")
      || !Number.isSafeInteger(metadata.artifactBytes)
      || metadata.artifactBytes < 1
      || metadata.artifactBytes > MAX_INSTALLER_BYTES
      || metadata.artifactObjectKey !== artifactObjectKey(metadata)
      || !activeWindow(metadata, now)
      || metadata.releaseId !== channel.release_id
      || metadata.releaseSequence !== channel.release_sequence
      || metadata.version !== channel.version
      || metadata.sourceSha !== channel.source_sha
      || metadata.sourceTree !== channel.source_tree) {
    fail("INTERNAL_UPDATE_METADATA_SCOPE_MISMATCH", "Internal update metadata scope differs");
  }
  return Object.freeze(metadata);
}

function validateRollbackAuthorization({
  rollbackBytes,
  signatureBytes,
  metadataPublicKey,
  currentMetadata,
  tenantId,
  installationId,
  now,
}) {
  if (!verifyEd25519({ bytes: rollbackBytes, signature: signatureBytes, publicKey: metadataPublicKey })) {
    fail("INTERNAL_UPDATE_ROLLBACK_SIGNATURE_INVALID", "Internal rollback signature is invalid");
  }
  const rollback = parseCanonicalJson(rollbackBytes, "rollback authorization");
  const target = rollback.targetMetadata;
  if (!exactFields(rollback, ROLLBACK_FIELDS)
      || rollback.schemaVersion !== ROLLBACK_SCHEMA
      || rollback.channel !== "internal-unsigned"
      || rollback.lawosTenantId !== tenantId
      || rollback.installationId !== installationId
      || rollback.appId !== APP_ID
      || rollback.keyId !== UPDATE_KEY_ID
      || !IDENTIFIER.test(rollback.rollbackId ?? "")
      || rollback.fromReleaseId !== currentMetadata.releaseId
      || rollback.fromVersion !== currentMetadata.version
      || rollback.fromSourceSha !== currentMetadata.sourceSha
      || rollback.fromSourceTree !== currentMetadata.sourceTree
      || !IDENTIFIER.test(rollback.targetReleaseId ?? "")
      || !VERSION.test(rollback.targetVersion ?? "")
      || !GIT_OBJECT.test(rollback.targetSourceSha ?? "")
      || !GIT_OBJECT.test(rollback.targetSourceTree ?? "")
      || !SHA256.test(rollback.targetArtifactSha256 ?? "")
      || !VERSION_ID.test(rollback.targetArtifactVersionId ?? "")
      || !SHA256.test(rollback.targetMetadataSha256 ?? "")
      || !Number.isSafeInteger(rollback.revocationRevision)
      || rollback.revocationRevision < 1
      || !IDENTIFIER.test(rollback.reasonCode ?? "")
      || !activeWindow(rollback, now, 24 * 60 * 60 * 1000)
      || !exactFields(target, UPDATE_FIELDS)
      || digest(canonicalBytes(target)) !== rollback.targetMetadataSha256
      || target.releaseId !== rollback.targetReleaseId
      || target.version !== rollback.targetVersion
      || target.sourceSha !== rollback.targetSourceSha
      || target.sourceTree !== rollback.targetSourceTree
      || target.artifactSha256 !== rollback.targetArtifactSha256
      || target.artifactVersionId !== rollback.targetArtifactVersionId) {
    fail("INTERNAL_UPDATE_ROLLBACK_SCOPE_MISMATCH", "Internal rollback scope differs");
  }
  return Object.freeze(rollback);
}

function validateRollbackTarget({
  metadataBytes,
  signatureBytes,
  metadataPublicKey,
  rollback,
  tenantId,
  installationId,
  now,
}) {
  if (!Buffer.from(metadataBytes).equals(canonicalBytes(rollback.targetMetadata))) {
    fail("INTERNAL_UPDATE_ROLLBACK_TARGET_MISMATCH", "Internal rollback target metadata differs");
  }
  const target = validateUpdateMetadata({
    metadataBytes,
    signatureBytes,
    metadataPublicKey,
    channel: {
      release_id: rollback.targetReleaseId,
      release_sequence: rollback.targetMetadata.releaseSequence,
      version: rollback.targetVersion,
      source_sha: rollback.targetSourceSha,
      source_tree: rollback.targetSourceTree,
    },
    tenantId,
    installationId,
    now,
  });
  if (target.artifactSha256 !== rollback.targetArtifactSha256
      || target.artifactVersionId !== rollback.targetArtifactVersionId
      || digest(metadataBytes) !== rollback.targetMetadataSha256) {
    fail("INTERNAL_UPDATE_ROLLBACK_TARGET_MISMATCH", "Internal rollback target binding differs");
  }
  return target;
}

function parseSignerSecret(value, expectedKeyPairId) {
  let document;
  try {
    document = JSON.parse(value);
  } catch {
    fail("INTERNAL_UPDATE_SIGNER_SECRET_INVALID", "Internal update signer secret is invalid");
  }
  if (!exactFields(document, ["key_pair_id", "private_key_pem", "schema_version"])
      || document.schema_version !== INTERNAL_UNSIGNED_CLOUDFRONT_SIGNER_SECRET_SCHEMA
      || document.key_pair_id !== expectedKeyPairId
      || typeof document.private_key_pem !== "string") {
    fail("INTERNAL_UPDATE_SIGNER_SECRET_INVALID", "Internal update signer secret is invalid");
  }
  let key;
  try {
    key = createPrivateKey(document.private_key_pem);
  } catch {
    fail("INTERNAL_UPDATE_SIGNER_SECRET_INVALID", "Internal update signer key is invalid");
  }
  const rsa = key.asymmetricKeyType === "rsa"
    && key.asymmetricKeyDetails?.modulusLength === 2048;
  const ec = key.asymmetricKeyType === "ec"
    && key.asymmetricKeyDetails?.namedCurve === "prime256v1";
  if (!rsa && !ec) {
    fail("INTERNAL_UPDATE_SIGNER_SECRET_INVALID", "Internal update signer key type is invalid");
  }
  return document.private_key_pem;
}

async function resolveSignerKey({ client, secretArn, keyPairId }) {
  let response;
  try {
    response = await client.send(new GetSecretValueCommand({
      SecretId: secretArn,
      VersionStage: "AWSCURRENT",
    }));
  } catch {
    fail("INTERNAL_UPDATE_SIGNER_UNAVAILABLE", "Internal update signer is unavailable");
  }
  if (typeof response.SecretString !== "string") {
    fail("INTERNAL_UPDATE_SIGNER_SECRET_INVALID", "Internal update signer secret is invalid");
  }
  return parseSignerSecret(response.SecretString, keyPairId);
}

function signedDownload({ signedUrlFactory, cloudFrontDomain, keyPairId, privateKey, key, expiresAt }) {
  const path = key.split("/").map(encodeURIComponent).join("/");
  const unsignedUrl = `https://${cloudFrontDomain}/${path}`;
  let signed;
  try {
    signed = signedUrlFactory({
      url: unsignedUrl,
      keyPairId,
      privateKey,
      dateLessThan: expiresAt,
    });
  } catch {
    fail("INTERNAL_UPDATE_SIGNED_URL_FAILED", "Internal update download authorization failed");
  }
  let parsed;
  try {
    parsed = new URL(signed);
  } catch {
    fail("INTERNAL_UPDATE_SIGNED_URL_FAILED", "Internal update signed URL is invalid");
  }
  if (parsed.protocol !== "https:"
      || parsed.hostname !== cloudFrontDomain
      || parsed.pathname !== new URL(unsignedUrl).pathname
      || parsed.username
      || parsed.password
      || parsed.hash
      || parsed.searchParams.get("Key-Pair-Id") !== keyPairId
      || !parsed.searchParams.has("Signature")
      || !(parsed.searchParams.has("Expires") || parsed.searchParams.has("Policy"))) {
    fail("INTERNAL_UPDATE_SIGNED_URL_FAILED", "Internal update signed URL is invalid");
  }
  return signed;
}

function downloadDescriptor(ref, url) {
  return Object.freeze({
    url,
    sha256: ref.sha256,
    bytes: ref.bytes,
    version_id: ref.version_id,
  });
}

export function createDisabledInternalUnsignedUpdateBroker(
  reason = "internal_update_distribution_disabled",
) {
  return Object.freeze({
    configured: false,
    operational: false,
    reason,
    async authorize() {
      fail("INTERNAL_UPDATE_DISTRIBUTION_DISABLED", "Internal update distribution is disabled");
    },
  });
}

export function createAwsInternalUnsignedUpdateBroker({
  region,
  accountId,
  bucket,
  kmsKeyArn,
  cloudFrontDomain,
  cloudFrontKeyPairId,
  cloudFrontPrivateKeySecretArn,
  metadataPublicKey,
  s3Client,
  secretsClient,
  signedUrlFactory = cloudFrontSignedUrl,
  now = () => Date.now(),
  urlTtlSeconds = DEFAULT_URL_TTL_SECONDS,
} = {}) {
  const kmsArn = KMS_KEY_ARN.exec(kmsKeyArn ?? "");
  const signerSecretArn = SECRETS_MANAGER_ARN.exec(
    cloudFrontPrivateKeySecretArn ?? "",
  );
  if (typeof region !== "string" || !/^[a-z]{2}(?:-gov)?-[a-z]+-\d$/u.test(region)
      || !/^[0-9]{12}$/u.test(accountId ?? "")
      || !BUCKET.test(bucket ?? "")
      || !kmsArn
      || kmsArn[1] !== region
      || kmsArn[2] !== accountId
      || !cloudFrontDomain?.match(CLOUDFRONT_DOMAIN)
      || !KEY_PAIR_ID.test(cloudFrontKeyPairId ?? "")
      || !signerSecretArn
      || signerSecretArn[1] !== region
      || signerSecretArn[2] !== accountId
      || typeof signedUrlFactory !== "function"
      || !Number.isSafeInteger(urlTtlSeconds)
      || urlTtlSeconds < 60
      || urlTtlSeconds > 600) {
    throw new TypeError("internal update broker configuration is invalid");
  }
  let publicKey;
  try {
    publicKey = metadataPublicKey?.type === "public"
      ? metadataPublicKey
      : createPublicKey(metadataPublicKey);
  } catch {
    throw new TypeError("internal update metadata public key is invalid");
  }
  if (publicKey.asymmetricKeyType !== "ed25519") {
    throw new TypeError("internal update metadata public key must be Ed25519");
  }
  const s3 = s3Client ?? new S3Client({ region });
  const secrets = secretsClient ?? new SecretsManagerClient({ region });

  return Object.freeze({
    configured: true,
    operational: true,
    async authorize({ tenantId, userId, installationId } = {}) {
      if (!IDENTIFIER.test(tenantId ?? "")
          || !IDENTIFIER.test(userId ?? "")
          || !/^odi_[A-Za-z0-9_-]{20,128}$/u.test(installationId ?? "")) {
        fail("INTERNAL_UPDATE_INSTALLATION_BINDING_REQUIRED", "A trusted installation is required", 403);
      }
      const authorizationTime = now();
      const pointerKey = channelScopeKey(tenantId, installationId);
      const pointer = await readExactObject({
        client: s3,
        bucket,
        accountId,
        kmsKeyArn,
        key: pointerKey,
        kind: "channel_pointer",
      });
      const { channel, refs } = validateChannel({
        envelopeBytes: pointer.bytes,
        tenantId,
        installationId,
        metadataPublicKey: publicKey,
        now: authorizationTime,
      });
      const [
        metadataObject,
        signatureObject,
        rollbackObject,
        rollbackSignatureObject,
      ] = await Promise.all([
        readExactObject({
          client: s3,
          bucket,
          accountId,
          kmsKeyArn,
          key: refs.update_metadata.key,
          ref: refs.update_metadata,
          kind: "update_metadata",
        }),
        readExactObject({
          client: s3,
          bucket,
          accountId,
          kmsKeyArn,
          key: refs.update_metadata_signature.key,
          ref: refs.update_metadata_signature,
          kind: "update_metadata_signature",
        }),
        readExactObject({
          client: s3,
          bucket,
          accountId,
          kmsKeyArn,
          key: refs.rollback.key,
          ref: refs.rollback,
          kind: "rollback",
        }),
        readExactObject({
          client: s3,
          bucket,
          accountId,
          kmsKeyArn,
          key: refs.rollback_signature.key,
          ref: refs.rollback_signature,
          kind: "rollback_signature",
        }),
      ]);
      const metadata = validateUpdateMetadata({
        metadataBytes: metadataObject.bytes,
        signatureBytes: signatureObject.bytes,
        metadataPublicKey: publicKey,
        channel,
        tenantId,
        installationId,
        now: authorizationTime,
      });
      const artifact = Object.freeze({
        kind: "installer",
        key: metadata.artifactObjectKey,
        version_id: metadata.artifactVersionId,
        sha256: metadata.artifactSha256,
        bytes: metadata.artifactBytes,
      });
      const rollback = validateRollbackAuthorization({
        rollbackBytes: rollbackObject.bytes,
        signatureBytes: rollbackSignatureObject.bytes,
        metadataPublicKey: publicKey,
        currentMetadata: metadata,
        tenantId,
        installationId,
        now: authorizationTime,
      });
      const [rollbackTargetMetadataObject, rollbackTargetSignatureObject] =
        await Promise.all([
          readExactObject({
            client: s3,
            bucket,
            accountId,
            kmsKeyArn,
            key: refs.rollback_target_metadata.key,
            ref: refs.rollback_target_metadata,
            kind: "rollback_target_metadata",
          }),
          readExactObject({
            client: s3,
            bucket,
            accountId,
            kmsKeyArn,
            key: refs.rollback_target_metadata_signature.key,
            ref: refs.rollback_target_metadata_signature,
            kind: "rollback_target_metadata_signature",
          }),
        ]);
      const rollbackTarget = validateRollbackTarget({
        metadataBytes: rollbackTargetMetadataObject.bytes,
        signatureBytes: rollbackTargetSignatureObject.bytes,
        metadataPublicKey: publicKey,
        rollback,
        tenantId,
        installationId,
        now: authorizationTime,
      });
      const rollbackTargetArtifact = Object.freeze({
        kind: "rollback_target_artifact",
        key: rollbackTarget.artifactObjectKey,
        version_id: rollbackTarget.artifactVersionId,
        sha256: rollbackTarget.artifactSha256,
        bytes: rollbackTarget.artifactBytes,
      });
      const expiresAt = new Date(authorizationTime + urlTtlSeconds * 1000).toISOString();
      const privateKey = await resolveSignerKey({
        client: secrets,
        secretArn: cloudFrontPrivateKeySecretArn,
        keyPairId: cloudFrontKeyPairId,
      });
      const requested = Object.freeze({
        update_metadata: refs.update_metadata,
        update_metadata_signature: refs.update_metadata_signature,
        revocations: refs.revocations,
        revocations_signature: refs.revocations_signature,
        rollback: refs.rollback,
        rollback_signature: refs.rollback_signature,
        rollback_target_metadata: refs.rollback_target_metadata,
        rollback_target_metadata_signature:
          refs.rollback_target_metadata_signature,
        rollback_target_artifact: rollbackTargetArtifact,
        artifact,
      });
      const downloads = Object.fromEntries(Object.entries(requested).map(([kind, ref]) => [
        kind,
        downloadDescriptor(ref, signedDownload({
          signedUrlFactory,
          cloudFrontDomain,
          keyPairId: cloudFrontKeyPairId,
          privateKey,
          key: ref.key,
          expiresAt,
        })),
      ]));
      const receipt = {
        tenant_id_hash: digest(Buffer.from(tenantId)),
        user_id_hash: digest(Buffer.from(userId)),
        installation_id_hash: digest(Buffer.from(installationId)),
        channel_pointer_sha256: pointer.sha256,
        release_id: channel.release_id,
        release_sequence: channel.release_sequence,
        expires_at: expiresAt,
      };
      return Object.freeze({
        schema_version: INTERNAL_UNSIGNED_UPDATE_BROKER_SCHEMA,
        outcome: "authorized",
        release_id: channel.release_id,
        release_sequence: channel.release_sequence,
        version: channel.version,
        expires_at: expiresAt,
        downloads: Object.freeze(downloads),
        authorization_receipt_sha256: digest(canonicalBytes(receipt)),
        raw_s3_location_returned: false,
        aws_credentials_returned: false,
        private_key_material_returned: false,
        public_release_allowed: false,
      });
    },
  });
}

export function resolveInternalUnsignedUpdateBrokerFromEnv({
  env = process.env,
  s3Client,
  secretsClient,
  signedUrlFactory,
  now,
} = {}) {
  if (env.LAWOS_AMIC_INTERNAL_UPDATE_ENABLED !== "true") {
    return createDisabledInternalUnsignedUpdateBroker();
  }
  const publicKeyBase64 = String(
    env.LAWOS_AMIC_INTERNAL_UPDATE_ED25519_PUBLIC_KEY_SPKI_BASE64 ?? "",
  ).trim();
  let metadataPublicKey;
  try {
    const der = Buffer.from(publicKeyBase64, "base64");
    if (!der.byteLength || der.toString("base64") !== publicKeyBase64) throw new TypeError();
    metadataPublicKey = { key: der, format: "der", type: "spki" };
  } catch {
    throw new TypeError("internal update metadata public key configuration is invalid");
  }
  return createAwsInternalUnsignedUpdateBroker({
    region: env.AWS_REGION ?? env.AWS_DEFAULT_REGION,
    accountId: env.LAWOS_AMIC_INTERNAL_UPDATE_AWS_ACCOUNT_ID,
    bucket: env.LAWOS_AMIC_INTERNAL_UPDATE_BUCKET,
    kmsKeyArn: env.LAWOS_AMIC_INTERNAL_UPDATE_KMS_KEY_ARN,
    cloudFrontDomain: env.LAWOS_AMIC_INTERNAL_UPDATE_CLOUDFRONT_DOMAIN,
    cloudFrontKeyPairId: env.LAWOS_AMIC_INTERNAL_UPDATE_CLOUDFRONT_KEY_PAIR_ID,
    cloudFrontPrivateKeySecretArn:
      env.LAWOS_AMIC_INTERNAL_UPDATE_CLOUDFRONT_PRIVATE_KEY_SECRET_ARN,
    metadataPublicKey,
    s3Client,
    secretsClient,
    signedUrlFactory,
    now,
  });
}

function blocked(requestId, status, code) {
  return Object.freeze({
    status,
    body: Object.freeze({
      request_id: String(requestId ?? "request-internal-update"),
      outcome: "blocked",
      safe_error_codes: Object.freeze([code]),
      signed_url_returned: false,
      raw_s3_location_returned: false,
      aws_credentials_returned: false,
      private_key_material_returned: false,
      public_release_allowed: false,
      production_ready_claim: false,
    }),
  });
}

export async function handleInternalUnsignedUpdateBrokerApiRequest({
  pathname,
  method,
  principal,
  installation,
  runtime,
  requestId,
} = {}) {
  if (pathname !== INTERNAL_UNSIGNED_UPDATE_AUTHORIZE_PATH || method !== "POST") {
    return blocked(requestId, 404, "INTERNAL_UPDATE_ROUTE_NOT_FOUND");
  }
  if (!runtime?.configured || typeof runtime.authorize !== "function") {
    return blocked(requestId, 503, "INTERNAL_UPDATE_DISTRIBUTION_DISABLED");
  }
  if (installation?.status !== "active"
      || !/^odi_[A-Za-z0-9_-]{20,128}$/u.test(installation.installation_id ?? "")
      || !IDENTIFIER.test(principal?.tenant_id ?? "")
      || !IDENTIFIER.test(principal?.user_id ?? "")) {
    return blocked(requestId, 403, "INTERNAL_UPDATE_INSTALLATION_BINDING_REQUIRED");
  }
  try {
    const authorization = await runtime.authorize({
      tenantId: principal.tenant_id,
      userId: principal.user_id,
      installationId: installation.installation_id,
    });
    return Object.freeze({
      status: 200,
      body: Object.freeze({
        request_id: String(requestId ?? "request-internal-update"),
        ...authorization,
        production_ready_claim: false,
      }),
    });
  } catch (error) {
    const code = /^[A-Z0-9_]{3,128}$/u.test(error?.safe_error_code ?? "")
      ? error.safe_error_code
      : "INTERNAL_UPDATE_AUTHORIZATION_FAILED";
    const status = [400, 403, 404, 409, 503].includes(error?.status)
      ? error.status
      : 503;
    return blocked(requestId, status, code);
  }
}
