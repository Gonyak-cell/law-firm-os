import { contextBridge, ipcRenderer } from "electron";

export const PRELOAD_CHANNEL_ALLOWLIST = Object.freeze({
  chooseFileForUpload: "fileBridge:choose-file-for-upload"
});

export const TRUSTED_GESTURE_TYPES = Object.freeze(["click", "keydown", "drop"]);

export function createGestureContext(event) {
  if (!event || event.isTrusted !== true || !TRUSTED_GESTURE_TYPES.includes(event.type)) {
    throw new Error("mater file picker requires a trusted user gesture");
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

export const fileBridgeApi = Object.freeze({
  chooseFileForUpload: (event, request = {}) =>
    invokeAllowed("chooseFileForUpload", {
      ...request,
      ...createGestureContext(event)
    })
});

contextBridge.exposeInMainWorld("materFileBridge", fileBridgeApi);
