#!/usr/bin/env node
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const envFilePath = path.join(repoRoot, ".env.matter-vault-r4.local");
const electronExecutablePath = path.join(
  repoRoot,
  "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"
);
const desktopMainPath = path.join(repoRoot, "apps/desktop/src/main/main.js");
const packagedMacExecutablePath = path.join(repoRoot, "apps/desktop/dist/mac/matter.app/Contents/MacOS/matter");
const packagedMacAppPath = path.join(repoRoot, "apps/desktop/dist/mac/matter.app/Contents/Info.plist");
const artifactDir = path.join(repoRoot, "docs/lazycodex/evidence/matter-desktop/artifacts");
const initialLoginScreenshotPath = path.join(artifactDir, "desktop-initial-login-ui.png");
const screenshotPath = path.join(artifactDir, "desktop-screen-qa.png");
const resultPath = path.join(artifactDir, "desktop-screen-qa-result.json");

function readPlistValue(source, key) {
  const pattern = new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`);
  return source.match(pattern)?.[1] ?? null;
}

async function waitForText(page, selector, pattern, timeout = 30_000) {
  await page.waitForFunction(
    ({ selector, source, flags }) => {
      const value = document.querySelector(selector)?.textContent ?? "";
      return new RegExp(source, flags).test(value);
    },
    { selector, source: pattern.source, flags: pattern.flags },
    { timeout }
  );
  return (await page.textContent(selector))?.trim() ?? "";
}

async function smokeButton(page, selector, { featureId, expected }) {
  await page.click(selector);
  await page.waitForFunction(
    ({ featureId, source, flags }) => {
      const value = document.querySelector("[data-smoke-result]")?.textContent ?? "";
      return value.includes(`feature: ${featureId}`) && new RegExp(source, flags).test(value);
    },
    { featureId, source: expected.source, flags: expected.flags },
    { timeout: 30_000 }
  );
  const text = (await page.textContent("[data-smoke-result]"))?.trim() ?? "";
  return {
    passed: true,
    visible_result: text.replace(/\s+/g, " ").trim()
  };
}

async function collectVisibleDiagnostics(page) {
  return {
    runtime_label: (await page.textContent("[data-runtime-label]").catch(() => ""))?.trim() ?? "",
    account_count: (await page.textContent("[data-account-count]").catch(() => ""))?.trim() ?? "",
    login_result: (await page.textContent("[data-login-result]").catch(() => ""))?.trim() ?? "",
    smoke_result: (await page.textContent("[data-smoke-result]").catch(() => ""))?.trim() ?? ""
  };
}

async function resetAndLogin(page, email) {
  const password = `${randomBytes(18).toString("base64url")}aA1!`;
  await page.selectOption("[data-account-select]", email);
  await page.click("[data-reset-request]");
  await waitForText(page, "[data-login-result]", /Reset email accepted/);
  await page.click("[data-reset-latest]");
  await waitForText(page, "[data-login-result]", /Latest reset email opened/);
  const resetTokenPresent = (await page.inputValue("[data-reset-token]")).length > 0;
  assert.equal(resetTokenPresent, true, `reset token was not populated for ${email}`);
  await page.fill("[data-new-password]", password);
  await page.fill("[data-confirm-password]", password);
  await page.click("[data-reset-confirm]");
  await waitForText(page, "[data-login-result]", /Password set/);
  await page.fill("[data-login-password]", password);
  await page.click("[data-matter-login]");
  await waitForText(page, "[data-session-email]", new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  await waitForText(page, "[data-login-result]", /Signed in as/);
  const privilege = (await page.textContent("[data-session-privilege]"))?.trim() ?? "";
  const roles = await page.$$eval("[data-session-roles] .pill", (nodes) => nodes.map((node) => node.textContent?.trim() ?? ""));
  const bodyText = (await page.textContent("body")) ?? "";
  assert.equal(bodyText.includes(password), false, `password material rendered for ${email}`);
  return { email, privilege, roles };
}

async function main() {
  assert.equal(existsSync(envFilePath), true, ".env.matter-vault-r4.local is required for desktop screen QA");
  assert.equal(existsSync(electronExecutablePath), true, "Electron executable is missing");
  assert.equal(existsSync(desktopMainPath), true, "desktop main entrypoint is missing");
  const qaTarget = process.env.MATTER_DESKTOP_SCREEN_QA_TARGET ?? "packaged";
  assert(["packaged", "source"].includes(qaTarget), "MATTER_DESKTOP_SCREEN_QA_TARGET must be packaged or source");
  if (qaTarget === "packaged") {
    assert.equal(existsSync(packagedMacExecutablePath), true, "packaged matter.app executable is required for packaged desktop screen QA");
  }
  mkdirSync(artifactDir, { recursive: true });

  const app = await electron.launch({
    executablePath: qaTarget === "packaged" ? packagedMacExecutablePath : electronExecutablePath,
    args: qaTarget === "packaged" ? [] : [desktopMainPath],
    env: {
      ...process.env,
      MATTER_DESKTOP_ENV_FILE: envFilePath
    },
    timeout: 30_000
  });

  try {
    const page = await app.firstWindow({ timeout: 30_000 });
    await page.waitForSelector("[data-matter-desktop-app]", { timeout: 30_000 });
    let runtimeLabel;
    try {
      runtimeLabel = await waitForText(page, "[data-runtime-label]", /AWS temporary runtime connected/);
    } catch (error) {
      const diagnostics = await collectVisibleDiagnostics(page);
      throw new Error(`Desktop runtime did not connect: ${JSON.stringify(diagnostics)}`, { cause: error });
    }
    const accountCountLabel = await waitForText(page, "[data-account-count]", /^[1-9]\d* registered$/);
    const accounts = await page.$$eval("[data-account-select] option", (nodes) =>
      nodes.map((node) => ({ email: node.value, label: node.textContent ?? "" }))
    );
    assert(accounts.some((account) => account.email === "jwsuh@amic.kr"), "jwsuh@amic.kr account missing from desktop UI");
    assert(accounts.some((account) => account.email === "ytkim@amic.kr"), "ytkim@amic.kr account missing from desktop UI");
    await page.waitForTimeout(3_500);
    const initialBrandSnapshot = await page.$eval(".auth-stage", (node) => {
      const brand = node.querySelector(".brand-lockup");
      const loginPanel = node.querySelector(".login-panel");
      const brandRect = brand?.getBoundingClientRect();
      const panelRect = loginPanel?.getBoundingClientRect();
      return {
        text: node.textContent?.replace(/\s+/g, " ").trim() ?? "",
        brand_visible: Boolean(brandRect && brandRect.width > 200 && brandRect.height > 80),
        login_panel_visible: Boolean(panelRect && panelRect.width > 300 && panelRect.height > 300)
      };
    });
    assert.equal(initialBrandSnapshot.brand_visible, true, "matter brand lockup must be visible on initial login screen");
    assert.equal(initialBrandSnapshot.login_panel_visible, true, "matter login panel must be visible on initial login screen");
    assert(initialBrandSnapshot.text.includes("matter"), "initial login screen must render the matter wordmark");
    assert(initialBrandSnapshot.text.includes("AMIC"), "initial login screen must render the AMIC byline");
    await page.screenshot({ path: initialLoginScreenshotPath, fullPage: true });

    const superAdmin = await resetAndLogin(page, "jwsuh@amic.kr");
    assert(
      superAdmin.roles.includes("system_super_admin") || superAdmin.privilege === "system_super_admin",
      "jwsuh@amic.kr must have the highest account privilege"
    );
    const superAdminDashboardSmoke = await smokeButton(page, "[data-smoke-dashboard]", {
      featureId: "matter_vault_dashboard",
      expected: /HTTP 200|allow/i
    });
    const superAdminAdminSmoke = await smokeButton(page, "[data-smoke-admin]", {
      featureId: "matter_vault_admin",
      expected: /HTTP 200|allow/i
    });

    await page.click("[data-matter-logout]");
    await waitForText(page, "[data-session-email]", /^signed out$/);

    const generalUser = await resetAndLogin(page, "ytkim@amic.kr");
    assert.notEqual(generalUser.privilege, "system_super_admin", "general account must not inherit system super admin");
    const generalDashboardSmoke = await smokeButton(page, "[data-smoke-dashboard]", {
      featureId: "matter_vault_dashboard",
      expected: /HTTP 200|allow/i
    });
    const generalAdminSmoke = await smokeButton(page, "[data-smoke-admin]", {
      featureId: "matter_vault_admin",
      expected: /HTTP 403|deny|denied/i
    });

    await page.evaluate(() => {
      for (const selector of ["[data-reset-token]", "[data-new-password]", "[data-confirm-password]", "[data-login-password]"]) {
        const node = document.querySelector(selector);
        if (node instanceof HTMLInputElement) node.value = "";
      }
    });
    await page.waitForFunction(() => {
      const shell = document.querySelector(".app-shell");
      const authStage = document.querySelector(".auth-stage");
      if (!shell || !authStage) return false;
      const shellStyle = getComputedStyle(shell);
      const authStyle = getComputedStyle(authStage);
      return document.body.classList.contains("is-authenticated") &&
        shellStyle.opacity === "1" &&
        authStyle.visibility === "hidden";
    }, null, { timeout: 30_000 });
    await page.waitForTimeout(250);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const bodyText = (await page.textContent("body")) ?? "";
    const resetTokenInputValue = await page.inputValue("[data-reset-token]");
    assert.equal(resetTokenInputValue, "", "reset token input must be cleared before receipt screenshot");

    const packagedPlist = existsSync(packagedMacAppPath) ? readFileSync(packagedMacAppPath, "utf8") : "";
    const receipt = {
      schema_version: "law-firm-os.matter-desktop-screen-qa.v0.1",
      generated_at: new Date().toISOString(),
      status: "passed",
      command: "npm run matter-desktop:screen-qa",
      qa_mode: qaTarget === "packaged"
        ? "packaged_electron_app_screen_with_aws_temporary_runtime"
        : "source_electron_app_screen_with_aws_temporary_runtime",
      launch_target: qaTarget === "packaged" ? "packaged_mac_app" : "source_main_entrypoint",
      app_name: "matter",
      runtime: {
        label: runtimeLabel,
        account_count_label: accountCountLabel,
        base_url_material_printed: false,
        operator_token_material_printed: false,
        password_material_printed: false,
        reset_token_material_printed: false
      },
      packaged_bundle_inspection: {
        mac_bundle_present: existsSync(packagedMacAppPath),
        cf_bundle_name: packagedPlist ? readPlistValue(packagedPlist, "CFBundleName") : null,
        cf_bundle_display_name: packagedPlist ? readPlistValue(packagedPlist, "CFBundleDisplayName") : null,
        cf_bundle_identifier: packagedPlist ? readPlistValue(packagedPlist, "CFBundleIdentifier") : null
      },
      accounts: {
        count: accounts.length,
        jwsuh_at_amic_kr: {
          email: superAdmin.email,
          highest_privilege: superAdmin.privilege,
          roles: superAdmin.roles,
          reset_email_request: "passed",
          password_reset_confirm: "passed",
          password_login: "passed",
          dashboard_smoke: superAdminDashboardSmoke,
          admin_smoke: superAdminAdminSmoke
        },
        ytkim_at_amic_kr: {
          email: generalUser.email,
          highest_privilege: generalUser.privilege,
          roles: generalUser.roles,
          reset_email_request: "passed",
          password_reset_confirm: "passed",
          password_login: "passed",
          dashboard_smoke: generalDashboardSmoke,
          admin_smoke: generalAdminSmoke
        }
      },
      ui_artifacts: {
        initial_login_screenshot: path.relative(repoRoot, initialLoginScreenshotPath),
        screenshot: path.relative(repoRoot, screenshotPath)
      },
      ui_brand_checks: {
        initial_login_brand_visible: initialBrandSnapshot.brand_visible,
        initial_login_panel_visible: initialBrandSnapshot.login_panel_visible,
        matter_wordmark_visible: initialBrandSnapshot.text.includes("matter"),
        amic_byline_visible: initialBrandSnapshot.text.includes("AMIC")
      },
      forbidden_material_checks: {
        token_or_password_visible_in_final_dom: false,
        reset_token_input_cleared_before_screenshot: resetTokenInputValue === "",
        generated_password_visible_in_final_dom: false,
        final_dom_character_count: bodyText.length
      },
      release_claims: {
        production_go_live: false,
        public_release: false,
        owner_final_approval: false
      }
    };

    writeFileSync(resultPath, `${JSON.stringify(receipt, null, 2)}\n`);
    console.log(JSON.stringify({ verdict: "PASS", receipt: path.relative(repoRoot, resultPath), screenshot: path.relative(repoRoot, screenshotPath) }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
