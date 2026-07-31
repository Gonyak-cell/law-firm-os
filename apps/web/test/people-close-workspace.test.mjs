import assert from "node:assert/strict";
import test from "node:test";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startPeopleOverviewHarness } from "./people-overview-test-support.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const artifactDir = resolve(repositoryRoot, "artifacts/people-v2/PEO-TUW-062");

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function assertCriticalValueIsNotClipped(locator, expectedText) {
  await locator.waitFor();
  const state = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const parentRect = element.parentElement?.getBoundingClientRect() ?? element.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(element);
    const textRect = range.getBoundingClientRect();
    return {
      text: element.textContent?.trim(),
      visible: element.getClientRects().length > 0,
      whiteSpace: style.whiteSpace,
      textOverflow: style.textOverflow,
      clipsOverflow: ["hidden", "clip"].includes(style.overflowX) || ["hidden", "clip"].includes(style.overflowY),
      insideCell: textRect.left >= parentRect.left - 1
        && textRect.right <= parentRect.right + 1
        && textRect.top >= parentRect.top - 1
        && textRect.bottom <= parentRect.bottom + 1,
    };
  });
  assert.equal(state.text, expectedText);
  assert.equal(state.visible, true);
  assert.notEqual(state.whiteSpace, "nowrap");
  assert.notEqual(state.textOverflow, "ellipsis");
  assert.equal(state.clipsOverflow, false);
  assert.equal(state.insideCell, true);
}

function payrollState() {
  return {
    status: "draft",
    blocker: true,
    attendance: [],
    attendanceWrites: 0,
    precheckRequests: 0,
    periodSequence: 1,
    runSequence: 1,
    periods: [{
      period_id: "period-2026-07",
      period_code: "2026-07",
      period_start: "2026-07-01",
      period_end: "2026-07-31",
      cutoff_at: "2026-07-31T18:00:00+09:00",
      pay_date: "2026-08-05",
      status: "open",
      runs: [],
    }],
    audit: [],
  };
}

function hasBlocker(state) {
  return state.blocker && state.attendance.length === 0;
}

function runRow(state) {
  return {
    run_id: "run-2026-07",
    period_id: "period-2026-07",
    run_type: "regular",
    status: state.status,
    status_label: ({ draft: "입력 대기", snapshot_ready: "계산 준비", previewed: "검토 중", approved: "승인", closed: "마감" })[state.status],
    prepared_by_actor_id: "payroll-preparer",
    approved_by_actor_id: ["approved", "closed"].includes(state.status) ? "payroll-approver" : null,
    state_version: ({ draft: 1, snapshot_ready: 2, previewed: 3, approved: 4, closed: 5 })[state.status],
    totals: { gross_krw: 0, deduction_krw: 0, net_krw: 0, issue_count: hasBlocker(state) ? 1 : 0 },
    employee_count: 1,
  };
}

function bundle(state) {
  return {
    run: runRow(state),
    employees: [{
      employee_id: "emp-1",
      display_name: "김아민",
      gross_krw: 0,
      deduction_krw: 0,
      net_krw: 0,
      variance_krw: 0,
      issue_count: hasBlocker(state) ? 1 : 0,
      blocker_count: hasBlocker(state) ? 1 : 0,
      status: ["previewed", "approved", "closed"].includes(state.status) ? "calculated" : "input",
    }],
    totals: { gross_krw: 0, deduction_krw: 0, net_krw: 0, issue_count: hasBlocker(state) ? 1 : 0 },
    line_items: [],
    issues: [],
    snapshots: [],
    adjustments: [],
    payment_batches: [],
    filings: [],
    audit_history: state.audit,
  };
}

