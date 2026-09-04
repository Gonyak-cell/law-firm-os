import { createHash, createPublicKey, randomUUID } from "node:crypto";
import { lstatSync, readFileSync, rmSync } from "node:fs";
import { mkdir, open, rename, rm } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import {
  INTERNAL_UNSIGNED_UPDATE_CHANNEL,
  INTERNAL_UPDATE_KEY_ID,
  createUpdateController,
  verifyAndParseInternalUnsignedRevocationsBytes,
  verifyAndParseUpdateMetadataBytes,
} from "./updates.js";

export const INTERNAL_UNSIGNED_UPDATE_RUNTIME_SCHEMA =
  "law-firm-os.desktop-internal-unsigned-update-runtime.v1";
export const INTERNAL_UNSIGNED_UPDATE_STATE_SCHEMA =
  "law-firm-os.desktop-internal-unsigned-update-state.v2";
export const INTERNAL_UNSIGNED_UPDATE_TRUST_SCHEMA =
  "law-firm-os.matter-desktop-internal-update-trust.v1";
export const INTERNAL_UNSIGNED_UPDATE_TRUST_FILENAME = "matter-internal-update-trust.json";
export const INTERNAL_UNSIGNED_UPDATE_STATE_FILENAME = "internal-unsigned-update-state.json";
const INTERNAL_UNSIGNED_RELEASE_MARKER_FILENAME = "matter-internal-unsigned-release.json";

export const INTERNAL_UNSIGNED_UPDATE_IPC_CHANNELS = Object.freeze({
  status: "internalUpdate:status",
  check: "internalUpdate:check",
  stage: "internalUpdate:stage",
  stageRollback: "internalUpdate:stage-rollback",
  open: "internalUpdate:open",
  discard: "internalUpdate:discard",
});

const BROKER_SCHEMA = "law-firm-os.amic-internal-unsigned-download-authorization.v1";
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const SAFE_STAGE_ID = /^[a-f0-9-]{36}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const GIT_OBJECT = /^[a-f0-9]{40}$/u;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const VERSION_ID = /^[A-Za-z0-9][A-Za-z0-9._+=/-]{0,1023}$/u;
const CLOUDFRONT_HOST = /^d[a-z0-9]{3,62}\.cloudfront\.net$/u;
const DOCUMENT_LIMIT = 64 * 1024;
const SIGNATURE_BYTES = 64;
const STATE_FILE_LIMIT = 256 * 1024;
const USED_ROLLBACK_ID_LIMIT = 64;
const BROKER_FIELDS = [
  "authorization_receipt_sha256",
  "aws_credentials_returned",
  "downloads",
  "expires_at",
  "http_status",
  "outcome",
  "private_key_material_returned",
  "public_release_allowed",
  "raw_s3_location_returned",
  "release_id",
  "release_sequence",
  "schema_version",
  "version",
];
const DOWNLOAD_KINDS = [
  "artifact",
  "revocations",
  "revocations_signature",
  "rollback",
  "rollback_signature",
  "rollback_target_artifact",
  "rollback_target_metadata",
  "rollback_target_metadata_signature",
  "update_metadata",
  "update_metadata_signature",
];

export class InternalUnsignedUpdateRuntimeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "InternalUnsignedUpdateRuntimeError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new InternalUnsignedUpdateRuntimeError(code, message);
}

function exactFields(value, fields) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
    && Object.keys(value).sort().join("\0") === [...fields].sort().join("\0");
}

