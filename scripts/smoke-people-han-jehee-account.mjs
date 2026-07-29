#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const envFilePath = path.join(repoRoot, ".env.matter-vault-r4.local");
const packagedExecutablePath = path.join(repoRoot, "apps/desktop/dist/mac/matter.app/Contents/MacOS/matter");
const packagedAccountSeedPath = path.join(
  repoRoot,
  "apps/desktop/dist/mac/matter.app/Contents/Resources/app/runtime/apps/api/src/matter-vault-user-registration-seed.json"
);
const artifactDir = path.join(repoRoot, "artifacts/manual-qa");
const screenshotDir = path.join(artifactDir, "people-han-jehee-account-2026-07-09");
const resultPath = path.join(artifactDir, "people-han-jehee-account-2026-07-09.json");

function createUserDataPath() {
  return mkdtempSync(path.join(tmpdir(), "matter-people-han-jehee-qa-"));
}

function screenshotPath(name) {
  return path.join(screenshotDir, `${name}.png`);
}

async function waitForProductShell(page) {
  await Promise.race([
    page.waitForSelector("[data-product-axis-nav='global-rail']", { timeout: 45_000 }),
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

async function clickSidebarChild(page, exactLabel) {
  const child = page.locator(".sidebar-child", { hasText: exactLabel }).filter({ hasText: new RegExp(`^\\s*${exactLabel}\\s*$`) }).first();
  await child.click({ timeout: 15_000 });
  await page.waitForTimeout(350);
}

function packagedAccountSeedSnapshot() {
  const seed = JSON.parse(readFileSync(packagedAccountSeedPath, "utf8"));
  const hanAccount = (seed.users ?? []).find((user) => String(user.email).toLowerCase() === "jh731@amic.kr");
  return {
    path: path.relative(repoRoot, packagedAccountSeedPath),
    count: seed.users?.length ?? 0,
    account_count: seed.source?.account_count ?? null,
    han_account: hanAccount ? {
      email: hanAccount.email,
      display_name: hanAccount.display_name,
      source_title: hanAccount.source_title,
      status: hanAccount.status,
      role_ids: hanAccount.role_ids ?? [],
      group_ids: hanAccount.group_ids ?? [],
      scopes: hanAccount.scopes ?? []
    } : null,
    production_idp_account_creation: seed.registration_boundary?.production_idp_account_creation === true
  };
}

async function desktopAccountBridgeState(page) {
  return page.evaluate(async () => {
    const response = await window.matterSession?.accounts?.();
    return {
      ok: response?.ok === true,
      count: response?.count ?? response?.users?.length ?? 0,
      reason: response?.reason ?? null,
      token_material_returned: response?.token_material_returned === true
    };
  });
}

async function desktopLoginSnapshot(page) {
  return page.evaluate(async () => {
    const response = await window.matterSession?.login?.({ email: "jh731@amic.kr", password: "local-dev-smoke" });
    return {
      ok: response?.ok === true,
      email: response?.session?.email,
      display_name: response?.session?.display_name,
      role_profile_id: response?.session?.role_profile_id,
      role_ids: response?.session?.role_ids ?? [],
      scopes: response?.session?.scopes ?? [],
      token_material_returned: response?.token_material_returned === true
    };
  });
}

async function openHanProfile(page) {
  const row = page.locator("button.hr-roster-person").filter({ hasText: "한제희" }).first();
  await row.waitFor({ state: "visible", timeout: 30_000 });
  await row.click();
  const panel = page.locator('[data-people-detail-panel="open"]').first();
  await panel.waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForFunction(() => {
    const panelText = document.querySelector('[data-people-detail-panel="open"]')?.textContent ?? "";
    const profile = document.querySelector('[data-people-professional-profile-kind="attorney"]')?.textContent ?? "";
    return panelText.includes("한제희") &&
      panelText.includes("고문변호사") &&
      profile.includes("대한민국 변호사") &&
      profile.includes("대한민국 공인회계사");
  }, null, { timeout: 20_000 });
  return panel.innerText();
}

async function peopleScreenSnapshot(page) {
  return page.evaluate(() => {
    const text = document.body.innerText.replace(/\s+/g, " ").trim();
    const hanRow = [...document.querySelectorAll("button.hr-roster-person")]
      .find((element) => element.textContent?.includes("한제희"));
    const orgText = document.querySelector("[data-hr-org-chart='true']")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    return {
      visible_text_sample: text.slice(0, 900),
      han_row_present: Boolean(hanRow),
      has_han_name: text.includes("한제희"),
      has_han_email: text.includes("jh731@amic.kr"),
      has_han_title: text.includes("고문변호사"),
      org_chart_has_han: orgText.includes("한제희"),
      horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });
}

async function main() {
  assert.equal(existsSync(envFilePath), true, ".env.matter-vault-r4.local must exist for packaged desktop QA");
  assert.equal(existsSync(packagedExecutablePath), true, "packaged matter executable must exist");
  assert.equal(existsSync(packagedAccountSeedPath), true, "packaged account seed must exist");
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
    await browserWindow.evaluate((window) => window.setBounds({ x: 70, y: 40, width: 1500, height: 920 }));
    await waitForProductShell(page);

    const accountSeed = packagedAccountSeedSnapshot();
    assert.equal(accountSeed.count, 12, "packaged account seed must contain the 12 registered local accounts");
    assert.equal(accountSeed.account_count, 11, "packaged account seed source count must include the 11 non-QA accounts");
    assert(accountSeed.han_account, "Han Jehee account must exist in packaged account seed");
    assert.equal(accountSeed.han_account.email, "jh731@amic.kr");
    assert.equal(accountSeed.han_account.display_name, "한제희");
    assert.equal(accountSeed.han_account.source_title, "고문변호사");
    assert(accountSeed.han_account.role_ids.includes("attorney"), "Han Jehee account must have attorney role");
    assert.equal(accountSeed.production_idp_account_creation, false, "packaged account seed must not claim production IDP account creation");

    const accountBridge = await desktopAccountBridgeState(page);
    assert.equal(accountBridge.ok, true, "desktop account bridge must respond");
    assert.equal(accountBridge.token_material_returned, false, "desktop account bridge must not return token material");

    await clickAxis(page, "people");
    await page.waitForSelector("button.hr-roster-person", { timeout: 30_000 });
    await page.waitForFunction(() => document.body.innerText.includes("한제희") && document.body.innerText.includes("jh731@amic.kr"), null, { timeout: 30_000 });
    const roster = await peopleScreenSnapshot(page);
    assert.equal(roster.han_row_present, true, "Han Jehee roster row must render");
    assert.equal(roster.has_han_name, true, "Han Jehee name must be visible in roster");
    assert.equal(roster.has_han_email, true, "Han Jehee email must be visible in roster");
    assert.equal(roster.has_han_title, true, "Han Jehee title must be visible in roster");
    await page.screenshot({ path: screenshotPath("people-roster"), fullPage: true });

    const profileText = await openHanProfile(page);
    assert(profileText.includes("한제희"), "Han Jehee profile must render");
    assert(profileText.includes("고문변호사"), "Han Jehee title must render");
    assert(profileText.includes("대한민국 변호사"), "Han Jehee attorney qualification must render");
    assert(profileText.includes("대한민국 공인회계사"), "Han Jehee KICPA qualification must render");
    await page.screenshot({ path: screenshotPath("people-profile"), fullPage: true });
    await page.locator("button.people-detail-close").first().click({ timeout: 10_000 });

    await clickSidebarChild(page, "조직");
    await page.waitForSelector("[data-hr-org-chart='true']", { timeout: 30_000 });
    await page.waitForFunction(() => document.querySelector("[data-hr-org-chart='true']")?.textContent?.includes("한제희"), null, { timeout: 30_000 });
    await page.screenshot({ path: screenshotPath("people-org-chart"), fullPage: true });

    const orgChart = await peopleScreenSnapshot(page);
    assert.equal(orgChart.has_han_name, true, "Han Jehee name must be visible in org chart");
    assert.equal(orgChart.has_han_title, true, "Han Jehee title must be visible in org chart");
    assert.equal(orgChart.org_chart_has_han, true, "Han Jehee must render in org chart");
    assert.equal(orgChart.horizontal_overflow, false, "People org chart must not create horizontal overflow");

    const login = await desktopLoginSnapshot(page);
    assert.equal(login.ok, true, "Han Jehee desktop login must succeed through session bridge");
    assert.equal(login.email, "jh731@amic.kr");
    assert.equal(login.display_name, "한제희");
    assert.equal(login.role_profile_id, "lawos_attorney");
    assert(login.scopes.includes("hrx.legal_people.read"), "Han Jehee session must include legal people read scope");
    assert.equal(login.token_material_returned, false, "desktop login must not return token material");

    const result = {
      schema_version: "law-firm-os.people-han-jehee-account.v1",
      generated_at: new Date().toISOString(),
      verdict: "PASS",
      app_bundle: "apps/desktop/dist/mac/matter.app",
      desktop_user_data_path: userDataPath,
      account_seed: accountSeed,
      account_bridge: accountBridge,
      login,
      people: {
        roster,
        org_chart: orgChart
      },
      screenshots: {
        people_roster: path.relative(repoRoot, screenshotPath("people-roster")),
        people_profile: path.relative(repoRoot, screenshotPath("people-profile")),
        people_org_chart: path.relative(repoRoot, screenshotPath("people-org-chart"))
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
