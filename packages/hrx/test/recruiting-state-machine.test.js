import assert from "node:assert/strict";
import test from "node:test";
import { assertRecruitingStageTransition, createRecruitingPipelineSnapshot } from "../src/recruiting/state-machine.js";

test("recruiting state-machine blocks invalid stage transitions across entities", () => {
  const snapshot = createRecruitingPipelineSnapshot({
    tenant_id: "tenant-a",
    job_openings: [
      {
        tenant_id: "tenant-a",
        job_opening_id: "job-001",
        title: "Associate",
        department_ref: "PracticeGroup:litigation",
        hiring_manager_employee_id: "emp-001",
      },
    ],
    applications: [
      {
        tenant_id: "tenant-a",
        application_id: "app-001",
        candidate_id: "cand-001",
        job_opening_id: "job-001",
      },
    ],
    offers: [
      {
        tenant_id: "tenant-a",
        offer_id: "offer-001",
        application_id: "app-001",
        candidate_id: "cand-001",
        compensation_ref: "CompRef:offer-001",
        document_ref: "DocRef:offer-001",
      },
    ],
  });
  assert.equal(snapshot.invalid_stage_transition_blocked, true);
  assert.equal(assertRecruitingStageTransition(snapshot.applications[0], { stage: "screening" }).stage, "screening");
  assert.throws(() => assertRecruitingStageTransition(snapshot.applications[0], { stage: "offer" }), /cannot transition/);
});
