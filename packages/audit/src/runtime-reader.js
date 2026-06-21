export function createRuntimeAuditReader({ writer } = {}) {
  if (!writer || typeof writer.list !== "function") throw new TypeError("runtime audit writer is required");
  return Object.freeze({
    listTenant({ principal, tenant_id } = {}) {
      if (principal?.tenant_id !== tenant_id) throw new Error("audit read denied for tenant mismatch");
      return writer.list({ tenant_id });
    },
    exportTenant({ principal, tenant_id } = {}) {
      const events = this.listTenant({ principal, tenant_id });
      return Object.freeze({
        tenant_id,
        events,
        event_count: events.length,
        raw_payload_included: false
      });
    }
  });
}
