import { createEmploymentProfile } from "./schema.js";

export const HRX_EMPLOYMENT_PROFILE_TRANSITIONS = Object.freeze({
  active: Object.freeze(["on_leave", "terminated"]),
  future: Object.freeze(["active", "terminated"]),
  on_leave: Object.freeze(["active", "terminated"]),
  terminated: Object.freeze([]),
});

export function transitionEmploymentProfile(profile = {}, change = {}) {
  const nextStatus = change.status ?? profile.status;
  const allowed = HRX_EMPLOYMENT_PROFILE_TRANSITIONS[profile.status] ?? [];
  if (nextStatus !== profile.status && !allowed.includes(nextStatus)) {
    throw new TypeError(`EmploymentProfile cannot transition from ${profile.status} to ${nextStatus}`);
  }
  return createEmploymentProfile({
    ...profile,
    ...change,
    tenant_id: profile.tenant_id,
    profile_id: profile.profile_id,
    employee_id: profile.employee_id,
  });
}

export function createEmploymentProfileChangeEvent(profile = {}, change = {}) {
  if (typeof change.effective_from !== "string" || change.effective_from.trim() === "") {
    throw new TypeError("effective_from is required");
  }
  return Object.freeze({
    event_type: "hrx.employment_profile.changed",
    tenant_id: profile.tenant_id,
    employee_id: profile.employee_id,
    profile_id: profile.profile_id,
    from_status: profile.status,
    to_status: change.status ?? profile.status,
    from_employment_type: profile.employment_type,
    to_employment_type: change.employment_type ?? profile.employment_type,
    effective_from: change.effective_from,
  });
}
