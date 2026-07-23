import { createHash } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PRIVATE_STAGING_SYNTHETIC_EMAIL_PATTERN } from "../../packages/runtime-auth/src/private-staging-synthetic-email.js";
import { PRIVATE_STAGING_BROWSER_API_REQUEST_LIMIT } from "./private-staging-contract.mjs";

const SYNTHETIC_USER = /^synthetic-lawos-staging-[a-z0-9-]+$/u;

function fail(message) {
  const error = new Error(message);
  error.code = "PRIVATE_STAGING_BROWSER_SMOKE_FAILED";
  throw error;
}

function requiredText(value, name, pattern = null) {
  const text = String(value ?? "").trim();
  if (!text || (pattern && !pattern.test(text))) fail(`${name} is invalid`);
  return text;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function browserDiagnostics({
  outcome,
  apiRequestCount,
  consoleErrors,
  failedRequests,
  screenshotPaths,
  visited,
  failureMessage = "",
}) {
  return Object.freeze({
    schema_version: "law-firm-os.private-staging.browser-diagnostics.v1",
    outcome,
    api_request_count: apiRequestCount,
    api_request_limit: PRIVATE_STAGING_BROWSER_API_REQUEST_LIMIT,
    console_error_count: consoleErrors.length,
    console_error_fingerprint: sha256([...consoleErrors].sort().join(":")),
    failed_request_count: failedRequests.length,
    failed_request_fingerprint: sha256([...failedRequests].sort().join(":")),
    screenshot_count: screenshotPaths.length,
    visited_routes: Object.freeze([...visited]),
    failure_fingerprint: failureMessage ? sha256(failureMessage) : null,
    raw_url_returned: false,
    secret_material_returned: false,
    raw_pii_returned: false,
  });
}

function writeBrowserDiagnostics(outputDir, diagnostics) {
  const path = resolve(outputDir, "browser-diagnostics.json");
  writeFileSync(path, `${JSON.stringify(diagnostics, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  chmodSync(path, 0o600);
  return sha256(readFileSync(path));
}

function validateEvidenceDirectory(path) {
  const output = resolve(requiredText(path, "evidenceDir"));
  if (existsSync(output) && lstatSync(output).isSymbolicLink()) fail("browser evidence directory cannot be a symlink");
  mkdirSync(output, { recursive: true, mode: 0o700 });
  chmodSync(output, 0o700);
  if (!statSync(output).isDirectory() || (statSync(output).mode & 0o077) !== 0) fail("browser evidence directory must be mode 0700");
  return output;
}

async function startExactSourceWebProxy({ apiBaseUrl, createViteServer }) {
  const server = await createViteServer({
    root: resolve(process.cwd(), "apps/web"),
    logLevel: "error",
    server: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false,
      proxy: {
        "/api": { target: apiBaseUrl, changeOrigin: true, secure: true },
        "/master-data": { target: apiBaseUrl, changeOrigin: true, secure: true },
      },
    },
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string") {
    await server.close();
    fail("exact-source Vite server did not expose a local address");
  }
  return Object.freeze({ server, baseUrl: `http://127.0.0.1:${address.port}` });
}

async function waitForApiIdle(pendingRequests, {
  timeoutMs = 15_000,
  idleMs = 100,
  wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds)),
} = {}) {
  const deadline = Date.now() + timeoutMs;
  let idleSince = null;
  while (Date.now() < deadline) {
    if (pendingRequests.size === 0) {
      idleSince ??= Date.now();
      if (Date.now() - idleSince >= idleMs) return;
    } else {
      idleSince = null;
    }
    await wait(Math.min(25, idleMs));
  }
  fail("Forest browser smoke did not reach a settled API state");
}

