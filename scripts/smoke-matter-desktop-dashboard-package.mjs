#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron } from "playwright";

const repoRoot = path.resolve(import.meta.dirname, "..");
const platform = process.platform;
const artifactDir = path.resolve(process.env.MATTER_DASHBOARD_PACKAGE_QA_ARTIFACT_DIR ?? path.join(repoRoot, "artifacts/manual-qa/dashboard-package", platform));
const userDataPath = mkdtempSync(path.join(tmpdir(), `matter-dashboard-package-${platform}-`));
const executableCandidates = platform === "win32"
  ? ["matter.exe", "electron.exe"].map((name) => path.join(repoRoot, "apps/desktop/dist/win-unpacked", name))
  : [path.join(repoRoot, "apps/desktop/dist/mac/matter.app/Contents/MacOS/matter")];
const executablePath = path.resolve(process.env.MATTER_DESKTOP_PACKAGED_EXECUTABLE ?? executableCandidates.find(existsSync) ?? executableCandidates[0]);

assert.equal(existsSync(executablePath), true, `packaged executable is required: ${executablePath}`);
mkdirSync(artifactDir, { recursive: true });

const today = new Date();
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
const nowIso = today.toISOString();
const session = {
  state: "signed_in",
  session_id: "session_dashboard_package_qa",
  user_id: "user_dashboard_package_qa",
  tenant_id: "tenant_dashboard_package_qa",
  email: "dashboard-package-qa@fixture.local",
  display_name: "대시보드 패키지 QA",
  role_ids: ["lawos_admin", "lawos_partner", "managing_partner"],
  scopes: ["matter.read", "crm.read", "analytics.finance.read", "finance.bank.read", "home.read", "hrx.read", "hrx.payroll.preview"],
  expires_at: "2099-12-31T23:59:59.000Z"
};

const matters = [
  { matter_id: "matter_dashboard_active", matter_code: "QA-2026-001", title: "계약 자문", client_name: "가람 주식회사", status: "active", owner_user_id: session.user_id, updated_at: nowIso },
  { matter_id: "matter_dashboard_opening", matter_code: "QA-2026-002", title: "신규 수임 검토", client_name: "나래 파트너스", status: "opening", owner_user_id: session.user_id, created_at: nowIso, opened_at: nowIso },
  { matter_id: "matter_dashboard_closed", matter_code: "QA-2026-003", title: "종결 자문", client_name: "다온 유한회사", status: "closed", owner_user_id: "user_other", updated_at: nowIso, closed_at: nowIso }
];

function listBody(items = []) {
  return {
    request_id: "dashboard-package-qa-list",
    outcome: "passed",
    items,
    safe_error_codes: [],
    audit_hint_ref: "dashboard-package-qa-audit",
    ui_state: items.length > 0 ? "populated" : "empty",
    page_info: { next_cursor: null, returned_count: items.length },
    count_leak_prevented: true,
    production_ready_claim: false
  };
}

function respondJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

const requestCounts = new Map();

