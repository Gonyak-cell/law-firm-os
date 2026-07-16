import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  calculatePayrollEarnings,
  createPayrollEarningRules,
  HRX_PAYROLL_EARNING_RULES_SCHEMA_VERSION,
} from "../src/payroll/calculation-engine.js";
import { createHrxLeavePayrollGoldenFixture } from "../src/golden-fixture.js";

const HASH = "a".repeat(64);

function ruleVersion(overrides = {}) {
  const rules = {
    schema_version: HRX_PAYROLL_EARNING_RULES_SCHEMA_VERSION,
    fixture_only: true,
    currency: "KRW",
    rounding_mode: "nearest",
    monthly: { proration_basis: "calendar_days", rate_divisor_minutes: 9_600 },
    segment_rates: {},
    allowances: [],
    unused_leave: null,
    ...overrides,
  };
  if (overrides.monthly) rules.monthly = { proration_basis: "calendar_days", rate_divisor_minutes: 9_600, ...overrides.monthly };
  return {
    rule_version_id: "rule-earnings-synthetic-v1",
    rule_kind: "payroll_earnings",
    version_code: "SYNTHETIC-2026-07",
    source_document_hash: HASH,
    approval_state: "published",
    rules_json: JSON.stringify(rules),
  };
}

function resolved(type, options = {}) {
  const defaults = { monthly: [5_000_000, "period"], hourly: [12_000, "hour"], daily: [120_000, "day"], freelancer: [500_000, "contract"] }[type];
  return {
    snapshot: { snapshot_id: `snapshot-${type}`, employee_id: `employee-${type}`, source_hash: "b".repeat(64) },
    compensation: { amount_krw: options.amount_krw ?? defaults[0], currency: "KRW" },
    input: {
      payroll_profile: {
        employment_type: type,
        pay_group_code: options.pay_group_code ?? `KR-${type.toUpperCase()}`,
        currency: "KRW",
        compensation_ref: `compensation:${type}`,
        compensation_unit: options.compensation_unit ?? defaults[1],
        compensation_quantity: options.compensation_quantity ?? 1,
        withholding_category: options.withholding_category ?? (type === "freelancer" ? "SYNTHETIC_SERVICE" : null),
      },
      lifecycle: {
        lifecycle_status: options.lifecycle_status ?? "active",
        active_calendar_days: options.active_calendar_days ?? 31,
        period_calendar_days: options.period_calendar_days ?? 31,
        starts_in_period: options.starts_in_period ?? false,
        ends_in_period: options.ends_in_period ?? false,
      },
      attendance: { payable_minutes: options.payable_minutes ?? 0 },
      overtime: { overtime_minutes: options.overtime_minutes ?? 0, night_minutes: options.night_minutes ?? 0, holiday_minutes: options.holiday_minutes ?? 0 },
      leave: { paid_minutes: options.paid_minutes ?? 0, unpaid_minutes: options.unpaid_minutes ?? 0, unused_balance_minutes: options.unused_balance_minutes ?? 0 },
      policy: { standard_day_minutes: options.standard_day_minutes ?? 480 },
    },
  };
}

test("PY-CALC-002 calculates full, mid-month, leap-month, and explicit unpaid-leave monthly pay", () => {
  const rules = ruleVersion({ monthly: { unpaid_leave: { rate_bps: 10_000, taxable: true } } });
  assert.equal(calculatePayrollEarnings({ resolved_input: resolved("monthly"), rule_version: rules }).gross_krw, 5_000_000);
  assert.equal(calculatePayrollEarnings({ resolved_input: resolved("monthly", { amount_krw: 3_000_000, active_calendar_days: 17 }), rule_version: rules }).gross_krw, 1_645_161);
  assert.equal(calculatePayrollEarnings({ resolved_input: resolved("monthly", { amount_krw: 2_900_000, active_calendar_days: 15, period_calendar_days: 29 }), rule_version: rules }).gross_krw, 1_500_000);
  const leave = calculatePayrollEarnings({ resolved_input: resolved("monthly", { unpaid_minutes: 480, lifecycle_status: "on_leave" }), rule_version: rules });
  assert.equal(leave.line_items.find((line) => line.item_code === "UNPAID_LEAVE").amount_krw, -250_000);
  assert.equal(leave.gross_krw, 4_750_000);
});

