import { createHash, createPublicKey } from "node:crypto";
import { closeSync, constants, existsSync, fstatSync, lstatSync, openSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { types as utilTypes } from "node:util";

export const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const GIT_OBJECT_PATTERN = /^[0-9a-f]{40}$/u;
const AUTHORITY_VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,199}$/u;
const PILOT_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{2,79}$/u;
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
export const LAWOS_TENANT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
export const ENTRA_TENANT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const AUTHORITY_BINDING_FIELDS = Object.freeze([
  "pilot_id",
  "lawos_tenant_id",
  "entra_tenant_id",
  "source_sha",
  "source_tree",
  "version",
]);

export class ExternalReleaseTrustError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ExternalReleaseTrustError";
    this.code = code;
    this.details = details;
  }
}

export function fail(code, message, details = {}) {
  throw new ExternalReleaseTrustError(code, message, details);
}

export function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function hasExactKeys(value, keys) {
  return isRecord(value) && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
}

export function deepFreeze(value) {
  if (!isRecord(value) && !Array.isArray(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function assertValidationClock(now) {
  if (!Number.isFinite(now) || now < 0) fail("TRUST_VALIDATION_CLOCK_INVALID", "trust validation clock must be a finite non-negative epoch timestamp");
}

export function parseEd25519PublicSpki(value, code, message, details = {}) {
  const pem = Buffer.isBuffer(value) ? value.toString("utf8") : value;
  const match = typeof pem === "string"
    ? /^-----BEGIN PUBLIC KEY-----\r?\n([A-Za-z0-9+/\r\n]+={0,2})\r?\n-----END PUBLIC KEY-----\r?\n?$/u.exec(pem)
    : null;
  const encoded = match?.[1].replace(/\r?\n/gu, "") ?? "";
  if (!match || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/u.test(encoded)) fail(code, message, details);
  const inputDer = Buffer.from(encoded, "base64");
  if (inputDer.length === 0 || inputDer.toString("base64") !== encoded) fail(code, message, details);
  let publicKey;
  try {
    publicKey = createPublicKey({ key: inputDer, format: "der", type: "spki" });
  } catch (error) {
    fail(code, message, { ...details, error: error.message });
  }
  const canonicalDer = publicKey.export({ type: "spki", format: "der" });
  if (publicKey.asymmetricKeyType !== "ed25519" || !canonicalDer.equals(inputDer)) fail(code, message, details);
  return { publicKey, canonicalDer };
}

export function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function externalReleaseAuthorityBindingSha256(value) {
  if (!isRecord(value) || utilTypes.isProxy(value)) {
    fail("TRUST_AUTHORITY_BINDING_INVALID", "external-release authority binding must be a non-proxy object with exactly six own data fields");
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== AUTHORITY_BINDING_FIELDS.length
      || ownKeys.some((key) => typeof key !== "string" || !AUTHORITY_BINDING_FIELDS.includes(key))) {
    fail("TRUST_AUTHORITY_BINDING_INVALID", "external-release authority binding must contain exactly the six authority scope fields");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const scope = {};
  for (const field of AUTHORITY_BINDING_FIELDS) {
    const descriptor = descriptors[field];
    if (!descriptor
        || !descriptor.enumerable
        || !Object.prototype.hasOwnProperty.call(descriptor, "value")
        || typeof descriptor.value !== "string") {
      fail("TRUST_AUTHORITY_BINDING_INVALID", "external-release authority binding fields must be enumerable own string data properties", { field });
    }
    scope[field] = descriptor.value;
  }
  if (!PILOT_ID_PATTERN.test(scope.pilot_id)
      || !LAWOS_TENANT_ID_PATTERN.test(scope.lawos_tenant_id)
      || !ENTRA_TENANT_ID_PATTERN.test(scope.entra_tenant_id)
      || scope.lawos_tenant_id === scope.entra_tenant_id
      || !GIT_OBJECT_PATTERN.test(scope.source_sha)
      || !GIT_OBJECT_PATTERN.test(scope.source_tree)
      || !AUTHORITY_VERSION_PATTERN.test(scope.version)) {
    fail("TRUST_AUTHORITY_BINDING_INVALID", "external-release authority binding scope is invalid");
  }
  return sha256Hex(Buffer.from(JSON.stringify(scope), "utf8"));
}

export function resolveTrustedRoot(rootDir) {
  if (typeof rootDir !== "string" || !rootDir || rootDir.includes("\0")) {
    fail("TRUST_ROOT_INVALID", "trusted root must be a non-empty path");
  }
  const lexicalRoot = path.resolve(rootDir);
  if (!existsSync(lexicalRoot) || lstatSync(lexicalRoot).isSymbolicLink() || !statSync(lexicalRoot).isDirectory()) {
    fail("TRUST_ROOT_INVALID", "trusted root must already be a regular directory, not a symbolic link");
  }
  const realRoot = realpathSync(lexicalRoot);
  // Ancestor aliases such as macOS /var -> /private/var are normalized to the
  // canonical root. The declared root entry itself was lstat-checked above,
  // so a caller-supplied root symlink is still rejected before any I/O.
  return realRoot;
}

export function assertStrictUtcTimestamp(value, field = "timestamp") {
  const normalized = text(value);
  if (!UTC_PATTERN.test(normalized)) fail("TRUST_TIMESTAMP_INVALID", `${field} must be an RFC 3339 UTC timestamp`, { field, value });
  const parsed = Date.parse(normalized);
  if (!Number.isFinite(parsed)) fail("TRUST_TIMESTAMP_INVALID", `${field} is invalid`, { field, value });
  const expected = new Date(parsed).toISOString();
  const canonical = normalized.endsWith("Z") && !normalized.includes(".") ? expected.replace(".000Z", "Z") : expected;
  if (canonical !== normalized) fail("TRUST_TIMESTAMP_INVALID", `${field} contains an impossible or non-canonical UTC date`, { field, value });
  return value;
}

export function resolveTrustedFile(rootDir, candidate) {
  if (typeof rootDir !== "string" || !rootDir || typeof candidate !== "string" || !candidate || candidate.includes("\0")) {
    fail("TRUST_PATH_INVALID", "trusted file root and candidate must be non-empty paths");
  }
  const root = resolveTrustedRoot(rootDir);
  const target = path.resolve(root, candidate);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) fail("TRUST_PATH_ESCAPE", "trusted file path escapes the declared root", { candidate });
  let cursor = root;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) fail("TRUST_SYMLINK_FORBIDDEN", "trusted file paths may not traverse symlinks", { candidate });
  }
  if (!existsSync(target) || !statSync(target).isFile() || lstatSync(target).isSymbolicLink()) fail("TRUST_FILE_INVALID", "trusted file path must resolve to a regular non-symlink file", { candidate });
  const real = realpathSync(target);
  const realRoot = resolveTrustedRoot(root);
  const realRelative = path.relative(realRoot, real);
  if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) fail("TRUST_PATH_ESCAPE", "trusted file realpath escapes the declared root", { candidate });
  return real;
}

