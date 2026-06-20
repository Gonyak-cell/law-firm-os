import { recordInterviewFeedback } from "./interview.js";

const RAW_FEEDBACK_FIELDS = Object.freeze(["feedback", "feedback_text", "notes", "scorecard_body", "rating"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function assertNoRawFeedback(input = {}) {
  for (const field of RAW_FEEDBACK_FIELDS) {
    if (Object.hasOwn(input, field)) throw new TypeError(`Interview feedback source must not include ${field}`);
  }
}

export function createInterviewFeedbackSource(input = {}) {
  assertNoRawFeedback(input);
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    interview_id: requiredString(input, "interview_id"),
    feedback_source_ref: requiredString(input, "feedback_source_ref"),
    reviewer_employee_id: requiredString(input, "reviewer_employee_id"),
    restricted_access: true,
    source_only: true,
  });
}

export function completeInterviewWithFeedbackSource(interview = {}, input = {}) {
  const source = createInterviewFeedbackSource({
    ...input,
    tenant_id: input.tenant_id ?? interview.tenant_id,
    interview_id: input.interview_id ?? interview.interview_id,
  });
  return recordInterviewFeedback(interview, { feedback_source_ref: source.feedback_source_ref });
}
