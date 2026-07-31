import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  calculateMinimumWageImpact,
  createMinimumWageService,
  createMinimumWageStandard,
  serializeMinimumWageImpact,
} from "../src/payroll/minimum-wage.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createPayrollRepository } from "../src/payroll/repository.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const PENDING_2026 = JSON.parse(readFileSync(
  new URL("../fixtures/payroll-minimum-wage-2026.pending.json", import.meta.url),
  "utf8",
));
const AUTHOR = Object.freeze({ tenant_id: "tenant-minimum-wage", actor_id: "rule-author" });
const LEGAL_REVIEWER = Object.freeze({ tenant_id: "tenant-minimum-wage", actor_id: "legal-reviewer" });
const REVIEWER = Object.freeze({ tenant_id: "tenant-minimum-wage", actor_id: "payroll-reviewer" });

function approved(overrides = {}) {
  return {
    ...PENDING_2026,
    legal_review_state: "approved",
    legal_review_ref: "provider:sandbox/legal/minimum-wage-2026",
    ...overrides,
  };
}

function employee(overrides = {}) {
  return {
    employee_id: "employee-1",
    display_name: "김변호사",
    contractual_minutes: 12_540,
    base_pay_krw: 2_156_880,
    allowances: [],
    ...overrides,
  };
}

function runtime({ publishEnabled = true, production = false } = {}) {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  let sequence = 0;
  const payrollRepository = createPayrollRepository({
    store,
    clock: () => "2026-07-30T00:00:00.000Z",
    idFactory: (prefix) => `${prefix}-${++sequence}`,
  });
  return {
    store,
    payrollRepository,
    service: createMinimumWageService({ payrollRepository, publishEnabled, production }),
  };
}

function publish(service, standard, ruleVersionId) {
  let row = service.createDraft(AUTHOR, {
    rule_version_id: ruleVersionId,
    standard: {
      ...standard,
      legal_review_state: "pending",
      legal_review_ref: null,
    },
  });
  row = service.legallyApprove(LEGAL_REVIEWER, {
    rule_version_id: row.rule_version_id,
    expected_version: row.state_version,
    legal_review_ref: standard.legal_review_ref,
  });
  row = service.review(REVIEWER, {
    rule_version_id: row.rule_version_id,
    expected_version: row.state_version,
  });
  return service.publish(REVIEWER, {
    rule_version_id: row.rule_version_id,
    expected_version: row.state_version,
  });
}

test("PEO-TUW-066 preserves the official source hash and blocks pending or fixture standards in production", () => {
  const pending = createMinimumWageStandard(PENDING_2026);
  assert.deepEqual({
    version_code: pending.version_code,
    effective_from: pending.effective_from,
    hourly_minimum_krw: pending.hourly_minimum_krw,
    monthly_conversion_minutes: pending.monthly_conversion_minutes,
    monthly_minimum_krw: pending.monthly_minimum_krw,
    source_document_hash: pending.source_document_hash,
    legal_review_state: pending.legal_review_state,
  }, {
    version_code: "KR-2026",
    effective_from: "2026-01-01",
    hourly_minimum_krw: 10_320,
    monthly_conversion_minutes: 12_540,
    monthly_minimum_krw: 2_156_880,
    source_document_hash: "b87d3570ff339e04747d7835228e20c2faeffa7c9fbcdfe79d719e6ed096a30d",
    legal_review_state: "pending",
  });
  assert.throws(
    () => calculateMinimumWageImpact({ standard: pending, employees: [employee()] }),
    (error) => error.safe_error_code === "HRX_MINIMUM_WAGE_LEGAL_REVIEW_REQUIRED",
  );
  assert.throws(
    () => createMinimumWageStandard(PENDING_2026, { production: true }),
    (error) => error.safe_error_code === "HRX_MINIMUM_WAGE_LEGAL_REVIEW_REQUIRED",
  );
  assert.throws(
    () => createMinimumWageStandard(approved(), { production: true }),
    (error) => error.safe_error_code === "HRX_MINIMUM_WAGE_LEGAL_REVIEW_REQUIRED",
  );
});

