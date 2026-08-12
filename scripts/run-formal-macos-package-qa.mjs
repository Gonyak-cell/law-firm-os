#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron } from "playwright";
import { findRegisteredAccountByUserId } from "../apps/api/src/matter-vault-account-registry.js";
import { isMatterAppRendererUrl, matterAppRendererUrl } from "../apps/desktop/src/main/app-protocol.js";
import { createHrxStepUpAuthority } from "../apps/api/src/hrx-step-up-token.js";
import { desktopRuntimeStorePaths } from "../apps/desktop/src/main/local-api.js";
import {
  assertPathOutsideWorktree,
  directoryDigest,
  sha256File,
} from "./lib/matter-desktop-provenance.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const DESKTOP_VERSION = JSON.parse(readFileSync(path.join(ROOT, "apps/desktop/package.json"), "utf8")).version;
const EXPECTED_SOURCE_SHA = process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA;
const REQUIRE_WINDOWS_PARITY = process.env.MATTER_FORMAL_MAC_QA_REQUIRE_WINDOWS_PARITY === "1";
const APP_BUNDLE = path.join(ROOT, "apps/desktop/dist/mac/matter.app");
const EXECUTABLE = path.join(APP_BUNDLE, "Contents/MacOS/matter");
const RESOURCES = path.join(APP_BUNDLE, "Contents/Resources");
const PACKAGED_APP_ROOT = path.join(RESOURCES, "app");
const RENDERER_ROOT = path.join(PACKAGED_APP_ROOT, "src/renderer/web");
const RENDERER_INDEX = path.join(RENDERER_ROOT, "index.html");
const FORMAL_MARKER = path.join(RESOURCES, "matter-formal-release.json");
const BUNDLED_API_ENTRY = path.join(PACKAGED_APP_ROOT, "runtime/apps/api/src/server.js");
const MAC_MANIFEST_PATH = path.join(ROOT, `apps/desktop/dist/mac/matter-${DESKTOP_VERSION}-macos-build-manifest.json`);
const PACKAGED_MANIFEST_PATH = path.join(RESOURCES, "matter-build-manifest.json");
const WINDOWS_MANIFEST_PATH = path.join(ROOT, `apps/desktop/dist/win/matter-${DESKTOP_VERSION}-win-build-manifest.json`);
const WINDOWS_RENDERER_ROOT = path.join(ROOT, `apps/desktop/dist/win/matter-${DESKTOP_VERSION}-win32-x64/resources/app/src/renderer/web`);
const DMG_PATH = path.join(ROOT, `apps/desktop/dist/mac/matter-${DESKTOP_VERSION}-macos.dmg`);
const ZIP_PATH = path.join(ROOT, `apps/desktop/dist/mac/matter-${DESKTOP_VERSION}-macos.zip`);
const PRIVATE_ROSTER_SOURCE = path.join(ROOT, "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json");
const ARTIFACT_DIR = assertPathOutsideWorktree({
  repoRoot: ROOT,
  candidate: process.env.MATTER_FORMAL_MAC_QA_ARTIFACT_DIR
  ? path.resolve(process.env.MATTER_FORMAL_MAC_QA_ARTIFACT_DIR)
  : mkdtempSync(path.join(tmpdir(), `matter-formal-macos-${DESKTOP_VERSION}-qa-`)),
  label: "formal macOS QA artifact directory",
});
const RECEIPT_PATH = path.join(ARTIFACT_DIR, "formal-macos-package-qa.json");
const userDataPath = mkdtempSync(path.join(tmpdir(), "matter-formal-macos-qa-"));
const runtimeStoreDir = path.join(userDataPath, "runtime-stores");
const envPath = path.join(userDataPath, "empty.env");
const account = findRegisteredAccountByUserId("user_amic_jwsuh");
const stepUpAuthority = createHrxStepUpAuthority();

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function sanitizedEnvironment() {
  return Object.fromEntries(Object.entries(process.env).filter(([name]) => (
    !name.startsWith("LAWOS_")
    && !name.startsWith("MATTER_DESKTOP_")
    && !name.startsWith("MATTER_VAULT_R4_")
    && !["MATTER_R4_OPERATOR_TOKEN", "MATTER_OPERATOR_TOKEN"].includes(name)
  )));
}

function packagedUrl(section, view = "people") {
  const url = new URL(matterAppRendererUrl());
  url.searchParams.set("locale", "ko");
  url.searchParams.set("view", view);
  url.searchParams.set("ctx", "allow");
  url.hash = section;
  return url.href;
}

