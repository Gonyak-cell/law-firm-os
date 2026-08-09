import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { writeBinaryFileDurably } from "../../../persistence/src/durable-file.js";
import {
  DMS_STORAGE_ADAPTER_CONTRACT_VERSION,
  assertTenantId,
  createStagingReceipt,
  createStorageReceipt,
  sha256Hex,
} from "./storage-adapter.js";
import { readFileCommittedObjectBounded } from "./file-bounded-object-reader.js";
import {
  assertNotSymlink,
  assertSafePaths,
  filesFor,
  removeFiles,
  stagedFilesFor,
} from "./file-storage-paths.js";

function requireString(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
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
    return readObjectFromPaths(tenantId, safeObjectId, filesFor(resolvedRootPath, tenantId, safeObjectId));
  }
  function stageObject({ tenant_id, session_id, object_id, bytes, content_type, expected_sha256 } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeSessionId = requireString(session_id, "session_id");
    const safeObjectId = requireString(object_id, "object_id");
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
  async function readObjectBounded({ tenant_id, object_id, max_bytes } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeObjectId = requireString(object_id, "object_id");
    const paths = filesFor(resolvedRootPath, tenantId, safeObjectId);
    return readFileCommittedObjectBounded({
      adapter_id,
      tenant_id: tenantId,
      object_id: safeObjectId,
      max_bytes,
      paths,
      assert_safe_paths: assertSafePaths,
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
    readObjectBounded,
    statObject,
  });
}
