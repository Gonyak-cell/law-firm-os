#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { highestPrivilegeRegisteredAccount } from "../apps/api/src/matter-vault-account-registry.js";
import { startApiServer } from "../apps/api/src/server.js";
import { createIntakeRuntimeRepository } from "../packages/intake/src/runtime-repository.js";
import { createMasterDataRepository } from "../packages/master-data/src/index.js";
import { createMatterRepository } from "../packages/matter/src/index.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/upl-c02-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/upl-c02-conflict-search-browser-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/upl-c02-conflict-search-browser-proof.md`;
const PROOF_PORT = 5202;
const TENANT = "tenant_cmp_g6_synthetic";
const ACCOUNT = highestPrivilegeRegisteredAccount();
const ACTOR = ACCOUNT.user_id;
const INTAKE_ID = "intake_upl_c02_new_client";

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

function proofUrl(hash) {
  return `http://127.0.0.1:${PROOF_PORT}/?locale=ko&view=clients&data=live&ctx=allow#${hash}`;
}

function check(id, passed, evidence = {}) {
  return { id, passed: Boolean(passed), evidence };
}

function writeMarkdown(report) {
  writeFileSync(
    join(ROOT, MD_PATH),
    [
      "# UPL-C-02 Conflict Search Browser Proof",
      "",
      `- verdict: ${report.verdict}`,
      `- url: ${report.url}`,
      `- screenshot: ${report.screenshot}`,
      `- api_runtime: ${report.api_runtime}`,
      "",
      "## Checks",
      ...report.checks.map((item) => `- ${item.passed ? "PASS" : "FAIL"} ${item.id}`),
      "",
      "## Observed",
      `- hit_list_text: ${JSON.stringify(report.observed.hit_list_text)}`,
      `- writes: ${report.observed.writes.length}`,
      `- api_request_count: ${report.observed.api_requests.length}`,
      `- console_events: ${report.observed.console_events.length}`,
      `- failed_requests: ${report.observed.failed_requests.length}`,
      "",
    ].join("\n"),
  );
}

const intakeRepository = createIntakeRuntimeRepository({
  seedRecords: [
    {
      model_type: "IntakeRequest",
      intake_request_id: INTAKE_ID,
      tenant_id: TENANT,
      opportunity_id: "opp_upl_c02_new_client",
      requesting_party_id: "party_upl_c02_new_client",
      party_ids: ["party_upl_c02_new_client"],
      requested_scope_summary: "과거 사건 상대방의 신규 수임 검토",
      status: "open",
      owner_user_id: ACTOR,
    },
  ],
});

const crmMasterDataRepository = createMasterDataRepository({
  seedRecords: [
    {
      model_type: "Party",
      party_id: "party_upl_c02_new_client",
      tenant_id: TENANT,
      party_type: "organization",
      display_name: "(주) 상대방테크",
      status: "active",
      owner_user_id: ACTOR,
    },
  ],
});

const matterRepository = createMatterRepository({
  seedRecords: [
    {
      model_type: "Matter",
      matter_id: "matter_upl_c02_former",
      tenant_id: TENANT,
      client_id: "client_upl_c02_existing",
      legal_client_party_id: "party_upl_c02_existing_client",
      title: "기존 의뢰인의 과거 분쟁",
      status: "closed",
      created_by: ACTOR,
      created_at: "2026-07-03T00:00:00.000Z",
      permission_envelope_id: "perm_upl_c02_former",
      audit_trace_id: "audit_upl_c02_former",
    },
    {
      model_type: "MatterParty",
      resource_id: "matter_party_upl_c02_adverse",
      matter_party_id: "matter_party_upl_c02_adverse",
      tenant_id: TENANT,
      matter_id: "matter_upl_c02_former",
      party_id: "party_upl_c02_adverse",
      display_name: "상대방 테크 주식회사",
      party_role: "adverse_party",
      role_scope: "matter_conflict_subject",
      conflict_subject: true,
      retroactive_entry: true,
      status: "active",
      raw_contact_values_included: false,
      production_ready_claim: false,
    },
  ],
});

mkdirSync(resolve(ROOT, SCREENSHOT_DIR), { recursive: true });

let api = null;
let vite = null;
let browser = null;

