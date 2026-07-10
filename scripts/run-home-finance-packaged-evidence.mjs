#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { _electron as electron } from "playwright";

const repoRoot = resolve(import.meta.dirname, "..");
const appBundle = resolve(repoRoot, "apps/desktop/dist/mac/matter.app");
const executablePath = resolve(appBundle, "Contents/MacOS/matter");
const rendererPath = resolve(appBundle, "Contents/Resources/app/src/renderer/web/index.html");
const artifactDir = resolve(repoRoot, "artifacts/manual-qa/home-finance-settlement-2026-07-10/packaged");
const receiptPath = resolve(artifactDir, "packaged-evidence-receipt.json");
const userDataPath = mkdtempSync(resolve(tmpdir(), "home-finance-packaged-qa-"));

for (const path of [executablePath, rendererPath]) assert.equal(existsSync(path), true, `${path} is required`);
mkdirSync(artifactDir, { recursive: true });

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const financeScopes = [
  "analytics.finance.read",
  "finance.time.write",
  "finance.expense.write",
  "finance.billing.write",
  "finance.approve",
  "finance.payment.write",
  "finance.export",
  "finance.audit.read",
];

function productUrl(view, section, {
  ctx = "allow",
  scopeRefs = financeScopes,
  matterId = "",
  actorRef = "user_packaged_finance_allow",
  roleRefs = ["lawos_admin", "lawos_partner", "managing_partner"],
} = {}) {
  const url = new URL(pathToFileURL(rendererPath));
  url.searchParams.set("desktop", "1");
  url.searchParams.set("view", view);
  url.searchParams.set("ctx", ctx);
  url.searchParams.set("desktop_actor_ref", actorRef);
  url.searchParams.set("desktop_tenant_ref", "tenant_amic_matter_vault");
  url.searchParams.set("desktop_session_ref", `desktop:home-finance-package-qa:${actorRef}`);
  url.searchParams.set("desktop_source_ref", "packaged_finance_qa_route_envelope");
  url.searchParams.set("desktop_review_state", ctx);
  for (const role of roleRefs) url.searchParams.append("desktop_role_ref", role);
  for (const scope of scopeRefs) url.searchParams.append("desktop_scope_ref", scope);
  if (matterId) url.searchParams.set("matter_id", matterId);
  url.hash = section;
  return url.href;
}

const listBody = (items = []) => ({
  request_id: "home-finance-packaged-evidence-list",
  outcome: "passed",
  items,
  safe_error_codes: [],
  audit_hint_ref: "home-finance-packaged-evidence-audit",
  ui_state: items.length === 0 ? "empty" : null,
  page_info: { next_cursor: null, returned_count: items.length },
  count_leak_prevented: true,
  production_ready_claim: false,
});

