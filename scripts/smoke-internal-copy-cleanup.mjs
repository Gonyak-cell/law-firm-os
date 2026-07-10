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
const resultPath = path.join(artifactDir, "desktop-internal-copy-cleanup-2026-07-09.json");
const screenshotDir = path.join(artifactDir, "desktop-internal-copy-cleanup-2026-07-09");

const forbiddenCopy = [
  "권한 기준에 맞춰 표시됩니다",
  "병합 검토 상태는",
  "데이터 보강 상태는",
  "보고서와 손익은",
  "권한 기준 적용",
  "권한이 있는 정보만 표시됩니다",
  "권한이 있는 구성원 정보만 표시",
  "검토가 끝나면",
  "제공자 receipt",
  "제공자 차단",
  "공급자 차단",
  "조건부 전역화 항목",
  "런타임 연결과 권한 컨텍스트",
  "Matter app 원천",
  "bridge status read",
  "fail-closed",
  "write=false",
  "reference-only",
  "문서 바이트",
  "원본 저장 경로",
  "본문과 병합 값은 숨깁",
  "수신자와 본문 원문은 숨깁",
  "본문 비공개",
  "원본 행 미노출"
];

function createUserDataPath() {
  return mkdtempSync(path.join(tmpdir(), "matter-internal-copy-qa-"));
}

function screenshotPath(name) {
  return path.join(screenshotDir, `${name}.png`);
}

async function visibleText(page) {
  return page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").trim());
}

async function waitForProductShell(page) {
  await Promise.race([
    page.waitForSelector("[data-product-axis-nav='top-header']", { timeout: 45_000 }),
    page.waitForSelector("[data-login-email]", { timeout: 45_000 }).then(async () => {
      const diagnostics = await page.evaluate(() => ({
        loginEmail: Boolean(document.querySelector("[data-login-email]")),
        loginResult: document.querySelector("[data-login-result]")?.textContent?.trim() ?? "",
        runtimeLabel: document.querySelector("[data-runtime-label]")?.textContent?.trim() ?? "",
        accountCount: document.querySelector("[data-account-count]")?.textContent?.trim() ?? ""
      }));
      throw new Error(`App stayed on login screen: ${JSON.stringify(diagnostics)}`);
    })
  ]);
  await page.waitForSelector("[data-product-axis='clients']", { timeout: 30_000 });
  await page.waitForSelector("[data-product-axis='matters']", { timeout: 30_000 });
}

async function assertNoForbidden(page, surface) {
  const text = await visibleText(page);
  const matches = forbiddenCopy.filter((copy) => text.includes(copy));
  assert.deepEqual(matches, [], `${surface} must not render internal/developer copy`);
  return {
    surface,
    visible_text_chars: text.length,
    forbidden_matches: matches,
    sample: text.slice(0, 500)
  };
}

async function clickAxis(page, axis) {
  await page.locator(`[data-product-axis='${axis}']`).click({ timeout: 15_000 });
  await page.waitForTimeout(350);
}

async function clickSidebarChild(page, exactLabel) {
  const child = page.locator(".sidebar-child", { hasText: exactLabel }).filter({ hasText: new RegExp(`^\\s*${exactLabel}\\s*$`) }).first();
  await child.click({ timeout: 15_000 });
  await page.waitForTimeout(350);
}

async function openFirstRecord(page, rowSelector, overlayKind) {
  const row = page.locator(rowSelector).first();
  await row.waitFor({ timeout: 30_000 });
  const label = ((await row.textContent().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
  await row.locator("button").first().click({ timeout: 15_000 });
  await page.waitForSelector(`[data-record-overlay='${overlayKind}'] .record-overlay-panel`, { timeout: 10_000 });
  await page.waitForTimeout(350);
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
    await browserWindow.evaluate((window) => window.setBounds({ x: 80, y: 40, width: 1280, height: 900 }));
    await waitForProductShell(page);

    const surfaces = [];
    const screenshots = {};
    const selectedRows = {};

    await clickAxis(page, "clients");
    surfaces.push(await assertNoForbidden(page, "clients-home"));
    screenshots.clients_home = path.relative(repoRoot, screenshotPath("clients-home"));
    await page.screenshot({ path: screenshotPath("clients-home"), fullPage: true });
    await clickSidebarChild(page, "목록");
    selectedRows.client = await openFirstRecord(page, "[data-client-select-row='true']", "client");
    surfaces.push(await assertNoForbidden(page, "client-overlay"));
    screenshots.client_overlay = path.relative(repoRoot, screenshotPath("client-overlay"));
    await page.screenshot({ path: screenshotPath("client-overlay"), fullPage: true });
    await closeOverlay(page, "client");

    await clickAxis(page, "people");
    surfaces.push(await assertNoForbidden(page, "people"));
    screenshots.people = path.relative(repoRoot, screenshotPath("people"));
    await page.screenshot({ path: screenshotPath("people"), fullPage: true });

    await clickAxis(page, "matters");
    surfaces.push(await assertNoForbidden(page, "matters-home"));
    screenshots.matters_home = path.relative(repoRoot, screenshotPath("matters-home"));
    await page.screenshot({ path: screenshotPath("matters-home"), fullPage: true });
    await clickSidebarChild(page, "사건 목록");
    selectedRows.matter = await openFirstRecord(page, "[data-matter-select-row='true']", "matter");
    surfaces.push(await assertNoForbidden(page, "matter-overlay"));
    screenshots.matter_overlay = path.relative(repoRoot, screenshotPath("matter-overlay"));
    await page.screenshot({ path: screenshotPath("matter-overlay"), fullPage: true });
    await closeOverlay(page, "matter");

    await clickAxis(page, "vault");
    surfaces.push(await assertNoForbidden(page, "vault"));
    screenshots.vault = path.relative(repoRoot, screenshotPath("vault"));
    await page.screenshot({ path: screenshotPath("vault"), fullPage: true });

    await clickAxis(page, "portal");
    surfaces.push(await assertNoForbidden(page, "portal"));
    screenshots.portal = path.relative(repoRoot, screenshotPath("portal"));
    await page.screenshot({ path: screenshotPath("portal"), fullPage: true });

    const result = {
      schema_version: "law-firm-os.desktop-internal-copy-cleanup.v1",
      generated_at: new Date().toISOString(),
      verdict: "PASS",
      app_bundle: "apps/desktop/dist/mac/matter.app",
      desktop_user_data_path: userDataPath,
      forbidden_copy_checked: forbiddenCopy,
      selected_rows: selectedRows,
      surfaces,
      screenshots
    };

    writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify({ verdict: "PASS", receipt: path.relative(repoRoot, resultPath), screenshots }, null, 2));
  } finally {
    await app.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
