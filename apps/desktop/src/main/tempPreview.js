import { randomUUID } from "node:crypto";
import { lstatSync, rmSync } from "node:fs";
import { lstat, mkdir, open, rm, unlink } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve } from "node:path";

export const TEMP_PREVIEW_SCOPE = "amic-os-vault-preview";
export const TEMP_PREVIEW_DIRECTORY = "amic-os-vault-preview-cache";
export const DEFAULT_TEMP_PREVIEW_TTL_MS = 5 * 60 * 1000;
export const MAX_TEMP_PREVIEW_TTL_MS = DEFAULT_TEMP_PREVIEW_TTL_MS;
export const TEMP_PREVIEW_CLEANUP_RETRY_MS = 5 * 1000;

const SAFE_TEMP_ID = /^[a-f0-9-]{36}$/u;
const PREVIEW_EXTENSION_BY_MIME_TYPE = Object.freeze({
  "application/msword": ".doc",
  "application/pdf": ".pdf",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "text/csv": ".csv",
  "text/plain": ".txt",
});

export class TempPreviewError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "TempPreviewError";
    this.code = code;
  }
}

function asPreviewBytes(bytes) {
  if (bytes instanceof ArrayBuffer) return Buffer.from(bytes);
  if (ArrayBuffer.isView(bytes)) return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  throw new TempPreviewError("DOCUMENT_BYTES_MISSING", "Temp preview requires main-process document bytes");
}

function requireOwnerId(ownerId) {
  if (typeof ownerId !== "string" || !ownerId) {
    throw new TempPreviewError("TEMP_PREVIEW_OWNER_REQUIRED", "Temp preview caller ownership is required");
  }
  return ownerId;
}

function requireBindingId(value, field) {
  if (typeof value !== "string" || !value) {
    throw new TempPreviewError("TEMP_PREVIEW_BINDING_REQUIRED", `${field} is required`);
  }
  return value;
}

function normalizedTtl(ttlMs) {
  if (!Number.isSafeInteger(ttlMs) || ttlMs < 1 || ttlMs > MAX_TEMP_PREVIEW_TTL_MS) {
    return DEFAULT_TEMP_PREVIEW_TTL_MS;
  }
  return ttlMs;
}

export function previewExtensionForMimeType(mimeType) {
  if (typeof mimeType !== "string") return null;
  return PREVIEW_EXTENSION_BY_MIME_TYPE[mimeType.trim().toLowerCase()] ?? null;
}

export function createMemoryTempPreviewStorage() {
  const files = new Map();
  return Object.freeze({
    async initialize() {
      files.clear();
    },
    async createScopedTempFile(entry) {
      files.set(entry.tempId, { ...entry });
      return Object.freeze({
        tempId: entry.tempId,
        name: entry.name,
        scope: entry.scope,
        nativePath: `memory://${entry.tempId}`,
      });
    },
    async removeTempFile(tempId) {
      files.delete(tempId);
    },
    async clear() {
      const removed = files.size;
      files.clear();
      return { removed };
    },
    clearSync() {
      files.clear();
    },
    snapshot() {
      return Array.from(files.values()).map(({ bytes, ...entry }) => ({
        ...entry,
        byteSize: asPreviewBytes(bytes).byteLength,
      }));
    },
  });
}

