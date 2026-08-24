#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { _electron as electron } from "playwright";
import { seedHrxDurableRuntimeStore } from "../apps/api/src/hrx-runtime-context.js";
import { createHrxStepUpAuthority } from "../apps/api/src/hrx-step-up-token.js";
import { findRegisteredAccountByUserId } from "../apps/api/src/matter-vault-account-registry.js";
import { createSqlLeaveBalanceLedger } from "../packages/hrx/src/leave/balance.js";
import { HRX_CORE_MIGRATIONS, runHrxMigrations } from "../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../packages/hrx/src/store/file-store.js";
import { desktopReleaseChannelConfig } from "./lib/matter-desktop-provenance.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const TENANT = "tenant_amic_matter_vault";
const EMPLOYEE = "emp_amic_yjlee";
const PROMOTION_EMPLOYEE = "emp_amic_ytkim";
const ACCRUAL_EMPLOYEE = "emp_amic_wsjo";
const EMPLOYEE_ACTOR = "user_amic_yjlee";
const MANAGER_ACTOR = "user_amic_tryoon";
const HR_ACTOR = "user_amic_jwsuh";
const OTHER_TENANT_ACTOR = "user_qa_tenant_b";
const APP_BUNDLE = path.join(ROOT, "apps/desktop/dist/mac/matter.app");
const EXECUTABLE = path.join(APP_BUNDLE, "Contents/MacOS/matter");
const PACKAGED_APP_ROOT = path.join(APP_BUNDLE, "Contents/Resources/app");
const RENDERER_INDEX = path.join(PACKAGED_APP_ROOT, "src/renderer/web/index.html");
const desktopPackage = JSON.parse(readFileSync(path.join(ROOT, "apps/desktop/package.json"), "utf8"));
const windowsArtifactPrefix = desktopReleaseChannelConfig("internal").windowsArtifactPrefix;
const WINDOWS_PACKAGE_ROOT = path.join(ROOT, `apps/desktop/dist/win/${windowsArtifactPrefix}-${desktopPackage.version}-win32-x64`);
const WINDOWS_EXECUTABLE = path.join(WINDOWS_PACKAGE_ROOT, "matter.exe");
const WINDOWS_ZIP = path.join(ROOT, `apps/desktop/dist/win/${windowsArtifactPrefix}-${desktopPackage.version}-win32-x64-unsigned.zip`);
const PRIVATE_ROSTER_SOURCE = path.join(ROOT, "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json");
const ARTIFACT_DIR = path.resolve(process.env.MATTER_LEAVE_PACKAGE_QA_ARTIFACT_DIR || path.join(ROOT, "output/playwright/leave-management-package"));
const DOC_RECEIPT = path.join(ROOT, "docs/lazycodex/evidence/matter-desktop/artifacts/leave-management-package-qa.json");
const RESTART_RECEIPT = path.join(ARTIFACT_DIR, "leave-management-restart.json");
const CONSOLE_RECEIPT = path.join(ARTIFACT_DIR, "leave-management-console.json");
const userDataPath = mkdtempSync(path.join(tmpdir(), "matter-leave-package-qa-"));
const runtimeStoreDir = path.join(userDataPath, "runtime-stores");
const hrxStorePath = path.join(runtimeStoreDir, "hrx-store.json");
const sourceRevision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
const stepUpAuthority = createHrxStepUpAuthority();

const accounts = Object.freeze({
  employee: findRegisteredAccountByUserId(EMPLOYEE_ACTOR),
  manager: findRegisteredAccountByUserId(MANAGER_ACTOR),
  hr_admin: findRegisteredAccountByUserId(HR_ACTOR),
  other_tenant: findRegisteredAccountByUserId(OTHER_TENANT_ACTOR),
});

const packagedQaEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith("LAWOS_") && ![
    "MATTER_DESKTOP_RENDERER_URL",
    "MATTER_DESKTOP_API_BASE_URL",
    "MATTER_DESKTOP_RUNTIME_BASE_URL",
    "MATTER_DESKTOP_RUNTIME_STORE_DIR",
    "MATTER_DESKTOP_USER_DATA_PATH",
  ].includes(name)),
);

