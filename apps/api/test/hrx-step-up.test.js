import assert from "node:assert/strict";
import test from "node:test";
import { evaluateHrxStepUp, requireHrxStepUp } from "../src/middleware/hrx-step-up.js";

const context = Object.freeze({ tenant_id: "tenant-a", actor_id: "hr-001", actor_role: "people_ops" });

test("HRX step-up allows non-sensitive actions without MFA token", () => {
  const decision = evaluateHrxStepUp({ action: "hrx.employee.read", context });
  assert.equal(decision.effect, "allow");
  assert.equal(decision.step_up_required, false);
});

test("HRX step-up challenges compensation evaluation payroll audit and final AI actions", () => {
  for (const action of ["hrx.compensation.read", "hrx.evaluation.write", "hrx.payroll.export", "hrx.audit.read", "hrx.ai.final_decision"]) {
    const decision = evaluateHrxStepUp({ action, context, now: "2026-06-19T00:00:00.000Z" });
    assert.equal(decision.effect, "challenge");
    assert.equal(decision.safe_error_code, "HRX_STEP_UP_REQUIRED");
    assert.equal(decision.fail_closed, true);
  }
});

test("HRX step-up accepts fresh matching MFA token and throws when required", () => {
  const decision = evaluateHrxStepUp({
    action: "hrx.compensation.read",
    context,
    now: "2026-06-19T00:00:00.000Z",
    token: {
      tenant_id: "tenant-a",
      actor_id: "hr-001",
      mfa: true,
      assurance_level: 2,
      expires_at: "2026-06-19T00:05:00.000Z",
    },
  });
  assert.equal(decision.effect, "allow");
  assert.throws(() => requireHrxStepUp({ action: "hrx.payroll.export", context }), /HRX_STEP_UP_REQUIRED/);
});
