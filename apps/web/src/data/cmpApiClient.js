import {
  CMP_CONSOLE_API_CONTEXT,
  CMP_CONSOLE_BACKEND_EVIDENCE,
  cmpConsoleCatalog,
} from "./cmpConsoleCatalog.js";

const DOMAIN_ROUTE_MAP = Object.freeze({
  trust: "/api/trust-foundation/runtime/evidence",
  parties: "/api/party-master/runtime/evidence",
  people: "/api/hrx/employees",
  crmIntake: "/api/crm-intake/runtime/evidence",
  matters: "/api/matter-core/runtime/evidence",
  vaultDms: "/api/vault-dms/runtime/evidence",
  revenueFinance: "/api/revenue-finance/runtime/evidence",
  analytics: "/api/analytics-read-models/runtime/evidence",
  aiRagGovernance: "/api/ai-rag-governance/runtime/evidence",
  clientCollaboration: "/api/client-collaboration/runtime/evidence",
});

export function createCmpDomainRequest({ route, method = "GET", body = {}, context = CMP_CONSOLE_API_CONTEXT }) {
  return {
    route,
    method,
    headers: {
      "x-tenant-id": context.tenant_id,
      "x-actor-id": context.actor_id,
      "x-permission-receipt-id": context.permission_receipt_id,
      "x-idempotency-key": context.idempotency_key,
    },
    audit_event_type: context.audit_event_type,
    permission_context: {
      tenant_id: context.tenant_id,
      actor_id: context.actor_id,
      backend_evidence_required: CMP_CONSOLE_BACKEND_EVIDENCE,
    },
    body,
  };
}

export function createCmpDomainClients(context = CMP_CONSOLE_API_CONTEXT) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(DOMAIN_ROUTE_MAP).map(([domain, route]) => [
        domain,
        () => createCmpDomainRequest({ route, context }),
      ]),
    ),
  );
}

export const cmpConsoleApiClient = Object.freeze({
  domain_clients: createCmpDomainClients(),
  listScreens: () => cmpConsoleCatalog,
  createRequest: createCmpDomainRequest,
});
