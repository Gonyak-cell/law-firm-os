import { contextBridge, ipcRenderer } from "electron";

export const PRELOAD_CHANNEL_ALLOWLIST = Object.freeze({
  status: "session:status",
  claimLogoIntro: "session:logo-intro:claim",
  runtime: "session:runtime",
  accounts: "session:accounts",
  requestPasswordReset: "session:password-reset:request",
  latestResetEmail: "session:password-reset:latest-email",
  confirmPasswordReset: "session:password-reset:confirm",
  openOutlookAuthorization: "desktop:outlook-authorization:open",
  copyOutlookAuthorization: "desktop:outlook-authorization:copy",
  outlookLifecycleStatus: "desktop:outlook-lifecycle:status",
  retryOutlookLifecycle: "desktop:outlook-lifecycle:retry",
  confirmOutlookMicrosoft: "desktop:outlook-lifecycle:confirm-microsoft",
  disconnectOutlookDevice: "desktop:outlook-lifecycle:disconnect",
  login: "session:login",
  features: "session:features",
  smoke: "session:smoke",
  api: "session:api",
  logout: "session:logout"
});

export const FILE_BRIDGE_CHANNEL_ALLOWLIST = Object.freeze({
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

export const INTERNAL_UPDATE_CHANNEL_ALLOWLIST = Object.freeze({
  status: "internalUpdate:status",
  check: "internalUpdate:check",
  stage: "internalUpdate:stage",
  stageRollback: "internalUpdate:stage-rollback",
  open: "internalUpdate:open",
  discard: "internalUpdate:discard"
});

export const PRELOAD_EVENT_ALLOWLIST = Object.freeze({
  passwordResetDeepLink: "desktop:password-reset:confirm",
  outlookConnectionResult: "desktop:outlook-connection:result",
  classicOutlookAttachRequested: "desktop:classic-outlook-attach:requested"
});

const OUTLOOK_CONNECTION_RESULT_STATUSES = new Set([
  "connected",
  "expired",
  "session_required",
  "retryable",
  "error"
]);
const SAFE_OUTLOOK_RESULT_ID = /^[A-Za-z0-9._:-]{1,160}$/;
const SAFE_OUTLOOK_ERROR_CODE = /^[A-Z0-9_]{1,160}$/;
const SAFE_CLASSIC_OUTLOOK_REQUEST_HANDLE = /^classic-outlook-[a-f0-9]{32}$/;

function invokeAllowed(command, payload) {
  const channel = PRELOAD_CHANNEL_ALLOWLIST[command];
  if (!channel) throw new Error(`Blocked preload session command: ${command}`);
  return ipcRenderer.invoke(channel, payload);
}

function invokeFileBridge(command, payload) {
  const channel = FILE_BRIDGE_CHANNEL_ALLOWLIST[command];
  if (!channel) throw new Error(`Blocked preload file bridge command: ${command}`);
  return ipcRenderer.invoke(channel, payload);
}

function invokeInternalUpdate(command, payload) {
  const channel = INTERNAL_UPDATE_CHANNEL_ALLOWLIST[command];
  if (!channel) throw new Error(`Blocked preload internal update command: ${command}`);
  return ipcRenderer.invoke(channel, payload);
}

function assertNoRendererFileBytes(request = {}) {
  if (!request || typeof request !== "object") return;
  const forbidden = ["bytes", "fileBytes", "documentBytes", "content", "blob", "arrayBuffer"];
  const field = forbidden.find((candidate) => Object.prototype.hasOwnProperty.call(request, candidate));
  if (field) throw new Error(`Renderer-supplied document bytes are forbidden: ${field}`);
}

function pickFileBridgeFields(request = {}, fields = []) {
  assertNoRendererFileBytes(request);
  const safe = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(request, field) && request[field] !== undefined) {
      safe[field] = request[field];
    }
  }
  return safe;
}

function activeUserInteraction() {
  if (globalThis.navigator?.userActivation?.isActive !== true) {
    throw new Error("AMIC OS file action requires an active user interaction");
  }
  return { userActivation: true };
}

const pendingOutlookConnectionResults = [];
let outlookConnectionResultHandler = null;
const pendingClassicOutlookAttachRequests = [];
let classicOutlookAttachRequestHandler = null;

