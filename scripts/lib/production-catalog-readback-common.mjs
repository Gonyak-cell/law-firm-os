import { createHash } from "node:crypto";

export const PRODUCTION_CATALOG_READBACK_OPERATOR_SCHEMA_VERSION =
  "law-firm-os.production-migration-catalog-readback-operator.v1";

export const TASK3_SHA1 = /^[a-f0-9]{40}$/u;
export const TASK3_SHA256 = /^[a-f0-9]{64}$/u;

export function task3Fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

export function task3ExactKeys(value, keys, code, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort())
      !== JSON.stringify([...keys].sort())) {
    task3Fail(code, `${label} fields are invalid`);
  }
}

export function task3Sha256(value) {
  return createHash("sha256")
    .update(Buffer.isBuffer(value) ? value : Buffer.from(String(value)))
    .digest("hex");
}

export function task3RequiredBuffer(value, label) {
  if (!Buffer.isBuffer(value)) {
    task3Fail("TASK3_ARTIFACT_BYTES_INVALID", `${label} must be bytes`);
  }
  return value;
}

export function task3ValidateBoundBytes(bytes, expected, label) {
  task3RequiredBuffer(bytes, label);
  if (!Number.isSafeInteger(expected?.bytes)
    || expected.bytes < 1
    || bytes.byteLength !== expected.bytes
    || !TASK3_SHA256.test(expected.sha256 ?? "")
    || task3Sha256(bytes) !== expected.sha256) {
    task3Fail("TASK3_ARTIFACT_BINDING_DRIFT", `${label} binding drifted`);
  }
  return bytes;
}

export function task3ValidCodeSha256(value) {
  if (value === null) return true;
  const bytes = Buffer.from(value ?? "", "base64");
  return typeof value === "string" && bytes.byteLength === 32
    && bytes.toString("base64") === value;
}
