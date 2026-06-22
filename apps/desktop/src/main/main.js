import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createDisabledMatterVaultRuntimeClient,
  createMatterVaultAwsRuntimeClient,
  loadMatterVaultRuntimeConfig
} from "./aws-runtime.js";
import { MainProcessAuthCoordinator } from "./auth.js";
import { assertApprovedRendererUrl, installNavigationGuards } from "./origin-policy.js";
import { registerSessionIpcHandlers } from "./session-ipc.js";
import { createMainWindow } from "./window.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));

export const desktopSkeletonStatus = Object.freeze({
  appName: "matter",
  electronPackage: true,
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  fileBridgeExposed: false,
  authTokenStorageExposed: false,
  updateChannelExposed: false
});

export function describeDesktopSkeleton() {
  return desktopSkeletonStatus;
}

export function packagedRendererUrl() {
  return pathToFileURL(join(moduleDir, "../renderer/offline.html")).toString();
}

export function desktopPreloadPath() {
  return join(moduleDir, "../preload/session.cjs");
}

export function desktopWindowIconPath() {
  return join(moduleDir, "../../build/icon.png");
}

export function rendererTargetFromEnv(env = process.env) {
  return env.MATTER_DESKTOP_RENDERER_URL ?? packagedRendererUrl();
}

export function runtimeClientFromEnv(env = process.env) {
  try {
    return createMatterVaultAwsRuntimeClient(loadMatterVaultRuntimeConfig({ env }));
  } catch (error) {
    return createDisabledMatterVaultRuntimeClient(error);
  }
}

function windowOptionsWithPreload(windowOptions = {}) {
  return {
    ...windowOptions,
    icon: windowOptions.icon ?? desktopWindowIconPath(),
    webPreferences: {
      ...(windowOptions.webPreferences ?? {}),
      preload: windowOptions.webPreferences?.preload ?? desktopPreloadPath()
    }
  };
}

export async function startDesktopShell({
  BrowserWindowConstructor,
  rendererUrl = rendererTargetFromEnv(),
  windowOptions,
  ipcMain,
  coordinator
} = {}) {
  const target = assertApprovedRendererUrl(rendererUrl);
  const sessionIpc = ipcMain && coordinator ? registerSessionIpcHandlers({ ipcMain, coordinator }) : null;
  const window = await createMainWindow({ BrowserWindowConstructor, options: windowOptionsWithPreload(windowOptions) });
  installNavigationGuards(window);
  await window.loadURL(target);
  return { window, target, sessionIpc };
}

export async function startElectronApp() {
  const { app, BrowserWindow, ipcMain } = await import("electron");
  await app.whenReady();
  const runtimeClient = runtimeClientFromEnv();
  const coordinator = new MainProcessAuthCoordinator({ runtimeClient });
  return startDesktopShell({ BrowserWindowConstructor: BrowserWindow, ipcMain, coordinator });
}

export function isMainEntryPoint({
  argv = process.argv,
  versions = process.versions,
  defaultApp = process.defaultApp,
  resourcesPath = process.resourcesPath,
  modulePath = fileURLToPath(import.meta.url)
} = {}) {
  if (!versions.electron) return false;
  if (defaultApp === false) return true;
  if (resourcesPath && modulePath.startsWith(join(resourcesPath, "app"))) return true;
  return argv.slice(1).some((argument) => {
    try {
      return decodeURIComponent(argument) === modulePath;
    } catch {
      return argument === modulePath;
    }
  });
}

if (isMainEntryPoint()) {
  startElectronApp().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
