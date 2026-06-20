import assert from "node:assert/strict";
import test from "node:test";
import { createCandidateProfile, createCandidateRetentionScope } from "../src/recruiting/candidate.js";

const candidate = Object.freeze({
  tenant_id: "tenant-a",
  candidate_id: "cand-001",
  legal_name: "Candidate One",
  email: "candidate@example.com",
  source_ref: "ATS:greenhouse:cand-001",
  resume_ref: "DocRef:resume-001",
  retention_policy_id: "candidate-retention-2y",
});

test("candidate profile is separated from CRM Party and carries retention scope", () => {
  const profile = createCandidateProfile(candidate);
  assert.equal(profile.crm_party_linked, false);
  assert.equal(profile.data_subject_type, "candidate");
  assert.deepEqual(createCandidateRetentionScope(profile), {
    tenant_id: "tenant-a",
    subject_type: "candidate",
    subject_id: "cand-001",
    retention_policy_id: "candidate-retention-2y",
    retention_basis: "candidate_recruiting_record",
  });
});

test("candidate profile rejects CRM Party identifiers and body fields", () => {
  assert.throws(() => createCandidateProfile({ ...candidate, crm_party_id: "party-001" }), /CRM Party identifier/);
  assert.throws(() => createCandidateProfile({ ...candidate, resume_body: "full resume" }), /source refs instead of body fields/);
});
