import assert from "node:assert/strict";
import test from "node:test";
import {
  HRX_SENSITIVE_SCOPE_GROUPS,
  HRX_SENSITIVE_SCOPES,
  isHrxSensitiveScope,
  principalHasHrxScope,
  requiredScopeForHrxSensitivity,
} from "../src/hrx-sensitive-scopes.js";

test("HRX sensitive scope groups cover required domains", () => {
  for (const group of ["employee", "document", "compensation", "evaluation", "candidate", "lifecycle", "payroll", "analytics", "ai", "audit"]) {
    assert.ok(HRX_SENSITIVE_SCOPE_GROUPS[group].length > 0);
  }
  assert.ok(HRX_SENSITIVE_SCOPES.includes("hrx.compensation.read"));
  assert.ok(HRX_SENSITIVE_SCOPES.includes("hrx.lifecycle.write"));
  assert.ok(HRX_SENSITIVE_SCOPES.includes("hrx.analytics.export"));
  assert.ok(HRX_SENSITIVE_SCOPES.includes("hrx.ai.review.read"));
  assert.ok(HRX_SENSITIVE_SCOPES.includes("hrx.audit.append"));
});

test("HRX scope helpers identify required scopes", () => {
  assert.equal(isHrxSensitiveScope("hrx.employee.read"), true);
  assert.equal(isHrxSensitiveScope("crm.party.read"), false);
  assert.equal(requiredScopeForHrxSensitivity("candidate"), "hrx.candidate.read");
  assert.equal(requiredScopeForHrxSensitivity("lifecycle"), "hrx.lifecycle.read");
  assert.equal(requiredScopeForHrxSensitivity("analytics"), "hrx.analytics.read");
  assert.equal(requiredScopeForHrxSensitivity("ai"), "hrx.ai.assistant");
  assert.equal(principalHasHrxScope({ hrx_scopes: ["hrx.audit.read"] }, "hrx.audit.read"), true);
});
