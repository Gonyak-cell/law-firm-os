import assert from "node:assert/strict";
import { createServer as createNetServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { installMatterUiSignedSession } from "./support/lawos-session-test-support.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

function installRouteWindow({ view, section, roleIds = [], matterId = "" }) {
  const storage = new Map();
  const params = new URLSearchParams({ view, ctx: "allow" });
  if (matterId) params.set("matter_id", matterId);
  const search = `?${params.toString()}`;
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

test("Home greeting uses the session profile and keeps the generic fallback", async () => {
  installRouteWindow({ view: "home", section: "home-dashboard" });
  const server = await createServer({
    root: webRoot,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true }
  });
  try {
    const { sessionGreeting } = await server.ssrLoadModule("/src/components/HomeSurface.jsx");
    assert.equal(sessionGreeting({ display_name: "서지원", title: "대표변호사" }, null), "Welcome, 서지원 변호사님");
    assert.equal(sessionGreeting(null, null), "Welcome, 사용자님");
  } finally {
    await server.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.__LAWOS_SESSION_CONTEXT__;
  }
});

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

async function newSignedHomePage(browser, options) {
  const page = await browser.newPage(options);
  await installMatterUiSignedSession(page);
  return page;
}

async function compactRecordLayoutFailures(page) {
  return page.locator('[data-compact-record="true"]').evaluateAll((rows) => rows.flatMap((row, index) => {
    const primary = row.querySelector("strong");
    const secondary = row.querySelector("small, time");
    const rowBox = row.getBoundingClientRect();
    if (!primary || !secondary || rowBox.width === 0 || rowBox.height === 0 || getComputedStyle(secondary).display === "none") return [];
    const primaryBox = primary.getBoundingClientRect();
    const secondaryBox = secondary.getBoundingClientRect();
    const centerDelta = Math.abs((primaryBox.top + primaryBox.height / 2) - (secondaryBox.top + secondaryBox.height / 2));
    const overflow = row.scrollWidth > row.clientWidth + 1;
    return centerDelta < 2 && !overflow ? [] : [{ index, centerDelta, overflow, text: row.textContent?.trim() ?? "" }];
  }));
}

async function panelHeaderLayoutFailures(page) {
  return page.locator(".panel-head").evaluateAll((headers) => headers.flatMap((header, index) => {
    const title = header.querySelector("h2");
    const meta = header.querySelector(":scope > span");
    if (!title || !meta || header.getBoundingClientRect().width === 0) return [];
    const titleBox = title.getBoundingClientRect();
    const metaBox = meta.getBoundingClientRect();
    const centerDelta = Math.abs((titleBox.top + titleBox.height / 2) - (metaBox.top + metaBox.height / 2));
    const overflow = header.scrollWidth > header.clientWidth + 1;
    return centerDelta < 2 && !overflow ? [] : [{ index, centerDelta, overflow, text: header.textContent?.trim() ?? "" }];
  }));
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

function wp5ActionItem({ id, type, title, dueOffset, dueHour = 9, riskTier = "normal", allowedActions = ["open"], requester = "R1", subtype = type === "task" ? "matter_task" : "leave" }) {
  return {
    id,
    resource_id: id,
    type,
    subtype,
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
  const recognitionBasis = searchParams.get("recognition_basis") === "collected" ? "collected" : "billed";
  if (pathname === "/api/profile/me") {
    return {
      request_id: "dashboard-profile",
      outcome: "passed",
      ui_state: "ready",
      item: {
        user_id: "user_amic_jwsuh",
        display_name: "서지원",
        title: "대표변호사"
      },
      safe_error_codes: [],
      audit_hint_ref: "dashboard-profile-audit",
      count_leak_prevented: true,
      production_ready_claim: false
    };
  }
  if (pathname === "/api/matters") {
    return list("dashboard-matters", [
      { matter_id: "matter-dashboard-opening", matter_code: "2026-101", title: "신규 자문", client_display_name: "고객 A", status: "opening", matter_type_english: "Advisory", owner_user_id: "jwsuh@amic.kr", created_at: wp5IsoDay(0) },
      { matter_id: "matter-dashboard-active", matter_code: "2026-099", title: "진행 자문", client_display_name: "고객 B", status: "active", matter_type_english: "LIT", owner_user_id: "jwsuh@amic.kr", updated_at: wp5IsoDay(0) },
      { matter_id: "matter-dashboard-closed", matter_code: "2026-088", title: "종결 자문", client_display_name: "고객 C", status: "closed", matter_type_english: "DEAL", closed_at: wp5IsoDay(0) }
    ]);
  }
  if (pathname === "/api/matters/recently-viewed") {
    return list("dashboard-recent", [{ matter_id: "matter-dashboard-active", matter_code: "진행 자문", title: "진행 자문", client_display_name: "고객 B", status: "active", viewed_at: wp5IsoDay(0) }]);
  }
  if (pathname === "/api/intake/requests") {
    return list("dashboard-intakes", [{ intake_request_id: "intake-dashboard-1", display_name: "고객 A", requested_scope_summary: "신규 자문 수임", status: "review_required", requested_at: wp5IsoDay(-1) }]);
  }
  if (pathname === "/api/crm/accounts") {
    return list("dashboard-accounts", [{ account_id: "account-dashboard-1", display_name: "account-dashboard-1", status: "active", owner_user_id: "jwsuh@amic.kr", created_at: wp5IsoDay(0) }]);
  }
  if (pathname === "/api/crm/leads") {
    return list("dashboard-leads", [{ lead_id: "lead-dashboard-1", display_name: "담당자 unsafe-dashboard@amic.kr", status: "active", owner_user_id: "jwsuh@amic.kr", created_at: wp5IsoDay(-1) }]);
  }
  if (pathname === "/api/crm/opportunities") {
    return list("dashboard-opportunities", [{ opportunity_id: "opp-dashboard-1", display_name: "550e8400-e29b-41d4-a716-446655440000", stage: "qualified", status: "active", owner_user_id: "jwsuh@amic.kr", updated_at: wp5IsoDay(0) }]);
  }
  if (pathname === "/api/crm/contacts") {
    return list("dashboard-contacts", [{ contact_id: "contact-dashboard-1", account_id: "account-dashboard-1", display_name: "고객 담당자 A", status: "active", updated_at: wp5IsoDay(0) }]);
  }
  if (pathname === "/api/crm/activities") {
    return list("dashboard-activities", [{ crm_activity_id: "meeting-dashboard-1", party_id: "party-dashboard-1", activity_type: "meeting", subject: "meeting-dashboard-1", status: "active", owner_user_id: "jwsuh@amic.kr", scheduled_at: wp5IsoDay(1) }]);
  }
  if (pathname === "/api/analytics/finance/overview") {
    return {
      request_id: "wp-fin-3-overview",
      outcome: "passed",
      item: {
        scope_label: "Matter 기반 집계",
        totals: [{ currency: "KRW", billed_amount: 900, collected_amount: 400, invoice_collected_amount: 250, direct_fee_amount: 150, collected_revenue_amount: 400, unallocated_receipt_amount: 75, advance_trust_amount: 50, other_non_revenue_amount: 25, revenue_amount: recognitionBasis === "collected" ? 400 : 900, recognition_basis: recognitionBasis, matter_cost: 250, processed_cost: 250, recoverable_cost: 250, ar_balance: 500, contribution_amount: recognitionBasis === "collected" ? 150 : 650, unlinked_amount: 50, transaction_count: 7, date_inferred_count: 1 }],
        currency_conversion_applied: false,
        ar_balance_is_point_in_time: true
      },
      source_statuses: [], safe_error_codes: [], audit_hint_ref: "wp-fin-3-overview-audit", count_leak_prevented: true, raw_source_payload_included: false, production_ready_claim: false
    };
  }
  if (pathname === "/api/analytics/finance/monthly") {
    return {
      request_id: "wp-fin-3-monthly", outcome: "passed",
      items: [{ month: wp5DateKey().slice(0, 7), currency: "KRW", billed_amount: 900, collected_amount: 400, invoice_collected_amount: 250, direct_fee_amount: 150, collected_revenue_amount: 400, unallocated_receipt_amount: 75, advance_trust_amount: 50, other_non_revenue_amount: 25, revenue_amount: recognitionBasis === "collected" ? 400 : 900, recognition_basis: recognitionBasis, matter_cost: 250, processed_cost: 250, recoverable_cost: 250, ar_balance: 500, contribution_amount: recognitionBasis === "collected" ? 150 : 650, unlinked_amount: 50, transaction_count: 7, date_inferred_count: 1 }],
      source_statuses: [], safe_error_codes: [], audit_hint_ref: "wp-fin-3-monthly-audit", count_leak_prevented: true, raw_source_payload_included: false, production_ready_claim: false
    };
  }
  if (pathname === "/api/analytics/finance/cashflow") {
    return {
      request_id: "wp-fin-cashflow",
      outcome: "passed",
      item: {
        summary: {
          currency: "KRW",
          current_balance: 29_153_222,
          total_inflow: 159_443_060,
          total_outflow: 227_166_172,
          net_movement: -67_723_112,
          transaction_count: 103,
          account_count: 1,
          classification_review_count: 0,
          zero_amount_source_count: 1,
          basis_at: wp5IsoDay(0)
        },
        business_summary: {
          currency: "KRW",
          sales_amount: 21_385_200,
          operating_expense_amount: 136_100_193,
          payroll_payment_amount: 91_065_979,
          non_operating_amount: 138_057_860,
          classified_count: 103,
          unclassified_count: 0,
          review_count: 0,
          coverage_percent: 100,
          status: "passed",
          invoice_required: false,
          matter_required: false,
          individual_payroll_values_included: false
        },
        payroll_categories: [
          { category: "partner", label: "파트너", gross_krw: 68_848_440, payment_count: 6, employee_count: 6 },
          { category: "staff", label: "직원", gross_krw: 12_646_327, payment_count: 3, employee_count: 3 },
          { category: "advisor", label: "고문", gross_krw: 9_571_212, payment_count: 1, employee_count: 1 }
        ],
        non_payroll_outflow_categories: [
          { category: "tax", label: "세금", amount: 54_037_570, transaction_count: 4 },
          { category: "card_settlement", label: "카드대금", amount: 44_424_303, transaction_count: 13 },
          { category: "social_insurance", label: "4대보험", amount: 11_404_440, transaction_count: 4 },
          { category: "professional_services", label: "용역·외주", amount: 11_295_000, transaction_count: 4 },
          { category: "rent_office", label: "임차·사무실", amount: 10_887_030, transaction_count: 1 },
          { category: "finance_lease", label: "금융·리스", amount: 2_674_430, transaction_count: 2 },
          { category: "general_operating", label: "기타 운영비", amount: 685_620, transaction_count: 20 },
          { category: "case_disbursement", label: "사건비용", amount: 645_410, transaction_count: 11 },
          { category: "bank_postage_fee", label: "수수료·우편", amount: 46_390, transaction_count: 11 }
        ],
        monthly: [{
          month: wp5DateKey().slice(0, 7),
          currency: "KRW",
          total_inflow: 159_443_060,
          total_outflow: 227_166_172,
          sales_amount: 21_385_200,
          operating_expense_amount: 136_100_193,
          payroll_payment_amount: 91_065_979,
          non_operating_amount: 138_057_860,
          classified_transaction_count: 103,
          unclassified_transaction_count: 0,
          net_movement: -67_723_112,
          transaction_count: 103
        }],
        reconciliation: {
          status: "passed",
          latest_batch_id: "bank_import_amic_20260728",
          latest_batch_transaction_count: 620,
          raw_source_payload_included: false
        }
      },
      source_statuses: [],
      filters: { currency: "KRW", time_zone: "Asia/Seoul" },
      safe_error_codes: [],
      audit_hint_ref: "wp-fin-cashflow-audit",
      count_leak_prevented: true,
      raw_source_payload_included: false,
      production_ready_claim: false
    };
  }
  if (pathname === "/api/finance/bank-classifications") {
    return {
      ...list("wp-fin-bank-classifications", [
        {
          bank_transaction_id: "bank-tx-out",
          date: wp5DateKey(),
          occurred_at: wp5IsoDay(0),
          direction: "outflow",
          amount: 280_000,
          currency: "KRW",
          counterparty: "운영비",
          memo: "당월 정산",
          category: "general_operating",
          category_label: "기타 운영비",
          primary_type: "operating_expense",
          classification_source: "automatic",
          confidence: "medium",
          status: "confirmed"
        },
        {
          bank_transaction_id: "bank-tx-in",
          date: wp5DateKey(-1),
          occurred_at: wp5IsoDay(-1),
          direction: "inflow",
          amount: 30_000_000,
          currency: "KRW",
          counterparty: "입금자 확인 전",
          memo: null,
          category: "other_inflow",
          category_label: "기타 입금",
          primary_type: "non_operating",
          classification_source: "automatic",
          confidence: "low",
          status: "confirmed"
        }
      ]),
      summary: { confirmed_count: 2, review_count: 0, transaction_count: 2 }
    };
  }
  if (pathname === "/api/finance/bank-classification-options") {
    return {
      ...list("wp-fin-bank-classification-options", []),
      item: {
        categories: [
          { category: "client_receipt", label: "고객 매출", primary_type: "sales" },
          { category: "other_inflow", label: "기타 입금", primary_type: "non_operating" },
          { category: "salary_payment", label: "급여 지급", primary_type: "payroll" },
          { category: "general_operating", label: "기타 운영비", primary_type: "operating_expense" }
        ],
        clients: [],
        employees: []
      }
    };
  }
  if (pathname === "/api/hrx/payroll/dashboard-summary") {
    return {
      outcome: "ok",
      summary: {
        month: searchParams.get("month"),
        currency: "KRW",
        run_status: "closed",
        gross_krw: 6_250_000,
        employee_count: 2,
        categories: [
          { category: "partner", label: "파트너", gross_krw: 3_000_000, employee_count: 1 },
          { category: "advisor", label: "고문", gross_krw: 0, employee_count: 0 },
          { category: "staff", label: "직원", gross_krw: 3_250_000, employee_count: 1 },
          { category: "unclassified", label: "미분류", gross_krw: 0, employee_count: 0 }
        ],
        individual_values_included: false,
        individual_identifiers_included: false,
        credential_material_included: false,
        production_ready_claim: false
      }
    };
  }
  if (pathname === "/api/analytics/finance/clients") {
    return {
      request_id: "wp-fin-3-clients", outcome: "passed",
      items: [
        { client_group_id: "api-fin-client", client_group_label: "api-fin-client", client_mapping_source: "master-data.ClientGroup", matter_count: 1, currency: "KRW", billed_amount: 900, collected_amount: 400, invoice_collected_amount: 250, direct_fee_amount: 150, collected_revenue_amount: 400, unallocated_receipt_amount: 75, advance_trust_amount: 50, other_non_revenue_amount: 25, revenue_amount: recognitionBasis === "collected" ? 400 : 900, recognition_basis: recognitionBasis, matter_cost: 200, recoverable_cost: 200, ar_balance: 500, contribution_amount: recognitionBasis === "collected" ? 200 : 700, unlinked_amount: 0, transaction_count: 6, date_inferred_count: 1 },
        { client_group_id: null, client_group_label: "미연결 고객", client_mapping_source: "unlinked", matter_count: 1, currency: "KRW", billed_amount: 0, collected_amount: 0, invoice_collected_amount: 0, direct_fee_amount: 0, collected_revenue_amount: 0, unallocated_receipt_amount: 0, advance_trust_amount: 0, other_non_revenue_amount: 0, revenue_amount: 0, recognition_basis: recognitionBasis, matter_cost: 50, recoverable_cost: 50, ar_balance: 0, contribution_amount: -50, unlinked_amount: 50, transaction_count: 1, date_inferred_count: 0 }
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
        wp5ActionItem({ id: "approval_newest", type: "approval", subtype: "expenses", title: "가장 늦은 승인", dueOffset: 4, dueHour: 12, allowedActions: ["approve", "reject", "open"] }),
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
    if (tab === "newsletter") {
      state.newsletterCalls = (state.newsletterCalls ?? 0) + 1;
      return {
        request_id: "r1-wp5-newsletter",
        outcome: "passed",
        entries: [
          { id: "newsletter-r1-wp5", tab: "newsletter", source: "Vault tag collection", title: "WP5 뉴스레터", body_preview: "WP5 뉴스레터 요약", published_at: wp5IsoDay(0, 7) }
        ],
        source_statuses: [],
        safe_error_codes: [],
        audit_hint_ref: "r1-wp5-newsletter-audit",
        count_leak_prevented: true,
        production_ready_claim: false
      };
    }
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

test("WP-FIN-1 resolves finance and Matter settlement routes into their canonical surfaces", async () => {
  const homeCases = [
    { view: "finance", section: "finance-matter-billing", target: "home-finance-billing" },
    { view: "finance", section: "finance-expenses", target: "home-finance-expenses" }
  ];
  for (const route of homeCases) {
    const html = await renderAppAtLegacyRoute(route);
    assert.match(html, new RegExp(`data-active-home-section="${route.target}"`));
    assert.match(html, new RegExp(`data-home-finance-route-contract="${route.target}"`));
    assert.match(html, /data-sidebar-group="home-finance"/);
  }
  for (const route of ["matter-time", "matter-expenses", "matter-billing", "matter-ar"]) {
    const html = await renderAppAtLegacyRoute({ view: "matters", section: route, matterId: "matter_wp_fin" });
    assert.match(html, /data-matter-small-firm-screen="matter-time-billing"/);
    assert.match(html, /data-context-sidebar="matters"/);
    assert.match(html, /class="sidebar-item active" aria-current="location"[\s\S]*?<span class="sidebar-label">시간·청구<\/span>/);
    assert.doesNotMatch(html, /data-home-finance-route-contract=/);
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
    const page = await newSignedHomePage(browser, { viewport: { width: 1366, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, state));
    });
    await page.goto(`http://127.0.0.1:${port}/?view=matters&ctx=allow&matter_id=matter_wp_fin#matter-time`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-matter-small-firm-screen="matter-time-billing"]');
    await page.waitForFunction(() => {
      const url = new URL(window.location.href);
      return url.searchParams.get("view") === "matters" && url.searchParams.get("matter_id") === "matter_wp_fin" && url.searchParams.get("filter") === "time" && url.hash === "#matter-time-billing";
    });

    const matterSidebar = page.locator('[data-context-sidebar="matters"]');
    assert.equal(await matterSidebar.locator(".sidebar-group-toggle").count(), 0);
    assert.equal(await matterSidebar.getByRole("button", { name: "시간·청구", exact: true }).getAttribute("aria-current"), "location");
    assert.equal(await matterSidebar.locator(".sidebar-child").count(), 0);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("grouped sidebars render children in collapsible sidebar accordions", async () => {
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
    const page = await newSignedHomePage(browser, { viewport: { width: 1366, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, state));
    });

    for (const view of ["home", "clients", "people"]) {
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
        if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
        assert.equal(await toggle.getAttribute("aria-expanded"), "true", `${view} group ${index} must open`);
        const panelId = await toggle.getAttribute("aria-controls");
        assert.ok(panelId, `${view} group ${index} must identify its controlled panel`);
        const group = toggle.locator("xpath=..");
        assert.equal(await group.locator(`#${panelId}[role="group"]`).count(), 1, `${view} group ${index} must expose an associated submenu group`);
        assert.ok(await group.locator(".sidebar-child").count() > 0, `${view} group ${index} must render nested sidebar items`);
        await group.locator(".sidebar-child").first().click();
        await page.waitForFunction((section) => window.location.hash === `#${section}`, expectedSection);
        assert.equal(await toggle.evaluate((element) => element.classList.contains("active")), true, `${view} group ${index} must highlight its active child route`);
        assert.equal(await toggles.evaluateAll((elements, activeIndex) => elements.filter((element, itemIndex) => itemIndex !== activeIndex && element.classList.contains("active")).length, index), 0, `${view} must not highlight a sibling without the active route`);
        assert.equal(await group.locator('.sidebar-child[aria-current="location"]').count(), 1, `${view} group ${index} must mark its current child`);
        await toggle.click();
        assert.equal(await toggle.getAttribute("aria-expanded"), "false", `${view} group ${index} must close on its second click`);
        assert.equal(await toggle.evaluate((element) => element.classList.contains("active")), true, `${view} group ${index} must retain route highlight when collapsed`);
        assert.equal(await group.locator(".sidebar-child").count(), 0, `${view} group ${index} must hide children when closed`);
      }
      assert.equal(await page.locator(".context-subnav").count(), 0, `${view} must not render duplicate top contextual navigation`);
    }

    await page.goto(`http://127.0.0.1:${port}/?view=matters&ctx=allow#matter-today`, { waitUntil: "networkidle" });
    const matterSidebar = page.locator('[data-context-sidebar="matters"]');
    assert.deepEqual(
      await matterSidebar.locator(".sidebar-nav > .sidebar-item .sidebar-label").allTextContents(),
      ["오늘", "사건", "업무", "일정", "연락·후속", "시간·청구"]
    );
    assert.equal(await matterSidebar.locator(".sidebar-nav > .sidebar-item").count(), 6);
    assert.equal(await matterSidebar.locator(".sidebar-group-toggle").count(), 0, "Matter must stay flat instead of adding accordion groups");
    assert.equal(await matterSidebar.locator(".sidebar-child").count(), 0, "Matter flat routes must not render nested children");
    assert.equal(await page.locator(".context-subnav").count(), 0, "Matter must not render duplicate top contextual navigation");

    await page.goto(`http://127.0.0.1:${port}/?view=people&ctx=allow#people-members`, { waitUntil: "networkidle" });
    const peopleSidebar = page.locator('[data-context-sidebar="people"] .sidebar-nav');
    const peopleManagementToggle = peopleSidebar.locator('[data-sidebar-group="people-members"] .sidebar-group-toggle');
    if (await peopleManagementToggle.getAttribute("aria-expanded") !== "true") await peopleManagementToggle.click();
    assert.equal(await peopleSidebar.getByText("직무/역할", { exact: true }).count(), 0);
    assert.equal(await peopleSidebar.getByText("근로정보", { exact: true }).count(), 0);
    assert.equal(await peopleSidebar.getByText("근무일정", { exact: true }).count(), 0);
    for (const hiddenScheduleItem of ["근무표", "근무유형", "현재 근무 상황 조회", "근무일정 확정"]) {
      assert.equal(await peopleSidebar.getByText(hiddenScheduleItem, { exact: true }).count(), 0);
    }
    assert.equal(await peopleSidebar.getByText("구성원 등록", { exact: true }).count(), 1);
    assert.equal(await peopleSidebar.getByText("입퇴사 관리", { exact: true }).count(), 1);
    const attendanceItem = peopleSidebar.getByRole("button", { name: "출퇴근기록", exact: true });
    assert.equal(await attendanceItem.count(), 1);
    assert.equal(await attendanceItem.evaluate((element) => element.classList.contains("sidebar-group-toggle")), false);
    assert.equal(await peopleSidebar.locator('[data-sidebar-group="people-attendance-records"]').count(), 0);
    assert.equal(await peopleSidebar.getByText("출근/퇴근 기록", { exact: true }).count(), 0);
    await attendanceItem.click();
    await page.waitForFunction(() => window.location.hash === "#people-attendance-records");
    assert.equal(await attendanceItem.getAttribute("aria-current"), "location");
    for (const hiddenAttendanceItem of [
      "무일정 근무 출퇴근",
      "출퇴근기록 엑셀 업로드",
      "휴게시간 기록",
      "출퇴근 누락 알림",
      "출퇴근기록 확정",
      "출퇴근 인증 방식"
    ]) {
      assert.equal(await peopleSidebar.getByText(hiddenAttendanceItem, { exact: true }).count(), 0);
    }

    await page.goto(`http://127.0.0.1:${port}/?view=vault&ctx=allow#vault-search-home`, { waitUntil: "networkidle" });
    const searchSidebar = page.locator('[data-context-sidebar="vault"] .sidebar-nav');
    const searchGroupToggle = searchSidebar.locator('[data-sidebar-group="vault-search-home"] .sidebar-group-toggle');
    if (await searchGroupToggle.getAttribute("aria-expanded") !== "true") await searchGroupToggle.click();
    assert.equal(await searchSidebar.getByText("문서/OCR", { exact: true }).count(), 0);
    assert.equal(await searchSidebar.getByText("대시보드", { exact: true }).count(), 1);
    assert.equal(await searchSidebar.getByText("전체 검색", { exact: true }).count(), 1);

    for (const view of ["settings", "data-import"]) {
      await page.goto(`http://127.0.0.1:${port}/?view=${view}&ctx=allow`, { waitUntil: "networkidle" });
      const sidebar = page.locator('[data-mode-exception-sidebar="true"]');
      const toggle = sidebar.locator(".sidebar-group-toggle");
      assert.equal(await toggle.count(), 1, `${view} must render its sections as one sidebar accordion`);
      if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
      assert.equal(await toggle.getAttribute("aria-expanded"), "true", `${view} accordion must expose its sections when opened`);
      assert.equal(await page.locator(".global-utility-tabs").count(), 0, `${view} must not duplicate sections in a horizontal content menu`);
      await toggle.click();
      assert.equal(await toggle.getAttribute("aria-expanded"), "false", `${view} accordion must collapse on repeat click`);
    }

    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-dashboard`, { waitUntil: "networkidle" });
    assert.deepEqual(
      await page.locator('[data-context-sidebar="home"] .sidebar-nav > .sidebar-item > span:nth-child(2), [data-context-sidebar="home"] .sidebar-nav > .sidebar-group > .sidebar-group-toggle > span:nth-child(2)').allTextContents(),
      ["대시보드", "할 일", "승인 대기", "회의실 예약", "피드", "캘린더", "전자계약", "매출/비용"]
    );
    assert.equal(await page.locator('[data-sidebar-group="home-approvals"]').count(), 0);
    const homeApprovalLink = page.locator('[data-context-sidebar="home"] .sidebar-item').filter({ hasText: "승인 대기" });
    assert.equal(await homeApprovalLink.count(), 1);
    await homeApprovalLink.click();
    await page.waitForSelector('[data-home-section-screen="home-requests"]');
    assert.equal(new URL(page.url()).hash, "#home-requests");
    await page.getByRole("button", { name: "회의실 예약", exact: true }).click();
    await page.waitForSelector('[data-home-section-screen="home-meeting-rooms"]');
    assert.equal(new URL(page.url()).hash, "#home-meeting-rooms");
    assert.equal(await homeApprovalLink.getAttribute("aria-current"), null);
    assert.equal(await page.getByRole("button", { name: "회의실 예약", exact: true }).getAttribute("aria-current"), "location");
    await page.goto(`http://127.0.0.1:${port}/?view=clients&ctx=allow#clients-home`, { waitUntil: "networkidle" });
    const clientPrimaryToggle = page.locator('[data-sidebar-group="clients-home"] .sidebar-group-toggle');
    assert.deepEqual(await page.locator('[data-sidebar-group="clients-home"] .sidebar-child').allTextContents(), ["대시보드", "고객 목록", "신규 고객", "잠재 고객", "매출 내역"]);
    const clientPreEngagementToggle = page.locator('[data-sidebar-group="client-opportunities"] .sidebar-group-toggle');
    await clientPreEngagementToggle.click();
    assert.deepEqual(await page.locator('[data-sidebar-group="client-opportunities"] .sidebar-child').allTextContents(), ["Pipeline", "상담/수임 제안", "접촉 이력"]);
    if (await clientPrimaryToggle.getAttribute("aria-expanded") !== "true") await clientPrimaryToggle.click();
    await clientPrimaryToggle.click();
    await page.locator('[data-product-axis="home"]').click();
    await page.locator('[data-product-axis="clients"]').click();
    assert.equal(await clientPrimaryToggle.getAttribute("aria-expanded"), "false", "explicit collapse must survive leaving and returning to the same product view");

    await page.setViewportSize({ width: 900, height: 800 });
    await page.locator("[data-context-sidebar-trigger]").click();
    await page.waitForFunction(() => document.querySelector("[data-context-sidebar-trigger]")?.getAttribute("aria-expanded") === "true");
    if (await clientPrimaryToggle.getAttribute("aria-expanded") !== "true") await clientPrimaryToggle.click();
    assert.equal(await page.locator('[data-sidebar-group="clients-home"] .sidebar-subnav').evaluate((node) => getComputedStyle(node).display), "grid", "tablet sidebar children must stay vertical");

    await page.setViewportSize({ width: 720, height: 800 });
    await page.reload({ waitUntil: "networkidle" });
    const mobileLayout = await page.evaluate(() => {
      const rail = document.querySelector(".global-rail").getBoundingClientRect();
      const sidebar = document.querySelector(".sidebar").getBoundingClientRect();
      const canvas = document.querySelector(".page-canvas").getBoundingClientRect();
      return {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        railLeft: rail.left,
        railWidth: rail.width,
        railHeight: rail.height,
        sidebarVisibility: getComputedStyle(document.querySelector(".sidebar")).visibility,
        canvasLeft: canvas.left,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
      };
    });
    assert.ok(Math.abs(mobileLayout.railLeft) < 1, "Forest mobile rail must start at the viewport edge");
    assert.ok(Math.abs(mobileLayout.railWidth - 56) < 1, "Forest mobile rail must remain 56px wide");
    assert.ok(mobileLayout.railHeight >= mobileLayout.innerHeight, "Forest mobile rail must fill the viewport");
    assert.equal(mobileLayout.sidebarVisibility, "hidden", "Forest mobile sidebar must start closed");
    assert.ok(Math.abs(mobileLayout.canvasLeft - 56) < 1, "Forest mobile canvas must start after the rail");
    assert.equal(mobileLayout.horizontalOverflow, false, "Forest mobile layout must not overflow horizontally");
    await page.locator("[data-context-sidebar-trigger]").click();
    await page.waitForFunction(() => Math.abs(document.querySelector(".sidebar")?.getBoundingClientRect().left - 56) < 1);
    assert.equal(await page.locator(".context-sidebar-scrim").isVisible(), true);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.querySelector("[data-context-sidebar-trigger]")?.getAttribute("aria-expanded") === "false");
    assert.equal(
      await page.locator("[data-context-sidebar-trigger]").evaluate((node) => document.activeElement === node),
      true,
      "closing the contextual drawer must return focus to its rail trigger"
    );
  } finally {
    await browser.close();
    await server.close();
  }
});

test("attendance workspace records only clock-in and clock-out times", async () => {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const attendance = [];
  let submitted = null;
  const consoleErrors = [];
  try {
    const page = await newSignedHomePage(browser, { viewport: { width: 1366, height: 900 } });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    await page.route("**/api/**", (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname === "/api/hrx/employees") {
        return jsonResponse(route, {
          outcome: "ok",
          employees: [{ employee_id: "emp-attendance-001", display_name: "출퇴근 검수", status: "active", work_email: "" }]
        });
      }
      if (url.pathname === "/api/hrx/attendance" && request.method() === "POST") {
        submitted = request.postDataJSON();
        attendance.push(submitted);
        return jsonResponse(route, { outcome: "created", attendance: submitted }, 201);
      }
      if (url.pathname === "/api/hrx/attendance") {
        return jsonResponse(route, { outcome: "ok", attendance, monthly_summary: null });
      }
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, { decisionCalls: 0, newsCalls: 0 }));
    });

    await page.goto(`http://127.0.0.1:${port}/?view=people&ctx=allow#people-attendance-records`, { waitUntil: "networkidle" });
    const form = page.locator('[data-simple-attendance="true"]');
    await form.waitFor();
    assert.equal(await form.locator('input[type="time"]').count(), 2);
    assert.equal(await form.locator('input:not([type="time"]), select').count(), 0);
    assert.equal(await page.locator('[data-upl-d04-summary="true"], [data-upl-d06-schedule-calendar="true"], [data-upl-d06-risk-panel="true"]').count(), 0);

    const clockIn = form.getByLabel("출근시간", { exact: true });
    const clockOut = form.getByLabel("퇴근시간", { exact: true });
    const submit = form.getByRole("button", { name: "기록 저장", exact: true });
    assert.equal(await submit.isDisabled(), true);
    await clockIn.fill("18:00");
    await clockOut.fill("09:00");
    await page.getByRole("alert").filter({ hasText: "퇴근시간은 출근시간보다 늦어야 합니다." }).waitFor();
    assert.equal(await submit.isDisabled(), true);

    await clockIn.fill("09:05");
    await clockOut.fill("18:10");
    assert.equal(await submit.isEnabled(), true);
    await submit.click();
    await page.getByRole("status").filter({ hasText: "출근시간과 퇴근시간을 저장했습니다." }).waitFor();
    await page.locator('[data-attendance-history="true"]').waitFor();

    assert.equal(submitted.employee_id, "emp-attendance-001");
    assert.match(submitted.work_date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(submitted.status, "present");
    assert.equal(submitted.source_kind, "manual");
    assert.match(submitted.clock_in_at, /T09:05:00\+09:00$/);
    assert.match(submitted.clock_out_at, /T18:10:00\+09:00$/);
    assert.equal(Object.hasOwn(submitted, "recorded_hours"), false);
    assert.deepEqual(await page.locator('[data-attendance-history="true"] th').allTextContents(), ["근무일", "출근시간", "퇴근시간"]);
    assert.deepEqual(consoleErrors, []);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("mixed Korean and English record text uses regular Pretendard and SUITE", async () => {
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
    const page = await newSignedHomePage(browser, { viewport: { width: 1366, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, state));
    });

    await page.goto(`http://127.0.0.1:${port}/?view=matters&ctx=allow#matter-list`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-matter-small-firm-screen="matter-list"] .matter-ops-table tbody tr strong');
    const matterTypography = await page.evaluate(async () => {
      await document.fonts.ready;
      const header = getComputedStyle(document.querySelector('[data-matter-small-firm-screen="matter-list"] .matter-ops-header h2'));
      const record = getComputedStyle(document.querySelector('[data-matter-small-firm-screen="matter-list"] .matter-ops-table tbody tr strong'));
      return {
        headerFamily: header.fontFamily,
        headerWeight: header.fontWeight,
        recordFamily: record.fontFamily,
        recordWeight: record.fontWeight,
        pretendardLoaded: document.fonts.check('12px "Pretendard Matter"'),
        suiteLoaded: document.fonts.check('12px "SUITE Matter"')
      };
    });
    assert.match(matterTypography.headerFamily, /SUITE Matter/);
    assert.equal(matterTypography.headerWeight, "700");
    assert.match(matterTypography.recordFamily, /Pretendard Matter/);
    assert.doesNotMatch(matterTypography.recordFamily, /IBM Plex|Mono|SFMono|Menlo/);
    assert.equal(matterTypography.recordWeight, "400");
    assert.equal(matterTypography.pretendardLoaded, true);
    assert.equal(matterTypography.suiteLoaded, true);

    await page.goto(`http://127.0.0.1:${port}/?view=clients&ctx=allow#clients-list`, { waitUntil: "networkidle" });
    await page.waitForSelector(".client-selectable-record-button strong");
    const clientTypography = await page.evaluate(() => {
      const header = getComputedStyle(document.querySelector(".client-selectable-header"));
      const record = getComputedStyle(document.querySelector(".client-selectable-record-button strong"));
      return {
        headerFamily: header.fontFamily,
        headerWeight: header.fontWeight,
        recordFamily: record.fontFamily,
        recordWeight: record.fontWeight
      };
    });
    assert.match(clientTypography.headerFamily, /SUITE Matter/);
    assert.equal(clientTypography.headerWeight, "600");
    assert.match(clientTypography.recordFamily, /Pretendard Matter/);
    assert.doesNotMatch(clientTypography.recordFamily, /IBM Plex|Mono|SFMono|Menlo/);
    assert.equal(clientTypography.recordWeight, "400");
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
    const page = await newSignedHomePage(browser, { viewport: { width: 1280, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, state));
    });
    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-finance-overview`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-home-finance-summary="true"]');
    const overview = page.locator('[data-home-finance-surface="true"]');
    assert.match(await overview.innerText(), /900원/);
    assert.match(await overview.innerText(), /청구 수납\s+250원/);
    assert.match(await overview.innerText(), /직접 보수\s+150원/);
    assert.match(await overview.innerText(), /미연결 고객/);
    assert.doesNotMatch(await overview.innerText(), /client-group-visible|tenant_cmp|party-/);

    await overview.getByLabel("통화").selectOption("KRW");
    await page.waitForFunction(() => new URL(window.location.href).searchParams.get("currency") === "KRW");
    const financeSubnav = page.locator('[data-sidebar-group="home-finance"]');
    await financeSubnav.getByRole("button", { name: "월별 매출/비용", exact: true }).click();
    await page.waitForSelector('[data-home-finance-monthly-table="true"]');
    const tableTypography = await page.locator('[data-home-finance-monthly-table="true"]').evaluate((table) => {
      const header = getComputedStyle(table.querySelector("thead th"));
      const cell = getComputedStyle(table.querySelector("tbody td"));
      return { headerWeight: header.fontWeight, cellWeight: cell.fontWeight };
    });
    assert.deepEqual(tableTypography, { headerWeight: "600", cellWeight: "400" });
    assert.equal(new URL(page.url()).searchParams.get("currency"), "KRW");
    await financeSubnav.getByRole("button", { name: "고객별 매출/비용", exact: true }).click();
    await page.waitForSelector('[data-home-finance-client-table="true"]');
    assert.equal(await page.locator('[data-home-finance-unlinked-client="true"]').count(), 1);

    await financeSubnav.getByRole("button", { name: "자금현황", exact: true }).click();
    await page.waitForSelector('[data-home-cashflow-summary="true"]');
    const cashflow = page.locator('[data-home-finance-section="home-finance-cashflow"]');
    assert.match(await cashflow.innerText(), /29,153,222원/);
    assert.match(await cashflow.innerText(), /159,443,060원/);
    assert.match(await cashflow.innerText(), /입금 배정 전에는 매출로 확정하지 않습니다/);
    assert.equal(await cashflow.locator('[data-home-cashflow-monthly-table="true"]').count(), 1);
    assert.equal(await cashflow.locator('[data-home-cashflow-transaction-table="true"] tbody tr').count(), 2);
    assert.match(await cashflow.locator('[data-home-cashflow-transaction-table="true"]').innerText(), /입금자 확인 전/);
    await cashflow.getByLabel("거래 유형").selectOption("outflow");
    await page.waitForFunction(() => new URL(window.location.href).searchParams.get("direction") === "outflow");

    await page.setViewportSize({ width: 390, height: 844 });
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
    const page = await newSignedHomePage(browser, { viewport: { width: 1366, height: 1000 } });
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
      if (url.pathname === "/api/finance/prebills") return jsonResponse(route, actionBody({ item: { prebill_id: "prebill-live-1", status: "partner_review_required" } }), 201);
      if (url.pathname === "/api/finance/prebills/approve") return jsonResponse(route, actionBody({ item: { prebill_id: request.postDataJSON().prebill_id, status: "partner_approved" } }));
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

    const financeSubnav = page.locator('[data-sidebar-group="home-finance"]');
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
    await page.waitForFunction(() => !document.querySelector('[data-matter-prebill-create-action="true"]')?.disabled);
    await page.locator('[data-matter-prebill-create-action="true"]').click();
    await page.locator('[data-matter-prebill-status="partner_review_required"]').waitFor();
    await page.waitForFunction(() => !document.querySelector('[data-matter-prebill-approve-no-adjust-action="true"]')?.disabled);
    await page.locator('[data-matter-prebill-approve-no-adjust-action="true"]').click();
    await page.locator('[data-matter-prebill-status="partner_approved"]').waitFor();
    await page.waitForFunction(() => !document.querySelector('[data-matter-invoice-issue-action="true"] button')?.disabled);
    await page.getByRole("button", { name: "발행", exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('[data-matter-payment-import-action="true"]')?.disabled);
    await page.locator('[data-matter-payment-form="true"]').getByLabel("입금 성격").selectOption("invoice_payment");
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
    assert.deepEqual(calls.filter((call) => call.startsWith("POST /api/finance/")), [
      "POST /api/finance/time-entries",
      "POST /api/finance/expenses",
      "POST /api/finance/disbursements",
      "POST /api/finance/wip",
      "POST /api/finance/wip-snapshots",
      "POST /api/finance/prebills",
      "POST /api/finance/prebills/approve",
      "POST /api/finance/invoices",
      "POST /api/finance/payments",
      "POST /api/finance/payment-matches"
    ]);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("WP-FIN-4A records and allocates a direct fee without an invoice", async () => {
  const port = await availablePort();
  const server = await createServer({ root: webRoot, logLevel: "silent", server: { host: "127.0.0.1", port, strictPort: true } });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const writes = [];
  const listBody = (items = []) => ({
    request_id: "wp-fin-4a-list",
    outcome: "passed",
    items,
    page_info: { next_cursor: null, returned_count: items.length },
    safe_error_codes: [],
    audit_hint_ref: "wp-fin-4a-audit",
    ui_state: items.length === 0 ? "empty" : "ready",
    count_leak_prevented: true,
    production_ready_claim: false,
  });
  const actionBody = (extra = {}) => ({
    request_id: "wp-fin-4a-action",
    outcome: "created",
    safe_error_codes: [],
    audit_hint_ref: "wp-fin-4a-action-audit",
    production_ready_claim: false,
    ...extra,
  });
  try {
    const page = await newSignedHomePage(browser, { viewport: { width: 1366, height: 1000 } });
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname === "/api/matters") {
        return jsonResponse(route, listBody([{
          matter_id: "matter-direct-ui",
          matter_code: "2026-DIRECT",
          title: "직접 수납",
          client_group_id: "client-direct-ui",
          billing_client_party_id: "party-direct-ui",
          status: "active",
        }]));
      }
      if (["/api/finance/time-entries", "/api/finance/invoices", "/api/finance/ar-aging", "/api/finance/audit"].includes(url.pathname) && request.method() === "GET") {
        return jsonResponse(route, listBody([]));
      }
      if (url.pathname === "/api/finance/payments" && request.method() === "POST") {
        const payload = request.postDataJSON();
        writes.push({ path: url.pathname, payload });
        return jsonResponse(route, actionBody({
          item: {
            ...payload.payment,
            payment_id: "payment-direct-ui",
            allocated_amount: 0,
            unallocated_amount: payload.payment.amount,
            applied_amount: 0,
            unapplied_amount: payload.payment.amount,
          },
        }), 201);
      }
      if (url.pathname === "/api/finance/payment-allocations" && request.method() === "POST") {
        const payload = request.postDataJSON();
        const allocation = { ...payload.allocation, payment_allocation_id: "allocation-direct-ui", status: "active" };
        writes.push({ path: url.pathname, payload });
        return jsonResponse(route, actionBody({
          item: allocation,
          payment_allocation: allocation,
          payment: {
            payment_id: "payment-direct-ui",
            matter_id: "matter-direct-ui",
            client_group_id: "client-direct-ui",
            amount: payload.allocation.amount,
            currency: payload.allocation.currency,
            allocated_amount: payload.allocation.amount,
            unallocated_amount: 0,
            applied_amount: payload.allocation.amount,
            unapplied_amount: 0,
          },
        }), 201);
      }
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, { decisionCalls: 0, newsCalls: 0 }));
    });

    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow&matter_id=matter-direct-ui#home-finance-billing`, { waitUntil: "networkidle" });
    const form = page.locator('[data-matter-payment-form="true"]');
    await form.waitFor();
    assert.equal(await page.locator('[data-matter-payment-import-action="true"]').isEnabled(), true);
    assert.equal(await form.getByLabel("입금 성격").inputValue(), "direct_fee");
    assert.match(await page.locator('[data-matter-payment-revenue-effect="revenue"]').innerText(), /청구서 없이 받은 사건 보수.*수납 기준 매출/);

    await form.getByLabel("금액").fill("125000");
    await page.locator('[data-matter-payment-import-action="true"]').click();
    await page.waitForFunction(() => !document.querySelector('[data-matter-payment-allocation-action="true"]')?.disabled);
    await page.locator('[data-matter-payment-allocation-action="true"]').click();
    await page.waitForSelector('text=입금이 배정되었습니다.');

    const paymentWrite = writes.find((write) => write.path === "/api/finance/payments");
    const allocationWrite = writes.find((write) => write.path === "/api/finance/payment-allocations");
    assert.equal(paymentWrite.payload.payment.matter_id, "matter-direct-ui");
    assert.equal(paymentWrite.payload.payment.client_group_id, "client-direct-ui");
    assert.equal(paymentWrite.payload.payment.amount, 125000);
    assert.equal(allocationWrite.payload.allocation.allocation_type, "direct_fee");
    assert.equal(allocationWrite.payload.allocation.invoice_id, null);
    assert.equal(allocationWrite.payload.allocation.matter_id, "matter-direct-ui");
    assert.equal(allocationWrite.payload.allocation.client_group_id, "client-direct-ui");
    assert.equal(allocationWrite.payload.allocation.amount, 125000);
    assert.match(await page.locator('[data-matter-payment-match-action="true"]').innerText(), /청구서 없는 사건 보수/);
    await page.setViewportSize({ width: 700, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
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
    const page = await newSignedHomePage(browser, { viewport: { width: 1280, height: 900 } });
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
    assert.equal(await group.locator(".sidebar-group-toggle").getAttribute("aria-expanded"), "true");
    const subnav = group;
    assert.equal(await subnav.getByRole("button", { name: "비용 처리", exact: true }).count(), 1);
    assert.equal(await subnav.getByRole("button", { name: "전체 현황", exact: true }).count(), 0);
    assert.equal(await subnav.getByRole("button", { name: "자금현황", exact: true }).count(), 0);
    assert.equal(await subnav.getByRole("button", { name: "청구/수납", exact: true }).count(), 0);
    assert.equal(await page.locator('[data-matter-accounting-export-action="true"]').count(), 0);

    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-dashboard`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-home-dashboard-grid="true"]');
    assert.equal(await page.locator('[data-home-cashflow-band="true"]').count(), 0);
    assert.doesNotMatch(await page.locator('[data-home-dashboard-grid="true"]').innerText(), /자금현황.*권한|권한.*자금현황/);
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
  assert.doesNotMatch(admin, /data-home-sidebar-company-link="true"/);
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
    const page = await newSignedHomePage(browser, { viewport: { width: 1366, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      return jsonResponse(route, wp3ApiBody(url.pathname));
    });
    await page.goto(`http://127.0.0.1:${port}/?view=messages&ctx=allow#messages-matter-channel`, { waitUntil: "networkidle" });

    await page.waitForSelector('[data-home-rail-message-count="2"]');
    assert.equal(await page.locator("[data-home-sidebar-message-count]").count(), 0);
    assert.equal(await page.locator("[data-home-rail-message-count]").getAttribute("data-home-rail-message-count"), "2");
    assert.equal(await page.locator('[data-home-message-thread="msg-r1-wp3-001"]').count(), 1);

    await page.locator('[data-home-message-thread="msg-r1-wp3-001"]').click();
    await page.waitForSelector('[data-home-message-thread-panel="msg-r1-wp3-001"]');
    await page.waitForFunction(() => document.querySelector("[data-home-rail-message-count]")?.getAttribute("data-home-rail-message-count") === "1");

    assert.equal(await page.locator("[data-home-rail-message-count]").getAttribute("data-home-rail-message-count"), "1");
    assert.equal(await page.locator('[data-home-message-thread="msg-r1-wp3-001"]').getAttribute("data-home-message-unread"), "false");

    await page.locator("[data-home-message-trigger]").click();
    await page.waitForSelector('[data-home-message-drawer-item="people_notice:wp3"]');
    assert.equal(await page.locator('[data-home-message-drawer-item="msg-r1-wp3-001"]').count(), 0);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("R1 WP-5 renders the new Home summary while preserving dedicated action queues and delayed undo", async () => {
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
    const page = await newSignedHomePage(browser, { viewport: { width: 1366, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, state));
    });
    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-dashboard`, { waitUntil: "networkidle" });

    assert.equal(await page.locator(".home-dashboard-hero").count(), 1);
    await page.waitForFunction(() => document.querySelector(".home-dashboard-hero h1")?.textContent === "Welcome, 서지원 변호사님");
    assert.equal(await page.locator(".home-dashboard-hero p").count(), 1);
    assert.equal(await page.locator('[data-dashboard-section="people-summary"]').count(), 1);
    assert.deepEqual(await page.locator('[data-dashboard-section="people-summary"] .dashboard-record-copy strong').allTextContents(), ["가장 오래된 승인", "오늘 승인", "중간 승인"]);

    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-todo`, { waitUntil: "networkidle" });
    const todoIds = await page.locator('[data-home-section-screen="home-todo"] [data-home-action-id]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-home-action-id")));
    assert.deepEqual(todoIds, ["task_late_three", "task_late_one", "task_today", "task_upcoming_one", "task_upcoming_two", "task_upcoming_three"]);
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
    assert.equal(await page.locator(".home-dashboard-hero").count(), 1);

    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-calendar`, { waitUntil: "networkidle" });
    await page.waitForSelector('.home-dashboard-hero h1');
    const todayKey = wp5DateKey(0);
    await page.waitForSelector(`[data-home-calendar-day="${todayKey}"][data-home-calendar-day-kind="deadline"]`);
    assert.ok(await page.locator(".home-calendar-grid button.sunday").count() > 0);
    assert.equal(await page.locator("[data-home-calendar-prev]").count(), 0);
    assert.equal(await page.locator("[data-home-calendar-next]").count(), 0);
    assert.equal(await page.locator("[data-home-calendar-open]").count(), 1);
    assert.equal(await page.locator("[data-home-upcoming-deadline]").count(), 1);

    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-feed`, { waitUntil: "networkidle" });
    await page.waitForSelector('#home-feed-tab-notice');
    assert.equal(await page.locator("#home-feed-tab-notice").textContent(), "공지사항");
    assert.equal(await page.locator("#home-feed-tab-news").count(), 0);
    assert.equal(await page.locator("#home-feed-tab-newsletter").textContent(), "뉴스레터");
    assert.equal(await page.locator(".home-dashboard-feed .home-dashboard-card-header").count(), 0);
    await page.locator('[data-home-feed-entry="notice-r1-wp5"]').click();
    await page.waitForSelector('[data-home-feed-read-panel="notice-r1-wp5"]');

    await page.locator("#home-feed-tab-newsletter").click();
    await page.waitForSelector('[data-home-feed-entry="newsletter-r1-wp5"]');
    assert.ok(state.newsletterCalls >= 1);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("Matter work management keeps six flat routes and integrates board and calendar views", async () => {
  const port = await availablePort();
  const server = await createServer({ root: webRoot, logLevel: "silent", server: { host: "127.0.0.1", port, strictPort: true } });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const state = { decisionCalls: 0, newsCalls: 0 };
  try {
    const page = await newSignedHomePage(browser, { viewport: { width: 1366, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/matter/ops/tasks") {
        return jsonResponse(route, {
          request_id: "r1-matter-work",
          outcome: "passed",
          items: [{ task_id: "matter-work-task", matter_id: "matter-dashboard-active", title: "법원 서면 검토", status: "todo", owner_user_id: "jwsuh@amic.kr", due_at: wp5IsoDay(0) }],
          safe_error_codes: [],
          production_ready_claim: false
        });
      }
      if (url.pathname === "/api/matter/ops/calendar") {
        return jsonResponse(route, {
          request_id: "r1-matter-calendar",
          outcome: "passed",
          items: [
            { event_id: "matter-calendar-court", matter_id: "matter-dashboard-active", title: "법원 일정", starts_at: wp5IsoDay(0, 10), source_label: "법원" },
            { event_id: "matter-calendar-tax", matter_id: "matter-dashboard-active", title: "세무서 업무", starts_at: wp5IsoDay(0, 14), source_label: "세무서" }
          ],
          safe_error_codes: [],
          production_ready_claim: false
        });
      }
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, state));
    });

    await page.goto(`http://127.0.0.1:${port}/?view=matters&ctx=allow#matter-home`, { waitUntil: "networkidle" });
    const matterSidebar = page.locator('[data-context-sidebar="matters"]');
    assert.deepEqual(await matterSidebar.locator(".sidebar-nav > .sidebar-item .sidebar-label").allTextContents(), ["오늘", "사건", "업무", "일정", "연락·후속", "시간·청구"]);
    assert.equal(await matterSidebar.locator(".sidebar-nav > .sidebar-item").count(), 6);
    assert.equal(await matterSidebar.locator(".sidebar-group-toggle").count(), 0);
    assert.equal(await matterSidebar.locator(".sidebar-child").count(), 0);
    assert.doesNotMatch(await matterSidebar.innerText(), /업무 관리|사건 운영|소통|리포트|업무 진행|외부 일정|검토 의견/);

    const workManagement = matterSidebar.getByRole("button", { name: "업무", exact: true });
    await workManagement.click();
    await page.waitForFunction(() => window.location.hash === "#matter-work");
    await page.waitForSelector('[data-matter-small-firm-screen="matter-work"]');
    const workModes = page.getByRole("tablist", { name: "업무 보기 방식" });
    assert.deepEqual(await workModes.getByRole("tab").allTextContents(), ["목록", "보드", "워크트리"]);
    await workModes.getByRole("tab", { name: "보드", exact: true }).click();
    await page.waitForSelector('[data-matter-small-firm-screen="matter-work"][data-matter-work-layout="board"]');
    assert.equal(await page.locator('[data-task-id="matter-work-task"]').count(), 1);
    assert.match(await page.locator('[data-task-id="matter-work-task"]').innerText(), /법원 서면 검토/);

    await page.goto("about:blank");
    await page.goto(`http://127.0.0.1:${port}/?view=matters&ctx=allow#matter-timeline`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-matter-small-firm-screen="matter-followups"]');
    assert.equal(await page.locator('[data-matter-small-firm-screen="matter-followups"]').count(), 1);

    await page.goto("about:blank");
    await page.goto(`http://127.0.0.1:${port}/?view=matters&ctx=allow#matter-external-schedule`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.location.hash === "#matter-calendar");
    await page.waitForSelector('[data-matter-small-firm-screen="matter-calendar"]');
    const calendarRoute = matterSidebar.getByRole("button", { name: "일정", exact: true });
    assert.equal(await calendarRoute.getAttribute("aria-current"), "location");
    assert.equal(await page.getByText("법원 일정", { exact: true }).count(), 1);
    assert.equal(await page.getByText("세무서 업무", { exact: true }).count(), 1);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("dashboard bodies render the requested Home, Matter, and Client work areas without KPI counts", async () => {
  const port = await availablePort();
  const server = await createServer({ root: webRoot, logLevel: "silent", server: { host: "127.0.0.1", port, strictPort: true } });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const state = { decisionCalls: 0, newsCalls: 0, matterListCalls: 0, matterListLimits: [] };
  try {
    const page = await newSignedHomePage(browser, { viewport: { width: 1280, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/matters") {
        state.matterListCalls += 1;
        state.matterListLimits.push(url.searchParams.get("limit"));
      }
      if (url.pathname === "/api/matter/ops/today") {
        return jsonResponse(route, {
          request_id: "r1-matter-today",
          outcome: "passed",
          item: {
            priority_rows: [{ task_id: "matter-today-task", matter_id: "matter-dashboard-active", title: "오늘 확인할 업무", owner_user_id: "jwsuh@amic.kr", priority: "high" }],
            next_actions: [{ task_id: "matter-today-next", matter_id: "matter-dashboard-active", matter_code: "2026-099", title: "의뢰인에게 진행 상황 공유", owner_user_id: "jwsuh@amic.kr" }],
            metrics: { missing_time_count: 1, wip_count: 2, overdue_ar_count: 1 }
          },
          safe_error_codes: [],
          production_ready_claim: false
        });
      }
      if (url.pathname === "/api/matter/ops/calendar") {
        return jsonResponse(route, {
          request_id: "r1-matter-today-calendar",
          outcome: "passed",
          items: [{ event_id: "matter-today-calendar", matter_id: "matter-dashboard-active", title: "오늘 회의", starts_at: wp5IsoDay(0, 10), source_label: "사건 일정" }],
          safe_error_codes: [],
          production_ready_claim: false
        });
      }
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, state));
    });

    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-dashboard`, { waitUntil: "networkidle" });
    const dashboardCards = [
      ["monthly-revenue", "이번달 매출"],
      ["monthly-payroll", "이번달 급여 지급액"],
      ["monthly-processed-cost", "이번달 비급여 출금"],
      ["monthly-revenue-chart", "월별 매출"],
      ["payroll-categories", "급여 구분"],
      ["nonpayroll-categories", "비급여 출금 구분"],
      ["client-summary", "Client"],
      ["people-summary", "People"],
      ["matter-summary", "Matter"],
      ["calendar", "캘린더"]
    ];
    for (const [section, title] of dashboardCards) {
      const card = page.locator(`[data-dashboard-section="${section}"]`);
      assert.equal(await card.count(), 1, `Home must show one ${title} card`);
      assert.equal(await card.locator(".home-dashboard-card-header").getByText(title, { exact: true }).count(), 1, `${title} card must keep its requested heading`);
    }
    const monthlyNonPayrollCard = page.locator('[data-dashboard-section="monthly-processed-cost"]');
    assert.match(await monthlyNonPayrollCard.innerText(), /₩ 136,100,193/);
    assert.match(await monthlyNonPayrollCard.innerText(), /급여 제외 은행 출금/);
    assert.doesNotMatch(await monthlyNonPayrollCard.innerText(), /이번달 비용|비용처리/);
    const cashflowBand = page.locator('[data-home-cashflow-band="true"]');
    assert.equal(await cashflowBand.count(), 1, "Home must show the cashflow band");
    assert.match(await cashflowBand.innerText(), /현재 잔액\s*₩ 29,153,222/);
    assert.match(await cashflowBand.innerText(), /이번달 입금\s*₩ 159,443,060/);
    assert.match(await cashflowBand.innerText(), /이번달 출금\s*₩ 227,166,172/);
    assert.match(await cashflowBand.innerText(), /순이동\s*₩ -67,723,112/);
    assert.doesNotMatch(await cashflowBand.innerText(), /운영비|입금자 확인 전|계좌번호|메모/);
    const dashboardGrid = page.locator('[data-home-dashboard-grid="true"]');
    for (const removedTitle of ["최근 작업", "오늘 할 일", "승인 대기", "신규 수임", "재무 현황", "운영 현황"]) {
      assert.equal(await dashboardGrid.getByText(removedTitle, { exact: true }).count(), 0, `Home dashboard must remove ${removedTitle}`);
    }
    assert.equal(await page.locator('.home-dashboard-hero').count(), 1);
    assert.equal(await page.locator('.home-dashboard-hero h1').textContent(), "Welcome, 서지원 변호사님");
    assert.equal(await page.locator('.home-dashboard-hero p').count(), 1);
    assert.equal(await page.locator('.home-dashboard-kpi-card').count(), 3);
    const revenueChart = page.locator('[data-home-revenue-bar-chart="true"]');
    assert.match(await page.locator('[data-dashboard-section="monthly-revenue-chart"]').innerText(), /최근 6개월/);
    assert.equal(await revenueChart.count(), 1);
    assert.equal(await revenueChart.locator(".home-revenue-bar").count(), 6);
    assert.equal(await revenueChart.locator(".home-chart-axis-label").count(), 6);
    assert.match(await revenueChart.locator("title").first().textContent(), /최근 6개월/);
    assert.equal(await revenueChart.locator("polyline").count(), 0);
    assert.deepEqual(
      await revenueChart.locator(".home-chart-gridline text").allTextContents(),
      ["3,000만", "0"],
    );
    const payrollChart = page.locator('[data-home-payroll-donut-chart="true"]');
    assert.equal(await payrollChart.count(), 1);
    assert.match(await payrollChart.innerText(), /파트너\s*6명\s*68,848,440원/);
    assert.match(await payrollChart.innerText(), /직원\s*3명\s*12,646,327원/);
    assert.match(await payrollChart.innerText(), /고문\s*1명\s*9,571,212원/);
    const nonPayrollChart = page.locator('[data-home-nonpayroll-donut-chart="true"]');
    assert.equal(await nonPayrollChart.count(), 1);
    assert.match(await nonPayrollChart.innerText(), /세금\s*4건\s*54,037,570원/);
    assert.match(await nonPayrollChart.innerText(), /카드대금\s*13건\s*44,424,303원/);
    assert.match(await nonPayrollChart.innerText(), /기타\s*44건\s*4,051,850원/);
    assert.equal(await nonPayrollChart.locator(".home-donut-segment").count(), 6);
    assert.equal(await nonPayrollChart.locator(".home-donut-total").textContent(), "136,100,193");
    assert.deepEqual(
      await nonPayrollChart.locator(".home-donut-segment").evaluateAll((segments) =>
        segments.map((segment) => getComputedStyle(segment).stroke)),
      [
        "rgb(18, 63, 103)",
        "rgb(31, 95, 139)",
        "rgb(47, 119, 168)",
        "rgb(87, 150, 189)",
        "rgb(128, 178, 207)",
        "rgb(175, 207, 223)",
      ],
    );
    const payrollDonutClosure = await payrollChart.locator(".home-donut-segment").evaluateAll((segments) => {
      const last = segments.at(-1);
      const [renderLength] = String(last?.getAttribute("stroke-dasharray") ?? "").split(/\s+/).map(Number);
      const percent = Number(last?.getAttribute("data-home-donut-percent") ?? 0);
      const offset = Math.abs(Number(last?.getAttribute("stroke-dashoffset") ?? 0));
      return {
        lineCaps: segments.map((segment) => segment.getAttribute("stroke-linecap")),
        closesAt: percent + offset,
        visualClosure: renderLength + offset,
      };
    });
    assert.deepEqual(payrollDonutClosure.lineCaps, ["butt", "butt", "butt"]);
    assert.ok(Math.abs(payrollDonutClosure.closesAt - 100) < 0.000001);
    assert.ok(payrollDonutClosure.visualClosure > 100 && payrollDonutClosure.visualClosure < 100.2);
    const donutLegendLayout = await page.evaluate(() => {
      const payrollSvg = document.querySelector('[data-home-payroll-donut-chart="true"] svg').getBoundingClientRect();
      const payrollLegend = document.querySelector('[data-home-donut-legend="payroll"]').getBoundingClientRect();
      const nonPayrollSvg = document.querySelector('[data-home-nonpayroll-donut-chart="true"] svg').getBoundingClientRect();
      const nonPayrollLegend = document.querySelector('[data-home-donut-legend="nonpayroll"]').getBoundingClientRect();
      return {
        payrollBelow: payrollLegend.top >= payrollSvg.bottom - 2,
        nonPayrollBelow: nonPayrollLegend.top >= nonPayrollSvg.bottom - 2,
      };
    });
    assert.deepEqual(donutLegendLayout, { payrollBelow: true, nonPayrollBelow: true });
    assert.equal(
      await page.locator(".home-donut-legend li").evaluateAll((items) => items.every((item) => item.scrollWidth <= item.clientWidth + 1)),
      true,
      "Home donut legend rows must show their labels, values, and percentages without clipping",
    );
    assert.equal(await page.locator('[data-dashboard-section="today-todo"], [data-dashboard-section="pending-approvals"], [data-dashboard-section="new-engagements"], [data-dashboard-section="monthly-sales"], [data-dashboard-section="recent-work"]').count(), 0);
    for (const section of ["monthly-revenue", "monthly-payroll", "monthly-processed-cost", "monthly-revenue-chart", "payroll-categories", "nonpayroll-categories", "client-summary", "people-summary", "matter-summary", "calendar"]) {
      assert.equal(await page.locator(`[data-dashboard-section="${section}"]`).count(), 1);
    }
    const homeClientCard = page.locator('[data-dashboard-section="client-summary"]');
    const homeClientTabs = homeClientCard.getByRole("tablist", { name: "Client 항목" });
    assert.equal(await homeClientTabs.getByRole("tab", { name: "신규 고객", exact: true }).getAttribute("aria-selected"), "true");
    assert.equal(await homeClientTabs.getByRole("tab", { name: "잠재고객", exact: true }).getAttribute("aria-selected"), "false");
    assert.equal(await homeClientCard.locator('[role="tabpanel"][aria-label="신규 고객"] .dashboard-record-row').count(), 1);
    assert.equal(await homeClientCard.getByRole("button", { name: "신규 고객 상세 보기" }).count(), 1);
    await homeClientTabs.getByRole("tab", { name: "잠재고객", exact: true }).click();
    assert.equal(await homeClientTabs.getByRole("tab", { name: "잠재고객", exact: true }).getAttribute("aria-selected"), "true");
    assert.equal(await homeClientCard.locator('[role="tabpanel"][aria-label="잠재고객"] .dashboard-record-row').count(), 2);
    assert.equal(await homeClientCard.getByRole("button", { name: "잠재고객 상세 보기" }).count(), 1);
    assert.match(await page.locator('[data-dashboard-section="people-summary"]').innerText(), /휴가 신청/);
    assert.equal(await page.locator('[data-dashboard-section="people-summary"] [role="tablist"]').count(), 0, "People must not add a decorative one-item tab list");
    const homeMatterCard = page.locator('[data-dashboard-section="matter-summary"]');
    const homeMatterTabs = homeMatterCard.getByRole("tablist", { name: "Matter 항목" });
    assert.equal(await homeMatterTabs.getByRole("tab", { name: "신규 매터", exact: true }).getAttribute("aria-selected"), "true");
    assert.equal(await homeMatterCard.locator('[role="tabpanel"][aria-label="신규 매터"] .dashboard-record-row').count(), 1);
    await homeMatterTabs.getByRole("tab", { name: "종결된 매터", exact: true }).click();
    assert.equal(await homeMatterTabs.getByRole("tab", { name: "종결된 매터", exact: true }).getAttribute("aria-selected"), "true");
    assert.equal(await homeMatterCard.locator('[role="tabpanel"][aria-label="종결된 매터"] .dashboard-record-row').count(), 1);
    assert.equal(await homeMatterCard.getByRole("button", { name: "종결된 매터 상세 보기" }).count(), 1);
    assert.doesNotMatch(await dashboardGrid.innerText(), /서지원|김양태|@amic\.kr/);
    assert.deepEqual(await compactRecordLayoutFailures(page), [], "Home compact records must keep primary and secondary text on one line");
    assert.deepEqual(await panelHeaderLayoutFailures(page), [], "Home panel metadata must remain on the title line");
    const dashboardLayout = await page.evaluate(() => {
      const kpis = [...document.querySelectorAll(".home-dashboard-kpi-card")].map((node) => node.getBoundingClientRect());
      const revenue = document.querySelector(".home-dashboard-revenue-chart-card").getBoundingClientRect();
      const payroll = document.querySelector(".home-dashboard-payroll-chart-card").getBoundingClientRect();
      const nonPayroll = document.querySelector(".home-dashboard-nonpayroll-chart-card").getBoundingClientRect();
      const cashflow = document.querySelector(".home-dashboard-cashflow-band").getBoundingClientRect();
      const client = document.querySelector(".home-dashboard-client-card").getBoundingClientRect();
      const calendar = document.querySelector(".home-dashboard-calendar-card").getBoundingClientRect();
      const matter = document.querySelector(".home-dashboard-matter-card").getBoundingClientRect();
      const people = document.querySelector(".home-dashboard-people-card").getBoundingClientRect();
      const grid = getComputedStyle(document.querySelector(".home-dashboard-overview-grid"));
      return {
        columns: grid.gridTemplateColumns.split(" ").length,
        kpisSameRow: kpis.every((rect) => Math.abs(rect.top - kpis[0].top) < 2),
        kpisEqualWidth: kpis.every((rect) => Math.abs(rect.width - kpis[0].width) < 2),
        chartsSameRow: [payroll, nonPayroll].every((rect) => Math.abs(revenue.top - rect.top) < 2),
        payrollRight: payroll.left > revenue.left,
        nonPayrollRight: nonPayroll.left > payroll.left,
        revenueWider: revenue.width > payroll.width,
        donutsEqualWidth: Math.abs(payroll.width - nonPayroll.width) < 2,
        cashflowBelowCharts: cashflow.top > payroll.bottom && cashflow.top > nonPayroll.bottom && cashflow.top > revenue.bottom,
        cashflowAboveDomains: cashflow.bottom < client.top && cashflow.bottom < calendar.top,
        cashflowFullWidth: Math.abs(cashflow.left - revenue.left) < 2 && Math.abs(cashflow.right - nonPayroll.right) < 2,
        cashflowHeight: Math.round(cashflow.height),
        calendarRight: calendar.left > client.left,
        clientBesideCalendar: Math.abs(client.top - calendar.top) < 2 && Math.abs(client.left - revenue.left) < 2,
        matterBesidePeople: Math.abs(matter.top - people.top) < 2 && Math.abs(matter.left - revenue.left) < 2 && people.left > matter.left
      };
    });
    assert.deepEqual(dashboardLayout, {
      columns: 12,
      kpisSameRow: true,
      kpisEqualWidth: true,
      chartsSameRow: true,
      payrollRight: true,
      nonPayrollRight: true,
      revenueWider: true,
      donutsEqualWidth: true,
      cashflowBelowCharts: true,
      cashflowAboveDomains: true,
      cashflowFullWidth: true,
      cashflowHeight: 108,
      calendarRight: true,
      clientBesideCalendar: true,
      matterBesidePeople: true
    });
    await page.setViewportSize({ width: 1024, height: 768 });
    const tabletLayout = await page.evaluate(() => {
      const kpis = [...document.querySelectorAll(".home-dashboard-kpi-card")].map((node) => node.getBoundingClientRect());
      const revenue = document.querySelector(".home-dashboard-revenue-chart-card").getBoundingClientRect();
      const payroll = document.querySelector(".home-dashboard-payroll-chart-card").getBoundingClientRect();
      const nonPayroll = document.querySelector(".home-dashboard-nonpayroll-chart-card").getBoundingClientRect();
      const cashflow = document.querySelector(".home-dashboard-cashflow-band").getBoundingClientRect();
      const client = document.querySelector(".home-dashboard-client-card").getBoundingClientRect();
      const calendar = document.querySelector(".home-dashboard-calendar-card").getBoundingClientRect();
      const matter = document.querySelector(".home-dashboard-matter-card").getBoundingClientRect();
      const people = document.querySelector(".home-dashboard-people-card").getBoundingClientRect();
      const kpiValuesFit = [...document.querySelectorAll(".home-dashboard-kpi-value > strong")]
        .every((value) => value.scrollWidth <= value.clientWidth);
      return {
        kpisSameRow: kpis.every((rect) => Math.abs(rect.top - kpis[0].top) < 2),
        kpiValuesFit,
        revenueAboveDonuts: revenue.bottom < payroll.top && revenue.bottom < nonPayroll.top,
        donutsSameRow: Math.abs(payroll.top - nonPayroll.top) < 2,
        nonPayrollRight: nonPayroll.left > payroll.left,
        revenueWider: revenue.width > payroll.width,
        donutsEqualWidth: Math.abs(payroll.width - nonPayroll.width) < 2,
        cashflowBelowCharts: cashflow.top > payroll.bottom && cashflow.top > nonPayroll.bottom,
        cashflowAboveDomains: cashflow.bottom < client.top,
        cashflowFullWidth: Math.abs(cashflow.left - revenue.left) < 2 && Math.abs(cashflow.right - nonPayroll.right) < 2,
        cashflowHeight: Math.round(cashflow.height),
        calendarRight: calendar.left > client.left,
        clientBesideCalendar: Math.abs(client.top - calendar.top) < 2 && Math.abs(client.left - revenue.left) < 2,
        matterBesidePeople: Math.abs(matter.top - people.top) < 2 && people.left > matter.left
      };
    });
    assert.deepEqual(tabletLayout, {
      kpisSameRow: true,
      kpiValuesFit: true,
      revenueAboveDonuts: true,
      donutsSameRow: true,
      nonPayrollRight: true,
      revenueWider: true,
      donutsEqualWidth: true,
      cashflowBelowCharts: true,
      cashflowAboveDomains: true,
      cashflowFullWidth: true,
      cashflowHeight: 108,
      calendarRight: true,
      clientBesideCalendar: true,
      matterBesidePeople: true
    });
    await page.setViewportSize({ width: 821, height: 768 });
    const compactCards = await page.locator(".home-dashboard-overview-grid > .home-dashboard-card").evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect()));
    assert.equal(compactCards.every((rect, index) => index === 0 || rect.top > compactCards[index - 1].top), true);
    const compactCashflow = await cashflowBand.evaluate((band) => {
      const rect = band.getBoundingClientRect();
      return { width: rect.width, parentWidth: band.parentElement.getBoundingClientRect().width, minHeight: rect.height >= 108 };
    });
    assert.equal(Math.abs(compactCashflow.width - compactCashflow.parentWidth) < 2, true);
    assert.equal(compactCashflow.minHeight, true);
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileCardHeaders = await page.locator(".home-dashboard-card-header").evaluateAll((headers) => headers.map((header) => {
      const title = header.querySelector(":scope > div:first-child")?.getBoundingClientRect();
      const actions = header.querySelector(".home-dashboard-card-actions")?.getBoundingClientRect();
      return {
        flexWrap: getComputedStyle(header).flexWrap,
        aligned: !title || !actions || Math.abs((title.top + title.height / 2) - (actions.top + actions.height / 2)) < 2,
        overflow: header.scrollWidth > header.clientWidth + 1
      };
    }));
    assert.equal(mobileCardHeaders.every((header) => header.flexWrap === "nowrap" && header.aligned && !header.overflow), true);
    assert.equal(
      await page.locator(".home-donut-legend li").evaluateAll((items) => items.every((item) => item.scrollWidth <= item.clientWidth + 1)),
      true,
      "Mobile Home donut legend rows must remain fully readable",
    );
    await page.setViewportSize({ width: 1366, height: 900 });

    assert.equal(await page.locator("[data-global-rail]").count(), 1);
    assert.equal(await page.locator(".topbar, [data-top-header]").count(), 0);
    assert.equal(await page.locator('[data-product-axis="home"]').getAttribute("aria-current"), "page");
    assert.equal(await page.locator("[data-global-refresh-trigger]").count(), 1);
    const refreshedActionInbox = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/home/action-inbox");
    await page.locator("[data-global-refresh-trigger]").click();
    await refreshedActionInbox;

    await page.locator("[data-global-create-trigger]").click();
    await page.waitForFunction(() => {
      const url = new URL(window.location.href);
      return url.searchParams.get("view") === "matters"
        && url.searchParams.get("filter") === "opening"
        && url.hash === "#matter-list";
    });
    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-dashboard`, { waitUntil: "networkidle" });

    const matterListCallsBeforeSearch = state.matterListCalls;
    const searchTrigger = page.locator("[data-global-search-trigger]");
    await searchTrigger.hover();
    assert.equal(await searchTrigger.locator('[role="tooltip"]').evaluate((node) => getComputedStyle(node).visibility), "visible");
    await page.mouse.move(500, 500);
    await page.keyboard.press("/");
    const searchInput = page.locator(".global-rail-search-panel .global-search input");
    await searchInput.waitFor({ state: "visible" });
    assert.equal(await searchInput.evaluate((node) => document.activeElement === node), true);
    await page.waitForSelector('[data-search-history-section="viewed"] .search-history-row');
    assert.equal(await page.getByText("최근 열람", { exact: true }).count(), 1);
    assert.equal(await page.getByText("최근 수정", { exact: true }).count(), 1);
    assert.equal(await page.getByRole("button", { name: /최근 기록 모두 보기/ }).count(), 1);
    assert.equal(await page.locator('[data-search-history-section="viewed"] .search-history-row').count(), 1);
    assert.equal(await page.locator('[data-search-history-section="modified"] .search-history-row').count(), 3);
    assert.deepEqual(await compactRecordLayoutFailures(page), [], "Search history records must remain one-line");
    assert.deepEqual(state.matterListLimits.slice(matterListCallsBeforeSearch), ["5"]);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').evaluate((node) => node.classList.contains('search-history-row')), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#global-search-popover').count(), 0);
    assert.equal(await searchTrigger.evaluate((node) => document.activeElement === node), true);
    await page.locator("[data-global-search-trigger]").click();
    await page.locator(".global-rail-search-panel .global-search input").focus();
    await page.waitForSelector('[data-search-history-section="viewed"] .search-history-row');
    assert.equal(state.matterListCalls, matterListCallsBeforeSearch + 1, "refocusing search must reuse the loaded history");
    await page.locator('[data-search-history-section="viewed"] .search-history-row').click();
    await page.waitForURL(/matter_id=matter-dashboard-active/);
    await page.waitForSelector('[data-matter-small-firm-screen="matter-list"]');
    assert.equal(await page.locator('[data-record-overlay="matter"]').count(), 1, "recent history must open the selected Matter");
    await page.locator('.record-overlay-scrim').click();
    assert.equal(await page.locator('[data-record-overlay="matter"]').count(), 0);
    await page.locator("[data-global-search-trigger]").click();
    await page.locator(".global-rail-search-panel .global-search input").focus();
    await page.waitForSelector('[data-search-history-section="viewed"] .search-history-row');
    await page.locator('[data-search-history-section="viewed"] .search-history-row').click();
    await page.waitForSelector('[data-record-overlay="matter"]');
    assert.equal(await page.locator('[data-record-overlay="matter"]').count(), 1, "selecting the same recent Matter again must reopen it");
    await page.goto(`http://127.0.0.1:${port}/?view=matters&ctx=allow#matter-today`, { waitUntil: "networkidle" });
    const matterToday = page.locator('[data-matter-small-firm-screen="matter-today"]');
    await matterToday.waitFor();
    await matterToday.locator("#matter-today-priority").waitFor();
    for (const [id, title] of [
      ["matter-today-priority", "지금 처리할 것"],
      ["matter-today-week", "이번 주 일정"],
      ["matter-today-money", "시간·청구"],
      ["matter-today-next", "사건별 다음 행동"],
      ["matter-today-review", "주간 운영 점검"]
    ]) {
      assert.match(await matterToday.locator(`#${id}`).innerText(), new RegExp(`^${title}`), `Matter Today must show ${title}`);
    }
    assert.equal(await page.locator('[data-matter-dashboard="true"], [data-matter-dashboard-kpis], [data-matter-priority-queue]').count(), 0);
    assert.equal(await page.locator('[data-matter-weekly-review="true"]').count(), 1);
    assert.equal(await page.locator('[data-task-id="matter-today-task"]').count(), 1);
    assert.match(await page.locator('[data-task-id="matter-today-task"]').innerText(), /오늘 확인할 업무/);
    assert.deepEqual(await panelHeaderLayoutFailures(page), [], "Matter Today panel metadata must remain on the title line");

    await page.goto(`http://127.0.0.1:${port}/?view=clients&ctx=allow#clients-home`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-client-dashboard="true"]');
    const clientDashboard = page.locator('[data-client-dashboard="true"]');
    for (const title of ["신규 고객", "잠재 고객/접촉", "매출 순위", "고객 미팅", "미수금"]) {
      assert.equal(await clientDashboard.getByText(title, { exact: true }).count(), 1, `Client must show ${title}`);
    }
    for (const section of ["new-clients", "prospects-contacts", "revenue-ranking", "client-meetings", "accounts-receivable"]) {
      assert.equal(await page.locator(`[data-dashboard-section="${section}"]`).count(), 1);
    }
    assert.equal(await page.locator('[data-dashboard-section="new-clients"] .dashboard-record-row').count(), 1);
    assert.equal(await page.locator('[data-dashboard-section="client-meetings"] .dashboard-record-row').count(), 1);
    const clientRow = page.locator('[data-dashboard-section="client-meetings"] .dashboard-record-row').first();
    assert.equal(await clientRow.evaluate((row) => row.scrollWidth > row.clientWidth), false);
    assert.equal(await clientRow.locator("em").evaluate((node) => getComputedStyle(node).whiteSpace), "nowrap");
    assert.deepEqual(await compactRecordLayoutFailures(page), [], "Client compact records must remain one-line");
    assert.deepEqual(await panelHeaderLayoutFailures(page), [], "Client panel metadata must remain on the title line");
    const clientDashboardText = await page.locator('[data-client-dashboard="true"]').innerText();
    assert.doesNotMatch(clientDashboardText, /@amic\.kr|party-dashboard-1|account-dashboard-1|api-fin-client|meeting-dashboard-1|550e8400-e29b-41d4-a716-446655440000/);
    assert.doesNotMatch(clientDashboardText, /\b(?:Client|qualified|active)\b/);
    assert.match(clientDashboardText, /고객|검토 완료|진행 중/);

    for (const [section, label, expectedView, expectedSection] of [
      ["new-clients", "신규 고객 전체 보기", "clients", "clients-list"],
      ["prospects-contacts", "잠재 고객/접촉 전체 보기", "clients", "client-opportunities"],
      ["revenue-ranking", "매출 순위 전체 보기", "home", "home-finance-clients"],
      ["client-meetings", "고객 미팅 전체 보기", "clients", "client-activities"],
      ["accounts-receivable", "미수금 전체 보기", "home", "home-finance-ar"]
    ]) {
      await page.goto(`http://127.0.0.1:${port}/?view=clients&ctx=allow#clients-home`, { waitUntil: "networkidle" });
      await page.keyboard.press("Escape");
      await page.locator(`[data-dashboard-section="${section}"]`).getByRole("button", { name: label }).click();
      await page.waitForFunction(({ view, section: hash }) => new URL(window.location.href).searchParams.get("view") === view && window.location.hash === `#${hash}`, { view: expectedView, section: expectedSection });
    }

    await page.goto(`http://127.0.0.1:${port}/?view=clients&ctx=allow#clients-home`, { waitUntil: "networkidle" });
    await page.keyboard.press("Escape");
    await page.locator('[data-dashboard-section="prospects-contacts"] .dashboard-record-row').last().click();
    await page.waitForFunction(() => window.location.hash === "#client-leads");

    await page.goto(`http://127.0.0.1:${port}/?view=people&ctx=allow#people-dashboard`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-client-dashboard="true"]');
    assert.equal(new URL(page.url()).searchParams.get("view"), "clients");
    assert.equal(new URL(page.url()).hash, "#clients-home");

    await page.goto(`http://127.0.0.1:${port}/?view=people&ctx=allow#people-members`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-hr-workforce-table="true"]');
    const workforceOverflow = await page.locator('[data-hr-workforce-table="true"] .hr-roster-table-wrap').evaluate((node) => ({
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
      tableWidth: node.querySelector("table")?.getBoundingClientRect().width ?? 0
    }));
    assert.equal(workforceOverflow.scrollWidth, workforceOverflow.clientWidth);
    assert.equal(workforceOverflow.tableWidth <= workforceOverflow.clientWidth, true);
    assert.equal(await page.locator('[data-people-dashboard="true"]').count(), 0);
    const workforceTools = page.locator('[data-hr-workforce-table="true"] .hr-roster-view-tools');
    for (const removedAction of ["더보기", "조직", "구성원 추가", "추가 메뉴"]) {
      assert.equal(await workforceTools.getByRole("button", { name: removedAction, exact: true }).count(), 0, `${removedAction} action must be removed`);
    }
    assert.equal(await workforceTools.getByRole("button", { name: "표 보기 옵션", exact: true }).count(), 1);
    assert.equal(await workforceTools.getByLabel("구성원 검색").count(), 1);
    assert.deepEqual(await compactRecordLayoutFailures(page), [], "People compact records must remain one-line");
    assert.deepEqual(await panelHeaderLayoutFailures(page), [], "People panel metadata must remain on the title line");
    for (const title of ["신규 고객", "잠재 고객/접촉", "매출 순위", "고객 미팅", "미수금"]) {
      assert.equal(await page.getByText(title, { exact: true }).count(), 0, `People must not show ${title}`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
});

test("search history keeps a failed source distinct from a genuinely empty source", async () => {
  const port = await availablePort();
  const server = await createServer({ root: webRoot, logLevel: "silent", server: { host: "127.0.0.1", port, strictPort: true } });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await newSignedHomePage(browser, { viewport: { width: 1366, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/matters/recently-viewed") return jsonResponse(route, {});
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, { decisionCalls: 0, newsCalls: 0 }));
    });

    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-dashboard`, { waitUntil: "networkidle" });
    await page.locator("[data-global-search-trigger]").click();
    await page.locator(".global-rail-search-panel .global-search input").focus();
    const viewedSection = page.locator('[data-search-history-section="viewed"]');
    await viewedSection.getByText("최근 기록을 불러오지 못했습니다.").waitFor();
    assert.equal(await viewedSection.getByText("표시할 기록이 없습니다.").count(), 0);
    assert.equal(await page.locator('[data-search-history-section="modified"] .search-history-row').count(), 3);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("Client prospect card preserves readable sources when one source is denied", async () => {
  const port = await availablePort();
  const server = await createServer({ root: webRoot, logLevel: "silent", server: { host: "127.0.0.1", port, strictPort: true } });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await newSignedHomePage(browser, { viewport: { width: 1280, height: 820 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/crm/contacts") {
        return jsonResponse(route, {
          request_id: "dashboard-contacts-denied",
          outcome: "denied",
          ui_state: "denied",
          items: [],
          safe_error_codes: ["permission_denied"],
          count_leak_prevented: true,
          production_ready_claim: false
        }, 403);
      }
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, { decisionCalls: 0, newsCalls: 0 }));
    });
    await page.goto(`http://127.0.0.1:${port}/?view=clients&ctx=allow#clients-home`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-client-dashboard="true"]');
    const prospectsCard = page.locator('[data-dashboard-section="prospects-contacts"]');
    assert.equal(await prospectsCard.locator(".dashboard-record-row").count(), 2);
    assert.equal(await prospectsCard.getByText("잠재 고객과 접촉 접근 권한이 없습니다", { exact: true }).count(), 0);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("Home dashboard keeps independent cards available when bank cashflow is denied", async () => {
  const port = await availablePort();
  const server = await createServer({ root: webRoot, logLevel: "silent", server: { host: "127.0.0.1", port, strictPort: true } });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await newSignedHomePage(browser, { viewport: { width: 1366, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/analytics/finance/cashflow") {
        return jsonResponse(route, {
          request_id: "dashboard-cashflow-denied",
          outcome: "denied",
          ui_state: "denied",
          items: [],
          safe_error_codes: ["ANALYTICS_FINANCE_READ_DENIED"],
          audit_hint_ref: "dashboard-cashflow-denied-audit",
          count_leak_prevented: true,
          production_ready_claim: false
        });
      }
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, { decisionCalls: 0, newsCalls: 0 }));
    });

    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-dashboard`, { waitUntil: "networkidle" });
    assert.equal(await page.locator('[data-dashboard-section="client-summary"] .dashboard-record-row').count() > 0, true);
    assert.equal(await page.locator('[data-dashboard-section="matter-summary"] .dashboard-record-row').count() > 0, true);
    assert.match(await page.locator('[data-dashboard-section="monthly-revenue"]').innerText(), /₩ 400/);
    assert.equal(await page.locator('[data-dashboard-section="monthly-revenue-chart"] [data-home-revenue-bar-chart="true"]').count(), 1);
    for (const section of ["monthly-payroll", "monthly-processed-cost"]) {
      assert.match(await page.locator(`[data-dashboard-section="${section}"]`).innerText(), /접근 권한이 없습니다/);
    }
  } finally {
    await browser.close();
    await server.close();
  }
});

test("Home bank cashflow review challenge never renders as a permission denial", async () => {
  const port = await availablePort();
  const server = await createServer({ root: webRoot, logLevel: "silent", server: { host: "127.0.0.1", port, strictPort: true } });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await newSignedHomePage(browser, { viewport: { width: 1366, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/analytics/finance/cashflow") {
        return jsonResponse(route, {
          request_id: "dashboard-cashflow-review",
          outcome: "review_required",
          ui_state: "review_required",
          item: null,
          items: [],
          safe_error_codes: ["ANALYTICS_FINANCE_REVIEW_REQUIRED"],
          audit_hint_ref: "dashboard-cashflow-review-audit",
          count_leak_prevented: true,
          production_ready_claim: false
        }, 403);
      }
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, { decisionCalls: 0, newsCalls: 0 }));
    });

    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-dashboard`, { waitUntil: "networkidle" });
    for (const section of ["monthly-payroll", "monthly-processed-cost", "payroll-categories", "nonpayroll-categories"]) {
      const text = await page.locator(`[data-dashboard-section="${section}"]`).innerText();
      assert.match(text, /추가 인증이 필요합니다/);
      assert.doesNotMatch(text, /권한 없음|접근 권한이 없습니다/);
    }
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
    const page = await newSignedHomePage(browser, { viewport: { width: 1366, height: 900 } });
    let matterCalls = 0;
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/matters") {
        matterCalls += 1;
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
    const matterSection = page.locator('[data-dashboard-section="matter-summary"]');
    await matterSection.getByText("신규 매터 목록을 불러오지 못했습니다.").waitFor();
    assert.equal(matterCalls >= 3, true);
    assert.equal(await page.locator('[data-dashboard-section="client-summary"] .dashboard-record-row').count() > 0, true);
    assert.equal(await page.locator('[data-home-revenue-bar-chart="true"]').count(), 1);
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
    const page = await newSignedHomePage(browser, { viewport: { width: 1366, height: 900 } });
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
    assert.equal(await page.locator('[data-dashboard-section="pending-approvals"]').count(), 0);
    assert.equal(await page.locator('[data-dashboard-section="people-summary"]').count(), 1);
    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow&locale=en#home-feed`, { waitUntil: "networkidle" });
    assert.equal(await page.locator("#home-feed-tab-notice").textContent(), "Internal notices");
    assert.ok((await page.locator('.sidebar button:has-text("Dashboard")').count()) > 0);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("R1 WP-7 keeps approval counts aligned across navigation and dedicated views after removing the dashboard approval card", async () => {
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
    const page = await newSignedHomePage(browser, { viewport: { width: 1366, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, state));
    });
    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-dashboard`, { waitUntil: "networkidle" });

    await page.waitForSelector('[data-home-sidebar-approval-count="5"]');
    const dashboardSurfaceText = await page.locator(".home-dashboard-surface").innerText();
    assert.equal(visibleLineCount(dashboardSurfaceText, "승인 대기"), 0);
    assert.doesNotMatch(dashboardSurfaceText, /승인 요청/);
    const dashboardCounts = await page.evaluate(() => ({
      sidebar: document.querySelector("[data-home-sidebar-approval-count]")?.getAttribute("data-home-sidebar-approval-count"),
      rail: document.querySelector("[data-home-rail-approval-count]")?.getAttribute("data-home-rail-approval-count")
    }));
    assert.deepEqual(dashboardCounts, { sidebar: "5", rail: "5" });
    assert.equal(await page.locator("[data-home-widget-approval-count]").count(), 0);
    assert.equal(await page.locator('[data-dashboard-section="pending-approvals"]').count(), 0);

    await page.goto(`http://127.0.0.1:${port}/?view=home&ctx=allow#home-todo`, { waitUntil: "networkidle" });
    assert.equal(await page.locator("[data-active-home-section]").getAttribute("data-active-home-section"), "home-todo");
    assert.equal(await page.locator(".home-dashboard-hero h1").textContent(), "할 일");
    assert.equal(await page.locator('[data-home-section-screen="home-todo"] [data-home-tab-prefix="work"]').count(), 0);
    assert.equal(await page.locator('[data-home-section-screen="home-todo"] [data-home-work-todo-list="true"]').count(), 1);

    await page.locator('[data-product-axis="matters"]').click();
    await page.waitForFunction(() => new URL(window.location.href).searchParams.get("view") === "matters");
    await page.locator('[data-product-axis="home"]').click();
    await page.waitForSelector('[data-home-sidebar-approval-count="5"]');
    const afterAxisCounts = await page.evaluate(() => ({
      sidebar: document.querySelector("[data-home-sidebar-approval-count]")?.getAttribute("data-home-sidebar-approval-count"),
      rail: document.querySelector("[data-home-rail-approval-count]")?.getAttribute("data-home-rail-approval-count")
    }));
    assert.deepEqual(afterAxisCounts, { sidebar: "5", rail: "5" });

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
      rail: document.querySelector("[data-home-rail-approval-count]")?.getAttribute("data-home-rail-approval-count")
    }));
    assert.deepEqual(dedicatedCounts, { dedicated: "5", requestTabs: "2", underlineTabs: "1", sidebar: "5", rail: "5" });

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
    assert.equal(await page.locator(".home-dashboard-hero h1").textContent(), "전자계약");
    assert.equal(await page.locator(".home-dashboard-hero p").count(), 0);
    assert.equal(await page.locator('[data-home-section-screen="home-esign"] > header, [data-home-section-screen="home-esign"] .home-status-list header').count(), 0);
    assert.equal(visibleLineCount(esignSurfaceText, "전자계약"), 1);
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
    const page = await newSignedHomePage(browser, { viewport: { width: 1366, height: 900 } });
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
    const page = await newSignedHomePage(browser, { viewport: { width: 1366, height: 900 } });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, state));
    });
    await page.goto(`http://127.0.0.1:${port}/?view=matters&ctx=allow#matter-calendar`, { waitUntil: "networkidle" });

    await page.locator("[data-profile-trigger]").evaluate((node) => node.click());
    await page.waitForSelector('[data-user-profile-surface="my-profile"]');
    assert.equal(await page.locator(".app-frame").getAttribute("data-sidebar-state"), "none");
    assert.equal(await page.locator("[data-context-sidebar]").count(), 0);
    assert.equal(await page.locator("[data-global-rail]").count(), 1);
    assert.ok(await page.locator("[data-profile-return-to-work]").isVisible());
    const desktopProfileGeometry = await page.evaluate(() => {
      const rail = document.querySelector("[data-global-rail]").getBoundingClientRect();
      const canvas = document.querySelector(".page-canvas").getBoundingClientRect();
      return {
        railLeft: rail.left,
        railWidth: rail.width,
        canvasLeft: canvas.left,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
      };
    });
    assert.deepEqual(desktopProfileGeometry, { railLeft: 0, railWidth: 56, canvasLeft: 56, horizontalOverflow: false });

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileProfileGeometry = await page.evaluate(() => ({
      railWidth: document.querySelector("[data-global-rail]").getBoundingClientRect().width,
      canvasLeft: document.querySelector(".page-canvas").getBoundingClientRect().left,
      sidebarCount: document.querySelectorAll("[data-context-sidebar]").length,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
    }));
    assert.deepEqual(mobileProfileGeometry, { railWidth: 56, canvasLeft: 56, sidebarCount: 0, horizontalOverflow: false });
    await page.setViewportSize({ width: 1366, height: 900 });

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

