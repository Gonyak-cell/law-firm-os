import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { startPeopleOverviewHarness } from "./people-overview-test-support.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const artifactDir = resolve(repositoryRoot, "artifacts/people-v2/PEO-TUW-069");
const stepUpArtifactDir = resolve(repositoryRoot, "artifacts/people-v2/PEO-FIX-068-D-WEB-20260731");

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

function runBundle(items) {
  return {
    run: {
      run_id: "run-2026-07",
      period_id: "period-2026-07",
      run_type: "regular",
      status: "closed",
      state_version: 5,
      approved_by_actor_id: "payroll-approver",
    },
    employees: [
      { employee_id: "emp-1", display_name: "김아민", gross_krw: 4_000_000, deduction_krw: 500_000, net_krw: 3_500_000, issue_count: 0, status: "calculated" },
      { employee_id: "emp-2", display_name: "박로펌", gross_krw: 5_000_000, deduction_krw: 600_000, net_krw: 4_400_000, issue_count: 0, status: "calculated" },
    ],
    totals: { gross_krw: 9_000_000, deduction_krw: 1_100_000, net_krw: 7_900_000, issue_count: 0 },
    snapshots: [],
    line_items: [],
    issues: [],
    adjustments: [],
    statements: [],
    payment_batches: [{
      payment_batch_id: "batch-2026-07",
      run_id: "run-2026-07",
      state: "reconciled",
      approved_by_actor_id: "payment-approver",
      items,
    }],
    filings: [
      { filing_job_id: "filing-1", run_id: "run-2026-07", filing_kind: "withholding", state: "accepted", provider_result_state: "accepted", provider_receipt_ref: "provider:sandbox/filing/receipt-001", attempt_count: 1 },
      { filing_job_id: "filing-2", run_id: "run-2026-07", filing_kind: "payment_statement", state: "rejected", provider_result_state: "failed", provider_receipt_ref: "provider:error/receipt-002", safe_error_code: "SANDBOX_REJECTED", attempt_count: 1 },
      { filing_job_id: "filing-3", run_id: "run-2026-07", filing_kind: "social_insurance", state: "submitted", provider_result_state: "queued", provider_receipt_ref: null, attempt_count: 1 },
      { filing_job_id: "filing-4", run_id: "run-2026-07", filing_kind: "year_end", state: "corrected", provider_result_state: "corrected", provider_receipt_ref: "provider:error/receipt-004", attempt_count: 1 },
    ],
    year_end: null,
    audit_history: [],
  };
}

