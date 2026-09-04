import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as signBytes,
  verify as verifyBytes,
} from "node:crypto";

export const INTERNAL_UPDATE_KEY_ID = "matter-internal-update-key-v1";
export const INTERNAL_UNSIGNED_UPDATE_CHANNEL = "internal-unsigned";
export const INTERNAL_UNSIGNED_UPDATE_SCHEMA =
  "law-firm-os.matter-desktop-internal-unsigned-update.v2";
export const INTERNAL_UNSIGNED_REVOCATION_SCHEMA =
  "law-firm-os.matter-desktop-internal-unsigned-revocations.v1";
export const INTERNAL_UNSIGNED_ROLLBACK_SCHEMA =
  "law-firm-os.matter-desktop-internal-unsigned-rollback.v2";
export const EXTERNAL_PILOT_UPDATE_CHANNEL = "external-pilot";
export const EXTERNAL_PILOT_UPDATE_SCHEMA = "law-firm-os.matter-desktop-external-pilot-update.v2";

const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_OBJECT = /^[0-9a-f]{40}$/u;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const ARTIFACT_FILENAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/u;
const S3_VERSION_ID = /^[A-Za-z0-9][A-Za-z0-9._+=/-]{0,1023}$/u;
const INTERNAL_UNSIGNED_FIELDS = [
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
];
const INTERNAL_UNSIGNED_REVOCATION_FIELDS = [
  "appId",
  "channel",
  "expiresAt",
  "generatedAt",
  "keyId",
  "lawosTenantId",
  "revocationId",
  "revokedArtifactSha256s",
  "revokedReleaseIds",
  "revision",
  "schemaVersion",
];
const INTERNAL_UNSIGNED_ROLLBACK_FIELDS = [
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
];
const EXTERNAL_PILOT_FIELDS = [
  "appId",
  "approvalExpiresAt",
  "approvalId",
  "artifactBytes",
  "artifactFilename",
  "artifactSha256",
  "channel",
  "entraTenantId",
  "expiresAt",
  "generatedAt",
  "keyId",
  "lawosTenantId",
  "pilotId",
  "releaseManifestSha256",
  "schemaVersion",
  "sourceSha",
  "sourceTree",
  "tenantConfigSha256",
  "version",
];

function canonicalIso(value) {
  return typeof value === "string"
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
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

export function canonicalizeUpdateMetadata(metadata) {
  return JSON.stringify(canonicalValue(metadata));
}

function exactFields(value, fields) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
    && Object.keys(value).sort().join("\0") === [...fields].sort().join("\0");
}

function sortedUnique(values, pattern, maximum = 256) {
  return Array.isArray(values)
    && values.length <= maximum
    && values.every((value) => typeof value === "string" && pattern.test(value))
    && values.every((value, index) => index === 0 || values[index - 1] < value);
}

function activeWindow(document, maximumMs = 31 * 24 * 60 * 60 * 1000) {
  if (!canonicalIso(document.generatedAt) || !canonicalIso(document.expiresAt)) return false;
  const generatedAt = Date.parse(document.generatedAt);
  const expiresAt = Date.parse(document.expiresAt);
  return expiresAt > generatedAt && expiresAt - generatedAt <= maximumMs;
}

function internalUnsignedArtifactObjectKey(metadata) {
  return [
    INTERNAL_UNSIGNED_UPDATE_CHANNEL,
    metadata.platform,
    metadata.architecture,
    metadata.version,
    metadata.sourceSha,
    metadata.artifactSha256,
    metadata.artifactFilename,
  ].join("/");
}

function validUpdateMetadata(metadata) {
  const baseValid = Boolean(
    metadata
    && typeof metadata === "object"
    && !Array.isArray(metadata)
    && VERSION.test(metadata.version ?? "")
    && [
      "internal",
      INTERNAL_UNSIGNED_UPDATE_CHANNEL,
      EXTERNAL_PILOT_UPDATE_CHANNEL,
    ].includes(metadata.channel)
    && typeof metadata.keyId === "string"
    && metadata.keyId.length > 0
    && SHA256.test(metadata.artifactSha256 ?? "")
    && Number.isSafeInteger(metadata.artifactBytes)
    && metadata.artifactBytes > 0
  );
  if (!baseValid) return false;
  if (metadata.channel === INTERNAL_UNSIGNED_UPDATE_CHANNEL) {
    return exactFields(metadata, INTERNAL_UNSIGNED_FIELDS)
      && metadata.schemaVersion === INTERNAL_UNSIGNED_UPDATE_SCHEMA
      && IDENTIFIER.test(metadata.releaseId ?? "")
      && IDENTIFIER.test(metadata.lawosTenantId ?? "")
      && IDENTIFIER.test(metadata.installationId ?? "")
      && metadata.appId === "com.amic.matter.desktop.internal"
      && metadata.platform === "win32"
      && metadata.architecture === "x64"
      && ARTIFACT_FILENAME.test(metadata.artifactFilename ?? "")
      && metadata.artifactObjectKey === internalUnsignedArtifactObjectKey(metadata)
      && S3_VERSION_ID.test(metadata.artifactVersionId ?? "")
      && GIT_OBJECT.test(metadata.sourceSha ?? "")
      && GIT_OBJECT.test(metadata.sourceTree ?? "")
      && IDENTIFIER.test(metadata.predecessorReleaseId ?? "")
      && VERSION.test(metadata.predecessorVersion ?? "")
      && GIT_OBJECT.test(metadata.predecessorSourceSha ?? "")
      && GIT_OBJECT.test(metadata.predecessorSourceTree ?? "")
      && Number.isSafeInteger(metadata.releaseSequence)
      && metadata.releaseSequence > 0
      && SHA256.test(metadata.releaseManifestSha256 ?? "")
      && metadata.authenticodeStatus === "not_signed"
      && metadata.distribution === "private"
      && metadata.managedDeviceOnly === true
      && metadata.publicReleaseAllowed === false
      && metadata.artifactBytes <= 2 * 1024 * 1024 * 1024
      && activeWindow(metadata);
  }
  if (metadata.channel !== EXTERNAL_PILOT_UPDATE_CHANNEL) return baseValid;
  return Object.keys(metadata).sort().join("\0") === [...EXTERNAL_PILOT_FIELDS].sort().join("\0")
    && metadata.schemaVersion === EXTERNAL_PILOT_UPDATE_SCHEMA
    && typeof metadata.pilotId === "string"
    && metadata.pilotId.length > 0
    && typeof metadata.lawosTenantId === "string"
    && metadata.lawosTenantId.length > 0
    && typeof metadata.entraTenantId === "string"
    && metadata.entraTenantId.length > 0
    && typeof metadata.appId === "string"
    && metadata.appId.length > 0
    && typeof metadata.artifactFilename === "string"
    && metadata.artifactFilename.length > 0
    && GIT_OBJECT.test(metadata.sourceSha ?? "")
    && GIT_OBJECT.test(metadata.sourceTree ?? "")
    && SHA256.test(metadata.tenantConfigSha256 ?? "")
    && SHA256.test(metadata.releaseManifestSha256 ?? "")
    && typeof metadata.approvalId === "string"
    && metadata.approvalId.length > 0
    && canonicalIso(metadata.generatedAt)
    && canonicalIso(metadata.expiresAt)
    && canonicalIso(metadata.approvalExpiresAt)
    && Date.parse(metadata.expiresAt) > Date.parse(metadata.generatedAt)
    && Date.parse(metadata.approvalExpiresAt) >= Date.parse(metadata.expiresAt);
}

