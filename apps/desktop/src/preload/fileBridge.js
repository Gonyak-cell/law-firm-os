import { contextBridge, ipcRenderer } from "electron";
import { assertNoRendererDocumentBytes, pickAllowedRequestFields } from "../shared/rendererBytePolicy.js";

export const PRELOAD_CHANNEL_ALLOWLIST = Object.freeze({
  chooseFileForUpload: "fileBridge:choose-file-for-upload",
  saveDocumentAs: "fileBridge:save-document-as"
});

export const TRUSTED_GESTURE_TYPES = Object.freeze(["click", "keydown", "drop"]);
export const CHOOSE_FILE_FOR_UPLOAD_REQUEST_FIELDS = Object.freeze(["matterId", "documentId", "tenantIdHash"]);
export const SAVE_DOCUMENT_AS_REQUEST_FIELDS = Object.freeze([
  "matterId",
  "documentId",
  "tenantIdHash",
  "suggestedName",
  "title"
]);

export function createGestureContext(event) {
  if (!event || event.isTrusted !== true || !TRUSTED_GESTURE_TYPES.includes(event.type)) {
    throw new Error("matter file picker requires a trusted user gesture");
  }
  return {
    userGesture: true,
    gestureType: event.type,
    gestureToken: `gesture:${event.type}:${Date.now()}`
  };
}

function invokeAllowed(command, payload) {
  const channel = PRELOAD_CHANNEL_ALLOWLIST[command];
  if (!channel) throw new Error(`Blocked preload file bridge command: ${command}`);
  return ipcRenderer.invoke(channel, payload);
}

export function sanitizeChooseFileForUploadRequest(request = {}) {
  assertNoRendererDocumentBytes(request);
  return pickAllowedRequestFields(request, CHOOSE_FILE_FOR_UPLOAD_REQUEST_FIELDS);
}

export function sanitizeSaveDocumentAsRequest(request = {}) {
  assertNoRendererDocumentBytes(request);
  return pickAllowedRequestFields(request, SAVE_DOCUMENT_AS_REQUEST_FIELDS);
}

export const fileBridgeApi = Object.freeze({
  chooseFileForUpload: (event, request = {}) =>
    invokeAllowed("chooseFileForUpload", {
      ...sanitizeChooseFileForUploadRequest(request),
      ...createGestureContext(event)
    }),
  saveDocumentAs: (event, request = {}) =>
    invokeAllowed("saveDocumentAs", {
      ...sanitizeSaveDocumentAsRequest(request),
      ...createGestureContext(event)
    })
});

contextBridge.exposeInMainWorld("materFileBridge", fileBridgeApi);
