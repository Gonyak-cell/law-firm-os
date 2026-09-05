import {
  DMS_STORAGE_ADAPTER_CONTRACT_VERSION,
  assertTenantId,
  createOpaqueStorageKey,
  createStagingPointerRef,
  createStoragePointerRef,
  sha256Hex,
} from "./storage-adapter.js";
import {
  createOwnedGetObjectCommand,
  createOwnedHeadObjectCommand,
} from "./s3-bounded-commands.js";
import { readS3CommittedObjectBounded } from "./s3-bounded-object-reader.js";
import { assertBoundedS3Client, createBoundedS3Client } from "./s3-bounded-client.js";
import { createS3ObjectGovernance } from "./s3-object-governance.js";
import { isS3NotFound, readS3ResponseBody } from "./s3-provider-response.js";
import { createS3StagedObjectLifecycle } from "./s3-staged-object-lifecycle.js";
export { createS3StorageAdapterPlaceholder } from "./s3-storage-adapter-placeholder.js";
const storageTargets = new WeakMap();

export function getS3StorageTarget(storage) {
  const target = storageTargets.get(storage);
  if (!target) throw new TypeError("S3 storage target requires the constructed adapter");
  return target;
}

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
function createS3StorageAdapterInternal(config = {}) {
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
  const configuredClient = config.client ?? createBoundedS3Client({
    region: requireString(config.region, "region"),
  });
  const client = assertBoundedS3Client(configuredClient);
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
      return await client.send(createOwnedHeadObjectCommand({ ...common, Key: key, ChecksumMode: "ENABLED" }));
    } catch (error) {
      if (isS3NotFound(error)) return null;
      throw error;
    }
  }

  async function read(key) {
    try {
      const response = await client.send(createOwnedGetObjectCommand({ ...common, Key: key, ChecksumMode: "ENABLED" }));
      const bytes = await readS3ResponseBody(response.Body);
      return Object.freeze({ response, bytes, sha256: sha256Hex(bytes) });
    } catch (error) {
      if (isS3NotFound(error)) return null;
      throw error;
    }
  }

  function receiptFromHead({ tenantId, sessionId, objectId, response }) {
    const sha256 = requireString(response.Metadata?.["lawos-sha256"], "S3 object sha256 metadata");
    const byteSize = Number(response.ContentLength);
    if (!Number.isSafeInteger(byteSize) || byteSize < 0 || Number(response.Metadata?.["lawos-byte-size"]) !== byteSize) {
      throw codedError("S3 object byte-size metadata is invalid", "DMS_S3_METADATA_INVALID");
    }
    if (response.Metadata?.["lawos-tenant-ref"] !== sha256Hex(Buffer.from(tenantId))
        || response.Metadata?.["lawos-object-ref"] !== sha256Hex(Buffer.from(objectId))) {
      throw codedError("S3 object identity metadata is invalid", "DMS_S3_METADATA_INVALID");
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

  async function readObjectBounded({ tenant_id, object_id, max_bytes } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const objectId = requireString(object_id, "object_id");
    const key = keyFor({ tenant_id: tenantId, object_id: objectId });
    const headResponse = await head(key);
    if (!headResponse) throw codedError(`object not found: ${objectId}`, "DMS_COMMITTED_OBJECT_NOT_FOUND");
    const declared = receiptFromHead({ tenantId, objectId, response: headResponse });
    return readS3CommittedObjectBounded({
      adapter_id,
      client,
      common,
      key,
      tenant_id: tenantId,
      object_id: objectId,
      max_bytes,
      declared,
      declared_metadata: headResponse.Metadata,
      is_not_found: isS3NotFound,
    });
  }

  const governance = createS3ObjectGovernance({
    client,
    common,
    keyFor,
    statObject,
    objectLockEnabled,
    defaultRetentionDays,
    clock,
  });
  const lifecycle = createS3StagedObjectLifecycle({
    client,
    common,
    encryption,
    objectLockEnabled,
    keyFor,
    head,
    read,
    statObject,
    statStagedObject,
    ensureDefaultRetention: governance.ensureDefaultRetention,
    activeRetention: governance.activeRetention,
  });
  const {
    stageObject,
    finalizeObject,
    deleteOrphan,
    deleteCommittedObject,
    digestObject,
  } = lifecycle;
  const {
    setObjectLegalHold,
    getObjectLegalHold,
    setObjectRetention,
    getObjectRetention,
  } = governance;

  const storageTarget = Object.freeze({
    bucket_ref: `s3://${bucket}/${prefix}`,
    expected_bucket_owner: expectedBucketOwner,
    region: client.config.region,
    endpoint_mode: client.config.endpoint_mode,
    kms_key_ref: encryption.SSEKMSKeyId ?? null,
    server_side_encryption: encryption.ServerSideEncryption,
  });
  const adapter = Object.freeze({
    adapter_id,
    storage_target: storageTarget,
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
    readObjectBounded,
    statObject,
    setObjectLegalHold,
    getObjectLegalHold,
    setObjectRetention,
    getObjectRetention,
  });
  storageTargets.set(adapter, storageTarget);
  return adapter;
}
export function createS3StorageAdapter(config) {
  return createS3StorageAdapterInternal(config);
}
