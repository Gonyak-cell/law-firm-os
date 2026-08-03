import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

import { evidenceFail } from "./profile-media-evidence-shared.mjs";

function sameSnapshot(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.nlink === right.nlink
    && left.uid === right.uid
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function isOutside(path, root) {
  const candidate = relative(root, path);
  return candidate === ".." || candidate.startsWith(`..${sep}`) || isAbsolute(candidate);
}

function isOwnerOnlyFile(stat, maxBytes, uid) {
  return stat.isFile()
    && stat.nlink === 1n
    && stat.uid === uid
    && (stat.mode & 0o077n) === 0n
    && (stat.mode & 0o400n) !== 0n
    && stat.size > 0n
    && stat.size <= BigInt(maxBytes);
}

function isOwnerOnlyDirectory(stat, uid) {
  return stat.isDirectory()
    && stat.uid === uid
    && (stat.mode & 0o077n) === 0n
    && (stat.mode & 0o100n) !== 0n;
}

function fail() {
  evidenceFail(
    "PROFILE_PRODUCTION_EVIDENCE_INPUT",
    "production evidence must be a bounded owner-only canonical file outside the repository",
  );
}

export function readOwnerOnlyProductionEvidence(path, {
  repoRoot,
  maxBytes,
} = {}) {
  if (typeof path !== "string"
    || !isAbsolute(path)
    || resolve(path) !== path
    || typeof repoRoot !== "string"
    || !isAbsolute(repoRoot)
    || resolve(repoRoot) !== repoRoot
    || !Number.isSafeInteger(maxBytes)
    || maxBytes < 1
    || typeof process.getuid !== "function"
    || !Number.isSafeInteger(process.getuid())
    || !constants.O_NOFOLLOW) {
    fail();
  }

  let descriptor;
  try {
    const canonicalRepoRoot = realpathSync(repoRoot);
    const parent = dirname(path);
    if (canonicalRepoRoot !== repoRoot
      || realpathSync(parent) !== parent
      || realpathSync(path) !== path
      || !isOutside(path, canonicalRepoRoot)) {
      throw new Error("unsafe production evidence path");
    }

    const uid = BigInt(process.getuid());
    const parentBefore = lstatSync(parent, { bigint: true });
    const fileBefore = lstatSync(path, { bigint: true });
    if (!isOwnerOnlyDirectory(parentBefore, uid) || !isOwnerOnlyFile(fileBefore, maxBytes, uid)) {
      throw new Error("unsafe production evidence file");
    }

    descriptor = openSync(
      path,
      constants.O_RDONLY | (constants.O_CLOEXEC ?? 0) | constants.O_NOFOLLOW,
    );
    const opened = fstatSync(descriptor, { bigint: true });
    if (!isOwnerOnlyFile(opened, maxBytes, uid) || !sameSnapshot(fileBefore, opened)) {
      throw new Error("production evidence changed before open");
    }

    const bytes = Buffer.alloc(Number(opened.size));
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(descriptor, bytes, offset, bytes.length - offset, offset);
      if (!Number.isSafeInteger(count) || count <= 0) throw new Error("short production evidence read");
      offset += count;
    }
    if (readSync(descriptor, Buffer.alloc(1), 0, 1, bytes.length) !== 0) {
      throw new Error("production evidence grew during read");
    }

    const openedAfter = fstatSync(descriptor, { bigint: true });
    const fileAfter = lstatSync(path, { bigint: true });
    const parentAfter = lstatSync(parent, { bigint: true });
    if (!isOwnerOnlyFile(openedAfter, maxBytes, uid)
      || !isOwnerOnlyFile(fileAfter, maxBytes, uid)
      || !sameSnapshot(opened, openedAfter)
      || !sameSnapshot(openedAfter, fileAfter)
      || !isOwnerOnlyDirectory(parentAfter, uid)
      || !sameSnapshot(parentBefore, parentAfter)
      || realpathSync(parent) !== parent
      || realpathSync(path) !== path) {
      throw new Error("production evidence changed during read");
    }
    return bytes;
  } catch {
    fail();
  } finally {
    if (descriptor !== undefined) {
      try { closeSync(descriptor); } catch {}
    }
  }
}
