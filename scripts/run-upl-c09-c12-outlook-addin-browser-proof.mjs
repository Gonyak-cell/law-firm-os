#!/usr/bin/env node
import { execFileSync } from "node:child_process";
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

const ROOT = process.cwd();
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/upl-c09-c12-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/upl-c09-c12-outlook-addin-browser-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/upl-c09-c12-outlook-addin-browser-proof.md`;
const SCREENSHOT_PATH = `${SCREENSHOT_DIR}/taskpane-proof.png`;
const TENANT = "tenant_upl_c09_c12_outlook";
const MATTER = "matter_upl_c09_c12_outlook";
const ACTOR = "outlook_addin_browser_proof_user";

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

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(SCREENSHOT_DIR, { recursive: true });

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
  const page = await browser.newPage({ viewport: { width: 390, height: 860 } });
  await page.goto(`${web.origin}/?apiBase=${encodeURIComponent(apiBase)}&tenantId=${encodeURIComponent(TENANT)}&matterId=${encodeURIComponent(MATTER)}`, {
    waitUntil: "networkidle",
  });
  await page.waitForSelector("[data-outlook-addin-taskpane='true']");
  await page.click("[data-testid='file-email-button']");
  await page.waitForFunction(() => document.querySelector("[data-testid='email-status']")?.textContent?.includes("created"));
  await page.click("[data-testid='save-attachments-button']");
  await page.waitForFunction(() => document.querySelector("[data-testid='attachment-status']")?.textContent?.includes("attachments_saved"));
  await page.click("[data-testid='create-task-button']");
  await page.waitForFunction(() => document.querySelector("[data-testid='followup-status']")?.textContent?.includes("created"));
  await page.click("[data-testid='smart-alert-button']");
  await page.waitForFunction(() => document.querySelector("[data-testid='alert-status']")?.textContent?.includes("warning"));
  await page.waitForSelector("[data-testid='document-list'] li");
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });

  const snapshot = outlookAddinProofSnapshot({ runtime: { matterRuntime, dmsRuntime }, tenant_id: TENANT, matter_id: MATTER });
  checks = [
    passed("c09-taskpane-browser-load", await page.locator("[data-outlook-addin-taskpane='true']").count() === 1),
    passed("c09-auth-shell-provider-gated-visible", (await page.textContent("body")).includes("provider-gated")),
    passed("c10-email-thread-created", snapshot.email_threads.length === 1, { email_threads: snapshot.email_threads.length }),
    passed("c10-email-object-18-fields", snapshot.email_object_field_contract.length === 18, { field_count: snapshot.email_object_field_contract.length }),
    passed("c10-timeline-email-visible", snapshot.timeline.some((entry) => entry.type === "outlook.email.filed")),
    passed("c11-attachment-document-visible", snapshot.documents.some((document) => document.source_email_thread_id === snapshot.email_threads[0]?.email_thread_id)),
    passed("c11-folder-structure-00-99", snapshot.folder_structure[0] === "00_Email" && snapshot.folder_structure.at(-1) === "99_Archive"),
    passed("c12-manual-task-visible", snapshot.timeline.some((entry) => entry.type === "matter.activity.task")),
    passed("c12-smart-alert-warning-not-block", (await page.textContent("[data-testid='alert-status']")).includes("1 warning")),
  ];
  const artifact = {
    schema_version: "law-firm-os.manual-qa.upl-c09-c12-outlook-addin.v1",
    generated_at: new Date().toISOString(),
    tuw_ids: ["UPL-C-09", "UPL-C-10", "UPL-C-11", "UPL-C-12", "UPL-E-04"],
    scope: "Outlook add-in task pane local browser proof with real API routes, DMS file storage, matter timeline readback, and warning-only Smart Alerts.",
    api_base: apiBase,
    taskpane_url: `${web.origin}/`,
    screenshot_path: SCREENSHOT_PATH,
    external_receipt_boundary: {
      entra_admin_consent_receipt_present: false,
      outlook_web_smoke_receipt_present: false,
      outlook_new_desktop_smoke_receipt_present: false,
      provider_runtime_executed: false,
      production_write_claim: false,
      owner_external_receipt_required: true,
    },
    snapshot,
    checks,
    pass: checks.every((check) => check.passed),
  };
  writeFileSync(JSON_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(
    MD_PATH,
    `# UPL C09-C12 Outlook Add-in Browser Proof\n\nGenerated at: ${artifact.generated_at}\n\n- PASS: ${artifact.pass}\n- Screenshot: \`${SCREENSHOT_PATH}\`\n- Task pane URL: \`${artifact.taskpane_url}\`\n- External M365/Entra receipt: owner-required, not claimed\n\n## Checks\n\n${checks.map((check) => `- ${check.passed ? "PASS" : "FAIL"} ${check.id}`).join("\n")}\n`,
  );
  console.log(JSON.stringify({ pass: artifact.pass, checks: checks.length, artifact: JSON_PATH }, null, 2));
  if (!artifact.pass) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolvePromise) => web.server.close(resolvePromise));
  await new Promise((resolvePromise) => api.server.close(resolvePromise));
}
