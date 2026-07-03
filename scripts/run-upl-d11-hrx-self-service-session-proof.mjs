#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { startApiServer } from "../apps/api/src/server.js";
import { findRegisteredAccountByEmail, MATTER_VAULT_REGISTERED_TENANT_ID } from "../apps/api/src/matter-vault-account-registry.js";
import { apiSessionHeaders } from "../apps/api/test/helpers/session.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = "artifacts/manual-qa";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/upl-d11-hrx-self-service-session-proof-2026-07-03.json`;
const MD_PATH = `${ARTIFACT_DIR}/upl-d11-hrx-self-service-session-proof-2026-07-03.md`;
const SCREENSHOT_PATH = `${SCREENSHOT_DIR}/upl-d11-hrx-self-service-session-proof.png`;
const PROOF_PORT = 5211;
const STAFF_EMAIL = "yjlee@amic.kr";
const STAFF_USER_ID = "user_amic_yjlee";
const STAFF_EMPLOYEE_ID = "emp_amic_yjlee";
const OTHER_EMPLOYEE_ID = "emp_amic_ytkim";

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function account(email) {
  const found = findRegisteredAccountByEmail(email);
  assert.ok(found, `registered account ${email} should exist`);
  return found;
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

async function json(baseUrl, path, { headers, method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(headers ?? {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  return { status: response.status, body: payload, response_hash: sha256(payload) };
}

function apiResult(path, result) {
  return {
    path,
    status: result.status,
    outcome: result.body.outcome ?? null,
    safe_error_code: result.body.safe_error_code ?? null,
    required_scope: result.body.required_scope ?? null,
    employee_ids: result.body.employees?.map((employee) => employee.employee_id) ?? undefined,
    balance_employee_id: result.body.balance?.employee_id ?? undefined,
    count_leak_prevented: result.body.count_leak_prevented ?? undefined,
  };
}

mkdirSync(resolve(ROOT, ARTIFACT_DIR), { recursive: true });
mkdirSync(resolve(ROOT, SCREENSHOT_DIR), { recursive: true });

let api = null;
let vite = null;
let browser = null;

try {
  const staff = account(STAFF_EMAIL);
  const started = await startApiServer({ port: 0 });
  api = {
    ...started,
    baseUrl: `http://${started.host}:${started.port}`,
    close: () => new Promise((resolveClose) => started.server.close(resolveClose)),
  };
  const staffHeaders = await apiSessionHeaders(api.baseUrl, staff);
  const forgedHeaders = {
    ...staffHeaders,
    "x-lawos-actor-id": "user_amic_jwsuh",
    "x-lawos-actor-role": "hr_admin",
    "x-lawos-hrx-scopes": "hrx.employee.read,hrx.compensation.read,hrx.audit.read",
  };

  const apiResponses = {
    employees: await json(api.baseUrl, "/api/hrx/employees", { headers: staffHeaders }),
    ownEmployee: await json(api.baseUrl, `/api/hrx/employees/${STAFF_EMPLOYEE_ID}`, { headers: staffHeaders }),
    otherEmployee: await json(api.baseUrl, `/api/hrx/employees/${OTHER_EMPLOYEE_ID}`, { headers: staffHeaders }),
    forgedOtherEmployee: await json(api.baseUrl, `/api/hrx/employees/${OTHER_EMPLOYEE_ID}`, { headers: forgedHeaders }),
    ownDocuments: await json(api.baseUrl, `/api/hrx/documents?employee_id=${STAFF_EMPLOYEE_ID}`, { headers: staffHeaders }),
    otherDocuments: await json(api.baseUrl, `/api/hrx/documents?employee_id=${OTHER_EMPLOYEE_ID}`, { headers: staffHeaders }),
    ownLeave: await json(api.baseUrl, `/api/hrx/leave?employee_id=${STAFF_EMPLOYEE_ID}&policy_id=pto-us`, { headers: staffHeaders }),
    otherLeave: await json(api.baseUrl, `/api/hrx/leave?employee_id=${OTHER_EMPLOYEE_ID}&policy_id=pto-us`, { headers: staffHeaders }),
    ownAttendance: await json(api.baseUrl, `/api/hrx/attendance?employee_id=${STAFF_EMPLOYEE_ID}&month=2026-07`, { headers: staffHeaders }),
    otherAttendance: await json(api.baseUrl, `/api/hrx/attendance?employee_id=${OTHER_EMPLOYEE_ID}&month=2026-07`, { headers: staffHeaders }),
    compensation: await json(api.baseUrl, `/api/hrx/compensation?employee_id=${STAFF_EMPLOYEE_ID}`, { headers: staffHeaders }),
    audit: await json(api.baseUrl, "/api/hrx/audit", { headers: staffHeaders }),
  };

  assert.deepEqual(apiResponses.employees.body.employees.map((employee) => employee.employee_id), [STAFF_EMPLOYEE_ID]);
  assert.equal(apiResponses.employees.body.permission_summary.self_service_filtered, true);
  assert.equal(apiResponses.ownEmployee.status, 200);
  assert.equal(apiResponses.otherEmployee.status, 403);
  assert.equal(apiResponses.otherEmployee.body.safe_error_code, "HRX_SELF_SERVICE_SCOPE_DENIED");
  assert.equal(apiResponses.forgedOtherEmployee.status, 403);
  assert.equal(apiResponses.forgedOtherEmployee.body.safe_error_code, "HRX_SELF_SERVICE_SCOPE_DENIED");
  assert.equal(apiResponses.ownDocuments.status, 200);
  assert.equal(apiResponses.otherDocuments.status, 403);
  assert.equal(apiResponses.ownLeave.status, 200);
  assert.equal(apiResponses.otherLeave.status, 403);
  assert.equal(apiResponses.ownAttendance.status, 403);
  assert.equal(apiResponses.ownAttendance.body.required_scope, "hrx.attendance.read");
  assert.equal(apiResponses.otherAttendance.status, 403);
  assert.equal(apiResponses.otherAttendance.body.required_scope, "hrx.attendance.read");
  assert.equal(apiResponses.compensation.status, 403);
  assert.equal(apiResponses.compensation.body.required_scope, "hrx.compensation.read");
  assert.equal(apiResponses.audit.status, 403);
  assert.equal(apiResponses.audit.body.required_scope, "hrx.audit.read");

  vite = await startVite(api.baseUrl);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const observedRequests = [];
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("request", (request) => {
    if (!request.url().includes("/api/hrx/")) return;
    const headers = request.headers();
    observedRequests.push({
      method: request.method(),
      url_path: new URL(request.url()).pathname,
      has_authorization: Boolean(headers.authorization),
      has_permission_context: "x-lawos-permission-context" in headers,
      has_actor_header: "x-lawos-actor-id" in headers,
      has_role_header: "x-lawos-actor-role" in headers,
      has_scope_header: "x-lawos-hrx-scopes" in headers,
    });
  });

  await page.goto(`http://127.0.0.1:${PROOF_PORT}/?locale=ko&view=auth&authStep=login&ctx=allow`, { waitUntil: "networkidle" });
  await page.locator("[data-login-email]").fill(staff.email);
  await page.locator("[data-login-password]").fill(staff.local_dev.synthetic_token);
  await page.locator("[data-login-form='email-password'] button[type='submit']").click();
  await page.waitForURL(/view=home/, { timeout: 15000 });
  await page.goto(`http://127.0.0.1:${PROOF_PORT}/?locale=ko&view=people&ctx=allow#people-members`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.body.innerText.includes("이예진") && document.body.innerText.includes("yjlee@amic.kr"), null, { timeout: 15000 });
  const bodyText = await page.locator("body").innerText();
  const pageHtml = await page.content();
  await page.screenshot({ path: resolve(ROOT, SCREENSHOT_PATH), fullPage: true });

  const employeeListRequests = observedRequests.filter((request) => request.url_path === "/api/hrx/employees");
  const firstEmployeeRequest = employeeListRequests[0] ?? null;
  assert.ok(firstEmployeeRequest);
  assert.equal(firstEmployeeRequest.has_authorization, true);
  assert.equal(firstEmployeeRequest.has_permission_context, false);
  assert.equal(firstEmployeeRequest.has_actor_header, false);
  assert.equal(firstEmployeeRequest.has_role_header, false);
  assert.equal(firstEmployeeRequest.has_scope_header, false);
  assert.ok(bodyText.includes("이예진"));
  assert.equal(bodyText.includes("김양태"), false);
  assert.equal(pageHtml.includes(staff.local_dev.synthetic_token), false);
  assert.equal(pageHtml.includes("lawos_session_v1."), false);

  const checks = [
    { id: "api_signed_staff_employee_list_self_only", passed: true },
    { id: "api_signed_staff_own_profile_success", passed: true },
    { id: "api_signed_staff_other_profile_403", passed: true },
    { id: "api_forged_actor_headers_do_not_expand_staff_scope", passed: true },
    { id: "api_signed_staff_own_documents_leave_success", passed: true },
    { id: "api_signed_staff_other_documents_leave_403", passed: true },
    { id: "api_signed_staff_ungranted_attendance_compensation_audit_scopes_denied", passed: true },
    { id: "web_hrx_request_uses_authorization_only", passed: true },
    { id: "web_hrx_visible_roster_self_only", passed: true },
    { id: "web_token_material_not_rendered", passed: true },
    { id: "web_no_page_errors", passed: pageErrors.length === 0, evidence: { page_errors: pageErrors } },
  ];

  const artifact = {
    schema_version: "law-firm-os.wave1.upl_d11.hrx_self_service_session.v0.2",
    generated_at: new Date().toISOString(),
    tuw: "UPL-D-11",
    verdict: checks.every((item) => item.passed) ? "PASS" : "FAIL",
    production_ready_claim: false,
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    signed_staff_actor: {
      user_id: STAFF_USER_ID,
      employee_id: STAFF_EMPLOYEE_ID,
      email_hash: sha256(STAFF_EMAIL),
      role_ids: ["lawos_staff"],
    },
    api_results: Object.fromEntries(Object.entries(apiResponses).map(([key, result]) => [key, apiResult(result.body?.path ?? key, result)])),
    api_response_hashes: Object.fromEntries(Object.entries(apiResponses).map(([key, result]) => [key, result.response_hash])),
    web_results: {
      screenshot: SCREENSHOT_PATH,
      roster_text_hash: sha256(bodyText),
      contains_staff_display_name: bodyText.includes("이예진"),
      contains_staff_email: bodyText.includes("yjlee@amic.kr"),
      contains_other_display_name: bodyText.includes("김양태"),
      first_employee_request: firstEmployeeRequest,
      hrx_request_count: observedRequests.length,
      hrx_requests: observedRequests,
      page_errors: pageErrors,
    },
    leak_checks: {
      authorization_header_value_written: false,
      session_token_written: false,
      password_written: false,
      legacy_permission_context_sent: observedRequests.some((request) => request.has_permission_context),
      legacy_actor_header_sent: observedRequests.some((request) => request.has_actor_header || request.has_role_header || request.has_scope_header),
    },
    checks,
    commands: [
      "node --test apps/api/test/session-auth-api.test.js",
      "node scripts/run-upl-d11-hrx-self-service-session-proof.mjs",
    ],
  };
  writeFileSync(resolve(ROOT, JSON_PATH), `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(
    resolve(ROOT, MD_PATH),
    [
      "# UPL-D-11 HRX Self-Service Session Proof",
      "",
      `- Verdict: ${artifact.verdict}`,
      `- Generated at: ${artifact.generated_at}`,
      `- Screenshot: \`${SCREENSHOT_PATH}\``,
      `- Staff employee: \`${STAFF_EMPLOYEE_ID}\``,
      "",
      "The receipt stores only header-presence booleans and hashes. It does not store Authorization values, session tokens, or passwords.",
      "",
      "## Checks",
      "",
      ...checks.map((item) => `- ${item.passed ? "PASS" : "FAIL"} ${item.id}`),
      "",
    ].join("\n"),
  );
  console.log(JSON.stringify({ pass: artifact.verdict === "PASS", artifact: JSON_PATH, checks: checks.length }, null, 2));
  if (artifact.verdict !== "PASS") process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (api) await api.close();
  if (vite) await stopProcess(vite.child);
}
