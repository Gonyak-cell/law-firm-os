export const HRX_APPLICATION_STAGES = Object.freeze(["submitted", "screening", "interview", "offer", "hired", "rejected", "withdrawn"]);

const APPLICATION_TRANSITIONS = Object.freeze({
  submitted: Object.freeze(["screening", "rejected", "withdrawn"]),
  screening: Object.freeze(["interview", "rejected", "withdrawn"]),
  interview: Object.freeze(["offer", "rejected", "withdrawn"]),
  offer: Object.freeze(["hired", "rejected", "withdrawn"]),
  hired: Object.freeze([]),
  rejected: Object.freeze([]),
  withdrawn: Object.freeze([]),
});

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createApplication(input = {}) {
  const stage = input.stage ?? "submitted";
  if (!HRX_APPLICATION_STAGES.includes(stage)) throw new TypeError(`stage must be one of ${HRX_APPLICATION_STAGES.join(", ")}`);
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    application_id: requiredString(input, "application_id"),
    candidate_id: requiredString(input, "candidate_id"),
    job_opening_id: requiredString(input, "job_opening_id"),
    stage,
    submitted_at: input.submitted_at ?? new Date().toISOString(),
    stage_reason: input.stage_reason ?? null,
  });
}

export function transitionApplicationStage(application = {}, change = {}) {
  const current = createApplication(application);
  const nextStage = change.stage ?? current.stage;
  if (nextStage !== current.stage && !(APPLICATION_TRANSITIONS[current.stage] ?? []).includes(nextStage)) {
    throw new TypeError(`Application cannot transition from ${current.stage} to ${nextStage}`);
  }
  return createApplication({ ...current, ...change });
}
