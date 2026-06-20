function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new TypeError(`${field} must be a string`);
  return value.trim();
}

function percent(input, field, fallback) {
  const value = input?.[field] ?? fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new TypeError(`${field} must be between 0 and 100`);
  }
  return value;
}

function hours(input, field) {
  const value = input?.[field];
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${field} must be a finite number greater than 0`);
  }
  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function key(tenantId, capacityProfileId) {
  return `${tenantId}:${capacityProfileId}`;
}

export function createCapacityProfile(input = {}) {
  const weeklyAvailableHours = hours(input, "weekly_available_hours");
  const targetUtilizationPct = percent(input, "target_utilization_pct", 80);
  const reservedPct = percent(input, "reserved_pct", 0);
  if (targetUtilizationPct + reservedPct > 100) {
    throw new TypeError("target_utilization_pct plus reserved_pct must not exceed 100");
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    capacity_profile_id: requiredString(input, "capacity_profile_id"),
    employee_id: requiredString(input, "employee_id"),
    effective_from: requiredString(input, "effective_from"),
    effective_to: optionalString(input, "effective_to"),
    weekly_available_hours: weeklyAvailableHours,
    target_utilization_pct: targetUtilizationPct,
    reserved_pct: reservedPct,
    denominator_hours: weeklyAvailableHours,
  });
}

export function calculateCapacityUtilization({ profile, billable_hours = 0, non_billable_hours = 0 } = {}) {
  const normalizedProfile = createCapacityProfile(profile);
  for (const [field, value] of Object.entries({ billable_hours, non_billable_hours })) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new TypeError(`${field} must be a finite number greater than or equal to 0`);
    }
  }
  const denominator = normalizedProfile.denominator_hours;
  const totalHours = billable_hours + non_billable_hours;
  const utilizationPct = denominator === 0 ? 0 : (billable_hours / denominator) * 100;
  const totalLoadPct = denominator === 0 ? 0 : (totalHours / denominator) * 100;
  return Object.freeze({
    tenant_id: normalizedProfile.tenant_id,
    employee_id: normalizedProfile.employee_id,
    capacity_profile_id: normalizedProfile.capacity_profile_id,
    denominator_hours: denominator,
    billable_hours,
    non_billable_hours,
    utilization_pct: Number(utilizationPct.toFixed(2)),
    total_load_pct: Number(totalLoadPct.toFixed(2)),
    target_utilization_pct: normalizedProfile.target_utilization_pct,
    status:
      totalLoadPct > 100
        ? "over_capacity"
        : utilizationPct < normalizedProfile.target_utilization_pct
          ? "under_target"
          : "on_target",
  });
}

export function createInMemoryCapacityProfileStore(seed = []) {
  const profiles = new Map();
  const store = {
    create(input) {
      const profile = createCapacityProfile(input);
      const profileKey = key(profile.tenant_id, profile.capacity_profile_id);
      if (profiles.has(profileKey)) throw new Error(`CapacityProfile already exists: ${profile.capacity_profile_id}`);
      profiles.set(profileKey, clone(profile));
      return Object.freeze(clone(profile));
    },
    get(ref = {}) {
      const value = profiles.get(key(ref.tenant_id, ref.capacity_profile_id));
      return value ? Object.freeze(clone(value)) : undefined;
    },
    list(query = {}) {
      return Object.freeze(
        [...profiles.values()]
          .filter((profile) => !query.tenant_id || profile.tenant_id === query.tenant_id)
          .filter((profile) => !query.employee_id || profile.employee_id === query.employee_id)
          .map((profile) => Object.freeze(clone(profile))),
      );
    },
  };

  for (const profile of seed) store.create(profile);
  return Object.freeze(store);
}