async function requestJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return {}; }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const pathname = url.pathname;
  const requestKey = pathname === "/api/home/action-inbox"
    ? `${pathname}?type=${url.searchParams.get("type") ?? ""}`
    : pathname === "/api/home/feed"
      ? `${pathname}?tab=${url.searchParams.get("tab") ?? ""}`
      : pathname;
  requestCounts.set(requestKey, (requestCounts.get(requestKey) ?? 0) + 1);
  if (pathname === "/health") return respondJson(response, 200, { ok: true, fixture_only: true, production_ready_claim: false });
  if (pathname === "/api/auth/login") {
    await requestJson(request);
    return respondJson(response, 200, { ok: true, session_token: "lawos_session_v1.dashboard_package_fixture", session, expires_at: session.expires_at, fixture_only: true, production_ready_claim: false });
  }
  if (pathname === "/api/auth/session") return respondJson(response, 200, { ok: true, session, fixture_only: true, production_ready_claim: false });
  if (pathname === "/api/profile/me") return respondJson(response, 200, { ...listBody(), item: { user_id: session.user_id, display_name: session.display_name, title: "QA" } });
  if (pathname === "/api/home/action-inbox") {
    const type = url.searchParams.get("type");
    const items = type === "task"
      ? [{ id: "task_dashboard_today", type: "task", title: "오늘 계약서 검토", matter_ref: matters[0].matter_id, due_at: `${todayKey}T12:00:00`, status: "todo" }]
      : type === "approval"
        ? [{ id: "approval_dashboard_pending", type: "approval", subtype: "leave", title: "연차 휴가 신청", requester: "합성 구성원", matter_ref: matters[0].matter_id, due_at: `${todayKey}T18:00:00`, status: "pending" }]
        : [];
    return respondJson(response, 200, { ...listBody(items), counts: { approval: 1, task_late: 0, task_today: 1 } });
  }
  if (pathname === "/api/home/agenda") return respondJson(response, 200, { ...listBody(), events: [{ id: "agenda_dashboard_today", title: "고객 미팅", starts_at: `${todayKey}T03:00:00.000Z`, type: "event" }] });
  if (pathname === "/api/home/feed") return respondJson(response, 200, { ...listBody(), entries: [{ id: "feed_dashboard_notice", tab: "notice", source: "AMIC 공지", title: "대시보드 QA 공지", body_preview: "패키지 화면 검증용 합성 공지", published_at: nowIso }], source_statuses: [] });
  if (pathname === "/api/matters/recently-viewed") return respondJson(response, 200, listBody([{ ...matters[0], viewed_at: nowIso }]));
  if (pathname === "/api/matters") return respondJson(response, 200, listBody(matters));
  if (pathname === "/api/intake/requests") return respondJson(response, 200, listBody([{ intake_request_id: "intake_dashboard_new", display_name: "라온 주식회사", requested_scope_summary: "신규 자문 수임", requested_at: nowIso, status: "review" }]));
  if (pathname === "/api/crm/accounts") return respondJson(response, 200, listBody([{ account_id: "account_dashboard_new", display_name: "마루 주식회사", account_type: "Client", owner_user_id: session.user_id, created_at: nowIso }]));
  if (pathname === "/api/crm/leads") return respondJson(response, 200, listBody([{ lead_id: "lead_dashboard_new", display_name: "바른 그룹", stage: "contacted", owner_user_id: session.user_id, updated_at: nowIso }]));
  if (pathname === "/api/crm/opportunities") return respondJson(response, 200, listBody([{ opportunity_id: "opportunity_dashboard_new", display_name: "새롬 자문", stage: "qualified", owner_user_id: session.user_id, updated_at: nowIso }]));
  if (pathname === "/api/crm/contacts") return respondJson(response, 200, listBody([{ contact_id: "contact_dashboard_new", display_name: "오세진", status: "active", owner_user_id: session.user_id, updated_at: nowIso }]));
  if (pathname === "/api/crm/activities") return respondJson(response, 200, listBody([{ crm_activity_id: "activity_dashboard_meeting", subject: "정기 고객 미팅", party_display_name: "마루 주식회사", activity_type: "meeting", scheduled_at: nowIso, owner_user_id: session.user_id }]));
  if (pathname === "/api/analytics/finance/cashflow") {
    return respondJson(response, 200, {
      request_id: "dashboard-package-qa-cashflow",
      outcome: "passed",
      item: {
        summary: {
          currency: "KRW",
          current_balance: 29000000,
          total_inflow: 15000000,
          total_outflow: 13000000,
          net_movement: 2000000,
          transaction_count: 10,
          account_count: 1,
          classification_review_count: 0,
          zero_amount_source_count: 0,
          basis_at: nowIso
        },
        business_summary: {
          currency: "KRW",
          sales_amount: 12000000,
          operating_expense_amount: 4000000,
          payroll_payment_amount: 9000000,
          non_operating_amount: 0,
          classified_count: 10,
          unclassified_count: 0,
          review_count: 0,
          coverage_percent: 100,
          status: "passed",
          invoice_required: false,
          matter_required: false,
          individual_payroll_values_included: false
        },
        payroll_categories: [
          { category: "partner", label: "파트너", gross_krw: 4000000, payment_count: 2, employee_count: 2 },
          { category: "advisor", label: "고문", gross_krw: 2000000, payment_count: 1, employee_count: 1 },
          { category: "staff", label: "직원", gross_krw: 3000000, payment_count: 3, employee_count: 3 }
        ],
        monthly: [{
          month: todayKey.slice(0, 7),
          currency: "KRW",
          total_inflow: 15000000,
          total_outflow: 13000000,
          sales_amount: 12000000,
          operating_expense_amount: 4000000,
          payroll_payment_amount: 9000000,
          non_operating_amount: 0,
          classified_transaction_count: 10,
          unclassified_transaction_count: 0,
          net_movement: 2000000,
          transaction_count: 10
        }],
        reconciliation: {
          status: "passed",
          latest_batch_id: "dashboard_package_qa",
          latest_batch_transaction_count: 10,
          raw_source_payload_included: false
        }
      },
      source_statuses: [],
      filters: { currency: "KRW", time_zone: "Asia/Seoul" },
      safe_error_codes: [],
      audit_hint_ref: "dashboard-package-qa-cashflow-audit",
      count_leak_prevented: true,
      raw_source_payload_included: false,
      production_ready_claim: false
    });
  }
  if (pathname === "/api/analytics/finance/monthly") return respondJson(response, 200, { ...listBody([{ month: todayKey.slice(0, 7), currency: "KRW", billed_amount: 12000000, collected_amount: 9000000, processed_cost: 4000000 }]), source_statuses: [] });
  if (pathname === "/api/analytics/finance/clients") return respondJson(response, 200, { ...listBody([{ client_group_id: "client_dashboard_revenue", client_group_label: "마루 주식회사", currency: "KRW", billed_amount: 12000000, collected_amount: 9000000, ar_balance: 3000000 }]), source_statuses: [] });
  if (pathname === "/api/hrx/payroll/dashboard-summary") {
    return respondJson(response, 200, {
      ...listBody([{ summary_ref: "aggregate_only" }]),
      summary: {
        month: todayKey.slice(0, 7),
        currency: "KRW",
        run_status: "closed",
        gross_krw: 9000000,
        employee_count: 6,
        categories: [
          { category: "partner", label: "파트너", gross_krw: 4000000, employee_count: 2 },
          { category: "advisor", label: "고문", gross_krw: 2000000, employee_count: 1 },
          { category: "staff", label: "직원", gross_krw: 3000000, employee_count: 3 },
          { category: "unclassified", label: "미분류", gross_krw: 0, employee_count: 0 }
        ],
        individual_values_included: false,
        individual_identifiers_included: false,
        credential_material_included: false,
        production_ready_claim: false
      }
    });
  }
  if (pathname === "/api/hrx/employees") return respondJson(response, 200, { employees: [], fixture_only: true, production_ready_claim: false });
  return respondJson(response, 200, listBody());
});