export function createFileSystemTempPreviewStorage({
  basePath,
  lstatImpl = lstat,
  mkdirImpl = mkdir,
  openImpl = open,
  rmImpl = rm,
  unlinkImpl = unlink,
  lstatSyncImpl = lstatSync,
  rmSyncImpl = rmSync,
} = {}) {
  if (typeof basePath !== "string" || !isAbsolute(basePath)) {
    throw new TempPreviewError("TEMP_PREVIEW_ROOT_INVALID", "Temp preview base path must be absolute");
  }
  const canonicalBasePath = resolve(basePath);
  const rootPath = join(canonicalBasePath, TEMP_PREVIEW_DIRECTORY);
  let initialized = false;

  async function assertOwnedRoot() {
    let rootStat;
    try {
      rootStat = await lstatImpl(rootPath);
    } catch (error) {
      if (error?.code === "ENOENT") {
        throw new TempPreviewError("TEMP_PREVIEW_ROOT_MISSING", "Temp preview root is unavailable");
      }
      throw error;
    }
    if (rootStat?.isSymbolicLink?.() === true || rootStat?.isDirectory?.() !== true) {
      throw new TempPreviewError("TEMP_PREVIEW_ROOT_UNSAFE", "Temp preview root must be a non-symbolic-link directory");
    }
  }

  async function clearRoot() {
    let rootStat;
    try {
      rootStat = await lstatImpl(rootPath);
    } catch (error) {
      if (error?.code === "ENOENT") return { removed: 0 };
      throw error;
    }
    if (rootStat?.isSymbolicLink?.() === true || rootStat?.isDirectory?.() !== true) {
      throw new TempPreviewError("TEMP_PREVIEW_ROOT_UNSAFE", "Refusing to clear an unsafe temp preview root");
    }
    await rmImpl(rootPath, { recursive: true, force: false });
    initialized = false;
    return { removed: 1 };
  }

  return Object.freeze({
    rootPath,
    async initialize() {
      await clearRoot();
      await mkdirImpl(rootPath, { recursive: false, mode: 0o700 });
      await assertOwnedRoot();
      initialized = true;
      return { initialized: true };
    },
    async createScopedTempFile(entry = {}) {
      if (!initialized) {
        throw new TempPreviewError("TEMP_PREVIEW_STORAGE_NOT_INITIALIZED", "Temp preview storage is not initialized");
      }
      if (!SAFE_TEMP_ID.test(String(entry.tempId ?? ""))) {
        throw new TempPreviewError("TEMP_PREVIEW_ID_INVALID", "Temp preview id is invalid");
      }
      const extension = previewExtensionForMimeType(entry.mimeType);
      if (!extension) {
        throw new TempPreviewError("TEMP_PREVIEW_TYPE_UNSUPPORTED", "Document type cannot be opened in temp preview");
      }
      await assertOwnedRoot();
      const nativePath = join(rootPath, `${entry.tempId}${extension}`);
      const payload = asPreviewBytes(entry.bytes);
      let handle = null;
      let writeError = null;
      try {
        handle = await openImpl(nativePath, "wx", 0o600);
        await handle.writeFile(payload);
        await handle.sync?.();
      } catch (error) {
        writeError = error;
      } finally {
        try {
          await handle?.close?.();
        } catch (error) {
          writeError ??= error;
        }
      }
      if (writeError) {
        try {
          await unlinkImpl(nativePath);
        } catch {
          // The exclusive file may not have been created.
        }
        throw new TempPreviewError("TEMP_PREVIEW_WRITE_FAILED", writeError?.code ?? "Temp preview write failed");
      }
      return Object.freeze({
        tempId: entry.tempId,
        name: basename(entry.name || `Vault preview${extension}`),
        scope: TEMP_PREVIEW_SCOPE,
        nativePath,
      });
    },
    async removeTempFile(_tempId, nativePath) {
      const relativePath = typeof nativePath === "string" ? relative(rootPath, nativePath) : "";
      if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
        throw new TempPreviewError("TEMP_PREVIEW_PATH_INVALID", "Temp preview path is outside the app-owned root");
      }
      try {
        await unlinkImpl(nativePath);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    },
    async clear() {
      const result = await clearRoot();
      await mkdirImpl(rootPath, { recursive: false, mode: 0o700 });
      await assertOwnedRoot();
      initialized = true;
      return result;
    },
    clearSync() {
      let rootStat;
      try {
        rootStat = lstatSyncImpl(rootPath);
      } catch (error) {
        if (error?.code === "ENOENT") {
          initialized = false;
          return { removed: 0 };
        }
        throw error;
      }
      if (rootStat?.isSymbolicLink?.() === true || rootStat?.isDirectory?.() !== true) {
        throw new TempPreviewError("TEMP_PREVIEW_ROOT_UNSAFE", "Refusing to clear an unsafe temp preview root");
      }
      rmSyncImpl(rootPath, { recursive: true, force: false });
      initialized = false;
      return { removed: 1 };
    },
  });
}

