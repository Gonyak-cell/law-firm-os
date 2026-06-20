export const HRX_JOB_OPENING_STATES = Object.freeze(["draft", "approved", "open", "closed", "cancelled"]);

const JOB_OPENING_TRANSITIONS = Object.freeze({
  draft: Object.freeze(["approved", "cancelled"]),
  approved: Object.freeze(["open", "cancelled"]),
  open: Object.freeze(["closed", "cancelled"]),
  closed: Object.freeze([]),
  cancelled: Object.freeze([]),
});

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function requiredPositiveInteger(input, field) {
  const value = input?.[field];
  if (!Number.isInteger(value) || value <= 0) throw new TypeError(`${field} must be a positive integer`);
  return value;
}

export function createJobOpening(input = {}) {
  const state = input.state ?? "draft";
  if (!HRX_JOB_OPENING_STATES.includes(state)) throw new TypeError(`state must be one of ${HRX_JOB_OPENING_STATES.join(", ")}`);
  if (["approved", "open"].includes(state) && !input.approval_ref) {
    throw new TypeError("approval_ref is required before a job opening can be approved or open");
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    job_opening_id: requiredString(input, "job_opening_id"),
    title: requiredString(input, "title"),
    department_ref: requiredString(input, "department_ref"),
    hiring_manager_employee_id: requiredString(input, "hiring_manager_employee_id"),
    position_count: requiredPositiveInteger({ position_count: input.position_count ?? 1 }, "position_count"),
    state,
    approval_ref: input.approval_ref ?? null,
    opened_at: input.opened_at ?? null,
    closed_at: input.closed_at ?? null,
  });
}

export function transitionJobOpening(opening = {}, change = {}) {
  const current = createJobOpening(opening);
  const nextState = change.state ?? current.state;
  if (nextState !== current.state && !(JOB_OPENING_TRANSITIONS[current.state] ?? []).includes(nextState)) {
    throw new TypeError(`JobOpening cannot transition from ${current.state} to ${nextState}`);
  }
  return createJobOpening({
    ...current,
    ...change,
    opened_at: nextState === "open" ? change.opened_at ?? new Date().toISOString() : current.opened_at,
    closed_at: nextState === "closed" ? change.closed_at ?? new Date().toISOString() : current.closed_at,
  });
}
