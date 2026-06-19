import { evaluatePermission } from "./evaluate.js";
import { createPermissionContext } from "./trust-context.js";

export const G1_PERMISSION_CONTROL_TUW_IDS = Object.freeze([
  "LFOS-G1-W01-T007",
  "LFOS-G1-W01-T008",
  "LFOS-G1-W01-T009",
  "LFOS-G1-W01-T010",
  "LFOS-G1-W01-T011",
  "LFOS-G1-W01-T012"
]);

export const PERMISSION_EVALUATE_ROUTE = "/permissions/evaluate";

export const G1_PERMISSION_CONTROL_MARKERS = Object.freeze({
  deny_over_allow: true,
  object_acl_baseline: true,
  ethical_wall_fail_closed: true,
  legal_hold_fail_closed: true,
  break_glass_requires_reason_approval_audit: true
});

const DELETE_ACTIONS = Object.freeze([
  "document.delete",
  "document.delete.request",
  "document.dispose",
  "document.destroy",
  "document.retention.dispose"
]);

export function evaluatePermissionControlRequest({
  principal = {},
  resource = {},
  action,
  request = {},
  rules = [],
  objectAcl = [],
  ethicalWalls = [],
  legalHolds = [],
  breakGlass = null
} = {}) {
  const permissionContext = createPermissionContext({
    principal,
    resource,
    action,
    request
  });

  if (!permissionContext.ok) {
    return createPermissionEvaluateResponse({
      principal,
      resource,
      action: action ?? "permission.evaluate",
      permissionContext,
      decision: deniedControlDecision({
        principal,
        resource,
        action: action ?? "permission.evaluate",
        reason: permissionContext.reason,
        matched_rule_id: "permission_context_guard"
      }),
      controlEvidence: {
        context_valid: false,
        reason: permissionContext.reason
      }
    });
  }

  const breakGlassStatus = validateBreakGlassRequest({ principal, resource, action, breakGlass });
  if (!breakGlassStatus.ok) {
    return createPermissionEvaluateResponse({
      principal,
      resource,
      action,
      permissionContext,
      decision: deniedControlDecision({
        principal,
        resource,
        action,
        reason: "break_glass_incomplete",
        matched_rule_id: "break_glass_guard"
      }),
      controlEvidence: {
        context_valid: true,
        break_glass: breakGlassStatus
      }
    });
  }

  const controlRules = buildPermissionControlRules({ principal, resource, action, ethicalWalls, legalHolds });
  const controlAcl = normalizeObjectAcl(objectAcl);

  if (breakGlassStatus.requested) {
    controlAcl.push({
      id: "break_glass_approval",
      effect: "allow",
      principal_id: principal.user_id,
      action
    });
  }

  const decision = evaluatePermission({
    principal,
    resource,
    action,
    rules: [...controlRules, ...rules],
    objectAcl: controlAcl
  });

  return createPermissionEvaluateResponse({
    principal,
    resource,
    action,
    permissionContext,
    decision,
    controlEvidence: {
      context_valid: true,
      deny_over_allow: G1_PERMISSION_CONTROL_MARKERS.deny_over_allow,
      object_acl_entries: controlAcl.map((entry) => entry.id ?? entry.effect),
      ethical_wall_rule_ids: controlRules.filter((rule) => rule.reason === "ethical_wall").map((rule) => rule.id),
      legal_hold_rule_ids: controlRules.filter((rule) => rule.reason === "legal_hold").map((rule) => rule.id),
      break_glass: breakGlassStatus
    }
  });
}

export function buildPermissionControlRules({ principal = {}, resource = {}, action, ethicalWalls = [], legalHolds = [] } = {}) {
  const rules = [];

  for (const wall of ethicalWalls) {
    if (matchesEthicalWall({ wall, principal, resource })) {
      rules.push({
        id: wall.id ?? `ethical_wall:${resource.matter_id ?? resource.resource_id ?? "unknown"}`,
        effect: "deny",
        resource_type: resource.resource_type,
        action: "*",
        reason: "ethical_wall"
      });
    }
  }

  if (DELETE_ACTIONS.includes(action)) {
    for (const hold of legalHolds) {
      if (matchesLegalHold({ hold, resource })) {
        rules.push({
          id: hold.id ?? `legal_hold:${resource.document_id ?? resource.resource_id ?? "unknown"}`,
          effect: "deny",
          resource_type: resource.resource_type,
          action,
          reason: "legal_hold"
        });
      }
    }
  }

  return rules;
}