function aggregateBody(pathname, guarded) {
  if (guarded) return {
    status: 403,
    body: {
      request_id: "home-finance-packaged-evidence-denied",
      outcome: "blocked",
      items: [],
      safe_error_codes: ["ANALYTICS_UNAUTHORIZED_OMISSION"],
      audit_hint_ref: "home-finance-packaged-evidence-denied-audit",
      ui_state: "denied",
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
  if (pathname.endsWith("/overview")) return { status: 200, body: {
    request_id: "home-finance-packaged-evidence-overview",
    outcome: "passed",
    item: {
      scope_label: "Matter 기준 집계",
      totals: [{ currency: "KRW", billed_amount: 12800000, collected_amount: 9400000, matter_cost: 2350000, recoverable_cost: 1800000, ar_balance: 3400000, contribution_amount: 10450000, unlinked_amount: 350000, transaction_count: 18, date_inferred_count: 1 }],
      currency_conversion_applied: false,
      ar_balance_is_point_in_time: true,
    },
    source_statuses: [], safe_error_codes: [], audit_hint_ref: "home-finance-packaged-evidence-overview-audit", count_leak_prevented: true, raw_source_payload_included: false, credential_material_included: false, journal_lines_included: false, production_ready_claim: false,
  } };
  if (pathname.endsWith("/monthly")) return { status: 200, body: {
    request_id: "home-finance-packaged-evidence-monthly", outcome: "passed",
    items: [
      { month: "2026-06", currency: "KRW", billed_amount: 5200000, collected_amount: 4800000, matter_cost: 900000, recoverable_cost: 700000, ar_balance: 400000, contribution_amount: 4300000, unlinked_amount: 0, transaction_count: 7, date_inferred_count: 0 },
      { month: "2026-07", currency: "KRW", billed_amount: 7600000, collected_amount: 4600000, matter_cost: 1450000, recoverable_cost: 1100000, ar_balance: 3000000, contribution_amount: 6150000, unlinked_amount: 350000, transaction_count: 11, date_inferred_count: 1 },
    ],
    source_statuses: [], safe_error_codes: [], audit_hint_ref: "home-finance-packaged-evidence-monthly-audit", count_leak_prevented: true, raw_source_payload_included: false, production_ready_claim: false,
  } };
  return { status: 200, body: {
    request_id: "home-finance-packaged-evidence-clients", outcome: "passed",
    items: [
      { client_group_id: "client-evidence-a", client_group_label: "아미쿠스 주식회사", client_mapping_source: "master-data.ClientGroup", matter_count: 2, currency: "KRW", billed_amount: 8200000, collected_amount: 6400000, matter_cost: 1300000, recoverable_cost: 1000000, ar_balance: 1800000, contribution_amount: 6900000, unlinked_amount: 0, transaction_count: 10, date_inferred_count: 0 },
      { client_group_id: "client-evidence-b", client_group_label: "한강파트너스", client_mapping_source: "master-data.ClientGroup", matter_count: 1, currency: "KRW", billed_amount: 4600000, collected_amount: 3000000, matter_cost: 700000, recoverable_cost: 550000, ar_balance: 1600000, contribution_amount: 3900000, unlinked_amount: 0, transaction_count: 6, date_inferred_count: 1 },
      { client_group_id: null, client_group_label: "미연결 고객", client_mapping_source: "unlinked", matter_count: 1, currency: "KRW", billed_amount: 0, collected_amount: 0, matter_cost: 350000, recoverable_cost: 250000, ar_balance: 0, contribution_amount: -350000, unlinked_amount: 350000, transaction_count: 2, date_inferred_count: 0 },
    ],
    source_statuses: [], safe_error_codes: [], audit_hint_ref: "home-finance-packaged-evidence-clients-audit", count_leak_prevented: true, raw_source_payload_included: false, production_ready_claim: false,
  } };
}

function fixtureSession({ denied = false } = {}) {
  return {
    state: "signed_in",
    session_id: denied ? "session_packaged_finance_denied" : "session_packaged_finance_allow",
    user_id: denied ? "user_packaged_finance_denied" : "user_packaged_finance_allow",
    tenant_id: "tenant_amic_matter_vault",
    email: denied ? "denied-finance@packaged-fixture.local" : "allow-finance@packaged-fixture.local",
    display_name: denied ? "제한 권한 QA 사용자" : "패키지 QA 사용자",
    role_ids: denied ? ["lawos_employee"] : ["lawos_admin", "lawos_partner", "managing_partner"],
    scopes: denied ? ["matter.read", "vault.read"] : financeScopes,
    expires_at: "2099-12-31T23:59:59.000Z",
  };
}

async function requestJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function respondJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

const fixtureServer = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const pathname = url.pathname;
  if (pathname === "/health") return respondJson(response, 200, { ok: true, fixture_only: true, production_ready_claim: false });
  if (pathname === "/api/auth/login") {
    const input = await requestJson(request);
    const session = fixtureSession({ denied: input.email === "denied-finance@packaged-fixture.local" });
    return respondJson(response, 200, {
      ok: true,
      session_token: session.user_id === "user_packaged_finance_denied" ? "lawos_session_v1.packaged_denied_fixture" : "lawos_session_v1.packaged_allow_fixture",
      session,
      expires_at: session.expires_at,
      fixture_only: true,
      production_ready_claim: false,
    });
  }
  const denied = String(request.headers.authorization ?? "").includes("packaged_denied_fixture");
  const session = fixtureSession({ denied });
  if (pathname === "/api/auth/session") return respondJson(response, 200, { ok: true, session, fixture_only: true, production_ready_claim: false });
  if (pathname === "/api/profile/me") return respondJson(response, 200, {
    request_id: "home-finance-packaged-profile", outcome: "passed", item: { user_id: session.user_id, display_name: session.display_name, title: denied ? "일반 직원" : "대표변호사" }, safe_error_codes: [], audit_hint_ref: "home-finance-packaged-profile-audit", ui_state: "populated", count_leak_prevented: true, production_ready_claim: false,
  });
  if (pathname.startsWith("/api/analytics/finance/")) {
    const aggregate = aggregateBody(pathname, denied);
    return respondJson(response, aggregate.status, aggregate.body);
  }
  if (pathname === "/api/matters") return respondJson(response, 200, listBody([{ matter_id: "matter-evidence-001", matter_code: "2026-014", title: "아미쿠스 기업 자문", billing_client_party_id: "party-evidence-001", status: "active" }]));
  if (pathname === "/api/finance/time-entries") return respondJson(response, 200, listBody([{ time_entry_id: "time-evidence-001", matter_id: "matter-evidence-001", work_date: "2026-07-10", narrative: "계약서 검토 및 자문", duration_minutes: 90, status: "approved" }]));
  if (pathname === "/api/finance/invoices") return respondJson(response, 200, listBody([{ invoice_id: "invoice-evidence-001", matter_id: "matter-evidence-001", invoice_number: "INV-2026-014", amount_due: 3400000, amount_paid: 2100000, currency: "KRW", status: "issued" }]));
  if (pathname === "/api/finance/ar-aging") return respondJson(response, 200, listBody([{ ar_balance_id: "ar-evidence-001", matter_id: "matter-evidence-001", balance: 1300000, bucket: "31-60", currency: "KRW", status: "open" }]));
  if (pathname === "/api/finance/audit") return respondJson(response, 200, listBody());
  if (pathname === "/api/home/action-inbox") return respondJson(response, 200, { ...listBody(), counts: { approval: 0, task_late: 0, task_today: 0 } });
  if (pathname === "/api/home/agenda") return respondJson(response, 200, { ...listBody(), events: [] });
  if (pathname === "/api/home/feed") return respondJson(response, 200, { ...listBody(), entries: [], source_statuses: [] });
  return respondJson(response, 200, listBody());
});
await new Promise((resolveListen, rejectListen) => fixtureServer.listen(0, "127.0.0.1", (error) => error ? rejectListen(error) : resolveListen()));
const fixtureAddress = fixtureServer.address();
const fixtureBaseUrl = `http://127.0.0.1:${fixtureAddress.port}`;

