#!/usr/bin/env node
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
const PROOF_PATH = `${ARTIFACT_DIR}/upl-e01-vault-fulltext-search-browser-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/upl-e01-vault-fulltext-search-browser-proof.md`;
const SCREENSHOT_PATH = `${SCREENSHOT_DIR}/upl-e01-vault-fulltext-search-browser-proof.png`;
const PROOF_PORT = 5201;
const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const ACCOUNT = highestPrivilegeRegisteredAccount();
const ACTOR_ID = ACCOUNT.user_id;
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=ui_cmp_g5_vault_live&audit_hint_ref=ui_cmp_g5_vault_probe`;
const QUERY = "차임증액";
const HIDDEN_BODY_TERM = "본문키워드";
const DOC_ID = `doc_upl_e01_browser_${Date.now()}`;

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function check(id, passed, evidence = {}) {
  return { id, passed: Boolean(passed), evidence };
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

async function startApi(options) {
  const started = await startApiServer({ port: 0, ...options });
  return {
    ...started,
    baseUrl: `http://${started.host}:${started.port}`,
    close: () => new Promise((resolveClose) => started.server.close(resolveClose)),
  };
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

async function apiJson(baseUrl, path, options = {}) {
  const headers = {
    ...(options.noAuth ? {} : await apiSessionHeaders(baseUrl, ACCOUNT)),
    ...(options.headers ?? {}),
  };
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body };
}

function writeMarkdown(report) {
  const checks = report.checks.map((item) => `| ${item.id} | ${item.passed ? "PASS" : "FAIL"} |`).join("\n");
  writeFileSync(MD_PATH, [
    "# UPL-E-01 Vault Body Search Browser Proof",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    "",
    "## Boundary",
    "",
    "- Search backend is a JSON substring search, not SQLite FTS5.",
    "- Browser search uses a signed session and does not send the legacy permission-context header.",
    "- Raw document body text, storage pointers, and session tokens are not written to this artifact.",
    "",
    "## Checks",
    "",
    "| Check | Result |",
    "|---|---|",
    checks,
    "",
    `Screenshot: ${report.screenshot}`,
    "",
  ].join("\n"));
}

mkdirSync(resolve(ROOT, ARTIFACT_DIR), { recursive: true });
mkdirSync(resolve(ROOT, SCREENSHOT_DIR), { recursive: true });

const proofRoot = mkdtempSync(join(tmpdir(), "lawos-upl-e01-"));
const dmsStorePath = join(proofRoot, "dms-store.json");
let api = null;
let vite = null;
let browser = null;

