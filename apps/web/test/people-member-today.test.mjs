import assert from "node:assert/strict";
import test from "node:test";
import {
  openPeopleOverviewPage,
  startPeopleOverviewHarness,
} from "./people-overview-test-support.mjs";

test("member Today tab shows only explicit open tasks and assigned hearings in time order", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
    });
    const panel = page.locator('[data-member-detail-tab-panel="today"]');
    await panel.waitFor();
    assert.deepEqual(
      await panel.locator(".member-today-timeline strong").allTextContents(),
      ["준비서면 검토", "변론기일"],
    );
    assert.equal(await panel.getByText("답변서 제출", { exact: true }).count(), 1);
    assert.equal(await panel.getByText("기록 검토", { exact: true }).count(), 1);
    assert.equal(await panel.getByText(/완료 업무|담당 없는 재판|비밀 사건/).count(), 0);
    assert.equal(await panel.getByText("담당 재판", { exact: true }).count(), 1);

    await panel.getByRole("button", { name: /준비서면 검토/ }).click();
    await page.waitForFunction(() => window.location.hash === "#matters-list");
    assert.equal(new URL(page.url()).searchParams.get("matter_id"), "matter-1");
    await page.close();
  } finally {
    await harness.close();
  }
});

test("member Today tab keeps partial Matter state distinct from no work", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      dailyMode: "partial",
    });
    await page.locator('[data-member-today-state="partial"]').waitFor();
    assert.equal(await page.getByText("오늘 처리할 사건 업무나 재판기일이 없습니다.", { exact: true }).count(), 0);
    assert.ok(await page.locator('[data-source-state="blocked"]').count() >= 1);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("member Today tab asks for account linking when assigned tasks cannot be resolved", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      dailyMode: "identity_required",
    });
    const panel = page.locator('[data-member-detail-tab-panel="today"]');
    const blocked = panel.locator('[data-member-task-state="identity_link_required"]');
    await blocked.waitFor();
    await blocked.getByText("로그인 계정 연결을 확인해 주세요", { exact: true }).waitFor();
    assert.equal(await panel.getByText("오늘 처리할 사건 업무나 재판기일이 없습니다.", { exact: true }).count(), 0);
    assert.equal(await panel.getByText("로그인 계정", { exact: true }).count(), 1);
    assert.equal(await panel.getByText("변론기일", { exact: true }).count(), 1);
    assert.equal(await panel.getByText(/준비서면 검토|답변서 제출|기록 검토/).count(), 0);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("member Today tab keeps the no-work message for a successful zero-row response", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      dailyMode: "empty",
    });
    await page.getByText("오늘 처리할 사건 업무나 재판기일이 없습니다.", { exact: true }).waitFor();
    assert.equal(await page.locator("[data-member-task-state]").count(), 0);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("member Today tab shows a start-only task once in the needs-time list", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      dailyMode: "start_only",
    });
    const panel = page.locator('[data-member-detail-tab-panel="today"]');
    await panel.waitFor();
    assert.equal(await panel.getByText("종료 시간 확인 업무", { exact: true }).count(), 1);
    assert.equal(
      await panel.locator(".member-today-unscheduled").getByText("종료 시간 확인 업무", { exact: true }).count(),
      1,
    );
    assert.equal(
      await panel.locator(".member-today-timeline").getByText("종료 시간 확인 업무", { exact: true }).count(),
      0,
    );
    assert.equal(await panel.getByText("시간 확인 필요", { exact: true }).count(), 1);
    await page.close();
  } finally {
    await harness.close();
  }
});
