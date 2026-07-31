import assert from "node:assert/strict";
import test from "node:test";
import { runHrxMigrations } from "../src/migrations/index.js";
import {
  createPayrollAllowanceRulePackage,
  createPayrollAllowanceRuleService,
} from "../src/payroll/allowance-rule-service.js";
import { calculatePayrollEarnings } from "../src/payroll/calculation-engine.js";
import { createPayrollRepository } from "../src/payroll/repository.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const AUTHOR = Object.freeze({ tenant_id: "tenant-allowance-rules", actor_id: "rule-author" });
const REVIEWER = Object.freeze({ tenant_id: "tenant-allowance-rules", actor_id: "rule-reviewer" });

function rules(overrides = {}) {
  return {
    schema_version: "law-firm-os.hrx.payroll-earning-rules.v0.1",
    fixture_only: true,
    currency: "KRW",
    rounding_mode: "nearest",
    monthly: { proration_basis: "calendar_days", rate_divisor_minutes: 9_600, unpaid_leave: null },
    segment_rates: {
      overtime: { rate_bps: 15_000, taxable: true },
      night: { rate_bps: 5_000, taxable: true },
      holiday: { rate_bps: 20_000, taxable: true },
      weekly_holiday: { rate_bps: 10_000, taxable: true },
    },
    allowances: [],
    unused_leave: null,
    ...overrides,
  };
}

function ruleInput(versionCode, effectiveFrom, effectiveTo, ruleOverrides = {}) {
  return {
    version_code: versionCode,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    source_document_hash: versionCode.startsWith("V1") ? "a".repeat(64) : "b".repeat(64),
    rules: rules(ruleOverrides),
  };
}

function resolved() {
  return {
    snapshot: { snapshot_id: "snapshot-allowance", employee_id: "emp-1", source_hash: "c".repeat(64) },
    compensation: { amount_krw: 12_000, currency: "KRW" },
    input: {
      payroll_profile: { employment_type: "hourly", pay_group_code: "KR-HOURLY", currency: "KRW", compensation_ref: "compensation:emp-1", compensation_unit: "hour", compensation_quantity: 1, withholding_category: null },
      lifecycle: { lifecycle_status: "active", active_calendar_days: 31, period_calendar_days: 31, starts_in_period: false, ends_in_period: false },
      attendance: { payable_minutes: 0 },
      overtime: { overtime_minutes: 60, night_minutes: 0, holiday_minutes: 0, weekly_holiday_minutes: 480 },
      leave: { paid_minutes: 0, unpaid_minutes: 0, unused_balance_minutes: 0 },
      policy: { standard_day_minutes: 480 },
    },
  };
}

function runtime() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  let sequence = 0;
  const repository = createPayrollRepository({ store, clock: () => "2026-07-30T00:00:00.000Z", idFactory: (prefix) => `${prefix}-${++sequence}` });
  return {
    store,
    repository,
    disabled: createPayrollAllowanceRuleService({ payrollRepository: repository, publishEnabled: false }),
    enabled: createPayrollAllowanceRuleService({ payrollRepository: repository, publishEnabled: true }),
  };
}

test("PEO-TUW-065 accepts only bounded inputs, operators, and rounding enums", () => {
  const normalized = createPayrollAllowanceRulePackage(ruleInput("V1-2026-H1", "2026-01-01", "2026-06-30"));
  assert.deepEqual(Object.keys(normalized.rules.segment_rates).sort(), ["holiday", "night", "overtime", "weekly_holiday"]);
  assert.equal(normalized.rules.rounding_mode, "nearest");
  assert.throws(() => createPayrollAllowanceRulePackage(ruleInput("V1-BAD-JS", "2026-01-01", "2026-06-30", { javascript: "return process.env" })), /unsupported field javascript/);
  assert.throws(() => createPayrollAllowanceRulePackage(ruleInput("V1-BAD-EXPR", "2026-01-01", "2026-06-30", { segment_rates: { overtime: { rate_bps: 15_000, taxable: true, expression: "amount * 9" } } })), /unsupported field expression/);
  assert.throws(() => createPayrollAllowanceRulePackage(ruleInput("V1-BAD-ROUND", "2026-01-01", "2026-06-30", { rounding_mode: "eval" })), /rounding_mode is invalid/);
  assert.throws(() => createPayrollAllowanceRulePackage(ruleInput("V1-BAD-INPUT", "2026-01-01", "2026-06-30", { segment_rates: { arbitrary_database_field: { rate_bps: 1, taxable: true } } })), /unsupported field arbitrary_database_field/);
});

