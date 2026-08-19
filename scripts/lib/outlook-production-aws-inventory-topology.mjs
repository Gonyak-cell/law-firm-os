import { ALLOWED_FUNCTIONS, TOPOLOGY_METRICS, canonicalJson, environmentKeyInventoryDigest, safeDate, sha256 } from "./outlook-production-aws-inventory-contract.mjs";

function parseTemplateBody(response) {
  if (typeof response?.TemplateBody === "string") {
    try { return JSON.parse(response.TemplateBody); } catch { return null; }
  }
  return response?.TemplateBody && typeof response.TemplateBody === "object" ? response.TemplateBody : null;
}

function literal(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function projectCloudFormationTemplate(responses, functionNames = ALLOWED_FUNCTIONS) {
  if (!Array.isArray(responses) || responses.length === 0) return { status: "ERROR", error_code: "AWS_CLOUDFORMATION_TEMPLATE_INVALID", complete: false, function_keys: {}, missing_functions: [...functionNames].sort(), rds_identifiers: [], resource_count: 0 };
  const templates = [];
  for (const response of responses) {
    const template = parseTemplateBody(response?.value ?? response);
    if (!template?.Resources || typeof template.Resources !== "object" || Array.isArray(template.Resources)) return { status: "ERROR", error_code: "AWS_CLOUDFORMATION_TEMPLATE_INVALID", complete: false, function_keys: {}, missing_functions: [...functionNames].sort(), rds_identifiers: [], resource_count: 0 };
    templates.push(template);
  }
  const functionKeys = {};
  const rdsIdentifiers = new Set();
  let resourceCount = 0;
  let duplicate = false;
  for (const template of templates) {
    for (const [logicalId, resource] of Object.entries(template.Resources)) {
      resourceCount += 1;
      const properties = resource?.Properties ?? {};
      if (resource?.Type === "AWS::Lambda::Function") {
        const functionName = literal(properties.FunctionName);
        if (functionName && functionNames.includes(functionName)) {
          if (functionKeys[functionName]) duplicate = true;
          const expectedKeys = Object.keys(properties.Environment?.Variables ?? {}).sort();
          functionKeys[functionName] = {
            logical_id: logicalId,
            expected_keys: expectedKeys,
            expected_key_inventory_sha256: environmentKeyInventoryDigest(functionName, logicalId, expectedKeys),
          };
        }
      }
      if (resource?.Type === "AWS::RDS::DBInstance") {
        const identifier = literal(properties.DBInstanceIdentifier);
        if (identifier) rdsIdentifiers.add(identifier);
      }
      if (resource?.Type === "AWS::RDS::DBCluster") {
        const identifier = literal(properties.DBClusterIdentifier);
        if (identifier) rdsIdentifiers.add(identifier);
      }
    }
  }
  const missingFunctions = functionNames.filter((name) => !functionKeys[name]);
  const invalid = duplicate || missingFunctions.length > 0;
  return {
    status: invalid ? "INCOMPLETE" : "PASS",
    error_code: duplicate ? "AWS_CLOUDFORMATION_FUNCTION_RESOURCE_AMBIGUOUS" : missingFunctions.length ? "AWS_CLOUDFORMATION_FUNCTION_RESOURCE_MISSING" : null,
    complete: !invalid,
    function_keys: functionKeys,
    missing_functions: missingFunctions,
    rds_identifiers: [...rdsIdentifiers].sort(),
    resource_count: resourceCount,
  };
}

function functionNameFromArn(value) {
  const match = typeof value === "string" ? value.match(/:function:([^:]+)/u) : null;
  return match?.[1] ?? null;
}

function integrationIdFromRouteTarget(value) {
  const match = typeof value === "string" ? value.match(/^integrations\/([^/]+)$/u) : null;
  return match?.[1] ?? null;
}

function normalizedEndpoint(value, { allowBare = false } = {}) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const candidate = allowBare && !value.includes("://") ? `https://${value}` : value;
  let parsed;
  try { parsed = new URL(candidate); } catch { return null; }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || !parsed.hostname) return null;
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/u, "");
  const port = parsed.port && parsed.port !== "443" ? Number(parsed.port) : null;
  if (port !== null && (!Number.isInteger(port) || port < 1 || port > 65535)) return null;
  return { hostname, port };
}