test("PEO-TUW-066 calculates included and excluded items, part-time work, monthly conversion, and exact boundaries", () => {
  const report = calculateMinimumWageImpact({
    standard: approved({
      included_item_codes: ["BASE", "FIXED_MEAL"],
      excluded_item_codes: ["HOLIDAY", "NIGHT", "OVERTIME"],
    }),
    employees: [
      employee({
        employee_id: "below",
        base_pay_krw: 2_000_000,
        allowances: [
          { code: "FIXED_MEAL", amount_krw: 100_000 },
          { code: "OVERTIME", amount_krw: 500_000 },
        ],
      }),
      employee({ employee_id: "boundary" }),
      employee({
        employee_id: "part-time",
        contractual_minutes: 4_800,
        base_pay_krw: 825_600,
        allowances: [{ code: "HOLIDAY", amount_krw: 50_000 }],
      }),
    ],
  });
  assert.equal(report.monthly_reference_krw, 2_156_880);
  assert.deepEqual(
    report.impacts.map((row) => ({
      employee_id: row.employee_id,
      included_wage_krw: row.included_wage_krw,
      required_wage_krw: row.required_wage_krw,
      result_state: row.result_state,
    })),
    [
      { employee_id: "below", included_wage_krw: 2_100_000, required_wage_krw: 2_156_880, result_state: "below_candidate" },
      { employee_id: "boundary", included_wage_krw: 2_156_880, required_wage_krw: 2_156_880, result_state: "meets_or_above" },
      { employee_id: "part-time", included_wage_krw: 825_600, required_wage_krw: 825_600, result_state: "meets_or_above" },
    ],
  );
  assert.equal(report.below_candidate_count, 1);
  assert.equal(report.legal_determination, false);
  assert.equal(report.production_ready_claim, false);
});

test("PEO-TUW-066 makes rounding explicit and sends unknown wage items to human review", () => {
  const rounded = calculateMinimumWageImpact({
    standard: approved({
      hourly_minimum_krw: 10_321,
      monthly_minimum_krw: 2_157_089,
      rounding_mode: "ceil",
    }),
    employees: [employee({
      employee_id: "one-minute",
      contractual_minutes: 1,
      base_pay_krw: 172,
      allowances: [],
    })],
  });
  assert.equal(rounded.impacts[0].required_wage_krw, 173);
  assert.equal(rounded.impacts[0].result_state, "below_candidate");

  const unknown = calculateMinimumWageImpact({
    standard: approved(),
    employees: [employee({
      employee_id: "unknown-item",
      allowances: [{ code: "NEW_ALLOWANCE", amount_krw: 300_000 }],
    })],
  });
  assert.deepEqual(unknown.impacts[0].unknown_item_codes, ["NEW_ALLOWANCE"]);
  assert.equal(unknown.impacts[0].is_below_candidate, null);
  assert.equal(unknown.impacts[0].result_state, "review_required");
  assert.equal(unknown.review_required_count, 1);
});

test("PEO-TUW-066 rejects arbitrary fields and redacts identities and amounts without payroll detail permission", () => {
  assert.throws(
    () => createMinimumWageStandard({ ...approved(), javascript: "return process.env" }),
    /unsupported field javascript/,
  );
  assert.throws(
    () => createMinimumWageStandard({ ...approved(), included_item_codes: ["BASE", "employee.bank_account"] }),
    /invalid item code/,
  );
  const report = calculateMinimumWageImpact({
    standard: approved(),
    employees: [employee({ employee_id: "sensitive-employee", base_pay_krw: 2_000_000 })],
  });
  const hidden = serializeMinimumWageImpact(report);
  assert.equal(hidden.impacts[0].display_name, "구성원 1");
  assert.doesNotMatch(JSON.stringify(hidden), /sensitive-employee|2000000|2156880|effective_hourly|gap_krw/);
  const visible = serializeMinimumWageImpact(report, { can_view_amounts: true });
  assert.equal(visible.impacts[0].display_name, "김변호사");
  assert.equal(visible.impacts[0].required_wage_krw, 2_156_880);
  assert.doesNotMatch(JSON.stringify(visible), /sensitive-employee/);
});

