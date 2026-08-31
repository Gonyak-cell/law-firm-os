import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startOutlookAddinStaticServer } from "../../../scripts/lib/outlook-addin-static-server.mjs";
import { installStartupBoundaryHost } from "./helpers/outlook-startup-boundary-browser.js";
import { readyOutlookReadinessResponse } from "./helpers/outlook-readiness-fixture.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const DIST = path.join(ROOT, "apps/addin/dist");
const SCREENSHOT_DIR = process.env.LAWOS_TODO14_SCREENSHOT_DIR ?? "";
const PRINCIPAL_REF = `odpr_${"A".repeat(43)}`;
const SESSION = "lawos_session_v1.todo14-browser";

const json = (body, status = 200) => ({
  status,
  contentType: "application/json; charset=utf-8",
  body: JSON.stringify(body),
});

function connectedConnection(patch = {}) {
  return { item: {
    status: "connected",
    active: true,
    connection_id: "m365_connection_todo14_browser",
    state_version: 7,
    mailbox_address: "qa@example.invalid",
    ...patch,
  } };
}

async function installScenarioApi(page, scenario) {
  await page.route("https://appsforoffice.microsoft.com/**", (route) => route.fulfill(json("")));
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/office-sso/config") {
      return route.fulfill(json({ item: {
        configured: true,
        client_id: "browser-client",
        tenant_id: "organizations",
        api_scope: "api://browser-client/access_as_user",
        scopes: ["api://browser-client/access_as_user"],
        callback_uri: `${url.origin}/addin/oauth-callback.html`,
        authority: "https://login.microsoftonline.com/organizations",
      } }));
    }
    if (url.pathname === "/api/auth/session") {
      return route.fulfill(json({
        authenticated: true,
        session: {
          tenant_id: "todo14-tenant",
          user_id: "todo14-user",
          outlook_desktop_principal_ref: PRINCIPAL_REF,
        },
      }));
    }
    if (url.pathname === "/api/outlook/connection") {
      if (scenario === "connection-required") {
        return route.fulfill(json(connectedConnection({
          status: "not_connected",
          active: false,
          connection_id: null,
          state_version: 0,
          mailbox_address: null,
        })));
      }
      if (scenario === "account-mismatch") {
        return route.fulfill(json(connectedConnection({ mailbox_address: "other@example.invalid" })));
      }
      return route.fulfill(json(connectedConnection()));
    }
    if (url.pathname === "/api/outlook/readiness") {
      if (scenario === "deferred" || scenario === "offline") {
        return route.fulfill(json({ safe_error_code: "OUTLOOK_READINESS_TEMPORARY" }, 503));
      }
      const readiness = readyOutlookReadinessResponse({ principalRef: PRINCIPAL_REF });
      if (scenario === "installation-revoked") readiness.item.installation.release_trusted = false;
      return route.fulfill(json(readiness));
    }
    if (url.pathname === "/api/outlook/bootstrap") {
      return route.fulfill(json({ item: { ready: true, marker: "todo14-browser" } }));
    }
    return route.fulfill(json({ items: [] }));
  });
}

test("READY is non-blocking and each startup failure has one specific recovery action", async () => {
  const browser = await chromium.launch({ headless: true });
  const web = await startOutlookAddinStaticServer({ distRoot: DIST });
  const scenarios = [
    {
      id: "login-required",
      message: "AMIC OS 로그인이 필요합니다.",
      action: "AMIC OS 로그인",
      actionTestId: "lawos-login-button",
    },
    {
      id: "connection-required",
      message: "Outlook 연결이 필요합니다.",
      action: "Outlook 연결",
      actionTestId: "outlook-connect-button",
    },
    {
      id: "account-mismatch",
      message: "Outlook 계정이 AMIC OS 계정과 일치하지 않습니다.",
      action: "다시 로그인",
      actionTestId: "outlook-account-relogin-button",
    },
    {
      id: "installation-revoked",
      message: "이 PC의 AMIC OS 설치를 확인할 수 없습니다.",
      action: "설치 상태 다시 확인",
      actionTestId: "outlook-installation-retry-button",
    },
    {
      id: "deferred",
      message: "Outlook 준비 상태를 확인하지 못했습니다.",
      action: "다시 확인",
      actionTestId: "outlook-startup-retry-button",
    },
    {
      id: "offline",
      message: "네트워크에 연결되어 있지 않습니다.",
      action: "다시 확인",
      actionTestId: "outlook-startup-retry-button",
    },
  ];
  try {
    for (const scenario of [
      { id: "ready" },
      ...scenarios,
    ]) {
      const context = await browser.newContext({ viewport: { width: 320, height: 760 } });
      const page = await context.newPage();
      try {
        await installStartupBoundaryHost(page, { initialOfficeReady: true });
        await page.addInitScript(({ id, session }) => {
          if (id === "login-required") {
            sessionStorage.removeItem("lawos_addin_session_token");
          } else {
            sessionStorage.setItem("lawos_addin_session_token", session);
          }
          if (id === "offline") {
            Object.defineProperty(navigator, "onLine", {
              configurable: true,
              get: () => false,
            });
          }
        }, { id: scenario.id, session: SESSION });
        await installScenarioApi(page, scenario.id);
        await page.goto(`${web.origin}/addin/`, { waitUntil: "domcontentloaded" });

        if (scenario.id === "ready") {
          await page.waitForFunction(() => (
            document.querySelector("[data-feature-id='matter.search']")?.disabled === false
          ));
          assert.equal(await page.locator("[data-testid='business-gate']").count(), 0);
          assert.equal(await page.locator("[data-testid='outlook-readiness-status']").count(), 0);
          assert.doesNotMatch(await page.locator("body").innerText(), /로그인을 확인|연결을 확인|연결 준비됨/u);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320);
          if (SCREENSHOT_DIR) {
            await page.screenshot({
              path: path.join(SCREENSHOT_DIR, "task-14-ready.png"),
              fullPage: true,
            });
          }
          continue;
        }

        const gate = page.locator("[data-testid='business-gate']");
        await gate.waitFor();
        await page.waitForFunction((message) => (
          document.querySelector("[data-testid='business-gate']")?.textContent?.includes(message)
        ), scenario.message);
        assert.equal(await gate.count(), 1, scenario.id);
        assert.equal(await gate.locator("button").count(), 1, scenario.id);
        assert.equal(await gate.locator("button").getAttribute("data-testid"), scenario.actionTestId);
        assert.equal(await gate.locator("button").innerText(), scenario.action);
        assert.equal(await gate.locator("p[role='alert']").count(), 1);
        const recoveryId = await gate.locator("p[role='alert']").getAttribute("aria-controls");
        assert.equal(typeof recoveryId, "string");
        assert.equal(await page.locator(`#${recoveryId}`).count(), 1);
        await gate.locator("button").focus();
        assert.equal(await gate.locator("button").evaluate((button) => document.activeElement === button), true);
        assert.equal(await gate.locator("button").evaluate((button) => button.tagName), "BUTTON");
        assert.equal(await page.locator("[data-testid='outlook-readiness-status']").count(), 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320);
        if (SCREENSHOT_DIR) {
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, `task-14-${scenario.id}.png`),
            fullPage: true,
          });
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => web.server.close(resolve));
  }
});
