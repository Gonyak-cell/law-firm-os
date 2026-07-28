#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const envFilePath = path.join(repoRoot, ".env.matter-vault-r4.local");
const packagedExecutablePath = path.join(repoRoot, "apps/desktop/dist/mac/matter.app/Contents/MacOS/matter");
const evidenceDir = path.join(repoRoot, "docs/lazycodex/evidence/matter-profile/2026-07-10");
const receiptPath = path.join(evidenceDir, "packaged-desktop-smoke.json");
const packagedQaEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith("LAWOS_") && ![
    "MATTER_DESKTOP_RENDERER_URL",
    "MATTER_DESKTOP_API_BASE_URL",
    "MATTER_DESKTOP_RUNTIME_BASE_URL",
    "MATTER_DESKTOP_RUNTIME_STORE_DIR",
  ].includes(name)),
);

const fixtures = [
  ["civil", /^그래비티랩스\/LIT\/CIV\/특허권침해금지/, "civil_litigation", "사건 정보", ["민사소송", "관할법원", "재판부 전화번호", "담당주무관"]],
  ["criminal", /^김현미\/LIT\/CRM\/정보통신망법위반\(명예훼손\)/, "criminal_litigation", "사건 정보", ["형사소송", "형제번호", "담당 경찰", "검찰청", "담당검사", "형사소송 사건번호", "담당자 전화번호"]],
  ["administrative", /^강영권\/LIT\/ADM\/세무조사대응/, "administrative_litigation", "사건 정보", ["행정소송", "처분청", "처분명", "관할법원", "기관 담당자"]],
  ["deal", /^KWM\/DEAL\/MOU/, "deal", "거래 정보", ["Deal", "거래규모", "진행단계", "상대방 자문펌", "매각자문", "인수자문", "회계법인", "주주 직접 연락"]],
  ["corporate-advisory", /^귀한사람들\/Advisory\/retainer/, "corporate_advisory", "자문 정보", ["기업자문", "자문 주제", "요청 범위", "수임 형태", "의뢰 담당자", "납기일"]]
];

function createUserDataPath() {
  return mkdtempSync(path.join(tmpdir(), "matter-profile-packaged-qa-"));
}

async function clickSidebarSection(page, section, group) {
  const sidebar = page.locator("[data-context-sidebar='matters']");
  await sidebar.waitFor({ timeout: 15_000 });
  const child = sidebar.locator(`[data-sidebar-section='${section}']`);
  if (await child.count() === 0) {
    await sidebar.locator(`[data-sidebar-group='${group}'] .sidebar-group-toggle`).click({ timeout: 15_000 });
  }
  await child.click({ timeout: 15_000 });
}

