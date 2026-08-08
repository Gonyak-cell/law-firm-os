import { existsSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fsyncDirectory } from "../../../persistence/src/durable-file.js";
import {
  DMS_STORAGE_ADAPTER_CONTRACT_VERSION,
  assertTenantId,
  createOpaqueStorageKey,
  createStorageReceipt,
  sha256Hex,
} from "./storage-adapter.js";
import { createFileQuarantineAuthority } from "./file-quarantine-authority.js";
import { createFileStorageLifecycle } from "./file-storage-lifecycle.js";

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

function codedError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function createFileStorageAdapter({ adapter_id = "file-vault", rootPath, quarantineRootPath, faultInjector } = {}) {
  const requestedRootPath = path.resolve(requireString(rootPath, "rootPath"));
  let quarantineAuthority;
  let resolvedRootPath = requestedRootPath;
  function assertSafePaths(paths) {
    quarantineAuthority.assertSafePath(paths.bytesPath, "storage bytes path");
    quarantineAuthority.assertSafePath(paths.metadataPath, "storage metadata path");
  }
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
  quarantineAuthority = createFileQuarantineAuthority({
    adapter_id,
    rootPath: requestedRootPath,
    quarantineRootPath,
    filesFor,
    readObjectFromPaths,
  });
  resolvedRootPath = quarantineAuthority.rootPath;
  function readObject(tenantId, safeObjectId) {
    const quarantine = quarantineAuthority.readRecord(tenantId, safeObjectId);
    if (quarantine) throw codedError("committed object is quarantined", "DMS_COMMITTED_OBJECT_QUARANTINED");
    return readObjectFromPaths(tenantId, safeObjectId, filesFor(resolvedRootPath, tenantId, safeObjectId));
  }
  const lifecycle = createFileStorageLifecycle({
    adapter_id,
    rootPath: resolvedRootPath,
    faultInjector,
    filesFor,
    stagedFilesFor,
    assertSafePaths,
    readObjectFromPaths,
    readQuarantineRecord: quarantineAuthority.readRecord,
  });
  return Object.freeze({
    adapter_id,
    contract_version: DMS_STORAGE_ADAPTER_CONTRACT_VERSION,
    capabilities,
    validateQuarantineAuthority: quarantineAuthority.validate,
    stageObject: lifecycle.stageObject,
    statStagedObject: lifecycle.statStagedObject,
    finalizeObject: lifecycle.finalizeObject,
    deleteOrphan({ tenant_id, session_id, object_id } = {}) {
      return lifecycle.deleteOrphan({ tenant_id, session_id, object_id });
    },
    recordCommittedObjectQuarantine: quarantineAuthority.recordCommittedObjectQuarantine,
    armCommittedObjectQuarantine: quarantineAuthority.armCommittedObjectQuarantine,
    clearCommittedObjectQuarantine: quarantineAuthority.clearCommittedObjectQuarantine,
    getCommittedObjectQuarantine({ tenant_id, object_id } = {}) {
      const tenantId = assertTenantId(tenant_id);
      const safeObjectId = requireString(object_id, "object_id");
      return quarantineAuthority.getCommittedObjectQuarantine(tenantId, safeObjectId);
    },
    quarantineCommittedObject({ tenant_id, object_id, expected_sha256, reason, audit_trace_id, permission_envelope_id } = {}) {
      const tenantId = assertTenantId(tenant_id);
      const safeObjectId = requireString(object_id, "object_id");
      const paths = filesFor(resolvedRootPath, tenantId, safeObjectId);
      assertSafePaths(paths);
      const current = existsSync(paths.bytesPath) ? readObjectFromPaths(tenantId, safeObjectId, paths) : null;
      if (current && requireString(expected_sha256, "expected_sha256") !== current.sha256) {
        throw codedError("committed object digest changed before quarantine", "DMS_COMMITTED_DELETE_CONDITION_FAILED");
      }
      const record = quarantineAuthority.recordCommittedObjectQuarantine({ tenant_id: tenantId, object_id: safeObjectId, expected_sha256, reason, audit_trace_id, permission_envelope_id });
      const removed = current ? removeFiles(paths) : false;
      return Object.freeze({ ...record, quarantined: removed, already_absent: !removed, provider_delete_replayed: !removed, sha256: record.expected_sha256 });
    },
    deleteCommittedObject({ tenant_id, object_id, expected_sha256 } = {}) {
      const tenantId = assertTenantId(tenant_id);
      const safeObjectId = requireString(object_id, "object_id");
      const paths = filesFor(resolvedRootPath, tenantId, safeObjectId);
      assertSafePaths(paths);
      if (quarantineAuthority.readRecord(tenantId, safeObjectId)) throw codedError("committed object is quarantined", "DMS_COMMITTED_OBJECT_QUARANTINED");
      if (!existsSync(paths.bytesPath)) return Object.freeze({ deleted: false, already_absent: true, provider_delete_replayed: true });
      const current = lifecycle.statObject({ tenant_id: tenantId, object_id: safeObjectId });
      if (requireString(expected_sha256, "expected_sha256") !== current.sha256) {
        throw codedError("committed object digest changed before delete", "DMS_COMMITTED_DELETE_CONDITION_FAILED");
      }
      removeFiles(paths);
      return Object.freeze({ deleted: true, already_absent: false, provider_delete_replayed: false, sha256: current.sha256 });
    },
    digestObject({ tenant_id, session_id, object_id } = {}) {
      const tenantId = assertTenantId(tenant_id);
      const receipt = session_id
        ? lifecycle.statStagedObject({ tenant_id: tenantId, session_id, object_id })
        : lifecycle.statObject({ tenant_id: tenantId, object_id });
      return receipt ? Object.freeze({ sha256: receipt.sha256, byte_size: receipt.byte_size }) : null;
    },
    putObject: lifecycle.putObject,
    getObject({ tenant_id, object_id } = {}) {
      const tenantId = assertTenantId(tenant_id);
      const safeObjectId = requireString(object_id, "object_id");
      return readObject(tenantId, safeObjectId);
    },
    statObject: lifecycle.statObject,
  });
}
