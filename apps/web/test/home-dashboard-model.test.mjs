import assert from "node:assert/strict";
import test from "node:test";
import {
  buildClientDashboardModel,
  buildBankCashflowDashboardModel,
  buildFinanceDashboardModel,
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

test("Home finance model shares the KRW billed source between KPI and 12-month bar series", () => {
  const model = buildFinanceDashboardModel(data([
    { month: "2026-06", currency: "KRW", billed_amount: 800, processed_cost: 100 },
    { month: "2026-07", currency: "KRW", billed_amount: 1_000, processed_cost: 125 },
    { month: "2026-07", currency: "USD", billed_amount: 2_000, processed_cost: 500 },
  ]), { now: NOW });
  assert.equal(model.current.billed_amount, 1_000);
  assert.equal(model.current.processed_cost, 125);
  assert.equal(model.series.length, 12);
  assert.equal(model.series.at(-1).amount, model.current.billed_amount);
  assert.equal(model.revenue_change_percent, 25);
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
  assert.equal(model.series.at(-1).amount, 21_385_200);
  assert.equal(JSON.stringify(model).includes("employee_id"), false);
});

test("Home monthly expense subtracts payroll from bank outflow before using the compatibility fallback", () => {
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
  assert.equal(model.current.processed_cost, 30_000_000);
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