function validInternalUnsignedRevocations(document) {
  return exactFields(document, INTERNAL_UNSIGNED_REVOCATION_FIELDS)
    && document.schemaVersion === INTERNAL_UNSIGNED_REVOCATION_SCHEMA
    && document.channel === INTERNAL_UNSIGNED_UPDATE_CHANNEL
    && document.appId === "com.amic.matter.desktop.internal"
    && IDENTIFIER.test(document.lawosTenantId ?? "")
    && IDENTIFIER.test(document.keyId ?? "")
    && IDENTIFIER.test(document.revocationId ?? "")
    && Number.isSafeInteger(document.revision)
    && document.revision > 0
    && sortedUnique(document.revokedReleaseIds, IDENTIFIER)
    && sortedUnique(document.revokedArtifactSha256s, SHA256)
    && activeWindow(document);
}

function validInternalUnsignedRollback(document) {
  return exactFields(document, INTERNAL_UNSIGNED_ROLLBACK_FIELDS)
    && document.schemaVersion === INTERNAL_UNSIGNED_ROLLBACK_SCHEMA
    && document.channel === INTERNAL_UNSIGNED_UPDATE_CHANNEL
    && document.appId === "com.amic.matter.desktop.internal"
    && IDENTIFIER.test(document.lawosTenantId ?? "")
    && IDENTIFIER.test(document.installationId ?? "")
    && IDENTIFIER.test(document.keyId ?? "")
    && IDENTIFIER.test(document.rollbackId ?? "")
    && IDENTIFIER.test(document.fromReleaseId ?? "")
    && VERSION.test(document.fromVersion ?? "")
    && GIT_OBJECT.test(document.fromSourceSha ?? "")
    && GIT_OBJECT.test(document.fromSourceTree ?? "")
    && IDENTIFIER.test(document.targetReleaseId ?? "")
    && VERSION.test(document.targetVersion ?? "")
    && GIT_OBJECT.test(document.targetSourceSha ?? "")
    && GIT_OBJECT.test(document.targetSourceTree ?? "")
    && SHA256.test(document.targetArtifactSha256 ?? "")
    && S3_VERSION_ID.test(document.targetArtifactVersionId ?? "")
    && SHA256.test(document.targetMetadataSha256 ?? "")
    && validUpdateMetadata(document.targetMetadata)
    && document.targetMetadata.channel === INTERNAL_UNSIGNED_UPDATE_CHANNEL
    && document.targetMetadata.lawosTenantId === document.lawosTenantId
    && document.targetMetadata.installationId === document.installationId
    && document.targetMetadata.appId === document.appId
    && document.targetMetadata.keyId === document.keyId
    && document.targetMetadata.releaseId === document.targetReleaseId
    && document.targetMetadata.version === document.targetVersion
    && document.targetMetadata.sourceSha === document.targetSourceSha
    && document.targetMetadata.sourceTree === document.targetSourceTree
    && document.targetMetadata.artifactSha256 === document.targetArtifactSha256
    && document.targetMetadata.artifactVersionId === document.targetArtifactVersionId
    && createHash("sha256").update(canonicalDocumentBytes(document.targetMetadata)).digest("hex")
      === document.targetMetadataSha256
    && Number.isSafeInteger(document.revocationRevision)
    && document.revocationRevision > 0
    && IDENTIFIER.test(document.reasonCode ?? "")
    && activeWindow(document, 24 * 60 * 60 * 1000);
}

export function assertInternalUnsignedRevocationsDocument(document) {
  if (!validInternalUnsignedRevocations(document)) {
    throw new TypeError("internal-unsigned revocation document is invalid");
  }
  return document;
}

export function assertInternalUnsignedRollbackDocument(document) {
  if (!validInternalUnsignedRollback(document)) {
    throw new TypeError("internal-unsigned rollback authorization is invalid");
  }
  return document;
}

function privateEd25519Key(input) {
  const key = input?.type === "private" ? input : createPrivateKey(input);
  if (key.asymmetricKeyType !== "ed25519") throw new TypeError("update signing key must be Ed25519");
  return key;
}