async function waitForFile(filePath, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(filePath)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Packaged download did not reach the evidence path: ${filePath}`);
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(filePath) {
  return sha256Bytes(readFileSync(filePath));
}

function sha256Directory(directoryPath) {
  const hash = createHash("sha256");
  function visit(currentPath) {
    for (const entry of readdirSync(currentPath, { withFileTypes: true }).toSorted((left, right) => left.name.localeCompare(right.name))) {
      const absolutePath = path.join(currentPath, entry.name);
      const relativePath = path.relative(directoryPath, absolutePath);
      if (entry.isDirectory()) visit(absolutePath);
      else if (entry.isFile()) {
        hash.update(relativePath);
        hash.update(readFileSync(absolutePath));
      }
    }
  }
  visit(directoryPath);
  return hash.digest("hex");
}

function sourceTreeSha() {
  const files = [
    "apps/api/src/hrx-runtime-context.js",
    "apps/api/src/routes/hrx/route-policy-map.js",
    "apps/web/src/people/hrxApiClient.ts",
    "apps/web/src/people/PeopleHome.tsx",
    "apps/web/src/styles.css",
    "packages/hrx/src/leave/management-service.js",
    "packages/hrx/src/leave/integration-service.js",
    "packages/hrx/src/leave/promotion-service.js",
    "packages/hrx/src/leave/termination-service.js",
    "packages/hrx/src/migrations/010_hrx_leave_integrations.sql",
  ];
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file);
    hash.update(readFileSync(path.join(ROOT, file)));
  }
  return hash.digest("hex");
}

function insert(store, table, row) {
  store.query("insert", { table, row });
}

function seedPackagedLeaveStore() {
  mkdirSync(runtimeStoreDir, { recursive: true });
  const store = createFileHrxStore({ filePath: hrxStorePath });
  runHrxMigrations(store);
  seedHrxDurableRuntimeStore(store);

  insert(store, "hrx_leave_groups", {
    tenant_id: TENANT,
    group_id: "pkg-group",
    code: "PACKAGE_ANNUAL",
    display_name: "유급 휴가",
    status: "active",
    state_version: 1,
  });
  insert(store, "hrx_leave_types", {
    tenant_id: TENANT,
    leave_type_id: "pkg-annual",
    group_id: "pkg-group",
    code: "ANNUAL",
    display_name: "연차",
    request_unit: "minutes",
    evidence_rule_json: "{}",
    status: "active",
  });
  insert(store, "hrx_leave_policy_versions", {
    tenant_id: TENANT,
    policy_version_id: "pkg-policy-v1",
    group_id: "pkg-group",
    policy_code: "PACKAGE-ANNUAL-2026",
    version: 1,
    effective_from: "2026-01-01",
    effective_to: null,
    status: "active",
    rules_json: JSON.stringify({
      termination_unused_payout: true,
      promotion: { standard_day_minutes: 480, minimum_unused_minutes: 4800 },
    }),
  });
  insert(store, "hrx_work_schedule_profiles", {
    tenant_id: TENANT,
    schedule_profile_id: "pkg-schedule",
    display_name: "서울 표준 근무",
    timezone: "Asia/Seoul",
    weekly_schedule_json: JSON.stringify(Object.fromEntries([1, 2, 3, 4, 5].map((day) => [day, [
      { start: "09:00", end: "12:00" },
      { start: "13:00", end: "18:00" },
    ]]))),
    holiday_calendar_ref: "KR_PUBLIC_HOLIDAYS",
    effective_from: "2026-01-01",
    effective_to: null,
    state_version: 1,
  });
  for (const employeeId of [EMPLOYEE, PROMOTION_EMPLOYEE, ACCRUAL_EMPLOYEE]) {
    insert(store, "hrx_work_schedule_assignments", {
      tenant_id: TENANT,
      schedule_assignment_id: `pkg-schedule-${employeeId}`,
      schedule_profile_id: "pkg-schedule",
      employee_id: employeeId,
      organization_id: null,
      priority: 100,
      effective_from: "2026-01-01",
      effective_to: null,
    });
    insert(store, "hrx_attendance_records", {
      tenant_id: TENANT,
      attendance_id: `pkg-attendance-${employeeId}`,
      employee_id: employeeId,
      work_date: "2026-07-01",
      status: "present",
      source_ref: `SyntheticAttendance:PackageQA:${employeeId}`,
      source_kind: "manual",
      recorded_hours: 8,
    });
  }
  insert(store, "hrx_documents", {
    tenant_id: TENANT,
    document_id: "pkg-manual-proof",
    employee_id: EMPLOYEE,
    document_type: "leave_adjustment_evidence",
    source_ref: "SyntheticDocument:PackageQA",
    source_status: "verified",
    source_metadata_json: "{}",
    title: "수동 조정 근거",
    document_body_included: false,
  });
  insert(store, "hrx_documents", {
    tenant_id: TENANT,
    document_id: "pkg-overdue-first-notice",
    employee_id: PROMOTION_EMPLOYEE,
    document_type: "annual_leave_promotion_notice",
    source_ref: "SyntheticDocument:PackageQA:OverdueFirstNotice",
    source_provider: "hrx_document_reference",
    source_status: "verified",
    source_version_ref: "2026-first-notice-v1",
    source_metadata_json: JSON.stringify({ delivery_state: "delivered", evidence_hash_present: true }),
    title: "연차휴가 사용 시기 지정 촉구서",
    document_body_included: false,
  });
  insert(store, "hrx_leave_promotion_campaigns", {
    tenant_id: TENANT,
    campaign_id: "pkg-overdue-campaign",
    policy_version_id: "pkg-policy-v1",
    reference_date: "2026-06-01",
    entitlement_period_end: "2026-12-31",
    schedule_profile_id: "kr_lsa61_standard_v2025_10_23",
    state: "active",
    legal_schedule_json: JSON.stringify({ employee_response_days: 10 }),
    legal_basis_code: "KR_LSA_ART61",
    legal_basis_version: "2025-10-23",
    legal_basis_effective_from: "2025-10-23",
    legal_review_state: "required",
    timezone: "Asia/Seoul",
    threshold_minutes: 4800,
    standard_day_minutes: 480,
    source_version: "pkg-overdue-source-v1",
    calculation_snapshot_hash: "pkg-overdue-snapshot-v1",
    target_count: 1,
    excluded_count: 0,
    exclusions_json: "[]",
    idempotency_key: "pkg-overdue-campaign",
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
  });
  insert(store, "hrx_leave_promotion_recipients", {
    tenant_id: TENANT,
    recipient_id: "pkg-overdue-recipient",
    campaign_id: "pkg-overdue-campaign",
    employee_id: PROMOTION_EMPLOYEE,
    employee_display_name: "김양태",
    stage: "first_notice",
    state: "awaiting_employee_response",
    deadline_at: "2026-06-01T14:59:59.000Z",
    first_notice_deadline_at: "2026-06-01T14:59:59.000Z",
    second_notice_deadline_at: "2026-10-31T14:59:59.000Z",
    document_id: "pkg-overdue-first-notice",
    first_document_version: "2026-first-notice-v1",
    first_issued_at: "2026-06-01T00:00:00.000Z",
    first_delivery_state: "delivered",
    first_delivered_at: "2026-06-01T01:00:00.000Z",
    first_evidence_hash: "4".repeat(64),
    delivery_evidence_hash: "4".repeat(64),
    response_due_at: "2026-06-11T01:00:00.000Z",
    responded_at: null,
    second_document_id: null,
    second_delivery_state: "not_created",
    response_json: "{}",
    unused_minutes: 7200,
    standard_day_minutes: 480,
    unused_days: 15,
    source_version: "pkg-overdue-source-v1",
    compliance_state: "open",
    late_reasons_json: "[]",
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T01:00:00.000Z",
  });
  insert(store, "hrx_leave_accrual_rules", {
    tenant_id: TENANT,
    accrual_rule_id: "pkg-fixed-rule",
    rule_code: "PACKAGE_FIXED",
    display_name: "정기 연차 발생",
    policy_version_id: "pkg-policy-v1",
    rule_json: JSON.stringify({
      basis: "fixed_amount",
      schedule: "fixed_annual_date",
      annual_date: "07-13",
      amount_minutes: 480,
      minutes_per_day: 480,
      expiration_months: 12,
      attendance_source_required: true,
      prorate_reduced_schedule: true,
    }),
    status: "active",
    effective_from: "2026-01-01",
    effective_to: null,
    state_version: 1,
    created_at: "2026-07-13T00:00:00.000Z",
    updated_at: "2026-07-13T00:00:00.000Z",
  });

  const ledger = createSqlLeaveBalanceLedger({ store });
  for (const [employeeId, amount] of [[EMPLOYEE, 9600], [PROMOTION_EMPLOYEE, 7200]]) {
    const entitlementId = `pkg-entitlement-${employeeId}`;
    insert(store, "hrx_leave_entitlements", {
      tenant_id: TENANT,
      entitlement_id: entitlementId,
      employee_id: employeeId,
      group_id: "pkg-group",
      policy_version_id: "pkg-policy-v1",
      granted_minutes: amount,
      valid_from: "2026-01-01",
      expires_on: "2026-12-31",
      source_ref: `LeaveAccrualRun:PackageQA:${employeeId}`,
      idempotency_key: entitlementId,
      state_version: 1,
    });
    ledger.append({
      tenant_id: TENANT,
      entry_id: `pkg-earned-${employeeId}`,
      employee_id: employeeId,
      policy_id: "PACKAGE-ANNUAL-2026",
      group_id: "pkg-group",
      policy_version_id: "pkg-policy-v1",
      entitlement_id: entitlementId,
      idempotency_key: `pkg-earned-${employeeId}`,
      entry_type: "earned",
      amount_minutes: amount,
      occurred_on: "2026-01-01",
      source_ref: `LeaveAccrualRun:PackageQA:${employeeId}`,
    });
  }
  store.close();
}

function packagedUrl({ view = "people", section = "people-leave" } = {}) {
  const url = new URL(pathToFileURL(RENDERER_INDEX));
  url.searchParams.set("desktop", "1");
  url.searchParams.set("locale", "ko");
  url.searchParams.set("view", view);
  if (view === "auth") url.searchParams.set("authStep", "login");
  url.searchParams.set("ctx", "allow");
  url.hash = section;
  return url.href;
}

async function findProductPage(app) {
  await app.firstWindow({ timeout: 45_000 });
  for (let attempt = 0; attempt < 90; attempt += 1) {
    for (const candidate of app.windows()) {
      const ready = await candidate.locator("[data-product-axis-nav], [data-login-form='email-password'], [data-login-screen='forest-split']").count().catch(() => 0);
      if (ready) return candidate;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  const diagnostics = await Promise.all(app.windows().map(async (candidate) => ({
    url: candidate.url(),
    title: await candidate.title().catch(() => ""),
    body: (await candidate.textContent("body").catch(() => ""))?.slice(0, 300),
  })));
  throw new Error(`Packaged product window did not become ready: ${JSON.stringify(diagnostics)}`);
}

async function launchPackagedApp() {
  const app = await electron.launch({
    executablePath: EXECUTABLE,
    args: ["--disable-gpu"],
    env: {
      ...packagedQaEnvironment,
      MATTER_DESKTOP_USER_DATA_PATH: userDataPath,
      MATTER_DESKTOP_RUNTIME_STORE_DIR: runtimeStoreDir,
      MATTER_DESKTOP_LOCAL_API_DISABLED: "0",
      MATTER_DESKTOP_LOCAL_API_ENABLED: "1",
      MATTER_DESKTOP_LOCAL_LOGIN_EMAIL: accounts.hr_admin.email,
      LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH: PRIVATE_ROSTER_SOURCE,
      MATTER_DESKTOP_ENV_FILE: path.join(userDataPath, "fixture-only.env"),
      MATTER_DESKTOP_OPERATOR_TOKEN: "",
      MATTER_VAULT_R4_OPERATOR_TOKEN: "",
      MATTER_R4_OPERATOR_TOKEN: "",
      MATTER_OPERATOR_TOKEN: "",
    },
    timeout: 45_000,
  });
  const page = await findProductPage(app);
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.match(page.url(), /matter\.app\/Contents\/Resources\/app\/src\/renderer\/(?:offline\.html|web\/index\.html)/, "packaged QA must use the matter.app renderer");
  return { app, page };
}

async function navigate(page, section, view = "people") {
  await page.evaluate((url) => window.location.assign(url), packagedUrl({ view, section }));
  await page.waitForLoadState("domcontentloaded");
}

async function login(page, account) {
  assert.ok(account?.email && account?.local_dev?.synthetic_token && account?.user_id, "signed-session fixture account is required");
  await page.evaluate(async () => {
    await window.matterSession?.logout?.();
    window.sessionStorage.clear();
  });
  await navigate(page, "", "auth");
  await page.locator("[data-login-email]").fill(account.email);
  await page.locator("[data-login-password]").fill(account.local_dev.synthetic_token);
  await page.locator("[data-login-form='email-password'] button[type='submit']").click();
  await page.waitForFunction(() => new URL(window.location.href).searchParams.get("view") === "home", null, { timeout: 20_000 });
  await page.waitForTimeout(900);
  const status = await page.evaluate(() => window.matterSession?.status?.());
  assert.equal(status?.state, "signed_in");
  assert.equal(status?.user_id, account.user_id);
  return status;
}

async function desktopApi(page, apiPath, { method = "GET", body } = {}) {
  return page.evaluate(async ({ path: requestPath, requestMethod, requestBody }) => {
    const response = await window.matterSession.api({
      path: requestPath,
      method: requestMethod,
      headers: requestBody === undefined ? {} : { "content-type": "application/json" },
      body: requestBody === undefined ? undefined : JSON.stringify(requestBody),
    });
    return {
      status: Number(response?.http_status ?? response?.status ?? 0),
      body: response?.body ?? null,
    };
  }, { path: apiPath, requestMethod: method, requestBody: body });
}

function availableMinutes(body) {
  const balances = Array.isArray(body?.balances) ? body.balances : [];
  return Number(balances.find((row) => row?.group?.group_id === "pkg-group")?.balance?.available_minutes ?? 0);
}

async function capture(page, name, { width, height, selector, role, route, screenshots, geometries }) {
  await page.setViewportSize({ width, height });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(180);
  const geometry = await page.evaluate((target) => ({
    client_width: document.documentElement.clientWidth,
    scroll_width: document.documentElement.scrollWidth,
    target_visible: Boolean(document.querySelector(target)),
  }), selector);
  assert.equal(geometry.target_visible, true, `${name} target must be visible`);
  assert.ok(geometry.scroll_width <= geometry.client_width, `${name} must not overflow horizontally: ${JSON.stringify(geometry)}`);
  const filePath = path.join(ARTIFACT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true, animations: "disabled", caret: "hide" });
  screenshots.push({
    name,
    path: path.relative(ROOT, filePath),
    sha256: sha256File(filePath),
    viewport: { width, height },
    route,
    role,
    runtime_profile: "local-dev",
    source_revision: sourceRevision,
  });
  geometries.push({ name, viewport: { width, height }, ...geometry });
}

async function completeStepUp(page, actorId, purpose) {
  const form = page.locator(".hrx-step-up-form");
  await form.waitFor({ state: "visible", timeout: 15_000 });
  const code = stepUpAuthority.generateTotp({ tenant_id: TENANT, actor_id: actorId, purpose });
  await form.getByLabel("6자리 확인 코드").fill(code);
  await form.getByRole("button", { name: "확인" }).click();
}

async function recordPromotionEvidence(page, { stage, eventType, receipt = "", digest }) {
  const form = page.locator("[data-leave-promotion-evidence='true']");
  await form.waitFor({ state: "visible", timeout: 15_000 });
  await form.getByLabel("증거 단계").selectOption(stage);
  await form.getByLabel("증거 결과").selectOption(eventType);
  await form.getByLabel("전달 확인 번호").fill(receipt);
  await form.getByLabel("증거 SHA-256").fill(digest);
  await form.getByRole("button", { name: "증거 기록" }).click();
  await page.waitForTimeout(250);
}

function durableSnapshot() {
  const store = createFileHrxStore({ filePath: hrxStorePath });
  const balance = createSqlLeaveBalanceLedger({ store }).balance({ tenant_id: TENANT, employee_id: EMPLOYEE, group_id: "pkg-group" });
  const approved = store.query("select", { table: "hrx_leave_requests", where: { tenant_id: TENANT, employee_id: EMPLOYEE, state: "approved" } });
  const cancellations = store.query("select", { table: "hrx_leave_requests", where: { tenant_id: TENANT, employee_id: EMPLOYEE, state: "cancelled" } });
  const promotions = store.query("select", { table: "hrx_leave_promotion_campaigns", where: { tenant_id: TENANT } });
  const recipients = store.query("select", { table: "hrx_leave_promotion_recipients", where: { tenant_id: TENANT } });
  const reconciliations = store.query("select", { table: "hrx_leave_termination_reconciliations", where: { tenant_id: TENANT } });
  const outbox = store.query("select", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT } });
  const deliveries = store.query("select", { table: "hrx_leave_integration_deliveries", where: { tenant_id: TENANT } });
  const adjustments = store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, employee_id: EMPLOYEE, entry_type: "adjustment" } });
  const snapshot = {
    balance,
    approved_requests: approved.map((row) => ({ request_id: row.request_id, state: row.state, start_date: row.start_date, end_date: row.end_date, requested_minutes: row.requested_minutes })),
    cancelled_request_count: cancellations.length,
    promotion_campaign_count: promotions.length,
    promotion_recipient_states: recipients.map((row) => row.state).sort(),
    termination_states: reconciliations.map((row) => row.state).sort(),
    outbox_states: outbox.map((row) => `${row.event_type}:${row.state}`).sort(),
    delivered_boundary_count: deliveries.filter((row) => row.state === "delivered").length,
    manual_adjustment_count: adjustments.length,
  };
  store.close();
  return snapshot;
}

function employeeDocumentIds(employeeId) {
  const store = createFileHrxStore({ filePath: hrxStorePath });
  const ids = store
    .query("select", { table: "hrx_documents", where: { tenant_id: TENANT, employee_id: employeeId } })
    .map((document) => document.document_id)
    .sort();
  store.close();
  return ids;
}

assert.equal(process.platform, "darwin", "leave packaged QA currently targets macOS");
for (const filePath of [EXECUTABLE, RENDERER_INDEX]) assert.equal(existsSync(filePath), true, `${filePath} is required`);
for (const account of Object.values(accounts)) assert.ok(account, "all four role fixtures are required");
mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(path.dirname(DOC_RECEIPT), { recursive: true });

seedPackagedLeaveStore();

let app;
let page;
const pageErrors = [];
const consoleErrors = [];
const screenshots = [];
const geometries = [];
const roleChecks = {};
const scenarios = {};
let firstRuntime;
let secondRuntime;
let beforeRestart;
let afterRestart;
let storeShaBeforeRestart;
let storeShaAfterRestart;
let domainShaBeforeRestart;
let domainShaAfterRestart;

function attachDiagnostics(target) {
  target.on("pageerror", (error) => pageErrors.push(String(error).slice(0, 500)));
  target.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text().replaceAll(/lawos_session_v1\.[A-Za-z0-9._-]+/g, "[redacted-session]");
    consoleErrors.push({ text: text.slice(0, 500), url: message.location().url });
  });
}

try {
  ({ app, page } = await launchPackagedApp());
  attachDiagnostics(page);
  firstRuntime = await page.evaluate(async () => ({
    endpoint: window.matterSession?.desktopApiBaseUrl ?? null,
    status: await window.matterSession?.runtime?.(),
  }));
  assert.match(firstRuntime.endpoint, /^http:\/\/127\.0\.0\.1:\d+$/);
  const health = await fetch(`${firstRuntime.endpoint}/api/health`).then(async (response) => ({ status: response.status, body: await response.json() }));
  assert.equal(health.status, 200);
  consoleErrors.length = 0;

  // 1. Employee half-day request, reservation, cancellation, and balance restoration.
  await login(page, accounts.employee);
  await navigate(page, "people-leave");
  await page.locator("#people-leave").waitFor({ state: "visible", timeout: 20_000 });
  const initialSelf = await desktopApi(page, "/api/hrx/leave/me");
  const initialBalance = availableMinutes(initialSelf.body);
  const requestForm = page.locator(".leave-self-request-form");
  await requestForm.getByLabel("휴가 그룹").selectOption("pkg-group");
  await requestForm.getByLabel("휴가 유형").selectOption("pkg-annual");
  await requestForm.getByLabel("시작일").fill("2026-07-14");
  await requestForm.getByLabel("종료일").fill("2026-07-14");
  await requestForm.getByLabel("사용 단위").selectOption("half_day");
  const halfDayPreviewProbe = await desktopApi(page, "/api/hrx/leave/me/preview", {
    method: "POST",
    body: {
      leave_type_id: "pkg-annual",
      policy_version_id: "pkg-policy-v1",
      start_date: "2026-07-14",
      end_date: "2026-07-14",
      duration_mode: "half_day",
      handover_note: "",
      reason_text: "",
      document_ids: [],
    },
  });
  assert.equal(halfDayPreviewProbe.status, 200, `Packaged leave preview probe failed: ${JSON.stringify(halfDayPreviewProbe.body)}`);
  await requestForm.getByRole("button", { name: "차감 미리보기" }).click();
  try {
    await page.locator('[data-leave-preview="ready"]').getByText("4시간 차감").waitFor({ timeout: 20_000 });
  } catch (error) {
    const diagnostics = await page.evaluate(() => ({
      alert: document.querySelector('[role="alert"]')?.textContent?.trim() ?? null,
      preview: document.querySelector('[data-leave-preview="ready"]')?.textContent?.trim() ?? null,
      form: Object.fromEntries(Array.from(document.querySelectorAll('.leave-self-request-form input, .leave-self-request-form select')).map((element) => [element.getAttribute("aria-label") ?? element.getAttribute("name") ?? element.tagName, element.value])),
    }));
    throw new Error(`Half-day leave preview did not become ready: ${JSON.stringify(diagnostics)}`, { cause: error });
  }
  await requestForm.getByRole("button", { name: "신청", exact: true }).click();
  await page.locator(".leave-request-row .record-state-badge").filter({ hasText: "승인 대기" }).first().waitFor();
  const reservedSelf = await desktopApi(page, "/api/hrx/leave/me");
  await page.getByRole("button", { name: "신청 취소", exact: true }).click();
  await page.locator(".leave-request-row .record-state-badge").filter({ hasText: "취소" }).first().waitFor();
  const restoredSelf = await desktopApi(page, "/api/hrx/leave/me");
  scenarios.employee_half_day_cancel = availableMinutes(reservedSelf.body) === initialBalance - 240 && availableMinutes(restoredSelf.body) === initialBalance;
  assert.equal(scenarios.employee_half_day_cancel, true);
  await capture(page, "01-employee-half-day-cancel-720x900", { width: 720, height: 900, selector: "#people-leave", role: "employee", route: "people-leave", screenshots, geometries });

  // 2-3. Full-day request, manager reschedule, employee response, approval, and integration projection.
  await page.setViewportSize({ width: 1512, height: 900 });
  await requestForm.getByLabel("시작일").fill("2026-07-15");
  await requestForm.getByLabel("종료일").fill("2026-07-15");
  await requestForm.getByLabel("사용 단위").selectOption("full_day");
  await requestForm.getByRole("button", { name: "차감 미리보기" }).click();
  await page.locator('[data-leave-preview="ready"]').getByText("8시간 차감").waitFor();
  await requestForm.getByRole("button", { name: "신청", exact: true }).click();
  await page.locator(".leave-request-row .record-state-badge").filter({ hasText: "승인 대기" }).first().waitFor();

  await login(page, accounts.manager);
  await navigate(page, "people-leave-requests");
  await page.locator("#people-leave-requests").waitFor({ state: "visible", timeout: 20_000 });
  const approvalRow = page.locator(".leave-approval-row").filter({ hasText: "이예진" }).first();
  await approvalRow.waitFor();
  roleChecks.manager_queue_visible = true;
  await approvalRow.getByRole("button", { name: "시기변경 협의" }).click();
  const rescheduleForm = approvalRow.locator(".leave-reschedule-form");
  await rescheduleForm.getByLabel("시작일").fill("2026-07-16");
  await rescheduleForm.getByLabel("종료일").fill("2026-07-16");
  await rescheduleForm.getByLabel("법적·업무상 사유").fill("재판 일정과 담당 인력 배치를 조정합니다.");
  await rescheduleForm.getByLabel("응답 기한").fill("2026-07-20T18:00");
  await rescheduleForm.getByRole("button", { name: "제안 보내기" }).click();
  await page.waitForTimeout(350);
  await capture(page, "02-manager-reschedule-1024x900", { width: 1024, height: 900, selector: "#people-leave-requests", role: "manager", route: "people-leave-requests", screenshots, geometries });

  await login(page, accounts.employee);
  await navigate(page, "people-leave");
  await page.locator(".leave-reschedule-proposal").waitFor({ state: "visible", timeout: 20_000 });
  await page.locator(".leave-reschedule-proposal").getByRole("button", { name: "제안 수락" }).click();
  await page.getByText("2026-07-16", { exact: false }).first().waitFor();

  await login(page, accounts.manager);
  await navigate(page, "people-leave-requests");
  const readyApproval = page.locator(".leave-approval-row").filter({ hasText: "이예진" }).first();
  await readyApproval.waitFor();
  await readyApproval.getByRole("button", { name: "승인", exact: true }).click();
  await readyApproval.waitFor({ state: "hidden" });
  assert.equal(await page.getByText("처리할 휴가 요청이 없습니다.", { exact: true }).count(), 0, "empty approval helper copy must stay absent");
  const approvedSnapshot = durableSnapshot();
  scenarios.full_day_approved_and_projected = approvedSnapshot.approved_requests.some((row) => row.start_date === "2026-07-16" && row.requested_minutes === 480) && approvedSnapshot.delivered_boundary_count >= 4;
  scenarios.reschedule_response_reapproval = approvedSnapshot.approved_requests.some((row) => row.start_date === "2026-07-16");
  assert.equal(scenarios.full_day_approved_and_projected, true);
  assert.equal(scenarios.reschedule_response_reapproval, true);

  // 4. Balance, duplicate, non-workday, and permission failures stay fail-closed.
  await login(page, accounts.employee);
  const commonPreview = { leave_type_id: "pkg-annual", policy_version_id: "pkg-policy-v1", duration_mode: "full_day", handover_note: "", reason_text: "", document_ids: [] };
  const insufficient = await desktopApi(page, "/api/hrx/leave/me/preview", { method: "POST", body: { ...commonPreview, start_date: "2026-08-03", end_date: "2026-12-30" } });
  const duplicate = await desktopApi(page, "/api/hrx/leave/me/preview", { method: "POST", body: { ...commonPreview, start_date: "2026-07-16", end_date: "2026-07-16" } });
  const nonWorkday = await desktopApi(page, "/api/hrx/leave/me/preview", { method: "POST", body: { ...commonPreview, start_date: "2026-07-19", end_date: "2026-07-19" } });
  const integrationDenied = await desktopApi(page, "/api/hrx/leave/integrations");
  const deniedKeys = Object.keys(integrationDenied.body ?? {});
  scenarios.failure_paths = [insufficient.status, duplicate.status, nonWorkday.status, integrationDenied.status].every((status) => status >= 400) && !deniedKeys.some((key) => /^(count|data|integration|items|rows|summary|total)/i.test(key));
  assert.equal(scenarios.failure_paths, true, JSON.stringify({ insufficient, duplicate, nonWorkday, integrationDenied }));
  roleChecks.employee_integration_denied = integrationDenied.status === 403;

  // 5. HR automatic accrual preview, step-up execute, and idempotent rerun.
  await login(page, accounts.hr_admin);
  const hrAccrualProbe = await desktopApi(page, "/api/hrx/leave/accrual/rules");
  assert.equal(hrAccrualProbe.status, 200, `HR accrual access probe failed: ${JSON.stringify(hrAccrualProbe.body)}`);
  await navigate(page, "people-leave-accrual-auto");
  try {
    await page.locator("#people-leave-accrual-auto").waitFor({ state: "visible", timeout: 20_000 });
  } catch (error) {
    const diagnostics = await page.evaluate(async () => {
      const rawEnvelope = window.sessionStorage.getItem("lawos.session.envelope");
      const envelope = rawEnvelope ? JSON.parse(rawEnvelope) : null;
      const status = await window.matterSession?.status?.();
      return {
        url: window.location.href,
        actor_ref: envelope?.actor_ref ?? null,
        accrual_scope: Array.isArray(envelope?.scopes) && envelope.scopes.includes("hrx.leave.accrual.execute"),
        bridge_user_id: status?.user_id ?? null,
        denied: document.querySelector('[data-leave-accrual-access="denied"]')?.textContent?.trim() ?? null,
        visible_text: document.body.innerText.slice(0, 800),
      };
    });
    throw new Error(`HR accrual page did not become ready: ${JSON.stringify(diagnostics)}`, { cause: error });
  }
  await page.getByLabel("실행 방식").selectOption("single");
  await page.locator('select[aria-label="발생 규칙"]').selectOption("pkg-fixed-rule");
  await page.getByLabel("기간 키").fill("2026");
  await page.getByLabel("발생일").fill("2026-07-13");
  await page.getByRole("button", { name: "미리보기" }).click();
  await page.getByText("발생 예정", { exact: true }).first().waitFor();
  await page.getByRole("button", { name: "원장에 반영" }).click();
  await completeStepUp(page, HR_ACTOR, "leave_accrual_execute");
  await page.getByText("발생 완료", { exact: true }).first().waitFor();
  await page.getByRole("button", { name: "원장에 반영" }).click();
  await page.getByText("기발생", { exact: true }).first().waitFor();
  scenarios.automatic_accrual_rerun = true;

  // 6. HR dual-control manual adjustment, ledger, and CSV/XLSX export.
  await navigate(page, "people-leave-accrual-manual");
  await page.locator("#people-leave-accrual-manual").waitFor({ state: "visible", timeout: 20_000 });
  await page.getByLabel("근거 문서").selectOption("pkg-manual-proof");
  await page.getByLabel("휴가 그룹").selectOption("pkg-group");
  await page.getByLabel("조정량(분)").fill("240");
  await page.getByLabel("조정 사유").fill("패키지 원장 정합성 조정");
  await page.getByRole("button", { name: "행 검증" }).click();
  await page.getByText("반영 가능", { exact: true }).waitFor();
  await page.getByLabel("승인 HR").selectOption(MANAGER_ACTOR);
  await page.getByRole("button", { name: "원장 조정 반영" }).click();
  await completeStepUp(page, HR_ACTOR, "leave_ledger_adjustment");
  await page.getByText("반영 완료", { exact: true }).waitFor();

  await navigate(page, "people-leave-usage");
  await page.locator("#people-leave-usage").waitFor({ state: "visible", timeout: 20_000 });
  const csvPath = path.join(ARTIFACT_DIR, "leave-usage.csv");
  const xlsxPath = path.join(ARTIFACT_DIR, "leave-usage.xlsx");
  rmSync(csvPath, { force: true });
  rmSync(xlsxPath, { force: true });
  await app.evaluate(({ session }, targets) => {
    session.defaultSession.on("will-download", (_event, item) => {
      const fileName = item.getFilename().toLowerCase();
      if (fileName.endsWith(".csv")) item.setSavePath(targets.csvPath);
      if (fileName.endsWith(".xlsx")) item.setSavePath(targets.xlsxPath);
    });
  }, { csvPath, xlsxPath });
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  await waitForFile(csvPath);
  await page.getByRole("button", { name: "XLSX", exact: true }).click();
  await waitForFile(xlsxPath);
  const csvText = readFileSync(csvPath, "utf8");
  scenarios.manual_adjustment_and_exports = durableSnapshot().manual_adjustment_count === 1 && csvText.includes("이예진") && !csvText.includes("패키지 원장 정합성 조정") && readFileSync(xlsxPath).subarray(0, 2).toString("ascii") === "PK";
  assert.equal(scenarios.manual_adjustment_and_exports, true);

  // 7. Legal leave promotion first notice, response, second notice, and evidence.
  await navigate(page, "people-annual-leave-notices");
  await page.locator("#people-annual-leave-notices").waitFor({ state: "visible", timeout: 20_000 });
  await page.getByLabel("연차 정책").selectOption("pkg-policy-v1");
  await page.getByRole("button", { name: "대상 미리보기" }).click();
  await page.locator("[data-leave-promotion-preview='true']").waitFor();
  await page.getByRole("button", { name: "캠페인 저장" }).click();
  await page.locator("[data-promotion-recipient-id]").nth(1).waitFor({ timeout: 20_000 });
  const recipients = page.locator("[data-promotion-recipient-id]");
  const firstRecipient = recipients.nth(0);
  await firstRecipient.getByRole("button", { name: "1차", exact: true }).click();
  await firstRecipient.getByRole("button", { name: "처리", exact: true }).click();
  await recordPromotionEvidence(page, { stage: "first", eventType: "delivered", receipt: "pkg-first-delivered", digest: "1".repeat(64) });
  const promotionProcessing = page.locator("[data-leave-promotion-evidence='true']");
  await promotionProcessing.locator("input[type='date']").fill("2026-09-14");
  await promotionProcessing.getByRole("button", { name: "응답 기록" }).click();
  await page.getByLabel("캠페인").selectOption("pkg-overdue-campaign");
  const secondRecipient = page.locator('[data-promotion-recipient-id="pkg-overdue-recipient"]');
  await secondRecipient.waitFor();
  await secondRecipient.getByRole("button", { name: "2차", exact: true }).click();
  await secondRecipient.getByRole("button", { name: "처리", exact: true }).click();
  await recordPromotionEvidence(page, { stage: "second", eventType: "delivered", receipt: "pkg-second-delivered", digest: "3".repeat(64) });
  const promotionSnapshot = durableSnapshot();
  scenarios.promotion_evidence_flow = promotionSnapshot.promotion_campaign_count >= 2 && promotionSnapshot.promotion_recipient_states.some((state) => state === "employee_responded") && promotionSnapshot.promotion_recipient_states.some((state) => state.startsWith("second_notice"));
  assert.equal(scenarios.promotion_evidence_flow, true, JSON.stringify(promotionSnapshot.promotion_recipient_states));
  await capture(page, "03-hr-promotion-1512x900", { width: 1512, height: 900, selector: "#people-annual-leave-notices", role: "hr_admin", route: "people-annual-leave-notices", screenshots, geometries });

  // 8. Termination preview, dual approval, step-up, pending payroll gate, and reconciliation.
  await navigate(page, "people-leave-termination");
  await page.locator("#people-leave-termination").waitFor({ state: "visible", timeout: 20_000 });
  await page.getByLabel("퇴사 예정자").selectOption(EMPLOYEE);
  await page.getByLabel("다른 승인 HR").selectOption(MANAGER_ACTOR);
  await page.getByRole("button", { name: "정산 미리보기" }).click();
  await page.getByText("미리보기", { exact: true }).first().waitFor();
  await page.getByRole("button", { name: "정산 실행" }).click();
  await completeStepUp(page, HR_ACTOR, "leave_termination_settlement");
  await page.getByText("급여 동기화 대기", { exact: true }).first().waitFor();
  await page.getByText("급여 전달 확인 대기", { exact: true }).waitFor();
  const pendingTermination = durableSnapshot();
  assert.ok(pendingTermination.termination_states.includes("approved_pending_sync"));
  await capture(page, "04-hr-termination-pending-720x900", { width: 720, height: 900, selector: "#people-leave-termination", role: "hr_admin", route: "people-leave-termination", screenshots, geometries });
  await page.setViewportSize({ width: 1512, height: 900 });
  await navigate(page, "people-leave-usage");
  await page.locator("#people-leave-usage").waitFor({ state: "visible", timeout: 20_000 });
  await page.locator(".leave-integration-status > summary").click();
  await page.getByRole("button", { name: "대기 항목 처리" }).click();
  await page.getByText("급여 · 연결됨", { exact: true }).last().waitFor();
  const reconciledTermination = durableSnapshot();
  scenarios.termination_offboarding_payroll = reconciledTermination.termination_states.includes("approved_and_synced");
  assert.equal(scenarios.termination_offboarding_payroll, true);

  // 9. Role routes, counts, and document boundaries.
  roleChecks.hr_integration_panel_visible = await page.locator("[data-leave-integration-status='true']").count() === 1;
  const hrDocuments = await desktopApi(page, "/api/hrx/leave/accrual/manual/evidence-documents");
  roleChecks.hr_document_access = hrDocuments.status === 200 && Array.isArray(hrDocuments.body?.documents);
  await login(page, accounts.employee);
  await navigate(page, "people-leave-usage");
  await page.locator("#people-leave-usage").waitFor({ state: "visible", timeout: 20_000 });
  roleChecks.employee_integration_panel_hidden = await page.locator("[data-leave-integration-status='true']").count() === 0;
  const employeeDocuments = await desktopApi(page, "/api/hrx/leave/me/evidence-documents");
  const expectedEmployeeDocumentIds = employeeDocumentIds(EMPLOYEE);
  const returnedEmployeeDocumentIds = Array.isArray(employeeDocuments.body?.documents)
    ? employeeDocuments.body.documents.map((document) => document.document_id).sort()
    : [];
  roleChecks.employee_document_scope = employeeDocuments.status === 200 && JSON.stringify(returnedEmployeeDocumentIds) === JSON.stringify(expectedEmployeeDocumentIds);

  await login(page, accounts.other_tenant);
  await navigate(page, "people-leave");
  await page.locator("#people-leave").waitFor({ state: "visible", timeout: 20_000 });
  const otherTenantSelf = await desktopApi(page, "/api/hrx/leave/me");
  const otherTenantDocuments = await desktopApi(page, "/api/hrx/leave/me/evidence-documents");
  roleChecks.other_tenant_denied_without_counts = otherTenantSelf.status >= 400 && otherTenantDocuments.status >= 400 && !Object.keys(otherTenantSelf.body ?? {}).some((key) => /^(count|data|documents|items|rows|summary|total)/i.test(key));
  await capture(page, "05-other-tenant-denied-720x900", { width: 720, height: 900, selector: "#people-leave", role: "other_tenant", route: "people-leave", screenshots, geometries });
  scenarios.role_and_attachment_boundaries = Object.values(roleChecks).every(Boolean);
  assert.equal(scenarios.role_and_attachment_boundaries, true, JSON.stringify(roleChecks));

  // Final five-viewport packaged manifest under the HR signed session.
  await login(page, accounts.hr_admin);
  await navigate(page, "people-leave-usage");
  await page.locator("#people-leave-usage").waitFor({ state: "visible", timeout: 20_000 });
  for (const viewport of [
    { width: 1512, height: 900 },
    { width: 1280, height: 820 },
    { width: 1024, height: 800 },
    { width: 820, height: 900 },
    { width: 720, height: 900 },
  ]) {
    await capture(page, `viewport-${viewport.width}x${viewport.height}`, {
      ...viewport,
      selector: "#people-leave-usage",
      role: "hr_admin",
      route: "people-leave-usage",
      screenshots,
      geometries,
    });
  }

  beforeRestart = durableSnapshot();
  storeShaBeforeRestart = sha256File(hrxStorePath);
  domainShaBeforeRestart = sha256Bytes(JSON.stringify(beforeRestart));
  await app.close();
  app = null;

  // 10. Relaunch the exact app, restore the tokenless desktop session, and verify durable-store restoration.
  ({ app, page } = await launchPackagedApp());
  attachDiagnostics(page);
  const restoredSession = await page.evaluate(() => window.matterSession?.status?.());
  assert.equal(restoredSession?.state, "signed_in");
  assert.equal(restoredSession?.user_id, HR_ACTOR);
  secondRuntime = await page.evaluate(async () => ({
    endpoint: window.matterSession?.desktopApiBaseUrl ?? null,
    status: await window.matterSession?.runtime?.(),
  }));
  assert.match(secondRuntime.endpoint, /^http:\/\/127\.0\.0\.1:\d+$/);
  const secondHealth = await fetch(`${secondRuntime.endpoint}/api/health`).then(async (response) => ({ status: response.status, body: await response.json() }));
  assert.equal(secondHealth.status, 200);
  await navigate(page, "people-leave-usage");
  await page.locator("#people-leave-usage").waitFor({ state: "visible", timeout: 20_000 });
  await page.getByText("업무 시스템 연동", { exact: true }).waitFor();
  afterRestart = durableSnapshot();
  storeShaAfterRestart = sha256File(hrxStorePath);
  domainShaAfterRestart = sha256Bytes(JSON.stringify(afterRestart));
  scenarios.restart_persistence = JSON.stringify(afterRestart) === JSON.stringify(beforeRestart) && domainShaAfterRestart === domainShaBeforeRestart;
  assert.equal(scenarios.restart_persistence, true);
  await capture(page, "06-restart-restored-1280x820", { width: 1280, height: 820, selector: "#people-leave-usage", role: "hr_admin_restored", route: "people-leave-usage", screenshots, geometries });

  const unexpectedConsoleErrors = consoleErrors.filter((entry) => !entry.text.includes("WebSocket") && !entry.url.includes("24678"));
  assert.equal(pageErrors.length, 0, JSON.stringify(pageErrors));
  assert.equal(unexpectedConsoleErrors.length, 0, JSON.stringify(unexpectedConsoleErrors));
  assert.ok(geometries.every((row) => row.scroll_width <= row.client_width && row.target_visible));
  assert.ok(Object.values(scenarios).every(Boolean));

  const rendererSha = sha256Directory(path.join(PACKAGED_APP_ROOT, "src/renderer/web"));
  const windowsRendererSha = sha256Directory(path.join(WINDOWS_PACKAGE_ROOT, "resources/app/src/renderer/web"));
  assert.equal(windowsRendererSha, rendererSha, "macOS and Windows packages must contain the same Forest renderer");
  assert.equal(readFileSync(WINDOWS_EXECUTABLE).subarray(0, 2).toString("ascii"), "MZ", "Windows executable must have a PE MZ header");
  execFileSync("/usr/bin/unzip", ["-tqq", WINDOWS_ZIP]);
  const packagedSourceSha = sha256Directory(PACKAGED_APP_ROOT);
  const appBundleSha = sha256Bytes(Buffer.concat([
    readFileSync(EXECUTABLE),
    Buffer.from(packagedSourceSha),
    readFileSync(path.join(APP_BUNDLE, "Contents/Info.plist")),
  ]));
  const receipt = {
    schema_version: "law-firm-os.leave-management.package-qa.v1",
    generated_at: new Date().toISOString(),
    verdict: "PASS",
    synthetic_only: true,
    source: {
      revision: sourceRevision,
      tree_sha256: sourceTreeSha(),
      build_renderer_sha256: rendererSha,
      packaged_source_sha256: packagedSourceSha,
    },
    app: {
      bundle: path.relative(ROOT, APP_BUNDLE),
      executable: path.relative(ROOT, EXECUTABLE),
      app_bundle_sha256: appBundleSha,
      executable_sha256: sha256File(EXECUTABLE),
      verification_scope: "functional_only",
      release_channel: "not_attested_by_functional_qa",
      signed: null,
      notarized: null,
    },
    windows_package: {
      package_directory: path.relative(ROOT, WINDOWS_PACKAGE_ROOT),
      executable: path.relative(ROOT, WINDOWS_EXECUTABLE),
      executable_sha256: sha256File(WINDOWS_EXECUTABLE),
      unsigned_zip: path.relative(ROOT, WINDOWS_ZIP),
      unsigned_zip_sha256: sha256File(WINDOWS_ZIP),
      renderer_sha256: windowsRendererSha,
      renderer_matches_macos: windowsRendererSha === rendererSha,
      pe_header: "MZ",
      archive_test: "pass",
      native_runtime_smoke: "not_run_on_darwin",
      verification_scope: "package_structure_and_renderer_parity",
      authenticode_signed: false,
    },
    runtime: {
      profile: "local-dev",
      endpoint_kind: "loopback_ephemeral",
      first_endpoint: firstRuntime.endpoint,
      second_endpoint: secondRuntime.endpoint,
      first_status: firstRuntime.status,
      second_status: secondRuntime.status,
      user_data_path: userDataPath,
      runtime_store_dir: runtimeStoreDir,
      migration_version: HRX_CORE_MIGRATIONS.at(-1)?.id ?? null,
    },
    roles: Object.fromEntries(Object.entries(accounts).map(([role, account]) => [role, {
      user_id: account.user_id,
      tenant_ids: account.tenant_memberships.map((membership) => membership.tenant_id),
    }])),
    scenarios,
    role_checks: roleChecks,
    restart: {
      session_restoration_mode: "tokenless_loopback_session_restored",
      secure_session_restoration_claim: false,
      before: beforeRestart,
      after: afterRestart,
      identical: scenarios.restart_persistence,
      domain_snapshot_sha256_before: domainShaBeforeRestart,
      domain_snapshot_sha256_after: domainShaAfterRestart,
      store_file_sha256_before: storeShaBeforeRestart,
      store_file_sha256_after: storeShaAfterRestart,
      store_file_hash_expected_to_change_with_audit_events: true,
    },
    viewport_manifest: screenshots.filter((item) => item.name.startsWith("viewport-")),
    screenshots,
    geometry: geometries,
    console: {
      page_error_count: pageErrors.length,
      console_error_count: unexpectedConsoleErrors.length,
      ignored_hmr_error_count: consoleErrors.length - unexpectedConsoleErrors.length,
    },
    boundaries: {
      real_employee_data_used: false,
      external_provider_write_claim: false,
      production_ready_claim: false,
      public_release_claim: false,
      go_live_claim: false,
      legal_labor_approval_claim: false,
    },
  };
  writeFileSync(DOC_RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);
  writeFileSync(RESTART_RECEIPT, `${JSON.stringify({ schema_version: receipt.schema_version, generated_at: receipt.generated_at, restart: receipt.restart, runtime: receipt.runtime, boundaries: receipt.boundaries }, null, 2)}\n`);
  writeFileSync(CONSOLE_RECEIPT, `${JSON.stringify({ schema_version: receipt.schema_version, generated_at: receipt.generated_at, page_errors: pageErrors, console_errors: unexpectedConsoleErrors, ignored_hmr_errors: consoleErrors.filter((entry) => !unexpectedConsoleErrors.includes(entry)) }, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ verdict: "PASS", receipt: path.relative(ROOT, DOC_RECEIPT), scenarios, screenshots: screenshots.length, console_errors: unexpectedConsoleErrors.length }, null, 2)}\n`);
} finally {
  if (app) await app.close().catch(() => {});
  rmSync(userDataPath, { recursive: true, force: true });
}
