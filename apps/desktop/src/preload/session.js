import { contextBridge, ipcRenderer } from "electron";

export const PRELOAD_CHANNEL_ALLOWLIST = Object.freeze({
  status: "session:status",
  runtime: "session:runtime",
  accounts: "session:accounts",
  login: "session:login",
  features: "session:features",
  smoke: "session:smoke",
  logout: "session:logout"
});

function invokeAllowed(command, payload) {
  const channel = PRELOAD_CHANNEL_ALLOWLIST[command];
  if (!channel) throw new Error(`Blocked preload session command: ${command}`);
  return ipcRenderer.invoke(channel, payload);
}

export const sessionApi = Object.freeze({
  status: () => invokeAllowed("status"),
  runtime: () => invokeAllowed("runtime"),
  accounts: () => invokeAllowed("accounts"),
  login: (payload) => invokeAllowed("login", payload),
  features: (payload) => invokeAllowed("features", payload),
  smoke: (payload) => invokeAllowed("smoke", payload),
  logout: () => invokeAllowed("logout")
});

contextBridge.exposeInMainWorld("materSession", sessionApi);
