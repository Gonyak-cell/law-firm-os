import { createHash, randomUUID } from "node:crypto";
import { lstat, open, rename, unlink } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join } from "node:path";
import { assertNoRendererDocumentBytes } from "../shared/rendererBytePolicy.js";

export const FILE_BRIDGE_MAX_UPLOAD_BYTES = 1024 * 1024 * 1024;
export const FILE_BRIDGE_MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;
export const FILE_BRIDGE_PREFLIGHT_TTL_MS = 60 * 1000;
export const FILE_BRIDGE_HANDLE_TTL_MS = 5 * 60 * 1000;

export const FILE_BRIDGE_CHANNELS = Object.freeze({
  status: "fileBridge:status",
  precheckUpload: "fileBridge:precheck-upload",
  chooseFileForUpload: "fileBridge:choose-file-for-upload",
  cancelUpload: "fileBridge:cancel-upload",
  uploadSelectedFile: "fileBridge:upload-selected-file",
  resumePendingUploads: "fileBridge:resume-pending-uploads",
  saveDocumentAs: "fileBridge:save-document-as",
  openDocumentPreview: "fileBridge:open-document-preview",
  attachDocumentToClassicOutlook: "fileBridge:attach-document-to-classic-outlook"
});

export const FILE_BRIDGE_AUDIT_MAP = Object.freeze({
  precheck_file_upload: Object.freeze({
    direction: "upload",
    permission: "file_bridge.upload",
    auditEvents: Object.freeze({
      precheckAllowed: "file_bridge.upload.permission_precheck.allowed",
      precheckDenied: "file_bridge.upload.permission_precheck.denied"
    })
  }),
  choose_file_for_upload: Object.freeze({
    direction: "upload",
    permission: "file_bridge.upload",
    auditEvents: Object.freeze({
      pickerCancelled: "file_bridge.upload.picker.cancelled",
      pickerSelected: "file_bridge.upload.picker.selected",
      selectionRejected: "file_bridge.upload.picker.rejected"
    })
  }),
  cancel_file_upload: Object.freeze({
    direction: "cleanup",
    permission: "file_bridge.upload",
    auditEvents: Object.freeze({
      cancelled: "file_bridge.upload.handle.cancelled"
    })
  }),
  upload_selected_file: Object.freeze({
    direction: "upload",
    permission: "file_bridge.upload",
    auditEvents: Object.freeze({
      started: "file_bridge.upload.started",
      completed: "file_bridge.upload.completed",
      failed: "file_bridge.upload.failed"
    })
  }),
  resume_pending_uploads: Object.freeze({
    direction: "upload",
    permission: "file_bridge.upload",
    auditEvents: Object.freeze({
      started: "file_bridge.upload.resume.started",
      completed: "file_bridge.upload.resume.completed",
      failed: "file_bridge.upload.resume.failed"
    })
  }),
  save_document_as: Object.freeze({
    direction: "download",
    label: "save-as",
    permission: "file_bridge.download",
    auditEvents: Object.freeze({
      precheckAllowed: "file_bridge.download.permission_precheck.allowed",
      precheckDenied: "file_bridge.download.permission_precheck.denied",
      saveDialogOpened: "file_bridge.download.save-as.dialog_opened",
      saveCompleted: "file_bridge.download.save-as.completed",
      saveFailed: "file_bridge.download.save-as.failed"
    })
  }),
  open_temp_preview: Object.freeze({
    direction: "download",
    permission: "file_bridge.preview",
    auditEvents: Object.freeze({
      precheckAllowed: "file_bridge.preview.permission_precheck.allowed",
      precheckDenied: "file_bridge.preview.permission_precheck.denied",
      previewOpened: "file_bridge.preview.opened",
      previewFailed: "file_bridge.preview.failed"
    })
  }),
  attach_document_to_classic_outlook: Object.freeze({
    direction: "download",
    permission: "file_bridge.download",
    auditEvents: Object.freeze({
      precheckAllowed: "file_bridge.outlook-attach.permission_precheck.allowed",
      precheckDenied: "file_bridge.outlook-attach.permission_precheck.denied",
      attachStarted: "file_bridge.outlook-attach.started",
      attachCompleted: "file_bridge.outlook-attach.completed",
      attachFailed: "file_bridge.outlook-attach.failed"
    })
  })
});

const SAFE_BINDING_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const MIME_TYPE = /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/u;
const VAULT_OPERATION_ID = /^vaultop_[a-f0-9]{32}$/u;
const FORBIDDEN_RENDERER_AUTHORITY_FIELDS = Object.freeze([
  "actorId",
  "actor_id",
  "tenantId",
  "tenant_id",
  "tenantIdHash",
  "tenant_id_hash",
  "permissionRef",
  "permission_ref",
  "decisionId",
  "decision_id",
  "idempotencyKey",
  "idempotency_key",
  "operationKind",
  "operation_kind",
  "completionStage",
  "completion_stage",
  "requestNonceSha256",
  "request_nonce_sha256",
  "installationRefSha256",
  "installation_ref_sha256",
  "composeTargetSha256",
  "compose_target_sha256",
  "filePath",
  "file_path",
  "absolutePath",
  "absolute_path"
]);

const MIME_TYPES_BY_EXTENSION = Object.freeze({
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  pdf: "application/pdf",
  png: "image/png",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip"
});

export class FileBridgeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "FileBridgeError";
    this.code = code;
  }
}

export function assertUserActivation(request = {}) {
  if (request.userActivation !== true) {
    throw new FileBridgeError("USER_ACTIVATION_REQUIRED", "File picker requires an active user interaction");
  }
}

function assertRendererAuthorityNotSupplied(request = {}) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new FileBridgeError("INVALID_FILE_BRIDGE_REQUEST", "File bridge request must be an object");
  }
  const field = FORBIDDEN_RENDERER_AUTHORITY_FIELDS.find((candidate) =>
    Object.prototype.hasOwnProperty.call(request, candidate)
  );
  if (field) {
    throw new FileBridgeError(
      "RENDERER_AUTHORITY_FIELD_FORBIDDEN",
      `Renderer-supplied authority is forbidden on the file bridge: ${field}`
    );
  }
}

