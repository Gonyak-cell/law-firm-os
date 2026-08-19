import { randomBytes } from "node:crypto";
import { open, lstat, mkdir, unlink } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { spawnSync as defaultSpawnSync } from "node:child_process";
import path from "node:path";
import {
  ROLLBACK_ZIP_VERIFY_TIMEOUT_MS,
  isSha256Hex,
  sha256,
} from "./outlook-production-aws-inventory-contract.mjs";

const CURRENT_UID = typeof process.getuid === "function" ? process.getuid() : null;
const PRIVATE_MODE = 0o700;
const FILE_MODE = 0o600;

function requiredFlags({ directory = false } = {}) {
  if (typeof fsConstants.O_NOFOLLOW !== "number" || (directory && typeof fsConstants.O_DIRECTORY !== "number")) throw new Error("ROLLBACK_UNSUPPORTED_PLATFORM");
  return fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | (directory ? fsConstants.O_DIRECTORY : 0);
}

export function isInside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function canonicalKnownAlias(value) {
  const resolved = path.resolve(value);
  if (process.platform === "darwin" && (resolved === "/tmp" || resolved.startsWith("/tmp/"))) return resolved.replace(/^\/tmp/u, "/private/tmp");
  if (process.platform === "darwin" && (resolved === "/var" || resolved.startsWith("/var/"))) return resolved.replace(/^\/var/u, "/private/var");
  return resolved;
}

export async function inspectPath(target, { allowMissing = false } = {}) {
  try {
    const info = await lstat(target);
    if (info.isSymbolicLink()) throw new Error("SYMLINK_PATH_REJECTED");
    return info;
  } catch (error) {
    if (allowMissing && error?.code === "ENOENT") return null;
    throw error;
  }
}

export async function checkAncestors(target) {
  const absolute = canonicalKnownAlias(target);
  const parsed = path.parse(absolute);
  const segments = absolute.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let current = parsed.root;
  for (const segment of segments) {
    current = path.join(current, segment);
    const info = await inspectPath(current);
    if (!info.isDirectory() || (CURRENT_UID !== null && info.uid !== CURRENT_UID && info.uid !== 0) || (info.mode & 0o022) !== 0) throw new Error("ROLLBACK_ANCESTOR_NOT_PRIVATE");
  }
}

export async function openPrivateDirectory(directory) {
  const handle = await open(directory, requiredFlags({ directory: true }));
  try {
    const info = await handle.stat();
    if (!info.isDirectory() || (CURRENT_UID !== null && info.uid !== CURRENT_UID) || (info.mode & 0o777) !== PRIVATE_MODE) throw new Error("ROLLBACK_DIRECTORY_NOT_PRIVATE");
    return { handle, info };
  } catch (error) {
    await handle.close().catch(() => {});
    throw error;
  }
}

export async function syncDirectoryHandle(handle) {
  await handle.sync();
}

export async function syncDirectory(directory) {
  const { handle } = await openPrivateDirectory(directory);
  try { await syncDirectoryHandle(handle); } finally { await handle.close(); }
}

export async function ensurePrivateRollbackDirectory(rollbackDir, repoRoot) {
  if (!path.isAbsolute(rollbackDir)) throw new Error("ROLLBACK_PATH_MUST_BE_ABSOLUTE");
  if (typeof repoRoot !== "string" || !path.isAbsolute(repoRoot)) throw new Error("ROLLBACK_REPO_ROOT_MUST_BE_ABSOLUTE");
  const resolved = path.resolve(rollbackDir);
  const root = path.resolve(repoRoot);
  if (isInside(canonicalKnownAlias(root), canonicalKnownAlias(resolved))) throw new Error("ROLLBACK_PATH_IN_REPOSITORY");
  const parent = path.dirname(resolved);
  await checkAncestors(parent);
  const existing = await inspectPath(resolved, { allowMissing: true });
  if (existing && (!existing.isDirectory() || (CURRENT_UID !== null && existing.uid !== CURRENT_UID) || (existing.mode & 0o777) !== PRIVATE_MODE)) throw new Error("ROLLBACK_DIRECTORY_NOT_PRIVATE");
  if (!existing) {
    await mkdir(resolved, { mode: PRIVATE_MODE });
    await syncDirectory(parent);
  }
  const opened = await openPrivateDirectory(resolved);
  await opened.handle.close();
  return resolved;
}

