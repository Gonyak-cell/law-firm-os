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
import { createInternalLeaveIntegrationProviders } from "../packages/hrx/src/leave/integration-service.js";
import { runHrxMigrations } from "../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../packages/hrx/src/store/file-store.js";

const ROOT = process.cwd();
const TENANT = "tenant_amic_matter_vault";
const EMPLOYEE = "emp_amic_yjlee";
const APPLICANT = "user_amic_yjlee";
const MANAGER = "user_amic_tryoon";
const EVIDENCE_DIR = resolve(ROOT, "output/playwright/leave-management-implementation-2026-07-13");
const RECEIPT_PATH = join(EVIDENCE_DIR, "lv-07-browser-qa-receipt.json");

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function seedLv07(store) {
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: TENANT, group_id: "lv07-group", code: "LV07_PAID", display_name: "유급 휴가", status: "active", state_version: 1 } });
  store.query("insert", { table: "hrx_leave_types", row: { tenant_id: TENANT, leave_type_id: "lv07-annual", group_id: "lv07-group", code: "ANNUAL", display_name: "연차", request_unit: "minutes", evidence_rule_json: "{}", status: "active" } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: { tenant_id: TENANT, policy_version_id: "lv07-policy-v1", group_id: "lv07-group", policy_code: "LV07-ANNUAL-2026", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: "{}" } });
  store.query("insert", { table: "hrx_work_schedule_profiles", row: { tenant_id: TENANT, schedule_profile_id: "lv07-schedule", display_name: "서울 표준 근무", timezone: "Asia/Seoul", weekly_schedule_json: JSON.stringify({ 1: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }], 2: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }], 3: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }], 4: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }], 5: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }] }), holiday_calendar_ref: "KR_PUBLIC_HOLIDAYS", effective_from: "2026-01-01", effective_to: null, state_version: 1 } });
  store.query("insert", { table: "hrx_work_schedule_assignments", row: { tenant_id: TENANT, schedule_assignment_id: "lv07-schedule-assignment", schedule_profile_id: "lv07-schedule", employee_id: EMPLOYEE, organization_id: null, priority: 100, effective_from: "2026-01-01", effective_to: null } });
  store.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: TENANT, entitlement_id: "lv07-entitlement", employee_id: EMPLOYEE, group_id: "lv07-group", policy_version_id: "lv07-policy-v1", granted_minutes: 960, valid_from: "2026-01-01", expires_on: "2026-12-31", source_ref: "LeaveAccrualRun:LV07Browser", idempotency_key: "lv07-entitlement", state_version: 1 } });
  createSqlLeaveBalanceLedger({ store }).append({ tenant_id: TENANT, entry_id: "lv07-earned", employee_id: EMPLOYEE, policy_id: "LV07-ANNUAL-2026", group_id: "lv07-group", policy_version_id: "lv07-policy-v1", entitlement_id: "lv07-entitlement", idempotency_key: "lv07-earned", entry_type: "earned", amount_minutes: 960, occurred_on: "2026-01-01", source_ref: "LeaveAccrualRun:LV07Browser" });
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
  if (!geometry.visible || geometry.scroll_width > geometry.client_width) throw new Error(`LV07 geometry failed: ${name} ${JSON.stringify(geometry)}`);
  const filePath = join(EVIDENCE_DIR, name);
  await page.screenshot({ path: filePath, fullPage: true });
  screenshots.push({ path: filePath.replace(`${ROOT}/`, ""), sha256: sha256(filePath), viewport: { width, height } });
  geometries.push({ name, ...geometry });
}

async function closeServer(server) {
  if (server) await new Promise((resolveClose) => server.close(resolveClose));
}

mkdirSync(EVIDENCE_DIR, { recursive: true });
const qaRoot = mkdtempSync(join(tmpdir(), "matter-leave-lv07-browser-"));
const store = createFileHrxStore({ filePath: join(qaRoot, "hrx-store.json") });
let api;
let vite;
let browser;