function publicEd25519Key(input) {
  const key = input?.type === "public" ? input : createPublicKey(input);
  if (key.asymmetricKeyType !== "ed25519") throw new TypeError("update verification key must be Ed25519");
  return key;
}

function canonicalDocumentBytes(document) {
  return Buffer.from(`${canonicalizeUpdateMetadata(document)}\n`);
}

function rawSignature(input) {
  if (!(input instanceof Uint8Array)) return null;
  const signature = Buffer.from(input);
  return signature.byteLength === 64 ? signature : null;
}

function signCanonicalDocument(document, privateKey, validator, label) {
  if (!validator(document)) throw new TypeError(`${label} is invalid`);
  if (!privateKey) throw new TypeError("update signing private key is required");
  const documentBytes = canonicalDocumentBytes(document);
  return Object.freeze({
    documentBytes,
    signatureBytes: signBytes(null, documentBytes, privateEd25519Key(privateKey)),
    sha256: createHash("sha256").update(documentBytes).digest("hex"),
  });
}

function verifyAndParseCanonicalDocument({
  documentBytes,
  signatureBytes,
  trustedKeyId,
  trustedPublicKeys,
  validator,
}) {
  if (!(documentBytes instanceof Uint8Array)
      || documentBytes.byteLength === 0
      || documentBytes.byteLength > 64 * 1024
      || !IDENTIFIER.test(trustedKeyId ?? "")) {
    return { valid: false, reason: "invalid_document_bytes" };
  }
  const trustedKey = trustedPublicKeys?.[trustedKeyId];
  const signature = rawSignature(signatureBytes);
  if (!trustedKey || !signature) return { valid: false, reason: "signature_check_failed" };
  const exactBytes = Buffer.from(documentBytes);
  try {
    if (!verifyBytes(null, exactBytes, publicEd25519Key(trustedKey), signature)) {
      return { valid: false, reason: "signature_check_failed" };
    }
  } catch {
    return { valid: false, reason: "signature_check_failed" };
  }

  let document;
  try {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(exactBytes);
    if (source.includes("\0")) return { valid: false, reason: "invalid_document_encoding" };
    document = JSON.parse(source);
  } catch {
    return { valid: false, reason: "invalid_document_json" };
  }
  if (!validator(document)) return { valid: false, reason: "invalid_document_schema" };
  if (document.keyId !== trustedKeyId) return { valid: false, reason: "key_identity_mismatch" };
  const canonicalBytes = canonicalDocumentBytes(document);
  if (canonicalBytes.byteLength !== exactBytes.byteLength
      || !canonicalBytes.equals(exactBytes)) {
    return { valid: false, reason: "noncanonical_document_bytes" };
  }
  return Object.freeze({
    valid: true,
    document: Object.freeze(document),
    sha256: createHash("sha256").update(exactBytes).digest("hex"),
  });
}

export function signUpdateMetadataBytes(metadata, privateKey) {
  const signed = signCanonicalDocument(
    metadata,
    privateKey,
    validUpdateMetadata,
    "update metadata",
  );
  return Object.freeze({
    metadataBytes: signed.documentBytes,
    signatureBytes: signed.signatureBytes,
    metadataSha256: signed.sha256,
  });
}

export function verifyAndParseUpdateMetadataBytes(input) {
  const verified = verifyAndParseCanonicalDocument({
    documentBytes: input?.metadataBytes,
    signatureBytes: input?.signatureBytes,
    trustedKeyId: input?.trustedKeyId,
    trustedPublicKeys: input?.trustedPublicKeys,
    validator: validUpdateMetadata,
  });
  if (!verified.valid) return verified;
  return Object.freeze({
    valid: true,
    metadata: verified.document,
    metadataSha256: verified.sha256,
  });
}

export function signInternalUnsignedRevocationsBytes(document, privateKey) {
  const signed = signCanonicalDocument(
    assertInternalUnsignedRevocationsDocument(document),
    privateKey,
    validInternalUnsignedRevocations,
    "internal-unsigned revocation document",
  );
  return Object.freeze({
    revocationBytes: signed.documentBytes,
    signatureBytes: signed.signatureBytes,
    revocationSha256: signed.sha256,
  });
}

export function verifyAndParseInternalUnsignedRevocationsBytes(input) {
  const verified = verifyAndParseCanonicalDocument({
    documentBytes: input?.revocationBytes,
    signatureBytes: input?.signatureBytes,
    trustedKeyId: input?.trustedKeyId,
    trustedPublicKeys: input?.trustedPublicKeys,
    validator: validInternalUnsignedRevocations,
  });
  if (!verified.valid) return verified;
  return Object.freeze({
    valid: true,
    revocations: verified.document,
    revocationSha256: verified.sha256,
  });
}

export function signInternalUnsignedRollbackBytes(document, privateKey) {
  const signed = signCanonicalDocument(
    assertInternalUnsignedRollbackDocument(document),
    privateKey,
    validInternalUnsignedRollback,
    "internal-unsigned rollback authorization",
  );
  return Object.freeze({
    rollbackBytes: signed.documentBytes,
    signatureBytes: signed.signatureBytes,
    rollbackSha256: signed.sha256,
  });
}

export function verifyAndParseInternalUnsignedRollbackBytes(input) {
  const verified = verifyAndParseCanonicalDocument({
    documentBytes: input?.rollbackBytes,
    signatureBytes: input?.signatureBytes,
    trustedKeyId: input?.trustedKeyId,
    trustedPublicKeys: input?.trustedPublicKeys,
    validator: validInternalUnsignedRollback,
  });
  if (!verified.valid) return verified;
  return Object.freeze({
    valid: true,
    rollback: verified.document,
    rollbackSha256: verified.sha256,
  });
}

