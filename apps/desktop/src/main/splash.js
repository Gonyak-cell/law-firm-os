import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const SPLASH_BRAND = "AMIC Law";
export const SPLASH_HANDOFF_TIMEOUT_MS = 8000;
const splashFontDataUrl = Symbol("splashFontDataUrl");
const splashLogoDataUrl = Symbol("splashLogoDataUrl");

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

function splashLogo(logoDataUrl = "") {
  return logoDataUrl
    ? `<img class="logo" src="${logoDataUrl}" alt="" aria-hidden="true" />`
    : `<strong class="word">${SPLASH_BRAND}</strong>`;
}

export function splashHtml(fontDataUrl = "", logoDataUrl = "") {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${SPLASH_BRAND}</title>
<style>
${splashFontFace(fontDataUrl)}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#0f3a32;font-family:"SUITE Matter",sans-serif;font-synthesis:none}
.splash{display:grid;justify-items:center}
.logo{display:block;width:250px;height:40px;object-fit:contain}
.word{font-size:36px;font-weight:400}
@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:1ms!important;transition-duration:1ms!important;scroll-behavior:auto!important}.splash{gap:8px}}
</style>
</head>
<body>
<main class="splash" aria-label="${SPLASH_BRAND}">
${splashLogo(logoDataUrl)}
</main>
</body>
</html>`;
}

export function splashDataUrl(fontDataUrl = "", logoDataUrl = "") {
  return `data:text/html;charset=utf-8,${encodeURIComponent(splashHtml(fontDataUrl, logoDataUrl))}`;
}

export function fallbackHtml(reason = "startup-timeout", fontDataUrl = "", logoDataUrl = "") {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>${SPLASH_BRAND}</title><style>${splashFontFace(fontDataUrl)}body{font-family:"SUITE Matter",sans-serif;font-synthesis:none}.logo{display:block;width:175px;height:28px;object-fit:contain}.word,strong{font-weight:400}</style></head>
<body>
<main aria-label="${SPLASH_BRAND} 시작 화면">
${splashLogo(logoDataUrl)}
<p>시작 화면을 준비하고 있습니다.</p>
</main>
</body>
</html>`;
}

export function fallbackDataUrl(reason, fontDataUrl = "", logoDataUrl = "") {
  return `data:text/html;charset=utf-8,${encodeURIComponent(fallbackHtml(reason, fontDataUrl, logoDataUrl))}`;
}

export async function createSplashWindow({ BrowserWindowConstructor, appPath } = {}) {
  const electron = BrowserWindowConstructor && appPath ? null : await import("electron");
  const Constructor = BrowserWindowConstructor ?? electron.BrowserWindow;
  const resolvedAppPath = appPath ?? electron.app.getAppPath();
  const [suiteRegular, amicLawLogo] = await Promise.all([
    readFile(join(resolvedAppPath, "src/renderer/web/fonts/suite/SUITE-Regular.otf")),
    readFile(join(resolvedAppPath, "build/amic-law-logo-accent.svg"))
  ]);
  const fontDataUrl = `data:font/otf;base64,${suiteRegular.toString("base64")}`;
  const logoDataUrl = `data:image/svg+xml;base64,${amicLawLogo.toString("base64")}`;
  const splash = new Constructor(SPLASH_WINDOW_OPTIONS);
  splash[splashFontDataUrl] = fontDataUrl;
  splash[splashLogoDataUrl] = logoDataUrl;
  splash.once("ready-to-show", () => {
    splash.show();
  });
  await splash.loadURL(splashDataUrl(fontDataUrl, logoDataUrl));
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
    await splashWindow.loadURL(fallbackDataUrl(reason, splashWindow[splashFontDataUrl], splashWindow[splashLogoDataUrl]));
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
