import { createHrxMetric } from "./observability.js";

export const PEOPLE_FEATURE_FLAG_NAMES = Object.freeze([
  "people_overview",
  "people_member_brief",
  "outlook_calendar",
  "people_capacity",
  "leave_projection",
  "attendance_correction_workflow",
  "payroll_handoff",
  "payroll_close_precheck",
  "payroll_adjustment_workspace",
  "payroll_rule_publish",
  "payroll_statement_delivery",
  "pay_rules_workspace",
]);

const PEOPLE_FEATURE_OUTCOMES = new Set(["request", "partial", "stale", "denied"]);

function flagValue(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return false;
}

export function resolvePeopleFeatureFlags(input = {}) {
  return Object.freeze(Object.fromEntries(
    PEOPLE_FEATURE_FLAG_NAMES.map((name) => [name, flagValue(input?.[name])]),
  ));
}

export function createPeopleFeatureTelemetry({
  tenant_id,
  feature,
  outcome = "request",
} = {}) {
  if (!PEOPLE_FEATURE_FLAG_NAMES.includes(feature)) throw new TypeError("feature must be a registered People feature");
  if (!PEOPLE_FEATURE_OUTCOMES.has(outcome)) throw new TypeError("outcome must be request, partial, stale, or denied");
  return createHrxMetric({
    metric_name: "people.feature.request_count",
    tenant_id,
    value: 1,
    unit: "count",
    tags: { feature, outcome },
  });
}

export function recordPeopleFeatureTelemetry({ sink, ...input } = {}) {
  if (!sink || typeof sink.emit !== "function") throw new TypeError("People metrics sink emit port is required");
  return sink.emit(createPeopleFeatureTelemetry(input));
}
