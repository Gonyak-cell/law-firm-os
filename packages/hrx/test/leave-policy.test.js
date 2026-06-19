import assert from "node:assert/strict";
import test from "node:test";
import {
  applyLeaveCarryover,
  calculateLeaveAccrual,
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
