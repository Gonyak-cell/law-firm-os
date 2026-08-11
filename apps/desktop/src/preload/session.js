import { contextBridge, ipcRenderer } from "electron";

export const PRELOAD_CHANNEL_ALLOWLIST = Object.freeze({
  status: "session:status",
  claimLogoIntro: "session:logo-intro:claim",
  runtime: "session:runtime",
  accounts: "session:accounts",
  requestPasswordReset: "session:password-reset:request",
  latestResetEmail: "session:password-reset:latest-email",
  confirmPasswordReset: "session:password-reset:confirm",
  openOutlookAuthorization: "desktop:outlook-authorization:open",
  copyOutlookAuthorization: "desktop:outlook-authorization:copy",
  outlookLifecycleStatus: "desktop:outlook-lifecycle:status",
  retryOutlookLifecycle: "desktop:outlook-lifecycle:retry",
  confirmOutlookMicrosoft: "desktop:outlook-lifecycle:confirm-microsoft",
  disconnectOutlookDevice: "desktop:outlook-lifecycle:disconnect",
  login: "session:login",
  features: "session:features",
  smoke: "session:smoke",
  api: "session:api",
  logout: "session:logout"
});

export const PRELOAD_EVENT_ALLOWLIST = Object.freeze({
  passwordResetDeepLink: "desktop:password-reset:confirm",
  outlookConnectionResult: "desktop:outlook-connection:result"
});

const OUTLOOK_CONNECTION_RESULT_STATUSES = new Set([
  "connected",
  "expired",
  "session_required",
  "retryable",
  "error"
]);
const SAFE_OUTLOOK_RESULT_ID = /^[A-Za-z0-9._:-]{1,160}$/;
const SAFE_OUTLOOK_ERROR_CODE = /^[A-Z0-9_]{1,160}$/;

function invokeAllowed(command, payload) {
  const channel = PRELOAD_CHANNEL_ALLOWLIST[command];
  if (!channel) throw new Error(`Blocked preload session command: ${command}`);
  return ipcRenderer.invoke(channel, payload);
}

const pendingOutlookConnectionResults = [];
let outlookConnectionResultHandler = null;

function safeOutlookConnectionResult(payload) {
  if (
    payload?.type !== "outlook_connection_result"
    || !OUTLOOK_CONNECTION_RESULT_STATUSES.has(payload.status)
    || !Number.isInteger(payload.http_status)
    || payload.http_status < 0
    || payload.http_status > 599
    || !(
      payload.safe_error_code === null
      || (typeof payload.safe_error_code === "string" && SAFE_OUTLOOK_ERROR_CODE.test(payload.safe_error_code))
    )
  ) return null;
  const result = {
    type: "outlook_connection_result",
    status: payload.status,
    http_status: payload.http_status,
    safe_error_code: payload.safe_error_code
  };
  for (const field of ["employee_id", "connection_state"]) {
    if (payload[field] === null) result[field] = null;
    else if (typeof payload[field] === "string" && SAFE_OUTLOOK_RESULT_ID.test(payload[field])) result[field] = payload[field];
  }
  return result;
}

function rememberOutlookConnectionResult(result) {
  if (pendingOutlookConnectionResults.length >= 32) pendingOutlookConnectionResults.shift();
  pendingOutlookConnectionResults.push(result);
}

ipcRenderer.on(PRELOAD_EVENT_ALLOWLIST.outlookConnectionResult, (_event, payload) => {
  const result = safeOutlookConnectionResult(payload);
  if (!result) return;
  if (!outlookConnectionResultHandler) {
    rememberOutlookConnectionResult(result);
    return;
  }
  try {
    outlookConnectionResultHandler(result);
  } catch {
    rememberOutlookConnectionResult(result);
  }
});

function onAllowedEvent(eventName, handler) {
  const channel = PRELOAD_EVENT_ALLOWLIST[eventName];
  if (!channel) throw new Error(`Blocked preload session event: ${eventName}`);
  if (typeof handler !== "function") return () => {};
  if (eventName === "outlookConnectionResult") {
    outlookConnectionResultHandler = handler;
    while (pendingOutlookConnectionResults.length > 0) {
      const result = pendingOutlookConnectionResults.shift();
      try {
        handler(result);
      } catch {
        pendingOutlookConnectionResults.unshift(result);
        break;
      }
    }
    return () => {
      if (outlookConnectionResultHandler === handler) outlookConnectionResultHandler = null;
    };
  }
  const listener = (_event, payload) => {
    if (payload?.type !== "password_reset_confirm" || typeof payload.token !== "string") return;
    handler({ type: "password_reset_confirm", routeOnly: true, token: payload.token });
  };
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

export const sessionApi = Object.freeze({
  desktopApiBaseUrl: process.env.MATTER_DESKTOP_API_BASE_URL ?? "",
  status: () => invokeAllowed("status"),
  claimLogoIntro: () => invokeAllowed("claimLogoIntro"),
  runtime: () => invokeAllowed("runtime"),
  accounts: () => invokeAllowed("accounts"),
  requestPasswordReset: (payload) => invokeAllowed("requestPasswordReset", payload),
  latestResetEmail: (payload) => invokeAllowed("latestResetEmail", payload),
  confirmPasswordReset: (payload) => invokeAllowed("confirmPasswordReset", payload),
  openOutlookAuthorization: (url) => invokeAllowed("openOutlookAuthorization", { url }),
  copyOutlookAuthorization: (url) => invokeAllowed("copyOutlookAuthorization", { url }),
  outlookLifecycleStatus: () => invokeAllowed("outlookLifecycleStatus"),
  retryOutlookLifecycle: () => invokeAllowed("retryOutlookLifecycle"),
  confirmOutlookMicrosoft: (url) => invokeAllowed("confirmOutlookMicrosoft", { url, confirmed: true }),
  disconnectOutlookDevice: () => invokeAllowed("disconnectOutlookDevice", { confirmed: true }),
  login: (payload) => invokeAllowed("login", payload),
  features: (payload) => invokeAllowed("features", payload),
  smoke: (payload) => invokeAllowed("smoke", payload),
  api: (payload) => invokeAllowed("api", payload),
  logout: () => invokeAllowed("logout"),
  onPasswordResetDeepLink: (handler) => onAllowedEvent("passwordResetDeepLink", handler),
  onOutlookConnectionResult: (handler) => onAllowedEvent("outlookConnectionResult", handler)
});

contextBridge.exposeInMainWorld("matterSession", sessionApi);
