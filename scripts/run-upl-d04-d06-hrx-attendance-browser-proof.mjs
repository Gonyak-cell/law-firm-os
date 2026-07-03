#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { startApiServer } from "../apps/api/src/server.js";
import { highestPrivilegeRegisteredAccount, MATTER_VAULT_REGISTERED_TENANT_ID } from "../apps/api/src/matter-vault-account-registry.js";
import { apiSessionHeaders } from "../apps/api/test/helpers/session.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = "artifacts/manual-qa";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/upl-d04-d06-hrx-attendance-browser-proof-2026-07-03.json`;
const MD_PATH = `${ARTIFACT_DIR}/upl-d04-d06-hrx-attendance-browser-proof-2026-07-03.md`;
const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const ACCOUNT = highestPrivilegeRegisteredAccount();
const PROOF_PORT = 5204;
const PROOF_MONTH = "2026-07";
const PROOF_DATE = "2026-07-15";

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function check(id, passed, evidence = {}) {
  return { id, passed: Boolean(passed), evidence };
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitForHttp(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return response;
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function startVite(apiBaseUrl) {
  const child = spawn("npm", ["--workspace", "apps/web", "run", "dev", "--", "--port", String(PROOF_PORT)], {
    cwd: ROOT,
    env: { ...process.env, LAWOS_WEB_API_PROXY_TARGET: apiBaseUrl },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  await waitForHttp(`http://127.0.0.1:${PROOF_PORT}/?view=auth&authStep=login`);
  return { child, stderr: () => stderr };
}

async function stopProcess(child) {
  if (!child || child.killed) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolveStop) => child.once("exit", resolveStop)),
    sleep(3000).then(() => {
      if (!child.killed) child.kill("SIGKILL");
    }),
  ]);
}

async function startApi(hrxStorePath) {
  const started = await startApiServer({ port: 0, hrxStorePath });
  return {
    ...started,
    baseUrl: `http://${started.host}:${started.port}`,
    close: () => new Promise((resolveClose) => started.server.close(resolveClose)),
  };
}

async function json(baseUrl, path, { method = "GET", body, headers } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  return { status: response.status, body: payload, response_hash: sha256(payload) };
}

mkdirSync(resolve(ROOT, ARTIFACT_DIR), { recursive: true });
mkdirSync(resolve(ROOT, SCREENSHOT_DIR), { recursive: true });

const proofRoot = mkdtempSync(join(tmpdir(), "lawos-upl-d04-d06-"));
const hrxStorePath = join(proofRoot, "hrx-store.json");
let api = null;
let vite = null;
let browser = null;

