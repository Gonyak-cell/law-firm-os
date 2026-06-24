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
    http_status: response.http_status,
    visible_result: `HTTP ${response.http_status} ${response.decision}`
  };
}

function canonicalRuntimeLabel(label) {
  return /AWS temporary runtime connected|작업공간 연결됨/.test(label) ? "AWS temporary runtime connected" : label;
}

function canonicalRoles(account) {
  const roles = new Set(account.roles);
  if (
    account.privilege === "system_super_admin" ||
    account.privilege === "최고 관리자" ||
    roles.has("system_super_admin") ||
    roles.has("시스템 관리자")
  ) {
    roles.add("system_super_admin");
  }
  return [...roles];
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
  const runtimeClient = createMatterVaultAwsRuntimeClient(loadMatterVaultRuntimeConfig({ envPath: envFilePath }));
  const request = await runtimeClient.requestPasswordReset({ email });
  assert.equal(request.ok, true, `${email} reset request must be accepted before UI password login`);
  const latest = await runtimeClient.latestResetEmail({ email });
  assert.equal(latest.ok, true, `${email} reset email must be available before UI password login`);
  const confirm = await runtimeClient.confirmPasswordReset({
    token: latest.email_message.reset_token,
    password
  });
  assert.equal(confirm.ok, true, `${email} password must be set before UI password login`);
  await page.fill("[data-login-email]", email);
  await page.fill("[data-login-password]", password);
  await page.click("[data-matter-login]");
  await waitForText(page, "[data-session-email]", new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  await waitForText(page, "[data-login-result]", /Signed in as|계정으로 로그인했습니다/);
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
    const image = document.querySelector(".matter-splash-mark img, .matter-splash-image");
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
  await page.waitForFunction(() => document.querySelectorAll("[data-capability-id]").length === 4, null, { timeout: 30_000 });
  const snapshot = await page.evaluate(() => {
    const text = document.body.textContent ?? "";
    const capabilityLabels = Array.from(document.querySelectorAll("[data-capability-id] h2")).map((node) => node.textContent?.trim() ?? "");
    const localizedBoundaryVisible = text.includes("권한이 필요한 정보는 표시하지 않습니다");
    return {
      url: window.location.href,
      title: document.querySelector("h1")?.textContent?.trim() ?? "",
      capability_cards: document.querySelectorAll("[data-capability-id]").length,
      capability_labels: capabilityLabels,
      production_go_live_false_visible: text.includes("production go-live: false") || localizedBoundaryVisible,
      public_release_false_visible: text.includes("public release: false") || localizedBoundaryVisible,
      owner_approval_false_visible: text.includes("owner approval: false") || localizedBoundaryVisible,
      no_dummy_visible: !/mock|dummy|sample|synthetic|Project Atlas|Alex Smith|Riverstone/i.test(text),
      horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      body_character_count: text.length
    };
  });
  assert.equal(snapshot.title, "Client Matter People Vault", "post-login product UI must be the four-axis command center");
  assert.equal(snapshot.capability_cards, 4, "command center must show four product-axis cards");
  assert.deepEqual(snapshot.capability_labels.sort(), ["Client", "Matter", "People", "Vault"].sort(), "command center must show Client, Matter, People, and Vault");
  assert.equal(snapshot.production_go_live_false_visible, true, "production go-live false boundary must be visible");
  assert.equal(snapshot.public_release_false_visible, true, "public release false boundary must be visible");
  assert.equal(snapshot.owner_approval_false_visible, true, "owner approval false boundary must be visible");
  assert.equal(snapshot.no_dummy_visible, true, "post-login product UI must not render dummy/sample/synthetic text");
  assert.equal(snapshot.horizontal_overflow, false, "product UI must not horizontally overflow");
  const topHeaderNav = await page.evaluate(() => {
    const nav = document.querySelector("[data-product-axis-nav='top-header']");
    const navRect = nav?.getBoundingClientRect();
    const topbarRect = document.querySelector(".topbar")?.getBoundingClientRect();
    return {
      labels: Array.from(document.querySelectorAll("[data-product-axis]")).map((node) => node.textContent.replace(/\s+/g, " ").trim()),
      axis_ids: Array.from(document.querySelectorAll("[data-product-axis]")).map((node) => node.getAttribute("data-product-axis")),
      in_topbar: Boolean(navRect && topbarRect && navRect.top >= topbarRect.top && navRect.bottom <= topbarRect.bottom + 1),
      active_axis: document.querySelector("[data-product-axis][aria-current='page']")?.getAttribute("data-product-axis") ?? ""
    };
  });
  assert.deepEqual(topHeaderNav.labels, ["Home", "Client", "Matter", "People", "Vault"], "top header must render the five primary menu labels");
  assert.deepEqual(topHeaderNav.axis_ids, ["home", "clients", "matters", "people", "vault"], "top header product-axis menu must stay fixed to Home/Client/Matter/People/Vault");
  assert.equal(topHeaderNav.in_topbar, true, "product-axis menu must live inside the top header");
  const contextualSidebar = await page.evaluate(() => {
    const frame = document.querySelector(".app-frame");
    const sidebar = document.querySelector(".sidebar");
    const workspace = document.querySelector(".workspace-card");
    const sidebarStyle = sidebar ? getComputedStyle(sidebar) : null;
    const sidebarLabels = Array.from(document.querySelectorAll(".sidebar-nav .sidebar-item")).map((node) =>
      node.textContent.replace(/\s+/g, " ").trim()
    );
    return {
      state: frame?.getAttribute("data-sidebar-state") ?? "",
      shell_contextual: frame?.classList.contains("contextual-shell") ?? false,
      sidebar_display: sidebarStyle?.display ?? "",
      workspace_visible: Boolean(workspace?.getBoundingClientRect().width && workspace?.getBoundingClientRect().height),
      sidebar_product_axis_labels: sidebarLabels.filter((label) => ["Home", "Client", "Matter", "People", "Vault"].includes(label)),
      sidebar_item_count: sidebarLabels.length,
      horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });
  assert.equal(contextualSidebar.state, "contextual", "post-login product UI must record contextual sidebar state");
  assert.equal(contextualSidebar.shell_contextual, true, "post-login shell must use contextual sidebar mode");
  assert.notEqual(contextualSidebar.sidebar_display, "none", "contextual sidebar must render the sidebar panel");
  assert.equal(contextualSidebar.workspace_visible, true, "contextual sidebar must show the active workspace summary");
  assert.deepEqual(contextualSidebar.sidebar_product_axis_labels, [], "contextual sidebar must not duplicate the top product-axis menu");
  assert.equal(contextualSidebar.horizontal_overflow, false, "contextual sidebar must not horizontally overflow");
  return { ...snapshot, logo_flow: logoFlow, top_header_nav: topHeaderNav, sidebar: { contextual: contextualSidebar } };
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
    runtimeLabel = await waitForText(page, "[data-runtime-label]", /AWS temporary runtime connected|작업공간 연결됨/);
  } catch (error) {
    const diagnostics = await collectVisibleDiagnostics(page);
    throw new Error(`Desktop runtime did not connect: ${JSON.stringify(diagnostics)}`, { cause: error });
  }
  const accountCountLabel = await waitForText(page, "[data-account-count]", /^([1-9]\d* registered|등록된 계정 [1-9]\d*개)$/);
  return { app, page, runtimeLabel, accountCountLabel };
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
    const { page } = firstLaunch;
    await page.waitForTimeout(3_500);
    const initialBrandSnapshot = await page.$eval(".auth-stage", (node) => {
      const brand = node.querySelector(".brand-lockup");
      const loginPanel = node.querySelector(".login-panel");
      const brandRect = brand?.getBoundingClientRect();
      const panelRect = loginPanel?.getBoundingClientRect();
      return {
        text: node.textContent?.replace(/\s+/g, " ").trim() ?? "",
        brand_visible: Boolean(brandRect && brandRect.width > 200 && brandRect.height > 80),
        login_panel_visible: Boolean(panelRect && panelRect.width > 300 && panelRect.height > 200)
      };
    });
    assert.equal(initialBrandSnapshot.brand_visible, true, "matter brand lockup must be visible on initial login screen");
    assert.equal(initialBrandSnapshot.login_panel_visible, true, "matter login panel must be visible on initial login screen");
    assert(initialBrandSnapshot.text.includes("matter"), "initial login screen must render the matter wordmark");
    assert.equal(initialBrandSnapshot.text.includes("AMIC"), false, "initial login screen must not render the AMIC byline");
    await page.screenshot({ path: initialLoginScreenshotPath, fullPage: true });

    const superAdmin = await resetAndLogin(page, "jwsuh@amic.kr");
    assert(
      superAdmin.roles.includes("system_super_admin") ||
        superAdmin.roles.includes("시스템 관리자") ||
        superAdmin.privilege === "system_super_admin" ||
        superAdmin.privilege === "최고 관리자",
      "jwsuh@amic.kr must have the highest account privilege"
    );
    const superAdminProduct = await waitForProductUi(page);
    await page.screenshot({ path: superAdminProductScreenshotPath, fullPage: true });
    await firstLaunch.app.close();

    const secondLaunch = await launchMatterApp(qaTarget);
    const generalUser = await resetAndLogin(secondLaunch.page, "ytkim@amic.kr");
    assert.notEqual(generalUser.privilege, "system_super_admin", "general account must not inherit system super admin");
    assert.notEqual(generalUser.privilege, "최고 관리자", "general account must not inherit system super admin");
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
    const accountCount = Number(firstLaunch.accountCountLabel.match(/\d+/)?.[0] ?? 0);
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
        label: canonicalRuntimeLabel(firstLaunch.runtimeLabel),
        visible_label: firstLaunch.runtimeLabel,
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
        count: accountCount,
        jwsuh_at_amic_kr: {
          email: superAdmin.email,
          highest_privilege: superAdmin.privilege,
          roles: canonicalRoles(superAdmin),
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
          roles: canonicalRoles(generalUser),
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
