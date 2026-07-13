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
  scopes: ["matter.read", "crm.read", "analytics.finance.read", "home.read", "hrx.read"],
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

async function requestJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return {}; }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const pathname = url.pathname;
  if (pathname === "/health") return respondJson(response, 200, { ok: true, fixture_only: true, production_ready_claim: false });
  if (pathname === "/api/auth/login") {
    await requestJson(request);
    return respondJson(response, 200, { ok: true, session_token: "lawos_session_v1.dashboard_package_fixture", session, expires_at: session.expires_at, fixture_only: true, production_ready_claim: false });
  }
  if (pathname === "/api/auth/session") return respondJson(response, 200, { ok: true, session, fixture_only: true, production_ready_claim: false });
  if (pathname === "/api/profile/me") return respondJson(response, 200, { ...listBody(), item: { user_id: session.user_id, display_name: session.display_name, title: "QA" } });
  if (pathname === "/api/home/action-inbox") {
    const taskItems = url.searchParams.get("type") === "task"
      ? [{ id: "task_dashboard_today", type: "task", title: "오늘 계약서 검토", matter_ref: matters[0].matter_id, due_at: `${todayKey}T12:00:00`, status: "todo" }]
      : [];
    return respondJson(response, 200, { ...listBody(taskItems), counts: { approval: 0, task_late: 0, task_today: taskItems.length } });
  }
  if (pathname === "/api/home/agenda") return respondJson(response, 200, { ...listBody(), events: [{ id: "agenda_dashboard_today", title: "고객 미팅", starts_at: `${todayKey}T03:00:00.000Z`, type: "event" }] });
  if (pathname === "/api/home/feed") return respondJson(response, 200, { ...listBody(), entries: [{ id: "feed_dashboard_notice", title: "대시보드 QA 공지", summary: "패키지 화면 검증용 합성 공지", created_at: nowIso, tab: "notice" }], source_statuses: [] });
  if (pathname === "/api/matters/recently-viewed") return respondJson(response, 200, listBody([{ ...matters[0], viewed_at: nowIso }]));
  if (pathname === "/api/matters") return respondJson(response, 200, listBody(matters));
  if (pathname === "/api/intake/requests") return respondJson(response, 200, listBody([{ intake_request_id: "intake_dashboard_new", display_name: "라온 주식회사", requested_scope_summary: "신규 자문 수임", requested_at: nowIso, status: "review" }]));
  if (pathname === "/api/crm/accounts") return respondJson(response, 200, listBody([{ account_id: "account_dashboard_new", display_name: "마루 주식회사", account_type: "Client", owner_user_id: session.user_id, created_at: nowIso }]));
  if (pathname === "/api/crm/leads") return respondJson(response, 200, listBody([{ lead_id: "lead_dashboard_new", display_name: "바른 그룹", stage: "contacted", owner_user_id: session.user_id, updated_at: nowIso }]));
  if (pathname === "/api/crm/opportunities") return respondJson(response, 200, listBody([{ opportunity_id: "opportunity_dashboard_new", display_name: "새롬 자문", stage: "qualified", owner_user_id: session.user_id, updated_at: nowIso }]));
  if (pathname === "/api/crm/contacts") return respondJson(response, 200, listBody([{ contact_id: "contact_dashboard_new", display_name: "오세진", status: "active", owner_user_id: session.user_id, updated_at: nowIso }]));
  if (pathname === "/api/crm/activities") return respondJson(response, 200, listBody([{ crm_activity_id: "activity_dashboard_meeting", subject: "정기 고객 미팅", party_display_name: "마루 주식회사", activity_type: "meeting", scheduled_at: nowIso, owner_user_id: session.user_id }]));
  if (pathname === "/api/analytics/finance/monthly") return respondJson(response, 200, { ...listBody([{ month: todayKey.slice(0, 7), currency: "KRW", billed_amount: 12000000, collected_amount: 9000000 }]), source_statuses: [] });
  if (pathname === "/api/analytics/finance/clients") return respondJson(response, 200, { ...listBody([{ client_group_id: "client_dashboard_revenue", client_group_label: "마루 주식회사", currency: "KRW", billed_amount: 12000000, collected_amount: 9000000, ar_balance: 3000000 }]), source_statuses: [] });
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
  home: ["pending-approvals", "recent-work", "today-todo", "calendar", "monthly-sales", "new-engagements", "feed"],
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
  if (await page.locator('[data-home-dashboard-shell="true"]').count() === 0) {
    if (await page.locator('[data-login-screen="forest-split"]').count() > 0) {
      await page.fill("[data-login-email]", "dashboard-package-qa@fixture.local");
      await page.fill("[data-login-password]", "fixture-only");
      await page.click('[data-login-form="email-password"] button[type="submit"]');
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
    await page.waitForTimeout(2_000);
    const snapshot = await page.evaluate(({ selector }) => {
      const surfaceText = document.querySelector(selector)?.innerText ?? "";
      const forbiddenPatterns = [
        /\b(?:matter|user|tenant|account|lead|opportunity|contact|activity)_[a-z0-9_]+\b/gi,
        /\b(?:Client|contacted|qualified|active|opening|closed|review_required|review|todo|in_progress|completed)\b/g
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
        home_todo_fixture_visible: surfaceText.includes("오늘 계약서 검토"),
        home_feed_fixture_visible: document.querySelector(".home-dashboard-feed")?.innerText?.includes("대시보드 QA 공지") === true,
        home_feed_entry_count: document.querySelector("[data-home-feed-entry-count]")?.getAttribute("data-home-feed-entry-count") ?? null,
        home_feed_text: document.querySelector(".home-dashboard-feed")?.innerText?.replace(/\s+/g, " ").slice(0, 300) ?? "",
        forbidden_visible_values: [...new Set(forbiddenPatterns.flatMap((pattern) => surfaceText.match(pattern) ?? []))],
        body_preview: surfaceText.replace(/\s+/g, " ").slice(0, 800)
      };
    }, { selector: rootSelector });
    assert.deepEqual([...snapshot.sections].sort(), [...sections].sort(), `${view} dashboard sections`);
    if (view === "home") {
      assert.equal(snapshot.home_todo_fixture_visible, true, "Home today To Do must render fixture data");
      assert.equal(snapshot.home_feed_fixture_visible, true, `Home feed must render fixture data: ${JSON.stringify(snapshot)}`);
      for (const section of ["pending-approvals", "recent-work", "new-engagements", "monthly-sales"]) {
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
