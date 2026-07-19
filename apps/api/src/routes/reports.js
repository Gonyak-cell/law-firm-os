export const REPORT_ROUTE_POLICIES = Object.freeze([
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/reports$/,
    action: "reports:definition:read",
    resource_type: "report_definition",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/reports$/,
    action: "reports:definition:write",
    resource_type: "report_definition",
  }),
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/reports\/audit$/,
    action: "reports:audit:read",
    resource_type: "report_audit",
  }),
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/reports\/([^/]+)$/,
    action: "reports:definition:read",
    resource_type: "report_definition",
  }),
  Object.freeze({
    method: "PATCH",
    pattern: /^\/api\/reports\/([^/]+)$/,
    action: "reports:definition:patch",
    resource_type: "report_definition",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/reports\/([^/]+)\/run$/,
    action: "reports:query:run",
    resource_type: "report_query_result",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/reports\/([^/]+)\/share$/,
    action: "reports:share:write",
    resource_type: "report_share",
  }),
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/reports\/([^/]+)\/audit$/,
    action: "reports:audit:read",
    resource_type: "report_audit",
  }),
]);

export function matchReportRoute({ pathname, method } = {}) {
  for (const policy of REPORT_ROUTE_POLICIES) {
    const match = pathname.match(policy.pattern);
    if (match && policy.method === method) return Object.freeze({ ...policy, params: Object.freeze(match.slice(1)) });
  }
  return null;
}