try {
  api = await startApi({ dmsStorePath });

  const forgedUpload = await apiJson(api.baseUrl, "/api/vault/documents", {
    method: "POST",
    noAuth: true,
    headers: { "x-lawos-permission-context": JSON.stringify({ rules: [{ effect: "allow", action: "*" }] }) },
    body: JSON.stringify({ tenant_id: TENANT }),
  });

  const upload = await apiJson(api.baseUrl, "/api/vault/documents", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: TENANT,
      permission_ref: "ui_cmp_g5_vault_live",
      audit_hint_ref: "ui_cmp_g5_vault_probe",
      actor_id: ACTOR_ID,
      idempotency_key: DOC_ID,
      content_text: `%PDF-1.4\n(${QUERY} ${HIDDEN_BODY_TERM} 검증)\n%%EOF`,
      document: {
        document_id: DOC_ID,
        tenant_id: TENANT,
        matter_id: "matter_rp05_synthetic_opening",
        workspace_id: "workspace_rp07_synthetic",
        title: "UPL E01 검색 검증 PDF",
        status: "active",
        current_version_id: `version_${DOC_ID}_1`,
        permission_envelope_id: "perm_rp07_vault",
        audit_trace_id: "audit_rp07_vault",
        mime_type: "application/pdf",
      },
    }),
  });
  const directSearch = await apiJson(api.baseUrl, `/api/vault/search?${BASE_QUERY}&q=${encodeURIComponent(QUERY)}`);
  const directHit = directSearch.body.items?.find((item) => item.document_id === DOC_ID);

  vite = await startVite(api.baseUrl);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  const observedRequests = [];
  const pageErrors = [];
  const consoleMessages = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) consoleMessages.push(`${message.type()}: ${message.text()}`);
  });
  page.on("request", (request) => {
    if (request.url().includes("/api/vault/search") || request.url().includes("/api/profile/me")) {
      observedRequests.push({
        method: request.method(),
        url: request.url(),
        has_authorization: Boolean(request.headers().authorization),
        has_permission_context: "x-lawos-permission-context" in request.headers(),
      });
    }
  });

  await page.goto(`http://127.0.0.1:${PROOF_PORT}/?locale=ko&view=auth&authStep=login&ctx=allow`, { waitUntil: "networkidle" });
  await page.locator("[data-login-email]").fill(ACCOUNT.email);
  await page.locator("[data-login-password]").fill(ACCOUNT.local_dev.synthetic_token);
  await page.locator("[data-login-form='email-password'] button[type='submit']").click();
  await page.waitForURL(/view=home/, { timeout: 15000 });

  await page.goto(`http://127.0.0.1:${PROOF_PORT}/?locale=ko&view=vault&ctx=allow#vault-documents`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-upl-e01-vault-search='true']", { timeout: 15000 });
  await page.fill("input[aria-label='Vault 본문 검색']", QUERY);
  await page.click("[data-upl-e01-vault-search='true'] button[type='submit']");
  await page.waitForFunction(
    () => Number(document.querySelector("[data-upl-e01-vault-search='true']")?.getAttribute("data-vault-search-result-count") ?? "0") > 0,
    null,
    { timeout: 15000 },
  );
  const snapshot = await page.evaluate((hiddenBodyTerm) => {
    const panel = document.querySelector("[data-upl-e01-vault-search='true']");
    const bodyText = document.body.innerText;
    return {
      marker_present: Boolean(panel),
      state: panel?.getAttribute("data-vault-search-state") ?? "",
      query: panel?.getAttribute("data-vault-search-query") ?? "",
      result_count: Number(panel?.getAttribute("data-vault-search-result-count") ?? "0"),
      raw_text_included: panel?.getAttribute("data-vault-search-raw-text-included") ?? "",
      body_match_label_visible: bodyText.includes("본문"),
      hidden_body_term_visible: bodyText.includes(hiddenBodyTerm),
      document_title_visible: bodyText.includes("UPL E01 검색 검증 PDF"),
    };
  }, HIDDEN_BODY_TERM);
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  await page.close();

  const searchRequests = observedRequests.filter((request) => request.url.includes("/api/vault/search"));
  const checks = [
    check("unsigned-forged-permission-context-blocked", forgedUpload.status === 401, { status: forgedUpload.status }),
    check("api-upload-created-index", [200, 201].includes(upload.status) && upload.body.search_index?.body_text_indexed === true, {
      status: upload.status,
      outcome: upload.body.outcome,
    }),
    check("api-search-label-is-substring", directSearch.body.page_info?.search_backend === "json_substring_search", {
      search_backend: directSearch.body.page_info?.search_backend,
    }),
    check("api-body-keyword-hit", Boolean(directHit && directHit.match_fields?.includes("body_text"))),
    check("api-does-not-return-body-term", !JSON.stringify(directHit ?? {}).includes(HIDDEN_BODY_TERM)),
    check("ui-search-rendered-hit", snapshot.result_count > 0 && snapshot.document_title_visible === true, snapshot),
    check("ui-match-field-body-visible", snapshot.body_match_label_visible === true),
    check("ui-does-not-render-hidden-body-term", snapshot.hidden_body_term_visible === false),
    check("ui-raw-text-flag-false", snapshot.raw_text_included === "false"),
    check("browser-search-uses-signed-session", searchRequests.some((request) => request.has_authorization === true), { searchRequests }),
    check("browser-search-sends-no-permission-context", searchRequests.every((request) => request.has_permission_context === false), { searchRequests }),
  ];

  const report = {
    schema_version: "law-firm-os.upl-e01.vault-fulltext-search.browser-proof.v0.2",
    generated_at: nowIso(),
    verdict: checks.every((item) => item.passed) ? "PASS" : "FAIL",
    web_url: `http://127.0.0.1:${PROOF_PORT}`,
    api_url: api.baseUrl,
    document_id: DOC_ID,
    query: QUERY,
    upload: {
      status: upload.status,
      outcome: upload.body.outcome,
      search_index: upload.body.search_index,
    },
    direct_search: {
      status: directSearch.status,
      search_backend: directSearch.body.page_info?.search_backend,
      returned_count: directSearch.body.items?.length ?? 0,
      matching_document_returned: Boolean(directHit),
      matching_fields: directHit?.match_fields ?? [],
    },
    snapshot,
    observed_requests: observedRequests,
    page_errors: pageErrors,
    console_message_count: consoleMessages.length,
    checks,
    screenshot: SCREENSHOT_PATH,
    boundary: {
      search_backend_claim: "json_substring_search",
      sqlite_fts5_claim: false,
      raw_body_text_written_to_artifact: false,
      session_token_written_to_artifact: false,
      permission_context_header_used: false,
    },
  };

  writeFileSync(PROOF_PATH, `${JSON.stringify(report, null, 2)}\n`);
  writeMarkdown(report);
  console.log(JSON.stringify({ verdict: report.verdict, proof: PROOF_PATH, markdown: MD_PATH, screenshot: SCREENSHOT_PATH }, null, 2));
  if (report.verdict !== "PASS") process.exit(1);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (vite) await stopProcess(vite.child).catch(() => {});
  if (api) await api.close().catch(() => {});
}
