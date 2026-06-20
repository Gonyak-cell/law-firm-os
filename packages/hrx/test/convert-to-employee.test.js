import assert from "node:assert/strict";
import test from "node:test";
import { convertCandidateToEmployee } from "../src/recruiting/convert-to-employee.js";

const candidate = Object.freeze({
  tenant_id: "tenant-a",
  candidate_id: "cand-001",
  legal_name: "Candidate One",
  email: "candidate@example.com",
  source_ref: "ATS:cand-001",
  resume_ref: "DocRef:resume-001",
  retention_policy_id: "candidate-retention-2y",
});

const hiredApplication = Object.freeze({
  tenant_id: "tenant-a",
  application_id: "app-001",
  candidate_id: "cand-001",
  job_opening_id: "job-001",
  stage: "hired",
});

const acceptedOffer = Object.freeze({
  tenant_id: "tenant-a",
  offer_id: "offer-001",
  application_id: "app-001",
  candidate_id: "cand-001",
  compensation_ref: "CompRef:offer-001",
  document_ref: "DocRef:offer-letter-001",
  state: "accepted",
  approval_ref: "Approval:offer-001",
});

test("candidate conversion requires explicit approval and keeps CRM Party out", () => {
  const conversion = convertCandidateToEmployee({
    candidate,
    application: hiredApplication,
    offer: acceptedOffer,
    approval_ref: "Approval:convert-cand-001",
    employee_id: "emp-001",
    profile_id: "profile-001",
    title: "Associate",
    effective_from: "2026-08-01",
  });
  assert.equal(conversion.explicit_approval_required, true);
  assert.equal(conversion.crm_party_linked, false);
  assert.equal(conversion.employee.employee_id, "emp-001");
  assert.equal(Object.hasOwn(conversion.employee, "crm_party_id"), false);
});

test("candidate conversion blocks unapproved or non-hired inputs", () => {
  assert.throws(
    () =>
      convertCandidateToEmployee({
        candidate,
        application: { ...hiredApplication, stage: "offer" },
        offer: acceptedOffer,
        approval_ref: "Approval:convert-cand-001",
        employee_id: "emp-001",
        profile_id: "profile-001",
        title: "Associate",
        effective_from: "2026-08-01",
      }),
    /hired application/,
  );
  assert.throws(
    () =>
      convertCandidateToEmployee({
        candidate,
        application: hiredApplication,
        offer: { ...acceptedOffer, state: "sent" },
        approval_ref: "Approval:convert-cand-001",
        employee_id: "emp-001",
        profile_id: "profile-001",
        title: "Associate",
        effective_from: "2026-08-01",
      }),
    /accepted offer/,
  );
});
