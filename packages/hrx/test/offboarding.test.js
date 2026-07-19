import assert from "node:assert/strict";
import test from "node:test";
import {
  HRX_OFFBOARDING_CLOSE_BLOCKED,
  HRX_OFFBOARDING_EVIDENCE_MISMATCH,
  HRX_OFFBOARDING_IDENTITY_MISMATCH,
  closeOffboardingCase,
  createOffboardingCase,
  evaluateOffboardingReadiness,
} from "../src/offboarding.js";

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
  assert.equal(readiness.access_clear, false);
  assert.equal(readiness.documents_clear, true);
  assert.equal(readiness.legal_hold_clear, false);
  assert.equal(readiness.matter_reassignment_clear, true);
  assert.equal(readiness.handover_clear, true);
  assert.equal(readiness.leave_reconciliation_clear, false);
  assert.equal(readiness.ready, false);
});

test("offboarding close is blocked until every check is clear", () => {
  assert.throws(() => closeOffboardingCase(offboarding), (error) => error.safe_error_code === HRX_OFFBOARDING_CLOSE_BLOCKED);
  const closed = closeOffboardingCase({
    ...offboarding,
    access_revocations: [{ system_ref: "DMS", revoked: true, confirmation_ref: "LX-11:AccessRevocation:001" }],
    legal_hold_checks: [{ hold_ref: "HoldCheck:001", clear: true }],
    leave_reconciliation_status: "approved_and_synced",
  });
  assert.equal(closed.state, "closed");
});

test("offboarding close requires matter reassignment and handover items when present", () => {
  assert.throws(
    () =>
      closeOffboardingCase({
        ...offboarding,
        access_revocations: [{ system_ref: "DMS", revoked: true, confirmation_ref: "LX-11:AccessRevocation:001" }],
        legal_hold_checks: [{ hold_ref: "HoldCheck:001", clear: true }],
        matter_reassignments: [{ matter_id: "matter-001", reassigned: false }],
        handover_items: [{ item_id: "handover-001", title: "Matter handover", completed: true }],
      }),
    (error) => error.safe_error_code === HRX_OFFBOARDING_CLOSE_BLOCKED,
  );
  const closed = closeOffboardingCase({
    ...offboarding,
    leave_reconciliation_status: "approved_and_synced",
    access_revocations: [{ system_ref: "DMS", revoked: true, confirmation_ref: "LX-11:AccessRevocation:001" }],
    legal_hold_checks: [{ hold_ref: "HoldCheck:001", clear: true }],
    matter_reassignments: [
      {
        matter_id: "matter-001",
        reassigned_to_employee_id: "emp-002",
        reassigned: true,
        handover_ref: "Handover:001",
      },
    ],
    handover_items: [{ item_id: "handover-001", title: "Matter handover", completed: true }],
  });
  assert.equal(closed.matter_reassignments[0].reassigned_to_employee_id, "emp-002");
  assert.equal(closed.state, "closed");
});

test("offboarding close cannot rebind immutable case identity", () => {
  assert.throws(
    () => closeOffboardingCase(
      {
        ...offboarding,
        tenant_id: "tenant-b",
        leave_reconciliation_status: "approved_and_synced",
        access_revocations: [{ system_ref: "idp", revoked: true, confirmation_ref: "receipt:idp" }],
        document_returns: [{ document_ref: "laptop", returned: true }],
        legal_hold_checks: [{ hold_ref: "hold:none", clear: true }],
      },
      { current_case: offboarding },
    ),
    (error) => error.safe_error_code === HRX_OFFBOARDING_IDENTITY_MISMATCH,
  );
});

test("offboarding close ignores no caller evidence and rejects attempts to replace ledger readiness", () => {
  const current = createOffboardingCase({
    ...offboarding,
    leave_reconciliation_status: "approved_and_synced",
    access_revocations: [{ system_ref: "idp", revoked: true, confirmation_ref: "receipt:idp" }],
    legal_hold_checks: [{ hold_ref: "hold:none", clear: true }],
  });
  assert.throws(
    () => closeOffboardingCase({ legal_hold_checks: [{ hold_ref: "hold:none", clear: false }] }, { current_case: current }),
    (error) => error.safe_error_code === HRX_OFFBOARDING_EVIDENCE_MISMATCH,
  );
  assert.equal(closeOffboardingCase({}, { current_case: current }).state, "closed");
});
