import { createSqlHrxAuditEventStore } from "./hrx-event-store-sql.js";
import { verifyHrxAuditHashChain } from "./hrx-hash-chain.js";

function requireTenantId(input = {}) {
  if (typeof input.tenant_id !== "string" || input.tenant_id.trim() === "") {
    throw new TypeError("tenant_id is required");
  }
  return input.tenant_id.trim();
}

export function createDurableAuditStore({ store } = {}) {
  const audit = createSqlHrxAuditEventStore({ store });

  return Object.freeze({
    append: audit.append,
    list: audit.list,
    verifyTenant(input = {}) {
      const tenantId = requireTenantId(input);
      return verifyHrxAuditHashChain(audit.list({ tenant_id: tenantId }));
    },
    exportTenant(input = {}) {
      const tenantId = requireTenantId(input);
      const events = audit.list({ tenant_id: tenantId });
      return Object.freeze({
        tenant_id: tenantId,
        hash_chain_valid: verifyHrxAuditHashChain(events),
        events,
      });
    },
  });
}
