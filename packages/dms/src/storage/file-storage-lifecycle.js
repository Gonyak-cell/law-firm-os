import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fsyncDirectory, writeBinaryFileDurably } from "../../../persistence/src/durable-file.js";
import {
  assertTenantId,
  createStagingReceipt,
  createStorageReceipt,
} from "./storage-adapter.js";

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
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

export function createFileStorageLifecycle({ adapter_id, rootPath, faultInjector, filesFor, stagedFilesFor, assertSafePaths, readObjectFromPaths, readQuarantineRecord } = {}) {
  function stageObject(input = {}) {
    return stageObjectInternal(input, false);
  }
  function stageObjectInternal({ tenant_id, session_id, object_id, bytes, content_type, expected_sha256 } = {}, allowArmed) {
    const tenantId = assertTenantId(tenant_id);
    const safeSessionId = requiredString(session_id, "session_id");
    const safeObjectId = requiredString(object_id, "object_id");
    const quarantine = readQuarantineRecord(tenantId, safeObjectId);
    if (quarantine && (!allowArmed || quarantine.state !== "armed")) {
      const error = new Error("committed object is quarantined");
      error.code = "DMS_COMMITTED_OBJECT_QUARANTINED";
      throw error;
    }
    const buffer = Buffer.isBuffer(bytes) ? Buffer.from(bytes) : Buffer.from(String(bytes ?? ""));
    const receipt = createStagingReceipt({ adapter_id, tenant_id: tenantId, session_id: safeSessionId, object_id: safeObjectId, bytes: buffer, content_type });
    if (expected_sha256 && expected_sha256 !== receipt.sha256) {
      const error = new Error("staged object digest does not match expected digest");
      error.code = "DMS_STAGED_DIGEST_MISMATCH";
      throw error;
    }
    const paths = stagedFilesFor(rootPath, tenantId, safeSessionId, safeObjectId);
    assertSafePaths(paths);
    if (existsSync(paths.bytesPath)) {
      const prior = readObjectFromPaths(tenantId, safeObjectId, paths);
      if (prior.sha256 !== receipt.sha256) {
        const error = new Error("upload session already staged different bytes");
        error.code = "DMS_STAGE_IDEMPOTENCY_CONFLICT";
        throw error;
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
    const safeSessionId = requiredString(session_id, "session_id");
    const safeObjectId = requiredString(object_id, "object_id");
    if (readQuarantineRecord(tenantId, safeObjectId)) {
      const error = new Error("committed object is quarantined");
      error.code = "DMS_COMMITTED_OBJECT_QUARANTINED";
      throw error;
    }
    const paths = stagedFilesFor(rootPath, tenantId, safeSessionId, safeObjectId);
    assertSafePaths(paths);
    if (!existsSync(paths.bytesPath)) return null;
    const object = readObjectFromPaths(tenantId, safeObjectId, paths);
    return createStagingReceipt({ adapter_id, tenant_id: tenantId, session_id: safeSessionId, object_id: safeObjectId, bytes: object.bytes, content_type: object.mime_type });
  }

  function finalizeObject(input = {}) {
    return finalizeObjectInternal(input, false);
  }
  function finalizeObjectInternal({ tenant_id, session_id, object_id } = {}, allowArmed) {
    const tenantId = assertTenantId(tenant_id);
    const safeSessionId = requiredString(session_id, "session_id");
    const safeObjectId = requiredString(object_id, "object_id");
    const quarantine = readQuarantineRecord(tenantId, safeObjectId);
    if (quarantine && (!allowArmed || quarantine.state !== "armed")) {
      const error = new Error("committed object is quarantined");
      error.code = "DMS_COMMITTED_OBJECT_QUARANTINED";
      throw error;
    }
    const stagedPaths = stagedFilesFor(rootPath, tenantId, safeSessionId, safeObjectId);
    const finalPaths = filesFor(rootPath, tenantId, safeObjectId);
    assertSafePaths(stagedPaths);
    assertSafePaths(finalPaths);
    if (!existsSync(stagedPaths.bytesPath)) {
      if (existsSync(finalPaths.bytesPath)) {
        const existing = readObjectFromPaths(tenantId, safeObjectId, finalPaths);
        return createStorageReceipt({ adapter_id, tenant_id: tenantId, object_id: safeObjectId, bytes: existing.bytes, content_type: existing.mime_type });
      }
      throw new Error(`staged object not found: ${safeObjectId}`);
    }
    const staged = readObjectFromPaths(tenantId, safeObjectId, stagedPaths);
    if (existsSync(finalPaths.bytesPath)) {
      const current = readObjectFromPaths(tenantId, safeObjectId, finalPaths);
      if (current.sha256 !== staged.sha256) {
        const error = new Error("committed object has a different digest");
        error.code = "DMS_FINALIZE_CONFLICT";
        throw error;
      }
    } else {
      const receipt = createStorageReceipt({ adapter_id, tenant_id: tenantId, object_id: safeObjectId, bytes: staged.bytes, content_type: staged.mime_type });
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
    const committed = readObjectFromPaths(tenantId, safeObjectId, finalPaths);
    return createStorageReceipt({ adapter_id, tenant_id: tenantId, object_id: safeObjectId, bytes: committed.bytes, content_type: committed.mime_type });
  }

  function statObject({ tenant_id, object_id } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeObjectId = requiredString(object_id, "object_id");
    if (readQuarantineRecord(tenantId, safeObjectId)) return null;
    const paths = filesFor(rootPath, tenantId, safeObjectId);
    assertSafePaths(paths);
    if (!existsSync(paths.bytesPath)) return null;
    const object = readObjectFromPaths(tenantId, safeObjectId, paths);
    return Object.freeze({ ...createStorageReceipt({ adapter_id, tenant_id: tenantId, object_id: safeObjectId, bytes: object.bytes, content_type: object.mime_type }), sha256: object.sha256 });
  }

  return Object.freeze({
    stageObject,
    statStagedObject,
    finalizeObject,
    statObject,
    putObject({ tenant_id, object_id, bytes, content_type } = {}) {
      const tenantId = assertTenantId(tenant_id);
      const safeObjectId = requiredString(object_id, "object_id");
      const sessionId = `legacy:${safeObjectId}`;
      stageObjectInternal({ tenant_id: tenantId, session_id: sessionId, object_id: safeObjectId, bytes, content_type }, true);
      return finalizeObjectInternal({ tenant_id: tenantId, session_id: sessionId, object_id: safeObjectId }, true);
    },
    deleteOrphan({ tenant_id, session_id, object_id } = {}) {
      const paths = stagedFilesFor(rootPath, assertTenantId(tenant_id), session_id, object_id);
      assertSafePaths(paths);
      return Object.freeze({ deleted: removeFiles(paths), committed_object_deleted: false });
    },
  });
}
