import { existsSync, lstatSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fsyncDirectory } from "../../../persistence/src/durable-file.js";
import { createOpaqueStorageKey } from "./storage-adapter.js";

function codedError(message, code) {
  return Object.assign(new Error(message), { code });
}

export function filesFor(rootPath, tenant_id, object_id) {
  const key = createOpaqueStorageKey({ tenant_id, object_id });
  return Object.freeze({
    bytesPath: path.join(rootPath, `${key}.bin`),
    metadataPath: path.join(rootPath, `${key}.json`),
  });
}

export function stagedFilesFor(rootPath, tenant_id, session_id, object_id) {
  const key = createOpaqueStorageKey({ tenant_id, session_id, object_id });
  const stagingRoot = path.join(rootPath, ".staging");
  return Object.freeze({
    bytesPath: path.join(stagingRoot, `${key}.bin`),
    metadataPath: path.join(stagingRoot, `${key}.json`),
  });
}

export function removeFiles(paths) {
  let deleted = false;
  for (const filePath of [paths.bytesPath, paths.metadataPath]) {
    if (!existsSync(filePath)) continue;
    unlinkSync(filePath);
    fsyncDirectory(path.dirname(filePath));
    deleted = true;
  }
  return deleted;
}

export function assertNotSymlink(filePath, label) {
  if (existsSync(filePath) && lstatSync(filePath).isSymbolicLink()) {
    throw codedError(`${label} must not be a symlink`, "DMS_STORAGE_SYMLINK_REJECTED");
  }
}

export function assertSafePaths(paths) {
  assertNotSymlink(paths.bytesPath, "storage bytes path");
  assertNotSymlink(paths.metadataPath, "storage metadata path");
}
