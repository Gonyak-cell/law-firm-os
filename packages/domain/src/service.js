import { assertSameTenant } from "./invariants.js";
import { MATTER_TRACEABLE_ENTITY_TYPES, getCoreDomainEntityDefinition } from "./ownership.js";

export const CORE_DOMAIN_SERVICE_ENTRYPOINT_CONTRACT = Object.freeze({
  pack_id: "CP00-095",
  entrypoint_id: "core_domain_service_intake",
  source_unit_range: "RP01.P00.M00.S01-RP01.P02.M04.S06",
  accepts_real_client_data: false,
  writes_product_state: false,
  evaluates_runtime_permission: false,
  writes_audit_event: false,
  result_fields: Object.freeze([
    "entrypoint_id",
    "normalized_request",
    "tenant_boundary_precheck",
    "matter_trace_precheck",
    "permission_precheck",
    "audit_hint",
    "blocked_claims",
    "writes_product_state",
  ]),
});

const allowedOperations = Object.freeze(["create", "read", "update", "archive", "reference"]);

function requireServiceFields(input, fields) {
  const missing = fields.filter((field) => input?.[field] === undefined || input?.[field] === null || input?.[field] === "");
  if (missing.length > 0) throw new Error(`CoreDomainServiceRequest missing required fields: ${missing.join(", ")}`);
}

export function normalizeCoreDomainServiceRequest(input) {
  requireServiceFields(input, ["tenant_id", "actor_user_id", "entity_type", "operation", "requested_at"]);
  getCoreDomainEntityDefinition(input.entity_type);
  if (!allowedOperations.includes(input.operation)) {
    throw new Error(`CoreDomainServiceRequest operation must be one of ${allowedOperations.join(", ")}`);
  }
  if (input.synthetic_only === false) {
    throw new Error("CoreDomainServiceRequest must remain synthetic-only in RP01");
  }
  return Object.freeze({
    request_id: input.request_id ?? `synthetic-${input.entity_type}-${input.operation}`,
    tenant_id: input.tenant_id,
    actor_user_id: input.actor_user_id,
    matter_id: input.matter_id ?? null,
    entity_type: input.entity_type,
    operation: input.operation,
    requested_at: input.requested_at,
    synthetic_only: true,
  });
}

export function assertCoreDomainTenantBoundary(request, ...records) {
  assertSameTenant(request, ...records.filter(Boolean));
  return Object.freeze({
    status: "passed",
    tenant_id: request.tenant_id,
    checked_record_count: records.filter(Boolean).length,
  });
}

export function assertCoreDomainMatterTracePrecheck(request, record = {}) {
  const requiresMatter = MATTER_TRACEABLE_ENTITY_TYPES.includes(request.entity_type);
  const matterId = record.matter_id ?? request.matter_id ?? null;
  if (requiresMatter && !matterId) {
    throw new Error(`${request.entity_type} requires matter_id before service intake`);
  }
  if (record.matter_id && request.matter_id && record.matter_id !== request.matter_id) {
    throw new Error("CoreDomainServiceRequest matter_id must match record matter_id");
  }
  return Object.freeze({
    status: "passed",
    entity_type: request.entity_type,
    matter_trace_required: requiresMatter,
    matter_id: matterId,
  });
}

export function createCoreDomainPermissionPrecheck(request, permissionRef) {
  requireServiceFields(permissionRef, ["permission_id", "tenant_id", "action", "effect"]);
  assertSameTenant(request, permissionRef);
  return Object.freeze({
    status: "reference_only",
    permission_id: permissionRef.permission_id,
    action: permissionRef.action,
    effect: permissionRef.effect,
    evaluated: false,
  });
}

export function createCoreDomainAuditHint(request) {
  return Object.freeze({
    status: "hint_only",
    tenant_id: request.tenant_id,
    matter_id: request.matter_id,
    actor_user_id: request.actor_user_id,
    action: `core_domain.${request.entity_type}.${request.operation}`,
    writes_audit_event: false,
  });
}

export function assembleCoreDomainServiceIntake(input, context = {}) {
  const normalized = normalizeCoreDomainServiceRequest(input);
  const tenantBoundary = assertCoreDomainTenantBoundary(normalized, ...(context.records ?? []));
  const matterTrace = assertCoreDomainMatterTracePrecheck(normalized, context.record);
  const permissionPrecheck = createCoreDomainPermissionPrecheck(normalized, context.permission_ref);
  const auditHint = createCoreDomainAuditHint(normalized);
  return Object.freeze({
    entrypoint_id: CORE_DOMAIN_SERVICE_ENTRYPOINT_CONTRACT.entrypoint_id,
    normalized_request: normalized,
    tenant_boundary_precheck: tenantBoundary,
    matter_trace_precheck: matterTrace,
    permission_precheck: permissionPrecheck,
    audit_hint: auditHint,
    blocked_claims: Object.freeze([]),
    writes_product_state: false,
  });
}
