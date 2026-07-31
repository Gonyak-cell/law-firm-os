import assert from "node:assert/strict";
import test from "node:test";
import {
  openPeopleOverviewPage,
  startPeopleOverviewHarness,
} from "./people-overview-test-support.mjs";

test("deadline staffing renders natural Korean states and opens the selected Matter", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage(harness);
    const panel = page.locator("#people-deadline-staffing");
    assert.equal(await panel.locator("tbody tr").count(), 2);
    assert.equal(await panel.getByText("담당 확인", { exact: true }).count(), 1);
    assert.equal(await panel.getByText("담당자 지정 필요", { exact: true }).count(), 1);
    await panel.locator('tr[data-staffing-state="assignee_required"]').getByRole("button", { name: "사건 열기" }).click();
    await page.waitForFunction(() => window.location.hash === "#matters-list");
    const url = new URL(page.url());
    assert.equal(url.searchParams.get("matter_id"), "matter-2");
    assert.equal(url.hash, "#matters-list");
    await page.close();
  } finally {
    await harness.close();
  }
});