export async function runPrivateStagingForestBrowserSmoke({
  apiBaseUrl,
  account,
  password,
  expected = {},
  evidenceDir,
  webBaseUrl = null,
  createViteServer,
  launchBrowser,
} = {}) {
  const api = new URL(requiredText(apiBaseUrl, "apiBaseUrl"));
  if (api.protocol !== "https:" && !["127.0.0.1", "localhost"].includes(api.hostname)) fail("staging API must use HTTPS");
  const email = requiredText(account?.email, "synthetic account email", PRIVATE_STAGING_SYNTHETIC_EMAIL_PATTERN).toLowerCase();
  requiredText(account?.user_id, "synthetic account user_id", SYNTHETIC_USER);
  requiredText(password, "synthetic account password");
  const outputDir = validateEvidenceDirectory(evidenceDir);
  let managedWeb = null;
  if (!webBaseUrl) {
    if (typeof createViteServer !== "function") fail("createViteServer is required when webBaseUrl is not supplied");
    managedWeb = await startExactSourceWebProxy({ apiBaseUrl: api.href, createViteServer });
    webBaseUrl = managedWeb.baseUrl;
  }
  const web = new URL(requiredText(webBaseUrl, "webBaseUrl"));
  if (!["127.0.0.1", "localhost"].includes(web.hostname)) fail("browser smoke UI must be served from the exact local source");
  if (typeof launchBrowser !== "function") fail("launchBrowser is required");

  let browser;
  const consoleErrors = [];
  const failedRequests = [];
  const screenshotPaths = [];
  const visited = [];
  const pendingApiRequests = new Set();
  let apiRequestCount = 0;
  let criticalTracking = false;
  try {
    browser = await launchBrowser({ headless: true });
    const context = await browser.newContext({ locale: "ko-KR", timezoneId: "Asia/Seoul" });
    const page = await context.newPage();
    const assertApiRequestBudget = () => {
      if (apiRequestCount > PRIVATE_STAGING_BROWSER_API_REQUEST_LIMIT) {
        fail("Forest browser smoke exceeded its bounded API request budget");
      }
    };
    page.on("console", (message) => {
      if (criticalTracking && message.type() === "error") consoleErrors.push(sha256(message.text()).slice(0, 16));
    });
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.origin === web.origin && (url.pathname.startsWith("/api/") || url.pathname.startsWith("/master-data"))) {
        apiRequestCount += 1;
        pendingApiRequests.add(request);
      }
    });
    page.on("requestfinished", (request) => pendingApiRequests.delete(request));
    page.on("requestfailed", (request) => {
      pendingApiRequests.delete(request);
      const url = new URL(request.url());
      if (criticalTracking && url.origin === web.origin && (url.pathname.startsWith("/api/") || url.pathname.startsWith("/master-data"))) {
        failedRequests.push(sha256(`${request.method()}:${url.pathname}`).slice(0, 16));
      }
    });
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (criticalTracking && url.origin === web.origin && (url.pathname.startsWith("/api/") || url.pathname.startsWith("/master-data")) && response.status() >= 400) {
        failedRequests.push(sha256(`${response.request().method()}:${url.pathname}:${response.status()}`).slice(0, 16));
      }
    });

    const loginUrl = new URL("/", web);
    loginUrl.searchParams.set("view", "auth");
    loginUrl.searchParams.set("authStep", "login");
    loginUrl.searchParams.set("locale", "ko");
    await page.goto(loginUrl.href, { waitUntil: "networkidle" });
    await page.locator("[data-login-email]").fill(email);
    await page.locator("[data-login-password]").fill(password);
    await page.locator(".matter-login-submit").click();
    await page.waitForSelector(".matter-app:not(.auth-only-app) .page-canvas", { timeout: 30_000 });
    const sessionStored = await page.evaluate(() => {
      try {
        const value = sessionStorage.getItem("lawos.api.session");
        return typeof value === "string" && value.includes("lawos_session_v1.");
      } catch {
        return false;
      }
    });
    if (!sessionStored) fail("Forest browser login did not persist a signed API session");
    await waitForApiIdle(pendingApiRequests);
    consoleErrors.length = 0;
    failedRequests.length = 0;
    criticalTracking = true;
    assertApiRequestBudget();

    const routes = [
      { id: "home", view: "home", selector: ".page-canvas" },
      { id: "people", view: "people", hash: "people-directory", selector: ".page-canvas" },
      { id: "matter", view: "matters", hash: "matters-list", selector: "[data-matter-selected-record-list], [data-matter-dashboard]" },
      { id: "vault", view: "vault", hash: "vault-search-documents", selector: ".page-canvas" },
      { id: "finance", view: "home", hash: "home-finance-time", selector: ".page-canvas" },
    ];
    for (const route of routes) {
      const url = new URL("/", web);
      url.searchParams.set("view", route.view);
      url.searchParams.set("locale", "ko");
      if (route.hash) url.hash = route.hash;
      await page.goto(url.href, { waitUntil: "networkidle" });
      await page.waitForSelector(route.selector, { timeout: 30_000 });
      await waitForApiIdle(pendingApiRequests);
      assertApiRequestBudget();
      const screenshotPath = resolve(outputDir, `${String(screenshotPaths.length + 1).padStart(2, "0")}-${route.id}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      chmodSync(screenshotPath, 0o600);
      screenshotPaths.push(screenshotPath);
      visited.push(route.id);
    }
    const visibleSyntheticMatter = typeof expected.matter_id !== "string" || await page.evaluate(async (matterId) => {
      const stored = JSON.parse(sessionStorage.getItem("lawos.api.session") ?? "{}");
      const response = await fetch(`/api/matters/${encodeURIComponent(matterId)}?tenant_id=tenant_lawos_staging_cut007_a&permission_ref=cut007-browser-permission&audit_hint_ref=cut007-browser-audit`, {
        headers: { authorization: `Bearer ${stored.session_token ?? ""}` },
      });
      const visible = response.ok;
      await response.arrayBuffer();
      return visible;
    }, expected.matter_id);
    await waitForApiIdle(pendingApiRequests);
    if (!visibleSyntheticMatter) fail("browser session could not read the synthetic CUT-007 matter");
    assertApiRequestBudget();
    if (consoleErrors.length || failedRequests.length) fail("Forest browser smoke observed console errors or failed critical requests");
    const screenshotDigests = screenshotPaths.map((path) => sha256(readFileSync(path)));
    const diagnostics = browserDiagnostics({
      outcome: "PASS",
      apiRequestCount,
      consoleErrors,
      failedRequests,
      screenshotPaths,
      visited,
    });
    const diagnosticsFingerprint = writeBrowserDiagnostics(outputDir, diagnostics);
    return Object.freeze({
      outcome: "PASS",
      critical_flow_count: visited.length + 2,
      screenshot_count: screenshotPaths.length,
      api_request_count: apiRequestCount,
      api_request_limit: PRIVATE_STAGING_BROWSER_API_REQUEST_LIMIT,
      console_error_count: consoleErrors.length,
      failed_request_count: failedRequests.length,
      diagnostics_fingerprint: diagnosticsFingerprint,
      evidence_fingerprint: sha256(JSON.stringify({ visited, screenshotDigests, apiRequestCount, diagnosticsFingerprint })),
      secret_material_returned: false,
      raw_pii_returned: false,
    });
  } catch (error) {
    const diagnostics = browserDiagnostics({
      outcome: "FAIL",
      apiRequestCount,
      consoleErrors,
      failedRequests,
      screenshotPaths,
      visited,
      failureMessage: error?.message ?? "browser smoke failed",
    });
    try {
      const diagnosticsFingerprint = writeBrowserDiagnostics(outputDir, diagnostics);
      Object.defineProperty(error, "safe_browser_diagnostics", {
        value: Object.freeze({
          ...diagnostics,
          diagnostics_fingerprint: diagnosticsFingerprint,
        }),
        enumerable: true,
      });
    } catch {
      // Preserve the primary browser failure if diagnostics cannot be materialized.
    }
    throw error;
  } finally {
    await browser?.close();
    await managedWeb?.server.close();
  }
}
