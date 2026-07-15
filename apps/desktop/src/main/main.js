import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createDisabledMatterVaultRuntimeClient,
  createMatterVaultAwsRuntimeClient,
  loadMatterVaultRuntimeConfig
} from "./aws-runtime.js";
import { MainProcessAuthCoordinator, encryptedFileSecureStore, memorySecureStore } from "./auth.js";
import { parseMatterDeepLink, redactDeepLinkIntent } from "./deepLinks.js";
import { startDesktopLocalApiServer, stopDesktopLocalApiServer } from "./local-api.js";
import { assertApprovedRendererUrl, installNavigationGuards, isApprovedRendererUrl } from "./origin-policy.js";
import { registerSessionIpcHandlers } from "./session-ipc.js";
import { createMainWindow } from "./window.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const formalReleaseMarkerName = "matter-formal-release.json";

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
  const url = pathToFileURL(join(moduleDir, "../renderer/web/index.html"));
  url.searchParams.set("desktop", "1");
  return url.toString();
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

export function configureDesktopProtocol(app) {
  return app.setAsDefaultProtocolClient?.("matter") === true;
}

export function rendererTargetFromEnv(env = process.env) {
  const configuredTarget = env.MATTER_DESKTOP_RENDERER_URL;
  if (!configuredTarget) return packagedRendererUrl();
  try {
    const pathname = decodeURIComponent(new URL(configuredTarget).pathname);
    if (/\/offline(?:\.matter)?\.html$/i.test(pathname)) return packagedRendererUrl();
  } catch {
    return configuredTarget;
  }
  return configuredTarget;
}

export function desktopUserDataPath(app, env = process.env) {
  const override = env.MATTER_DESKTOP_USER_DATA_PATH;
  if (typeof override === "string" && override.trim()) {
    const userDataPath = resolve(override.trim());
    app.setPath?.("userData", userDataPath);
    return userDataPath;
  }
  return app.getPath("userData");
}

export function isFormalReleasePackage({
  resourcesPath = process.resourcesPath,
  existsSyncImpl = existsSync
} = {}) {
  return typeof resourcesPath === "string" && Boolean(resourcesPath) && existsSyncImpl(join(resourcesPath, formalReleaseMarkerName));
}

export function shouldStartDesktopLocalApi(env = process.env, { formalRelease = false } = {}) {
  if (env.MATTER_DESKTOP_LOCAL_API_DISABLED === "1") return false;
  if (formalRelease && env.MATTER_DESKTOP_LOCAL_API_ENABLED !== "1") return false;
  return true;
}

export function runtimeClientFromEnv(env = process.env) {
  try {
    return createMatterVaultAwsRuntimeClient(loadMatterVaultRuntimeConfig({ env }));
  } catch (error) {
    return createDisabledMatterVaultRuntimeClient(error);
  }
}

export function shouldUseVolatileDesktopSessionStore(runtimeClient) {
  try {
    const status = runtimeClient?.runtimeStatus?.();
    const baseUrl = new URL(status?.baseUrl);
    return ["127.0.0.1", "localhost"].includes(baseUrl.hostname) && status.operatorRuntimeConfigured !== true;
  } catch {
    return false;
  }
}

export function desktopSecureStoreForRuntime({ runtimeClient, filePath, safeStorage } = {}) {
  if (shouldUseVolatileDesktopSessionStore(runtimeClient)) return memorySecureStore();
  return encryptedFileSecureStore({ filePath, safeStorage });
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
  packaged = false,
  initialDeepLinkUrl
} = {}) {
  const packagedTarget = packagedRendererUrl();
  const originOptions = { packagedRendererUrl: packagedTarget, allowDevRenderer: !packaged };
  const target = assertApprovedRendererUrl(rendererUrl, originOptions);
  const isTrustedSender = (event) => isApprovedRendererUrl(
    event?.senderFrame?.url ?? event?.sender?.getURL?.(),
    originOptions
  );
  const sessionIpc = ipcMain && coordinator
    ? registerSessionIpcHandlers({ ipcMain, coordinator, isTrustedSender })
    : null;
  const window = await createMainWindow({ BrowserWindowConstructor, options: windowOptionsWithPreload(windowOptions) });
  installNavigationGuards(window, originOptions);
  await window.loadURL(target);
  const initialDeepLink = sendPasswordResetDeepLink(window, initialDeepLinkUrl);
  return { window, target, sessionIpc, initialDeepLink };
}

export async function startElectronApp() {
  const { app, BrowserWindow, ipcMain, safeStorage } = await import("electron");
  const pendingDeepLinks = collectMatterDeepLinkArgs(process.argv);
  let activeWindow = null;
  const userDataPath = desktopUserDataPath(app);
  app.on("open-url", (event, url) => {
    event.preventDefault();
    if (activeWindow) sendPasswordResetDeepLink(activeWindow, url);
    else pendingDeepLinks.push(url);
  });
  await app.whenReady();
  configureDesktopAppIcon(app);
  configureDesktopProtocol(app);
  const localApi = shouldStartDesktopLocalApi(process.env, { formalRelease: isFormalReleasePackage() })
    ? await startDesktopLocalApiServer({ userDataPath, packaged: app.isPackaged === true })
    : null;
  if (localApi?.baseUrl) {
    process.env.MATTER_DESKTOP_API_BASE_URL = localApi.baseUrl;
    process.env.MATTER_DESKTOP_RUNTIME_BASE_URL = localApi.baseUrl;
  }
  app.on("before-quit", () => stopDesktopLocalApiServer(localApi));
  const runtimeClient = runtimeClientFromEnv();
  const secureStore = desktopSecureStoreForRuntime({
    runtimeClient,
    filePath: join(userDataPath, "secure-session-store.json"),
    safeStorage
  });
  const coordinator = new MainProcessAuthCoordinator({ runtimeClient, secureStore });
  await coordinator.restoreSession();
  const shell = await startDesktopShell({
    BrowserWindowConstructor: BrowserWindow,
    ipcMain,
    coordinator,
    packaged: app.isPackaged === true,
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

export function shouldAutoStartElectronApp({
  versions = process.versions,
  processType = process.type,
  ...entryPointArgs
} = {}) {
  if (!versions.electron) return false;
  if (processType === "browser") return true;
  if (processType && processType !== "browser") return false;
  return isMainEntryPoint({ versions, ...entryPointArgs });
}

const shouldAutoStart = shouldAutoStartElectronApp();
if (shouldAutoStart) {
  startElectronApp().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
