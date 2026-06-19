import assert from "node:assert/strict";
import test from "node:test";
import { evaluateHrxCompensationAccess, maskHrxCompensationRecord } from "../src/hrx-compensation-policy.js";

const resource = { tenant_id: "tenant-a", resource_type: "hrx.compensation", resource_id: "comp-001", sensitivity: "compensation" };

test("HRX compensation policy allows authorized HR compensation access", () => {
  const decision = evaluateHrxCompensationAccess({
    principal: {
      tenant_id: "tenant-a",
      user_id: "user-a",
      role_ids: ["hr_admin"],
      hrx_scopes: ["hrx.compensation.read"],
      allowed_purposes: ["compensation_review"],
    },
    resource,
    action: "read",
    purpose: "compensation_review",
  });
  assert.equal(decision.effect, "allow");
});

test("HRX compensation policy denies and masks unauthorized actor", () => {
  const decision = evaluateHrxCompensationAccess({
    principal: {
      tenant_id: "tenant-a",
      user_id: "user-b",
      role_ids: ["people_ops"],
      hrx_scopes: ["hrx.employee.read"],
      allowed_purposes: ["hr_operations"],
    },
    resource,
    action: "read",
    purpose: "hr_operations",
  });
  assert.equal(decision.effect, "deny");
  assert.deepEqual(decision.mask_fields, ["amount", "currency", "bonus_amount", "equity_value", "payroll_ref"]);

  const masked = maskHrxCompensationRecord({ employee_id: "emp-001", amount: 100, currency: "USD", payroll_ref: "payroll-1" }, decision);
  assert.equal(masked.amount, null);
  assert.equal(masked.currency, null);
  assert.equal(masked.payroll_ref, null);
  assert.equal(masked.masked, true);
});
