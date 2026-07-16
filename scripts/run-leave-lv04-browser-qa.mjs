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
import { runHrxMigrations } from "../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../packages/hrx/src/store/file-store.js";

const ROOT = process.cwd();
const TENANT = "tenant_amic_matter_vault";
const EMPLOYEE = "emp_amic_yjlee";
const HR_ACTOR = "user_amic_tryoon";
const EVIDENCE_DIR = resolve(ROOT, "output/playwright/leave-management-implementation-2026-07-13");
const RECEIPT_PATH = join(EVIDENCE_DIR, "lv-04-browser-qa-receipt.json");

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function seedLv04(store) {
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: TENANT, group_id: "lv04-group", code: "LV04", display_name: "발생 휴가", status: "active", state_version: 1 } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: { tenant_id: TENANT, policy_version_id: "lv04-policy-v1", group_id: "lv04-group", policy_code: "lv04-annual", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: "{}" } });
  store.query("insert", { table: "hrx_work_schedule_profiles", row: { tenant_id: TENANT, schedule_profile_id: "lv04-schedule", display_name: "서울 표준 근무", timezone: "Asia/Seoul", weekly_schedule_json: JSON.stringify(Object.fromEntries([1, 2, 3, 4, 5].map((day) => [day, [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }]]))), holiday_calendar_ref: "KR_PUBLIC_HOLIDAYS", effective_from: "2026-01-01", effective_to: null, state_version: 1 } });
  store.query("insert", { table: "hrx_work_schedule_assignments", row: { tenant_id: TENANT, schedule_assignment_id: "lv04-schedule-yjlee", schedule_profile_id: "lv04-schedule", employee_id: EMPLOYEE, organization_id: null, priority: 100, effective_from: "2026-01-01", effective_to: null } });
  store.query("insert", { table: "hrx_attendance_records", row: { tenant_id: TENANT, attendance_id: "lv04-attendance-yjlee", employee_id: EMPLOYEE, work_date: "2026-07-01", status: "present", source_ref: "SyntheticAttendance:LV04Browser", source_kind: "manual", recorded_hours: 8 } });
  store.query("insert", { table: "hrx_documents", row: { tenant_id: TENANT, document_id: "lv04-manual-proof", employee_id: EMPLOYEE, document_type: "leave_adjustment_evidence", source_ref: "SyntheticDocument:LV04Browser", source_status: "verified", source_metadata_json: "{}", title: "LV04 합성 조정 근거", document_body_included: false } });
  store.query("insert", { table: "hrx_leave_accrual_rules", row: { tenant_id: TENANT, accrual_rule_id: "lv04-fixed-rule", rule_code: "LV04_FIXED", display_name: "LV04 합성 자동 발생", policy_version_id: "lv04-policy-v1", rule_json: JSON.stringify({ basis: "fixed_amount", schedule: "fixed_annual_date", annual_date: "07-13", amount_minutes: 480, minutes_per_day: 480, expiration_months: 12, attendance_source_required: true, prorate_reduced_schedule: true }), status: "active", effective_from: "2026-01-01", effective_to: null, state_version: 1, created_at: "2026-07-13T00:00:00.000Z", updated_at: "2026-07-13T00:00:00.000Z" } });
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
  if (!geometry.visible || geometry.scroll_width > geometry.client_width) throw new Error(`LV04 geometry failed: ${name} ${JSON.stringify(geometry)}`);
  const filePath = join(EVIDENCE_DIR, name);
  await page.screenshot({ path: filePath, fullPage: true });
  screenshots.push({ path: filePath.replace(`${ROOT}/`, ""), sha256: sha256(filePath), viewport: { width, height } });
  geometries.push({ name, ...geometry });
}

async function closeServer(server) {
  if (server) await new Promise((resolveClose) => server.close(resolveClose));
}

mkdirSync(EVIDENCE_DIR, { recursive: true });
const qaRoot = mkdtempSync(join(tmpdir(), "matter-leave-lv04-browser-"));
const store = createFileHrxStore({ filePath: join(qaRoot, "hrx-store.json") });
const stepUpAuthority = createHrxStepUpAuthority({ secret: "lv04-browser-secret", totpSecret: "lv04-browser-totp", now: () => Date.parse("2026-07-13T01:00:00.000Z") });
let api;
let vite;
let browser;

