#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { createServer as createViteServer } from "vite";
import { createHrxRuntimeContext, seedHrxDurableRuntimeStore } from "../apps/api/src/hrx-runtime-context.js";
import { findRegisteredAccountByUserId } from "../apps/api/src/matter-vault-account-registry.js";
import { startApiServer } from "../apps/api/src/server.js";
import { createSqlLeaveBalanceLedger } from "../packages/hrx/src/leave/balance.js";
import { runHrxMigrations } from "../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../packages/hrx/src/store/file-store.js";

const ROOT = process.cwd();
const TENANT = "tenant_amic_matter_vault";
const EMPLOYEES = ["emp_amic_yjlee", "emp_amic_ytkim"];
const EVIDENCE_DIR = resolve(ROOT, "output/playwright/leave-management-implementation-2026-07-13");
const RECEIPT_PATH = join(EVIDENCE_DIR, "lv-06-browser-qa-receipt.json");

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function seedLv06(store) {
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: TENANT, group_id: "lv06-group", code: "LV06_ANNUAL", display_name: "연차", status: "active", state_version: 1 } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: { tenant_id: TENANT, policy_version_id: "lv06-policy-v1", group_id: "lv06-group", policy_code: "LV06-ANNUAL-2026", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: JSON.stringify({ promotion: { standard_day_minutes: 480, minimum_unused_minutes: 4800 } }) } });
  const ledger = createSqlLeaveBalanceLedger({ store });
  for (const employeeId of EMPLOYEES) {
    store.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: TENANT, entitlement_id: `lv06-entitlement-${employeeId}`, employee_id: employeeId, group_id: "lv06-group", policy_version_id: "lv06-policy-v1", granted_minutes: 7200, valid_from: "2026-01-01", expires_on: "2026-12-31", source_ref: `LeaveAccrualRun:LV06Browser:${employeeId}`, idempotency_key: `lv06-entitlement-${employeeId}`, state_version: 1 } });
    const common = { tenant_id: TENANT, employee_id: employeeId, policy_id: "LV06-ANNUAL-2026", group_id: "lv06-group", policy_version_id: "lv06-policy-v1", entitlement_id: `lv06-entitlement-${employeeId}`, occurred_on: "2026-06-30", source_ref: `LeaveAccrualRun:LV06Browser:${employeeId}` };
    for (const [suffix, entryType, amountMinutes] of [["earned", "earned", 7200], ["reserved", "reserved", 960], ["released", "released", 480], ["used", "used", 480], ["expired", "expired", 480]]) {
      ledger.append({ ...common, entry_id: `lv06-${suffix}-${employeeId}`, idempotency_key: `lv06-${suffix}-${employeeId}`, entry_type: entryType, amount_minutes: amountMinutes });
    }
  }
}

async function login(page, baseUrl, account) {
  await page.goto(`${baseUrl}/?locale=ko&view=auth&authStep=login&ctx=allow`, { waitUntil: "networkidle" });
  await page.locator("[data-login-email]").fill(account.email);
  await page.locator("[data-login-password]").fill(account.local_dev.synthetic_token);
  await page.locator("[data-login-form='email-password'] button[type='submit']").click();
  await page.waitForURL(/view=home/, { timeout: 15_000 });
}

async function capture(page, name, width, height, screenshots, geometries) {
  await page.setViewportSize({ width, height });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  const geometry = await page.evaluate(() => ({ client_width: document.documentElement.clientWidth, scroll_width: document.documentElement.scrollWidth, visible: Boolean(document.querySelector("#people-annual-leave-notices")) }));
  if (!geometry.visible || geometry.scroll_width > geometry.client_width) throw new Error(`LV06 geometry failed: ${name} ${JSON.stringify(geometry)}`);
  const filePath = join(EVIDENCE_DIR, name);
  await page.screenshot({ path: filePath, fullPage: true });
  screenshots.push({ path: filePath.replace(`${ROOT}/`, ""), sha256: sha256(filePath), viewport: { width, height } });
  geometries.push({ name, ...geometry });
}

async function recordEvidence(page, { stage, eventType, receipt = "", digest }) {
  const form = page.locator("[data-leave-promotion-evidence='true']");
  await form.waitFor({ state: "visible", timeout: 15_000 });
  await form.getByLabel("증거 단계").selectOption(stage);
  await form.getByLabel("증거 결과").selectOption(eventType);
  if (eventType === "delivered") await form.getByLabel("전달 확인 번호").fill(receipt);
  await form.getByLabel("증거 SHA-256").fill(digest);
  const response = page.waitForResponse((value) => value.url().includes("/api/hrx/leave/promotion-recipients/") && value.url().endsWith("/evidence") && value.status() === 200);
  await form.getByRole("button", { name: "증거 기록" }).click();
  await response;
  await page.waitForTimeout(150);
}