test("PEO-FIX-UI-B minimum-wage impacts fail closed for identifier-shaped names while preserving human names", () => {
  const unsafe = [
    ["email", "lawyer@example.com"],
    ["uuid", "550e8400-e29b-41d4-a716-446655440000"],
    ["hex", "0123456789abcdef0123456789abcdef"],
    ["opaque", "opaque-9f2a4c7b8d1e"],
    ["structured", "EMP-CASE-42"],
    ["emp-exact", "EMP-EXACT"],
    ["user-exact", "USER-EXACT"],
  ];
  const report = calculateMinimumWageImpact({
    standard: approved(),
    employees: [
      ...unsafe.map(([employee_id, display_name]) => employee({ employee_id, display_name })),
      employee({ employee_id: "kim", display_name: "Kim Min" }),
      employee({ employee_id: "park", display_name: "Park Jiyoon" }),
      employee({ employee_id: "lee", user_id: "lee", display_name: "Leena Kim" }),
    ],
  });
  const byId = new Map(report.impacts.map((row) => [row.employee_id, row.display_name]));
  for (const [employeeId] of unsafe) assert.equal(byId.get(employeeId), "구성원 이름 확인 필요");
  assert.equal(byId.get("kim"), "Kim Min");
  assert.equal(byId.get("park"), "Park Jiyoon");
  assert.equal(byId.get("lee"), "Leena Kim");

  const visible = serializeMinimumWageImpact(report, { can_view_amounts: true });
  const visibleNames = visible.impacts.map((row) => row.display_name);
  assert.equal(visibleNames.includes("lawyer@example.com"), false);
  assert.equal(visibleNames.includes("550e8400-e29b-41d4-a716-446655440000"), false);
  assert.equal(visibleNames.includes("0123456789abcdef0123456789abcdef"), false);
  assert.equal(visibleNames.includes("Kim Min"), true);
  assert.equal(visibleNames.includes("Park Jiyoon"), true);
  assert.equal(visibleNames.includes("Leena Kim"), true);
});

