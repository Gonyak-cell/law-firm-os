import { assertTenantId, sha256Hex } from "./storage-adapter.js";
import {
  createOwnedDeleteObjectCommand,
  createOwnedPutObjectCommand,
} from "./s3-bounded-commands.js";

function codedError(message, code) {
  return Object.assign(new Error(message), { code });
}

function requireString(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function isPreconditionFailed(error) {
  return error?.$metadata?.httpStatusCode === 412 || error?.name === "PreconditionFailed";
}

function metadataFor({ tenantId, objectId, sha256, byteSize }) {
  return Object.freeze({
    "lawos-tenant-ref": sha256Hex(Buffer.from(tenantId)),
    "lawos-object-ref": sha256Hex(Buffer.from(objectId)),
    "lawos-sha256": sha256,
    "lawos-byte-size": String(byteSize),
  });
}

export function createS3StagedObjectLifecycle({
  client,
  common,
  encryption,
  objectLockEnabled,
  keyFor,
  head,
  read,
  statObject,
  statStagedObject,
  ensureDefaultRetention,
  activeRetention,
} = {}) {
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
      if (existing.sha256 !== sha256) {
        throw codedError("upload session already staged different bytes", "DMS_STAGE_IDEMPOTENCY_CONFLICT");
      }
      return statStagedObject({ tenant_id: tenantId, session_id: sessionId, object_id: objectId });
    }
    try {
      await client.send(createOwnedPutObjectCommand({
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
    if (!stored || stored.sha256 !== sha256) {
      throw codedError("S3 staged object digest verification failed", "DMS_STAGED_DIGEST_MISMATCH");
    }
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
        await client.send(createOwnedPutObjectCommand({
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
      if (committed.sha256 !== staged.sha256) {
        throw codedError("committed object has a different digest", "DMS_FINALIZE_CONFLICT");
      }
    }
    const defaultRetentionApplied = await ensureDefaultRetention(committedKey, committed.response.VersionId);
    const stagedCleanupDeferred = objectLockEnabled
      && await activeRetention(stagedKey, staged.response.VersionId);
    if (!stagedCleanupDeferred) {
      await client.send(createOwnedDeleteObjectCommand({
        ...common,
        Key: stagedKey,
        VersionId: staged.response.VersionId,
      }));
      await client.send(createOwnedDeleteObjectCommand({ ...common, Key: stagedKey }));
    }
    const receipt = await statObject({ tenant_id: tenantId, object_id: objectId });
    return Object.freeze({
      ...receipt,
      default_retention_applied: defaultRetentionApplied,
      staged_cleanup_deferred: stagedCleanupDeferred,
    });
  }

  async function deleteOrphan({ tenant_id, session_id, object_id } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const sessionId = requireString(session_id, "session_id");
    const objectId = requireString(object_id, "object_id");
    const key = keyFor({ tenant_id: tenantId, session_id: sessionId, object_id: objectId });
    const current = await head(key);
    if (!current) return Object.freeze({ deleted: false, committed_object_deleted: false });
    await client.send(createOwnedDeleteObjectCommand({ ...common, Key: key, VersionId: current.VersionId }));
    await client.send(createOwnedDeleteObjectCommand({ ...common, Key: key }));
    return Object.freeze({ deleted: true, committed_object_deleted: false });
  }

  async function deleteCommittedObject({ tenant_id, object_id, expected_sha256 } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const objectId = requireString(object_id, "object_id");
    const expected = requireString(expected_sha256, "expected_sha256");
    const key = keyFor({ tenant_id: tenantId, object_id: objectId });
    const current = await read(key);
    if (!current) return Object.freeze({ deleted: false, already_absent: true, provider_delete_replayed: true });
    if (current.sha256 !== expected) {
      throw codedError("committed object digest changed before delete", "DMS_COMMITTED_DELETE_CONDITION_FAILED");
    }
    await client.send(createOwnedDeleteObjectCommand({
      ...common,
      Key: key,
      VersionId: current.response.VersionId,
    }));
    await client.send(createOwnedDeleteObjectCommand({ ...common, Key: key }));
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

  return Object.freeze({ stageObject, finalizeObject, deleteOrphan, deleteCommittedObject, digestObject });
}
