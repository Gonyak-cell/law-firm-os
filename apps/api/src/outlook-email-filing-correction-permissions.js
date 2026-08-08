import { evaluateRouteDecision } from "./permission-gate.js";

export const CORRECTION_POST_FIELDS = Object.freeze([
  "actor_id",
  "audit_hint_ref",
  "document_id",
  "email_thread_id",
  "expected_placement_id",
  "idempotency_key",
  "mime_sha256",
  "original_receipt_id",
  "reason",
  "source_matter_id",
  "target_matter_id",
]);
export const CORRECTION_GET_FIELDS = Object.freeze(["audit_hint_ref", "email_thread_id"]);
const ACTIVE_MATTER_STATUSES = new Set(["open", "opening", "paused"]);

export function requiredCorrectionString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw Object.assign(new TypeError(`${field} is required`), {
      safe_error_code: "OUTLOOK_EMAIL_CORRECTION_INVALID",
      status: 400,
    });
  }
  return value.trim();
}

export function exactCorrectionFields(value, allowed) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).every((field) => allowed.includes(field));
}

function scopedContext(context, resourceId) {
  return {
    ...context,
    object_acl: (context?.object_acl ?? []).filter((entry) => (
      entry.resource_id === undefined || entry.resource_id === resourceId
    )),
  };
}

export function correctionAllowed(
  context,
  { tenantId, matterId = null, resourceType, resourceId, action },
) {
  return evaluateRouteDecision({
    context: scopedContext(context, resourceId),
    resource: {
      tenant_id: tenantId,
      matter_id: matterId,
      resource_type: resourceType,
      resource_id: resourceId,
    },
    action,
  }).effect === "allow";
}

export function matterCorrectionPermissions(
  context,
  tenantId,
  matterId,
  { target = false } = {},
) {
  const checks = ["outlook:matter:read", "outlook:email:correct"];
  if (target) checks.push("outlook:document:link");
  return checks.every((action) => correctionAllowed(context, {
    tenantId,
    matterId,
    resourceType: "matter",
    resourceId: matterId,
    action,
  }));
}

export function matterCorrectionReadPermission(context, tenantId, matterId) {
  return correctionAllowed(context, {
    tenantId,
    matterId,
    resourceType: "matter",
    resourceId: matterId,
    action: "outlook:matter:read",
  });
}

export function correctionPrincipal(context) {
  return Object.freeze({
    tenant_id: requiredCorrectionString(context?.principal?.tenant_id, "signed tenant"),
    actor_id: requiredCorrectionString(context?.principal?.user_id, "signed actor"),
  });
}

export function assertActiveCorrectionMatter(repository, tenantId, matterId) {
  const matter = repository.get({
    tenant_id: tenantId,
    model_type: "Matter",
    matter_id: matterId,
  });
  if (
    matter?.tenant_id !== tenantId
    || matter.matter_id !== matterId
    || !ACTIVE_MATTER_STATUSES.has(matter.status)
    || typeof matter.permission_envelope_id !== "string"
    || matter.permission_envelope_id.trim() === ""
  ) {
    throw Object.assign(new Error("Matter link authority is unavailable"), {
      safe_error_code: "OUTLOOK_EMAIL_CORRECTION_IDENTITY_CONFLICT",
      status: 409,
    });
  }
  return matter;
}
