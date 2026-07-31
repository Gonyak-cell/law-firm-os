import assert from "node:assert/strict";
import test from "node:test";
import {
  HRX_OFFBOARDING_CLOSE_BLOCKED,
  HRX_OFFBOARDING_EVIDENCE_MISMATCH,
  HRX_OFFBOARDING_IDENTITY_MISMATCH,
  HRX_OFFBOARDING_LEAVE_EVIDENCE_REQUIRED,
  closeOffboardingCase,
  createOffboardingCase,
  evaluateOffboardingReadiness,
  updateOffboardingTask,
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
const LEAVE_EVIDENCE_REF = "PayrollProviderReceipt:offboarding-test";

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
  assert.throws(
    () => createOffboardingCase({
      ...offboarding,
      leave_reconciliation_status: "approved_and_synced",
    }),
    (error) =>
      error.safe_error_code === HRX_OFFBOARDING_LEAVE_EVIDENCE_REQUIRED,
  );
  assert.throws(
    () => createOffboardingCase({
      ...offboarding,
      leave_reconciliation_evidence_ref: LEAVE_EVIDENCE_REF,
    }),
    (error) =>
      error.safe_error_code === HRX_OFFBOARDING_LEAVE_EVIDENCE_REQUIRED,
  );
  const closed = closeOffboardingCase({
    ...offboarding,
    access_revocations: [{ system_ref: "DMS", revoked: true, confirmation_ref: "LX-11:AccessRevocation:001" }],
    legal_hold_checks: [{ hold_ref: "HoldCheck:001", clear: true }],
    leave_reconciliation_status: "approved_and_synced",
    leave_reconciliation_evidence_ref: LEAVE_EVIDENCE_REF,
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
    leave_reconciliation_evidence_ref: LEAVE_EVIDENCE_REF,
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
        leave_reconciliation_evidence_ref: LEAVE_EVIDENCE_REF,
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
    leave_reconciliation_evidence_ref: LEAVE_EVIDENCE_REF,
    access_revocations: [{ system_ref: "idp", revoked: true, confirmation_ref: "receipt:idp" }],
    legal_hold_checks: [{ hold_ref: "hold:none", clear: true }],
  });
  assert.throws(
    () => closeOffboardingCase({ legal_hold_checks: [{ hold_ref: "hold:none", clear: false }] }, { current_case: current }),
    (error) => error.safe_error_code === HRX_OFFBOARDING_EVIDENCE_MISMATCH,
  );
  assert.equal(closeOffboardingCase({}, { current_case: current }).state, "closed");
});

test("template-backed offboarding requires its execution items and supports failed task retry", () => {
  const templated = createOffboardingCase({
    ...offboarding,
    template: {
      template_id: "lawyer-offboarding",
      version: "1",
      lifecycle_kind: "offboarding",
      role_key: "lawyer",
      effective_from: "2026-01-01",
      tasks: [
        {
          task_id: "handover",
          title: "담당 사건 인수인계",
          owner_role: "matter_owner",
          due_offset_days: -5,
        },
        {
          task_id: "revoke",
          title: "업무 계정 회수",
          owner_role: "it_ops",
          due_offset_days: 0,
          depends_on_task_ids: ["handover"],
        },
      ],
    },
    access_revocations: [{ system_ref: "DMS", revoked: true, confirmation_ref: "receipt:dms" }],
    legal_hold_checks: [{ hold_ref: "HoldCheck:001", clear: true }],
    leave_reconciliation_status: "approved_and_synced",
    leave_reconciliation_evidence_ref: LEAVE_EVIDENCE_REF,
  });
  assert.equal(evaluateOffboardingReadiness(templated).required_tasks_clear, false);
  const handoverDone = updateOffboardingTask(templated, "handover", { status: "completed" });
  const failed = updateOffboardingTask(handoverDone, "revoke", {
    status: "failed",
    failure_reason: "계정 제공자 응답 지연",
  });
  const retried = updateOffboardingTask(failed, "revoke", { retry: true });
  const completed = updateOffboardingTask(retried, "revoke", { status: "completed" });
  assert.equal(completed.template_ref.version, "1");
  assert.equal(evaluateOffboardingReadiness(completed).required_tasks_clear, true);
  assert.equal(closeOffboardingCase({}, { current_case: completed }).state, "closed");
});
