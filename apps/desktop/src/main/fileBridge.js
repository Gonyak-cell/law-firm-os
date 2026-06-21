import { basename, extname } from "node:path";

export const FILE_BRIDGE_CHANNELS = Object.freeze({
  chooseFileForUpload: "fileBridge:choose-file-for-upload"
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

export function createFileBridgeController({
  dialog,
  createHandleId = () => `file-handle-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  pickerOptions = { properties: ["openFile"] }
} = {}) {
  if (!dialog || typeof dialog.showOpenDialog !== "function") {
    throw new Error("File bridge requires an Electron dialog adapter");
  }

  const selectedHandles = new Map();

  return {
    async chooseFileForUpload(request = {}) {
      assertUserGestureContext(request);
      const result = await dialog.showOpenDialog({
        ...pickerOptions,
        properties: ["openFile"]
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { state: "cancelled" };
      }

      const filePath = result.filePaths[0];
      const handleId = createHandleId();
      selectedHandles.set(handleId, { filePath, selectedAt: Date.now() });
      return {
        state: "selected",
        file: selectedFileMetadata(filePath, handleId)
      };
    },
    getSelectedHandleForTest(handleId) {
      return selectedHandles.get(handleId);
    }
  };
}

export function registerFileBridgeIpcHandlers({ ipcMain, controller }) {
  ipcMain.handle(FILE_BRIDGE_CHANNELS.chooseFileForUpload, (_event, request) => controller.chooseFileForUpload(request));
}
