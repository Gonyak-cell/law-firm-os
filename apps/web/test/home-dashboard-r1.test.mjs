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

function visibleLineCount(text, expected) {
  return String(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line === expected).length;
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
  const list = (id, items) => ({ request_id: id, outcome: "passed", ui_state: "ready", items, page_info: { next_cursor: null, returned_count: items.length }, safe_error_codes: [], audit_hint_ref: `${id}-audit`, count_leak_prevented: true, production_ready_claim: false });
  if (pathname === "/api/matters") {
    return list("dashboard-matters", [
      { matter_id: "matter-dashboard-opening", matter_code: "2026-101", title: "신규 자문", client_display_name: "고객 A", status: "opening", owner_user_id: "jwsuh@amic.kr", created_at: wp5IsoDay(-1) },
      { matter_id: "matter-dashboard-active", matter_code: "2026-099", title: "진행 자문", client_display_name: "고객 B", status: "active", owner_user_id: "jwsuh@amic.kr", updated_at: wp5IsoDay(0) },
      { matter_id: "matter-dashboard-closed", matter_code: "2026-088", title: "종결 자문", client_display_name: "고객 C", status: "closed", closed_at: wp5IsoDay(-2) }
    ]);
  }
  if (pathname === "/api/matters/recently-viewed") {
    return list("dashboard-recent", [{ matter_id: "matter-dashboard-active", matter_code: "2026-099", title: "진행 자문", client_display_name: "고객 B", status: "active", viewed_at: wp5IsoDay(0) }]);
  }
  if (pathname === "/api/intake/requests") {
    return list("dashboard-intakes", [{ intake_request_id: "intake-dashboard-1", display_name: "고객 A", requested_scope_summary: "신규 자문 수임", status: "review_required", requested_at: wp5IsoDay(-1) }]);
  }
  if (pathname === "/api/crm/accounts") {
    return list("dashboard-accounts", [{ account_id: "account-dashboard-1", display_name: "고객 A", status: "active", owner_user_id: "jwsuh@amic.kr", created_at: wp5IsoDay(-1) }]);
  }
  if (pathname === "/api/crm/leads") {
    return list("dashboard-leads", [{ lead_id: "lead-dashboard-1", display_name: "잠재 고객 A", status: "active", owner_user_id: "jwsuh@amic.kr", created_at: wp5IsoDay(-1) }]);
  }
  if (pathname === "/api/crm/opportunities") {
    return list("dashboard-opportunities", [{ opportunity_id: "opp-dashboard-1", display_name: "잠재 수임 A", stage: "qualified", status: "active", owner_user_id: "jwsuh@amic.kr", updated_at: wp5IsoDay(0) }]);
  }
  if (pathname === "/api/crm/contacts") {
    return list("dashboard-contacts", [{ contact_id: "contact-dashboard-1", account_id: "account-dashboard-1", display_name: "고객 담당자 A", status: "active", updated_at: wp5IsoDay(0) }]);
  }
  if (pathname === "/api/crm/activities") {
    return list("dashboard-activities", [{ crm_activity_id: "meeting-dashboard-1", party_id: "party-dashboard-1", activity_type: "meeting", subject: "고객 정기 미팅", status: "active", owner_user_id: "jwsuh@amic.kr", scheduled_at: wp5IsoDay(1) }]);
  }
  if (pathname === "/api/analytics/finance/overview") {
    return {
      request_id: "wp-fin-3-overview",
      outcome: "passed",
      item: {
        scope_label: "Matter 기반 집계",
        totals: [{ currency: "KRW", billed_amount: 900, collected_amount: 400, matter_cost: 250, recoverable_cost: 250, ar_balance: 500, contribution_amount: 650, unlinked_amount: 50, transaction_count: 7, date_inferred_count: 1 }],
        currency_conversion_applied: false,
        ar_balance_is_point_in_time: true
      },
      source_statuses: [], safe_error_codes: [], audit_hint_ref: "wp-fin-3-overview-audit", count_leak_prevented: true, raw_source_payload_included: false, production_ready_claim: false
    };
  }
  if (pathname === "/api/analytics/finance/monthly") {
    return {
      request_id: "wp-fin-3-monthly", outcome: "passed",
      items: [{ month: "2026-07", currency: "KRW", billed_amount: 900, collected_amount: 400, matter_cost: 250, recoverable_cost: 250, ar_balance: 500, contribution_amount: 650, unlinked_amount: 50, transaction_count: 7, date_inferred_count: 1 }],
      source_statuses: [], safe_error_codes: [], audit_hint_ref: "wp-fin-3-monthly-audit", count_leak_prevented: true, raw_source_payload_included: false, production_ready_claim: false
    };
  }
  if (pathname === "/api/analytics/finance/clients") {
    return {
      request_id: "wp-fin-3-clients", outcome: "passed",
      items: [
        { client_group_id: "client-group-visible", client_group_label: "고객 A", client_mapping_source: "master-data.ClientGroup", matter_count: 1, currency: "KRW", billed_amount: 900, collected_amount: 400, matter_cost: 200, recoverable_cost: 200, ar_balance: 500, contribution_amount: 700, unlinked_amount: 0, transaction_count: 6, date_inferred_count: 1 },
        { client_group_id: null, client_group_label: "미연결 고객", client_mapping_source: "unlinked", matter_count: 1, currency: "KRW", billed_amount: 0, collected_amount: 0, matter_cost: 50, recoverable_cost: 50, ar_balance: 0, contribution_amount: -50, unlinked_amount: 50, transaction_count: 1, date_inferred_count: 0 }
      ],
      source_statuses: [], safe_error_codes: [], audit_hint_ref: "wp-fin-3-clients-audit", count_leak_prevented: true, raw_source_payload_included: false, production_ready_claim: false
    };
  }
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

test("WP-FIN-1 resolves finance and Matter settlement routes into Home", async () => {
  const cases = [
    { view: "finance", section: "finance-matter-billing", target: "home-finance-billing" },
    { view: "finance", section: "finance-expenses", target: "home-finance-expenses" },
    { view: "matters", section: "matter-time", target: "home-finance-time" },
    { view: "matters", section: "matter-expenses", target: "home-finance-expenses" },
    { view: "matters", section: "matter-billing", target: "home-finance-billing" },
    { view: "matters", section: "matter-ar", target: "home-finance-ar" }
  ];
  for (const route of cases) {
    const html = await renderAppAtLegacyRoute(route);
    assert.match(html, new RegExp(`data-active-home-section="${route.target}"`));
    assert.match(html, new RegExp(`data-home-finance-route-contract="${route.target}"`));
    assert.match(html, /data-sidebar-group="home-finance"/);
  }
  const approvals = await renderAppAtLegacyRoute({ view: "matters", section: "matter-approvals" });
  assert.match(approvals, /data-active-home-section="home-requests"/);
  assert.match(approvals, /data-home-section-screen="home-requests"/);
  assert.match(approvals, /data-home-request-filter="finance"/);
});

test("WP-FIN-1 preserves Matter context and sidebar state in the browser", async () => {
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
    await page.goto(`http://127.0.0.1:${port}/?view=matters&ctx=allow&matter_id=matter_wp_fin#matter-time`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-home-finance-route-contract="home-finance-time"]');
    await page.waitForFunction(() => {
      const url = new URL(window.location.href);
      return url.searchParams.get("view") === "home" && url.searchParams.get("matter_id") === "matter_wp_fin" && url.hash === "#home-finance-time";
    });

    const group = page.locator('[data-sidebar-group="home-finance"]');
    assert.equal(await group.count(), 1);
    assert.equal(await group.locator(".sidebar-group-toggle").getAttribute("aria-expanded"), null);
    await page.getByRole("navigation", { name: "매출/비용 하위 메뉴" }).getByRole("button", { name: "고객별 매출/비용", exact: true }).click();
    await page.waitForSelector('[data-home-finance-route-contract="home-finance-clients"]');
    assert.equal(new URL(page.url()).hash, "#home-finance-clients");
  } finally {
    await browser.close();
    await server.close();
  }
});

