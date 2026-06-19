import { evaluatePermissionControlRequest } from "./permission-controls.js";
import { createActorContext } from "./trust-context.js";

export const G1_ADMIN_SIMULATOR_TUW_IDS = Object.freeze(["LFOS-G1-W01-T015"]);

const ADMIN_SIMULATOR_ACTOR_TYPES = Object.freeze([
  "support_admin",
  "break_glass_admin",
  "human_reviewer"
]);

export function simulateAdminPermission({
  admin = {},
  targetPrincipal = {},
  resource = {},
  action,
  request = {},
  rules = [],
  objectAcl = [],
  ethicalWalls = [],
  legalHolds = [],
  breakGlass = null
} = {}) {
  const adminContext = createActorContext({
    principal: admin,
    allowedActorTypes: ADMIN_SIMULATOR_ACTOR_TYPES
  });

  if (!adminContext.ok) {
    return deniedSimulation({
      reason: adminContext.reason,
      admin,
      targetPrincipal,
      resource,
      action
    });
  }

  const simulation = evaluatePermissionControlRequest({
    principal: targetPrincipal,
    resource,
    action,
    request,
    rules,
    objectAcl,
    ethicalWalls,
    legalHolds,
    breakGlass
  });

  return {
    ok: true,
    simulator_only: true,
    grant_applied: false,
    can_grant_access: false,
    audit_required: true,
    admin_actor: {
      actor_id: adminContext.actor_id,
      actor_type: adminContext.actor_type,
      tenant_id: adminContext.tenant_id
    },
    target_actor_id: targetPrincipal.user_id ?? targetPrincipal.actor_id ?? "unknown",
    simulated_status_code: simulation.status_code,
    simulated_decision: simulation.decision,
    audit_binding: {
      action: "admin.permission.simulate",
      actor_id: adminContext.actor_id,
      actor_type: adminContext.actor_type,
      target_actor_id: targetPrincipal.user_id ?? targetPrincipal.actor_id ?? "unknown",
      tenant_id: adminContext.tenant_id,
      object_id: resource.resource_id ?? resource.document_id ?? resource.matter_id ?? "unknown",
      decision_effect: simulation.decision.effect,
      decision_reason: simulation.decision.reason,
      audit_required: true,
      emits_audit_event: false
    },
    tuw_ids: G1_ADMIN_SIMULATOR_TUW_IDS,
    runtime_readiness_claim: "open"
  };
}

function deniedSimulation({ reason, admin, targetPrincipal, resource, action }) {
  return {
    ok: false,
    simulator_only: true,
    grant_applied: false,
    can_grant_access: false,
    audit_required: true,
    reason,
    simulated_decision: {
      effect: "deny",
      reason,
      action
    },
    audit_binding: {
      action: "admin.permission.simulate.denied",
      actor_id: admin.user_id ?? admin.actor_id ?? "unknown",
      target_actor_id: targetPrincipal.user_id ?? targetPrincipal.actor_id ?? "unknown",
      tenant_id: admin.tenant_id ?? targetPrincipal.tenant_id ?? "unknown",
      object_id: resource.resource_id ?? resource.document_id ?? resource.matter_id ?? "unknown",
      decision_effect: "deny",
      decision_reason: reason,
      audit_required: true,
      emits_audit_event: false
    },
    tuw_ids: G1_ADMIN_SIMULATOR_TUW_IDS,
    runtime_readiness_claim: "open"
  };
}
