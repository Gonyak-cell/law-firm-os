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
  "law-firm-os.matter-desktop-internal-unsigned-update.v1";
export const EXTERNAL_PILOT_UPDATE_CHANNEL = "external-pilot";
export const EXTERNAL_PILOT_UPDATE_SCHEMA = "law-firm-os.matter-desktop-external-pilot-update.v2";

const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_OBJECT = /^[0-9a-f]{40}$/u;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const ARTIFACT_FILENAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/u;
const INTERNAL_UNSIGNED_FIELDS = [
  "appId",
  "artifactBytes",
  "artifactFilename",
  "artifactSha256",
  "authenticodeStatus",
  "channel",
  "distribution",
  "expiresAt",
  "generatedAt",
  "installationId",
  "keyId",
  "lawosTenantId",
  "managedDeviceOnly",
  "publicReleaseAllowed",
  "releaseId",
  "releaseManifestSha256",
  "schemaVersion",
  "sourceSha",
  "sourceTree",
  "version",
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
    const generatedAt = Date.parse(metadata.generatedAt);
    const expiresAt = Date.parse(metadata.expiresAt);
    return Object.keys(metadata).sort().join("\0") === [...INTERNAL_UNSIGNED_FIELDS].sort().join("\0")
      && metadata.schemaVersion === INTERNAL_UNSIGNED_UPDATE_SCHEMA
      && IDENTIFIER.test(metadata.releaseId ?? "")
      && IDENTIFIER.test(metadata.lawosTenantId ?? "")
      && IDENTIFIER.test(metadata.installationId ?? "")
      && metadata.appId === "com.amic.matter.desktop.internal"
      && ARTIFACT_FILENAME.test(metadata.artifactFilename ?? "")
      && GIT_OBJECT.test(metadata.sourceSha ?? "")
      && GIT_OBJECT.test(metadata.sourceTree ?? "")
      && SHA256.test(metadata.releaseManifestSha256 ?? "")
      && metadata.authenticodeStatus === "not_signed"
      && metadata.distribution === "private"
      && metadata.managedDeviceOnly === true
      && metadata.publicReleaseAllowed === false
      && canonicalIso(metadata.generatedAt)
      && canonicalIso(metadata.expiresAt)
      && expiresAt > generatedAt
      && expiresAt - generatedAt <= 31 * 24 * 60 * 60 * 1000;
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
  trustedPublicKeys = {},
  now = () => Date.now(),
} = {}) {
  if (!["internal", INTERNAL_UNSIGNED_UPDATE_CHANNEL, EXTERNAL_PILOT_UPDATE_CHANNEL].includes(channel)) {
    throw new TypeError("update controller channel is invalid");
  }
  if (channel === INTERNAL_UNSIGNED_UPDATE_CHANNEL
    && (!IDENTIFIER.test(lawosTenantId ?? "")
      || !IDENTIFIER.test(installationId ?? "")
      || appId !== "com.amic.matter.desktop.internal")) {
    throw new TypeError(
      "internal-unsigned update controller requires tenant, installation, and internal app bindings",
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

  return {
    activeVersion() {
      return activeVersion;
    },
    async applyUpdate({ metadata, signature, artifactBytes }) {
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
