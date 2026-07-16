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
import { createMatterRepository } from "../packages/matter/src/index.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/upl-c08-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/upl-c08-intake-completion-browser-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/upl-c08-intake-completion-browser-proof.md`;
const PROOF_PORT = 5208;
const TENANT = "tenant_cmp_g6_synthetic";
const ACCOUNT = highestPrivilegeRegisteredAccount();
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
      "# UPL-C-08 Intake Completion Browser Proof",
      "",
      `- verdict: ${report.verdict}`,
      `- url: ${report.url}`,
      `- screenshot: ${report.screenshot}`,
      `- api_runtime: ${report.api_runtime}`,
      `- manual_input_count: ${report.observed.manual_input_count}`,
      "",
      "## Checks",
      ...report.checks.map((item) => `- ${item.passed ? "PASS" : "FAIL"} ${item.id}`),
      "",
      "## Write Order",
      ...report.observed.write_order.map((kind, index) => `- ${index + 1}. ${kind}`),
      "",
      "## Linkage",
      `- opportunity_id: ${report.observed.linkage.opportunity_id}`,
      `- intake_request_id: ${report.observed.linkage.intake_request_id}`,
      `- clearance_token_id: ${report.observed.linkage.clearance_token_id}`,
      `- matter_id: ${report.observed.linkage.matter_id}`,
      "",
    ].join("\n"),
  );
}

const intakeRepository = createIntakeRuntimeRepository({ seedRecords: [] });
const matterRepository = createMatterRepository({ seedRecords: [] });
const dmsRepository = createDmsRepository();
const dmsStorage = createLocalStorageAdapter({ adapter_id: "upl-c08-intake-completion-vault" });
const dmsRuntime = createVaultDmsRuntimeContext({ repository: dmsRepository, storage: dmsStorage });

mkdirSync(resolve(ROOT, SCREENSHOT_DIR), { recursive: true });

let api = null;
let vite = null;
let browser = null;

