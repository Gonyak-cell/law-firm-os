import {
  projectAsyncInvokeConfig,
  projectCloudFront,
  projectEventBridge,
  projectHttpApi,
  projectTopology,
} from "./outlook-production-aws-inventory-topology.mjs";
import { projectMetric } from "./outlook-production-aws-inventory-projection.mjs";

function metricRequest({ namespace, metricName, dimensionName, dimensionValue, startTime, endTime }) {
  return [
    "--namespace", namespace,
    "--metric-name", metricName,
    "--dimensions", `Name=${dimensionName},Value=${dimensionValue}`,
    "--start-time", startTime,
    "--end-time", endTime,
    "--period", "300",
    "--statistics", "Sum",
  ];
}

function functionRequest(name, operation, args = []) {
  return { service: "lambda", operation, args: ["--function-name", name, ...args], target: name };
}

export async function collectTopologyInventory({ httpApiId, cloudfrontDistributionId, eventbridgeRuleName, identifiers, region, observedAt, lookbackMinutes, run, note }) {
  const apiResult = await run({ service: "apigatewayv2", operation: "get-api", args: ["--api-id", httpApiId], target: httpApiId });
  const routesResult = await run({ service: "apigatewayv2", operation: "get-routes", args: ["--api-id", httpApiId], target: httpApiId });
  const integrationsResult = await run({ service: "apigatewayv2", operation: "get-integrations", args: ["--api-id", httpApiId], target: httpApiId });
  const stagesResult = await run({ service: "apigatewayv2", operation: "get-stages", args: ["--api-id", httpApiId], target: httpApiId });
  const cloudfrontResult = await run({ service: "cloudfront", operation: "get-distribution-config", args: ["--id", cloudfrontDistributionId], target: cloudfrontDistributionId });
  const ruleResult = await run({ service: "events", operation: "describe-rule", args: ["--name", eventbridgeRuleName], target: eventbridgeRuleName });
  const targetResult = await run({ service: "events", operation: "list-targets-by-rule", args: ["--rule", eventbridgeRuleName], target: eventbridgeRuleName });
  const asyncResult = await run(functionRequest("lawos-production-api", "get-function-event-invoke-config"));
  for (const result of [apiResult, routesResult, integrationsResult, stagesResult, cloudfrontResult, ruleResult, targetResult, asyncResult]) if (!result.ok) note(result.error_code);
  const apiProjection = projectHttpApi({ api: apiResult.ok ? apiResult.value : null, routes: routesResult.ok ? routesResult.value?.Items : null, integrations: integrationsResult.ok ? integrationsResult.value?.Items : null, stages: stagesResult.ok ? stagesResult.value?.Items : null, region });
  if ([routesResult, integrationsResult, stagesResult].some((result) => result.ok && result.value?.NextToken)) {
    apiProjection.status = "INCOMPLETE";
    apiProjection.error_code = "AWS_HTTP_API_TRUNCATED";
    apiProjection.complete = false;
    note(apiProjection.error_code);
  }
  const cloudfrontProjection = projectCloudFront(cloudfrontResult.ok ? cloudfrontResult.value : null, apiProjection);
  const eventProjection = projectEventBridge(ruleResult.ok ? ruleResult.value : null, targetResult.ok ? targetResult.value?.Targets : null);
  if (targetResult.ok && targetResult.value?.NextToken) {
    eventProjection.status = "INCOMPLETE";
    eventProjection.error_code = "AWS_EVENTBRIDGE_TRUNCATED";
    eventProjection.complete = false;
    note(eventProjection.error_code);
  }
  const asyncProjection = projectAsyncInvokeConfig(asyncResult.ok ? asyncResult.value : null, asyncResult.ok ? null : asyncResult.error_code);
  const startTime = new Date(Date.parse(observedAt) - lookbackMinutes * 60_000).toISOString();
  const metricInputs = [
    { namespace: "AWS/ApiGateway", metricName: "5XXError", dimensionName: "ApiId", dimensionValue: httpApiId, key: "http_api_5xx" },
    { namespace: "AWS/CloudFront", metricName: "5xxErrorRate", dimensionName: "DistributionId", dimensionValue: cloudfrontDistributionId, key: "cloudfront_5xx" },
    ...(identifiers.length ? [{ namespace: "AWS/RDS", metricName: "DatabaseConnections", dimensionName: "DBInstanceIdentifier", dimensionValue: identifiers[0], key: "rds_connections" }] : []),
  ];
  const topologyMetrics = [];
  for (const input of metricInputs) {
    const result = await run({ service: "cloudwatch", operation: "get-metric-statistics", args: metricRequest({ ...input, startTime, endTime: observedAt }), target: input.dimensionValue });
    const metric = projectMetric(input.key, result.ok ? result.value : null, result.ok ? null : result.error_code);
    topologyMetrics.push(metric);
    if (metric.status !== "PASS") note(metric.error_code);
  }
  const topology = projectTopology({ cloudfront: cloudfrontProjection, httpApi: apiProjection, eventBridge: eventProjection, asyncInvoke: asyncProjection, metrics: topologyMetrics });
  if (!topology.complete) note(topology.error_code);
  return topology;
}

export { functionRequest };
