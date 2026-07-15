export const SESSION_CHANNELS = Object.freeze({
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
  api: "session:api",
  logout: "session:logout"
});

export function registerSessionIpcHandlers({ ipcMain, coordinator, isTrustedSender }) {
  if (!ipcMain?.handle) throw new Error("ipcMain.handle is required for session IPC registration");
  if (!coordinator) throw new Error("session coordinator is required for session IPC registration");

  const routes = [
    [SESSION_CHANNELS.status, () => coordinator.sessionStatus()],
    [SESSION_CHANNELS.claimLogoIntro, () => coordinator.claimLogoIntro()],
    [SESSION_CHANNELS.runtime, () => coordinator.runtimeStatus()],
    [SESSION_CHANNELS.accounts, () => coordinator.accounts()],
    [SESSION_CHANNELS.requestPasswordReset, (payload) => coordinator.requestPasswordReset(payload)],
    [SESSION_CHANNELS.latestResetEmail, (payload) => coordinator.latestResetEmail(payload)],
    [SESSION_CHANNELS.confirmPasswordReset, (payload) => coordinator.confirmPasswordReset(payload)],
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

  return {
    channels: handlers.map(([channel]) => channel),
    dispose() {
      if (!ipcMain.removeHandler) return;
      for (const [channel] of handlers) ipcMain.removeHandler(channel);
    }
  };
}
