import {
  TOPOLOGY_METRICS,
  exactKeys,
  isSha256Hex,
} from "./outlook-production-aws-inventory-contract.mjs";
import {
  validateMetric,
  validateMetricSet,
} from "./outlook-production-aws-inventory-validator-surfaces.mjs";

const TOPOLOGY_KEYS = ["status", "error_code", "complete", "proof", "cloudfront", "http_api", "eventbridge", "async_invoke", "metrics"];
const TOPOLOGY_PROOF_KEYS = ["http_api_separate_from_cloudfront_api_origin", "five_minute_target_is_lawos_production_api", "api_integration_targets_lawos_production_api"];
const CLOUDFRONT_KEYS = ["status", "error_code", "complete", "api_path_behaviors", "logging_enabled", "separate_from_http_api"];
const CLOUDFRONT_BEHAVIOR_KEYS = ["path_pattern", "target_origin_id", "target_origin_domain_sha256", "target_origin_port"];
const HTTP_API_KEYS = ["status", "error_code", "complete", "api_id", "protocol_type", "api_endpoint_host_sha256", "api_endpoint_port", "routes", "integrations", "stages", "targets_expected_api", "separate_from_cloudfront_legacy_origin"];
const HTTP_ROUTE_KEYS = ["route_key", "target"];
const HTTP_INTEGRATION_KEYS = ["integration_id", "target_function"];
const HTTP_STAGE_KEYS = ["stage_name", "auto_deploy"];
const EVENTBRIDGE_KEYS = ["status", "error_code", "complete", "schedule_expression", "state", "targets", "targets_expected_api", "retry_policy"];
const EVENT_TARGET_KEYS = ["id", "function_name", "retry_policy"];
const RETRY_KEYS = ["maximum_event_age_seconds", "maximum_retry_attempts"];
const ASYNC_KEYS = ["status", "error_code", "complete", "maximum_event_age_seconds", "maximum_retry_attempts", "destination_config_present"];

function digest(value, label) {
  if (!isSha256Hex(value)) throw new Error(`${label} must be a lowercase SHA-256 digest`);
}

