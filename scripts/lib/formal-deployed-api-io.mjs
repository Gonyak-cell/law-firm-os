import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";

const SHA256 = /^[0-9a-f]{64}$/u;
const SAFE_SIDECAR_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,191}$/u;

export class FormalDeployedApiQaError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "FormalDeployedApiQaError";
    this.code = code;
  }
}

export function fail(code, message) {
  throw new FormalDeployedApiQaError(code, message);
}

export function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalReceiptBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

export function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("FORMAL_DEPLOYED_API_QA_SHAPE", `${label} must be an object`);
  }
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    fail("FORMAL_DEPLOYED_API_QA_SHAPE", `${label} fields drifted`);
  }
}

function assertOutsideRoot(path, rootDir, label) {
  const root = realpathSync(resolve(rootDir));
  const rel = relative(root, path);
  if (!(rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))) {
    fail("FORMAL_DEPLOYED_API_QA_PRIVATE_PATH", `${label} must remain outside the worktree`);
  }
}

export function privateRegularFile(candidate, rootDir, label, { outsideRoot = true } = {}) {
  const input = resolve(candidate ?? "");
  if (!existsSync(input) || lstatSync(input).isSymbolicLink()) {
    fail("FORMAL_DEPLOYED_API_QA_PRIVATE_PATH", `${label} must be an existing non-symlink file`);
  }
  const path = realpathSync(input);
  const stats = statSync(path);
  if (!stats.isFile() || (stats.mode & 0o777) !== 0o600) {
    fail("FORMAL_DEPLOYED_API_QA_PRIVATE_PATH", `${label} must be an exact 0600 regular file`);
  }
  if (outsideRoot) assertOutsideRoot(path, rootDir, label);
  return path;
}

export function privateReceiptTarget(candidate, rootDir) {
  const target = resolve(candidate ?? "");
  if (existsSync(target)) fail("FORMAL_DEPLOYED_API_QA_RECEIPT_EXISTS", "receipt target already exists");
  const parentInput = dirname(target);
  if (!existsSync(parentInput) || lstatSync(parentInput).isSymbolicLink()) {
    fail("FORMAL_DEPLOYED_API_QA_PRIVATE_PATH", "receipt parent must be an existing non-symlink directory");
  }
  const parent = realpathSync(parentInput);
  if (!statSync(parent).isDirectory() || (statSync(parent).mode & 0o077) !== 0) {
    fail("FORMAL_DEPLOYED_API_QA_PRIVATE_PATH", "receipt parent must be a private directory");
  }
  const resolved = resolve(parent, relative(parentInput, target));
  assertOutsideRoot(resolved, rootDir, "receipt");
  return resolved;
}

export function validateSidecarRef(ref, label) {
  exactKeys(ref, ["bytes", "name", "sha256"], `${label} reference`);
  if (typeof ref.name !== "string"
    || !SAFE_SIDECAR_NAME.test(ref.name)
    || basename(ref.name) !== ref.name
    || ref.name === "."
    || ref.name === "..") {
    fail("FORMAL_DEPLOYED_API_QA_REFERENCE", `${label} reference name is invalid`);
  }
  if (!SHA256.test(ref.sha256 ?? "") || !Number.isSafeInteger(ref.bytes) || ref.bytes < 1) {
    fail("FORMAL_DEPLOYED_API_QA_REFERENCE", `${label} reference binding is invalid`);
  }
  return ref;
}

export function sidecarRef(name, bytes) {
  const raw = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return Object.freeze({ name, sha256: sha256Bytes(raw), bytes: raw.byteLength });
}

export function readSidecar(bundleDir, ref, rootDir, label, { json = false } = {}) {
  validateSidecarRef(ref, label);
  const parent = realpathSync(resolve(bundleDir));
  const path = privateRegularFile(resolve(parent, ref.name), rootDir, label);
  if (dirname(path) !== parent) fail("FORMAL_DEPLOYED_API_QA_REFERENCE", `${label} escaped the receipt bundle`);
  const bytes = readFileSync(path);
  if (bytes.byteLength !== ref.bytes || sha256Bytes(bytes) !== ref.sha256) {
    fail("FORMAL_DEPLOYED_API_QA_REFERENCE", `${label} raw bytes do not match their binding`);
  }
  if (!json) return Object.freeze({ path, bytes });
  try {
    return Object.freeze({ path, bytes, value: JSON.parse(bytes.toString("utf8")) });
  } catch {
    fail("FORMAL_DEPLOYED_API_QA_REFERENCE", `${label} is not valid JSON`);
  }
}

export function writePrivateFile(path, bytes, rootDir) {
  const target = privateReceiptTarget(path, rootDir);
  try {
    writeFileSync(target, bytes, { flag: "wx", mode: 0o600 });
    chmodSync(target, 0o600);
  } catch {
    fail("FORMAL_DEPLOYED_API_QA_RECEIPT_WRITE", "private evidence could not be created atomically");
  }
  return Object.freeze({ path: target, sha256: sha256Bytes(bytes), bytes: bytes.byteLength });
}