export function signUpdateMetadata(metadata, privateKey) {
  if (!validUpdateMetadata(metadata)) throw new TypeError("update metadata is invalid");
  if (!privateKey) throw new TypeError("update signing private key is required");
  return signBytes(
    null,
    Buffer.from(canonicalizeUpdateMetadata(metadata)),
    privateEd25519Key(privateKey),
  ).toString("base64");
}

export function verifyUpdateMetadata({ metadata, signature, trustedPublicKeys = {} }) {
  if (!validUpdateMetadata(metadata) || typeof signature !== "string") return false;
  const trustedKey = trustedPublicKeys[metadata.keyId];
  if (!trustedKey) return false;
  try {
    const signatureBytes = Buffer.from(signature, "base64");
    if (signatureBytes.length !== 64 || signatureBytes.toString("base64") !== signature) return false;
    return verifyBytes(
      null,
      Buffer.from(canonicalizeUpdateMetadata(metadata)),
      publicEd25519Key(trustedKey),
      signatureBytes,
    );
  } catch {
    return false;
  }
}

export function createUpdateController({
  currentVersion,
  channel = "internal",
  pilotId = null,
  lawosTenantId = null,
  entraTenantId = null,
  appId = null,
  tenantConfigSha256 = null,
  approvalId = null,
  installationId = null,
  revokedReleaseIds = [],
  currentReleaseId = null,
  currentSourceSha = null,
  currentSourceTree = null,
  currentReleaseSequence = null,
  currentArtifactSha256 = null,
  currentArtifactVersionId = null,
  previousKnownGoodRelease = null,
  consumedRollbackIds = [],
  platform = "win32",
  architecture = "x64",
  trustedKeyId = INTERNAL_UPDATE_KEY_ID,
  trustedPublicKeys = {},
  now = () => Date.now(),
} = {}) {
  if (!["internal", INTERNAL_UNSIGNED_UPDATE_CHANNEL, EXTERNAL_PILOT_UPDATE_CHANNEL].includes(channel)) {
    throw new TypeError("update controller channel is invalid");
  }
  if (channel === INTERNAL_UNSIGNED_UPDATE_CHANNEL
    && (!IDENTIFIER.test(lawosTenantId ?? "")
      || !IDENTIFIER.test(installationId ?? "")
      || appId !== "com.amic.matter.desktop.internal"
      || platform !== "win32"
      || architecture !== "x64"
      || !IDENTIFIER.test(trustedKeyId ?? "")
      || !IDENTIFIER.test(currentReleaseId ?? "")
      || !VERSION.test(currentVersion ?? "")
      || !GIT_OBJECT.test(currentSourceSha ?? "")
      || !GIT_OBJECT.test(currentSourceTree ?? "")
      || !Number.isSafeInteger(currentReleaseSequence)
      || currentReleaseSequence < 0
      || !SHA256.test(currentArtifactSha256 ?? "")
      || !S3_VERSION_ID.test(currentArtifactVersionId ?? "")
      || !sortedUnique(consumedRollbackIds, IDENTIFIER)
      || (previousKnownGoodRelease !== null
        && (!exactFields(previousKnownGoodRelease, [
          "artifactSha256",
          "artifactVersionId",
          "releaseId",
          "releaseSequence",
          "sourceSha",
          "sourceTree",
          "version",
        ])
          || !IDENTIFIER.test(previousKnownGoodRelease.releaseId ?? "")
          || !VERSION.test(previousKnownGoodRelease.version ?? "")
          || !GIT_OBJECT.test(previousKnownGoodRelease.sourceSha ?? "")
          || !GIT_OBJECT.test(previousKnownGoodRelease.sourceTree ?? "")
          || !Number.isSafeInteger(previousKnownGoodRelease.releaseSequence)
          || previousKnownGoodRelease.releaseSequence < 1
          || !SHA256.test(previousKnownGoodRelease.artifactSha256 ?? "")
          || !S3_VERSION_ID.test(previousKnownGoodRelease.artifactVersionId ?? "")
          || previousKnownGoodRelease.releaseId === currentReleaseId)))) {
    throw new TypeError(
      "internal-unsigned update controller requires exact managed installation and current release bindings",
    );
  }
  if (channel === EXTERNAL_PILOT_UPDATE_CHANNEL
    && (!pilotId || !lawosTenantId || !entraTenantId || !appId || !approvalId
      || !SHA256.test(tenantConfigSha256 ?? ""))) {
    throw new TypeError("external-pilot update controller requires pilot, tenant, app, approval, and tenant configuration bindings");
  }

  let activeVersion = currentVersion;
  let previousVersion = null;
  const verifiedVersions = new Set([currentVersion]);
  const revokedReleases = new Set(revokedReleaseIds);
  const revokedArtifacts = new Set();
  const usedReleaseIds = new Set();
  const usedRollbackIds = new Set(consumedRollbackIds);
  const preparedCandidates = new WeakSet();
  const stagedCandidates = new WeakSet();
  const preparedRollbackCandidates = new WeakSet();
  const stagedRollbackCandidates = new WeakSet();
  const consumedCandidates = new WeakSet();
  let revocationRevision = 0;
  let revocationSha256 = null;
  let activeRelease = channel === INTERNAL_UNSIGNED_UPDATE_CHANNEL
    ? Object.freeze({
      releaseId: currentReleaseId,
      version: currentVersion,
      sourceSha: currentSourceSha,
      sourceTree: currentSourceTree,
      releaseSequence: currentReleaseSequence,
      artifactSha256: currentArtifactSha256,
      artifactVersionId: currentArtifactVersionId,
    })
    : null;
  let previousRelease = previousKnownGoodRelease === null
    ? null
    : Object.freeze({ ...previousKnownGoodRelease });
  const knownGoodReleases = new Map(
    [activeRelease, previousRelease]
      .filter(Boolean)
      .map((release) => [release.releaseId, release]),
  );

  function activeTimeReason(document) {
    return Date.parse(document.generatedAt) > now()
      || Date.parse(document.expiresAt) <= now()
      ? "metadata_expired_or_not_active"
      : null;
  }

  function internalBindingReason(metadata, { requireForwardLineage = true } = {}) {
    if (metadata.channel === "public") return "public_channel_disabled";
    if (metadata.channel !== INTERNAL_UNSIGNED_UPDATE_CHANNEL) return "channel_mismatch";
    if (metadata.appId !== appId) return "app_identity_mismatch";
    if (metadata.lawosTenantId !== lawosTenantId
        || metadata.installationId !== installationId) {
      return "managed_installation_mismatch";
    }
    if (metadata.platform !== platform || metadata.architecture !== architecture) {
      return "platform_or_architecture_mismatch";
    }
    if (revokedReleases.has(metadata.releaseId)
        || revokedArtifacts.has(metadata.artifactSha256)) {
      return "release_revoked";
    }
    const inactive = activeTimeReason(metadata);
    if (inactive) return inactive;
    if (!requireForwardLineage) return null;
    if (usedReleaseIds.has(metadata.releaseId) || metadata.releaseId === activeRelease.releaseId) {
      return "release_replay";
    }
    if (metadata.predecessorReleaseId !== activeRelease.releaseId
        || metadata.predecessorVersion !== activeRelease.version
        || metadata.predecessorSourceSha !== activeRelease.sourceSha
        || metadata.predecessorSourceTree !== activeRelease.sourceTree) {
      return "predecessor_lineage_mismatch";
    }
    if (metadata.releaseSequence <= activeRelease.releaseSequence) {
      return "release_sequence_not_newer";
    }
    return null;
  }

  function verifyRevocations({ revocationBytes, revocationSignatureBytes }) {
    if (!(revocationBytes instanceof Uint8Array)
        || !(revocationSignatureBytes instanceof Uint8Array)) {
      return { valid: false, reason: "signed_revocations_required" };
    }
    const verified = verifyAndParseInternalUnsignedRevocationsBytes({
      revocationBytes,
      signatureBytes: revocationSignatureBytes,
      trustedKeyId,
      trustedPublicKeys,
    });
    if (!verified.valid) return verified;
    const document = verified.revocations;
    if (document.appId !== appId || document.lawosTenantId !== lawosTenantId) {
      return { valid: false, reason: "revocation_scope_mismatch" };
    }
    if (Date.parse(document.generatedAt) > now() || Date.parse(document.expiresAt) <= now()) {
      return { valid: false, reason: "revocations_expired_or_not_active" };
    }
    if (document.revision < revocationRevision) {
      return { valid: false, reason: "revocation_revision_regressed" };
    }
    if (document.revision === revocationRevision
        && revocationSha256 !== null
        && verified.revocationSha256 !== revocationSha256) {
      return { valid: false, reason: "revocation_revision_conflict" };
    }
    if (document.revision > revocationRevision) {
      revokedReleases.clear();
      revokedArtifacts.clear();
      for (const releaseId of document.revokedReleaseIds) revokedReleases.add(releaseId);
      for (const digest of document.revokedArtifactSha256s) revokedArtifacts.add(digest);
      revocationRevision = document.revision;
      revocationSha256 = verified.revocationSha256;
    }
    return Object.freeze({
      valid: true,
      revision: document.revision,
      sha256: verified.revocationSha256,
    });
  }

  function denyReason(metadata, signature) {
    if (metadata?.channel === "public") return "public_channel_disabled";
    if (metadata?.channel !== channel) return "channel_mismatch";
    if (!validUpdateMetadata(metadata)) return "invalid_metadata";
    if (channel === INTERNAL_UNSIGNED_UPDATE_CHANNEL
      && metadata.appId !== appId) {
      return "app_identity_mismatch";
    }
    if (channel === INTERNAL_UNSIGNED_UPDATE_CHANNEL
      && (metadata.lawosTenantId !== lawosTenantId
        || metadata.installationId !== installationId)) {
      return "managed_installation_mismatch";
    }
    if (channel === INTERNAL_UNSIGNED_UPDATE_CHANNEL
      && revokedReleases.has(metadata.releaseId)) {
      return "release_revoked";
    }
    if (channel === INTERNAL_UNSIGNED_UPDATE_CHANNEL
      && (Date.parse(metadata.generatedAt) > now()
        || Date.parse(metadata.expiresAt) <= now())) {
      return "metadata_expired_or_not_active";
    }
    if (channel === EXTERNAL_PILOT_UPDATE_CHANNEL && metadata.appId !== appId) {
      return "app_identity_mismatch";
    }
    if (channel === EXTERNAL_PILOT_UPDATE_CHANNEL
      && (metadata.pilotId !== pilotId
        || metadata.lawosTenantId !== lawosTenantId
        || metadata.entraTenantId !== entraTenantId
        || metadata.tenantConfigSha256 !== tenantConfigSha256)) {
      return "tenant_configuration_mismatch";
    }
    if (channel === EXTERNAL_PILOT_UPDATE_CHANNEL && metadata.approvalId !== approvalId) {
      return "approval_scope_mismatch";
    }
    if (channel === EXTERNAL_PILOT_UPDATE_CHANNEL
      && (Date.parse(metadata.generatedAt) > now()
        || Date.parse(metadata.expiresAt) <= now()
        || Date.parse(metadata.approvalExpiresAt) <= now())) {
      return "metadata_expired_or_not_active";
    }
    if (!verifyUpdateMetadata({ metadata, signature, trustedPublicKeys })) {
      return "signature_check_failed";
    }
    return null;
  }

  function downloadedArtifactReason(metadata, artifactBytes) {
    if (!(artifactBytes instanceof Uint8Array)) return "download_verification_required";
    if (artifactBytes.byteLength !== metadata.artifactBytes) return "artifact_size_mismatch";
    const digest = createHash("sha256").update(artifactBytes).digest("hex");
    if (digest !== metadata.artifactSha256) return "artifact_sha256_mismatch";
    return null;
  }

  function internalCompletionReceipt({ state, metadata, metadataSha256, prior, rollback = null }) {
    const body = {
      state,
      version: metadata.version,
      releaseId: metadata.releaseId,
      previousVersion: prior.version,
      previousReleaseId: prior.releaseId,
      keyId: trustedKeyId,
      metadataSha256,
      artifactSha256: metadata.artifactSha256,
      artifactBytes: metadata.artifactBytes,
      artifactVersionId: metadata.artifactVersionId,
      revocationRevision,
      ...(rollback ? {
        rollbackId: rollback.rollbackId,
        rollbackSha256: rollback.rollbackSha256,
      } : {}),
    };
    return Object.freeze({
      ...body,
      receiptSha256: createHash("sha256")
        .update(canonicalizeUpdateMetadata(body))
        .digest("hex"),
    });
  }

  function prepareInternalUnsignedBytes({
    metadataBytes,
    signatureBytes,
    revocationBytes,
    revocationSignatureBytes,
  } = {}) {
    const verified = verifyAndParseUpdateMetadataBytes({
      metadataBytes,
      signatureBytes,
      trustedKeyId,
      trustedPublicKeys,
    });
    if (!verified.valid) return { state: "denied", reason: verified.reason };
    const revocations = verifyRevocations({ revocationBytes, revocationSignatureBytes });
    if (!revocations.valid) return { state: "denied", reason: revocations.reason };
    const denied = internalBindingReason(verified.metadata);
    if (denied) return { state: "denied", reason: denied };
    const candidate = Object.freeze({
      releaseId: verified.metadata.releaseId,
      version: verified.metadata.version,
      sourceSha: verified.metadata.sourceSha,
      sourceTree: verified.metadata.sourceTree,
      releaseSequence: verified.metadata.releaseSequence,
      artifactFilename: verified.metadata.artifactFilename,
      artifactSha256: verified.metadata.artifactSha256,
      artifactBytes: verified.metadata.artifactBytes,
      artifactVersionId: verified.metadata.artifactVersionId,
      metadataSha256: verified.metadataSha256,
      metadata: verified.metadata,
    });
    preparedCandidates.add(candidate);
    return Object.freeze({
      state: "prepared",
      candidate,
      releaseId: candidate.releaseId,
      version: candidate.version,
      artifactSha256: candidate.artifactSha256,
      artifactBytes: candidate.artifactBytes,
      artifactVersionId: candidate.artifactVersionId,
      metadataSha256: candidate.metadataSha256,
      revocationRevision,
    });
  }

  function confirmStagedInternalUnsignedUpdate({ candidate, staged } = {}) {
    if (!preparedCandidates.has(candidate) || consumedCandidates.has(candidate)) {
      return { state: "denied", reason: "prepared_candidate_required" };
    }
    const exact = staged?.state === "staged"
      && staged.releaseId === candidate.releaseId
      && staged.version === candidate.version
      && staged.artifactSha256 === candidate.artifactSha256
      && staged.artifactBytes === candidate.artifactBytes
      && staged.artifactVersionId === candidate.artifactVersionId
      && staged.localPathIncluded === false
      && staged.automaticReplacement === false;
    if (!exact) return { state: "denied", reason: "staged_candidate_mismatch" };
    stagedCandidates.add(candidate);
    const body = {
      state: "staged_verified",
      releaseId: candidate.releaseId,
      version: candidate.version,
      metadataSha256: candidate.metadataSha256,
      artifactSha256: candidate.artifactSha256,
      artifactBytes: candidate.artifactBytes,
      artifactVersionId: candidate.artifactVersionId,
      revocationRevision,
    };
    return Object.freeze({
      ...body,
      receiptSha256: createHash("sha256")
        .update(canonicalizeUpdateMetadata(body))
        .digest("hex"),
      localPathIncluded: false,
      signedUrlIncluded: false,
      automaticReplacement: false,
    });
  }

  function commitPreparedInternalUnsignedUpdate(candidate) {
    if (!preparedCandidates.has(candidate)
        || !stagedCandidates.has(candidate)
        || consumedCandidates.has(candidate)) {
      return { state: "denied", reason: "staged_verification_required" };
    }
    const prior = activeRelease;
    previousRelease = prior;
    activeRelease = Object.freeze({
      releaseId: candidate.releaseId,
      version: candidate.version,
      sourceSha: candidate.sourceSha,
      sourceTree: candidate.sourceTree,
      releaseSequence: candidate.releaseSequence,
      artifactSha256: candidate.artifactSha256,
      artifactVersionId: candidate.artifactVersionId,
      metadataSha256: candidate.metadataSha256,
    });
    knownGoodReleases.set(activeRelease.releaseId, activeRelease);
    usedReleaseIds.add(activeRelease.releaseId);
    consumedCandidates.add(candidate);
    activeVersion = activeRelease.version;
    return internalCompletionReceipt({
      state: "updated",
      metadata: candidate.metadata,
      metadataSha256: candidate.metadataSha256,
      prior,
    });
  }

  async function applyInternalUnsignedBytes({
    metadataBytes,
    signatureBytes,
    revocationBytes,
    revocationSignatureBytes,
    artifactBytes,
  } = {}) {
    const prepared = prepareInternalUnsignedBytes({
      metadataBytes,
      signatureBytes,
      revocationBytes,
      revocationSignatureBytes,
    });
    if (prepared.state !== "prepared") return prepared;
    const blocked = downloadedArtifactReason(prepared.candidate.metadata, artifactBytes);
    if (blocked) return { state: "blocked", reason: blocked };
    const staged = confirmStagedInternalUnsignedUpdate({
      candidate: prepared.candidate,
      staged: {
        state: "staged",
        releaseId: prepared.candidate.releaseId,
        version: prepared.candidate.version,
        artifactSha256: prepared.candidate.artifactSha256,
        artifactBytes: prepared.candidate.artifactBytes,
        artifactVersionId: prepared.candidate.artifactVersionId,
        localPathIncluded: false,
        automaticReplacement: false,
      },
    });
    if (staged.state !== "staged_verified") return staged;
    return commitPreparedInternalUnsignedUpdate(prepared.candidate);
  }

  function prepareInternalUnsignedRollbackBytes({
    metadataBytes,
    signatureBytes,
    rollbackBytes,
    rollbackSignatureBytes,
    revocationBytes,
    revocationSignatureBytes,
  } = {}) {
    if (!previousRelease) return { state: "denied", reason: "no_previous_release" };
    const target = verifyAndParseUpdateMetadataBytes({
      metadataBytes,
      signatureBytes,
      trustedKeyId,
      trustedPublicKeys,
    });
    if (!target.valid) return { state: "denied", reason: target.reason };
    const authorization = verifyAndParseInternalUnsignedRollbackBytes({
      rollbackBytes,
      signatureBytes: rollbackSignatureBytes,
      trustedKeyId,
      trustedPublicKeys,
    });
    if (!authorization.valid) return {
      state: "denied",
      reason: rollbackBytes == null
        ? "signed_rollback_authorization_required"
        : authorization.reason,
    };
    const revocations = verifyRevocations({ revocationBytes, revocationSignatureBytes });
    if (!revocations.valid) return { state: "denied", reason: revocations.reason };
    const denied = internalBindingReason(target.metadata, { requireForwardLineage: false });
    if (denied) return { state: "denied", reason: denied };
    const rollback = authorization.rollback;
    if (Date.parse(rollback.generatedAt) > now() || Date.parse(rollback.expiresAt) <= now()) {
      return { state: "denied", reason: "rollback_authorization_expired_or_not_active" };
    }
    if (rollback.appId !== appId
        || rollback.lawosTenantId !== lawosTenantId
        || rollback.installationId !== installationId) {
      return { state: "denied", reason: "rollback_scope_mismatch" };
    }
    if (usedRollbackIds.has(rollback.rollbackId)) {
      return { state: "denied", reason: "rollback_replay" };
    }
    if (rollback.revocationRevision !== revocationRevision) {
      return { state: "denied", reason: "rollback_revocation_revision_mismatch" };
    }
    if (rollback.fromReleaseId !== activeRelease.releaseId
        || rollback.fromVersion !== activeRelease.version
        || rollback.fromSourceSha !== activeRelease.sourceSha
        || rollback.fromSourceTree !== activeRelease.sourceTree) {
      return { state: "denied", reason: "rollback_source_mismatch" };
    }
    const knownTarget = knownGoodReleases.get(rollback.targetReleaseId);
    if (!knownTarget || rollback.targetReleaseId !== previousRelease.releaseId) {
      return { state: "denied", reason: "rollback_target_not_previous_known_good" };
    }
    if (rollback.targetReleaseId !== target.metadata.releaseId
        || rollback.targetVersion !== target.metadata.version
        || rollback.targetSourceSha !== target.metadata.sourceSha
        || rollback.targetSourceTree !== target.metadata.sourceTree
        || rollback.targetArtifactSha256 !== target.metadata.artifactSha256
        || rollback.targetArtifactVersionId !== target.metadata.artifactVersionId
        || rollback.targetMetadataSha256 !== target.metadataSha256
        || canonicalizeUpdateMetadata(rollback.targetMetadata)
          !== canonicalizeUpdateMetadata(target.metadata)) {
      return { state: "denied", reason: "rollback_target_mismatch" };
    }
    if (knownTarget.version !== target.metadata.version
        || knownTarget.sourceSha !== target.metadata.sourceSha
        || knownTarget.sourceTree !== target.metadata.sourceTree
        || knownTarget.releaseSequence !== target.metadata.releaseSequence
        || knownTarget.artifactSha256 !== target.metadata.artifactSha256
        || knownTarget.artifactVersionId !== target.metadata.artifactVersionId) {
      return { state: "denied", reason: "rollback_target_unverified" };
    }
    const candidate = Object.freeze({
      releaseId: target.metadata.releaseId,
      version: target.metadata.version,
      sourceSha: target.metadata.sourceSha,
      sourceTree: target.metadata.sourceTree,
      releaseSequence: target.metadata.releaseSequence,
      artifactFilename: target.metadata.artifactFilename,
      artifactSha256: target.metadata.artifactSha256,
      artifactBytes: target.metadata.artifactBytes,
      artifactVersionId: target.metadata.artifactVersionId,
      metadataSha256: target.metadataSha256,
      metadata: target.metadata,
      rollbackId: rollback.rollbackId,
      rollbackSha256: authorization.rollbackSha256,
    });
    preparedRollbackCandidates.add(candidate);
    return Object.freeze({
      state: "rollback_prepared",
      candidate,
      releaseId: candidate.releaseId,
      version: candidate.version,
      artifactSha256: candidate.artifactSha256,
      artifactBytes: candidate.artifactBytes,
      artifactVersionId: candidate.artifactVersionId,
      metadataSha256: candidate.metadataSha256,
      rollbackId: candidate.rollbackId,
      rollbackSha256: candidate.rollbackSha256,
      revocationRevision,
    });
  }

  function confirmStagedInternalUnsignedRollback({ candidate, staged } = {}) {
    if (!preparedRollbackCandidates.has(candidate) || consumedCandidates.has(candidate)) {
      return { state: "denied", reason: "prepared_rollback_candidate_required" };
    }
    const exact = staged?.state === "staged"
      && staged.releaseId === candidate.releaseId
      && staged.version === candidate.version
      && staged.artifactSha256 === candidate.artifactSha256
      && staged.artifactBytes === candidate.artifactBytes
      && staged.artifactVersionId === candidate.artifactVersionId
      && staged.localPathIncluded === false
      && staged.automaticReplacement === false;
    if (!exact) return { state: "denied", reason: "staged_rollback_candidate_mismatch" };
    stagedRollbackCandidates.add(candidate);
    const body = {
      state: "rollback_staged_verified",
      releaseId: candidate.releaseId,
      version: candidate.version,
      metadataSha256: candidate.metadataSha256,
      artifactSha256: candidate.artifactSha256,
      artifactBytes: candidate.artifactBytes,
      artifactVersionId: candidate.artifactVersionId,
      rollbackId: candidate.rollbackId,
      rollbackSha256: candidate.rollbackSha256,
      revocationRevision,
    };
    return Object.freeze({
      ...body,
      receiptSha256: createHash("sha256")
        .update(canonicalizeUpdateMetadata(body))
        .digest("hex"),
      localPathIncluded: false,
      signedUrlIncluded: false,
      automaticReplacement: false,
    });
  }

  function commitPreparedInternalUnsignedRollback(candidate) {
    if (!preparedRollbackCandidates.has(candidate)
        || !stagedRollbackCandidates.has(candidate)
        || consumedCandidates.has(candidate)) {
      return { state: "denied", reason: "staged_rollback_verification_required" };
    }
    const knownTarget = knownGoodReleases.get(candidate.releaseId);
    if (!knownTarget || candidate.releaseId !== previousRelease?.releaseId) {
      return { state: "denied", reason: "rollback_target_not_previous_known_good" };
    }

    const prior = activeRelease;
    activeRelease = Object.freeze({
      ...knownTarget,
      metadataSha256: candidate.metadataSha256,
    });
    previousRelease = null;
    activeVersion = activeRelease.version;
    usedRollbackIds.add(candidate.rollbackId);
    consumedCandidates.add(candidate);
    return internalCompletionReceipt({
      state: "rolled_back",
      metadata: candidate.metadata,
      metadataSha256: candidate.metadataSha256,
      prior,
      rollback: {
        rollbackId: candidate.rollbackId,
        rollbackSha256: candidate.rollbackSha256,
      },
    });
  }

  async function rollbackInternalUnsignedBytes(input = {}) {
    const prepared = prepareInternalUnsignedRollbackBytes(input);
    if (prepared.state !== "rollback_prepared") return prepared;
    const blocked = downloadedArtifactReason(prepared.candidate.metadata, input.artifactBytes);
    if (blocked) return { state: "blocked", reason: blocked };
    const staged = confirmStagedInternalUnsignedRollback({
      candidate: prepared.candidate,
      staged: {
        state: "staged",
        releaseId: prepared.candidate.releaseId,
        version: prepared.candidate.version,
        artifactSha256: prepared.candidate.artifactSha256,
        artifactBytes: prepared.candidate.artifactBytes,
        artifactVersionId: prepared.candidate.artifactVersionId,
        localPathIncluded: false,
        automaticReplacement: false,
      },
    });
    if (staged.state !== "rollback_staged_verified") return staged;
    return commitPreparedInternalUnsignedRollback(prepared.candidate);
  }

  return {
    activeVersion() {
      return activeVersion;
    },
    activeState() {
      if (channel !== INTERNAL_UNSIGNED_UPDATE_CHANNEL) {
        return Object.freeze({ version: activeVersion });
      }
      return Object.freeze({
        ...activeRelease,
        revocationRevision,
        previousReleaseId: previousRelease?.releaseId ?? null,
      });
    },
    prepareUpdateBytes: prepareInternalUnsignedBytes,
    confirmStagedUpdate: confirmStagedInternalUnsignedUpdate,
    prepareRollbackBytes: prepareInternalUnsignedRollbackBytes,
    confirmStagedRollback: confirmStagedInternalUnsignedRollback,
    applyUpdateBytes: applyInternalUnsignedBytes,
    rollbackUpdateBytes: rollbackInternalUnsignedBytes,
    async applyUpdate({ metadata, signature, artifactBytes }) {
      if (channel === INTERNAL_UNSIGNED_UPDATE_CHANNEL) {
        return { state: "denied", reason: "exact_metadata_bytes_required" };
      }
      const denied = denyReason(metadata, signature);
      if (denied) return { state: "denied", reason: denied };
      const blocked = downloadedArtifactReason(metadata, artifactBytes);
      if (blocked) return { state: "blocked", reason: blocked };
      previousVersion = activeVersion;
      activeVersion = metadata.version;
      verifiedVersions.add(metadata.version);
      return {
        state: "updated",
        version: activeVersion,
        previousVersion,
        keyId: metadata.keyId,
      };
    },
    async rollback({ metadata, signature, artifactBytes }) {
      if (channel === INTERNAL_UNSIGNED_UPDATE_CHANNEL) {
        return { state: "denied", reason: "signed_rollback_bytes_required" };
      }
      if (!previousVersion) return { state: "denied", reason: "no_previous_version" };
      if (metadata?.version !== previousVersion) return { state: "denied", reason: "rollback_target_mismatch" };
      if (!verifiedVersions.has(metadata.version)) return { state: "denied", reason: "rollback_target_unverified" };
      const denied = denyReason(metadata, signature);
      if (denied) return { state: "denied", reason: denied };
      const blocked = downloadedArtifactReason(metadata, artifactBytes);
      if (blocked) return { state: "blocked", reason: blocked };
      activeVersion = previousVersion;
      previousVersion = null;
      return {
        state: "rolled_back",
        version: activeVersion,
        keyId: metadata.keyId,
      };
    },
  };
}
