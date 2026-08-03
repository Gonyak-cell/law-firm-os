import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");
const evidenceDir = process.env.MATTER_SMALL_FIRM_UI_EVIDENCE_DIR
  ? resolve(process.env.MATTER_SMALL_FIRM_UI_EVIDENCE_DIR)
  : null;
const sessionToken = "lawos_session_v1.auth_read_gate.signature";

function availablePort() {
  return new Promise((resolvePort, rejectPort) => {
    const server = createNetServer();
    server.once("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => error ? rejectPort(error) : resolvePort(port));
    });
  });
}

function apiBody(pathname) {
  const base = {
    request_id: `auth-read-gate-${pathname}`,
    outcome: "passed",
    ui_state: "empty",
    items: [],
    item: {},
    entries: [],
    safe_error_codes: [],
    audit_hint_ref: "auth-read-gate-audit",
    count_leak_prevented: true,
    production_ready_claim: false,
    page_info: { next_cursor: null }
  };
  if (pathname === "/api/matters") return { ...base, item: undefined };
  if (pathname === "/api/home/feed") return { ...base, items: undefined };
  return base;
}

test("App defers authenticated home-message reads until login succeeds", { timeout: 60_000 }, async () => {
  if (evidenceDir) await mkdir(evidenceDir, { recursive: true });
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  const browser = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
  const requests = [];
  try {
    await server.listen();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce"
    });

    async function routeApi(page, phase) {
      await page.route("**/api/**", async (route) => {
        const request = route.request();
        const pathname = new URL(request.url()).pathname;
        requests.push({
          phase,
          method: request.method(),
          pathname,
          authorization: request.headers().authorization ?? null
        });
        if (request.method() === "POST" && pathname === "/api/auth/login") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ok: true,
              token_type: "Bearer",
              session_token: sessionToken,
              expires_at: "2027-07-31T00:00:00.000Z",
              session: {
                state: "signed_in",
                session_id: "session-auth-read-gate",
                user_id: "person-auth-read-gate",
                tenant_id: "tenant_amic_matter_vault",
                email: "auth-read-gate@example.test",
                display_name: "로그인 검증",
                role_ids: ["matter_runtime_user"],
                scopes: []
              }
            })
          });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(apiBody(pathname))
        });
      });
    }

    const loadingPage = await context.newPage();
    await routeApi(loadingPage, "loading");
    await loadingPage.goto(`http://127.0.0.1:${port}/?view=loading&ctx=allow`, { waitUntil: "domcontentloaded" });
    await loadingPage.locator('[data-matter-logo-flow="startup"]').waitFor();
    await loadingPage.waitForTimeout(250);
    assert.equal(requests.filter(({ phase, pathname }) =>
      phase === "loading" && ["/api/home/feed", "/api/matters"].includes(pathname)).length, 0);
    await loadingPage.close();

    const loginPage = await context.newPage();
    await routeApi(loginPage, "login");
    await loginPage.goto(`http://127.0.0.1:${port}/?view=auth&ctx=allow&authStep=login`, { waitUntil: "domcontentloaded" });
    const loginForm = loginPage.locator('[data-login-form="email-password"]');
    await loginForm.waitFor();
    await loginPage.waitForTimeout(250);
    const preLoginReads = requests.filter(({ phase, pathname }) =>
      phase === "login" && ["/api/home/feed", "/api/matters"].includes(pathname));
    assert.deepEqual(preLoginReads, []);
    if (evidenceDir) {
      await loginPage.screenshot({ path: join(evidenceDir, "app-auth-read-gate-before-login-1440.png"), fullPage: true });
    }

    await loginForm.locator("[data-login-email]").fill("auth-read-gate@example.test");
    await loginForm.locator("[data-login-password]").fill("test-password");
    const mattersRequest = loginPage.waitForRequest((request) =>
      request.method() === "GET" && new URL(request.url()).pathname === "/api/matters");
    const feedRequest = loginPage.waitForRequest((request) =>
      request.method() === "GET" && new URL(request.url()).pathname === "/api/home/feed");
    await loginForm.locator(".matter-login-submit").click();
    const [mattersRead, feedRead] = await Promise.all([mattersRequest, feedRequest]);
    assert.equal(mattersRead.headers().authorization, `Bearer ${sessionToken}`);
    assert.equal(feedRead.headers().authorization, `Bearer ${sessionToken}`);
    await loginPage.locator('[data-home-dashboard-shell="true"]').waitFor();
    await loginPage.locator(".post-login-splash").waitFor({ state: "detached" });

    const postLoginReads = requests.filter(({ phase, method, pathname }) =>
      phase === "login"
      && method === "GET"
      && ["/api/home/feed", "/api/matters"].includes(pathname));
    assert.equal(postLoginReads.some(({ pathname }) => pathname === "/api/matters"), true);
    assert.equal(postLoginReads.some(({ pathname }) => pathname === "/api/home/feed"), true);
    assert.equal(postLoginReads.every(({ authorization }) => authorization === `Bearer ${sessionToken}`), true);
    if (evidenceDir) {
      await loginPage.screenshot({ path: join(evidenceDir, "app-auth-read-gate-after-login-1440.png"), fullPage: true });
      await writeFile(
        join(evidenceDir, "app-auth-read-gate-observables.json"),
        `${JSON.stringify({
          loading_pre_auth_reads: 0,
          login_pre_auth_reads: preLoginReads.length,
          post_login_reads: postLoginReads,
          expected_authorization: `Bearer ${sessionToken}`
        }, null, 2)}\n`
      );
    }
    await context.close();
  } finally {
    await browser.close();
    await server.close();
  }
});
