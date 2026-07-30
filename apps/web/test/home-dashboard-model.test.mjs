import assert from "node:assert/strict";
import test from "node:test";
import {
  buildClientDashboardModel,
  buildBankCashflowDashboardModel,
  buildFinanceDashboardModel,
  buildHomeFinanceDashboardModel,
  buildMonthlyRevenueAxis,
  buildLeaveDashboardModel,
  buildMatterDashboardModel,
  dashboardResultState,
  formatMonthlyRevenueAxisTick,
  readDashboardResultWithRetry,
  seoulMonthKey,
} from "../src/components/HomeDashboardModel.js";

const NOW = new Date("2026-07-15T03:00:00.000Z");
const data = (items) => ({ kind: "data", uiState: "ready", items });

test("Home dashboard month boundaries use Asia/Seoul", () => {
  assert.equal(seoulMonthKey("2026-06-30T14:59:59.000Z"), "2026-06");
  assert.equal(seoulMonthKey("2026-06-30T15:00:00.000Z"), "2026-07");
});

test("Home finance model shares canonical recognized revenue between KPI and monthly bar series", () => {
  const model = buildFinanceDashboardModel(data([
    { month: "2026-06", currency: "KRW", billed_amount: 800, revenue_amount: 600, invoice_collected_amount: 400, direct_fee_amount: 200, unallocated_receipt_amount: 50, processed_cost: 100, recognition_basis: "collected" },
    { month: "2026-07", currency: "KRW", billed_amount: 1_000, revenue_amount: 900, invoice_collected_amount: 500, direct_fee_amount: 400, unallocated_receipt_amount: 100, processed_cost: 125, recognition_basis: "collected" },
    { month: "2026-07", currency: "USD", billed_amount: 2_000, revenue_amount: 1_500, processed_cost: 500, recognition_basis: "collected" },
  ]), { now: NOW });
  assert.equal(model.current.billed_amount, 1_000);
  assert.equal(model.current.revenue_amount, 900);
  assert.equal(model.current.invoice_collected_amount, 500);
  assert.equal(model.current.direct_fee_amount, 400);
  assert.equal(model.current.unallocated_receipt_amount, 100);
  assert.equal(model.current.processed_cost, 125);
  assert.equal(model.recognition_basis, "collected");
  assert.equal(model.series.length, 12);
  assert.equal(model.series.at(-1).amount, model.current.revenue_amount);
  assert.equal(model.revenue_change_percent, 50);
});

test("Home monthly revenue axis uses readable 30 million KRW steps", () => {
  const axis = buildMonthlyRevenueAxis([{ amount: 115_903_190 }]);
  assert.equal(axis.maximum, 120_000_000);
  assert.deepEqual(axis.ticks, [120_000_000, 90_000_000, 60_000_000, 30_000_000, 0]);
  assert.deepEqual(axis.ticks.map(formatMonthlyRevenueAxisTick), ["12,000만", "9,000만", "6,000만", "3,000만", "0"]);

  const emptyAxis = buildMonthlyRevenueAxis([]);
  assert.equal(emptyAxis.maximum, 30_000_000);
  assert.deepEqual(emptyAxis.ticks, [30_000_000, 0]);
});

