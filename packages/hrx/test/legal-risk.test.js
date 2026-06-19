import assert from "node:assert/strict";
import test from "node:test";
import { createHrxLegalRiskWorkflow, markHrxLegalRiskPrivileged } from "../src/legal-risk.js";

const workflow = Object.freeze({
  tenant_id: "tenant-a",
  legal_risk_id: "legal-risk-001",
  risk_event_id: "risk-001",
  legal_owner_id: "legal-001",
});

test("legal risk workflow requires audit evidence for privilege flag and Matter link", () => {
  assert.throws(
    () => createHrxLegalRiskWorkflow({ ...workflow, privilege_flag: true, privilege_basis_ref: "LegalMemo:001" }),
    /audit_ref is required/,
  );
  assert.throws(() => createHrxLegalRiskWorkflow({ ...workflow, matter_id: "matter-001" }), /audit_ref is required/);

  const linked = createHrxLegalRiskWorkflow({ ...workflow, matter_id: "matter-001", audit_ref: "Audit:001" });
  assert.equal(linked.matter_id, "matter-001");
});

test("legal risk workflow marks privilege with basis and audit ref", () => {
  const privileged = markHrxLegalRiskPrivileged(workflow, {
    privilege_basis_ref: "LegalMemo:001",
    audit_ref: "Audit:privilege-001",
  });
  assert.equal(privileged.privilege_flag, true);
  assert.equal(privileged.privilege_basis_ref, "LegalMemo:001");
});
