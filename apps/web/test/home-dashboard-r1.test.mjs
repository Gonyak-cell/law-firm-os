import assert from "node:assert/strict";
import { createServer as createNetServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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

function wp5IsoDay(offset, hour = 9) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, 0, 0, 0);
  return date.toISOString();
}

function wp5DateKey(offset = 0) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function wp5ActionItem({ id, type, title, dueOffset, dueHour = 9, riskTier = "normal", allowedActions = ["open"], requester = "R1" }) {
  return {
    id,
    resource_id: id,
    type,
    subtype: type === "task" ? "matter_task" : "leave",
    title,
    requester,
    matter_ref: type === "task" ? "matter-r1-wp5" : null,
    due_at: wp5IsoDay(dueOffset, dueHour),
    risk_tier: riskTier,
    allowed_actions: allowedActions,
    raw_payload_included: false,
    production_ready_claim: false
  };
}

function wp5ApiBody(pathname, searchParams, state) {
  if (pathname === "/api/home/action-inbox") {
    const type = searchParams.get("type");
    if (type === "task") {
      return {
        request_id: "r1-wp5-task",
        outcome: "passed",
        items: [
          wp5ActionItem({ id: "task_upcoming_two", type: "task", title: "이틀 뒤 할 일", dueOffset: 2, allowedActions: ["complete", "open"] }),
          wp5ActionItem({ id: "task_late_three", type: "task", title: "사흘 지연 할 일", dueOffset: -3, allowedActions: ["complete", "open"] }),
          wp5ActionItem({ id: "task_today", type: "task", title: "오늘 할 일", dueOffset: 0, allowedActions: ["complete", "open"] }),
          wp5ActionItem({ id: "task_upcoming_three", type: "task", title: "사흘 뒤 할 일", dueOffset: 3, allowedActions: ["complete", "open"] }),
          wp5ActionItem({ id: "task_late_one", type: "task", title: "하루 지연 할 일", dueOffset: -1, allowedActions: ["complete", "open"] }),
          wp5ActionItem({ id: "task_upcoming_one", type: "task", title: "내일 할 일", dueOffset: 1, allowedActions: ["complete", "open"] })
        ],
        counts: { approval: 5, task_late: 2, task_today: 1 },
        source_statuses: [],
        safe_error_codes: [],
        audit_hint_ref: "r1-wp5-task-audit",
        count_leak_prevented: true,
        production_ready_claim: false
      };
    }
    return {
      request_id: "r1-wp5-approval",
      outcome: "passed",
      items: [
        wp5ActionItem({ id: "approval_newest", type: "approval", title: "가장 늦은 승인", dueOffset: 4, dueHour: 12, allowedActions: ["approve", "reject", "open"] }),
        wp5ActionItem({ id: "approval_oldest", type: "approval", title: "가장 오래된 승인", dueOffset: -4, dueHour: 9, allowedActions: ["approve", "reject", "open"] }),
        wp5ActionItem({ id: "approval_mid", type: "approval", title: "중간 승인", dueOffset: 1, dueHour: 9, allowedActions: ["approve", "reject", "open"] }),
        wp5ActionItem({ id: "approval_today", type: "approval", title: "오늘 승인", dueOffset: 0, dueHour: 9, allowedActions: ["approve", "reject", "open"] }),
        wp5ActionItem({ id: "approval_tomorrow", type: "approval", title: "내일 승인", dueOffset: 1, dueHour: 12, allowedActions: ["approve", "reject", "open"] })
      ],
      counts: { approval: 5, task_late: 2, task_today: 1 },
      source_statuses: [],
      safe_error_codes: [],
      audit_hint_ref: "r1-wp5-approval-audit",
      count_leak_prevented: true,
      production_ready_claim: false
    };
  }
  if (pathname.includes("/api/home/action-inbox/") && pathname.endsWith("/decision")) {
    state.decisionCalls += 1;
    return {
      request_id: "r1-wp5-decision",
      outcome: "passed",
      decision: { action: "approve" },
      safe_error_codes: [],
      audit_hint_ref: "r1-wp5-decision-audit",
      production_ready_claim: false
    };
  }
  if (pathname === "/api/home/agenda") {
    return {
      request_id: "r1-wp5-agenda",
      outcome: "passed",
      events: [
        { id: "agenda-general", kind: "meeting", title: "오늘 회의", starts_at: wp5IsoDay(0, 10), matter_ref: "matter-r1-wp5" },
        { id: "agenda-deadline", kind: "deadline", title: "오늘 제출 기한", starts_at: wp5IsoDay(0, 14), matter_ref: "matter-r1-wp5" },
        { id: "agenda-next-deadline", kind: "deadline", title: "다음 제출 기한", starts_at: wp5IsoDay(1, 9), matter_ref: "matter-r1-wp5" }
      ],
      safe_error_codes: [],
      audit_hint_ref: "r1-wp5-agenda-audit",
      count_leak_prevented: true,
      production_ready_claim: false
    };
  }
  if (pathname === "/api/home/feed") {
    const tab = searchParams.get("tab") ?? "notice";
    if (tab === "news") {
      state.newsCalls += 1;
      return {
        request_id: "r1-wp5-news",
        outcome: "partial",
        entries: [],
        source_statuses: [{ source: "bloter", status: "failed" }],
        safe_error_codes: ["HOME_NEWS_ALL_SOURCES_FAILED"],
        audit_hint_ref: "r1-wp5-news-audit",
        count_leak_prevented: true,
        production_ready_claim: false
      };
    }
    return {
      request_id: "r1-wp5-feed",
      outcome: "passed",
      entries: [
        { id: "notice-r1-wp5", tab: "notice", source: "People notices", title: "WP5 사내 공지", body_preview: "WP5 공지 요약", published_at: wp5IsoDay(0, 8) },
        { id: "notice-r1-wp5-2", tab: "notice", source: "Matter", title: "WP5 보조 공지", body_preview: "보조 공지 요약", published_at: wp5IsoDay(-1, 8) }
      ],
      source_statuses: [],
      safe_error_codes: [],
      audit_hint_ref: "r1-wp5-feed-audit",
      count_leak_prevented: true,
      production_ready_claim: false
    };
  }
  return { request_id: "r1-wp5-empty", outcome: "passed", safe_error_codes: [], production_ready_claim: false };
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

test("R1 WP-5 renders widget rules and client-delayed undo at runtime", async () => {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const state = { decisionCalls: 0, newsCalls: 0 };
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, state));
    });
    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-dashboard`, { waitUntil: "networkidle" });

    await page.waitForSelector('[data-home-hero-action-count="8"]');
    const approvalIds = await page.locator('[data-widget-id="approval"] [data-home-action-id]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-home-action-id")));
    assert.deepEqual(approvalIds, ["approval_oldest", "approval_today", "approval_mid", "approval_tomorrow"]);

    await page.locator('[data-widget-id="approval"] [data-home-tab-id="sent"]').click();
    await page.waitForSelector("text=처리할 승인이 없습니다 — 모두 완료했습니다");
    await page.locator('[data-widget-id="approval"] [data-home-tab-id="received"]').click();

    const todoIds = await page.locator('[data-widget-id="todo"] [data-home-action-id]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-home-action-id")));
    assert.deepEqual(todoIds, ["task_late_three", "task_late_one", "task_today", "task_upcoming_one", "task_upcoming_two"]);
    assert.equal(await page.locator('[data-home-action-id="task_late_three"]').getAttribute("data-home-deadline-bucket"), "late");
    assert.equal(await page.locator('[data-home-action-id="task_today"]').getAttribute("data-home-deadline-bucket"), "today");
    assert.equal(await page.locator('[data-home-action-id="task_late_three"] [data-home-task-checkbox]').count(), 1);

    await page.locator('[data-home-action-id="approval_oldest"] [data-home-inline-action="approve"]').click();
    await page.waitForSelector('[data-home-action-undo-button="true"]');
    assert.equal(await page.locator('[data-home-hero-action-count]').getAttribute("data-home-hero-action-count"), "7");
    await page.locator('[data-home-action-undo-button="true"]').click();
    await page.waitForSelector('[data-home-action-id="approval_oldest"]');
    await page.waitForTimeout(250);
    assert.equal(state.decisionCalls, 0);
    assert.equal(await page.locator('[data-home-hero-action-count]').getAttribute("data-home-hero-action-count"), "8");

    const todayKey = wp5DateKey(0);
    await page.waitForSelector(`[data-home-calendar-day="${todayKey}"][data-home-calendar-day-kind="deadline"]`);
    assert.ok(await page.locator(".home-calendar-grid button.sunday").count() > 0);
    assert.equal(await page.locator("[data-home-calendar-prev]").count(), 1);
    assert.equal(await page.locator("[data-home-calendar-next]").count(), 1);
    assert.equal(await page.locator("[data-home-calendar-open]").count(), 1);
    assert.equal(await page.locator("[data-home-upcoming-deadline]").count(), 1);

    assert.equal(await page.locator("#home-feed-tab-notice").textContent(), "사내 공지");
    await page.locator('[data-home-feed-entry="notice-r1-wp5"]').click();
    await page.waitForSelector('[data-home-feed-read-panel="notice-r1-wp5"]');

    await page.locator("#home-feed-tab-news").click();
    await page.waitForSelector('[data-home-feed-retry="true"]');
    await page.locator('[data-home-feed-retry="true"]').click();
    await page.waitForFunction(() => window.document.querySelector("[data-home-feed-retry='true']") !== null);
    assert.ok(state.newsCalls >= 2);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("R1 WP-6 renders notification dot from action inbox counts and i18n labels at runtime", async () => {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const state = { decisionCalls: 0, newsCalls: 0 };
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, state));
    });
    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-dashboard`, { waitUntil: "networkidle" });

    await page.waitForSelector('[data-notification-info-count="2"]');
    assert.equal(await page.locator("[data-notification-dot]").count(), 1);
    assert.equal(await page.locator("[data-notification-trigger] .notification-badge").count(), 0);

    await page.locator("[data-notification-trigger]").click();
    await page.waitForSelector('[data-notification-card-id="home-task-late:2"]');
    await page.waitForSelector('[data-notification-info-count="0"]');
    assert.equal(await page.locator("[data-notification-dot]").count(), 0);
    assert.equal(await page.locator('[data-notification-card-id="home-task-today:1"]').count(), 1);

    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow&locale=en#home-dashboard`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-notification-info-count="2"]');
    assert.match(await page.locator('[data-widget-id="approval"]').textContent(), /Pending approvals/);
    assert.match(await page.locator('[data-widget-id="todo"]').textContent(), /Late 2 · Today 1/);
    assert.equal(await page.locator("#home-feed-tab-notice").textContent(), "Internal notices");
    assert.ok((await page.locator('.sidebar button:has-text("Dashboard")').count()) > 0);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("R1 WP-7 keeps Home counts equal across widget, sidebar, topbar, and dedicated views", async () => {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const state = { decisionCalls: 0, newsCalls: 0 };
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, state));
    });
    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-dashboard`, { waitUntil: "networkidle" });

    await page.waitForSelector('[data-home-widget-approval-count="5"]');
    const dashboardCounts = await page.evaluate(() => ({
      widget: document.querySelector("[data-home-widget-approval-count]")?.getAttribute("data-home-widget-approval-count"),
      sidebar: document.querySelector("[data-home-sidebar-approval-count]")?.getAttribute("data-home-sidebar-approval-count"),
      topbar: document.querySelector("[data-home-topbar-approval-count]")?.getAttribute("data-home-topbar-approval-count")
    }));
    assert.deepEqual(dashboardCounts, { widget: "5", sidebar: "5", topbar: "5" });

    await page.locator('[data-home-widget-view-all="todo"]').click();
    await page.waitForFunction(() => window.__MATTER_HOME_METRICS__?.some((event) => event.event_type === "home_deeplink_misclick" && event.outcome === "same_route"));

    await page.locator('[data-product-axis="matters"]').click();
    await page.waitForFunction(() => new URL(window.location.href).searchParams.get("view") === "matters");
    await page.locator('[data-product-axis="home"]').click();
    await page.waitForSelector('[data-home-widget-approval-count="5"]');
    const afterAxisCounts = await page.evaluate(() => ({
      widget: document.querySelector("[data-home-widget-approval-count]")?.getAttribute("data-home-widget-approval-count"),
      sidebar: document.querySelector("[data-home-sidebar-approval-count]")?.getAttribute("data-home-sidebar-approval-count"),
      topbar: document.querySelector("[data-home-topbar-approval-count]")?.getAttribute("data-home-topbar-approval-count")
    }));
    assert.deepEqual(afterAxisCounts, { widget: "5", sidebar: "5", topbar: "5" });

    await page.locator('[data-home-widget-view-all="approval"]').click();
    await page.waitForSelector('[data-home-section-screen="home-requests"]');
    const dedicatedCounts = await page.evaluate(() => ({
      dedicated: String(document.querySelectorAll('[data-home-section-screen="home-requests"] [data-home-action-type="approval"]').length),
      sidebar: document.querySelector("[data-home-sidebar-approval-count]")?.getAttribute("data-home-sidebar-approval-count"),
      topbar: document.querySelector("[data-home-topbar-approval-count]")?.getAttribute("data-home-topbar-approval-count")
    }));
    assert.deepEqual(dedicatedCounts, { dedicated: "5", sidebar: "5", topbar: "5" });
  } finally {
    await browser.close();
    await server.close();
  }
});

test("R1 WP-7 emits Home first-action and deep-link telemetry at runtime", async () => {
  const { HOME_METRIC_EVENT_NAME } = await import(pathToFileURL(resolve(webRoot, "src/data/homeTelemetry.js")).href);
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const state = { decisionCalls: 0, newsCalls: 0 };
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.addInitScript((eventName) => {
      window.__MATTER_HOME_METRIC_EVENTS__ = [];
      window.addEventListener(eventName, (event) => {
        window.__MATTER_HOME_METRIC_EVENTS__.push(event.detail);
      });
    }, HOME_METRIC_EVENT_NAME);
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, state));
    });
    await page.goto(`http://127.0.0.1:${port}/?view=requests&ctx=allow#requests-leave`, { waitUntil: "networkidle" });

    await page.waitForSelector('[data-home-section-screen="home-requests"]');
    await page.waitForFunction(() => window.__MATTER_HOME_METRICS__?.some((event) => event.event_type === "home_deeplink_misclick" && event.source === "initial_route"));
    await page.locator('[data-home-action-id="approval_oldest"] [data-home-inline-action="approve"]').click();
    await page.waitForFunction(() => window.__MATTER_HOME_METRICS__?.some((event) => event.event_type === "home_time_to_first_action"));

    const metrics = await page.evaluate(() => window.__MATTER_HOME_METRICS__);
    const deepLinkMetric = metrics.find((event) => event.event_type === "home_deeplink_misclick" && event.source === "initial_route");
    const firstActionMetric = metrics.find((event) => event.event_type === "home_time_to_first_action");
    assert.equal(deepLinkMetric.requested_view, "requests");
    assert.equal(deepLinkMetric.requested_section, "requests-leave");
    assert.equal(deepLinkMetric.resolved_view, "home");
    assert.equal(deepLinkMetric.resolved_section, "home-requests");
    assert.equal(deepLinkMetric.outcome, "redirected");
    assert.equal(firstActionMetric.action_kind, "home_action_decision");
    assert.equal(firstActionMetric.action, "approve");
    assert.equal(firstActionMetric.item_id, "approval_oldest");
    assert.equal(firstActionMetric.active_section, "home-requests");
    assert.equal(typeof firstActionMetric.elapsed_ms, "number");
    assert.ok(firstActionMetric.elapsed_ms >= 0);
    const metricEvents = await page.evaluate(() => window.__MATTER_HOME_METRIC_EVENTS__);
    assert.ok(metricEvents.some((event) => event.event_type === "home_deeplink_misclick"));
    assert.ok(metricEvents.some((event) => event.event_type === "home_time_to_first_action"));
  } finally {
    await browser.close();
    await server.close();
  }
});

