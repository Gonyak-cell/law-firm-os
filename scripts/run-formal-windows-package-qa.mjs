#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { _electron as electron } from "playwright";
import { findRegisteredAccountByUserId } from "../apps/api/src/matter-vault-account-registry.js";
import { createHrxStepUpAuthority } from "../apps/api/src/hrx-step-up-token.js";
import { desktopRuntimeStorePaths } from "../apps/desktop/src/main/local-api.js";
import { directoryDigest, sha256File } from "./lib/matter-desktop-provenance.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const EXPECTED_SOURCE_SHA = process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA;
const VERSION = JSON.parse(readFileSync(path.join(ROOT, "apps/desktop/package.json"), "utf8")).version;
const INSTALLER_PATH = path.join(ROOT, `apps/desktop/dist/matter-${VERSION}-win-x64.exe`);
const BLOCKMAP_PATH = `${INSTALLER_PATH}.blockmap`;
const PACKAGE_MANIFEST_PATH = path.join(ROOT, `apps/desktop/dist/win/matter-${VERSION}-win-build-manifest.json`);
const PACKAGE_RENDERER_ROOT = path.join(ROOT, `apps/desktop/dist/win/matter-${VERSION}-win32-x64/resources/app/src/renderer/web`);
const UNPACKED_EXECUTABLE = path.join(ROOT, "apps/desktop/dist/win-unpacked/matter.exe");
const UNPACKED_RESOURCES = path.join(ROOT, "apps/desktop/dist/win-unpacked/resources");
const INSTALLER_MANIFEST_PATH = path.join(UNPACKED_RESOURCES, "matter-build-manifest.json");
const FORMAL_MARKER_PATH = path.join(UNPACKED_RESOURCES, "matter-formal-release.json");
const PRIVATE_ROSTER_SOURCE = path.join(ROOT, "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json");
const ARTIFACT_DIR = path.resolve(process.env.MATTER_FORMAL_WINDOWS_QA_ARTIFACT_DIR
  ?? path.join(ROOT, "artifacts", "manual-qa", "formal-windows-package"));
const RECEIPT_PATH = path.join(ARTIFACT_DIR, "formal-windows-package-qa.json");
const userDataPath = mkdtempSync(path.join(tmpdir(), "matter-formal-windows-userdata-"));
const runtimeStoreDir = path.join(userDataPath, "runtime-stores");
const envPath = path.join(userDataPath, "empty.env");
const installDir = mkdtempSync(path.join(process.env.RUNNER_TEMP ?? tmpdir(), "matter-formal-install-"));
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

function packagedUrl(rendererIndex, section, view = "people") {
  const url = new URL(pathToFileURL(rendererIndex));
  url.searchParams.set("desktop", "1");
  url.searchParams.set("locale", "ko");
  url.searchParams.set("view", view);
  url.searchParams.set("ctx", "allow");
  url.hash = section;
  return url.href;
}

async function waitUntil(predicate, message, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(message);
}

function installPackage() {
  execFileSync(INSTALLER_PATH, ["/S", `/D=${installDir}`], {
    stdio: "inherit",
    windowsHide: true,
  });
  const executablePath = path.join(installDir, "matter.exe");
  assert.equal(existsSync(executablePath), true, `installed executable missing: ${executablePath}`);
  const uninstallerName = readdirSync(installDir).find((name) => /^uninstall.*\.exe$/i.test(name));
  assert.ok(uninstallerName, "NSIS uninstaller is required");
  return {
    executablePath,
    uninstallerPath: path.join(installDir, uninstallerName),
    resourcesPath: path.join(installDir, "resources"),
  };
}

function authenticode(filePath) {
  const command = [
    "$signature = Get-AuthenticodeSignature -LiteralPath $args[0]",
    "[pscustomobject]@{",
    "  status = $signature.Status.ToString()",
    "  status_message = $signature.StatusMessage",
    "  signer_subject = if ($signature.SignerCertificate) { $signature.SignerCertificate.Subject } else { $null }",
    "  thumbprint = if ($signature.SignerCertificate) { $signature.SignerCertificate.Thumbprint } else { $null }",
    "} | ConvertTo-Json -Compress",
  ].join("\n");
  return JSON.parse(execFileSync("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    command,
    filePath,
  ], { encoding: "utf8", windowsHide: true }).trim());
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
  throw new Error("Formal Windows product window did not become ready");
}

