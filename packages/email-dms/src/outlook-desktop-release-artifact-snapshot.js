import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
} from "node:fs";
import path from "node:path";

import {
  ExternalReleaseTrustError,
  resolveTrustedFile,
  resolveTrustedRoot,
} from "../../runtime-auth/src/external-release-trust.js";

export const OUTLOOK_DESKTOP_RELEASE_ARTIFACT_MAX_BYTES = 512 * 1024 * 1024;
const HASH_CHUNK_BYTES = 64 * 1024;

const measurements = new WeakMap();

export class OutlookDesktopReleaseArtifactSnapshotError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "OutlookDesktopReleaseArtifactSnapshotError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new OutlookDesktopReleaseArtifactSnapshotError(code, message, details);
}

function sameIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.uid === right.uid
    && left.gid === right.gid
    && left.mode === right.mode
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs
    && left.birthtimeNs === right.birthtimeNs;
}

function explicitRelativePath(value) {
  if (typeof value !== "string" || !value || value.includes("\0")
      || value.includes("\\") || path.isAbsolute(value)
      || value.split("/").some((part) => !part || part === "." || part === "..")) {
    fail("RELEASE_ARTIFACT_PATH_INVALID", "artifact path must be one explicit relative file path");
  }
  return value;
}

function validateExpectedMetadata(options) {
  for (const field of ["expectedUid", "expectedGid", "expectedMode"]) {
    if (!Number.isSafeInteger(options[field]) || options[field] < 0) {
      fail("RELEASE_ARTIFACT_METADATA_REQUIRED", `artifact ${field} must be an explicit non-negative integer`);
    }
  }
  if (options.expectedMode > 0o777) {
    fail("RELEASE_ARTIFACT_METADATA_REQUIRED", "artifact expectedMode must contain permission bits only");
  }
}

function mapTrustedPathError(error) {
  if (error?.code === "TRUST_SYMLINK_FORBIDDEN") {
    fail("RELEASE_ARTIFACT_SYMLINK_FORBIDDEN", "artifact path may not contain a symbolic link");
  }
  if (error instanceof ExternalReleaseTrustError) {
    fail("RELEASE_ARTIFACT_PATH_INVALID", "artifact path is outside the fixed trusted root", { cause: error.code });
  }
  throw error;
}

export function readOutlookDesktopReleaseArtifactSnapshot(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)
      || Object.keys(options).some((key) => ![
        "artifactPath", "expectedGid", "expectedMode", "expectedUid", "rootDir",
      ].includes(key))) {
    fail("RELEASE_ARTIFACT_SNAPSHOT_INPUT_INVALID", "artifact snapshot options are invalid");
  }
  validateExpectedMetadata(options);
  const artifactPath = explicitRelativePath(options.artifactPath);
  let target;
  try {
    target = resolveTrustedFile(resolveTrustedRoot(options.rootDir), artifactPath);
  } catch (error) {
    mapTrustedPathError(error);
  }
  let descriptor;
  try {
    descriptor = openSync(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const before = fstatSync(descriptor, { bigint: true });
    const pathBefore = lstatSync(target, { bigint: true });
    if (!before.isFile() || !pathBefore.isFile() || pathBefore.isSymbolicLink()) {
      fail("RELEASE_ARTIFACT_FILE_INVALID", "artifact must be one stable regular file");
    }
    if (before.nlink !== 1n) {
      fail("RELEASE_ARTIFACT_HARDLINK_FORBIDDEN", "artifact must have exactly one filesystem link");
    }
    const mode = Number(before.mode & 0o777n);
    if (Number(before.uid) !== options.expectedUid || Number(before.gid) !== options.expectedGid) {
      fail("RELEASE_ARTIFACT_OWNER_MISMATCH", "artifact owner does not match the fixed boundary identity");
    }
    if (mode !== options.expectedMode) {
      fail("RELEASE_ARTIFACT_MODE_MISMATCH", "artifact mode does not match the fixed boundary mode");
    }
    if (before.size < 1n || before.size > BigInt(OUTLOOK_DESKTOP_RELEASE_ARTIFACT_MAX_BYTES)) {
      fail("RELEASE_ARTIFACT_SIZE_INVALID", "artifact byte size is outside the fixed release limit");
    }
    if (!sameIdentity(before, pathBefore)) {
      fail("RELEASE_ARTIFACT_FILE_CHANGED", "artifact identity changed before measurement");
    }
    const chunk = Buffer.allocUnsafe(Math.min(HASH_CHUNK_BYTES, Number(before.size)));
    const digest = createHash("sha256");
    let offset = 0;
    while (offset < Number(before.size)) {
      const count = readSync(
        descriptor,
        chunk,
        0,
        Math.min(chunk.length, Number(before.size) - offset),
        null,
      );
      if (count === 0) fail("RELEASE_ARTIFACT_FILE_CHANGED", "artifact became shorter during measurement");
      digest.update(chunk.subarray(0, count));
      offset += count;
    }
    if (readSync(descriptor, chunk, 0, 1, null) !== 0) {
      fail("RELEASE_ARTIFACT_FILE_CHANGED", "artifact became longer during measurement");
    }
    const after = fstatSync(descriptor, { bigint: true });
    const pathAfter = lstatSync(target, { bigint: true });
    if (!sameIdentity(before, after) || !sameIdentity(after, pathAfter)
        || resolveTrustedFile(options.rootDir, artifactPath) !== target) {
      fail("RELEASE_ARTIFACT_FILE_CHANGED", "artifact identity changed during measurement");
    }
    const measurement = Object.freeze({
      gid: Number(before.gid),
      identity: `${before.dev}:${before.ino}`,
      mode,
      nlink: Number(before.nlink),
      sha256: digest.digest("hex"),
      size: offset,
      uid: Number(before.uid),
    });
    const snapshot = Object.freeze({
      gid: measurement.gid,
      identity: measurement.identity,
      mode: measurement.mode,
      nlink: measurement.nlink,
      sha256: measurement.sha256,
      size: measurement.size,
      uid: measurement.uid,
    });
    measurements.set(snapshot, measurement);
    return snapshot;
  } catch (error) {
    if (error instanceof OutlookDesktopReleaseArtifactSnapshotError) throw error;
    fail("RELEASE_ARTIFACT_FILE_INVALID", "artifact could not be measured from one stable descriptor", { cause: error.code ?? error.message });
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

export function inspectOutlookDesktopReleaseArtifactSnapshot(snapshot) {
  const measurement = measurements.get(snapshot);
  if (!measurement) {
    fail("RELEASE_ARTIFACT_SNAPSHOT_INVALID", "artifact snapshot must come from the fixed descriptor reader");
  }
  return Object.freeze({
    gid: measurement.gid,
    identity: measurement.identity,
    mode: measurement.mode,
    nlink: measurement.nlink,
    sha256: measurement.sha256,
    size: measurement.size,
    uid: measurement.uid,
  });
}
