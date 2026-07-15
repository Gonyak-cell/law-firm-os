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
import { createHrxStepUpAuthority } from "../apps/api/src/hrx-step-up-token.js";
import { findRegisteredAccountByUserId } from "../apps/api/src/matter-vault-account-registry.js";
import { HRX_CORE_MIGRATIONS } from "../packages/hrx/src/migrations/index.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP_BUNDLE = path.join(ROOT, "apps/desktop/dist/mac/matter.app");
const EXECUTABLE = path.join(APP_BUNDLE, "Contents/MacOS/matter");
const PACKAGED_APP_ROOT = path.join(APP_BUNDLE, "Contents/Resources/app");
const RENDERER_ROOT = path.join(PACKAGED_APP_ROOT, "src/renderer/web");
const RENDERER_INDEX = path.join(RENDERER_ROOT, "index.html");
const desktopPackage = JSON.parse(readFileSync(path.join(ROOT, "apps/desktop/package.json"), "utf8"));
const WINDOWS_PACKAGE_ROOT = path.join(ROOT, `apps/desktop/dist/win/matter-internal-${desktopPackage.version}-win32-x64`);
const WINDOWS_RENDERER_ROOT = path.join(WINDOWS_PACKAGE_ROOT, "resources/app/src/renderer/web");
const WINDOWS_EXECUTABLE = path.join(WINDOWS_PACKAGE_ROOT, "matter.exe");
const WINDOWS_ZIP = path.join(ROOT, `apps/desktop/dist/win/matter-internal-${desktopPackage.version}-win32-x64-unsigned.zip`);
const PRIVATE_ROSTER_SOURCE = path.join(ROOT, "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json");
const ARTIFACT_DIR = path.resolve(process.env.MATTER_PAYROLL_PACKAGE_QA_ARTIFACT_DIR || path.join(ROOT, "output/playwright/payroll-package"));
const DOC_RECEIPT = path.join(ROOT, "docs/lazycodex/evidence/matter-desktop/artifacts/payroll-package-qa-2026-07-15.json");
const TENANT = "tenant_amic_matter_vault";
const RUN_ID = "payroll-run-2026-07";
const STEP_UP_STORAGE_KEY = "lawos_hrx_step_up_token";
const sourceRevision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
const userDataPath = mkdtempSync(path.join(tmpdir(), "matter-payroll-package-qa-"));
const runtimeStoreDir = path.join(userDataPath, "runtime-stores");
const hrxStorePath = path.join(runtimeStoreDir, "hrx-store.json");
const stepUpAuthority = createHrxStepUpAuthority();

const accounts = Object.freeze({
  preparer: findRegisteredAccountByUserId("user_amic_jwsuh"),
  payment_approver: findRegisteredAccountByUserId("user_amic_ytkim"),
  employee: findRegisteredAccountByUserId("user_amic_yjlee"),
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
      if (entry.isDirectory()) visit(absolutePath);
      else if (entry.isFile()) {
        hash.update(path.relative(directoryPath, absolutePath));
        hash.update(readFileSync(absolutePath));
      }
    }
  }
  visit(directoryPath);
  return hash.digest("hex");
}

function packagedUrl(section, view = "people") {
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
      if (await candidate.locator("[data-product-axis-nav], [data-login-form='email-password'], [data-login-screen='forest-split']").count().catch(() => 0)) return candidate;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Packaged product window did not become ready");
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
      MATTER_DESKTOP_LOCAL_LOGIN_EMAIL: accounts.preparer.email,
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
  assert.match(page.url(), /matter\.app\/Contents\/Resources\/app\/src\/renderer\/(?:offline\.html|web\/index\.html)/);
  return { app, page };
}

async function navigate(page, section, view = "people") {
  await page.evaluate((url) => window.location.assign(url), packagedUrl(section, view));
  await page.waitForLoadState("domcontentloaded");
}

