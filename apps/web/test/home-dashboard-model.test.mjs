import assert from "node:assert/strict";
import test from "node:test";
import {
  buildClientDashboardModel,
  buildBankCashflowDashboardModel,
  buildFinanceDashboardModel,
  buildLeaveDashboardModel,
  buildMatterDashboardModel,
  dashboardResultState,
  seoulMonthKey,
} from "../src/components/HomeDashboardModel.js";

const NOW = new Date("2026-07-15T03:00:00.000Z");
const data = (items) => ({ kind: "data", uiState: "ready", items });

test("Home dashboard month boundaries use Asia/Seoul", () => {
  assert.equal(seoulMonthKey("2026-06-30T14:59:59.000Z"), "2026-06");
  assert.equal(seoulMonthKey("2026-06-30T15:00:00.000Z"), "2026-07");
});

test("Home finance model shares the KRW billed source between KPI and 12-month line series", () => {
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

test("Home bank model uses registered-client receipts, operating outflows, and aggregate payroll", () => {
  const current = {
    kind: "data",
    uiState: "ready",
    item: {
      business_summary: {
        currency: "KRW",
        sales_amount: 21_385_200,
        operating_expense_amount: 136_100_193,
        payroll_payment_amount: 91_065_979,
        non_operating_amount: 138_057_860,
        status: "passed",
      },
      payroll_categories: [
        { category: "partner", label: "파트너", gross_krw: 51_890_090, employee_count: 4 },
        { category: "staff", label: "직원", gross_krw: 29_604_677, employee_count: 5 },
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
  assert.equal(model.payroll_summary.gross_krw, 91_065_979);
  assert.equal(model.payroll_summary.categories.reduce((sum, row) => sum + row.gross_krw, 0), 91_065_979);
  assert.equal(model.series.at(-1).amount, 21_385_200);
  assert.equal(JSON.stringify(model).includes("employee_id"), false);
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