export function validateBreakGlassRequest({ principal = {}, breakGlass = null } = {}) {
  const requested = breakGlass?.requested === true || principal.actor_type === "break_glass_admin";
  if (!requested) {
    return {
      ok: true,
      requested: false,
      audit_required: false,
      tuw_ids: ["LFOS-G1-W01-T012"]
    };
  }

  const missing = [];
  if (!breakGlass?.reason) missing.push("reason");
  if (!breakGlass?.approval_id && !breakGlass?.approved_by) missing.push("approval");
  if (breakGlass?.audit_required !== true && !breakGlass?.audit_intent) missing.push("audit_required");

  if (missing.length > 0) {
    return {
      ok: false,
      requested: true,
      reason: "break_glass_incomplete",
      missing,
      effect: "deny",
      audit_required: true,
      tuw_ids: ["LFOS-G1-W01-T012"]
    };
  }

  return {
    ok: true,
    requested: true,
    reason: breakGlass.reason,
    approval_id: breakGlass.approval_id ?? null,
    approved_by: breakGlass.approved_by ?? null,
    audit_required: true,
    audit_intent: breakGlass.audit_intent ?? "break_glass_access",
    tuw_ids: ["LFOS-G1-W01-T012"]
  };
}

function createPermissionEvaluateResponse({ principal, resource, action, permissionContext, decision, controlEvidence }) {
  return {
    route: PERMISSION_EVALUATE_ROUTE,
    method: "POST",
    status_code: statusForDecision(decision.effect),
    ok: decision.effect !== "deny",
    decision,
    permission_context_id: permissionContext.permission_context_id ?? null,
    audit_binding: {
      ...(permissionContext.audit_binding ?? {}),
      decision_effect: decision.effect,
      decision_reason: decision.reason,
      matched_rule_id: decision.matched_rule_id,
      audit_required: true
    },
    control_evidence: controlEvidence,
    tuw_ids: G1_PERMISSION_CONTROL_TUW_IDS,
    runtime_readiness_claim: "open"
  };
}

function statusForDecision(effect) {
  if (effect === "allow") return 200;
  if (effect === "review_required" || effect === "approval_required") return 202;
  return 403;
}

function normalizeObjectAcl(objectAcl) {
  if (!objectAcl) return [];
  return Array.isArray(objectAcl) ? [...objectAcl] : [objectAcl];
}

function matchesEthicalWall({ wall, principal, resource }) {
  const wallMatterId = wall.matter_id ?? wall.resource_id ?? null;
  if (wallMatterId && wallMatterId !== resource.matter_id && wallMatterId !== resource.resource_id) return false;

  const blockedUsers = wall.blocked_user_ids ?? wall.principal_ids ?? [];
  const blockedRoles = wall.blocked_role_ids ?? [];
  const principalRoles = principal.role_ids ?? [];

  return blockedUsers.includes(principal.user_id) || blockedRoles.some((roleId) => principalRoles.includes(roleId));
}

function matchesLegalHold({ hold, resource }) {
  if (hold.active === false || hold.status === "released" || hold.status === "expired") return false;

  const holdDocumentId = hold.document_id ?? hold.resource_id ?? null;
  const holdMatterId = hold.matter_id ?? null;
  const resourceDocumentId = resource.document_id ?? resource.resource_id ?? null;

  if (holdDocumentId && holdDocumentId !== resourceDocumentId) return false;
  if (holdMatterId && holdMatterId !== resource.matter_id) return false;
  return true;
}

function deniedControlDecision({ principal, resource, action, reason, matched_rule_id }) {
  return {
    effect: "deny",
    reason,
    action,
    matched_rule_id,
    audit_hint: {
      actor_id: principal?.user_id ?? "unknown",
      action,
      object_id: resource?.resource_id ?? resource?.document_id ?? resource?.matter_id ?? "unknown",
      tenant_id: principal?.tenant_id ?? "unknown",
      reason,
      effect: "deny"
    }
  };
}
