#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

const repoRoot = resolve(import.meta.dirname, "..");
const webRoot = resolve(repoRoot, "apps/web");
const artifactDir = resolve(repoRoot, "artifacts/manual-qa/home-finance-settlement-2026-07-10/browser");
mkdirSync(artifactDir, { recursive: true });

const listBody = (items = []) => ({
  request_id: "home-finance-evidence-list",
  outcome: "passed",
  items,
  safe_error_codes: [],
  audit_hint_ref: "home-finance-evidence-audit",
  ui_state: items.length === 0 ? "empty" : null,
  page_info: { next_cursor: null, returned_count: items.length },
  count_leak_prevented: true,
  production_ready_claim: false,
});

function financeBody(pathname, guarded) {
  if (guarded && pathname.startsWith("/api/analytics/finance/")) {
    return {
      status: 403,
      body: {
        request_id: "home-finance-evidence-denied",
        outcome: "blocked",
        items: [],
        safe_error_codes: ["ANALYTICS_UNAUTHORIZED_OMISSION"],
        audit_hint_ref: "home-finance-evidence-denied-audit",
        ui_state: "denied",
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  if (pathname === "/api/analytics/finance/overview") {
    return { status: 200, body: {
      request_id: "home-finance-evidence-overview",
      outcome: "passed",
      item: {
        scope_label: "Matter 기준 집계",
        totals: [{ currency: "KRW", billed_amount: 12800000, collected_amount: 9400000, matter_cost: 2350000, recoverable_cost: 1800000, ar_balance: 3400000, contribution_amount: 10450000, unlinked_amount: 350000, transaction_count: 18, date_inferred_count: 1 }],
        currency_conversion_applied: false,
        ar_balance_is_point_in_time: true,
      },
      source_statuses: [], safe_error_codes: [], audit_hint_ref: "home-finance-evidence-overview-audit", count_leak_prevented: true, raw_source_payload_included: false, credential_material_included: false, journal_lines_included: false, production_ready_claim: false,
    } };
  }
  if (pathname === "/api/analytics/finance/monthly") {
    return { status: 200, body: {
      request_id: "home-finance-evidence-monthly", outcome: "passed",
      items: [
        { month: "2026-06", currency: "KRW", billed_amount: 5200000, collected_amount: 4800000, matter_cost: 900000, recoverable_cost: 700000, ar_balance: 400000, contribution_amount: 4300000, unlinked_amount: 0, transaction_count: 7, date_inferred_count: 0 },
        { month: "2026-07", currency: "KRW", billed_amount: 7600000, collected_amount: 4600000, matter_cost: 1450000, recoverable_cost: 1100000, ar_balance: 3000000, contribution_amount: 6150000, unlinked_amount: 350000, transaction_count: 11, date_inferred_count: 1 },
      ],
      source_statuses: [], safe_error_codes: [], audit_hint_ref: "home-finance-evidence-monthly-audit", count_leak_prevented: true, raw_source_payload_included: false, production_ready_claim: false,
    } };
  }
  if (pathname === "/api/analytics/finance/clients") {
    return { status: 200, body: {
      request_id: "home-finance-evidence-clients", outcome: "passed",
      items: [
        { client_group_id: "client-evidence-a", client_group_label: "아미쿠스 주식회사", client_mapping_source: "master-data.ClientGroup", matter_count: 2, currency: "KRW", billed_amount: 8200000, collected_amount: 6400000, matter_cost: 1300000, recoverable_cost: 1000000, ar_balance: 1800000, contribution_amount: 6900000, unlinked_amount: 0, transaction_count: 10, date_inferred_count: 0 },
        { client_group_id: "client-evidence-b", client_group_label: "한강파트너스", client_mapping_source: "master-data.ClientGroup", matter_count: 1, currency: "KRW", billed_amount: 4600000, collected_amount: 3000000, matter_cost: 700000, recoverable_cost: 550000, ar_balance: 1600000, contribution_amount: 3900000, unlinked_amount: 0, transaction_count: 6, date_inferred_count: 1 },
        { client_group_id: null, client_group_label: "미연결 고객", client_mapping_source: "unlinked", matter_count: 1, currency: "KRW", billed_amount: 0, collected_amount: 0, matter_cost: 350000, recoverable_cost: 250000, ar_balance: 0, contribution_amount: -350000, unlinked_amount: 350000, transaction_count: 2, date_inferred_count: 0 },
      ],
      source_statuses: [], safe_error_codes: [], audit_hint_ref: "home-finance-evidence-clients-audit", count_leak_prevented: true, raw_source_payload_included: false, production_ready_claim: false,
    } };
  }
  return null;
}

const server = await createServer({ root: webRoot, logLevel: "silent", server: { host: "127.0.0.1", port: 0 } });
await server.listen();
const address = server.httpServer.address();
const origin = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
let guarded = false;

await page.route("**/api/**", (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const aggregate = financeBody(url.pathname, guarded);
  if (aggregate) return route.fulfill({ status: aggregate.status, contentType: "application/json", body: JSON.stringify(aggregate.body) });
  if (url.pathname === "/api/matters") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(listBody([{ matter_id: "matter-evidence-001", matter_code: "2026-014", title: "아미쿠스 기업 자문", billing_client_party_id: "party-evidence-001", status: "active" }])) });
  if (url.pathname === "/api/finance/time-entries") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(listBody([{ time_entry_id: "time-evidence-001", matter_id: "matter-evidence-001", work_date: "2026-07-10", narrative: "계약서 검토 및 자문", duration_minutes: 90, status: "approved" }])) });
  if (url.pathname === "/api/finance/invoices") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(listBody([{ invoice_id: "invoice-evidence-001", matter_id: "matter-evidence-001", invoice_number: "INV-2026-014", amount_due: 3400000, amount_paid: 2100000, currency: "KRW", status: "issued" }])) });
  if (url.pathname === "/api/finance/ar-aging") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(listBody([{ ar_balance_id: "ar-evidence-001", matter_id: "matter-evidence-001", balance: 1300000, bucket: "31-60", currency: "KRW", status: "open" }])) });
  if (url.pathname === "/api/finance/audit") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(listBody([])) });
  if (url.pathname === "/api/home/action-inbox") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...listBody([]), counts: { approval: 0, task_late: 0, task_today: 0 } }) });
  if (url.pathname === "/api/home/agenda") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...listBody([]), events: [] }) });
  if (url.pathname === "/api/home/feed") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...listBody([]), entries: [], source_statuses: [] }) });
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(listBody([])) });
});