export function assertPrivateFileInfo(info, expectedBytes) {
  if (!info.isFile() || info.nlink !== 1 || (CURRENT_UID !== null && info.uid !== CURRENT_UID) || (info.mode & 0o777) !== FILE_MODE || info.size !== expectedBytes) throw new Error("ROLLBACK_FILE_METADATA_MISMATCH");
}

export async function readHeldFile(handle, expectedBytes, expectedDigest) {
  const before = await handle.stat();
  assertPrivateFileInfo(before, expectedBytes);
  const bytes = Buffer.alloc(before.size);
  let offset = 0;
  while (offset < bytes.length) {
    const result = await handle.read(bytes, offset, bytes.length - offset, offset);
    if (!result.bytesRead) throw new Error("ROLLBACK_FILE_DIGEST_MISMATCH");
    offset += result.bytesRead;
  }
  const after = await handle.stat();
  if (before.dev !== after.dev || before.ino !== after.ino || before.nlink !== after.nlink || before.size !== after.size || sha256(bytes) !== expectedDigest) throw new Error("ROLLBACK_FILE_DIGEST_MISMATCH");
  return { bytes, info: after };
}

async function readNamedPrivateFile(target, expectedBytes, expectedDigest) {
  await checkAncestors(path.dirname(target));
  const handle = await open(target, requiredFlags());
  try {
    const result = await readHeldFile(handle, expectedBytes, expectedDigest);
    const named = await inspectPath(target);
    if (named.dev !== result.info.dev || named.ino !== result.info.ino || named.nlink !== 1) throw new Error("ROLLBACK_FILE_REPLACED");
    return result;
  } finally {
    await handle.close();
  }
}

export async function readVerifiedPrivateFile(target, expectations, positionalDigest) {
  const { expectedBytes, expectedDigest } = typeof expectations === "object" && expectations !== null ? expectations : { expectedBytes: expectations, expectedDigest: positionalDigest };
  if (!path.isAbsolute(target) || !Number.isInteger(expectedBytes) || expectedBytes < 0 || !isSha256Hex(expectedDigest)) throw new Error("ROLLBACK_FILE_EXPECTATIONS_INVALID");
  return (await readNamedPrivateFile(target, expectedBytes, expectedDigest)).bytes;
}

export function verifyHeldZip(handle, { spawnSyncImpl = defaultSpawnSync } = {}) {
  if (process.platform === "win32" || typeof handle?.fd !== "number") throw new Error("ROLLBACK_UNSUPPORTED_PLATFORM");
  try {
    const result = spawnSyncImpl("/usr/bin/unzip", ["-tq", "/dev/fd/3"], { encoding: "utf8", maxBuffer: 2 * 1024 * 1024, timeout: ROLLBACK_ZIP_VERIFY_TIMEOUT_MS, killSignal: "SIGKILL", stdio: ["ignore", "pipe", "pipe", handle.fd] });
    if (result?.error?.code === "ETIMEDOUT" || result?.signal === "SIGKILL") throw new Error("ROLLBACK_ZIP_VERIFY_TIMEOUT");
    return result?.status === 0;
  } catch (error) {
    if (error?.message === "ROLLBACK_ZIP_VERIFY_TIMEOUT") throw error;
    return false;
  }
}

export async function readVerifiedPrivateZip(target, expectations) {
  const { expectedBytes, expectedDigest } = expectations ?? {};
  if (!path.isAbsolute(target) || !Number.isInteger(expectedBytes) || expectedBytes < 0 || !isSha256Hex(expectedDigest)) throw new Error("ROLLBACK_FILE_EXPECTATIONS_INVALID");
  await checkAncestors(path.dirname(target));
  const handle = await open(target, requiredFlags());
  try {
    const before = await handle.stat();
    assertPrivateFileInfo(before, expectedBytes);
    if (!verifyHeldZip(handle)) throw new Error("ROLLBACK_ZIP_INTEGRITY_FAILED");
    const { bytes, info } = await readHeldFile(handle, expectedBytes, expectedDigest);
    if (before.dev !== info.dev || before.ino !== info.ino) throw new Error("ROLLBACK_FILE_REPLACED");
    const named = await inspectPath(target);
    if (named.dev !== info.dev || named.ino !== info.ino || named.nlink !== 1) throw new Error("ROLLBACK_FILE_REPLACED");
    return bytes;
  } finally {
    await handle.close();
  }
}

