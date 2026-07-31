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

function isoDate(value, field = "as_of") {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError(`${field} must be an ISO date (YYYY-MM-DD)`);
  }
  return value;
}

function previousIsoDate(value) {
  const date = new Date(`${isoDate(value, "effective_from")}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function sortEmploymentProfiles(profiles = []) {
  if (!Array.isArray(profiles)) throw new TypeError("profiles must be an array");
  return [...profiles].sort(
    (left, right) =>
      String(left.effective_from).localeCompare(String(right.effective_from)) ||
      String(left.profile_id).localeCompare(String(right.profile_id)),
  );
}

export function employmentProfileAsOf(profiles = [], asOf) {
  const date = isoDate(asOf);
  return (
    sortEmploymentProfiles(profiles)
      .filter((profile) => profile.effective_from <= date)
      .filter((profile) => !profile.effective_to || profile.effective_to >= date)
      .at(-1) ?? null
  );
}

export function employmentProfileTimeline(profiles = [], { as_of: asOf } = {}) {
  const date = isoDate(asOf);
  const rows = sortEmploymentProfiles(profiles);
  return Object.freeze({
    as_of: date,
    current: employmentProfileAsOf(rows, date),
    past: Object.freeze(rows.filter((profile) => profile.effective_to && profile.effective_to < date)),
    scheduled: Object.freeze(rows.filter((profile) => profile.effective_from > date)),
    all: Object.freeze(rows),
  });
}

export function assertEmploymentProfileTimeline(profiles = []) {
  const rows = sortEmploymentProfiles(profiles);
  let terminated = false;
  for (let index = 0; index < rows.length; index += 1) {
    const profile = createEmploymentProfile(rows[index]);
    const previous = index > 0 ? rows[index - 1] : null;
    if (previous && (!previous.effective_to || previous.effective_to >= profile.effective_from)) {
      throw new TypeError(
        `EmploymentProfile periods must not overlap: ${previous.profile_id} and ${profile.profile_id}`,
      );
    }
    if (terminated && profile.status !== "terminated") {
      throw new TypeError("EmploymentProfile cannot transition from terminated to active");
    }
    if (profile.status === "terminated") terminated = true;
  }
  return true;
}

export function planEmploymentProfileInsertion(profiles = [], input = {}) {
  const rows = sortEmploymentProfiles(profiles);
  const nextProfile = createEmploymentProfile(input);
  if (
    rows.some(
      (profile) =>
        profile.tenant_id !== nextProfile.tenant_id ||
        profile.employee_id !== nextProfile.employee_id,
    )
  ) {
    throw new TypeError("EmploymentProfile timeline must belong to one tenant and employee");
  }
  if (rows.some((profile) => profile.effective_from === nextProfile.effective_from)) {
    throw new TypeError(`EmploymentProfile effective_from already exists: ${nextProfile.effective_from}`);
  }

  const previous = rows.filter((profile) => profile.effective_from < nextProfile.effective_from).at(-1) ?? null;
  const following = rows.find((profile) => profile.effective_from > nextProfile.effective_from) ?? null;
  const normalizedNext = createEmploymentProfile({
    ...nextProfile,
    effective_to: nextProfile.effective_to ?? (following ? previousIsoDate(following.effective_from) : null),
  });
  const previousUpdate =
    previous && (!previous.effective_to || previous.effective_to >= normalizedNext.effective_from)
      ? createEmploymentProfile({
          ...previous,
          effective_to: previousIsoDate(normalizedNext.effective_from),
        })
      : null;
  const proposed = rows
    .filter((profile) => profile.profile_id !== previousUpdate?.profile_id)
    .concat(previousUpdate ? [previousUpdate] : [])
    .concat(normalizedNext);
  assertEmploymentProfileTimeline(proposed);
  return Object.freeze({
    profile: normalizedNext,
    previous_update: previousUpdate,
    timeline: Object.freeze(sortEmploymentProfiles(proposed)),
  });
}