const evidence = [];
async function capture(name, url, selector) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector(selector, { timeout: 30_000 });
  const path = resolve(artifactDir, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  evidence.push({ name, path: path.slice(repoRoot.length + 1), url: page.url(), selector });
}

try {
  const home = `${origin}/?view=home&ctx=allow&matter_id=matter-evidence-001`;
  await capture("01-overview-sidebar", `${home}#home-finance-overview`, '[data-home-finance-summary="true"]');
  await capture("02-monthly", `${home}#home-finance-monthly`, '[data-home-finance-monthly-table="true"]');
  await capture("03-clients-unlinked", `${home}#home-finance-clients`, '[data-home-finance-unlinked-client="true"]');
  await capture("04-time", `${home}#home-finance-time`, '[data-home-finance-operation="time"]');
  await capture("05-expenses", `${home}#home-finance-expenses`, '[data-home-finance-operation="expenses"]');
  await capture("06-billing", `${home}#home-finance-billing`, '[data-home-finance-operation="billing"]');
  await capture("07-ar", `${home}#home-finance-ar`, '[data-home-finance-operation="ar"]');
  await capture("08-matter-context-redirect", `${origin}/?view=matters&ctx=allow&matter_id=matter-evidence-001#matter-billing`, '[data-home-finance-operation="billing"]');
  guarded = true;
  await capture("09-denied", `${origin}/?view=home&ctx=denied#home-finance-overview`, '[data-home-finance-state="denied"]');
} finally {
  await browser.close();
  await server.close();
}

const receiptPath = resolve(artifactDir, "browser-evidence-receipt.json");
writeFileSync(receiptPath, `${JSON.stringify({
  schema_version: "law-firm-os.home-finance-browser-evidence.v0.1",
  generated_at: new Date().toISOString(),
  status: "passed",
  evidence,
  fixture_mode: "browser_mocked_api_contract",
  packaged_app_claim: false,
  production_ready_claim: false,
  public_release_claim: false,
  go_live_claim: false,
}, null, 2)}\n`);
console.log(JSON.stringify({ verdict: "PASS", receipt: receiptPath.slice(repoRoot.length + 1), screenshot_count: evidence.length }, null, 2));
