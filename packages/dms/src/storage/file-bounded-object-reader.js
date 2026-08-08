import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import {
  readStorageBodyBounded,
  storageObjectTooLargeError,
  storageReadLimit,
} from "./bounded-storage-read.js";

function codedError(message, code) {
  return Object.assign(new Error(message), { code });
}

export async function readFileCommittedObjectBounded({
  adapter_id,
  tenant_id,
  object_id,
  max_bytes,
  paths,
  assert_safe_paths,
} = {}) {
  assert_safe_paths(paths);
  if (!existsSync(paths.bytesPath)) throw new Error(`object not found: ${object_id}`);
  const limit = storageReadLimit(max_bytes);
  const declaredSize = statSync(paths.bytesPath).size;
  if (declaredSize > limit) {
    throw storageObjectTooLargeError({ max_bytes: limit, observed_byte_size: declaredSize });
  }
  const observed = await readStorageBodyBounded(createReadStream(paths.bytesPath), { max_bytes: limit });
  const metadata = existsSync(paths.metadataPath)
    ? JSON.parse(readFileSync(paths.metadataPath, "utf8"))
    : {};
  const declaredSha = metadata.receipt?.sha256 ?? observed.sha256;
  if (observed.byte_size !== declaredSize || observed.sha256 !== declaredSha) {
    throw codedError(`object hash mismatch: ${object_id}`, "DMS_COMMITTED_DIGEST_MISMATCH");
  }
  return Object.freeze({
    adapter_id,
    tenant_id,
    object_id,
    ...observed,
    declared_sha256: declaredSha,
    mime_type: metadata.receipt?.mime_type ?? "application/octet-stream",
  });
}
