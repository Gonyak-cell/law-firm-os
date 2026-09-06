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
import { createFileBridgeController, registerFileBridgeIpcHandlers } from "./fileBridge.js";
import {
  CLASSIC_OUTLOOK_ATTACH_REQUEST_CHANNEL,
  createClassicOutlookBridgeController,
} from "./broker/classicOutlookBridge.js";
import { startDesktopLocalApiServer, stopDesktopLocalApiServer } from "./local-api.js";
import {
  INTERNAL_UNSIGNED_UPDATE_STATE_FILENAME,
  createDisabledInternalUnsignedUpdateRuntime,
  createEncryptedFileInternalUnsignedUpdateStateStore,
  createInternalUnsignedUpdateRuntime,
  loadInternalUnsignedUpdatePackageConfiguration,
  registerInternalUnsignedUpdateIpcHandlers,
} from "./internal-unsigned-update-runtime.js";
import { createFileSystemInternalUnsignedUpdateStaging } from "./internal-unsigned-update-staging.js";
import { assertApprovedRendererUrl, installNavigationGuards, isApprovedRendererUrl } from "./origin-policy.js";
import {
  createOutlookInstallationIdentityStore,
  createOutlookInstallationLifecycleCoordinator,
  readOutlookDesktopBuildIdentity,
} from "./outlook-installation.js";
import { registerSessionIpcHandlers } from "./session-ipc.js";
import { createFileSystemTempPreviewStorage, createTempPreviewManager } from "./tempPreview.js";
import { createMainWindow } from "./window.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const formalReleaseMarkerName = "matter-formal-release.json";
const internalUnsignedReleaseMarkerName = "matter-internal-unsigned-release.json";

