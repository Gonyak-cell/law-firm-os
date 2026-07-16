#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";
import { PERMISSION_CONTEXT_HEADER } from "../apps/api/src/permission-gate.js";
import { startApiServer } from "../apps/api/src/server.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = "artifacts/manual-qa";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/upl-b01-time-entry-browser-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/upl-b01-time-entry-browser-proof.md`;
const SCREENSHOT_PATH = `${SCREENSHOT_DIR}/upl-b01-time-entry-browser-proof.png`;
const TENANT = "tenant_cmp_g7_synthetic";
const MATTER_ID = "matter_rp05_synthetic_opening";
const SUFFIX = Date.now().toString(36);
const FIRST_NARRATIVE = `UPL B01 arbitrary first ${SUFFIX}`;
const SECOND_NARRATIVE = `UPL B01 arbitrary second ${SUFFIX}`;
const FINANCE_QUERY = `tenant_id=${TENANT}&permission_ref=ui_cmp_g7_finance_live&audit_hint_ref=upl_b01_time_entry_browser`;

mkdirSync(join(ROOT, ARTIFACT_DIR), { recursive: true });
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

function contentType(filePath) {
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
  }[extname(filePath)] ?? "application/octet-stream";
}

async function serveDist() {
  const distRoot = resolve(ROOT, "apps/web/dist");
  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const path = url.pathname === "/" ? "/index.html" : url.pathname;
      const filePath = resolve(distRoot, path.replace(/^\/+/, ""));
      if (!filePath.startsWith(distRoot)) {
        res.writeHead(403);
        res.end("forbidden");
        return;
      }
      const bytes = readFileSync(filePath);
      res.writeHead(200, { "content-type": contentType(filePath), "cache-control": "no-store" });
      res.end(bytes);
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("not found");
    }
  });
  return new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolvePromise({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

function permissionContext() {
  return JSON.stringify({
    principal: { user_id: "matter_finance_operator", tenant_id: TENANT, role_ids: ["finance_user", "partner"] },
    rules: [{ id: "rule_upl_b01_allow", effect: "allow", action: "*" }],
    object_acl: [],
  });
}

async function apiJson(apiBase, path) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext() },
  });
  return { status: response.status, body: await response.json() };
}

async function proxyApiRequests(page, apiBase, observed) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const target = `${apiBase}${url.pathname}${url.search}`;
    const postData = request.postData();
    let payload = null;
    try {
      payload = postData ? JSON.parse(postData) : null;
    } catch {
      payload = null;
    }
    observed.requests.push({ method: request.method(), url: target, payload });
    const headers = { ...request.headers() };
    delete headers.host;
    const response = await fetch(target, {
      method: request.method(),
      headers,
      body: ["GET", "HEAD"].includes(request.method()) ? undefined : request.postDataBuffer(),
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    observed.responses.push({ status: response.status, url: target });
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: bytes,
    });
  });
}

async function submitTimeEntry(page, { workDate, duration, narrative, role, billable }) {
  await page.locator("[data-upl-b01-time-entry-work-date='true']").fill(workDate);
  await page.locator("[data-upl-b01-time-entry-duration='true']").fill(duration);
  await page.locator("[data-upl-b01-time-entry-narrative='true']").fill(narrative);
  await page.locator("[data-upl-b01-time-entry-role='true']").selectOption(role);
  await page.locator("[data-upl-b01-time-entry-billable='true']").selectOption(billable ? "billable" : "non_billable");
  await page.locator("[data-upl-b01-time-entry-submit='true']").click();
  await page.waitForResponse(
    (response) => response.url().includes("/api/finance/time-entries") && response.request().method() === "POST" && response.status() === 201,
    { timeout: 15000 },
  );
  await page.waitForFunction((text) => document.body.innerText.includes(text), narrative, { timeout: 15000 });
}

function passed(id, value, extra = {}) {
  return { id, passed: Boolean(value), ...extra };
}

execFileSync("npm", ["--workspace", "apps/web", "run", "build"], { cwd: ROOT, stdio: "inherit" });

const api = await startApiServer({ port: 0 });
const web = await serveDist();
const browser = await chromium.launch({ headless: true });
let artifact;

