export function requireWriteAudit({ audit_hint_ref, actor_id, tenant_id, action } = {}) {
  if (!tenant_id) throw Object.assign(new Error("AUDIT_TENANT_REQUIRED"), { status: 400, safe_error_code: "AUDIT_TENANT_REQUIRED" });
  if (!actor_id) throw Object.assign(new Error("AUDIT_ACTOR_REQUIRED"), { status: 401, safe_error_code: "AUDIT_ACTOR_REQUIRED" });
  if (!audit_hint_ref) throw Object.assign(new Error("AUDIT_HINT_REQUIRED"), { status: 400, safe_error_code: "AUDIT_HINT_REQUIRED" });
  return Object.freeze({
    tenant_id,
    actor_id,
    action: action ?? "write",
    audit_hint_ref,
    writes_audit_event: true,
    production_ready_claim: false,
  });
}