const app = await electron.launch({
  executablePath,
  env: {
    ...process.env,
    MATTER_DESKTOP_USER_DATA_PATH: userDataPath,
    MATTER_DESKTOP_LOCAL_API_DISABLED: "1",
    MATTER_DESKTOP_ENV_FILE: resolve(userDataPath, "fixture-only.env"),
    MATTER_DESKTOP_RUNTIME_BASE_URL: fixtureBaseUrl,
    MATTER_DESKTOP_OPERATOR_TOKEN: "",
    MATTER_VAULT_R4_OPERATOR_TOKEN: "",
    MATTER_R4_OPERATOR_TOKEN: "",
    MATTER_OPERATOR_TOKEN: "",
  },
  timeout: 30_000,
});

let homeSnapshot;
let matterSnapshot;
const evidence = [];
try {
  await app.firstWindow({ timeout: 30_000 });
  let page = null;
  for (let attempt = 0; attempt < 60 && !page; attempt += 1) {
    for (const candidate of app.windows()) {
      if (await candidate.locator("[data-matter-desktop-app], [data-product-axis-nav]").count().catch(() => 0)) {
        page = candidate;
        break;
      }
    }
    if (!page) await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  if (!page) {
    const diagnostics = await Promise.all(app.windows().map(async (candidate) => ({
      url: candidate.url(),
      title: await candidate.title().catch(() => ""),
      body: (await candidate.textContent("body").catch(() => ""))?.slice(0, 200),
    })));
    assert(page, `packaged main window did not become ready: ${JSON.stringify(diagnostics)}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  async function capture(name, view, section, selector, options = {}) {
    await page.evaluate((url) => window.location.assign(url), productUrl(view, section, {
      ctx: options.ctx,
      scopeRefs: options.scopeRefs,
      matterId: options.matterId,
      actorRef: options.actorRef,
      roleRefs: options.roleRefs,
    }));
    try {
      await page.waitForSelector(selector, { timeout: 30_000 });
    } catch (error) {
      const diagnostics = await page.evaluate(() => ({
        url: window.location.href,
        finance_states: [...document.querySelectorAll("[data-home-finance-state]")].map((node) => node.getAttribute("data-home-finance-state")),
        active_section: document.querySelector("[data-active-home-section]")?.getAttribute("data-active-home-section") ?? null,
        body: document.body?.innerText?.slice(0, 600) ?? "",
      }));
      throw new Error(`${error.message}\npackaged screen diagnostics: ${JSON.stringify(diagnostics)}`);
    }
    if (options.readySelector) await page.waitForSelector(options.readySelector, { timeout: 30_000 });
    await page.waitForTimeout(options.settleMs ?? 1800);
    await page.locator('[data-profile-trigger="true"]').evaluate((node) => { node.style.visibility = "hidden"; }).catch(() => {});
    const screenshot = resolve(artifactDir, `${name}.png`);
    await page.screenshot({ path: screenshot, animations: "disabled", caret: "hide" });
    const snapshot = await page.evaluate(({ expectedView, expectedSection }) => ({
      requested_view: expectedView,
      requested_section: expectedSection,
      active_view: document.querySelector("[data-context-sidebar]")?.getAttribute("data-context-sidebar") ?? null,
      active_section: document.querySelector("[data-active-home-section]")?.getAttribute("data-active-home-section") ?? null,
      expected_view: expectedView,
      expected_section: expectedSection,
      resolved_query_view: new URLSearchParams(window.location.search).get("view"),
      resolved_hash: window.location.hash.slice(1),
      resolved_matter_id: new URLSearchParams(window.location.search).get("matter_id"),
      horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }), { expectedView: options.expectedView ?? view, expectedSection: options.expectedSection ?? section });
    snapshot.requested_view = view;
    snapshot.requested_section = section;
    assert.equal(snapshot.active_view, snapshot.expected_view);
    if (snapshot.expected_view === "home") assert.equal(snapshot.active_section, snapshot.expected_section);
    assert.equal(snapshot.horizontal_overflow, false);
    evidence.push({ name, path: screenshot.slice(repoRoot.length + 1), screenshot_sha256: sha256(screenshot), selector, snapshot });
  }

  await capture("01-packaged-overview-sidebar", "home", "home-finance-overview", '[data-home-finance-summary="true"]');
  homeSnapshot = await page.evaluate(() => {
    const group = document.querySelector('[data-sidebar-group="home-finance"]');
    return {
      active_view: document.querySelector("[data-context-sidebar]")?.getAttribute("data-context-sidebar") ?? null,
      active_section: document.querySelector("[data-active-home-section]")?.getAttribute("data-active-home-section") ?? null,
      group_visible: Boolean(group),
      group_expanded: group?.querySelector(".sidebar-group-toggle")?.getAttribute("aria-expanded") === "true",
      child_labels: [...(group?.querySelectorAll(".sidebar-subnav .sidebar-item") ?? [])].map((node) => node.textContent?.replace(/\s+/g, " ").trim()),
      route_contract_visible: Boolean(document.querySelector('[data-home-finance-route-contract="home-finance-overview"]')),
      horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  assert.equal(homeSnapshot.group_visible, true);
  assert.deepEqual(homeSnapshot.child_labels, ["전체 현황", "월별 매출/비용", "고객별 매출/비용", "시간 기록", "비용 처리", "청구/수납", "미수금"]);
  assert.equal(homeSnapshot.route_contract_visible, true);
  assert.equal(homeSnapshot.horizontal_overflow, false);
  await capture("02-packaged-monthly", "home", "home-finance-monthly", '[data-home-finance-monthly-table="true"]');
  await capture("03-packaged-clients-unlinked", "home", "home-finance-clients", '[data-home-finance-unlinked-client="true"]');
  const operationEvidence = { matterId: "matter-evidence-001", readySelector: '[data-upl-b01-time-entry-readback-count="1"]' };
  await capture("04-packaged-time", "home", "home-finance-time", '[data-home-finance-operation="time"]', operationEvidence);
  await capture("05-packaged-expenses", "home", "home-finance-expenses", '[data-home-finance-operation="expenses"]', operationEvidence);
  await capture("06-packaged-billing", "home", "home-finance-billing", '[data-home-finance-operation="billing"]', operationEvidence);
  await capture("07-packaged-ar", "home", "home-finance-ar", '[data-home-finance-operation="ar"]', operationEvidence);
  await capture("08-packaged-matter-context-redirect", "matters", "matter-billing", '[data-home-finance-operation="billing"]', { ...operationEvidence, expectedView: "home", expectedSection: "home-finance-billing", settleMs: 1800 });
  const deniedLogin = await page.evaluate(() => window.matterSession.login({ email: "denied-finance@packaged-fixture.local", password: "fixture-only" }));
  assert.equal(deniedLogin?.ok, true);
  assert.equal(deniedLogin?.session?.scopes?.includes("analytics.finance.read"), false);
  await capture("09-packaged-denied", "home", "home-finance-overview", '[data-home-finance-state="denied"]', {
    actorRef: "user_packaged_finance_denied",
    roleRefs: ["lawos_employee"],
    scopeRefs: ["matter.read", "vault.read"],
    settleMs: 1800,
  });

  await page.evaluate((url) => window.location.assign(url), productUrl("matters", "matter-home"));
  await page.waitForSelector('[data-context-sidebar="matters"]', { timeout: 30_000 });
  matterSnapshot = await page.evaluate(() => {
    const sidebarText = document.querySelector(".sidebar-nav")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const forbiddenSections = ["matter-approvals", "matter-time", "matter-expenses", "matter-billing", "matter-ar"];
    return {
      settlement_group_visible: [...document.querySelectorAll(".sidebar-group-toggle")].some((node) => ["정산", "결재·청구"].includes(node.textContent?.trim())),
      forbidden_section_count: forbiddenSections.filter((section) => document.querySelector(`[data-sidebar-section="${section}"]`)).length,
      sidebar_text: sidebarText,
    };
  });
  assert.equal(matterSnapshot.settlement_group_visible, false);
  assert.equal(matterSnapshot.forbidden_section_count, 0);
  await page.locator('[data-profile-trigger="true"]').evaluate((node) => { node.style.visibility = "hidden"; });
  const matterScreenshot = resolve(artifactDir, "10-packaged-matter-sidebar-without-settlement.png");
  await page.screenshot({ path: matterScreenshot, animations: "disabled", caret: "hide" });
  evidence.push({ name: "10-packaged-matter-sidebar-without-settlement", path: matterScreenshot.slice(repoRoot.length + 1), screenshot_sha256: sha256(matterScreenshot), selector: '[data-context-sidebar="matters"]', snapshot: matterSnapshot });
} finally {
  await app.close();
  await new Promise((resolveClose) => fixtureServer.close(resolveClose));
}

const requiredScreenNames = [
  "01-packaged-overview-sidebar",
  "02-packaged-monthly",
  "03-packaged-clients-unlinked",
  "04-packaged-time",
  "05-packaged-expenses",
  "06-packaged-billing",
  "07-packaged-ar",
  "08-packaged-matter-context-redirect",
  "09-packaged-denied",
];
assert.deepEqual(evidence.slice(0, requiredScreenNames.length).map((item) => item.name), requiredScreenNames);

const receipt = {
  schema_version: "law-firm-os.home-finance-packaged-evidence.v0.1",
  generated_at: new Date().toISOString(),
  status: "passed",
  package: {
    app_bundle: "apps/desktop/dist/mac/matter.app",
    executable_sha256: sha256(executablePath),
    renderer_index_sha256: sha256(rendererPath),
    internal_package_only: true,
    developer_id_signed: false,
    notarized: false,
  },
  qa_session: {
    mode: "packaged_app_loopback_contract_server",
    explicit_finance_scope_fixture: true,
    local_fixture_api: true,
    backend_authentication_claim: false,
    production_data_claim: false,
    isolated_user_data: true,
    raw_user_data_path_included: false,
  },
  home_snapshot: homeSnapshot,
  matter_snapshot: matterSnapshot,
  viewport: { width: 1440, height: 1000 },
  required_packaged_screen_count: requiredScreenNames.length,
  captured_packaged_screen_count: evidence.length,
  required_packaged_screens_passed: evidence.slice(0, requiredScreenNames.length).every((item) => existsSync(resolve(repoRoot, item.path)) && typeof item.screenshot_sha256 === "string"),
  evidence,
  screenshots: evidence.map((item) => item.path),
  production_ready_claim: false,
  public_release_claim: false,
  go_live_claim: false,
};
writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ verdict: "PASS", receipt: receiptPath.slice(repoRoot.length + 1), screenshot_count: receipt.screenshots.length }, null, 2));
