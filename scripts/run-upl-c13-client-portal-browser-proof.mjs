#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";
import { startApiServer } from "../apps/api/src/server.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = "artifacts/manual-qa";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/upl-c13-client-portal-browser-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/upl-c13-client-portal-browser-proof.md`;
const ACTIVE_SCREENSHOT_PATH = `${SCREENSHOT_DIR}/upl-c13-client-portal-external-session.png`;
const REUSED_SCREENSHOT_PATH = `${SCREENSHOT_DIR}/upl-c13-client-portal-reused-token.png`;
const TENANT = "tenant_cmp_g10_synthetic";
const ACTOR = "user_cmp_g10_portal";
const PERMISSION_CONTEXT_HEADER = "x-lawos-permission-context";
const SUFFIX = Date.now().toString(36);
const SECURE_LINK_ID = `secure_link_c13_browser_${SUFFIX}`;
const INVITE_ID = `portal_invite_c13_browser_${SUFFIX}`;
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_cmp_g10_write&audit_hint_ref=audit_hint_cmp_g10_browser`;

mkdirSync(join(ROOT, ARTIFACT_DIR), { recursive: true });
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

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
    principal: {
      user_id: ACTOR,
      tenant_id: TENANT,
      role_ids: ["portal_operator", "data_room_operator"],
    },
    rules: [{ id: "rule_portal_allow", effect: "allow", action: "*" }],
    object_acl: [],
  });
}

async function apiJson(apiBase, path, options = {}) {
  const headers = {
    "content-type": "application/json",
    [PERMISSION_CONTEXT_HEADER]: permissionContext(),
    ...(options.headers ?? {}),
  };
  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body };
}

async function seedPortalInvite(apiBase, webOrigin) {
  const secureLink = await apiJson(apiBase, "/api/portal/secure-links", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: TENANT,
      permission_ref: "perm_ref_cmp_g10_write",
      audit_hint_ref: "audit_hint_cmp_g10_browser",
      actor_id: ACTOR,
      idempotency_key: `browser-secure-link-${SUFFIX}`,
      secure_link: {
        secure_link_id: SECURE_LINK_ID,
        tenant_id: TENANT,
        matter_id: "matter_rp05_synthetic_opening",
        target_object_id: "document_cmp_g5_seed",
        expires_at: "2026-07-03T00:00:00.000Z",
        dms_acl_inherited: true,
        watermark_enabled: true,
        external_share_boundary_checked: true,
      },
    }),
  });
  const invite = await apiJson(apiBase, "/api/portal/invites", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: TENANT,
      permission_ref: "perm_ref_cmp_g10_write",
      audit_hint_ref: "audit_hint_cmp_g10_browser",
      actor_id: ACTOR,
      idempotency_key: `browser-invite-${SUFFIX}`,
      base_url: `${webOrigin}/`,
      invite: {
        invite_id: INVITE_ID,
        tenant_id: TENANT,
        external_user_id: "external_user_cmp_g10_seed",
        matter_id: "matter_rp05_synthetic_opening",
        rfi_request_id: "rfi_cmp_g10_seed",
        secure_link_id: SECURE_LINK_ID,
        expires_at: "2999-01-02T00:00:00.000Z",
      },
    }),
  });
  const token = new URL(invite.body.invite_delivery.one_time_url).searchParams.get("portal_invite");
  return { secureLink, invite, token };
}

async function proxyApiRequests(page, apiBase, observed) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const target = `${apiBase}${url.pathname}${url.search}`;
    observed.requests.push({ method: request.method(), url: target });
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
  const seeded = await seedPortalInvite(apiBase, web.origin);
  const observed = { requests: [], responses: [], consoleMessages: [], pageErrors: [] };
  const activePage = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  activePage.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) observed.consoleMessages.push({ type: message.type(), text: message.text() });
  });
  activePage.on("pageerror", (error) => observed.pageErrors.push(String(error)));
  await proxyApiRequests(activePage, apiBase, observed);

  const activeUrl = `${web.origin}/?locale=ko&view=portal&ctx=allow&portal_invite=${encodeURIComponent(seeded.token)}&portal_invite_now=2026-07-03T00%3A00%3A00.000Z&portal_access_now=2026-07-04T00%3A00%3A00.000Z`;
  await activePage.goto(activeUrl, { waitUntil: "networkidle", timeout: 30000 });
  await activePage.locator("[data-c13-portal-mounted='true'][data-c13-external-session='active']").waitFor({ state: "visible", timeout: 15000 });
  await activePage.locator("[data-c13-submit-rfi='true']").click();
  await activePage.locator("[data-c13-portal-mounted='true'][data-c13-rfi-response='metadata-only']").waitFor({ state: "visible", timeout: 15000 });
  await activePage.locator("[data-c13-access-link='true']").click();
  await activePage.locator("[data-c13-portal-mounted='true'][data-c13-secure-link-access='expired-denied']").waitFor({ state: "visible", timeout: 15000 });
  const activeText = await activePage.locator("body").innerText();
  const topNavPortalVisible = await activePage.locator("[data-product-axis='portal']").count() === 1;
  await activePage.screenshot({ path: join(ROOT, ACTIVE_SCREENSHOT_PATH), fullPage: true });

  const reusedPage = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  reusedPage.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) observed.consoleMessages.push({ type: message.type(), text: message.text() });
  });
  reusedPage.on("pageerror", (error) => observed.pageErrors.push(String(error)));
  await proxyApiRequests(reusedPage, apiBase, observed);
  await reusedPage.goto(activeUrl, { waitUntil: "networkidle", timeout: 30000 });
  await reusedPage.locator("[data-c13-portal-mounted='true'][data-c13-external-session='blocked']").waitFor({ state: "visible", timeout: 15000 });
  const reusedText = await reusedPage.locator("body").innerText();
  await reusedPage.screenshot({ path: join(ROOT, REUSED_SCREENSHOT_PATH), fullPage: true });

  const audit = await apiJson(apiBase, `/api/portal/audit?${BASE_QUERY}`);
  const actions = audit.body.items.map((event) => event.action);
  const checks = [
    passed("c13-portal-surface-mounted", activeText.includes("공유 포털") && topNavPortalVisible),
    passed("c13-magic-link-consumed-one-time", activeText.includes("초대 확인됨") && reusedText.includes("PORTAL_MAGIC_LINK_ALREADY_USED")),
    passed("c13-rfi-response-ui-metadata-only", activeText.includes("문서 본문 없이 파일명과 검사 상태만 기록되었습니다.")),
    passed("c13-expired-secure-link-denied", activeText.includes("만료 링크 차단됨")),
    passed("c13-token-not-rendered", !activeText.includes(seeded.token) && !reusedText.includes(seeded.token) && !activeText.includes("token_hash")),
    passed("c13-api-observed-external-consume", observed.requests.some((request) => request.method === "POST" && request.url.includes("/api/portal/invites/consume"))),
    passed("c13-api-observed-external-rfi", observed.requests.some((request) => request.method === "POST" && request.url.includes("/api/portal/external/rfi-responses"))),
    passed("c13-api-observed-expired-secure-link", observed.responses.some((response) => response.status === 410 && response.url.includes(`/api/portal/external/secure-links/${SECURE_LINK_ID}/access`))),
    passed("c13-audit-events-present", actions.includes("portal.magic_link_invite.create") && actions.includes("portal.magic_link_invite.consume") && actions.includes("portal.rfi_response.submit")),
    passed("c13-browser-no-page-errors", observed.pageErrors.length === 0),
  ];

  artifact = {
    schema_version: "law-firm-os.manual-qa.upl-c13-client-portal-browser-proof.v1",
    generated_at: new Date().toISOString(),
    tuw_ids: ["UPL-C-13"],
    scope: "Client Portal external browser proof: PortalSurface mount, one-time magic link, metadata-only RFI response UI, expired secure-link denial, audit evidence.",
    api_base: apiBase,
    web_origin: web.origin,
    token_material_rendered: false,
    document_bytes_rendered: false,
    production_ready_claim: false,
    go_live_claim: false,
    seed: {
      secure_link_id: SECURE_LINK_ID,
      invite_id: INVITE_ID,
      secure_link_status: seeded.secureLink.status,
      invite_status: seeded.invite.status,
      invite_url_returned_once: seeded.invite.body.invite_delivery.returned_once === true,
      token_material_persisted: seeded.invite.body.invite_delivery.token_material_persisted === true,
    },
    screenshots: {
      active_session: ACTIVE_SCREENSHOT_PATH,
      reused_token: REUSED_SCREENSHOT_PATH,
    },
    observed,
    audit: {
      status: audit.status,
      actions,
      token_material_included: audit.body.items.some((event) => event.token_material_included === true),
    },
    checks,
    pass: checks.every((check) => check.passed),
  };

  writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(
    join(ROOT, MD_PATH),
    `# UPL C13 Client Portal Browser Proof\n\nGenerated at: ${artifact.generated_at}\n\n- PASS: ${artifact.pass}\n- Active session screenshot: \`${ACTIVE_SCREENSHOT_PATH}\`\n- Reused token screenshot: \`${REUSED_SCREENSHOT_PATH}\`\n- Scope: PortalSurface mount, one-time invite consume, metadata-only RFI response, expired secure-link denial.\n- Production/go-live claim: false\n\n## Checks\n\n${checks.map((check) => `- ${check.passed ? "PASS" : "FAIL"} ${check.id}`).join("\n")}\n`,
  );
  console.log(JSON.stringify({ pass: artifact.pass, checks: checks.length, artifact: JSON_PATH }, null, 2));
  if (!artifact.pass) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolvePromise) => web.server.close(resolvePromise));
  await new Promise((resolvePromise) => api.server.close(resolvePromise));
}
