import assert from "node:assert/strict";
import { createServer as createNetServer } from "node:net";
import test from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";
import { MATTER_LEGACY_ROUTE_REDIRECTS } from "../src/components/matter-small-firm/routes.js";

const webRoot = new URL("..", import.meta.url).pathname;

function availablePort() {
  return new Promise((resolvePort, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

function apiBody() {
  return JSON.stringify({
    outcome: "passed",
    items: [],
    entries: [],
    safe_error_codes: [],
    production_ready_claim: false
  });
}

test("Matter legacy URLs canonicalize in the running App and retain query/filter context", async () => {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route("**/api/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: apiBody()
  }));

  try {
    const matterAliases = MATTER_LEGACY_ROUTE_REDIRECTS.filter((route) => !route.targetView || route.targetView === "matters");
    assert.ok(matterAliases.some((route) => route.from === "matter-dashboard"));
    for (const legacy of matterAliases) {
      await page.goto(`http://127.0.0.1:${port}/?view=matters&ctx=allow&query=keep-query&filter=keep-filter&matter_id=route-matter#${legacy.from}`, { waitUntil: "domcontentloaded" });
      const expectedFilter = "keep-filter";
      await page.waitForFunction(({ section, filter }) => {
        const url = new URL(window.location.href);
        return url.hash === `#${section}` && url.searchParams.get("filter") === filter;
      }, { section: legacy.to, filter: expectedFilter });
      const url = new URL(page.url());
      assert.equal(url.searchParams.get("view"), "matters", legacy.from);
      assert.equal(url.searchParams.get("query"), "keep-query", legacy.from);
      assert.equal(url.searchParams.get("filter"), expectedFilter, legacy.from);
      assert.equal(url.searchParams.get("matter_id"), "route-matter", legacy.from);
      assert.equal(url.searchParams.get("current_version"), null, legacy.from);
      assert.equal(url.hash, `#${legacy.to}`, legacy.from);
      const canonicalScreen = page.locator(`[data-matter-small-firm-screen="${legacy.to}"]`);
      await canonicalScreen.waitFor();
      assert.equal(await canonicalScreen.count(), 1, legacy.from);
    }

    await page.goto(`http://127.0.0.1:${port}/?view=matters&ctx=allow&query=keep-query&filter=keep-filter#unknown-matter-route`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.location.hash === "#matter-today");
    assert.equal(await page.locator('[data-matter-small-firm-screen="matter-today"]').count(), 1);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("initial, navigation, and back/forward popstate canonicalization keep live ctx and scope current_version to Vault", async () => {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route("**/api/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: apiBody()
  }));

  try {
    await page.goto(`http://127.0.0.1:${port}/?view=matters&ctx=denied&query=keep-query&filter=keep-filter#matter-dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.location.hash === "#matter-today");
    let url = new URL(page.url());
    assert.equal(url.searchParams.get("ctx"), "denied");
    assert.equal(url.searchParams.get("current_version"), null);
    assert.equal(url.searchParams.get("query"), "keep-query");
    assert.equal(url.searchParams.get("filter"), "keep-filter");
    assert.equal(await page.locator('[data-matter-small-firm-screen="matter-today"]').count(), 1);

    const matterSidebar = page.locator('[data-context-sidebar="matters"]');
    await matterSidebar.getByRole("button", { name: "업무", exact: true }).click();
    await page.waitForFunction(() => window.location.hash === "#matter-work");
    url = new URL(page.url());
    assert.equal(url.searchParams.get("ctx"), "denied");
    assert.equal(url.searchParams.get("current_version"), null);
    assert.equal(await page.locator('[data-matter-small-firm-screen="matter-work"]').count(), 1);

    await page.evaluate(() => {
      const aliasUrl = new URL(window.location.href);
      aliasUrl.searchParams.set("ctx", "denied");
      aliasUrl.searchParams.set("query", "keep-query");
      aliasUrl.searchParams.set("filter", "keep-filter");
      aliasUrl.hash = "#matter-dashboard";
      window.history.pushState({ view: "matters", section: "matter-dashboard" }, "", `${aliasUrl.pathname}${aliasUrl.search}${aliasUrl.hash}`);
    });
    await page.evaluate(() => window.history.back());
    await page.waitForFunction(() => window.location.hash === "#matter-work");
    await page.evaluate(() => window.history.forward());
    await page.waitForFunction(() => window.location.hash === "#matter-today");
    url = new URL(page.url());
    assert.equal(url.searchParams.get("ctx"), "denied");
    assert.equal(url.searchParams.get("current_version"), null);
    assert.equal(url.searchParams.get("query"), "keep-query");
    assert.equal(url.searchParams.get("filter"), "keep-filter");

    await page.goto(`http://127.0.0.1:${port}/?view=matters&ctx=denied#matter-approvals`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.location.search.includes("view=home") && window.location.hash === "#home-requests");
    url = new URL(page.url());
    assert.equal(url.searchParams.get("ctx"), "denied");
    assert.equal(url.searchParams.get("current_version"), null);
    assert.equal(await page.locator('[data-home-section-screen="home-requests"]').count(), 1);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("Matter integrations keeps its existing settings destination while using the shared alias catalog", async () => {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route("**/api/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: apiBody()
  }));

  try {
    await page.goto(`http://127.0.0.1:${port}/?view=matters&ctx=allow#matter-integrations`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.location.search.includes("view=settings") && window.location.hash === "#settings-integrations");
    assert.equal(await page.locator('[data-global-utility-surface="settings"]').count(), 1);
  } finally {
    await browser.close();
    await server.close();
  }
});
