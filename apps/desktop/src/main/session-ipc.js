export const SESSION_CHANNELS = Object.freeze({
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

const OUTLOOK_AUTHORIZE_HOST = "login.microsoftonline.com";
const OUTLOOK_SECRET_QUERY = /(?:token|secret|credential|password)/i;
const OUTLOOK_CONNECTION_COMPLETE_ROUTE = "/api/hrx/people/me/outlook-connection/complete";
const OUTLOOK_AUTHORIZATION_OPEN_TIMEOUT_MS = 10_000;
const OUTLOOK_AUTHORIZATION_COPY_FAILED = Object.freeze({
  copied: false,
  reason: "outlook_authorization_copy_failed"
});

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

async function openOutlookAuthorization(
  payload,
  openExternal,
  timeoutMs = OUTLOOK_AUTHORIZATION_OPEN_TIMEOUT_MS
) {
  const url = payload?.url;
  if (!isAllowedOutlookAuthorizationUrl(url)) {
    return { opened: false, handoff_accepted: false, reason: "outlook_authorization_url_not_allowed" };
  }
  if (typeof openExternal !== "function") {
    return { opened: false, handoff_accepted: false, reason: "outlook_authorization_opener_unavailable" };
  }
  const boundedTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : OUTLOOK_AUTHORIZATION_OPEN_TIMEOUT_MS;
  let timeout;
  try {
    await new Promise((resolve, reject) => {
      timeout = setTimeout(() => {
        const error = new Error("Outlook authorization handoff timed out");
        error.code = "OUTLOOK_AUTHORIZATION_OPEN_TIMEOUT";
        reject(error);
      }, boundedTimeoutMs);
      Promise.resolve()
        .then(() => openExternal(url))
        .then(resolve, reject);
    });
    return { opened: true, handoff_accepted: true };
  } catch (error) {
    return {
      opened: false,
      handoff_accepted: false,
      reason: error?.code === "OUTLOOK_AUTHORIZATION_OPEN_TIMEOUT"
        ? "outlook_authorization_open_timeout"
        : "outlook_authorization_open_failed"
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function copyOutlookAuthorization(payload, writeClipboard) {
  const url = payload?.url;
  if (!isAllowedOutlookAuthorizationUrl(url) || typeof writeClipboard !== "function") {
    return OUTLOOK_AUTHORIZATION_COPY_FAILED;
  }
  try {
    await writeClipboard(url);
    return { copied: true };
  } catch {
    return OUTLOOK_AUTHORIZATION_COPY_FAILED;
  }
}

export function registerSessionIpcHandlers({
  ipcMain,
  coordinator,
  isTrustedSender,
  openExternal,
  writeClipboard,
  outlookAuthorizationOpenTimeoutMs = OUTLOOK_AUTHORIZATION_OPEN_TIMEOUT_MS,
  onSessionAvailable,
  waitForLogoIntroReady = () => undefined
}) {
  if (!ipcMain?.handle) throw new Error("ipcMain.handle is required for session IPC registration");
  if (!coordinator) throw new Error("session coordinator is required for session IPC registration");

  const login = async (payload) => {
    const response = await coordinator.login(payload);
    if (response?.session?.state === "signed_in") {
      Promise.resolve().then(() => onSessionAvailable?.()).catch(() => undefined);
    }
    return response;
  };
  const mainOnlyOutlookPath = (path) => typeof path === "string" && (
    path === OUTLOOK_CONNECTION_COMPLETE_ROUTE
    || /^\/api\/desktop\/installations(?:\/|$|\?)/u.test(path)
    || /^\/api\/outlook\/readiness(?:\?|$)/u.test(path)
  );
  const api = (payload) => mainOnlyOutlookPath(payload?.path)
    ? {
      ok: false,
      reason: "desktop_main_only_route",
      http_status: 403,
      token_material_returned: false
    }
    : coordinator.api(payload);
  const confirmOutlookMicrosoft = async (payload) => {
    if (!isAllowedOutlookAuthorizationUrl(payload?.url)) {
      return openOutlookAuthorization(payload, openExternal, outlookAuthorizationOpenTimeoutMs);
    }
    return coordinator.confirmOutlookMicrosoft(
      { confirmed: payload?.confirmed === true },
      () => openOutlookAuthorization(
        payload,
        openExternal,
        outlookAuthorizationOpenTimeoutMs,
      ),
    );
  };
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
    [SESSION_CHANNELS.openOutlookAuthorization, (payload) => openOutlookAuthorization(
      payload,
      openExternal,
      outlookAuthorizationOpenTimeoutMs,
    )],
    [SESSION_CHANNELS.copyOutlookAuthorization, (payload) => copyOutlookAuthorization(
      payload,
      writeClipboard
    )],
    [SESSION_CHANNELS.outlookLifecycleStatus, () => coordinator.outlookLifecycleStatus()],
    [SESSION_CHANNELS.retryOutlookLifecycle, () => coordinator.retryOutlookLifecycle()],
    [SESSION_CHANNELS.confirmOutlookMicrosoft, confirmOutlookMicrosoft],
    [SESSION_CHANNELS.disconnectOutlookDevice, (payload) => coordinator.disconnectOutlookDevice({
      confirmed: payload?.confirmed === true
    })],
    [SESSION_CHANNELS.login, login],
    [SESSION_CHANNELS.features, (payload) => coordinator.features(payload)],
    [SESSION_CHANNELS.smoke, (payload) => coordinator.smoke(payload)],
    [SESSION_CHANNELS.api, api],
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

  return {
    channels: handlers.map(([channel]) => channel),
    dispose() {
      if (ipcMain.removeHandler) {
        for (const [channel] of handlers) ipcMain.removeHandler(channel);
      }
    }
  };
}