try {
  const started = await startApiServer({
    port: 0,
    intakeRepository,
    crmMasterDataRepository,
    matterRepository,
    dmsStorePath: join(tmpdir(), `lawos-upl-c02-dms-${Date.now()}.json`),
  });
  api = {
    ...started,
    baseUrl: `http://${started.host}:${started.port}`,
    close: () => new Promise((resolveClose) => started.server.close(resolveClose)),
  };
  vite = await startVite(api.baseUrl);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const apiRequests = [];
  const writes = [];
  const consoleEvents = [];
  const failedRequests = [];
  const pageErrors = [];

  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) consoleEvents.push({ type: message.type(), text: message.text() });
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "request_failed";
    if (failure === "net::ERR_ABORTED") return;
    failedRequests.push({ url: request.url(), failure });
  });
  page.on("request", (request) => {
    if (!request.url().includes("/api/")) return;
    const observed = {
      method: request.method(),
      url: request.url(),
      has_authorization: Boolean(request.headers().authorization),
      has_permission_context: "x-lawos-permission-context" in request.headers(),
    };
    apiRequests.push(observed);
    if (request.url().includes("/api/intake/conflict-checks") && request.method() === "POST") {
      writes.push({ ...observed, payload: request.postDataJSON() });
    }
  });

  await page.goto(`http://127.0.0.1:${PROOF_PORT}/?locale=ko&view=auth&authStep=login&ctx=allow`, { waitUntil: "networkidle" });
  await page.locator("[data-login-email]").fill(ACCOUNT.email);
  await page.locator("[data-login-password]").fill(ACCOUNT.local_dev.synthetic_token);
  await page.locator("[data-login-form='email-password'] button[type='submit']").click();
  await page.waitForURL(/view=home/, { timeout: 15000 });

  await page.goto(proofUrl("client-conflict"), { waitUntil: "networkidle" });
  await page.locator("[data-client-conflict-connected='true']").waitFor({ state: "visible", timeout: 15000 }).catch(async (error) => {
    throw new Error(JSON.stringify({
      reason: "client_conflict_surface_not_visible",
      cause: String(error),
      url: page.url(),
      body_text: (await page.locator("body").innerText().catch(() => "")).slice(0, 2000),
      api_requests: apiRequests,
      console_events: consoleEvents,
      failed_requests: failedRequests,
      page_errors: pageErrors,
    }, null, 2));
  });
  const conflictResponse = page.waitForResponse(
    (response) => response.url().includes("/api/intake/conflict-checks") && response.request().method() === "POST",
    { timeout: 15000 },
  );
  await page.locator("[data-intake-conflict-review-flow='true']").getByRole("button", { name: "이해상충 검토" }).click();
  const response = await conflictResponse;
  const responseBody = await response.json();
  await page.locator("[data-intake-conflict-hit-list='true']").getByText("상대방 테크 주식회사", { exact: true }).waitFor({
    state: "visible",
    timeout: 15000,
  });

  const hitListText = await page.locator("[data-intake-conflict-hit-list='true']").innerText();
  const screenshot = join(ROOT, SCREENSHOT_DIR, "upl-c02-conflict-search-hit-list.png");
  await page.screenshot({ path: screenshot, fullPage: true });
  const pageText = await page.locator("body").innerText();

  const checks = [
    check(
      "real-api-conflict-check-route-called-from-browser",
      response.status() === 201 &&
        responseBody.hit_count === 1 &&
        responseBody.conflict_search?.generated_hit_ids?.length === 1 &&
        responseBody.conflict_hits?.[0]?.hit_source === "former_matter",
      { status: response.status(), hit_count: responseBody.hit_count },
    ),
    check(
      "client-conflict-surface-visible",
      hitListText.includes("상대방 테크 주식회사") && hitListText.includes("과거 Matter") && hitListText.includes("높음"),
      { hit_list_length: hitListText.length },
    ),
    check(
      "browser-uses-signed-session-without-legacy-permission-context",
      apiRequests.some((request) => request.url.includes("/api/intake/conflict-checks") && request.has_authorization) &&
        apiRequests.every((request) => request.has_permission_context === false),
      { api_request_count: apiRequests.length },
    ),
    check(
      "conflict-check-write-sent-from-ui",
      writes.length === 1 &&
        writes[0].payload?.conflict_check?.intake_request_id === INTAKE_ID &&
        writes[0].payload?.conflict_check?.party_snapshot?.party_ids?.includes("party_upl_c02_new_client") &&
        writes[0].payload?.conflict_search === undefined,
      { writes: writes.length },
    ),
    check(
      "browser-proof-clean",
      consoleEvents.length === 0 && failedRequests.length === 0 && pageErrors.length === 0,
      { console_events: consoleEvents.length, failed_requests: failedRequests.length, page_errors: pageErrors.length },
    ),
    check(
      "no-session-token-rendered",
      !pageText.includes("lawos_session_v1."),
    ),
  ];

  const report = {
    schema_version: "law-firm-os.upl-c02.browser-proof.v0.2",
    generated_at: new Date().toISOString(),
    verdict: checks.every((item) => item.passed) ? "PASS" : "FAIL",
    contract_ref: "UPL-C-02",
    api_runtime: "startApiServer+seeded-intake-master-matter-repositories",
    url: proofUrl("client-conflict"),
    screenshot,
    checks,
    observed: {
      writes,
      hit_list_text: hitListText,
      api_response: {
        status: response.status(),
        hit_count: responseBody.hit_count,
        conflict_search: responseBody.conflict_search,
        first_hit: responseBody.conflict_hits?.[0] ?? null,
      },
      api_requests: apiRequests,
      console_events: consoleEvents,
      failed_requests: failedRequests,
      page_errors: pageErrors,
    },
  };
  writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(report, null, 2)}\n`);
  writeMarkdown(report);
  console.log(JSON.stringify({ verdict: report.verdict, proof: JSON_PATH, screenshot }, null, 2));
  if (report.verdict !== "PASS") process.exit(1);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (vite) await stopProcess(vite.child);
  if (api) await api.close().catch(() => {});
}