export function validateTopology(value) {
  exactKeys(value, TOPOLOGY_KEYS, "inventory topology");
  if (!["PASS", "INCOMPLETE", "ERROR"].includes(value.status) || typeof value.complete !== "boolean" || (value.complete ? value.status !== "PASS" || value.error_code !== null : typeof value.error_code !== "string") || !Array.isArray(value.metrics)) throw new Error("inventory topology status is invalid");
  exactKeys(value.proof, TOPOLOGY_PROOF_KEYS, "inventory topology proof");
  if (Object.values(value.proof).some((flag) => typeof flag !== "boolean")) throw new Error("inventory topology proof types are invalid");
  exactKeys(value.cloudfront, CLOUDFRONT_KEYS, "inventory cloudfront");
  if (!["PASS", "INCOMPLETE", "ERROR"].includes(value.cloudfront.status) || typeof value.cloudfront.complete !== "boolean" || (value.cloudfront.complete ? value.cloudfront.status !== "PASS" || value.cloudfront.error_code !== null || typeof value.cloudfront.logging_enabled !== "boolean" : typeof value.cloudfront.error_code !== "string") || (value.cloudfront.logging_enabled !== null && typeof value.cloudfront.logging_enabled !== "boolean") || typeof value.cloudfront.separate_from_http_api !== "boolean" || !Array.isArray(value.cloudfront.api_path_behaviors)) throw new Error("inventory cloudfront status is invalid");
  for (const behavior of value.cloudfront.api_path_behaviors) {
    exactKeys(behavior, CLOUDFRONT_BEHAVIOR_KEYS, "inventory cloudfront behavior");
    if (typeof behavior.path_pattern !== "string" || !behavior.path_pattern || (behavior.target_origin_id !== null && typeof behavior.target_origin_id !== "string")) throw new Error("CloudFront behavior identity is invalid");
    if (behavior.target_origin_domain_sha256 !== null) digest(behavior.target_origin_domain_sha256, "CloudFront origin digest");
    if (behavior.target_origin_port !== null && (!Number.isInteger(behavior.target_origin_port) || behavior.target_origin_port < 1 || behavior.target_origin_port > 65535)) throw new Error("CloudFront origin port is invalid");
  }
  exactKeys(value.http_api, HTTP_API_KEYS, "inventory HTTP API");
  if (!["PASS", "INCOMPLETE", "ERROR"].includes(value.http_api.status) || typeof value.http_api.complete !== "boolean" || (value.http_api.complete ? value.http_api.status !== "PASS" || value.http_api.error_code !== null : typeof value.http_api.error_code !== "string") || (value.http_api.api_id !== null && typeof value.http_api.api_id !== "string") || (value.http_api.protocol_type !== null && typeof value.http_api.protocol_type !== "string") || typeof value.http_api.targets_expected_api !== "boolean" || typeof value.http_api.separate_from_cloudfront_legacy_origin !== "boolean") throw new Error("inventory HTTP API status is invalid");
  if (value.http_api.api_endpoint_host_sha256 !== null) digest(value.http_api.api_endpoint_host_sha256, "HTTP API endpoint digest");
  if (value.http_api.api_endpoint_port !== null && (!Number.isInteger(value.http_api.api_endpoint_port) || value.http_api.api_endpoint_port < 1 || value.http_api.api_endpoint_port > 65535)) throw new Error("HTTP API endpoint port is invalid");
  if (!Array.isArray(value.http_api.routes) || !Array.isArray(value.http_api.integrations) || !Array.isArray(value.http_api.stages)) throw new Error("inventory HTTP API inventory is invalid");
  for (const route of value.http_api.routes) { exactKeys(route, HTTP_ROUTE_KEYS, "inventory HTTP route"); if (route.route_key !== null && typeof route.route_key !== "string") throw new Error("inventory HTTP route identity is invalid"); if (route.target !== null && typeof route.target !== "string") throw new Error("inventory HTTP route target is invalid"); }
  for (const integration of value.http_api.integrations) { exactKeys(integration, HTTP_INTEGRATION_KEYS, "inventory HTTP integration"); if (integration.integration_id !== null && typeof integration.integration_id !== "string") throw new Error("inventory HTTP integration identity is invalid"); if (integration.target_function !== null && typeof integration.target_function !== "string") throw new Error("inventory HTTP integration target is invalid"); }
  for (const stage of value.http_api.stages) { exactKeys(stage, HTTP_STAGE_KEYS, "inventory HTTP stage"); if (stage.stage_name !== null && typeof stage.stage_name !== "string") throw new Error("inventory HTTP stage identity is invalid"); if (stage.auto_deploy !== null && typeof stage.auto_deploy !== "boolean") throw new Error("inventory HTTP stage auto-deploy flag is invalid"); }
  const integrationMap = new Map();
  let integrationIdentityValid = true;
  for (const integration of value.http_api.integrations) {
    if (!integration.integration_id || integrationMap.has(integration.integration_id)) integrationIdentityValid = false;
    integrationMap.set(integration.integration_id, integration.target_function);
  }
  const linkedRoutes = value.http_api.routes.map((route) => {
    const match = typeof route.target === "string" ? route.target.match(/^integrations\/([^/]+)$/u) : null;
    return { integration_id: match?.[1] ?? null, target_function: integrationMap.get(match?.[1]) ?? null };
  });
  const allIntegrationsReferenced = value.http_api.integrations.length > 0 && value.http_api.integrations.every((integration) => linkedRoutes.some((route) => route.integration_id === integration.integration_id));
  const routeLinkageValid = integrationIdentityValid && allIntegrationsReferenced && linkedRoutes.every((route) => route.integration_id && route.target_function !== null);
  const routesExpectedApi = routeLinkageValid && linkedRoutes.length > 0 && linkedRoutes.every((route) => route.target_function === "lawos-production-api");
  if (value.http_api.targets_expected_api !== routesExpectedApi) throw new Error("HTTP API route/integration target proof is forged");
  if (value.http_api.complete && !routeLinkageValid) throw new Error("complete HTTP API inventory has unresolved route linkage");
  exactKeys(value.eventbridge, EVENTBRIDGE_KEYS, "inventory EventBridge");
  if (!["PASS", "INCOMPLETE", "ERROR"].includes(value.eventbridge.status) || typeof value.eventbridge.complete !== "boolean" || (value.eventbridge.complete ? value.eventbridge.status !== "PASS" || value.eventbridge.error_code !== null : typeof value.eventbridge.error_code !== "string") || (value.eventbridge.schedule_expression !== null && typeof value.eventbridge.schedule_expression !== "string") || (value.eventbridge.state !== null && typeof value.eventbridge.state !== "string") || typeof value.eventbridge.targets_expected_api !== "boolean" || !Array.isArray(value.eventbridge.targets)) throw new Error("inventory EventBridge status is invalid");
  for (const target of value.eventbridge.targets) {
    exactKeys(target, EVENT_TARGET_KEYS, "inventory EventBridge target");
    if (target.id !== null && typeof target.id !== "string") throw new Error("inventory EventBridge target identity is invalid");
    if (target.function_name !== null && typeof target.function_name !== "string") throw new Error("inventory EventBridge target function is invalid");
    if (target.retry_policy !== null) { exactKeys(target.retry_policy, RETRY_KEYS, "inventory EventBridge retry policy"); if (target.retry_policy.maximum_event_age_seconds !== null && (!Number.isInteger(target.retry_policy.maximum_event_age_seconds) || target.retry_policy.maximum_event_age_seconds < 0) || target.retry_policy.maximum_retry_attempts !== null && (!Number.isInteger(target.retry_policy.maximum_retry_attempts) || target.retry_policy.maximum_retry_attempts < 0)) throw new Error("inventory EventBridge retry policy values are invalid"); }
  }
  const eventTargetsExpected = value.eventbridge.targets.length > 0 && value.eventbridge.targets.every((target) => target.function_name === "lawos-production-api");
  if (value.eventbridge.targets_expected_api !== eventTargetsExpected) throw new Error("EventBridge target proof is forged");
  if (value.eventbridge.retry_policy !== null) { exactKeys(value.eventbridge.retry_policy, RETRY_KEYS, "inventory EventBridge retry policy"); if (value.eventbridge.retry_policy.maximum_event_age_seconds !== null && (!Number.isInteger(value.eventbridge.retry_policy.maximum_event_age_seconds) || value.eventbridge.retry_policy.maximum_event_age_seconds < 0) || value.eventbridge.retry_policy.maximum_retry_attempts !== null && (!Number.isInteger(value.eventbridge.retry_policy.maximum_retry_attempts) || value.eventbridge.retry_policy.maximum_retry_attempts < 0)) throw new Error("inventory EventBridge retry policy values are invalid"); }
  exactKeys(value.async_invoke, ASYNC_KEYS, "inventory Lambda async invoke config");
  if (!["PASS", "INCOMPLETE", "ERROR"].includes(value.async_invoke.status) || typeof value.async_invoke.complete !== "boolean" || (value.async_invoke.complete ? value.async_invoke.status !== "PASS" || value.async_invoke.error_code !== null : typeof value.async_invoke.error_code !== "string") || typeof value.async_invoke.destination_config_present !== "boolean" || value.async_invoke.maximum_event_age_seconds !== null && (!Number.isInteger(value.async_invoke.maximum_event_age_seconds) || value.async_invoke.maximum_event_age_seconds < 0) || value.async_invoke.maximum_retry_attempts !== null && (!Number.isInteger(value.async_invoke.maximum_retry_attempts) || value.async_invoke.maximum_retry_attempts < 0)) throw new Error("inventory Lambda async invoke status is invalid");
  if (value.complete) validateMetricSet(value.metrics, TOPOLOGY_METRICS.map(({ key }) => key), "inventory topology");
  else if (!Array.isArray(value.metrics) || value.metrics.some((metric) => !TOPOLOGY_METRICS.some(({ key }) => key === metric?.metric_name)) || new Set(value.metrics.map((metric) => metric.metric_name)).size !== value.metrics.length) throw new Error("incomplete topology metrics are invalid");
  for (const metric of value.metrics) validateMetric(metric, "inventory topology metric");
  const originsResolved = value.cloudfront.complete === true && value.http_api.complete === true && value.http_api.api_endpoint_host_sha256 !== null && value.cloudfront.api_path_behaviors.length > 0 && value.cloudfront.api_path_behaviors.every((origin) => origin.target_origin_id !== null && origin.target_origin_domain_sha256 !== null);
  const originsSeparate = originsResolved && value.cloudfront.api_path_behaviors.every((origin) => origin.target_origin_domain_sha256 !== value.http_api.api_endpoint_host_sha256 || origin.target_origin_port !== value.http_api.api_endpoint_port);
  if (value.cloudfront.separate_from_http_api !== originsSeparate || value.http_api.separate_from_cloudfront_legacy_origin !== Boolean(originsSeparate && value.http_api.targets_expected_api) || value.proof.http_api_separate_from_cloudfront_api_origin !== Boolean(originsSeparate && value.http_api.targets_expected_api)) throw new Error("topology endpoint separation proof is forged");
  const fiveMinute = Boolean(value.eventbridge.targets_expected_api && value.eventbridge.schedule_expression === "rate(5 minutes)" && value.eventbridge.state === "ENABLED");
  if (value.proof.five_minute_target_is_lawos_production_api !== fiveMinute || value.proof.api_integration_targets_lawos_production_api !== Boolean(value.http_api.targets_expected_api)) throw new Error("topology target proof is forged");
  if (value.complete && (value.status !== "PASS" || value.error_code !== null || !value.proof.http_api_separate_from_cloudfront_api_origin || !value.proof.five_minute_target_is_lawos_production_api || !value.http_api.separate_from_cloudfront_legacy_origin || [value.cloudfront, value.http_api, value.eventbridge, value.async_invoke].some((surface) => surface.complete !== true))) throw new Error("complete topology inventory is semantically invalid");
}
