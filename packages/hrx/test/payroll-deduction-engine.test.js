import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calculatePayrollDeductions } from "../src/payroll/deduction-engine.js";

const PACKAGE = JSON.parse(readFileSync(new URL("../fixtures/payroll-statutory-rules.synthetic.json", import.meta.url), "utf8"));

function ruleVersion() {
  return { rule_version_id: "rule-statutory-synthetic", rule_kind: "payroll_statutory", version_code: PACKAGE.version_code, source_document_hash: PACKAGE.source_document_hash, approval_state: "published", rules_json: JSON.stringify(PACKAGE) };
}

function earnings(overrides = {}) {
  return { employee_id: "employee-deduction", gross_krw: 2_500_000, taxable_gross_krw: 2_500_000, non_taxable_gross_krw: 0, result_hash: "d".repeat(64), ...overrides };
}

function input(overrides = {}) {
  return {
    dependent_count: 0,
    income_tax_exempt: false,
    withholding_category: null,
    pension: { enrolled: true },
    health: { enrolled: true },
    employment_insurance: { enrolled: true },
    ...overrides,
  };
}

test("PY-DED-002 links dependent tax-table lookup and local income tax at bracket boundaries", () => {
  const zero = calculatePayrollDeductions({ earnings_result: earnings({ gross_krw: 999_999, taxable_gross_krw: 999_999 }), deduction_input: input({ pension: { enrolled: false }, health: { enrolled: false }, employment_insurance: { enrolled: false } }), statutory_rule_version: ruleVersion() });
  assert.equal(zero.deduction_krw, 0);
  const noDependent = calculatePayrollDeductions({ earnings_result: earnings(), deduction_input: input(), statutory_rule_version: ruleVersion() });
  const threeDependents = calculatePayrollDeductions({ earnings_result: earnings(), deduction_input: input({ dependent_count: 3 }), statutory_rule_version: ruleVersion() });
  assert.equal(noDependent.line_items.find((line) => line.item_code === "INCOME_TAX").amount_krw, 150_000);
  assert.equal(noDependent.line_items.find((line) => line.item_code === "LOCAL_INCOME_TAX").amount_krw, 15_000);
  assert.equal(threeDependents.line_items.find((line) => line.item_code === "INCOME_TAX").amount_krw, 100_000);
  const freelancer = calculatePayrollDeductions({ earnings_result: earnings({ gross_krw: 1_000_000, taxable_gross_krw: 1_000_000 }), deduction_input: input({ withholding_category: "SYNTHETIC_SERVICE", pension: { enrolled: false }, health: { enrolled: false }, employment_insurance: { enrolled: false } }), statutory_rule_version: ruleVersion() });
  assert.equal(freelancer.line_items.find((line) => line.item_code === "INCOME_TAX").amount_krw, 30_000);
});

test("PY-DED-003 clamps pension contribution bases and excludes unenrolled employees", () => {
  const low = calculatePayrollDeductions({ earnings_result: earnings({ gross_krw: 500_000, taxable_gross_krw: 500_000 }), deduction_input: input({ pension: { enrolled: true, contribution_base_krw: 500_000 }, health: { enrolled: false }, employment_insurance: { enrolled: false } }), statutory_rule_version: ruleVersion() });
  assert.equal(low.line_items.find((line) => line.item_code === "PENSION").amount_krw, 50_000);
  const high = calculatePayrollDeductions({ earnings_result: earnings({ gross_krw: 10_000_000, taxable_gross_krw: 10_000_000 }), deduction_input: input({ pension: { enrolled: true, contribution_base_krw: 10_000_000 }, health: { enrolled: false }, employment_insurance: { enrolled: false } }), statutory_rule_version: ruleVersion() });
  assert.equal(high.line_items.find((line) => line.item_code === "PENSION").amount_krw, 150_000);
  const excluded = calculatePayrollDeductions({ earnings_result: earnings(), deduction_input: input({ pension: { enrolled: false } }), statutory_rule_version: ruleVersion() });
  assert.equal(excluded.line_items.some((line) => line.item_code === "PENSION"), false);
});

test("PY-DED-004 calculates health and long-term care from the same published rule version", () => {
  const result = calculatePayrollDeductions({ earnings_result: earnings(), deduction_input: input({ pension: { enrolled: false }, employment_insurance: { enrolled: false } }), statutory_rule_version: ruleVersion() });
  assert.equal(result.line_items.find((line) => line.item_code === "HEALTH_INSURANCE").amount_krw, 100_000);
  assert.equal(result.line_items.find((line) => line.item_code === "LONG_TERM_CARE").amount_krw, 10_000);
});

