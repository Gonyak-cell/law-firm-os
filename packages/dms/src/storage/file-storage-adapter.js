import { existsSync, lstatSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fsyncDirectory, writeBinaryFileDurably } from "../../../persistence/src/durable-file.js";
import {
  DMS_STORAGE_ADAPTER_CONTRACT_VERSION,
  assertTenantId,
  createOpaqueStorageKey,
  createStagingReceipt,
  createStorageReceipt,
  sha256Hex,
} from "./storage-adapter.js";
import {
  assertQuarantineRecord,
  createQuarantineRecord,
  DMS_OBJECT_QUARANTINE_SCHEMA,
} from "./quarantine-record.js";

function requireString(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function filesFor(rootPath, tenant_id, object_id) {
  const key = createOpaqueStorageKey({ tenant_id, object_id });
  return {
    bytesPath: path.join(rootPath, `${key}.bin`),
    metadataPath: path.join(rootPath, `${key}.json`),
  };
}

function stagedFilesFor(rootPath, tenant_id, session_id, object_id) {
  const key = createOpaqueStorageKey({ tenant_id, session_id, object_id });
  const stagingRoot = path.join(rootPath, ".staging");
  return {
    bytesPath: path.join(stagingRoot, `${key}.bin`),
    metadataPath: path.join(stagingRoot, `${key}.json`),
  };
}

function quarantineFileFor(rootPath, tenant_id, object_id) {
  const key = createOpaqueStorageKey({ tenant_id, object_id });
  return path.join(rootPath, ".quarantine", `${key}.json`);
}

function removeFiles(paths) {
  let deleted = false;
  for (const filePath of [paths.bytesPath, paths.metadataPath]) {
    if (!existsSync(filePath)) continue;
    unlinkSync(filePath);
    fsyncDirectory(path.dirname(filePath));
    deleted = true;
  }
  return deleted;
}

function assertNotSymlink(filePath, label) {
  if (existsSync(filePath) && lstatSync(filePath).isSymbolicLink()) {
    throw codedError(`${label} must not be a symlink`, "DMS_STORAGE_SYMLINK_REJECTED");
  }
}

function assertSafePaths(paths) {
  assertNotSymlink(paths.bytesPath, "storage bytes path");
  assertNotSymlink(paths.metadataPath, "storage metadata path");
}

function codedError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function createFileStorageAdapter({ adapter_id = "file-vault", rootPath, faultInjector } = {}) {
  const resolvedRootPath = path.resolve(requireString(rootPath, "rootPath"));
  assertNotSymlink(resolvedRootPath, "storage root");
  const capabilities = Object.freeze({
    staged_uploads: true,
    digest_verification: true,
    orphan_cleanup: true,
    provider_retention: false,
    conditional_delete: true,
  });
  function readObjectFromPaths(tenantId, safeObjectId, paths) {
    assertSafePaths(paths);
    if (!existsSync(paths.bytesPath)) throw new Error(`object not found: ${safeObjectId}`);
    const bytes = readFileSync(paths.bytesPath);
    const sha256 = sha256Hex(bytes);
    const metadata = existsSync(paths.metadataPath)
      ? JSON.parse(readFileSync(paths.metadataPath, "utf8"))
      : { receipt: createStorageReceipt({ adapter_id, tenant_id: tenantId, object_id: safeObjectId, bytes }) };
    if (metadata.receipt?.sha256 && metadata.receipt.sha256 !== sha256) {
      throw new Error(`object hash mismatch: ${safeObjectId}`);
    }
    return Object.freeze({
      object_id: safeObjectId,
      tenant_id: tenantId,
      bytes: Buffer.from(bytes),
      sha256,
      byte_size: bytes.byteLength,
      mime_type: metadata.receipt?.mime_type ?? "application/octet-stream",
    });
  }
  function readObject(tenantId, safeObjectId) {
    const quarantine = readQuarantineRecord(tenantId, safeObjectId);
    if (quarantine) throw codedError("committed object is quarantined", "DMS_COMMITTED_OBJECT_QUARANTINED");
    return readObjectFromPaths(tenantId, safeObjectId, filesFor(resolvedRootPath, tenantId, safeObjectId));
  }
  function readQuarantineRecord(tenantId, safeObjectId) {
    const recordPath = quarantineFileFor(resolvedRootPath, tenantId, safeObjectId);
    assertNotSymlink(path.join(resolvedRootPath, ".quarantine"), "storage quarantine root");
    assertNotSymlink(recordPath, "storage quarantine record");
    if (!existsSync(recordPath)) return null;
    let record;
    try {
      record = JSON.parse(readFileSync(recordPath, "utf8"));
    } catch (error) {
      throw codedError("committed object quarantine record cannot be read", "DMS_COMMITTED_QUARANTINE_INVALID");
    }
    if (record?.schema_version !== DMS_OBJECT_QUARANTINE_SCHEMA) {
      throw codedError("committed object quarantine record is invalid", "DMS_COMMITTED_QUARANTINE_INVALID");
    }
    return assertQuarantineRecord(record, { adapter_id, tenant_id: tenantId, object_id: safeObjectId, expected_sha256: record.expected_sha256 });
  }
  function writeQuarantineRecord(input) {
    const record = createQuarantineRecord({ adapter_id, ...input });
    const recordPath = quarantineFileFor(resolvedRootPath, record.tenant_id, record.object_id);
    assertNotSymlink(path.join(resolvedRootPath, ".quarantine"), "storage quarantine root");
    assertNotSymlink(recordPath, "storage quarantine record");
    writeBinaryFileDurably({ filePath: recordPath, bytes: `${JSON.stringify(record)}\n` });
    return record;
  }
  function recordCommittedObjectQuarantine({ tenant_id, object_id, expected_sha256, reason, audit_trace_id, permission_envelope_id } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeObjectId = requireString(object_id, "object_id");
    const existing = readQuarantineRecord(tenantId, safeObjectId);
    if (existing) {
      assertQuarantineRecord(existing, { adapter_id, tenant_id: tenantId, object_id: safeObjectId, expected_sha256 });
      return Object.freeze({ ...existing, recorded: false, already_recorded: true, durable_quarantine: true });
    }
    const paths = filesFor(resolvedRootPath, tenantId, safeObjectId);
    assertSafePaths(paths);
    if (existsSync(paths.bytesPath)) {
      const current = readObjectFromPaths(tenantId, safeObjectId, paths);
      if (requireString(expected_sha256, "expected_sha256") !== current.sha256) {
        throw codedError("committed object digest changed before quarantine record", "DMS_COMMITTED_DELETE_CONDITION_FAILED");
      }
    }
    const record = writeQuarantineRecord({ tenant_id: tenantId, object_id: safeObjectId, expected_sha256, reason, audit_trace_id, permission_envelope_id });
    return Object.freeze({ ...record, recorded: true, already_recorded: false, durable_quarantine: true });
  }
  function stageObject({ tenant_id, session_id, object_id, bytes, content_type, expected_sha256 } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeSessionId = requireString(session_id, "session_id");
    const safeObjectId = requireString(object_id, "object_id");
    if (readQuarantineRecord(tenantId, safeObjectId)) throw codedError("committed object is quarantined", "DMS_COMMITTED_OBJECT_QUARANTINED");
    const buffer = Buffer.isBuffer(bytes) ? Buffer.from(bytes) : Buffer.from(String(bytes ?? ""));
    const receipt = createStagingReceipt({
      adapter_id,
      tenant_id: tenantId,
      session_id: safeSessionId,
      object_id: safeObjectId,
      bytes: buffer,
      content_type,
    });
    if (expected_sha256 && expected_sha256 !== receipt.sha256) {
      throw codedError("staged object digest does not match expected digest", "DMS_STAGED_DIGEST_MISMATCH");
    }
    const paths = stagedFilesFor(resolvedRootPath, tenantId, safeSessionId, safeObjectId);
    assertSafePaths(paths);
    if (existsSync(paths.bytesPath)) {
      const prior = readObjectFromPaths(tenantId, safeObjectId, paths);
      if (prior.sha256 !== receipt.sha256) {
        throw codedError("upload session already staged different bytes", "DMS_STAGE_IDEMPOTENCY_CONFLICT");
      }
      return Object.freeze({ ...receipt, byte_size: prior.byte_size, mime_type: prior.mime_type });
    }
    writeBinaryFileDurably({
      filePath: paths.bytesPath,
      bytes: buffer,
      expectedSha256: receipt.sha256,
      sidecar: { filePath: paths.metadataPath, value: { tenant_id: tenantId, object_id: safeObjectId, receipt } },
      faultInjector: faultInjector ? (point, context) => faultInjector(`stage:${point}`, context) : undefined,
      compensationHook({ error, compensated }) {
        if (!compensated) error.safe_error_code = "DMS_BINARY_COMPENSATION_FAILED";
      },
    });
    return receipt;
  }
  function statStagedObject({ tenant_id, session_id, object_id } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeSessionId = requireString(session_id, "session_id");
    const safeObjectId = requireString(object_id, "object_id");
    const paths = stagedFilesFor(resolvedRootPath, tenantId, safeSessionId, safeObjectId);
    if (!existsSync(paths.bytesPath)) return null;
    const object = readObjectFromPaths(tenantId, safeObjectId, paths);
    return createStagingReceipt({
      adapter_id,
      tenant_id: tenantId,
      session_id: safeSessionId,
      object_id: safeObjectId,
      bytes: object.bytes,
      content_type: object.mime_type,
    });
  }
  function finalizeObject({ tenant_id, session_id, object_id } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeSessionId = requireString(session_id, "session_id");
    const safeObjectId = requireString(object_id, "object_id");
    if (readQuarantineRecord(tenantId, safeObjectId)) throw codedError("committed object is quarantined", "DMS_COMMITTED_OBJECT_QUARANTINED");
    const stagedPaths = stagedFilesFor(resolvedRootPath, tenantId, safeSessionId, safeObjectId);
    const finalPaths = filesFor(resolvedRootPath, tenantId, safeObjectId);
    assertSafePaths(stagedPaths);
    assertSafePaths(finalPaths);
    if (!existsSync(stagedPaths.bytesPath)) {
      if (existsSync(finalPaths.bytesPath)) return statObject({ tenant_id: tenantId, object_id: safeObjectId });
      throw new Error(`staged object not found: ${safeObjectId}`);
    }
    const staged = readObjectFromPaths(tenantId, safeObjectId, stagedPaths);
    if (existsSync(finalPaths.bytesPath)) {
      const current = readObject(tenantId, safeObjectId);
      if (current.sha256 !== staged.sha256) {
        throw codedError("committed object has a different digest", "DMS_FINALIZE_CONFLICT");
      }
    } else {
      const receipt = createStorageReceipt({
        adapter_id,
        tenant_id: tenantId,
        object_id: safeObjectId,
        bytes: staged.bytes,
        content_type: staged.mime_type,
      });
      writeBinaryFileDurably({
        filePath: finalPaths.bytesPath,
        bytes: staged.bytes,
        expectedSha256: staged.sha256,
        sidecar: { filePath: finalPaths.metadataPath, value: { tenant_id: tenantId, object_id: safeObjectId, receipt } },
        faultInjector: faultInjector ? (point, context) => faultInjector(`finalize:${point}`, context) : undefined,
        compensationHook({ error, compensated }) {
          if (!compensated) error.safe_error_code = "DMS_BINARY_COMPENSATION_FAILED";
        },
      });
    }
    faultInjector?.("after_finalize_write_before_staged_cleanup", { object_id: safeObjectId });
    removeFiles(stagedPaths);
    return statObject({ tenant_id: tenantId, object_id: safeObjectId });
  }
  function statObject({ tenant_id, object_id } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeObjectId = requireString(object_id, "object_id");
    if (readQuarantineRecord(tenantId, safeObjectId)) return null;
    const paths = filesFor(resolvedRootPath, tenantId, safeObjectId);
    if (!existsSync(paths.bytesPath)) return null;
    const object = readObject(tenantId, safeObjectId);
    return Object.freeze({
      ...createStorageReceipt({
        adapter_id,
        tenant_id: tenantId,
        object_id: safeObjectId,
        bytes: object.bytes,
        content_type: object.mime_type,
      }),
      sha256: object.sha256,
    });
  }
  return Object.freeze({
    adapter_id,
    contract_version: DMS_STORAGE_ADAPTER_CONTRACT_VERSION,
    capabilities,
    stageObject,
    statStagedObject,
    finalizeObject,
    deleteOrphan({ tenant_id, session_id, object_id } = {}) {
      const paths = stagedFilesFor(resolvedRootPath, assertTenantId(tenant_id), session_id, object_id);
      assertSafePaths(paths);
      return Object.freeze({ deleted: removeFiles(paths), committed_object_deleted: false });
    },
    recordCommittedObjectQuarantine,
    getCommittedObjectQuarantine({ tenant_id, object_id } = {}) {
      const tenantId = assertTenantId(tenant_id);
      const safeObjectId = requireString(object_id, "object_id");
      return readQuarantineRecord(tenantId, safeObjectId);
    },
    quarantineCommittedObject({ tenant_id, object_id, expected_sha256, reason, audit_trace_id, permission_envelope_id } = {}) {
      const tenantId = assertTenantId(tenant_id);
      const safeObjectId = requireString(object_id, "object_id");
      const paths = filesFor(resolvedRootPath, tenantId, safeObjectId);
      assertSafePaths(paths);
      const existing = readQuarantineRecord(tenantId, safeObjectId);
      const current = existsSync(paths.bytesPath) ? readObjectFromPaths(tenantId, safeObjectId, paths) : null;
      if (current && requireString(expected_sha256, "expected_sha256") !== current.sha256) {
        throw codedError("committed object digest changed before quarantine", "DMS_COMMITTED_DELETE_CONDITION_FAILED");
      }
      const record = existing
        ? assertQuarantineRecord(existing, { adapter_id, tenant_id: tenantId, object_id: safeObjectId, expected_sha256 })
        : recordCommittedObjectQuarantine({ tenant_id: tenantId, object_id: safeObjectId, expected_sha256, reason, audit_trace_id, permission_envelope_id });
      const removed = current ? removeFiles(paths) : false;
      return Object.freeze({ ...record, quarantined: removed, already_absent: !removed, provider_delete_replayed: !removed, sha256: record.expected_sha256 });
    },
    deleteCommittedObject({ tenant_id, object_id, expected_sha256 } = {}) {
      const tenantId = assertTenantId(tenant_id);
      const safeObjectId = requireString(object_id, "object_id");
      const paths = filesFor(resolvedRootPath, tenantId, safeObjectId);
      assertSafePaths(paths);
      if (!existsSync(paths.bytesPath)) return Object.freeze({ deleted: false, already_absent: true, provider_delete_replayed: true });
      const current = statObject({ tenant_id: tenantId, object_id: safeObjectId });
      if (requireString(expected_sha256, "expected_sha256") !== current.sha256) {
        throw codedError("committed object digest changed before delete", "DMS_COMMITTED_DELETE_CONDITION_FAILED");
      }
      removeFiles(paths);
      return Object.freeze({ deleted: true, already_absent: false, provider_delete_replayed: false, sha256: current.sha256 });
    },
    digestObject({ tenant_id, session_id, object_id } = {}) {
      const tenantId = assertTenantId(tenant_id);
      const receipt = session_id
        ? statStagedObject({ tenant_id: tenantId, session_id, object_id })
        : statObject({ tenant_id: tenantId, object_id });
      return receipt ? Object.freeze({ sha256: receipt.sha256, byte_size: receipt.byte_size }) : null;
    },
    putObject({ tenant_id, object_id, bytes, content_type } = {}) {
      const tenantId = assertTenantId(tenant_id);
      const safeObjectId = requireString(object_id, "object_id");
      const sessionId = `legacy:${safeObjectId}`;
      stageObject({ tenant_id: tenantId, session_id: sessionId, object_id: safeObjectId, bytes, content_type });
      return finalizeObject({ tenant_id: tenantId, session_id: sessionId, object_id: safeObjectId });
    },
    getObject({ tenant_id, object_id } = {}) {
      const tenantId = assertTenantId(tenant_id);
      const safeObjectId = requireString(object_id, "object_id");
      return readObject(tenantId, safeObjectId);
    },
    statObject,
  });
}
