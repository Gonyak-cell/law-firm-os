import { app, BrowserWindow, net, protocol } from "electron";
import { createServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  MATTER_APP_ORIGIN,
  installMatterAppProtocol,
  matterAppRendererUrl,
  registerMatterAppScheme,
} from "../../src/main/app-protocol.js";

const root = process.env.MATTER_APP_PROTOCOL_QA_ROOT;
if (!root) throw new Error("MATTER_APP_PROTOCOL_QA_ROOT is required");
const webRoot = join(root, "web");
mkdirSync(webRoot, { recursive: true });
registerMatterAppScheme(protocol);
console.log(JSON.stringify({ stage: "scheme_registered" }));

let resolveOrigin;
const observedOrigin = new Promise((resolve) => { resolveOrigin = resolve; });
const server = createServer((req, res) => {
  const origin = req.headers.origin ?? null;
  resolveOrigin(origin);
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": MATTER_APP_ORIGIN,
    vary: "origin",
  });
  res.end("{\"ok\":true}");
});
await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const port = server.address().port;
console.log(JSON.stringify({ stage: "probe_server_ready" }));
writeFileSync(join(webRoot, "index.html"), "<!doctype html><title>matter protocol QA</title><script type=\"module\" src=\"/probe.js\"></script>\n");
writeFileSync(join(webRoot, "probe.js"), `fetch("http://127.0.0.1:${port}/origin-probe").then(() => { document.title = "PASS"; });\n`);

const timeout = setTimeout(() => {
  console.error(JSON.stringify({ verdict: "FAIL", reason: "electron_origin_probe_timeout" }));
  app.exit(1);
}, 20_000);

async function runProbe() {
  console.log(JSON.stringify({ stage: "app_ready" }));
  installMatterAppProtocol({ protocol, net, webRoot });
  console.log(JSON.stringify({ stage: "protocol_handler_installed" }));
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });
  window.webContents.on("did-fail-load", (_event, code, description) => {
    console.error(JSON.stringify({ stage: "did_fail_load", code, description }));
  });
  window.webContents.on("console-message", (_event, details) => {
    console.error(JSON.stringify({ stage: "renderer_console", level: details.level, message: details.message }));
  });
  await window.loadURL(matterAppRendererUrl());
  console.log(JSON.stringify({ stage: "renderer_loaded" }));
  const origin = await observedOrigin;
  console.log(JSON.stringify({
    verdict: origin === MATTER_APP_ORIGIN ? "PASS" : "FAIL",
    electron_version: process.versions.electron,
    renderer_url: matterAppRendererUrl(),
    observed_origin: origin,
  }));
  clearTimeout(timeout);
  window.destroy();
  await new Promise((resolveClose) => server.close(resolveClose));
  app.exit(origin === MATTER_APP_ORIGIN ? 0 : 1);
}

function failProbe(error) {
  clearTimeout(timeout);
  console.error(JSON.stringify({ verdict: "FAIL", reason: error?.message ?? String(error) }));
  server.close();
  app.exit(1);
}

app.whenReady().then(runProbe).catch(failProbe);
