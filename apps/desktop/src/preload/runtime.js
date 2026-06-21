import { contextBridge } from "electron";

export const PRELOAD_CHANNEL_ALLOWLIST = Object.freeze([]);

export const desktopRuntimeContext = Object.freeze({
  desktopMode: true,
  routeSource: "desktop",
  mutate: false,
  fileBridge: false,
  authMutation: false,
  auditMutation: false,
  billing: false
});

export const runtimeApi = Object.freeze({
  context: desktopRuntimeContext
});

contextBridge.exposeInMainWorld("materRuntime", runtimeApi);
