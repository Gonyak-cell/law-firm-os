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
const screenshotDir = path.join(artifactDir, "client-matter-dashboard-r1-2026-07-09");
const resultPath = path.join(artifactDir, "client-matter-dashboard-r1-2026-07-09.json");

function createUserDataPath() {
  return mkdtempSync(path.join(tmpdir(), "matter-dashboard-r1-qa-"));
}

function screenshotPath(name) {
  return path.join(screenshotDir, `${name}.png`);
}

async function waitForProductShell(page) {
  await Promise.race([
    page.waitForSelector("[data-product-axis-nav='top-header']", { timeout: 45_000 }),
    page.waitForSelector("[data-login-email]", { timeout: 45_000 }).then(async () => {
      const diagnostics = await page.evaluate(() => ({
        loginEmail: Boolean(document.querySelector("[data-login-email]")),
        loginResult: document.querySelector("[data-login-result]")?.textContent?.trim() ?? "",
        runtimeLabel: document.querySelector("[data-runtime-label]")?.textContent?.trim() ?? ""
      }));
      throw new Error(`App stayed on login screen: ${JSON.stringify(diagnostics)}`);
    })
  ]);
}

async function clickAxis(page, axis) {
  await page.locator(`[data-product-axis='${axis}']`).click({ timeout: 15_000 });
  await page.waitForTimeout(350);
}

async function dashboardSnapshot(page, kind) {
  return page.evaluate((dashboardKind) => {
    const root = document.querySelector(`[data-${dashboardKind}-dashboard="true"]`);
    const kpis = document.querySelector(`[data-${dashboardKind}-dashboard-kpis="true"]`);
    const queue = document.querySelector(`[data-${dashboardKind}-priority-queue="true"]`);
    const table = document.querySelector(`[data-${dashboardKind}-dashboard-table="true"]`);
    const text = document.body.innerText.replace(/\s+/g, " ").trim();
    return {
      kind: dashboardKind,
      root_present: Boolean(root),
      kpis_present: Boolean(kpis),
      queue_present: Boolean(queue),
      table_present: Boolean(table),
      visible_text: text,
      visible_text_chars: text.length,
      text_sample: text.slice(0, 700),
      old_client_overview_present: Boolean(document.querySelector("[data-client-overview-panel='true']")),
      matter_command_loading_visible: text.includes("Matter 현황을 불러오는 중입니다"),
      horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  }, kind);
}

function assertDashboard(snapshot, expectedText) {
  assert.equal(snapshot.root_present, true, `${snapshot.kind} dashboard root must render`);
  assert.equal(snapshot.kpis_present, true, `${snapshot.kind} dashboard KPI cards must render`);
  assert.equal(snapshot.queue_present, true, `${snapshot.kind} dashboard priority queue must render`);
  assert.equal(snapshot.table_present, true, `${snapshot.kind} dashboard operation table must render`);
  assert.equal(snapshot.horizontal_overflow, false, `${snapshot.kind} dashboard must not create horizontal overflow`);
  for (const text of expectedText) {
    assert(snapshot.visible_text.includes(text), `${snapshot.kind} dashboard must include ${text}`);
  }
}

async function openFirstRecord(page, rowSelector, overlayKind) {
  const row = page.locator(rowSelector).first();
  await row.waitFor({ timeout: 30_000 });
  const label = ((await row.textContent().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
  await row.locator("button").first().click({ timeout: 15_000 });
  await page.waitForSelector(`[data-record-overlay='${overlayKind}'] .record-overlay-panel`, { timeout: 15_000 });
  await page.waitForTimeout(250);
  return label;
}

async function closeOverlay(page, overlayKind) {
  await page.keyboard.press("Escape");
  await page.waitForFunction((kind) => !document.querySelector(`[data-record-overlay="${kind}"]`), overlayKind, { timeout: 10_000 });
}

async function main() {
  assert.equal(existsSync(envFilePath), true, ".env.matter-vault-r4.local must exist for packaged desktop QA");
  assert.equal(existsSync(packagedExecutablePath), true, "packaged matter executable must exist");
  mkdirSync(artifactDir, { recursive: true });
  mkdirSync(screenshotDir, { recursive: true });

  const userDataPath = createUserDataPath();
  const app = await electron.launch({
    executablePath: packagedExecutablePath,
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
    await browserWindow.evaluate((window) => window.setBounds({ x: 80, y: 40, width: 1360, height: 920 }));
    await waitForProductShell(page);

    await clickAxis(page, "clients");
    await page.waitForSelector("[data-client-dashboard='true']", { timeout: 30_000 });
    const clientDashboard = await dashboardSnapshot(page, "client");
    assertDashboard(clientDashboard, ["활성 Client", "수임 전 기회", "우선 확인"]);
    assert.equal(clientDashboard.old_client_overview_present, false, "Client overview panel must not render on the dashboard");
    await page.screenshot({ path: screenshotPath("client-dashboard"), fullPage: true });
    const clientRow = await openFirstRecord(page, "[data-client-dashboard-table='true'] [data-client-select-row='true']", "client");
    await page.screenshot({ path: screenshotPath("client-overlay"), fullPage: true });
    await closeOverlay(page, "client");

    await clickAxis(page, "matters");
    await page.waitForSelector("[data-matter-dashboard='true']", { timeout: 30_000 });
    const matterDashboard = await dashboardSnapshot(page, "matter");
    assertDashboard(matterDashboard, ["진행 중 Matter", "7일 내 기한", "우선 확인"]);
    assert.equal(matterDashboard.matter_command_loading_visible, false, "Matter home must not render the single-matter command loading state");
    await page.screenshot({ path: screenshotPath("matter-dashboard"), fullPage: true });
    const matterRow = await openFirstRecord(page, "[data-matter-dashboard-table='true'] [data-matter-select-row='true']", "matter");
    await page.screenshot({ path: screenshotPath("matter-overlay"), fullPage: true });
    await closeOverlay(page, "matter");

    const result = {
      schema_version: "law-firm-os.client-matter-dashboard-r1.v1",
      generated_at: new Date().toISOString(),
      verdict: "PASS",
      app_bundle: "apps/desktop/dist/mac/matter.app",
      desktop_user_data_path: userDataPath,
      selected_rows: {
        client: clientRow,
        matter: matterRow
      },
      dashboards: {
        client: clientDashboard,
        matter: matterDashboard
      },
      screenshots: {
        client_dashboard: path.relative(repoRoot, screenshotPath("client-dashboard")),
        client_overlay: path.relative(repoRoot, screenshotPath("client-overlay")),
        matter_dashboard: path.relative(repoRoot, screenshotPath("matter-dashboard")),
        matter_overlay: path.relative(repoRoot, screenshotPath("matter-overlay"))
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