async function openPayroll(harness, viewport = { width: 1360, height: 940 }, {
  withCorrectionRun = false,
  stepUpPaymentRetry = false,
} = {}) {
  const adjustmentRun = {
    ...runBundle([]).run,
    run_id: "run-2026-07-adjustment",
    run_type: "adjustment",
    previous_run_id: "run-2026-07",
  };
  const state = {
    retryCalls: 0,
    retryHeaders: [],
    stepUpBodies: [],
    correctionCalls: 0,
    correctionBody: null,
    items: [
      {
        payment_item_id: "payment-item-1",
        employee_id: "emp-1",
        amount_krw: 3_500_000,
        state: "paid",
        provider_result_state: "succeeded",
        safe_error_code: null,
        attempt_count: 1,
      },
      {
        payment_item_id: "payment-item-2",
        employee_id: "emp-2",
        amount_krw: 4_400_000,
        state: "failed",
        provider_result_state: "unknown",
        safe_error_code: null,
        attempt_count: 1,
      },
    ],
  };
  const page = await harness.browser.newPage({ viewport });
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/step-up" && request.method() === "POST") {
      const body = request.postDataJSON();
      state.stepUpBodies.push(body);
      return json(route, {
        outcome: "verified",
        step_up_token: "lawos_hrx_step_up_v1.payment-retry-browser-proof",
        expires_at: "2026-07-31T23:59:59+09:00",
      });
    }
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
            runs: withCorrectionRun ? [runBundle(state.items).run, adjustmentRun] : [runBundle(state.items).run],
          }],
          production_ready_claim: false,
        },
      });
    }
    if (path === "/api/hrx/payroll/runs/run-2026-07" && request.method() === "GET") {
      return json(route, { outcome: "ok", bundle: runBundle(state.items) });
    }
    if (path === "/api/hrx/payroll/runs/run-2026-07-adjustment" && request.method() === "GET") {
      const bundle = runBundle([]);
      return json(route, {
        outcome: "ok",
        bundle: {
          ...bundle,
          run: adjustmentRun,
          filings: [{
            filing_job_id: "filing-2-correction",
            run_id: adjustmentRun.run_id,
            filing_kind: "payment_statement",
            state: "draft",
            provider_result_state: "pending",
            previous_job_ref: "artifact:payroll-filing/filing-2",
            attempt_count: 0,
          }],
        },
      });
    }
    if (path === "/api/hrx/payroll/filings/filing-2/correct" && request.method() === "POST") {
      state.correctionCalls += 1;
      state.correctionBody = request.postDataJSON();
      return json(route, {
        outcome: "corrected",
        filing: {
          filing_job_id: "filing-2-correction",
          run_id: adjustmentRun.run_id,
          filing_kind: "payment_statement",
          state: "draft",
          previous_job_ref: "artifact:payroll-filing/filing-2",
        },
      });
    }
    if (path === "/api/hrx/payroll/payment-batches/batch-2026-07/retry-failed" && request.method() === "POST") {
      state.retryHeaders.push(request.headers()["x-lawos-hrx-step-up"] ?? null);
      if (stepUpPaymentRetry && request.headers()["x-lawos-hrx-step-up"] !== "lawos_hrx_step_up_v1.payment-retry-browser-proof") {
        return json(route, {
          outcome: "blocked",
          safe_error_code: "HRX_STEP_UP_REQUIRED",
          step_up_required: true,
          required_purpose: "payroll_payment_processing",
          fail_closed: true,
        }, 403);
      }
      state.retryCalls += 1;
      state.items = state.items.map((item) => item.employee_id === "emp-2"
        ? {
            ...item,
            state: "paid",
            provider_result_state: "succeeded",
            safe_error_code: null,
            attempt_count: 2,
          }
        : item);
      return json(route, {
        outcome: "succeeded",
        payment: {
          reconciliation_state: "succeeded",
          paid_count: 2,
          failed_count: 0,
          unknown_count: 0,
          production_ready_claim: false,
        },
      });
    }
    return json(route, {});
  });
  await page.goto(`${harness.baseUrl}/?view=people&ctx=allow#people-payroll`, { waitUntil: "networkidle" });
  return { page, state };
}

