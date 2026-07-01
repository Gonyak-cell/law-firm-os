const { contextBridge, ipcRenderer } = require("electron");

const PRELOAD_CHANNEL_ALLOWLIST = Object.freeze({
  status: "session:status",
  claimLogoIntro: "session:logo-intro:claim",
  runtime: "session:runtime",
  accounts: "session:accounts",
  requestPasswordReset: "session:password-reset:request",
  latestResetEmail: "session:password-reset:latest-email",
  confirmPasswordReset: "session:password-reset:confirm",
  login: "session:login",
  features: "session:features",
  smoke: "session:smoke",
  logout: "session:logout"
});

const PRELOAD_EVENT_ALLOWLIST = Object.freeze({
  passwordResetDeepLink: "desktop:password-reset:confirm"
});

function invokeAllowed(command, payload) {
  const channel = PRELOAD_CHANNEL_ALLOWLIST[command];
  if (!channel) throw new Error(`Blocked preload session command: ${command}`);
  return ipcRenderer.invoke(channel, payload);
}

function onAllowedEvent(eventName, handler) {
  const channel = PRELOAD_EVENT_ALLOWLIST[eventName];
  if (!channel) throw new Error(`Blocked preload session event: ${eventName}`);
  if (typeof handler !== "function") return () => {};
  const listener = (_event, payload) => {
    if (payload?.type !== "password_reset_confirm" || typeof payload.token !== "string") return;
    handler({ type: "password_reset_confirm", routeOnly: true, token: payload.token });
  };
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const sessionApi = Object.freeze({
  desktopApiBaseUrl: process.env.MATTER_DESKTOP_API_BASE_URL ?? "",
  status: () => invokeAllowed("status"),
  claimLogoIntro: () => invokeAllowed("claimLogoIntro"),
  runtime: () => invokeAllowed("runtime"),
  accounts: () => invokeAllowed("accounts"),
  requestPasswordReset: (payload) => invokeAllowed("requestPasswordReset", payload),
  latestResetEmail: (payload) => invokeAllowed("latestResetEmail", payload),
  confirmPasswordReset: (payload) => invokeAllowed("confirmPasswordReset", payload),
  login: (payload) => invokeAllowed("login", payload),
  features: (payload) => invokeAllowed("features", payload),
  smoke: (payload) => invokeAllowed("smoke", payload),
  logout: () => invokeAllowed("logout"),
  onPasswordResetDeepLink: (handler) => onAllowedEvent("passwordResetDeepLink", handler)
});

contextBridge.exposeInMainWorld("matterSession", sessionApi);
