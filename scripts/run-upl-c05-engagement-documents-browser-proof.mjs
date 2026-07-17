#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { highestPrivilegeRegisteredAccount } from "../apps/api/src/matter-vault-account-registry.js";
import { startApiServer } from "../apps/api/src/server.js";
import { createVaultDmsRuntimeContext } from "../apps/api/src/vault-dms-runtime-context.js";
import { createDmsRepository } from "../packages/dms/src/repository.js";
import { createLocalStorageAdapter } from "../packages/dms/src/storage/local-storage-adapter.js";
import { sha256Hex } from "../packages/dms/src/storage/storage-adapter.js";
import { createIntakeRuntimeRepository } from "../packages/intake/src/runtime-repository.js";
import { createMasterDataRepository } from "../packages/master-data/src/index.js";
import { createMatterRepository } from "../packages/matter/src/index.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/upl-c05-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/upl-c05-engagement-documents-browser-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/upl-c05-engagement-documents-browser-proof.md`;
const PROOF_PORT = 5205;
const TENANT = "tenant_cmp_g6_synthetic";
const ACCOUNT = highestPrivilegeRegisteredAccount();
const ACTOR = ACCOUNT.user_id;
const INTAKE_ID = "intake_upl_c05_new_client";
const SIGNED_PDF_BYTES = Buffer.from(
  "JVBERi0xLjQKTGF3IEZpcm0gT1Mgc2lnbmVkIGVuZ2FnZW1lbnQgYnJvd3NlciBwcm9vZgolJUVPRgo=",
  "base64",
);
const SIGNED_PDF_SHA256 = sha256Hex(SIGNED_PDF_BYTES);

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
      "# UPL-C-05 Engagement Documents Browser Proof",
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
      `- dms_document_id: ${report.observed.dms_readback.document_id}`,
      `- downloaded_sha256: ${report.observed.dms_readback.downloaded_sha256}`,
      `- downloaded_byte_size: ${report.observed.dms_readback.downloaded_byte_size}`,
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
      opportunity_id: "opp_upl_c05_new_client",
      requesting_party_id: "party_upl_c05_new_client",
      party_ids: ["party_upl_c05_new_client"],
      requested_scope_summary: "위임계약 문서 생성과 서명본 업로드 검증",
      status: "open",
      owner_user_id: ACTOR,
    },
  ],
});

const crmMasterDataRepository = createMasterDataRepository({
  seedRecords: [
    {
      model_type: "Party",
      party_id: "party_upl_c05_new_client",
      tenant_id: TENANT,
      party_type: "organization",
      display_name: "신규 고객 주식회사",
      status: "active",
      owner_user_id: ACTOR,
    },
  ],
});

