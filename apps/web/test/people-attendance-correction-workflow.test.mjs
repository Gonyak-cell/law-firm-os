import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { repoRoot } from "./people-overview-test-support.mjs";
import {
  openPeopleManagementPage,
  startPeopleManagementHarness,
} from "./people-management-test-support.mjs";

async function timeInputMetrics(input) {
  return input.evaluate((element) => ({
    value: element.value,
    width: element.getBoundingClientRect().width,
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
}

test("attendance correction time inputs keep their full value visible on desktop and mobile", async () => {
  const harness = await startPeopleManagementHarness();
  try {
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 390, height: 844 },
    ]) {
      const { page } = await openPeopleManagementPage({
        ...harness,
        section: "people-attendance-records",
        viewport,
        featureFlags: { attendance_correction_workflow: true },
      });
      await page.getByRole("button", { name: /김아민/ }).click();
      const workflow = page.getByRole("region", { name: "출퇴근 정정" });
      await workflow.waitFor();
      await page.waitForFunction(() =>
        document.querySelector(".attendance-correction-form select")?.value ===
        "att-emp-1-2026-07-29"
      );
      for (const [label, expectedValue] of [["출근시간", "09:05"], ["퇴근시간", "18:10"]]) {
        const metrics = await timeInputMetrics(workflow.getByLabel(label, { exact: true }));
        assert.equal(metrics.value, expectedValue);
        assert.ok(metrics.width >= 132, `${viewport.width}px ${label} width=${metrics.width}`);
        assert.ok(metrics.scrollWidth <= metrics.clientWidth, `${viewport.width}px ${label} is clipped`);
      }
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
        true,
      );
      await page.close();
    }
  } finally {
    await harness.close();
  }
});

test("attendance correction stays pending until another reviewer approves it", async () => {
  const harness = await startPeopleManagementHarness();
  const evidenceDir = join(repoRoot, "artifacts/people-v2/PEO-TUW-049");
  await mkdir(evidenceDir, { recursive: true });
  try {
    const { page, state } = await openPeopleManagementPage({
      ...harness,
      section: "people-attendance-records",
      featureFlags: { attendance_correction_workflow: true },
    });
    const workflow = page.getByRole("region", { name: "출퇴근 정정" });
    const historyRows = page.locator('[data-attendance-history="true"] tbody tr');
    await workflow.waitFor();
    await page.getByRole("button", { name: /김아민/ }).click();
    await page.waitForFunction(() =>
      document.querySelector(".attendance-correction-form select")?.value ===
      "att-emp-1-2026-07-29"
    );
    assert.equal(await historyRows.count(), 1);

    const requestForm = workflow.locator(".attendance-correction-form");
    await requestForm.getByLabel("퇴근시간", { exact: true }).fill("17:30");
    await requestForm.getByLabel("정정 사유", { exact: true }).fill("외부 일정 종료 시각을 잘못 입력함");
    await requestForm.getByLabel("확인 자료", { exact: true }).fill("OutlookEvent:evt-20260729-04");
    await requestForm.getByRole("button", { name: "정정 요청", exact: true }).click();

    await page.getByRole("status").filter({
      hasText: "승인 전까지 원래 기록이 유지됩니다.",
    }).waitFor();
    await workflow.getByText("승인 대기 1건", { exact: true }).waitFor();
    await workflow.getByText("승인 대기", { exact: true }).last().waitFor();
    assert.equal(await historyRows.count(), 1);
    assert.equal(state.attendance.length, 1);
    assert.equal(state.attendanceCorrectionRequests[0].state, "pending");

    await workflow.getByLabel("검토 의견", { exact: true }).fill("일정과 대조해 종료 시각 확인");
    await workflow.getByRole("button", { name: "승인", exact: true }).click();

    await page.getByRole("status").filter({
      hasText: "정정을 승인해 새 기록에 반영했습니다.",
    }).waitFor();
    await workflow.getByText("승인 대기 0건", { exact: true }).waitFor();
    await workflow.getByText("승인", { exact: true }).last().waitFor();
    await page.waitForFunction(() =>
      document.querySelectorAll('[data-attendance-history="true"] tbody tr').length === 2
    );

    assert.equal(state.attendance.length, 2);
    assert.equal(state.attendanceCorrectionRequests[0].state, "approved");
    assert.equal(
      state.attendance[1].correction_of_attendance_id,
      "att-emp-1-2026-07-29",
    );
    assert.match(state.attendance[1].clock_out_at, /T17:30:00\+09:00$/);
    assert.equal(
      state.requestLog.some((entry) =>
        entry.method === "POST" &&
        entry.pathname.includes("/api/hrx/attendance/correction-requests/")),
      true,
    );

    await page.screenshot({
      path: join(evidenceDir, "request-approve-readback.png"),
      fullPage: true,
    });
    await page.close();
  } finally {
    await harness.close();
  }
});