test("grouped sidebars route to defaults and expose children only in contextual navigation", async () => {
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

    for (const view of ["home", "clients", "matters", "people"]) {
      await page.goto(`http://127.0.0.1:${port}/?view=${view}&ctx=allow`, { waitUntil: "networkidle" });
      const overlayScrim = page.locator(".record-overlay-scrim");
      if (await overlayScrim.count()) await overlayScrim.click();
      const toggles = page.locator(`[data-context-sidebar="${view}"] .sidebar-group-toggle`);
      const count = await toggles.count();
      assert.ok(count > 0, `${view} must render at least one grouped sidebar menu`);
      for (let index = 0; index < count; index += 1) {
        const toggle = toggles.nth(index);
        const expectedSection = await toggle.getAttribute("data-sidebar-default-section");
        assert.ok(expectedSection, `${view} group ${index} must declare a default section`);
        assert.equal(await toggle.getAttribute("aria-expanded"), null, `${view} group ${index} must not be an accordion`);
        const alreadyDefault = await toggle.getAttribute("aria-current");
        if (!alreadyDefault) {
          await toggle.evaluate((element) => element.click());
          await page.waitForFunction((section) => window.location.hash === `#${section}`, expectedSection);
        }
        assert.equal(await page.locator(".sidebar-subnav,.sidebar-child").count(), 0, `${view} group ${index} must not render nested sidebar items`);
        const contextSubnav = page.locator(".context-subnav");
        assert.equal(await contextSubnav.count(), 1, `${view} group ${index} must render contextual navigation`);
        assert.equal(await contextSubnav.locator('[aria-current="page"]').count(), 1, `${view} group ${index} must mark one contextual route current`);
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
});

test("WP-FIN-3 renders reconciled Home finance views and keeps filters in the URL", async () => {
  const port = await availablePort();
  const server = await createServer({ root: webRoot, logLevel: "silent", server: { host: "127.0.0.1", port, strictPort: true } });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const state = { decisionCalls: 0, newsCalls: 0 };
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, state));
    });
    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-finance-overview`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-home-finance-summary="true"]');
    const overview = page.locator('[data-home-finance-surface="true"]');
    assert.match(await overview.innerText(), /900원/);
    assert.match(await overview.innerText(), /400원/);
    assert.match(await overview.innerText(), /미연결 고객/);
    assert.doesNotMatch(await overview.innerText(), /client-group-visible|tenant_cmp|party-/);

    await overview.getByLabel("통화").selectOption("KRW");
    await page.waitForFunction(() => new URL(window.location.href).searchParams.get("currency") === "KRW");
    const financeSubnav = page.getByRole("navigation", { name: "매출/비용 하위 메뉴" });
    await financeSubnav.getByRole("button", { name: "월별 매출/비용", exact: true }).click();
    await page.waitForSelector('[data-home-finance-monthly-table="true"]');
    assert.equal(new URL(page.url()).searchParams.get("currency"), "KRW");
    await financeSubnav.getByRole("button", { name: "고객별 매출/비용", exact: true }).click();
    await page.waitForSelector('[data-home-finance-client-table="true"]');
    assert.equal(await page.locator('[data-home-finance-unlinked-client="true"]').count(), 1);

    await page.setViewportSize({ width: 700, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("WP-FIN-4 runs the shared Matter finance workflow from Home", async () => {
  const port = await availablePort();
  const server = await createServer({ root: webRoot, logLevel: "silent", server: { host: "127.0.0.1", port, strictPort: true } });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const calls = [];
  const listBody = (items = []) => ({ request_id: "wp-fin-4-list", outcome: "passed", items, page_info: { next_cursor: null, returned_count: items.length }, safe_error_codes: [], audit_hint_ref: "wp-fin-4-audit", ui_state: items.length === 0 ? "empty" : null, count_leak_prevented: true, production_ready_claim: false });
  const actionBody = (extra = {}) => ({ request_id: "wp-fin-4-action", outcome: "created", safe_error_codes: [], audit_hint_ref: "wp-fin-4-action-audit", production_ready_claim: false, ...extra });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 1000 } });
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const key = `${request.method()} ${url.pathname}`;
      calls.push(key);
      if (url.pathname === "/api/matters") return jsonResponse(route, listBody([{ matter_id: "matter-live-1", matter_code: "2026-001", title: "고객 자문", billing_client_party_id: "party-live-1", status: "active" }]));
      if (url.pathname === "/api/finance/time-entries" && request.method() === "GET") return jsonResponse(route, listBody([]));
      if (url.pathname === "/api/finance/invoices" && request.method() === "GET") return jsonResponse(route, listBody([]));
      if (url.pathname === "/api/finance/ar-aging" && request.method() === "GET") return jsonResponse(route, listBody([{ ar_balance_id: "ar-live-1", matter_id: "matter-live-1", balance: 1000, status: "open" }]));
      if (url.pathname === "/api/finance/audit" && request.method() === "GET") return jsonResponse(route, listBody([]));
      if (url.pathname === "/api/finance/time-entries" && request.method() === "POST") return jsonResponse(route, actionBody({ item: { time_entry_id: "time-live-1", matter_id: "matter-live-1", work_date: "2026-07-10", narrative: "WP4 시간 기록", duration_minutes: 30, status: "approved" } }), 201);
      if (url.pathname === "/api/finance/expenses" && request.method() === "POST") return jsonResponse(route, actionBody({ item: { expense_id: "expense-live-1", matter_id: "matter-live-1", amount: 25000, currency: "KRW" } }), 201);
      if (url.pathname === "/api/finance/disbursements" && request.method() === "POST") return jsonResponse(route, actionBody({ item: { disbursement_id: "disbursement-live-1", matter_id: "matter-live-1", amount: 15000, currency: "KRW" } }), 201);
      if (url.pathname === "/api/finance/wip") return jsonResponse(route, actionBody({ items: [{ wip_item_id: "wip-live-1", matter_id: "matter-live-1", amount: 1000, currency: "KRW" }] }), 201);
      if (url.pathname === "/api/finance/wip-snapshots") return jsonResponse(route, actionBody({ item: { wip_snapshot_id: "snapshot-live-1" } }), 201);
      if (url.pathname === "/api/finance/prebills") return jsonResponse(route, actionBody({ item: { prebill_id: "prebill-live-1", status: "draft" } }), 201);
      if (url.pathname === "/api/finance/prebills/approve") return jsonResponse(route, actionBody({ item: { prebill_id: "prebill-live-1", status: "approved" } }));
      if (url.pathname === "/api/finance/invoices" && request.method() === "POST") return jsonResponse(route, actionBody({ item: { invoice_id: "invoice-live-1", matter_id: "matter-live-1", invoice_number: "INV-001", amount_due: 1000, amount_paid: 0, currency: "KRW", status: "issued" } }), 201);
      if (url.pathname === "/api/finance/payments" && request.method() === "POST") return jsonResponse(route, actionBody({ item: { payment_id: "payment-live-1", matter_id: "matter-live-1", amount: 1000, unapplied_amount: 1000, currency: "KRW" } }), 201);
      if (url.pathname === "/api/finance/payment-matches") return jsonResponse(route, actionBody({ item: { payment_match_id: "match-live-1", amount: 1000 }, invoice: { invoice_id: "invoice-live-1", matter_id: "matter-live-1", amount_due: 1000, amount_paid: 1000, currency: "KRW", status: "paid" }, payment: { payment_id: "payment-live-1", amount: 1000, unapplied_amount: 0, currency: "KRW" } }), 201);
      if (url.pathname === "/api/finance/accounting-export.csv") return jsonResponse(route, actionBody({ item: { accounting_export_id: "export-live-1", row_count: 2, balanced: true, debit_total: 1000, credit_total: 1000, csv_sha256: "0123456789abcdef" } }));
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, { decisionCalls: 0, newsCalls: 0 }));
    });

    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow&matter_id=matter-live-1#home-finance-time`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-home-finance-operation="time"] [data-matter-time-entry-form="true"]');
    await page.locator('[data-upl-b01-time-entry-narrative="true"]').fill("WP4 시간 기록");
    await page.locator('[data-upl-b01-time-entry-submit="true"]').click();
    await page.waitForSelector('text=시간이 기록되었습니다.');

    const financeSubnav = page.getByRole("navigation", { name: "매출/비용 하위 메뉴" });
    await financeSubnav.getByRole("button", { name: "비용 처리", exact: true }).click();
    await page.waitForSelector('[data-home-finance-operation="expenses"]');
    await page.locator('[data-matter-expense-form="true"]').getByLabel("영수증").fill("receipt-live-1");
    await page.locator('[data-matter-expense-form="true"]').getByRole("button", { name: "경비 기록" }).click();
    await page.waitForSelector('text=경비가 기록되었습니다.');
    await page.locator('[data-matter-disbursement-form="true"]').getByLabel("거래처").fill("vendor-live-1");
    await page.locator('[data-matter-disbursement-form="true"]').getByRole("button", { name: "대납 기록" }).click();
    await page.waitForSelector('text=대납이 기록되었습니다.');

    await financeSubnav.getByRole("button", { name: "청구/수납", exact: true }).click();
    await page.waitForSelector('[data-home-finance-operation="billing"]');
    await page.getByRole("button", { name: "청구 준비", exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('[data-matter-prebill-review-action="true"] button')?.disabled);
    await page.getByRole("button", { name: "검토 승인", exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('[data-matter-invoice-issue-action="true"] button')?.disabled);
    await page.getByRole("button", { name: "발행", exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('[data-matter-payment-import-action="true"]')?.disabled);
    await page.getByRole("button", { name: "입금 기록", exact: true }).click();
    await page.waitForFunction(() => {
      const buttons = [...document.querySelectorAll('[data-matter-payment-match-action="true"] button')];
      return buttons.some((button) => button.textContent.trim() === "배정" && !button.disabled);
    });
    await page.getByRole("button", { name: "배정", exact: true }).click();
    await page.locator('[data-matter-accounting-export-form="true"]').getByRole("button", { name: "CSV 생성" }).click();
    await page.waitForSelector('[data-matter-accounting-export-summary="true"]');

    await financeSubnav.getByRole("button", { name: "미수금", exact: true }).click();
    await page.waitForSelector('[data-home-finance-operation="ar"]');
    assert.match(await page.locator('[data-home-finance-operation="ar"]').innerText(), /KRW 1,000/);
    assert.equal(new URL(page.url()).searchParams.get("matter_id"), "matter-live-1");
    for (const expected of ["POST /api/finance/time-entries", "POST /api/finance/expenses", "POST /api/finance/disbursements", "POST /api/finance/wip", "POST /api/finance/wip-snapshots", "POST /api/finance/prebills", "POST /api/finance/prebills/approve", "POST /api/finance/invoices", "POST /api/finance/payments", "POST /api/finance/payment-matches", "GET /api/finance/accounting-export.csv"]) {
      assert.ok(calls.includes(expected), `missing ${expected}`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
});

test("WP-FIN-5 exposes only scoped finance navigation and hides accounting export", async () => {
  const port = await availablePort();
  const server = await createServer({ root: webRoot, logLevel: "silent", server: { host: "127.0.0.1", port, strictPort: true } });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.addInitScript(() => {
      window.__LAWOS_SESSION_CONTEXT__ = {
        schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
        state: "signed_in",
        session_ref: "session:wp-fin-5",
        source: "wp-fin-5-browser-test",
        actor_ref: "user_scoped_expense",
        tenant_refs: { default: "tenant_amic_matter_vault", finance: "tenant_cmp_g7_synthetic" },
        role_ids: ["lawos_staff"],
        scopes: ["matter.read", "finance.expense.write"],
        expires_at: "2099-01-01T00:00:00.000Z",
        review_state: "allow",
      };
    });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/matters") return jsonResponse(route, { request_id: "wp-fin-5-matters", outcome: "passed", items: [{ matter_id: "matter-scoped", matter_code: "2026-005", title: "권한 검수" }], safe_error_codes: [], audit_hint_ref: "wp-fin-5-audit", page_info: { next_cursor: null }, count_leak_prevented: true, production_ready_claim: false });
      if (["/api/finance/time-entries", "/api/finance/invoices", "/api/finance/ar-aging", "/api/finance/audit"].includes(url.pathname)) return jsonResponse(route, { request_id: "wp-fin-5-list", outcome: "passed", items: [], safe_error_codes: [], audit_hint_ref: "wp-fin-5-audit", page_info: { next_cursor: null, returned_count: 0 }, count_leak_prevented: true, production_ready_claim: false });
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, { decisionCalls: 0, newsCalls: 0 }));
    });
    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow&matter_id=matter-scoped#home-finance-billing`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    assert.equal(await page.locator('[data-active-home-section]').getAttribute("data-active-home-section"), "home-finance-expenses");
    assert.equal(new URL(page.url()).hash, "#home-finance-expenses");
    const group = page.locator('[data-sidebar-group="home-finance"]');
    assert.equal(await group.count(), 1);
    assert.equal(await group.locator(".sidebar-group-toggle").getAttribute("aria-expanded"), null);
    const subnav = page.getByRole("navigation", { name: "매출/비용 하위 메뉴" });
    assert.equal(await subnav.getByRole("button", { name: "비용 처리", exact: true }).count(), 1);
    assert.equal(await subnav.getByRole("button", { name: "전체 현황", exact: true }).count(), 0);
    assert.equal(await subnav.getByRole("button", { name: "청구/수납", exact: true }).count(), 0);
    assert.equal(await page.locator('[data-matter-accounting-export-action="true"]').count(), 0);
  } finally {
    await browser.close();
    await server.close();
  }
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

    await page.waitForSelector(".home-dashboard-hero h1");
    const heroText = await page.locator(".home-dashboard-hero").innerText();
    assert.doesNotMatch(heroText, /\bHOME\b/);
    assert.doesNotMatch(heroText, /오늘 처리할 항목/);
    assert.equal(await page.locator('[data-widget-id="approval"]').count(), 0);
    for (const section of ["home", "recent-work", "today-todo", "calendar", "monthly-sales", "new-engagements", "feed"]) {
      assert.equal(await page.locator(`[data-dashboard-section="${section}"]`).count(), 1);
    }

    const todoIds = await page.locator('[data-widget-id="todo"] [data-home-action-id]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-home-action-id")));
    assert.deepEqual(todoIds, ["task_late_three", "task_late_one", "task_today", "task_upcoming_one", "task_upcoming_two"]);
    assert.equal(await page.locator('[data-home-action-id="task_late_three"]').getAttribute("data-home-deadline-bucket"), "late");
    assert.equal(await page.locator('[data-home-action-id="task_today"]').getAttribute("data-home-deadline-bucket"), "today");
    assert.equal(await page.locator('[data-home-action-id="task_late_three"] [data-home-task-checkbox]').count(), 1);

    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-requests`, { waitUntil: "networkidle" });
    const approvalIds = await page.locator('[data-home-section-screen="home-requests"] [data-home-action-id]').evaluateAll((nodes) => [...new Set(nodes.map((node) => node.getAttribute("data-home-action-id")))]);
    assert.deepEqual(approvalIds, ["approval_oldest", "approval_today", "approval_mid", "approval_tomorrow", "approval_newest"]);
    await page.locator('[data-home-action-id="approval_oldest"] [data-home-inline-action="approve"]').first().click();
    await page.waitForSelector('[data-home-action-undo-button="true"]');
    assert.equal(await page.locator("[data-home-hero-action-count]").count(), 0);
    await page.locator('[data-home-action-undo-button="true"]').click();
    await page.waitForSelector('[data-home-action-id="approval_oldest"]');
    await page.waitForTimeout(250);
    assert.equal(state.decisionCalls, 0);
    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-dashboard`, { waitUntil: "networkidle" });
    assert.doesNotMatch(await page.locator(".home-dashboard-hero").innerText(), /오늘 처리할 항목/);

    const todayKey = wp5DateKey(0);
    await page.waitForSelector(`[data-home-calendar-day="${todayKey}"][data-home-calendar-day-kind="deadline"]`);
    assert.ok(await page.locator(".home-calendar-grid button.sunday").count() > 0);
    assert.equal(await page.locator("[data-home-calendar-prev]").count(), 0);
    assert.equal(await page.locator("[data-home-calendar-next]").count(), 0);
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

