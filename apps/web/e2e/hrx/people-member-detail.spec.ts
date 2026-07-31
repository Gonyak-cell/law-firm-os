import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  openPeopleOverviewPage,
  repoRoot,
  startPeopleOverviewHarness,
} from "../../test/people-overview-test-support.mjs";

async function sha256(path: string) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function scrollIntoVisibleViewport(locator: any) {
  await locator.scrollIntoViewIfNeeded();
  await locator.waitFor({ state: "visible" });
  const metrics = await locator.evaluate((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return {
      top: Math.round(rect.top),
      right: Math.round(rect.right),
      bottom: Math.round(rect.bottom),
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      visible_width: Math.max(0, Math.round(Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0))),
      visible_height: Math.max(0, Math.round(Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0))),
    };
  });
  assert.ok(metrics.visible_width > 0, "member drawer must intersect the viewport horizontally");
  assert.ok(metrics.visible_height > 0, "member drawer must intersect the viewport vertically");
  return metrics;
}

test("People member detail runner exercises the real three-tab drawer", async () => {
  const fixture = await startPeopleOverviewHarness();
  const evidenceDir = join(repoRoot, "artifacts/people-v2/PEO-TUW-027");
  await mkdir(evidenceDir, { recursive: true });
  const receipt: {
    schema_version: string;
    captured_at: string | null;
    browser: Record<string, string>;
    viewport: { width: number; height: number };
    source_files: Array<{ file: string; sha256: string }>;
    tabs: Array<Record<string, unknown>>;
  } = {
    schema_version: "lawos.people-v2.member-detail-visual-evidence.v1",
    captured_at: null,
    browser: {
      locale: "ko-KR",
      timezone: "Asia/Seoul",
    },
    viewport: { width: 1440, height: 1000 },
    source_files: [],
    tabs: [],
  };
  try {
    const page = await openPeopleOverviewPage(fixture);
    const browserConfig = await page.evaluate(() => ({
      navigator_language: navigator.language,
      formatter_locale: new Intl.DateTimeFormat().resolvedOptions().locale,
      timezone: new Intl.DateTimeFormat().resolvedOptions().timeZone,
    }));
    assert.equal(browserConfig.navigator_language, "ko-KR");
    assert.equal(browserConfig.timezone, "Asia/Seoul");
    receipt.browser = browserConfig;
    await page.locator('[data-people-timeline-member="emp-1"] .people-timeline-member').click();
    const drawer = page.locator('[data-people-detail-panel="open"]');
    await drawer.waitFor();
    assert.equal(new URL(page.url()).searchParams.get("tab"), "today");
    const todayTab = page.getByRole("tab", { name: "오늘", selected: true });
    await todayTab.waitFor();
    await page.locator('[data-member-detail-tab-panel="today"]').waitFor();
    await drawer.locator(".live-data-loading").waitFor({ state: "detached" });
    await drawer.evaluate((element: HTMLElement) => {
      element.scrollTop = 0;
    });
    const todayIntersection = await scrollIntoVisibleViewport(drawer);
    const todayPath = join(evidenceDir, "member-today.png");
    await drawer.screenshot({ path: todayPath });
    receipt.tabs.push({
      tab: "today",
      selected: await todayTab.getAttribute("aria-selected"),
      data_sentinel: '[data-member-detail-tab-panel="today"]',
      loading_state_count: await drawer.locator(".live-data-loading").count(),
      viewport_intersection: todayIntersection,
      file: "artifacts/people-v2/PEO-TUW-027/member-today.png",
      sha256: await sha256(todayPath),
    });

    await page.getByRole("tab", { name: "담당 사건" }).click();
    const mattersTab = page.getByRole("tab", { name: "담당 사건", selected: true });
    await mattersTab.waitFor();
    await page.locator('[data-member-detail-tab-panel="matters"]').waitFor();
    await drawer.locator(".live-data-loading").waitFor({ state: "detached" });
    await drawer.evaluate((element: HTMLElement) => {
      element.scrollTop = 0;
    });
    const mattersIntersection = await scrollIntoVisibleViewport(drawer);
    const mattersPath = join(evidenceDir, "member-matters.png");
    await drawer.screenshot({ path: mattersPath });
    receipt.tabs.push({
      tab: "matters",
      selected: await mattersTab.getAttribute("aria-selected"),
      data_sentinel: '[data-member-detail-tab-panel="matters"]',
      loading_state_count: await drawer.locator(".live-data-loading").count(),
      viewport_intersection: mattersIntersection,
      file: "artifacts/people-v2/PEO-TUW-027/member-matters.png",
      sha256: await sha256(mattersPath),
    });

    await page.getByRole("tab", { name: "프로필" }).click();
    const profileTab = page.getByRole("tab", { name: "프로필", selected: true });
    await profileTab.waitFor();
    await page.locator('[data-member-detail-tab="profile"]').waitFor();
    await page.locator("#people-profile .people-profile-grid").waitFor();
    await drawer.locator(".live-data-loading").waitFor({ state: "detached" });
    assert.equal(await page.locator("#people-profile .people-profile-grid").count(), 1);
    assert.equal(await drawer.locator(".live-data-loading").count(), 0);
    await drawer.evaluate((element: HTMLElement) => {
      element.scrollTop = 0;
    });
    const profileIntersection = await scrollIntoVisibleViewport(drawer);
    const profilePath = join(evidenceDir, "member-profile.png");
    await drawer.screenshot({ path: profilePath });
    receipt.tabs.push({
      tab: "profile",
      selected: await profileTab.getAttribute("aria-selected"),
      data_sentinel: "#people-profile .people-profile-grid",
      loading_state_count: await drawer.locator(".live-data-loading").count(),
      viewport_intersection: profileIntersection,
      file: "artifacts/people-v2/PEO-TUW-027/member-profile.png",
      sha256: await sha256(profilePath),
    });

    await page.getByRole("button", { name: "상세 패널 닫기" }).click();
    await drawer.waitFor({ state: "detached" });
    receipt.captured_at = new Date().toISOString();
    receipt.source_files = await Promise.all([
      "apps/web/src/people/PeopleHome.tsx",
      "apps/web/src/people/employees/MemberDetailPanel.tsx",
      "apps/web/src/people/employees/EmployeeProfile.tsx",
      "apps/web/src/styles.css",
      "apps/web/test/people-overview-test-support.mjs",
      "apps/web/e2e/hrx/people-member-detail.spec.ts",
    ].map(async (file) => ({
      file,
      sha256: await sha256(join(repoRoot, file)),
    })));
    await writeFile(
      join(evidenceDir, "visual-evidence-receipt.json"),
      `${JSON.stringify(receipt, null, 2)}\n`,
    );
  } finally {
    await fixture.close();
  }
});
