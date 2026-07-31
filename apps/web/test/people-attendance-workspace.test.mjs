import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { repoRoot } from "./people-overview-test-support.mjs";
import {
  openPeopleManagementPage,
  startPeopleManagementHarness,
} from "./people-management-test-support.mjs";

const FEATURE_FLAGS = Object.freeze({
  attendance_correction_workflow: true,
  payroll_handoff: true,
});

test("PEO-TUW-051 renders four attendance views and binds record creation to the signed-in employee", async () => {
  const harness = await startPeopleManagementHarness();
  try {
    const { page, state } = await openPeopleManagementPage({
      ...harness,
      section: "people-attendance-records",
      featureFlags: FEATURE_FLAGS,
      hrxScopes: ["hrx.overtime.team.read", "hrx.overtime.approve"],
    });
    await page.getByRole("button", { name: /이서윤/ }).click();
    const tabs = page.getByRole("tablist", { name: "출퇴근기록 보기" });
    await tabs.waitFor();
    assert.deepEqual(
      await tabs.getByRole("tab").allTextContents(),
      ["내 기록", "팀 기록", "정정 요청", "초과근로"],
    );
    assert.equal(await page.locator('[data-simple-attendance="true"]').count(), 0);

    await tabs.getByRole("tab", { name: "내 기록" }).click();
    const form = page.locator('[data-simple-attendance="true"]');
    await form.waitFor();
    await form.getByLabel("출근시간", { exact: true }).fill("09:00");
    await form.getByLabel("퇴근시간", { exact: true }).fill("18:00");
    await form.getByRole("button", { name: "기록 저장", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "출근시간과 퇴근시간을 저장했습니다." }).waitFor();
    assert.equal(state.attendance.at(-1).employee_id, "emp-1");
    assert.equal(
      state.attendance.some((record) =>
        record.employee_id === "emp-2" && String(record.attendance_id).startsWith("att_ui_")),
      false,
    );
    await page.close();

    for (const [stateName, expected] of [
      ["empty", "저장된 출퇴근 기록이 없습니다."],
      ["error", "출퇴근 기록을 불러오지 못했습니다."],
      ["denied", "출퇴근 기록을 볼 권한이 없습니다."],
    ]) {
      const { page: statePage } = await openPeopleManagementPage({
        ...harness,
        section: "people-attendance-records",
        featureFlags: FEATURE_FLAGS,
        attendanceReadState: stateName,
      });
      await statePage.getByRole("button", { name: /김아민/ }).click();
      await statePage.getByText(expected, { exact: true }).waitFor();
      await statePage.close();
    }
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-050/051 runs attendance approval, overtime review, reload, and keyboard flow", async () => {
  const harness = await startPeopleManagementHarness();
  const evidenceDir = join(repoRoot, "artifacts/people-v2/PEO-TUW-051");
  await mkdir(evidenceDir, { recursive: true });
  try {
    const { page, state } = await openPeopleManagementPage({
      ...harness,
      section: "people-attendance-records",
      featureFlags: FEATURE_FLAGS,
      hrxScopes: ["hrx.overtime.team.read", "hrx.overtime.approve"],
    });
    const tabs = page.getByRole("tablist", { name: "출퇴근기록 보기" });
    await tabs.waitFor();
    await page.getByRole("button", { name: /김아민/ }).click();

    const teamTab = tabs.getByRole("tab", { name: "팀 기록" });
    await teamTab.focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await tabs.getByRole("tab", { name: "정정 요청" }).getAttribute("aria-selected"), "true");
    await page.keyboard.press("ArrowLeft");
    assert.equal(await teamTab.getAttribute("aria-selected"), "true");

    await tabs.getByRole("tab", { name: "내 기록" }).click();
    const form = page.locator('[data-simple-attendance="true"]');
    await form.waitFor();
    await form.getByLabel("출근시간", { exact: true }).fill("18:00");
    await form.getByLabel("퇴근시간", { exact: true }).fill("09:00");
    await page.getByRole("alert").filter({ hasText: "퇴근시간은 출근시간보다 늦어야 합니다." }).waitFor();
    await form.getByLabel("출근시간", { exact: true }).fill("09:00");
    await form.getByLabel("퇴근시간", { exact: true }).fill("18:00");

    await teamTab.click();
    const handoff = page.locator('[aria-label="급여 입력 확인"]');
    await handoff.getByRole("button", { name: "급여 반영 확인" }).click();
    await page.getByRole("status").filter({ hasText: "급여 입력 대상으로 확인했습니다." }).waitFor();
    assert.equal(state.attendanceApprovals.length, 1);

    await tabs.getByRole("tab", { name: "정정 요청" }).click();
    await page.getByRole("region", { name: "출퇴근 정정" }).waitFor();

    await tabs.getByRole("tab", { name: "초과근로" }).click();
    const overtime = page.getByRole("tabpanel");
    const rows = overtime.locator("tbody tr");
    await rows.first().waitFor();
    assert.deepEqual(
      await rows.first().locator("td").allTextContents(),
      ["2026. 7. 29.계산 시간보다 길어 확인이 필요합니다.", "1시간 5분", "2시간", "0분", "승인 대기", "반려승인"],
    );

    await overtime.getByLabel("승인 시간", { exact: true }).fill("1");
    await overtime.getByLabel("검토 의견", { exact: true }).fill("출퇴근기록과 업무 사유 확인");
    await rows.first().getByRole("button", { name: "승인", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "초과근로를 승인했습니다." }).waitFor();
    await overtime.getByText("1시간", { exact: true }).last().waitFor();
    assert.equal(state.overtime[0].state, "approved");
    assert.equal(state.overtime[0].approved_minutes, 60);

    await page.getByRole("button", { name: /이서윤/ }).click();
    await overtime.getByText("신청된 초과근로가 없습니다.", { exact: true }).waitFor();
    await overtime.getByText("내 초과근로 신청", { exact: true }).waitFor();
    await overtime.getByText("아래 신청서는 로그인한 본인의 기록으로 저장됩니다.", { exact: true }).waitFor();
    await overtime.getByLabel("근무일", { exact: true }).fill("2026-07-29");
    await overtime.getByLabel("신청 시간", { exact: true }).fill("1.5");
    await overtime.getByLabel("신청 사유", { exact: true }).fill("긴급 의견서 제출");
    await overtime.getByRole("button", { name: "승인 요청", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "내 초과근로 승인 요청을 보냈습니다." }).waitFor();
    assert.equal(state.overtime.length, 2);
    assert.equal(state.overtime.at(-1).employee_id, "emp-1");
    assert.equal(
      state.overtime.some((request) =>
        request.employee_id === "emp-2" && String(request.overtime_id).startsWith("overtime-ui:")),
      false,
    );
    assert.equal(
      state.requestLog.some((entry) =>
        entry.method === "POST"
        && entry.pathname === "/api/hrx/payroll/attendance-approvals"),
      true,
    );
    assert.equal(
      state.requestLog.filter((entry) =>
        entry.method === "POST"
        && entry.pathname.startsWith("/api/hrx/overtime")).length >= 2,
      true,
    );

    await page.screenshot({
      path: join(evidenceDir, "team-overtime-payroll-handoff.png"),
      fullPage: true,
    });

    const selfTab = tabs.getByRole("tab", { name: "내 기록" });
    await selfTab.click();
    await page.locator('[data-attendance-history="true"]').waitFor();
    assert.equal(await selfTab.getAttribute("aria-selected"), "true");
    await page.screenshot({
      path: join(evidenceDir, "self-attendance.png"),
      fullPage: true,
    });
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-051 keeps overtime approval controls manager-scoped", async () => {
  const harness = await startPeopleManagementHarness();
  try {
    const { canApproveOvertime } = await harness.server.ssrLoadModule("/src/data/hrxAccess.js");
    assert.equal(canApproveOvertime([{ hrx_scopes: ["hrx.overtime.approve"] }]), false);
    assert.equal(canApproveOvertime([{
      hrx_scopes: ["hrx.overtime.team.read", "hrx.overtime.approve"],
    }]), true);

    const { page } = await openPeopleManagementPage({
      ...harness,
      section: "people-attendance-records",
      featureFlags: FEATURE_FLAGS,
    });
    await page.getByRole("button", { name: /김아민/ }).click();
    await page.getByRole("tab", { name: "초과근로" }).click();
    const overtime = page.getByRole("tabpanel");
    await overtime.locator("tbody tr").first().waitFor();
    assert.equal(await overtime.getByRole("button", { name: "승인 요청", exact: true }).count(), 1);
    assert.equal(await overtime.locator('[data-overtime-review-access="manager"]').count(), 0);
    assert.equal(await overtime.getByRole("button", { name: "승인", exact: true }).count(), 0);
    assert.equal(await overtime.getByRole("button", { name: "반려", exact: true }).count(), 0);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-051 renders empty, error, denied, and mobile states without page overflow", async () => {
  const harness = await startPeopleManagementHarness();
  const evidenceDir = join(repoRoot, "artifacts/people-v2/PEO-TUW-051");
  await mkdir(evidenceDir, { recursive: true });
  try {
    for (const [stateName, expected] of [
      ["empty", "신청된 초과근로가 없습니다."],
      ["error", "초과근로를 불러오지 못했습니다."],
      ["denied", "초과근로를 볼 권한이 없습니다."],
    ]) {
      const { page } = await openPeopleManagementPage({
        ...harness,
        section: "people-attendance-records",
        featureFlags: FEATURE_FLAGS,
        overtimeReadState: stateName,
      });
      await page.getByRole("button", { name: /김아민/ }).click();
      await page.getByRole("tab", { name: "초과근로" }).click();
      await page.getByText(expected, { exact: true }).waitFor();
      await page.close();
    }

    const { page } = await openPeopleManagementPage({
      ...harness,
      section: "people-attendance-records",
      viewport: { width: 390, height: 844 },
      featureFlags: FEATURE_FLAGS,
    });
    await page.getByRole("button", { name: /김아민/ }).click();
    await page.getByRole("tab", { name: "초과근로" }).click();
    await page.locator(".attendance-overtime-table").waitFor();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
      true,
    );
    await page.screenshot({
      path: join(evidenceDir, "mobile-overtime.png"),
      fullPage: true,
    });
    await page.close();
  } finally {
    await harness.close();
  }
});