try {
  const apiBase = `http://${api.host}:${api.port}`;
  const observed = { requests: [], responses: [], consoleMessages: [], pageErrors: [] };
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) observed.consoleMessages.push({ type: message.type(), text: message.text() });
  });
  page.on("pageerror", (error) => observed.pageErrors.push(String(error)));
  await proxyApiRequests(page, apiBase, observed);

  const route = `${web.origin}/?locale=ko&view=matters&ctx=allow#matter-time`;
  await page.goto(route, { waitUntil: "networkidle", timeout: 30000 });
  await page.locator("[data-upl-b01-time-entry-form='true']").waitFor({ state: "visible", timeout: 15000 });

  await submitTimeEntry(page, {
    workDate: "2026-07-01",
    duration: "47",
    narrative: FIRST_NARRATIVE,
    role: "attorney",
    billable: true,
  });
  await submitTimeEntry(page, {
    workDate: "2026-07-02",
    duration: "13",
    narrative: SECOND_NARRATIVE,
    role: "staff",
    billable: false,
  });

  await page.waitForFunction(() => Number(document.querySelector("[data-upl-b01-time-entry-readback-count]")?.getAttribute("data-upl-b01-time-entry-readback-count") ?? "0") >= 2);
  const bodyText = await page.locator("body").innerText();
  const uiCount = Number(await page.locator("[data-upl-b01-time-entry-readback-count]").getAttribute("data-upl-b01-time-entry-readback-count"));
  await page.screenshot({ path: join(ROOT, SCREENSHOT_PATH), fullPage: true });

  const readback = await apiJson(apiBase, `/api/finance/time-entries?${FINANCE_QUERY}`);
  const createdRows = (readback.body.items ?? []).filter((item) => [FIRST_NARRATIVE, SECOND_NARRATIVE].includes(item.narrative));
  const postPayloads = observed.requests
    .filter((request) => request.method === "POST" && request.url.includes("/api/finance/time-entries"))
    .map((request) => request.payload)
    .filter(Boolean);
  const ids = postPayloads.map((payload) => payload.time_entry?.time_entry_id).filter(Boolean);
  const idempotencyKeys = postPayloads.map((payload) => payload.idempotency_key).filter(Boolean);
  const checks = [
    passed("b01-form-mounted", bodyText.includes("시간 기록") && uiCount >= 2),
    passed("b01-first-arbitrary-values-posted", createdRows.some((row) => row.narrative === FIRST_NARRATIVE && row.work_date === "2026-07-01" && row.duration_minutes === 47 && row.role_id === "attorney" && row.billable === true)),
    passed("b01-second-arbitrary-values-posted", createdRows.some((row) => row.narrative === SECOND_NARRATIVE && row.work_date === "2026-07-02" && row.duration_minutes === 13 && row.role_id === "staff" && row.billable === false)),
    passed("b01-multiple-entries-same-matter", createdRows.length === 2 && createdRows.every((row) => row.matter_id === MATTER_ID)),
    passed("b01-distinct-runtime-ids", new Set(ids).size === 2 && new Set(idempotencyKeys).size === 2),
    passed("b01-ui-renders-both-narratives", bodyText.includes(FIRST_NARRATIVE) && bodyText.includes(SECOND_NARRATIVE)),
    passed("b01-api-readback-succeeded", readback.status === 200),
    passed("b01-browser-no-page-errors", observed.pageErrors.length === 0),
  ];

  artifact = {
    schema_version: "law-firm-os.manual-qa.upl-b01-time-entry-browser-proof.v1",
    generated_at: new Date().toISOString(),
    tuw_ids: ["UPL-B-01"],
    scope: "Matter time-entry browser proof with arbitrary form values and multiple entries on the same matter.",
    route,
    api_base: apiBase,
    matter_id: MATTER_ID,
    production_ready_claim: false,
    go_live_claim: false,
    input_cases: [
      { work_date: "2026-07-01", duration_minutes: 47, narrative: FIRST_NARRATIVE, role_id: "attorney", billable: true },
      { work_date: "2026-07-02", duration_minutes: 13, narrative: SECOND_NARRATIVE, role_id: "staff", billable: false },
    ],
    observed,
    readback: {
      status: readback.status,
      created_rows: createdRows,
      returned_count: readback.body.items?.length ?? 0,
    },
    ui_snapshot: {
      time_entry_count: uiCount,
      screenshot: SCREENSHOT_PATH,
    },
    checks,
    pass: checks.every((check) => check.passed),
  };

  writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(
    join(ROOT, MD_PATH),
    `# UPL B01 Time Entry Browser Proof\n\nGenerated at: ${artifact.generated_at}\n\n- PASS: ${artifact.pass}\n- Screenshot: \`${SCREENSHOT_PATH}\`\n- Route: \`${route}\`\n- Scope: arbitrary date/duration/narrative/role/billable inputs plus two entries on one matter.\n- Production/go-live claim: false\n\n## Checks\n\n${checks.map((check) => `- ${check.passed ? "PASS" : "FAIL"} ${check.id}`).join("\n")}\n`,
  );
  console.log(JSON.stringify({ pass: artifact.pass, checks: checks.length, artifact: JSON_PATH }, null, 2));
  if (!artifact.pass) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolvePromise) => web.server.close(resolvePromise));
  await new Promise((resolvePromise) => api.server.close(resolvePromise));
}
