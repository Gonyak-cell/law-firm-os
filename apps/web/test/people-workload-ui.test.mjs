import assert from "node:assert/strict";
import test from "node:test";
import {
  openPeopleOverviewPage,
  startPeopleOverviewHarness,
} from "./people-overview-test-support.mjs";

test("workload shows confirmed, time-unspecified, and no-estimate values without capacity claims", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage(harness);
    const panel = page.locator("#people-workload-stage-one");
    assert.equal(await panel.locator(".people-workload-row").count(), 2);
    assert.match(await panel.textContent(), /김아민/);
    assert.match(await panel.textContent(), /1시간 30분/);
    assert.match(await panel.textContent(), /45분/);
    assert.match(await panel.textContent(), /예상시간 없음 1건/);
    assert.equal(await panel.getByText(/가동률|여유율|자동 배치|capacity/i).count(), 0);
    assert.equal(await panel.locator(".people-workload-measure b").count(), 4);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("unresolved login links show unknown workload without zero bars or counts", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      workloadIdentityRequired: true,
    });
    const panel = page.locator("#people-workload-stage-one");
    const unknown = panel.locator('[data-workload-source-state="identity_link_required"]');
    await unknown.waitFor();
    assert.equal(await unknown.getByText("이서윤", { exact: true }).count(), 1);
    assert.equal(await unknown.getByText("로그인 계정 연결을 확인해 주세요", { exact: true }).count(), 1);
    assert.equal(await unknown.locator(".people-workload-measure").count(), 0);
    assert.equal(await unknown.getByText(/0분|예상시간 없음 0건/).count(), 0);
    assert.equal(await panel.locator('[data-workload-source-state="ok"] .people-workload-measure b').count(), 2);
    assert.equal(await panel.locator('[data-source="identity_link"][data-source-state="blocked"]').count(), 1);
    await page.close();
  } finally {
    await harness.close();
  }
});
