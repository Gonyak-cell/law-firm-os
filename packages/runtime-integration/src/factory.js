import { createRuntimeAuditWriter } from "../../audit/src/index.js";
import {
  RUNTIME_SURFACE_DEFAULT_PRINCIPAL,
  createRuntimeSurfaceService,
  createRuntimeSurfaceUiClient
} from "../../runtime-surface/src/index.js";

export const RUNTIME_INTEGRATION_SANDBOX_ATTESTATION = Object.freeze({
  synthetic_only: true,
  real_tenant_data_allowed: false,
  external_network_required: false,
  writes_product_state: false,
  production_ready_claim: false,
  actual_launch_go_live_claim: false
});

export function createRuntimeIntegrationPrincipal({
  tenant_id = RUNTIME_SURFACE_DEFAULT_PRINCIPAL.tenant_id,
  user_id = RUNTIME_SURFACE_DEFAULT_PRINCIPAL.user_id,
  role_ids = ["admin", "member"],
  actor_type = "user"
} = {}) {
  return Object.freeze({
    source: "server-derived",
    header_only_trust_allowed: false,
    tenant_id,
    user_id,
    actor_type,
    role_ids: Object.freeze([...role_ids])
  });
}

export function createRuntimeIntegrationFixture({ run_id = "rs6-runtime-integration" } = {}) {
  const auditWriter = createRuntimeAuditWriter();
  const service = createRuntimeSurfaceService({ auditWriter });
  const tenantA = createRuntimeIntegrationPrincipal({ tenant_id: "tenant-rs6-a", user_id: "user-rs6-a" });
  const tenantB = createRuntimeIntegrationPrincipal({ tenant_id: "tenant-rs6-b", user_id: "user-rs6-b" });

  return Object.freeze({
    run_id,
    auditWriter,
    service,
    tenantA,
    tenantB,
    clientA: createRuntimeSurfaceUiClient({ service, principal: tenantA, permission_context_id: `${run_id}:ui:a` }),
    clientB: createRuntimeSurfaceUiClient({ service, principal: tenantB, permission_context_id: `${run_id}:ui:b` }),
    sandbox_attestation: RUNTIME_INTEGRATION_SANDBOX_ATTESTATION
  });
}