async function openClosePage(harness, {
  state = payrollState(),
  precheckMode = "ok",
  workspaceMode = "ok",
  resolutionRoute = "/people?employee_id=emp-1&period=2026-07&query=late%20record#people-attendance-records",
  resolutionSection = "people-attendance-records",
  viewport = { width: 1360, height: 940 },
} = {}) {
  const page = await harness.browser.newPage({ viewport });
  await page.addInitScript(() => {
    window.__LAWOS_PEOPLE_FEATURE_FLAGS__ = {
      payroll_close_precheck: true,
    };
  });
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path === "/api/hrx/payroll/periods" && request.method() === "GET") {
      if (workspaceMode === "denied") return json(route, { ui_state: "denied", safe_error_code: "HRX_AUTHZ_DENIED" }, 403);
      const regularPeriod = state.periods.find((period) => period.period_id === "period-2026-07");
      if (regularPeriod) regularPeriod.runs = [runRow(state)];
      return json(route, { outcome: "ok", workspace: { periods: state.periods, production_ready_claim: false } });
    }
    if (path === "/api/hrx/payroll/periods" && request.method() === "POST") {
      const body = request.postDataJSON();
      const period = {
        ...body,
        period_id: `period-new-${++state.periodSequence}`,
        status: "open",
        state_version: 2,
        runs: [],
      };
      state.periods.unshift(period);
      return json(route, { outcome: "created", period }, 201);
    }
    if (path === "/api/hrx/payroll/runs" && request.method() === "POST") {
      const body = request.postDataJSON();
      const run = {
        run_id: `run-new-${++state.runSequence}`,
        period_id: body.period_id,
        run_type: "regular",
        status: "draft",
        state_version: 1,
      };
      const period = state.periods.find((row) => row.period_id === body.period_id);
      period.runs = [run];
      return json(route, { outcome: "created", run }, 201);
    }
    if (/^\/api\/hrx\/payroll\/runs\/[^/]+$/.test(path) && request.method() === "GET") {
      return json(route, { outcome: "ok", bundle: bundle(state) });
    }
    if (/\/precheck$/.test(path) && request.method() === "GET") {
      state.precheckRequests += 1;
      if (precheckMode === "partial") return json(route, { safe_error_code: "PRECHECK_SOURCE_UNAVAILABLE" }, 503);
      const blockers = hasBlocker(state) ? [{
        issue_id: "issue-attendance-1",
        issue_code: "PAYROLL_ATTENDANCE_MISSING",
        severity: "blocker",
        employee_id: null,
        source_ref: "artifact:hrx/payroll-precheck/receipt-attendance",
        details: {
          category: "payroll_close_precheck",
          count: 1,
          resolution_section: resolutionSection,
          resolution_route: resolutionRoute,
        },
      }] : [];
      return json(route, {
        outcome: blockers.length ? "review_required" : "ready",
        precheck: {
          schema_version: "law-firm-os.hrx.payroll-close-precheck.v1",
          run_id: "run-2026-07",
          as_of: "2026-07-31T18:00:00+09:00",
          ready: blockers.length === 0,
          blocker_count: blockers.length,
          blockers,
          report_hash: "a".repeat(64),
        },
      });
    }
    if (/\/snapshot$/.test(path) && request.method() === "POST") {
      state.status = "snapshot_ready";
      state.audit.push({ event_id: "audit-snapshot", action: "hrx.payroll.run.snapshot_ready", actor_id: "payroll-preparer", occurred_at: "2026-07-31T18:01:00+09:00" });
      return json(route, { outcome: "ready", bundle: bundle(state) });
    }
    if (/\/preview$/.test(path) && request.method() === "POST") {
      state.status = "previewed";
      state.audit.push({ event_id: "audit-preview", action: "hrx.payroll.run.previewed", actor_id: "payroll-preparer", occurred_at: "2026-07-31T18:02:00+09:00" });
      return json(route, { outcome: "previewed", bundle: bundle(state) });
    }
    if (/\/approve$/.test(path) && request.method() === "POST") {
      assert.equal(hasBlocker(state), false, "approval must wait for a clean precheck");
      state.status = "approved";
      state.audit.push({ event_id: "audit-approve", action: "hrx.payroll.run.approved", actor_id: "payroll-approver", occurred_at: "2026-07-31T18:03:00+09:00" });
      return json(route, { outcome: "approved", bundle: bundle(state) });
    }
    if (/\/close$/.test(path) && request.method() === "POST") {
      state.status = "closed";
      state.audit.push({ event_id: "audit-close", action: "hrx.payroll.run.closed", actor_id: "payroll-approver", occurred_at: "2026-07-31T18:04:00+09:00" });
      return json(route, { outcome: "closed", bundle: bundle(state) });
    }
    if (path === "/api/hrx/employees" && request.method() === "GET") {
      return json(route, {
        outcome: "ok",
        employees: [{
          employee_id: "emp-1",
          display_name: "김아민",
          status: "active",
          work_email: "amin@example.test",
        }],
      });
    }
    if (path === "/api/hrx/attendance" && request.method() === "GET") {
      return json(route, {
        outcome: "ok",
        attendance: state.attendance,
        self_employee_id: "emp-1",
      });
    }
    if (path === "/api/hrx/attendance" && request.method() === "POST") {
      const attendance = {
        ...request.postDataJSON(),
        source_version: `attendance-version-${state.attendanceWrites + 1}`,
      };
      state.attendance.push(attendance);
      state.attendanceWrites += 1;
      return json(route, { outcome: "created", attendance }, 201);
    }
    return json(route, {});
  });
  await page.goto(`${harness.baseUrl}/?view=people&ctx=allow#people-close`, { waitUntil: "networkidle" });
  return { page, state };
}

