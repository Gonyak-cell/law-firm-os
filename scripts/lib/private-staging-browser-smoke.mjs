import { createHash } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { PRIVATE_STAGING_SYNTHETIC_EMAIL_PATTERN } from "../../packages/runtime-auth/src/private-staging-synthetic-email.js";

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
  try {
    browser = await launchBrowser({ headless: true });
    const context = await browser.newContext({ locale: "ko-KR", timezoneId: "Asia/Seoul" });
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(sha256(message.text()).slice(0, 16));
    });
    page.on("requestfailed", (request) => failedRequests.push(sha256(`${request.method()}:${new URL(request.url()).pathname}`).slice(0, 16)));
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (url.origin === web.origin && url.pathname.startsWith("/api/") && response.status() >= 500) {
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
      return response.ok;
    }, expected.matter_id);
    if (!visibleSyntheticMatter) fail("browser session could not read the synthetic CUT-007 matter");
  } finally {
    await browser?.close();
    await managedWeb?.server.close();
  }

  if (consoleErrors.length || failedRequests.length) fail("Forest browser smoke observed console errors or failed critical requests");
  const screenshotDigests = screenshotPaths.map((path) => sha256(readFileSync(path)));
  return Object.freeze({
    outcome: "PASS",
    critical_flow_count: visited.length + 2,
    screenshot_count: screenshotPaths.length,
    console_error_count: consoleErrors.length,
    failed_request_count: failedRequests.length,
    evidence_fingerprint: sha256(JSON.stringify({ visited, screenshotDigests })),
    secret_material_returned: false,
    raw_pii_returned: false,
  });
}
