#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { chromium } from "playwright";
import {
  createDefaultDmsRuntime,
  createDefaultMatterRuntime,
  startApiServer,
} from "../apps/api/src/server.js";
import { createDmsRepository, createFileStorageAdapter } from "../packages/dms/src/index.js";
import { createMatterRepository } from "../packages/matter/src/index.js";
import { outlookAddinProofSnapshot } from "../apps/api/src/outlook-addin-runtime-context.js";
import { apiLogin } from "../apps/api/test/helpers/session.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/upl-c09-c12-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/upl-c09-c12-outlook-addin-browser-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/upl-c09-c12-outlook-addin-browser-proof.md`;
const SCREENSHOT_PATH = `${SCREENSHOT_DIR}/taskpane-proof.png`;
const MANUAL_ARTIFACT_DIR = "artifacts/manual-qa";
const MANUAL_SCREENSHOT_DIR = `${MANUAL_ARTIFACT_DIR}/screenshots`;
const E04_JSON_PATH = `${MANUAL_ARTIFACT_DIR}/upl-e04-smart-alerts-local-proof-2026-07-03.json`;
const E04_MD_PATH = `${MANUAL_ARTIFACT_DIR}/upl-e04-smart-alerts-local-proof-2026-07-03.md`;
const E04_SCREENSHOT_PATH = `${MANUAL_SCREENSHOT_DIR}/upl-e04-smart-alerts-local-proof-2026-07-03.png`;
const TENANT = "tenant_upl_c09_c12_outlook";
const MATTER = "matter_upl_c09_c12_outlook";
const ACTOR = "outlook_addin_browser_proof_user";
const ENTRA_CLIENT_ID = "00000000-0000-0000-0000-000000000000";
const ENTRA_TENANT_ID = "organizations";

function seedMatterRepository() {
  return createMatterRepository({
    seedRecords: [
      {
        model_type: "MatterClient",
        tenant_id: TENANT,
        client_id: "client_upl_c09_c12",
        client_display_name: "Outlook filing proof client",
        client_short_name: "OUTLOOKPROOF",
        status: "active",
        created_by: ACTOR,
        created_at: "2026-07-03T00:00:00.000Z",
      },
      {
        model_type: "Matter",
        tenant_id: TENANT,
        matter_id: MATTER,
        matter_code: "OUTLOOK/LIT/CIV/브라우저검증",
        matter_name: "Outlook add-in browser proof matter",
        client_id: "client_upl_c09_c12",
        client_display_name: "Outlook filing proof client",
        title: "Outlook add-in browser proof matter",
        status: "open",
        created_by: ACTOR,
        created_at: "2026-07-03T00:00:00.000Z",
        permission_envelope_id: "perm:upl:c09-c12",
        audit_trace_id: "audit:upl:c09-c12",
      },
    ],
  });
}

function contentType(filePath) {
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
  }[extname(filePath)] ?? "application/octet-stream";
}