async function launchFormalApp({ executablePath, rendererIndex, baseUrl }) {
  const app = await electron.launch({
    executablePath,
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
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const initialUrl = new URL(page.url());
  assert.equal(path.resolve(initialUrl.pathname.slice(1)), path.resolve(rendererIndex));
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

async function navigate(page, rendererIndex, section) {
  await page.evaluate((url) => window.location.assign(url), packagedUrl(rendererIndex, section));
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
  await page.evaluate((token) => window.sessionStorage.setItem("lawos_hrx_step_up_token", token), response.token);
}

async function screenshot(page, name, selector) {
  const target = page.locator(selector);
  await target.waitFor({ state: "visible", timeout: 20_000 });
  const filePath = path.join(ARTIFACT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false, animations: "disabled", caret: "hide" });
  return { name, path: path.relative(ROOT, filePath), sha256: sha256File(filePath) };
}

assert.equal(process.platform, "win32", "formal Windows package QA must run on Windows");
assert.match(EXPECTED_SOURCE_SHA ?? "", /^[0-9a-f]{40}$/, "MATTER_DESKTOP_EXPECTED_SOURCE_SHA is required");
const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
assert.equal(head, EXPECTED_SOURCE_SHA);
execFileSync("git", ["diff", "--quiet", "HEAD", "--", "apps/api", "apps/web", "packages", "apps/desktop/src"], { cwd: ROOT });
for (const requiredPath of [
  INSTALLER_PATH,
  BLOCKMAP_PATH,
  PACKAGE_MANIFEST_PATH,
  PACKAGE_RENDERER_ROOT,
  INSTALLER_MANIFEST_PATH,
  FORMAL_MARKER_PATH,
  UNPACKED_EXECUTABLE,
  PRIVATE_ROSTER_SOURCE,
]) assert.equal(existsSync(requiredPath), true, `missing QA prerequisite: ${path.relative(ROOT, requiredPath)}`);
assert.ok(account?.email && account?.local_dev?.synthetic_token);

const packageManifest = readJson(PACKAGE_MANIFEST_PATH);
const installerManifest = readJson(INSTALLER_MANIFEST_PATH);
for (const manifest of [packageManifest, installerManifest]) {
  assert.equal(manifest.source_sha, EXPECTED_SOURCE_SHA);
  assert.equal(manifest.source_dirty, false);
  assert.equal(manifest.channel, "formal");
  assert.equal(manifest.app_id, "com.amic.matter.desktop");
}
const packageRenderer = directoryDigest(PACKAGE_RENDERER_ROOT);
const unpackedRenderer = directoryDigest(path.join(UNPACKED_RESOURCES, "app", "src", "renderer", "web"));
assert.deepEqual(packageRenderer, unpackedRenderer);
assert.equal(packageRenderer.sha256, packageManifest.renderer.sha256);
assert.equal(unpackedRenderer.sha256, installerManifest.renderer.sha256);

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
const externalApiBaseUrl = `http://0.0.0.0:${api.port}`;
const health = await fetch(`${externalApiBaseUrl}/api/health`).then(async (response) => ({
  status: response.status,
  body: await response.json(),
}));
assert.equal(health.status, 200);

let app;
let page;
let installed;
let uninstallCompleted = false;
const pageErrors = [];
const consoleErrors = [];
const screenshots = [];
let initialSession;
let restoredSession;
let runtime;
try {
  installed = installPackage();
  const installedManifestPath = path.join(installed.resourcesPath, "matter-build-manifest.json");
  const installedMarkerPath = path.join(installed.resourcesPath, "matter-formal-release.json");
  const rendererIndex = path.join(installed.resourcesPath, "app", "src", "renderer", "web", "index.html");
  assert.equal(existsSync(installedManifestPath), true);
  assert.equal(existsSync(installedMarkerPath), true);
  assert.deepEqual(readJson(installedManifestPath), installerManifest);
  assert.equal(directoryDigest(path.dirname(rendererIndex)).sha256, installerManifest.renderer.sha256);

  ({ app, page } = await launchFormalApp({ executablePath: installed.executablePath, rendererIndex, baseUrl: externalApiBaseUrl }));
  page.on("pageerror", (error) => pageErrors.push(String(error).slice(0, 500)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 500));
  });
  await page.locator("[data-login-screen='forest-split'][data-login-intro='complete']").waitFor({ state: "visible", timeout: 30_000 });
  screenshots.push(await screenshot(page, "01-windows-formal-login", "[data-login-screen='forest-split']"));
  initialSession = await login(page);
  runtime = await page.evaluate(() => window.matterSession?.runtime?.());
  assert.equal(runtime?.baseUrl, externalApiBaseUrl);
  assert.equal(runtime?.mode, "production-auth-http");
  assert.equal(runtime?.operatorRuntimeConfigured, false);

  await navigate(page, rendererIndex, "people-leave-usage");
  const leave = page.locator("#people-leave-usage");
  await leave.waitFor({ state: "visible", timeout: 20_000 });
  assert.match(await leave.innerText(), /휴가 사용 내역/);
  screenshots.push(await screenshot(page, "02-windows-formal-leave", "#people-leave-usage"));

  await activateStepUp(page);
  await navigate(page, rendererIndex, "people-payroll");
  const payroll = page.locator("#people-payroll");
  await payroll.waitFor({ state: "visible", timeout: 20_000 });
  await payroll.locator(".payroll-summary-strip").waitFor({ state: "visible", timeout: 20_000 });
  assert.equal(await payroll.locator(".live-data-error").count(), 0);
  assert.match(await payroll.innerText(), /급여정산[\s\S]*정산기간/);
  screenshots.push(await screenshot(page, "03-windows-formal-payroll", "#people-payroll"));

  await app.close();
  app = null;
  ({ app, page } = await launchFormalApp({ executablePath: installed.executablePath, rendererIndex, baseUrl: externalApiBaseUrl }));
  page.on("pageerror", (error) => pageErrors.push(String(error).slice(0, 500)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 500));
  });
  restoredSession = await page.evaluate(() => window.matterSession?.status?.());
  assert.equal(restoredSession?.state, "signed_in");
  assert.equal(restoredSession?.user_id, account.user_id);
  assert.equal(restoredSession?.display_name, "서지원");
  await page.locator("[data-product-axis-nav]").waitFor({ state: "visible", timeout: 20_000 });
  await activateStepUp(page);
  await navigate(page, rendererIndex, "people-payroll");
  await page.locator("#people-payroll .payroll-summary-strip").waitFor({ state: "visible", timeout: 20_000 });
  screenshots.push(await screenshot(page, "04-windows-formal-restart-payroll", "#people-payroll"));
  await app.close();
  app = null;

  execFileSync(installed.uninstallerPath, ["/S"], { stdio: "inherit", windowsHide: true });
  await waitUntil(
    () => !existsSync(installed.executablePath),
    `Windows uninstall did not remove the executable: ${installed.executablePath}`,
  );
  uninstallCompleted = true;

  const unexpectedConsoleErrors = consoleErrors.filter((message) => !message.includes("WebSocket") && !message.includes("24678"));
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(unexpectedConsoleErrors, []);
  const installerAuthenticode = authenticode(INSTALLER_PATH);
  const executableAuthenticode = authenticode(UNPACKED_EXECUTABLE);
  const authenticodeValid = installerAuthenticode.status === "Valid" && executableAuthenticode.status === "Valid";
  const receipt = {
    schema_version: "law-firm-os.formal-windows-package-qa.v1",
    generated_at: new Date().toISOString(),
    verdict: authenticodeValid ? "PASS" : "BLOCKED_AUTHENTICODE",
    native_verdict: "PASS",
    source: {
      revision: head,
      source_tree: installerManifest.source_tree,
      source_dirty: false,
      renderer: unpackedRenderer,
    },
    package: {
      channel: installerManifest.channel,
      app_id: installerManifest.app_id,
      installer: { path: path.relative(ROOT, INSTALLER_PATH), sha256: sha256File(INSTALLER_PATH) },
      blockmap: { path: path.relative(ROOT, BLOCKMAP_PATH), sha256: sha256File(BLOCKMAP_PATH) },
      unpacked_executable: {
        path: path.relative(ROOT, UNPACKED_EXECUTABLE),
        sha256: sha256File(UNPACKED_EXECUTABLE),
      },
      build_manifest_embedded: true,
      formal_marker_embedded: true,
      bundled_local_api_present: existsSync(path.join(UNPACKED_RESOURCES, "app", "runtime", "apps", "api", "src", "server.js")),
      formal_local_api_default_disabled: true,
    },
    runtime: {
      topology: "installed_formal_app_with_external_exact_source_api",
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
      nsis_install_completed: true,
      forest_login_rendered: true,
      signed_in: true,
      leave_rendered: true,
      payroll_rendered: true,
      restart_session_restored: restoredSession.state === "signed_in",
      nsis_uninstall_completed: uninstallCompleted,
    },
    parity: {
      package_renderer_sha256: packageRenderer.sha256,
      installer_renderer_sha256: unpackedRenderer.sha256,
      renderer_file_count: unpackedRenderer.file_count,
      byte_identical: packageRenderer.sha256 === unpackedRenderer.sha256,
    },
    authenticode: {
      installer: installerAuthenticode,
      unpacked_executable: executableAuthenticode,
      valid: authenticodeValid,
      blocker: authenticodeValid ? null : "No approved Authenticode provider or certificate is configured",
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
      authenticode_claim: authenticodeValid,
    },
  };
  writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    verdict: receipt.verdict,
    native_verdict: receipt.native_verdict,
    receipt: path.relative(ROOT, RECEIPT_PATH),
    scenarios: receipt.scenarios,
    renderer_sha256: receipt.parity.installer_renderer_sha256,
    authenticode: receipt.authenticode,
    screenshots: screenshots.length,
  }, null, 2)}\n`);
} finally {
  if (app) await app.close().catch(() => {});
  await new Promise((resolve) => api.server.close(resolve));
  rmSync(userDataPath, { recursive: true, force: true });
  if (uninstallCompleted) rmSync(installDir, { recursive: true, force: true });
}