const matterRepository = createMatterRepository({
  seedRecords: [
    {
      model_type: "MatterParty",
      resource_id: "matter_party_upl_c05_adverse",
      matter_party_id: "matter_party_upl_c05_adverse",
      tenant_id: TENANT,
      matter_id: "matter_upl_c05_former",
      party_id: "party_upl_c05_adverse",
      display_name: "신규 고객 주식회사",
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

const dmsRepository = createDmsRepository();
const dmsStorage = createLocalStorageAdapter({ adapter_id: "upl-c05-engagement-browser-vault" });
const dmsRuntime = createVaultDmsRuntimeContext({ repository: dmsRepository, storage: dmsStorage });

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
    dmsRuntime,
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
  await page.locator("[data-intake-conflict-hit-list='true']").getByText("신규 고객 주식회사", { exact: true }).waitFor({ state: "visible", timeout: 15000 });

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

  const panelText = await actionPanel.innerText();
  const screenshot = join(ROOT, SCREENSHOT_DIR, "upl-c05-engagement-documents.png");
  await page.screenshot({ path: screenshot, fullPage: true });
  const pageText = await page.locator("body").innerText();
  const engagementWrite = writes.find((write) => write.kind === "engagement");
  const clearanceWrite = writes.find((write) => write.kind === "clearance");
  const engagement = engagementWrite?.payload?.engagement ?? {};
  const upload = engagement.signed_document_upload ?? {};
  const template = engagement.template_document ?? {};
  const storedTemplate = intakeRepository.get({
    tenant_id: TENANT,
    model_type: "EngagementTemplateDocument",
    template_document_id: template.template_document_id,
  });
  const storedUpload = intakeRepository.get({
    tenant_id: TENANT,
    model_type: "EngagementSignedDocumentUpload",
    signed_document_upload_id: upload.signed_document_upload_id,
  });
  const storedDmsDocument = dmsRepository.get({ tenant_id: TENANT, model_type: "DmsDocument", document_id: upload.document_id });
  const storedDmsFileObject = storedUpload?.dms_file_object_id
    ? dmsRepository.get({ tenant_id: TENANT, model_type: "DmsFileObject", file_object_id: storedUpload.dms_file_object_id })
    : null;
  const storedObject = storedDmsFileObject?.vault_object_id
    ? dmsStorage.getObject({ tenant_id: TENANT, object_id: storedDmsFileObject.vault_object_id })
    : null;
  const writeKinds = writes.map((write) => write.kind);
  const checks = [
    check(
      "ui-drives-engagement-and-clearance-routes",
      ["conflict_check", "decision", "waiver", "engagement", "clearance"].every((kind) => writeKinds.includes(kind)),
      { write_kinds: writeKinds },
    ),
    check(
      "engagement-payload-includes-template-document",
      typeof template.template_document_id === "string" &&
        template.template_document_id.startsWith("template_doc:") &&
        template.template_id === "matter_engagement_letter" &&
        template.document_title === "위임계약서" &&
        template.generation_state === "generated",
      { template_document_id: template.template_document_id },
    ),
    check(
      "engagement-payload-includes-lx06-signed-upload",
      typeof upload.signed_document_upload_id === "string" &&
        upload.signed_document_upload_id.startsWith("signed_upload:") &&
        upload.document_id === engagement.signed_document_id &&
        upload.signed_document_id === engagement.signed_document_id &&
        upload.template_document_id === template.template_document_id &&
        upload.signature_ref === engagement.signature_ref &&
        upload.content_sha256 === SIGNED_PDF_SHA256 &&
        upload.byte_size === SIGNED_PDF_BYTES.byteLength &&
        upload.mime_type === "application/pdf" &&
        upload.lx_registry_ref === "LX-06" &&
        upload.bytes_included === false &&
        upload.storage_pointer_ref_included === false &&
        upload.bytes_base64 === "[redacted]",
      { signed_document_upload_id: upload.signed_document_upload_id, expected_sha256: SIGNED_PDF_SHA256 },
    ),
    check(
      "server-stores-signed-bytes-through-dms",
      storedTemplate?.generation_state === "generated" &&
        storedUpload?.content_sha256 === SIGNED_PDF_SHA256 &&
        storedUpload?.byte_size === SIGNED_PDF_BYTES.byteLength &&
        storedUpload?.server_hash_recomputed === true &&
        storedUpload?.bytes_included === false &&
        storedUpload?.storage_pointer_ref_included === false &&
        storedDmsDocument?.latest_sha256 === SIGNED_PDF_SHA256 &&
        storedDmsFileObject?.sha256 === SIGNED_PDF_SHA256 &&
        storedObject?.sha256 === SIGNED_PDF_SHA256,
      { dms_document_id: storedDmsDocument?.document_id, file_object_id: storedDmsFileObject?.file_object_id },
    ),
    check(
      "downloaded-dms-object-hash-matches-signed-pdf",
      Buffer.isBuffer(storedObject?.bytes) &&
        storedObject.bytes.equals(SIGNED_PDF_BYTES) &&
        sha256Hex(storedObject.bytes) === SIGNED_PDF_SHA256,
      { downloaded_sha256: storedObject?.sha256 },
    ),
    check(
      "clearance-uses-approved-engagement-document",
      clearanceWrite?.payload?.token?.engagement_id === engagement.engagement_id &&
        storedUpload?.signed_document_upload_id === upload.signed_document_upload_id,
      { engagement_id: engagement.engagement_id },
    ),
    check(
      "engagement-document-success-rendered",
      panelText.includes("수임 승인 완료.") && panelText.includes("통과 처리되었습니다."),
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
    check("no-session-token-or-raw-bytes-rendered", !pageText.includes("lawos_session_v1.") && !pageText.includes(SIGNED_PDF_BYTES.toString("base64"))),
  ];
  const report = {
    schema_version: "law-firm-os.upl-c05.browser-proof.v0.2",
    generated_at: new Date().toISOString(),
    verdict: checks.every((item) => item.passed) ? "PASS" : "FAIL",
    contract_ref: "UPL-C-05",
    api_runtime: "startApiServer+seeded-intake-master-matter-dms-repositories",
    url: proofUrl("client-conflict"),
    screenshot,
    checks,
    observed: {
      writes,
      panel_text: panelText,
      api_requests: apiRequests,
      dms_readback: {
        document_id: storedDmsDocument?.document_id,
        latest_sha256: storedDmsDocument?.latest_sha256,
        file_object_id: storedDmsFileObject?.file_object_id,
        file_object_sha256: storedDmsFileObject?.sha256,
        downloaded_sha256: storedObject?.sha256,
        downloaded_byte_size: storedObject?.bytes?.byteLength ?? null,
        raw_path_exposed: false,
        storage_pointer_ref_included: false,
        bytes_written_to_artifact: false,
      },
      stored_upload: {
        signed_document_upload_id: storedUpload?.signed_document_upload_id,
        content_sha256: storedUpload?.content_sha256,
        byte_size: storedUpload?.byte_size,
        dms_document_id: storedUpload?.dms_document_id,
        dms_file_object_id: storedUpload?.dms_file_object_id,
        server_hash_recomputed: storedUpload?.server_hash_recomputed,
        bytes_included: storedUpload?.bytes_included,
        storage_pointer_ref_included: storedUpload?.storage_pointer_ref_included,
      },
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
