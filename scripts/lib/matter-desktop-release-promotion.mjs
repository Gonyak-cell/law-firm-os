import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readSync,
  readdirSync,
  renameSync,
} from "node:fs";
import { lstat, open, readdir, rm } from "node:fs/promises";
import path from "node:path";

export class DesktopReleasePromotionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "DesktopReleasePromotionError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new DesktopReleasePromotionError(code, message);
}

function compareCodePoint(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function identity(metadata) {
  return Object.freeze({
    dev: String(metadata.dev),
    ino: String(metadata.ino),
    nlink: String(metadata.nlink),
    size: String(metadata.size),
    mtime_ns: String(metadata.mtimeNs),
    ctime_ns: String(metadata.ctimeNs),
  });
}

function sameIdentity(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameNode(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function stableLstatSync(memberPath, code = "RELEASE_MEMBER_UNREADABLE") {
  try {
    return lstatSync(memberPath, { bigint: true });
  } catch {
    fail(code, "release tree member could not be inspected");
  }
}

function readDirectorySync(directoryPath) {
  try {
    return readdirSync(directoryPath).sort(compareCodePoint);
  } catch {
    fail("RELEASE_MEMBER_UNREADABLE", "release tree directory could not be read");
  }
}

function sha256FileSync(filePath, fileStat) {
  let descriptor;
  try {
    descriptor = openSync(filePath, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  } catch {
    fail("RELEASE_MEMBER_UNREADABLE", "release tree file could not be opened safely");
  }

  const expectedIdentity = identity(fileStat);
  const hash = createHash("sha256");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  let bytes = 0;
  try {
    const openedBefore = identity(fstatSync(descriptor, { bigint: true }));
    if (!sameIdentity(expectedIdentity, openedBefore)) {
      fail("RELEASE_TREE_CHANGED", "release tree file changed before it was read");
    }
    for (;;) {
      const count = readSync(descriptor, buffer, 0, buffer.length, null);
      if (count === 0) break;
      hash.update(buffer.subarray(0, count));
      bytes += count;
    }
    const openedAfter = identity(fstatSync(descriptor, { bigint: true }));
    const pathAfter = identity(stableLstatSync(filePath));
    if (!sameIdentity(expectedIdentity, openedAfter)
      || !sameIdentity(expectedIdentity, pathAfter)
      || bytes !== Number(fileStat.size)) {
      fail("RELEASE_TREE_CHANGED", "release tree file changed while it was read");
    }
  } finally {
    closeSync(descriptor);
  }
  return Object.freeze({ sha256: hash.digest("hex"), bytes });
}

function desktopReleaseTreeSnapshotSync(rootPath) {
  if (!path.isAbsolute(rootPath ?? "")) {
    fail("RELEASE_ROOT_INVALID", "release tree root must be absolute");
  }
  const rootStat = stableLstatSync(rootPath, "RELEASE_ROOT_INVALID");
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    fail("RELEASE_ROOT_INVALID", "release tree root must be a regular directory");
  }

  const rows = [];
  function visit(directoryPath) {
    const directoryBefore = stableLstatSync(directoryPath);
    if (!directoryBefore.isDirectory() || directoryBefore.isSymbolicLink()) {
      fail("RELEASE_MEMBER_UNSAFE", "release tree contains an unsafe directory");
    }
    const names = readDirectorySync(directoryPath);
    for (const name of names) {
      const entryPath = path.join(directoryPath, name);
      const relativePath = path.relative(rootPath, entryPath).split(path.sep).join("/");
      const entryStat = stableLstatSync(entryPath);
      const entryBefore = identity(entryStat);
      if (entryStat.isSymbolicLink()) {
        fail("RELEASE_MEMBER_UNSAFE", "release tree cannot contain symbolic links");
      }
      if (entryStat.isDirectory()) {
        visit(entryPath);
        if (!sameIdentity(entryBefore, identity(stableLstatSync(entryPath)))) {
          fail("RELEASE_TREE_CHANGED", "release tree directory changed during inspection");
        }
      } else if (entryStat.isFile()) {
        if (entryStat.nlink !== 1n) {
          fail("RELEASE_MEMBER_UNSAFE", "release tree cannot contain hard-linked files");
        }
        rows.push(Object.freeze({
          path: relativePath,
          ...sha256FileSync(entryPath, entryStat),
        }));
      } else {
        fail("RELEASE_MEMBER_UNSAFE", "release tree contains an unsupported filesystem member");
      }
    }
    const namesAfter = readDirectorySync(directoryPath);
    const directoryAfter = identity(stableLstatSync(directoryPath));
    if (JSON.stringify(namesAfter) !== JSON.stringify(names)
      || !sameIdentity(identity(directoryBefore), directoryAfter)) {
      fail("RELEASE_TREE_CHANGED", "release tree directory membership changed during inspection");
    }
  }

  visit(rootPath);
  if (rows.length === 0) fail("RELEASE_ROOT_EMPTY", "release tree must contain files");
  rows.sort((left, right) => compareCodePoint(left.path, right.path));
  return Object.freeze({
    manifest: Object.freeze(rows),
    root_node: Object.freeze({ dev: String(rootStat.dev), ino: String(rootStat.ino) }),
  });
}

export async function desktopReleaseTreeManifest(rootPath) {
  return desktopReleaseTreeSnapshotSync(rootPath).manifest;
}

async function syncHandle(filePath) {
  const handle = await open(filePath, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function syncDirectorySync(directoryPath) {
  if (process.platform === "win32") return;
  let descriptor;
  try {
    descriptor = openSync(directoryPath, fsConstants.O_RDONLY);
    fsyncSync(descriptor);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

export async function syncDesktopReleaseTree(rootPath) {
  const directories = [];
  async function visit(directoryPath) {
    directories.push(directoryPath);
    const names = await readdir(directoryPath);
    names.sort(compareCodePoint);
    for (const name of names) {
      const entryPath = path.join(directoryPath, name);
      const metadata = await lstat(entryPath);
      if (metadata.isDirectory() && !metadata.isSymbolicLink()) await visit(entryPath);
      else if (metadata.isFile() && !metadata.isSymbolicLink()) await syncHandle(entryPath);
      else fail("RELEASE_MEMBER_UNSAFE", "release tree contains an unsupported filesystem member");
    }
  }
  await visit(rootPath);
  if (process.platform !== "win32") {
    for (const directoryPath of directories.reverse()) await syncHandle(directoryPath);
  }
}

function sameManifest(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function quarantineOwnedReleaseSync({ candidateRoot, releaseRoot, expectedRootNode }) {
  const releaseStat = stableLstatSync(releaseRoot, "RELEASE_PROMOTION_MISMATCH");
  const releaseNode = { dev: String(releaseStat.dev), ino: String(releaseStat.ino) };
  if (!sameNode(expectedRootNode, releaseNode)) {
    fail("RELEASE_PROMOTION_OWNERSHIP_LOST", "published release root is no longer the owned candidate");
  }
  if (existsSync(candidateRoot)) {
    fail("RELEASE_PROMOTION_QUARANTINE_BLOCKED", "owned release could not be quarantined safely");
  }
  renameSync(releaseRoot, candidateRoot);
  syncDirectorySync(path.dirname(releaseRoot));
  if (existsSync(releaseRoot)) {
    fail("RELEASE_PROMOTION_QUARANTINE_FAILED", "invalid published release remained visible");
  }
}

export async function publishPreparedDesktopRelease({
  candidateRoot,
  releaseRoot,
  checkpoint = async () => {},
} = {}) {
  if (!path.isAbsolute(candidateRoot ?? "")
    || !path.isAbsolute(releaseRoot ?? "")
    || path.dirname(candidateRoot) !== path.dirname(releaseRoot)
    || candidateRoot === releaseRoot) {
    fail("RELEASE_PROMOTION_PATH_INVALID", "candidate and release roots must be distinct absolute siblings");
  }
  const candidateManifest = await desktopReleaseTreeManifest(candidateRoot);
  await syncDesktopReleaseTree(candidateRoot);
  const syncedManifest = await desktopReleaseTreeManifest(candidateRoot);
  if (!sameManifest(syncedManifest, candidateManifest)) {
    fail("RELEASE_CANDIDATE_CHANGED", "prepared release tree changed while it was synchronized");
  }
  await checkpoint("prepared_and_synced");

  if (existsSync(releaseRoot)) {
    const existingManifest = await desktopReleaseTreeManifest(releaseRoot);
    if (!sameManifest(existingManifest, candidateManifest)) {
      fail("RELEASE_ROOT_COLLISION", "an existing exact release root differs from the prepared candidate");
    }
    await checkpoint("exact_idempotent_existing");
    await rm(candidateRoot, { recursive: true, force: true });
    return Object.freeze({ status: "EXACT_IDEMPOTENT", file_count: candidateManifest.length });
  }

  await checkpoint("atomic_rename_boundary");

  // No await, callback, or user code may run from the final validation through
  // publication and post-publication validation. A boundary mutation is caught
  // before rename; a post-rename mismatch is synchronously quarantined.
  const finalCandidate = desktopReleaseTreeSnapshotSync(candidateRoot);
  if (!sameManifest(finalCandidate.manifest, candidateManifest)) {
    fail("RELEASE_CANDIDATE_CHANGED", "prepared release tree changed before atomic publication");
  }
  if (existsSync(releaseRoot)) {
    fail("RELEASE_ROOT_COLLISION", "release root appeared before atomic publication");
  }
  let renamed = false;
  let promotedManifest;
  try {
    renameSync(candidateRoot, releaseRoot);
    renamed = true;
    syncDirectorySync(path.dirname(releaseRoot));
    promotedManifest = desktopReleaseTreeSnapshotSync(releaseRoot).manifest;
    if (!sameManifest(promotedManifest, candidateManifest)) {
      fail("RELEASE_PROMOTION_MISMATCH", "atomically promoted release tree changed after publication");
    }
  } catch (error) {
    if (renamed) {
      quarantineOwnedReleaseSync({
        candidateRoot,
        releaseRoot,
        expectedRootNode: finalCandidate.root_node,
      });
    }
    if (!renamed) throw error;
    if (error instanceof DesktopReleasePromotionError
      && error.code === "RELEASE_PROMOTION_MISMATCH") {
      throw error;
    }
    fail("RELEASE_PROMOTION_MISMATCH", "atomically promoted release tree could not be validated");
  }

  await checkpoint("atomic_rename_complete");
  return Object.freeze({ status: "PROMOTED", file_count: candidateManifest.length });
}
