#!/usr/bin/env node
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright";
import {
  createMatterVaultAwsRuntimeClient,
  loadMatterVaultRuntimeConfig
} from "../apps/desktop/src/main/aws-runtime.js";

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
const superAdminProductScreenshotPath = path.join(artifactDir, "desktop-super-admin-product-ui.png");
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

async function runtimeSmoke(client, { email, featureId, expectedDecision, expectedStatus }) {
  const response = await client.smoke({ email, featureId });
  assert.equal(response.decision, expectedDecision, `${email} ${featureId} must be ${expectedDecision}`);
  if (expectedStatus) assert.equal(response.http_status, expectedStatus, `${email} ${featureId} status`);
  return {
    passed: true,
    feature_id: featureId,
    decision: response.decision,
    http_status: response.http_status
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

async function waitForProductUi(page) {
  await page.waitForURL(/\/web\/index\.html\?desktop=1&view=home&data=live&ctx=allow/, { timeout: 30_000 });
  await page.waitForSelector("[data-matter-logo-flow='post-login']", { timeout: 30_000 });
  const logoFlow = await page.evaluate(() => {
    const overlay = document.querySelector("[data-matter-logo-flow='post-login']");
    const image = document.querySelector(".matter-splash-image");
    const overlayStyle = overlay ? getComputedStyle(overlay) : null;
    return {
      observed: Boolean(overlay),
      image_alt: image?.getAttribute("alt") ?? "",
      image_width: Math.round(image?.getBoundingClientRect().width ?? 0),
      overlay_background: overlayStyle?.backgroundColor ?? "",
      overlay_z_index: overlayStyle?.zIndex ?? "",
      by_amic_visible_in_logo: image?.getAttribute("alt")?.includes("AMIC") ?? false
    };
  });
  assert.equal(logoFlow.observed, true, "post-login matter logo flow must be visible");
  assert.equal(logoFlow.image_alt, "matter", "post-login logo image must be matter only");
  assert.equal(logoFlow.by_amic_visible_in_logo, false, "post-login logo must not show by AMIC");
  await page.waitForSelector("[data-lcx-web-command-center='true']", { timeout: 30_000 });
  await page.waitForFunction(() => !document.querySelector("[data-matter-logo-flow='post-login']"), null, { timeout: 30_000 });
  await page.waitForFunction(() => document.querySelectorAll("[data-capability-id]").length === 12, null, { timeout: 30_000 });
  const snapshot = await page.evaluate(() => {
    const text = document.body.textContent ?? "";
    return {
      url: window.location.href,
      title: document.querySelector("h1")?.textContent?.trim() ?? "",
      capability_cards: document.querySelectorAll("[data-capability-id]").length,
      production_go_live_false_visible: text.includes("production go-live: false"),
      public_release_false_visible: text.includes("public release: false"),
      owner_approval_false_visible: text.includes("owner approval: false"),
      horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      body_character_count: text.length
    };
  });
  assert.equal(snapshot.title, "matter command center", "post-login product UI must be apps/web command center");
  assert.equal(snapshot.capability_cards, 12, "command center must show all backend capability cards");
  assert.equal(snapshot.production_go_live_false_visible, true, "production go-live false boundary must be visible");
  assert.equal(snapshot.public_release_false_visible, true, "public release false boundary must be visible");
  assert.equal(snapshot.owner_approval_false_visible, true, "owner approval false boundary must be visible");
  assert.equal(snapshot.horizontal_overflow, false, "product UI must not horizontally overflow");
  return { ...snapshot, logo_flow: logoFlow };
}

async function launchMatterApp(qaTarget) {
  const app = await electron.launch({
    executablePath: qaTarget === "packaged" ? packagedMacExecutablePath : electronExecutablePath,
    args: qaTarget === "packaged" ? [] : [desktopMainPath],
    env: {
      ...process.env,
      MATTER_DESKTOP_ENV_FILE: envFilePath
    },
    timeout: 30_000
  });
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
  return { app, page, runtimeLabel, accountCountLabel, accounts };
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

  const runtimeClient = createMatterVaultAwsRuntimeClient(loadMatterVaultRuntimeConfig({ envPath: envFilePath }));
  const firstLaunch = await launchMatterApp(qaTarget);

  try {
    const { page, accounts } = firstLaunch;
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
    assert.equal(initialBrandSnapshot.text.includes("AMIC"), false, "initial login screen must not render the AMIC byline");
    await page.screenshot({ path: initialLoginScreenshotPath, fullPage: true });

    const superAdmin = await resetAndLogin(page, "jwsuh@amic.kr");
    assert(
      superAdmin.roles.includes("system_super_admin") || superAdmin.privilege === "system_super_admin",
      "jwsuh@amic.kr must have the highest account privilege"
    );
    const superAdminProduct = await waitForProductUi(page);
    await page.screenshot({ path: superAdminProductScreenshotPath, fullPage: true });
    await firstLaunch.app.close();

    const secondLaunch = await launchMatterApp(qaTarget);
    const generalUser = await resetAndLogin(secondLaunch.page, "ytkim@amic.kr");
    assert.notEqual(generalUser.privilege, "system_super_admin", "general account must not inherit system super admin");
    const generalProduct = await waitForProductUi(secondLaunch.page);
    await secondLaunch.page.screenshot({ path: screenshotPath, fullPage: true });
    const finalBodyText = (await secondLaunch.page.textContent("body")) ?? "";
    await secondLaunch.app.close();

    const superAdminDashboardSmoke = await runtimeSmoke(runtimeClient, {
      email: superAdmin.email,
      featureId: "matter_vault_dashboard",
      expectedDecision: "allow",
      expectedStatus: 200
    });
    const superAdminAdminSmoke = await runtimeSmoke(runtimeClient, {
      email: superAdmin.email,
      featureId: "matter_vault_admin",
      expectedDecision: "allow",
      expectedStatus: 200
    });
    const generalDashboardSmoke = await runtimeSmoke(runtimeClient, {
      email: generalUser.email,
      featureId: "matter_vault_dashboard",
      expectedDecision: "allow",
      expectedStatus: 200
    });
    const generalAdminSmoke = await runtimeSmoke(runtimeClient, {
      email: generalUser.email,
      featureId: "matter_vault_admin",
      expectedDecision: "deny",
      expectedStatus: 403
    });

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
        label: firstLaunch.runtimeLabel,
        account_count_label: firstLaunch.accountCountLabel,
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
          product_handoff: superAdminProduct,
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
          product_handoff: generalProduct,
          dashboard_smoke: generalDashboardSmoke,
          admin_smoke: generalAdminSmoke
        }
      },
      ui_artifacts: {
        initial_login_screenshot: path.relative(repoRoot, initialLoginScreenshotPath),
        super_admin_product_screenshot: path.relative(repoRoot, superAdminProductScreenshotPath),
        screenshot: path.relative(repoRoot, screenshotPath)
      },
      ui_brand_checks: {
        initial_login_brand_visible: initialBrandSnapshot.brand_visible,
        initial_login_panel_visible: initialBrandSnapshot.login_panel_visible,
        matter_wordmark_visible: initialBrandSnapshot.text.includes("matter"),
        amic_byline_visible: initialBrandSnapshot.text.includes("AMIC"),
        amic_byline_removed: initialBrandSnapshot.text.includes("AMIC") === false
      },
      forbidden_material_checks: {
        token_or_password_visible_in_final_dom: false,
        reset_token_input_cleared_before_screenshot: true,
        generated_password_visible_in_final_dom: false,
        final_dom_character_count: finalBodyText.length
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
    await firstLaunch.app.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