export const desktopSkeletonStatus = Object.freeze({
  appName: "matter",
  electronPackage: true,
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  fileBridgeExposed: true,
  authTokenStorageExposed: false,
  updateChannelExposed: true
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
export const OUTLOOK_CONNECTION_RESULT_CHANNEL = "desktop:outlook-connection:result";
export const OUTLOOK_CONNECTION_COMPLETE_ROUTE = "/api/hrx/people/me/outlook-connection/complete";
export const OUTLOOK_CALLBACK_TTL_MS = 10 * 60 * 1000;
const MAX_REMEMBERED_AUTH_CALLBACKS = 256;
const MAX_AUTH_CALLBACK_TRACE_ENTRIES = 128;
const OUTLOOK_CALLBACK_RETRY_DELAY_MS = 15 * 1000;
const SAFE_OUTLOOK_RESULT_VALUE = /^[A-Za-z0-9._:-]{1,160}$/;
const SAFE_OUTLOOK_ERROR_CODE = /^[A-Z0-9_]{1,160}$/;
const OUTLOOK_SESSION_REQUIRED_CODES = new Set([
  "AUTH_SESSION_REQUIRED",
  "DESKTOP_SESSION_REQUIRED",
  "HRX_SIGNED_SESSION_REQUIRED"
]);

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

export function isInternalUnsignedReleasePackage({
  resourcesPath = process.resourcesPath,
  existsSyncImpl = existsSync,
} = {}) {
  return typeof resourcesPath === "string"
    && Boolean(resourcesPath)
    && existsSyncImpl(join(resourcesPath, internalUnsignedReleaseMarkerName));
}

export function shouldStartDesktopLocalApi(
  env = process.env,
  { formalRelease = false, internalUnsignedRelease = false, packaged = false } = {}
) {
  if (env.MATTER_DESKTOP_LOCAL_API_DISABLED === "1") return false;
  if (formalRelease || internalUnsignedRelease) return false;
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
    ...(intent.error ? { error: intent.error } : { code: intent.code }),
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
  const channel = intent?.type === "password_reset_confirm"
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

function safeOutlookResultValue(value, pattern = SAFE_OUTLOOK_RESULT_VALUE) {
  return typeof value === "string" && pattern.test(value) ? value : null;
}

function classifyOutlookConnectionResponse(response = {}) {
  const httpStatus = Number.isInteger(response?.http_status)
    && response.http_status >= 0
    && response.http_status <= 599
    ? response.http_status
    : 0;
  const body = response?.body && typeof response.body === "object" && !Array.isArray(response.body)
    ? response.body
    : response && typeof response === "object" && !Array.isArray(response)
      ? response
      : {};
  const connection = body.connection && typeof body.connection === "object" && !Array.isArray(body.connection)
    ? body.connection
    : body;
  const safeErrorCode = safeOutlookResultValue(
    body.safe_error_code ?? connection.safe_error_code,
    SAFE_OUTLOOK_ERROR_CODE,
  );
  const connectionState = safeOutlookResultValue(connection.connection_state);
  const payload = {
    type: "outlook_connection_result",
    status: "error",
    http_status: httpStatus,
    safe_error_code: safeErrorCode
  };
  const employeeId = safeOutlookResultValue(body.employee_id ?? connection.employee_id);
  if (employeeId) payload.employee_id = employeeId;
  if (connectionState) payload.connection_state = connectionState;

  if (safeErrorCode === "OUTLOOK_OAUTH_STATE_EXPIRED") payload.status = "expired";
  else if (safeErrorCode === "OUTLOOK_AUTHORIZATION_IN_PROGRESS") payload.status = "retryable";
  else if (httpStatus === 401 || OUTLOOK_SESSION_REQUIRED_CODES.has(safeErrorCode)) {
    payload.status = "session_required";
  }
  else if (httpStatus === 0 || httpStatus === 408 || httpStatus === 429 || httpStatus >= 500) {
    payload.status = "retryable";
  } else if (httpStatus >= 200 && httpStatus < 300 && connectionState === "connected") {
    payload.status = "connected";
  }
  return {
    payload,
    terminal: !["retryable", "session_required"].includes(payload.status)
  };
}

export function createDesktopInstanceCoordinator({
  app,
  argv = process.argv,
  now = Date.now,
  getAuthCoordinator = () => null,
  setTimeoutImpl = setTimeout,
  clearTimeoutImpl = clearTimeout,
  retryDelayMs = OUTLOOK_CALLBACK_RETRY_DELAY_MS,
  classicOutlookBridge = null,
} = {}) {
  const pendingDeepLinks = [];
  const pendingAuthCallbacks = new Map();
  const rememberedAuthCallbacks = new Map();
  const pendingOutlookResults = [];
  const pendingClassicOutlookRequests = [];
  const authCallbackPhaseTrace = [];
  let activeWindow = null;
  let deliveredDeepLinkCount = 0;
  let deliveredOutlookResultCount = 0;
  let deliveredClassicOutlookRequestCount = 0;
  let rejectedDeepLinkCount = 0;
  let duplicateAuthCallbackCount = 0;
  let authCallbackLimitRejectionCount = 0;
  let rejectedClassicOutlookRequestCount = 0;
  let completedAuthCallbackCount = 0;
  let terminalAuthCallbackCount = 0;
  let lastIntent = null;

  function authCallbackStateFingerprint(state) {
    return createHash("sha256").update(state).digest("base64url");
  }

  function traceAuthCallback(phase, stateFingerprint, at = now()) {
    authCallbackPhaseTrace.push(Object.freeze({
      phase,
      timestamp: new Date(at).toISOString(),
      state_fingerprint: stateFingerprint
    }));
    if (authCallbackPhaseTrace.length > MAX_AUTH_CALLBACK_TRACE_ENTRIES) authCallbackPhaseTrace.shift();
  }

  function purgeExpiredFingerprints(at = now()) {
    for (const [fingerprint, expiresAt] of rememberedAuthCallbacks) {
      if (expiresAt <= at) rememberedAuthCallbacks.delete(fingerprint);
    }
  }

  function rememberAuthCallback(intent, receivedAt) {
    const stateFingerprint = authCallbackStateFingerprint(intent.state);
    purgeExpiredFingerprints(receivedAt);
    if (rememberedAuthCallbacks.has(stateFingerprint)) return { status: "duplicate", stateFingerprint };
    if (rememberedAuthCallbacks.size >= MAX_REMEMBERED_AUTH_CALLBACKS) {
      return { status: "limit_reached", stateFingerprint };
    }
    rememberedAuthCallbacks.set(stateFingerprint, receivedAt + OUTLOOK_CALLBACK_TTL_MS);
    return { status: "accepted", stateFingerprint };
  }

  function deliverDeepLink(intent) {
    const result = sendRendererDeepLinkIntent(activeWindow, intent);
    if (result.sent) deliveredDeepLinkCount += 1;
    return result;
  }

  function deliverPendingDeepLinks() {
    const results = [];
    for (let index = 0; index < pendingDeepLinks.length;) {
      const result = deliverDeepLink(pendingDeepLinks[index]);
      results.push(result);
      if (result.sent) pendingDeepLinks.splice(index, 1);
      else index += 1;
    }
    return results;
  }

  function deliverOutlookResult(payload) {
    if (typeof activeWindow?.webContents?.send !== "function") return false;
    try {
      activeWindow.webContents.send(OUTLOOK_CONNECTION_RESULT_CHANNEL, payload);
      deliveredOutlookResultCount += 1;
      return true;
    } catch {
      return false;
    }
  }

  function sendOutlookResult(payload) {
    if (deliverOutlookResult(payload)) return;
    if (pendingOutlookResults.length >= 32) pendingOutlookResults.shift();
    pendingOutlookResults.push(payload);
  }

  function deliverPendingOutlookResults() {
    while (pendingOutlookResults.length > 0) {
      if (!deliverOutlookResult(pendingOutlookResults[0])) break;
      pendingOutlookResults.shift();
    }
  }

  function deliverClassicOutlookRequest(payload) {
    if (typeof activeWindow?.webContents?.send !== "function") return false;
    try {
      activeWindow.webContents.send(CLASSIC_OUTLOOK_ATTACH_REQUEST_CHANNEL, payload);
      deliveredClassicOutlookRequestCount += 1;
      return true;
    } catch {
      return false;
    }
  }

  function sendClassicOutlookRequest(payload) {
    if (deliverClassicOutlookRequest(payload)) return true;
    if (pendingClassicOutlookRequests.length >= 16) pendingClassicOutlookRequests.shift();
    pendingClassicOutlookRequests.push(payload);
    return false;
  }

  function deliverPendingClassicOutlookRequests() {
    while (pendingClassicOutlookRequests.length > 0) {
      if (!deliverClassicOutlookRequest(pendingClassicOutlookRequests[0])) break;
      pendingClassicOutlookRequests.shift();
    }
  }

  function dispatchClassicOutlookArgv(candidateArgv) {
    if (!classicOutlookBridge?.acceptArgv) return { accepted: false, reason: "bridge_unavailable" };
    try {
      const request = classicOutlookBridge.acceptArgv(candidateArgv);
      if (!request) return { accepted: false, reason: "not_classic_outlook_request" };
      sendClassicOutlookRequest(request);
      return { accepted: true, request };
    } catch (error) {
      rejectedClassicOutlookRequestCount += 1;
      return {
        accepted: false,
        reason: error?.code ?? "CLASSIC_OUTLOOK_INVOCATION_INVALID",
      };
    }
  }

  function purgeAuthCallback(entry) {
    if (entry.retryTimer) clearTimeoutImpl(entry.retryTimer);
    if (entry.expiryTimer) clearTimeoutImpl(entry.expiryTimer);
    entry.retryTimer = null;
    entry.expiryTimer = null;
    pendingAuthCallbacks.delete(entry.stateFingerprint);
    entry.code = null;
    entry.state = null;
    entry.error = null;
  }

  function finishAuthCallback(entry, payload) {
    traceAuthCallback(payload.status, entry.stateFingerprint);
    sendOutlookResult(payload);
    terminalAuthCallbackCount += 1;
    if (payload.status === "connected") completedAuthCallbackCount += 1;
    purgeAuthCallback(entry);
  }

  function expireAuthCallback(entry) {
    finishAuthCallback(entry, {
      type: "outlook_connection_result",
      status: "expired",
      http_status: 0,
      safe_error_code: "OUTLOOK_OAUTH_CALLBACK_EXPIRED"
    });
  }

  function scheduleAuthCallbackRetry(entry, delayMs = retryDelayMs) {
    if (!pendingAuthCallbacks.has(entry.stateFingerprint) || entry.retryTimer) return;
    const remaining = entry.expiresAt - now();
    if (remaining <= 0) {
      expireAuthCallback(entry);
      return;
    }
    entry.retryTimer = setTimeoutImpl(() => {
      entry.retryTimer = null;
      void processAuthCallback(entry);
    }, Math.min(delayMs, remaining));
    entry.retryTimer?.unref?.();
  }

  function scheduleAuthCallbackExpiry(entry) {
    const remaining = entry.expiresAt - now();
    if (remaining <= 0) {
      expireAuthCallback(entry);
      return;
    }
    entry.expiryTimer = setTimeoutImpl(() => {
      entry.expiryTimer = null;
      if (pendingAuthCallbacks.has(entry.stateFingerprint)) expireAuthCallback(entry);
    }, remaining);
    entry.expiryTimer?.unref?.();
  }

  function processAuthCallback(entry) {
    if (!pendingAuthCallbacks.has(entry.stateFingerprint)) return Promise.resolve();
    if (entry.inFlight) return entry.inFlight;
    if (entry.retryTimer) {
      clearTimeoutImpl(entry.retryTimer);
      entry.retryTimer = null;
    }
    const operation = (async () => {
      if (now() >= entry.expiresAt) {
        expireAuthCallback(entry);
        return;
      }
      if (entry.error === "access_denied") {
        finishAuthCallback(entry, {
          type: "outlook_connection_result",
          status: "error",
          http_status: 0,
          safe_error_code: "OUTLOOK_AUTHORIZATION_DENIED"
        });
        return;
      }
      if (!activeWindow) return;

      entry.attemptCount += 1;
      traceAuthCallback("request_started", entry.stateFingerprint);
      let response;
      try {
        const authCoordinator = getAuthCoordinator();
        response = typeof authCoordinator?.api === "function"
          ? await authCoordinator.api({
            path: OUTLOOK_CONNECTION_COMPLETE_ROUTE,
            method: "POST",
            body: JSON.stringify({ authorization_code: entry.code, state_ref: entry.state })
          })
          : { http_status: 401, body: { safe_error_code: "DESKTOP_SESSION_REQUIRED" } };
      } catch {
        response = { http_status: 0, body: { safe_error_code: "OUTLOOK_CONNECTION_REQUEST_FAILED" } };
      }
      if (!pendingAuthCallbacks.has(entry.stateFingerprint)) return;
      if (now() >= entry.expiresAt) {
        expireAuthCallback(entry);
        return;
      }
      const result = classifyOutlookConnectionResponse(response);
      if (result.payload.status === "connected") {
        try {
          await getAuthCoordinator()?.refreshOutlookLifecycle?.();
        } catch {
          // The connection result remains authoritative; lifecycle status fails closed separately.
        }
      }
      traceAuthCallback(result.payload.status, entry.stateFingerprint);
      sendOutlookResult(result.payload);
      if (result.terminal) {
        terminalAuthCallbackCount += 1;
        if (result.payload.status === "connected") completedAuthCallbackCount += 1;
        purgeAuthCallback(entry);
      } else {
        scheduleAuthCallbackRetry(entry);
      }
    })();
    entry.inFlight = operation.finally(() => {
      entry.inFlight = null;
    });
    return entry.inFlight;
  }

  function retryPendingAuthCallbacks() {
    return Promise.all([...pendingAuthCallbacks.values()].map((entry) => processAuthCallback(entry)));
  }

  function dispatch(candidate) {
    const intent = rendererDeepLinkIntent(candidate);
    if (!intent) {
      rejectedDeepLinkCount += 1;
      return { sent: false, reason: "unsupported_renderer_deep_link" };
    }
    if (intent.type === "auth_callback") {
      const receivedAt = now();
      const remembered = rememberAuthCallback(intent, receivedAt);
      if (remembered.status === "duplicate") {
        duplicateAuthCallbackCount += 1;
        return { sent: false, reason: "duplicate_auth_callback" };
      }
      if (remembered.status === "limit_reached") {
        rejectedDeepLinkCount += 1;
        authCallbackLimitRejectionCount += 1;
        return { sent: false, reason: "auth_callback_limit_reached" };
      }
      const entry = {
        stateFingerprint: remembered.stateFingerprint,
        code: intent.code ?? null,
        state: intent.state,
        error: intent.error ?? null,
        receivedAt,
        expiresAt: receivedAt + OUTLOOK_CALLBACK_TTL_MS,
        attemptCount: 0,
        inFlight: null,
        retryTimer: null,
        expiryTimer: null
      };
      pendingAuthCallbacks.set(entry.stateFingerprint, entry);
      traceAuthCallback("queued", entry.stateFingerprint, receivedAt);
      lastIntent = Object.freeze({ type: "auth_callback", state_fingerprint: entry.stateFingerprint });
      scheduleAuthCallbackExpiry(entry);
      if (activeWindow || entry.error === "access_denied") void processAuthCallback(entry);
      return { sent: false, queued: true, intent: lastIntent };
    }

    const redactedIntent = redactDeepLinkIntent(intent);
    lastIntent = redactedIntent;
    if (!activeWindow) {
      pendingDeepLinks.push(intent);
      return { sent: false, queued: true, intent: redactedIntent };
    }
    return deliverDeepLink(intent);
  }

  for (const candidate of collectMatterDeepLinkArgs(argv)) dispatch(candidate);
  dispatchClassicOutlookArgv(argv);

  app.on("open-url", (event, url) => {
    event.preventDefault();
    const result = dispatch(url);
    if (result.reason !== "unsupported_renderer_deep_link") focusDesktopWindow(activeWindow);
    return result;
  });
  app.on("second-instance", (_event, secondArgv = []) => {
    for (const url of collectMatterDeepLinkArgs(secondArgv)) dispatch(url);
    const classicResult = dispatchClassicOutlookArgv(secondArgv);
    if (collectMatterDeepLinkArgs(secondArgv).length > 0 || classicResult.accepted) {
      focusDesktopWindow(activeWindow);
    }
  });

  return Object.freeze({
    setActiveWindow(window) {
      activeWindow = window;
      deliverPendingOutlookResults();
      deliverPendingClassicOutlookRequests();
      const results = deliverPendingDeepLinks();
      void retryPendingAuthCallbacks();
      return results;
    },
    retryPendingAuthCallbacks,
    snapshot() {
      for (const entry of [...pendingAuthCallbacks.values()]) {
        if (now() >= entry.expiresAt) expireAuthCallback(entry);
      }
      purgeExpiredFingerprints();
      return Object.freeze({
        active_window: Boolean(activeWindow),
        pending_deep_link_count: pendingDeepLinks.length + pendingAuthCallbacks.size,
        pending_auth_callback_count: pendingAuthCallbacks.size,
        pending_outlook_result_count: pendingOutlookResults.length,
        pending_classic_outlook_request_count: pendingClassicOutlookRequests.length,
        delivered_deep_link_count: deliveredDeepLinkCount,
        delivered_outlook_result_count: deliveredOutlookResultCount,
        delivered_classic_outlook_request_count: deliveredClassicOutlookRequestCount,
        rejected_deep_link_count: rejectedDeepLinkCount,
        duplicate_auth_callback_count: duplicateAuthCallbackCount,
        auth_callback_limit_rejection_count: authCallbackLimitRejectionCount,
        rejected_classic_outlook_request_count: rejectedClassicOutlookRequestCount,
        completed_auth_callback_count: completedAuthCallbackCount,
        terminal_auth_callback_count: terminalAuthCallbackCount,
        remembered_auth_callback_count: rememberedAuthCallbacks.size,
        auth_callback_phase_trace: Object.freeze(authCallbackPhaseTrace.map((entry) => ({ ...entry }))),
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
  fileBridgeController,
  internalUpdateRuntime,
  openExternal,
  writeClipboard,
  onSessionAvailable,
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
    ? registerSessionIpcHandlers({
      ipcMain,
      coordinator,
      isTrustedSender,
      openExternal,
      writeClipboard,
      onSessionAvailable,
      waitForLogoIntroReady
    })
    : null;
  const fileBridgeIpc = ipcMain && fileBridgeController
    ? registerFileBridgeIpcHandlers({
      ipcMain,
      controller: fileBridgeController,
      isTrustedSender
    })
    : null;
  const internalUpdateIpc = ipcMain && internalUpdateRuntime
    ? registerInternalUnsignedUpdateIpcHandlers({
      ipcMain,
      runtime: internalUpdateRuntime,
      isTrustedSender,
    })
    : null;
  installNavigationGuards(window, originOptions);
  await window.loadURL(target);
  const initialDeepLink = sendPasswordResetDeepLink(window, initialDeepLinkUrl);
  return {
    window,
    target,
    sessionIpc,
    fileBridgeIpc,
    internalUpdateIpc,
    initialDeepLink,
  };
}

export function createDesktopFileBridgePermissionClient(coordinator) {
  if (!coordinator?.precheckVaultUpload) throw new Error("Desktop file bridge permission client requires the auth coordinator");
  return Object.freeze({
    async precheckFileBridgeAction(request = {}) {
      if ([
        "save_document_as",
        "open_temp_preview",
        "attach_document_to_classic_outlook",
      ].includes(request.actionId)) {
        if (typeof coordinator.precheckVaultExport !== "function") {
          return { allowed: false, reason: "vault_export_precheck_unavailable" };
        }
        const body = await coordinator.precheckVaultExport({
          matterId: request.matterId,
          ...(request.workspaceId ? { workspaceId: request.workspaceId } : {}),
          exactVersion: request.exactVersion,
        });
        const exact = body?.exact_version;
        const expected = request.exactVersion;
        const sameExact = [
          "document_id",
          "version_id",
          "file_object_id",
          "sha256",
          "byte_size",
          "mime_type",
        ].every((field) => exact?.[field] === expected?.[field]);
        const allowed = body?.http_status === 200
          && body?.ok === true
          && body?.outcome === "preflight_passed"
          && body?.lawos_permission_checked === true
          && body?.provider_authority_checked === false
          && body?.provider_grant_created === false
          && (request.workspaceId == null || body?.workspace_id === request.workspaceId)
          && sameExact;
        return {
          allowed,
          reason: allowed
            ? null
            : body?.safe_error_codes?.[0] ?? body?.reason ?? "vault_document_download_not_enabled",
          decisionId: allowed ? body.request_id ?? null : null,
        };
      }
      if (request.actionId !== "precheck_file_upload") {
        return { allowed: false, reason: "file_bridge_action_not_supported" };
      }
      const body = await coordinator.precheckVaultUpload({
        matterId: request.matterId,
        workspaceId: request.workspaceId ?? null,
        folderId: request.folderId ?? null,
      });
      const item = body?.item;
      const allowed = body?.http_status === 200
        && body?.ok === true
        && body?.outcome === "preflight_passed"
        && item?.permission_checked === true
        && item?.vault_document_write_enabled === true
        && body?.vault_document_write_enabled === true;
      return {
        allowed,
        reason: allowed
          ? null
          : body?.safe_error_codes?.[0] ?? body?.reason ?? "vault_document_write_not_enabled",
        operationId: allowed ? item.operation_id ?? body.operation_id ?? null : null,
        maxUploadBytes: allowed ? item.max_upload_bytes ?? body.max_upload_bytes : null
      };
    }
  });
}

export function createDesktopVaultDocumentProvider(coordinator) {
  if (!coordinator?.downloadVaultExactVersion || !coordinator?.completeVaultExport) {
    throw new Error("Desktop Vault document provider requires the auth coordinator");
  }
  return Object.freeze({
    async fetchDocumentForSave(request = {}) {
      const operationKind = request.operationKind === "attach_outlook"
        ? "attach_outlook"
        : "export_exact_version";
      const downloadRequest = {
        matterId: request.matterId,
        ...(request.workspaceId ? { workspaceId: request.workspaceId } : {}),
        exactVersion: request.exactVersion,
      };
      if (operationKind === "attach_outlook") Object.assign(downloadRequest, {
        operationKind,
        requestNonceSha256: request.requestNonceSha256,
        installationRefSha256: request.installationRefSha256,
        composeTargetSha256: request.composeTargetSha256,
      });
      const response = await coordinator.downloadVaultExactVersion(downloadRequest);
      if (response?.ok !== true
          || response?.http_status !== 200
          || !Buffer.isBuffer(response?.bytes)) {
        const error = new Error("Vault exact export did not return verified main-process bytes");
        error.code = response?.safe_error_codes?.[0]
          ?? response?.reason
          ?? "VAULT_EXPORT_FAILED";
        throw error;
      }
      return Object.freeze({
        bytes: response.bytes,
        operationId: response.operation_id,
        exactVersion: response.exact_version,
        attachmentName: response.attachment_name,
        operationKind: response.operation_kind,
      });
    },
    async completeDocumentSave(request = {}) {
      const operationKind = request.operationKind === "attach_outlook"
        ? "attach_outlook"
        : "export_exact_version";
      const failed = operationKind === "attach_outlook" && request.completionStage === "failed";
      const expectedStage = failed ? "failed" : operationKind === "attach_outlook" ? "attached" : "delivered";
      const completionRequest = {
        ...(request.workspaceId ? { workspaceId: request.workspaceId } : {}),
        operationId: request.operationId,
        exactVersion: request.exactVersion,
      };
      if (operationKind === "attach_outlook") Object.assign(completionRequest, {
        operationKind,
        completionStage: expectedStage,
        installationRefSha256: request.installationRefSha256,
        composeTargetSha256: request.composeTargetSha256,
      });
      if (failed) completionRequest.safeReasonCode = request.safeReasonCode;
      const response = await coordinator.completeVaultExport(completionRequest);
      if (response?.ok !== true
          || response?.http_status !== 200
          || response?.outcome !== expectedStage
          || response?.receipt?.stage !== expectedStage) {
        const error = new Error("Vault exact export delivery receipt was not recorded");
        error.code = response?.safe_error_codes?.[0]
          ?? response?.reason
          ?? "VAULT_EXPORT_COMPLETION_FAILED";
        throw error;
      }
      return Object.freeze({
        state: expectedStage,
        operationId: response.operation_id,
        receiptId: response.receipt.receipt_id,
      });
    },
  });
}

export function createDesktopVaultUploadProvider(coordinator, {
  wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  maxStatusChecks = 12,
} = {}) {
  if (!coordinator?.uploadVaultFile
      || typeof coordinator.continueVaultUpload !== "function"
      || typeof coordinator.rememberPendingVaultUpload !== "function"
      || typeof coordinator.pendingVaultUploads !== "function"
      || typeof coordinator.forgetPendingVaultUpload !== "function") {
    throw new Error("Desktop Vault upload provider requires the durable auth coordinator");
  }

  function uploadedReceipt(response) {
    const item = response?.item;
    if (response?.ok !== true
        || ![200, 201].includes(response?.http_status)
        || item?.exact_readback_verified !== true) {
      const error = new Error("Vault upload did not produce an exact readback receipt");
      error.code = response?.safe_error_codes?.[0] ?? response?.reason ?? "VAULT_UPLOAD_FAILED";
      throw error;
    }
    return Object.freeze({
      state: "uploaded",
      requestId: response.request_id,
      operationId: item.operation_id,
      ...(typeof item.receipt?.matter_id === "string" && item.receipt.matter_id
        ? { matterId: item.receipt.matter_id }
        : {}),
      documentId: item.document_id,
      versionId: item.version_id,
      fileObjectId: item.file_object_id,
      sha256: item.sha256,
      byteSize: item.byte_size,
      mimeType: item.mime_type,
      auditEventId: item.audit_event_id,
    });
  }

  function processingReceipt(response, operationId, expected) {
    const item = response?.item;
    if (response?.ok !== true
        || response?.outcome !== "processing"
        || item?.operation_id !== operationId
        || !Number.isSafeInteger(item?.retry_after_ms)
        || item.retry_after_ms < 250
        || item.retry_after_ms > 60_000) {
      const error = new Error("Vault upload continuation receipt is invalid");
      error.code = "VAULT_UPLOAD_RECEIPT_MISMATCH";
      throw error;
    }
    return Object.freeze({
      state: "processing",
      requestId: response.request_id,
      operationId,
      ...(typeof item.receipt?.matter_id === "string" && item.receipt.matter_id
        ? { matterId: item.receipt.matter_id }
        : {}),
      stage: item.stage,
      retryAfterMs: item.retry_after_ms,
      sha256: expected.sha256,
      byteSize: expected.byteSize,
      mimeType: expected.mimeType,
      exactReadbackVerified: false,
      pathVisibleToRenderer: false,
      rawBytesIncluded: false,
      filenameIncluded: false,
    });
  }

  async function resolvePending(response, operationId, expected) {
    let current = response;
    for (let statusChecks = 0; current?.outcome === "processing"; statusChecks += 1) {
      await coordinator.rememberPendingVaultUpload({ operationId, expected });
      const pending = processingReceipt(current, operationId, expected);
      if (statusChecks >= maxStatusChecks) return pending;
      await wait(Math.min(pending.retryAfterMs, 5_000));
      current = await coordinator.continueVaultUpload({ operationId, expected });
    }
    const receipt = uploadedReceipt(current);
    await coordinator.forgetPendingVaultUpload({ operationId });
    return receipt;
  }

  return Object.freeze({
    async uploadSelectedFile(request = {}) {
      const response = await coordinator.uploadVaultFile({
        stream: request.stream,
        openStream: request.openStream,
        assertUnchanged: request.assertUnchanged,
        file: request.file,
        operationId: request.operationId,
      });
      const expected = Object.freeze({
        sha256: response?.local_stream_sha256,
        byteSize: response?.local_stream_byte_size,
        mimeType: request.file?.mimeType,
      });
      return resolvePending(response, request.operationId, expected);
    },

    async resumePendingUploads() {
      const pending = await coordinator.pendingVaultUploads();
      const results = [];
      for (const entry of pending) {
        const expected = Object.freeze({
          sha256: entry.expected.sha256,
          byteSize: entry.expected.byte_size,
          mimeType: entry.expected.mime_type,
        });
        try {
          const response = await coordinator.continueVaultUpload({
            operationId: entry.operation_id,
            expected,
          });
          results.push(await resolvePending(response, entry.operation_id, expected));
        } catch (error) {
          results.push(Object.freeze({
            state: "retryable",
            operationId: entry.operation_id,
            safeErrorCode: error?.code ?? error?.safe_error_code ?? "VAULT_UPLOAD_RESUME_FAILED",
            pathVisibleToRenderer: false,
            rawBytesIncluded: false,
            filenameIncluded: false,
          }));
        }
      }
      return Object.freeze(results);
    },
  });
}

export async function startElectronApp() {
  const {
    app,
    BrowserWindow,
    clipboard: electronClipboard,
    dialog,
    ipcMain,
    net,
    protocol,
    safeStorage,
    shell: electronShell
  } = await import("electron");
  if (!acquireDesktopSingleInstance(app)) return { primaryInstance: false };
  registerMatterAppScheme(protocol);
  let coordinator = null;
  let fileBridgeController = null;
  let tempPreviewManager = null;
  let desktopShell = null;
  let outlookLifecycle = null;
  let internalUpdateRuntime = createDisabledInternalUnsignedUpdateRuntime(
    "INTERNAL_UPDATE_PACKAGE_NOT_ACTIVE",
  );
  const classicOutlookBridge = createClassicOutlookBridgeController();
  const instanceCoordinator = createDesktopInstanceCoordinator({
    app,
    argv: process.argv,
    getAuthCoordinator: () => coordinator,
    classicOutlookBridge,
  });
  const userDataPath = desktopUserDataPath(app);
  await app.whenReady();
  installMatterAppProtocol({ protocol, net });
  configureDesktopAppIcon(app);
  configureDesktopProtocol(app);
  const formalRelease = isFormalReleasePackage();
  const internalUnsignedRelease = isInternalUnsignedReleasePackage();
  const packaged = app.isPackaged === true;
  const localApi = shouldStartDesktopLocalApi(process.env, {
    formalRelease,
    internalUnsignedRelease,
    packaged,
  })
    ? await startDesktopLocalApiServer({ userDataPath, packaged })
    : null;
  if (localApi?.baseUrl) {
    process.env.MATTER_DESKTOP_API_BASE_URL = localApi.baseUrl;
    process.env.MATTER_DESKTOP_RUNTIME_BASE_URL = localApi.baseUrl;
  }
  app.on("before-quit", () => {
    desktopShell?.fileBridgeIpc?.dispose?.();
    desktopShell?.internalUpdateIpc?.dispose?.();
    internalUpdateRuntime.clearSync?.();
    fileBridgeController?.dispose?.();
    classicOutlookBridge.dispose();
    if (!fileBridgeController) tempPreviewManager?.dispose?.();
    outlookLifecycle?.stop?.({ reason: "quit" });
    stopDesktopLocalApiServer(localApi);
  });
  const runtimeClient = runtimeClientFromEnv();
  tempPreviewManager = createTempPreviewManager({
    storage: createFileSystemTempPreviewStorage({ basePath: app.getPath("temp") }),
    openPreview: (nativePath) => electronShell.openPath(nativePath),
  });
  await tempPreviewManager.initialize();
  const secureStore = desktopSecureStoreForRuntime({
    runtimeClient,
    filePath: join(userDataPath, "secure-session-store.json"),
    safeStorage,
    formalRelease
  });
  if (packaged && internalUnsignedRelease) {
    try {
      const updatePackage = loadInternalUnsignedUpdatePackageConfiguration({
        resourcesPath: process.resourcesPath,
        appVersion: app.getVersion?.(),
      });
      internalUpdateRuntime = createInternalUnsignedUpdateRuntime({
        ...updatePackage,
        authorize: async () => runtimeClient.authorizeInternalUnsignedUpdate({
          sessionToken: await secureStore.get("session_token"),
        }),
        stateStore: createEncryptedFileInternalUnsignedUpdateStateStore({
          filePath: join(userDataPath, INTERNAL_UNSIGNED_UPDATE_STATE_FILENAME),
          safeStorage,
        }),
        staging: createFileSystemInternalUnsignedUpdateStaging({
          basePath: app.getPath("temp"),
          openInstaller: (nativePath) => electronShell.openPath(nativePath),
        }),
        fetchImpl: typeof net.fetch === "function"
          ? (url, options) => net.fetch(url, options)
          : globalThis.fetch,
      });
      await internalUpdateRuntime.initialize();
    } catch (error) {
      internalUpdateRuntime = createDisabledInternalUnsignedUpdateRuntime(
        /^[A-Z0-9_]{1,96}$/u.test(String(error?.code ?? ""))
          ? error.code
          : "INTERNAL_UPDATE_INITIALIZATION_FAILED",
      );
    }
  }
  const outlookIdentityStore = createOutlookInstallationIdentityStore({
    filePath: join(userDataPath, "outlook-installation-identity.json"),
    safeStorage,
    platform: process.platform,
  });
  const outlookBuildIdentity = await readOutlookDesktopBuildIdentity({
    manifestPath: join(process.resourcesPath ?? "", "matter-build-manifest.json"),
    platform: process.platform,
    appVersion: app.getVersion?.(),
  });
  outlookLifecycle = createOutlookInstallationLifecycleCoordinator({
    identityStore: outlookIdentityStore,
    buildIdentity: outlookBuildIdentity,
    requestApi: async (input) => runtimeClient.api({
      ...input,
      sessionToken: await secureStore.get("session_token"),
    }),
  });
  coordinator = new MainProcessAuthCoordinator({
    runtimeClient,
    secureStore,
    cacheStores: [tempPreviewManager, internalUpdateRuntime],
    outlookLifecycle,
  });
  await coordinator.restoreSession();
  fileBridgeController = createFileBridgeController({
    dialog,
    permissionClient: createDesktopFileBridgePermissionClient(coordinator),
    documentProvider: createDesktopVaultDocumentProvider(coordinator),
    uploadProvider: createDesktopVaultUploadProvider(coordinator),
    previewManager: tempPreviewManager,
    classicOutlookBridge,
  });
  desktopShell = await startDesktopShell({
    BrowserWindowConstructor: BrowserWindow,
    ipcMain,
    coordinator,
    fileBridgeController,
    internalUpdateRuntime,
    openExternal: (url) => electronShell.openExternal(url),
    writeClipboard: (url) => electronClipboard.writeText(url),
    onSessionAvailable: () => instanceCoordinator.retryPendingAuthCallbacks(),
    packaged: app.isPackaged === true,
  });
  instanceCoordinator.setActiveWindow(desktopShell.window);
  return desktopShell;
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