try {
  runHrxMigrations(store);
  seedHrxDurableRuntimeStore(store);
  seedLv04(store);
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
  if (!hrAccount || !staffAccount) throw new Error("LV04 browser accounts are missing");

  browser = await chromium.launch({ headless: true });
  const pageErrors = [];
  const consoleErrors = [];
  const screenshots = [];
  const geometries = [];
  const hrContext = await browser.newContext({ viewport: { width: 1512, height: 900 } });
  const page = await hrContext.newPage();
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push({ text: message.text(), url: message.location().url }); });
  await login(page, baseUrl, hrAccount);
  consoleErrors.length = 0;

  await page.goto(`${baseUrl}/?locale=ko&view=people&ctx=allow#people-leave-accrual-auto`, { waitUntil: "networkidle" });
  await page.locator("#people-leave-accrual-auto").waitFor({ state: "visible", timeout: 15_000 });
  await page.getByLabel("실행 방식").selectOption("single");
  await page.locator('select[aria-label="발생 규칙"]').selectOption("lv04-fixed-rule");
  await page.getByLabel("기간 키").fill("2026");
  await page.getByLabel("발생일").fill("2026-07-13");
  const previewResponse = page.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/accrual/preview") && response.request().method() === "POST");
  await page.getByRole("button", { name: "미리보기" }).click();
  if ((await previewResponse).status() !== 200) throw new Error("LV04 automatic preview failed");
  await page.getByText("발생 예정", { exact: true }).first().waitFor();
  await capture(page, "lv-04-auto-preview-1512x900.png", 1512, 900, "#people-leave-accrual-auto", screenshots, geometries);

  const challengeResponse = page.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/accrual/execute") && response.status() === 403);
  await page.getByRole("button", { name: "원장에 반영" }).click();
  await challengeResponse;
  const autoCode = stepUpAuthority.generateTotp({ tenant_id: TENANT, actor_id: HR_ACTOR, purpose: "leave_accrual_execute" });
  await page.getByLabel("6자리 확인 코드").fill(autoCode);
  const executeResponse = page.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/accrual/execute") && response.status() === 200);
  await page.locator(".hrx-step-up-form").getByRole("button", { name: "확인" }).click();
  const firstExecuteBody = await (await executeResponse).json();
  await page.getByText("발생 완료", { exact: true }).first().waitFor();
  const earnedAfterFirst = store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "earned" } }).filter((entry) => entry.source_ref.startsWith("LeaveAccrualRun:")).length;
  const rerunResponse = page.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/accrual/execute") && response.status() === 200);
  await page.getByRole("button", { name: "원장에 반영" }).click();
  const rerunBody = await (await rerunResponse).json();
  const earnedAfterRerun = store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "earned" } }).filter((entry) => entry.source_ref.startsWith("LeaveAccrualRun:")).length;
  await page.getByText("기발생", { exact: true }).first().waitFor();
  await capture(page, "lv-04-auto-rerun-720x900.png", 720, 900, "#people-leave-accrual-auto", screenshots, geometries);

  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(`${baseUrl}/?locale=ko&view=people&ctx=allow#people-leave-accrual-manual`, { waitUntil: "networkidle" });
  await page.locator("#people-leave-accrual-manual").waitFor({ state: "visible", timeout: 15_000 });
  await page.getByLabel("근거 문서").selectOption("lv04-manual-proof");
  await page.getByLabel("조정량(분)").fill("240");
  await page.getByLabel("조정 사유").fill("LV04 합성 조정 검증");
  const manualPreviewResponse = page.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/accrual/manual/preview"));
  await page.getByRole("button", { name: "행 검증" }).click();
  if ((await manualPreviewResponse).status() !== 200) throw new Error("LV04 manual preview failed");
  await page.getByText("반영 가능", { exact: true }).waitFor();
  await page.getByLabel("승인 HR").selectOption("user_amic_jwsuh");
  const manualChallenge = page.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/accrual/manual/execute") && response.status() === 403);
  await page.getByRole("button", { name: "원장 조정 반영" }).click();
  await manualChallenge;
  const ledgerCode = stepUpAuthority.generateTotp({ tenant_id: TENANT, actor_id: HR_ACTOR, purpose: "leave_ledger_adjustment" });
  await page.getByLabel("6자리 확인 코드").fill(ledgerCode);
  const manualExecuteResponse = page.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/accrual/manual/execute") && response.status() === 200);
  await page.locator(".hrx-step-up-form").getByRole("button", { name: "확인" }).click();
  await manualExecuteResponse;
  await page.getByText("반영 완료", { exact: true }).waitFor();
  await capture(page, "lv-04-manual-complete-720x900.png", 720, 900, "#people-leave-accrual-manual", screenshots, geometries);

  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(`${baseUrl}/?locale=ko&view=people&ctx=allow#people-leave-accrual-auto`, { waitUntil: "networkidle" });
  await page.locator("#people-leave-accrual-auto").waitFor({ state: "visible", timeout: 15_000 });
  const originalRuleRow = page.locator(".leave-accrual-rule-table tbody tr").filter({ hasText: "LV04 합성 자동 발생" }).first();
  await originalRuleRow.getByRole("button", { name: "새 버전", exact: true }).click();
  await page.getByLabel("규칙 이름").fill("LV04 합성 자동 발생 v2");
  const versionChallenge = page.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/accrual/rules/lv04-fixed-rule") && response.request().method() === "PATCH" && response.status() === 403);
  await page.getByRole("button", { name: "새 버전 저장", exact: true }).click();
  await versionChallenge;
  const versionCode = stepUpAuthority.generateTotp({ tenant_id: TENANT, actor_id: HR_ACTOR, purpose: "leave_accrual_execute" });
  await page.getByLabel("6자리 확인 코드").fill(versionCode);
  const versionResponse = page.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/accrual/rules/lv04-fixed-rule") && response.request().method() === "PATCH" && response.status() === 201);
  await page.locator(".hrx-step-up-form").getByRole("button", { name: "확인" }).click();
  const versionBody = await (await versionResponse).json();
  const versionRuleId = versionBody.rule.accrual_rule_id;
  const versionRuleRow = page.locator(".leave-accrual-rule-table tbody tr").filter({ hasText: "LV04 합성 자동 발생 v2" });
  await versionRuleRow.getByText("v2", { exact: true }).waitFor();
  const deactivateResponse = page.waitForResponse((response) => response.url().endsWith(`/api/hrx/leave/accrual/rules/${versionRuleId}/deactivate`) && response.status() === 200);
  await versionRuleRow.getByRole("button", { name: "규칙 중지", exact: true }).click();
  await deactivateResponse;
  await versionRuleRow.getByText("중지", { exact: true }).waitFor();
  await capture(page, "lv-04-rule-version-deactivated-1512x900.png", 1512, 900, "#people-leave-accrual-auto", screenshots, geometries);

  const staffContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const staffPage = await staffContext.newPage();
  staffPage.on("pageerror", (error) => pageErrors.push(String(error)));
  staffPage.on("console", (message) => { if (message.type() === "error") consoleErrors.push({ text: message.text(), url: message.location().url }); });
  await login(staffPage, baseUrl, staffAccount);
  consoleErrors.length = 0;
  await staffPage.goto(`${baseUrl}/?locale=ko&view=people&ctx=allow#people-leave-accrual-auto`, { waitUntil: "networkidle" });
  await staffPage.locator('[data-leave-accrual-access="denied"]').waitFor({ state: "visible", timeout: 15_000 });
  const staffAutoMenuCount = await staffPage.getByRole("button", { name: "휴가 자동 발생", exact: true }).count();
  const staffManualMenuCount = await staffPage.getByRole("button", { name: "휴가 수동 발생", exact: true }).count();

  const commandReceipts = store.query("select", { table: "hrx_leave_command_receipts", where: { tenant_id: TENANT } }).filter((receipt) => receipt.command_type === "manual_leave_adjustment").length;
  const leaveConsoleErrors = consoleErrors.filter((entry) => entry.url.includes("/api/hrx/leave"));
  const unrelatedConsoleErrors = consoleErrors.filter((entry) => !entry.url.includes("/api/hrx/leave"));
  const receipt = {
    schema_version: "law-firm-os.leave-lv04-browser-qa.v0.1",
    generated_at: new Date().toISOString(),
    synthetic_only: true,
    checks: {
      automatic_preview_visible: true,
      signed_step_up_execute: true,
      first_new_entries: firstExecuteBody.run.result.counts.new_entries,
      rerun_new_entries: rerunBody.run.result.counts.new_entries,
      earned_entries_stable: earnedAfterFirst === 1 && earnedAfterRerun === 1,
      manual_dual_control_execute: commandReceipts === 1,
      rule_version_created: Number(versionBody.rule.version) === 2,
      rule_version_deactivated: store.query("selectOne", { table: "hrx_leave_accrual_rules", where: { tenant_id: TENANT, accrual_rule_id: versionRuleId } })?.status === "inactive",
      staff_auto_menu_hidden: staffAutoMenuCount === 0,
      staff_manual_menu_hidden: staffManualMenuCount === 0,
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
  if (!receipt.checks.earned_entries_stable || receipt.checks.rerun_new_entries !== 0 || !receipt.checks.manual_dual_control_execute || !receipt.checks.rule_version_created || !receipt.checks.rule_version_deactivated || !receipt.checks.staff_auto_menu_hidden || !receipt.checks.staff_manual_menu_hidden || pageErrors.length || leaveConsoleErrors.length) {
    process.stdout.write(`${JSON.stringify({ leaveConsoleErrors, unrelatedConsoleErrors }, null, 2)}\n`);
    throw new Error(`LV04 browser QA failed: ${JSON.stringify(receipt.checks)}`);
  }
  process.stdout.write(`${JSON.stringify({ status: "passed", receipt: RECEIPT_PATH, checks: receipt.checks }, null, 2)}\n`);
} finally {
  if (browser) await browser.close();
  if (vite) await vite.close();
  await closeServer(api?.server);
  store.close();
  rmSync(qaRoot, { recursive: true, force: true });
}