await new Promise((resolveListen, rejectListen) => server.listen(0, "127.0.0.1", (error) => error ? rejectListen(error) : resolveListen()));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

function productUrl(baseHref, view, section) {
  const url = new URL(baseHref);
  url.searchParams.set("desktop", "1");
  url.searchParams.set("view", view);
  url.searchParams.set("ctx", "allow");
  url.searchParams.set("desktop_actor_ref", session.user_id);
  url.searchParams.set("desktop_tenant_ref", session.tenant_id);
  url.searchParams.set("desktop_session_ref", session.session_id);
  url.searchParams.set("desktop_source_ref", "dashboard_package_fixture");
  url.searchParams.set("desktop_review_state", "allow");
  for (const role of session.role_ids) url.searchParams.append("desktop_role_ref", role);
  for (const scope of session.scopes) url.searchParams.append("desktop_scope_ref", scope);
  url.hash = section;
  return url.href;
}

const app = await electron.launch({
  executablePath,
  env: {
    ...process.env,
    MATTER_DESKTOP_USER_DATA_PATH: userDataPath,
    MATTER_DESKTOP_LOCAL_API_DISABLED: "1",
    MATTER_DESKTOP_ENV_FILE: path.join(userDataPath, "fixture-only.env"),
    MATTER_DESKTOP_RUNTIME_BASE_URL: baseUrl,
    MATTER_DESKTOP_OPERATOR_TOKEN: "",
    MATTER_VAULT_R4_OPERATOR_TOKEN: "",
    MATTER_R4_OPERATOR_TOKEN: "",
    MATTER_OPERATOR_TOKEN: ""
  },
  timeout: 30_000
});

