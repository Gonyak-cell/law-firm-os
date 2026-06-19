import assert from "node:assert/strict";
import test from "node:test";
import { createInterview, recordInterviewFeedback, transitionInterview } from "../src/recruiting/interview.js";

const interview = Object.freeze({
  tenant_id: "tenant-a",
  interview_id: "int-001",
  application_id: "app-001",
  candidate_id: "cand-001",
  scheduled_for: "2026-07-10T15:00:00.000Z",
  schedule_source_ref: "CalendarEvent:int-001",
  interviewer_employee_ids: ["emp-100", "emp-101"],
});

test("interview workflow requires schedule and feedback source refs with restricted access", () => {
  const scheduled = createInterview(interview);
  assert.equal(scheduled.restricted_access, true);
  assert.equal(scheduled.sensitivity, "candidate");

  const completed = recordInterviewFeedback(scheduled, { feedback_source_ref: "Scorecard:int-001" });
  assert.equal(completed.state, "completed");
  assert.equal(completed.feedback_source_ref, "Scorecard:int-001");
});

test("interview workflow rejects raw feedback and completed state without feedback source", () => {
  assert.throws(() => createInterview({ ...interview, notes: "raw note" }), /source_ref/);
  assert.throws(() => transitionInterview(createInterview(interview), { state: "completed" }), /feedback_source_ref is required/);
});
