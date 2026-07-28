import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createDisabledMatterVaultRuntimeClient,
  createMatterVaultAwsRuntimeClient,
  loadMatterVaultRuntimeConfig
} from "./aws-runtime.js";
import { MainProcessAuthCoordinator, encryptedFileSecureStore, memorySecureStore } from "./auth.js";
import { installMatterAppProtocol, matterAppRendererUrl, registerMatterAppScheme } from "./app-protocol.js";
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
  return matterAppRendererUrl();
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

export function shouldStartDesktopLocalApi(
  env = process.env,
  { formalRelease = false, packaged = false } = {}
) {
  if (env.MATTER_DESKTOP_LOCAL_API_DISABLED === "1") return false;
  if (formalRelease) return false;
  if (packaged) return env.MATTER_DESKTOP_LOCAL_API_ENABLED === "1";
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

export function desktopSecureStoreForRuntime({ runtimeClient, filePath, safeStorage, formalRelease = false } = {}) {
  if (!formalRelease && shouldUseVolatileDesktopSessionStore(runtimeClient)) return memorySecureStore();
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

export function acquireDesktopSingleInstance(app) {
  if (typeof app?.requestSingleInstanceLock !== "function") {
    throw new TypeError("Electron app.requestSingleInstanceLock is required");
  }
  const acquired = app.requestSingleInstanceLock();
  if (!acquired) app.quit?.();
  return acquired;
}

function focusDesktopWindow(window) {
  if (!window) return false;
  if (window.isMinimized?.()) window.restore?.();
  window.show?.();
  window.focus?.();
  return true;
}

export function createDesktopInstanceCoordinator({ app, argv = process.argv } = {}) {
  const pendingDeepLinks = collectMatterDeepLinkArgs(argv);
  let activeWindow = null;
  let deliveredDeepLinkCount = 0;
  let rejectedDeepLinkCount = 0;
  let lastIntent = null;

  function dispatch(candidate) {
    const intent = passwordResetDeepLinkIntent(candidate);
    if (!intent) {
      rejectedDeepLinkCount += 1;
      return { sent: false, reason: "not_password_reset_deep_link" };
    }
    const redactedIntent = redactDeepLinkIntent(intent);
    lastIntent = redactedIntent;
    if (!activeWindow) {
      pendingDeepLinks.push(candidate);
      return { sent: false, queued: true, intent: redactedIntent };
    }
    const result = sendPasswordResetDeepLink(activeWindow, candidate);
    if (result.sent) deliveredDeepLinkCount += 1;
    return result;
  }

  app.on("open-url", (event, url) => {
    event.preventDefault();
    dispatch(url);
  });
  app.on("second-instance", (_event, secondArgv = []) => {
    for (const url of collectMatterDeepLinkArgs(secondArgv)) dispatch(url);
    focusDesktopWindow(activeWindow);
  });

  return Object.freeze({
    setActiveWindow(window) {
      activeWindow = window;
      const queued = pendingDeepLinks.splice(0);
      return queued.map(dispatch);
    },
    snapshot() {
      return Object.freeze({
        active_window: Boolean(activeWindow),
        pending_deep_link_count: pendingDeepLinks.length,
        delivered_deep_link_count: deliveredDeepLinkCount,
        rejected_deep_link_count: rejectedDeepLinkCount,
        last_intent: lastIntent,
      });
    },
  });
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
  const originOptions = { allowDevRenderer: !packaged };
  const target = assertApprovedRendererUrl(rendererUrl, originOptions);
  const isTrustedSender = (event) => isApprovedRendererUrl(
    event?.senderFrame?.url ?? event?.sender?.getURL?.(),
    originOptions
  );
  const window = await createMainWindow({ BrowserWindowConstructor, options: windowOptionsWithPreload(windowOptions) });
  const waitForLogoIntroReady = () => {
    if (window.isVisible?.()) return Promise.resolve();
    return new Promise((resolve) => window.once("show", resolve));
  };
  const sessionIpc = ipcMain && coordinator
    ? registerSessionIpcHandlers({ ipcMain, coordinator, isTrustedSender, waitForLogoIntroReady })
    : null;
  installNavigationGuards(window, originOptions);
  await window.loadURL(target);
  const initialDeepLink = sendPasswordResetDeepLink(window, initialDeepLinkUrl);
  return { window, target, sessionIpc, initialDeepLink };
}

export async function startElectronApp() {
  const { app, BrowserWindow, ipcMain, net, protocol, safeStorage } = await import("electron");
  if (!acquireDesktopSingleInstance(app)) return { primaryInstance: false };
  registerMatterAppScheme(protocol);
  const instanceCoordinator = createDesktopInstanceCoordinator({ app, argv: process.argv });
  const userDataPath = desktopUserDataPath(app);
  await app.whenReady();
  installMatterAppProtocol({ protocol, net });
  configureDesktopAppIcon(app);
  configureDesktopProtocol(app);
  const formalRelease = isFormalReleasePackage();
  const packaged = app.isPackaged === true;
  const localApi = shouldStartDesktopLocalApi(process.env, { formalRelease, packaged })
    ? await startDesktopLocalApiServer({ userDataPath, packaged })
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
    safeStorage,
    formalRelease
  });
  const coordinator = new MainProcessAuthCoordinator({ runtimeClient, secureStore });
  await coordinator.restoreSession();
  const shell = await startDesktopShell({
    BrowserWindowConstructor: BrowserWindow,
    ipcMain,
    coordinator,
    packaged: app.isPackaged === true,
  });
  instanceCoordinator.setActiveWindow(shell.window);
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