function assertBindingId(value, field, { required = false } = {}) {
  if (value == null || value === "") {
    if (required) throw new FileBridgeError("FILE_BRIDGE_BINDING_REQUIRED", `${field} is required`);
    return null;
  }
  if (typeof value !== "string" || !SAFE_BINDING_ID.test(value)) {
    throw new FileBridgeError("INVALID_FILE_BRIDGE_BINDING", `${field} is invalid`);
  }
  return value;
}

function ownerIdFrom(owner = {}) {
  if (typeof owner.ownerId !== "string" || !owner.ownerId) {
    throw new FileBridgeError("FILE_BRIDGE_OWNER_REQUIRED", "File bridge caller ownership is required");
  }
  return owner.ownerId;
}

function normalizeUploadLimit(value) {
  const candidate = Number(value);
  if (!Number.isSafeInteger(candidate) || candidate <= 0) return FILE_BRIDGE_MAX_UPLOAD_BYTES;
  return Math.min(candidate, FILE_BRIDGE_MAX_UPLOAD_BYTES);
}

function extensionFor(filePath) {
  return extname(basename(filePath)).replace(/^\./u, "").toLowerCase();
}

export function selectedFileMetadata(filePath, handleId, fileStat = {}) {
  const name = basename(filePath);
  const extension = extensionFor(filePath);
  return {
    handleId,
    name,
    extension,
    size: Number(fileStat.size ?? 0),
    mimeType: MIME_TYPES_BY_EXTENSION[extension] ?? "application/octet-stream",
    pathVisibleToRenderer: false
  };
}

function statSignature(fileStat) {
  return Object.freeze({
    size: Number(fileStat.size),
    mtimeMs: Number(fileStat.mtimeMs),
    dev: String(fileStat.dev ?? ""),
    ino: String(fileStat.ino ?? "")
  });
}

function statMatches(left, right) {
  return left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.dev === right.dev &&
    left.ino === right.ino;
}

async function inspectSelectedFile({ filePath, maxUploadBytes, lstatImpl }) {
  if (typeof filePath !== "string" || !isAbsolute(filePath)) {
    throw new FileBridgeError("INVALID_SELECTED_FILE", "Native picker returned an invalid file selection");
  }
  let fileStat;
  try {
    fileStat = await lstatImpl(filePath);
  } catch {
    throw new FileBridgeError("SELECTED_FILE_UNAVAILABLE", "Selected file is no longer available");
  }
  if (fileStat?.isSymbolicLink?.() === true || fileStat?.isFile?.() !== true) {
    throw new FileBridgeError("SELECTED_FILE_TYPE_NOT_ALLOWED", "Selected path must be a regular non-symbolic-link file");
  }
  const size = Number(fileStat.size);
  if (!Number.isSafeInteger(size) || size < 0) {
    throw new FileBridgeError("SELECTED_FILE_INVALID_SIZE", "Selected file size is invalid");
  }
  if (size > maxUploadBytes) {
    throw new FileBridgeError("SELECTED_FILE_TOO_LARGE", "Selected file exceeds the allowed upload size");
  }
  return { fileStat, signature: statSignature(fileStat) };
}

async function runPermissionPrecheck({ permissionClient, actionId, request }) {
  const auditMap = FILE_BRIDGE_AUDIT_MAP[actionId];
  if (!auditMap) throw new FileBridgeError("UNKNOWN_FILE_BRIDGE_ACTION", `Unknown file bridge action: ${actionId}`);
  const payload = {
    actionId,
    permission: auditMap.permission,
    matterId: request.matterId,
    workspaceId: request.workspaceId,
    folderId: request.folderId,
    documentId: request.documentId
  };
  if (request.exactVersion != null) payload.exactVersion = request.exactVersion;
  const result = await permissionClient.precheckFileBridgeAction(payload);
  if (result?.allowed !== true) {
    throw new FileBridgeError("PERMISSION_DENIED", result?.reason ?? "File bridge permission precheck denied");
  }
  return result;
}

async function recordAuditEvent({ auditLogger, actionId, eventName, payload = {} }) {
  await auditLogger.record({ actionId, eventName, ...payload });
}

function rendererBytesForbiddenError(field) {
  return new FileBridgeError(
    "RENDERER_FILE_BYTES_FORBIDDEN",
    `Renderer-supplied document bytes are forbidden on the file bridge: ${field}`
  );
}

function assertSaveDocumentProvider(documentProvider) {
  if (!documentProvider
      || typeof documentProvider.fetchDocumentForSave !== "function"
      || typeof documentProvider.completeDocumentSave !== "function") {
    throw new FileBridgeError("DOCUMENT_PROVIDER_MISSING", "Save-as requires a main-process document provider adapter");
  }
}

function documentBytesFromProviderResponse(response) {
  const documentBytes = response?.bytes ?? response;
  if (
    !(documentBytes instanceof ArrayBuffer) &&
    !ArrayBuffer.isView(documentBytes)
  ) {
    throw new FileBridgeError("DOCUMENT_BYTES_MISSING", "Document provider did not return writable document bytes");
  }
  return documentBytes;
}

function exactVersionBinding(request = {}) {
  const exact = Object.freeze({
    document_id: assertBindingId(request.documentId, "documentId", { required: true }),
    version_id: assertBindingId(request.versionId, "versionId", { required: true }),
    file_object_id: assertBindingId(request.fileObjectId, "fileObjectId", { required: true }),
    sha256: request.sha256,
    byte_size: Number(request.byteSize),
    mime_type: typeof request.mimeType === "string" ? request.mimeType.trim().toLowerCase() : "",
  });
  if (!SHA256.test(String(exact.sha256 ?? ""))
      || !Number.isSafeInteger(exact.byte_size)
      || exact.byte_size < 1
      || exact.byte_size > FILE_BRIDGE_MAX_DOWNLOAD_BYTES
      || !MIME_TYPE.test(exact.mime_type)) {
    throw new FileBridgeError("INVALID_EXACT_VERSION_BINDING", "Exact Vault version integrity is invalid");
  }
  return exact;
}

function sameExactVersion(left, right) {
  return [
    "document_id",
    "version_id",
    "file_object_id",
    "sha256",
    "byte_size",
    "mime_type",
  ].every((field) => left?.[field] === right?.[field]);
}

