export const HRX_INTERVIEW_STATES = Object.freeze(["scheduled", "completed", "cancelled"]);

const INTERVIEW_TRANSITIONS = Object.freeze({
  scheduled: Object.freeze(["completed", "cancelled"]),
  completed: Object.freeze([]),
  cancelled: Object.freeze([]),
});

const RAW_FEEDBACK_FIELDS = Object.freeze(["feedback", "feedback_text", "notes", "scorecard_body"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function requiredStringArray(input, field) {
  const value = input?.[field];
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new TypeError(`${field} must be a non-empty string array`);
  }
  return Object.freeze(value.map((item) => item.trim()));
}

function assertNoRawFeedback(input = {}) {
  for (const field of RAW_FEEDBACK_FIELDS) {
    if (Object.hasOwn(input, field)) throw new TypeError(`Interview feedback must use source_ref, not ${field}`);
  }
}

export function createInterview(input = {}) {
  assertNoRawFeedback(input);
  const state = input.state ?? "scheduled";
  if (!HRX_INTERVIEW_STATES.includes(state)) throw new TypeError(`state must be one of ${HRX_INTERVIEW_STATES.join(", ")}`);
  if (state === "completed" && !input.feedback_source_ref) {
    throw new TypeError("feedback_source_ref is required for completed interview");
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    interview_id: requiredString(input, "interview_id"),
    application_id: requiredString(input, "application_id"),
    candidate_id: requiredString(input, "candidate_id"),
    scheduled_for: requiredString(input, "scheduled_for"),
    schedule_source_ref: requiredString(input, "schedule_source_ref"),
    interviewer_employee_ids: requiredStringArray(input, "interviewer_employee_ids"),
    state,
    feedback_source_ref: input.feedback_source_ref ?? null,
    restricted_access: true,
    sensitivity: "candidate",
  });
}

export function recordInterviewFeedback(interview = {}, input = {}) {
  const current = createInterview(interview);
  if (current.state !== "scheduled") throw new TypeError("Interview feedback can only be recorded from scheduled state");
  assertNoRawFeedback(input);
  return createInterview({
    ...current,
    state: "completed",
    feedback_source_ref: requiredString(input, "feedback_source_ref"),
  });
}

export function transitionInterview(interview = {}, change = {}) {
  const current = createInterview(interview);
  const nextState = change.state ?? current.state;
  if (nextState !== current.state && !(INTERVIEW_TRANSITIONS[current.state] ?? []).includes(nextState)) {
    throw new TypeError(`Interview cannot transition from ${current.state} to ${nextState}`);
  }
  return createInterview({ ...current, ...change });
}
