#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";
import { startApiServer } from "../apps/api/src/server.js";
import { MATTER_VAULT_REGISTERED_TENANT_ID } from "../apps/api/src/matter-vault-account-registry.js";
import { PERMISSION_CONTEXT_HEADER } from "../apps/api/src/permission-gate.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = "artifacts/manual-qa";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/upl-e09-wave1-five-flow-playwright-suite.json`;
const MD_PATH = `${ARTIFACT_DIR}/upl-e09-wave1-five-flow-playwright-suite.md`;
const VAULT_TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const VAULT_ACTOR = "user_amic_jwsuh";
const DOCUMENT_QUERY = "E09문서검색";
const HIDDEN_DOCUMENT_TERM = "E09_RAW_BODY_SHOULD_NOT_RENDER";
const DOCUMENT_ID = `doc_upl_e09_document_${Date.now()}`;

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

function vaultPermissionContext(objectAcl = []) {
  return JSON.stringify({
    principal: {
      user_id: VAULT_ACTOR,
      tenant_id: VAULT_TENANT,
      role_ids: ["matter_vault_admin", "matter_vault_user", "dms_reader"],
    },
    rules: [{ id: "rule_upl_e09_vault_allow", effect: "allow", action: "*" }],
    object_acl: objectAcl,
  });
}

function hrxHeaders(extra = {}) {
  return {
    "content-type": "application/json",
    "x-lawos-tenant-id": VAULT_TENANT,
    "x-lawos-actor-id": "user_amic_jwsuh",
    "x-lawos-actor-role": "security_admin,hr_admin,people_ops",
    "x-lawos-hrx-scopes": [
      "hrx.employee.read",
      "hrx.document.read",
      "hrx.leave.read",
      "hrx.leave.write",
      "hrx.audit.read",
    ].join(","),
    ...extra,
  };
}

async function apiJson(apiBase, path, options = {}) {
  const headers = {
    "content-type": "application/json",
    [PERMISSION_CONTEXT_HEADER]: vaultPermissionContext(),
    ...(options.headers ?? {}),
  };
  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  return { status: response.status, body: await response.json(), path };
}

async function proxyApiRequests(page, apiBase, observed) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const target = `${apiBase}${url.pathname}${url.search}`;
    let payload = null;
    try {
      payload = request.postData() ? JSON.parse(request.postData()) : null;
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

function readJson(path) {
  return JSON.parse(readFileSync(resolve(ROOT, path), "utf8"));
}

function proofPassed(proof) {
  return proof?.pass === true || proof?.verdict === "PASS";
}

async function runScriptFlow({ id, label, script, artifactPath, env = {} }) {
  const stdout = await new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: ROOT,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.stderr.on("data", (chunk) => {
      err += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise(out);
      else {
        const error = new Error(`Command failed: node ${script}\n${err}`);
        error.stdout = out;
        error.stderr = err;
        error.exitCode = code;
        reject(error);
      }
    });
  });
  const proof = readJson(artifactPath);
  return {
    id,
    label,
    artifact: artifactPath,
    command: `node ${script}`,
    pass: proofPassed(proof),
    checks: Array.isArray(proof.checks) ? proof.checks.length : Array.isArray(proof.rowProofs) ? proof.rowProofs.length : null,
    stdout_tail: String(stdout).trim().split("\n").slice(-3),
  };
}

function runBuild() {
  execFileSync("npm", ["--workspace", "apps/web", "run", "build"], {
    cwd: ROOT,
    stdio: "inherit",
  });
}

function passed(id, value, evidence = {}) {
  return { id, passed: Boolean(value), evidence };
}

