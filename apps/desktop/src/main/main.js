import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createDisabledMatterVaultRuntimeClient,
  createMatterVaultAwsRuntimeClient,
  loadMatterVaultRuntimeConfig
} from "./aws-runtime.js";
import { MainProcessAuthCoordinator } from "./auth.js";
import { parseMatterDeepLink, redactDeepLinkIntent } from "./deepLinks.js";
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

export const PASSWORD_RESET_DEEP_LINK_CHANNEL = "desktop:password-reset:confirm";

export function configureDesktopAppIcon(app) {
  app.dock?.setIcon?.(desktopWindowIconPath());
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

export function passwordResetDeepLinkIntent(candidate) {
  if (!candidate) return null;
  let intent;
  try {
    intent = parseMatterDeepLink(candidate);
  } catch {
    return null;
  }
  return intent.type === "password_reset_confirm" ? intent : null;
}

export function sendPasswordResetDeepLink(window, candidate) {
  const intent = passwordResetDeepLinkIntent(candidate);
  if (!intent) return { sent: false, reason: "not_password_reset_deep_link" };
  window?.webContents?.send?.(PASSWORD_RESET_DEEP_LINK_CHANNEL, intent);
  return {
    sent: true,
    intent: redactDeepLinkIntent(intent)
  };
}

export function collectMatterDeepLinkArgs(argv = process.argv) {
  return argv.filter((argument) => typeof argument === "string" && argument.startsWith("matter://"));
}

export async function startDesktopShell({
  BrowserWindowConstructor,
  rendererUrl = rendererTargetFromEnv(),
  windowOptions,
  ipcMain,
  coordinator,
  initialDeepLinkUrl
} = {}) {
  const target = assertApprovedRendererUrl(rendererUrl);
  const sessionIpc = ipcMain && coordinator ? registerSessionIpcHandlers({ ipcMain, coordinator }) : null;
  const window = await createMainWindow({ BrowserWindowConstructor, options: windowOptionsWithPreload(windowOptions) });
  installNavigationGuards(window);
  await window.loadURL(target);
  const initialDeepLink = sendPasswordResetDeepLink(window, initialDeepLinkUrl);
  return { window, target, sessionIpc, initialDeepLink };
}

export async function startElectronApp() {
  const { app, BrowserWindow, ipcMain } = await import("electron");
  const pendingDeepLinks = collectMatterDeepLinkArgs(process.argv);
  let activeWindow = null;
  app.on("open-url", (event, url) => {
    event.preventDefault();
    if (activeWindow) sendPasswordResetDeepLink(activeWindow, url);
    else pendingDeepLinks.push(url);
  });
  await app.whenReady();
  configureDesktopAppIcon(app);
  const runtimeClient = runtimeClientFromEnv();
  const coordinator = new MainProcessAuthCoordinator({ runtimeClient });
  const shell = await startDesktopShell({
    BrowserWindowConstructor: BrowserWindow,
    ipcMain,
    coordinator,
    initialDeepLinkUrl: pendingDeepLinks.shift()
  });
  activeWindow = shell.window;
  for (const url of pendingDeepLinks) sendPasswordResetDeepLink(activeWindow, url);
  return shell;
}

export function isMainEntryPoint({
  argv = process.argv,
  cwd = process.cwd(),
  versions = process.versions,
  defaultApp = process.defaultApp,
  resourcesPath = process.resourcesPath,
  modulePath = fileURLToPath(import.meta.url)
} = {}) {
  if (!versions.electron) return false;
  if (defaultApp === false) return true;
  if (resourcesPath && modulePath.startsWith(join(resourcesPath, "app"))) return true;
  const packageRoot = dirname(dirname(dirname(modulePath)));
  return argv.slice(1).some((argument) => {
    let decoded;
    try {
      decoded = decodeURIComponent(argument);
    } catch {
      decoded = argument;
    }
    if (decoded === modulePath) return true;
    const resolved = resolve(cwd, decoded);
    return resolved === modulePath || resolved === packageRoot;
  });
}

if (isMainEntryPoint()) {
  startElectronApp().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
