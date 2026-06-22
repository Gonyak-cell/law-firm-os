export const SPLASH_BRAND = "matter";
export const SPLASH_HANDOFF_TIMEOUT_MS = 8000;

export const SPLASH_WINDOW_OPTIONS = Object.freeze({
  width: 420,
  height: 300,
  show: false,
  frame: false,
  resizable: false,
  alwaysOnTop: true,
  backgroundColor: "#ffffff",
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true
  }
});

export function splashHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${SPLASH_BRAND}</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#06102d;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.splash{display:grid;justify-items:center;gap:12px}
.mark{position:relative;width:88px;height:72px}
.pill{position:absolute;top:4px;width:20px;height:58px;border-radius:999px;transform:rotate(31deg)}
.red{left:10px;background:#ff2d55}.yellow{left:45px;background:#ffcc00}.dot{position:absolute;right:0;bottom:8px;width:22px;height:22px;border-radius:50%;background:#00ca72}
.word{font-size:42px;font-weight:300}
@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:1ms!important;transition-duration:1ms!important;scroll-behavior:auto!important}.splash{gap:8px}}
</style>
</head>
<body>
<main class="splash" aria-label="${SPLASH_BRAND}">
<span class="mark" aria-hidden="true"><span class="pill red"></span><span class="pill yellow"></span><span class="dot"></span></span>
<strong class="word">matter</strong>
</main>
</body>
</html>`;
}

export function splashDataUrl() {
  return `data:text/html;charset=utf-8,${encodeURIComponent(splashHtml())}`;
}

export function fallbackHtml(reason = "startup-timeout") {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>${SPLASH_BRAND} fallback</title></head>
<body>
<main aria-label="${SPLASH_BRAND} startup fallback">
<strong>${SPLASH_BRAND}</strong>
<p>Offline startup fallback is active.</p>
<small>${reason}</small>
</main>
</body>
</html>`;
}

export function fallbackDataUrl(reason) {
  return `data:text/html;charset=utf-8,${encodeURIComponent(fallbackHtml(reason))}`;
}

export async function createSplashWindow({ BrowserWindowConstructor } = {}) {
  const Constructor = BrowserWindowConstructor ?? (await import("electron")).BrowserWindow;
  const splash = new Constructor(SPLASH_WINDOW_OPTIONS);
  splash.once("ready-to-show", () => {
    splash.show();
  });
  await splash.loadURL(splashDataUrl());
  return splash;
}

export function wireSplashToMainWindow({
  splashWindow,
  mainWindow,
  timeoutMs = SPLASH_HANDOFF_TIMEOUT_MS,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout
}) {
  let handedOff = false;
  let fallbackActive = false;

  const timer = setTimeoutFn(() => showFallback("main-window-timeout"), timeoutMs);

  function closeSplash() {
    if (handedOff || fallbackActive) return;
    handedOff = true;
    clearTimeoutFn(timer);
    if (!splashWindow.isDestroyed?.()) splashWindow.close();
  }

  async function showFallback(reason) {
    if (handedOff || fallbackActive) return;
    fallbackActive = true;
    clearTimeoutFn(timer);
    await splashWindow.loadURL(fallbackDataUrl(reason));
    splashWindow.show?.();
  }

  mainWindow.once("ready-to-show", closeSplash);
  mainWindow.webContents?.once?.("did-fail-load", (_event, code) => showFallback(`did-fail-load:${code}`));

  return {
    closeSplash,
    showFallback,
    timeoutMs,
    get state() {
      return { handedOff, fallbackActive };
    }
  };
}