function canonicalBase64(value, maximum = STATE_FILE_LIMIT) {
  if (typeof value !== "string" || value.length < 1 || value.length > maximum * 2) return null;
  const bytes = Buffer.from(value, "base64");
  return bytes.byteLength <= maximum && bytes.toString("base64") === value ? bytes : null;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function safeError(error, fallback = "INTERNAL_UPDATE_FAILED") {
  const code = String(error?.code ?? fallback);
  return /^[A-Z0-9_]{1,96}$/u.test(code) ? code : fallback;
}

function projectStatus(status) {
  return Object.freeze({
    schema_version: INTERNAL_UNSIGNED_UPDATE_RUNTIME_SCHEMA,
    state: status.state,
    enabled: status.enabled === true,
    version: status.version ?? null,
    available_version: status.available_version ?? null,
    operation: ["update", "rollback"].includes(status.operation) ? status.operation : null,
    rollback_available: status.rollback_available === true,
    rollback_version: status.rollback_version ?? null,
    release_id: status.release_id ?? null,
    artifact_bytes: status.artifact_bytes ?? null,
    artifact_sha256: status.artifact_sha256 ?? null,
    receipt_sha256: status.receipt_sha256 ?? null,
    safe_error_code: status.safe_error_code ?? null,
    windows_warning_expected: status.windows_warning_expected === true,
    explicit_operator_action_required: status.explicit_operator_action_required === true,
    signed_url_returned: false,
    local_path_returned: false,
    raw_bytes_returned: false,
    automatic_installation: false,
    public_release_allowed: false,
  });
}

function disabledStatus(reason = "INTERNAL_UPDATE_NOT_AVAILABLE") {
  return projectStatus({ state: "disabled", enabled: false, safe_error_code: reason });
}

function validBuild(build) {
  return Boolean(build
    && build.schema_version === "law-firm-os.matter-desktop-build-provenance.v1"
    && build.package_name === "@law-firm-os/desktop"
    && build.product_name === "matter"
    && build.source_dirty === false
    && build.channel === "internal"
    && build.platform === "win32"
    && build.arch === "x64"
    && build.app_id === "com.amic.matter.desktop.internal"
    && VERSION.test(build.version ?? "")
    && GIT_OBJECT.test(build.source_sha ?? "")
    && GIT_OBJECT.test(build.source_tree ?? ""));
}

function buildMatchesMetadata(build, metadata) {
  return metadata?.version === build.version
    && metadata.sourceSha === build.source_sha
    && metadata.sourceTree === build.source_tree
    && metadata.appId === build.app_id
    && metadata.platform === build.platform
    && metadata.architecture === build.arch;
}

function sameRelease(left, right) {
  return left?.releaseId === right?.releaseId
    && left.version === right.version
    && left.sourceSha === right.sourceSha
    && left.sourceTree === right.sourceTree
    && left.releaseSequence === right.releaseSequence
    && left.artifactSha256 === right.artifactSha256
    && left.artifactVersionId === right.artifactVersionId;
}

function sameManagedUpdateScope(left, right) {
  return left?.channel === right?.channel
    && left.lawosTenantId === right.lawosTenantId
    && left.installationId === right.installationId
    && left.appId === right.appId
    && left.keyId === right.keyId
    && left.platform === right.platform
    && left.architecture === right.architecture;
}

function isForwardSuccessor(current, candidate) {
  return sameManagedUpdateScope(current, candidate)
    && candidate.predecessorReleaseId === current.releaseId
    && candidate.predecessorVersion === current.version
    && candidate.predecessorSourceSha === current.sourceSha
    && candidate.predecessorSourceTree === current.sourceTree
    && candidate.releaseSequence > current.releaseSequence;
}

export function parseInternalUnsignedUpdateTrust(value) {
  if (!exactFields(value, [
    "key_id",
    "private_key_material_included",
    "public_key_spki_base64",
    "public_release_allowed",
    "schema_version",
  ])
      || value.schema_version !== INTERNAL_UNSIGNED_UPDATE_TRUST_SCHEMA
      || value.key_id !== INTERNAL_UPDATE_KEY_ID
      || value.private_key_material_included !== false
      || value.public_release_allowed !== false) {
    fail("INTERNAL_UPDATE_TRUST_INVALID", "Internal update trust manifest is invalid");
  }
  const der = canonicalBase64(value.public_key_spki_base64, 4096);
  let publicKey;
  try {
    publicKey = createPublicKey({ key: der, format: "der", type: "spki" });
  } catch {
    fail("INTERNAL_UPDATE_TRUST_INVALID", "Internal update trust key is invalid");
  }
  if (publicKey.asymmetricKeyType !== "ed25519") {
    fail("INTERNAL_UPDATE_TRUST_INVALID", "Internal update trust key must be Ed25519");
  }
  return Object.freeze({
    keyId: value.key_id,
    publicKey,
    publicKeySpkiBase64: value.public_key_spki_base64,
  });
}

export function loadInternalUnsignedUpdatePackageConfiguration({
  resourcesPath,
  appVersion,
  platform = process.platform,
  architecture = process.arch,
  readFileSyncImpl = readFileSync,
} = {}) {
  if (typeof resourcesPath !== "string" || !isAbsolute(resourcesPath)
      || platform !== "win32" || architecture !== "x64") {
    fail("INTERNAL_UPDATE_PACKAGE_UNSUPPORTED", "Internal updates require packaged Windows x64");
  }
  let build;
  let trust;
  let marker;
  try {
    build = JSON.parse(readFileSyncImpl(join(resourcesPath, "matter-build-manifest.json"), "utf8"));
    trust = JSON.parse(readFileSyncImpl(join(resourcesPath, INTERNAL_UNSIGNED_UPDATE_TRUST_FILENAME), "utf8"));
    marker = JSON.parse(readFileSyncImpl(
      join(resourcesPath, INTERNAL_UNSIGNED_RELEASE_MARKER_FILENAME),
      "utf8",
    ));
  } catch {
    fail("INTERNAL_UPDATE_PACKAGE_INVALID", "Internal update package metadata is unavailable");
  }
  if (!validBuild(build) || build.version !== appVersion) {
    fail("INTERNAL_UPDATE_PACKAGE_INVALID", "Internal update build identity is invalid");
  }
  if (!exactFields(marker, [
    "bundled_local_api",
    "channel",
    "distribution_profile",
    "local_api_default",
  ])
      || marker.channel !== "internal"
      || marker.distribution_profile !== "internal-unsigned"
      || marker.local_api_default !== "disabled"
      || marker.bundled_local_api !== false) {
    fail("INTERNAL_UPDATE_PACKAGE_INVALID", "Internal update release marker is invalid");
  }
  return Object.freeze({ build: Object.freeze(build), trust: parseInternalUnsignedUpdateTrust(trust) });
}

function signedRecord(metadataBytes, signatureBytes) {
  return Object.freeze({
    metadata_base64: Buffer.from(metadataBytes).toString("base64"),
    signature_base64: Buffer.from(signatureBytes).toString("base64"),
  });
}

function validUsedRollbackIds(value) {
  return Array.isArray(value)
    && value.length <= USED_ROLLBACK_ID_LIMIT
    && value.every((id) => SAFE_ID.test(id))
    && value.every((id, index) => index === 0 || value[index - 1] < id);
}

function pendingOperation(direction, rollbackId = null, rollbackSha256 = null) {
  const value = {
    direction,
    rollback_id: rollbackId,
    rollback_sha256: rollbackSha256,
  };
  if (!exactFields(value, ["direction", "rollback_id", "rollback_sha256"])
      || !["update", "rollback"].includes(direction)
      || (direction === "update" && (rollbackId !== null || rollbackSha256 !== null))
      || (direction === "rollback"
        && (!SAFE_ID.test(rollbackId ?? "") || !SHA256.test(rollbackSha256 ?? "")))) {
    fail("INTERNAL_UPDATE_STATE_INVALID", "Internal update pending operation is invalid");
  }
  return Object.freeze(value);
}

function validatePendingOperation(value) {
  if (value === null) return null;
  if (!exactFields(value, ["direction", "rollback_id", "rollback_sha256"])) {
    fail("INTERNAL_UPDATE_STATE_INVALID", "Internal update pending operation is invalid");
  }
  return pendingOperation(value.direction, value.rollback_id, value.rollback_sha256);
}

function decodeSignedRecord(value) {
  if (value === null) return null;
  if (!exactFields(value, ["metadata_base64", "signature_base64"])) {
    fail("INTERNAL_UPDATE_STATE_INVALID", "Internal update state is invalid");
  }
  const metadataBytes = canonicalBase64(value.metadata_base64, DOCUMENT_LIMIT);
  const signatureBytes = canonicalBase64(value.signature_base64, SIGNATURE_BYTES);
  if (!metadataBytes || signatureBytes?.byteLength !== SIGNATURE_BYTES) {
    fail("INTERNAL_UPDATE_STATE_INVALID", "Internal update signed state is invalid");
  }
  return Object.freeze({ metadataBytes, signatureBytes, stored: Object.freeze({ ...value }) });
}

function emptyState() {
  return {
    schema_version: INTERNAL_UNSIGNED_UPDATE_STATE_SCHEMA,
    current: null,
    previous: null,
    pending: null,
    pending_operation: null,
    used_rollback_ids: [],
  };
}

function validateStoredState(value) {
  if (value == null) return emptyState();
  if (!exactFields(value, [
    "current",
    "pending",
    "pending_operation",
    "previous",
    "schema_version",
    "used_rollback_ids",
  ])
      || value.schema_version !== INTERNAL_UNSIGNED_UPDATE_STATE_SCHEMA) {
    fail("INTERNAL_UPDATE_STATE_INVALID", "Internal update state envelope is invalid");
  }
  decodeSignedRecord(value.current);
  decodeSignedRecord(value.previous);
  decodeSignedRecord(value.pending);
  const operation = validatePendingOperation(value.pending_operation);
  if ((value.pending === null) !== (operation === null)
      || (value.current === null && (value.previous !== null || value.pending !== null))
      || !validUsedRollbackIds(value.used_rollback_ids)) {
    fail("INTERNAL_UPDATE_STATE_INVALID", "Internal update state relationships are invalid");
  }
  return {
    schema_version: value.schema_version,
    current: value.current,
    previous: value.previous,
    pending: value.pending,
    pending_operation: operation,
    used_rollback_ids: [...value.used_rollback_ids],
  };
}

export function createEncryptedFileInternalUnsignedUpdateStateStore({
  filePath,
  safeStorage,
  lstatSyncImpl = lstatSync,
  readFileSyncImpl = readFileSync,
  rmSyncImpl = rmSync,
  mkdirImpl = mkdir,
  openImpl = open,
  renameImpl = rename,
} = {}) {
  if (typeof filePath !== "string" || !isAbsolute(filePath)) {
    fail("INTERNAL_UPDATE_STATE_PATH_INVALID", "Internal update state path must be absolute");
  }
  const encryptionAvailable = () => {
    try {
      return safeStorage?.isEncryptionAvailable?.() === true
        && typeof safeStorage.encryptString === "function"
        && typeof safeStorage.decryptString === "function";
    } catch {
      return false;
    }
  };
  const assertRegular = () => {
    try {
      const stat = lstatSyncImpl(filePath);
      if (stat.isSymbolicLink?.() || stat.isFile?.() !== true || stat.size > STATE_FILE_LIMIT) {
        fail("INTERNAL_UPDATE_STATE_FILE_UNSAFE", "Internal update state file is unsafe");
      }
      return stat;
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
  };
  return Object.freeze({
    async load() {
      if (!encryptionAvailable()) {
        fail("INTERNAL_UPDATE_SECURE_STORAGE_UNAVAILABLE", "Secure update state storage is unavailable");
      }
      if (!assertRegular()) return emptyState();
      try {
        const envelope = JSON.parse(readFileSyncImpl(filePath, "utf8"));
        if (!exactFields(envelope, ["ciphertext", "schema_version"])
            || envelope.schema_version !== INTERNAL_UNSIGNED_UPDATE_STATE_SCHEMA) throw new TypeError();
        const ciphertext = canonicalBase64(envelope.ciphertext, STATE_FILE_LIMIT);
        const plaintext = safeStorage.decryptString(ciphertext);
        return validateStoredState(JSON.parse(plaintext));
      } catch (error) {
        if (error instanceof InternalUnsignedUpdateRuntimeError) throw error;
        fail("INTERNAL_UPDATE_STATE_INVALID", "Internal update state cannot be verified");
      }
    },
    async save(value) {
      if (!encryptionAvailable()) {
        fail("INTERNAL_UPDATE_SECURE_STORAGE_UNAVAILABLE", "Secure update state storage is unavailable");
      }
      const state = validateStoredState(value);
      assertRegular();
      await mkdirImpl(dirname(filePath), { recursive: true, mode: 0o700 });
      const envelope = `${JSON.stringify({
        schema_version: INTERNAL_UNSIGNED_UPDATE_STATE_SCHEMA,
        ciphertext: Buffer.from(safeStorage.encryptString(JSON.stringify(state))).toString("base64"),
      })}\n`;
      const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
      let handle;
      try {
        handle = await openImpl(temporaryPath, "wx", 0o600);
        await handle.writeFile(envelope, "utf8");
        await handle.sync();
        await handle.close();
        handle = null;
        await renameImpl(temporaryPath, filePath);
      } catch (error) {
        try { await handle?.close?.(); } catch {}
        await rm(temporaryPath, { force: true });
        throw error;
      }
      return state;
    },
    clearSync() {
      if (!assertRegular()) return false;
      rmSyncImpl(filePath, { force: false });
      return true;
    },
  });
}

function verifiedStoredRecord(record, trust) {
  if (!record) return null;
  const decoded = decodeSignedRecord(record);
  const verified = verifyAndParseUpdateMetadataBytes({
    metadataBytes: decoded.metadataBytes,
    signatureBytes: decoded.signatureBytes,
    trustedKeyId: trust.keyId,
    trustedPublicKeys: { [trust.keyId]: trust.publicKey },
  });
  if (!verified.valid) fail("INTERNAL_UPDATE_STATE_SIGNATURE_INVALID", "Stored update state signature is invalid");
  return Object.freeze({ ...decoded, metadata: verified.metadata, metadataSha256: verified.metadataSha256 });
}

function parseSignedUrl(value) {
  let url;
  try { url = new URL(value); } catch { return null; }
  return url.protocol === "https:"
    && CLOUDFRONT_HOST.test(url.hostname)
    && !url.username
    && !url.password
    && !url.hash
    && url.searchParams.has("Signature")
    && url.searchParams.has("Key-Pair-Id")
    && (url.searchParams.has("Expires") || url.searchParams.has("Policy"))
    ? url
    : null;
}

function validateBrokerAuthorization(value, now) {
  if (!exactFields(value, BROKER_FIELDS)
      || value.schema_version !== BROKER_SCHEMA
      || value.http_status !== 200
      || value.outcome !== "authorized"
      || !SAFE_ID.test(value.release_id ?? "")
      || !Number.isSafeInteger(value.release_sequence)
      || value.release_sequence < 1
      || !VERSION.test(value.version ?? "")
      || !Number.isFinite(Date.parse(value.expires_at))
      || Date.parse(value.expires_at) <= now
      || Date.parse(value.expires_at) > now + 10 * 60 * 1000
      || !SHA256.test(value.authorization_receipt_sha256 ?? "")
      || value.raw_s3_location_returned !== false
      || value.aws_credentials_returned !== false
      || value.private_key_material_returned !== false
      || value.public_release_allowed !== false
      || !exactFields(value.downloads, DOWNLOAD_KINDS)) {
    fail("INTERNAL_UPDATE_AUTHORIZATION_INVALID", "Internal update authorization is invalid");
  }
  const downloads = {};
  for (const kind of DOWNLOAD_KINDS) {
    const descriptor = value.downloads[kind];
    const maximum = ["artifact", "rollback_target_artifact"].includes(kind)
      ? 2 * 1024 * 1024 * 1024
      : kind.endsWith("signature") ? SIGNATURE_BYTES : DOCUMENT_LIMIT;
    if (!exactFields(descriptor, ["bytes", "sha256", "url", "version_id"])
        || !Number.isSafeInteger(descriptor.bytes)
        || descriptor.bytes < 1
        || descriptor.bytes > maximum
        || (kind.endsWith("signature") && descriptor.bytes !== SIGNATURE_BYTES)
        || !SHA256.test(descriptor.sha256 ?? "")
        || !VERSION_ID.test(descriptor.version_id ?? "")
        || !parseSignedUrl(descriptor.url)) {
      fail("INTERNAL_UPDATE_DOWNLOAD_DESCRIPTOR_INVALID", "Internal update download descriptor is invalid");
    }
    downloads[kind] = Object.freeze({ ...descriptor });
  }
  return Object.freeze({ ...value, downloads: Object.freeze(downloads) });
}

async function downloadExactBytes(fetchImpl, descriptor, label) {
  let response;
  try { response = await fetchImpl(descriptor.url, { method: "GET", redirect: "error" }); } catch {
    fail("INTERNAL_UPDATE_DOWNLOAD_FAILED", `${label} download failed`);
  }
  const contentLength = response?.headers?.get?.("content-length");
  if (response?.status !== 200
      || response?.redirected === true
      || response?.headers?.get?.("content-encoding") != null
      || (contentLength != null && Number(contentLength) !== descriptor.bytes)
      || !response?.body
      || typeof response.body[Symbol.asyncIterator] !== "function") {
    fail("INTERNAL_UPDATE_DOWNLOAD_RESPONSE_INVALID", `${label} response is invalid`);
  }
  const chunks = [];
  let total = 0;
  const digest = createHash("sha256");
  for await (const value of response.body) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    total += chunk.byteLength;
    if (total > descriptor.bytes) fail("INTERNAL_UPDATE_DOWNLOAD_TOO_LARGE", `${label} exceeded its signed size`);
    chunks.push(chunk);
    digest.update(chunk);
  }
  if (total !== descriptor.bytes || digest.digest("hex") !== descriptor.sha256) {
    fail("INTERNAL_UPDATE_DOWNLOAD_MISMATCH", `${label} did not match its signed descriptor`);
  }
  return Buffer.concat(chunks, total);
}

async function artifactStream(fetchImpl, descriptor) {
  let response;
  try { response = await fetchImpl(descriptor.url, { method: "GET", redirect: "error" }); } catch {
    fail("INTERNAL_UPDATE_DOWNLOAD_FAILED", "Internal installer download failed");
  }
  const contentLength = response?.headers?.get?.("content-length");
  if (response?.status !== 200
      || response?.redirected === true
      || response?.headers?.get?.("content-encoding") != null
      || (contentLength != null && Number(contentLength) !== descriptor.bytes)
      || !response?.body
      || typeof response.body[Symbol.asyncIterator] !== "function") {
    fail("INTERNAL_UPDATE_DOWNLOAD_RESPONSE_INVALID", "Internal installer response is invalid");
  }
  return response.body;
}

function releaseState(record) {
  if (!record) return null;
  return Object.freeze({
    releaseId: record.metadata.releaseId,
    version: record.metadata.version,
    sourceSha: record.metadata.sourceSha,
    sourceTree: record.metadata.sourceTree,
    releaseSequence: record.metadata.releaseSequence,
    artifactSha256: record.metadata.artifactSha256,
    artifactVersionId: record.metadata.artifactVersionId,
  });
}

function controllerFromCurrent(current, previous, usedRollbackIds, trust, now) {
  const metadata = current.metadata;
  return createUpdateController({
    currentVersion: metadata.version,
    channel: INTERNAL_UNSIGNED_UPDATE_CHANNEL,
    lawosTenantId: metadata.lawosTenantId,
    installationId: metadata.installationId,
    appId: metadata.appId,
    currentReleaseId: metadata.releaseId,
    currentSourceSha: metadata.sourceSha,
    currentSourceTree: metadata.sourceTree,
    currentReleaseSequence: metadata.releaseSequence,
    currentArtifactSha256: metadata.artifactSha256,
    currentArtifactVersionId: metadata.artifactVersionId,
    previousKnownGoodRelease: releaseState(previous),
    consumedRollbackIds: usedRollbackIds,
    platform: metadata.platform,
    architecture: metadata.architecture,
    trustedKeyId: trust.keyId,
    trustedPublicKeys: { [trust.keyId]: trust.publicKey },
    now,
  });
}

function assertActiveRevocations({
  revocationBytes,
  revocationSignatureBytes,
  metadata,
  trust,
  now,
}) {
  const verified = verifyAndParseInternalUnsignedRevocationsBytes({
    revocationBytes,
    signatureBytes: revocationSignatureBytes,
    trustedKeyId: trust.keyId,
    trustedPublicKeys: { [trust.keyId]: trust.publicKey },
  });
  if (!verified.valid) {
    fail("INTERNAL_UPDATE_REVOCATIONS_INVALID", "Internal update revocations are invalid");
  }
  const document = verified.revocations;
  if (document.appId !== metadata.appId
      || document.lawosTenantId !== metadata.lawosTenantId
      || document.keyId !== metadata.keyId
      || Date.parse(document.generatedAt) > now
      || Date.parse(document.expiresAt) <= now) {
    fail("INTERNAL_UPDATE_REVOCATIONS_INVALID", "Internal update revocations are invalid");
  }
  if (document.revokedReleaseIds.includes(metadata.releaseId)
      || document.revokedArtifactSha256s.includes(metadata.artifactSha256)) {
    fail("INTERNAL_UPDATE_RELEASE_REVOKED", "Internal update release is revoked");
  }
  return verified;
}

export function createDisabledInternalUnsignedUpdateRuntime(reason) {
  const status = disabledStatus(reason);
  return Object.freeze({
    enabled: false,
    async initialize() { return status; },
    status() { return status; },
    async check() { return status; },
    async stage() { return status; },
    async stageRollback() { return status; },
    async open() { return status; },
    async discard() { return status; },
    clearSync() { return false; },
  });
}

export function createInternalUnsignedUpdateRuntime({
  build,
  trust,
  authorize,
  stateStore,
  staging,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
} = {}) {
  if (!validBuild(build)
      || trust?.keyId !== INTERNAL_UPDATE_KEY_ID
      || trust?.publicKey?.asymmetricKeyType !== "ed25519"
      || typeof authorize !== "function"
      || typeof stateStore?.load !== "function"
      || typeof stateStore?.save !== "function"
      || typeof staging?.initialize !== "function"
      || typeof staging?.stage !== "function"
      || typeof staging?.open !== "function"
      || typeof fetchImpl !== "function") {
    throw new TypeError("internal update runtime configuration is invalid");
  }
  let stored = emptyState();
  let current = null;
  let previous = null;
  let prepared = null;
  let rollbackPrepared = null;
  let staged = null;
  let initialized = false;
  let currentStatus = projectStatus({ state: "initializing", enabled: true, version: build.version });
  let operationTail = Promise.resolve();

  const serialize = (operation) => {
    const result = operationTail.then(operation, operation);
    operationTail = result.catch(() => undefined);
    return result;
  };

  async function initialize() {
    await staging.initialize();
    stored = validateStoredState(await stateStore.load());
    const existing = verifiedStoredRecord(stored.current, trust);
    const prior = verifiedStoredRecord(stored.previous, trust);
    const pending = verifiedStoredRecord(stored.pending, trust);
    if (prior && (!existing
        || !sameManagedUpdateScope(existing.metadata, prior.metadata)
        || !isForwardSuccessor(prior.metadata, existing.metadata))) {
      fail("INTERNAL_UPDATE_STATE_LINEAGE_INVALID", "Stored update lineage is invalid");
    }
    if (pending && buildMatchesMetadata(build, pending.metadata)) {
      const operation = stored.pending_operation;
      const forward = operation.direction === "update"
        && isForwardSuccessor(existing.metadata, pending.metadata);
      const rollback = operation.direction === "rollback"
        && prior
        && sameRelease(prior.metadata, pending.metadata)
        && !stored.used_rollback_ids.includes(operation.rollback_id);
      if (!forward && !rollback) {
        fail("INTERNAL_UPDATE_PENDING_LINEAGE_INVALID", "Pending update lineage is invalid");
      }
      if (rollback && stored.used_rollback_ids.length >= USED_ROLLBACK_ID_LIMIT) {
        fail(
          "INTERNAL_UPDATE_ROLLBACK_HISTORY_FULL",
          "Rollback history capacity must be repaired before promotion",
        );
      }
      const usedRollbackIds = rollback
        ? [...stored.used_rollback_ids, operation.rollback_id].sort()
        : stored.used_rollback_ids;
      stored = await stateStore.save({
        schema_version: INTERNAL_UNSIGNED_UPDATE_STATE_SCHEMA,
        current: stored.pending,
        previous: forward ? stored.current : null,
        pending: null,
        pending_operation: null,
        used_rollback_ids: usedRollbackIds,
      });
      current = pending;
      previous = forward ? existing : null;
      currentStatus = projectStatus({
        state: "installed_build_matched_pending",
        enabled: true,
        version: build.version,
        release_id: pending.metadata.releaseId,
        receipt_sha256: pending.metadataSha256,
        operation: operation.direction,
      });
    } else if (existing && buildMatchesMetadata(build, existing.metadata)) {
      current = existing;
      previous = prior;
      currentStatus = projectStatus({
        state: pending ? "installer_opened_pending_restart" : "ready",
        enabled: true,
        version: build.version,
        release_id: existing.metadata.releaseId,
        available_version: pending?.metadata.version ?? null,
        operation: stored.pending_operation?.direction ?? null,
        explicit_operator_action_required: Boolean(pending),
      });
    } else if (existing) {
      fail("INTERNAL_UPDATE_INSTALLED_STATE_MISMATCH", "Installed build differs from signed update state");
    } else {
      currentStatus = projectStatus({ state: "baseline_required", enabled: true, version: build.version });
    }
    initialized = true;
    return currentStatus;
  }

  async function downloadRollbackDocuments(authorization) {
    const [
      rollbackBytes,
      rollbackSignatureBytes,
      targetMetadataBytes,
      targetSignatureBytes,
    ] = await Promise.all([
      downloadExactBytes(fetchImpl, authorization.downloads.rollback, "Rollback authorization"),
      downloadExactBytes(fetchImpl, authorization.downloads.rollback_signature, "Rollback signature"),
      downloadExactBytes(fetchImpl, authorization.downloads.rollback_target_metadata, "Rollback target metadata"),
      downloadExactBytes(
        fetchImpl,
        authorization.downloads.rollback_target_metadata_signature,
        "Rollback target signature",
      ),
    ]);
    return Object.freeze({
      rollbackBytes,
      rollbackSignatureBytes,
      targetMetadataBytes,
      targetSignatureBytes,
    });
  }

  async function resolveSuccessorBaseline({
    authorization,
    successor,
    revocationBytes,
    revocationSignatureBytes,
  }) {
    const documents = await downloadRollbackDocuments(authorization);
    const target = verifyAndParseUpdateMetadataBytes({
      metadataBytes: documents.targetMetadataBytes,
      signatureBytes: documents.targetSignatureBytes,
      trustedKeyId: trust.keyId,
      trustedPublicKeys: { [trust.keyId]: trust.publicKey },
    });
    if (!target.valid) {
      fail(
        "INTERNAL_UPDATE_BASELINE_PROOF_INVALID",
        "Signed internal update baseline proof is invalid",
      );
    }
    const targetMetadata = target.metadata;
    const successorMetadata = successor.metadata;
    if (!buildMatchesMetadata(build, targetMetadata)) {
      fail(
        "INTERNAL_UPDATE_BASELINE_MISMATCH",
        "Signed internal update baseline differs from the installed build",
      );
    }
    if (!sameManagedUpdateScope(targetMetadata, successorMetadata)
        || !isForwardSuccessor(targetMetadata, successorMetadata)) {
      fail(
        "INTERNAL_UPDATE_BASELINE_LINEAGE_INVALID",
        "Signed internal update baseline lineage is invalid",
      );
    }
    const baseline = Object.freeze({
      metadataBytes: documents.targetMetadataBytes,
      signatureBytes: documents.targetSignatureBytes,
      stored: signedRecord(documents.targetMetadataBytes, documents.targetSignatureBytes),
      metadata: targetMetadata,
      metadataSha256: target.metadataSha256,
    });
    const proofController = controllerFromCurrent(successor, baseline, [], trust, now);
    const proof = proofController.prepareRollbackBytes({
      metadataBytes: documents.targetMetadataBytes,
      signatureBytes: documents.targetSignatureBytes,
      rollbackBytes: documents.rollbackBytes,
      rollbackSignatureBytes: documents.rollbackSignatureBytes,
      revocationBytes,
      revocationSignatureBytes,
    });
    if (proof.state !== "rollback_prepared") {
      if (proof.reason === "release_revoked") {
        fail("INTERNAL_UPDATE_BASELINE_REVOKED", "Internal update baseline is revoked");
      }
      const bindingReasons = new Set([
        "rollback_revocation_revision_mismatch",
        "rollback_scope_mismatch",
        "rollback_source_mismatch",
        "rollback_target_mismatch",
        "rollback_target_not_previous_known_good",
        "rollback_target_unverified",
      ]);
      fail(
        bindingReasons.has(proof.reason)
          ? "INTERNAL_UPDATE_BASELINE_AUTHORIZATION_MISMATCH"
          : "INTERNAL_UPDATE_BASELINE_PROOF_INVALID",
        "Signed internal update baseline proof is invalid",
      );
    }
    const targetDescriptor = authorization.downloads.rollback_target_artifact;
    if (authorization.downloads.rollback_target_metadata.sha256 !== proof.metadataSha256
        || targetDescriptor.sha256 !== proof.artifactSha256
        || targetDescriptor.bytes !== proof.artifactBytes
        || targetDescriptor.version_id !== proof.artifactVersionId) {
      fail(
        "INTERNAL_UPDATE_BASELINE_AUTHORIZATION_MISMATCH",
        "Internal update baseline download bindings differ",
      );
    }
    return baseline;
  }

  async function resolveRollbackCandidate({
    authorization,
    controller,
    revocationBytes,
    revocationSignatureBytes,
  }) {
    const {
      rollbackBytes,
      rollbackSignatureBytes,
      targetMetadataBytes,
      targetSignatureBytes,
    } = await downloadRollbackDocuments(authorization);
    const candidate = controller.prepareRollbackBytes({
      metadataBytes: targetMetadataBytes,
      signatureBytes: targetSignatureBytes,
      rollbackBytes,
      rollbackSignatureBytes,
      revocationBytes,
      revocationSignatureBytes,
    });
    if (candidate.state !== "rollback_prepared") return candidate;
    const descriptor = authorization.downloads.rollback_target_artifact;
    if (descriptor.sha256 !== candidate.artifactSha256
        || descriptor.bytes !== candidate.artifactBytes
        || descriptor.version_id !== candidate.artifactVersionId
        || authorization.downloads.rollback_target_metadata.sha256
          !== candidate.metadataSha256) {
      fail(
        "INTERNAL_UPDATE_ROLLBACK_AUTHORIZATION_BINDING_MISMATCH",
        "Internal rollback authorization bindings differ",
      );
    }
    return Object.freeze({
      state: "rollback_prepared",
      authorization,
      controller,
      candidate: candidate.candidate,
      record: signedRecord(targetMetadataBytes, targetSignatureBytes),
    });
  }

  async function check() {
    if (!initialized) fail("INTERNAL_UPDATE_NOT_INITIALIZED", "Internal update runtime is not initialized");
    if (stored.pending !== null) {
      fail(
        "INTERNAL_UPDATE_RESTART_OR_DISCARD_REQUIRED",
        "A previously opened installer must be completed or discarded before checking again",
      );
    }
    prepared = null;
    rollbackPrepared = null;
    staged = null;
    currentStatus = projectStatus({ state: "checking", enabled: true, version: build.version });
    const rawAuthorization = await authorize();
    if (rawAuthorization?.http_status === 401 || rawAuthorization?.status === 401) {
      currentStatus = projectStatus({
        state: "signed_out",
        enabled: true,
        version: build.version,
        safe_error_code: "INTERNAL_UPDATE_SESSION_REQUIRED",
      });
      return currentStatus;
    }
    const authorization = validateBrokerAuthorization(rawAuthorization, now());
    const [metadataBytes, signatureBytes, revocationBytes, revocationSignatureBytes] = await Promise.all([
      downloadExactBytes(fetchImpl, authorization.downloads.update_metadata, "Update metadata"),
      downloadExactBytes(fetchImpl, authorization.downloads.update_metadata_signature, "Update signature"),
      downloadExactBytes(fetchImpl, authorization.downloads.revocations, "Revocation metadata"),
      downloadExactBytes(fetchImpl, authorization.downloads.revocations_signature, "Revocation signature"),
    ]);
    const verified = verifyAndParseUpdateMetadataBytes({
      metadataBytes,
      signatureBytes,
      trustedKeyId: trust.keyId,
      trustedPublicKeys: { [trust.keyId]: trust.publicKey },
    });
    if (!verified.valid) fail("INTERNAL_UPDATE_METADATA_INVALID", "Internal update metadata is invalid");
    if (authorization.release_id !== verified.metadata.releaseId
        || authorization.release_sequence !== verified.metadata.releaseSequence
        || authorization.version !== verified.metadata.version
        || authorization.downloads.artifact.sha256 !== verified.metadata.artifactSha256
        || authorization.downloads.artifact.bytes !== verified.metadata.artifactBytes
        || authorization.downloads.artifact.version_id !== verified.metadata.artifactVersionId) {
      fail("INTERNAL_UPDATE_AUTHORIZATION_BINDING_MISMATCH", "Internal update authorization bindings differ");
    }
    assertActiveRevocations({
      revocationBytes,
      revocationSignatureBytes,
      metadata: verified.metadata,
      trust,
      now: now(),
    });
    const record = signedRecord(metadataBytes, signatureBytes);
    if (!current) {
      if (!buildMatchesMetadata(build, verified.metadata)) {
        const baseline = await resolveSuccessorBaseline({
          authorization,
          successor: verified,
          revocationBytes,
          revocationSignatureBytes,
        });
        const controller = controllerFromCurrent(baseline, null, [], trust, now);
        const candidate = controller.prepareUpdateBytes({
          metadataBytes,
          signatureBytes,
          revocationBytes,
          revocationSignatureBytes,
        });
        if (candidate.state !== "prepared") {
          fail(
            "INTERNAL_UPDATE_BASELINE_CANDIDATE_DENIED",
            `Internal update baseline candidate denied: ${candidate.reason}`,
          );
        }
        stored = await stateStore.save({
          schema_version: INTERNAL_UNSIGNED_UPDATE_STATE_SCHEMA,
          current: baseline.stored,
          previous: null,
          pending: null,
          pending_operation: null,
          used_rollback_ids: [],
        });
        current = baseline;
        prepared = Object.freeze({ authorization, controller, candidate: candidate.candidate, record });
        currentStatus = projectStatus({
          state: "update_available",
          enabled: true,
          version: build.version,
          available_version: verified.metadata.version,
          release_id: candidate.releaseId,
          artifact_bytes: candidate.artifactBytes,
          artifact_sha256: candidate.artifactSha256,
          receipt_sha256: candidate.metadataSha256,
          explicit_operator_action_required: true,
        });
        return currentStatus;
      }
      stored = await stateStore.save({
        schema_version: INTERNAL_UNSIGNED_UPDATE_STATE_SCHEMA,
        current: record,
        previous: null,
        pending: null,
        pending_operation: null,
        used_rollback_ids: [],
      });
      current = Object.freeze({
        metadataBytes,
        signatureBytes,
        stored: record,
        metadata: verified.metadata,
        metadataSha256: verified.metadataSha256,
      });
      currentStatus = projectStatus({
        state: "baseline_established",
        enabled: true,
        version: build.version,
        release_id: verified.metadata.releaseId,
        receipt_sha256: verified.metadataSha256,
      });
      return currentStatus;
    }
    const controller = controllerFromCurrent(
      current,
      previous,
      stored.used_rollback_ids,
      trust,
      now,
    );
    const candidate = controller.prepareUpdateBytes({
      metadataBytes,
      signatureBytes,
      revocationBytes,
      revocationSignatureBytes,
    });
    if (candidate.state !== "prepared") {
      if (candidate.reason === "release_replay"
          && verified.metadata.releaseId === current.metadata.releaseId
        && verified.metadataSha256 === current.metadataSha256) {
        if (previous) {
          if (stored.used_rollback_ids.length >= USED_ROLLBACK_ID_LIMIT) {
            fail(
              "INTERNAL_UPDATE_ROLLBACK_HISTORY_FULL",
              "Rollback history capacity must be repaired before another rollback",
            );
          }
          const rollback = await resolveRollbackCandidate({
            authorization,
            controller,
            revocationBytes,
            revocationSignatureBytes,
          });
          if (rollback.state === "rollback_prepared") rollbackPrepared = rollback;
        }
        currentStatus = projectStatus({
          state: "up_to_date",
          enabled: true,
          version: build.version,
          release_id: current.metadata.releaseId,
          rollback_available: Boolean(rollbackPrepared),
          rollback_version: rollbackPrepared?.candidate.version ?? null,
          explicit_operator_action_required: Boolean(rollbackPrepared),
        });
        return currentStatus;
      }
      fail("INTERNAL_UPDATE_CANDIDATE_DENIED", `Internal update candidate denied: ${candidate.reason}`);
    }
    prepared = Object.freeze({
      authorization,
      controller,
      candidate: candidate.candidate,
      record,
    });
    currentStatus = projectStatus({
      state: "update_available",
      enabled: true,
      version: build.version,
      available_version: candidate.version,
      release_id: candidate.releaseId,
      artifact_bytes: candidate.artifactBytes,
      artifact_sha256: candidate.artifactSha256,
      receipt_sha256: candidate.metadataSha256,
      explicit_operator_action_required: true,
    });
    return currentStatus;
  }

  async function stage({ userActivation = false } = {}) {
    if (userActivation !== true) {
      fail("INTERNAL_UPDATE_USER_ACTIVATION_REQUIRED", "Staging an update requires active user interaction");
    }
    if (!prepared) fail("INTERNAL_UPDATE_PREPARED_CANDIDATE_REQUIRED", "Check for an update first");
    currentStatus = projectStatus({
      state: "downloading",
      enabled: true,
      version: build.version,
      available_version: prepared.candidate.version,
      release_id: prepared.candidate.releaseId,
      artifact_bytes: prepared.candidate.artifactBytes,
    });
    const chunks = await artifactStream(fetchImpl, prepared.authorization.downloads.artifact);
    const stagedFile = await staging.stage({ candidate: prepared.candidate, chunks });
    const verified = prepared.controller.confirmStagedUpdate({
      candidate: prepared.candidate,
      staged: stagedFile,
    });
    if (verified.state !== "staged_verified") {
      await staging.remove?.(stagedFile.stageId);
      fail("INTERNAL_UPDATE_STAGED_VERIFICATION_FAILED", "Staged update verification failed");
    }
    staged = Object.freeze({
      operation: "update",
      stagedFile,
      verified,
      record: prepared.record,
      pendingOperation: pendingOperation("update"),
    });
    currentStatus = projectStatus({
      state: "staged",
      enabled: true,
      version: build.version,
      available_version: prepared.candidate.version,
      release_id: prepared.candidate.releaseId,
      artifact_bytes: prepared.candidate.artifactBytes,
      artifact_sha256: prepared.candidate.artifactSha256,
      receipt_sha256: verified.receiptSha256,
      operation: "update",
      windows_warning_expected: true,
      explicit_operator_action_required: true,
    });
    return Object.freeze({ ...currentStatus, stage_id: stagedFile.stageId });
  }

  async function stageRollback({ userActivation = false } = {}) {
    if (userActivation !== true) {
      fail(
        "INTERNAL_UPDATE_USER_ACTIVATION_REQUIRED",
        "Staging a rollback requires active user interaction",
      );
    }
    if (!rollbackPrepared) {
      fail("INTERNAL_UPDATE_ROLLBACK_CANDIDATE_REQUIRED", "Check for an available rollback first");
    }
    const candidate = rollbackPrepared.candidate;
    currentStatus = projectStatus({
      state: "downloading",
      enabled: true,
      version: build.version,
      available_version: candidate.version,
      release_id: candidate.releaseId,
      artifact_bytes: candidate.artifactBytes,
      operation: "rollback",
    });
    const chunks = await artifactStream(
      fetchImpl,
      rollbackPrepared.authorization.downloads.rollback_target_artifact,
    );
    const stagedFile = await staging.stage({ candidate, chunks });
    const verified = rollbackPrepared.controller.confirmStagedRollback({
      candidate,
      staged: stagedFile,
    });
    if (verified.state !== "rollback_staged_verified") {
      await staging.remove?.(stagedFile.stageId);
      fail("INTERNAL_UPDATE_STAGED_VERIFICATION_FAILED", "Staged rollback verification failed");
    }
    staged = Object.freeze({
      operation: "rollback",
      stagedFile,
      verified,
      record: rollbackPrepared.record,
      pendingOperation: pendingOperation(
        "rollback",
        candidate.rollbackId,
        candidate.rollbackSha256,
      ),
    });
    currentStatus = projectStatus({
      state: "rollback_staged",
      enabled: true,
      version: build.version,
      available_version: candidate.version,
      release_id: candidate.releaseId,
      artifact_bytes: candidate.artifactBytes,
      artifact_sha256: candidate.artifactSha256,
      receipt_sha256: verified.receiptSha256,
      operation: "rollback",
      windows_warning_expected: true,
      explicit_operator_action_required: true,
    });
    return Object.freeze({ ...currentStatus, stage_id: stagedFile.stageId });
  }

  async function openInstaller({ stageId, confirmed = false, userActivation = false } = {}) {
    if (!staged || staged.stagedFile.stageId !== stageId || !SAFE_STAGE_ID.test(stageId ?? "")) {
      fail("INTERNAL_UPDATE_STAGE_NOT_FOUND", "Staged update is unavailable");
    }
    if (confirmed !== true || userActivation !== true) {
      fail("INTERNAL_UPDATE_OPERATOR_CONFIRMATION_REQUIRED", "Opening an unsigned installer requires confirmation");
    }
    const previousPending = stored.pending;
    const previousPendingOperation = stored.pending_operation;
    stored = await stateStore.save({
      schema_version: INTERNAL_UNSIGNED_UPDATE_STATE_SCHEMA,
      current: stored.current,
      previous: stored.previous,
      pending: staged.record,
      pending_operation: staged.pendingOperation,
      used_rollback_ids: stored.used_rollback_ids,
    });
    let opened;
    try {
      opened = await staging.open({ stageId, confirmed: true, userActivation: true });
    } catch (error) {
      stored = await stateStore.save({
        schema_version: INTERNAL_UNSIGNED_UPDATE_STATE_SCHEMA,
        current: stored.current,
        previous: stored.previous,
        pending: previousPending,
        pending_operation: previousPendingOperation,
        used_rollback_ids: stored.used_rollback_ids,
      });
      throw error;
    }
    currentStatus = projectStatus({
      state: "installer_opened_pending_restart",
      enabled: true,
      version: build.version,
      available_version: opened.version,
      release_id: opened.releaseId,
      artifact_sha256: opened.artifactSha256,
      receipt_sha256: staged.verified.receiptSha256,
      operation: staged.operation,
      windows_warning_expected: true,
      explicit_operator_action_required: true,
    });
    return currentStatus;
  }

  async function discard() {
    if (staged?.stagedFile?.stageId) await staging.remove?.(staged.stagedFile.stageId);
    if (stored.pending !== null) {
      stored = await stateStore.save({
        schema_version: INTERNAL_UNSIGNED_UPDATE_STATE_SCHEMA,
        current: stored.current,
        previous: stored.previous,
        pending: null,
        pending_operation: null,
        used_rollback_ids: stored.used_rollback_ids,
      });
    }
    prepared = null;
    rollbackPrepared = null;
    staged = null;
    currentStatus = projectStatus({
      state: "ready",
      enabled: true,
      version: build.version,
      release_id: current?.metadata.releaseId ?? null,
    });
    return currentStatus;
  }

  return Object.freeze({
    enabled: true,
    initialize: () => serialize(initialize),
    status: () => currentStatus,
    check: () => serialize(check),
    stage: (input) => serialize(() => stage(input)),
    stageRollback: (input) => serialize(() => stageRollback(input)),
    open: (input) => serialize(() => openInstaller(input)),
    discard: () => serialize(discard),
    async clear() {
      return serialize(async () => {
        await staging.clear?.();
        prepared = null;
        rollbackPrepared = null;
        staged = null;
        return currentStatus;
      });
    },
    clearSync() {
      prepared = null;
      rollbackPrepared = null;
      staged = null;
      return staging.clearSync?.() ?? false;
    },
  });
}

export function registerInternalUnsignedUpdateIpcHandlers({
  ipcMain,
  runtime,
  isTrustedSender = () => true,
} = {}) {
  if (!ipcMain?.handle || !runtime) throw new TypeError("internal update IPC dependencies are required");
  const registered = [];
  const register = (channel, handler) => {
    ipcMain.handle(channel, async (event, input) => {
      if (!isTrustedSender(event)) return disabledStatus("INTERNAL_UPDATE_UNTRUSTED_RENDERER");
      try { return await handler(input); } catch (error) {
        return projectStatus({
          state: "blocked",
          enabled: runtime.enabled === true,
          safe_error_code: safeError(error),
        });
      }
    });
    registered.push(channel);
  };
  register(INTERNAL_UNSIGNED_UPDATE_IPC_CHANNELS.status, () => runtime.status());
  register(INTERNAL_UNSIGNED_UPDATE_IPC_CHANNELS.check, () => runtime.check());
  register(INTERNAL_UNSIGNED_UPDATE_IPC_CHANNELS.stage, (input) => runtime.stage({
    userActivation: input?.userActivation === true,
  }));
  register(INTERNAL_UNSIGNED_UPDATE_IPC_CHANNELS.stageRollback, (input) => runtime.stageRollback({
    userActivation: input?.userActivation === true,
  }));
  register(INTERNAL_UNSIGNED_UPDATE_IPC_CHANNELS.open, (input) => runtime.open({
    stageId: input?.stageId,
    confirmed: input?.confirmed === true,
    userActivation: input?.userActivation === true,
  }));
  register(INTERNAL_UNSIGNED_UPDATE_IPC_CHANNELS.discard, () => runtime.discard());
  return Object.freeze({
    dispose() {
      for (const channel of registered) ipcMain.removeHandler?.(channel);
    },
  });
}