test("PEO-TUW-069 shows partial payment outcomes and retries only failed or unknown rows", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const { page, state } = await openPayroll(harness);
    await page.getByRole("tab", { name: "지급", exact: true }).click();
    await page.locator('[data-payroll-operation="payment"]').waitFor();
    assert.equal(await page.getByText("일부 확인 필요", { exact: true }).count(), 1);
    assert.equal(await page.locator('[data-payroll-payment-item="emp-1"]').getByText("지급 완료", { exact: true }).count(), 1);
    assert.equal(await page.locator('[data-payroll-payment-item="emp-2"]').getByText("결과 확인 중", { exact: true }).count(), 1);
    assert.equal(await page.getByText("110000000002", { exact: true }).count(), 0);
    assert.equal(await page.getByText("token:bank/emp-2", { exact: true }).count(), 0);
    await mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: resolve(artifactDir, "payment-partial-desktop.png"), fullPage: true });

    await page.getByRole("button", { name: "실패 또는 미확인 건 다시 처리" }).click();
    await page.locator('[data-payroll-payment-item="emp-2"]').getByText("2회", { exact: true }).waitFor();
    assert.equal(state.retryCalls, 1);
    assert.equal(await page.getByText("실패 또는 미확인 건 다시 처리", { exact: true }).count(), 0);
    assert.equal(await page.locator('[data-payroll-payment-item="emp-1"]').getByText("1회", { exact: true }).count(), 1);
    assert.equal(await page.locator('[data-payroll-payment-item="emp-2"]').getByText("2회", { exact: true }).count(), 1);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-FIX-068-D retries the same payment action with only the payment-purpose token", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const { page, state } = await openPayroll(
      harness,
      { width: 1360, height: 940 },
      { stepUpPaymentRetry: true },
    );
    await page.getByRole("tab", { name: "지급", exact: true }).click();
    await page.getByRole("button", { name: "실패 또는 미확인 건 다시 처리" }).click();
    await page.locator('[data-hrx-step-up-challenge="true"]').waitFor();
    assert.equal(
      await page.getByText("급여 지급을 처리하려면 6자리 확인 코드를 입력하세요.", { exact: true }).count(),
      1,
    );
    await mkdir(stepUpArtifactDir, { recursive: true });
    await page.screenshot({
      path: resolve(stepUpArtifactDir, "payment-retry-purpose-challenge.png"),
      fullPage: true,
    });
    await page.getByLabel("6자리 확인 코드").fill("123456");
    await page.getByRole("button", { name: "확인", exact: true }).click();
    await page.locator('[data-payroll-payment-item="emp-2"]').getByText("2회", { exact: true }).waitFor();

    assert.deepEqual(state.stepUpBodies, [{
      purpose: "payroll_payment_processing",
      totp_code: "123456",
    }]);
    assert.deepEqual(state.retryHeaders, [
      null,
      "lawos_hrx_step_up_v1.payment-retry-browser-proof",
    ]);
    assert.equal(state.retryCalls, 1);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-069 keeps accepted, rejected, queued, and corrected filings distinct on mobile", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const { page } = await openPayroll(harness, { width: 390, height: 844 });
    await page.getByRole("tab", { name: "신고", exact: true }).click();
    await page.locator('[data-payroll-operation="filing"]').waitFor();
    for (const label of ["접수 완료", "반려", "접수 확인 중", "보정 준비"]) {
      assert.equal(await page.getByText(label, { exact: true }).count(), 1);
    }
    const payrollSummary = page.getByLabel("급여 합계");
    for (const value of ["₩9,000,000", "₩1,100,000", "₩7,900,000"]) {
      await assertCriticalValueIsNotClipped(payrollSummary.getByText(value, { exact: true }), value);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    const filingResults = page.locator('[data-payroll-operation="filing"]');
    await filingResults.scrollIntoViewIfNeeded();
    const expectedRows = [
      ["원천세", "접수 완료"],
      ["지급명세", "반려"],
      ["4대보험", "접수 확인 중"],
      ["연말정산", "보정 준비"],
    ];
    const rows = filingResults.locator("tbody tr");
    assert.equal(await rows.count(), expectedRows.length);
    for (const [index, [filingLabel, resultLabel]] of expectedRows.entries()) {
      const cells = rows.nth(index).locator("td");
      assert.equal((await cells.nth(0).innerText()).trim(), filingLabel);
      assert.equal((await cells.nth(1).innerText()).trim(), resultLabel);
      const firstTwoCellsAreInsideViewport = await cells.evaluateAll((elements) => elements.slice(0, 2).every((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0
          && rect.height > 0
          && rect.left >= 0
          && rect.right <= window.innerWidth
          && rect.top >= 0
          && rect.bottom <= window.innerHeight;
      }));
      assert.equal(firstTwoCellsAreInsideViewport, true, `${filingLabel} 신고 결과가 모바일 화면 안에 보여야 합니다.`);
    }
    await mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: resolve(artifactDir, "filing-results-mobile.png"), fullPage: false });
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-069 creates a replacement filing from the closed adjustment run and opens the new job", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const { page, state } = await openPayroll(
      harness,
      { width: 1360, height: 940 },
      { withCorrectionRun: true },
    );
    await page.getByRole("tab", { name: "신고", exact: true }).click();
    const requestFinished = page.waitForResponse((response) => (
      response.request().method() === "POST"
      && new URL(response.url()).pathname === "/api/hrx/payroll/filings/filing-2/correct"
    ));
    await page.getByRole("button", { name: "보정 신고서 만들기", exact: true }).click();
    assert.equal((await requestFinished).status(), 200);
    await page.getByRole("button", { name: "검증", exact: true }).waitFor();

    assert.equal(state.correctionCalls, 1);
    assert.deepEqual(state.correctionBody, { replacement_run_id: "run-2026-07-adjustment" });
    assert.equal(await page.locator('label:has-text("정산차수") select').inputValue(), "run-2026-07-adjustment");
    assert.equal(await page.getByText("작성", { exact: true }).count(), 1);
    assert.equal(await page.getByRole("button", { name: "검증", exact: true }).count(), 1);
    await mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: resolve(artifactDir, "filing-correction-desktop.png"), fullPage: true });
    await page.close();
  } finally {
    await harness.close();
  }
});