test("PY-DED-005 calculates employment insurance and excludes unenrolled profiles", () => {
  const enrolled = calculatePayrollDeductions({ earnings_result: earnings(), deduction_input: input({ pension: { enrolled: false }, health: { enrolled: false } }), statutory_rule_version: ruleVersion() });
  assert.equal(enrolled.line_items.find((line) => line.item_code === "EMPLOYMENT_INSURANCE").amount_krw, 25_000);
  const excluded = calculatePayrollDeductions({ earnings_result: earnings(), deduction_input: input({ pension: { enrolled: false }, health: { enrolled: false }, employment_insurance: { enrolled: false } }), statutory_rule_version: ruleVersion() });
  assert.equal(excluded.line_items.some((line) => line.item_code === "EMPLOYMENT_INSURANCE"), false);
});

test("PY-DED-006 applies fixed, rate, and remaining installment schedules without crossing the net floor", () => {
  const custom = [
    { schedule_ref: "artifact:deduction/fixed", code: "CLUB", amount_kind: "fixed", amount_krw: 50_000 },
    { schedule_ref: "artifact:deduction/rate", code: "UNION", amount_kind: "rate", rate_bps: 100, rate_base: "gross" },
    { schedule_ref: "artifact:deduction/installment", code: "LOAN", amount_kind: "installment", installment_amount_krw: 200_000, installment_count: 3, installments_applied: 2, remaining_amount_krw: 120_000 }
  ];
  const result = calculatePayrollDeductions({ earnings_result: earnings(), deduction_input: input(), statutory_rule_version: ruleVersion(), custom_deductions: custom });
  assert.equal(result.line_items.find((line) => line.item_code === "CUSTOM_CLUB").amount_krw, 50_000);
  assert.equal(result.line_items.find((line) => line.item_code === "CUSTOM_UNION").amount_krw, 25_000);
  assert.equal(result.line_items.find((line) => line.item_code === "CUSTOM_LOAN").amount_krw, 120_000);
  const floor = calculatePayrollDeductions({ earnings_result: earnings({ gross_krw: 200_000, taxable_gross_krw: 200_000 }), deduction_input: input({ pension: { enrolled: false }, health: { enrolled: false }, employment_insurance: { enrolled: false } }), statutory_rule_version: ruleVersion(), custom_deductions: [{ schedule_ref: "artifact:deduction/large", code: "LARGE", amount_kind: "fixed", amount_krw: 500_000 }] });
  assert.equal(floor.net_krw, 100_000);
  assert.deepEqual(floor.issues.map((issue) => issue.issue_code), ["PAYROLL_CUSTOM_DEDUCTION_LIMITED"]);
  assert.throws(() => calculatePayrollDeductions({ earnings_result: earnings(), deduction_input: input(), statutory_rule_version: ruleVersion(), custom_deductions: [custom[0], { ...custom[0], schedule_ref: "artifact:deduction/duplicate" }] }), /must be unique/);
});

test("PY-DED-007 reconciles matched, explained, and unexplained notice variances", () => {
  const exact = calculatePayrollDeductions({ earnings_result: earnings(), deduction_input: input(), statutory_rule_version: ruleVersion(), notice_assessments: [{ notice_kind: "PENSION", notice_amount_krw: 125_000 }] });
  assert.equal(exact.notice_reconciliations[0].state, "matched");
  const explained = calculatePayrollDeductions({ earnings_result: earnings(), deduction_input: input(), statutory_rule_version: ruleVersion(), notice_assessments: [{ notice_kind: "PENSION", notice_amount_krw: 126_000, variance_reason_code: "NOTICE_CORRECTION", approval_ref: "artifact:approval/notice-1" }] });
  assert.equal(explained.notice_reconciliations[0].state, "explained");
  const blocked = calculatePayrollDeductions({ earnings_result: earnings(), deduction_input: input(), statutory_rule_version: ruleVersion(), notice_assessments: [{ notice_kind: "PENSION", notice_amount_krw: 126_000 }] });
  assert.equal(blocked.notice_reconciliations[0].state, "unexplained");
  assert.ok(blocked.issues.some((issue) => issue.issue_code === "PAYROLL_NOTICE_VARIANCE_UNEXPLAINED" && issue.severity === "blocker"));
});
