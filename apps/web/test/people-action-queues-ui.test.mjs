import assert from "node:assert/strict";
import test from "node:test";
import {
  openPeopleOverviewPage,
  startPeopleOverviewHarness,
} from "./people-overview-test-support.mjs";

test("each action queue count equals its evidence rows and hidden rows remain absent", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage(harness);
    try {
      for (const queue of await page.locator("[data-people-action-queue]").all()) {
        const count = Number(await queue.locator("header > span").getAttribute("aria-label").then((label) => label?.replace(/\D/g, "")));
        assert.equal(count, await queue.locator("li").count());
      }
      assert.equal(await page.getByText("숨은 사건", { exact: false }).count(), 0);
      assert.equal(await page.getByText("지금 확인할 항목이 없습니다.", { exact: true }).count(), 1);
    } finally {
      await page.close();
    }
  } finally {
    await harness.close();
  }
});

test("action queue rows open the exact Matter and section", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage(harness);
    await page.locator('[data-people-action-queue="today_tasks"] li').first().getByRole("button").click();
    await page.waitForFunction(() => window.location.hash === "#matters-list");
    const url = new URL(page.url());
    assert.equal(url.searchParams.get("view"), "matters");
    assert.equal(url.searchParams.get("matter_id"), "matter-1");
    assert.equal(url.hash, "#matters-list");
    await page.close();
  } finally {
    await harness.close();
  }
});

test("an unresolved login link marks the aggregate today-task count as needing confirmation", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      workloadIdentityRequired: true,
    });
    try {
      const queue = page.locator('[data-people-action-queue="today_tasks"]');
      assert.equal(await queue.getAttribute("data-queue-source-state"), "identity_link_required");
      assert.equal(await queue.locator('header > span[aria-label="건수 확인 필요"]').innerText(), "확인 필요");
      assert.equal(await queue.getByText(
        "일부 구성원의 로그인 계정 연결을 확인해야 전체 업무를 볼 수 있습니다.",
        { exact: true },
      ).count(), 1);
      assert.equal(await queue.getByText("0건", { exact: true }).count(), 0);
      assert.equal(await queue.getByText("지금 확인할 항목이 없습니다.", { exact: true }).count(), 0);
      assert.equal(await queue.locator("li").count(), 2);
    } finally {
      await page.close();
    }
  } finally {
    await harness.close();
  }
});
