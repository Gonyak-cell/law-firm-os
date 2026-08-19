import {
  assignmentBoolean,
  assignmentDigest,
  assignmentExactKeys,
  assignmentIdentifier,
  assignmentInteger,
  assignmentInvalid,
  assignmentIso,
  assignmentProviderIntent,
  assignmentRecord,
  assignmentSha256,
  normalizeAssignmentPrincipal,
} from "./outlook-desktop-assignment-contract.js";

export {
  createOutlookDesktopAssignmentOutboxPayload,
  OUTLOOK_DESKTOP_ASSIGNMENT_REMOTE_COMMIT_STATES,
  OUTLOOK_DESKTOP_ASSIGNMENT_SCHEMA_VERSION,
  OUTLOOK_DESKTOP_ASSIGNMENT_STATUSES,
  parseOutlookDesktopAssignmentOutboxPayload,
} from "./outlook-desktop-assignment-contract.js";

const TRUST_SCHEMA_VERSION = "lawos.outlook-desktop-trust-count.v1";
const STAGES = Object.freeze(["jwsuh_canary", "expanded"]);
const POLICY_KEYS = Object.freeze([
  "account_active",
  "maximum_entitled",
  "policy_binding_sha256",
  "policy_revision",
  "release_allowed",
  "rollout_authorized",
  "rollout_stage",
  "valid_from",
  "valid_until",
]);
const TRUST_KEYS = Object.freeze([
  "active_trusted_install_count",
  "authority",
  "authority_binding_sha256",
  "authority_revision",
  "entra_subject_id",
  "schema_version",
  "tenant_id",
  "user_id",
]);

function normalizePolicy(value) {
  if (value === null) return null;
  assignmentExactKeys(value, POLICY_KEYS, "policy");
  if (!STAGES.includes(value.rollout_stage)) {
    assignmentInvalid("policy rollout_stage");
  }
  const validFrom = assignmentIso(value.valid_from, "policy valid_from");
  const validUntil = assignmentIso(value.valid_until, "policy valid_until");
  if (Date.parse(validUntil) <= Date.parse(validFrom)) {
    assignmentInvalid("policy window");
  }
  return Object.freeze({
    rollout_stage: value.rollout_stage,
    maximum_entitled: assignmentBoolean(
      value.maximum_entitled,
      "policy maximum_entitled",
    ),
    rollout_authorized: assignmentBoolean(
      value.rollout_authorized,
      "policy rollout_authorized",
    ),
    account_active: assignmentBoolean(value.account_active, "policy account_active"),
    release_allowed: assignmentBoolean(
      value.release_allowed,
      "policy release_allowed",
    ),
    policy_revision: assignmentInteger(value.policy_revision, "policy_revision"),
    policy_binding_sha256: assignmentDigest(
      value.policy_binding_sha256,
      "policy binding",
    ),
    valid_from: validFrom,
    valid_until: validUntil,
  });
}

function normalizeTrust(value, principal) {
  assignmentExactKeys(value, TRUST_KEYS, "trust");
  if (value.schema_version !== TRUST_SCHEMA_VERSION) {
    assignmentInvalid("trust schema_version");
  }
  const normalized = Object.freeze({
    schema_version: value.schema_version,
    authority: assignmentIdentifier(value.authority, "trust authority"),
    tenant_id: assignmentIdentifier(value.tenant_id, "trust tenant_id"),
    user_id: assignmentIdentifier(value.user_id, "trust user_id"),
    entra_subject_id: assignmentIdentifier(
      value.entra_subject_id,
      "trust entra_subject_id",
    ),
    active_trusted_install_count: assignmentInteger(
      value.active_trusted_install_count,
      "active_trusted_install_count",
      { allowZero: true },
    ),
    authority_revision: assignmentInteger(
      value.authority_revision,
      "trust authority_revision",
    ),
    authority_binding_sha256: assignmentDigest(
      value.authority_binding_sha256,
      "trust authority_binding_sha256",
    ),
  });
  if (
    normalized.tenant_id !== principal.tenant_id
    || normalized.user_id !== principal.user_id
    || normalized.entra_subject_id !== principal.entra_subject_id
  ) assignmentInvalid("trust principal binding");
  return normalized;
}

