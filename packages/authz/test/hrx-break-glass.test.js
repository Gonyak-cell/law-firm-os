import assert from "node:assert/strict";
import test from "node:test";
import { evaluateHrxBreakGlass } from "../src/hrx-break-glass.js";

test("HRX break-glass denies without reason expiry approver audit and role", () => {
  const decision = evaluateHrxBreakGlass({
    principal: { tenant_id: "tenant-a", user_id: "user-a", role_ids: ["people_ops"] },
    now: "2026-06-19T00:00:00.000Z",
  });
  assert.equal(decision.effect, "deny");
  assert.ok(decision.errors.includes("reason_required"));
  assert.ok(decision.errors.includes("approver_required"));
  assert.ok(decision.errors.includes("future_expiry_required"));
  assert.ok(decision.errors.includes("audit_required"));
  assert.ok(decision.errors.includes("break_glass_role_required"));
});

test("HRX break-glass allows bounded approved audited access", () => {
  const decision = evaluateHrxBreakGlass({
    principal: { tenant_id: "tenant-a", user_id: "user-a", role_ids: ["security_admin"] },
    reason: "urgent payroll access review",
    approver_id: "approver-1",
    expires_at: "2026-06-20T00:00:00.000Z",
    now: "2026-06-19T00:00:00.000Z",
    audit_required: true,
  });
  assert.equal(decision.effect, "allow");
  assert.equal(decision.audit_required, true);
  assert.equal(decision.approver_id, "approver-1");
});
