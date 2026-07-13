#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { createServer as createViteServer } from "vite";
import { startApiServer } from "../apps/api/src/server.js";
import {
  findRegisteredAccountByUserId,
  highestPrivilegeRegisteredAccount,
} from "../apps/api/src/matter-vault-account-registry.js";

const ROOT = process.cwd();
const EVIDENCE_DIR = resolve(ROOT, "output/playwright/leave-management-implementation-2026-07-13");
const RECEIPT_PATH = join(EVIDENCE_DIR, "lv-02-browser-qa-receipt.json");

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

async function closeServer(server) {
  if (!server) return;
  await new Promise((resolveClose) => server.close(resolveClose));
}

async function login(page, baseUrl, account) {
  await page.goto(`${baseUrl}/?locale=ko&view=auth&authStep=login&ctx=allow`, { waitUntil: "networkidle" });
  await page.locator("[data-login-email]").fill(account.email);
  await page.locator("[data-login-password]").fill(account.local_dev.synthetic_token);
  await page.locator("[data-login-form='email-password'] button[type='submit']").click();
  await page.waitForURL(/view=home/, { timeout: 15_000 });
}

async function pageGeometry(page) {
  return page.evaluate(() => ({
    client_width: document.documentElement.clientWidth,
    scroll_width: document.documentElement.scrollWidth,
    panel_visible: Boolean(document.querySelector("#people-leave-types")),
  }));
}

mkdirSync(EVIDENCE_DIR, { recursive: true });
const qaRoot = mkdtempSync(join(tmpdir(), "matter-leave-browser-qa-"));
let api = null;
let vite = null;
let browser = null;