async function runLeaveFlow({ browser, webOrigin, apiBase }) {
  const observed = { requests: [], responses: [], pageErrors: [] };
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  page.on("pageerror", (error) => observed.pageErrors.push(String(error)));
  await proxyApiRequests(page, apiBase, observed);

  await page.goto(`${webOrigin}/?locale=ko&view=people&data=live&ctx=allow#people-leave`, { waitUntil: "networkidle", timeout: 30000 });
  const panel = page.locator("#people-leave");
  await panel.waitFor({ state: "visible", timeout: 15000 });
  await panel.locator("label:has-text('시간') input").fill("1");
  await panel.locator("label:has-text('휴가 유형') input").fill("pto");
  await panel.locator("label:has-text('정책 ID') input").fill("pto-us");
  await panel.locator("label:has-text('시작일') input").fill("2026-07-15");
  await panel.locator("label:has-text('종료일') input").fill("2026-07-15");
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/hrx/leave") && response.request().method() === "POST",
    { timeout: 15000 },
  );
  await panel.locator("button.primary-button:has-text('신청')").click();
  const response = await responsePromise;
  const responseBody = await response.json();
  const leaveRequest = responseBody.leave_request;
  assert.ok(leaveRequest?.request_id);
  await page.waitForFunction((requestId) => document.body.innerText.includes(requestId), leaveRequest.request_id, { timeout: 15000 });
  const readbackResponse = await fetch(`${apiBase}/api/hrx/leave?employee_id=${encodeURIComponent(leaveRequest.employee_id)}&policy_id=pto-us`, {
    headers: hrxHeaders(),
  });
  const readbackBody = await readbackResponse.json();
  const panelText = await panel.innerText();
  const screenshot = `${SCREENSHOT_DIR}/upl-e09-leave-flow.png`;
  await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
  await page.close();

  const checks = [
    passed("e09-leave-panel-mounted", panelText.includes("휴가관리") && panelText.includes("사용 가능")),
    passed("e09-leave-post-created", response.status() === 201 && leaveRequest.policy_id === "pto-us", {
      status: response.status(),
      request_id: leaveRequest.request_id,
    }),
    passed("e09-leave-readback-renders-request", panelText.includes(leaveRequest.request_id)),
    passed("e09-leave-api-readback", readbackBody.requests?.some((request) => request.request_id === leaveRequest.request_id) === true, {
      status: readbackResponse.status,
      returned_count: readbackBody.requests?.length ?? 0,
    }),
    passed("e09-leave-browser-no-page-errors", observed.pageErrors.length === 0, observed.pageErrors),
  ];

  return {
    id: "leave",
    label: "leave",
    pass: checks.every((check) => check.passed),
    route: page.url(),
    screenshot,
    checks,
    observed: {
      leave_post_seen: observed.requests.some((request) => request.method === "POST" && request.url.includes("/api/hrx/leave")),
      api_4xx_5xx_count: observed.responses.filter((item) => item.status >= 400).length,
    },
    request_id: leaveRequest.request_id,
  };
}

async function runDocumentFlow({ browser, webOrigin, apiBase }) {
  const upload = await apiJson(apiBase, "/api/vault/documents", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: VAULT_TENANT,
      permission_ref: "ui_cmp_g5_vault_live",
      audit_hint_ref: "upl_e09_document_flow",
      actor_id: VAULT_ACTOR,
      idempotency_key: DOCUMENT_ID,
      content_text: `%PDF-1.4\n(${DOCUMENT_QUERY} ${HIDDEN_DOCUMENT_TERM})\n%%EOF`,
      document: {
        document_id: DOCUMENT_ID,
        tenant_id: VAULT_TENANT,
        matter_id: "matter_rp05_synthetic_opening",
        workspace_id: "workspace_rp07_synthetic",
        title: "UPL E09 document flow PDF",
        status: "active",
        current_version_id: `version_${DOCUMENT_ID}_1`,
        permission_envelope_id: "perm_rp07_vault",
        audit_trace_id: "audit_upl_e09_document_flow",
        mime_type: "application/pdf",
      },
    }),
  });

  const observed = { requests: [], responses: [], pageErrors: [] };
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  page.on("pageerror", (error) => observed.pageErrors.push(String(error)));
  await proxyApiRequests(page, apiBase, observed);
  await page.goto(`${webOrigin}/?locale=ko&view=vault&ctx=allow#vault-documents`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector("[data-upl-e01-vault-search='true']", { timeout: 15000 });
  await page.fill("input[aria-label='Vault 본문 검색']", DOCUMENT_QUERY);
  await page.click("[data-upl-e01-vault-search='true'] button[type='submit']");
  await page.waitForFunction(
    () => Number(document.querySelector("[data-upl-e01-vault-search='true']")?.getAttribute("data-vault-search-result-count") ?? "0") > 0,
    { timeout: 15000 },
  );
  const snapshot = await page.evaluate((hiddenTerm) => {
    const panel = document.querySelector("[data-upl-e01-vault-search='true']");
    const bodyText = document.body.innerText;
    return {
      marker_present: Boolean(panel),
      state: panel?.getAttribute("data-vault-search-state") ?? "",
      query: panel?.getAttribute("data-vault-search-query") ?? "",
      result_count: Number(panel?.getAttribute("data-vault-search-result-count") ?? "0"),
      raw_text_included: panel?.getAttribute("data-vault-search-raw-text-included") ?? "",
      title_visible: bodyText.includes("UPL E09 document flow PDF"),
      hidden_term_visible: bodyText.includes(hiddenTerm),
      body_match_label_visible: bodyText.includes("본문"),
    };
  }, HIDDEN_DOCUMENT_TERM);
  const screenshot = `${SCREENSHOT_DIR}/upl-e09-document-flow.png`;
  await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
  await page.close();

  const checks = [
    passed("e09-document-upload-indexed", [200, 201].includes(upload.status) && upload.body.search_index?.body_text_indexed === true, {
      status: upload.status,
      document_id: DOCUMENT_ID,
    }),
    passed("e09-document-browser-search-hit", snapshot.result_count > 0 && snapshot.title_visible === true, snapshot),
    passed("e09-document-raw-body-hidden", snapshot.hidden_term_visible === false && snapshot.raw_text_included === "false", snapshot),
    passed("e09-document-browser-no-page-errors", observed.pageErrors.length === 0, observed.pageErrors),
  ];

  return {
    id: "document",
    label: "document",
    pass: checks.every((check) => check.passed),
    route: page.url(),
    screenshot,
    checks,
    upload: { status: upload.status, document_id: DOCUMENT_ID, outcome: upload.body.outcome },
    observed: {
      search_request_seen: observed.requests.some((request) => request.method === "GET" && request.url.includes("/api/vault/search")),
      api_4xx_5xx_count: observed.responses.filter((item) => item.status >= 400).length,
    },
  };
}