function safeOutlookConnectionResult(payload) {
  if (
    payload?.type !== "outlook_connection_result"
    || !OUTLOOK_CONNECTION_RESULT_STATUSES.has(payload.status)
    || !Number.isInteger(payload.http_status)
    || payload.http_status < 0
    || payload.http_status > 599
    || !(
      payload.safe_error_code === null
      || (typeof payload.safe_error_code === "string" && SAFE_OUTLOOK_ERROR_CODE.test(payload.safe_error_code))
    )
  ) return null;
  const result = {
    type: "outlook_connection_result",
    status: payload.status,
    http_status: payload.http_status,
    safe_error_code: payload.safe_error_code
  };
  for (const field of ["employee_id", "connection_state"]) {
    if (payload[field] === null) result[field] = null;
    else if (typeof payload[field] === "string" && SAFE_OUTLOOK_RESULT_ID.test(payload[field])) result[field] = payload[field];
  }
  return result;
}

function rememberOutlookConnectionResult(result) {
  if (pendingOutlookConnectionResults.length >= 32) pendingOutlookConnectionResults.shift();
  pendingOutlookConnectionResults.push(result);
}

ipcRenderer.on(PRELOAD_EVENT_ALLOWLIST.outlookConnectionResult, (_event, payload) => {
  const result = safeOutlookConnectionResult(payload);
  if (!result) return;
  if (!outlookConnectionResultHandler) {
    rememberOutlookConnectionResult(result);
    return;
  }
  try {
    outlookConnectionResultHandler(result);
  } catch {
    rememberOutlookConnectionResult(result);
  }
});

function safeClassicOutlookAttachRequest(payload) {
  if (payload?.type !== "classic_outlook_attach_request"
      || !SAFE_CLASSIC_OUTLOOK_REQUEST_HANDLE.test(payload.request_handle ?? "")
      || payload.source !== "classic_outlook_compose"
      || payload.exact_version_required !== true
      || payload.raw_path_included !== false
      || payload.raw_bytes_included !== false
      || payload.token_material_returned !== false
      || !Number.isFinite(Date.parse(payload.expires_at))) return null;
  return Object.freeze({
    type: payload.type,
    request_handle: payload.request_handle,
    expires_at: payload.expires_at,
    source: payload.source,
    exact_version_required: true,
    raw_path_included: false,
    raw_bytes_included: false,
    token_material_returned: false,
  });
}

ipcRenderer.on(PRELOAD_EVENT_ALLOWLIST.classicOutlookAttachRequested, (_event, payload) => {
  const request = safeClassicOutlookAttachRequest(payload);
  if (!request) return;
  if (!classicOutlookAttachRequestHandler) {
    if (pendingClassicOutlookAttachRequests.length >= 16) pendingClassicOutlookAttachRequests.shift();
    pendingClassicOutlookAttachRequests.push(request);
    return;
  }
  try {
    classicOutlookAttachRequestHandler(request);
  } catch {
    pendingClassicOutlookAttachRequests.push(request);
  }
});