export function createTempPreviewManager({
  storage = createMemoryTempPreviewStorage(),
  openPreview = async () => "",
  now = () => Date.now(),
  ttlMs = DEFAULT_TEMP_PREVIEW_TTL_MS,
  createTempId = randomUUID,
  setTimeoutImpl = setTimeout,
  clearTimeoutImpl = clearTimeout,
  auditLogger = { async record() {} },
} = {}) {
  const activePreviews = new Map();
  const effectiveTtlMs = normalizedTtl(ttlMs);

  function scheduleRemovalRetry(tempId, reason) {
    const preview = activePreviews.get(tempId);
    if (!preview) return;
    preview.timer = setTimeoutImpl(() => {
      void removePreview(tempId, reason).catch(() => {});
    }, TEMP_PREVIEW_CLEANUP_RETRY_MS);
    preview.timer?.unref?.();
  }

  async function removePreview(tempId, reason) {
    const preview = activePreviews.get(tempId);
    if (!preview) return false;
    clearTimeoutImpl(preview.timer);
    try {
      await storage.removeTempFile(tempId, preview.nativePath);
    } catch (error) {
      scheduleRemovalRetry(tempId, reason);
      throw error;
    }
    activePreviews.delete(tempId);
    await auditLogger.record({
      actionId: "clear_temp_cache",
      eventName: "file_bridge.preview.cache_wipe",
      tempId,
      reason,
    });
    return true;
  }

  function scheduleExpiry(tempId) {
    const timer = setTimeoutImpl(() => {
      void removePreview(tempId, "ttl_expired").catch(() => {});
    }, effectiveTtlMs);
    timer?.unref?.();
    return timer;
  }

  async function clearTempCache({ reason = "explicit_clear" } = {}) {
    const tempIds = Array.from(activePreviews.keys());
    let removed = 0;
    let firstError = null;
    for (const tempId of tempIds) {
      try {
        if (await removePreview(tempId, reason)) removed += 1;
      } catch (error) {
        firstError ??= error;
      }
    }
    try {
      await storage.clear?.();
      for (const preview of activePreviews.values()) clearTimeoutImpl(preview.timer);
      activePreviews.clear();
    } catch (error) {
      firstError ??= error;
    }
    if (firstError) throw firstError;
    return { removed };
  }

  return Object.freeze({
    async initialize() {
      await storage.initialize?.();
      return { initialized: true };
    },
    async stageTempPreview({
      bytes,
      name,
      ownerId,
      documentId,
      versionId,
      mimeType,
    } = {}) {
      requireOwnerId(ownerId);
      requireBindingId(documentId, "documentId");
      requireBindingId(versionId, "versionId");
      if (!previewExtensionForMimeType(mimeType)) {
        throw new TempPreviewError("TEMP_PREVIEW_TYPE_UNSUPPORTED", "Document type cannot be opened in temp preview");
      }
      const tempId = createTempId();
      if (!SAFE_TEMP_ID.test(String(tempId ?? ""))) {
        throw new TempPreviewError("TEMP_PREVIEW_ID_INVALID", "Temp preview id is invalid");
      }
      const expiresAt = now() + effectiveTtlMs;
      const stored = await storage.createScopedTempFile({
        tempId,
        scope: TEMP_PREVIEW_SCOPE,
        name,
        bytes: asPreviewBytes(bytes),
        documentId,
        versionId,
        mimeType,
        expiresAt,
      });
      const preview = {
        tempId,
        ownerId,
        documentId,
        versionId,
        mimeType,
        name: stored.name,
        nativePath: stored.nativePath,
        expiresAt,
        timer: null,
      };
      activePreviews.set(tempId, preview);
      preview.timer = scheduleExpiry(tempId);
      return Object.freeze({
        tempId,
        name: preview.name,
        scope: TEMP_PREVIEW_SCOPE,
        expiresAt,
        pathVisibleToRenderer: false,
      });
    },
    async openStagedPreview({ tempId, ownerId } = {}) {
      const preview = activePreviews.get(tempId);
      if (!preview) {
        throw new TempPreviewError("TEMP_PREVIEW_NOT_FOUND", "Temp preview is unavailable");
      }
      if (preview.ownerId !== requireOwnerId(ownerId)) {
        throw new TempPreviewError("TEMP_PREVIEW_OWNER_MISMATCH", "Temp preview belongs to another caller");
      }
      if (preview.expiresAt <= now()) {
        await removePreview(tempId, "ttl_expired");
        throw new TempPreviewError("TEMP_PREVIEW_EXPIRED", "Temp preview has expired");
      }
      const openError = await openPreview(preview.nativePath);
      if (typeof openError === "string" && openError) {
        throw new TempPreviewError("TEMP_PREVIEW_OPEN_FAILED", openError);
      }
      return Object.freeze({
        tempId,
        name: preview.name,
        scope: TEMP_PREVIEW_SCOPE,
        expiresAt: preview.expiresAt,
        pathVisibleToRenderer: false,
      });
    },
    removeTempPreview({ tempId, reason = "preview_failed" } = {}) {
      return removePreview(tempId, reason);
    },
    async sweepExpiredPreviews() {
      const cutoff = now();
      const expired = Array.from(activePreviews.values()).filter((preview) => preview.expiresAt <= cutoff);
      let removed = 0;
      for (const preview of expired) {
        if (await removePreview(preview.tempId, "ttl_expired")) removed += 1;
      }
      return { removed };
    },
    clearTempCache,
    clear() {
      return clearTempCache({ reason: "explicit_clear" });
    },
    handleLogout() {
      return clearTempCache({ reason: "logout" });
    },
    handleTenantSwitch() {
      return clearTempCache({ reason: "tenant_switch" });
    },
    handleAppQuit() {
      return clearTempCache({ reason: "app_quit" });
    },
    dispose() {
      for (const preview of activePreviews.values()) clearTimeoutImpl(preview.timer);
      activePreviews.clear();
      try {
        storage.clearSync?.();
      } catch {
        // A native document app may still hold the file on Windows; startup cleanup retries the fixed owned root.
      }
    },
    snapshotForTest() {
      return Array.from(activePreviews.values()).map((preview) => ({
        tempId: preview.tempId,
        ownerId: preview.ownerId,
        documentId: preview.documentId,
        versionId: preview.versionId,
        mimeType: preview.mimeType,
        name: preview.name,
        expiresAt: preview.expiresAt,
        pathVisibleToRenderer: false,
      }));
    },
  });
}
