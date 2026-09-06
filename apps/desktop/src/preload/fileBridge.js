import { contextBridge, ipcRenderer } from "electron";
import { assertNoRendererDocumentBytes, pickAllowedRequestFields } from "../shared/rendererBytePolicy.js";

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

function invokeAllowed(command, payload) {
  const channel = FILE_BRIDGE_CHANNEL_ALLOWLIST[command];
  if (!channel) throw new Error(`Blocked preload file bridge command: ${command}`);
  return ipcRenderer.invoke(channel, payload);
}

function activeUserInteraction() {
  if (globalThis.navigator?.userActivation?.isActive !== true) {
    throw new Error("AMIC OS file action requires an active user interaction");
  }
  return { userActivation: true };
}

export function sanitizeUploadPrecheckRequest(request = {}) {
  assertNoRendererDocumentBytes(request);
  return pickAllowedRequestFields(request, ["matterId", "workspaceId", "folderId"]);
}

export function sanitizeSaveDocumentAsRequest(request = {}) {
  assertNoRendererDocumentBytes(request);
  return pickAllowedRequestFields(request, [
    "matterId", "workspaceId", "documentId", "versionId", "fileObjectId", "sha256",
    "byteSize", "mimeType", "suggestedName", "title",
  ]);
}

export function sanitizeOpenDocumentPreviewRequest(request = {}) {
  assertNoRendererDocumentBytes(request);
  return pickAllowedRequestFields(request, [
    "matterId", "workspaceId", "documentId", "versionId", "fileObjectId", "sha256",
    "byteSize", "mimeType", "suggestedName",
  ]);
}

export function sanitizeClassicOutlookAttachRequest(request = {}) {
  assertNoRendererDocumentBytes(request);
  return pickAllowedRequestFields(request, [
    "requestHandle", "matterId", "documentId", "versionId", "fileObjectId", "sha256",
    "byteSize", "mimeType", "suggestedName",
  ]);
}

export const fileBridgeApi = Object.freeze({
  status: () => invokeAllowed("status"),
  precheckUpload: (request = {}) => invokeAllowed("precheckUpload", sanitizeUploadPrecheckRequest(request)),
  chooseFileForUpload: (preflightId) => invokeAllowed("chooseFileForUpload", {
    preflightId,
    ...activeUserInteraction()
  }),
  cancelUpload: (handleId) => invokeAllowed("cancelUpload", { handleId }),
  uploadSelectedFile: (handleId) => invokeAllowed("uploadSelectedFile", { handleId }),
  resumePendingUploads: () => invokeAllowed("resumePendingUploads", {}),
  saveDocumentAs: (request = {}) => invokeAllowed("saveDocumentAs", {
    ...sanitizeSaveDocumentAsRequest(request),
    ...activeUserInteraction()
  }),
  openDocumentPreview: (request = {}) => invokeAllowed("openDocumentPreview", {
    ...sanitizeOpenDocumentPreviewRequest(request),
    ...activeUserInteraction()
  }),
  attachDocumentToClassicOutlook: (request = {}) => invokeAllowed(
    "attachDocumentToClassicOutlook",
    {
      ...sanitizeClassicOutlookAttachRequest(request),
      ...activeUserInteraction()
    }
  )
});

contextBridge.exposeInMainWorld("amicFileBridge", fileBridgeApi);
