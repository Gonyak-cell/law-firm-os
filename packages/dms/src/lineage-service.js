import { sha256Hex } from "./storage/storage-adapter.js";

export function verifyHashLineage({ bytes, expected_sha256, version } = {}) {
  const actual = sha256Hex(Buffer.isBuffer(bytes) ? bytes : Buffer.from(String(bytes ?? "")));
  if (expected_sha256 && actual !== expected_sha256) {
    return Object.freeze({ outcome: "blocked", safe_error_code: "DMS_HASH_MISMATCH", actual_sha256: actual });
  }
  if (version?.sha256 && actual !== version.sha256) {
    return Object.freeze({ outcome: "blocked", safe_error_code: "DMS_VERSION_HASH_MISMATCH", actual_sha256: actual });
  }
  return Object.freeze({ outcome: "passed", sha256: actual, lineage_verified: true });
}
