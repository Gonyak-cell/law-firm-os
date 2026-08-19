import {
  FUNCTION_METRICS,
  expectedFunctionUrlPolicy,
  safeDate,
  sha256,
  sortedUnique,
} from "./outlook-production-aws-inventory-contract.mjs";

function canonicalHttpsUrl(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:"
      && parsed.hostname.length > 0
      && parsed.username === ""
      && parsed.password === ""
      && parsed.port === ""
      && parsed.search === ""
      && parsed.hash === ""
      && parsed.href === value;
  } catch {
    return false;
  }
}

export function projectDirectInvoke(response, errorCode = null, functionName = null) {
  const policy = expectedFunctionUrlPolicy(functionName);
  if (!policy) return { status: "ERROR", error_code: "AWS_FUNCTION_URL_POLICY_MISSING", function_url_present: false, auth_type: null, url_stripped: true };
  if (errorCode === "AWS_RESOURCE_NOT_FOUND") {
    return policy.mode === "NONE"
      ? { status: "NOT_CONFIGURED", error_code: null, function_url_present: false, auth_type: null, url_stripped: true }
      : { status: "ERROR", error_code: "AWS_FUNCTION_URL_REQUIRED", function_url_present: false, auth_type: null, url_stripped: true };
  }
  if (errorCode) return { status: "ERROR", error_code: errorCode, function_url_present: false, auth_type: null, url_stripped: true };
  if (!response || typeof response !== "object" || Array.isArray(response) || !Object.prototype.hasOwnProperty.call(response, "FunctionUrl") || !Object.prototype.hasOwnProperty.call(response, "AuthType") || !canonicalHttpsUrl(response.FunctionUrl)) return { status: "ERROR", error_code: "AWS_RESPONSE_INVALID", function_url_present: false, auth_type: null, url_stripped: true };
  if (policy.mode === "NONE") return { status: "ERROR", error_code: "AWS_FUNCTION_URL_UNEXPECTED", function_url_present: true, auth_type: response.AuthType, url_stripped: true };
  if (response.AuthType !== policy.auth_type) return { status: "ERROR", error_code: "AWS_RESPONSE_INVALID", function_url_present: false, auth_type: null, url_stripped: true };
  return { status: "PASS", error_code: null, function_url_present: true, auth_type: policy.auth_type, url_stripped: true };
}

export function projectTags(response, errorCode = null) {
  if (errorCode) return { status: "ERROR", error_code: errorCode, key_count: 0, presence: {} };
  if (!response || !Object.prototype.hasOwnProperty.call(response, "Tags") || !response.Tags || typeof response.Tags !== "object" || Array.isArray(response.Tags)) return { status: "ERROR", error_code: "AWS_RESPONSE_INVALID", key_count: 0, presence: {} };
  const keys = Object.keys(response.Tags).sort();
  return { status: "PASS", error_code: null, key_count: keys.length, presence: Object.fromEntries(keys.map((key) => [key, true])) };
}

function failureClasses(message) {
  if (/\bLAWOS_RUNTIME_PREFLIGHT_FAILED\b/u.test(message) || /\bERROR\b/u.test(message) || /\b(?:Error|TypeError|ReferenceError|RangeError|SyntaxError|EvalError|URIError|AggregateError):/u.test(message) || /\b(?:[A-Za-z][A-Za-z0-9]*Exception|exception)\b/u.test(message)) return ["runtime_failure"];
  return [];
}

