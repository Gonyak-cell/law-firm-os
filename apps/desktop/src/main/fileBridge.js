import { basename, extname } from "node:path";

export const FILE_BRIDGE_CHANNELS = Object.freeze({
  chooseFileForUpload: "fileBridge:choose-file-for-upload",
  saveDocumentAs: "fileBridge:save-document-as"
});

export const FILE_BRIDGE_AUDIT_MAP = Object.freeze({
  choose_file_for_upload: Object.freeze({
    direction: "upload",
    permission: "file_bridge.upload",
    auditEvents: Object.freeze({
      precheckAllowed: "file_bridge.upload.permission_precheck.allowed",
      precheckDenied: "file_bridge.upload.permission_precheck.denied",
      pickerCancelled: "file_bridge.upload.picker.cancelled",
      pickerSelected: "file_bridge.upload.picker.selected"
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
      saveCompleted: "file_bridge.download.save-as.completed"
    })
  }),
  open_temp_preview: Object.freeze({
    direction: "download",
    permission: "file_bridge.preview",
    auditEvents: Object.freeze({
      precheckAllowed: "file_bridge.preview.permission_precheck.allowed",
      precheckDenied: "file_bridge.preview.permission_precheck.denied",
      previewOpened: "file_bridge.preview.opened"
    })
  })
});

export class FileBridgeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "FileBridgeError";
    this.code = code;
  }
}

export function assertUserGestureContext(request = {}) {
  if (request.userGesture !== true) {
    throw new FileBridgeError("USER_GESTURE_REQUIRED", "File picker requires a user gesture");
  }
  if (typeof request.gestureToken !== "string" || !request.gestureToken.startsWith("gesture:")) {
    throw new FileBridgeError("GESTURE_TOKEN_REQUIRED", "File picker requires a scoped gesture token");
  }
}

export function selectedFileMetadata(filePath, handleId) {
  const name = basename(filePath);
  return {
    handleId,
    name,
    extension: extname(name).replace(/^\./, ""),
    pathVisibleToRenderer: false
  };
}

async function runPermissionPrecheck({ permissionClient, actionId, request }) {
  const auditMap = FILE_BRIDGE_AUDIT_MAP[actionId];
  if (!auditMap) throw new FileBridgeError("UNKNOWN_FILE_BRIDGE_ACTION", `Unknown file bridge action: ${actionId}`);

  const precheckRequest = {
    actionId,
    permission: auditMap.permission,
    matterId: request.matterId,
    documentId: request.documentId,
    tenantIdHash: request.tenantIdHash
  };

  const result = await permissionClient.precheckFileBridgeAction(precheckRequest);
  if (result?.allowed !== true) {
    throw new FileBridgeError("PERMISSION_DENIED", result?.reason ?? "File bridge permission precheck denied");
  }
  return result;
}

async function recordAuditEvent({ auditLogger, actionId, eventName, payload = {} }) {
  await auditLogger.record({
    actionId,
    eventName,
    ...payload
  });
}

