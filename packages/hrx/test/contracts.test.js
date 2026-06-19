import assert from "node:assert/strict";
import test from "node:test";
import { createEmploymentContract, transitionEmploymentContract } from "../src/contracts.js";

test("employment contract lifecycle supports draft approve sign renewal states", () => {
  const draft = createEmploymentContract({
    tenant_id: "tenant-a",
    contract_id: "contract-001",
    employee_id: "emp-001",
    profile_id: "profile-001",
    document_ref: "dms://contract-001",
  });
  const approved = transitionEmploymentContract(draft, { state: "approved" });
  const signed = transitionEmploymentContract(approved, { state: "signed", signature_ref: "sign://sig-001" });
  const renewed = transitionEmploymentContract(signed, { state: "renewed", renewal_of_contract_id: "contract-001" });
  assert.equal(renewed.state, "renewed");
  assert.equal(renewed.renewal_of_contract_id, "contract-001");
});

test("employment contract lifecycle blocks invalid transitions and missing signatures", () => {
  const draft = createEmploymentContract({
    tenant_id: "tenant-a",
    contract_id: "contract-001",
    employee_id: "emp-001",
    profile_id: "profile-001",
    document_ref: "dms://contract-001",
  });
  assert.throws(() => transitionEmploymentContract(draft, { state: "signed", signature_ref: "sig" }), /cannot transition/);
  const approved = transitionEmploymentContract(draft, { state: "approved" });
  assert.throws(() => transitionEmploymentContract(approved, { state: "signed" }), /signature_ref is required/);
});
