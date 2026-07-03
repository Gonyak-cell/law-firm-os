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
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/upl-c04-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/upl-c04-clearance-ledger-browser-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/upl-c04-clearance-ledger-browser-proof.md`;
const PROOF_PORT = 5204;
const TENANT = "tenant_cmp_g6_synthetic";
const ACCOUNT = highestPrivilegeRegisteredAccount();
const ACTOR = ACCOUNT.user_id;
const INTAKE_ID = "intake_upl_c04_new_client";

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

function sanitizePayload(value) {
  if (Array.isArray(value)) return value.map((item) => sanitizePayload(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
    if (/bytes_base64|content_base64|session_token|authorization/i.test(key)) return [key, "[redacted]"];
    return [key, sanitizePayload(entry)];
  }));
}

function writeMarkdown(report) {
  writeFileSync(
    join(ROOT, MD_PATH),
    [
      "# UPL-C-04 Clearance Ledger Browser Proof",
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
      `- writes: ${report.observed.writes.map((write) => write.kind).join(", ")}`,
      `- panel_text: ${JSON.stringify(report.observed.panel_text)}`,
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
      opportunity_id: "opp_upl_c04_new_client",
      requesting_party_id: "party_upl_c04_new_client",
      party_ids: ["party_upl_c04_new_client"],
      requested_scope_summary: "원장 기반 Matter 개설 검증",
      status: "open",
      owner_user_id: ACTOR,
    },
  ],
});

const crmMasterDataRepository = createMasterDataRepository({
  seedRecords: [
    {
      model_type: "Party",
      party_id: "party_upl_c04_new_client",
      tenant_id: TENANT,
      party_type: "organization",
      display_name: "상대방 주식회사",
      status: "active",
      owner_user_id: ACTOR,
    },
  ],
});

const matterRepository = createMatterRepository({
  seedRecords: [
    {
      model_type: "MatterParty",
      resource_id: "matter_party_upl_c04_adverse",
      matter_party_id: "matter_party_upl_c04_adverse",
      tenant_id: TENANT,
      matter_id: "matter_upl_c04_former",
      party_id: "party_upl_c04_adverse",
      display_name: "상대방 주식회사",
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
    dmsStorePath: join(tmpdir(), `lawos-upl-c04-dms-${Date.now()}.json`),
  });
  api = {
    ...started,
    baseUrl: `http://${started.host}:${started.port}`,
    close: () => new Promise((resolveClose) => started.server.close(resolveClose)),
  };
  vite = await startVite(api.baseUrl);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1180 } });
  const writes = [];
  const apiRequests = [];
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
    const routeMap = [
      ["/api/intake/conflict-checks", "conflict_check"],
      ["/api/intake/conflict-decisions", "decision"],
      ["/api/intake/waivers", "waiver"],
      ["/api/intake/engagements", "engagement"],
      ["/api/intake/clearance-tokens", "clearance"],
      ["/api/matters/openings", "matter_opening"],
    ];
    const match = routeMap.find(([needle]) => request.url().includes(needle) && request.method() === "POST");
    if (match) writes.push({ ...observed, kind: match[1], payload: sanitizePayload(request.postDataJSON()) });
  });

  await page.goto(`http://127.0.0.1:${PROOF_PORT}/?locale=ko&view=auth&authStep=login&ctx=allow`, { waitUntil: "networkidle" });
  await page.locator("[data-login-email]").fill(ACCOUNT.email);
  await page.locator("[data-login-password]").fill(ACCOUNT.local_dev.synthetic_token);
  await page.locator("[data-login-form='email-password'] button[type='submit']").click();
  await page.waitForURL(/view=home/, { timeout: 15000 });

  await page.goto(proofUrl("client-conflict"), { waitUntil: "networkidle" });
  await page.locator("[data-client-conflict-connected='true']").waitFor({ state: "visible", timeout: 15000 });
  const actionPanel = page.locator("[data-intake-matter-opening-flow='true']");

  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/intake/conflict-checks") && response.request().method() === "POST"),
    actionPanel.getByRole("button", { name: "이해상충 검토" }).click(),
  ]);
  await page.locator("[data-intake-conflict-hit-list='true']").getByText("상대방 주식회사", { exact: true }).waitFor({ state: "visible", timeout: 15000 });

  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/intake/conflict-decisions") && response.request().method() === "POST"),
    actionPanel.getByRole("button", { name: "검토 결정" }).click(),
  ]);
  await actionPanel.getByText("검토 결정이 기록되었습니다.").waitFor({ state: "visible", timeout: 15000 });

  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/intake/waivers") && response.request().method() === "POST"),
    actionPanel.getByRole("button", { name: "Waiver 승인" }).click(),
  ]);
  await actionPanel.getByText("Waiver 승인 기록이 남았습니다.").waitFor({ state: "visible", timeout: 15000 });

  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/intake/engagements") && response.request().method() === "POST"),
    actionPanel.getByRole("button", { name: "수임 승인" }).click(),
  ]);
  await actionPanel.getByText("수임 승인 완료.").waitFor({ state: "visible", timeout: 15000 });

  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/intake/clearance-tokens") && response.request().method() === "POST"),
    actionPanel.getByRole("button", { name: "통과 처리" }).click(),
  ]);
  await actionPanel.getByText("통과 처리되었습니다.").waitFor({ state: "visible", timeout: 15000 });

  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/matters/openings") && response.request().method() === "POST"),
    actionPanel.getByRole("button", { name: "Matter 개설" }).click(),
  ]);
  await actionPanel.getByText("Matter가 개설되었습니다.").waitFor({ state: "visible", timeout: 15000 });

  const panelText = await actionPanel.innerText();
  const screenshot = join(ROOT, SCREENSHOT_DIR, "upl-c04-clearance-ledger-matter-opening.png");
  await page.screenshot({ path: screenshot, fullPage: true });
  const pageText = await page.locator("body").innerText();
  const writeKinds = writes.map((write) => write.kind);
  const clearanceWrite = writes.find((write) => write.kind === "clearance");
  const openingWrite = writes.find((write) => write.kind === "matter_opening");
  const clearanceTokenId = clearanceWrite?.payload?.token?.clearance_token_id;
  const openingToken = openingWrite?.payload?.clearance_token ?? {};
  const openingPayloadText = JSON.stringify(openingWrite?.payload ?? {});
  const checks = [
    check(
      "ui-drives-clearance-to-matter-opening-route",
      ["conflict_check", "decision", "waiver", "engagement", "clearance", "matter_opening"].every((kind) => writeKinds.includes(kind)),
      { write_kinds: writeKinds },
    ),
    check(
      "ui-forwards-issued-clearance-token-to-matter-opening",
      clearanceTokenId &&
        openingToken.clearance_token_id === clearanceTokenId &&
        openingToken.engagement_id === clearanceWrite?.payload?.token?.engagement_id &&
        openingToken.snapshot_hash === clearanceWrite?.payload?.token?.snapshot_hash,
      { clearance_token_id: clearanceTokenId },
    ),
    check(
      "ui-does-not-send-forged-clearance-shape",
      !/engagement:forged-by-client|"token_state":"valid"/.test(openingPayloadText),
    ),
    check(
      "matter-opening-ui-success-visible",
      panelText.includes("Matter가 개설되었습니다.") && panelText.includes("통과 처리되었습니다."),
    ),
    check(
      "browser-uses-signed-session-without-legacy-permission-context",
      writes.every((write) => write.has_authorization === true) && apiRequests.every((request) => request.has_permission_context === false),
      { api_request_count: apiRequests.length },
    ),
    check(
      "browser-proof-clean",
      consoleEvents.length === 0 && failedRequests.length === 0 && pageErrors.length === 0,
      { console_events: consoleEvents.length, failed_requests: failedRequests.length, page_errors: pageErrors.length },
    ),
    check("no-session-token-rendered", !pageText.includes("lawos_session_v1.")),
  ];

  const report = {
    schema_version: "law-firm-os.upl-c04.browser-proof.v0.2",
    generated_at: new Date().toISOString(),
    verdict: checks.every((item) => item.passed) ? "PASS" : "FAIL",
    contract_ref: "UPL-C-04",
    api_runtime: "startApiServer+seeded-intake-master-matter-repositories",
    url: proofUrl("client-conflict"),
    screenshot,
    checks,
    observed: {
      writes,
      panel_text: panelText,
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
