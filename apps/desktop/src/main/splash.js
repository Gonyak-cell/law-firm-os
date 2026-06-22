export const SPLASH_BRAND = "matter by AMIC";
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
.mark{display:block;width:148px;height:88px;overflow:visible}
.symbol-piece{opacity:0;animation:symbolIn 620ms cubic-bezier(.16,1.18,.32,1) both}
.yellow{animation-delay:80ms}.green{animation-delay:160ms}
.word{font-size:42px;font-weight:300}
@keyframes symbolIn{to{opacity:1}}
@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:1ms!important;transition-duration:1ms!important;scroll-behavior:auto!important}.splash{gap:8px}}
</style>
</head>
<body>
<main class="splash" aria-label="${SPLASH_BRAND}">
<svg class="mark" viewBox="0 0 222 132" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><rect class="symbol-piece red" x="41" y="7" width="48" height="118" rx="24" transform="rotate(31 65 66)" fill="#FF3158"></rect><rect class="symbol-piece yellow" x="104" y="7" width="48" height="118" rx="24" transform="rotate(31 128 66)" fill="#FFD43D"></rect><circle class="symbol-piece green" cx="194" cy="94" r="25" fill="#5CC878"></circle></svg>
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