try {
  runHrxMigrations(store);
  seedHrxDurableRuntimeStore(store);
  seedLv07(store);
  const internal = createInternalLeaveIntegrationProviders();
  const scheduleObjects = new Set();
  const scheduleAttempts = [];
  let failFirstSchedule = true;
  const runtime = createHrxRuntimeContext({
    store,
    leaveIntegrationProviders: {
      ...internal,
      schedule: { mode: "synthetic_schedule", async deliver(input) {
        scheduleAttempts.push({ idempotency_key: input.idempotency_key, operation: input.payload.operation, schedule_object_ref: input.payload.schedule_object_ref });
        if (input.payload.operation === "delete") scheduleObjects.delete(input.payload.schedule_object_ref);
        else scheduleObjects.add(input.payload.schedule_object_ref);
        if (failFirstSchedule) {
          failFirstSchedule = false;
          const error = new Error("redacted synthetic schedule failure");
          error.safe_error_code = "SCHEDULE_TEMPORARY_FAILURE";
          throw error;
        }
        return { provider_receipt_ref: `SyntheticSchedule:${input.payload.schedule_object_ref}:${input.payload.operation}` };
      } },
    },
  });
  await runtime.leaveManagementService.submit({ tenant_id: TENANT, actor_id: APPLICANT }, { idempotency_key: "lv07-browser-submit", request_id: "lv07-browser-request", employee_id: EMPLOYEE, leave_type_id: "lv07-annual", policy_version_id: "lv07-policy-v1", requested_minutes: 240, start_date: "2026-07-14", end_date: "2026-07-14", reason_text: "브라우저 비공개 사유" });
  await runtime.leaveManagementService.approve({ tenant_id: TENANT, actor_id: MANAGER }, { idempotency_key: "lv07-browser-approve", request_id: "lv07-browser-request", applicant_actor_ids: [APPLICANT] });
  const pendingOutbox = store.query("selectOne", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT, event_type: "leave.request.approved" } });
  if (pendingOutbox?.state !== "pending_sync") throw new Error("LV07 synthetic pending_sync setup failed");

  api = await startApiServer({ port: 0, hrxRuntime: runtime, hrxStore: store });
  const apiBaseUrl = `http://${api.host}:${api.port}`;
  vite = await createViteServer({ root: resolve(ROOT, "apps/web"), logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false, proxy: { "/api": apiBaseUrl, "/master-data": apiBaseUrl } } });
  await vite.listen();
  const address = vite.httpServer.address();
  if (!address || typeof address === "string") throw new Error("Vite did not expose a loopback port");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const adminAccount = findRegisteredAccountByUserId("user_amic_jwsuh");
  const staffAccount = findRegisteredAccountByUserId(APPLICANT);
  if (!adminAccount || !staffAccount) throw new Error("LV07 browser accounts are missing");

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
  await page.goto(`${baseUrl}/?locale=ko&view=people&ctx=allow#people-leave-usage`, { waitUntil: "networkidle" });
  await page.locator("#people-leave-usage").waitFor({ state: "visible", timeout: 15_000 });
  await page.getByText("업무 시스템 연동", { exact: true }).waitFor();
  const integrationDetails = page.locator("[data-leave-integration-status='true'] details");
  const integrationSummary = integrationDetails.locator("summary > span");
  await integrationSummary.filter({ hasText: "대기 1" }).waitFor();
  await integrationDetails.locator("summary").click();
  await page.getByText("일정 · 대기", { exact: true }).waitFor();
  await capture(page, "lv-07-integration-pending-1512x900.png", 1512, 900, "#people-leave-usage", screenshots, geometries);

  const processResponse = page.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/integrations/process") && response.status() === 200);
  await page.getByRole("button", { name: "대기 항목 처리" }).click();
  await processResponse;
  await integrationSummary.filter({ hasText: "대기 0" }).waitFor();
  await page.getByText("일정 · 연결됨", { exact: true }).waitFor();
  const scheduleObjectCountAfterRetry = scheduleObjects.size;
  await capture(page, "lv-07-integration-delivered-720x900.png", 720, 900, "#people-leave-usage", screenshots, geometries);

  const staffContext = await browser.newContext({ viewport: { width: 720, height: 900 } });
  const staffPage = await staffContext.newPage();
  staffPage.on("pageerror", (error) => pageErrors.push(String(error)));
  staffPage.on("console", (message) => { if (message.type() === "error") consoleErrors.push({ text: message.text(), url: message.location().url }); });
  await login(staffPage, baseUrl, staffAccount);
  consoleErrors.length = 0;
  await staffPage.goto(`${baseUrl}/?locale=ko&view=people&ctx=allow#people-leave`, { waitUntil: "networkidle" });
  await staffPage.locator("#people-leave").waitFor({ state: "visible", timeout: 15_000 });
  const cancelResponse = staffPage.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/me/requests/lv07-browser-request/cancel") && response.status() === 200);
  await staffPage.getByRole("button", { name: "승인 휴가 취소" }).click();
  await cancelResponse;
  await staffPage.getByText("승인 후 취소", { exact: true }).waitFor();
  const staffIntegrationPanelCount = await staffPage.locator("[data-leave-integration-status='true']").count();
  const denied = await staffPage.evaluate(async () => {
    const session = JSON.parse(window.sessionStorage.getItem("lawos.api.session") ?? "null");
    const response = await fetch("/api/hrx/leave/integrations", { headers: { authorization: `Bearer ${session?.session_token ?? ""}` } });
    return { status: response.status, body: await response.json() };
  });
  await capture(staffPage, "lv-07-approved-cancel-720x900.png", 720, 900, "#people-leave", screenshots, geometries);

  const request = store.query("selectOne", { table: "hrx_leave_requests", where: { tenant_id: TENANT, request_id: "lv07-browser-request" } });
  const balance = createSqlLeaveBalanceLedger({ store }).balance({ tenant_id: TENANT, employee_id: EMPLOYEE, group_id: "lv07-group" });
  const cancelOutbox = store.query("selectOne", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT, event_type: "leave.request.cancelled_after_approval" } });
  const integrationRows = store.query("select", { table: "hrx_leave_integration_deliveries", where: { tenant_id: TENANT } });
  const approvedDeliveries = integrationRows.filter((row) => row.outbox_event_id === pendingOutbox.outbox_event_id);
  const cancelDeliveries = integrationRows.filter((row) => row.outbox_event_id === cancelOutbox.outbox_event_id);
  const attendancePayload = JSON.parse(approvedDeliveries.find((row) => row.provider_kind === "attendance").payload_json);
  const payrollPayload = JSON.parse(approvedDeliveries.find((row) => row.provider_kind === "payroll").payload_json);
  const notificationPayloads = integrationRows.filter((row) => row.provider_kind === "notification").map((row) => JSON.parse(row.payload_json));
  const expectedDenialConsoleErrors = consoleErrors.filter((entry) => entry.url.includes("/api/hrx/leave/integrations") && entry.text.includes("403"));
  const leaveConsoleErrors = consoleErrors.filter((entry) => entry.url.includes("/api/hrx/leave") && !expectedDenialConsoleErrors.includes(entry));
  const unrelatedConsoleErrors = consoleErrors.filter((entry) => !entry.url.includes("/api/hrx/leave"));
  const deniedBodyKeys = Object.keys(denied.body ?? {}).sort();
  const deniedBodyExposesData = deniedBodyKeys.some((key) => /^(count|counts|data|integration|integrations|items|rows|summary|total)/i.test(key));
  const receipt = {
    schema_version: "law-firm-os.leave-lv07-browser-qa.v0.1",
    generated_at: new Date().toISOString(),
    synthetic_only: true,
    checks: {
      pending_sync_visible_before_retry: true,
      approved_ledger_survived_provider_failure: pendingOutbox.last_error_code === "SCHEDULE_TEMPORARY_FAILURE",
      retry_delivered_all_boundaries: approvedDeliveries.length === 4 && approvedDeliveries.every((row) => row.state === "delivered"),
      schedule_retry_single_object: scheduleObjectCountAfterRetry === 1 && scheduleAttempts[0].idempotency_key === scheduleAttempts[1].idempotency_key,
      attendance_leave_excludes_absence: attendancePayload.days[0].leave_minutes === 240 && attendancePayload.days[0].unexcused_absence_minutes === 0,
      payroll_paid_partition_minutes: payrollPayload.paid_minutes === 240 && payrollPayload.unpaid_minutes === 0 && payrollPayload.raw_compensation_amount_included === false,
      notification_private_fields_excluded: !/브라우저 비공개 사유|reason_text|employee_id|document_id/.test(JSON.stringify(notificationPayloads)),
      approved_cancel_inverse_delivered: cancelDeliveries.length === 4 && cancelDeliveries.every((row) => row.state === "delivered") && scheduleAttempts.at(-1).operation === "delete",
      approved_cancel_balance_restored: request.state === "cancelled_after_approval" && balance.available_minutes === 960,
      schedule_create_cancel_same_ref: new Set(scheduleAttempts.map((row) => row.schedule_object_ref)).size === 1 && scheduleObjects.size === 0,
      staff_integration_panel_hidden: staffIntegrationPanelCount === 0,
      staff_integration_api_denied_without_counts: denied.status === 403 && denied.body?.safe_error_code === "HRX_AUTHZ_DENIED" && denied.body?.fail_closed === true && !deniedBodyExposesData,
      page_errors: pageErrors.length,
      leave_console_errors: leaveConsoleErrors.length,
      unrelated_console_errors: unrelatedConsoleErrors.length,
    },
    geometries,
    screenshots,
    schedule_attempts: scheduleAttempts,
    expected_denial: {
      status: denied.status,
      safe_error_code: denied.body?.safe_error_code ?? null,
      body_keys: deniedBodyKeys,
      console_errors: expectedDenialConsoleErrors.length,
    },
    leave_console_error_details: leaveConsoleErrors,
    unrelated_console_error_details: unrelatedConsoleErrors,
    production_ready_claim: false,
    external_provider_write_claim: false,
    public_release_claim: false,
    go_live_claim: false,
  };
  writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
  const failures = Object.entries(receipt.checks).filter(([key, value]) => key !== "unrelated_console_errors" && value !== true && value !== 0);
  if (failures.length > 0) throw new Error(`LV07 browser QA failed: ${JSON.stringify(receipt.checks)}`);
  process.stdout.write(`${JSON.stringify({ status: "passed", receipt: RECEIPT_PATH, checks: receipt.checks }, null, 2)}\n`);
} finally {
  if (browser) await browser.close();
  if (vite) await vite.close();
  await closeServer(api?.server);
  store.close();
  rmSync(qaRoot, { recursive: true, force: true });
}
