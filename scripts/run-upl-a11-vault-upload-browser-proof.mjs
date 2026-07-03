#!/usr/bin/env node
import assert from "node:assert/strict";
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
const JSON_PATH = `${ARTIFACT_DIR}/upl-a11-vault-upload-browser-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/upl-a11-vault-upload-browser-proof.md`;
const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const ACCOUNT = highestPrivilegeRegisteredAccount();
const PROOF_PORT = 5198;
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=upl_a11_vault_read&audit_hint_ref=upl_a11_vault_download`;

function nowIso() {
  return new Date().toISOString();
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
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

async function startApi(options) {
  const started = await startApiServer({ port: 0, ...options });
  return {
    ...started,
    baseUrl: `http://${started.host}:${started.port}`,
    close: () => new Promise((resolveClose) => started.server.close(resolveClose)),
  };
}

async function readDownload(baseUrl, documentId) {
  const headers = await apiSessionHeaders(baseUrl, ACCOUNT);
  const response = await fetch(`${baseUrl}/api/vault/documents/${encodeURIComponent(documentId)}/download?${BASE_QUERY}`, { headers });
  const body = await response.json();
  const bytes = Buffer.from(body.download?.content_base64 ?? "", "base64");
  return {
    status: response.status,
    content_sha256: body.download?.content_sha256 ?? null,
    recomputed_sha256: sha256(bytes),
    byte_size: body.download?.byte_size ?? null,
    document_bytes_included: body.document_bytes_included === true,
    raw_path_exposed: body.raw_path_exposed === true,
    storage_pointer_ref_included: body.storage_pointer_ref_included === true,
  };
}

mkdirSync(resolve(ROOT, ARTIFACT_DIR), { recursive: true });
mkdirSync(resolve(ROOT, SCREENSHOT_DIR), { recursive: true });

const proofRoot = mkdtempSync(join(tmpdir(), "lawos-upl-a11-"));
const storePath = join(proofRoot, "dms-store.json");
const uploadPath = join(proofRoot, "a11-browser-upload.txt");
const uploadBytes = Buffer.from("UPL-A-11 browser file upload proof\n");
const expectedSha256 = sha256(uploadBytes);
writeFileSync(uploadPath, uploadBytes);

let api = null;
let restartedApi = null;
let vite = null;
let browser = null;

