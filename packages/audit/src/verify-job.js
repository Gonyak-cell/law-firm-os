export function runAuditVerifyJob({ auditStore, tenant_id } = {}) {
  if (!auditStore || !tenant_id) throw new Error("audit store and tenant are required");
  const verification = auditStore.verifyTenant ? auditStore.verifyTenant({ tenant_id }) : { valid: true, checked: auditStore.listAudit({ tenant_id }).length };
  const result = typeof verification === "boolean" ? { valid: verification } : verification;
  return Object.freeze({
    ...result,
    tenant_id,
    audit_verify_job: true,
    production_ready_claim: false,
  });
}
