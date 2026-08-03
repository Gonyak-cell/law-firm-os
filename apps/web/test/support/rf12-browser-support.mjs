import assert from "node:assert/strict";
import { createServer as createNetServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer as createViteServer } from "vite";

const supportDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(supportDir, "../..");
const responseBodyCache = new WeakMap();

async function availablePort() {
  return new Promise((resolvePort, reject) => {
    const server = createNetServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

export async function startWebServer(apiPort) {
  const vitePort = await availablePort();
  const vite = await createViteServer({
    configFile: false,
    root: webRoot,
    logLevel: "silent",
    server: {
      host: "127.0.0.1",
      port: vitePort,
      strictPort: true,
      proxy: {
        "/api": { target: `http://127.0.0.1:${apiPort}`, changeOrigin: true },
        "/master-data": { target: `http://127.0.0.1:${apiPort}`, changeOrigin: true },
      },
    },
  });
  await vite.listen();
  return { vite, vitePort };
}

export function launchBrowser() {
  return chromium.launch({ headless: true, args: ["--disable-gpu"] });
}

export function redact(value, key = "") {
  if (/(authorization|password|secret|token|email)/i.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, redact(child, childKey)]));
  }
  return value;
}

export function parsedJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function readResponseBody(response) {
  if (!responseBodyCache.has(response)) {
    responseBodyCache.set(response, response.finished().then((error) => {
      if (error) throw error;
      return response.text();
    }).then((value) => parsedJson(value)));
  }
  return responseBodyCache.get(response);
}

function createHttpReceipt(page) {
  let sequence = 0;
  const requestSequence = new Map();
  const rows = [];
  const pending = new Set();

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!url.pathname.startsWith("/api/")) return;
    requestSequence.set(request, ++sequence);
  });
  page.on("response", (response) => {
    const request = response.request();
    if (!requestSequence.has(request)) return;
    const operation = (async () => {
      const url = new URL(request.url());
      let responseBody = null;
      try {
        responseBody = await readResponseBody(response);
      } catch {
        responseBody = "[UNAVAILABLE]";
      }
      rows.push({
        sequence: requestSequence.get(request),
        method: request.method(),
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        status: response.status(),
        request_body: redact(parsedJson(request.postData())),
        response_body: redact(responseBody),
        browser_delivery: "received",
      });
    })();
    pending.add(operation);
    operation.finally(() => pending.delete(operation));
  });
  page.on("requestfailed", (request) => {
    if (!requestSequence.has(request)) return;
    const url = new URL(request.url());
    rows.push({
      sequence: requestSequence.get(request),
      method: request.method(),
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      status: null,
      request_body: redact(parsedJson(request.postData())),
      response_body: null,
      browser_delivery: "failed",
      failure: request.failure()?.errorText ?? "unknown",
    });
  });
  return {
    async flush() {
      await Promise.all([...pending]);
      return rows.sort((left, right) => left.sequence - right.sequence);
    },
  };
}

function observeExternalBrowserRequests(page, requests) {
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["http:", "https:"].includes(url.protocol)) return;
    if (["127.0.0.1", "localhost"].includes(url.hostname)) return;
    requests.push({ method: request.method(), origin: url.origin, path: url.pathname });
  });
}

export async function openBrowserSession(browser, {
  fixedTime,
  viewport,
  browserSession,
  consoleErrors,
  pageErrors,
  externalBrowserRequests,
  pageErrorPrefix = "",
}) {
  const context = await browser.newContext({ viewport });
  await context.clock.setFixedTime(fixedTime);
  await context.addInitScript(() => {
    sessionStorage.setItem("matter.login.intro.played.v1", "1");
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push({
        browser_session: browserSession,
        text: message.text(),
        url: message.location().url,
      });
    }
  });
  page.on("pageerror", (error) => pageErrors.push(`${pageErrorPrefix}${error.message}`));
  observeExternalBrowserRequests(page, externalBrowserRequests);
  return { context, page, receipt: createHttpReceipt(page) };
}

export async function waitForHttp(page, { method, path, status, action }) {
  const responsePromise = page.waitForResponse((response) => {
    const request = response.request();
    const pathname = new URL(response.url()).pathname;
    return request.method() === method
      && (path instanceof RegExp ? path.test(pathname) : pathname === path);
  });
  await action();
  const response = await responsePromise;
  const body = await readResponseBody(response);
  assert.equal(
    response.status(),
    status,
    `${method} ${new URL(response.url()).pathname} ${JSON.stringify(redact(body))}`,
  );
  return { response, body, path: new URL(response.url()).pathname };
}

export async function observeDisabled(locator, timeoutMs = 5_000) {
  for (let attempt = 0; attempt < Math.ceil(timeoutMs / 10); attempt += 1) {
    if (await locator.isDisabled()) return true;
    await new Promise((resolvePoll) => setTimeout(resolvePoll, 10));
  }
  return false;
}

export async function waitForEnabled(locator, timeoutMs = 5_000) {
  for (let attempt = 0; attempt < Math.ceil(timeoutMs / 10); attempt += 1) {
    if (await locator.isEnabled()) return;
    await new Promise((resolvePoll) => setTimeout(resolvePoll, 10));
  }
  assert.fail("visible action did not become enabled after its pending request");
}