const expected = {
  home: ["monthly-revenue", "monthly-payroll", "monthly-processed-cost", "monthly-revenue-chart", "payroll-categories", "cashflow", "client-summary", "people-summary", "matter-summary", "calendar"],
  clients: ["new-clients", "prospects-contacts", "revenue-ranking", "client-meetings", "accounts-receivable"],
  matters: ["recent-work", "today-todo", "my-matters", "new-engagements", "closed-matters"],
  people: []
};
const surfaces = {};

try {
  await app.firstWindow({ timeout: 30_000 });
  let page = null;
  for (let attempt = 0; attempt < 60 && !page; attempt += 1) {
    for (const candidate of app.windows()) {
      if (await candidate.locator('[data-login-screen="forest-split"], [data-product-axis-nav]').count().catch(() => 0)) { page = candidate; break; }
    }
    if (!page) await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  assert(page, "packaged main window did not become ready");
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const desktopSession = await page.evaluate(async ({ email, password }) => {
    const current = await window.matterSession?.status?.();
    if (current?.state === "signed_in") return { ok: true, state: current.state };
    const result = await window.matterSession?.login?.({ email, password });
    return { ok: result?.ok === true, state: result?.session?.state ?? "signed_out" };
  }, { email: "dashboard-package-qa@fixture.local", password: "fixture-only" });
  assert.deepEqual(desktopSession, { ok: true, state: "signed_in" }, "packaged fixture session must be established in the main process");
  await page.reload({ waitUntil: "domcontentloaded" });
  if (await page.locator('[data-home-dashboard-shell="true"]').count() === 0) {
    if (await page.locator('[data-login-screen="forest-split"]').count() > 0) {
      await page.fill("[data-login-email]", "dashboard-package-qa@fixture.local");
      await page.fill("[data-login-password]", "fixture-only");
      const submitSelector = await page.locator('[data-login-form="email-password"] button[type="submit"]').count() > 0
        ? '[data-login-form="email-password"] button[type="submit"]'
        : "[data-matter-login]";
      await page.click(submitSelector);
    } else {
      await page.click('[data-product-axis="home"]');
    }
  }
  await page.waitForSelector('[data-home-dashboard-shell="true"]', { timeout: 30_000 });
  const productBaseHref = page.url();

  for (const [view, sections] of Object.entries(expected)) {
    const section = view === "home" ? "home-dashboard" : view === "clients" ? "clients-home" : view === "matters" ? "matter-home" : "people-members";
    await page.evaluate((url) => window.location.assign(url), productUrl(productBaseHref, view, section));
    const rootSelector = view === "home"
      ? '[data-home-dashboard-shell="true"]'
      : view === "clients"
        ? '[data-client-dashboard="true"]'
        : view === "matters"
          ? '[data-matter-dashboard="true"]'
          : '[data-hr-workforce-table="true"]';
    await page.waitForSelector(rootSelector, { timeout: 30_000 });
    let homeTabFixtureEvidence = null;
    if (view === "home") {
      try {
        await page.waitForFunction(
          ({ selector, expectedSections }) => {
            const text = document.querySelector(selector)?.innerText ?? "";
            const sections = [...document.querySelectorAll(`${selector} [data-dashboard-section]`)]
              .map((node) => node.getAttribute("data-dashboard-section"))
              .filter(Boolean)
              .sort();
            return JSON.stringify(sections) === JSON.stringify([...expectedSections].sort())
              && document.querySelectorAll(`${selector} [data-home-revenue-line-chart="true"]`).length === 1
              && document.querySelectorAll(`${selector} [data-home-payroll-donut-chart="true"]`).length === 1
              && ["₩ 12,000,000", "₩ 9,000,000", "₩ 4,000,000", "마루 주식회사", "연차 휴가 신청", "QA-2026-002", "고객 미팅"]
                .every((value) => text.includes(value));
          },
          { selector: rootSelector, expectedSections: sections },
          { timeout: 30_000 },
        );
        const defaultTabEvidence = await page.evaluate(({ selector }) => {
          const text = document.querySelector(selector)?.innerText ?? "";
          return {
            client_new_selected: document.querySelector(`${selector} [data-home-tab-prefix="home-client-dashboard"][data-home-tab-id="new"]`)?.getAttribute("aria-selected") === "true",
            client_new_fixture_visible: text.includes("마루 주식회사"),
            matter_new_selected: document.querySelector(`${selector} [data-home-tab-prefix="home-matter-dashboard"][data-home-tab-id="new"]`)?.getAttribute("aria-selected") === "true",
            matter_new_fixture_visible: text.includes("QA-2026-002"),
          };
        }, { selector: rootSelector });
        assert.equal(Object.values(defaultTabEvidence).every(Boolean), true, `Home default tabs must expose their fixtures: ${JSON.stringify(defaultTabEvidence)}`);

        await page.click(`${rootSelector} [data-home-tab-prefix="home-client-dashboard"][data-home-tab-id="prospects"]`);
        await page.waitForFunction(
          ({ selector }) => {
            const card = document.querySelector(`${selector} [data-dashboard-section="client-summary"]`);
            const tab = card?.querySelector('[data-home-tab-prefix="home-client-dashboard"][data-home-tab-id="prospects"]');
            const text = card?.innerText ?? "";
            return tab?.getAttribute("aria-selected") === "true" && ["바른 그룹", "새롬 자문"].every((value) => text.includes(value));
          },
          { selector: rootSelector },
          { timeout: 10_000 },
        );
        await page.click(`${rootSelector} [data-home-tab-prefix="home-matter-dashboard"][data-home-tab-id="closed"]`);
        await page.waitForFunction(
          ({ selector }) => {
            const card = document.querySelector(`${selector} [data-dashboard-section="matter-summary"]`);
            const tab = card?.querySelector('[data-home-tab-prefix="home-matter-dashboard"][data-home-tab-id="closed"]');
            return tab?.getAttribute("aria-selected") === "true" && (card?.innerText ?? "").includes("QA-2026-003");
          },
          { selector: rootSelector },
          { timeout: 10_000 },
        );
        homeTabFixtureEvidence = {
          ...defaultTabEvidence,
          client_prospects_selected: true,
          client_prospect_fixtures_visible: true,
          matter_closed_selected: true,
          matter_closed_fixture_visible: true,
        };
      } catch (error) {
        const diagnostic = await page.evaluate(({ selector, expectedSections }) => {
          const text = document.querySelector(selector)?.innerText ?? "";
          const renderedSections = [...document.querySelectorAll(`${selector} [data-dashboard-section]`)]
            .map((node) => node.getAttribute("data-dashboard-section"))
            .filter(Boolean);
          return {
            expected_sections: expectedSections,
            rendered_sections: renderedSections,
            missing_sections: expectedSections.filter((section) => !renderedSections.includes(section)),
            revenue_chart_count: document.querySelectorAll(`${selector} [data-home-revenue-line-chart="true"]`).length,
            payroll_chart_count: document.querySelectorAll(`${selector} [data-home-payroll-donut-chart="true"]`).length,
            revenue_fixture_visible: text.includes("₩ 12,000,000"),
            payroll_fixture_visible: text.includes("₩ 9,000,000"),
            processed_cost_fixture_visible: text.includes("₩ 4,000,000"),
            leave_fixture_visible: text.includes("연차 휴가 신청"),
            new_matter_fixture_visible: text.includes("QA-2026-002"),
            closed_matter_fixture_visible: text.includes("QA-2026-003"),
            calendar_fixture_visible: text.includes("고객 미팅"),
            active_client_tab: document.querySelector(`${selector} [data-home-tab-prefix="home-client-dashboard"][aria-selected="true"]`)?.getAttribute("data-home-tab-id") ?? null,
            active_matter_tab: document.querySelector(`${selector} [data-home-tab-prefix="home-matter-dashboard"][aria-selected="true"]`)?.getAttribute("data-home-tab-id") ?? null,
            body_preview: text.replace(/\s+/g, " ").slice(0, 1200),
          };
        }, { selector: rootSelector, expectedSections: sections });
        const failureEvidence = {
          ...diagnostic,
          request_counts: Object.fromEntries([...requestCounts.entries()].sort(([left], [right]) => left.localeCompare(right))),
        };
        await page.screenshot({ path: path.join(artifactDir, `home-data-timeout-${platform}.png`), fullPage: true, animations: "disabled", caret: "hide" });
        writeFileSync(path.join(artifactDir, `home-data-timeout-${platform}.json`), `${JSON.stringify(failureEvidence, null, 2)}\n`);
        throw new Error(`Home fixture data did not become ready: ${JSON.stringify(failureEvidence)}`, { cause: error });
      }
    } else {
      await page.waitForTimeout(2_000);
    }
    const snapshot = await page.evaluate(({ selector }) => {
      const surfaceText = document.querySelector(selector)?.innerText ?? "";
      const forbiddenPatterns = [
        /\b(?:matter|user|tenant|account|lead|opportunity|contact|activity)_[a-z0-9_]+\b/gi,
        /\b(?:contacted|qualified|active|opening|closed|review_required|review|todo|in_progress|completed)\b/g
      ];
      return {
        sections: [...document.querySelectorAll(`${selector} [data-dashboard-section]`)].map((node) => node.getAttribute("data-dashboard-section")),
        section_row_counts: Object.fromEntries([...document.querySelectorAll(`${selector} [data-dashboard-section]`)].map((node) => [node.getAttribute("data-dashboard-section"), node.querySelectorAll(".dashboard-record-row").length])),
        record_rows: document.querySelectorAll(`${selector} .dashboard-record-row`).length,
        horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        matter_kpi_count: document.querySelectorAll('[data-matter-dashboard-kpis], [data-matter-priority-queue]').length,
        approval_widget_count: document.querySelectorAll('[data-widget-id="approval"]').length,
        people_dashboard_count: document.querySelectorAll('[data-people-dashboard="true"]').length,
        customer_dashboard_title_count: ["신규 고객", "잠재 고객/접촉", "매출 순위", "고객 미팅", "미수금"].filter((title) => surfaceText.includes(title)).length,
        home_dashboard_grid_count: document.querySelectorAll(`${selector} [data-home-dashboard-grid="true"]`).length,
        home_revenue_chart_count: document.querySelectorAll(`${selector} [data-home-revenue-line-chart="true"]`).length,
        home_payroll_chart_count: document.querySelectorAll(`${selector} [data-home-payroll-donut-chart="true"]`).length,
        home_revenue_fixture_visible: surfaceText.includes("₩ 12,000,000"),
        home_payroll_fixture_visible: surfaceText.includes("₩ 9,000,000"),
        home_processed_cost_fixture_visible: surfaceText.includes("₩ 4,000,000"),
        home_client_fixture_visible: surfaceText.includes("마루 주식회사") && surfaceText.includes("바른 그룹") && surfaceText.includes("새롬 자문"),
        home_leave_fixture_visible: surfaceText.includes("연차 휴가 신청") && surfaceText.includes("합성 구성원"),
        home_matter_fixture_visible: surfaceText.includes("QA-2026-002") && surfaceText.includes("QA-2026-003"),
        home_calendar_fixture_visible: surfaceText.includes("고객 미팅"),
        legacy_home_section_count: ["pending-approvals", "recent-work", "today-todo", "monthly-sales", "new-engagements", "feed"]
          .filter((section) => document.querySelector(`${selector} [data-dashboard-section="${section}"]`)).length,
        forbidden_visible_values: [...new Set(forbiddenPatterns.flatMap((pattern) => surfaceText.match(pattern) ?? []))],
        body_preview: surfaceText.replace(/\s+/g, " ").slice(0, 800)
      };
    }, { selector: rootSelector });
    if (view === "home") {
      snapshot.home_client_fixture_visible = Boolean(
        homeTabFixtureEvidence?.client_new_fixture_visible
        && homeTabFixtureEvidence?.client_prospect_fixtures_visible
      );
      snapshot.home_matter_fixture_visible = Boolean(
        homeTabFixtureEvidence?.matter_new_fixture_visible
        && homeTabFixtureEvidence?.matter_closed_fixture_visible
      );
      snapshot.home_tab_fixture_evidence = homeTabFixtureEvidence;
    }
    assert.deepEqual([...snapshot.sections].sort(), [...sections].sort(), `${view} dashboard sections`);
    if (view === "home") {
      assert.equal(snapshot.home_dashboard_grid_count, 1, "Home must render one overview grid");
      assert.equal(snapshot.home_revenue_chart_count, 1, "Home must render the monthly revenue line chart");
      assert.equal(snapshot.home_payroll_chart_count, 1, "Home must render the payroll category donut chart");
      assert.equal(snapshot.home_revenue_fixture_visible, true, "Home must render the monthly revenue fixture");
      assert.equal(snapshot.home_payroll_fixture_visible, true, "Home must render the aggregate payroll fixture");
      assert.equal(snapshot.home_processed_cost_fixture_visible, true, "Home must render the processed-cost fixture");
      assert.equal(snapshot.home_client_fixture_visible, true, "Home must render Client fixture data");
      assert.equal(snapshot.home_leave_fixture_visible, true, "Home must render the leave-request fixture");
      assert.equal(snapshot.home_matter_fixture_visible, true, "Home must render new and closed Matter fixture data");
      assert.equal(snapshot.home_calendar_fixture_visible, true, "Home must render the calendar fixture");
      assert.equal(snapshot.legacy_home_section_count, 0, "Removed default Home widgets must stay absent");
      for (const section of ["client-summary", "people-summary", "matter-summary"]) {
        assert(snapshot.section_row_counts[section] >= 1, `Home ${section} must render its direct source: ${JSON.stringify(snapshot)}`);
      }
    } else if (view === "clients" || view === "matters") {
      assert(snapshot.record_rows >= 5, `${view} dashboard must render actual list rows: ${JSON.stringify(snapshot)}`);
      if (view === "clients") {
        for (const clientSection of sections) {
          assert(snapshot.section_row_counts[clientSection] >= 1, `Client ${clientSection} must render its direct source: ${JSON.stringify(snapshot)}`);
        }
        assert.equal(snapshot.customer_dashboard_title_count, 5, "Client must show all five customer dashboard titles");
      }
    } else {
      assert.equal(snapshot.people_dashboard_count, 0, "People must not render the customer dashboard");
      assert.equal(snapshot.customer_dashboard_title_count, 0, "People must not show customer dashboard titles");
    }
    assert.deepEqual(snapshot.forbidden_visible_values, [], `${view} dashboard must not expose backend identifiers or raw enums`);
    assert.equal(snapshot.horizontal_overflow, false, `${view} dashboard must not horizontally overflow`);
    assert.equal(snapshot.matter_kpi_count, 0, "Matter count KPI blocks must stay removed");
    assert.equal(snapshot.approval_widget_count, 0, "Home approval count widget must stay removed");
    const screenshotPath = path.join(artifactDir, `${view}-${view === "people" ? "workforce" : "dashboard"}-${platform}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled", caret: "hide" });
    surfaces[view] = { ...snapshot, screenshot: path.relative(repoRoot, screenshotPath) };
  }
} finally {
  await app.close().catch(() => {});
  await new Promise((resolveClose) => server.close(resolveClose));
}

const receipt = {
  schema_version: "law-firm-os.dashboard-package-screen-qa.v0.1",
  generated_at: new Date().toISOString(),
  status: "passed",
  platform,
  executable: path.relative(repoRoot, executablePath),
  executable_sha256: createHash("sha256").update(readFileSync(executablePath)).digest("hex"),
  renderer_handoff: "packaged_login_to_product_url",
  fixture_only: true,
  real_client_data_used: false,
  credential_material_used: false,
  expected_sections: expected,
  surfaces,
  public_release: false,
  production_go_live: false
};
writeFileSync(path.join(artifactDir, `dashboard-package-screen-qa-${platform}.json`), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
