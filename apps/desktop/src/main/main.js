import { createHash } from "node:crypto";
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
export const AUTH_CALLBACK_DEEP_LINK_CHANNEL = "desktop:auth-callback";
const MAX_REMEMBERED_AUTH_CALLBACKS = 256;
const AUTH_CALLBACK_RENDERER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUTH_CALLBACK_STATE = /^[A-Za-z0-9._:-]{1,200}$/;

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

function parseRendererDeepLinkIntent(candidate) {
  if (!candidate) return null;
  let intent;
  try {
    intent = parseMatterDeepLink(candidate);
  } catch {
    return null;
  }
  if (intent.type === "password_reset_confirm") return intent;
  if (intent.type !== "auth_callback") return null;
  return {
    type: intent.type,
    routeOnly: true,
    code: intent.code,
    state: intent.state
  };
}

export function passwordResetDeepLinkIntent(candidate) {
  const intent = parseRendererDeepLinkIntent(candidate);
  return intent?.type === "password_reset_confirm" ? intent : null;
}

export function authCallbackDeepLinkIntent(candidate) {
  const intent = parseRendererDeepLinkIntent(candidate);
  return intent?.type === "auth_callback" ? intent : null;
}

function rendererDeepLinkIntent(candidate) {
  return parseRendererDeepLinkIntent(candidate);
}

function sendRendererDeepLinkIntent(window, intent) {
  const channel = intent?.type === "auth_callback"
    ? AUTH_CALLBACK_DEEP_LINK_CHANNEL
    : intent?.type === "password_reset_confirm"
      ? PASSWORD_RESET_DEEP_LINK_CHANNEL
      : null;
  if (!channel || typeof window?.webContents?.send !== "function") {
    return { sent: false, reason: channel ? "renderer_unavailable" : "unsupported_renderer_deep_link" };
  }
  try {
    window.webContents.send(channel, intent);
  } catch {
    return { sent: false, reason: "renderer_unavailable" };
  }
  return {
    sent: true,
    intent: redactDeepLinkIntent(intent)
  };
}