test("PEO-TUW-062 runs check, handling link, recheck, four-eye approval, close, and reload", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const value = await openClosePage(harness);
    const { page, state } = value;
    await page.locator('[data-payroll-close-runtime="true"]').waitFor();
    assert.equal(await page.getByText("근무기록 누락", { exact: true }).count(), 1);
    await mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: resolve(artifactDir, "close-precheck-desktop.png"), fullPage: true });

    await page.getByRole("button", { name: "입력 확정" }).click();
    await page.getByRole("button", { name: "급여 계산" }).click();
    assert.equal(await page.getByRole("button", { name: "급여 승인" }).isDisabled(), true);
    await page.getByRole("button", { name: "처리 화면 열기" }).click();
    await page.waitForFunction(() => window.location.hash === "#people-attendance-records");
    const resolutionUrl = new URL(page.url());
    assert.equal(resolutionUrl.searchParams.get("employee_id"), "emp-1");
    assert.equal(resolutionUrl.searchParams.get("period"), "2026-07");
    assert.equal(resolutionUrl.searchParams.get("query"), "late record");

    const attendanceForm = page.locator('[data-simple-attendance="true"]');
    await attendanceForm.getByLabel("출근시간", { exact: true }).fill("09:00");
    await attendanceForm.getByLabel("퇴근시간", { exact: true }).fill("18:00");
    await attendanceForm.getByRole("button", { name: "기록 저장" }).click();
    await page.getByRole("status").filter({ hasText: "출근시간과 퇴근시간을 저장했습니다." }).waitFor();
    assert.equal(state.attendanceWrites, 1);

    await page.goBack();
    await page.locator('[data-payroll-close-runtime="true"]').waitFor();
    const recheckResponse = page.waitForResponse((response) => (
      response.request().method() === "GET"
      && /\/api\/hrx\/payroll\/runs\/[^/]+\/precheck$/.test(new URL(response.url()).pathname)
    ));
    await page.getByRole("button", { name: "다시 점검" }).click();
    await recheckResponse;
    await page.getByText("마감을 막는 항목이 없습니다.", { exact: true }).waitFor();
    assert.equal(state.precheckRequests >= 3, true);
    await page.getByRole("button", { name: "급여 승인" }).click();
    await page.getByRole("button", { name: "확인", exact: true }).click();
    await page.getByText("승인", { exact: true }).first().waitFor();
    assert.equal(state.audit.at(-1).actor_id, "payroll-approver");

    await page.getByRole("button", { name: "급여 마감" }).click();
    await page.getByRole("button", { name: "확인", exact: true }).click();
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.getByText("마감", { exact: true }).count() > 0, true);
    assert.equal(await page.getByText("audit-close", { exact: true }).count(), 1);
    assert.equal(state.status, "closed");
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-062 rejects external, extra-query, and disabled-catalog resolution routes", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    for (const target of [
      {
        resolutionRoute: "https://attacker.example/people?employee_id=emp-1&period=2026-07#people-attendance-records",
        resolutionSection: "people-attendance-records",
      },
      {
        resolutionRoute: "/people?employee_id=emp-1&period=2026-07&next=%2Fadmin#people-attendance-records",
        resolutionSection: "people-attendance-records",
      },
      {
        resolutionRoute: "/people?employee_id=emp-1&period=2026-07#people-work-schedule",
        resolutionSection: "people-work-schedule",
      },
    ]) {
      const { page } = await openClosePage(harness, target);
      const button = page.getByRole("button", { name: "처리 화면 열기" });
      await button.waitFor();
      assert.equal(await button.isDisabled(), true);
      assert.equal(new URL(page.url()).hash, "#people-close");
      await page.close();
    }
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-062 keeps denied and partial states distinct", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const denied = await openClosePage(harness, { workspaceMode: "denied" });
    await denied.page.getByText("급여정산 권한이 없습니다.", { exact: true }).waitFor();
    await denied.page.close();

    const partial = await openClosePage(harness, { precheckMode: "partial" });
    await partial.page.locator('[data-payroll-close-partial="true"]').waitFor();
    assert.match(await partial.page.locator('[data-payroll-close-partial="true"]').innerText(), /일부/);
    await partial.page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-062 creates a period and stays within the mobile viewport", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const value = await openClosePage(harness, { viewport: { width: 390, height: 844 } });
    const { page, state } = value;
    await page.getByRole("button", { name: "새 급여기간" }).click();
    await page.locator('input[type="month"]').fill("2026-08");
    await page.locator('input[type="date"]').fill("2026-09-05");
    await page.getByRole("button", { name: "기간 추가" }).click();
    await page.getByRole("option", { name: "2026-08" }).waitFor({ state: "attached" });
    assert.equal(state.periods.some((period) => period.period_code === "2026-08"), true);
    await assertCriticalValueIsNotClipped(
      page.getByLabel("급여 기간 정보").getByText("2026-08-01–2026-08-31", { exact: true }),
      "2026-08-01–2026-08-31",
    );
    await assertCriticalValueIsNotClipped(
      page.getByLabel("마감 현황").getByText("입력 대기", { exact: true }),
      "입력 대기",
    );
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    assert.equal(overflow, false);
    await mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: resolve(artifactDir, "close-workspace-mobile.png"), fullPage: true });
    await page.close();
  } finally {
    await harness.close();
  }
});
