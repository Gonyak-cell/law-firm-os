import assert from "node:assert/strict";
import test from "node:test";
import { authorizeHrxStepUpRequest, parseHrxStepUpContext } from "../src/middleware/hrx-step-up-context.js";
import { evaluateHrxStepUp, requireHrxStepUp } from "../src/middleware/hrx-step-up.js";
import { createHrxStepUpAuthority } from "../src/hrx-step-up-token.js";

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
      purpose: "compensation_access",
      mfa: true,
      assurance_level: 2,
      expires_at: "2026-06-19T00:05:00.000Z",
    },
  });
  assert.equal(decision.effect, "allow");
  assert.throws(() => requireHrxStepUp({ action: "hrx.payroll.export", context }), /HRX_STEP_UP_REQUIRED/);
});

test("HRX step-up context parses signed header and rejects unsigned tokens", () => {
  const authority = createHrxStepUpAuthority({
    secret: "hrx-step-up-unit-secret",
    totpSecret: "hrx-step-up-unit-totp",
    now: () => Date.parse("2026-06-19T00:00:00.000Z"),
  });
  const totp = authority.generateTotp({
    tenant_id: "tenant-a",
    actor_id: "hr-001",
    purpose: "security_audit",
  });
  const issued = authority.issue({
    principal: { tenant_id: "tenant-a", user_id: "hr-001" },
    purpose: "security_audit",
    totp_code: totp,
  });
  assert.equal(issued.status, 200);
  const parsed = parseHrxStepUpContext({
    "x-lawos-hrx-step-up": issued.body.step_up_token,
  }, { verifier: authority });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.token.actor_id, "hr-001");
  assert.equal(parsed.token.purpose, "security_audit");

  const unsigned = authorizeHrxStepUpRequest({
    action: "hrx.audit.read",
    context,
    headers: {
      "x-lawos-hrx-step-up": JSON.stringify({
        tenant_id: "tenant-a",
        actor_id: "hr-001",
        purpose: "security_audit",
        mfa: true,
        assurance_level: 2,
        expires_at: "2999-01-01T00:00:00.000Z",
      }),
    },
    verifier: authority,
  });
  assert.equal(unsigned.ok, false);
  assert.equal(unsigned.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  assert.equal(unsigned.body.reason, "hrx_step_up_token_invalid");

  const malformed = authorizeHrxStepUpRequest({
    action: "hrx.audit.read",
    context,
    headers: { "x-lawos-hrx-step-up": "not-json" },
    verifier: authority,
  });
  assert.equal(malformed.ok, false);
  assert.equal(malformed.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  assert.equal(malformed.body.reason, "hrx_step_up_token_invalid");
});

test("HRX step-up rejects signed tokens with the wrong sensitive purpose", () => {
  const decision = evaluateHrxStepUp({
    action: "hrx.audit.read",
    context,
    now: "2026-06-19T00:00:00.000Z",
    token: {
      tenant_id: "tenant-a",
      actor_id: "hr-001",
      purpose: "payroll_export_review",
      mfa: true,
      assurance_level: 2,
      expires_at: "2026-06-19T00:05:00.000Z",
    },
  });
  assert.equal(decision.effect, "challenge");
  assert.equal(decision.reason, "hrx_step_up_purpose_mismatch");
  assert.equal(decision.required_purpose, "security_audit");

  const generic = evaluateHrxStepUp({
    action: "hrx.audit.read",
    context,
    now: "2026-06-19T00:00:00.000Z",
    token: {
      tenant_id: "tenant-a",
      actor_id: "hr-001",
      purpose: "hrx_sensitive_action",
      mfa: true,
      assurance_level: 2,
      expires_at: "2026-06-19T00:05:00.000Z",
    },
  });
  assert.equal(generic.effect, "challenge");
  assert.equal(generic.reason, "hrx_step_up_purpose_mismatch");
});