async function login(page, account) {
  assert.ok(account?.email && account?.local_dev?.synthetic_token && account?.user_id);
  await page.evaluate(async () => {
    await window.matterSession?.logout?.();
    window.sessionStorage.clear();
  });
  await navigate(page, "", "auth");
  await page.locator("[data-login-email]").fill(account.email);
  await page.locator("[data-login-password]").fill(account.local_dev.synthetic_token);
  await page.locator("[data-login-form='email-password'] button[type='submit']").click();
  await page.waitForFunction(() => new URL(window.location.href).searchParams.get("view") === "home", null, { timeout: 20_000 });
  await page.waitForTimeout(500);
  const status = await page.evaluate(() => window.matterSession?.status?.());
  assert.equal(status?.state, "signed_in");
  assert.equal(status?.user_id, account.user_id);
}

async function desktopApi(page, apiPath, { method = "GET", body } = {}) {
  return page.evaluate(async ({ requestPath, requestMethod, requestBody, stepUpKey }) => {
    const stepUpToken = window.sessionStorage.getItem(stepUpKey) ?? "";
    const response = await window.matterSession.api({
      path: requestPath,
      method: requestMethod,
      headers: {
        ...(requestBody === undefined ? {} : { "content-type": "application/json" }),
        ...(stepUpToken ? { "x-lawos-hrx-step-up": stepUpToken } : {}),
      },
      body: requestBody === undefined ? undefined : JSON.stringify(requestBody),
    });
    return { status: Number(response?.http_status ?? response?.status ?? 0), body: response?.body ?? null };
  }, { requestPath: apiPath, requestMethod: method, requestBody: body, stepUpKey: STEP_UP_STORAGE_KEY });
}

async function expectApi(page, apiPath, options, expectedStatus = 200) {
  const result = await desktopApi(page, apiPath, options);
  assert.equal(result.status, expectedStatus, `${options?.method ?? "GET"} ${apiPath}: ${JSON.stringify(result.body)}`);
  return result.body;
}

async function activateStepUp(page, account, purpose = "payroll_export_review") {
  const totp = stepUpAuthority.generateTotp({ tenant_id: TENANT, actor_id: account.user_id, purpose });
  const result = await expectApi(page, "/api/auth/step-up", { method: "POST", body: { purpose, totp_code: totp } });
  assert.match(result.step_up_token ?? "", /^lawos_hrx_step_up_v1\./);
  await page.evaluate(({ key, token }) => window.sessionStorage.setItem(key, token), { key: STEP_UP_STORAGE_KEY, token: result.step_up_token });
}

async function runBundle(page) {
  return (await expectApi(page, `/api/hrx/payroll/runs/${RUN_ID}`)).bundle;
}

async function capture(page, name, selector, width, height, screenshots, geometry) {
  await page.setViewportSize({ width, height });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(180);
  const measured = await page.evaluate((target) => {
    const root = document.documentElement;
    const panel = document.querySelector(target);
    const rows = [...(panel?.querySelectorAll("table tbody tr") ?? [])].filter((row) => row.getBoundingClientRect().height > 0);
    return {
      target_visible: Boolean(panel),
      client_width: root.clientWidth,
      scroll_width: root.scrollWidth,
      row_heights: rows.map((row) => Math.round(row.getBoundingClientRect().height)),
      broken_images: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
    };
  }, selector);
  assert.equal(measured.target_visible, true);
  assert.ok(measured.scroll_width <= measured.client_width, JSON.stringify(measured));
  assert.ok(measured.row_heights.every((heightValue) => heightValue === 44), JSON.stringify(measured));
  assert.equal(measured.broken_images, 0);
  const filePath = path.join(ARTIFACT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true, animations: "disabled", caret: "hide" });
  screenshots.push({ name, path: path.relative(ROOT, filePath), sha256: sha256File(filePath), viewport: { width, height } });
  geometry.push({ name, ...measured });
}

function workflowSnapshot(bundle) {
  return {
    run_status: bundle.run?.status,
    employee_count: bundle.employees?.length ?? 0,
    totals: bundle.totals,
    statement_states: (bundle.statements ?? []).map((row) => row.state).sort(),
    payment_states: (bundle.payment_batches ?? []).map((row) => row.state).sort(),
    filing_states: (bundle.filings ?? []).map((row) => `${row.filing_kind}:${row.state}`).sort(),
    year_end_state: bundle.year_end?.state ?? null,
  };
}

for (const filePath of [EXECUTABLE, RENDERER_INDEX, WINDOWS_EXECUTABLE, WINDOWS_ZIP]) {
  assert.equal(existsSync(filePath), true, `${filePath} is required`);
}
for (const account of Object.values(accounts)) assert.ok(account);
mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(path.dirname(DOC_RECEIPT), { recursive: true });