function onAllowedEvent(eventName, handler) {
  const channel = PRELOAD_EVENT_ALLOWLIST[eventName];
  if (!channel) throw new Error(`Blocked preload session event: ${eventName}`);
  if (typeof handler !== "function") return () => {};
  if (eventName === "outlookConnectionResult") {
    outlookConnectionResultHandler = handler;
    while (pendingOutlookConnectionResults.length > 0) {
      const result = pendingOutlookConnectionResults.shift();
      try {
        handler(result);
      } catch {
        pendingOutlookConnectionResults.unshift(result);
        break;
      }
    }
    return () => {
      if (outlookConnectionResultHandler === handler) outlookConnectionResultHandler = null;
    };
  }
  if (eventName === "classicOutlookAttachRequested") {
    classicOutlookAttachRequestHandler = handler;
    while (pendingClassicOutlookAttachRequests.length > 0) {
      const request = pendingClassicOutlookAttachRequests.shift();
      try {
        handler(request);
      } catch {
        pendingClassicOutlookAttachRequests.unshift(request);
        break;
      }
    }
    return () => {
      if (classicOutlookAttachRequestHandler === handler) {
        classicOutlookAttachRequestHandler = null;
      }
    };
  }
  const listener = (_event, payload) => {
    if (payload?.type !== "password_reset_confirm" || typeof payload.token !== "string") return;
    handler({ type: "password_reset_confirm", routeOnly: true, token: payload.token });
  };
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

export const sessionApi = Object.freeze({
  desktopApiBaseUrl: process.env.MATTER_DESKTOP_API_BASE_URL ?? "",
  status: () => invokeAllowed("status"),
  claimLogoIntro: () => invokeAllowed("claimLogoIntro"),
  runtime: () => invokeAllowed("runtime"),
  accounts: () => invokeAllowed("accounts"),
  requestPasswordReset: (payload) => invokeAllowed("requestPasswordReset", payload),
  latestResetEmail: (payload) => invokeAllowed("latestResetEmail", payload),
  confirmPasswordReset: (payload) => invokeAllowed("confirmPasswordReset", payload),
  openOutlookAuthorization: (url) => invokeAllowed("openOutlookAuthorization", { url }),
  copyOutlookAuthorization: (url) => invokeAllowed("copyOutlookAuthorization", { url }),
  outlookLifecycleStatus: () => invokeAllowed("outlookLifecycleStatus"),
  retryOutlookLifecycle: () => invokeAllowed("retryOutlookLifecycle"),
  confirmOutlookMicrosoft: (url) => invokeAllowed("confirmOutlookMicrosoft", { url, confirmed: true }),
  disconnectOutlookDevice: () => invokeAllowed("disconnectOutlookDevice", { confirmed: true }),
  login: (payload) => invokeAllowed("login", payload),
  features: (payload) => invokeAllowed("features", payload),
  smoke: (payload) => invokeAllowed("smoke", payload),
  api: (payload) => invokeAllowed("api", payload),
  logout: () => invokeAllowed("logout"),
  onPasswordResetDeepLink: (handler) => onAllowedEvent("passwordResetDeepLink", handler),
  onOutlookConnectionResult: (handler) => onAllowedEvent("outlookConnectionResult", handler),
  onClassicOutlookAttachRequested: (handler) => onAllowedEvent(
    "classicOutlookAttachRequested",
    handler,
  )
});

export const fileBridgeApi = Object.freeze({
  status: () => invokeFileBridge("status"),
  precheckUpload: (request = {}) => invokeFileBridge(
    "precheckUpload",
    pickFileBridgeFields(request, ["matterId", "workspaceId", "folderId"])
  ),
  chooseFileForUpload: (preflightId) => invokeFileBridge("chooseFileForUpload", {
    preflightId,
    ...activeUserInteraction()
  }),
  cancelUpload: (handleId) => invokeFileBridge("cancelUpload", { handleId }),
  uploadSelectedFile: (handleId) => invokeFileBridge("uploadSelectedFile", { handleId }),
  resumePendingUploads: () => invokeFileBridge("resumePendingUploads", {}),
  saveDocumentAs: (request = {}) => invokeFileBridge("saveDocumentAs", {
    ...pickFileBridgeFields(request, [
      "matterId", "workspaceId", "documentId", "versionId", "fileObjectId", "sha256",
      "byteSize", "mimeType", "suggestedName", "title",
    ]),
    ...activeUserInteraction()
  }),
  openDocumentPreview: (request = {}) => invokeFileBridge("openDocumentPreview", {
    ...pickFileBridgeFields(request, [
      "matterId", "workspaceId", "documentId", "versionId", "fileObjectId", "sha256",
      "byteSize", "mimeType", "suggestedName",
    ]),
    ...activeUserInteraction()
  }),
  attachDocumentToClassicOutlook: (request = {}) => invokeFileBridge(
    "attachDocumentToClassicOutlook",
    {
      ...pickFileBridgeFields(request, [
        "requestHandle", "matterId", "documentId", "versionId", "fileObjectId",
        "sha256", "byteSize", "mimeType", "suggestedName",
      ]),
      ...activeUserInteraction()
    }
  )
});

export const internalUpdateApi = Object.freeze({
  status: () => invokeInternalUpdate("status"),
  check: () => invokeInternalUpdate("check"),
  stage: () => invokeInternalUpdate("stage", activeUserInteraction()),
  stageRollback: () => invokeInternalUpdate("stageRollback", activeUserInteraction()),
  open: (stageId) => invokeInternalUpdate("open", {
    stageId,
    confirmed: true,
    ...activeUserInteraction()
  }),
  discard: () => invokeInternalUpdate("discard")
});

contextBridge.exposeInMainWorld("amicFileBridge", fileBridgeApi);
contextBridge.exposeInMainWorld("amicInternalUpdate", internalUpdateApi);
contextBridge.exposeInMainWorld("matterSession", sessionApi);
