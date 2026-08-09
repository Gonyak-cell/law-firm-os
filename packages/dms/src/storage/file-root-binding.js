import {
  closeSync,
  constants,
  fsyncSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { acquireExclusiveFileLock, fsyncDirectory, releaseExclusiveFileLock } from "../../../persistence/src/durable-file.js";
import { sha256Hex } from "./storage-adapter.js";

const BINDING_SCHEMA = "law-firm-os.dms-quarantine-authority-binding.v1";
const OBJECT_BINDING_FILE = ".quarantine-authority-binding.json";
const AUTHORITY_BINDING_FILE = ".object-root-binding.json";

function codedError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function fingerprint(objectRootRealpath, quarantineRootRealpath) {
  return sha256Hex(Buffer.from(`${objectRootRealpath}\n${quarantineRootRealpath}`));
}

function expectedBinding(objectRootRealpath, quarantineRootRealpath) {
  return Object.freeze({
    schema_version: BINDING_SCHEMA,
    object_root_realpath: objectRootRealpath,
    quarantine_root_realpath: quarantineRootRealpath,
    binding_fingerprint: fingerprint(objectRootRealpath, quarantineRootRealpath),
  });
}

function readBinding(filePath, expected, label, { strictLstat, invalid, unavailable } = {}) {
  const stat = strictLstat(filePath, label);
  if (!stat) return null;
  if (stat.isSymbolicLink() || !stat.isFile()) throw invalid(`${label} is not a regular file`);
  let record;
  try {
    record = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) throw invalid(`${label} is invalid`);
    throw unavailable(label, error);
  }
  if (!record || record.schema_version !== BINDING_SCHEMA || typeof record.object_root_realpath !== "string" || typeof record.quarantine_root_realpath !== "string") {
    throw invalid(`${label} is invalid`);
  }
  if (record.object_root_realpath !== expected.object_root_realpath || record.quarantine_root_realpath !== expected.quarantine_root_realpath) {
    throw codedError(`${label} does not match the bound roots`, "DMS_QUARANTINE_AUTHORITY_BINDING_MISMATCH");
  }
  if (record.binding_fingerprint !== expected.binding_fingerprint) throw invalid(`${label} fingerprint is invalid`);
  return Object.freeze({ ...record });
}

function createBindingIfAbsent(filePath, expected, label, callbacks) {
  callbacks.assertNoSymlinkAncestors(filePath, label);
  const encoded = `${JSON.stringify(expected)}\n`;
  let fd = null;
  try {
    const noFollow = constants.O_NOFOLLOW ?? 0;
    fd = openSync(filePath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | noFollow, 0o600);
    writeFileSync(fd, encoded, "utf8");
    fsyncSync(fd);
    closeSync(fd);
    fd = null;
    fsyncDirectory(path.dirname(filePath));
    return expected;
  } catch (error) {
    if (fd !== null) {
      try { closeSync(fd); } catch { /* preserve the durable binding failure */ }
    }
    if (error?.code === "EEXIST") return readBinding(filePath, expected, label, callbacks) ?? callbacks.invalid(`${label} disappeared during initialization`);
    throw callbacks.unavailable(label, error);
  }
}

export function createFileRootBinding({ resolvedRootPath, resolvedQuarantineRootPath, objectRootRealpath, quarantineRootRealpath, strictLstat, assertNoSymlinkAncestors, invalid, unavailable } = {}) {
  const callbacks = { strictLstat, assertNoSymlinkAncestors, invalid, unavailable };
  const expected = expectedBinding(objectRootRealpath, quarantineRootRealpath);
  const objectBindingPath = path.join(resolvedRootPath, OBJECT_BINDING_FILE);
  const authorityBindingPath = path.join(resolvedQuarantineRootPath, AUTHORITY_BINDING_FILE);
  const lock = acquireExclusiveFileLock({
    resourcePath: objectBindingPath,
    lockPath: `${objectBindingPath}.lock`,
    waitTimeoutMs: 10_000,
  });
  try {
    const objectBinding = readBinding(objectBindingPath, expected, "storage root binding", callbacks);
    const authorityBinding = readBinding(authorityBindingPath, expected, "quarantine authority binding", callbacks);
    if (objectBinding === null && authorityBinding === null) {
      createBindingIfAbsent(objectBindingPath, expected, "storage root binding", callbacks);
      createBindingIfAbsent(authorityBindingPath, expected, "quarantine authority binding", callbacks);
    } else if (objectBinding === null || authorityBinding === null) {
      throw codedError("storage root and quarantine authority binding are incomplete", "DMS_QUARANTINE_AUTHORITY_BINDING_MISMATCH");
    }
  } finally {
    releaseExclusiveFileLock(lock);
  }

  function assertBound() {
    const current = expectedBinding(objectRootRealpath, quarantineRootRealpath);
    if (!readBinding(objectBindingPath, current, "storage root binding", callbacks)
      || !readBinding(authorityBindingPath, current, "quarantine authority binding", callbacks)) {
      throw codedError("storage root and quarantine authority binding are incomplete", "DMS_QUARANTINE_AUTHORITY_BINDING_MISMATCH");
    }
  }

  return Object.freeze({ assertBound, objectBindingPath, authorityBindingPath });
}