export function projectLogs(response, errorCode = null, maxEvents = 50) {
  if (errorCode) return { status: "ERROR", error_code: errorCode, complete: false, event_count: 0, first_event_at: null, last_event_at: null, first_failure_at: null, classes: [], request_ids: [] };
  if (!response || !Array.isArray(response.events)) return { status: "ERROR", error_code: "AWS_RESPONSE_INVALID", complete: false, event_count: 0, first_event_at: null, last_event_at: null, first_failure_at: null, classes: [], request_ids: [] };
  const complete = !response.nextToken && response.events.length < maxEvents;
  const events = response.events.map((event) => {
    if (!event || typeof event.eventId !== "string" || !Number.isFinite(event.timestamp) || typeof event.message !== "string") throw new Error("AWS_LOG_EVENT_MALFORMED");
    return { eventId: event.eventId, timestamp: safeDate(event.timestamp), classes: failureClasses(event.message), requestId: event.message.match(/RequestId:\s*([A-Za-z0-9-]+)/u)?.[1] ?? null };
  }).sort((left, right) => String(left.timestamp).localeCompare(String(right.timestamp)));
  const requestIds = new Map();
  for (const event of events) {
    if (!event.requestId) continue;
    const key = sha256(event.requestId);
    const current = requestIds.get(key) ?? { request_id_sha256: key, event_count: 0, first_event_at: event.timestamp, last_event_at: event.timestamp };
    current.event_count += 1;
    current.last_event_at = event.timestamp;
    requestIds.set(key, current);
  }
  const failures = events.filter((event) => event.classes.length);
  return {
    status: complete ? "PASS" : "INCOMPLETE",
    error_code: complete ? null : "AWS_LOGS_TRUNCATED",
    complete,
    event_count: events.length,
    first_event_at: events[0]?.timestamp ?? null,
    last_event_at: events.at(-1)?.timestamp ?? null,
    first_failure_at: failures[0]?.timestamp ?? null,
    classes: sortedUnique(failures.flatMap((event) => event.classes)),
    request_ids: [...requestIds.values()].sort((left, right) => left.request_id_sha256.localeCompare(right.request_id_sha256)),
  };
}

export function projectMetric(metricName, response, errorCode = null) {
  if (errorCode) return { metric_name: metricName, status: "ERROR", error_code: errorCode, datapoint_count: 0, datapoints: [] };
  if (!response || !Array.isArray(response.Datapoints)) return { metric_name: metricName, status: "ERROR", error_code: "AWS_RESPONSE_INVALID", datapoint_count: 0, datapoints: [] };
  const datapoints = response.Datapoints.map((point) => ({ timestamp: safeDate(point.Timestamp), sum: Number.isFinite(point.Sum) ? point.Sum : null, average: Number.isFinite(point.Average) ? point.Average : null, maximum: Number.isFinite(point.Maximum) ? point.Maximum : null, sample_count: Number.isFinite(point.SampleCount) ? point.SampleCount : null })).sort((left, right) => String(left.timestamp).localeCompare(String(right.timestamp)));
  return { metric_name: metricName, status: "PASS", error_code: null, datapoint_count: datapoints.length, datapoints };
}

export function projectAlarms(response, errorCode = null, maxRecords = 100) {
  if (errorCode) return { status: "ERROR", error_code: errorCode, complete: false, alarm_count: 0, states: {}, alarms: [] };
  if (!response || !Array.isArray(response.MetricAlarms)) return { status: "ERROR", error_code: "AWS_RESPONSE_INVALID", complete: false, alarm_count: 0, states: {}, alarms: [] };
  const alarms = response.MetricAlarms.map((alarm) => ({ name: alarm.AlarmName ?? null, state: alarm.StateValue ?? null, state_updated_at: safeDate(alarm.StateUpdatedTimestamp) })).sort((left, right) => String(left.name).localeCompare(String(right.name)));
  const states = {};
  for (const alarm of alarms) states[alarm.state ?? "UNKNOWN"] = (states[alarm.state ?? "UNKNOWN"] ?? 0) + 1;
  const complete = !response.NextToken && alarms.length < maxRecords;
  return { status: complete ? "PASS" : "INCOMPLETE", error_code: complete ? null : "AWS_ALARMS_TRUNCATED", complete, alarm_count: alarms.length, states, alarms };
}

export function projectRds(response, kind, errorCode = null) {
  if (errorCode) return { status: "ERROR", error_code: errorCode, rows: [] };
  const rows = kind === "instances" ? response?.DBInstances : response?.DBClusters;
  if (!response || !Array.isArray(rows)) return { status: "ERROR", error_code: "AWS_RESPONSE_INVALID", rows: [] };
  if (kind === "instances") return { status: "PASS", error_code: null, rows: rows.map((row) => ({ identifier: row.DBInstanceIdentifier ?? null, status: row.DBInstanceStatus ?? null, engine: row.Engine ?? null, engine_version: row.EngineVersion ?? null, availability_zone: row.AvailabilityZone ?? null })) };
  return { status: "PASS", error_code: null, rows: rows.map((row) => ({ identifier: row.DBClusterIdentifier ?? null, status: row.Status ?? null, engine: row.Engine ?? null, engine_version: row.EngineVersion ?? null, availability_zones_count: Array.isArray(row.AvailabilityZones) ? row.AvailabilityZones.length : 0 })) };
}

export { FUNCTION_METRICS };