try {
  api = await startApi({ dmsStorePath: storePath });
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
    if (request.url().includes("/api/vault/documents/upload") || request.url().includes("/api/profile/me")) {
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
  await page.locator("#vault-document-upload").waitFor({ state: "visible", timeout: 15000 });
  const matterCandidates = page.locator("[data-vault-matter-lookup-results='true'] button");
  if ((await matterCandidates.count()) > 0) await matterCandidates.first().click();
  await page.locator("[data-upl-a11-file-input='true']").setInputFiles(uploadPath);
  await page.locator("#vault-document-upload input[aria-label='문서 제목']").fill("A11 browser upload proof");
  const submitButton = page.locator("#vault-document-upload button[type='submit']");
  await page.waitForFunction(() => {
    const button = document.querySelector("#vault-document-upload button[type='submit']");
    return button && !button.disabled;
  }, null, { timeout: 15000 });
  await page.evaluate(() => {
    const panel = document.querySelector("#vault-document-upload");
    const form = panel?.querySelector("form");
    const button = panel?.querySelector("button[type='submit']");
    button?.addEventListener("click", () => {
      document.body.dataset.a11ButtonClicked = "true";
    }, { once: true });
    form?.addEventListener("submit", () => {
      document.body.dataset.a11FormSubmitted = "true";
    }, { once: true });
  });
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/vault/documents/upload") && response.request().method() === "POST",
    { timeout: 15000 },
  ).catch(() => null);
  await submitButton.click();
  const uploadResponse = await responsePromise;
  if (!uploadResponse) {
    const uploadStateAfterTimeout = await page.locator("[data-upl-a11-vault-upload-ui='true']").getAttribute("data-vault-document-upload-state").catch(() => "missing");
    const domDebug = await page.evaluate(() => {
      const panel = document.querySelector("#vault-document-upload");
      const button = panel?.querySelector("button[type='submit']");
      return {
        button_clicked: document.body.dataset.a11ButtonClicked === "true",
        form_submitted: document.body.dataset.a11FormSubmitted === "true",
        button_disabled: button?.disabled ?? null,
        panel_text: panel?.innerText ?? null,
      };
    });
    throw new Error(JSON.stringify({
      reason: "upload_response_timeout",
      upload_state: uploadStateAfterTimeout,
      dom_debug: domDebug,
      observed_requests: observedRequests,
      page_errors: pageErrors,
      console_messages: consoleMessages,
    }, null, 2));
  }
  const uploadBody = await uploadResponse.json();
  if (uploadResponse.status() !== 201 || uploadBody.outcome !== "created") {
    throw new Error(JSON.stringify({
      reason: "upload_not_created",
      status: uploadResponse.status(),
      body: uploadBody,
      observed_requests: observedRequests,
      page_errors: pageErrors,
      console_messages: consoleMessages,
    }, null, 2));
  }
  const receipt = page.locator("[data-upl-a11-upload-receipt='true']");
  await receipt.waitFor({ state: "visible", timeout: 15000 }).catch(async () => {
    const uploadStateAfterResponse = await page.locator("[data-upl-a11-vault-upload-ui='true']").getAttribute("data-vault-document-upload-state").catch(() => "missing");
    const panelText = await page.locator("#vault-document-upload").innerText().catch(() => "");
    throw new Error(JSON.stringify({
      reason: "upload_receipt_not_visible",
      upload_state: uploadStateAfterResponse,
      panel_text: panelText,
      response_body: uploadBody,
      observed_requests: observedRequests,
      page_errors: pageErrors,
      console_messages: consoleMessages,
    }, null, 2));
  });
  const uploadState = await page.locator("[data-upl-a11-vault-upload-ui='true']").getAttribute("data-vault-document-upload-state");
  const uploadFormDocumentId = await page.locator("[data-upl-a11-vault-upload-ui='true']").getAttribute("data-vault-document-upload-document-id");
  const uploadFormSha256 = await page.locator("[data-upl-a11-vault-upload-ui='true']").getAttribute("data-vault-document-upload-sha256");
  const receiptText = await receipt.innerText();
  const documentId = uploadBody.item?.document_id ?? uploadFormDocumentId;
  const browserSha256 = uploadBody.file_object?.sha256 ?? uploadFormSha256;
  const screenshotPath = `${SCREENSHOT_DIR}/upl-a11-vault-upload-browser-proof.png`;
  await page.screenshot({ path: resolve(ROOT, screenshotPath), fullPage: true });
  const fileInputPresent = (await page.locator("[data-upl-a11-file-input='true']").count()) >= 1;
  const pageHtml = await page.content();
  const liveDownload = await readDownload(api.baseUrl, documentId);
  await browser.close();
  browser = null;
  await api.close();
  api = null;
  restartedApi = await startApi({ dmsStorePath: storePath });
  const restartDownload = await readDownload(restartedApi.baseUrl, documentId);

  const uploadRequest = observedRequests.find((request) => request.url.includes("/api/vault/documents/upload"));
  const checks = [
    check("a11-browser-file-input-present", fileInputPresent),
    check("a11-ui-upload-response-created", uploadResponse.status() === 201 && uploadBody.outcome === "created", {
      status: uploadResponse.status(),
      outcome: uploadBody.outcome,
    }),
    check("a11-ui-receipt-has-document-and-sha256", receiptText.includes("A11 browser upload proof") && receiptText.includes(expectedSha256) && documentId && browserSha256 === expectedSha256, {
      upload_state: uploadState,
      document_id: documentId,
      sha256: browserSha256,
      form_document_id: uploadFormDocumentId,
      form_sha256: uploadFormSha256,
    }),
    check("a11-request-uses-signed-session", uploadRequest?.has_authorization === true && uploadRequest?.has_permission_context === false, uploadRequest ?? {}),
    check("a11-download-hash-matches-uploaded-file", liveDownload.status === 200 && liveDownload.content_sha256 === expectedSha256 && liveDownload.recomputed_sha256 === expectedSha256, liveDownload),
    check("a11-restart-download-preserves-hash", restartDownload.status === 200 && restartDownload.content_sha256 === expectedSha256 && restartDownload.recomputed_sha256 === expectedSha256, restartDownload),
    check("a11-safe-boundary", liveDownload.raw_path_exposed === false && liveDownload.storage_pointer_ref_included === false && liveDownload.document_bytes_included === true, liveDownload),
  ];

  const artifact = {
    schema_version: "lawos.upl_a11.vault_upload_browser_proof.v1",
    generated_at: nowIso(),
    tuw_ids: ["UPL-A-11", "UPL-A-10"],
    pass: checks.every((item) => item.passed),
    production_ready_claim: false,
    go_live_claim: false,
    routes: {
      browser_upload: "POST /api/vault/documents/upload",
      download: `GET /api/vault/documents/${documentId}/download`,
    },
    source_trace: {
      ui: "apps/web/src/components/VaultSurface.jsx#VaultDocumentUploadPanel",
      api_client: "apps/web/src/data/apiClient.js#uploadVaultDocumentFile",
      api_runtime: "apps/api/src/vault-dms-runtime-context.js#handleVaultDocumentUpload",
      storage: "packages/dms/src/storage/file-storage-adapter.js#createFileStorageAdapter",
    },
    upload_receipt: {
      status: uploadResponse.status(),
      outcome: uploadBody.outcome,
      document_id: documentId,
      title: uploadBody.item?.title ?? null,
      mime_type: uploadBody.file_object?.mime_type ?? null,
      byte_size: uploadBody.file_object?.byte_size ?? null,
      sha256: uploadBody.file_object?.sha256 ?? null,
      storage_pointer_ref_included: uploadBody.file_object?.storage_pointer_ref_included ?? null,
      request_has_authorization: uploadRequest?.has_authorization ?? false,
      request_has_permission_context: uploadRequest?.has_permission_context ?? null,
    },
    download_receipt: liveDownload,
    restart_readback: restartDownload,
    browser: {
      screenshot_path: screenshotPath,
      token_material_rendered: pageHtml.includes("lawos_session_v1."),
      page_errors: pageErrors,
      console_messages: consoleMessages,
    },
    checks,
  };

  writeFileSync(resolve(ROOT, JSON_PATH), `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(
    resolve(ROOT, MD_PATH),
    `# UPL-A-11 Vault Upload Browser Proof

Generated: ${artifact.generated_at}

Overall result: ${artifact.pass ? "PASS" : "FAIL"}

## Evidence

| Check | Result | Evidence |
|---|---|---|
${checks.map((item) => `| ${item.id} | ${item.passed ? "PASS" : "FAIL"} | \`${JSON.stringify(item.evidence).replaceAll("|", "\\|")}\` |`).join("\n")}

## Boundary

- Browser upload route: \`POST /api/vault/documents/upload\`
- Download route: \`GET /api/vault/documents/${documentId}/download\`
- Screenshot: \`${screenshotPath}\`
- Production ready claim: false
- Go-live claim: false
`,
  );

  console.log(JSON.stringify({
    pass: artifact.pass,
    artifact: JSON_PATH,
    document_id: documentId,
    upload_sha256: artifact.upload_receipt.sha256,
    download_sha256: artifact.download_receipt.content_sha256,
    restart_sha256: artifact.restart_readback.content_sha256,
  }, null, 2));

  if (!artifact.pass) process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (api) await api.close();
  if (restartedApi) await restartedApi.close();
  if (vite) await stopProcess(vite.child);
}