async function main() {
  assert.equal(existsSync(envFilePath), true, ".env.matter-vault-r4.local must exist for packaged Matter profile QA");
  assert.equal(existsSync(packagedExecutablePath), true, "packaged matter executable must exist");
  mkdirSync(evidenceDir, { recursive: true });

  const userDataPath = createUserDataPath();
  const app = await electron.launch({
    executablePath: packagedExecutablePath,
    args: ["--disable-gpu"],
    env: {
      ...packagedQaEnvironment,
      MATTER_DESKTOP_ENV_FILE: envFilePath,
      MATTER_DESKTOP_LOCAL_API_DISABLED: "0",
      MATTER_DESKTOP_LOCAL_API_ENABLED: "1",
      MATTER_DESKTOP_RUNTIME_STORE_DIR: path.join(userDataPath, "runtime-stores"),
      MATTER_DESKTOP_USER_DATA_PATH: userDataPath
    },
    timeout: 45_000
  });

  try {
    const page = await app.firstWindow({ timeout: 45_000 });
    const window = await app.browserWindow(page);
    await window.evaluate((target) => target.setBounds({ x: 80, y: 40, width: 1440, height: 1000 }));
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.match(page.url(), /matter\.app\/Contents\/Resources\/app\/src\/renderer\/web\/index\.html/, "QA must load the packaged renderer, not a development URL");
    assert.match(await page.evaluate(() => window.matterSession?.desktopApiBaseUrl ?? ""), /^http:\/\/127\.0\.0\.1:\d+$/, "QA must use the isolated local API");
    await page.waitForSelector("[data-product-axis-nav='top-header']", { timeout: 45_000 });
    await page.locator("[data-profile-trigger='true']").click({ timeout: 15_000 });
    const userProfile = page.locator("[data-user-profile-surface='my-profile']");
    await userProfile.waitFor({ timeout: 15_000 });
    await page.waitForFunction(() => document.querySelector("[data-user-profile-surface='my-profile']")?.getAttribute("data-profile-api-state") !== "loading", { timeout: 15_000 });
    assert.equal(await userProfile.getAttribute("data-profile-api-state"), "populated", "packaged profile API must not render the API error state");
    const [sessionIdentity, renderedProfileIdentity] = await Promise.all([
      page.evaluate(async () => {
        const status = await window.matterSession?.status?.();
        return {
          state: status?.state ?? null,
          user_id: status?.user_id ?? null,
          display_name: status?.display_name ?? null
        };
      }),
      userProfile.evaluate((surface) => ({
        member_id: surface.getAttribute("data-profile-member"),
        display_name: surface.querySelector("h1")?.textContent?.trim() ?? null
      }))
    ]);
    assert.deepEqual(sessionIdentity, {
      state: "signed_in",
      user_id: "user_amic_jwsuh",
      display_name: "서지원"
    }, "isolated packaged profile QA must use the 서지원 signed-in session");
    assert.deepEqual(renderedProfileIdentity, {
      member_id: "emp_amic_jwsuh",
      display_name: "서지원"
    }, "packaged profile must render the signed-in 서지원 identity");
    const profileText = await userProfile.innerText();
    for (const expectedText of [
      "대표변호사 / AMIC Law",
      "Legal",
      "대한민국",
      "jwsuh@amic.kr",
      "법무법인 아믹 대표변호사 (2025~현재)",
      "서울대학교 교육학과 학사",
      "대한민국 변호사",
      "M&A"
    ]) {
      assert.match(profileText, new RegExp(expectedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `packaged profile must render ${expectedText}`);
    }
    assert.doesNotMatch(profileText, /세션 사용자/, "packaged profile must not render the generic session fallback");
    const profilePhoto = await userProfile.locator(".matter-profile-photo-large img").evaluate((image) => ({
      complete: image.complete,
      natural_width: image.naturalWidth,
      natural_height: image.naturalHeight,
      is_supported_data_image: /^data:image\/(?:png|jpeg|webp);base64,/.test(image.getAttribute("src") ?? "")
    }));
    assert.equal(profilePhoto.complete, true, "packaged profile photo must finish loading");
    assert.ok(profilePhoto.natural_width > 0 && profilePhoto.natural_height > 0, "packaged profile photo must decode");
    assert.equal(profilePhoto.is_supported_data_image, true, "packaged profile photo must use an allowed data-image MIME");
    await userProfile.screenshot({ path: path.join(evidenceDir, "profile-api-packaged.png") });
    await page.locator("[data-profile-return-to-work='true']").click({ timeout: 15_000 });
    await page.waitForSelector("[data-product-axis-nav='top-header']", { timeout: 15_000 });
    await page.locator("[data-product-axis='matters']").click({ timeout: 15_000 });
    await clickSidebarSection(page, "matters-list", "matter-home");
    await page.locator("[data-matter-select-row='true']").first().waitFor({ timeout: 30_000 });

    const passedFixtures = [];
    for (const [name, buttonName, profileKind, sectionLabel, labels] of fixtures) {
      const button = page.getByRole("button", { name: buttonName });
      assert.equal(await button.count(), 1, `${name} fixture must be unique in packaged app`);
      await button.click();
      const panel = page.locator("[data-matter-profile-panel='true']");
      await panel.waitFor({ timeout: 15_000 });
      await page.waitForTimeout(300);
      assert.equal(await panel.getAttribute("data-matter-profile-kind"), profileKind, `${name} profile kind`);
      assert.equal(await panel.locator(".matter-profile-heading .eyebrow").innerText(), sectionLabel, `${name} section label`);
      const text = await panel.innerText();
      for (const label of labels) assert.match(text, new RegExp(label), `${name} must show ${label}`);
      assert.match(text, /연락처는 CRM 참조로만 연결합니다/, `${name} contact policy`);
      assert.match(text, /미입력 · 검토 필요/, `${name} evidence review state`);
      assert.equal(await panel.locator(".matter-stakeholder-form").count(), 0, `${name} stakeholder form starts collapsed`);
      await panel.screenshot({ path: path.join(evidenceDir, `matter-profile-packaged-${name}.png`) });
      if (name === "civil") {
        await panel.getByRole("button", { name: "관계자 추가" }).click();
        const stakeholderForm = panel.locator(".matter-stakeholder-form");
        await stakeholderForm.waitFor({ timeout: 15_000 });
        await stakeholderForm.locator("input").first().fill("패키지 QA 담당주무관");
        await page.waitForTimeout(500);
        await stakeholderForm.getByRole("button", { name: "관계자 추가" }).click();
        try {
          await page.waitForFunction(
            (element) => element?.textContent?.includes("패키지 QA 담당주무관"),
            await panel.locator("[data-matter-stakeholder-list='true']").elementHandle(),
            { timeout: 15_000 },
          );
        } catch {
          throw new Error(`packaged stakeholder write did not render: ${await panel.innerText()}`);
        }
        await panel.getByRole("button", { name: "편집" }).click();
        const profileForm = panel.locator(".matter-profile-form");
        await profileForm.waitFor({ timeout: 15_000 });
        await profileForm.locator("label").filter({ hasText: "담당주무관" }).locator("select").selectOption({ index: 1 });
        await profileForm.getByRole("button", { name: "저장" }).click();
        await panel.getByRole("button", { name: "편집" }).waitFor({ timeout: 15_000 });
        await panel.screenshot({ path: path.join(evidenceDir, `matter-profile-packaged-${name}.png`) });
      }
      if (name === "corporate-advisory") {
        await panel.getByRole("button", { name: "편집" }).click();
        const form = panel.locator(".matter-profile-form");
        await form.waitFor({ timeout: 15_000 });
        await form.locator("input").first().fill("패키지 QA 기업자문");
        await page.waitForTimeout(500);
        await form.getByRole("button", { name: "저장" }).click();
        await panel.getByRole("button", { name: "편집" }).waitFor({ timeout: 15_000 });
        await panel.getByText("패키지 QA 기업자문", { exact: true }).waitFor({ timeout: 15_000 });
      }
      passedFixtures.push(name);
      await page.locator("[data-record-overlay='matter'] .record-overlay-scrim").click();
      await panel.waitFor({ state: "hidden" });
    }

    writeFileSync(receiptPath, `${JSON.stringify({
      schema_version: "law-firm-os.matter-profile.packaged-desktop.v1",
      generated_at: new Date().toISOString(),
      status: "passed",
      launch_target: "apps/desktop/dist/mac/matter.app",
      runtime_profile: "isolated_local_qa",
      profile_api_state: "populated",
      profile_identity: {
        session: sessionIdentity,
        rendered: renderedProfileIdentity
      },
      profile_contract: {
        identity_and_role: true,
        organization: true,
        authenticated_contact: true,
        career: true,
        education: true,
        qualification: true,
        practice_area: true,
        photo_decoded: true,
        generic_session_fallback_absent: true
      },
      fixtures: passedFixtures,
      public_release: false,
      production_go_live: false
    }, null, 2)}\n`);
    console.log(JSON.stringify({ verdict: "PASS", receipt: path.relative(repoRoot, receiptPath), fixtures: passedFixtures }, null, 2));
  } finally {
    await app.close().catch(() => {});
    rmSync(userDataPath, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
