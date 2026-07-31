import {
  CLIENT_FIXED_REPORT_IDS,
} from "../../../../packages/reports/src/index.js";

const CLIENT_FIXED_REPORT_ID_SET = new Set(
  CLIENT_FIXED_REPORT_IDS,
);

export const REPORT_ROUTE_POLICIES = Object.freeze([
  Object.freeze({
    method: "POST",
    pattern:
      /^\/api\/reports\/clients\/fixed\/([^/.]+)\.csv$/,
    action: "analytics:client:export",
    resource_type: "client_fixed_report_export",
    fixed_client_report: true,
  }),
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/reports\/clients\/fixed\/([^/]+)$/,
    action: "analytics:client:read",
    resource_type: "client_fixed_report",
    fixed_client_report: true,
  }),
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
    if (!match || policy.method !== method) continue;
    if (
      policy.fixed_client_report
      && !CLIENT_FIXED_REPORT_ID_SET.has(match[1])
    ) {
      continue;
    }
    return Object.freeze({
      ...policy,
      params: Object.freeze(match.slice(1)),
    });
  }
  return null;
}
