import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu;
const RAW_EMPLOYEE_ID = /\b(?:emp|employee)[_-][a-z0-9_-]+\b/iu;
const PHOTO_BYTES = /data:image\/|base64,/iu;
const SECRET = /(?:ghp_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{16,}|AKIA[A-Z0-9]{16}|-----BEGIN [A-Z ]+PRIVATE KEY-----)/u;
const PRIVATE_KEY = /^(?:name|display_name|legal_name|email|work_email|employee_id|employee_ids|raw_employee_id|photo_bytes|photo_base64|photo_hash|private_photo_hash|content_sha256)$/iu;
const SECRET_KEY = /(?:^|_)(?:secret|token|password|credential|api_key|private_key)(?:$|_)/iu;
const SHA256 = /^[a-f0-9]{64}$/u;

export class ProfileMediaEvidenceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProfileMediaEvidenceError";
    this.code = code;
  }
}

export function evidenceFail(code, message) {
  throw new ProfileMediaEvidenceError(code, message);
}

export function exactObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) evidenceFail("FIELD_INVALID", `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) evidenceFail("FIELD_SET_INVALID", `${label} fields are invalid`);
  return value;
}

export function timestampMillis(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) {
    evidenceFail("TIMESTAMP_INVALID", `${label} must be an RFC 3339 UTC timestamp`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) evidenceFail("TIMESTAMP_INVALID", `${label} is invalid`);
  return parsed;
}

export function assertNoPrivateMaterial(value, key = "") {
  if (Array.isArray(value)) {
    for (const child of value) assertNoPrivateMaterial(child, key);
    return;
  }
  if (value && typeof value === "object") {
    for (const [childKey, child] of Object.entries(value)) {
      if (SECRET_KEY.test(childKey)) evidenceFail("SECRET_FIELD", "evidence contains a secret-bearing field");
      if (PRIVATE_KEY.test(childKey)) evidenceFail("PRIVATE_FIELD", "evidence contains a private profile field");
      assertNoPrivateMaterial(child, childKey);
    }
    return;
  }
  if (typeof value !== "string") return;
  if (SECRET.test(value)) evidenceFail("SECRET_MATERIAL", "evidence contains secret-like material");
  if (EMAIL.test(value) || RAW_EMPLOYEE_ID.test(value) || PHOTO_BYTES.test(value) || (SHA256.test(value) && key !== "sha256")) {
    evidenceFail("PRIVATE_MATERIAL", "evidence contains a private profile value");
  }
}

export function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function canonicalRepoFile(repoRoot, relativePath, label) {
  const root = realpathSync(resolve(repoRoot));
  if (typeof relativePath !== "string" || isAbsolute(relativePath) || relativePath.includes("\0")) {
    evidenceFail("ARTIFACT_PATH_INVALID", `${label} path must be repository-relative`);
  }
  const absolute = resolve(root, relativePath);
  const rel = relative(root, absolute);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) evidenceFail("ARTIFACT_PATH_ESCAPE", `${label} escaped repository root`);
  try {
    if (lstatSync(absolute).isSymbolicLink() || !statSync(absolute).isFile() || realpathSync(absolute) !== absolute) throw new Error();
  } catch {
    evidenceFail("ARTIFACT_FILE_INVALID", `${label} must be an existing canonical non-symlink file`);
  }
  return absolute;
}

export function describeRepoFile(repoRoot, relativePath, label = "artifact") {
  const absolute = canonicalRepoFile(repoRoot, relativePath, label);
  const bytes = readFileSync(absolute);
  if (bytes.length === 0) evidenceFail("ARTIFACT_FILE_EMPTY", `${label} must not be empty`);
  return Object.freeze({ path: relativePath, sha256: sha256Bytes(bytes), bytes: bytes.length });
}

export function validateRepoFileDescriptor(repoRoot, descriptor, expectedPath, label) {
  exactObject(descriptor, ["path", "sha256", "bytes"], label);
  if (descriptor.path !== expectedPath || !SHA256.test(descriptor.sha256) || !Number.isInteger(descriptor.bytes) || descriptor.bytes <= 0) {
    evidenceFail("ARTIFACT_DESCRIPTOR_INVALID", `${label} descriptor is invalid`);
  }
  const observed = describeRepoFile(repoRoot, expectedPath, label);
  if (observed.sha256 !== descriptor.sha256 || observed.bytes !== descriptor.bytes) {
    evidenceFail("ARTIFACT_BINDING_MISMATCH", `${label} bytes or SHA-256 changed`);
  }
  return observed;
}
