export const SESSION_CHANNELS = Object.freeze({
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

const OUTLOOK_AUTHORIZE_HOST = "login.microsoftonline.com";
const OUTLOOK_SECRET_QUERY = /(?:token|secret|credential|password)/i;

export function isAllowedOutlookAuthorizationUrl(candidate) {
  if (typeof candidate !== "string" || !candidate.trim() || candidate.length > 8192) return false;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    return false;
  }
  const hasSecretParameter = [...url.searchParams.keys()].some((key) => OUTLOOK_SECRET_QUERY.test(key));
  return url.protocol === "https:"
    && url.hostname === OUTLOOK_AUTHORIZE_HOST
    && url.username === ""
    && url.password === ""
    && (url.port === "" || url.port === "443")
    && /^\/[^/]+\/oauth2\/v2\.0\/authorize\/?$/.test(url.pathname)
    && url.hash === ""
    && !hasSecretParameter;
}

async function openOutlookAuthorization(payload, openExternal) {
  const url = payload?.url;
  if (!isAllowedOutlookAuthorizationUrl(url)) {
    return { opened: false, reason: "outlook_authorization_url_not_allowed" };
  }
  if (typeof openExternal !== "function") {
    return { opened: false, reason: "outlook_authorization_opener_unavailable" };
  }
  try {
    await openExternal(url);
    return { opened: true };
  } catch {
    return { opened: false, reason: "outlook_authorization_open_failed" };
  }
}

export function registerSessionIpcHandlers({
  ipcMain,
  coordinator,
  isTrustedSender,
  openExternal,
  onAuthCallbackReady,
  onAuthCallbackAcknowledged,
  waitForLogoIntroReady = () => undefined
}) {
  if (!ipcMain?.handle) throw new Error("ipcMain.handle is required for session IPC registration");
  if (!coordinator) throw new Error("session coordinator is required for session IPC registration");

  const routes = [
    [SESSION_CHANNELS.status, () => coordinator.sessionStatus()],
    [SESSION_CHANNELS.claimLogoIntro, async () => {
      await waitForLogoIntroReady();
      return coordinator.claimLogoIntro();
    }],
    [SESSION_CHANNELS.runtime, () => coordinator.runtimeStatus()],
    [SESSION_CHANNELS.accounts, () => coordinator.accounts()],
    [SESSION_CHANNELS.requestPasswordReset, (payload) => coordinator.requestPasswordReset(payload)],
    [SESSION_CHANNELS.latestResetEmail, (payload) => coordinator.latestResetEmail(payload)],
    [SESSION_CHANNELS.confirmPasswordReset, (payload) => coordinator.confirmPasswordReset(payload)],
    [SESSION_CHANNELS.openOutlookAuthorization, (payload) => openOutlookAuthorization(payload, openExternal)],
    [SESSION_CHANNELS.login, (payload) => coordinator.login(payload)],
    [SESSION_CHANNELS.features, (payload) => coordinator.features(payload)],
    [SESSION_CHANNELS.smoke, (payload) => coordinator.smoke(payload)],
    [SESSION_CHANNELS.api, (payload) => coordinator.api(payload)],
    [SESSION_CHANNELS.logout, () => coordinator.logout()]
  ];

  const handlers = routes.map(([channel, route]) => [channel, async (event, payload) => {
    if (typeof isTrustedSender !== "function" || !isTrustedSender(event)) {
      const error = new Error("Blocked untrusted desktop IPC sender");
      error.code = "UNTRUSTED_RENDERER_IPC_SENDER";
      throw error;
    }
    return route(payload);
  }]);
  for (const [channel, handler] of handlers) ipcMain.handle(channel, handler);
  const authCallbackReadyHandler = (event, payload) => {
    if (typeof isTrustedSender !== "function" || !isTrustedSender(event)) return;
    onAuthCallbackReady?.(payload?.renderer_id);
  };
  const authCallbackAcknowledgeHandler = (event, payload) => {
    if (typeof isTrustedSender !== "function" || !isTrustedSender(event)) return;
    onAuthCallbackAcknowledged?.({
      rendererId: payload?.renderer_id,
      state: payload?.state
    });
  };
  ipcMain.on?.(SESSION_CHANNELS.authCallbackReady, authCallbackReadyHandler);
  ipcMain.on?.(SESSION_CHANNELS.authCallbackAcknowledge, authCallbackAcknowledgeHandler);

  return {
    channels: [
      ...handlers.map(([channel]) => channel),
      SESSION_CHANNELS.authCallbackReady,
      SESSION_CHANNELS.authCallbackAcknowledge
    ],
    dispose() {
      if (ipcMain.removeHandler) {
        for (const [channel] of handlers) ipcMain.removeHandler(channel);
      }
      ipcMain.removeListener?.(SESSION_CHANNELS.authCallbackReady, authCallbackReadyHandler);
      ipcMain.removeListener?.(SESSION_CHANNELS.authCallbackAcknowledge, authCallbackAcknowledgeHandler);
    }
  };
}