async function serveDist() {
  const distRoot = resolve(ROOT, "apps/addin/dist");
  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const path = url.pathname === "/" ? "/index.html" : url.pathname;
      const safePath = path.replace(/^\/+/, "");
      const filePath = resolve(distRoot, safePath);
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

function passed(id, value, extra = {}) {
  return { id, passed: Boolean(value), ...extra };
}

function sha256Text(value) {
  return createHash("sha256").update(String(value ?? "")).digest("hex");
}

function sanitizedAlertResult(body = {}) {
  return {
    outcome: body.outcome ?? null,
    warning_count: body.item?.warning_count ?? null,
    warning_ids: (body.item?.warnings ?? []).map((warning) => warning.warning_id),
    send_blocked: body.item?.send_blocked ?? null,
    provider_runtime_executed: body.item?.provider_runtime_executed ?? null,
    production_ready_claim: body.item?.production_ready_claim ?? null,
    raw_body_included: body.item?.raw_body_included ?? null,
    attachment_bytes_included: body.item?.attachment_bytes_included ?? null,
    credential_material_included: body.item?.credential_material_included ?? null,
    message_hashes: body.item?.message_hashes ?? null,
  };
}

async function signedJsonFetch(baseUrl, path, { sessionToken, body } = {}) {
  const serialized = JSON.stringify(body ?? {});
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${sessionToken}`,
    },
    body: serialized,
  });
  const payload = await response.json();
  return { status: response.status, payload, request_hash: sha256Text(serialized), response_hash: sha256Text(JSON.stringify(payload)) };
}

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(SCREENSHOT_DIR, { recursive: true });
mkdirSync(MANUAL_ARTIFACT_DIR, { recursive: true });
mkdirSync(MANUAL_SCREENSHOT_DIR, { recursive: true });

execFileSync("npm", ["--workspace", "apps/addin", "run", "build"], { cwd: ROOT, stdio: "inherit" });

const matterRepository = seedMatterRepository();
const dmsRepository = createDmsRepository();
const storage = createFileStorageAdapter({
  adapter_id: "upl-c09-c12-file-storage",
  rootPath: join(mkdtempSync(join(tmpdir(), "upl-c09-c12-dms-")), "objects"),
});
const dmsRuntime = createDefaultDmsRuntime({ repository: dmsRepository, storage });
const matterRuntime = createDefaultMatterRuntime({ repository: matterRepository, dmsRuntime });
const api = await startApiServer({ port: 0, matterRuntime, dmsRuntime });
const web = await serveDist();
process.env.LAWOS_API_ALLOWED_ORIGINS = [process.env.LAWOS_API_ALLOWED_ORIGINS, web.origin].filter(Boolean).join(",");

const browser = await chromium.launch({ headless: true });
let checks = [];
try {
  const apiBase = `http://${api.host}:${api.port}`;
  const signedSession = await apiLogin(apiBase);
  const page = await browser.newPage({ viewport: { width: 390, height: 860 } });
  const smartAlertRequests = [];
  let handlerProbe = null;
  let msalBridgeProbe = null;
  page.on("request", (request) => {
    if (!request.url().includes("/api/outlook/smart-alerts/evaluate")) return;
    const headers = request.headers();
    smartAlertRequests.push({
      method: request.method(),
      url_path: new URL(request.url()).pathname,
      has_authorization_header: Boolean(headers.authorization),
      permission_context_header_sent: Object.keys(headers).some((name) => name.toLowerCase() === "x-lawos-permission-context"),
      post_data_sha256: sha256Text(request.postData() ?? ""),
    });
  });
  await page.addInitScript(() => {
    window.__LAWOS_OUTLOOK_ASSOCIATED_ACTIONS = [];
    window.__LAWOS_OUTLOOK_ASSOCIATED_HANDLERS = {};
    window.Office = {
      actions: {
        associate(name, handler) {
          window.__LAWOS_OUTLOOK_ASSOCIATED_ACTIONS.push(name);
          window.__LAWOS_OUTLOOK_ASSOCIATED_HANDLERS[name] = handler;
        },
      },
      MailboxEnums: {
        ItemNotificationMessageType: {
          InformationalMessage: "informationalMessage",
        },
      },
    };
  });
  await page.addInitScript((token) => {
    window.sessionStorage.setItem("lawos_addin_session_token", token);
  }, signedSession.session_token);
  const taskpaneUrl = `${web.origin}/?${new URLSearchParams({
    apiBase,
    tenantId: TENANT,
    matterId: MATTER,
    entraClientId: ENTRA_CLIENT_ID,
    entraTenantId: ENTRA_TENANT_ID,
    msalScope: "User.Read",
  }).toString()}&msalScope=${encodeURIComponent("Mail.Read")}`;
  await page.goto(taskpaneUrl, {
    waitUntil: "networkidle",
  });
  await page.waitForSelector("[data-outlook-addin-taskpane='true']");
  msalBridgeProbe = await page.evaluate(async () => {
    const init = window.__LAWOS_INIT_MSAL_BRIDGE;
    return typeof init === "function" ? init() : { configured: false, initialized: false, reason: "probe_missing" };
  });
  await page.click("[data-testid='file-email-button']");
  await page.waitForFunction(() => document.querySelector("[data-testid='email-status']")?.getAttribute("data-outcome") === "created");
  await page.click("[data-testid='save-attachments-button']");
  await page.waitForFunction(() => document.querySelector("[data-testid='attachment-status']")?.getAttribute("data-outcome") === "attachments_saved");
  await page.click("[data-testid='create-task-button']");
  await page.waitForFunction(() => document.querySelector("[data-testid='followup-status']")?.getAttribute("data-outcome") === "created");
  await page.click("[data-testid='smart-alert-button']");
  await page.waitForFunction(() => document.querySelector("[data-testid='alert-status']")?.textContent?.includes("warning"));
  handlerProbe = await page.evaluate(async () => {
    const handler = window.__LAWOS_OUTLOOK_ASSOCIATED_HANDLERS?.onMessageSendHandler;
    const associated = window.__LAWOS_OUTLOOK_ASSOCIATED_ACTIONS ?? [];
    let completedPayload = null;
    if (typeof handler === "function") {
      await handler({
        completed(payload) {
          completedPayload = payload ?? {};
        },
      });
    }
    return {
      associated_actions: associated,
      handler_available: typeof handler === "function",
      completed_payload: completedPayload,
      probe: window.__LAWOS_OUTLOOK_EVENT_PROBE ?? null,
    };
  });
  await page.waitForSelector("[data-testid='document-list'] li");
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  await page.screenshot({ path: E04_SCREENSHOT_PATH, fullPage: true });

  const confidentialExternal = await signedJsonFetch(apiBase, "/api/outlook/smart-alerts/evaluate", {
    sessionToken: signedSession.session_token,
    body: {
      message: {
        to: [{ name: "외부", email: "external@example.com" }],
        body_preview: "첨부 확인 부탁드립니다.",
        attachments: [{ attachment_id: "conf-1", name: "비밀자료.pdf", confidentiality: "highly_confidential" }],
      },
    },
  });
  const missingAttachment = await signedJsonFetch(apiBase, "/api/outlook/smart-alerts/evaluate", {
    sessionToken: signedSession.session_token,
    body: {
      message: {
        to: [{ name: "AMIC", email: "lawyer@amic.law" }],
        body_preview: "첨부 확인",
        attachments: [],
      },
    },
  });
  const cleanMessage = await signedJsonFetch(apiBase, "/api/outlook/smart-alerts/evaluate", {
    sessionToken: signedSession.session_token,
    body: {
      message: {
        to: [{ name: "AMIC", email: "lawyer@amic.law" }],
        body_preview: "확인했습니다.",
        attachments: [],
      },
    },
  });
  const forgedBody = JSON.stringify({
    message: {
      to: [{ name: "외부", email: "external@example.com" }],
      body_preview: "첨부 확인",
      attachments: [],
    },
  });
  const forged = await fetch(`${apiBase}/api/outlook/smart-alerts/evaluate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-lawos-permission-context": JSON.stringify({
        principal: { user_id: ACTOR, tenant_id: TENANT, role_ids: ["outlook_addin_user"] },
        rules: [{ id: "outlook-addin-proof-forged-allow", effect: "allow", action: "*" }],
        object_acl: [],
      }),
    },
    body: forgedBody,
  });
  const forgedPayload = await forged.json();

  const snapshot = outlookAddinProofSnapshot({ runtime: { matterRuntime, dmsRuntime }, tenant_id: TENANT, matter_id: MATTER });
  checks = [
    passed("c09-taskpane-browser-load", await page.locator("[data-outlook-addin-taskpane='true']").count() === 1),
    passed("c09-auth-shell-provider-gated-visible", (await page.textContent("body")).includes("provider-gated")),
    passed("c09-msal-bridge-initialized", msalBridgeProbe?.configured === true && msalBridgeProbe?.initialized === true),
    passed("c09-msal-bridge-noninteractive", msalBridgeProbe?.provider_runtime_executed === false && msalBridgeProbe?.token_material_returned === false),
    passed("c09-signed-session-authorization-observed", smartAlertRequests.some((request) => request.has_authorization_header === true)),
    passed("c09-legacy-permission-context-not-sent", smartAlertRequests.every((request) => request.permission_context_header_sent === false)),
    passed("c10-email-thread-created", snapshot.email_threads.length === 1, { email_threads: snapshot.email_threads.length }),
    passed("c10-email-object-18-fields", snapshot.email_object_field_contract.length === 18, { field_count: snapshot.email_object_field_contract.length }),
    passed("c10-timeline-email-visible", snapshot.timeline.some((entry) => entry.type === "outlook.email.filed")),
    passed("c11-attachment-document-visible", snapshot.documents.some((document) => document.source_email_thread_id === snapshot.email_threads[0]?.email_thread_id)),
    passed("c11-folder-structure-00-99", snapshot.folder_structure[0] === "00_Email" && snapshot.folder_structure.at(-1) === "99_Archive"),
    passed("c12-manual-task-visible", snapshot.timeline.some((entry) => entry.type === "matter.activity.task")),
    passed("c12-smart-alert-warning-not-block", (await page.textContent("[data-testid='alert-status']")).includes("1 warning")),
    passed("c12-on-message-send-handler-associated", handlerProbe?.associated_actions?.includes("onMessageSendHandler") === true),
    passed("c12-on-message-send-handler-completes-allow-event", handlerProbe?.completed_payload?.allowEvent === true),
    passed("c12-on-message-send-handler-warning-only", handlerProbe?.probe?.last_send_handler_result?.send_blocked === false && handlerProbe?.probe?.last_send_handler_result?.provider_runtime_executed === false),
  ];
  const e04Payload = {
    schema_version: "law-firm-os.manual-qa.upl-e04-smart-alerts.local_receipt.v0.1",
    generated_at: new Date().toISOString(),
    tuw_id: "UPL-E-04",
    scope: "Local signed-session taskpane and API proof for warning-only Smart Alerts. External Outlook web/new desktop runtime is not claimed.",
    screenshot_path: E04_SCREENSHOT_PATH,
    external_receipt_boundary: {
      entra_admin_consent_receipt_present: false,
      outlook_web_smoke_receipt_present: false,
      outlook_new_desktop_smoke_receipt_present: false,
      provider_runtime_executed: false,
      production_write_claim: false,
      owner_external_receipt_required_for_c09: true,
    },
    browser_request_observation: smartAlertRequests,
    direct_api_evaluations: {
      confidential_external: sanitizedAlertResult(confidentialExternal.payload),
      missing_attachment: sanitizedAlertResult(missingAttachment.payload),
      clean_message: sanitizedAlertResult(cleanMessage.payload),
      forged_legacy_header: {
        status: forged.status,
        safe_error_codes: forgedPayload.safe_error_codes ?? [],
        request_hash: sha256Text(forgedBody),
        response_hash: sha256Text(JSON.stringify(forgedPayload)),
      },
    },
    request_response_hashes: {
      confidential_external_request: confidentialExternal.request_hash,
      confidential_external_response: confidentialExternal.response_hash,
      missing_attachment_request: missingAttachment.request_hash,
      missing_attachment_response: missingAttachment.response_hash,
      clean_message_request: cleanMessage.request_hash,
      clean_message_response: cleanMessage.response_hash,
    },
    secret_material_included: false,
    raw_body_included: false,
    attachment_bytes_included: false,
    production_ready_claim: false,
  };
  const e04Checks = [
    passed("e04-taskpane-warning-visible", (await page.textContent("[data-testid='alert-status']")).includes("1 warning")),
    passed("e04-signed-session-authorization-observed", smartAlertRequests.some((request) => request.has_authorization_header === true)),
    passed("e04-legacy-permission-context-not-sent", smartAlertRequests.every((request) => request.permission_context_header_sent === false)),
    passed("e04-confidential-external-warning-only", confidentialExternal.status === 200 && confidentialExternal.payload.item?.warnings?.[0]?.warning_id === "external-recipient-confidential-attachment" && confidentialExternal.payload.item?.send_blocked === false),
    passed("e04-missing-attachment-warning-only", missingAttachment.status === 200 && missingAttachment.payload.item?.warnings?.[0]?.warning_id === "missing-mentioned-attachment" && missingAttachment.payload.item?.send_blocked === false),
    passed("e04-clean-message-no-warning", cleanMessage.status === 200 && cleanMessage.payload.item?.warning_count === 0 && cleanMessage.payload.item?.send_blocked === false),
    passed("e04-forged-legacy-header-blocked", forged.status === 401 && forgedPayload.safe_error_codes?.[0] === "AUTH_SESSION_REQUIRED"),
    passed("e04-no-raw-body-or-attachment-bytes-in-receipt", !/첨부 확인 부탁드립니다\\.|비밀자료\\.pdf|secret\\.pdf|contract attachment bytes/.test(JSON.stringify(e04Payload))),
  ];
  const e04Artifact = { ...e04Payload, checks: e04Checks, pass: e04Checks.every((check) => check.passed) };
  writeFileSync(E04_JSON_PATH, `${JSON.stringify(e04Artifact, null, 2)}\n`);
  writeFileSync(
    E04_MD_PATH,
    `# UPL E04 Smart Alerts Local Proof\n\nGenerated at: ${e04Artifact.generated_at}\n\n- PASS: ${e04Artifact.pass}\n- Screenshot: \`${E04_SCREENSHOT_PATH}\`\n- External Outlook runtime: owner-required, not claimed\n- Legacy unsigned permission-context: blocked with 401\n\n## Checks\n\n${e04Checks.map((check) => `- ${check.passed ? "PASS" : "FAIL"} ${check.id}`).join("\n")}\n`,
  );
  const artifact = {
    schema_version: "law-firm-os.manual-qa.upl-c09-c12-outlook-addin.v1",
    generated_at: new Date().toISOString(),
    tuw_ids: ["UPL-C-09", "UPL-C-10", "UPL-C-11", "UPL-C-12", "UPL-E-04"],
    scope: "Outlook add-in task pane local browser proof with noninteractive MSAL bridge initialization, real API routes, DMS file storage, matter timeline readback, OnMessageSend handler completion, and warning-only Smart Alerts.",
    api_base: apiBase,
    taskpane_url: taskpaneUrl,
    e04_local_receipt: E04_JSON_PATH,
    screenshot_path: SCREENSHOT_PATH,
    external_receipt_boundary: {
      entra_admin_consent_receipt_present: false,
      outlook_web_smoke_receipt_present: false,
      outlook_new_desktop_smoke_receipt_present: false,
      provider_runtime_executed: false,
      production_write_claim: false,
      owner_external_receipt_required: true,
    },
    msal_bridge_probe: msalBridgeProbe,
    snapshot,
    handler_probe: handlerProbe,
    checks,
    pass: checks.every((check) => check.passed),
  };
  writeFileSync(JSON_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(
    MD_PATH,
    `# UPL C09-C12 Outlook Add-in Browser Proof\n\nGenerated at: ${artifact.generated_at}\n\n- PASS: ${artifact.pass}\n- Screenshot: \`${SCREENSHOT_PATH}\`\n- Task pane URL: \`${artifact.taskpane_url}\`\n- MSAL bridge initialized: ${artifact.msal_bridge_probe.initialized}\n- External M365/Entra receipt: owner-required, not claimed\n\n## Checks\n\n${checks.map((check) => `- ${check.passed ? "PASS" : "FAIL"} ${check.id}`).join("\n")}\n`,
  );
  console.log(JSON.stringify({ pass: artifact.pass, checks: checks.length, artifact: JSON_PATH }, null, 2));
  if (!artifact.pass) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolvePromise) => web.server.close(resolvePromise));
  await new Promise((resolvePromise) => api.server.close(resolvePromise));
}
