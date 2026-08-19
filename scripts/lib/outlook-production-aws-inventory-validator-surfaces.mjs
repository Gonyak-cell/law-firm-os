import { canonicalJson, exactKeys } from "./outlook-production-aws-inventory-contract.mjs";

const METRIC_KEYS = ["metric_name", "status", "error_code", "datapoint_count", "datapoints"];
const DATAPOINT_KEYS = ["timestamp", "sum", "average", "maximum", "sample_count"];
const ALARM_KEYS = ["status", "error_code", "complete", "alarm_count", "states", "alarms"];
const RDS_KEYS = ["status", "error_code", "complete", "identifiers", "instances", "clusters"];
const RDS_INSTANCE_KEYS = ["identifier", "status", "engine", "engine_version", "availability_zone"];
const RDS_CLUSTER_KEYS = ["identifier", "status", "engine", "engine_version", "availability_zones_count"];

export function validateMetric(metric, label) {
  exactKeys(metric, METRIC_KEYS, label);
  if (typeof metric.metric_name !== "string" || !metric.metric_name || !["PASS", "ERROR", "INCOMPLETE"].includes(metric.status) || (metric.status === "PASS" ? metric.error_code !== null : typeof metric.error_code !== "string") || !Number.isInteger(metric.datapoint_count) || metric.datapoint_count < 0 || !Array.isArray(metric.datapoints) || metric.datapoint_count !== metric.datapoints.length) throw new Error(`${label} datapoints are inconsistent`);
  for (const point of metric.datapoints) { exactKeys(point, DATAPOINT_KEYS, `${label} datapoint`); if (point.timestamp !== null && typeof point.timestamp !== "string") throw new Error(`${label} timestamp is invalid`); for (const field of ["sum", "average", "maximum", "sample_count"]) if (point[field] !== null && (typeof point[field] !== "number" || !Number.isFinite(point[field]))) throw new Error(`${label} ${field} is invalid`); }
}

export function validateMetricSet(metrics, names, label) {
  if (!Array.isArray(metrics) || metrics.map((metric) => metric?.metric_name).sort().join("\n") !== [...names].sort().join("\n")) throw new Error(`${label} metrics drifted`);
  for (const metric of metrics) validateMetric(metric, `${label} metric`);
}

export function validateRds(value) {
  exactKeys(value, RDS_KEYS, "inventory RDS");
  if (!["PASS", "ERROR"].includes(value.status) || typeof value.complete !== "boolean" || (value.complete ? value.status !== "PASS" || value.error_code !== null : typeof value.error_code !== "string") || !Array.isArray(value.identifiers) || value.identifiers.some((id) => typeof id !== "string" || !id) || value.identifiers.join("\n") !== [...value.identifiers].sort().join("\n") || new Set(value.identifiers).size !== value.identifiers.length || !Array.isArray(value.instances) || !Array.isArray(value.clusters)) throw new Error("inventory RDS shape is invalid");
  const expected = new Set(value.identifiers);
  const observed = [];
  for (const row of value.instances) { exactKeys(row, RDS_INSTANCE_KEYS, "inventory RDS instance"); if (typeof row.identifier !== "string" || !row.identifier || !expected.has(row.identifier)) throw new Error("inventory RDS instance identifier is invalid"); observed.push(row.identifier); for (const field of RDS_INSTANCE_KEYS.slice(1)) if (row[field] !== null && typeof row[field] !== "string") throw new Error("inventory RDS instance field is invalid"); }
  for (const row of value.clusters) { exactKeys(row, RDS_CLUSTER_KEYS, "inventory RDS cluster"); if (typeof row.identifier !== "string" || !row.identifier || !expected.has(row.identifier)) throw new Error("inventory RDS cluster identifier is invalid"); observed.push(row.identifier); for (const field of RDS_CLUSTER_KEYS.slice(1, -1)) if (row[field] !== null && typeof row[field] !== "string") throw new Error("inventory RDS cluster field is invalid"); if (!Number.isInteger(row.availability_zones_count) || row.availability_zones_count < 0) throw new Error("inventory RDS availability-zone count is invalid"); }
  if (new Set(observed).size !== observed.length) throw new Error("inventory RDS identifiers are duplicated across surfaces");
  if (value.complete && (observed.length !== value.identifiers.length || value.identifiers.some((identifier) => !observed.includes(identifier)))) throw new Error("complete inventory RDS identifier set is incomplete");
}

export function validateAlarms(value) {
  exactKeys(value, ALARM_KEYS, "inventory alarms");
  if (!["PASS", "ERROR", "INCOMPLETE"].includes(value.status) || typeof value.complete !== "boolean" || (value.complete ? value.status !== "PASS" || value.error_code !== null : typeof value.error_code !== "string") || !Number.isInteger(value.alarm_count) || value.alarm_count < 0 || !Array.isArray(value.alarms) || value.alarm_count !== value.alarms.length || !value.states || typeof value.states !== "object" || Array.isArray(value.states)) throw new Error("inventory alarms shape is invalid");
  for (const alarm of value.alarms) { exactKeys(alarm, ["name", "state", "state_updated_at"], "inventory alarm"); if (alarm.name !== null && typeof alarm.name !== "string") throw new Error("inventory alarm name is invalid"); if (alarm.state !== null && typeof alarm.state !== "string") throw new Error("inventory alarm state is invalid"); if (alarm.state_updated_at !== null && typeof alarm.state_updated_at !== "string") throw new Error("inventory alarm timestamp is invalid"); }
  const stateCounts = {};
  for (const alarm of value.alarms) stateCounts[alarm.state ?? "UNKNOWN"] = (stateCounts[alarm.state ?? "UNKNOWN"] ?? 0) + 1;
  if (canonicalJson(stateCounts) !== canonicalJson(value.states)) throw new Error("inventory alarm state counts are inconsistent");
}