export async function writeExclusivePrivateFile(target, bytes, { archive = false } = {}) {
  if (typeof fsConstants.O_NOFOLLOW !== "number") throw new Error("ROLLBACK_UNSUPPORTED_PLATFORM");
  const handle = await open(target, fsConstants.O_RDWR | fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_NOFOLLOW, FILE_MODE);
  let openedInfo = null;
  try {
    openedInfo = await handle.stat();
    assertPrivateFileInfo(openedInfo, 0);
    await handle.writeFile(bytes);
    await handle.sync();
    const info = await handle.stat();
    assertPrivateFileInfo(info, bytes.byteLength);
    if (archive && !verifyHeldZip(handle)) throw new Error("ROLLBACK_ZIP_INTEGRITY_FAILED");
    const checked = await readHeldFile(handle, bytes.byteLength, sha256(bytes));
    return { info: checked.info, bytes: checked.bytes };
  } catch (error) {
    await handle.close().catch(() => {});
    await unlinkIfIdentity(target, openedInfo);
    throw error;
  } finally {
    await handle.close().catch(() => {});
  }
}

export async function unlinkIfIdentity(target, identity) {
  if (!identity) return;
  const current = await lstat(target).catch(() => null);
  if (current && !current.isSymbolicLink() && current.dev === identity.dev && current.ino === identity.ino && current.nlink === 1) await unlink(target).catch(() => {});
}

export function withTimeout(promise, milliseconds, code, onTimeout) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => { onTimeout?.(); reject(new Error(code)); }, milliseconds);
    timer.unref?.();
  });
  return Promise.race([Promise.resolve(promise).finally(() => clearTimeout(timer)), timeout]);
}

export function rollbackFailureCode(error) {
  const message = typeof error?.message === "string" ? error.message : "";
  if (/^ROLLBACK_[A-Z0-9_]+$/u.test(message)) return message;
  const code = typeof error?.code === "string" ? error.code : "";
  return /^[A-Z][A-Z0-9_]+$/u.test(code) ? `ROLLBACK_${code}` : "ROLLBACK_CAPTURE_FAILED";
}

export async function verifyPrivateCopy(directory, bytes) {
  const verifier = path.join(directory, `.${process.pid}-${randomBytes(8).toString("hex")}.zip.verify`);
  let identity = null;
  try {
    const created = await writeExclusivePrivateFile(verifier, bytes, { archive: true });
    identity = created.info;
  } finally {
    await unlinkIfIdentity(verifier, identity);
    await syncDirectory(directory);
  }
}

export async function captureExistingOrNewFile(target, bytes, digest, { zip = false } = {}) {
  const existing = await inspectPath(target, { allowMissing: true });
  if (existing) {
    const stored = zip ? await readVerifiedPrivateZip(target, { expectedBytes: bytes.byteLength, expectedDigest: digest }) : await readVerifiedPrivateFile(target, bytes.byteLength, digest);
    if (!stored.equals(bytes)) throw new Error("ROLLBACK_FILE_DIGEST_MISMATCH");
    return { storage: "EXISTING_VALIDATED", created: false, info: existing };
  }
  let createdInfo = null;
  try {
    const created = await writeExclusivePrivateFile(target, bytes, { archive: zip });
    createdInfo = created.info;
    const named = await inspectPath(target);
    if (named.dev !== created.info.dev || named.ino !== created.info.ino || named.nlink !== 1) throw new Error("ROLLBACK_FILE_REPLACED");
    return { storage: "CREATED", created: true, info: created.info };
  } catch (error) {
    await unlinkIfIdentity(target, createdInfo);
    if (error?.code === "EEXIST") {
      const stored = zip ? await readVerifiedPrivateZip(target, { expectedBytes: bytes.byteLength, expectedDigest: digest }) : await readVerifiedPrivateFile(target, bytes.byteLength, digest);
      if (!stored.equals(bytes)) throw new Error("ROLLBACK_FILE_DIGEST_MISMATCH");
      return { storage: "EXISTING_VALIDATED", created: false, info: await inspectPath(target) };
    }
    throw error;
  }
}

export { PRIVATE_MODE, FILE_MODE };
