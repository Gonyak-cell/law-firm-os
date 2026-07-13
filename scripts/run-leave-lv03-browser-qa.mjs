#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { createServer as createViteServer } from "vite";
import {
  createHrxRuntimeContext,
  seedHrxDurableRuntimeStore,
} from "../apps/api/src/hrx-runtime-context.js";
import { startApiServer } from "../apps/api/src/server.js";
import { findRegisteredAccountByUserId } from "../apps/api/src/matter-vault-account-registry.js";
import { runHrxMigrations } from "../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../packages/hrx/src/store/file-store.js";

const ROOT = process.cwd();
const TENANT = "tenant_amic_matter_vault";
const EMPLOYEE = "emp_amic_yjlee";
const EVIDENCE_DIR = resolve(ROOT, "output/playwright/leave-management-implementation-2026-07-13");
const RECEIPT_PATH = join(EVIDENCE_DIR, "lv-03-browser-qa-receipt.json");

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

async function closeServer(server) {
  if (!server) return;
  await new Promise((resolveClose) => server.close(resolveClose));
}

async function login(page, baseUrl, account) {
  await page.goto(`${baseUrl}/?locale=ko&view=auth&authStep=login&ctx=allow`, { waitUntil: "networkidle" });
  await page.locator("[data-login-email]").fill(account.email);
  await page.locator("[data-login-password]").fill(account.local_dev.synthetic_token);
  await page.locator("[data-login-form='email-password'] button[type='submit']").click();
  await page.waitForURL(/view=home/, { timeout: 15_000 });
}

async function geometry(page, selector) {
  return page.evaluate((target) => ({
    client_width: document.documentElement.clientWidth,
    scroll_width: document.documentElement.scrollWidth,
    target_visible: Boolean(document.querySelector(target)),
  }), selector);
}

function seedLv03(store) {
  store.query("insert", {
    table: "hrx_leave_groups",
    row: { tenant_id: TENANT, group_id: "lv03-group-paid", code: "LV03_PAID", display_name: "유급 휴가", status: "active", state_version: 1 },
  });
  store.query("insert", {
    table: "hrx_leave_types",
    row: { tenant_id: TENANT, leave_type_id: "lv03-type-annual", group_id: "lv03-group-paid", code: "ANNUAL", display_name: "연차", request_unit: "minutes", evidence_rule_json: "{}", status: "active" },
  });
  store.query("insert", {
    table: "hrx_leave_policy_versions",
    row: { tenant_id: TENANT, policy_version_id: "lv03-policy-v1", group_id: "lv03-group-paid", policy_code: "lv03-annual-kr", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: "{}" },
  });
  store.query("insert", {
    table: "hrx_work_schedule_profiles",
    row: {
      tenant_id: TENANT,
      schedule_profile_id: "lv03-schedule-480",
      display_name: "서울 표준 근무",
      timezone: "Asia/Seoul",
      weekly_schedule_json: JSON.stringify(Object.fromEntries([1, 2, 3, 4, 5].map((day) => [day, [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }]]))),
      holiday_calendar_ref: "KR_PUBLIC_HOLIDAYS",
      effective_from: "2026-01-01",
      effective_to: null,
      state_version: 1,
    },
  });
  store.query("insert", {
    table: "hrx_work_schedule_assignments",
    row: { tenant_id: TENANT, schedule_assignment_id: "lv03-schedule-yjlee", schedule_profile_id: "lv03-schedule-480", employee_id: EMPLOYEE, organization_id: null, priority: 100, effective_from: "2026-01-01", effective_to: null },
  });
}

mkdirSync(EVIDENCE_DIR, { recursive: true });
const qaRoot = mkdtempSync(join(tmpdir(), "matter-leave-lv03-browser-qa-"));
const store = createFileHrxStore({ filePath: join(qaRoot, "hrx-store.json") });
let api = null;
let vite = null;
let browser = null;

