export function requireSensitiveReadAudit({ audit_hint_ref, actor_id, tenant_id, resource_type } = {}) {
  if (!tenant_id || !actor_id || !audit_hint_ref) {
    throw Object.assign(new Error("SENSITIVE_READ_AUDIT_REQUIRED"), { status: 400, safe_error_code: "SENSITIVE_READ_AUDIT_REQUIRED" });
  }
  return Object.freeze({
    tenant_id,
    actor_id,
    resource_type: resource_type ?? "sensitive_resource",
    audit_hint_ref,
    sensitive_read_audit_required: true,
    production_ready_claim: false,
  });
}