function normalizeDocumentProviderResponse(response, exactVersion) {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    throw new FileBridgeError("DOCUMENT_PROVIDER_RESPONSE_INVALID", "Document provider response is invalid");
  }
  const bytes = documentBytesFromProviderResponse(response);
  const byteSize = bytes instanceof ArrayBuffer ? bytes.byteLength : bytes.byteLength;
  if (!VAULT_OPERATION_ID.test(String(response.operationId ?? ""))
      || !sameExactVersion(response.exactVersion, exactVersion)
      || byteSize !== exactVersion.byte_size) {
    throw new FileBridgeError("DOCUMENT_PROVIDER_BINDING_MISMATCH", "Document provider changed the exact Vault version binding");
  }
  const payload = bytes instanceof ArrayBuffer
    ? Buffer.from(bytes)
    : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sha256 = createHash("sha256").update(payload).digest("hex");
  if (sha256 !== exactVersion.sha256) {
    throw new FileBridgeError("DOCUMENT_PROVIDER_HASH_MISMATCH", "Document provider bytes do not match the exact Vault version hash");
  }
  return Object.freeze({ ...response, bytes });
}

export function createAtomicDocumentWriter({
  openImpl = open,
  renameImpl = rename,
  unlinkImpl = unlink,
  createTempName = () => `.amic-vault-${randomUUID()}.tmp`,
} = {}) {
  return Object.freeze({
    async writeUserSelectedFile({ filePath, bytes } = {}) {
      if (typeof filePath !== "string" || !isAbsolute(filePath)) {
        throw new FileBridgeError("INVALID_SAVE_DESTINATION", "Save destination must be absolute");
      }
      const payload = bytes instanceof ArrayBuffer
        ? Buffer.from(bytes)
        : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      if (payload.byteLength < 1 || payload.byteLength > FILE_BRIDGE_MAX_DOWNLOAD_BYTES) {
        throw new FileBridgeError("DOCUMENT_BYTES_INVALID", "Document bytes exceed the save boundary");
      }
      const tempPath = join(dirname(filePath), createTempName());
      let handle = null;
      try {
        handle = await openImpl(tempPath, "wx", 0o600);
        await handle.writeFile(payload);
        await handle.sync?.();
        await handle.close();
        handle = null;
        await renameImpl(tempPath, filePath);
      } catch (error) {
        try { await handle?.close?.(); } catch { /* best-effort temp handle close */ }
        try { await unlinkImpl(tempPath); } catch { /* temp may not exist or may already be renamed */ }
        throw new FileBridgeError("DOCUMENT_WRITE_FAILED", error?.code ?? "Document save failed");
      }
      return Object.freeze({ written: true, byteSize: payload.byteLength });
    },
  });
}

function safeUploadReceipt(response = {}) {
  const source = response && typeof response === "object" && !Array.isArray(response) ? response : {};
  const state = new Set(["uploaded", "processing", "retryable"]).has(source.state)
    ? source.state
    : "uploaded";
  const receipt = { state };
  const safeFields = [
    "requestId",
    "operationId",
    "matterId",
    "documentId",
    "versionId",
    "fileObjectId",
    "sha256",
    "byteSize",
    "mimeType",
    "auditEventId",
    "stage",
    "retryAfterMs",
    "safeErrorCode",
    "exactReadbackVerified"
  ];
  for (const field of safeFields) {
    const value = source[field];
    if (typeof value === "string"
        || (["byteSize", "retryAfterMs"].includes(field) && Number.isSafeInteger(value))
        || (field === "exactReadbackVerified" && typeof value === "boolean")) receipt[field] = value;
  }
  receipt.pathVisibleToRenderer = false;
  receipt.rawBytesIncluded = false;
  receipt.filenameIncluded = false;
  return receipt;
}

