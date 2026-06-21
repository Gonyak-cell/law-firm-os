export const RUNTIME_SURFACE_PERMISSION_MATRIX = Object.freeze({
  "session:read": ["member", "admin"],
  "tenant:read": ["member", "admin"],
  "client:read": ["member", "admin"],
  "client:write": ["admin"],
  "matter:read": ["member", "admin"],
  "matter:write": ["admin"],
  "matter_member:write": ["admin"],
  "employee:read": ["member", "admin"],
  "party:read": ["member", "admin"],
  "contact_role:read": ["member", "admin"],
  "document:read": ["member", "admin"],
  "matter_document:write": ["admin"],
  "task:read": ["member", "admin"],
  "task:write": ["member", "admin"],
  "issue:read": ["member", "admin"],
  "issue:write": ["member", "admin"],
  "wiki:read": ["member", "admin"],
  "wiki:write": ["admin"],
  "vault:export": ["admin"],
  "permission:evaluate": ["admin"],
  "feature_lock:read": ["member", "admin"]
});

export const RUNTIME_SURFACE_FEATURE_LOCKS = Object.freeze({
  portal: Object.freeze({ status: "locked_until_later_gate", allowed_mode: "projection_only" }),
  m365: Object.freeze({ status: "locked_until_later_gate", allowed_mode: "sandbox_or_export_only" }),
  hr_real_data: Object.freeze({ status: "locked_until_later_gate", allowed_mode: "synthetic_only" }),
  ai: Object.freeze({ status: "locked_until_later_gate", allowed_mode: "review_required_advisory_only" }),
  vault_sync: Object.freeze({ status: "locked_until_later_gate", allowed_mode: "export_only" })
});

export function evaluateRuntimeSurfacePermission({ principal, scope, decision = {} } = {}) {
  if (decision.effect && decision.effect !== "allow") return Object.freeze({ effect: decision.effect, reason: decision.reason ?? "explicit_decision" });
  const roleIds = new Set(principal?.role_ids ?? []);
  const allowedRoles = RUNTIME_SURFACE_PERMISSION_MATRIX[scope] ?? [];
  const allowed = allowedRoles.some((role) => roleIds.has(role) || roleIds.has(`runtime:${role}`));
  return Object.freeze({
    effect: allowed ? "allow" : "deny",
    reason: allowed ? "role_scope_allow" : "role_scope_deny"
  });
}