test("PY-CALC-003/004 calculates hourly minutes and normalized daily half-days", () => {
  assert.equal(calculatePayrollEarnings({ resolved_input: resolved("hourly", { payable_minutes: 61, paid_minutes: 30 }), rule_version: ruleVersion() }).gross_krw, 18_200);
  assert.equal(calculatePayrollEarnings({ resolved_input: resolved("daily", { payable_minutes: 480, paid_minutes: 240 }), rule_version: ruleVersion() }).gross_krw, 180_000);
});

test("PY-CALC-005 calculates freelancer units and requires a withholding category", () => {
  const result = calculatePayrollEarnings({ resolved_input: resolved("freelancer", { compensation_quantity: 3, compensation_unit: "deliverable" }), rule_version: ruleVersion() });
  assert.equal(result.gross_krw, 1_500_000);
  assert.equal(result.line_items[0].metadata.withholding_category, "SYNTHETIC_SERVICE");
  assert.throws(() => calculatePayrollEarnings({ resolved_input: resolved("freelancer", { withholding_category: "" }), rule_version: ruleVersion() }), (error) => error.safe_error_code === "HRX_PAYROLL_WITHHOLDING_CATEGORY_REQUIRED");
});

test("PY-CALC-006 applies versioned taxable and non-taxable allowance limits", () => {
  const rule = ruleVersion({
    allowances: [
      { code: "MEAL", amount_kind: "fixed", amount_krw: 250_000, taxable: false, non_taxable_limit_krw: 200_000, employment_types: ["monthly"] },
      { code: "ROLE", amount_kind: "base_rate_bps", rate_bps: 1_000, taxable: true, pay_groups: ["KR-MONTHLY"] },
    ],
  });
  const result = calculatePayrollEarnings({ resolved_input: resolved("monthly", { amount_krw: 1_000_000 }), rule_version: rule });
  assert.equal(result.gross_krw, 1_350_000);
  assert.equal(result.taxable_gross_krw, 1_150_000);
  assert.equal(result.non_taxable_gross_krw, 200_000);
  assert.equal(createPayrollEarningRules(rule).allowances.length, 2);
  assert.throws(() => createPayrollEarningRules({ ...rule, approval_state: "draft" }), /must be published/);
});

test("PY-CALC-007 calculates only captured approved segment totals with explicit additive rates", () => {
  const rule = ruleVersion({
    segment_rates: {
      overtime: { rate_bps: 15_000, taxable: true },
      night: { rate_bps: 5_000, taxable: true },
      holiday: { rate_bps: 20_000, taxable: true },
    },
  });
  const result = calculatePayrollEarnings({ resolved_input: resolved("hourly", { overtime_minutes: 120, night_minutes: 60, holiday_minutes: 60 }), rule_version: rule });
  assert.equal(result.line_items.find((line) => line.item_code === "OVERTIME").amount_krw, 36_000);
  assert.equal(result.line_items.find((line) => line.item_code === "NIGHT").amount_krw, 6_000);
  assert.equal(result.line_items.find((line) => line.item_code === "HOLIDAY").amount_krw, 24_000);
  assert.equal(result.gross_krw, 66_000);
  const missing = calculatePayrollEarnings({ resolved_input: resolved("hourly", { overtime_minutes: 60 }), rule_version: ruleVersion() });
  assert.deepEqual(missing.issues.map((entry) => entry.issue_code), ["PAYROLL_SEGMENT_RULE_MISSING"]);
});

test("PY-CALC-008 calculates eligible unused leave from the frozen balance and explicit rate basis", () => {
  const rule = ruleVersion({ unused_leave: { rate_bps: 10_000, taxable: true, eligibility: "ends_in_period", max_minutes: 960, employment_types: ["monthly"] } });
  const result = calculatePayrollEarnings({ resolved_input: resolved("monthly", { ends_in_period: true, lifecycle_status: "terminated", unused_balance_minutes: 1_440 }), rule_version: rule });
  const line = result.line_items.find((item) => item.item_code === "UNUSED_LEAVE");
  assert.equal(line.quantity_minutes, 960);
  assert.equal(line.amount_krw, 500_000);
  const ineligible = calculatePayrollEarnings({ resolved_input: resolved("monthly", { unused_balance_minutes: 960 }), rule_version: rule });
  assert.equal(ineligible.line_items.some((item) => item.item_code === "UNUSED_LEAVE"), false);
});