async function closeServer(server) {
  if (server) await new Promise((resolveClose) => server.close(resolveClose));
}

mkdirSync(EVIDENCE_DIR, { recursive: true });
const qaRoot = mkdtempSync(join(tmpdir(), "matter-leave-lv06-browser-"));
const store = createFileHrxStore({ filePath: join(qaRoot, "hrx-store.json") });
let api;
let vite;
let browser;
let now = "2026-07-05T01:00:00.000Z";

try {
  runHrxMigrations(store);
  seedHrxDurableRuntimeStore(store);
  seedLv06(store);
  const runtime = createHrxRuntimeContext({ store, clock: () => now });
  api = await startApiServer({ port: 0, hrxRuntime: runtime, hrxStore: store });
  const apiBaseUrl = `http://${api.host}:${api.port}`;
  vite = await createViteServer({ root: resolve(ROOT, "apps/web"), logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false, proxy: { "/api": apiBaseUrl, "/master-data": apiBaseUrl } } });
  await vite.listen();
  const address = vite.httpServer.address();
  if (!address || typeof address === "string") throw new Error("Vite did not expose a loopback port");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const adminAccount = findRegisteredAccountByUserId("user_amic_jwsuh");
  const staffAccount = findRegisteredAccountByUserId("user_amic_yjlee");
  if (!adminAccount || !staffAccount) throw new Error("LV06 browser accounts are missing");

  browser = await chromium.launch({ headless: true });
  const pageErrors = [];
  const consoleErrors = [];
  const screenshots = [];
  const geometries = [];
  const adminContext = await browser.newContext({ viewport: { width: 1512, height: 900 } });
  const page = await adminContext.newPage();
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push({ text: message.text(), url: message.location().url }); });
  await login(page, baseUrl, adminAccount);
  consoleErrors.length = 0;
  await page.goto(`${baseUrl}/?locale=ko&view=people&ctx=allow#people-annual-leave-notices`, { waitUntil: "networkidle" });
  await page.locator("#people-annual-leave-notices").waitFor({ state: "visible", timeout: 15_000 });
  await page.getByLabel("연차 정책").selectOption("lv06-policy-v1");
  const previewResponse = page.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/promotion-campaigns/preview") && response.status() === 200);
  await page.getByRole("button", { name: "대상 미리보기" }).click();
  await previewResponse;
  await page.locator("[data-leave-promotion-preview='true']").waitFor();
  await page.getByText("2명", { exact: true }).waitFor();
  await page.getByText("2026-07-01", { exact: true }).waitFor();
  await capture(page, "lv-06-promotion-preview-1512x900.png", 1512, 900, screenshots, geometries);

  const createResponse = page.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/promotion-campaigns") && response.request().method() === "POST" && response.status() === 201);
  await page.getByRole("button", { name: "캠페인 저장" }).click();
  await createResponse;
  await page.locator("[data-promotion-recipient-id]").nth(1).waitFor();
  const recipients = page.locator("[data-promotion-recipient-id]");

  let first = recipients.nth(0);
  let response = page.waitForResponse((value) => value.url().endsWith("/first-notice") && value.status() === 200);
  await first.getByRole("button", { name: "1차", exact: true }).click();
  await response;
  await recordEvidence(page, { stage: "first", eventType: "delivered", receipt: "lv06-delivery-first-1", digest: "a".repeat(64) });
  first = recipients.nth(0);
  const processing = page.locator("[data-leave-promotion-evidence='true']");
  await processing.locator("input[type='date']").fill("2026-09-14");
  response = page.waitForResponse((value) => value.url().endsWith("/response") && value.status() === 200);
  await processing.getByRole("button", { name: "응답 기록", exact: true }).click();
  await response;
  await page.waitForTimeout(150);

  let second = recipients.nth(1);
  response = page.waitForResponse((value) => value.url().endsWith("/first-notice") && value.status() === 200);
  await second.getByRole("button", { name: "1차", exact: true }).click();
  await response;
  await recordEvidence(page, { stage: "first", eventType: "failed", digest: "b".repeat(64) });
  await recordEvidence(page, { stage: "first", eventType: "delivered", receipt: "lv06-delivery-first-2", digest: "c".repeat(64) });

  now = "2026-07-16T01:00:00.000Z";
  second = recipients.nth(1);
  response = page.waitForResponse((value) => value.url().endsWith("/second-notice") && value.status() === 200);
  await second.getByRole("button", { name: "2차", exact: true }).click();
  await response;
  await recordEvidence(page, { stage: "second", eventType: "delivered", receipt: "lv06-delivery-second-2", digest: "d".repeat(64) });
  await page.getByText("2차 열람 확인 대기", { exact: true }).waitFor();
  await recordEvidence(page, { stage: "second", eventType: "viewed", digest: "e".repeat(64) });
  await page.getByText("2차 증거 확인", { exact: true }).waitFor();
  await capture(page, "lv-06-promotion-evidence-720x900.png", 720, 900, screenshots, geometries);

  const staffContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const staffPage = await staffContext.newPage();
  staffPage.on("pageerror", (error) => pageErrors.push(String(error)));
  staffPage.on("console", (message) => { if (message.type() === "error") consoleErrors.push({ text: message.text(), url: message.location().url }); });
  await login(staffPage, baseUrl, staffAccount);
  consoleErrors.length = 0;
  const staffMenuCount = await staffPage.getByRole("button", { name: "연차 사용 촉진", exact: true }).count();
  await staffPage.goto(`${baseUrl}/?locale=ko&view=people&ctx=allow#people-annual-leave-notices`, { waitUntil: "networkidle" });
  await staffPage.locator("[data-leave-promotion-access='denied']").waitFor({ state: "visible", timeout: 15_000 });

  const campaignRows = store.query("select", { table: "hrx_leave_promotion_campaigns", where: { tenant_id: TENANT } });
  const recipientRows = store.query("select", { table: "hrx_leave_promotion_recipients", where: { tenant_id: TENANT } });
  const documentRows = store.query("select", { table: "hrx_documents", where: { tenant_id: TENANT, document_type: "annual_leave_promotion_notice" } });
  const auditRows = store.query("select", { table: "hrx_audit_events", where: { tenant_id: TENANT } });
  const leaveConsoleErrors = consoleErrors.filter((entry) => entry.url.includes("/api/hrx/leave"));
  const unrelatedConsoleErrors = consoleErrors.filter((entry) => !entry.url.includes("/api/hrx/leave"));
  const responseRecipient = recipientRows.find((row) => row.state === "employee_responded");
  const secondRecipient = recipientRows.find((row) => row.state === "second_notice_viewed");
  const receipt = {
    schema_version: "law-firm-os.leave-lv06-browser-qa.v0.1",
    generated_at: new Date().toISOString(),
    synthetic_only: true,
    checks: {
      target_count: campaignRows[0]?.target_count,
      source_snapshot_present: Boolean(campaignRows[0]?.source_version && campaignRows[0]?.calculation_snapshot_hash),
      statutory_deadlines_separate: Boolean(recipientRows.every((row) => row.first_notice_deadline_at && row.second_notice_deadline_at)),
      first_response_recorded: responseRecipient?.compliance_state === "employee_response_recorded_pending_legal_review",
      failed_delivery_not_lost: auditRows.some((row) => row.action === "hrx.leave.promotion.first_notice.failed"),
      second_delivery_required_view: secondRecipient?.compliance_state === "evidence_complete_pending_legal_review" && Boolean(secondRecipient?.second_delivered_at && secondRecipient?.second_viewed_at),
      document_metadata_only: documentRows.length === 3 && documentRows.every((row) => row.document_body_included === false && row.source_status === "verified" && !("body" in row) && !("content" in row)),
      legal_review_remains_required: campaignRows[0]?.legal_review_state === "required",
      staff_menu_hidden: staffMenuCount === 0,
      staff_direct_route_denied: true,
      page_errors: pageErrors.length,
      leave_console_errors: leaveConsoleErrors.length,
      unrelated_console_errors: unrelatedConsoleErrors.length,
    },
    geometries,
    screenshots,
    leave_console_error_details: leaveConsoleErrors,
    unrelated_console_error_details: unrelatedConsoleErrors,
    production_ready_claim: false,
    public_release_claim: false,
    go_live_claim: false,
  };
  writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
  if (receipt.checks.target_count !== 2 || !receipt.checks.source_snapshot_present || !receipt.checks.statutory_deadlines_separate || !receipt.checks.first_response_recorded || !receipt.checks.failed_delivery_not_lost || !receipt.checks.second_delivery_required_view || !receipt.checks.document_metadata_only || !receipt.checks.legal_review_remains_required || !receipt.checks.staff_menu_hidden || pageErrors.length || leaveConsoleErrors.length) {
    throw new Error(`LV06 browser QA failed: ${JSON.stringify(receipt.checks)}`);
  }
  process.stdout.write(`${JSON.stringify({ status: "passed", receipt: RECEIPT_PATH, checks: receipt.checks }, null, 2)}\n`);
} finally {
  if (browser) await browser.close();
  if (vite) await vite.close();
  await closeServer(api?.server);
  store.close();
  rmSync(qaRoot, { recursive: true, force: true });
}
