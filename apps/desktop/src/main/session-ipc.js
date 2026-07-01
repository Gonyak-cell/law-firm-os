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
  logout: "session:logout"
});

export function registerSessionIpcHandlers({ ipcMain, coordinator }) {
  if (!ipcMain?.handle) throw new Error("ipcMain.handle is required for session IPC registration");
  if (!coordinator) throw new Error("session coordinator is required for session IPC registration");

  const handlers = [
    [SESSION_CHANNELS.status, () => coordinator.sessionStatus()],
    [SESSION_CHANNELS.claimLogoIntro, () => coordinator.claimLogoIntro()],
    [SESSION_CHANNELS.runtime, () => coordinator.runtimeStatus()],
    [SESSION_CHANNELS.accounts, () => coordinator.accounts()],
    [SESSION_CHANNELS.requestPasswordReset, (_event, payload) => coordinator.requestPasswordReset(payload)],
    [SESSION_CHANNELS.latestResetEmail, (_event, payload) => coordinator.latestResetEmail(payload)],
    [SESSION_CHANNELS.confirmPasswordReset, (_event, payload) => coordinator.confirmPasswordReset(payload)],
    [SESSION_CHANNELS.login, (_event, payload) => coordinator.login(payload)],
    [SESSION_CHANNELS.features, (_event, payload) => coordinator.features(payload)],
    [SESSION_CHANNELS.smoke, (_event, payload) => coordinator.smoke(payload)],
    [SESSION_CHANNELS.logout, () => coordinator.logout()]
  ];

  for (const [channel, handler] of handlers) ipcMain.handle(channel, handler);

  return {
    channels: handlers.map(([channel]) => channel),
    dispose() {
      if (!ipcMain.removeHandler) return;
      for (const [channel] of handlers) ipcMain.removeHandler(channel);
    }
  };
}
