import assert from "node:assert/strict";
import { createServer as createNetServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";
import { resolvePeopleRoute } from "../src/people/peopleFeatureCatalog.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

async function availablePort() {
  return new Promise((resolvePort, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

async function mockApi(page) {
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const body = pathname === "/api/hrx/employees"
      ? { outcome: "ok", employees: [] }
      : pathname === "/api/hrx/org-chart"
        ? { outcome: "ok", org_units: [], employees: [], reporting_lines: [], change_events: [] }
        : {};
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

test("People default and hidden-route fallback follow only the overview feature flag", () => {
  assert.equal(resolvePeopleRoute("people", "", { overviewEnabled: true }), "people-overview");
  assert.equal(resolvePeopleRoute("people", "", { overviewEnabled: false }), "people-members");
  assert.equal(resolvePeopleRoute("people", "people-overview", { overviewEnabled: false }), "people-members");
  assert.equal(resolvePeopleRoute("people", "people-members", { overviewEnabled: true }), "people-members");
  assert.equal(resolvePeopleRoute("people", "people-work-schedule", { overviewEnabled: true }), "people-overview");
  assert.equal(resolvePeopleRoute("people", "people-work-schedule", { overviewEnabled: false }), "people-members");
  assert.equal(resolvePeopleRoute("clients", "clients-home", { overviewEnabled: true }), "clients-home");
});

test("People rail, member menu, back navigation, and deep links preserve distinct routes", async () => {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true },
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__LAWOS_PEOPLE_FEATURE_FLAGS__ = {
        people_overview: true,
        people_member_brief: false,
        outlook_calendar: false,
        people_capacity: false,
      };
    });
    await mockApi(page);
    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-dashboard`, { waitUntil: "networkidle" });
    await page.locator('[data-product-axis="people"]').click();
    await page.waitForFunction(() => window.location.hash === "#people-overview");
    assert.equal(new URL(page.url()).searchParams.get("view"), "people");

    const managementGroup = page.locator('[data-sidebar-group="people-members"]');
    if (await managementGroup.locator(".sidebar-subnav").count() === 0) {
      await managementGroup.locator(".sidebar-group-toggle").click();
    }
    await managementGroup.locator('[data-sidebar-section="people-members"]').click();
    await page.waitForFunction(() => window.location.hash === "#people-members");

    await page.goBack({ waitUntil: "networkidle" });
    await page.waitForFunction(() => window.location.hash === "#people-overview");

    await page.goto(`http://127.0.0.1:${port}/?view=people&ctx=allow#people-members`, { waitUntil: "networkidle" });
    assert.equal(new URL(page.url()).hash, "#people-members");

    await page.goto(`http://127.0.0.1:${port}/?view=people&ctx=allow&route_case=hidden#people-work-schedule`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.location.hash === "#people-overview");
    assert.equal(new URL(page.url()).hash, "#people-overview");
    assert.equal(await page.locator('[data-people-feature-state="people-work-schedule"]').count(), 0);

    const fallbackPage = await browser.newPage();
    await fallbackPage.addInitScript(() => {
      window.__LAWOS_PEOPLE_FEATURE_FLAGS__ = {
        people_overview: false,
        people_member_brief: false,
        outlook_calendar: false,
        people_capacity: false,
      };
    });
    await mockApi(fallbackPage);
    await fallbackPage.goto(`http://127.0.0.1:${port}/?view=people&ctx=allow`, { waitUntil: "networkidle" });
    await fallbackPage.waitForFunction(() => window.location.hash === "#people-members");
    assert.equal(new URL(fallbackPage.url()).hash, "#people-members");
    await fallbackPage.goto(`http://127.0.0.1:${port}/?view=people&ctx=allow&route_case=overview-disabled#people-overview`, { waitUntil: "networkidle" });
    await fallbackPage.waitForFunction(() => window.location.hash === "#people-members");
    assert.equal(new URL(fallbackPage.url()).hash, "#people-members");
    await fallbackPage.close();
  } finally {
    await browser.close();
    await server.close();
  }
});
