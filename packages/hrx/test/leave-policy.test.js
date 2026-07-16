import assert from "node:assert/strict";
import test from "node:test";
import {
  applyLeaveCarryover,
  calculateKoreanAnnualPaidLeaveEntitlement,
  calculateLeaveAccrual,
  createLeaveAccrualLedgerEntry,
  createLeaveCarryoverLedgerEntry,
  createLeavePolicy,
  evaluateLeaveUsage,
} from "../src/rules/leave-policy.js";

const basePolicy = Object.freeze({
  tenant_id: "tenant-a",
  policy_id: "pto-us",
  policy_version: "2026.1",
  leave_type: "pto",
  accrual_rate_per_month: 8,
  annual_entitlement: 96,
  carryover_limit: 40,
  effective_from: "2026-01-01",
});

test("leave policy is versioned and calculates capped accrual/carryover", () => {
  const policy = createLeavePolicy(basePolicy);
  assert.equal(policy.policy_version, "2026.1");
  assert.equal(calculateLeaveAccrual(policy, 6), 48);
  assert.equal(calculateLeaveAccrual(policy, 15), 96);
  assert.equal(applyLeaveCarryover(policy, 72), 40);
});

test("leave policy blocks negative balance unless explicitly allowed within limit", () => {
  const strictPolicy = createLeavePolicy(basePolicy);
  assert.deepEqual(evaluateLeaveUsage(strictPolicy, 4, 8), {
    allowed: false,
    available_after: -4,
    reason: "negative_balance_not_allowed",
  });

  const flexiblePolicy = createLeavePolicy({
    ...basePolicy,
    policy_id: "pto-flex",
    negative_balance_allowed: true,
    max_negative_balance: 8,
  });
  assert.deepEqual(evaluateLeaveUsage(flexiblePolicy, 4, 8), {
    allowed: true,
    available_after: -4,
    reason: "within_negative_balance_limit",
  });
  assert.equal(evaluateLeaveUsage(flexiblePolicy, 1, 12).reason, "negative_balance_limit_exceeded");
});

test("Korean statutory annual paid leave follows monthly, annual, seniority, and cap rules", () => {
  assert.equal(calculateKoreanAnnualPaidLeaveEntitlement({ service_months: 7 }), 7);
  assert.equal(calculateKoreanAnnualPaidLeaveEntitlement({ service_months: 11 }), 11);
  assert.equal(calculateKoreanAnnualPaidLeaveEntitlement({ service_months: 12, yearly_attendance_rate: 0.8 }), 15);
  assert.equal(calculateKoreanAnnualPaidLeaveEntitlement({ service_months: 36, years_of_service: 3 }), 16);
  assert.equal(calculateKoreanAnnualPaidLeaveEntitlement({ service_months: 60, years_of_service: 5 }), 17);
  assert.equal(calculateKoreanAnnualPaidLeaveEntitlement({ service_months: 300, years_of_service: 25 }), 25);
  assert.equal(
    calculateKoreanAnnualPaidLeaveEntitlement({
      service_months: 12,
      yearly_attendance_rate: 0.7,
      full_months_without_absence: 6,
    }),
    6,
  );
});

test("leave accrual and carryover jobs emit auditable ledger entries", () => {
  const accrual = createLeaveAccrualLedgerEntry({
    tenant_id: "tenant-a",
    employee_id: "emp-001",
    policy: { ...basePolicy, accrual_unit: "days", accrual_rate_per_month: 1, annual_entitlement: 15 },
    occurred_on: "2026-01-01",
    service_months: 12,
    yearly_attendance_rate: 0.95,
  });
  assert.equal(accrual.entry_type, "earned");
  assert.equal(accrual.amount, 15);
  assert.equal(accrual.metadata.statutory_basis, "KR_LSA_ARTICLE_60");

  const carryover = createLeaveCarryoverLedgerEntry({
    tenant_id: "tenant-a",
    employee_id: "emp-001",
    policy: { ...basePolicy, accrual_unit: "days", carryover_limit: 5 },
    occurred_on: "2026-01-01",
    closing_balance: 12,
  });
  assert.equal(carryover.entry_type, "carryover");
  assert.equal(carryover.amount, 5);
  assert.equal(carryover.metadata.closing_balance, 12);
});
