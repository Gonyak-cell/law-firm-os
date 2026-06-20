import assert from "node:assert/strict";
import test from "node:test";
import { closeOffboardingCase, createOffboardingCase, evaluateOffboardingReadiness } from "../src/offboarding.js";

const offboarding = Object.freeze({
  tenant_id: "tenant-a",
  offboarding_id: "off-001",
  employee_id: "emp-001",
  separation_date: "2026-07-31",
  access_revocations: [{ system_ref: "DMS", revoked: true }],
  document_returns: [{ document_ref: "Laptop:asset-001", returned: true }],
  legal_hold_checks: [{ hold_ref: "HoldCheck:001", clear: false }],
});

test("offboarding readiness checks access revokes, document returns, and legal holds", () => {
  const created = createOffboardingCase(offboarding);
  const readiness = evaluateOffboardingReadiness(created);
  assert.equal(readiness.access_clear, true);
  assert.equal(readiness.documents_clear, true);
  assert.equal(readiness.legal_hold_clear, false);
  assert.equal(readiness.ready, false);
});

test("offboarding close is blocked until every check is clear", () => {
  assert.throws(() => closeOffboardingCase(offboarding), /cannot close/);
  const closed = closeOffboardingCase({
    ...offboarding,
    legal_hold_checks: [{ hold_ref: "HoldCheck:001", clear: true }],
  });
  assert.equal(closed.state, "closed");
});