test("R1 WP-8 treats profile as a mode exception and normalizes Home fallback sections", async () => {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const state = { decisionCalls: 0, newsCalls: 0 };
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, state));
    });
    await page.goto(`http://127.0.0.1:${port}/?view=matters&ctx=allow#matter-calendar`, { waitUntil: "networkidle" });

    await page.locator("[data-profile-trigger]").click();
    await page.waitForSelector('[data-mode-exception-sidebar="true"] [data-mode-return-anchor="true"]');
    assert.equal(await page.locator("[data-mode-return-anchor]").getAttribute("data-mode-return-view"), "matters");
    assert.equal(await page.locator("[data-mode-return-anchor]").getAttribute("data-mode-return-section"), "matter-calendar");

    await page.locator("[data-mode-return-anchor]").click();
    await page.waitForFunction(() => new URL(window.location.href).searchParams.get("view") === "matters" && window.location.hash === "#matter-calendar");

    await page.goto(`http://127.0.0.1:${port}/?view=unknown&ctx=allow#not-a-real-section`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-active-home-section="home-dashboard"]');
    await page.waitForFunction(() => new URL(window.location.href).searchParams.get("view") === "home" && window.location.hash === "#home-dashboard");
    assert.equal(await page.locator("[data-active-home-section]").getAttribute("data-active-home-section"), "home-dashboard");
  } finally {
    await browser.close();
    await server.close();
  }
});