try {
  api = await startApiServer({ port: 0, hrxStorePath: join(qaRoot, "hrx-store.json") });
  const apiBaseUrl = `http://${api.host}:${api.port}`;
  vite = await createViteServer({
    root: resolve(ROOT, "apps/web"),
    logLevel: "error",
    server: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false,
      proxy: { "/api": apiBaseUrl, "/master-data": apiBaseUrl },
    },
  });
  await vite.listen();
  const webAddress = vite.httpServer.address();
  if (!webAddress || typeof webAddress === "string") throw new Error("Vite did not expose a loopback port");
  const webBaseUrl = `http://127.0.0.1:${webAddress.port}`;

  const hrAccount = highestPrivilegeRegisteredAccount();
  const staffAccount = findRegisteredAccountByUserId("user_amic_yjlee");
  if (!hrAccount || !staffAccount) throw new Error("Synthetic HR and staff accounts are required");

  browser = await chromium.launch({ headless: true });
  const pageErrors = [];
  const consoleErrors = [];
  const hrContext = await browser.newContext({ viewport: { width: 1512, height: 864 } });
  const hrPage = await hrContext.newPage();
  hrPage.on("pageerror", (error) => pageErrors.push(String(error)));
  hrPage.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await login(hrPage, webBaseUrl, hrAccount);
  consoleErrors.length = 0;
  await hrPage.goto(`${webBaseUrl}/?locale=ko&view=people&ctx=allow#people-leave-types`, { waitUntil: "networkidle" });
  await hrPage.locator("#people-leave-types").waitFor({ state: "visible", timeout: 15_000 });
  const hrSidebarVisible = await hrPage.getByRole("button", { name: "휴가 그룹/유형" }).isVisible();

  const suffix = Date.now().toString(36);
  await hrPage.getByLabel("그룹 코드").fill(`PAID_${suffix}`);
  await hrPage.getByLabel("표시 이름").fill("유급 휴가");
  const groupResponse = hrPage.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/groups") && response.request().method() === "POST");
  await hrPage.getByRole("button", { name: "그룹 추가" }).click();
  if ((await groupResponse).status() !== 201) throw new Error("Leave group creation failed");
  await hrPage.getByText("유급 휴가", { exact: true }).waitFor();

  await hrPage.getByRole("tab", { name: "휴가 유형" }).click();
  await hrPage.getByLabel("휴가 그룹").selectOption({ label: "유급 휴가" });
  await hrPage.getByLabel("유형 코드").fill(`ANNUAL_${suffix}`);
  await hrPage.getByLabel("표시 이름").fill("연차");
  const typeResponse = hrPage.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/types") && response.request().method() === "POST");
  await hrPage.getByRole("button", { name: "유형 추가" }).click();
  if ((await typeResponse).status() !== 201) throw new Error("Leave type creation failed");
  await hrPage.getByText("연차", { exact: true }).waitFor();

  await hrPage.getByRole("tab", { name: "정책 버전" }).click();
  await hrPage.getByLabel("휴가 그룹").selectOption({ label: "유급 휴가" });
  await hrPage.getByLabel("정책 코드").fill(`annual-${suffix}`);
  await hrPage.getByLabel("시행일").fill("2026-01-01");
  await hrPage.getByLabel("이월 한도(분)").fill("480");
  const draftResponse = hrPage.waitForResponse((response) => response.url().endsWith("/api/hrx/leave/policies") && response.request().method() === "POST");
  await hrPage.getByRole("button", { name: "초안 만들기" }).click();
  if ((await draftResponse).status() !== 201) throw new Error("Leave policy draft creation failed");
  await hrPage.getByText("초안", { exact: true }).waitFor();
  const publishResponse = hrPage.waitForResponse((response) => /\/api\/hrx\/leave\/policies\/[^/]+\/publish$/.test(response.url()) && response.request().method() === "POST");
  await hrPage.getByRole("button", { name: "시행" }).click();
  if ((await publishResponse).status() !== 200) throw new Error("Leave policy publication failed");
  await hrPage.getByText("사용 중", { exact: true }).last().waitFor();

  const screenshots = [];
  const geometry = [];
  for (const viewport of [{ width: 1512, height: 864 }, { width: 720, height: 800 }]) {
    await hrPage.setViewportSize(viewport);
    await hrPage.waitForTimeout(100);
    const measured = await pageGeometry(hrPage);
    if (measured.scroll_width > measured.client_width || !measured.panel_visible) {
      throw new Error(`Leave settings geometry failed at ${viewport.width}px: ${JSON.stringify(measured)}`);
    }
    const filePath = join(EVIDENCE_DIR, `lv-02-leave-settings-${viewport.width}x${viewport.height}.png`);
    await hrPage.screenshot({ path: filePath, fullPage: true });
    screenshots.push({ path: filePath.replace(`${ROOT}/`, ""), sha256: sha256File(filePath), viewport });
    geometry.push({ viewport, ...measured });
  }
  await hrContext.close();

  const staffContext = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  const staffPage = await staffContext.newPage();
  staffPage.on("pageerror", (error) => pageErrors.push(String(error)));
  await login(staffPage, webBaseUrl, staffAccount);
  await staffPage.goto(`${webBaseUrl}/?locale=ko&view=people&ctx=allow#people-leave-types`, { waitUntil: "networkidle" });
  await staffPage.locator('[data-leave-policy-access="denied"]').waitFor({ state: "visible", timeout: 15_000 });
  const staffSidebarCount = await staffPage.getByRole("button", { name: "휴가 그룹/유형" }).count();
  const staffScreenshot = join(EVIDENCE_DIR, "lv-02-leave-settings-staff-denied-1280x820.png");
  await staffPage.screenshot({ path: staffScreenshot, fullPage: true });
  screenshots.push({
    path: staffScreenshot.replace(`${ROOT}/`, ""),
    sha256: sha256File(staffScreenshot),
    viewport: { width: 1280, height: 820 },
  });
  await staffContext.close();

  if (!hrSidebarVisible || staffSidebarCount !== 0 || pageErrors.length > 0 || consoleErrors.length > 0) {
    throw new Error(JSON.stringify({ hrSidebarVisible, staffSidebarCount, pageErrors, consoleErrors }, null, 2));
  }

  const receipt = {
    schema_version: "lawos.leave_management.browser_qa.v0.1",
    work_package: "LV-02",
    generated_at: new Date().toISOString(),
    runtime: { profile: "local-dev", endpoint_kind: "loopback_ephemeral", persistent_store_kind: "isolated_temporary" },
    roles: { hr_admin: hrAccount.user_id, staff: staffAccount.user_id },
    checks: {
      hr_sidebar_visible: hrSidebarVisible,
      staff_sidebar_hidden: staffSidebarCount === 0,
      staff_direct_route_denied: true,
      group_created: true,
      leave_type_created: true,
      policy_draft_created: true,
      policy_published: true,
      responsive_geometry_passed: geometry.every((item) => item.scroll_width <= item.client_width),
      page_error_count: pageErrors.length,
      console_error_count: consoleErrors.length,
    },
    geometry,
    screenshots,
    boundary: {
      production_store_used: false,
      real_employee_data_used: false,
      credential_material_recorded: false,
      public_release_claim: false,
      go_live_claim: false,
    },
  };
  writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ outcome: "passed", receipt: RECEIPT_PATH.replace(`${ROOT}/`, ""), checks: receipt.checks })}\n`);
} finally {
  if (browser) await browser.close();
  if (vite) await vite.close();
  await closeServer(api?.server);
  rmSync(qaRoot, { recursive: true, force: true });
}
