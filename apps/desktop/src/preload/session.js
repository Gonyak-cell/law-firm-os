import { contextBridge, ipcRenderer } from "electron";

export const PRELOAD_CHANNEL_ALLOWLIST = Object.freeze({
  status: "session:status",
  login: "session:login",
  logout: "session:logout"
});

function invokeAllowed(command) {
  const channel = PRELOAD_CHANNEL_ALLOWLIST[command];
  if (!channel) throw new Error(`Blocked preload session command: ${command}`);
  return ipcRenderer.invoke(channel);
}

export const sessionApi = Object.freeze({
  status: () => invokeAllowed("status"),
  login: () => invokeAllowed("login"),
  logout: () => invokeAllowed("logout")
});

contextBridge.exposeInMainWorld("materSession", sessionApi);
