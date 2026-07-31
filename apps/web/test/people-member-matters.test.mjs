import assert from "node:assert/strict";
import test from "node:test";
import {
  openPeopleOverviewPage,
  startPeopleOverviewHarness,
} from "./people-overview-test-support.mjs";

test("member Matters tab shows current assignments in next-event order and deep-links each Matter", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "matters",
    });
    const panel = page.locator('[data-member-detail-tab-panel="matters"]');
    await panel.waitFor();
    assert.deepEqual(
      await panel.locator(".member-matter-code").allTextContents(),
      ["L-001", "L-003"],
    );
    assert.equal(await panel.getByText("담당 변호사 / 현재 담당", { exact: true }).count(), 1);
    assert.equal(await panel.getByText("담당 변호사 / 인계 예정", { exact: true }).count(), 1);
    assert.equal(await panel.getByText("예정된 중요 일정 없음", { exact: true }).count(), 1);
    assert.equal(await panel.getByText(/숨은|종료 배정|미래 배정|미해결 배정/).count(), 0);

    await panel.getByRole("button", { name: /계약 검토/ }).click();
    await page.waitForFunction(() => window.location.hash === "#matters-list");
    assert.equal(new URL(page.url()).searchParams.get("matter_id"), "matter-3");
    await page.close();
  } finally {
    await harness.close();
  }
});