test("Home bank model uses registered-client receipts, operating outflows, and aggregate payroll", () => {
  const current = {
    kind: "data",
    uiState: "ready",
    item: {
      summary: {
        total_outflow: 227_166_172,
      },
      business_summary: {
        currency: "KRW",
        sales_amount: 21_385_200,
        operating_expense_amount: 136_100_193,
        payroll_payment_amount: 91_065_979,
        non_operating_amount: 138_057_860,
        status: "passed",
      },
      payroll_categories: [
        { category: "partner", label: "파트너", gross_krw: 68_848_440, employee_count: 6 },
        { category: "staff", label: "직원", gross_krw: 12_646_327, employee_count: 3 },
        { category: "advisor", label: "고문", gross_krw: 9_571_212, employee_count: 1 },
      ],
      non_payroll_outflow_categories: [
        { category: "tax", label: "세금", amount: 54_037_570, transaction_count: 4 },
        { category: "card_settlement", label: "카드대금", amount: 44_424_303, transaction_count: 13 },
        { category: "social_insurance", label: "4대보험", amount: 11_404_440, transaction_count: 4 },
        { category: "professional_services", label: "용역·외주", amount: 11_295_000, transaction_count: 4 },
        { category: "rent_office", label: "임차·사무실", amount: 10_887_030, transaction_count: 1 },
        { category: "finance_lease", label: "금융·리스", amount: 2_674_430, transaction_count: 2 },
        { category: "general_operating", label: "기타 운영비", amount: 685_620, transaction_count: 20 },
        { category: "case_disbursement", label: "사건비용", amount: 645_410, transaction_count: 11 },
        { category: "bank_postage_fee", label: "수수료·우편", amount: 46_390, transaction_count: 11 },
      ],
    },
  };
  const history = {
    kind: "data",
    item: {
      monthly: [
        { month: "2026-06", currency: "KRW", sales_amount: 10_000_000, operating_expense_amount: 20_000_000 },
        { month: "2026-07", currency: "KRW", sales_amount: 21_385_200, operating_expense_amount: 136_100_193 },
      ],
    },
  };
  const model = buildBankCashflowDashboardModel(current, history, { now: NOW });
  assert.equal(model.current.billed_amount, 21_385_200);
  assert.equal(model.current.non_payroll_outflow, 136_100_193);
  assert.equal(model.current.processed_cost, 136_100_193);
  assert.equal(
    model.current.processed_cost,
    current.item.summary.total_outflow - current.item.business_summary.payroll_payment_amount,
  );
  assert.equal(model.payroll_summary.gross_krw, 91_065_979);
  assert.equal(model.payroll_summary.categories.reduce((sum, row) => sum + row.gross_krw, 0), 91_065_979);
  assert.deepEqual(model.payroll_summary.categories.map(({ category, employee_count }) => [category, employee_count]), [
    ["partner", 6],
    ["staff", 3],
    ["advisor", 1],
  ]);
  assert.equal(model.series.length, 6);
  assert.equal(model.series.at(-1).amount, 21_385_200);
  assert.deepEqual(model.non_payroll_outflow_summary.categories.map(({ label, amount }) => [label, amount]), [
    ["세금", 54_037_570],
    ["카드대금", 44_424_303],
    ["4대보험", 11_404_440],
    ["용역·외주", 11_295_000],
    ["임차·사무실", 10_887_030],
    ["기타", 4_051_850],
  ]);
  assert.equal(
    model.non_payroll_outflow_summary.categories.reduce((sum, row) => sum + row.amount, 0),
    model.current.non_payroll_outflow,
  );
  assert.equal(model.non_payroll_outflow_summary.source_complete, true);
  assert.equal(JSON.stringify(model).includes("employee_id"), false);
});

test("Home dashboard never treats an unallocated bank receipt candidate as recognized revenue", () => {
  const revenue = {
    kind: "data",
    uiState: "ready",
    filters: { recognition_basis: "collected" },
    items: [{
      month: "2026-07",
      currency: "KRW",
      billed_amount: 240,
      revenue_amount: 160,
      invoice_collected_amount: 100,
      direct_fee_amount: 60,
      unallocated_receipt_amount: 40,
      recognition_basis: "collected",
    }],
  };
  const currentCashflow = {
    kind: "data",
    uiState: "ready",
    item: {
      summary: { total_outflow: 70 },
      business_summary: {
        currency: "KRW",
        sales_amount: 999,
        payroll_payment_amount: 20,
        operating_expense_amount: 50,
        status: "passed",
      },
    },
  };
  const historyCashflow = {
    kind: "data",
    uiState: "ready",
    item: { monthly: [{ month: "2026-07", currency: "KRW", sales_amount: 999 }] },
  };

  const model = buildHomeFinanceDashboardModel(revenue, currentCashflow, historyCashflow, { now: NOW });

  assert.equal(model.current.revenue_amount, 160);
  assert.equal(model.current.invoice_collected_amount, 100);
  assert.equal(model.current.direct_fee_amount, 60);
  assert.equal(model.current.unallocated_receipt_amount, 40);
  assert.equal(model.series.length, 6);
  assert.equal(model.series.at(-1).amount, 160);
  assert.notEqual(model.current.revenue_amount, currentCashflow.item.business_summary.sales_amount);
  assert.equal(model.current.non_payroll_outflow, 50);
  assert.equal(model.payroll_summary.gross_krw, 20);
});

