import assert from "node:assert/strict";
import { createServer as createNetServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

function installRouteWindow({ view, section, roleIds = [] }) {
  const storage = new Map();
  const search = `?view=${encodeURIComponent(view)}&ctx=allow`;
  const hash = section ? `#${encodeURIComponent(section)}` : "";
  globalThis.window = {
    location: { pathname: "/", search, hash, protocol: "http:" },
    history: {
      pushState() {},
      replaceState() {}
    },
    localStorage: {
      getItem(key) {
        return storage.get(key) ?? null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
      removeItem(key) {
        storage.delete(key);
      }
    },
    addEventListener() {},
    removeEventListener() {},
    matchMedia() {
      return { matches: false, addEventListener() {}, removeEventListener() {} };
    }
  };
  if (roleIds.length > 0) {
    globalThis.__LAWOS_SESSION_CONTEXT__ = {
      schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
      state: "signed_in",
      session_ref: "session:r1",
      source: "r1-render-test",
      actor_ref: "actor:r1",
      tenant_refs: { default: "tenant_amic_matter_vault" },
      role_ids: roleIds,
      scopes: [],
      review_state: "allow"
    };
  }
  globalThis.document = { documentElement: { dataset: {}, lang: "" } };
}

async function renderAppAtLegacyRoute(route) {
  installRouteWindow(route);
  const server = await createServer({
    root: webRoot,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true }
  });
  try {
    const { App } = await server.ssrLoadModule("/src/App.jsx");
    return renderToStaticMarkup(React.createElement(App));
  } finally {
    await server.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.__LAWOS_SESSION_CONTEXT__;
  }
}

function jsonResponse(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(body)
  });
}

async function availablePort() {
  return new Promise((resolvePort, rejectPort) => {
    const server = createNetServer();
    server.once("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolvePort(port));
    });
  });
}

function wp3ApiBody(pathname) {
  if (pathname === "/api/matters") {
    return {
      request_id: "r1-wp3-matters",
      outcome: "passed",
      items: [
        {
          resource_id: "matter-r1-wp3-001",
          matter_id: "matter-r1-wp3-001",
          matter_name: "WP3 검수 사건",
          title: "WP3 검수 사건"
        }
      ],
      safe_error_codes: [],
      audit_hint_ref: "ui_home_messages_matter_list_probe",
      ui_state: "ready",
      production_ready_claim: false,
      page_info: { next_cursor: null }
    };
  }
  if (pathname === "/api/matters/matter-r1-wp3-001/channel") {
    return {
      request_id: "r1-wp3-channel",
      outcome: "passed",
      ui_state: "ready",
      item: {
        matter_id: "matter-r1-wp3-001",
        thread_id: "matter-channel:matter-r1-wp3-001",
        provider_state: "internal_only",
        production_ready_claim: false,
        messages: [
          {
            message_id: "msg-r1-wp3-001",
            thread_id: "matter-channel:matter-r1-wp3-001",
            matter_id: "matter-r1-wp3-001",
            author_role: "internal",
            safe_message_excerpt: "검수용 Matter 대화 안전 요약",
            created_at: "2026-07-08T01:30:00.000Z",
            external_send_state: "internal_only",
            raw_provider_payload_included: false,
            direct_personal_contact_identifier_included: false,
            production_ready_claim: false
          }
        ]
      },
      safe_error_codes: [],
      audit_hint_ref: "ui_sf_b_w03_channel_read_probe",
      count_leak_prevented: true,
      production_ready_claim: false
    };
  }
  if (pathname === "/api/home/feed") {
    return {
      request_id: "r1-wp3-feed",
      outcome: "passed",
      entries: [
        {
          id: "people_notice:wp3",
          resource_id: "people_notice:wp3",
          tab: "notice",
          source: "People notices",
          title: "WP3 공지",
          body_preview: "검수용 공지 안전 요약",
          published_at: "2026-07-08T01:10:00.000Z"
        }
      ],
      source_statuses: [],
      safe_error_codes: [],
      audit_hint_ref: "ui_home_feed_read_probe",
      count_leak_prevented: true,
      production_ready_claim: false
    };
  }
  return { request_id: "r1-wp3-empty", outcome: "passed", safe_error_codes: [], production_ready_claim: false };
}

