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
  authCallbackReady: "desktop:auth-callback:ready",
  authCallbackAcknowledge: "desktop:auth-callback:acknowledge",
  login: "session:login",
  features: "session:features",
  smoke: "session:smoke",
  api: "session:api",
  logout: "session:logout"
});

export const PRELOAD_EVENT_ALLOWLIST = Object.freeze({
  passwordResetDeepLink: "desktop:password-reset:confirm",
  authCallbackDeepLink: "desktop:auth-callback"
});

function invokeAllowed(command, payload) {
  const channel = PRELOAD_CHANNEL_ALLOWLIST[command];
  if (!channel) throw new Error(`Blocked preload session command: ${command}`);
  return ipcRenderer.invoke(channel, payload);
}

function sendAllowed(command, payload) {
  const channel = PRELOAD_CHANNEL_ALLOWLIST[command];
  if (!channel) throw new Error(`Blocked preload session command: ${command}`);
  ipcRenderer.send(channel, payload);
}

const pendingAuthCallbacks = [];
let authCallbackHandler = null;
const authCallbackRendererId = globalThis.crypto.randomUUID();

function safeAuthCallback(payload) {
  if (
    payload?.type !== "auth_callback"
    || typeof payload.code !== "string"
    || typeof payload.state !== "string"
  ) return null;
  return { type: "auth_callback", routeOnly: true, code: payload.code, state: payload.state };
}

function rememberPendingAuthCallback(callback, { first = false } = {}) {
  if (
    pendingAuthCallbacks.length >= 256
    || pendingAuthCallbacks.some((pending) => pending.state === callback.state)
  ) return false;
  if (first) pendingAuthCallbacks.unshift(callback);
  else pendingAuthCallbacks.push(callback);
  return true;
}

function deliverAuthCallback(callback, handler) {
  let result;
  try {
    result = handler(callback);
  } catch {
    return false;
  }
  const acknowledge = () => {
    try {
      sendAllowed("authCallbackAcknowledge", {
        renderer_id: authCallbackRendererId,
        state: callback.state
      });
      return true;
    } catch {
      return false;
    }
  };
  if (result && typeof result.then === "function") {
    Promise.resolve(result).then(
      () => {
        if (!acknowledge()) rememberPendingAuthCallback(callback);
      },
      () => rememberPendingAuthCallback(callback)
    );
  } else {
    return acknowledge();
  }
  return true;
}

ipcRenderer.on(PRELOAD_EVENT_ALLOWLIST.authCallbackDeepLink, (_event, payload) => {
  const callback = safeAuthCallback(payload);
  if (!callback) return;
  if (authCallbackHandler) {
    if (!deliverAuthCallback(callback, authCallbackHandler)) {
      rememberPendingAuthCallback(callback, { first: true });
    }
    return;
  }
  rememberPendingAuthCallback(callback);
});
sendAllowed("authCallbackReady", { renderer_id: authCallbackRendererId });

function onAllowedEvent(eventName, handler) {
  const channel = PRELOAD_EVENT_ALLOWLIST[eventName];
  if (!channel) throw new Error(`Blocked preload session event: ${eventName}`);
  if (typeof handler !== "function") return () => {};
  if (eventName === "authCallbackDeepLink") {
    authCallbackHandler = handler;
    while (pendingAuthCallbacks.length > 0) {
      const callback = pendingAuthCallbacks.shift();
      if (!deliverAuthCallback(callback, handler)) {
        rememberPendingAuthCallback(callback, { first: true });
        break;
      }
    }
    return () => {
      if (authCallbackHandler === handler) authCallbackHandler = null;
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
  login: (payload) => invokeAllowed("login", payload),
  features: (payload) => invokeAllowed("features", payload),
  smoke: (payload) => invokeAllowed("smoke", payload),
  api: (payload) => invokeAllowed("api", payload),
  logout: () => invokeAllowed("logout"),
  onPasswordResetDeepLink: (handler) => onAllowedEvent("passwordResetDeepLink", handler),
  onAuthCallbackDeepLink: (handler) => onAllowedEvent("authCallbackDeepLink", handler)
});

contextBridge.exposeInMainWorld("matterSession", sessionApi);
