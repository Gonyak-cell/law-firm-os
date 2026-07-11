import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const SPLASH_BRAND = "matter";
export const SPLASH_HANDOFF_TIMEOUT_MS = 8000;
const splashFontDataUrl = Symbol("splashFontDataUrl");

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

function splashFontFace(fontDataUrl = "") {
  return fontDataUrl
    ? `@font-face{font-family:"SUITE Matter";src:url("${fontDataUrl}") format("opentype");font-weight:400}`
    : "";
}

export function splashHtml(fontDataUrl = "") {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${SPLASH_BRAND}</title>
<style>
${splashFontFace(fontDataUrl)}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#06102d;font-family:"SUITE Matter",sans-serif;font-synthesis:none}
.splash{display:grid;justify-items:center;gap:12px}
.mark{position:relative;width:88px;height:72px}
.mark-stroke{position:absolute;top:4px;width:20px;height:58px;border-radius:8px;transform:rotate(31deg)}
.red{left:10px;background:#ff2d55}.yellow{left:45px;background:#ffcc00}.dot{position:absolute;right:0;bottom:8px;width:22px;height:22px;border-radius:50%;background:#00ca72}
.word{font-size:42px;font-weight:400}
@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:1ms!important;transition-duration:1ms!important;scroll-behavior:auto!important}.splash{gap:8px}}
</style>
</head>
<body>
<main class="splash" aria-label="${SPLASH_BRAND}">
<span class="mark" aria-hidden="true"><span class="mark-stroke red"></span><span class="mark-stroke yellow"></span><span class="dot"></span></span>
<strong class="word">matter</strong>
</main>
</body>
</html>`;
}

export function splashDataUrl(fontDataUrl = "") {
  return `data:text/html;charset=utf-8,${encodeURIComponent(splashHtml(fontDataUrl))}`;
}

export function fallbackHtml(reason = "startup-timeout", fontDataUrl = "") {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>${SPLASH_BRAND}</title><style>${splashFontFace(fontDataUrl)}body{font-family:"SUITE Matter",sans-serif;font-synthesis:none}strong{font-weight:400}</style></head>
<body>
<main aria-label="${SPLASH_BRAND} 시작 화면">
<strong>${SPLASH_BRAND}</strong>
<p>시작 화면을 준비하고 있습니다.</p>
</main>
</body>
</html>`;
}

export function fallbackDataUrl(reason, fontDataUrl = "") {
  return `data:text/html;charset=utf-8,${encodeURIComponent(fallbackHtml(reason, fontDataUrl))}`;
}

export async function createSplashWindow({ BrowserWindowConstructor, appPath } = {}) {
  const electron = BrowserWindowConstructor && appPath ? null : await import("electron");
  const Constructor = BrowserWindowConstructor ?? electron.BrowserWindow;
  const resolvedAppPath = appPath ?? electron.app.getAppPath();
  const suiteRegular = await readFile(join(resolvedAppPath, "src/renderer/web/fonts/suite/SUITE-Regular.otf"));
  const fontDataUrl = `data:font/otf;base64,${suiteRegular.toString("base64")}`;
  const splash = new Constructor(SPLASH_WINDOW_OPTIONS);
  splash[splashFontDataUrl] = fontDataUrl;
  splash.once("ready-to-show", () => {
    splash.show();
  });
  await splash.loadURL(splashDataUrl(fontDataUrl));
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
    await splashWindow.loadURL(fallbackDataUrl(reason, splashWindow[splashFontDataUrl]));
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
