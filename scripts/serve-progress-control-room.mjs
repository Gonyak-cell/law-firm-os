import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getProgressSnapshot } from "./progress-control-room-data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "tools", "progress-control-room", "index.html");
const clientSnapshotPath = path.join(root, "tools", "progress-control-room", "live-data.js");
const startPort = Number(process.env.LAWOS_PROGRESS_PORT || 4177);
const maxPort = startPort + 30;

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

async function handle(req, res) {
  const url = new URL(req.url || "/", "http://127.0.0.1");

  if (url.pathname === "/api/progress") {
    try {
      send(res, 200, JSON.stringify(getProgressSnapshot({ root }), null, 2), {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      });
    } catch (error) {
      send(res, 500, JSON.stringify({ error: error.message }), {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      });
    }
    return;
  }

  if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/law-firm-os-progress-control-room.html") {
    const html = await fs.readFile(htmlPath, "utf8");
    send(res, 200, html, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    return;
  }

  if (url.pathname === "/live-data.js" || url.pathname === "/progress-control-room-live-data.js") {
    await writeClientSnapshot();
    const script = await fs.readFile(clientSnapshotPath, "utf8");
    send(res, 200, script, {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "no-store",
    });
    return;
  }

  send(res, 404, "Not found", { "content-type": "text/plain; charset=utf-8" });
}

async function writeClientSnapshot() {
  const snapshot = getProgressSnapshot({ root });
  const body = `window.LAWOS_PROGRESS_SNAPSHOT = ${JSON.stringify(snapshot, null, 2)};\n` +
    `window.dispatchEvent(new CustomEvent("lawos-progress-data", { detail: window.LAWOS_PROGRESS_SNAPSHOT }));\n`;
  await fs.writeFile(clientSnapshotPath, body, "utf8");
  return snapshot;
}

function listen(port) {
  const server = http.createServer((req, res) => {
    handle(req, res).catch((error) => {
      send(res, 500, error.stack || error.message, { "content-type": "text/plain; charset=utf-8" });
    });
  });

  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && port < maxPort) {
      listen(port + 1);
      return;
    }
    throw error;
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`Law Firm OS progress control room: http://127.0.0.1:${port}/`);
    console.log(`Progress API: http://127.0.0.1:${port}/api/progress`);
    writeClientSnapshot()
      .then((snapshot) => console.log(`Client snapshot: ${snapshot.latest?.pack || snapshot.liveCursor.pack_id} at ${snapshot.snapshotLabel}`))
      .catch((error) => console.error(`Client snapshot failed: ${error.message}`));
    setInterval(() => {
      writeClientSnapshot()
        .then((snapshot) => console.log(`Client snapshot: ${snapshot.latest?.pack || snapshot.liveCursor.pack_id} at ${snapshot.snapshotLabel}`))
        .catch((error) => console.error(`Client snapshot failed: ${error.message}`));
    }, 60 * 1000);
  });
}

listen(startPort);