function endpointDigest(endpoint) {
  return endpoint ? sha256(canonicalJson({ hostname: endpoint.hostname, port: endpoint.port })) : null;
}

export function projectHttpApi({ api, routes, integrations, stages, region }, expectedFunctionName = "lawos-production-api") {
  if (!api || typeof api.ApiId !== "string" || !api.ApiId || api.ProtocolType !== "HTTP" || !Array.isArray(routes) || !Array.isArray(integrations) || !Array.isArray(stages)) return { status: "ERROR", error_code: "AWS_HTTP_API_READ_FAILED", complete: false, api_id: null, protocol_type: null, api_endpoint_host_sha256: null, api_endpoint_port: null, routes: [], integrations: [], stages: [], targets_expected_api: false, separate_from_cloudfront_legacy_origin: false };
  const endpoint = normalizedEndpoint(api.ApiEndpoint ?? `https://${api.ApiId}.execute-api.${region ?? "unknown"}.amazonaws.com`);
  if (!endpoint) return { status: "ERROR", error_code: "AWS_HTTP_API_ENDPOINT_INVALID", complete: false, api_id: api.ApiId, protocol_type: api.ProtocolType, api_endpoint_host_sha256: null, api_endpoint_port: null, routes: [], integrations: [], stages: [], targets_expected_api: false, separate_from_cloudfront_legacy_origin: false };
  const integrationRows = integrations.map((integration) => ({ integration_id: integration.IntegrationId ?? null, target_function: functionNameFromArn(integration.IntegrationUri) }));
  const integrationMap = new Map();
  let integrationIdentityValid = true;
  for (const row of integrationRows) {
    if (!row.integration_id || integrationMap.has(row.integration_id)) integrationIdentityValid = false;
    integrationMap.set(row.integration_id, row.target_function);
  }
  const routeRows = routes.map((route) => ({ route_key: route.RouteKey ?? null, target: route.Target ?? null })).sort((left, right) => String(left.route_key).localeCompare(String(right.route_key)));
  const routeTargets = routeRows.map((route) => ({ ...route, integration_id: integrationIdFromRouteTarget(route.target), target_function: integrationMap.get(integrationIdFromRouteTarget(route.target)) ?? null }));
  const routesResolveToExpected = routeTargets.length > 0 && routeTargets.every((route) => route.integration_id && route.target_function === expectedFunctionName);
  const allIntegrationsReferenced = integrationRows.length > 0 && integrationRows.every((integration) => routeTargets.some((route) => route.integration_id === integration.integration_id));
  const targetsExpected = integrationIdentityValid && routesResolveToExpected;
  const routeLinkageValid = integrationIdentityValid && allIntegrationsReferenced && routeTargets.every((route) => route.integration_id && route.target_function !== null);
  if (!routeLinkageValid) return { status: "INCOMPLETE", error_code: "AWS_HTTP_API_ROUTE_LINKAGE_INVALID", complete: false, api_id: api.ApiId, protocol_type: api.ProtocolType, api_endpoint_host_sha256: endpointDigest(endpoint), api_endpoint_port: endpoint.port, routes: routeRows, integrations: integrationRows.sort((left, right) => String(left.integration_id).localeCompare(String(right.integration_id))), stages: stages.map((stage) => ({ stage_name: stage.StageName ?? null, auto_deploy: stage.AutoDeploy ?? null })).sort((left, right) => String(left.stage_name).localeCompare(String(right.stage_name))), targets_expected_api: false, separate_from_cloudfront_legacy_origin: false };
  return {
    status: "PASS",
    error_code: null,
    complete: true,
    api_id: api.ApiId,
    protocol_type: api.ProtocolType,
    api_endpoint_host_sha256: endpointDigest(endpoint),
    api_endpoint_port: endpoint.port,
    routes: routeRows,
    integrations: integrationRows.sort((left, right) => String(left.integration_id).localeCompare(String(right.integration_id))),
    stages: stages.map((stage) => ({ stage_name: stage.StageName ?? null, auto_deploy: stage.AutoDeploy ?? null })).sort((left, right) => String(left.stage_name).localeCompare(String(right.stage_name))),
    targets_expected_api: targetsExpected,
    separate_from_cloudfront_legacy_origin: false,
  };
}