test("R1 WP-2 restores legacy request route context into Home request tab and filter", async () => {
  const html = await renderAppAtLegacyRoute({ view: "requests", section: "requests-leave" });

  assert.match(html, /data-home-section-screen="home-requests"/);
  assert.match(html, /data-home-request-tab="received"/);
  assert.match(html, /data-home-request-filter="leave"/);
  assert.match(html, /data-home-request-filter-id="leave"[^>]*data-home-request-filter-active="true"/);
});

test("R1 WP-2 renders dedicated Home utility screens from legacy route context", async () => {
  const messages = await renderAppAtLegacyRoute({ view: "messages", section: "messages-matter-channel" });
  const esign = await renderAppAtLegacyRoute({ view: "esign", section: "esign-status" });
  const company = await renderAppAtLegacyRoute({ view: "reports", section: "reports-matter-analytics", roleIds: ["admin"] });

  assert.match(messages, /data-home-section-screen="home-messages"/);
  assert.match(messages, /data-home-message-tab="matter"/);
  assert.match(messages, /data-home-tab-id="matter"[^>]*data-home-tab-active="true"/);

  assert.match(esign, /data-home-section-screen="home-esign"/);
  assert.match(esign, /data-home-esign-tab="status"/);
  assert.match(esign, /data-home-tab-id="status"[^>]*data-home-tab-active="true"/);

  assert.match(company, /data-home-section-screen="home-company"/);
  assert.match(company, /data-home-company-tab="reports-matter-analytics"/);
  assert.match(company, /data-home-audit-summary="true"/);
});

test("R1 WP-4 gates Home company status to admin sessions", async () => {
  const denied = await renderAppAtLegacyRoute({ view: "reports", section: "reports-matter-analytics", roleIds: ["staff"] });
  const admin = await renderAppAtLegacyRoute({ view: "reports", section: "reports-matter-analytics", roleIds: ["admin"] });

  assert.match(denied, /data-active-home-section="home-dashboard"/);
  assert.match(denied, /data-home-company-access-denied="true"/);
  assert.doesNotMatch(denied, /data-home-section-screen="home-company"/);
  assert.doesNotMatch(denied, /data-home-sidebar-company-link="true"/);

  assert.match(admin, /data-active-home-section="home-company"/);
  assert.match(admin, /data-home-section-screen="home-company"/);
  assert.match(admin, /data-home-company-tab="reports-matter-analytics"/);
  assert.match(admin, /data-home-sidebar-company-link="true"/);
  assert.doesNotMatch(admin, /data-home-company-access-denied="true"/);
});

test("R1 WP-3 opens Home message threads and decreases unread counts at runtime", async () => {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      return jsonResponse(route, wp3ApiBody(url.pathname));
    });
    await page.goto(`http://127.0.0.1:${port}/?view=messages&ctx=allow#messages-matter-channel`, { waitUntil: "networkidle" });

    await page.waitForSelector('[data-home-sidebar-message-count="2"]');
    assert.equal(await page.locator("[data-home-topbar-message-count]").getAttribute("data-home-topbar-message-count"), "2");
    assert.equal(await page.locator('[data-home-message-thread="msg-r1-wp3-001"]').count(), 1);

    await page.locator('[data-home-message-thread="msg-r1-wp3-001"]').click();
    await page.waitForSelector('[data-home-message-thread-panel="msg-r1-wp3-001"]');
    await page.waitForFunction(() => document.querySelector("[data-home-topbar-message-count]")?.getAttribute("data-home-topbar-message-count") === "1");

    assert.equal(await page.locator("[data-home-sidebar-message-count]").getAttribute("data-home-sidebar-message-count"), "1");
    assert.equal(await page.locator('[data-home-message-thread="msg-r1-wp3-001"]').getAttribute("data-home-message-unread"), "false");

    await page.locator("[data-home-message-trigger]").click();
    await page.waitForSelector('[data-home-message-drawer-item="people_notice:wp3"]');
    assert.equal(await page.locator('[data-home-message-drawer-item="msg-r1-wp3-001"]').count(), 0);
  } finally {
    await browser.close();
    await server.close();
  }
});