test("profile keeps session identity context but never masks an API read failure", async () => {
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
    const page = await newSignedHomePage(browser, { viewport: { width: 1366, height: 900 } });
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
    await page.waitForFunction(() => document.querySelector('[data-user-profile-surface="my-profile"]')?.getAttribute("data-profile-member") === "user_amic_jwsuh");

    assert.equal(await profile.getAttribute("data-profile-member"), "user_amic_jwsuh");
    assert.match(await profile.locator("[data-profile-api-notice]").innerText(), /프로필을 불러오지 못했습니다|다시 시도/);
    assert.equal(await profile.locator("[data-profile-portrait-panel]").count(), 0);
    assert.equal(await profile.locator("h1").count(), 0);
    assert.equal(await profile.getByRole("button", { name: "Edit" }).count(), 0);
    assert.doesNotMatch(await profile.innerText(), /권한/);
    assert.doesNotMatch(await profile.innerText(), /김양태/);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("profile uses account English name and HRX role fields in the portrait panel", async () => {
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
    const page = await newSignedHomePage(browser, { viewport: { width: 1366, height: 900 } });
    await page.addInitScript(() => {
      window.matterSession = {
        status: async () => ({
          state: "signed_in",
          user_id: "user_amic_jwsuh",
          display_name: "서지원",
          tenant_id: "tenant_amic_matter_vault"
        })
      };
      try {
        window.localStorage.setItem("lawos.profile.override.emp_amic_jwsuh", JSON.stringify({
          profile_override_version: 1,
          english_name: "Jiwon Suh",
          professional_profile: {
            experience: [],
            education: [],
            qualifications: [],
            practice_areas: []
          }
        }));
      } catch {}
    });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/profile/me") {
        return jsonResponse(route, {
          request_id: "profile-generic-fallback",
          outcome: "passed",
          item: {
            profile_ref: "profile:user_amic_jwsuh",
            actor_ref: "user_amic_jwsuh",
            tenant_ref: "tenant_amic_matter_vault",
            display_name: "세션 사용자",
            english_name: "Jiwon Suh",
            employee_id: "emp_amic_jwsuh",
            title: "대표변호사",
            department: "Legal",
            professional_profile: {
              profile_kind: "attorney",
              experience: ["법무법인 아믹 대표변호사 (2025~현재)"],
              education: ["서울대학교 교육학과 학사"],
              qualifications: ["대한민국 변호사"],
              practice_areas: ["M&A"]
            },
            photo_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/69a3GQAAAABJRU5ErkJggg==",
            primary_role_label: "role_unassigned",
            role_count: 1
          },
          safe_error_codes: [],
          audit_hint_ref: "ui_profile_me_probe",
          ui_state: "populated",
          count_leak_prevented: true,
          production_ready_claim: false
        });
      }
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, state));
    });
    await page.goto(`http://127.0.0.1:${port}/?view=matters&ctx=allow`, { waitUntil: "networkidle" });
    await page.locator("[data-profile-trigger]").click();
    const profile = page.locator('[data-user-profile-surface="my-profile"]');
    await profile.waitFor();
    await page.waitForFunction(() => document.querySelector('[data-user-profile-surface="my-profile"]')?.getAttribute("data-profile-api-state") === "populated");

    assert.equal(await profile.locator("[data-profile-english-name]").innerText(), "Jiwon Suh");
    assert.equal(await profile.locator("[data-profile-title]").innerText(), "대표변호사");
    assert.equal(await profile.locator("[data-profile-department]").innerText(), "Legal");
    assert.equal(await profile.locator("[data-profile-portrait-panel]").count(), 1);
    assert.match(await profile.innerText(), /법무법인 아믹 대표변호사/);
    assert.match(await profile.innerText(), /서울대학교 교육학과 학사/);
    assert.match(await profile.innerText(), /대한민국 변호사/);
    assert.match(await profile.innerText(), /M&A/);
    assert.doesNotMatch(await profile.innerText(), /세션 사용자|미등록/);

    await profile.getByRole("button", { name: "Edit" }).click();
    await profile.getByRole("button", { name: "Save" }).click();
    assert.match(await profile.innerText(), /법무법인 아믹 대표변호사/);
    assert.equal(
      await page.evaluate(() => JSON.parse(
        window.localStorage.getItem("lawos.profile.override.emp_amic_jwsuh"),
      ).profile_override_version),
      2,
    );

    const desktopPortrait = await profile.locator("[data-profile-portrait-panel]").evaluate((panel) => {
      const rect = (selector) => panel.querySelector(selector)?.getBoundingClientRect() ?? null;
      const overlaps = (left, right) => Boolean(
        left && right &&
        left.left < right.right &&
        left.right > right.left &&
        left.top < right.bottom &&
        left.bottom > right.top
      );
      const panelRect = panel.getBoundingClientRect();
      const name = rect("[data-profile-english-name]");
      const title = rect("[data-profile-title]");
      const department = rect("[data-profile-department]");
      const copy = rect(".matter-profile-portrait-copy");
      const image = rect(".matter-profile-portrait-image");
      const imageElement = panel.querySelector(".matter-profile-portrait-image");
      const details = document.querySelector("[data-profile-details-panel]")?.getBoundingClientRect() ?? null;
      const cover = document.querySelector(".matter-profile-cover")?.getBoundingClientRect() ?? null;
      return {
        width: panelRect.width,
        aspectRatio: panelRect.width / panelRect.height,
        background: getComputedStyle(panel).backgroundColor,
        borderRadius: getComputedStyle(panel).borderRadius,
        imageWidthRatio: image ? image.width / panelRect.width : null,
        imageTop: imageElement ? getComputedStyle(imageElement).top : null,
        copyTopRatio: copy ? (copy.top - panelRect.top) / panelRect.height : null,
        nameTitleOverlap: overlaps(name, title),
        titleDepartmentOverlap: overlaps(title, department),
        portraitDetailsTopDelta: details ? Math.abs(panelRect.top - details.top) : null,
        coverGap: cover ? panelRect.top - cover.bottom : null,
        portraitEditCount: panel.querySelectorAll(".matter-profile-edit-button").length
      };
    });
    assert.ok(desktopPortrait.width >= 278 && desktopPortrait.width <= 282);
    assert.ok(Math.abs(desktopPortrait.aspectRatio - 3 / 4) < 0.01);
    assert.equal(desktopPortrait.background, "rgb(205, 211, 212)");
    assert.equal(desktopPortrait.borderRadius, "18px");
    assert.ok(desktopPortrait.imageWidthRatio !== null && desktopPortrait.imageWidthRatio >= 2.08 && desktopPortrait.imageWidthRatio <= 2.10);
    assert.equal(desktopPortrait.imageTop, "-68px");
    assert.ok(desktopPortrait.copyTopRatio !== null && desktopPortrait.copyTopRatio >= 0.70 && desktopPortrait.copyTopRatio <= 0.72);
    assert.equal(desktopPortrait.nameTitleOverlap, false);
    assert.equal(desktopPortrait.titleDepartmentOverlap, false);
    assert.ok(desktopPortrait.portraitDetailsTopDelta !== null && desktopPortrait.portraitDetailsTopDelta < 1);
    assert.ok(desktopPortrait.coverGap !== null && desktopPortrait.coverGap >= 12);
    assert.equal(desktopPortrait.portraitEditCount, 0);
    assert.equal(await profile.locator("[data-profile-details-panel] .matter-profile-edit-button").count(), 1);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobilePortrait = await profile.locator("[data-profile-portrait-panel]").boundingBox();
    assert.ok(mobilePortrait && mobilePortrait.width <= 280);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("profile renders the initials fallback when a populated profile has no portrait", async () => {
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
    const page = await newSignedHomePage(browser, { viewport: { width: 1366, height: 900 } });
    await page.addInitScript(() => {
      window.matterSession = {
        status: async () => ({
          state: "signed_in",
          user_id: "user_profile_fallback",
          display_name: "Synthetic Profile",
          tenant_id: "tenant_amic_matter_vault"
        })
      };
    });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/profile/me") {
        return jsonResponse(route, {
          request_id: "profile-initials-fallback",
          outcome: "passed",
          item: {
            user_id: "user_profile_fallback",
            employee_id: "emp_profile_fallback",
            display_name: "Synthetic Profile",
            english_name: "Synthetic User",
            title: "검수 담당자",
            department: "검수",
            professional_profile: {
              experience: ["Synthetic profile fixture"],
              education: [],
              qualifications: [],
              practice_areas: []
            },
            photo_url: null,
            photo_included: false
          },
          safe_error_codes: [],
          audit_hint_ref: "ui_profile_initials_fallback_probe",
          ui_state: "populated",
          count_leak_prevented: true,
          production_ready_claim: false
        });
      }
      return jsonResponse(route, wp5ApiBody(url.pathname, url.searchParams, state));
    });
    await page.goto(`http://127.0.0.1:${port}/?view=matters&ctx=allow#matter-calendar`, { waitUntil: "networkidle" });
    await page.locator("[data-profile-trigger]").click();

    const profile = page.locator('[data-user-profile-surface="my-profile"]');
    await profile.waitFor();
    await page.waitForFunction(() => document.querySelector('[data-user-profile-surface="my-profile"]')?.getAttribute("data-profile-api-state") === "populated");

    const fallback = profile.locator(".matter-profile-portrait-fallback");
    assert.equal(await fallback.isVisible(), true);
    assert.equal(await fallback.innerText(), "S");
    assert.equal(await profile.locator(".matter-profile-portrait-image").count(), 0);
    assert.equal(await profile.locator(".matter-profile-portrait-media img").count(), 0);
    assert.equal(await profile.locator("[data-profile-english-name]").innerText(), "Synthetic User");
    assert.equal(await profile.locator("[data-profile-title]").innerText(), "검수 담당자");
    assert.equal(await profile.getByRole("button", { name: "Edit" }).isVisible(), true);
  } finally {
    await browser.close();
    await server.close();
  }
});
