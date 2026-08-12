#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron } from "playwright";
import { isMatterAppRendererUrl } from "../apps/desktop/src/main/app-protocol.js";
import { assertPathOutsideWorktree } from "./lib/matter-desktop-provenance.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const EXPECTED_VERSION = JSON.parse(readFileSync(path.join(ROOT, "apps/desktop/package.json"), "utf8")).version;
const appBundle = path.join(ROOT, "apps/desktop/dist/mac/matter.app");
const executable = path.join(appBundle, "Contents/MacOS/matter");
const packagedAppRoot = path.join(appBundle, "Contents/Resources/app");
const packagedDesktopPackage = JSON.parse(readFileSync(path.join(packagedAppRoot, "package.json"), "utf8"));
const rendererIndex = path.join(packagedAppRoot, "src/renderer/web/index.html");
const evidenceDir = assertPathOutsideWorktree({
  repoRoot: ROOT,
  candidate: process.env.MATTER_PV001_EVIDENCE_DIR
  ? path.resolve(process.env.MATTER_PV001_EVIDENCE_DIR)
  : mkdtempSync(path.join(tmpdir(), `matter-pv001-${EXPECTED_VERSION}-evidence-`)),
  label: "PV-001 evidence directory",
});
const screenshotDir = path.join(evidenceDir, "screenshots");
const screenshotPath = path.join(screenshotDir, `macos-login-version-${EXPECTED_VERSION}.png`);
const receiptPath = path.join(evidenceDir, "packaged-version-smoke.json");
const userDataPath = mkdtempSync(path.join(tmpdir(), "matter-pv001-version-"));
const runtimeStoreDir = path.join(userDataPath, "runtime-stores");
const envPath = path.join(userDataPath, "empty.env");

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function sanitizedEnvironment() {
  return Object.fromEntries(Object.entries(process.env).filter(([name]) => (
    !name.startsWith("LAWOS_")
    && !name.startsWith("MATTER_DESKTOP_")
    && !name.startsWith("MATTER_VAULT_R4_")
    && !["MATTER_R4_OPERATOR_TOKEN", "MATTER_OPERATOR_TOKEN"].includes(name)
  )));
}

const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
const sourceStatus = execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" }).trim();
assert.equal(sourceStatus, "", "PV-001 package smoke must start from the clean product build SHA");
for (const requiredPath of [executable, rendererIndex]) {
  assert.equal(existsSync(requiredPath), true, `missing packaged app file: ${path.relative(ROOT, requiredPath)}`);
}

mkdirSync(screenshotDir, { recursive: true });
writeFileSync(envPath, "", "utf8");
const pageErrors = [];
const consoleErrors = [];
let app;
try {
  app = await electron.launch({
    executablePath: executable,
    args: ["--disable-gpu"],
    env: {
      ...sanitizedEnvironment(),
      MATTER_DESKTOP_USER_DATA_PATH: userDataPath,
      MATTER_DESKTOP_RUNTIME_STORE_DIR: runtimeStoreDir,
      MATTER_DESKTOP_ENV_FILE: envPath,
      MATTER_DESKTOP_OPERATOR_TOKEN: "",
      MATTER_VAULT_R4_OPERATOR_TOKEN: "",
      MATTER_R4_OPERATOR_TOKEN: "",
      MATTER_OPERATOR_TOKEN: "",
    },
    timeout: 45_000,
  });
  const page = await app.firstWindow({ timeout: 45_000 });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("[data-login-form='email-password']").waitFor({ state: "visible", timeout: 30_000 });
  await page.locator("[data-login-screen='forest-split'][data-login-intro='complete']").waitFor({ state: "visible", timeout: 30_000 });
  const appMetadata = await app.evaluate(({ app: electronApp }) => ({
    version: electronApp.getVersion(),
    name: electronApp.getName(),
    appPath: electronApp.getAppPath(),
  }));
  assert.equal(appMetadata.version, EXPECTED_VERSION);
  assert.equal(appMetadata.name, packagedDesktopPackage.productName ?? packagedDesktopPackage.name);
  assert.equal(path.resolve(appMetadata.appPath), path.resolve(packagedAppRoot));

  const initialUrl = new URL(page.url());
  assert.equal(isMatterAppRendererUrl(initialUrl.href), true);
  const ui = await page.evaluate(() => ({
    heading: document.querySelector("h1")?.textContent?.trim() ?? "",
    skin: document.documentElement.dataset.skin ?? "",
    loginScreen: document.querySelector("[data-login-screen]")?.getAttribute("data-login-screen") ?? "",
    loginIntroState: document.querySelector("[data-login-screen]")?.getAttribute("data-login-intro") ?? "",
    loginFormCount: document.querySelectorAll("[data-login-form='email-password']").length,
    forestPhotoPanelCount: document.querySelectorAll(".matter-login-photo-panel").length,
    loadedForestImageCount: [...document.querySelectorAll(".matter-login-photo-panel img")]
      .filter((image) => image.complete && image.naturalWidth > 0).length,
    brokenImageCount: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
  }));
  assert.equal(ui.heading, "Log in to matter");
  assert.equal(ui.skin, "forest");
  assert.equal(ui.loginScreen, "forest-split");
  assert.equal(ui.loginIntroState, "complete");
  assert.equal(ui.loginFormCount, 1);
  assert.equal(ui.forestPhotoPanelCount, 1);
  assert.equal(ui.loadedForestImageCount, 1);
  assert.equal(ui.brokenImageCount, 0);

  await page.screenshot({ path: screenshotPath, fullPage: false, animations: "disabled", caret: "hide" });
  const unexpectedConsoleErrors = consoleErrors.filter((message) => !message.includes("WebSocket") && !message.includes("24678"));
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(unexpectedConsoleErrors, []);

  const receipt = {
    schema_version: "law-firm-os.pv001-packaged-version-smoke.v1",
    generated_at: new Date().toISOString(),
    verdict: "PASS",
    product_build_sha: sourceSha,
    expected_version: EXPECTED_VERSION,
    actual_app_version: appMetadata.version,
    app_name: appMetadata.name,
    app_path: path.relative(ROOT, appMetadata.appPath),
    renderer_path: path.relative(ROOT, rendererIndex),
    ui,
    page_error_count: pageErrors.length,
    console_error_count: unexpectedConsoleErrors.length,
    screenshot: {
      path: path.relative(ROOT, screenshotPath),
      sha256: sha256File(screenshotPath),
    },
    boundaries: {
      internal_package: true,
      signed_or_notarized_release_claim: false,
      windows_native_claim: false,
      public_release_claim: false,
      production_go_live_claim: false,
    },
  };
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    verdict: receipt.verdict,
    product_build_sha: receipt.product_build_sha,
    actual_app_version: receipt.actual_app_version,
    screenshot: receipt.screenshot,
    receipt: path.relative(ROOT, receiptPath),
  }, null, 2));
} finally {
  if (app) await app.close().catch(() => {});
  rmSync(userDataPath, { recursive: true, force: true });
}
