import {
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectLegalHoldCommand,
  GetObjectRetentionCommand,
  HeadObjectCommand,
  PutObjectCommand,
  PutObjectLegalHoldCommand,
  PutObjectRetentionCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  DMS_STORAGE_ADAPTER_CONTRACT_VERSION,
  assertTenantId,
  createOpaqueStorageKey,
  createStagingPointerRef,
  createStoragePointerRef,
  sha256Hex,
} from "./storage-adapter.js";

const SECRET_FIELD = /(access.?key|authorization|client.?secret|credential(?!_ref)|password|secret.?key|session.?token)/iu;

function codedError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function requireString(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  const normalized = value.trim();
  if (normalized.length > 1024 || /[\u0000-\u001f\u007f]/u.test(normalized)) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function safePrefix(value = "lawos-dms") {
  const prefix = requireString(value, "prefix").replace(/^\/+|\/+$/gu, "");
  if (prefix.split("/").includes("..")) throw new TypeError("prefix is invalid");
  return prefix;
}

function isNotFound(error) {
  return error?.$metadata?.httpStatusCode === 404 || ["NotFound", "NoSuchKey", "NoSuchVersion"].includes(error?.name);
}

function isPreconditionFailed(error) {
  return error?.$metadata?.httpStatusCode === 412 || error?.name === "PreconditionFailed";
}

function isObjectGovernanceUnset(error) {
  return error?.name === "NoSuchObjectLockConfiguration"
    || error?.Code === "NoSuchObjectLockConfiguration"
    || error?.code === "NoSuchObjectLockConfiguration";
}

function metadataFor({ tenantId, objectId, sha256, byteSize }) {
  return Object.freeze({
    "lawos-tenant-ref": sha256Hex(Buffer.from(tenantId)),
    "lawos-object-ref": sha256Hex(Buffer.from(objectId)),
    "lawos-sha256": sha256,
    "lawos-byte-size": String(byteSize),
  });
}

async function bodyToBuffer(body) {
  if (!body) return Buffer.alloc(0);
  if (typeof body.transformToByteArray === "function") return Buffer.from(await body.transformToByteArray());
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export function createS3StorageAdapter(config = {}) {
  for (const field of Object.keys(config)) {
    if (field !== "credential_ref" && SECRET_FIELD.test(field)) {
      throw new TypeError(`S3 adapter accepts credential_ref only, not ${field}`);
    }
  }
  const credentialRef = requireString(config.credential_ref, "credential_ref");
  const bucket = requireString(config.bucket, "bucket");
  const expectedBucketOwner = requireString(config.expected_bucket_owner, "expected_bucket_owner");
  const adapter_id = config.adapter_id ?? "s3-vault";
  const prefix = safePrefix(config.prefix);
  const client = config.client ?? new S3Client({ region: requireString(config.region, "region") });
  const objectLockEnabled = config.object_lock_enabled === true;
  const defaultRetentionDays = config.default_retention_days == null ? null : Number(config.default_retention_days);
  if (defaultRetentionDays != null && (!objectLockEnabled || !Number.isInteger(defaultRetentionDays) || defaultRetentionDays < 1 || defaultRetentionDays > 36_500)) {
    throw new TypeError("default_retention_days requires Object Lock and must be an integer from 1 through 36500");
  }
  const clock = typeof config.clock === "function" ? config.clock : () => Date.now();
  const capabilities = Object.freeze({
    staged_uploads: true,
    digest_verification: true,
    orphan_cleanup: true,
    provider_retention: objectLockEnabled,
    conditional_delete: true,
    default_committed_retention: defaultRetentionDays != null,
  });

  const common = Object.freeze({ Bucket: bucket, ExpectedBucketOwner: expectedBucketOwner });
  const encryption = config.kms_key_id
    ? Object.freeze({ ServerSideEncryption: "aws:kms", SSEKMSKeyId: requireString(config.kms_key_id, "kms_key_id"), BucketKeyEnabled: true })
    : Object.freeze({ ServerSideEncryption: "AES256" });

  function keyFor({ tenant_id, session_id, object_id }) {
    const opaque = createOpaqueStorageKey({ tenant_id, session_id, object_id });
    return `${prefix}/${session_id === undefined ? "objects" : "staged"}/${opaque}`;
  }

  async function head(key) {
    try {
      return await client.send(new HeadObjectCommand({ ...common, Key: key, ChecksumMode: "ENABLED" }));
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async function read(key) {
    try {
      const response = await client.send(new GetObjectCommand({ ...common, Key: key, ChecksumMode: "ENABLED" }));
      const bytes = await bodyToBuffer(response.Body);
      return Object.freeze({ response, bytes, sha256: sha256Hex(bytes) });
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async function ensureDefaultRetention(key, versionId) {
    if (defaultRetentionDays == null) return false;
    let retention = null;
    try {
      retention = await client.send(new GetObjectRetentionCommand({
        ...common,
        Key: key,
        VersionId: versionId ?? undefined,
      }));
    } catch (error) {
      if (!isObjectGovernanceUnset(error)) throw error;
    }
    if (retention?.Retention?.RetainUntilDate) return false;
    const now = new Date(clock());
    if (!Number.isFinite(now.getTime())) throw new TypeError("S3 adapter clock returned an invalid timestamp");
    const retainUntil = new Date(now.getTime() + defaultRetentionDays * 24 * 60 * 60 * 1000);
    await client.send(new PutObjectRetentionCommand({
      ...common,
      Key: key,
      VersionId: versionId ?? undefined,
      Retention: { Mode: "GOVERNANCE", RetainUntilDate: retainUntil },
    }));
    return true;
  }

  function receiptFromHead({ tenantId, sessionId, objectId, response }) {
    const sha256 = requireString(response.Metadata?.["lawos-sha256"], "S3 object sha256 metadata");
    const byteSize = Number(response.ContentLength);
    if (!Number.isSafeInteger(byteSize) || byteSize < 0 || Number(response.Metadata?.["lawos-byte-size"]) !== byteSize) {
      throw codedError("S3 object byte-size metadata is invalid", "DMS_S3_METADATA_INVALID");
    }
    return Object.freeze({
      adapter_id,
      tenant_id: tenantId,
      object_id: objectId,
      storage_pointer_ref: sessionId === undefined
        ? createStoragePointerRef({ adapter_id, tenant_id: tenantId, object_id: objectId })
        : null,
      ...(sessionId === undefined ? {} : {
        stage_pointer_ref: createStagingPointerRef({ adapter_id, tenant_id: tenantId, session_id: sessionId, object_id: objectId }),
        state: "staged",
      }),
      sha256,
      byte_size: byteSize,
      mime_type: response.ContentType ?? "application/octet-stream",
      version_id: response.VersionId ?? null,
      etag: response.ETag ?? null,
      raw_path_exposed: false,
      bytes_exposed: false,
    });
  }

  async function statStagedObject({ tenant_id, session_id, object_id } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const sessionId = requireString(session_id, "session_id");
    const objectId = requireString(object_id, "object_id");
    const response = await head(keyFor({ tenant_id: tenantId, session_id: sessionId, object_id: objectId }));
    return response ? receiptFromHead({ tenantId, sessionId, objectId, response }) : null;
  }

  async function statObject({ tenant_id, object_id } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const objectId = requireString(object_id, "object_id");
    const response = await head(keyFor({ tenant_id: tenantId, object_id: objectId }));
    return response ? receiptFromHead({ tenantId, objectId, response }) : null;
  }

  async function stageObject({ tenant_id, session_id, object_id, bytes, content_type, expected_sha256 } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const sessionId = requireString(session_id, "session_id");
    const objectId = requireString(object_id, "object_id");
    const buffer = Buffer.isBuffer(bytes) ? Buffer.from(bytes) : Buffer.from(bytes ?? []);
    const sha256 = sha256Hex(buffer);
    if (expected_sha256 && expected_sha256 !== sha256) {
      throw codedError("staged object digest does not match expected digest", "DMS_STAGED_DIGEST_MISMATCH");
    }
    const key = keyFor({ tenant_id: tenantId, session_id: sessionId, object_id: objectId });
    const existing = await read(key);
    if (existing) {
      if (existing.sha256 !== sha256) throw codedError("upload session already staged different bytes", "DMS_STAGE_IDEMPOTENCY_CONFLICT");
      return statStagedObject({ tenant_id: tenantId, session_id: sessionId, object_id: objectId });
    }
    try {
      await client.send(new PutObjectCommand({
        ...common,
        ...encryption,
        Key: key,
        Body: buffer,
        ContentType: content_type ?? "application/octet-stream",
        Metadata: metadataFor({ tenantId, objectId, sha256, byteSize: buffer.byteLength }),
        ChecksumSHA256: Buffer.from(sha256, "hex").toString("base64"),
        IfNoneMatch: "*",
      }));
    } catch (error) {
      if (!isPreconditionFailed(error)) throw error;
    }
    const stored = await read(key);
    if (!stored || stored.sha256 !== sha256) throw codedError("S3 staged object digest verification failed", "DMS_STAGED_DIGEST_MISMATCH");
    return statStagedObject({ tenant_id: tenantId, session_id: sessionId, object_id: objectId });
  }

  async function finalizeObject({ tenant_id, session_id, object_id } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const sessionId = requireString(session_id, "session_id");
    const objectId = requireString(object_id, "object_id");
    const stagedKey = keyFor({ tenant_id: tenantId, session_id: sessionId, object_id: objectId });
    const committedKey = keyFor({ tenant_id: tenantId, object_id: objectId });
    const staged = await read(stagedKey);
    if (!staged) {
      const committed = await statObject({ tenant_id: tenantId, object_id: objectId });
      if (committed) {
        const defaultRetentionApplied = await ensureDefaultRetention(committedKey, committed.version_id);
        return Object.freeze({ ...committed, default_retention_applied: defaultRetentionApplied });
      }
      throw codedError("staged object was not found", "DMS_STAGED_OBJECT_NOT_FOUND");
    }
    const current = await read(committedKey);
    if (current && current.sha256 !== staged.sha256) {
      throw codedError("committed object has a different digest", "DMS_FINALIZE_CONFLICT");
    }
    let committed = current;
    if (!committed) {
      try {
        await client.send(new PutObjectCommand({
          ...common,
          ...encryption,
          Key: committedKey,
          Body: staged.bytes,
          ContentType: staged.response.ContentType ?? "application/octet-stream",
          Metadata: metadataFor({ tenantId, objectId, sha256: staged.sha256, byteSize: staged.bytes.byteLength }),
          ChecksumSHA256: Buffer.from(staged.sha256, "hex").toString("base64"),
          IfNoneMatch: "*",
        }));
      } catch (error) {
        if (!isPreconditionFailed(error)) throw error;
      }
      committed = await read(committedKey);
      if (!committed) {
        throw codedError("S3 committed object digest verification failed", "DMS_COMMITTED_DIGEST_MISMATCH");
      }
      if (committed.sha256 !== staged.sha256) throw codedError("committed object has a different digest", "DMS_FINALIZE_CONFLICT");
    }
    const defaultRetentionApplied = await ensureDefaultRetention(committedKey, committed.response.VersionId);
    await client.send(new DeleteObjectCommand({
      ...common,
      Key: stagedKey,
      VersionId: staged.response.VersionId,
    }));
    await client.send(new DeleteObjectCommand({ ...common, Key: stagedKey }));
    const receipt = await statObject({ tenant_id: tenantId, object_id: objectId });
    return Object.freeze({ ...receipt, default_retention_applied: defaultRetentionApplied });
  }

  async function deleteOrphan({ tenant_id, session_id, object_id } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const sessionId = requireString(session_id, "session_id");
    const objectId = requireString(object_id, "object_id");
    const key = keyFor({ tenant_id: tenantId, session_id: sessionId, object_id: objectId });
    const current = await head(key);
    if (!current) return Object.freeze({ deleted: false, committed_object_deleted: false });
    await client.send(new DeleteObjectCommand({ ...common, Key: key, VersionId: current.VersionId }));
    await client.send(new DeleteObjectCommand({ ...common, Key: key }));
    return Object.freeze({ deleted: true, committed_object_deleted: false });
  }

  async function deleteCommittedObject({ tenant_id, object_id, expected_sha256 } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const objectId = requireString(object_id, "object_id");
    const expected = requireString(expected_sha256, "expected_sha256");
    const key = keyFor({ tenant_id: tenantId, object_id: objectId });
    const current = await read(key);
    if (!current) return Object.freeze({ deleted: false, already_absent: true, provider_delete_replayed: true });
    if (current.sha256 !== expected) throw codedError("committed object digest changed before delete", "DMS_COMMITTED_DELETE_CONDITION_FAILED");
    await client.send(new DeleteObjectCommand({
      ...common,
      Key: key,
      VersionId: current.response.VersionId,
    }));
    await client.send(new DeleteObjectCommand({ ...common, Key: key }));
    return Object.freeze({ deleted: true, already_absent: false, provider_delete_replayed: false, sha256: current.sha256 });
  }

  async function digestObject({ tenant_id, session_id, object_id } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const objectId = requireString(object_id, "object_id");
    const key = session_id === undefined
      ? keyFor({ tenant_id: tenantId, object_id: objectId })
      : keyFor({ tenant_id: tenantId, session_id: requireString(session_id, "session_id"), object_id: objectId });
    const object = await read(key);
    return object ? Object.freeze({ sha256: object.sha256, byte_size: object.bytes.byteLength }) : null;
  }

  function assertObjectLock() {
    if (!objectLockEnabled) throw codedError("S3 Object Lock is not enabled for this adapter", "DMS_PROVIDER_RETENTION_NOT_CONFIGURED");
  }

  async function currentVersion({ tenant_id, object_id }) {
    const receipt = await statObject({ tenant_id, object_id });
    if (!receipt) throw codedError("committed object was not found", "DMS_COMMITTED_OBJECT_NOT_FOUND");
    return receipt;
  }

  async function setObjectLegalHold({ tenant_id, object_id, status = "ON" } = {}) {
    assertObjectLock();
    const tenantId = assertTenantId(tenant_id);
    const objectId = requireString(object_id, "object_id");
    const legalHoldStatus = String(status).toUpperCase();
    if (!["ON", "OFF"].includes(legalHoldStatus)) throw new TypeError("legal hold status must be ON or OFF");
    const current = await currentVersion({ tenant_id: tenantId, object_id: objectId });
    await client.send(new PutObjectLegalHoldCommand({
      ...common,
      Key: keyFor({ tenant_id: tenantId, object_id: objectId }),
      VersionId: current.version_id ?? undefined,
      LegalHold: { Status: legalHoldStatus },
    }));
    return Object.freeze({ status: legalHoldStatus, version_id: current.version_id });
  }

  async function getObjectLegalHold({ tenant_id, object_id } = {}) {
    assertObjectLock();
    const tenantId = assertTenantId(tenant_id);
    const objectId = requireString(object_id, "object_id");
    const current = await currentVersion({ tenant_id: tenantId, object_id: objectId });
    let response = null;
    try {
      response = await client.send(new GetObjectLegalHoldCommand({
        ...common,
        Key: keyFor({ tenant_id: tenantId, object_id: objectId }),
        VersionId: current.version_id ?? undefined,
      }));
    } catch (error) {
      if (!isObjectGovernanceUnset(error)) throw error;
    }
    return Object.freeze({ status: response?.LegalHold?.Status ?? "OFF", version_id: current.version_id });
  }

  async function setObjectRetention({ tenant_id, object_id, retain_until, mode = "GOVERNANCE" } = {}) {
    assertObjectLock();
    const tenantId = assertTenantId(tenant_id);
    const objectId = requireString(object_id, "object_id");
    const retainUntil = new Date(requireString(retain_until, "retain_until"));
    const retentionMode = String(mode).toUpperCase();
    if (!Number.isFinite(retainUntil.getTime())) throw new TypeError("retain_until is invalid");
    if (!["GOVERNANCE", "COMPLIANCE"].includes(retentionMode)) throw new TypeError("retention mode is invalid");
    const current = await currentVersion({ tenant_id: tenantId, object_id: objectId });
    await client.send(new PutObjectRetentionCommand({
      ...common,
      Key: keyFor({ tenant_id: tenantId, object_id: objectId }),
      VersionId: current.version_id ?? undefined,
      Retention: { Mode: retentionMode, RetainUntilDate: retainUntil },
    }));
    return Object.freeze({ mode: retentionMode, retain_until: retainUntil.toISOString(), version_id: current.version_id });
  }

  async function getObjectRetention({ tenant_id, object_id } = {}) {
    assertObjectLock();
    const tenantId = assertTenantId(tenant_id);
    const objectId = requireString(object_id, "object_id");
    const current = await currentVersion({ tenant_id: tenantId, object_id: objectId });
    let response = null;
    try {
      response = await client.send(new GetObjectRetentionCommand({
        ...common,
        Key: keyFor({ tenant_id: tenantId, object_id: objectId }),
        VersionId: current.version_id ?? undefined,
      }));
    } catch (error) {
      if (!isObjectGovernanceUnset(error)) throw error;
    }
    return Object.freeze({
      mode: response?.Retention?.Mode ?? null,
      retain_until: response?.Retention?.RetainUntilDate?.toISOString?.() ?? null,
      version_id: current.version_id,
    });
  }

  return Object.freeze({
    adapter_id,
    contract_version: DMS_STORAGE_ADAPTER_CONTRACT_VERSION,
    capabilities,
    provider: "s3",
    bucket_ref: `s3://${bucket}/${prefix}`,
    kms_key_ref: config.kms_key_id
      ? requireString(config.kms_key_id, "kms_key_id")
      : null,
    server_side_encryption:
      config.kms_key_id ? "aws:kms" : "AES256",
    credential_ref: credentialRef,
    secret_material_exposed: false,
    stageObject,
    statStagedObject,
    finalizeObject,
    deleteOrphan,
    digestObject,
    deleteCommittedObject,
    async putObject({ tenant_id, object_id, bytes, content_type } = {}) {
      const objectId = requireString(object_id, "object_id");
      const sessionId = `legacy:${objectId}`;
      await stageObject({ tenant_id, session_id: sessionId, object_id: objectId, bytes, content_type });
      return finalizeObject({ tenant_id, session_id: sessionId, object_id: objectId });
    },
    async getObject({ tenant_id, object_id } = {}) {
      const tenantId = assertTenantId(tenant_id);
      const objectId = requireString(object_id, "object_id");
      const object = await read(keyFor({ tenant_id: tenantId, object_id: objectId }));
      if (!object) throw codedError(`object not found: ${objectId}`, "DMS_COMMITTED_OBJECT_NOT_FOUND");
      return Object.freeze({
        object_id: objectId,
        tenant_id: tenantId,
        bytes: Buffer.from(object.bytes),
        sha256: object.sha256,
        byte_size: object.bytes.byteLength,
        mime_type: object.response.ContentType ?? "application/octet-stream",
      });
    },
    statObject,
    setObjectLegalHold,
    getObjectLegalHold,
    setObjectRetention,
    getObjectRetention,
  });
}

export function createS3StorageAdapterPlaceholder(config = {}) {
  for (const field of Object.keys(config)) {
    if (field !== "credential_ref" && SECRET_FIELD.test(field)) {
      throw new TypeError(`S3 adapter accepts credential_ref only, not ${field}`);
    }
  }
  if (!config.credential_ref) throw new TypeError("credential_ref is required");
  const notConfigured = () => {
    throw new Error("DMS_S3_ADAPTER_NOT_CONFIGURED");
  };
  return Object.freeze({
    adapter_id: config.adapter_id ?? "s3-placeholder",
    contract_version: DMS_STORAGE_ADAPTER_CONTRACT_VERSION,
    capabilities: Object.freeze({ staged_uploads: false, digest_verification: false, orphan_cleanup: false, provider_retention: false, conditional_delete: false }),
    provider: "s3",
    credential_ref: config.credential_ref,
    secret_material_exposed: false,
    stageObject: notConfigured,
    statStagedObject: notConfigured,
    finalizeObject: notConfigured,
    deleteOrphan: notConfigured,
    digestObject: notConfigured,
    deleteCommittedObject: notConfigured,
    putObject: notConfigured,
    getObject: notConfigured,
    statObject: notConfigured,
  });
}
