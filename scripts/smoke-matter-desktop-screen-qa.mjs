#!/usr/bin/env node
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright";
import {
  createMatterVaultAwsRuntimeClient,
  loadMatterVaultRuntimeConfig
} from "../apps/desktop/src/main/aws-runtime.js";
import { assertResetAllowed, resetProtectionSummary, selectQaResetAccount } from "./lib/protected-reset-accounts.mjs";

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
const qaAccountProductScreenshotPath = path.join(artifactDir, "desktop-qa-account-product-ui.png");
const screenshotPath = path.join(artifactDir, "desktop-screen-qa.png");
const resultPath = path.join(artifactDir, "desktop-screen-qa-result.json");

function createQaUserDataPath() {
  const root = process.env.MATTER_DESKTOP_QA_USER_DATA_PATH;
  if (typeof root === "string" && root.trim()) {
    mkdirSync(root, { recursive: true });
    return mkdtempSync(path.join(root, "launch-"));
  }
  return mkdtempSync(path.join(tmpdir(), "matter-desktop-screen-qa-"));
}

function readPlistValue(source, key) {
  const pattern = new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`);
  return source.match(pattern)?.[1] ?? null;
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
  return /AWS temporary runtime connected|작업공간 연결됨|워크스페이스 연결됨/.test(label) ? "AWS temporary runtime connected" : label;
}

function canonicalRoles(account) {
  const roles = new Set(Array.isArray(account.roles) ? account.roles : account.role_ids ?? []);
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
    url: page.url(),
    login_screen: await page.locator('[data-login-screen="parnas-split"]').count().catch(() => 0),
    product_shell: await page.locator("[data-product-axis-nav='top-header']").count().catch(() => 0),
    runtime_label: (await page.textContent("[data-runtime-label]").catch(() => ""))?.trim() ?? "",
    account_count: (await page.textContent("[data-account-count]").catch(() => ""))?.trim() ?? "",
    login_result: (await page.textContent("[data-login-result]").catch(() => ""))?.trim() ?? "",
    smoke_result: (await page.textContent("[data-smoke-result]").catch(() => ""))?.trim() ?? "",
    body_preview: ((await page.textContent("body").catch(() => "")) ?? "").replace(/\s+/g, " ").trim().slice(0, 400)
  };
}

async function resetAndLogin(page, email, { account } = {}) {
  assertResetAllowed(email, { context: "matter desktop screen QA reset-and-login" });
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
  await page.click('[data-login-form="email-password"] button[type="submit"]');
  await Promise.race([
    page.waitForSelector("[data-product-axis-nav='top-header']", { timeout: 30_000 }),
    page.waitForFunction(() => new URLSearchParams(window.location.search).get("view") === "home", null, { timeout: 30_000 })
  ]);
  const renderedPrivilege = (await page.textContent("[data-session-privilege]").catch(() => ""))?.trim() ?? "";
  const privilege = renderedPrivilege || account?.highest_privilege || account?.privilege || "";
  let roles = await page
    .$$eval("[data-session-roles] .pill", (nodes) => nodes.map((node) => node.textContent?.trim() ?? ""))
    .catch(() => []);
  if (roles.length === 0 && account) roles = canonicalRoles(account);
  const bodyText = (await page.textContent("body")) ?? "";
  assert.equal(bodyText.includes(password), false, `password material rendered for ${email}`);
  return { email, privilege, roles };
}

async function waitForProductUi(page) {
  await page.waitForFunction(() => new URLSearchParams(window.location.search).get("view") === "home", null, { timeout: 30_000 });
  await page.waitForSelector("[data-lcx-web-command-center='true']", { timeout: 30_000 });
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
  assert.equal(logoFlow.observed, false, "post-login matter logo flow must not replay after password login");
  assert.equal(logoFlow.by_amic_visible_in_logo, false, "post-login logo must not show by AMIC");
  await page.waitForFunction(() => document.querySelector("[data-home-dashboard-shell='true']"), null, { timeout: 30_000 });
  const snapshot = await page.evaluate(() => {
    const text = document.body.textContent ?? "";
    const widgetIds = Array.from(document.querySelectorAll("[data-widget-id]")).map((node) => node.getAttribute("data-widget-id") ?? "");
    const positiveReleaseClaimPattern = /\b(public[- ]release|production go-live|owner approval|owner-approved)\b\s*[:|]\s*(true|approved|ready|yes|pass)\b/i;
    return {
      url: window.location.href,
      home_dashboard_shell: Boolean(document.querySelector("[data-home-dashboard-shell='true']")),
      home_dashboard_grid: Boolean(document.querySelector("[data-home-dashboard-grid='true']")),
      widget_ids: widgetIds,
      release_boundary_ui_has_no_positive_claim: !positiveReleaseClaimPattern.test(text),
      no_dummy_visible: !/mock|dummy|sample|synthetic|Project Atlas|Alex Smith|Riverstone/i.test(text),
      horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      body_character_count: text.length
    };
  });
  assert.equal(snapshot.home_dashboard_shell, true, "post-login product UI must show the Home dashboard shell");
  assert.equal(snapshot.home_dashboard_grid, true, "post-login product UI must show the Home dashboard grid");
  assert.deepEqual(snapshot.widget_ids.sort(), ["approval", "calendar", "feed", "todo"].sort(), "home dashboard must show the four current operational widgets");
  assert.equal(snapshot.widget_ids.includes("system"), false, "company status must remain on its permission-gated Home screen instead of a duplicated dashboard widget");
  assert.equal(snapshot.release_boundary_ui_has_no_positive_claim, true, "product UI must not render positive release or go-live claims");
  assert.equal(snapshot.no_dummy_visible, true, "post-login product UI must not render dummy/sample/synthetic text");
  assert.equal(snapshot.horizontal_overflow, false, "product UI must not horizontally overflow");
  const topHeaderNav = await page.evaluate(() => {
    const nav = document.querySelector("[data-product-axis-nav='top-header']");
    const navRect = nav?.getBoundingClientRect();
    const topbarRect = document.querySelector(".topbar")?.getBoundingClientRect();
    const portal = Array.from(document.querySelectorAll("[data-product-axis]")).find((node) => node.textContent?.trim().toLowerCase() === "portal");
    const portalRect = portal?.getBoundingClientRect();
    return {
      labels: Array.from(document.querySelectorAll("[data-product-axis]")).map((node) => node.textContent.replace(/\s+/g, " ").trim()),
      axis_ids: Array.from(document.querySelectorAll("[data-product-axis]")).map((node) => node.getAttribute("data-product-axis")),
      in_topbar: Boolean(navRect && topbarRect && navRect.top >= topbarRect.top && navRect.bottom <= topbarRect.bottom + 1),
      active_axis: document.querySelector("[data-product-axis][aria-current='page']")?.getAttribute("data-product-axis") ?? "",
      active_axis_count: document.querySelectorAll("[data-product-axis][aria-current='page']").length,
      portal_fully_visible: Boolean(portalRect && navRect && portalRect.left >= navRect.left - 1 && portalRect.right <= navRect.right + 1),
      nav_horizontal_overflow: nav ? nav.scrollWidth > nav.clientWidth : false
    };
  });
  assert.deepEqual(topHeaderNav.labels, ["Home", "Client", "Matter", "People", "Vault", "Portal"], "top header must render the six primary menu labels");
  assert.deepEqual(topHeaderNav.axis_ids, ["home", "clients", "matters", "people", "vault", "portal"], "top header product-axis menu must stay fixed to Home/Client/Matter/People/Vault/Portal");
  assert.equal(topHeaderNav.active_axis_count, 1, "product-axis menu must have exactly one active axis");
  assert.equal(topHeaderNav.active_axis, "home", "post-login Home dashboard must keep Home as the active axis");
  assert.equal(topHeaderNav.portal_fully_visible, true, "Portal axis label must be fully visible in the top header");
  assert.equal(topHeaderNav.nav_horizontal_overflow, false, "product-axis menu must not horizontally overflow");
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
      sidebar_product_axis_labels: sidebarLabels.filter((label) => ["Home", "Client", "Matter", "People", "Vault", "Portal"].includes(label)),
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
  const userDataPath = createQaUserDataPath();
  const app = await electron.launch({
    executablePath: qaTarget === "packaged" ? packagedMacExecutablePath : electronExecutablePath,
    args: qaTarget === "packaged" ? [] : [desktopMainPath],
    env: {
      ...process.env,
      MATTER_DESKTOP_ENV_FILE: envFilePath,
      MATTER_DESKTOP_LOCAL_API_DISABLED: "1",
      MATTER_DESKTOP_USER_DATA_PATH: userDataPath
    },
    timeout: 30_000
  });
  try {
    await app.firstWindow({ timeout: 30_000 });
    let page = null;
    for (let attempt = 0; attempt < 60 && !page; attempt += 1) {
      for (const candidate of app.windows()) {
        const ready = await candidate.locator('[data-login-screen="parnas-split"], [data-product-axis-nav="top-header"], [data-matter-desktop-app]').count().catch(() => 0);
        if (ready > 0) {
          page = candidate;
          break;
        }
      }
      if (!page) await new Promise((resolveWait) => setTimeout(resolveWait, 500));
    }
    if (!page) {
      const diagnostics = await Promise.all(app.windows().map((candidate) => collectVisibleDiagnostics(candidate)));
      throw new Error(`Desktop main window did not become ready: ${JSON.stringify(diagnostics)}`);
    }
    await page.waitForSelector('[data-login-screen="parnas-split"]', { timeout: 30_000 });
    const runtime = await page.evaluate(() => window.matterSession.runtime());
    const accounts = await page.evaluate(() => window.matterSession.accounts());
    assert.equal(runtime?.configured, true, "desktop runtime must be configured");
    assert.equal(accounts?.ok, true, "desktop account ledger must load through current package IPC");
    assert(Number(accounts?.count ?? accounts?.users?.length ?? 0) > 0, "desktop account ledger must contain registered accounts");
    return {
      app,
      page,
      runtimeLabel: "AWS temporary runtime connected",
      runtimeSource: "matterSession.runtime",
      accountCountLabel: `${Number(accounts.count ?? accounts.users.length)} registered`,
      accountCountSource: "matterSession.accounts",
      userDataPath
    };
  } catch (error) {
    const diagnostics = await Promise.all(app.windows().map((candidate) => collectVisibleDiagnostics(candidate)));
    await app.close().catch(() => {});
    throw new Error(`Desktop runtime did not connect: ${JSON.stringify(diagnostics)}`, { cause: error });
  }
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
  const accountsResponse = await runtimeClient.accounts();
  assert.equal(accountsResponse.ok, true, "desktop account ledger must load before selecting QA account");
  const superAdminAccount = accountsResponse.users.find((user) => user.email === "jwsuh@amic.kr");
  assert(superAdminAccount, "jwsuh@amic.kr must exist in registered account ledger for read-only privilege smoke");
  assert(superAdminAccount.role_ids.includes("system_super_admin"), "jwsuh@amic.kr must have system_super_admin");
  const qaAccount = selectQaResetAccount(accountsResponse.users);
  const firstLaunch = await launchMatterApp(qaTarget);
  let secondLaunch = null;

  try {
    const { page } = firstLaunch;
    await page.waitForTimeout(3_500);
    const initialBrandSnapshot = await page.$eval(".auth-stage", (node) => {
      const brand = node.querySelector(".matter-logo");
      const brandLogo = brand?.querySelector(".matter-mark, .matter-word, img, svg");
      const loginPanel = node.querySelector('[data-login-form="email-password"]');
      const brandRect = brand?.getBoundingClientRect();
      const logoRect = brandLogo?.getBoundingClientRect();
      const panelRect = loginPanel?.getBoundingClientRect();
      const text = node.textContent?.replace(/\s+/g, " ").trim() ?? "";
      const brandText = brand?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      return {
        text,
        brand_text: brandText,
        brand_visible:
          Boolean(brandRect && brandRect.width > 120 && brandRect.height > 20 && brandText.includes("matter")) ||
          Boolean(logoRect && logoRect.width > 120 && logoRect.height > 20),
        login_panel_visible: Boolean(panelRect && panelRect.width > 300 && panelRect.height > 200)
      };
    });
    assert.equal(initialBrandSnapshot.brand_visible, true, "matter brand lockup must be visible on initial login screen");
    assert.equal(initialBrandSnapshot.login_panel_visible, true, "matter login panel must be visible on initial login screen");
    assert(initialBrandSnapshot.text.includes("matter"), "initial login screen must render the matter wordmark");
    assert.equal(initialBrandSnapshot.brand_text.includes("AMIC"), false, "initial login brand lockup must not render the AMIC byline");
    await page.screenshot({ path: initialLoginScreenshotPath, fullPage: true });

    const qaUser = await resetAndLogin(page, qaAccount.email, { account: qaAccount });
    assert.notEqual(qaUser.privilege, "system_super_admin", "QA account must not inherit system super admin");
    assert.notEqual(qaUser.privilege, "최고 관리자", "QA account must not inherit system super admin");
    const qaProduct = await waitForProductUi(page);
    await page.screenshot({ path: qaAccountProductScreenshotPath, fullPage: true });
    await firstLaunch.app.close();

    secondLaunch = await launchMatterApp(qaTarget);
    const generalUser = await resetAndLogin(secondLaunch.page, qaAccount.email, { account: qaAccount });
    assert.notEqual(generalUser.privilege, "system_super_admin", "general account must not inherit system super admin");
    assert.notEqual(generalUser.privilege, "최고 관리자", "general account must not inherit system super admin");
    const generalProduct = await waitForProductUi(secondLaunch.page);
    await secondLaunch.page.screenshot({ path: screenshotPath, fullPage: true });
    const finalBodyText = (await secondLaunch.page.textContent("body")) ?? "";
    await secondLaunch.app.close();

    const superAdminDashboardSmoke = await runtimeSmoke(runtimeClient, {
      email: superAdminAccount.email,
      featureId: "matter_vault_dashboard",
      expectedDecision: "allow",
      expectedStatus: 200
    });
    const superAdminAdminSmoke = await runtimeSmoke(runtimeClient, {
      email: superAdminAccount.email,
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
        status_source: firstLaunch.runtimeSource,
        visible_label: null,
        account_count_label: firstLaunch.accountCountLabel,
        account_count_source: firstLaunch.accountCountSource,
        base_url_material_printed: false,
        operator_token_material_printed: false,
        password_material_printed: false,
        reset_token_material_printed: false
      },
      desktop_user_data: {
        isolated_per_launch: true,
        first_launch_path: firstLaunch.userDataPath,
        second_launch_path: secondLaunch.userDataPath
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
          email: superAdminAccount.email,
          highest_privilege: superAdminAccount.highest_privilege ?? "system_super_admin",
          roles: canonicalRoles(superAdminAccount),
          reset_email_request: "not_attempted_protected_account",
          password_reset_confirm: "not_attempted_protected_account",
          password_login: "not_attempted_protected_account",
          product_handoff: "not_attempted_protected_account",
          dashboard_smoke: superAdminDashboardSmoke,
          admin_smoke: superAdminAdminSmoke
        },
        qa_reset_account: {
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
        qa_account_product_screenshot: path.relative(repoRoot, qaAccountProductScreenshotPath),
        screenshot: path.relative(repoRoot, screenshotPath)
      },
      reset_protection: resetProtectionSummary(),
      ui_brand_checks: {
        initial_login_brand_visible: initialBrandSnapshot.brand_visible,
        initial_login_panel_visible: initialBrandSnapshot.login_panel_visible,
        matter_wordmark_visible: initialBrandSnapshot.text.includes("matter"),
        amic_byline_visible: initialBrandSnapshot.brand_text.includes("AMIC"),
        amic_byline_removed: initialBrandSnapshot.brand_text.includes("AMIC") === false
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
    await secondLaunch?.app?.close().catch(() => {});
    await firstLaunch.app.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