export function projectCloudFront(response, httpApiProjection) {
  const config = response?.DistributionConfig;
  if (!config || !Array.isArray(config.Origins?.Items) || !config.DefaultCacheBehavior) return { status: "ERROR", error_code: "AWS_CLOUDFRONT_CONFIG_INVALID", complete: false, api_path_behaviors: [], logging_enabled: null, separate_from_http_api: false };
  const originRows = config.Origins.Items;
  const origins = new Map();
  let duplicateOrigin = false;
  let invalidOrigin = false;
  for (const origin of originRows) {
    if (typeof origin?.Id !== "string" || !origin.Id || typeof origin?.DomainName !== "string" || !origin.DomainName) invalidOrigin = true;
    if (origins.has(origin.Id)) duplicateOrigin = true;
    const configuredPort = Number.isInteger(origin?.CustomOriginConfig?.HTTPSPort) ? origin.CustomOriginConfig.HTTPSPort : Number.isInteger(origin?.CustomOriginConfig?.HTTPPort) ? origin.CustomOriginConfig.HTTPPort : null;
    if (configuredPort !== null && (configuredPort < 1 || configuredPort > 65535)) invalidOrigin = true;
    origins.set(origin.Id, { domainName: origin.DomainName, configuredPort });
  }
  const behaviors = [{ path_pattern: "DEFAULT", target_origin_id: config.DefaultCacheBehavior.TargetOriginId ?? null }];
  for (const behavior of config.CacheBehaviors?.Items ?? []) behaviors.push({ path_pattern: behavior.PathPattern ?? null, target_origin_id: behavior.TargetOriginId ?? null });
  const apiPaths = behaviors.filter(({ path_pattern }) => typeof path_pattern === "string" && /^\/api(?:\*|\/|$)/u.test(path_pattern));
  const projectedPaths = apiPaths.map(({ path_pattern, target_origin_id }) => {
    const origin = origins.get(target_origin_id);
    const endpoint = normalizedEndpoint(origin?.domainName, { allowBare: true });
    if (endpoint && endpoint.port === null && origin?.configuredPort !== null) endpoint.port = origin.configuredPort === 443 ? null : origin.configuredPort;
    return { path_pattern, target_origin_id, target_origin_domain_sha256: endpointDigest(endpoint), target_origin_port: endpoint?.port ?? null };
  });
  const mappingComplete = !duplicateOrigin && !invalidOrigin && projectedPaths.length > 0 && projectedPaths.every((row) => row.target_origin_id !== null && row.target_origin_domain_sha256 !== null);
  const separate = mappingComplete && httpApiProjection?.complete === true && Boolean(httpApiProjection?.api_endpoint_host_sha256) && Boolean(httpApiProjection?.targets_expected_api) && projectedPaths.every((row) => row.target_origin_domain_sha256 !== httpApiProjection.api_endpoint_host_sha256 || row.target_origin_port !== httpApiProjection.api_endpoint_port);
  return {
    status: mappingComplete ? "PASS" : "INCOMPLETE",
    error_code: mappingComplete ? null : "AWS_CLOUDFRONT_ORIGIN_MAPPING_INCOMPLETE",
    complete: mappingComplete,
    api_path_behaviors: projectedPaths,
    logging_enabled: config.Logging?.Enabled === true,
    separate_from_http_api: separate,
  };
}