test("dashboard bodies render the requested Home, Matter, and People work areas without KPI counts", async () => {
  const port = await availablePort();
  const server = await createServer({ root: webRoot, logLevel: "silent", server: { host: "127.0.0.1", port, strictPort: true } });
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
    for (const title of ["최근 작업", "오늘 To Do", "캘린더", "월별 매출", "신규 수임", "피드"]) {
      assert.equal(await page.getByText(title, { exact: true }).count() > 0, true, `Home must show ${title}`);
    }
    assert.equal(await page.locator('[data-home-widget-approval-count], [data-widget-id="approval"]').count(), 0);
    assert.equal(await page.locator('[data-dashboard-section="recent-work"] .dashboard-record-row').count() > 0, true);
    assert.equal(await page.locator('[data-dashboard-section="monthly-sales"] .dashboard-record-row').count() > 0, true);
    await page.setViewportSize({ width: 1024, height: 768 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, "Home dashboard must not overflow at 1024px");
    await page.setViewportSize({ width: 1366, height: 900 });

    await page.goto(`http://127.0.0.1:${port}/?view=matters&ctx=allow#matter-home`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-matter-dashboard="true"]');
    for (const title of ["최근 작업", "오늘의 To Do", "나의 매터(담당 지정)", "신규 수임", "종결 매터"]) {
      assert.equal(await page.getByText(title, { exact: true }).count(), 1, `Matter must show ${title}`);
    }
    assert.equal(await page.locator('[data-matter-dashboard-kpis], [data-matter-priority-queue]').count(), 0);
    assert.equal(await page.locator('[data-dashboard-section="closed-matters"] .dashboard-record-row').count(), 1);

    await page.goto(`http://127.0.0.1:${port}/?view=people&ctx=allow#people-dashboard`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-people-dashboard="true"]');
    for (const title of ["신규 고객", "잠재 고객/접촉", "매출 순위", "고객 미팅", "미수금"]) {
      assert.equal(await page.getByText(title, { exact: true }).count(), 1, `People must show ${title}`);
    }
    for (const section of ["new-clients", "prospects-contacts", "revenue-ranking", "client-meetings", "accounts-receivable"]) {
      assert.equal(await page.locator(`[data-dashboard-section="${section}"]`).count(), 1);
    }
    assert.equal(await page.locator('[data-dashboard-section="new-clients"] .dashboard-record-row').count(), 1);
    assert.equal(await page.locator('[data-dashboard-section="client-meetings"] .dashboard-record-row').count(), 1);
    const peopleDashboardText = await page.locator('[data-people-dashboard="true"]').innerText();
    assert.doesNotMatch(peopleDashboardText, /jwsuh@amic\.kr|party-dashboard-1|account-dashboard-1/);
    assert.doesNotMatch(peopleDashboardText, /\b(?:Client|qualified|active)\b/);
    assert.match(peopleDashboardText, /고객|검토 완료|진행 중/);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("Home dashboard keeps independent cards available when monthly finance is denied", async () => {
  const port = await availablePort();
  const server = await createServer({ root: webRoot, logLevel: "silent", server: { host: "127.0.0.1", port, strictPort: true } });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/analytics/finance/monthly") {
        return jsonResponse(route, {
          request_id: "dashboard-monthly-denied",
          outcome: "denied",
          ui_state: "denied",
          items: [],
          safe_error_codes: ["ANALYTICS_FINANCE_READ_DENIED"],
          audit_hint_ref: "dashboard-monthly-denied-audit",
          count_leak_prevented: true,
          production_ready_claim: false
        });
      }
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, { decisionCalls: 0, newsCalls: 0 }));
    });

    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-dashboard`, { waitUntil: "networkidle" });
    assert.equal(await page.locator('[data-dashboard-section="recent-work"] .dashboard-record-row').count() > 0, true);
    assert.equal(await page.locator('[data-dashboard-section="new-engagements"] .dashboard-record-row').count() > 0, true);
    assert.match(await page.locator('[data-dashboard-section="monthly-sales"]').innerText(), /월별 매출 접근 권한이 없습니다/);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("Home dashboard preserves a source error without hiding independent cards", async () => {
  const port = await availablePort();
  const server = await createServer({ root: webRoot, logLevel: "silent", server: { host: "127.0.0.1", port, strictPort: true } });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/matters") {
        return jsonResponse(route, {
          request_id: "dashboard-matters-error",
          outcome: "blocked",
          safe_error_codes: ["MATTER_READ_UNAVAILABLE"],
          production_ready_claim: false
        }, 503);
      }
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, { decisionCalls: 0, newsCalls: 0 }));
    });

    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-dashboard`, { waitUntil: "networkidle" });
    assert.match(await page.locator('[data-dashboard-section="recent-work"]').innerText(), /최근 작업을 불러오지 못했습니다/);
    assert.equal(await page.locator('[data-dashboard-section="new-engagements"] .dashboard-record-row').count() > 0, true);
    assert.equal(await page.locator('[data-dashboard-section="monthly-sales"] .dashboard-record-row').count() > 0, true);
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
    assert.equal(await page.locator('[data-widget-id="approval"]').count(), 0);
    assert.doesNotMatch(await page.locator('[data-widget-id="todo"]').textContent(), /Late 2, Today 1/);
    assert.equal(await page.locator("#home-feed-tab-notice").textContent(), "Internal notices");
    assert.ok((await page.locator('.sidebar button:has-text("Dashboard")').count()) > 0);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("R1 WP-7 keeps approval counts out of dashboard cards and equal across sidebar, topbar, and dedicated views", async () => {
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

    await page.waitForSelector('[data-home-sidebar-approval-count="5"]');
    const dashboardSurfaceText = await page.locator(".home-dashboard-surface").innerText();
    assert.equal(visibleLineCount(dashboardSurfaceText, "승인 대기"), 0);
    assert.doesNotMatch(dashboardSurfaceText, /승인 요청/);
    assert.doesNotMatch(dashboardSurfaceText, /·/);
    const dashboardCounts = await page.evaluate(() => ({
      sidebar: document.querySelector("[data-home-sidebar-approval-count]")?.getAttribute("data-home-sidebar-approval-count"),
      topbar: document.querySelector("[data-home-topbar-approval-count]")?.getAttribute("data-home-topbar-approval-count")
    }));
    assert.deepEqual(dashboardCounts, { sidebar: "5", topbar: "5" });
    assert.equal(await page.locator("[data-home-widget-approval-count]").count(), 0);

    await page.locator('[data-home-widget-view-all="todo"]').click();
    await page.waitForFunction(() => window.location.hash === "#home-todo");
    assert.equal(await page.locator("[data-active-home-section]").getAttribute("data-active-home-section"), "home-todo");
    assert.equal(await page.locator("[data-home-dashboard-grid]").getAttribute("data-home-dashboard-focus"), "home-todo");

    await page.locator('[data-product-axis="matters"]').click();
    await page.waitForFunction(() => new URL(window.location.href).searchParams.get("view") === "matters");
    await page.locator('[data-product-axis="home"]').click();
    await page.waitForSelector('[data-home-sidebar-approval-count="5"]');
    const afterAxisCounts = await page.evaluate(() => ({
      sidebar: document.querySelector("[data-home-sidebar-approval-count]")?.getAttribute("data-home-sidebar-approval-count"),
      topbar: document.querySelector("[data-home-topbar-approval-count]")?.getAttribute("data-home-topbar-approval-count")
    }));
    assert.deepEqual(afterAxisCounts, { sidebar: "5", topbar: "5" });

    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-requests`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-home-section-screen="home-requests"]');
    await page.waitForSelector(".home-dashboard-hero h1");
    const requestsSurfaceText = await page.locator(".home-dashboard-surface").innerText();
    assert.equal(await page.locator(".home-dashboard-hero h1").textContent(), "승인 대기");
    assert.equal(await page.locator(".home-dashboard-hero p").count(), 0);
    assert.equal(await page.locator('[data-home-section-screen="home-requests"] > header').count(), 0);
    assert.equal(visibleLineCount(requestsSurfaceText, "승인 대기"), 1);
    assert.doesNotMatch(requestsSurfaceText, /승인 요청/);
    assert.doesNotMatch(requestsSurfaceText, /·/);
    const dedicatedCounts = await page.evaluate(() => ({
      dedicated: String(document.querySelectorAll('[data-home-section-screen="home-requests"] [data-home-action-type="approval"]').length),
      requestTabs: String(document.querySelectorAll('[data-home-section-screen="home-requests"] [data-home-tab-prefix="requests-direction"]').length),
      underlineTabs: String(document.querySelectorAll('[data-home-section-screen="home-requests"] .home-section-tabs.underline').length),
      sidebar: document.querySelector("[data-home-sidebar-approval-count]")?.getAttribute("data-home-sidebar-approval-count"),
      topbar: document.querySelector("[data-home-topbar-approval-count]")?.getAttribute("data-home-topbar-approval-count")
    }));
    assert.deepEqual(dedicatedCounts, { dedicated: "5", requestTabs: "2", underlineTabs: "1", sidebar: "5", topbar: "5" });

    await page.goto(`http://127.0.0.1:${port}/?view=messages&ctx=allow#messages-matter-channel`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-home-section-screen="home-messages"]');
    const messagesSurfaceText = await page.locator(".home-dashboard-surface").innerText();
    assert.equal(await page.locator(".home-dashboard-hero h1").textContent(), "메시지");
    assert.equal(await page.locator(".home-dashboard-hero p").count(), 0);
    assert.equal(await page.locator('[data-home-section-screen="home-messages"] > header, [data-home-section-screen="home-messages"] .home-status-list header').count(), 0);
    assert.equal(visibleLineCount(messagesSurfaceText, "메시지"), 1);
    assert.doesNotMatch(messagesSurfaceText, /·/);

    await page.goto(`http://127.0.0.1:${port}/?view=esign&ctx=allow#esign-status`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-home-section-screen="home-esign"]');
    const esignSurfaceText = await page.locator(".home-dashboard-surface").innerText();
    assert.equal(await page.locator(".home-dashboard-hero h1").textContent(), "전자 계약");
    assert.equal(await page.locator(".home-dashboard-hero p").count(), 0);
    assert.equal(await page.locator('[data-home-section-screen="home-esign"] > header, [data-home-section-screen="home-esign"] .home-status-list header').count(), 0);
    assert.equal(visibleLineCount(esignSurfaceText, "전자 계약"), 1);
    assert.doesNotMatch(esignSurfaceText, /·/);
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

test("R1 WP-8 opens profile as a standalone shell and normalizes Home fallback sections", async () => {
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

    await page.locator("[data-profile-trigger]").evaluate((node) => node.click());
    await page.waitForSelector('[data-user-profile-surface="my-profile"]');
    assert.equal(await page.locator(".app-frame").getAttribute("data-sidebar-state"), "none");
    assert.equal(await page.locator("[data-context-sidebar]").count(), 0);
    assert.ok(await page.locator("[data-profile-return-to-work]").isVisible());

    await page.locator("[data-profile-return-to-work]").click();
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

test("profile keeps the main-process signed-in identity when its profile API read fails", async () => {
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
    await page.addInitScript(() => {
      window.matterSession = {
        status: async () => ({
          state: "signed_in",
          user_id: "user_amic_jwsuh",
          display_name: "서지원",
          tenant_id: "tenant_amic_matter_vault"
        })
      };
    });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/profile/me") {
        return jsonResponse(route, { request_id: "profile-unavailable" }, 503);
      }
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, state));
    });
    await page.goto(`http://127.0.0.1:${port}/?view=matters&ctx=allow`, { waitUntil: "networkidle" });
    await page.locator("[data-profile-trigger]").click();
    const profile = page.locator('[data-user-profile-surface="my-profile"]');
    await profile.waitFor();
    await page.waitForFunction(() => document.querySelector('[data-user-profile-surface="my-profile"]')?.getAttribute("data-profile-api-state") === "error");

    assert.equal(await profile.getAttribute("data-profile-member"), "emp_amic_jwsuh");
    assert.equal(await profile.locator("h1").innerText(), "서지원");
    assert.doesNotMatch(await profile.innerText(), /김양태/);
  } finally {
    await browser.close();
    await server.close();
  }
});