function sameFileSnapshot(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs
    && left.birthtimeNs === right.birthtimeNs;
}

function fileSnapshotIdentity(metadata, target) {
  return metadata.dev === 0n && metadata.ino === 0n ? `path:${target}` : `inode:${metadata.dev}:${metadata.ino}`;
}

export function readTrustedFileSnapshot(rootDir, candidate) {
  const root = resolveTrustedRoot(rootDir);
  const target = resolveTrustedFile(root, candidate);
  const noFollow = constants.O_NOFOLLOW ?? 0;
  let descriptor;
  try {
    descriptor = openSync(target, constants.O_RDONLY | noFollow);
    const before = fstatSync(descriptor, { bigint: true });
    if (!before.isFile()) fail("TRUST_FILE_INVALID", "trusted file descriptor must identify a regular file", { candidate });
    if (before.nlink !== 1n) fail("TRUST_HARDLINK_FORBIDDEN", "trusted files must have exactly one filesystem link", { candidate, link_count: Number(before.nlink) });
    const openedPath = lstatSync(target, { bigint: true });
    if (!openedPath.isFile() || openedPath.isSymbolicLink() || !sameFileSnapshot(before, openedPath)) fail("TRUST_FILE_CHANGED", "trusted file changed identity before its bytes were read", { candidate });
    const openedTarget = realpathSync(target);
    const openedRelative = path.relative(root, openedTarget);
    if (openedRelative.startsWith("..") || path.isAbsolute(openedRelative)) fail("TRUST_PATH_ESCAPE", "opened trusted file descriptor escapes the declared root", { candidate });
    if (!sameFileSnapshot(before, statSync(openedTarget, { bigint: true }))) fail("TRUST_FILE_CHANGED", "trusted file changed identity before its bytes were read", { candidate });
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    const closedPath = lstatSync(target, { bigint: true });
    const closedTarget = realpathSync(target);
    const closedRelative = path.relative(root, closedTarget);
    if (!closedPath.isFile()
        || closedPath.isSymbolicLink()
        || !sameFileSnapshot(before, after)
        || !sameFileSnapshot(after, closedPath)
        || after.size !== BigInt(bytes.length)
        || closedRelative.startsWith("..")
        || path.isAbsolute(closedRelative)
        || !sameFileSnapshot(after, statSync(closedTarget, { bigint: true }))) fail("TRUST_FILE_CHANGED", "trusted file changed identity or bytes while being read", { candidate });
    return Object.freeze({ target, identity: fileSnapshotIdentity(before, target), bytes });
  } catch (error) {
    if (error instanceof ExternalReleaseTrustError) throw error;
    fail("TRUST_FILE_INVALID", "trusted file could not be opened as a stable regular non-symlink snapshot", { candidate, error: error.message });
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

export function decodeDetachedSignature(bytes) {
  if (bytes.length === 64) return bytes;
  const value = bytes.toString("utf8").trim();
  if (/^[0-9a-f]{128}$/iu.test(value)) return Buffer.from(value, "hex");
  if (/^[A-Za-z0-9+/]+={0,2}$/u.test(value)) {
    const decoded = Buffer.from(value, "base64");
    if (decoded.length === 64) return decoded;
  }
  fail("TRUST_SIGNATURE_FORMAT", "detached signature must contain exactly 64 Ed25519 bytes");
}
