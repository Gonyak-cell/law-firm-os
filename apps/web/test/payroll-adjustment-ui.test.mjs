import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { startPeopleOverviewHarness } from "./people-overview-test-support.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const artifactDir = resolve(repositoryRoot, "artifacts/people-v2/PEO-TUW-063");

function json(route, body, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
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

function run(runId, runType = "regular", status = "closed") {
  return {
    run_id: runId,
    period_id: "period-2026-07",
    run_type: runType,
    previous_run_id: runType === "adjustment" ? "run-original" : null,
    correction_key: runType === "adjustment" ? "CORR-2026-07-001" : null,
    status,
    state_version: status === "closed" ? 5 : 1,
    prepared_by_actor_id: "payroll-preparer",
    approved_by_actor_id: status === "closed" ? "payroll-approver" : null,
    result_hash: status === "closed" ? "a".repeat(64) : null,
    created_at: runType === "adjustment" ? "2026-08-02T01:00:00Z" : "2026-08-01T01:00:00Z",
  };
}

function bundle(row) {
  const hasResult = row.status === "closed";
  return {
    run: row,
    employees: hasResult ? [{
      employee_id: "emp-1",
      display_name: "김아민",
      gross_krw: row.run_type === "adjustment" ? 100000 : 3000000,
      deduction_krw: row.run_type === "adjustment" ? 10000 : 300000,
      net_krw: row.run_type === "adjustment" ? 90000 : 2700000,
      issue_count: 0,
      status: "calculated",
    }] : [],
    totals: { gross_krw: 3000000, deduction_krw: 300000, net_krw: 2700000, issue_count: 0 },
    snapshots: [],
    line_items: [],
    issues: [],
    adjustments: row.run_type === "adjustment" ? [{
      adjustment_id: "adjustment-1",
      employee_id: "emp-1",
      reason_code: "CORRECTION",
      amount_krw: 100000,
    }] : [],
    payment_batches: [],
    filings: [],
    audit_history: [],
  };
}

async function openPayroll(harness, { enabled = true, viewport = { width: 1360, height: 940 } } = {}) {
  const state = {
    originalHash: "a".repeat(64),
    rows: [run("run-original")],
    posted: [],
  };
  const page = await harness.browser.newPage({ viewport });
  await page.addInitScript((adjustmentEnabled) => {
    window.__LAWOS_PEOPLE_FEATURE_FLAGS__ = { payroll_adjustment_workspace: adjustmentEnabled };
  }, enabled);
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/hrx/payroll/periods" && request.method() === "GET") {
      return json(route, {
        outcome: "ok",
        workspace: {
          periods: [{
            period_id: "period-2026-07",
            period_code: "2026-07",
            period_start: "2026-07-01",
            period_end: "2026-07-31",
            cutoff_at: "2026-07-31T18:00:00+09:00",
            pay_date: "2026-08-05",
            status: "closed",
            runs: state.rows,
          }],
          production_ready_claim: false,
        },
      });
    }
    if (path === "/api/hrx/payroll/runs" && request.method() === "POST") {
      const body = request.postDataJSON();
      state.posted.push(body);
      assert.equal(body.run_type, "adjustment");
      assert.equal(body.previous_run_id, "run-original");
      assert.equal(body.correction_key, "CORR-2026-07-001");
      assert.deepEqual(body.adjustments, [{
        employee_id: "emp-1",
        reason_code: "CORRECTION",
        amount_krw: 100000,
        taxable: true,
      }]);
      const created = run("run-adjustment", "adjustment", "draft");
      state.rows = [created, ...state.rows];
      return json(route, { outcome: "created", run: created, adjustments: body.adjustments }, 201);
    }
    const runMatch = path.match(/^\/api\/hrx\/payroll\/runs\/([^/]+)$/);
    if (runMatch && request.method() === "GET") {
      const row = state.rows.find((candidate) => candidate.run_id === decodeURIComponent(runMatch[1]));
      return json(route, { outcome: "ok", bundle: bundle(row) });
    }
    return json(route, {});
  });
  await page.goto(`${harness.baseUrl}/?view=people&ctx=allow#people-payroll`, { waitUntil: "networkidle" });
  return { page, state };
}

test("PEO-TUW-063 starts an idempotent correction run without reopening the closed original", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const { page, state } = await openPayroll(harness);
    await page.getByRole("button", { name: "정정 정산 시작" }).click();
    await page.locator('[data-payroll-adjustment-form="true"]').waitFor();
    await page.getByLabel("정정 요청 번호").fill("CORR-2026-07-001");
    await page.getByLabel("차액(원)").fill("100000");
    assert.equal(await page.getByRole("option", { name: "과지급 회수" }).count(), 0);
    assert.equal(await page.getByLabel("차액(원)").getAttribute("min"), "1");
    await mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: resolve(artifactDir, "adjustment-start-desktop.png"), fullPage: true });
    assert.equal(await page.getByText("마감된 원본은 그대로 두고 차액만 별도 승인·마감합니다.", { exact: true }).count(), 1);
    assert.equal(await page.getByText("마감 취소", { exact: true }).count(), 0);
    await page.getByRole("button", { name: "정정 정산 만들기" }).click();
    await page.getByRole("option", { name: "정정 / 입력 대기" }).waitFor({ state: "attached" });
    assert.equal(state.posted.length, 1);
    assert.equal(state.originalHash, "a".repeat(64));
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-063 keeps the correction UI behind an independent default-off flag", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const { page } = await openPayroll(harness, { enabled: false });
    assert.equal(await page.getByRole("button", { name: "정정 정산 시작" }).count(), 0);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-063 correction form stays inside a mobile viewport", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const { page } = await openPayroll(harness, { viewport: { width: 390, height: 844 } });
    await page.getByRole("button", { name: "정정 정산 시작" }).click();
    await page.locator('[data-payroll-adjustment-form="true"]').waitFor();
    await assertCriticalValueIsNotClipped(
      page.getByLabel("급여 기간 정보").getByText("2026-07-01–2026-07-31", { exact: true }),
      "2026-07-01–2026-07-31",
    );
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    await mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: resolve(artifactDir, "adjustment-start-mobile.png"), fullPage: true });
    await page.close();
  } finally {
    await harness.close();
  }
});
