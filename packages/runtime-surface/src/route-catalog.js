export const RUNTIME_SURFACE_ROUTE_CATALOG = Object.freeze([
  { id: "session.read", method: "GET", path: "/api/runtime/session", tuw: "RS-5-T02", audit_required: true, audit_action: "runtime.read", permission_scope: "session:read", canonical_object: "User" },
  { id: "tenant.current", method: "GET", path: "/api/runtime/tenant", tuw: "RS-5-T03", audit_required: true, audit_action: "runtime.read", permission_scope: "tenant:read", canonical_object: "Tenant" },
  { id: "client.list", method: "GET", path: "/api/runtime/clients", tuw: "RS-5-T04", audit_required: true, audit_action: "runtime.read", permission_scope: "client:read", canonical_object: "Client" },
  { id: "client.create", method: "POST", path: "/api/runtime/clients", tuw: "RS-5-T04", audit_required: true, audit_action: "runtime.write", permission_scope: "client:write", canonical_object: "Client" },
  { id: "client.detail", method: "GET", path: "/api/runtime/clients/:client_id", tuw: "RS-5-T04", audit_required: true, audit_action: "runtime.read", permission_scope: "client:read", canonical_object: "Client" },
  { id: "matter.list", method: "GET", path: "/api/runtime/matters", tuw: "RS-5-T05", audit_required: true, audit_action: "runtime.read", permission_scope: "matter:read", canonical_object: "Matter" },
  { id: "matter.create", method: "POST", path: "/api/runtime/matters", tuw: "RS-5-T05", audit_required: true, audit_action: "runtime.write", permission_scope: "matter:write", canonical_object: "Matter" },
  { id: "matter.detail", method: "GET", path: "/api/runtime/matters/:matter_id", tuw: "RS-5-T05", audit_required: true, audit_action: "runtime.read", permission_scope: "matter:read", canonical_object: "Matter" },
  { id: "matter_member.assign", method: "POST", path: "/api/runtime/matters/:matter_id/members", tuw: "RS-5-T06", audit_required: true, audit_action: "runtime.write", permission_scope: "matter_member:write", canonical_object: "MatterMember" },
  { id: "employee.list", method: "GET", path: "/api/runtime/people/employees", tuw: "RS-5-T07", audit_required: true, audit_action: "runtime.read", permission_scope: "employee:read", canonical_object: "Employee" },
  { id: "party.list", method: "GET", path: "/api/runtime/parties", tuw: "RS-5-T08", audit_required: true, audit_action: "runtime.read", permission_scope: "party:read", canonical_object: "Party" },
  { id: "contact_role.list", method: "GET", path: "/api/runtime/contact-roles", tuw: "RS-5-T08", audit_required: true, audit_action: "runtime.read", permission_scope: "contact_role:read", canonical_object: "ContactRole" },
  { id: "document.list", method: "GET", path: "/api/runtime/documents", tuw: "RS-5-T09", audit_required: true, audit_action: "runtime.read", permission_scope: "document:read", canonical_object: "Document" },
  { id: "matter_document.link", method: "POST", path: "/api/runtime/matters/:matter_id/documents", tuw: "RS-5-T10", audit_required: true, audit_action: "runtime.write", permission_scope: "matter_document:write", canonical_object: "Document" },
  { id: "task.list", method: "GET", path: "/api/runtime/tasks", tuw: "RS-5-T11", audit_required: true, audit_action: "runtime.read", permission_scope: "task:read", canonical_object: "Task" },
  { id: "task.create", method: "POST", path: "/api/runtime/tasks", tuw: "RS-5-T11", audit_required: true, audit_action: "runtime.write", permission_scope: "task:write", canonical_object: "Task" },
  { id: "issue.list", method: "GET", path: "/api/runtime/issues", tuw: "RS-5-T12", audit_required: true, audit_action: "runtime.read", permission_scope: "issue:read", canonical_object: "Issue" },
  { id: "issue.create", method: "POST", path: "/api/runtime/issues", tuw: "RS-5-T12", audit_required: true, audit_action: "runtime.write", permission_scope: "issue:write", canonical_object: "Issue" },
  { id: "wiki.read", method: "GET", path: "/api/runtime/matters/:matter_id/wiki", tuw: "RS-5-T13", audit_required: true, audit_action: "runtime.read", permission_scope: "wiki:read", canonical_object: "MatterWiki" },
  { id: "wiki.update", method: "POST", path: "/api/runtime/matters/:matter_id/wiki", tuw: "RS-5-T14", audit_required: true, audit_action: "runtime.write", permission_scope: "wiki:write", canonical_object: "MatterWiki" },
  { id: "vault.export", method: "POST", path: "/api/runtime/vault/export", tuw: "RS-5-T15", audit_required: true, audit_action: "runtime.export", permission_scope: "vault:export", canonical_object: "VaultSnapshot" },
  { id: "permission.evaluate", method: "POST", path: "/api/runtime/permission/evaluate", tuw: "RS-5-T18", audit_required: true, audit_action: "permission.evaluate", permission_scope: "permission:evaluate", canonical_object: "ClassificationEnvelope" },
  { id: "feature.locks", method: "GET", path: "/api/runtime/feature-locks", tuw: "RS-5-T28", audit_required: true, audit_action: "runtime.read", permission_scope: "feature_lock:read", canonical_object: "ClassificationEnvelope" }
].map(Object.freeze));

export function routeCatalogByTuw() {
  return Object.freeze(
    RUNTIME_SURFACE_ROUTE_CATALOG.reduce((map, route) => {
      const routes = map[route.tuw] ?? [];
      return { ...map, [route.tuw]: Object.freeze([...routes, route.id]) };
    }, {})
  );
}