let app;
let page;
const pageErrors = [];
const consoleErrors = [];
const screenshots = [];
const geometry = [];
const scenarios = {};
let runtimeBeforeRestart;
let runtimeAfterRestart;
let beforeRestart;
let afterRestart;

function attachDiagnostics(target) {
  target.on("pageerror", (error) => pageErrors.push(String(error).slice(0, 500)));
  target.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text().replaceAll(/lawos_(?:session|hrx_step_up)_v1\.[A-Za-z0-9._-]+/g, "[redacted-token]");
    consoleErrors.push({ text: text.slice(0, 500), url: message.location().url });
  });
}

try {
  ({ app, page } = await launchPackagedApp());
  attachDiagnostics(page);
  runtimeBeforeRestart = await page.evaluate(async () => ({ endpoint: window.matterSession?.desktopApiBaseUrl ?? null, status: await window.matterSession?.runtime?.() }));
  assert.match(runtimeBeforeRestart.endpoint, /^http:\/\/127\.0\.0\.1:\d+$/);
  await login(page, accounts.preparer);
  await activateStepUp(page, accounts.preparer);

  const workspace = (await expectApi(page, "/api/hrx/payroll/periods")).workspace;
  assert.equal(workspace.periods[0].runs[0].run_id, RUN_ID);
  const captureResult = await expectApi(page, `/api/hrx/payroll/runs/${RUN_ID}/snapshot`, { method: "POST", body: {} });
  assert.equal(captureResult.capture.ready, true, JSON.stringify(captureResult.capture.issues));
  await expectApi(page, `/api/hrx/payroll/runs/${RUN_ID}/preview`, { method: "POST", body: {} });
  let bundle = await runBundle(page);
  for (const issue of bundle.issues.filter((row) => row.state === "open")) {
    await expectApi(page, `/api/hrx/payroll/issues/${encodeURIComponent(issue.issue_id)}/resolve`, {
      method: "POST",
      body: { expected_version: issue.state_version, state: "resolved", resolution_code: "REVIEWED_SOURCE_EVIDENCE" },
    });
  }
  await expectApi(page, `/api/hrx/payroll/runs/${RUN_ID}/approve`, { method: "POST", body: {} });
  await expectApi(page, `/api/hrx/payroll/runs/${RUN_ID}/close`, { method: "POST", body: {} });
  bundle = await runBundle(page);
  scenarios.closed_run = bundle.run.status === "closed" && bundle.employees.length === 10 && bundle.totals.net_krw > 0;
  assert.equal(scenarios.closed_run, true);

  const generated = (await expectApi(page, `/api/hrx/payroll/runs/${RUN_ID}/statements/generate`, { method: "POST", body: {} })).generated;
  const delivered = (await expectApi(page, `/api/hrx/payroll/runs/${RUN_ID}/statements/deliver`, { method: "POST", body: { channel: "self_service" } })).delivery;
  scenarios.statements_generated_and_delivered = generated.statement_count === 10 && delivered.delivered_count === 10;
  assert.equal(scenarios.statements_generated_and_delivered, true);

  const prepared = (await expectApi(page, `/api/hrx/payroll/runs/${RUN_ID}/payments/prepare`, { method: "POST", body: {} })).payment;
  const paymentBatchId = prepared.batch.payment_batch_id;
  await login(page, accounts.payment_approver);
  await activateStepUp(page, accounts.payment_approver);
  await expectApi(page, `/api/hrx/payroll/payment-batches/${paymentBatchId}/approve`, { method: "POST", body: {} });
  await expectApi(page, `/api/hrx/payroll/payment-batches/${paymentBatchId}/export`, { method: "POST", body: {} });
  const reconciled = (await expectApi(page, `/api/hrx/payroll/payment-batches/${paymentBatchId}/reconcile`, { method: "POST", body: {} })).payment;
  scenarios.payment_reconciled = reconciled.batch.state === "reconciled" && reconciled.items.every((row) => row.state === "paid");
  assert.equal(scenarios.payment_reconciled, true);

  await login(page, accounts.preparer);
  await activateStepUp(page, accounts.preparer);
  await expectApi(page, `/api/hrx/payroll/runs/${RUN_ID}/year-end/collect`, { method: "POST", body: {} });
  await expectApi(page, `/api/hrx/payroll/runs/${RUN_ID}/year-end/calculate`, { method: "POST", body: {} });
  await login(page, accounts.payment_approver);
  await activateStepUp(page, accounts.payment_approver);
  await expectApi(page, `/api/hrx/payroll/runs/${RUN_ID}/year-end/review`, { method: "POST", body: {} });
  await login(page, accounts.preparer);
  await activateStepUp(page, accounts.preparer);
  const filingIds = [];
  for (const filingKind of ["withholding", "payment_statement", "social_insurance", "year_end"]) {
    let filing = (await expectApi(page, `/api/hrx/payroll/runs/${RUN_ID}/filings`, { method: "POST", body: { filing_kind: filingKind } })).filing;
    filing = (await expectApi(page, `/api/hrx/payroll/filings/${filing.filing_job_id}/validate`, { method: "POST", body: {} })).filing;
    filingIds.push({ filingKind, filingJobId: filing.filing_job_id });
  }
  await login(page, accounts.payment_approver);
  await activateStepUp(page, accounts.payment_approver);
  for (const { filingKind, filingJobId } of filingIds) {
    let filing = { filing_job_id: filingJobId, state: "validated" };
    for (let attempt = 0; attempt < 2 && filing.state !== "accepted"; attempt += 1) {
      const submitted = (await expectApi(page, `/api/hrx/payroll/filings/${filing.filing_job_id}/submit`, { method: "POST", body: {} })).submission;
      filing = submitted.job;
    }
    assert.equal(filing.state, "accepted", `${filingKind}: ${JSON.stringify(filing)}`);
  }
  scenarios.four_filings_accepted = true;

  await login(page, accounts.preparer);
  await activateStepUp(page, accounts.preparer);
  await navigate(page, "people-payroll");
  await page.locator("#people-payroll [data-payroll-employee]").first().waitFor({ timeout: 20_000 });
  assert.match(await page.locator("#people-payroll").innerText(), /2026-07\s*·\s*마감/);
  const opener = page.locator("[data-payroll-employee] .payroll-employee-button").first();
  await opener.click();
  const detail = page.getByRole("dialog", { name: /급여 상세$/ });
  await detail.waitFor();
  scenarios.detail_initial_focus = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") === "급여 상세 닫기");
  await page.keyboard.press("Escape");
  await detail.waitFor({ state: "hidden" });
  scenarios.detail_focus_restored = await opener.evaluate((element) => document.activeElement === element);
  await page.getByRole("tab", { name: "지급" }).click();
  await page.getByText("대사 완료", { exact: true }).waitFor();
  await page.getByRole("tab", { name: "신고" }).click();
  assert.equal(await page.getByText("접수", { exact: true }).count(), 4);
  await page.getByRole("tab", { name: "정산" }).click();
  await capture(page, "payroll-workspace-1280x820", "#people-payroll", 1280, 820, screenshots, geometry);
  await capture(page, "payroll-workspace-720x800", "#people-payroll", 720, 800, screenshots, geometry);

  await navigate(page, "people-pay-statement");
  await page.locator("#people-pay-statement tbody tr").first().waitFor({ timeout: 20_000 });
  scenarios.preparer_statement_management = await page.locator("#people-pay-statement tbody tr").count() === 10
    && await page.locator(".payroll-statement-toolbar").isVisible()
    && await page.getByRole("button", { name: "CSV", exact: true }).isVisible()
    && await page.getByRole("button", { name: "XLSX", exact: true }).isVisible();
  assert.equal(scenarios.preparer_statement_management, true);
  await capture(page, "payroll-statements-1280x820", "#people-pay-statement", 1280, 820, screenshots, geometry);

  await login(page, accounts.employee);
  await activateStepUp(page, accounts.employee);
  await navigate(page, "people-pay-statement");
  await page.getByText("내 명세서", { exact: true }).waitFor({ timeout: 20_000 });
  scenarios.employee_self_statement = await page.locator("#people-pay-statement tbody tr").count() === 1
    && await page.locator(".payroll-statement-toolbar").count() === 0;
  assert.equal(scenarios.employee_self_statement, true);
  await capture(page, "payroll-self-statement-720x800", "#people-pay-statement", 720, 800, screenshots, geometry);

  await login(page, accounts.preparer);
  await activateStepUp(page, accounts.preparer);
  beforeRestart = workflowSnapshot(await runBundle(page));
  await app.close();
  app = null;

  ({ app, page } = await launchPackagedApp());
  attachDiagnostics(page);
  runtimeAfterRestart = await page.evaluate(async () => ({ endpoint: window.matterSession?.desktopApiBaseUrl ?? null, status: await window.matterSession?.runtime?.() }));
  assert.match(runtimeAfterRestart.endpoint, /^http:\/\/127\.0\.0\.1:\d+$/);
  const restoredSession = await page.evaluate(() => window.matterSession?.status?.());
  assert.equal(restoredSession?.state, "signed_in");
  assert.equal(restoredSession?.user_id, accounts.preparer.user_id);
  await activateStepUp(page, accounts.preparer);
  afterRestart = workflowSnapshot(await runBundle(page));
  scenarios.restart_persistence = JSON.stringify(afterRestart) === JSON.stringify(beforeRestart);
  assert.equal(scenarios.restart_persistence, true, JSON.stringify({ beforeRestart, afterRestart }));
  await navigate(page, "people-payroll");
  await page.locator("#people-payroll [data-payroll-employee]").first().waitFor({ timeout: 20_000 });
  await capture(page, "payroll-restart-restored-1280x820", "#people-payroll", 1280, 820, screenshots, geometry);

  const unexpectedConsoleErrors = consoleErrors.filter((entry) => !entry.text.includes("WebSocket") && !entry.url.includes("24678"));
  assert.equal(pageErrors.length, 0, JSON.stringify(pageErrors));
  assert.equal(unexpectedConsoleErrors.length, 0, JSON.stringify(unexpectedConsoleErrors));
  assert.ok(Object.values(scenarios).every(Boolean), JSON.stringify(scenarios));

  const rendererSha = sha256Directory(RENDERER_ROOT);
  const windowsRendererSha = sha256Directory(WINDOWS_RENDERER_ROOT);
  assert.equal(windowsRendererSha, rendererSha);
  assert.equal(readFileSync(WINDOWS_EXECUTABLE).subarray(0, 2).toString("ascii"), "MZ");
  execFileSync("/usr/bin/unzip", ["-tqq", WINDOWS_ZIP]);
  const receipt = {
    schema_version: "law-firm-os.payroll.package-qa.v0.1",
    generated_at: new Date().toISOString(),
    verdict: "PASS",
    synthetic_only: true,
    source: { revision: sourceRevision, renderer_sha256: rendererSha },
    macos: {
      bundle: path.relative(ROOT, APP_BUNDLE),
      executable: path.relative(ROOT, EXECUTABLE),
      executable_sha256: sha256File(EXECUTABLE),
      renderer_sha256: rendererSha,
      native_runtime_smoke: "pass",
      release_channel: "internal",
      signed_for_distribution: false,
      notarized: false,
    },
    windows: {
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
      authenticode_signed: false,
    },
    runtime: {
      profile: "local-dev",
      endpoint_kind: "loopback_ephemeral",
      first_endpoint: runtimeBeforeRestart.endpoint,
      second_endpoint: runtimeAfterRestart.endpoint,
      migration_version: HRX_CORE_MIGRATIONS.at(-1)?.id ?? null,
      session_restoration: "tokenless_loopback_session_restored",
    },
    workflow: { before_restart: beforeRestart, after_restart: afterRestart, scenarios },
    screenshots,
    geometry,
    diagnostics: { page_error_count: pageErrors.length, console_error_count: unexpectedConsoleErrors.length },
    boundaries: {
      real_employee_data_used: false,
      external_provider_write_claim: false,
      policy_approval_claim: false,
      legal_tax_approval_claim: false,
      production_ready_claim: false,
      public_release_claim: false,
      go_live_claim: false,
    },
  };
  writeFileSync(DOC_RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ verdict: "PASS", receipt: path.relative(ROOT, DOC_RECEIPT), scenarios, screenshots: screenshots.length }, null, 2)}\n`);
} finally {
  if (app) await app.close().catch(() => {});
  rmSync(userDataPath, { recursive: true, force: true });
}