try {
  const started = await startApiServer({
    port: 0,
    intakeRepository,
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
      ["/api/crm/opportunities", "opportunity"],
      ["/api/crm/opportunities/", "handoff"],
      ["/api/intake/conflict-checks", "conflict_check"],
      ["/api/intake/conflict-decisions", "decision"],
      ["/api/intake/engagements", "engagement"],
      ["/api/intake/clearance-tokens", "clearance"],
      ["/api/matters/openings", "matter_opening"],
    ];
    const match = routeMap.find(([needle, kind]) => {
      if (request.method() !== "POST") return false;
      if (kind === "opportunity") return request.url().endsWith("/api/crm/opportunities");
      if (kind === "handoff") return request.url().includes(needle) && request.url().endsWith("/handoff");
      return request.url().includes(needle);
    });
    if (match) writes.push({ ...observed, kind: match[1], payload: sanitizePayload(request.postDataJSON()) });
  });

  await page.goto(`http://127.0.0.1:${PROOF_PORT}/?locale=ko&view=auth&authStep=login&ctx=allow`, { waitUntil: "networkidle" });
  await page.locator("[data-login-email]").fill(ACCOUNT.email);
  await page.locator("[data-login-password]").fill(ACCOUNT.local_dev.synthetic_token);
  await page.locator("[data-login-form='email-password'] button[type='submit']").click();
  await page.waitForURL(/view=home/, { timeout: 15000 });

  await page.goto(proofUrl("client-intake"), { waitUntil: "networkidle" });
  const surface = page.locator("[data-upl-c08-intake-completion-surface='true']");
  await surface.waitFor({ state: "visible", timeout: 15000 });
  const manualInputCount = await surface.locator("input, textarea").count();

  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/crm/opportunities/") && response.url().endsWith("/handoff") && response.request().method() === "POST"),
    surface.getByRole("button", { name: "의뢰 접수" }).click(),
  ]);
  await surface.getByText("신규 의뢰가 인테이크로 접수되었습니다.").waitFor({ state: "visible", timeout: 15000 });

  const actionPanel = page.locator("[data-intake-matter-opening-flow='true']");
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/intake/conflict-checks") && response.request().method() === "POST"),
    actionPanel.getByRole("button", { name: "이해상충 검토" }).click(),
  ]);
  await page.locator("[data-intake-conflict-hit-list='true']").getByText("히트 없음", { exact: true }).waitFor({ state: "visible", timeout: 15000 });

  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/intake/conflict-decisions") && response.request().method() === "POST"),
    actionPanel.getByRole("button", { name: "검토 결정" }).click(),
  ]);
  await actionPanel.getByText("검토 결정이 기록되었습니다.").waitFor({ state: "visible", timeout: 15000 });

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

  const surfaceText = await surface.innerText();
  const screenshot = join(ROOT, SCREENSHOT_DIR, "upl-c08-intake-completion.png");
  await page.screenshot({ path: screenshot, fullPage: true });
  const pageText = await page.locator("body").innerText();
  const writeOrder = writes.map((write) => write.kind);
  const opportunityWrite = writes.find((write) => write.kind === "opportunity");
  const handoffWrite = writes.find((write) => write.kind === "handoff");
  const conflictWrite = writes.find((write) => write.kind === "conflict_check");
  const decisionWrite = writes.find((write) => write.kind === "decision");
  const engagementWrite = writes.find((write) => write.kind === "engagement");
  const clearanceWrite = writes.find((write) => write.kind === "clearance");
  const matterWrite = writes.find((write) => write.kind === "matter_opening");
  const opportunityId = opportunityWrite?.payload?.opportunity?.opportunity_id;
  const createdPartyId = opportunityWrite?.payload?.opportunity?.party_id;
  const intakeRequestId = handoffWrite?.payload?.intake_request_id;
  const conflictCheckId = conflictWrite?.payload?.conflict_check?.conflict_check_id;
  const engagement = engagementWrite?.payload?.engagement ?? {};
  const upload = engagement.signed_document_upload ?? {};
  const clearanceTokenId = clearanceWrite?.payload?.token?.clearance_token_id;
  const matterId = matterWrite?.payload?.matter?.matter_id;
  const storedIntake = intakeRepository.get({ tenant_id: TENANT, model_type: "IntakeRequest", intake_request_id: intakeRequestId });
  const storedConflict = intakeRepository.get({ tenant_id: TENANT, model_type: "ConflictCheck", conflict_check_id: conflictCheckId });
  const storedConflictHitCount = intakeRepository
    .list({ tenant_id: TENANT, model_type: "ConflictHit" })
    .filter((hit) => hit.conflict_check_id === conflictCheckId).length;
  const storedUpload = intakeRepository.get({
    tenant_id: TENANT,
    model_type: "EngagementSignedDocumentUpload",
    signed_document_upload_id: upload.signed_document_upload_id,
  });
  const storedDmsFileObject = storedUpload?.dms_file_object_id
    ? dmsRepository.get({ tenant_id: TENANT, model_type: "DmsFileObject", file_object_id: storedUpload.dms_file_object_id })
    : null;
  const storedObject = storedDmsFileObject?.vault_object_id
    ? dmsStorage.getObject({ object_id: storedDmsFileObject.vault_object_id })
    : null;
  const storedMatter = matterRepository.get({ tenant_id: TENANT, model_type: "Matter", matter_id: matterId });
  const checks = [
    check(
      "intake-surface-mounted-with-new-inquiry-action",
      surfaceText.includes("신규 의뢰 접수") && surfaceText.includes("인테이크") && manualInputCount === 0,
      { manual_input_count: manualInputCount },
    ),
    check(
      "ui-drives-full-intake-to-matter-write-order",
      JSON.stringify(writeOrder) === JSON.stringify(["opportunity", "handoff", "conflict_check", "decision", "engagement", "clearance", "matter_opening"]),
      { write_order: writeOrder },
    ),
    check(
      "opportunity-does-not-shortcut-to-matter",
      typeof createdPartyId === "string" &&
        opportunityWrite?.payload?.opportunity?.display_name === "신규 의뢰" &&
        opportunityWrite?.payload?.opportunity?.matter_id === undefined &&
        opportunityWrite?.payload?.opportunity?.matter_open_command === undefined,
      { opportunity_id: opportunityId, party_id: createdPartyId },
    ),
    check(
      "handoff-creates-active-intake-context",
      typeof intakeRequestId === "string" &&
        storedIntake?.opportunity_id === opportunityId &&
        storedIntake?.requesting_party_id === createdPartyId &&
        storedIntake?.status === "open",
      { intake_request_id: intakeRequestId },
    ),
    check(
      "conflict-decision-clearance-use-created-intake",
      conflictWrite?.payload?.conflict_check?.intake_request_id === intakeRequestId &&
        conflictWrite?.payload?.conflict_check?.party_snapshot?.party_ids?.includes(createdPartyId) &&
        storedConflictHitCount === 0 &&
        decisionWrite?.payload?.conflict_decision?.conflict_check_id === conflictCheckId &&
        clearanceWrite?.payload?.token?.intake_request_id === intakeRequestId &&
        clearanceWrite?.payload?.token?.snapshot_hash === storedConflict?.snapshot_hash,
      { conflict_check_id: conflictCheckId, snapshot_hash: storedConflict?.snapshot_hash },
    ),
    check(
      "engagement-upload-stored-through-dms-before-clearance",
      upload.content_sha256 === SIGNED_PDF_SHA256 &&
        upload.bytes_base64 === "[redacted]" &&
        storedUpload?.content_sha256 === SIGNED_PDF_SHA256 &&
        storedUpload?.server_hash_recomputed === true &&
        storedDmsFileObject?.sha256 === SIGNED_PDF_SHA256 &&
        storedObject?.sha256 === SIGNED_PDF_SHA256 &&
        Buffer.isBuffer(storedObject?.bytes) &&
        storedObject.bytes.equals(SIGNED_PDF_BYTES),
      { signed_document_upload_id: upload.signed_document_upload_id },
    ),
    check(
      "matter-opening-uses-issued-clearance-token",
        matterWrite?.payload?.permission_ref === "ui_cmp_g6_intake_matter_open" &&
        matterWrite?.payload?.clearance_token?.clearance_token_id === clearanceTokenId &&
        matterWrite?.payload?.clearance_token?.intake_request_id === intakeRequestId &&
        matterWrite?.payload?.matter?.legal_client_party_id === createdPartyId &&
        storedMatter?.matter_id === matterId,
      { clearance_token_id: clearanceTokenId, matter_id: matterId },
    ),
    check(
      "completion-success-rendered",
      surfaceText.includes("Matter가 개설되었습니다.") && surfaceText.includes("통과 처리되었습니다."),
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
    schema_version: "law-firm-os.upl-c08.browser-proof.v0.2",
    generated_at: new Date().toISOString(),
    verdict: checks.every((item) => item.passed) ? "PASS" : "FAIL",
    contract_ref: "UPL-C-08",
    api_runtime: "startApiServer+empty-intake-matter-repositories+dms-storage",
    url: proofUrl("client-intake"),
    screenshot,
    checks,
    observed: {
      write_order: writeOrder,
      writes,
      manual_input_count: manualInputCount,
      surface_text: surfaceText,
      linkage: {
        opportunity_id: opportunityId,
        party_id: createdPartyId,
        intake_request_id: intakeRequestId,
        conflict_check_id: conflictCheckId,
        engagement_id: engagement.engagement_id,
        signed_document_upload_id: upload.signed_document_upload_id,
        clearance_token_id: clearanceTokenId,
        matter_id: matterId,
      },
      stored_readback: {
        intake_status: storedIntake?.status,
        conflict_hit_count: storedConflictHitCount,
        dms_file_object_sha256: storedDmsFileObject?.sha256,
        downloaded_sha256: storedObject?.sha256,
        matter_status: storedMatter?.status,
        bytes_written_to_artifact: false,
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