export function evaluateOutlookDesktopAssignment(input = {}) {
  assignmentExactKeys(input, [
    "approved_rollout_stage",
    "database_now",
    "policy",
    "principal",
    "trust",
  ], "evaluation input");
  const principal = normalizeAssignmentPrincipal(input.principal);
  const policy = normalizePolicy(input.policy);
  const trust = normalizeTrust(input.trust, principal);
  const now = assignmentIso(input.database_now, "database_now");
  if (!STAGES.includes(input.approved_rollout_stage)) {
    assignmentInvalid("approved_rollout_stage");
  }
  const reasons = [];
  if (!policy) {
    reasons.push("policy_missing");
  } else {
    if (STAGES.indexOf(policy.rollout_stage)
      > STAGES.indexOf(input.approved_rollout_stage)) {
      reasons.push("rollout_stage_not_approved");
    }
    if (!policy.maximum_entitled) reasons.push("maximum_entitlement_denied");
    if (!policy.rollout_authorized) reasons.push("rollout_not_authorized");
    if (!policy.account_active) reasons.push("account_inactive");
    if (!policy.release_allowed) reasons.push("release_denied");
    if (Date.parse(now) < Date.parse(policy.valid_from)
      || Date.parse(now) >= Date.parse(policy.valid_until)) {
      reasons.push("policy_not_current");
    }
  }
  if (trust.active_trusted_install_count === 0) {
    reasons.push("active_trusted_install_required");
  }
  const desired = reasons.length === 0;
  const aggregate = [
    ...Object.values(principal),
    policy?.rollout_stage ?? null,
    policy?.policy_revision ?? 0,
    policy?.policy_binding_sha256 ?? "0".repeat(64),
    trust.active_trusted_install_count,
    trust.authority,
    trust.authority_revision,
    trust.authority_binding_sha256,
    desired,
    reasons,
  ];
  return Object.freeze({
    ...principal,
    rollout_stage: policy?.rollout_stage ?? null,
    policy_revision: policy?.policy_revision ?? 0,
    policy_binding_sha256: policy?.policy_binding_sha256 ?? "0".repeat(64),
    active_trusted_install_count: trust.active_trusted_install_count,
    trust_authority: trust.authority,
    trust_authority_revision: trust.authority_revision,
    trust_authority_binding_sha256: trust.authority_binding_sha256,
    desired_assigned: desired,
    denial_reasons: Object.freeze(reasons),
    aggregate_sha256: assignmentSha256(
      "lawos.outlook-assignment.aggregate.v1",
      aggregate,
    ),
    evaluated_at: now,
  });
}

export function transitionOutlookDesktopAssignment(previous, evaluation) {
  assignmentRecord(evaluation, "evaluation");
  if (previous && (
    previous.tenant_id !== evaluation.tenant_id
    || previous.user_id !== evaluation.user_id
    || previous.entra_subject_id !== evaluation.entra_subject_id
  )) assignmentInvalid("state principal binding");
  if (previous?.aggregate_sha256 === evaluation.aggregate_sha256) {
    return Object.freeze({ changed: false, state: previous, outbox_action: null });
  }
  const stateRevision = (previous?.state_revision ?? 0) + 1;
  const flipped = previous
    ? previous.desired_assigned !== evaluation.desired_assigned
    : evaluation.desired_assigned;
  const providerGeneration = (previous?.provider_generation ?? 0) + (flipped ? 1 : 0);
  const providerIntent = flipped || !previous
    ? assignmentProviderIntent(
      evaluation,
      providerGeneration,
      evaluation.desired_assigned,
    )
    : previous.provider_intent_sha256;
  const state = Object.freeze({
    ...evaluation,
    state_revision: stateRevision,
    provider_generation: providerGeneration,
    provider_intent_sha256: providerIntent,
  });
  return Object.freeze({
    changed: true,
    state,
    outbox_action: flipped ? (state.desired_assigned ? "add" : "remove") : null,
  });
}
