import assert from "node:assert/strict";
import test from "node:test";
import {
  openPeopleOverviewPage,
  startPeopleOverviewHarness,
} from "./people-overview-test-support.mjs";

test("member drawer preserves focus, Escape, backdrop, tabs, URL state, and browser back", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage(harness);
    const opener = page.locator('[data-people-timeline-member="emp-1"] .people-timeline-member');
    await opener.focus();
    await opener.click();
    await page.locator('[data-people-detail-panel="open"]').waitFor();
    assert.equal(new URL(page.url()).searchParams.get("employee"), "emp-1");
    assert.equal(new URL(page.url()).searchParams.get("tab"), "today");
    assert.deepEqual(
      await page.getByRole("tab").allTextContents(),
      ["오늘", "담당 사건", "프로필"],
    );

    await page.getByRole("tab", { name: "담당 사건" }).click();
    assert.equal(new URL(page.url()).searchParams.get("tab"), "matters");
    await page.getByRole("tab", { name: "프로필" }).click();
    assert.equal(new URL(page.url()).searchParams.get("tab"), "profile");

    const close = page.getByRole("button", { name: "상세 패널 닫기" });
    await close.focus();
    await page.keyboard.press("Shift+Tab");
    assert.equal(
      await page.evaluate(() => Boolean(document.activeElement?.closest('[data-people-detail-panel="open"]'))),
      true,
    );

    await page.keyboard.press("Escape");
    await page.locator('[data-people-detail-panel="open"]').waitFor({ state: "detached" });
    assert.equal(new URL(page.url()).searchParams.has("employee"), false);
    assert.equal(await opener.evaluate((element) => document.activeElement === element), true);

    await opener.click();
    await page.locator('[data-people-detail-panel="open"]').waitFor();
    await page.locator(".people-detail-backdrop").click({ position: { x: 4, y: 4 } });
    await page.locator('[data-people-detail-panel="open"]').waitFor({ state: "detached" });

    await opener.click();
    await page.locator('[data-people-detail-panel="open"]').waitFor();
    await page.goBack();
    await page.locator('[data-people-detail-panel="open"]').waitFor({ state: "detached" });
  } finally {
    await harness.close();
  }
});

test("member drawer renders safe visible and accessible labels for adversarial member names", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
    });
    const detailTab = '[data-member-detail-tab="today"]';
    await page.locator(detailTab).waitFor();

    let resolveBaseline;
    const baselineBodyPromise = new Promise((resolve) => {
      resolveBaseline = resolve;
    });
    const captureResponse = async (response) => {
      if (!response.url().includes("/api/hrx/people/members/") || !response.url().endsWith("/daily-brief")) return;
      try {
        resolveBaseline(await response.json());
      } catch {
        // Ignore non-JSON responses; the assertion below reports a missing fixture.
      }
    };
    page.on("response", captureResponse);
    await page.reload();
    await page.locator(detailTab).waitFor();
    const baselineBody = await baselineBodyPromise;
    page.off("response", captureResponse);
    assert.ok(baselineBody?.data?.member, "daily brief fixture must include the member record");

    let memberPayload = { ...baselineBody.data.member };
    await page.route("**/api/hrx/people/members/**/daily-brief", async (route) => {
      const body = structuredClone(baselineBody);
      body.data.member = { ...body.data.member, ...memberPayload };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });

    const fallback = "구성원 이름 확인 필요";
    for (const displayName of [
      "lawyer@example.com",
      "550e8400-e29b-01d4-0716-446655440000",
      "0123456789abcdef0123456789abcdef",
      "opaque-9f2a4c7b8d1e",
      "김아민 (emp-1)",
    ]) {
      memberPayload = {
        ...baselineBody.data.member,
        employee_id: "emp-1",
        user_id: "user-1",
        display_name: displayName,
      };
      await page.reload();
      await page.locator(detailTab).waitFor();
      const heading = page.getByRole("heading", { name: fallback, exact: true });
      await heading.waitFor();
      assert.equal(await page.locator(".member-detail-heading h2").textContent(), fallback);
      assert.equal(await page.getByRole("heading", { name: displayName, exact: true }).count(), 0);
      assert.equal(await page.getByText("emp-1", { exact: true }).count(), 0);
    }

    memberPayload = {
      ...baselineBody.data.member,
      employee_id: "lee",
      user_id: "lee",
      display_name: "Leena Kim",
    };
    await page.reload();
    await page.locator(detailTab).waitFor();
    await page.getByRole("heading", { name: "Leena Kim", exact: true }).waitFor();
    assert.equal(await page.locator(".member-detail-heading h2").textContent(), "Leena Kim");
  } finally {
    await harness.close();
  }
});

test("direct member links enforce read denial and feature-off keeps the existing profile only", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const denied = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      dailyMode: "denied",
    });
    await denied.getByText("이 구성원의 업무를 볼 권한이 없습니다", { exact: true }).waitFor();
    assert.equal(
      await denied.locator('[data-people-detail-panel="open"]').getByText("손해배상 사건", { exact: false }).count(),
      0,
    );
    await denied.close();

    const fallback = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      memberBriefEnabled: false,
    });
    await fallback.locator('[data-member-detail-tab="profile"]').waitFor();
    assert.equal(await fallback.getByRole("tab").count(), 0);
    await fallback.locator("#people-profile").waitFor();
    await fallback.close();
  } finally {
    await harness.close();
  }
});