test("PEO-TUW-065 enforces draft-review-publish, separation, flag, and contiguous dates", () => {
  const value = runtime();
  let first = value.disabled.createDraft(AUTHOR, { rule_version_id: "allowance-v1", ...ruleInput("V1-2026-H1", "2026-01-01", "2026-06-30"), rule_kind: "arbitrary" });
  assert.equal(first.rule_kind, "payroll_earnings");
  assert.equal(first.approval_state, "draft");
  assert.throws(() => calculatePayrollEarnings({ resolved_input: resolved(), rule_version: first }), /must be published/);
  assert.throws(() => value.disabled.review(AUTHOR, { rule_version_id: first.rule_version_id, expected_version: 1 }), (error) => error.safe_error_code === "HRX_PAYROLL_SELF_APPROVAL");
  first = value.disabled.review(REVIEWER, { rule_version_id: first.rule_version_id, expected_version: 1 });
  assert.throws(() => value.disabled.publish(REVIEWER, { rule_version_id: first.rule_version_id, expected_version: 2 }), (error) => error.safe_error_code === "HRX_PAYROLL_RULE_PUBLISH_DISABLED");
  first = value.enabled.publish(REVIEWER, { rule_version_id: first.rule_version_id, expected_version: 2 });
  assert.equal(first.approval_state, "published");

  let overlapping = value.enabled.createDraft(AUTHOR, { rule_version_id: "allowance-overlap", ...ruleInput("V2-OVERLAP", "2026-06-30", "2026-12-31") });
  overlapping = value.enabled.review(REVIEWER, { rule_version_id: overlapping.rule_version_id, expected_version: 1 });
  assert.throws(() => value.enabled.publish(REVIEWER, { rule_version_id: overlapping.rule_version_id, expected_version: 2 }), (error) => error.safe_error_code === "HRX_PAYROLL_RULE_COVERAGE_INVALID");
  value.store.close();
});

test("PEO-TUW-065 reproduces historical published rules and calculates approved weekly holiday minutes without expressions", () => {
  const value = runtime();
  let first = value.enabled.createDraft(AUTHOR, { rule_version_id: "allowance-history-v1", ...ruleInput("V1-HISTORY", "2026-01-01", "2026-06-30") });
  first = value.enabled.review(REVIEWER, { rule_version_id: first.rule_version_id, expected_version: 1 });
  first = value.enabled.publish(REVIEWER, { rule_version_id: first.rule_version_id, expected_version: 2 });
  let second = value.enabled.createDraft(AUTHOR, {
    rule_version_id: "allowance-history-v2",
    ...ruleInput("V2-HISTORY", "2026-07-01", "2026-12-31", {
      segment_rates: {
        ...rules().segment_rates,
        weekly_holiday: { rate_bps: 12_500, taxable: true },
      },
    }),
  });
  second = value.enabled.review(REVIEWER, { rule_version_id: second.rule_version_id, expected_version: 1 });
  second = value.enabled.publish(REVIEWER, { rule_version_id: second.rule_version_id, expected_version: 2 });
  const firstResult = calculatePayrollEarnings({ resolved_input: resolved(), rule_version: first });
  const repeated = calculatePayrollEarnings({ resolved_input: resolved(), rule_version: first });
  const secondResult = calculatePayrollEarnings({ resolved_input: resolved(), rule_version: second });
  assert.equal(firstResult.result_hash, repeated.result_hash);
  assert.equal(firstResult.line_items.find((row) => row.item_code === "WEEKLY_HOLIDAY").amount_krw, 96_000);
  assert.equal(secondResult.line_items.find((row) => row.item_code === "WEEKLY_HOLIDAY").amount_krw, 120_000);
  assert.notEqual(firstResult.result_hash, secondResult.result_hash);
  value.store.close();
});
