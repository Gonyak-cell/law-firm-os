export const DATA_CLOUD_ROUTE_POLICIES = Object.freeze([
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/data-cloud\/providers$/,
    action: "data_cloud:provider:read",
    resource_type: "data_cloud_provider",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/data-cloud\/providers$/,
    action: "data_cloud:provider:register",
    resource_type: "data_cloud_provider",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/data-cloud\/consent-records$/,
    action: "data_cloud:consent:write",
    resource_type: "data_cloud_consent_record",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/data-cloud\/enrichment-jobs$/,
    action: "data_cloud:enrichment_job:create",
    resource_type: "data_cloud_enrichment_job",
  }),
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/data-cloud\/enrichment-jobs\/([^/]+)\/preview$/,
    action: "data_cloud:enrichment_preview:read",
    resource_type: "data_cloud_enrichment_preview",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/data-cloud\/enrichment-jobs\/([^/]+)\/execute$/,
    action: "data_cloud:enrichment_job:execute",
    resource_type: "data_cloud_enrichment_execution",
  }),
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/data-cloud\/enrichment-results$/,
    action: "data_cloud:enrichment_result:read",
    resource_type: "data_cloud_enrichment_result",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/data-cloud\/identity-resolution$/,
    action: "data_cloud:identity_resolution:write",
    resource_type: "data_cloud_identity_resolution",
  }),
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/data-cloud\/unified-profiles\/([^/]+)$/,
    action: "data_cloud:unified_profile:read",
    resource_type: "data_cloud_unified_profile",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/data-cloud\/segment-activations$/,
    action: "data_cloud:segment_activation:create",
    resource_type: "data_cloud_segment_activation",
  }),
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/data-cloud\/audit$/,
    action: "data_cloud:audit:read",
    resource_type: "data_cloud_audit",
  }),
]);

export function matchDataCloudRoute({ pathname, method } = {}) {
  for (const policy of DATA_CLOUD_ROUTE_POLICIES) {
    const match = pathname.match(policy.pattern);
    if (match && policy.method === method) return Object.freeze({ ...policy, params: Object.freeze(match.slice(1)) });
  }
  return null;
}