export function projectEventBridge(rule, targets, expectedFunctionName = "lawos-production-api") {
  if (!rule || !Array.isArray(targets)) return { status: "ERROR", error_code: "AWS_EVENTBRIDGE_READ_FAILED", complete: false, schedule_expression: null, state: null, targets: [], targets_expected_api: false, retry_policy: null };
  const targetRows = targets.map((target) => ({ id: target.Id ?? null, function_name: functionNameFromArn(target.Arn), retry_policy: target.RetryPolicy ? { maximum_event_age_seconds: target.RetryPolicy.MaximumEventAgeInSeconds ?? null, maximum_retry_attempts: target.RetryPolicy.MaximumRetryAttempts ?? null } : null })).sort((left, right) => String(left.id).localeCompare(String(right.id)));
  return { status: "PASS", error_code: null, complete: true, schedule_expression: rule.ScheduleExpression ?? null, state: rule.State ?? null, targets: targetRows, targets_expected_api: targetRows.length > 0 && targetRows.every((target) => target.function_name === expectedFunctionName), retry_policy: targetRows.find((target) => target.retry_policy)?.retry_policy ?? null };
}

export function projectAsyncInvokeConfig(response, errorCode = null) {
  if (errorCode) return { status: "ERROR", error_code: errorCode, complete: false, maximum_event_age_seconds: null, maximum_retry_attempts: null, destination_config_present: false };
  if (!response || !Object.prototype.hasOwnProperty.call(response, "MaximumRetryAttempts")) return { status: "ERROR", error_code: "AWS_RESPONSE_INVALID", complete: false, maximum_event_age_seconds: null, maximum_retry_attempts: null, destination_config_present: false };
  return { status: "PASS", error_code: null, complete: true, maximum_event_age_seconds: response.MaximumEventAgeInSeconds ?? null, maximum_retry_attempts: response.MaximumRetryAttempts ?? null, destination_config_present: Boolean(response.DestinationConfig) };
}

export function projectTopology({ cloudfront, httpApi, eventBridge, asyncInvoke, metrics }) {
  const metricRows = metrics ?? [];
  const metricSetComplete = metricRows.map((metric) => metric?.metric_name).sort().join("\n") === TOPOLOGY_METRICS.map(({ key }) => key).sort().join("\n");
  const complete = [cloudfront, httpApi, eventBridge, asyncInvoke].every((surface) => surface?.complete === true) && metricSetComplete && metricRows.every((metric) => metric.status === "PASS");
  const separate = Boolean(httpApi?.targets_expected_api && cloudfront?.separate_from_http_api && httpApi?.api_endpoint_host_sha256);
  const fiveMinuteTarget = Boolean(eventBridge?.targets_expected_api && eventBridge?.schedule_expression === "rate(5 minutes)" && eventBridge?.state === "ENABLED");
  const httpApiWithProof = { ...httpApi, separate_from_cloudfront_legacy_origin: separate };
  const pass = complete && separate && fiveMinuteTarget;
  return { status: pass ? "PASS" : "INCOMPLETE", error_code: pass ? null : "AWS_TOPOLOGY_INCOMPLETE", complete: pass, proof: { http_api_separate_from_cloudfront_api_origin: separate, five_minute_target_is_lawos_production_api: fiveMinuteTarget, api_integration_targets_lawos_production_api: Boolean(httpApi?.targets_expected_api) }, cloudfront, http_api: httpApiWithProof, eventbridge: eventBridge, async_invoke: asyncInvoke, metrics: metricRows };
}

export { TOPOLOGY_METRICS, canonicalJson, normalizedEndpoint, safeDate, sha256 };
