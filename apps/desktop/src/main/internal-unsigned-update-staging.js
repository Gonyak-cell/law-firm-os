import { createHash, randomUUID } from "node:crypto";
import { lstatSync, rmSync } from "node:fs";
import { lstat, mkdir, open, rm } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

export const INTERNAL_UNSIGNED_UPDATE_CACHE_DIRECTORY = "amic-os-internal-update-cache";

const SHA256 = /^[0-9a-f]{64}$/u;
const SAFE_STAGE_ID = /^[a-f0-9-]{36}$/u;
const SAFE_FILENAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/u;
const SAFE_VERSION_ID = /^[A-Za-z0-9][A-Za-z0-9._+=/-]{0,1023}$/u;
const MAX_ARTIFACT_BYTES = 2 * 1024 * 1024 * 1024;

export class InternalUnsignedUpdateStagingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "InternalUnsignedUpdateStagingError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new InternalUnsignedUpdateStagingError(code, message);
}

function validateCandidate(candidate) {
  if (!candidate
      || typeof candidate !== "object"
      || !SAFE_FILENAME.test(candidate.artifactFilename ?? "")
      || !SHA256.test(candidate.artifactSha256 ?? "")
      || !Number.isSafeInteger(candidate.artifactBytes)
      || candidate.artifactBytes < 1
      || candidate.artifactBytes > MAX_ARTIFACT_BYTES
      || !SAFE_VERSION_ID.test(candidate.artifactVersionId ?? "")
      || typeof candidate.releaseId !== "string"
      || !candidate.releaseId
      || typeof candidate.version !== "string"
      || !candidate.version) {
    fail("UPDATE_CANDIDATE_INVALID", "Internal update candidate is invalid");
  }
  return candidate;
}

function asChunk(chunk) {
  if (chunk instanceof ArrayBuffer) return Buffer.from(chunk);
  if (ArrayBuffer.isView(chunk)) {
    return Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  }
  fail("UPDATE_DOWNLOAD_CHUNK_INVALID", "Internal update download returned a non-binary chunk");
}

async function writeAll(handle, bytes) {
  let offset = 0;
  while (offset < bytes.byteLength) {
    const { bytesWritten } = await handle.write(bytes, offset, bytes.byteLength - offset, null);
    if (!Number.isSafeInteger(bytesWritten) || bytesWritten < 1) {
      fail("UPDATE_CACHE_WRITE_FAILED", "Internal update cache write did not advance");
    }
    offset += bytesWritten;
  }
}

async function digestHandle(handle, expectedBytes) {
  const digest = createHash("sha256");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  let position = 0;
  while (position < expectedBytes) {
    const { bytesRead } = await handle.read(
      buffer,
      0,
      Math.min(buffer.byteLength, expectedBytes - position),
      position,
    );
    if (bytesRead < 1) break;
    digest.update(buffer.subarray(0, bytesRead));
    position += bytesRead;
  }
  return Object.freeze({ bytes: position, sha256: digest.digest("hex") });
}

