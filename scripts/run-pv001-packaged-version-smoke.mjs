#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const EXPECTED_VERSION = "0.1.17";
const appBundle = path.join(ROOT, "apps/desktop/dist/mac/matter.app");
const executable = path.join(appBundle, "Contents/MacOS/matter");
const packagedAppRoot = path.join(appBundle, "Contents/Resources/app");
const rendererIndex = path.join(packagedAppRoot, "src/renderer/web/index.html");
const evidenceDir = path.join(ROOT, "workbook/forest-v0.1.17-integration-evidence/PV-001");
const screenshotDir = path.join(evidenceDir, "screenshots");
const screenshotPath = path.join(screenshotDir, "macos-login-version-0.1.17.png");
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
  const appMetadata = await app.evaluate(({ app: electronApp }) => ({
    version: electronApp.getVersion(),
    name: electronApp.getName(),
    appPath: electronApp.getAppPath(),
  }));
  assert.equal(appMetadata.version, EXPECTED_VERSION);
  assert.equal(appMetadata.name, "matter");
  assert.equal(path.resolve(appMetadata.appPath), path.resolve(packagedAppRoot));

  const initialUrl = new URL(page.url());
  assert.equal(path.resolve(fileURLToPath(initialUrl)), path.resolve(rendererIndex));
  const ui = await page.evaluate(() => ({
    heading: document.querySelector("h1")?.textContent?.trim() ?? "",
    skin: document.documentElement.dataset.skin ?? "",
    loginFormCount: document.querySelectorAll("[data-login-form='email-password']").length,
    brokenImageCount: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
  }));
  assert.equal(ui.heading, "Log in to matter");
  assert.equal(ui.skin, "forest");
  assert.equal(ui.loginFormCount, 1);
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