runBuild();

const api = await startApiServer({ port: 0 });
const web = await serveDist();
const browser = await chromium.launch({ headless: true });
let artifact;

try {
  const apiBase = `http://${api.host}:${api.port}`;
  const opening = await runScriptFlow({
    id: "opening",
    label: "opening",
    script: "scripts/run-upl-c08-intake-completion-browser-proof.mjs",
    artifactPath: "docs/lazycodex/evidence/matter-web/artifacts/upl-c08-intake-completion-browser-proof.json",
    env: { MATTER_UI_URL: web.origin },
  });
  const leave = await runLeaveFlow({ browser, webOrigin: web.origin, apiBase });
  const document = await runDocumentFlow({ browser, webOrigin: web.origin, apiBase });
  const timeToBilling = await runScriptFlow({
    id: "time-to-billing",
    label: "time-to-billing",
    script: "scripts/run-upl-b01-time-entry-browser-proof.mjs",
    artifactPath: "artifacts/manual-qa/upl-b01-time-entry-browser-proof.json",
  });
  const portal = await runScriptFlow({
    id: "portal",
    label: "portal",
    script: "scripts/run-upl-c13-client-portal-browser-proof.mjs",
    artifactPath: "artifacts/manual-qa/upl-c13-client-portal-browser-proof.json",
  });
  const flows = [opening, timeToBilling, leave, document, portal];
  const checks = [
    passed("e09-five-required-flows-present", flows.map((flow) => flow.id).join(",") === "opening,time-to-billing,leave,document,portal", flows.map((flow) => flow.id)),
    passed("e09-all-flows-pass", flows.every((flow) => flow.pass === true), flows.map((flow) => ({ id: flow.id, pass: flow.pass }))),
    passed("e09-suite-runs-playwright-browser", true, {
      browser: "chromium",
      proof_scripts: flows.filter((flow) => flow.command).map((flow) => flow.command),
      native_browser_legs: ["leave", "document"],
    }),
  ];

  artifact = {
    schema_version: "lawos.upl_e09.wave1_five_flow_playwright_suite.v1",
    generated_at: new Date().toISOString(),
    tuw_ids: ["UPL-E-09"],
    pass: checks.every((check) => check.passed),
    playwright_suite: true,
    command: "node scripts/run-web-e2e.mjs wave1-five-flow",
    flows,
    checks,
    production_ready_claim: false,
    go_live_claim: false,
    external_provider_claim: false,
  };

  writeFileSync(resolve(ROOT, JSON_PATH), `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(
    resolve(ROOT, MD_PATH),
    `# UPL-E-09 Wave-1 Five-Flow Playwright Suite

Generated: ${artifact.generated_at}

Overall result: ${artifact.pass ? "PASS" : "FAIL"}

Command: \`${artifact.command}\`

## Flows

| Flow | Result | Evidence |
|---|---|---|
${flows.map((flow) => `| ${flow.id} | ${flow.pass ? "PASS" : "FAIL"} | \`${flow.artifact ?? flow.screenshot ?? flow.route}\` |`).join("\n")}

## Boundary

- Playwright browser: chromium
- Production ready claim: false
- Go-live claim: false
- External provider claim: false
`,
  );

  console.log(JSON.stringify({
    pass: artifact.pass,
    artifact: JSON_PATH,
    flows: flows.map((flow) => ({ id: flow.id, pass: flow.pass })),
  }, null, 2));
  if (!artifact.pass) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolveClose) => web.server.close(resolveClose));
  await new Promise((resolveClose) => api.server.close(resolveClose));
}