export function createFileSystemInternalUnsignedUpdateStaging({
  basePath,
  lstatImpl = lstat,
  mkdirImpl = mkdir,
  openImpl = open,
  rmImpl = rm,
  lstatSyncImpl = lstatSync,
  rmSyncImpl = rmSync,
  createStageId = randomUUID,
  openInstaller = async () => "",
} = {}) {
  if (typeof basePath !== "string" || !isAbsolute(basePath)) {
    fail("UPDATE_CACHE_ROOT_INVALID", "Internal update cache base path must be absolute");
  }
  const rootPath = join(resolve(basePath), INTERNAL_UNSIGNED_UPDATE_CACHE_DIRECTORY);
  const stages = new Map();
  let initialized = false;

  async function rootStat() {
    let stat;
    try {
      stat = await lstatImpl(rootPath);
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
    if (stat?.isSymbolicLink?.() || stat?.isDirectory?.() !== true) {
      fail("UPDATE_CACHE_ROOT_UNSAFE", "Internal update cache root is not an owned directory");
    }
    return stat;
  }

  async function clearRoot() {
    if (await rootStat()) await rmImpl(rootPath, { recursive: true, force: false });
    stages.clear();
    initialized = false;
  }

  async function verifyEntry(entry) {
    const stat = await lstatImpl(entry.nativePath);
    if (stat?.isSymbolicLink?.() || stat?.isFile?.() !== true || stat.nlink !== 1) {
      fail("UPDATE_CACHE_FILE_UNSAFE", "Staged update is not a single regular file");
    }
    if (stat.size !== entry.artifactBytes) {
      fail("UPDATE_CACHE_FILE_SIZE_MISMATCH", "Staged update size changed after download");
    }
    let handle;
    try {
      handle = await openImpl(entry.nativePath, "r");
      const digest = await digestHandle(handle, entry.artifactBytes);
      if (digest.bytes !== entry.artifactBytes || digest.sha256 !== entry.artifactSha256) {
        fail("UPDATE_CACHE_FILE_HASH_MISMATCH", "Staged update bytes changed after download");
      }
    } finally {
      await handle?.close?.();
    }
  }

  return Object.freeze({
    rootPath,
    async initialize() {
      await clearRoot();
      await mkdirImpl(rootPath, { recursive: false, mode: 0o700 });
      await rootStat();
      initialized = true;
      return Object.freeze({ initialized: true, priorCacheRemoved: true });
    },
    async stage({ candidate, chunks } = {}) {
      if (!initialized) fail("UPDATE_CACHE_NOT_INITIALIZED", "Internal update cache is not initialized");
      const metadata = validateCandidate(candidate);
      if (!chunks || typeof chunks[Symbol.asyncIterator] !== "function") {
        fail("UPDATE_DOWNLOAD_STREAM_REQUIRED", "Internal update download must be an async byte stream");
      }
      const stageId = createStageId();
      if (!SAFE_STAGE_ID.test(String(stageId ?? ""))) {
        fail("UPDATE_STAGE_ID_INVALID", "Internal update stage id is invalid");
      }
      await rootStat();
      const stageRoot = join(rootPath, stageId);
      await mkdirImpl(stageRoot, { recursive: false, mode: 0o700 });
      const nativePath = join(stageRoot, metadata.artifactFilename);
      let handle;
      let total = 0;
      const digest = createHash("sha256");
      try {
        handle = await openImpl(nativePath, "wx", 0o600);
        for await (const rawChunk of chunks) {
          const chunk = asChunk(rawChunk);
          if (chunk.byteLength === 0) continue;
          total += chunk.byteLength;
          if (total > metadata.artifactBytes) {
            fail("UPDATE_DOWNLOAD_TOO_LARGE", "Internal update exceeded its signed byte count");
          }
          digest.update(chunk);
          await writeAll(handle, chunk);
        }
        await handle.sync?.();
      } catch (error) {
        try { await handle?.close?.(); } catch {}
        await rmImpl(stageRoot, { recursive: true, force: true });
        throw error;
      }
      await handle.close();
      if (total !== metadata.artifactBytes) {
        await rmImpl(stageRoot, { recursive: true, force: true });
        fail("UPDATE_DOWNLOAD_PARTIAL", "Internal update ended before its signed byte count");
      }
      const actualSha256 = digest.digest("hex");
      if (actualSha256 !== metadata.artifactSha256) {
        await rmImpl(stageRoot, { recursive: true, force: true });
        fail("UPDATE_DOWNLOAD_HASH_MISMATCH", "Internal update hash differs from signed metadata");
      }
      const entry = Object.freeze({
        stageId,
        nativePath,
        releaseId: metadata.releaseId,
        version: metadata.version,
        artifactSha256: metadata.artifactSha256,
        artifactBytes: metadata.artifactBytes,
        artifactVersionId: metadata.artifactVersionId,
      });
      stages.set(stageId, entry);
      return Object.freeze({
        state: "staged",
        stageId,
        releaseId: entry.releaseId,
        version: entry.version,
        artifactSha256: entry.artifactSha256,
        artifactBytes: entry.artifactBytes,
        artifactVersionId: entry.artifactVersionId,
        localPathIncluded: false,
        automaticReplacement: false,
      });
    },
    async open({ stageId, confirmed, userActivation } = {}) {
      if (confirmed !== true || userActivation !== true) {
        fail("UPDATE_OPERATOR_CONFIRMATION_REQUIRED", "Opening an unsigned installer requires an active confirmed user action");
      }
      const entry = stages.get(stageId);
      if (!entry) fail("UPDATE_STAGE_NOT_FOUND", "Internal update stage is unavailable");
      await verifyEntry(entry);
      const result = await openInstaller(entry.nativePath);
      if (typeof result === "string" && result) {
        fail("UPDATE_INSTALLER_OPEN_FAILED", "Windows refused to open the staged internal installer");
      }
      return Object.freeze({
        state: "installer_opened",
        stageId: entry.stageId,
        releaseId: entry.releaseId,
        version: entry.version,
        artifactSha256: entry.artifactSha256,
        artifactVersionId: entry.artifactVersionId,
        windowsWarningExpected: true,
        operatorAcceptanceRequired: true,
        localPathIncluded: false,
        automaticReplacement: false,
      });
    },
    async remove(stageId) {
      const entry = stages.get(stageId);
      if (!entry) return false;
      const stageRoot = join(rootPath, stageId);
      const relativePath = relative(rootPath, stageRoot);
      if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
        fail("UPDATE_CACHE_PATH_INVALID", "Internal update cache path escaped its owned root");
      }
      await rmImpl(stageRoot, { recursive: true, force: false });
      stages.delete(stageId);
      return true;
    },
    async clear() {
      await clearRoot();
      await mkdirImpl(rootPath, { recursive: false, mode: 0o700 });
      await rootStat();
      initialized = true;
      return Object.freeze({ cleared: true });
    },
    clearSync() {
      let stat;
      try {
        stat = lstatSyncImpl(rootPath);
      } catch (error) {
        if (error?.code === "ENOENT") return Object.freeze({ cleared: false });
        throw error;
      }
      if (stat?.isSymbolicLink?.() || stat?.isDirectory?.() !== true) {
        fail("UPDATE_CACHE_ROOT_UNSAFE", "Refusing to clear an unsafe internal update cache root");
      }
      rmSyncImpl(rootPath, { recursive: true, force: false });
      stages.clear();
      initialized = false;
      return Object.freeze({ cleared: true });
    },
  });
}
