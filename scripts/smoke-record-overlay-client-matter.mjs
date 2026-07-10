#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const envFilePath = path.join(repoRoot, ".env.matter-vault-r4.local");
const packagedExecutablePath = path.join(repoRoot, "apps/desktop/dist/mac/matter.app/Contents/MacOS/matter");
const artifactDir = path.join(repoRoot, "artifacts/manual-qa");
const resultPath = path.join(artifactDir, "desktop-right-slide-panels-2026-07-09.json");
const notificationScreenshotPath = path.join(artifactDir, "desktop-right-slide-notifications-2026-07-09.png");
const messageScreenshotPath = path.join(artifactDir, "desktop-right-slide-messages-2026-07-09.png");
const clientScreenshotPath = path.join(artifactDir, "desktop-right-slide-client-2026-07-09.png");
const matterScreenshotPath = path.join(artifactDir, "desktop-right-slide-matter-2026-07-09.png");

function createUserDataPath() {
  return mkdtempSync(path.join(tmpdir(), "matter-record-overlay-qa-"));
}

async function visibleText(locator) {
  return ((await locator.textContent().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
}

async function waitForProductShell(page) {
  await Promise.race([
    page.waitForSelector("[data-product-axis-nav='top-header']", { timeout: 45_000 }),
    page.waitForSelector("[data-login-email]", { timeout: 45_000 }).then(async () => {
      const diagnostics = {
        login_email: Boolean(await page.locator("[data-login-email]").count()),
        login_result: await visibleText(page.locator("[data-login-result]")),
        runtime_label: await visibleText(page.locator("[data-runtime-label]")),
        account_count: await visibleText(page.locator("[data-account-count]"))
      };
      throw new Error(`App stayed on login screen: ${JSON.stringify(diagnostics)}`);
    })
  ]);
  await page.waitForSelector("[data-product-axis='clients']", { timeout: 30_000 });
  await page.waitForSelector("[data-product-axis='matters']", { timeout: 30_000 });
}

async function clickSidebarChild(page, exactLabel) {
  const child = page.locator(".sidebar-child", { hasText: exactLabel }).filter({ hasText: new RegExp(`^\\s*${exactLabel}\\s*$`) }).first();
  await child.click({ timeout: 15_000 });
}

async function clickPreferredRow(page, selector, preferredPattern) {
  await page.waitForSelector(selector, { timeout: 30_000 });
  const preferred = page.locator(selector).filter({ hasText: preferredPattern }).first();
  const preferredCount = await preferred.count();
  const row = preferredCount > 0 ? preferred : page.locator(selector).first();
  const label = await visibleText(row);
  await row.locator("button").first().click({ timeout: 15_000 });
  return label;
}

async function overlaySnapshot(page, kind) {
  return page.evaluate((overlayKind) => {
    const overlay = document.querySelector(`[data-record-overlay="${overlayKind}"]`);
    const scrim = overlay?.querySelector(".record-overlay-scrim");
    const panel = overlay?.querySelector(".record-overlay-panel");
    const record = overlay?.querySelector(
      overlayKind === "client" ? "[data-client-record-workspace='right-panel']" : "[data-matter-record-workspace='right-panel']"
    );
    const workspace = document.querySelector(
      overlayKind === "client"
        ? "[data-salesforce-client-workspace='list-detail-overlay']"
        : "[data-salesforce-matter-workspace='list-detail-overlay']"
    );
    const overlayRect = overlay?.getBoundingClientRect();
    const panelRect = panel?.getBoundingClientRect();
    const scrimRect = scrim?.getBoundingClientRect();
    const scrimStyle = scrim ? getComputedStyle(scrim) : null;
    const panelStyle = panel ? getComputedStyle(panel) : null;
    const overlayStyle = overlay ? getComputedStyle(overlay) : null;
    const panelCenter = panelRect ? panelRect.left + panelRect.width / 2 : 0;
    const viewportCenter = window.innerWidth / 2;
    const scrimAlpha = scrimStyle?.backgroundColor?.match(/rgba?\(([^)]+)\)/)?.[1]?.split(",").map((part) => Number.parseFloat(part.trim()))?.[3] ?? 1;
    return {
      kind: overlayKind,
      overlay_present: Boolean(overlay),
      overlay_position: overlayStyle?.position ?? "",
      overlay_z_index: Number.parseInt(overlayStyle?.zIndex ?? "0", 10),
      record_panel_present: Boolean(record),
      workspace_contract: Boolean(workspace),
      scrim_present: Boolean(scrim),
      scrim_background: scrimStyle?.backgroundColor ?? "",
      scrim_alpha: scrimAlpha,
      scrim_covers_viewport: Boolean(
        scrimRect &&
          scrimRect.left <= 1 &&
          scrimRect.top <= 1 &&
          scrimRect.right >= window.innerWidth - 1 &&
          scrimRect.bottom >= window.innerHeight - 1
      ),
      panel_visible: Boolean(panelRect && panelRect.width > 320 && panelRect.height > 240),
      panel_width: Math.round(panelRect?.width ?? 0),
      panel_height: Math.round(panelRect?.height ?? 0),
      panel_center_delta: Math.round(Math.abs(panelCenter - viewportCenter)),
      panel_right_delta: Math.round(Math.abs((panelRect?.right ?? 0) - window.innerWidth)),
      panel_left: Math.round(panelRect?.left ?? 0),
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      panel_animation: panelStyle?.animationName ?? "",
      panel_animation_duration: panelStyle?.animationDuration ?? "",
      overlay_covers_viewport: Boolean(
        overlayRect &&
          overlayRect.left <= 1 &&
          overlayRect.top <= 1 &&
          overlayRect.right >= window.innerWidth - 1 &&
          overlayRect.bottom >= window.innerHeight - 1
      ),
      horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      body_text_sample: document.body.textContent?.replace(/\s+/g, " ").trim().slice(0, 600) ?? ""
    };
  }, kind);
}

async function utilityDrawerSnapshot(page, kind) {
  return page.evaluate((drawerKind) => {
    const layer = document.querySelector(`[data-utility-drawer-kind="${drawerKind}"]`);
    const scrim = layer?.querySelector(".notification-scrim");
    const panel = layer?.querySelector(".notification-drawer");
    const layerRect = layer?.getBoundingClientRect();
    const scrimRect = scrim?.getBoundingClientRect();
    const panelRect = panel?.getBoundingClientRect();
    const layerStyle = layer ? getComputedStyle(layer) : null;
    const scrimStyle = scrim ? getComputedStyle(scrim) : null;
    const panelStyle = panel ? getComputedStyle(panel) : null;
    const panelCenter = panelRect ? panelRect.left + panelRect.width / 2 : 0;
    const viewportCenter = window.innerWidth / 2;
    return {
      kind: drawerKind,
      layer_present: Boolean(layer),
      layer_position: layerStyle?.position ?? "",
      layer_z_index: Number.parseInt(layerStyle?.zIndex ?? "0", 10),
      scrim_present: Boolean(scrim),
      scrim_animation: scrimStyle?.animationName ?? "",
      scrim_background: scrimStyle?.backgroundColor ?? "",
      scrim_covers_viewport: Boolean(
        scrimRect &&
          scrimRect.left <= 1 &&
          scrimRect.top <= 1 &&
          scrimRect.right >= window.innerWidth - 1 &&
          scrimRect.bottom >= window.innerHeight - 1
      ),
      panel_present: Boolean(panel),
      panel_visible: Boolean(panelRect && panelRect.width > 320 && panelRect.height > 240),
      panel_width: Math.round(panelRect?.width ?? 0),
      panel_height: Math.round(panelRect?.height ?? 0),
      panel_right_delta: Math.round(Math.abs((panelRect?.right ?? 0) - window.innerWidth)),
      panel_center_delta: Math.round(Math.abs(panelCenter - viewportCenter)),
      panel_animation: panelStyle?.animationName ?? "",
      panel_animation_duration: panelStyle?.animationDuration ?? "",
      layer_covers_viewport: Boolean(
        layerRect &&
          layerRect.left <= 1 &&
          layerRect.top <= 1 &&
          layerRect.right >= window.innerWidth - 1 &&
          layerRect.bottom >= window.innerHeight - 1
      ),
      horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  }, kind);
}

function assertOverlay(snapshot) {
  assert.equal(snapshot.overlay_present, true, `${snapshot.kind} overlay must render`);
  assert.equal(snapshot.overlay_position, "fixed", `${snapshot.kind} overlay must sit above the whole viewport`);
  assert(snapshot.overlay_z_index >= 1000, `${snapshot.kind} overlay must be stacked above the app chrome`);
  assert.equal(snapshot.overlay_covers_viewport, true, `${snapshot.kind} overlay must cover the viewport`);
  assert.equal(snapshot.scrim_present, true, `${snapshot.kind} dim scrim must render`);
  assert.equal(snapshot.scrim_covers_viewport, true, `${snapshot.kind} dim scrim must cover the viewport`);
  assert(snapshot.scrim_alpha >= 0.3, `${snapshot.kind} dim scrim must visibly darken the screen`);
  assert.equal(snapshot.record_panel_present, true, `${snapshot.kind} record panel must remain mounted inside overlay`);
  assert.equal(snapshot.workspace_contract, true, `${snapshot.kind} workspace must use overlay contract`);
  assert.equal(snapshot.panel_visible, true, `${snapshot.kind} overlay panel must be visible`);
  assert(snapshot.panel_width >= 420 && snapshot.panel_width <= 620, `${snapshot.kind} overlay panel must use a right-side drawer width`);
  assert(snapshot.panel_height >= snapshot.viewport_height - 2, `${snapshot.kind} overlay panel must span the viewport height`);
  assert(snapshot.panel_right_delta <= 1, `${snapshot.kind} overlay panel must align to the right edge`);
  assert(snapshot.panel_center_delta > 200, `${snapshot.kind} overlay panel must not remain centered`);
  assert.match(snapshot.panel_animation, /record-overlay-panel-in/, `${snapshot.kind} panel must use the overlay entrance animation`);
  assert.match(snapshot.panel_animation_duration, /0\.24s|240ms/, `${snapshot.kind} panel animation must use the shared panel timing`);
  assert.equal(snapshot.horizontal_overflow, false, `${snapshot.kind} overlay must not create horizontal overflow`);
}

function assertUtilityDrawer(snapshot) {
  assert.equal(snapshot.layer_present, true, `${snapshot.kind} utility layer must render`);
  assert.equal(snapshot.layer_position, "fixed", `${snapshot.kind} utility layer must sit above the viewport`);
  assert(snapshot.layer_z_index >= 100, `${snapshot.kind} utility layer must stack above the shell`);
  assert.equal(snapshot.layer_covers_viewport, true, `${snapshot.kind} utility layer must cover the viewport`);
  assert.equal(snapshot.scrim_present, true, `${snapshot.kind} utility scrim must render`);
  assert.equal(snapshot.scrim_covers_viewport, true, `${snapshot.kind} utility scrim must cover the viewport`);
  assert.match(snapshot.scrim_animation, /record-overlay-scrim-in/, `${snapshot.kind} utility scrim must fade in`);
  assert.equal(snapshot.panel_present, true, `${snapshot.kind} utility drawer must render`);
  assert.equal(snapshot.panel_visible, true, `${snapshot.kind} utility drawer must be visible`);
  assert(snapshot.panel_width >= 390 && snapshot.panel_width <= 460, `${snapshot.kind} utility drawer must use a compact right drawer width`);
  assert(snapshot.panel_right_delta <= 1, `${snapshot.kind} utility drawer must align to the right edge`);
  assert(snapshot.panel_center_delta > 250, `${snapshot.kind} utility drawer must not open as a centered popover`);
  assert.match(snapshot.panel_animation, /notification-drawer-in/, `${snapshot.kind} utility drawer must slide in from the right`);
  assert.match(snapshot.panel_animation_duration, /0\.24s|240ms/, `${snapshot.kind} utility drawer animation must use the shared panel timing`);
  assert.equal(snapshot.horizontal_overflow, false, `${snapshot.kind} utility drawer must not create horizontal overflow`);
}

async function closeOverlayWithEscape(page, kind) {
  await page.keyboard.press("Escape");
  await page.waitForFunction((overlayKind) => !document.querySelector(`[data-record-overlay="${overlayKind}"]`), kind, {
    timeout: 10_000
  });
}

async function main() {
  assert.equal(existsSync(envFilePath), true, ".env.matter-vault-r4.local must exist for packaged desktop QA");
  assert.equal(existsSync(packagedExecutablePath), true, "packaged matter executable must exist");
  mkdirSync(artifactDir, { recursive: true });

  const userDataPath = createUserDataPath();
  const app = await electron.launch({
    executablePath: packagedExecutablePath,
    args: [],
    env: {
      ...process.env,
      MATTER_DESKTOP_ENV_FILE: envFilePath,
      MATTER_DESKTOP_USER_DATA_PATH: userDataPath
    },
    timeout: 45_000
  });

  try {
    const page = await app.firstWindow({ timeout: 45_000 });
    const browserWindow = await app.browserWindow(page);
    await browserWindow.evaluate((window) => window.setBounds({ x: 80, y: 40, width: 1280, height: 900 }));
    await waitForProductShell(page);

    await page.locator("[data-notification-trigger='true']").click({ timeout: 15_000 });
    await page.waitForSelector("[data-utility-drawer-kind='notifications'] .notification-drawer", { timeout: 10_000 });
    await page.waitForTimeout(280);
    const notificationsDrawer = await utilityDrawerSnapshot(page, "notifications");
    assertUtilityDrawer(notificationsDrawer);
    await page.screenshot({ path: notificationScreenshotPath, fullPage: true });
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("[data-utility-drawer-kind='notifications']"), { timeout: 10_000 });

    await page.locator("[data-home-message-trigger='true']").click({ timeout: 15_000 });
    await page.waitForSelector("[data-utility-drawer-kind='messages'] .notification-drawer", { timeout: 10_000 });
    await page.waitForTimeout(280);
    const messagesDrawer = await utilityDrawerSnapshot(page, "messages");
    assertUtilityDrawer(messagesDrawer);
    await page.screenshot({ path: messageScreenshotPath, fullPage: true });
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("[data-utility-drawer-kind='messages']"), { timeout: 10_000 });

    await page.locator("[data-product-axis='clients']").click({ timeout: 15_000 });
    await clickSidebarChild(page, "목록");
    const clientRow = await clickPreferredRow(page, "[data-client-select-row='true']", /그래비티랩스|귀한사람들|새빗켐|DEAL|Project Tempus/);
    await page.waitForSelector("[data-record-overlay='client'] .record-overlay-panel", { timeout: 10_000 });
    await page.waitForTimeout(260);
    const clientOverlay = await overlaySnapshot(page, "client");
    assertOverlay(clientOverlay);
    await page.screenshot({ path: clientScreenshotPath, fullPage: true });
    await closeOverlayWithEscape(page, "client");

    await page.locator("[data-product-axis='matters']").click({ timeout: 15_000 });
    await clickSidebarChild(page, "사건 목록");
    const matterRow = await clickPreferredRow(page, "[data-matter-select-row='true']", /새빗켐|DEAL|Project Tempus|그래비티랩스|귀한사람들/);
    await page.waitForSelector("[data-record-overlay='matter'] .record-overlay-panel", { timeout: 10_000 });
    await page.waitForTimeout(260);
    const matterOverlay = await overlaySnapshot(page, "matter");
    assertOverlay(matterOverlay);
    await page.screenshot({ path: matterScreenshotPath, fullPage: true });
    await closeOverlayWithEscape(page, "matter");

    const result = {
      schema_version: "law-firm-os.desktop-record-overlay-client-matter.v1",
      generated_at: new Date().toISOString(),
      status: "passed",
      launch_target: "packaged_mac_app",
      app_bundle: "apps/desktop/dist/mac/matter.app",
      desktop_user_data_path: userDataPath,
      screenshots: {
        notifications: path.relative(repoRoot, notificationScreenshotPath),
        messages: path.relative(repoRoot, messageScreenshotPath),
        client: path.relative(repoRoot, clientScreenshotPath),
        matter: path.relative(repoRoot, matterScreenshotPath)
      },
      selected_rows: {
        client: clientRow,
        matter: matterRow
      },
      overlays: {
        notifications: notificationsDrawer,
        messages: messagesDrawer,
        client: clientOverlay,
        matter: matterOverlay
      },
      assertions: {
        notification_drawer_slides_from_right: true,
        message_drawer_slides_from_right: true,
        client_modal_above_whole_screen: true,
        matter_modal_above_whole_screen: true,
        dimmed_background: true,
        entrance_animation: true,
        escape_closes_overlay: true,
        horizontal_overflow: false
      }
    };
    writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify({ verdict: "PASS", receipt: path.relative(repoRoot, resultPath), screenshots: result.screenshots }, null, 2));
  } finally {
    await app.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