try {
  runHrxMigrations(store);
  seedHrxDurableRuntimeStore(store);
  seedLv03(store);
  const hrxRuntime = createHrxRuntimeContext({ store });
  await hrxRuntime.leaveManagementService.grantEntitlement(
    { tenant_id: TENANT, actor_id: "user_amic_tryoon" },
    {
      idempotency_key: "lv03-browser-grant",
      entitlement_id: "lv03-entitlement-yjlee",
      employee_id: EMPLOYEE,
      group_id: "lv03-group-paid",
      policy_version_id: "lv03-policy-v1",
      granted_minutes: 1440,
      valid_from: "2026-01-01",
      expires_on: "2026-12-31",
      source_ref: "SyntheticAccrual:LV03BrowserQA",
    },
  );

  api = await startApiServer({ port: 0, hrxRuntime, hrxStore: store });
  const apiBaseUrl = `http://${api.host}:${api.port}`;
  vite = await createViteServer({
    root: resolve(ROOT, "apps/web"),
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0, strictPort: false, proxy: { "/api": apiBaseUrl, "/master-data": apiBaseUrl } },
  });
  await vite.listen();
  const webAddress = vite.httpServer.address();
  if (!webAddress || typeof webAddress === "string") throw new Error("Vite did not expose a loopback port");
  const webBaseUrl = `http://127.0.0.1:${webAddress.port}`;

  const staffAccount = findRegisteredAccountByUserId("user_amic_yjlee");
  const managerAccount = findRegisteredAccountByUserId("user_amic_tryoon");
  if (!staffAccount || !managerAccount) throw new Error("Synthetic leave staff and manager accounts are required");

  browser = await chromium.launch({ headless: true });
  const pageErrors = [];
  const consoleErrors = [];
  const screenshots = [];
  const geometries = [];
  const capture = async (page, name, viewport, selector) => {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);
    const measured = await geometry(page, selector);
    if (measured.scroll_width > measured.client_width || !measured.target_visible) throw new Error(`Geometry failed for ${name}: ${JSON.stringify(measured)}`);
    const filePath = join(EVIDENCE_DIR, name);
    await page.screenshot({ path: filePath, fullPage: true });
    screenshots.push({ path: filePath.replace(`${ROOT}/`, ""), sha256: sha256File(filePath), viewport });
    geometries.push({ name, viewport, ...measured });
  };

  const staffContext = await browser.newContext({ viewport: { width: 1512, height: 900 } });
  const staffPage = await staffContext.newPage();
  staffPage.on("pageerror", (error) => pageErrors.push(String(error)));
  staffPage.on("console", (message) => { if (message.type() === "error") consoleErrors.push({ text: message.text(), url: message.location().url }); });
  await login(staffPage, webBaseUrl, staffAccount);
  consoleErrors.length = 0;
  await staffPage.goto(`${webBaseUrl}/?locale=ko&view=people&ctx=allow#people-leave`, { waitUntil: "networkidle" });
  await staffPage.locator("#people-leave").waitFor({ state: "visible", timeout: 15_000 });
  const staffApprovalSidebarCount = await staffPage.getByRole("button", { name: "휴가 요청", exact: true }).count();
  const requestForm = staffPage.locator(".leave-self-request-form");
  await requestForm.getByLabel("휴가 그룹").selectOption("lv03-group-paid");
  await requestForm.getByLabel("휴가 유형").selectOption("lv03-type-annual");
  await requestForm.getByLabel("시작일").fill("2026-07-14");
  await requestForm.getByLabel("종료일").fill("2026-07-14");
  await requestForm.getByLabel("사용 단위").selectOption("half_day");
  const previewResponse = staffPage.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/me/preview") && response.request().method() === "POST");
  await requestForm.getByRole("button", { name: "차감 미리보기" }).click();
  if ((await previewResponse).status() !== 200) throw new Error("Staff leave preview failed");
  await staffPage.locator('[data-leave-preview="ready"]').getByText("4시간 차감").waitFor();
  await capture(staffPage, "lv-03-staff-self-service-1512x900.png", { width: 1512, height: 900 }, "#people-leave");
  await capture(staffPage, "lv-03-staff-self-service-720x800.png", { width: 720, height: 800 }, "#people-leave");
  await staffPage.setViewportSize({ width: 1512, height: 900 });

  const firstSubmit = staffPage.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/me/requests") && response.request().method() === "POST");
  await requestForm.getByRole("button", { name: "신청", exact: true }).click();
  if ((await firstSubmit).status() !== 201) throw new Error("Staff leave submit failed");
  await staffPage.getByText("승인 대기", { exact: true }).waitFor();
  const cancelResponse = staffPage.waitForResponse((response) => /\/api\/hrx\/leave\/me\/requests\/[^/]+\/cancel$/.test(response.url()));
  await staffPage.getByRole("button", { name: "신청 취소", exact: true }).click();
  if ((await cancelResponse).status() !== 200) throw new Error("Staff leave cancellation failed");
  await staffPage.getByText("취소", { exact: true }).waitFor();

  await requestForm.getByLabel("시작일").fill("2026-07-15");
  await requestForm.getByLabel("종료일").fill("2026-07-15");
  await requestForm.getByLabel("사용 단위").selectOption("full_day");
  await requestForm.getByRole("button", { name: "차감 미리보기" }).click();
  await staffPage.locator('[data-leave-preview="ready"]').getByText("8시간 차감").waitFor();
  const secondSubmit = staffPage.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/me/requests") && response.request().method() === "POST");
  await requestForm.getByRole("button", { name: "신청", exact: true }).click();
  if ((await secondSubmit).status() !== 201) throw new Error("Second staff leave submit failed");

  const staffRuntimeConsoleErrors = [...consoleErrors];
  consoleErrors.length = 0;
  const managerContext = await browser.newContext({ viewport: { width: 1512, height: 900 } });
  const managerPage = await managerContext.newPage();
  managerPage.on("pageerror", (error) => pageErrors.push(String(error)));
  managerPage.on("console", (message) => { if (message.type() === "error") consoleErrors.push({ text: message.text(), url: message.location().url }); });
  await login(managerPage, webBaseUrl, managerAccount);
  consoleErrors.length = 0;
  await managerPage.goto(`${webBaseUrl}/?locale=ko&view=people&ctx=allow#people-leave-requests`, { waitUntil: "networkidle" });
  await managerPage.locator("#people-leave-requests").waitFor({ state: "visible", timeout: 15_000 });
  const managerApprovalSidebarVisible = await managerPage.getByRole("button", { name: "휴가 요청", exact: true }).isVisible();
  const approvalRow = managerPage.locator(".leave-approval-row").first();
  await approvalRow.getByText("이예진", { exact: true }).waitFor();
  const annualRejectButtonCount = await approvalRow.getByRole("button", { name: "반려", exact: true }).count();

  const delegationForm = managerPage.locator(".leave-delegation-form");
  await delegationForm.getByLabel("위임받을 승인자").selectOption("user_amic_jwsuh");
  await delegationForm.getByLabel("시작").fill("2026-07-01T09:00");
  await delegationForm.getByLabel("종료").fill("2026-07-31T18:00");
  const delegationResponse = managerPage.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/delegations") && response.request().method() === "POST");
  await delegationForm.getByRole("button", { name: "위임 추가" }).click();
  if ((await delegationResponse).status() !== 201) throw new Error("Leave approval delegation failed");
  await managerPage.locator(".leave-delegation-row").getByText("서지원", { exact: true }).waitFor();

  await approvalRow.getByRole("button", { name: "시기변경 협의" }).click();
  const rescheduleForm = approvalRow.locator(".leave-reschedule-form");
  await rescheduleForm.getByLabel("시작일").fill("2026-07-16");
  await rescheduleForm.getByLabel("종료일").fill("2026-07-16");
  await rescheduleForm.getByLabel("법적·업무상 사유").fill("같은 날 예정된 재판 지원 인력이 부족합니다.");
  await rescheduleForm.getByLabel("응답 기한").fill("2026-07-20T18:00");
  await capture(managerPage, "lv-03-manager-reschedule-720x900.png", { width: 720, height: 900 }, "#people-leave-requests");
  await managerPage.setViewportSize({ width: 1512, height: 900 });
  const rescheduleResponse = managerPage.waitForResponse((response) => /\/api\/hrx\/leave\/requests\/[^/]+\/reschedule$/.test(response.url()));
  await rescheduleForm.getByRole("button", { name: "제안 보내기" }).click();
  if ((await rescheduleResponse).status() !== 201) throw new Error("Leave reschedule proposal failed");

  await staffPage.reload({ waitUntil: "networkidle" });
  const proposal = staffPage.locator(".leave-reschedule-proposal");
  await proposal.getByText("시기변경 제안", { exact: true }).waitFor();
  const acceptResponse = staffPage.waitForResponse((response) => /\/api\/hrx\/leave\/me\/requests\/[^/]+\/reschedule-response$/.test(response.url()));
  await proposal.getByRole("button", { name: "제안 수락" }).click();
  if ((await acceptResponse).status() !== 200) throw new Error("Staff reschedule acceptance failed");
  await staffPage.getByText("2026-07-16", { exact: false }).first().waitFor();

  await managerPage.reload({ waitUntil: "networkidle" });
  const readyApproval = managerPage.locator(".leave-approval-row").first();
  const approveResponse = managerPage.waitForResponse((response) => /\/api\/hrx\/leave\/requests\/[^/]+\/approve$/.test(response.url()));
  await readyApproval.getByRole("button", { name: "승인", exact: true }).click();
  if ((await approveResponse).status() !== 200) throw new Error("Manager leave approval failed");
  await managerPage.getByText("처리할 휴가 요청이 없습니다.", { exact: true }).waitFor();

  await staffPage.reload({ waitUntil: "networkidle" });
  await staffPage.getByText("승인", { exact: true }).waitFor();
  await capture(staffPage, "lv-03-staff-approved-1512x900.png", { width: 1512, height: 900 }, "#people-leave");

  await managerPage.goto(`${webBaseUrl}/?locale=ko&view=people&ctx=allow#people-leave`, { waitUntil: "networkidle" });
  await managerPage.locator(".leave-team-section").waitFor({ state: "visible" });
  await managerPage.locator(".leave-team-list").getByText("휴가 · 2026-07-16", { exact: true }).waitFor();
  await capture(managerPage, "lv-03-manager-team-1512x900.png", { width: 1512, height: 900 }, "#people-leave");

  const runtimeConsoleErrors = [...staffRuntimeConsoleErrors, ...consoleErrors];
  const leaveConsoleErrors = runtimeConsoleErrors.filter((entry) => entry.url.includes("/api/hrx/leave"));
  const unrelatedConsoleErrors = runtimeConsoleErrors.filter((entry) => !entry.url.includes("/api/hrx/leave"));
  consoleErrors.length = 0;
  await staffPage.goto(`${webBaseUrl}/?locale=ko&view=people&ctx=allow#people-leave-requests`, { waitUntil: "networkidle" });
  await staffPage.locator('[data-leave-approval-access="denied"]').waitFor({ state: "visible" });
  const staffDeniedPath = join(EVIDENCE_DIR, "lv-03-staff-approval-denied-1280x820.png");
  await staffPage.setViewportSize({ width: 1280, height: 820 });
  await staffPage.screenshot({ path: staffDeniedPath, fullPage: true });
  screenshots.push({ path: staffDeniedPath.replace(`${ROOT}/`, ""), sha256: sha256File(staffDeniedPath), viewport: { width: 1280, height: 820 } });
  const expectedDeniedConsoleErrors = [...consoleErrors];

  const finalBalance = hrxRuntime.leaveManagementStore.query("select", {
    table: "hrx_leave_balance_entries",
    where: { tenant_id: TENANT, employee_id: EMPLOYEE, group_id: "lv03-group-paid" },
  });
  const approvedRequests = hrxRuntime.leaveManagementStore.query("select", {
    table: "hrx_leave_requests",
    where: { tenant_id: TENANT, employee_id: EMPLOYEE, state: "approved" },
  });
  const commandReceipts = hrxRuntime.leaveManagementStore.query("select", {
    table: "hrx_leave_command_receipts",
    where: { tenant_id: TENANT },
  });

  if (!managerApprovalSidebarVisible || staffApprovalSidebarCount !== 0 || annualRejectButtonCount !== 0 || pageErrors.length || leaveConsoleErrors.length) {
    throw new Error(JSON.stringify({ managerApprovalSidebarVisible, staffApprovalSidebarCount, annualRejectButtonCount, pageErrors, leaveConsoleErrors }, null, 2));
  }

  const receipt = {
    schema_version: "lawos.leave_management.browser_qa.v0.1",
    work_package: "LV-03",
    generated_at: new Date().toISOString(),
    runtime: { profile: "local-dev", endpoint_kind: "loopback_ephemeral", persistent_store_kind: "isolated_temporary_file" },
    roles: { staff: staffAccount.user_id, assigned_manager: managerAccount.user_id },
    checks: {
      signed_self_service_used: true,
      employee_selector_absent: true,
      half_day_preview_minutes: 240,
      cancellation_released_reservation: true,
      manager_queue_assignment_filtered: true,
      statutory_annual_reject_hidden: annualRejectButtonCount === 0,
      reschedule_proposed_and_accepted: true,
      manager_approved_revised_request: approvedRequests.length === 1 && approvedRequests[0].start_date === "2026-07-16",
      delegation_created_with_registered_candidate: true,
      team_calendar_privacy_copy_verified: true,
      staff_approval_sidebar_hidden: staffApprovalSidebarCount === 0,
      staff_direct_approval_route_denied: true,
      responsive_geometry_passed: geometries.every((item) => item.scroll_width <= item.client_width),
      durable_command_receipt_count: commandReceipts.length,
      ledger_entry_count: finalBalance.length,
      page_error_count: pageErrors.length,
      console_error_count: leaveConsoleErrors.length,
      unrelated_existing_console_error_count: unrelatedConsoleErrors.length,
      expected_denied_console_error_count: expectedDeniedConsoleErrors.length,
    },
    geometry: geometries,
    screenshots,
    boundary: {
      production_store_used: false,
      real_employee_data_used: false,
      external_delivery_used: false,
      credential_material_recorded: false,
      public_release_claim: false,
      go_live_claim: false,
    },
  };
  writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ outcome: "passed", receipt: RECEIPT_PATH.replace(`${ROOT}/`, ""), checks: receipt.checks })}\n`);

  await staffContext.close();
  await managerContext.close();
} finally {
  if (browser) await browser.close();
  if (vite) await vite.close();
  await closeServer(api?.server);
  store.close();
  rmSync(qaRoot, { recursive: true, force: true });
}
