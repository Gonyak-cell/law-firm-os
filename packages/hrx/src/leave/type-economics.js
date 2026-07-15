const USAGE_MODES = Object.freeze(["full_day", "half_day", "quarter_day", "hours"]);
const ROUNDING_MODES = Object.freeze(["none", "ceil", "floor", "nearest"]);
const RULE_FIELDS = new Set([
  "usage_modes",
  "standard_day_minutes",
  "paid_ratio_bps",
  "deduction_ratio_bps",
  "rounding_minutes",
  "rounding_mode",
]);

const DEFAULT_RULE = Object.freeze({
  usage_modes: USAGE_MODES,
  standard_day_minutes: 480,
  paid_ratio_bps: 10_000,
  deduction_ratio_bps: 10_000,
  rounding_minutes: 1,
  rounding_mode: "none",
});

function plainObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${field} must be an object`);
  return value;
}

function integer(value, field, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(`${field} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function positiveInteger(value, field) {
  if (!Number.isInteger(value) || value <= 0) throw new TypeError(`${field} must be a positive integer`);
  return value;
}

function normalizeUsageModes(value) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError("usage_modes must be a non-empty array");
  const modes = value.map((mode) => {
    if (typeof mode !== "string" || !USAGE_MODES.includes(mode)) throw new TypeError("usage_modes contains an invalid mode");
    return mode;
  });
  if (new Set(modes).size !== modes.length) throw new TypeError("usage_modes must not contain duplicates");
  return Object.freeze(modes);
}

export function normalizeLeaveTypeEconomics(input = {}) {
  plainObject(input, "leave type economics");
  for (const field of Object.keys(input)) {
    if (!RULE_FIELDS.has(field)) throw new TypeError(`leave type economics contains unsupported field: ${field}`);
  }
  const standardDayMinutes = integer(input.standard_day_minutes ?? DEFAULT_RULE.standard_day_minutes, "standard_day_minutes", 1, 1_440);
  const roundingMinutes = integer(input.rounding_minutes ?? DEFAULT_RULE.rounding_minutes, "rounding_minutes", 1, standardDayMinutes);
  const roundingMode = input.rounding_mode ?? DEFAULT_RULE.rounding_mode;
  if (!ROUNDING_MODES.includes(roundingMode)) throw new TypeError("rounding_mode is invalid");
  if (roundingMode === "none" && roundingMinutes !== 1) {
    throw new TypeError("rounding_minutes must be 1 when rounding_mode is none");
  }
  return Object.freeze({
    usage_modes: normalizeUsageModes(input.usage_modes ?? DEFAULT_RULE.usage_modes),
    standard_day_minutes: standardDayMinutes,
    paid_ratio_bps: integer(input.paid_ratio_bps ?? DEFAULT_RULE.paid_ratio_bps, "paid_ratio_bps", 0, 10_000),
    deduction_ratio_bps: integer(input.deduction_ratio_bps ?? DEFAULT_RULE.deduction_ratio_bps, "deduction_ratio_bps", 0, 10_000),
    rounding_minutes: roundingMinutes,
    rounding_mode: roundingMode,
  });
}

export function normalizeLeavePolicyRules(rules) {
  plainObject(rules, "rules");
  const normalized = JSON.parse(JSON.stringify(rules));
  if (normalized.type_rules === undefined) return Object.freeze(normalized);
  plainObject(normalized.type_rules, "type_rules");
  const typeRules = {};
  for (const [leaveTypeId, rule] of Object.entries(normalized.type_rules)) {
    if (!leaveTypeId.trim()) throw new TypeError("type_rules keys must be non-empty leave type IDs");
    typeRules[leaveTypeId] = normalizeLeaveTypeEconomics(rule);
  }
  normalized.type_rules = Object.freeze(typeRules);
  return Object.freeze(normalized);
}

export function resolveLeaveTypeEconomics(rules, leaveTypeId) {
  if (typeof leaveTypeId !== "string" || !leaveTypeId.trim()) throw new TypeError("leave_type_id is required");
  const normalized = normalizeLeavePolicyRules(rules ?? {});
  return normalized.type_rules?.[leaveTypeId] ?? DEFAULT_RULE;
}

function roundMinutes(value, increment, mode) {
  if (mode === "none") return value;
  const scaled = value / increment;
  if (mode === "ceil") return Math.ceil(scaled) * increment;
  if (mode === "floor") return Math.floor(scaled) * increment;
  return Math.round(scaled) * increment;
}

export function calculateLeaveTypeEconomics({ rules, leave_type_id: leaveTypeId, duration_mode: durationMode, requested_minutes: requestedMinutes } = {}) {
  const rule = resolveLeaveTypeEconomics(rules, leaveTypeId);
  if (!rule.usage_modes.includes(durationMode)) throw new TypeError("duration_mode is not allowed for this leave type");
  positiveInteger(requestedMinutes, "requested_minutes");
  const roundedRequestedMinutes = durationMode === "hours"
    ? roundMinutes(requestedMinutes, rule.rounding_minutes, rule.rounding_mode)
    : requestedMinutes;
  const paidMinutes = Math.round((roundedRequestedMinutes * rule.paid_ratio_bps) / 10_000);
  const deductionMinutes = Math.round((roundedRequestedMinutes * rule.deduction_ratio_bps) / 10_000);
  return Object.freeze({
    requested_minutes: requestedMinutes,
    rounded_requested_minutes: roundedRequestedMinutes,
    paid_minutes: paidMinutes,
    unpaid_minutes: Math.max(0, roundedRequestedMinutes - paidMinutes),
    deduction_minutes: deductionMinutes,
    standard_day_minutes: rule.standard_day_minutes,
    duration_mode: durationMode,
  });
}
