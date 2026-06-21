import { APPROVED_DEV_RENDERER_URL, assertApprovedRendererUrl, installNavigationGuards } from "./origin-policy.js";
import { createMainWindow } from "./window.js";

export const desktopSkeletonStatus = Object.freeze({
  appName: "mater",
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

export function rendererTargetFromEnv(env = process.env) {
  return env.MATER_DESKTOP_RENDERER_URL ?? APPROVED_DEV_RENDERER_URL;
}

export async function startDesktopShell({ BrowserWindowConstructor, rendererUrl = rendererTargetFromEnv(), windowOptions } = {}) {
  const target = assertApprovedRendererUrl(rendererUrl);
  const window = await createMainWindow({ BrowserWindowConstructor, options: windowOptions });
  installNavigationGuards(window);
  await window.loadURL(target);
  return { window, target };
}

export async function startElectronApp() {
  const { app, BrowserWindow } = await import("electron");
  await app.whenReady();
  return startDesktopShell({ BrowserWindowConstructor: BrowserWindow });
}

if (process.versions.electron && process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  startElectronApp().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
