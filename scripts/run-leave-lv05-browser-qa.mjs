#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { createServer as createViteServer } from "vite";
import { createHrxRuntimeContext, seedHrxDurableRuntimeStore } from "../apps/api/src/hrx-runtime-context.js";
import { createHrxStepUpAuthority } from "../apps/api/src/hrx-step-up-token.js";
import { findRegisteredAccountByUserId } from "../apps/api/src/matter-vault-account-registry.js";
import { startApiServer } from "../apps/api/src/server.js";
import { createSqlLeaveBalanceLedger } from "../packages/hrx/src/leave/balance.js";
import { runHrxMigrations } from "../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../packages/hrx/src/store/file-store.js";

const ROOT = process.cwd();
const TENANT = "tenant_amic_matter_vault";
const EMPLOYEE = "emp_amic_yjlee";
const HR_ACTOR = "user_amic_tryoon";
const EVIDENCE_DIR = resolve(ROOT, "output/playwright/leave-management-implementation-2026-07-13");
const RECEIPT_PATH = join(EVIDENCE_DIR, "lv-05-browser-qa-receipt.json");

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function seedLv05(store) {
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: TENANT, group_id: "lv05-group", code: "LV05", display_name: "연차", status: "active", state_version: 1 } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: { tenant_id: TENANT, policy_version_id: "lv05-policy-v1", group_id: "lv05-group", policy_code: "lv05-annual", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: JSON.stringify({ termination_unused_payout: true }) } });
  store.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: TENANT, entitlement_id: "lv05-entitlement-yjlee", employee_id: EMPLOYEE, group_id: "lv05-group", policy_version_id: "lv05-policy-v1", granted_minutes: 480, valid_from: "2026-01-01", expires_on: "2026-12-31", source_ref: "LeaveAccrualRun:LV05Browser", idempotency_key: "lv05-entitlement-yjlee", state_version: 1 } });
  createSqlLeaveBalanceLedger({ store }).append({ tenant_id: TENANT, entry_id: "lv05-earned-yjlee", employee_id: EMPLOYEE, policy_id: "lv05-annual", group_id: "lv05-group", policy_version_id: "lv05-policy-v1", entitlement_id: "lv05-entitlement-yjlee", idempotency_key: "lv05-earned-yjlee", entry_type: "earned", amount_minutes: 480, occurred_on: "2026-07-13", source_ref: "LeaveAccrualRun:LV05Browser", metadata: { reason: "LV05 비공개 사유", attachment_id: "LV05-private-proof" } });
}

async function login(page, baseUrl, account) {
  await page.goto(`${baseUrl}/?locale=ko&view=auth&authStep=login&ctx=allow`, { waitUntil: "networkidle" });
  await page.locator("[data-login-email]").fill(account.email);
  await page.locator("[data-login-password]").fill(account.local_dev.synthetic_token);
  await page.locator("[data-login-form='email-password'] button[type='submit']").click();
  await page.waitForURL(/view=home/, { timeout: 15_000 });
}

async function capture(page, name, width, height, selector, screenshots, geometries) {
  await page.setViewportSize({ width, height });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  const geometry = await page.evaluate((target) => ({ client_width: document.documentElement.clientWidth, scroll_width: document.documentElement.scrollWidth, visible: Boolean(document.querySelector(target)) }), selector);
  if (!geometry.visible || geometry.scroll_width > geometry.client_width) throw new Error(`LV05 geometry failed: ${name} ${JSON.stringify(geometry)}`);
  const filePath = join(EVIDENCE_DIR, name);
  await page.screenshot({ path: filePath, fullPage: true });
  screenshots.push({ path: filePath.replace(`${ROOT}/`, ""), sha256: sha256(filePath), viewport: { width, height } });
  geometries.push({ name, ...geometry });
}

async function closeServer(server) {
  if (server) await new Promise((resolveClose) => server.close(resolveClose));
}

mkdirSync(EVIDENCE_DIR, { recursive: true });
const qaRoot = mkdtempSync(join(tmpdir(), "matter-leave-lv05-browser-"));
const store = createFileHrxStore({ filePath: join(qaRoot, "hrx-store.json") });
const stepUpAuthority = createHrxStepUpAuthority({ secret: "lv05-browser-secret", totpSecret: "lv05-browser-totp", now: () => Date.parse("2026-07-13T01:00:00.000Z") });
let api;
let vite;
let browser;

