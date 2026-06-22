import { assertNoRendererDocumentBytes } from "../shared/rendererBytePolicy.js";

export const TEMP_PREVIEW_SCOPE = "matter-temp-preview";
export const DEFAULT_TEMP_PREVIEW_TTL_MS = 10 * 60 * 1000;

export class TempPreviewError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "TempPreviewError";
    this.code = code;
  }
}

export function createMemoryTempPreviewStorage() {
  const files = new Map();
  return {
    async createScopedTempFile(entry) {
      files.set(entry.tempId, entry);
      return {
        tempId: entry.tempId,
        name: entry.name,
        scope: entry.scope
      };
    },
    async removeTempFile(tempId) {
      files.delete(tempId);
    },
    snapshot() {
      return Array.from(files.values());
    }
  };
}

export function createTempPreviewManager({
  storage = createMemoryTempPreviewStorage(),
  now = () => Date.now(),
  ttlMs = DEFAULT_TEMP_PREVIEW_TTL_MS,
  createTempId = () => `temp-preview-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  permissionClient = {
    async precheckFileBridgeAction() {
      return { allowed: false, reason: "permission_client_missing" };
    }
  },
  documentProvider = {
    async fetchDocumentForPreview() {
      throw new TempPreviewError("DOCUMENT_PROVIDER_MISSING", "Temp preview requires a main-process document provider adapter");
    }
  },
  auditLogger = { async record() {} }
} = {}) {
  const activePreviews = new Map();

  async function removePreview(tempId, reason) {
    if (!activePreviews.has(tempId)) return false;
    activePreviews.delete(tempId);
    await storage.removeTempFile(tempId);
    await auditLogger.record({
      actionId: "clear_temp_cache",
      eventName: "file_bridge.preview.cache_wipe",
      tempId,
      reason
    });
    return true;
  }

  async function clearTempCache({ reason }) {
    const tempIds = Array.from(activePreviews.keys());
    let removed = 0;
    for (const tempId of tempIds) {
      if (await removePreview(tempId, reason)) removed += 1;
    }
    return { removed };
  }

  return {
    async openTempPreview(request = {}) {
      assertNoRendererDocumentBytes(
        request,
        (field) =>
          new TempPreviewError(
            "RENDERER_FILE_BYTES_FORBIDDEN",
            `Renderer-supplied document bytes are forbidden on the matter file bridge: ${field}`
          )
      );
      const precheck = await permissionClient.precheckFileBridgeAction({
        actionId: "open_temp_preview",
        permission: "file_bridge.preview",
        documentId: request.documentId,
        matterId: request.matterId,
        tenantIdHash: request.tenantIdHash
      });
      if (precheck?.allowed !== true) {
        throw new TempPreviewError("PERMISSION_DENIED", precheck?.reason ?? "Temp preview permission denied");
      }
      if (!documentProvider || typeof documentProvider.fetchDocumentForPreview !== "function") {
        throw new TempPreviewError("DOCUMENT_PROVIDER_MISSING", "Temp preview requires a main-process document provider adapter");
      }

      const tempId = createTempId();
      const expiresAt = now() + ttlMs;
      const providerResponse = await documentProvider.fetchDocumentForPreview({
        actionId: "open_temp_preview",
        documentId: request.documentId,
        matterId: request.matterId,
        tenantIdHash: request.tenantIdHash,
        permissionDecisionId: precheck.decisionId ?? null
      });
      const documentBytes = providerResponse?.bytes ?? providerResponse;
      if (
        typeof documentBytes !== "string" &&
        !(documentBytes instanceof ArrayBuffer) &&
        !ArrayBuffer.isView(documentBytes)
      ) {
        throw new TempPreviewError("DOCUMENT_BYTES_MISSING", "Document provider did not return preview bytes");
      }
      const entry = {
        tempId,
        scope: TEMP_PREVIEW_SCOPE,
        tenantIdHash: request.tenantIdHash,
        documentId: request.documentId,
        name: request.name ?? "matter-preview",
        bytes: documentBytes,
        expiresAt
      };

      const stored = await storage.createScopedTempFile(entry);
      activePreviews.set(tempId, {
        tempId,
        tenantIdHash: request.tenantIdHash,
        documentId: request.documentId,
        expiresAt
      });
      await auditLogger.record({
        actionId: "open_temp_preview",
        eventName: "file_bridge.preview.opened",
        tempId,
        decisionId: precheck.decisionId
      });

      return {
        state: "opened",
        preview: {
          tempId: stored.tempId,
          name: stored.name,
          scope: stored.scope,
          expiresAt,
          pathVisibleToRenderer: false
        }
      };
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
    async handleLogout() {
      return clearTempCache({ reason: "logout" });
    },
    async handleTenantSwitch() {
      return clearTempCache({ reason: "tenant_switch" });
    },
    async handleAppQuit() {
      return clearTempCache({ reason: "app_quit" });
    },
    snapshotForTest() {
      return Array.from(activePreviews.values());
    }
  };
}
