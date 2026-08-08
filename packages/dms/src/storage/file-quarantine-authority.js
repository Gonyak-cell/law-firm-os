import {
  accessSync,
  constants,
  lstatSync,
  readFileSync,
  realpathSync,
  unlinkSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { ensurePrivateDirectory, fsyncDirectory, writeBinaryFileDurably } from "../../../persistence/src/durable-file.js";
import { assertTenantId, createOpaqueStorageKey } from "./storage-adapter.js";
import { createFileRootBinding } from "./file-root-binding.js";
import {
  assertQuarantineRecord,
  createQuarantineRecord,
  DMS_OBJECT_QUARANTINE_SCHEMA,
} from "./quarantine-record.js";

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}
function codedError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}
function unavailable(label, error) {
  const code = error?.code === "ELOOP" ? "DMS_STORAGE_SYMLINK_REJECTED" : "DMS_QUARANTINE_AUTHORITY_UNAVAILABLE";
  return codedError(`${label} is unavailable`, code);
}
function invalid(message = "quarantine authority binding is invalid") {
  return codedError(message, "DMS_QUARANTINE_AUTHORITY_BINDING_INVALID");
}

function strictLstat(filePath, label, { missingOk = true } = {}) {
  try {
    return lstatSync(filePath);
  } catch (error) {
    if (missingOk && error?.code === "ENOENT") return null;
    throw unavailable(label, error);
  }
}

function assertNoSymlinkAncestors(filePath, label) {
  const absolute = path.resolve(filePath);
  const root = path.parse(absolute).root;
  let current = root;
  for (const part of path.relative(root, absolute).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    const stat = strictLstat(current, label);
    if (!stat) continue;
    if (stat.isSymbolicLink()) {
      if (current === absolute || !["/tmp", "/var"].includes(current)) throw codedError(`${label} must not be a symlink`, "DMS_STORAGE_SYMLINK_REJECTED");
      continue;
    }
    if (current !== absolute && !stat.isDirectory()) throw unavailable(`${label} parent`, { code: "ENOTDIR" });
  }
}

function assertDirectory(filePath, label) {
  assertNoSymlinkAncestors(filePath, label);
  const stat = strictLstat(filePath, label);
  if (!stat) {
    ensurePrivateDirectory(filePath);
    assertNoSymlinkAncestors(filePath, label);
  }
  const final = strictLstat(filePath, label, { missingOk: false });
  if (!final.isDirectory()) throw unavailable(`${label} is not a directory`, { code: "ENOTDIR" });
}

function canonicalDirectory(filePath, label) {
  assertDirectory(filePath, label);
  try {
    return realpathSync(filePath);
  } catch (error) {
    throw unavailable(label, error);
  }
}

