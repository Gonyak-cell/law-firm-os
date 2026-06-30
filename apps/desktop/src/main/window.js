export const MAIN_WINDOW_WEB_PREFERENCES = Object.freeze({
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
  allowRunningInsecureContent: false,
  devTools: false
});

export const MAIN_WINDOW_READY_EVENT = "ready-to-show";

export const MAIN_WINDOW_OPTIONS = Object.freeze({
  title: "matter",
  width: 1280,
  height: 820,
  minWidth: 1024,
  minHeight: 640,
  show: false,
  autoHideMenuBar: true,
  webPreferences: MAIN_WINDOW_WEB_PREFERENCES
});

export function mainWindowOptions(overrides = {}) {
  return {
    ...MAIN_WINDOW_OPTIONS,
    ...overrides,
    webPreferences: {
      ...MAIN_WINDOW_WEB_PREFERENCES,
      ...(overrides.webPreferences ?? {})
    }
  };
}

export async function createMainWindow({ BrowserWindowConstructor, options = {} } = {}) {
  const Constructor = BrowserWindowConstructor ?? (await import("electron")).BrowserWindow;
  const window = new Constructor(mainWindowOptions(options));
  const revealWindow = () => {
    if (window.isDestroyed?.()) return;
    window.show();
    window.focus?.();
  };
  window.once(MAIN_WINDOW_READY_EVENT, revealWindow);
  window.webContents?.once?.("did-finish-load", revealWindow);
  return window;
}