test("PEO-TUW-067 enforces pending-legal-approved-reviewed-published with immutable legal review evidence", () => {
  const value = runtime();
  let pending = value.service.createDraft(AUTHOR, {
    rule_version_id: "minimum-wage-pending",
    standard: PENDING_2026,
  });
  assert.equal(pending.approval_state, "draft");
  assert.equal(pending.workflow_state, "pending");
  assert.throws(
    () => value.service.review(AUTHOR, { rule_version_id: pending.rule_version_id, expected_version: 1 }),
    (error) => error.safe_error_code === "HRX_MINIMUM_WAGE_LEGAL_REVIEW_REQUIRED",
  );
  assert.throws(
    () => value.service.legallyApprove(AUTHOR, {
      rule_version_id: pending.rule_version_id,
      expected_version: 1,
      legal_review_ref: "document:legal/minimum-wage-2026",
    }),
    (error) => error.safe_error_code === "HRX_PAYROLL_SELF_APPROVAL",
  );
  pending = value.service.legallyApprove(LEGAL_REVIEWER, {
    rule_version_id: pending.rule_version_id,
    expected_version: 1,
    legal_review_ref: "document:legal/minimum-wage-2026",
  });
  assert.deepEqual({
    workflow_state: pending.workflow_state,
    approval_state: pending.approval_state,
    legal_review_state: pending.standard.legal_review_state,
    legal_review_ref: pending.standard.legal_review_ref,
    legal_reviewed_by_actor_id: pending.legal_reviewed_by_actor_id,
    state_version: pending.state_version,
  }, {
    workflow_state: "legal_approved",
    approval_state: "draft",
    legal_review_state: "approved",
    legal_review_ref: "document:legal/minimum-wage-2026",
    legal_reviewed_by_actor_id: "legal-reviewer",
    state_version: 2,
  });
  assert.throws(
    () => value.service.review(AUTHOR, { rule_version_id: pending.rule_version_id, expected_version: 2 }),
    (error) => error.safe_error_code === "HRX_PAYROLL_SELF_APPROVAL",
  );
  const reviewed = value.service.review(REVIEWER, { rule_version_id: pending.rule_version_id, expected_version: 2 });
  assert.equal(reviewed.workflow_state, "reviewed");
  const published = value.service.publish(REVIEWER, { rule_version_id: reviewed.rule_version_id, expected_version: 3 });
  assert.equal(published.workflow_state, "published");

  const legalAudit = value.payrollRepository.listAuditEvents(LEGAL_REVIEWER, { object_id: pending.rule_version_id })
    .find((event) => event.action === "hrx.payroll.minimum_wage.legal_approve");
  assert.equal(legalAudit.actor_id, LEGAL_REVIEWER.actor_id);
  assert.throws(
    () => value.store.query("updateOne", {
      table: "hrx_audit_events",
      where: { tenant_id: LEGAL_REVIEWER.tenant_id, event_id: legalAudit.event_id },
      patch: { actor_id: "tampered" },
    }),
    /append-only/,
  );
  assert.throws(
    () => value.service.createDraft(AUTHOR, {
      rule_version_id: "minimum-wage-preapproved-injection",
      standard: approved(),
    }),
    (error) => error.safe_error_code === "HRX_MINIMUM_WAGE_LEGAL_REVIEW_STATE_INVALID",
  );
  value.store.close();

  const disabled = runtime({ publishEnabled: false });
  const disabledDraft = disabled.service.createDraft(AUTHOR, {
    rule_version_id: "minimum-wage-disabled",
    standard: PENDING_2026,
  });
  assert.throws(
    () => disabled.service.legallyApprove(LEGAL_REVIEWER, {
      rule_version_id: disabledDraft.rule_version_id,
      expected_version: 1,
      legal_review_ref: "document:legal/minimum-wage-disabled",
    }),
    (error) => error.safe_error_code === "HRX_PAYROLL_RULE_PUBLISH_DISABLED",
  );
  disabled.store.close();
});

test("PEO-TUW-066 selects effective-date boundaries and reproduces historical standards", () => {
  const value = runtime();
  const standard2025 = approved({
    standard_id: "kr-minimum-wage-2025",
    version_code: "KR-2025",
    effective_from: "2025-01-01",
    effective_to: "2025-12-31",
    hourly_minimum_krw: 10_030,
    monthly_minimum_krw: 2_096_270,
    source_document_ref: "document:moel/minimum-wage-2025",
    source_document_hash: "2".repeat(64),
    legal_review_ref: "provider:sandbox/legal/minimum-wage-2025",
  });
  publish(value.service, standard2025, "minimum-wage-2025");
  publish(value.service, approved(), "minimum-wage-2026");

  assert.equal(value.service.getPublishedForDate(REVIEWER, { as_of: "2025-12-31" }).standard.version_code, "KR-2025");
  assert.equal(value.service.getPublishedForDate(REVIEWER, { as_of: "2026-01-01" }).standard.version_code, "KR-2026");
  const historical = value.service.preview(REVIEWER, {
    as_of: "2025-12-31",
    employees: [employee({ contractual_minutes: 12_540, base_pay_krw: 2_096_270 })],
  });
  const repeated = value.service.preview(REVIEWER, {
    as_of: "2025-12-31",
    employees: [employee({ contractual_minutes: 12_540, base_pay_krw: 2_096_270 })],
  });
  assert.deepEqual(historical, repeated);
  assert.equal(historical.impacts[0].required_wage_krw, 2_096_270);
  value.store.close();
});
