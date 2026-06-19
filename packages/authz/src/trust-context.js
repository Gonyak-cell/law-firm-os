export const G1_TRUST_CONTEXT_TUW_IDS = Object.freeze([
  "LFOS-G1-W01-T001",
  "LFOS-G1-W01-T002",
  "LFOS-G1-W01-T003"
]);

export const DEFAULT_ACTOR_TYPES = Object.freeze([
  "user",
  "client_user",
  "external_counsel",
  "system",
  "integration",
  "ai_agent",
  "hermes",
  "claude_code",
  "human_reviewer",
  "support_admin",
  "break_glass_admin"
]);

export function validateTenantBoundary({ principal = {}, resource = {}, expectedTenantId = null } = {}) {
  const principalTenantId = principal.tenant_id ?? null;
  const resourceTenantId = resource.tenant_id ?? expectedTenantId ?? null;

  if (!principalTenantId) {
    return failTenant("tenant_context_missing", "principal.tenant_id is required");
  }

  if (!resourceTenantId) {
    return failTenant("resource_tenant_missing", "resource.tenant_id is required");
  }

  if (expectedTenantId && principalTenantId !== expectedTenantId) {
    return failTenant("tenant_context_mismatch", "principal tenant does not match expected tenant", {
      tenant_id: principalTenantId,
      expected_tenant_id: expectedTenantId
    });
  }

  if (principalTenantId !== resourceTenantId) {
    return failTenant("cross_tenant_deny", "principal tenant does not match resource tenant", {
      tenant_id: principalTenantId,
      resource_tenant_id: resourceTenantId
    });
  }

  return {
    ok: true,
    tenant_id: principalTenantId,
    resource_tenant_id: resourceTenantId,
    tuw_ids: ["LFOS-G1-W01-T001"]
  };
}

export function createActorContext({ principal = {}, actor = {}, allowedActorTypes = DEFAULT_ACTOR_TYPES } = {}) {
  const actorId = actor.actor_id ?? principal.actor_id ?? principal.user_id ?? null;
  const actorType = actor.actor_type ?? principal.actor_type ?? (principal.user_id ? "user" : null);
  const tenantId = actor.tenant_id ?? principal.tenant_id ?? null;

  if (!actorId) {
    return failActor("actor_context_missing", "actor_id or principal.user_id is required");
  }

  if (!actorType) {
    return failActor("actor_type_missing", "actor_type is required");
  }

  if (!allowedActorTypes.includes(actorType)) {
    return failActor("unauthorized_actor_type", "actor_type is not allowed", { actor_type: actorType });
  }

  return {
    ok: true,
    actor_id: actorId,
    actor_type: actorType,
    tenant_id: tenantId,
    tuw_ids: ["LFOS-G1-W01-T002"]
  };
}

export function createPermissionContext({ principal = {}, resource = {}, action, request = {}, expectedTenantId = null } = {}) {
  const tenant = validateTenantBoundary({ principal, resource, expectedTenantId });
  if (!tenant.ok) {
    return failPermission(tenant.reason, tenant.message, { tenant });
  }

  const actor = createActorContext({ principal });
  if (!actor.ok) {
    return failPermission(actor.reason, actor.message, { actor });
  }

  if (!action) {
    return failPermission("action_missing", "permission action is required");
  }

  const objectId = resource.resource_id ?? resource.document_id ?? resource.matter_id ?? null;
  const objectType = resource.resource_type ?? resource.object_type ?? "unknown";
  if (!objectId) {
    return failPermission("object_context_missing", "resource identifier is required");
  }

  const requestId = request.request_id ?? "request_unset";
  const contextId = [
    tenant.tenant_id,
    actor.actor_id,
    action,
    objectType,
    objectId,
    requestId
  ].join(":");

  return {
    ok: true,
    permission_context_id: contextId,
    tenant_id: tenant.tenant_id,
    actor,
    action,
    object: {
      object_id: objectId,
      object_type: objectType,
      matter_id: resource.matter_id ?? null
    },
    request: {
      request_id: requestId,
      trace_id: request.trace_id ?? null,
      source_service: request.source_service ?? "authz"
    },
    persistence_required: true,
    header_only_trust_allowed: false,
    audit_binding: {
      tenant_id: tenant.tenant_id,
      actor_id: actor.actor_id,
      actor_type: actor.actor_type,
      action,
      object_id: objectId,
      object_type: objectType,
      permission_context_id: contextId
    },
    tuw_ids: G1_TRUST_CONTEXT_TUW_IDS
  };
}

function failTenant(reason, message, details = {}) {
  return {
    ok: false,
    reason,
    message,
    status_code: 403,
    effect: "deny",
    tuw_ids: ["LFOS-G1-W01-T001"],
    ...details
  };
}

function failActor(reason, message, details = {}) {
  return {
    ok: false,
    reason,
    message,
    status_code: 403,
    effect: "deny",
    tuw_ids: ["LFOS-G1-W01-T002"],
    ...details
  };
}

function failPermission(reason, message, details = {}) {
  return {
    ok: false,
    reason,
    message,
    status_code: 403,
    effect: "deny",
    persistence_required: false,
    header_only_trust_allowed: false,
    audit_binding: {
      action: "permission.context.denied",
      reason,
      object_id: "redacted_denied_object"
    },
    tuw_ids: G1_TRUST_CONTEXT_TUW_IDS,
    ...details
  };
}