export function createFileBridgeController({
  dialog,
  permissionClient = {
    async precheckFileBridgeAction() {
      return { allowed: false, reason: "permission_client_missing" };
    }
  },
  auditLogger = { async record() {} },
  documentWriter = {
    async writeUserSelectedFile() {
      throw new FileBridgeError("DOCUMENT_WRITER_MISSING", "Save-as requires a document writer adapter");
    }
  },
  createHandleId = () => `file-handle-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  pickerOptions = { properties: ["openFile"] }
} = {}) {
  if (!dialog) {
    throw new Error("File bridge requires an Electron dialog adapter");
  }

  const selectedHandles = new Map();

  return {
    async chooseFileForUpload(request = {}) {
      if (typeof dialog.showOpenDialog !== "function") {
        throw new Error("File upload bridge requires an Electron open dialog adapter");
      }
      assertUserGestureContext(request);
      let precheck;
      try {
        precheck = await runPermissionPrecheck({
          permissionClient,
          actionId: "choose_file_for_upload",
          request
        });
      } catch (error) {
        await recordAuditEvent({
          auditLogger,
          actionId: "choose_file_for_upload",
          eventName: FILE_BRIDGE_AUDIT_MAP.choose_file_for_upload.auditEvents.precheckDenied,
          payload: { reason: error.code ?? "unknown" }
        });
        throw error;
      }
      await recordAuditEvent({
        auditLogger,
        actionId: "choose_file_for_upload",
        eventName: FILE_BRIDGE_AUDIT_MAP.choose_file_for_upload.auditEvents.precheckAllowed,
        payload: { decisionId: precheck.decisionId }
      });
      const result = await dialog.showOpenDialog({
        ...pickerOptions,
        properties: ["openFile"]
      });
      if (result.canceled || result.filePaths.length === 0) {
        await recordAuditEvent({
          auditLogger,
          actionId: "choose_file_for_upload",
          eventName: FILE_BRIDGE_AUDIT_MAP.choose_file_for_upload.auditEvents.pickerCancelled
        });
        return { state: "cancelled" };
      }

      const filePath = result.filePaths[0];
      const handleId = createHandleId();
      const metadata = selectedFileMetadata(filePath, handleId);
      selectedHandles.set(handleId, { ...metadata, selectedAt: Date.now() });
      await recordAuditEvent({
        auditLogger,
        actionId: "choose_file_for_upload",
        eventName: FILE_BRIDGE_AUDIT_MAP.choose_file_for_upload.auditEvents.pickerSelected,
        payload: { handleId }
      });
      return {
        state: "selected",
        file: metadata,
        backendUpload: {
          actionId: "choose_file_for_upload",
          handleId,
          permissionDecisionId: precheck.decisionId ?? null,
          pathVisibleToRenderer: false
        }
      };
    },
    async saveDocumentAs(request = {}) {
      if (typeof dialog.showSaveDialog !== "function") {
        throw new Error("Save-as bridge requires an Electron save dialog adapter");
      }
      assertUserGestureContext(request);
      let precheck;
      try {
        precheck = await runPermissionPrecheck({
          permissionClient,
          actionId: "save_document_as",
          request
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
        payload: { decisionId: precheck.decisionId }
      });

      const result = await dialog.showSaveDialog({
        title: request.title ?? "Save mater document",
        defaultPath: request.suggestedName ?? "mater-document"
      });

      if (result.canceled || !result.filePath) {
        return { state: "cancelled" };
      }

      await recordAuditEvent({
        auditLogger,
        actionId: "save_document_as",
        eventName: FILE_BRIDGE_AUDIT_MAP.save_document_as.auditEvents.saveDialogOpened,
        payload: { decisionId: precheck.decisionId }
      });

      await documentWriter.writeUserSelectedFile({
        filePath: result.filePath,
        documentId: request.documentId,
        bytes: request.bytes
      });

      await recordAuditEvent({
        auditLogger,
        actionId: "save_document_as",
        eventName: FILE_BRIDGE_AUDIT_MAP.save_document_as.auditEvents.saveCompleted,
        payload: { decisionId: precheck.decisionId }
      });

      return {
        state: "saved",
        file: selectedFileMetadata(result.filePath, request.documentId ?? "saved-document"),
        backendDownload: {
          actionId: "save_document_as",
          documentId: request.documentId,
          permissionDecisionId: precheck.decisionId ?? null,
          pathVisibleToRenderer: false
        }
      };
    },
    getSelectedHandleForTest(handleId) {
      return selectedHandles.get(handleId);
    }
  };
}

export function registerFileBridgeIpcHandlers({ ipcMain, controller }) {
  ipcMain.handle(FILE_BRIDGE_CHANNELS.chooseFileForUpload, (_event, request) => controller.chooseFileForUpload(request));
  ipcMain.handle(FILE_BRIDGE_CHANNELS.saveDocumentAs, (_event, request) => controller.saveDocumentAs(request));
}