async function findProductPage(app) {
  await app.firstWindow({ timeout: 45_000 });
  for (let attempt = 0; attempt < 90; attempt += 1) {
    for (const page of app.windows()) {
      const ready = await page.locator("[data-login-form='email-password'], [data-product-axis-nav]").count().catch(() => 0);
      if (ready) return page;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Formal macOS product window did not become ready");
}

async function launchFormalApp(baseUrl) {
  const app = await electron.launch({
    executablePath: EXECUTABLE,
    args: ["--disable-gpu"],
    env: {
      ...sanitizedEnvironment(),
      MATTER_DESKTOP_USER_DATA_PATH: userDataPath,
      MATTER_DESKTOP_ENV_FILE: envPath,
      MATTER_DESKTOP_LOCAL_API_DISABLED: "1",
      MATTER_DESKTOP_RUNTIME_BASE_URL: baseUrl,
      MATTER_DESKTOP_OPERATOR_TOKEN: "",
      MATTER_VAULT_R4_OPERATOR_TOKEN: "",
      MATTER_R4_OPERATOR_TOKEN: "",
      MATTER_OPERATOR_TOKEN: "",
    },
    timeout: 45_000,
  });
  const page = await findProductPage(app);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const initialUrl = new URL(page.url());
  assert.equal(isMatterAppRendererUrl(initialUrl.href), true);
  return { app, page };
}

async function login(page) {
  await page.locator("[data-login-email]").fill(account.email);
  await page.locator("[data-login-password]").fill(account.local_dev.synthetic_token);
  await page.locator("[data-login-form='email-password'] button[type='submit']").click();
  await page.waitForFunction(() => new URL(window.location.href).searchParams.get("view") === "home", null, { timeout: 20_000 });
  await page.locator("[data-product-axis-nav]").waitFor({ state: "visible", timeout: 20_000 });
  await page.locator(".post-login-splash").waitFor({ state: "detached", timeout: 10_000 });
  const session = await page.evaluate(() => window.matterSession?.status?.());
  assert.equal(session?.state, "signed_in");
  assert.equal(session?.user_id, account.user_id);
  assert.equal(session?.display_name, "서지원");
  return session;
}

async function navigate(page, section) {
  await page.evaluate((url) => window.location.assign(url), packagedUrl(section));
  await page.waitForLoadState("domcontentloaded");
}

async function activateStepUp(page) {
  const purpose = "payroll_export_review";
  const totp = stepUpAuthority.generateTotp({
    tenant_id: "tenant_amic_matter_vault",
    actor_id: account.user_id,
    purpose,
  });
  const response = await page.evaluate(async ({ purposeValue, totpCode }) => {
    const result = await window.matterSession.api({
      path: "/api/auth/step-up",
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ purpose: purposeValue, totp_code: totpCode }),
    });
    return { status: Number(result?.http_status ?? result?.status ?? 0), token: result?.body?.step_up_token ?? "" };
  }, { purposeValue: purpose, totpCode: totp });
  assert.equal(response.status, 200);
  assert.match(response.token, /^lawos_hrx_step_up_v1\./);
  await page.evaluate(({ purposeValue, token }) => {
    window.sessionStorage.setItem(`lawos_hrx_step_up_token:${purposeValue}`, token);
    window.sessionStorage.setItem("lawos_hrx_step_up_token", token);
  }, { purposeValue: purpose, token: response.token });
}

async function screenshot(page, name, selector) {
  const target = page.locator(selector);
  await target.waitFor({ state: "visible", timeout: 20_000 });
  const filePath = path.join(ARTIFACT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false, animations: "disabled", caret: "hide" });
  return { name, path: path.relative(ROOT, filePath), sha256: sha256File(filePath) };
}

function verifyDistribution() {
  execFileSync("/usr/bin/codesign", ["--verify", "--deep", "--strict", "--verbose=2", APP_BUNDLE]);
  execFileSync("/usr/sbin/spctl", ["--assess", "--type", "execute", "--verbose=4", APP_BUNDLE]);
  execFileSync("/usr/bin/xcrun", ["stapler", "validate", APP_BUNDLE]);
  execFileSync("/usr/bin/codesign", ["--verify", "--verbose=2", DMG_PATH]);
  execFileSync("/usr/bin/xcrun", ["stapler", "validate", DMG_PATH]);
  execFileSync("/usr/sbin/spctl", ["--assess", "--type", "install", "--verbose=4", DMG_PATH]);
  execFileSync("/usr/bin/hdiutil", ["verify", DMG_PATH]);
  return {
    app_codesign: "pass",
    app_gatekeeper: "pass",
    app_stapler: "pass",
    dmg_codesign: "pass",
    dmg_gatekeeper: "pass",
    dmg_stapler: "pass",
    dmg_image: "pass",
  };
}

