export const RECORD_ACTION_ROUTE_POLICIES = Object.freeze([
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/record-actions\/([^/]+)\/fields$/,
    action: "record_action:field_registry:read",
    resource_type: "record_action_field_registry",
  }),
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/record-actions\/([^/]+)\/bulk-actions$/,
    action: "record_action:bulk_registry:read",
    resource_type: "record_action_bulk_registry",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/record-actions\/([^/]+)\/([^/]+)\/field-update$/,
    action: "record_action:field_update",
    resource_type: "record_action_field_update",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/record-actions\/([^/]+)\/bulk-updates$/,
    action: "record_action:bulk_update",
    resource_type: "record_action_bulk_update",
  }),
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/record-actions\/([^/]+)\/([^/]+)\/audit$/,
    action: "record_action:audit:read",
    resource_type: "record_action_audit",
  }),
]);

export function matchRecordActionRoute({ pathname, method } = {}) {
  for (const policy of RECORD_ACTION_ROUTE_POLICIES) {
    const match = pathname.match(policy.pattern);
    if (match && policy.method === method) return Object.freeze({ ...policy, params: Object.freeze(match.slice(1)) });
  }
  return null;
}