export function sendPasswordResetDeepLink(window, candidate) {
  const intent = passwordResetDeepLinkIntent(candidate);
  if (!intent) return { sent: false, reason: "not_password_reset_deep_link" };
  return sendRendererDeepLinkIntent(window, intent);
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
  const pendingDeepLinks = [];
  const rememberedAuthCallbackStates = new Set();
  const authCallbacksSentToRenderer = new Set();
  let activeWindow = null;
  let deliveredDeepLinkCount = 0;
  let rejectedDeepLinkCount = 0;
  let duplicateAuthCallbackCount = 0;
  let authCallbackLimitRejectionCount = 0;
  let acknowledgedAuthCallbackCount = 0;
  let authCallbackRendererReady = false;
  let authCallbackRendererId = null;
  let lastIntent = null;

  function authCallbackStateHash(state) {
    return createHash("sha256").update(state).digest("base64url");
  }

  function rememberAuthCallback(intent) {
    if (intent.type !== "auth_callback") return "accepted";
    const stateHash = authCallbackStateHash(intent.state);
    if (rememberedAuthCallbackStates.has(stateHash)) return "duplicate";
    if (rememberedAuthCallbackStates.size >= MAX_REMEMBERED_AUTH_CALLBACKS) {
      return "limit_reached";
    }
    rememberedAuthCallbackStates.add(stateHash);
    return "accepted";
  }

  function deliver(intent) {
    const result = sendRendererDeepLinkIntent(activeWindow, intent);
    if (result.sent) {
      deliveredDeepLinkCount += 1;
      if (intent.type === "auth_callback") {
        authCallbacksSentToRenderer.add(authCallbackStateHash(intent.state));
      }
    }
    return result;
  }

  function deliverPending(predicate) {
    const results = [];
    for (let index = 0; index < pendingDeepLinks.length;) {
      const intent = pendingDeepLinks[index];
      if (!predicate(intent)) {
        index += 1;
        continue;
      }
      const result = deliver(intent);
      results.push(result);
      if (result.sent && intent.type !== "auth_callback") {
        pendingDeepLinks.splice(index, 1);
        continue;
      }
      index += 1;
    }
    return results;
  }

  function dispatch(candidate) {
    const intent = rendererDeepLinkIntent(candidate);
    if (!intent) {
      rejectedDeepLinkCount += 1;
      return { sent: false, reason: "unsupported_renderer_deep_link" };
    }
    const callbackState = rememberAuthCallback(intent);
    if (callbackState === "duplicate") {
      duplicateAuthCallbackCount += 1;
      return { sent: false, reason: "duplicate_auth_callback" };
    }
    if (callbackState === "limit_reached") {
      rejectedDeepLinkCount += 1;
      authCallbackLimitRejectionCount += 1;
      return { sent: false, reason: "auth_callback_limit_reached" };
    }
    const redactedIntent = redactDeepLinkIntent(intent);
    lastIntent = redactedIntent;
    if (intent.type === "auth_callback") {
      pendingDeepLinks.push(intent);
      if (!activeWindow || !authCallbackRendererReady) {
        return { sent: false, queued: true, intent: redactedIntent };
      }
      return deliver(intent);
    }
    if (!activeWindow) {
      pendingDeepLinks.push(intent);
      return { sent: false, queued: true, intent: redactedIntent };
    }
    return deliver(intent);
  }

  for (const candidate of collectMatterDeepLinkArgs(argv)) dispatch(candidate);

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
      const replacingActiveWindow = Boolean(activeWindow) && activeWindow !== window;
      activeWindow = window;
      if (replacingActiveWindow) {
        authCallbackRendererReady = false;
        authCallbackRendererId = null;
        authCallbacksSentToRenderer.clear();
      }
      return deliverPending((intent) => (
        intent.type !== "auth_callback"
        || (
          authCallbackRendererReady
          && !authCallbacksSentToRenderer.has(authCallbackStateHash(intent.state))
        )
      ));
    },
    setAuthCallbackRendererReady(rendererId) {
      if (!AUTH_CALLBACK_RENDERER_ID.test(rendererId ?? "")) return [];
      if (authCallbackRendererId !== rendererId) authCallbacksSentToRenderer.clear();
      authCallbackRendererId = rendererId;
      authCallbackRendererReady = true;
      if (!activeWindow) return [];
      return deliverPending((intent) => (
        intent.type === "auth_callback"
        && !authCallbacksSentToRenderer.has(authCallbackStateHash(intent.state))
      ));
    },
    setAuthCallbackRendererNotReady() {
      authCallbackRendererReady = false;
      authCallbackRendererId = null;
      authCallbacksSentToRenderer.clear();
    },
    acknowledgeAuthCallback({ rendererId, state } = {}) {
      if (
        !authCallbackRendererReady
        || rendererId !== authCallbackRendererId
        || !AUTH_CALLBACK_STATE.test(state ?? "")
      ) return { acknowledged: false };
      const stateHash = authCallbackStateHash(state);
      if (!authCallbacksSentToRenderer.has(stateHash)) return { acknowledged: false };
      const index = pendingDeepLinks.findIndex((intent) => (
        intent.type === "auth_callback"
        && authCallbackStateHash(intent.state) === stateHash
      ));
      if (index < 0) return { acknowledged: false };
      pendingDeepLinks.splice(index, 1);
      authCallbacksSentToRenderer.delete(stateHash);
      acknowledgedAuthCallbackCount += 1;
      return { acknowledged: true };
    },
    snapshot() {
      return Object.freeze({
        active_window: Boolean(activeWindow),
        pending_deep_link_count: pendingDeepLinks.length,
        delivered_deep_link_count: deliveredDeepLinkCount,
        rejected_deep_link_count: rejectedDeepLinkCount,
        duplicate_auth_callback_count: duplicateAuthCallbackCount,
        auth_callback_limit_rejection_count: authCallbackLimitRejectionCount,
        acknowledged_auth_callback_count: acknowledgedAuthCallbackCount,
        auth_callback_renderer_ready: authCallbackRendererReady,
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
  openExternal,
  onAuthCallbackReady,
  onAuthCallbackAcknowledged,
  onAuthCallbackNotReady,
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
  window.webContents.on("did-start-loading", () => onAuthCallbackNotReady?.());
  window.webContents.on("render-process-gone", () => onAuthCallbackNotReady?.());
  const waitForLogoIntroReady = () => {
    if (window.isVisible?.()) return Promise.resolve();
    return new Promise((resolve) => window.once("show", resolve));
  };
  const sessionIpc = ipcMain && coordinator
    ? registerSessionIpcHandlers({
      ipcMain,
      coordinator,
      isTrustedSender,
      openExternal,
      onAuthCallbackReady,
      onAuthCallbackAcknowledged,
      waitForLogoIntroReady
    })
    : null;
  installNavigationGuards(window, originOptions);
  await window.loadURL(target);
  const initialDeepLink = sendPasswordResetDeepLink(window, initialDeepLinkUrl);
  return { window, target, sessionIpc, initialDeepLink };
}

export async function startElectronApp() {
  const { app, BrowserWindow, ipcMain, net, protocol, safeStorage, shell: electronShell } = await import("electron");
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
    openExternal: (url) => electronShell.openExternal(url),
    onAuthCallbackReady: (rendererId) => instanceCoordinator.setAuthCallbackRendererReady(rendererId),
    onAuthCallbackAcknowledged: (payload) => instanceCoordinator.acknowledgeAuthCallback(payload),
    onAuthCallbackNotReady: () => instanceCoordinator.setAuthCallbackRendererNotReady(),
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
