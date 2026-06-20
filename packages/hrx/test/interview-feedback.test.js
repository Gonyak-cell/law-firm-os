import assert from "node:assert/strict";
import test from "node:test";
import { createInterview } from "../src/recruiting/interview.js";
import { completeInterviewWithFeedbackSource, createInterviewFeedbackSource } from "../src/recruiting/interview-feedback.js";

const interview = Object.freeze({
  tenant_id: "tenant-a",
  interview_id: "int-001",
  application_id: "app-001",
  candidate_id: "cand-001",
  scheduled_for: "2026-07-10T15:00:00.000Z",
  schedule_source_ref: "CalendarEvent:int-001",
  interviewer_employee_ids: ["emp-100"],
});

test("interview feedback source stores restricted source refs only", () => {
  const source = createInterviewFeedbackSource({
    tenant_id: "tenant-a",
    interview_id: "int-001",
    feedback_source_ref: "Scorecard:int-001",
    reviewer_employee_id: "emp-100",
  });
  assert.equal(source.restricted_access, true);
  assert.equal(source.source_only, true);
  assert.throws(
    () =>
      createInterviewFeedbackSource({
        tenant_id: "tenant-a",
        interview_id: "int-001",
        feedback_source_ref: "Scorecard:int-001",
        reviewer_employee_id: "emp-100",
        feedback_text: "raw text",
      }),
    /must not include feedback_text/,
  );

  const completed = completeInterviewWithFeedbackSource(createInterview(interview), {
    feedback_source_ref: "Scorecard:int-001",
    reviewer_employee_id: "emp-100",
  });
  assert.equal(completed.state, "completed");
  assert.equal(completed.feedback_source_ref, "Scorecard:int-001");
});