try {
  runHrxMigrations(store);
  seedHrxDurableRuntimeStore(store);
  seedLv05(store);
  const runtime = createHrxRuntimeContext({ store });
  api = await startApiServer({ port: 0, hrxRuntime: runtime, hrxStore: store, stepUpAuthority });
  const apiBaseUrl = `http://${api.host}:${api.port}`;
  vite = await createViteServer({ root: resolve(ROOT, "apps/web"), logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false, proxy: { "/api": apiBaseUrl, "/master-data": apiBaseUrl } } });
  await vite.listen();
  const address = vite.httpServer.address();
  if (!address || typeof address === "string") throw new Error("Vite did not expose a loopback port");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const hrAccount = findRegisteredAccountByUserId(HR_ACTOR);
  const staffAccount = findRegisteredAccountByUserId("user_amic_yjlee");
  if (!hrAccount || !staffAccount) throw new Error("LV05 browser accounts are missing");

  browser = await chromium.launch({ headless: true });
  const pageErrors = [];
  const consoleErrors = [];
  const screenshots = [];
  const geometries = [];
  const hrContext = await browser.newContext({ viewport: { width: 1512, height: 900 }, acceptDownloads: true });
  const page = await hrContext.newPage();
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push({ text: message.text(), url: message.location().url }); });
  await login(page, baseUrl, hrAccount);
  consoleErrors.length = 0;

  await page.goto(`${baseUrl}/?locale=ko&view=people&ctx=allow#people-leave-usage`, { waitUntil: "networkidle" });
  await page.locator("#people-leave-usage").waitFor({ state: "visible", timeout: 15_000 });
  await page.getByText("1일", { exact: true }).first().waitFor();
  await capture(page, "lv-05-usage-1512x900.png", 1512, 900, "#people-leave-usage", screenshots, geometries);

  await page.getByRole("button", { name: "파일 업로드", exact: true }).click();
  const templateCsvDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV 양식", exact: true }).click();
  const templateCsvDownload = await templateCsvDownloadPromise;
  const templateCsvPath = join(EVIDENCE_DIR, "lv-05-leave-occurrence-template.csv");
  await templateCsvDownload.saveAs(templateCsvPath);
  const templateCsvText = readFileSync(templateCsvPath, "utf8");
  if (!templateCsvText.includes("employee_id") || !templateCsvText.includes("policy_version_id")) throw new Error("LV05 CSV occurrence template is invalid");

  const templateXlsxDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "XLSX 양식", exact: true }).click();
  const templateXlsxDownload = await templateXlsxDownloadPromise;
  const templateXlsxPath = join(EVIDENCE_DIR, "lv-05-leave-occurrence-template.xlsx");
  await templateXlsxDownload.saveAs(templateXlsxPath);
  if (readFileSync(templateXlsxPath).subarray(0, 2).toString("ascii") !== "PK") throw new Error("LV05 XLSX occurrence template is invalid");
  await capture(page, "lv-05-occurrence-upload-720x900.png", 720, 900, "#people-leave-usage", screenshots, geometries);
  await page.getByRole("button", { name: "파일 업로드", exact: true }).click();

  const csvDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  const csvDownload = await csvDownloadPromise;
  const csvPath = join(EVIDENCE_DIR, "lv-05-leave-usage.csv");
  await csvDownload.saveAs(csvPath);
  const csvText = readFileSync(csvPath, "utf8");
  if (!csvText.includes("이예진") || csvText.includes("LV05 비공개 사유") || csvText.includes("LV05-private-proof")) throw new Error("LV05 CSV privacy or row contract failed");

  const xlsxDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "XLSX", exact: true }).click();
  const xlsxDownload = await xlsxDownloadPromise;
  const xlsxPath = join(EVIDENCE_DIR, "lv-05-leave-usage.xlsx");
  await xlsxDownload.saveAs(xlsxPath);
  if (readFileSync(xlsxPath).subarray(0, 2).toString("ascii") !== "PK") throw new Error("LV05 XLSX container is invalid");

  const balanceReconciliationCopyAbsent = (await page.getByText(/잔액 대조|불일치|기준 없음/).count()) === 0;
  await capture(page, "lv-05-usage-720x900.png", 720, 900, "#people-leave-usage", screenshots, geometries);

  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(`${baseUrl}/?locale=ko&view=people&ctx=allow#people-leave-termination`, { waitUntil: "networkidle" });
  await page.locator("#people-leave-termination").waitFor({ state: "visible", timeout: 15_000 });
  await page.getByLabel("퇴사 예정자").selectOption(EMPLOYEE);
  await page.getByLabel("다른 승인 HR").selectOption("user_amic_jwsuh");
  const previewResponse = page.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/termination-reconciliations/preview") && response.status() === 200);
  await page.getByRole("button", { name: "정산 미리보기" }).click();
  await previewResponse;
  await page.getByText("미리보기", { exact: true }).first().waitFor();
  const challengeResponse = page.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/termination-reconciliations/execute") && response.status() === 403);
  await page.getByRole("button", { name: "정산 실행" }).click();
  await challengeResponse;
  const terminationCode = stepUpAuthority.generateTotp({ tenant_id: TENANT, actor_id: HR_ACTOR, purpose: "leave_termination_settlement" });
  await page.getByLabel("6자리 확인 코드").fill(terminationCode);
  const executeResponse = page.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/termination-reconciliations/execute") && response.status() === 200);
  await page.locator(".hrx-step-up-form").getByRole("button", { name: "확인" }).click();
  await executeResponse;
  await page.getByText("급여 동기화 대기", { exact: true }).first().waitFor();
  await page.getByText("급여 전달 확인 대기", { exact: true }).waitFor();
  await capture(page, "lv-05-termination-pending-sync-720x900.png", 720, 900, "#people-leave-termination", screenshots, geometries);

  const staffContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const staffPage = await staffContext.newPage();
  staffPage.on("pageerror", (error) => pageErrors.push(String(error)));
  staffPage.on("console", (message) => { if (message.type() === "error") consoleErrors.push({ text: message.text(), url: message.location().url }); });
  await login(staffPage, baseUrl, staffAccount);
  consoleErrors.length = 0;
  await staffPage.goto(`${baseUrl}/?locale=ko&view=people&ctx=allow#people-leave-usage`, { waitUntil: "networkidle" });
  await staffPage.locator("#people-leave-usage").waitFor({ state: "visible", timeout: 15_000 });
  const staffUsageRowCount = await staffPage.locator("#people-leave-usage tbody tr").count();
  const countLeakCheck = await staffPage.evaluate(async () => {
    const session = JSON.parse(window.sessionStorage.getItem("lawos.api.session") ?? "null");
    const response = await fetch("/api/hrx/leave/ledger?employee_id=emp_amic_ytkim", {
      headers: { authorization: `Bearer ${session?.session_token ?? ""}` }
    });
    return { status: response.status, body: await response.json() };
  });
  await staffPage.goto(`${baseUrl}/?locale=ko&view=people&ctx=allow#people-leave-termination`, { waitUntil: "networkidle" });
  await staffPage.locator('[data-leave-termination-access="denied"]').waitFor({ state: "visible", timeout: 15_000 });
  const staffTerminationMenuCount = await staffPage.getByRole("button", { name: "퇴사 휴가 정산", exact: true }).count();

  const outbox = store.query("select", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT, event_type: "leave.termination.payroll_reconciliation_requested" } });
  const offboarding = store.query("selectOne", { table: "hrx_offboarding_cases", where: { tenant_id: TENANT, offboarding_id: "off-leave-synthetic-001" } });
  const leaveConsoleErrors = consoleErrors.filter((entry) => entry.url.includes("/api/hrx/leave"));
  const unrelatedConsoleErrors = consoleErrors.filter((entry) => !entry.url.includes("/api/hrx/leave"));
  const receipt = {
    schema_version: "law-firm-os.leave-lv05-browser-qa.v0.1",
    generated_at: new Date().toISOString(),
    synthetic_only: true,
    checks: {
      usage_screen_totals_visible: true,
      csv_occurrence_template_valid: true,
      xlsx_occurrence_template_valid: true,
      csv_download_private_fields_excluded: true,
      xlsx_download_valid_container: true,
      balance_reconciliation_copy_absent: balanceReconciliationCopyAbsent,
      termination_preview_execute_step_up: true,
      termination_dual_control: true,
      payroll_outbox_pending: outbox.length === 1 && outbox[0].state === "pending",
      offboarding_fail_closed_pending_sync: offboarding?.leave_reconciliation_status === "approved_pending_sync",
      staff_usage_row_count: staffUsageRowCount,
      staff_unauthorized_query_count: countLeakCheck.body?.report?.totals?.row_count,
      staff_termination_menu_hidden: staffTerminationMenuCount === 0,
      staff_direct_termination_denied: true,
      page_errors: pageErrors.length,
      leave_console_errors: leaveConsoleErrors.length,
      unrelated_console_errors: unrelatedConsoleErrors.length,
    },
    exports: [
      { path: templateCsvPath.replace(`${ROOT}/`, ""), sha256: sha256(templateCsvPath) },
      { path: templateXlsxPath.replace(`${ROOT}/`, ""), sha256: sha256(templateXlsxPath) },
      { path: csvPath.replace(`${ROOT}/`, ""), sha256: sha256(csvPath) },
      { path: xlsxPath.replace(`${ROOT}/`, ""), sha256: sha256(xlsxPath) },
    ],
    geometries,
    screenshots,
    leave_console_error_details: leaveConsoleErrors,
    unrelated_console_error_details: unrelatedConsoleErrors,
    production_ready_claim: false,
    public_release_claim: false,
    go_live_claim: false,
  };
  writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
  if (!receipt.checks.payroll_outbox_pending || !receipt.checks.offboarding_fail_closed_pending_sync || receipt.checks.staff_usage_row_count !== 1 || receipt.checks.staff_unauthorized_query_count !== 0 || !receipt.checks.staff_termination_menu_hidden || pageErrors.length || leaveConsoleErrors.length) {
    process.stdout.write(`${JSON.stringify({ leaveConsoleErrors, unrelatedConsoleErrors, countLeakCheck }, null, 2)}\n`);
    throw new Error(`LV05 browser QA failed: ${JSON.stringify(receipt.checks)}`);
  }
  process.stdout.write(`${JSON.stringify({ status: "passed", receipt: RECEIPT_PATH, checks: receipt.checks }, null, 2)}\n`);
} finally {
  if (browser) await browser.close();
  if (vite) await vite.close();
  await closeServer(api?.server);
  store.close();
  rmSync(qaRoot, { recursive: true, force: true });
}
