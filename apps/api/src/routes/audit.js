export function createAuditExportResponse({ auditStore, tenant_id } = {}) {
  if (!auditStore || !tenant_id) throw new Error("audit store and tenant are required");
  const items = auditStore.exportTenant ? auditStore.exportTenant({ tenant_id }) : auditStore.listAudit({ tenant_id });
  return Object.freeze({
    outcome: "passed",
    items,
    customer_payload_included: false,
    production_ready_claim: false,
  });
}
