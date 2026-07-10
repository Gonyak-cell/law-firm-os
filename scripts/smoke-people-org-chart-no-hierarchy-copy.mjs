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
const screenshotDir = path.join(artifactDir, "people-org-chart-no-hierarchy-copy-2026-07-09");
const resultPath = path.join(artifactDir, "people-org-chart-no-hierarchy-copy-2026-07-09.json");

function createUserDataPath() {
  return mkdtempSync(path.join(tmpdir(), "matter-people-org-chart-qa-"));
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
  await page.waitForTimeout(300);
}

async function clickSidebarChild(page, exactLabel) {
  const child = page.locator(".sidebar-child", { hasText: exactLabel }).filter({ hasText: new RegExp(`^\\s*${exactLabel}\\s*$`) }).first();
  await child.click({ timeout: 15_000 });
  await page.waitForTimeout(300);
}

async function orgChartSnapshot(page) {
  return page.evaluate(() => {
    const root = document.querySelector("[data-hr-org-chart='true']");
    const text = root?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const personBlocks = [...document.querySelectorAll(".hr-org-person")].map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "");
    const groupHeaders = [...document.querySelectorAll(".hr-org-group header")].map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "");
    const findPerson = (name) => personBlocks.find((block) => block.includes(name)) ?? "";
    const staffHeader = groupHeaders.find((header) => header.includes("Staff")) ?? "";
    const forbiddenCopy = ["최상위", "상위"];
    return {
      root_present: Boolean(root),
      text,
      forbidden_matches: forbiddenCopy.filter((copy) => text.includes(copy)),
      person_blocks: {
        seo: findPerson("서지원"),
        yoon: findPerson("윤태리"),
        lee: findPerson("이예진")
      },
      staff_header: staffHeader,
      group_headers: groupHeaders,
      horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });
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
    await browserWindow.evaluate((window) => window.setBounds({ x: 60, y: 40, width: 1500, height: 900 }));
    await waitForProductShell(page);

    await clickAxis(page, "people");
    await clickSidebarChild(page, "조직");
    await page.waitForSelector("[data-hr-org-chart='true']", { timeout: 30_000 });
    await page.waitForFunction(() => document.body.innerText.includes("윤태리") && document.body.innerText.includes("이예진"), null, { timeout: 30_000 });

    const snapshot = await orgChartSnapshot(page);
    assert.equal(snapshot.root_present, true, "People org chart must render");
    assert.deepEqual(snapshot.forbidden_matches, [], "People org chart must not render hierarchy terms");
    assert(snapshot.person_blocks.yoon.includes("윤태리"), "Yoon Tae-ri card must render");
    assert(snapshot.person_blocks.yoon.includes("실장"), "Yoon Tae-ri title must render");
    assert.equal(snapshot.person_blocks.yoon.includes("서지원"), false, "Yoon Tae-ri must not report to Seo Ji-won");
    assert.equal(snapshot.person_blocks.yoon.includes("직속"), false, "Yoon Tae-ri must not show direct reports");
    assert(snapshot.person_blocks.lee.includes("이예진"), "Lee Ye-jin card must render");
    assert.equal(snapshot.person_blocks.lee.includes("윤태리"), false, "Lee Ye-jin must not report to Yoon Tae-ri");
    assert.equal(snapshot.staff_header.includes("AMIC Law"), false, "Staff header must not render parent organization copy");
    assert.equal(snapshot.horizontal_overflow, false, "People org chart must not create horizontal overflow");

    const screenshot = screenshotPath("people-org-chart");
    await page.screenshot({ path: screenshot, fullPage: true });

    const result = {
      schema_version: "law-firm-os.people-org-chart-no-hierarchy-copy.v1",
      generated_at: new Date().toISOString(),
      verdict: "PASS",
      app_bundle: "apps/desktop/dist/mac/matter.app",
      desktop_user_data_path: userDataPath,
      snapshot,
      screenshots: {
        people_org_chart: path.relative(repoRoot, screenshot)
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
