import {
  createAuditEventReference,
  createClient,
  createDocumentReference,
  createMatter,
  createPermissionReference,
  createTenant,
  createUser,
} from "./entities.js";
import { executeCoreDomainWorkflow } from "./workflow.js";

export const CORE_DOMAIN_SYNTHETIC_FIXTURE_PACK_BINDING = Object.freeze({
  pack_id: "CP00-096",
  source_unit_range: "RP01.P02.M06.S01-RP01.P02.M06.S06",
  source_unit_scope: "fixture_subrange_within_cp00_096",
  synthetic_only: true,
  uses_real_client_data: false,
});

export function createCoreDomainSyntheticFixtureSet(overrides = {}) {
  const tenant = createTenant({
    tenant_id: overrides.tenant_id ?? "t_rp01_cp096",
    name: overrides.tenant_name ?? "RP01 CP00-096 Synthetic Firm",
    plan: "enterprise",
  });
  const actor = createUser({
    user_id: overrides.actor_user_id ?? "u_rp01_cp096_owner",
    tenant_id: tenant.tenant_id,
    email: "owner.cp096@example.test",
  });
  const client = createClient({
    client_id: overrides.client_id ?? "c_rp01_cp096",
    tenant_id: tenant.tenant_id,
    display_name: "CP00-096 Synthetic Client",
    confidentiality: "restricted",
  });
  const matter = createMatter({
    matter_id: overrides.matter_id ?? "m_rp01_cp096",
    tenant_id: tenant.tenant_id,
    client_id: client.client_id,
    owner_user_id: actor.user_id,
    status: "open",
    confidentiality: "restricted",
  });
  const document = createDocumentReference({
    document_id: overrides.document_id ?? "d_rp01_cp096",
    tenant_id: tenant.tenant_id,
    matter_id: matter.matter_id,
  });
  const permission = createPermissionReference({
    permission_id: overrides.permission_id ?? "perm_rp01_cp096_reference",
    tenant_id: tenant.tenant_id,
    principal_type: "user",
    principal_id: actor.user_id,
    object_type: "DocumentReference",
    object_id: document.document_id,
    action: "reference",
    effect: overrides.permission_effect ?? "allow",
  });
  const audit = createAuditEventReference({
    audit_event_id: overrides.audit_event_id ?? "audit_ref_rp01_cp096",
    tenant_id: tenant.tenant_id,
    matter_id: matter.matter_id,
    action: "core_domain.DocumentReference.reference",
    occurred_at: overrides.occurred_at ?? "2026-06-08T06:45:00.000Z",
  });
  const request = Object.freeze({
    request_id: overrides.request_id ?? "req_rp01_cp096",
    tenant_id: tenant.tenant_id,
    actor_user_id: actor.user_id,
    matter_id: matter.matter_id,
    entity_type: "DocumentReference",
    operation: "reference",
    requested_at: overrides.requested_at ?? "2026-06-08T06:45:00.000Z",
    idempotency_key: overrides.idempotency_key ?? "idem_rp01_cp096",
  });
  const context = Object.freeze({
    record: document,
    records: Object.freeze([tenant, actor, client, matter, document, permission, audit]),
    permission_ref: permission,
    persistence_target: "synthetic_fixture_store",
  });

  return Object.freeze({
    pack_id: CORE_DOMAIN_SYNTHETIC_FIXTURE_PACK_BINDING.pack_id,
    synthetic_only: true,
    tenant,
    actor,
    client,
    matter,
    document,
    permission,
    audit,
    request,
    context,
  });
}

export function executeCoreDomainSyntheticFixtureWorkflow(overrides = {}) {
  const fixtures = createCoreDomainSyntheticFixtureSet(overrides);
  return Object.freeze({
    fixtures,
    result: executeCoreDomainWorkflow(fixtures.request, fixtures.context),
  });
}
