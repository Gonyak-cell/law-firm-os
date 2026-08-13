#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron } from "playwright";
import { findRegisteredAccountByUserId } from "../apps/api/src/matter-vault-account-registry.js";
import { matterAppRendererUrl } from "../apps/desktop/src/main/app-protocol.js";
import { createHrxStepUpAuthority } from "../apps/api/src/hrx-step-up-token.js";
import { desktopRuntimeStorePaths } from "../apps/desktop/src/main/local-api.js";
import { directoryDigest, sha256File } from "./lib/matter-desktop-provenance.mjs";
import {
  matterDesktopAuthenticodePowerShell,
  resolveMatterDesktopAuthenticodeConfiguration,
  runAfterMatterDesktopAuthenticodeVerification,
} from "./lib/matter-desktop-authenticode.mjs";
import { cleanupTemporaryDirectories } from "./lib/windows-formal-cleanup.mjs";
import { cleanupFailedWindowsNsisInstallation } from "./lib/windows-formal-native-cleanup.mjs";

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
const authenticodeConfiguration = resolveMatterDesktopAuthenticodeConfiguration({
  formalRelease: true,
});

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

async function waitUntil(predicate, message, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(message);
}

function waitUntilSync(predicate, message, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  const signal = new Int32Array(new SharedArrayBuffer(4));
  while (Date.now() < deadline) {
    if (predicate()) return;
    Atomics.wait(signal, 0, 0, 250);
  }
  throw Object.assign(new Error(message), { code: "EXECUTABLE_RESIDUE" });
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
  return JSON.parse(execFileSync("pwsh.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    matterDesktopAuthenticodePowerShell(),
  ], {
    encoding: "utf8",
    env: { ...process.env, MATTER_AUTHENTICODE_PATH: filePath },
    windowsHide: true,
  }).trim());
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