assert.match(EXPECTED_SOURCE_SHA ?? "", /^[0-9a-f]{40}$/, "MATTER_DESKTOP_EXPECTED_SOURCE_SHA is required");
const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
assert.equal(head, EXPECTED_SOURCE_SHA);
execFileSync("git", ["diff", "--quiet", "HEAD", "--", "apps/api", "apps/web", "packages", "apps/desktop/src"], { cwd: ROOT });
const requiredPaths = [
  EXECUTABLE,
  RENDERER_INDEX,
  FORMAL_MARKER,
  MAC_MANIFEST_PATH,
  PACKAGED_MANIFEST_PATH,
  DMG_PATH,
  ZIP_PATH,
  PRIVATE_ROSTER_SOURCE,
];
if (REQUIRE_WINDOWS_PARITY) requiredPaths.push(WINDOWS_MANIFEST_PATH, WINDOWS_RENDERER_ROOT);
for (const requiredPath of requiredPaths) {
  assert.equal(existsSync(requiredPath), true, `missing QA prerequisite: ${path.relative(ROOT, requiredPath)}`);
}
assert.equal(existsSync(BUNDLED_API_ENTRY), false, "formal package must not bundle the local API runtime");
assert.ok(account?.email && account?.local_dev?.synthetic_token);

const macManifest = readJson(MAC_MANIFEST_PATH);
const packagedManifest = readJson(PACKAGED_MANIFEST_PATH);
const windowsManifest = REQUIRE_WINDOWS_PARITY ? readJson(WINDOWS_MANIFEST_PATH) : null;
for (const manifest of [macManifest, packagedManifest, ...(windowsManifest ? [windowsManifest] : [])]) {
  assert.equal(manifest.source_sha, EXPECTED_SOURCE_SHA);
  assert.equal(manifest.source_dirty, false);
  assert.equal(manifest.channel, "formal");
  assert.equal(manifest.app_id, "com.amic.matter.desktop");
}
assert.equal(JSON.stringify(macManifest), JSON.stringify(packagedManifest));
const macRenderer = directoryDigest(RENDERER_ROOT);
const windowsRenderer = REQUIRE_WINDOWS_PARITY ? directoryDigest(WINDOWS_RENDERER_ROOT) : null;
if (windowsRenderer) assert.deepEqual(macRenderer, windowsRenderer);
assert.equal(macRenderer.sha256, macManifest.renderer.sha256);
if (windowsRenderer) assert.equal(windowsRenderer.sha256, windowsManifest.renderer.sha256);

mkdirSync(ARTIFACT_DIR, { recursive: true });
writeFileSync(envPath, "", "utf8");
process.env.LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH = PRIVATE_ROSTER_SOURCE;
const { startApiServer } = await import("../apps/api/src/server.js");
const storePaths = desktopRuntimeStorePaths({
  env: { MATTER_DESKTOP_RUNTIME_STORE_DIR: runtimeStoreDir },
  userDataPath,
});
const api = await startApiServer({
  port: 0,
  runtimeProfile: "local-dev",
  stepUpAuthority,
  ...storePaths,
});
const externalApiBaseUrl = `http://127.0.0.1:${api.port}`;
const health = await fetch(`${externalApiBaseUrl}/api/health`).then(async (response) => ({
  status: response.status,
  body: await response.json(),
}));
assert.equal(health.status, 200);

