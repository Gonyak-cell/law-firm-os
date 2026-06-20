import assert from "node:assert/strict";
import test from "node:test";
import { evaluateHrxCandidateAccess, maskHrxCandidateRecord } from "../src/hrx-candidate-policy.js";

const resource = { tenant_id: "tenant-a", resource_type: "hrx.candidate", resource_id: "cand-001", sensitivity: "candidate" };

test("HRX candidate policy blocks CRM Party scope from candidate object", () => {
  const decision = evaluateHrxCandidateAccess({
    principal: {
      tenant_id: "tenant-a",
      user_id: "crm-user",
      role_ids: ["hr_admin"],
      scopes: ["crm.party.read"],
      hrx_scopes: [],
      allowed_purposes: ["recruiting"],
    },
    resource,
    action: "read",
    purpose: "recruiting",
  });
  assert.equal(decision.effect, "deny");
  assert.equal(decision.reason, "hrx_candidate_not_crm_party_scope");
});

test("HRX candidate policy allows HRX candidate scope and masks denied fields", () => {
  const allowed = evaluateHrxCandidateAccess({
    principal: {
      tenant_id: "tenant-a",
      user_id: "recruiter",
      role_ids: ["people_ops"],
      scopes: ["crm.party.read"],
      hrx_scopes: ["hrx.candidate.read"],
      allowed_purposes: ["recruiting"],
    },
    resource,
    action: "read",
    purpose: "recruiting",
  });
  assert.equal(allowed.effect, "allow");

  const denied = evaluateHrxCandidateAccess({
    principal: {
      tenant_id: "tenant-a",
      user_id: "no-scope",
      role_ids: ["people_ops"],
      hrx_scopes: [],
      allowed_purposes: ["recruiting"],
    },
    resource,
    action: "read",
    purpose: "recruiting",
  });
  const masked = maskHrxCandidateRecord({ candidate_id: "cand-001", email: "candidate@example.com", resume_ref: "doc-1" }, denied);
  assert.equal(masked.email, null);
  assert.equal(masked.resume_ref, null);
  assert.equal(masked.masked, true);
});