try {
  api = await startApi(hrxStorePath);
  const sessionHeaders = await apiSessionHeaders(api.baseUrl, ACCOUNT);
  const employees = await json(api.baseUrl, "/api/hrx/employees", { headers: sessionHeaders });
  const employeeId = employees.body.employees?.[0]?.employee_id;
  if (!employeeId) throw new Error("HRX employee fixture is required for D04/D06 proof");

  vite = await startVite(api.baseUrl);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const observedRequests = [];
  const pageErrors = [];
  const consoleMessages = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) consoleMessages.push(`${message.type()}: ${message.text()}`);
  });
  page.on("request", (request) => {
    if (request.url().includes("/api/hrx/attendance") || request.url().includes("/api/hrx/overtime/risks")) {
      observedRequests.push({
        method: request.method(),
        url: request.url(),
        has_authorization: Boolean(request.headers().authorization),
        has_permission_context: "x-lawos-permission-context" in request.headers(),
        has_actor_header: "x-lawos-actor-id" in request.headers(),
        has_role_header: "x-lawos-actor-role" in request.headers(),
      });
    }
  });

  await page.goto(`http://127.0.0.1:${PROOF_PORT}/?locale=ko&view=auth&authStep=login&ctx=allow`, { waitUntil: "networkidle" });
  await page.locator("[data-login-email]").fill(ACCOUNT.email);
  await page.locator("[data-login-password]").fill(ACCOUNT.local_dev.synthetic_token);
  await page.locator("[data-login-form='email-password'] button[type='submit']").click();
  await page.waitForURL(/view=home/, { timeout: 15000 });

  await page.goto(`http://127.0.0.1:${PROOF_PORT}/?locale=ko&view=people&ctx=allow#people-attendance-records`, { waitUntil: "networkidle" });
  await page.locator("[data-upl-d04-attendance-form='true']").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("[data-upl-d04-month-input='true']").fill(PROOF_MONTH);
  await page.locator("[data-upl-d04-employee-input='true']").fill(employeeId);
  await page.locator("[data-upl-d04-work-date-input='true']").fill(PROOF_DATE);
  await page.locator("[data-upl-d04-status-select='true']").selectOption("present");
  await page.locator("[data-upl-d04-hours-input='true']").fill("9.5");
  const createResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/hrx/attendance") && response.request().method() === "POST",
    { timeout: 15000 },
  );
  await page.locator("[data-upl-d04-submit='true']").click();
  const createResponse = await createResponsePromise;
  const createBody = await createResponse.json();
  const attendanceId = createBody.attendance?.attendance_id;
  if (createResponse.status() !== 201 || !attendanceId) {
    throw new Error(JSON.stringify({ reason: "attendance_create_failed", status: createResponse.status(), body: createBody }, null, 2));
  }
  await page.waitForFunction(
    (id) => document.body.innerText.includes(id) && document.body.innerText.includes("9.5시간"),
    attendanceId,
    { timeout: 15000 },
  );
  const screenshotPath = `${SCREENSHOT_DIR}/upl-d04-d06-hrx-attendance-browser-proof.png`;
  await page.screenshot({ path: resolve(ROOT, screenshotPath), fullPage: true });
  const pageHtml = await page.content();
  const uiText = await page.locator("#people-attendance-records").innerText();
  await browser.close();
  browser = null;

  const attendanceReadback = await json(
    api.baseUrl,
    `/api/hrx/attendance?employee_id=${encodeURIComponent(employeeId)}&month=${encodeURIComponent(PROOF_MONTH)}`,
    { headers: sessionHeaders },
  );
  const riskReadback = await json(
    api.baseUrl,
    `/api/hrx/overtime/risks?employee_id=${encodeURIComponent(employeeId)}&month=${encodeURIComponent(PROOF_MONTH)}`,
    { headers: sessionHeaders },
  );
  const createdRecord = attendanceReadback.body.attendance?.find((record) => record.attendance_id === attendanceId);
  const attendancePostRequest = observedRequests.find((request) => request.method === "POST" && request.url.includes("/api/hrx/attendance"));
  const attendanceGetRequest = observedRequests.find((request) => request.method === "GET" && request.url.includes("/api/hrx/attendance"));
  const riskRequest = observedRequests.find((request) => request.url.includes("/api/hrx/overtime/risks"));
  const checks = [
    check("d04-browser-attendance-form-visible", uiText.includes("출근/퇴근 기록") && uiText.includes("기록 저장")),
    check("d04-ui-created-attendance-record", createResponse.status() === 201 && createBody.outcome === "created" && Boolean(attendanceId), {
      status: createResponse.status(),
      attendance_id: attendanceId,
      employee_id: createBody.attendance?.employee_id ?? null,
      work_date: createBody.attendance?.work_date ?? null,
      recorded_hours: createBody.attendance?.recorded_hours ?? null,
    }),
    check("d04-request-uses-signed-session-only", attendancePostRequest?.has_authorization === true && attendancePostRequest?.has_permission_context === false && attendancePostRequest?.has_actor_header === false && attendancePostRequest?.has_role_header === false, attendancePostRequest ?? {}),
    check("d04-monthly-summary-reflects-created-record", attendanceReadback.status === 200 && createdRecord?.recorded_hours === 9.5 && attendanceReadback.body.monthly_summary?.total_recorded_hours >= 9.5, {
      status: attendanceReadback.status,
      attendance_id: createdRecord?.attendance_id ?? null,
      total_recorded_hours: attendanceReadback.body.monthly_summary?.total_recorded_hours ?? null,
      effective_record_count: attendanceReadback.body.monthly_summary?.effective_record_count ?? null,
    }),
    check("d06-schedule-calendar-renders-real-record", uiText.includes(PROOF_MONTH) && uiText.includes("근무표") && uiText.includes("9.5시간")),
    check("d06-overtime-risk-api-called-with-signed-session", riskRequest?.has_authorization === true && riskReadback.status === 200 && Array.isArray(riskReadback.body.risk_report?.events), {
      request: riskRequest ?? null,
      status: riskReadback.status,
      event_count: riskReadback.body.risk_report?.events?.length ?? null,
    }),
    check("d04-safe-browser-boundary", !pageHtml.includes(ACCOUNT.local_dev.synthetic_token) && !pageHtml.includes("lawos_session_v1."), {
      token_material_rendered: pageHtml.includes("lawos_session_v1."),
    }),
    check("d04-no-browser-errors", pageErrors.length === 0, { page_errors: pageErrors, console_messages: consoleMessages.slice(0, 5) }),
  ];
  const artifact = {
    schema_version: "law-firm-os.wave1.upl_d04_d06.hrx_attendance_browser.v0.1",
    generated_at: new Date().toISOString(),
    tuw_ids: ["UPL-D-04", "UPL-D-06"],
    pass: checks.every((item) => item.passed),
    production_ready_claim: false,
    tenant_id: TENANT,
    employee_id_hash: sha256(employeeId),
    routes: {
      browser: `GET /?view=people#people-attendance-records`,
      attendance_create: "POST /api/hrx/attendance",
      attendance_read: "GET /api/hrx/attendance",
      overtime_risk: "GET /api/hrx/overtime/risks",
    },
    request_receipts: {
      attendance_post: attendancePostRequest ?? null,
      attendance_get: attendanceGetRequest ?? null,
      overtime_risk: riskRequest ?? null,
    },
    response_hashes: {
      create: sha256(createBody),
      attendance_readback: attendanceReadback.response_hash,
      overtime_risk: riskReadback.response_hash,
    },
    created_attendance: {
      attendance_id: attendanceId,
      work_date: createBody.attendance?.work_date ?? null,
      status: createBody.attendance?.status ?? null,
      recorded_hours: createBody.attendance?.recorded_hours ?? null,
    },
    screenshot_path: screenshotPath,
    raw_salary_body_included: false,
    raw_document_body_included: false,
    raw_client_secret_included: false,
    checks,
  };
  writeFileSync(resolve(ROOT, JSON_PATH), `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(
    resolve(ROOT, MD_PATH),
    `# UPL D04/D06 HRX Attendance Browser Proof\n\nGenerated at: ${artifact.generated_at}\n\n- PASS: ${artifact.pass}\n- Screenshot: \`${screenshotPath}\`\n- Production ready claim: false\n\n## Checks\n\n${checks.map((item) => `- ${item.passed ? "PASS" : "FAIL"} ${item.id}`).join("\n")}\n`,
  );
  console.log(JSON.stringify({
    pass: artifact.pass,
    artifact: JSON_PATH,
    attendance_id: attendanceId,
    checks: checks.length,
  }, null, 2));
  if (!artifact.pass) process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (api) await api.close();
  if (vite) await stopProcess(vite.child);
}