let app;
let page;
const pageErrors = [];
const consoleErrors = [];
const screenshots = [];
let initialSession;
let restoredSession;
let runtime;
try {
  ({ app, page } = await launchFormalApp(externalApiBaseUrl));
  page.on("pageerror", (error) => pageErrors.push(String(error).slice(0, 500)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 500));
  });
  await page.locator("[data-login-screen='forest-split'][data-login-intro='complete']").waitFor({ state: "visible", timeout: 30_000 });
  screenshots.push(await screenshot(page, "01-formal-login", "[data-login-screen='forest-split']"));
  initialSession = await login(page);
  runtime = await page.evaluate(() => window.matterSession?.runtime?.());
  assert.equal(runtime?.baseUrl, externalApiBaseUrl);
  assert.equal(runtime?.mode, "production-auth-http");
  assert.equal(runtime?.operatorRuntimeConfigured, false);

  await page.locator("[data-profile-trigger='true']").click();
  const profile = page.locator("[data-user-profile-surface='my-profile']");
  await profile.waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForFunction(() => document.querySelector("[data-user-profile-surface='my-profile']")?.getAttribute("data-profile-api-state") !== "loading", null, { timeout: 20_000 });
  assert.equal(await profile.getAttribute("data-profile-api-state"), "populated");
  assert.equal(await profile.getAttribute("data-profile-member"), "emp_amic_jwsuh");
  const profileText = await profile.innerText();
  for (const expected of ["Jiwon Suh", "대표변호사", "Legal", "jwsuh@amic.kr", "대한민국 변호사", "M&A"]) assert.match(profileText, new RegExp(expected));
  assert.doesNotMatch(profileText, /세션 사용자/);
  screenshots.push(await screenshot(page, "02-formal-profile-seo-jiwon", "[data-user-profile-surface='my-profile']"));

  await navigate(page, "people-leave-usage");
  const leave = page.locator("#people-leave-usage");
  await leave.waitFor({ state: "visible", timeout: 20_000 });
  assert.match(await leave.innerText(), /휴가 사용 내역/);
  screenshots.push(await screenshot(page, "03-formal-leave", "#people-leave-usage"));

  await activateStepUp(page);
  await navigate(page, "people-payroll");
  const payroll = page.locator("#people-payroll");
  await payroll.waitFor({ state: "visible", timeout: 20_000 });
  await payroll.locator(".payroll-summary-strip").waitFor({ state: "visible", timeout: 20_000 });
  assert.equal(await payroll.locator(".live-data-error").count(), 0);
  assert.match(await payroll.innerText(), /급여정산[\s\S]*정산기간/);
  screenshots.push(await screenshot(page, "04-formal-payroll", "#people-payroll"));

  await app.close();
  app = null;
  ({ app, page } = await launchFormalApp(externalApiBaseUrl));
  const restartedPage = page;
  restoredSession = await restartedPage.evaluate(() => window.matterSession?.status?.());
  assert.equal(restoredSession?.state, "signed_in");
  assert.equal(restoredSession?.user_id, account.user_id);
  assert.equal(restoredSession?.display_name, "서지원");
  await restartedPage.locator("[data-product-axis-nav]").waitFor({ state: "visible", timeout: 20_000 });
  await activateStepUp(restartedPage);
  await navigate(restartedPage, "people-payroll");
  await restartedPage.locator("#people-payroll .payroll-summary-strip").waitFor({ state: "visible", timeout: 20_000 });
  screenshots.push(await screenshot(restartedPage, "05-formal-restart-payroll", "#people-payroll"));

  const unexpectedConsoleErrors = consoleErrors.filter((message) => !message.includes("WebSocket") && !message.includes("24678"));
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(unexpectedConsoleErrors, []);
  const distribution = verifyDistribution();
  const receipt = {
    schema_version: "law-firm-os.formal-macos-package-qa.v1",
    generated_at: new Date().toISOString(),
    verdict: "PASS",
    source: {
      revision: head,
      source_tree: macManifest.source_tree,
      source_dirty: false,
      renderer: macRenderer,
    },
    package: {
      channel: macManifest.channel,
      app_id: macManifest.app_id,
      bundle: path.relative(ROOT, APP_BUNDLE),
      zip: { path: path.relative(ROOT, ZIP_PATH), sha256: sha256File(ZIP_PATH) },
      dmg: { path: path.relative(ROOT, DMG_PATH), sha256: sha256File(DMG_PATH) },
      bundled_local_api_present: false,
      formal_local_api_default_disabled: true,
      distribution,
    },
    runtime: {
      topology: "signed_formal_app_with_external_exact_source_api",
      base_url_kind: "isolated_loopback_nonpackaged",
      profile: "local-dev",
      operator_token_used: false,
      synthetic_fixture_only: true,
      health_status: health.status,
    },
    identity: {
      email: account.email,
      user_id: initialSession.user_id,
      display_name: initialSession.display_name,
      employee_id: "emp_amic_jwsuh",
      generic_session_fallback_absent: true,
    },
    scenarios: {
      forest_login_rendered: true,
      signed_in: true,
      seo_jiwon_profile_populated: true,
      leave_rendered: true,
      payroll_rendered: true,
      restart_session_restored: restoredSession.state === "signed_in",
    },
    parity: {
      macos_renderer_sha256: macRenderer.sha256,
      windows_renderer_sha256: windowsRenderer?.sha256 ?? null,
      renderer_file_count: macRenderer.file_count,
      windows_parity_status: windowsRenderer ? "pass" : "not_run",
      byte_identical: windowsRenderer ? macRenderer.sha256 === windowsRenderer.sha256 : null,
    },
    screenshots,
    diagnostics: {
      page_error_count: pageErrors.length,
      console_error_count: unexpectedConsoleErrors.length,
    },
    boundaries: {
      real_employee_write: false,
      production_runtime_used: false,
      aws_write: false,
      public_release_claim: false,
      production_go_live_claim: false,
      windows_native_claim: false,
    },
  };
  writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    verdict: receipt.verdict,
    receipt: path.relative(ROOT, RECEIPT_PATH),
    scenarios: receipt.scenarios,
    renderer_sha256: receipt.parity.macos_renderer_sha256,
    screenshots: screenshots.length,
  }, null, 2)}\n`);
} finally {
  if (app) await app.close().catch(() => {});
  await new Promise((resolve) => api.server.close(resolve));
  rmSync(userDataPath, { recursive: true, force: true });
}