export function createFileBridgeController(options = {}) {
  const {
    dialog,
    auditLogger = { async record() {} },
    documentWriter = createAtomicDocumentWriter(),
    documentProvider = null,
    classicOutlookBridge = null,
    previewManager = null,
    uploadProvider = null,
    createHandleId = () => `file-handle-${randomUUID()}`,
    createPreflightId = () => `file-preflight-${randomUUID()}`,
    pickerOptions = { properties: ["openFile"] },
    lstatImpl = lstat,
    openImpl = open,
    now = Date.now,
    setTimeoutImpl = setTimeout,
    clearTimeoutImpl = clearTimeout,
    preflightTtlMs = FILE_BRIDGE_PREFLIGHT_TTL_MS,
    handleTtlMs = FILE_BRIDGE_HANDLE_TTL_MS
  } = options;
  const permissionClientConfigured = Boolean(options.permissionClient?.precheckFileBridgeAction);
  const permissionClient = options.permissionClient ?? {
    async precheckFileBridgeAction() {
      return { allowed: false, reason: "permission_client_missing" };
    }
  };
  const uploadProviderConfigured = Boolean(uploadProvider?.uploadSelectedFile);
  const documentProviderConfigured = Boolean(
    documentProvider?.fetchDocumentForSave
    && documentProvider?.completeDocumentSave,
  );
  const previewManagerConfigured = Boolean(
    previewManager?.stageTempPreview
    && previewManager?.openStagedPreview
    && previewManager?.removeTempPreview,
  );
  const classicOutlookBridgeConfigured = Boolean(
    classicOutlookBridge?.claimRequest
    && classicOutlookBridge?.releaseClaim
    && classicOutlookBridge?.deliverClaim,
  );

  if (!dialog) throw new Error("File bridge requires an Electron dialog adapter");
  if (!Number.isSafeInteger(preflightTtlMs) || preflightTtlMs <= 0 || preflightTtlMs > FILE_BRIDGE_PREFLIGHT_TTL_MS) {
    throw new Error("File bridge preflight TTL must be positive and no greater than 60 seconds");
  }
  if (!Number.isSafeInteger(handleTtlMs) || handleTtlMs <= 0 || handleTtlMs > FILE_BRIDGE_HANDLE_TTL_MS) {
    throw new Error("File bridge handle TTL must be positive and no greater than 5 minutes");
  }

  const preflights = new Map();
  const selectedHandles = new Map();
  const uploadFlights = new Map();
  let disposed = false;

  function assertActive() {
    if (disposed) throw new FileBridgeError("FILE_BRIDGE_DISPOSED", "File bridge is no longer available");
  }

  function clearMapEntry(map, key) {
    const entry = map.get(key);
    if (!entry) return false;
    if (entry.expiryTimer) clearTimeoutImpl(entry.expiryTimer);
    map.delete(key);
    return true;
  }

  function setExpiringEntry(map, key, entry, ttlMs) {
    const expiresAt = now() + ttlMs;
    const expiryTimer = setTimeoutImpl(() => clearMapEntry(map, key), ttlMs);
    expiryTimer?.unref?.();
    map.set(key, { ...entry, expiresAt, expiryTimer });
    return expiresAt;
  }

  function ownedEntry(map, key, ownerId, kind) {
    const entry = map.get(key);
    if (!entry) throw new FileBridgeError(`${kind}_NOT_AVAILABLE`, `${kind.toLowerCase()} is not available`);
    if (now() >= entry.expiresAt) {
      clearMapEntry(map, key);
      throw new FileBridgeError(`${kind}_EXPIRED`, `${kind.toLowerCase()} expired`);
    }
    if (entry.ownerId !== ownerId) {
      throw new FileBridgeError(`${kind}_OWNER_MISMATCH`, `${kind.toLowerCase()} belongs to a different renderer`);
    }
    return entry;
  }

  async function precheckUpload(request = {}, owner = {}) {
    assertActive();
    assertNoRendererDocumentBytes(request, rendererBytesForbiddenError);
    assertRendererAuthorityNotSupplied(request);
    const ownerId = ownerIdFrom(owner);
    const binding = {
      matterId: assertBindingId(request.matterId, "matterId", { required: true }),
      workspaceId: assertBindingId(request.workspaceId, "workspaceId"),
      folderId: assertBindingId(request.folderId, "folderId")
    };
    let decision;
    try {
      decision = await runPermissionPrecheck({
        permissionClient,
        actionId: "precheck_file_upload",
        request: binding
      });
    } catch (error) {
      await recordAuditEvent({
        auditLogger,
        actionId: "precheck_file_upload",
        eventName: FILE_BRIDGE_AUDIT_MAP.precheck_file_upload.auditEvents.precheckDenied,
        payload: { reason: error.code ?? "unknown" }
      });
      throw error;
    }
    const preflightId = createPreflightId();
    const maxUploadBytes = normalizeUploadLimit(decision.maxUploadBytes);
    const operationId = assertBindingId(decision.operationId, "operationId", { required: true });
    const expiresAt = setExpiringEntry(preflights, preflightId, {
      ownerId,
      binding,
      operationId,
      maxUploadBytes
    }, preflightTtlMs);
    await recordAuditEvent({
      auditLogger,
      actionId: "precheck_file_upload",
      eventName: FILE_BRIDGE_AUDIT_MAP.precheck_file_upload.auditEvents.precheckAllowed,
      payload: { preflightId, operationId }
    });
    return {
      state: "allowed",
      preflightId,
      expiresAt,
      maxUploadBytes,
      authorizationSource: "server",
      pathVisibleToRenderer: false
    };
  }

  async function chooseFileForUpload(request = {}, owner = {}) {
    assertActive();
    assertNoRendererDocumentBytes(request, rendererBytesForbiddenError);
    assertRendererAuthorityNotSupplied(request);
    assertUserActivation(request);
    if (typeof dialog.showOpenDialog !== "function") {
      throw new FileBridgeError("NATIVE_PICKER_UNAVAILABLE", "Native file picker is unavailable");
    }
    const ownerId = ownerIdFrom(owner);
    const preflightId = assertBindingId(request.preflightId, "preflightId", { required: true });
    const preflight = ownedEntry(preflights, preflightId, ownerId, "PREFLIGHT");
    clearMapEntry(preflights, preflightId);
    const result = await dialog.showOpenDialog({ ...pickerOptions, properties: ["openFile"] });
    if (result.canceled || !Array.isArray(result.filePaths) || result.filePaths.length === 0) {
      await recordAuditEvent({
        auditLogger,
        actionId: "choose_file_for_upload",
        eventName: FILE_BRIDGE_AUDIT_MAP.choose_file_for_upload.auditEvents.pickerCancelled,
        payload: { preflightId }
      });
      return { state: "cancelled" };
    }

    const filePath = result.filePaths[0];
    let inspected;
    try {
      inspected = await inspectSelectedFile({
        filePath,
        maxUploadBytes: preflight.maxUploadBytes,
        lstatImpl
      });
    } catch (error) {
      await recordAuditEvent({
        auditLogger,
        actionId: "choose_file_for_upload",
        eventName: FILE_BRIDGE_AUDIT_MAP.choose_file_for_upload.auditEvents.selectionRejected,
        payload: { reason: error.code ?? "unknown", preflightId }
      });
      throw error;
    }
    const handleId = createHandleId();
    const metadata = selectedFileMetadata(filePath, handleId, inspected.fileStat);
    const expiresAt = setExpiringEntry(selectedHandles, handleId, {
      ownerId,
      filePath,
      metadata,
      signature: inspected.signature,
      binding: preflight.binding,
      preflightId,
      operationId: preflight.operationId,
      maxUploadBytes: preflight.maxUploadBytes
    }, handleTtlMs);
    await recordAuditEvent({
      auditLogger,
      actionId: "choose_file_for_upload",
      eventName: FILE_BRIDGE_AUDIT_MAP.choose_file_for_upload.auditEvents.pickerSelected,
      payload: { handleId, preflightId, byteSize: metadata.size }
    });
    return {
      state: "selected",
      file: metadata,
      expiresAt,
      backendUpload: {
        actionId: "upload_selected_file",
        handleId,
        preflightId,
        pathVisibleToRenderer: false
      }
    };
  }

  async function cancelUpload(request = {}, owner = {}) {
    assertActive();
    assertNoRendererDocumentBytes(request, rendererBytesForbiddenError);
    assertRendererAuthorityNotSupplied(request);
    const ownerId = ownerIdFrom(owner);
    const handleId = assertBindingId(request.handleId, "handleId", { required: true });
    ownedEntry(selectedHandles, handleId, ownerId, "HANDLE");
    if (uploadFlights.has(handleId)) {
      throw new FileBridgeError("HANDLE_IN_FLIGHT", "handle upload is already in progress");
    }
    clearMapEntry(selectedHandles, handleId);
    await recordAuditEvent({
      auditLogger,
      actionId: "cancel_file_upload",
      eventName: FILE_BRIDGE_AUDIT_MAP.cancel_file_upload.auditEvents.cancelled,
      payload: { handleId }
    });
    return { state: "cancelled", handleId, userFileDeleted: false };
  }

  async function uploadSelectedFile(request = {}, owner = {}) {
    assertActive();
    assertNoRendererDocumentBytes(request, rendererBytesForbiddenError);
    assertRendererAuthorityNotSupplied(request);
    const ownerId = ownerIdFrom(owner);
    const handleId = assertBindingId(request.handleId, "handleId", { required: true });
    const selected = ownedEntry(selectedHandles, handleId, ownerId, "HANDLE");
    if (!uploadProviderConfigured) {
      throw new FileBridgeError("UPLOAD_PROVIDER_UNAVAILABLE", "Vault upload provider is not available");
    }

    const current = uploadFlights.get(handleId);
    if (current) {
      if (current.ownerId !== ownerId) {
        throw new FileBridgeError("HANDLE_OWNER_MISMATCH", "handle belongs to a different renderer");
      }
      return current.promise;
    }
    const promise = performSelectedFileUpload({ handleId, selected });
    const flight = Object.freeze({ ownerId, promise });
    uploadFlights.set(handleId, flight);
    void promise.finally(() => {
      if (uploadFlights.get(handleId) === flight) uploadFlights.delete(handleId);
    }).catch(() => undefined);
    return promise;
  }

  async function performSelectedFileUpload({ handleId, selected }) {
    let openedFile;
    let stream;
    try {
      const inspected = await inspectSelectedFile({
        filePath: selected.filePath,
        maxUploadBytes: selected.maxUploadBytes,
        lstatImpl
      });
      if (!statMatches(selected.signature, inspected.signature)) {
        throw new FileBridgeError("SELECTED_FILE_CHANGED", "Selected file changed after approval");
      }
      openedFile = await openImpl(selected.filePath, "r");
      const openedStat = await openedFile.stat();
      if (openedStat?.isFile?.() !== true || !statMatches(selected.signature, statSignature(openedStat))) {
        throw new FileBridgeError("SELECTED_FILE_CHANGED", "Selected file changed after approval");
      }
      const assertUnchanged = async () => {
        const currentStat = await openedFile.stat();
        if (currentStat?.isFile?.() !== true || !statMatches(selected.signature, statSignature(currentStat))) {
          throw new FileBridgeError("SELECTED_FILE_CHANGED", "Selected file changed after approval");
        }
      };
      const openStream = async () => {
        let streamFile = await openImpl(selected.filePath, "r");
        try {
          const streamStat = await streamFile.stat();
          if (streamStat?.isFile?.() !== true || !statMatches(selected.signature, statSignature(streamStat))) {
            throw new FileBridgeError("SELECTED_FILE_CHANGED", "Selected file changed after approval");
          }
          const reopenedStream = streamFile.createReadStream({ autoClose: true, start: 0 });
          streamFile = null;
          return reopenedStream;
        } finally {
          try { await streamFile?.close?.(); } catch { /* best-effort rejected stream handle close */ }
        }
      };
      stream = await openStream();
      await recordAuditEvent({
        auditLogger,
        actionId: "upload_selected_file",
        eventName: FILE_BRIDGE_AUDIT_MAP.upload_selected_file.auditEvents.started,
        payload: { handleId, preflightId: selected.preflightId }
      });
      const response = await uploadProvider.uploadSelectedFile({
        stream,
        openStream,
        assertUnchanged,
        file: { ...selected.metadata },
        matterId: selected.binding.matterId,
        workspaceId: selected.binding.workspaceId,
        folderId: selected.binding.folderId,
        preflightId: selected.preflightId,
        operationId: selected.operationId
      });
      const receipt = safeUploadReceipt(response);
      clearMapEntry(selectedHandles, handleId);
      await recordAuditEvent({
        auditLogger,
        actionId: "upload_selected_file",
        eventName: FILE_BRIDGE_AUDIT_MAP.upload_selected_file.auditEvents.completed,
        payload: {
          handleId,
          documentId: receipt.documentId ?? null,
          versionId: receipt.versionId ?? null,
          sha256: receipt.sha256 ?? null
        }
      });
      return receipt;
    } catch (error) {
      if (["SELECTED_FILE_UNAVAILABLE", "SELECTED_FILE_TYPE_NOT_ALLOWED", "SELECTED_FILE_CHANGED"].includes(error.code)) {
        clearMapEntry(selectedHandles, handleId);
      }
      await recordAuditEvent({
        auditLogger,
        actionId: "upload_selected_file",
        eventName: FILE_BRIDGE_AUDIT_MAP.upload_selected_file.auditEvents.failed,
        payload: { handleId, reason: error.code ?? "upload_failed" }
      });
      throw error;
    } finally {
      stream?.destroy?.();
      if (openedFile?.close) {
        try {
          await openedFile.close();
        } catch {
          // The stream may have already closed the descriptor; no user file is mutated.
        }
      }
    }
  }

  async function resumePendingUploads(request = {}, owner = {}) {
    assertActive();
    assertNoRendererDocumentBytes(request, rendererBytesForbiddenError);
    assertRendererAuthorityNotSupplied(request);
    ownerIdFrom(owner);
    if (Object.keys(request).length !== 0) {
      throw new FileBridgeError("RESUME_REQUEST_INVALID", "Vault upload resume does not accept renderer state");
    }
    if (typeof uploadProvider?.resumePendingUploads !== "function") {
      throw new FileBridgeError("UPLOAD_PROVIDER_UNAVAILABLE", "Vault upload resume provider is not available");
    }
    await recordAuditEvent({
      auditLogger,
      actionId: "resume_pending_uploads",
      eventName: FILE_BRIDGE_AUDIT_MAP.resume_pending_uploads.auditEvents.started,
    });
    try {
      const results = await uploadProvider.resumePendingUploads();
      if (!Array.isArray(results) || results.length > 32) {
        throw new FileBridgeError("UPLOAD_RESUME_RESPONSE_INVALID", "Vault upload resume response is invalid");
      }
      const receipts = Object.freeze(results.map(safeUploadReceipt));
      await recordAuditEvent({
        auditLogger,
        actionId: "resume_pending_uploads",
        eventName: FILE_BRIDGE_AUDIT_MAP.resume_pending_uploads.auditEvents.completed,
        payload: {
          operationIds: receipts.map((receipt) => receipt.operationId ?? null),
          states: receipts.map((receipt) => receipt.state),
        },
      });
      return receipts;
    } catch (error) {
      await recordAuditEvent({
        auditLogger,
        actionId: "resume_pending_uploads",
        eventName: FILE_BRIDGE_AUDIT_MAP.resume_pending_uploads.auditEvents.failed,
        payload: { reason: error.code ?? "resume_failed" },
      });
      throw error;
    }
  }

  async function saveDocumentAs(request = {}, owner = {}) {
    assertActive();
    ownerIdFrom(owner);
    assertNoRendererDocumentBytes(request, rendererBytesForbiddenError);
    assertRendererAuthorityNotSupplied(request);
    assertUserActivation(request);
    if (typeof dialog.showSaveDialog !== "function") {
      throw new FileBridgeError("NATIVE_SAVE_DIALOG_UNAVAILABLE", "Native save dialog is unavailable");
    }
    assertSaveDocumentProvider(documentProvider);
    const exactVersion = exactVersionBinding(request);
    const binding = {
      matterId: assertBindingId(request.matterId, "matterId", { required: true }),
      documentId: exactVersion.document_id,
      exactVersion,
    };
    let precheck;
    try {
      precheck = await runPermissionPrecheck({
        permissionClient,
        actionId: "save_document_as",
        request: binding
      });
    } catch (error) {
      await recordAuditEvent({
        auditLogger,
        actionId: "save_document_as",
        eventName: FILE_BRIDGE_AUDIT_MAP.save_document_as.auditEvents.precheckDenied,
        payload: { reason: error.code ?? "unknown" }
      });
      throw error;
    }
    await recordAuditEvent({
      auditLogger,
      actionId: "save_document_as",
      eventName: FILE_BRIDGE_AUDIT_MAP.save_document_as.auditEvents.precheckAllowed,
      payload: { decisionId: precheck.decisionId ?? null }
    });
    const result = await dialog.showSaveDialog({
      title: typeof request.title === "string" ? request.title.slice(0, 120) : "Save Vault document",
      defaultPath: typeof request.suggestedName === "string" ? basename(request.suggestedName) : "vault-document"
    });
    if (result.canceled || !result.filePath) return { state: "cancelled" };
    if (!isAbsolute(result.filePath)) {
      throw new FileBridgeError("INVALID_SAVE_DESTINATION", "Native save dialog returned an invalid destination");
    }
    await recordAuditEvent({
      auditLogger,
      actionId: "save_document_as",
      eventName: FILE_BRIDGE_AUDIT_MAP.save_document_as.auditEvents.saveDialogOpened,
      payload: { decisionId: precheck.decisionId ?? null }
    });
    let providerResponse = null;
    try {
      providerResponse = normalizeDocumentProviderResponse(
        await documentProvider.fetchDocumentForSave({
          actionId: "save_document_as",
          documentId: binding.documentId,
          matterId: binding.matterId,
          exactVersion: binding.exactVersion,
          permissionDecisionId: precheck.decisionId ?? null
        }),
        binding.exactVersion,
      );
      await documentWriter.writeUserSelectedFile({
        filePath: result.filePath,
        documentId: binding.documentId,
        bytes: providerResponse.bytes
      });
      await documentProvider.completeDocumentSave({
        actionId: "save_document_as",
        operationId: providerResponse.operationId,
        documentId: binding.documentId,
        matterId: binding.matterId,
        exactVersion: binding.exactVersion,
        permissionDecisionId: precheck.decisionId ?? null
      });
    } catch (error) {
      await recordAuditEvent({
        auditLogger,
        actionId: "save_document_as",
        eventName: FILE_BRIDGE_AUDIT_MAP.save_document_as.auditEvents.saveFailed,
        payload: {
          operationId: providerResponse?.operationId ?? null,
          reason: error.code ?? "save_failed",
        },
      });
      throw error;
    }
    await recordAuditEvent({
      auditLogger,
      actionId: "save_document_as",
      eventName: FILE_BRIDGE_AUDIT_MAP.save_document_as.auditEvents.saveCompleted,
      payload: { decisionId: precheck.decisionId ?? null }
    });
    return {
      state: "saved",
      file: selectedFileMetadata(result.filePath, binding.documentId, {
        size: binding.exactVersion.byte_size,
      }),
      backendDownload: {
        actionId: "save_document_as",
        documentId: binding.documentId,
        versionId: binding.exactVersion.version_id,
        fileObjectId: binding.exactVersion.file_object_id,
        sha256: binding.exactVersion.sha256,
        byteSize: binding.exactVersion.byte_size,
        mimeType: binding.exactVersion.mime_type,
        pathVisibleToRenderer: false
      }
    };
  }

  async function openDocumentPreview(request = {}, owner = {}) {
    assertActive();
    const ownerId = ownerIdFrom(owner);
    assertNoRendererDocumentBytes(request, rendererBytesForbiddenError);
    assertRendererAuthorityNotSupplied(request);
    assertUserActivation(request);
    assertSaveDocumentProvider(documentProvider);
    if (!previewManagerConfigured) {
      throw new FileBridgeError("TEMP_PREVIEW_UNAVAILABLE", "Protected temp preview is unavailable");
    }
    const exactVersion = exactVersionBinding(request);
    const binding = {
      matterId: assertBindingId(request.matterId, "matterId", { required: true }),
      documentId: exactVersion.document_id,
      exactVersion,
    };
    let precheck;
    try {
      precheck = await runPermissionPrecheck({
        permissionClient,
        actionId: "open_temp_preview",
        request: binding,
      });
    } catch (error) {
      await recordAuditEvent({
        auditLogger,
        actionId: "open_temp_preview",
        eventName: FILE_BRIDGE_AUDIT_MAP.open_temp_preview.auditEvents.precheckDenied,
        payload: { reason: error.code ?? "unknown" },
      });
      throw error;
    }
    await recordAuditEvent({
      auditLogger,
      actionId: "open_temp_preview",
      eventName: FILE_BRIDGE_AUDIT_MAP.open_temp_preview.auditEvents.precheckAllowed,
      payload: { decisionId: precheck.decisionId ?? null },
    });

    let providerResponse = null;
    let stagedPreview = null;
    try {
      providerResponse = normalizeDocumentProviderResponse(
        await documentProvider.fetchDocumentForSave({
          actionId: "open_temp_preview",
          documentId: binding.documentId,
          matterId: binding.matterId,
          exactVersion: binding.exactVersion,
          permissionDecisionId: precheck.decisionId ?? null,
        }),
        binding.exactVersion,
      );
      stagedPreview = await previewManager.stageTempPreview({
        bytes: providerResponse.bytes,
        name: typeof request.suggestedName === "string"
          ? basename(request.suggestedName)
          : providerResponse.attachmentName,
        ownerId,
        documentId: binding.documentId,
        versionId: binding.exactVersion.version_id,
        mimeType: binding.exactVersion.mime_type,
      });
      const openedPreview = await previewManager.openStagedPreview({
        tempId: stagedPreview.tempId,
        ownerId,
      });
      await documentProvider.completeDocumentSave({
        actionId: "open_temp_preview",
        operationId: providerResponse.operationId,
        documentId: binding.documentId,
        matterId: binding.matterId,
        exactVersion: binding.exactVersion,
        permissionDecisionId: precheck.decisionId ?? null,
      });
      await recordAuditEvent({
        auditLogger,
        actionId: "open_temp_preview",
        eventName: FILE_BRIDGE_AUDIT_MAP.open_temp_preview.auditEvents.previewOpened,
        payload: {
          decisionId: precheck.decisionId ?? null,
          operationId: providerResponse.operationId,
          documentId: binding.documentId,
          versionId: binding.exactVersion.version_id,
        },
      });
      return Object.freeze({
        state: "opened",
        preview: openedPreview,
        backendDownload: {
          actionId: "open_temp_preview",
          documentId: binding.documentId,
          versionId: binding.exactVersion.version_id,
          fileObjectId: binding.exactVersion.file_object_id,
          sha256: binding.exactVersion.sha256,
          byteSize: binding.exactVersion.byte_size,
          mimeType: binding.exactVersion.mime_type,
          pathVisibleToRenderer: false,
        },
      });
    } catch (error) {
      if (stagedPreview?.tempId) {
        try {
          await previewManager.removeTempPreview({
            tempId: stagedPreview.tempId,
            reason: "preview_failed",
          });
        } catch {
          // App quit and explicit session cleanup still clear the owned preview root.
        }
      }
      await recordAuditEvent({
        auditLogger,
        actionId: "open_temp_preview",
        eventName: FILE_BRIDGE_AUDIT_MAP.open_temp_preview.auditEvents.previewFailed,
        payload: {
          operationId: providerResponse?.operationId ?? null,
          reason: error.code ?? "preview_failed",
        },
      });
      throw error;
    }
  }

  async function attachDocumentToClassicOutlook(request = {}, owner = {}) {
    assertActive();
    ownerIdFrom(owner);
    assertNoRendererDocumentBytes(request, rendererBytesForbiddenError);
    assertRendererAuthorityNotSupplied(request);
    assertUserActivation(request);
    assertSaveDocumentProvider(documentProvider);
    if (!classicOutlookBridgeConfigured) {
      throw new FileBridgeError(
        "CLASSIC_OUTLOOK_BRIDGE_UNAVAILABLE",
        "Classic Outlook attachment bridge is unavailable",
      );
    }
    const requestHandle = assertBindingId(request.requestHandle, "requestHandle", { required: true });
    const exactVersion = exactVersionBinding(request);
    const binding = {
      matterId: assertBindingId(request.matterId, "matterId", { required: true }),
      documentId: exactVersion.document_id,
      exactVersion,
    };
    let precheck;
    try {
      precheck = await runPermissionPrecheck({
        permissionClient,
        actionId: "attach_document_to_classic_outlook",
        request: binding,
      });
    } catch (error) {
      await recordAuditEvent({
        auditLogger,
        actionId: "attach_document_to_classic_outlook",
        eventName: FILE_BRIDGE_AUDIT_MAP.attach_document_to_classic_outlook.auditEvents.precheckDenied,
        payload: { reason: error.code ?? "unknown" },
      });
      throw error;
    }
    await recordAuditEvent({
      auditLogger,
      actionId: "attach_document_to_classic_outlook",
      eventName: FILE_BRIDGE_AUDIT_MAP.attach_document_to_classic_outlook.auditEvents.precheckAllowed,
      payload: { decisionId: precheck.decisionId ?? null },
    });

    let claim = null;
    let providerResponse = null;
    let deliveryStarted = false;
    try {
      claim = classicOutlookBridge.claimRequest(requestHandle);
      await recordAuditEvent({
        auditLogger,
        actionId: "attach_document_to_classic_outlook",
        eventName: FILE_BRIDGE_AUDIT_MAP.attach_document_to_classic_outlook.auditEvents.attachStarted,
        payload: {
          documentId: binding.documentId,
          versionId: binding.exactVersion.version_id,
        },
      });
      providerResponse = normalizeDocumentProviderResponse(
        await documentProvider.fetchDocumentForSave({
          actionId: "attach_document_to_classic_outlook",
          operationKind: "attach_outlook",
          documentId: binding.documentId,
          matterId: binding.matterId,
          exactVersion: binding.exactVersion,
          installationRefSha256: claim.installationRefSha256,
          composeTargetSha256: claim.composeTargetSha256,
          requestNonceSha256: claim.nonceSha256,
          permissionDecisionId: precheck.decisionId ?? null,
        }),
        binding.exactVersion,
      );
      deliveryStarted = true;
      const hostReceipt = await classicOutlookBridge.deliverClaim(claim, {
        attachmentName: providerResponse.attachmentName,
        exactVersion: binding.exactVersion,
        bytes: Buffer.isBuffer(providerResponse.bytes)
          ? providerResponse.bytes
          : Buffer.from(
            providerResponse.bytes.buffer,
            providerResponse.bytes.byteOffset,
            providerResponse.bytes.byteLength,
          ),
      });
      if (hostReceipt?.state !== "attached"
          || hostReceipt.sha256 !== binding.exactVersion.sha256
          || hostReceipt.byteSize !== binding.exactVersion.byte_size) {
        throw new FileBridgeError(
          "CLASSIC_OUTLOOK_HOST_ACK_INVALID",
          "Classic Outlook host acknowledgement changed the exact version binding",
        );
      }
      await documentProvider.completeDocumentSave({
        actionId: "attach_document_to_classic_outlook",
        operationKind: "attach_outlook",
        completionStage: "attached",
        operationId: providerResponse.operationId,
        documentId: binding.documentId,
        matterId: binding.matterId,
        exactVersion: binding.exactVersion,
        installationRefSha256: claim.installationRefSha256,
        composeTargetSha256: claim.composeTargetSha256,
        permissionDecisionId: precheck.decisionId ?? null,
      });
      await recordAuditEvent({
        auditLogger,
        actionId: "attach_document_to_classic_outlook",
        eventName: FILE_BRIDGE_AUDIT_MAP.attach_document_to_classic_outlook.auditEvents.attachCompleted,
        payload: {
          operationId: providerResponse.operationId,
          documentId: binding.documentId,
          versionId: binding.exactVersion.version_id,
          sha256: binding.exactVersion.sha256,
        },
      });
      return Object.freeze({
        state: "attached",
        operationId: providerResponse.operationId,
        documentId: binding.documentId,
        versionId: binding.exactVersion.version_id,
        sha256: binding.exactVersion.sha256,
        byteSize: binding.exactVersion.byte_size,
        pathVisibleToRenderer: false,
        rawBytesIncluded: false,
        tokenMaterialReturned: false,
      });
    } catch (error) {
      if (claim && !deliveryStarted) classicOutlookBridge.releaseClaim(claim);
      await recordAuditEvent({
        auditLogger,
        actionId: "attach_document_to_classic_outlook",
        eventName: FILE_BRIDGE_AUDIT_MAP.attach_document_to_classic_outlook.auditEvents.attachFailed,
        payload: {
          operationId: providerResponse?.operationId ?? null,
          reason: error.code ?? "outlook_attach_failed",
        },
      });
      throw error;
    }
  }

  return Object.freeze({
    status() {
      return Object.freeze({
        state: permissionClientConfigured ? "available" : "guarded",
        bridgeExposed: true,
        nativePickerAvailable: typeof dialog.showOpenDialog === "function",
        preflightAvailable: permissionClientConfigured,
        uploadAvailable: uploadProviderConfigured,
        uploadReady: permissionClientConfigured && uploadProviderConfigured,
        uploadResumeAvailable: typeof uploadProvider?.resumePendingUploads === "function",
        downloadAvailable: documentProviderConfigured,
        downloadReady: permissionClientConfigured && documentProviderConfigured,
        previewAvailable: previewManagerConfigured,
        previewReady: permissionClientConfigured && documentProviderConfigured && previewManagerConfigured,
        classicOutlookAttachAvailable: classicOutlookBridgeConfigured,
        classicOutlookAttachReady:
          permissionClientConfigured && documentProviderConfigured && classicOutlookBridgeConfigured,
        maxUploadBytes: FILE_BRIDGE_MAX_UPLOAD_BYTES,
        maxDownloadBytes: FILE_BRIDGE_MAX_DOWNLOAD_BYTES,
        preflightTtlMs,
        handleTtlMs,
        pathVisibleToRenderer: false,
        fileBytesVisibleToRenderer: false
      });
    },
    precheckUpload,
    chooseFileForUpload,
    cancelUpload,
    uploadSelectedFile,
    resumePendingUploads,
    saveDocumentAs,
    openDocumentPreview,
    attachDocumentToClassicOutlook,
    lifecycleSnapshotForTest() {
      return Object.freeze({
        preflightCount: preflights.size,
        selectedHandleCount: selectedHandles.size,
        uploadFlightCount: uploadFlights.size,
        disposed,
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const key of [...preflights.keys()]) clearMapEntry(preflights, key);
      for (const key of [...selectedHandles.keys()]) clearMapEntry(selectedHandles, key);
      uploadFlights.clear();
      previewManager?.dispose?.();
    }
  });
}

function ownerForIpcEvent(event) {
  const webContentsId = event?.sender?.id;
  if (!Number.isSafeInteger(webContentsId) || webContentsId <= 0) {
    throw new FileBridgeError("FILE_BRIDGE_OWNER_REQUIRED", "File bridge requires an identified renderer");
  }
  const frameId = Number.isSafeInteger(event?.senderFrame?.routingId) ? event.senderFrame.routingId : 0;
  return { ownerId: `web-contents:${webContentsId}:frame:${frameId}` };
}

export function registerFileBridgeIpcHandlers({ ipcMain, controller, isTrustedSender }) {
  if (!ipcMain?.handle) throw new Error("ipcMain.handle is required for file bridge IPC registration");
  if (!controller) throw new Error("file bridge controller is required for IPC registration");
  const routes = [
    [FILE_BRIDGE_CHANNELS.status, (_request, owner) => controller.status(owner)],
    [FILE_BRIDGE_CHANNELS.precheckUpload, (request, owner) => controller.precheckUpload(request, owner)],
    [FILE_BRIDGE_CHANNELS.chooseFileForUpload, (request, owner) => controller.chooseFileForUpload(request, owner)],
    [FILE_BRIDGE_CHANNELS.cancelUpload, (request, owner) => controller.cancelUpload(request, owner)],
    [FILE_BRIDGE_CHANNELS.uploadSelectedFile, (request, owner) => controller.uploadSelectedFile(request, owner)],
    [FILE_BRIDGE_CHANNELS.resumePendingUploads, (request, owner) => controller.resumePendingUploads(request, owner)],
    [FILE_BRIDGE_CHANNELS.saveDocumentAs, (request, owner) => controller.saveDocumentAs(request, owner)],
    [FILE_BRIDGE_CHANNELS.openDocumentPreview, (request, owner) => controller.openDocumentPreview(request, owner)],
    [FILE_BRIDGE_CHANNELS.attachDocumentToClassicOutlook,
      (request, owner) => controller.attachDocumentToClassicOutlook(request, owner)]
  ];
  const handlers = routes.map(([channel, route]) => [channel, async (event, request = {}) => {
    if (typeof isTrustedSender !== "function" || !isTrustedSender(event)) {
      throw new FileBridgeError("UNTRUSTED_RENDERER_IPC_SENDER", "Blocked untrusted desktop IPC sender");
    }
    return route(request, ownerForIpcEvent(event));
  }]);
  for (const [channel, handler] of handlers) ipcMain.handle(channel, handler);
  return Object.freeze({
    channels: Object.freeze(handlers.map(([channel]) => channel)),
    dispose() {
      if (!ipcMain.removeHandler) return;
      for (const [channel] of handlers) ipcMain.removeHandler(channel);
    }
  });
}
