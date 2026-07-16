import { app, BrowserWindow, net, protocol } from "electron";
import {
  MATTER_APP_ORIGIN,
  installMatterAppProtocol,
  matterAppRendererUrl,
  registerMatterAppScheme,
} from "../../src/main/app-protocol.js";

const webRoot = process.env.MATTER_APP_PROTOCOL_WEB_ROOT;
if (!webRoot) throw new Error("MATTER_APP_PROTOCOL_WEB_ROOT is required");
registerMatterAppScheme(protocol);

const timeout = setTimeout(() => {
  console.error(JSON.stringify({ verdict: "FAIL", reason: "built_renderer_timeout" }));
  app.exit(1);
}, 20_000);

async function runSmoke() {
  installMatterAppProtocol({ protocol, net, webRoot });
  const cspViolations = [];
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });
  window.webContents.on("console-message", (_event, details) => {
    if (/content security policy|refused to load/iu.test(details.message)) cspViolations.push(details.message);
  });
  await window.loadURL(matterAppRendererUrl());
  let state;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    state = await window.webContents.executeJavaScript(`({
      origin: window.location.origin,
      skin: document.documentElement.dataset.skin,
      csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content ?? '',
      root_child_count: document.querySelector('#root')?.childElementCount ?? 0
    })`);
    if (state.root_child_count > 0) break;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  const passed = state.origin === MATTER_APP_ORIGIN
    && state.skin === "forest"
    && state.root_child_count > 0
    && !state.csp.includes("unsafe-eval")
    && cspViolations.length === 0;
  console.log(JSON.stringify({
    verdict: passed ? "PASS" : "FAIL",
    electron_version: process.versions.electron,
    renderer_origin: state.origin,
    skin: state.skin,
    root_child_count: state.root_child_count,
    csp_present: Boolean(state.csp),
    unsafe_eval: state.csp.includes("unsafe-eval"),
    csp_violation_count: cspViolations.length,
  }));
  clearTimeout(timeout);
  window.destroy();
  app.exit(passed ? 0 : 1);
}

function failSmoke(error) {
  clearTimeout(timeout);
  console.error(JSON.stringify({ verdict: "FAIL", reason: error?.message ?? String(error) }));
  app.exit(1);
}

app.whenReady().then(runSmoke).catch(failSmoke);
