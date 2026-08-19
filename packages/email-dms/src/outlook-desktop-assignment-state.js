import {
  assignmentBoolean,
  assignmentDigest,
  assignmentIdentifier,
  assignmentInteger,
  assignmentIso,
  normalizeAssignmentPrincipal,
} from "./outlook-desktop-assignment-contract.js";

const STAGES = new Set(["jwsuh_canary", "expanded"]);
const DENIAL_REASONS = new Set([
  "account_inactive",
  "active_trusted_install_required",
  "maximum_entitlement_denied",
  "policy_missing",
  "policy_not_current",
  "release_denied",
  "rollout_not_authorized",
  "rollout_stage_not_approved",
]);

function invalid(reason) {
  throw Object.assign(new Error(reason), {
    safe_error_code: "OUTLOOK_ASSIGNMENT_STATE_INVALID",
    status: 500,
  });
}

export function parseOutlookDesktopAssignmentStateRow(row) {
  const principal = normalizeAssignmentPrincipal({
    tenant_id: row.tenant_id,
    user_id: row.user_id,
    entra_subject_id: row.entra_subject_id,
  });
  if (!Array.isArray(row.denial_reasons)) {
    invalid("outlook_assignment_denial_reasons_invalid");
  }
  if (row.rollout_stage !== null && !STAGES.has(row.rollout_stage)) {
    invalid("outlook_assignment_rollout_stage_invalid");
  }
  const denialReasons = row.denial_reasons.map((reason) => {
    assignmentIdentifier(reason, "state denial reason");
    if (!DENIAL_REASONS.has(reason)) {
      invalid("outlook_assignment_denial_reason_unknown");
    }
    return reason;
  });
  return Object.freeze({
    ...principal,
    rollout_stage: row.rollout_stage,
    policy_revision: assignmentInteger(
      Number(row.policy_revision),
      "state policy_revision",
      { allowZero: true },
    ),
    policy_binding_sha256: assignmentDigest(
      row.policy_binding_sha256,
      "state policy_binding_sha256",
    ),
    active_trusted_install_count: assignmentInteger(
      Number(row.active_trusted_install_count),
      "state active_trusted_install_count",
      { allowZero: true },
    ),
    trust_authority: assignmentIdentifier(
      row.trust_authority,
      "state trust_authority",
    ),
    trust_authority_revision: assignmentInteger(
      Number(row.trust_authority_revision),
      "state trust_authority_revision",
    ),
    trust_authority_binding_sha256: assignmentDigest(
      row.trust_authority_binding_sha256,
      "state trust_authority_binding_sha256",
    ),
    desired_assigned: assignmentBoolean(
      row.desired_assigned,
      "state desired_assigned",
    ),
    denial_reasons: Object.freeze(denialReasons),
    aggregate_sha256: assignmentDigest(row.aggregate_sha256, "state aggregate"),
    evaluated_at: assignmentIso(
      new Date(row.evaluated_at).toISOString(),
      "state evaluated_at",
    ),
    state_revision: assignmentInteger(
      Number(row.state_revision),
      "state_revision",
    ),
    provider_generation: assignmentInteger(
      Number(row.provider_generation),
      "provider_generation",
      { allowZero: true },
    ),
    provider_intent_sha256: assignmentDigest(
      row.provider_intent_sha256,
      "state provider intent",
    ),
  });
}