function containsPath(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function quarantinePath(rootPath, tenantId, objectId) {
  return path.join(rootPath, ".quarantine", `${createOpaqueStorageKey({ tenant_id: tenantId, object_id: objectId })}.json`);
}

export function defaultQuarantineRootPath(objectRootPath) {
  const parent = path.dirname(objectRootPath);
  const name = path.basename(objectRootPath) || "objects";
  return path.join(parent, `.${name}-quarantine-authority`);
}

export function createFileQuarantineAuthority({ adapter_id, rootPath, quarantineRootPath, filesFor, readObjectFromPaths } = {}) {
  const adapterId = requiredString(adapter_id, "adapter_id");
  const resolvedRootPath = path.resolve(requiredString(rootPath, "rootPath"));
  const resolvedQuarantineRootPath = path.resolve(quarantineRootPath || defaultQuarantineRootPath(resolvedRootPath));
  const objectRootRealpath = canonicalDirectory(resolvedRootPath, "storage root");
  const quarantineRootRealpath = canonicalDirectory(resolvedQuarantineRootPath, "quarantine authority root");
  if (containsPath(objectRootRealpath, quarantineRootRealpath) || containsPath(quarantineRootRealpath, objectRootRealpath)) {
    throw codedError("quarantine authority must be outside the object store", "DMS_QUARANTINE_AUTHORITY_NOT_INDEPENDENT");
  }
  const rootBinding = createFileRootBinding({
    resolvedRootPath,
    resolvedQuarantineRootPath,
    objectRootRealpath,
    quarantineRootRealpath,
    strictLstat,
    assertNoSymlinkAncestors,
    invalid,
    unavailable,
  });
  const quarantineDirectory = path.join(resolvedQuarantineRootPath, ".quarantine");
  assertDirectory(quarantineDirectory, "storage quarantine root");

  function assertBound() {
    const currentObjectRoot = canonicalDirectory(resolvedRootPath, "storage root");
    const currentQuarantineRoot = canonicalDirectory(resolvedQuarantineRootPath, "quarantine authority root");
    if (currentObjectRoot !== objectRootRealpath || currentQuarantineRoot !== quarantineRootRealpath
      || containsPath(currentObjectRoot, currentQuarantineRoot) || containsPath(currentQuarantineRoot, currentObjectRoot)) {
      throw codedError("storage root and quarantine authority no longer match", "DMS_QUARANTINE_AUTHORITY_BINDING_MISMATCH");
    }
    rootBinding.assertBound();
    const directoryStat = strictLstat(quarantineDirectory, "storage quarantine root");
    if (!directoryStat) throw unavailable("storage quarantine root", { code: "ENOENT" });
    if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) throw invalid("storage quarantine root is invalid");
  }

  function assertSafePath(filePath, label = "storage path") {
    assertBound();
    assertNoSymlinkAncestors(filePath, label);
  }

  function readRecord(tenant_id, object_id) {
    const tenantId = assertTenantId(tenant_id);
    const safeObjectId = requiredString(object_id, "object_id");
    assertBound();
    const recordPath = quarantinePath(resolvedQuarantineRootPath, tenantId, safeObjectId);
    const stat = strictLstat(recordPath, "storage quarantine record");
    if (!stat) return null;
    if (stat.isSymbolicLink() || !stat.isFile()) throw invalid("storage quarantine record is invalid");
    let record;
    try {
      record = JSON.parse(readFileSync(recordPath, "utf8"));
    } catch (error) {
      if (error instanceof SyntaxError) throw codedError("committed object quarantine record is invalid", "DMS_COMMITTED_QUARANTINE_INVALID");
      throw unavailable("storage quarantine record", error);
    }
    if (record?.schema_version !== DMS_OBJECT_QUARANTINE_SCHEMA) throw codedError("committed object quarantine record is invalid", "DMS_COMMITTED_QUARANTINE_INVALID");
    return assertQuarantineRecord(record, { adapter_id: adapterId, tenant_id: tenantId, object_id: safeObjectId, expected_sha256: record.expected_sha256 });
  }

  function writeRecord(input) {
    assertBound();
    const record = createQuarantineRecord({ adapter_id: adapterId, ...input });
    assertSafePath(quarantineDirectory, "storage quarantine root");
    const recordPath = quarantinePath(resolvedQuarantineRootPath, record.tenant_id, record.object_id);
    assertSafePath(recordPath, "storage quarantine record");
    try {
      writeBinaryFileDurably({ filePath: recordPath, bytes: `${JSON.stringify(record)}\n` });
    } catch (error) {
      throw unavailable("storage quarantine record", error);
    }
    return record;
  }

  function validate() {
    assertBound();
    try {
      accessSync(resolvedQuarantineRootPath, constants.W_OK);
      const probePath = path.join(resolvedQuarantineRootPath, `.probe-${process.pid}-${randomUUID()}.json`);
      writeBinaryFileDurably({ filePath: probePath, bytes: "quarantine-authority-probe\n" });
      unlinkSync(probePath);
      fsyncDirectory(resolvedQuarantineRootPath);
    } catch (error) {
      throw unavailable("quarantine authority", error);
    }
    return Object.freeze({ available: true, independent: true, durable: true });
  }

  function recordCommittedObjectQuarantine({ tenant_id, object_id, expected_sha256, reason, audit_trace_id, permission_envelope_id } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeObjectId = requiredString(object_id, "object_id");
    const existing = readRecord(tenantId, safeObjectId);
    if (existing) {
      assertQuarantineRecord(existing, { adapter_id: adapterId, tenant_id: tenantId, object_id: safeObjectId, expected_sha256 });
      if (existing.state === "quarantined") return Object.freeze({ ...existing, recorded: false, already_recorded: true, durable_quarantine: true });
      const record = writeRecord({ tenant_id: tenantId, object_id: safeObjectId, expected_sha256, reason, audit_trace_id: audit_trace_id ?? existing.audit_trace_id, permission_envelope_id: permission_envelope_id ?? existing.permission_envelope_id, state: "quarantined" });
      return Object.freeze({ ...record, recorded: true, already_recorded: false, durable_quarantine: true });
    }
    const paths = filesFor(resolvedRootPath, tenantId, safeObjectId);
    assertSafePath(paths.bytesPath);
    if (strictLstat(paths.bytesPath, "storage bytes path")) {
      const current = readObjectFromPaths(tenantId, safeObjectId, paths);
      if (requiredString(expected_sha256, "expected_sha256") !== current.sha256) throw codedError("committed object digest changed before quarantine record", "DMS_COMMITTED_DELETE_CONDITION_FAILED");
    }
    const record = writeRecord({ tenant_id: tenantId, object_id: safeObjectId, expected_sha256, reason, audit_trace_id, permission_envelope_id });
    return Object.freeze({ ...record, recorded: true, already_recorded: false, durable_quarantine: true });
  }

  function armCommittedObjectQuarantine({ tenant_id, object_id, expected_sha256, audit_trace_id, permission_envelope_id } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeObjectId = requiredString(object_id, "object_id");
    const existing = readRecord(tenantId, safeObjectId);
    if (existing) {
      assertQuarantineRecord(existing, { adapter_id: adapterId, tenant_id: tenantId, object_id: safeObjectId, expected_sha256 });
      if (existing.state === "quarantined") return Object.freeze({ ...existing, already_armed: true, durable_quarantine: true });
      return Object.freeze({ ...existing, armed: true, already_armed: true, durable_quarantine: true });
    }
    const record = writeRecord({ tenant_id: tenantId, object_id: safeObjectId, expected_sha256, reason: "DMS_UPLOAD_DENY_INTENT", audit_trace_id, permission_envelope_id, state: "armed" });
    return Object.freeze({ ...record, armed: true, already_armed: false, durable_quarantine: true });
  }

  function clearCommittedObjectQuarantine({ tenant_id, object_id, expected_sha256 } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeObjectId = requiredString(object_id, "object_id");
    const record = readRecord(tenantId, safeObjectId);
    if (!record) throw codedError("committed object deny intent is missing", "DMS_COMMITTED_QUARANTINE_CLEAR_UNCONFIRMED");
    assertQuarantineRecord(record, { adapter_id: adapterId, tenant_id: tenantId, object_id: safeObjectId, expected_sha256 });
    if (record.state !== "armed") throw codedError("committed object quarantine cannot be cleared", "DMS_COMMITTED_QUARANTINE_CLEAR_BLOCKED");
    const current = readObjectFromPaths(tenantId, safeObjectId, filesFor(resolvedRootPath, tenantId, safeObjectId));
    if (current.sha256 !== record.expected_sha256) throw codedError("committed object digest changed before deny clear", "DMS_COMMITTED_DELETE_CONDITION_FAILED");
    const recordPath = quarantinePath(resolvedQuarantineRootPath, tenantId, safeObjectId);
    assertSafePath(recordPath, "storage quarantine record");
    try {
      unlinkSync(recordPath);
      fsyncDirectory(resolvedQuarantineRootPath);
    } catch (error) {
      throw unavailable("storage quarantine record", error);
    }
    return Object.freeze({ cleared: true, record_ref: record.record_ref, durable_quarantine: false });
  }

  return Object.freeze({
    rootPath: objectRootRealpath,
    quarantineRootPath: quarantineRootRealpath,
    assertBound,
    assertSafePath,
    readRecord,
    validate,
    recordCommittedObjectQuarantine,
    armCommittedObjectQuarantine,
    clearCommittedObjectQuarantine,
    getCommittedObjectQuarantine: readRecord,
  });
}
