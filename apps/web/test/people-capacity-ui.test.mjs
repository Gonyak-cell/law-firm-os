import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  openPeopleOverviewPage,
  repoRoot,
  startPeopleOverviewHarness,
} from "./people-overview-test-support.mjs";

const capacityRows = [
  {
    employee_id: "emp-1",
    display_name: "김아민",
    date: "2026-07-30",
    state: "available",
    scheduled_minutes: 480,
    calendar_reserved_minutes: 180,
    approved_leave_minutes: 120,
    calendar_leave_overlap_minutes: 60,
    occupied_minutes: 240,
    remaining_minutes: 240,
    overbooked_minutes: 0,
    label: "시간 남음",
    evidence: {
      schedule: {
        schedule_profile_id: "schedule-standard",
        scheduled_minutes: 480,
      },
      calendar: [
        {
          kind: "matter_task",
          title: "준비서면 검토",
          starts_at: "2026-07-30T09:00:00+09:00",
          ends_at: "2026-07-30T11:00:00+09:00",
          source_ref: "task-1",
        },
        {
          kind: "outlook_calendar",
          title: "필수 참석 회의",
          starts_at: "2026-07-30T15:30:00+09:00",
          ends_at: "2026-07-30T16:30:00+09:00",
          source_ref: "outlook-1",
        },
      ],
      leave: [
        {
          title: "휴가",
          starts_at: "2026-07-30T15:00:00+09:00",
          ends_at: "2026-07-30T17:00:00+09:00",
          leave_interval_ref: "sha256:leave-1",
        },
      ],
    },
  },
  {
    employee_id: "emp-2",
    display_name: "이서윤",
    date: "2026-07-30",
    state: "schedule_required",
    scheduled_minutes: null,
    calendar_reserved_minutes: null,
    approved_leave_minutes: null,
    calendar_leave_overlap_minutes: null,
    occupied_minutes: null,
    remaining_minutes: null,
    overbooked_minutes: null,
    label: "근로시간 확인 필요",
    evidence: { schedule: null, calendar: [], leave: [] },
  },
  {
    employee_id: "emp-3",
    display_name: "박지훈",
    date: "2026-07-30",
    state: "overbooked",
    scheduled_minutes: 120,
    calendar_reserved_minutes: 180,
    approved_leave_minutes: 0,
    calendar_leave_overlap_minutes: 0,
    occupied_minutes: 180,
    remaining_minutes: -60,
    overbooked_minutes: 60,
    label: "예정 초과",
    evidence: {
      schedule: { scheduled_minutes: 120 },
      calendar: [{
        kind: "court_hearing",
        title: "재판기일",
        starts_at: "2026-07-30T09:00:00+09:00",
        ends_at: "2026-07-30T12:00:00+09:00",
        source_ref: "hearing-3",
      }],
      leave: [],
    },
  },
];

test("capacity UI shows exact minutes, missing schedules, planned overrun, and calculation evidence", async () => {
  const harness = await startPeopleOverviewHarness();
  const evidenceDir = join(repoRoot, "artifacts/people-v2/PEO-TUW-030");
  await mkdir(evidenceDir, { recursive: true });
  try {
    const desktop = await openPeopleOverviewPage({
      ...harness,
      peopleCapacityEnabled: true,
      capacityRows,
    });
    const capacity = desktop.locator('[data-people-capacity="true"]');
    await capacity.waitFor();
    await capacity.getByText("4시간 남음", { exact: true }).waitFor();
    await capacity.getByText("근로시간 확인 필요", { exact: true }).waitFor();
    await capacity.getByText("1시간 예정 초과", { exact: true }).waitFor();

    const firstRow = capacity.locator("details").filter({ hasText: "김아민" });
    await firstRow.locator("summary").click();
    await firstRow.getByText("일정과 휴가가 겹친 1시간은 한 번만 뺐습니다.", { exact: true }).waitFor();
    assert.equal(await firstRow.getByText("준비서면 검토", { exact: true }).count(), 1);
    assert.equal(await firstRow.getByText("휴가", { exact: true }).count(), 1);
    await desktop.screenshot({
      path: join(evidenceDir, "remaining-time-desktop.png"),
      fullPage: true,
    });
    await desktop.close();

    const mobile = await openPeopleOverviewPage({
      ...harness,
      peopleCapacityEnabled: true,
      capacityRows,
      viewport: { width: 390, height: 844 },
    });
    const mobileCapacity = mobile.locator('[data-people-capacity="true"]');
    await mobileCapacity.waitFor();
    const mobileFirstSummary = mobileCapacity.locator("details").first().locator("summary");
    await mobileFirstSummary.focus();
    await mobileFirstSummary.press("Enter");
    assert.equal(await mobileCapacity.locator("details").first().getAttribute("open"), "");
    assert.equal(
      await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
    );
    await mobile.screenshot({
      path: join(evidenceDir, "remaining-time-mobile.png"),
      fullPage: true,
    });
    await mobile.close();
  } finally {
    await harness.close();
  }
});