test("Home monthly non-payroll outflow subtracts payroll before using the compatibility fallback", () => {
  const model = buildBankCashflowDashboardModel({
    kind: "data",
    uiState: "ready",
    item: {
      summary: { total_outflow: 50_000_000 },
      business_summary: {
        currency: "KRW",
        sales_amount: 0,
        operating_expense_amount: 35_000_000,
        payroll_payment_amount: 20_000_000,
        status: "passed",
      },
    },
  }, { kind: "data", uiState: "ready", item: { monthly: [] } }, { now: NOW });
  assert.equal(model.current.non_payroll_outflow, 30_000_000);
  assert.equal(model.current.processed_cost, 30_000_000);
  assert.deepEqual(model.non_payroll_outflow_summary.categories, [{
    category: "unclassified",
    label: "미분류",
    amount: 30_000_000,
    transaction_count: 0,
  }]);
  assert.equal(model.non_payroll_outflow_summary.source_complete, false);
});

test("Home client model counts current-month clients and deduplicates active prospects by explicit identity", () => {
  const model = buildClientDashboardModel({
    accounts: data([{ account_id: "account-1", account_type: "client", created_at: "2026-07-01T01:00:00Z" }]),
    leads: data([
      { lead_id: "lead-1", party_id: "party-1", status: "active", created_at: "2026-07-02T01:00:00Z" },
      { lead_id: "lead-lost", party_id: "party-2", status: "lost", created_at: "2026-07-03T01:00:00Z" },
    ]),
    opportunities: data([{ opportunity_id: "opp-1", party_id: "party-1", stage: "qualified", updated_at: "2026-07-04T01:00:00Z" }]),
  }, { now: NOW });
  assert.equal(model.new_clients.length, 1);
  assert.equal(model.prospects.length, 1);
});

test("Home matter and leave models apply current-month and subtype contracts", () => {
  const matters = buildMatterDashboardModel(data([
    { matter_id: "matter-new", status: "active", opened_at: "2026-07-02T01:00:00Z" },
    { matter_id: "matter-old", status: "active", opened_at: "2026-06-02T01:00:00Z" },
    { matter_id: "matter-closed", status: "closed", closed_at: "2026-07-03T01:00:00Z" },
  ]), { now: NOW });
  assert.deepEqual(matters.new_matters.map((item) => item.matter_id), ["matter-new"]);
  assert.deepEqual(matters.closed_matters.map((item) => item.matter_id), ["matter-closed"]);

  const leave = buildLeaveDashboardModel(data([
    { id: "leave-2", subtype: "leave", due_at: "2026-07-04T01:00:00Z" },
    { id: "expense-1", subtype: "expenses", due_at: "2026-07-01T01:00:00Z" },
    { id: "leave-1", subtype: "leave", due_at: "2026-07-02T01:00:00Z" },
  ]));
  assert.deepEqual(leave.recent.map((item) => item.id), ["leave-1", "leave-2"]);
});

test("Home dashboard states never turn denied or review-required results into fake zero data", () => {
  assert.equal(dashboardResultState({ kind: "data", uiState: "denied", items: [] }), "denied");
  assert.equal(dashboardResultState({ kind: "guarded", status: 503, outcome: "blocked", uiState: "error", items: [] }), "error");
  assert.equal(dashboardResultState({ kind: "guarded", status: 403, outcome: "blocked", uiState: "denied", items: [] }), "denied");
  assert.equal(dashboardResultState({ kind: "step_up_required" }), "review_required");
  assert.equal(dashboardResultState({ kind: "error" }), "error");
});

test("Home dashboard retries transient read failures without retrying guarded outcomes", async () => {
  let attempts = 0;
  const waits = [];
  const recovered = await readDashboardResultWithRetry(
    async () => {
      attempts += 1;
      return attempts < 3 ? { kind: "error" } : { kind: "data", item: { amount: 21_385_200 } };
    },
    {
      source: "dashboard_finance_cashflow",
      delayMs: 10,
      wait: async (delayMs) => waits.push(delayMs),
    },
  );
  assert.equal(attempts, 3);
  assert.deepEqual(waits, [10, 20]);
  assert.equal(recovered.item.amount, 21_385_200);

  let guardedAttempts = 0;
  const guarded = await readDashboardResultWithRetry(async () => {
    guardedAttempts += 1;
    return { kind: "guarded", uiState: "denied", status: 403 };
  });
  assert.equal(guardedAttempts, 1);
  assert.equal(guarded.uiState, "denied");
});