async function launchFormalApp({ executablePath, baseUrl }) {
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
  const expectedUrl = new URL(matterAppRendererUrl());
  assert.equal(initialUrl.protocol, expectedUrl.protocol);
  assert.equal(initialUrl.hostname, expectedUrl.hostname);
  assert.equal(initialUrl.pathname, expectedUrl.pathname);
  assert.equal(initialUrl.searchParams.get("desktop"), "1");
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
    window.sessionStorage.setItem("lawos_hrx_step_up_token", token);
    window.sessionStorage.setItem(`lawos_hrx_step_up_token:${purposeValue}`, token);
  }, { purposeValue: purpose, token: response.token });
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
const externalApiBaseUrl = `http://127.0.0.1:${api.port}`;
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
let qaError = null;
let installerAuthenticode;
let packagedExecutableAuthenticode;
let installedExecutableAuthenticode;
let restartExecutableAuthenticode;
let authenticodeResult;
let packagedExecutableSha256;
let installedExecutablePrelaunchParity;
let installedExecutableRestartPrelaunchParity;
let failureCleanup = null;
try {
  installerAuthenticode = authenticode(INSTALLER_PATH);
  packagedExecutableAuthenticode = authenticode(UNPACKED_EXECUTABLE);
  packagedExecutableSha256 = sha256File(UNPACKED_EXECUTABLE);
  ({ verification: authenticodeResult, value: installed } = await runAfterMatterDesktopAuthenticodeVerification({
    records: [installerAuthenticode, packagedExecutableAuthenticode],
    expectedCertificateSha1: authenticodeConfiguration?.certificate_sha1,
    action: async () => installPackage(),
  }));
  const installedManifestPath = path.join(installed.resourcesPath, "matter-build-manifest.json");
  const installedMarkerPath = path.join(installed.resourcesPath, "matter-formal-release.json");
  const rendererIndex = path.join(installed.resourcesPath, "app", "src", "renderer", "web", "index.html");
  assert.equal(existsSync(installedManifestPath), true);
  assert.equal(existsSync(installedMarkerPath), true);
  assert.deepEqual(readJson(installedManifestPath), installerManifest);
  assert.equal(directoryDigest(path.dirname(rendererIndex)).sha256, installerManifest.renderer.sha256);

  installedExecutableAuthenticode = authenticode(installed.executablePath);
  ({ executable_parity: installedExecutablePrelaunchParity, value: { app, page } } = await runAfterMatterDesktopAuthenticodeVerification({
    records: [installerAuthenticode, installedExecutableAuthenticode],
    expectedCertificateSha1: authenticodeConfiguration.certificate_sha1,
    expectedExecutableSha256: packagedExecutableSha256,
    actualExecutableSha256: sha256File(installed.executablePath),
    action: async () => launchFormalApp({ executablePath: installed.executablePath, baseUrl: externalApiBaseUrl }),
  }));
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

  await navigate(page, "people-leave-usage");
  const leave = page.locator("#people-leave-usage");
  await leave.waitFor({ state: "visible", timeout: 20_000 });
  assert.match(await leave.innerText(), /휴가 사용 내역/);
  screenshots.push(await screenshot(page, "02-windows-formal-leave", "#people-leave-usage"));

  await activateStepUp(page);
  await navigate(page, "people-payroll");
  const payroll = page.locator("#people-payroll");
  await payroll.waitFor({ state: "visible", timeout: 20_000 });
  await payroll.locator(".payroll-summary-strip").waitFor({ state: "visible", timeout: 20_000 });
  assert.equal(await payroll.locator(".live-data-error").count(), 0);
  assert.match(await payroll.innerText(), /급여정산[\s\S]*정산기간/);
  screenshots.push(await screenshot(page, "03-windows-formal-payroll", "#people-payroll"));

  await app.close();
  app = null;
  restartExecutableAuthenticode = authenticode(installed.executablePath);
  ({ executable_parity: installedExecutableRestartPrelaunchParity, value: { app, page } } = await runAfterMatterDesktopAuthenticodeVerification({
    records: [installerAuthenticode, restartExecutableAuthenticode],
    expectedCertificateSha1: authenticodeConfiguration.certificate_sha1,
    expectedExecutableSha256: packagedExecutableSha256,
    actualExecutableSha256: sha256File(installed.executablePath),
    action: async () => launchFormalApp({ executablePath: installed.executablePath, baseUrl: externalApiBaseUrl }),
  }));
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
  await navigate(page, "people-payroll");
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
  const authenticodeValid = authenticodeResult?.signature_count === 2;
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
      packaged_executable_preinstall: packagedExecutableAuthenticode,
      installed_executable_prelaunch: installedExecutableAuthenticode,
      installed_executable_restart_prelaunch: restartExecutableAuthenticode,
      executable_byte_parity_prelaunch: installedExecutablePrelaunchParity,
      executable_byte_parity_restart_prelaunch: installedExecutableRestartPrelaunchParity,
      valid: authenticodeValid,
      expected_signer_certificate_sha1:
        authenticodeConfiguration?.certificate_sha1 ?? null,
      signer: authenticodeResult?.signer ?? null,
      timestamps: authenticodeResult?.timestamps ?? [],
      signer_code_signing_eku_verified:
        authenticodeResult?.signer_code_signing_eku_verified === true,
      timestamp_eku_verified:
        authenticodeResult?.timestamp_eku_verified === true,
      blocker: authenticodeValid
        ? null
        : "No exact expected Authenticode certificate and RFC3161 timestamp validation is configured",
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
} catch (error) {
  qaError = error;
  throw error;
} finally {
  if (app) await app.close().catch(() => {});
  await new Promise((resolve) => api.server.close(resolve));
  if (!uninstallCompleted) {
    failureCleanup = cleanupFailedWindowsNsisInstallation({
      installDir,
      priorError: qaError,
      exists: existsSync,
      list: readdirSync,
      execute: (filePath, args) => execFileSync(filePath, args, { stdio: "ignore", windowsHide: true }),
      waitForRemoval: (filePath) => waitUntilSync(
        () => !existsSync(filePath),
        `Windows failure cleanup did not remove the executable: ${filePath}`,
      ),
      warn: (warning) => process.stderr.write(`${JSON.stringify(warning)}\n`),
    });
    try {
      mkdirSync(ARTIFACT_DIR, { recursive: true });
      writeFileSync(
        path.join(ARTIFACT_DIR, "formal-windows-failure-cleanup.json"),
        `${JSON.stringify({
          schema_version: "law-firm-os.formal-windows-failure-cleanup.v1",
          generated_at: new Date().toISOString(),
          primary_error_preserved: qaError !== null,
          result: failureCleanup,
        }, null, 2)}\n`,
        "utf8",
      );
    } catch (cleanupEvidenceError) {
      if (!qaError) throw cleanupEvidenceError;
      process.stderr.write(`${JSON.stringify({
        warning: "windows_nsis_cleanup_evidence_write_failed",
        error_code: cleanupEvidenceError?.code ?? "UNKNOWN",
      })}\n`);
    }
  }
  cleanupTemporaryDirectories([
    userDataPath,
    ...(uninstallCompleted || failureCleanup?.residue_present === false ? [installDir] : []),
  ], { priorError: qaError });
}
