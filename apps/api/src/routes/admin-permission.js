export const ADMIN_PERMISSION_ROUTE_POLICIES = Object.freeze([
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/admin\/permission-sets$/,
    action: "admin:permission_set:read",
    resource_type: "admin_permission_set",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/admin\/permission-sets$/,
    action: "admin:permission_set:write",
    resource_type: "admin_permission_set",
  }),
  Object.freeze({
    method: "PATCH",
    pattern: /^\/api\/admin\/permission-sets\/([^/]+)$/,
    action: "admin:permission_set:patch",
    resource_type: "admin_permission_set",
  }),
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/admin\/permission-assignments$/,
    action: "admin:permission_assignment:read",
    resource_type: "admin_permission_assignment",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/admin\/permission-assignments$/,
    action: "admin:permission_assignment:write",
    resource_type: "admin_permission_assignment",
  }),
  Object.freeze({
    method: "DELETE",
    pattern: /^\/api\/admin\/permission-assignments\/([^/]+)$/,
    action: "admin:permission_assignment:revoke",
    resource_type: "admin_permission_assignment",
  }),
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/admin\/object-manager\/objects$/,
    action: "admin:object_manager:read",
    resource_type: "admin_object_definition",
  }),
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/admin\/object-manager\/objects\/([^/]+)\/fields$/,
    action: "admin:object_manager:field_read",
    resource_type: "admin_field_policy",
  }),
  Object.freeze({
    method: "PATCH",
    pattern: /^\/api\/admin\/object-manager\/objects\/([^/]+)\/fields\/([^/]+)$/,
    action: "admin:object_manager:patch",
    resource_type: "admin_field_policy",
  }),
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/admin\/connected-apps$/,
    action: "admin:connected_app:read",
    resource_type: "admin_connected_app",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/admin\/connected-apps$/,
    action: "admin:connected_app:write",
    resource_type: "admin_connected_app",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/admin\/connected-apps\/([^/]+)\/disable$/,
    action: "admin:connected_app:disable",
    resource_type: "admin_connected_app",
  }),
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/admin\/audit$/,
    action: "admin:audit:read",
    resource_type: "admin_permission_audit",
  }),
]);

export function matchAdminPermissionRoute({ pathname, method } = {}) {
  for (const policy of ADMIN_PERMISSION_ROUTE_POLICIES) {
    const match = pathname.match(policy.pattern);
    if (match && policy.method === method) return Object.freeze({ ...policy, params: Object.freeze(match.slice(1)) });
  }
  return null;
}
