import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startOutlookAddinStaticServer } from "../../../scripts/lib/outlook-addin-static-server.mjs";
import {
  installStartupBoundaryApi,
  installStartupBoundaryHost,
  startupCounts,
} from "./helpers/outlook-startup-boundary-browser.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const DIST = path.join(ROOT, "apps/addin/dist");

async function withBuiltTaskpane(run) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const web = await startOutlookAddinStaticServer({ distRoot: DIST });
  try {
    await run(page, web);
  } finally {
    await page.close();
    await browser.close();
    await new Promise((resolve) => web.server.close(resolve));
  }
}

for (const afterTimeout of [false, true]) {
  test(`built startup awaits Office mailbox ${afterTimeout ? "after timeout" : "before timeout"} in one flight`, async () => {
    await withBuiltTaskpane(async (page, web) => {
      const requests = [];
      await installStartupBoundaryHost(page, { captureOfficeTimeout: afterTimeout });
      await installStartupBoundaryApi(page, requests);
      const sessionRequest = page.waitForRequest((request) => (
        new URL(request.url()).pathname === "/api/auth/session"
      ));
      await page.goto(`${web.origin}/addin/`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.querySelector(".outlook-compact-shell"));
      await page.waitForFunction((expected) => (
        window.__TODO9_OFFICE_BOUNDARY().timeoutCaptured === expected
      ), afterTimeout);
      if (afterTimeout) {
        await page.evaluate(() => window.__TODO9_TRIGGER_OFFICE_TIMEOUT());
        await page.waitForFunction(() => window.__TODO9_OFFICE_BOUNDARY().timeoutTriggered);
      }
      await sessionRequest;
      await page.evaluate(() => window.dispatchEvent(new Event("lawos:office-ready")));
      assert.deepEqual(startupCounts(requests), [1, 0, 0, 0]);

      await page.evaluate(() => window.__TODO9_RELEASE_OFFICE());
      try {
        await page.waitForFunction(() => {
          const raw = localStorage.getItem("lawos.outlook.prepare.v1");
          return raw && JSON.parse(raw).state === "ready";
        }, null, { timeout: 2_000 });
      } catch (error) {
        throw new Error(
          `READY was not stored; startup counts ${JSON.stringify(startupCounts(requests))}`,
          { cause: error },
        );
      }
      await page.waitForFunction(() => document.querySelector("[data-feature-id='matter.search']")?.disabled === false);
      assert.deepEqual(startupCounts(requests), [1, 1, 1, 1]);
      assert.equal(requests.find(({ path: candidate }) => candidate === "/api/outlook/readiness")?.search, "");

      const beforeCustomReady = [...startupCounts(requests)];
      const previousAdds = await page.evaluate(() => window.__TODO9_OFFICE_BOUNDARY().add);
      await page.evaluate(() => window.dispatchEvent(new Event("lawos:office-ready")));
      await page.waitForFunction((adds) => window.__TODO9_OFFICE_BOUNDARY().add > adds, previousAdds);
      assert.deepEqual(startupCounts(requests), beforeCustomReady);
    });
  });
}

test("built taskpane contains a throwing localStorage getter and fails typed closed", async () => {
  await withBuiltTaskpane(async (page, web) => {
    const requests = [];
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(`${error.name}: ${error.message}`));
    await installStartupBoundaryHost(page, {
      initialOfficeReady: true,
      throwingLocalStorage: true,
    });
    await installStartupBoundaryApi(page, requests);
    const boundaryOutcome = Promise.race([
      page.waitForRequest((request) => (
        new URL(request.url()).pathname === "/api/outlook/readiness"
      )).then(() => ({ kind: "readiness" })),
      new Promise((resolve) => page.once("pageerror", (error) => resolve({
        kind: "pageerror",
        error: `${error.name}: ${error.message}`,
      }))),
    ]);
    await page.goto(`${web.origin}/addin/`, { waitUntil: "domcontentloaded" });
    assert.deepEqual(await boundaryOutcome, { kind: "readiness" });
    await page.waitForFunction(() => document.querySelector(".outlook-compact-shell"));
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(startupCounts(requests), [1, 1, 1, 0]);
    assert.equal(await page.locator("[data-feature-id='mail.save-with-attachments']").isDisabled(), true);
    assert.equal(await page.locator("[data-testid='business-gate']").count(), 1);
    assert.equal((await page.locator("#root").innerText()).trim().length > 0, true);
  });
});