test("PY-CALC-009 adds immutable delta-only prior-run adjustments deterministically", () => {
  const source = resolved("monthly", { amount_krw: 1_000_000 });
  const before = structuredClone(source);
  const adjustments = [
    { adjustment_ref: "artifact:hrx/payroll-adjustment/a", previous_run_ref: "payroll-run:closed-a", reason_code: "RETRO_RATE", amount_krw: 100_000, taxable: true },
    { adjustment_ref: "artifact:hrx/payroll-adjustment/b", previous_run_ref: "payroll-run:closed-a", reason_code: "CORRECTION", amount_krw: -25_000, taxable: true },
  ];
  const first = calculatePayrollEarnings({ resolved_input: source, rule_version: ruleVersion(), adjustments });
  const second = calculatePayrollEarnings({ resolved_input: source, rule_version: ruleVersion(), adjustments: [...adjustments].reverse() });
  assert.equal(first.gross_krw, 1_075_000);
  assert.equal(first.result_hash, second.result_hash);
  assert.deepEqual(source, before);
  assert.equal(first.line_items.filter((line) => line.item_kind === "adjustment").length, 2);
});

test("PY-CALC-002~008 executes the shared leave-payroll golden boundary fixture without silent exclusions", () => {
  const fixture = createHrxLeavePayrollGoldenFixture(JSON.parse(readFileSync(new URL("../fixtures/leave-payroll-golden.synthetic.json", import.meta.url), "utf8")));
  const dayCount = (start, end) => Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
  const rule = ruleVersion({
    segment_rates: {
      overtime: { rate_bps: 15_000, taxable: true, employment_types: ["monthly", "hourly", "daily"] },
      night: { rate_bps: 5_000, taxable: true, employment_types: ["monthly", "hourly", "daily"] },
      holiday: { rate_bps: 20_000, taxable: true, employment_types: ["monthly", "hourly", "daily"] },
    },
    unused_leave: { rate_bps: 10_000, taxable: true, eligibility: "ends_in_period", max_minutes: 960, employment_types: ["monthly"] },
  });
  const results = fixture.employees.map((employee) => {
    const activeFrom = [fixture.period.start, employee.employment_start].sort().at(-1);
    const activeTo = [fixture.period.end, employee.employment_end].filter(Boolean).sort()[0];
    const input = resolved(employee.payroll_profile.pay_basis, {
      amount_krw: employee.payroll_profile.rate_krw,
      paid_minutes: employee.leave.paid_minutes,
      unpaid_minutes: employee.leave.unpaid_minutes,
      unused_balance_minutes: employee.leave.unused_minutes,
      overtime_minutes: employee.approved_time.regular_overtime_minutes,
      night_minutes: employee.approved_time.night_minutes,
      holiday_minutes: employee.approved_time.holiday_minutes,
      active_calendar_days: dayCount(activeFrom, activeTo),
      period_calendar_days: dayCount(fixture.period.start, fixture.period.end),
      starts_in_period: activeFrom > fixture.period.start,
      ends_in_period: activeTo < fixture.period.end,
      lifecycle_status: employee.employment_end ? "terminated" : "active",
    });
    input.snapshot.employee_id = employee.employee_id;
    input.snapshot.snapshot_id = `snapshot-${employee.employee_id}`;
    return calculatePayrollEarnings({ resolved_input: input, rule_version: rule });
  });
  assert.equal(results.length, fixture.expected_totals.employee_count);
  assert.equal(results.find((row) => row.employee_id === "golden-full-month").gross_krw, 4_000_000);
  assert.equal(results.find((row) => row.employee_id === "golden-mid-month-hire").gross_krw, 1_645_161);
  assert.equal(results.find((row) => row.employee_id === "golden-mid-month-termination").gross_krw, 3_725_806);
  assert.equal(results.find((row) => row.employee_id === "golden-hourly-overtime").gross_krw, 87_500);
  assert.equal(results.find((row) => row.employee_id === "golden-leave-dependent-boundary").gross_krw, 75_000);
  assert.deepEqual(results.find((row) => row.employee_id === "golden-contractor-holiday").issues.map((entry) => entry.issue_code), ["PAYROLL_SEGMENT_RULE_MISSING"]);
});
