import { PRODUCT_IDS, REQUIRED_MUTATION_ACTIONS } from "./constants.mjs";
import { m365CompletionMillis } from "./m365-base.mjs";
import { expectedDistributionProfile, validateProfileDistribution } from "./m365-distribution.mjs";
import {
  assertEqual, assertExactKeys, assertSha256, canonical, concreteText, profileMap, sha256,
  sorted, utcMillis,
} from "./primitives.mjs";
import {
  assertConcreteList, assertEvidenceBinding, assertProofBase,
} from "./proof-common.mjs";
import { readProtectedJsonProof } from "./protected-evidence.mjs";
import { validateProtectedRollbackEvidence } from "./rollback-evidence.mjs";

const CONTROL_KEYS = [
  "abort_criteria", "authorization_evidence", "central_deployment_evidence", "go_live_evidence",
  "monitoring_criteria", "monitoring_evidence", "operator_ref", "owner_ref", "pilot_assignment",
  "rollback_readback_owner_ref", "rollback_rehearsal_evidence", "window_end_utc", "window_start_utc",
];

export function validateAwaitingControls(control) {
  assertExactKeys(control, CONTROL_KEYS, "M365 execution_control");
  const nullable = CONTROL_KEYS.filter((key) => !["abort_criteria", "monitoring_criteria"].includes(key));
  if (nullable.some((key) => control[key] !== null)
    || !Array.isArray(control.monitoring_criteria) || control.monitoring_criteria.length
    || !Array.isArray(control.abort_criteria) || control.abort_criteria.length) {
    throw new Error("awaiting M365 execution controls must remain null/pending");
  }
  return { pending: true };
}

function validateAuthorization(control, context) {
  const loaded = readProtectedJsonProof(context.store, assertEvidenceBinding(control.authorization_evidence, "authorization evidence"), "authorization");
  const proof = loaded.proof;
  assertProofBase(proof, "amic-os.m365-authorization-proof.v1", "authorization", context.identity, [
    "approved", "approved_at_utc", "authorization_ref", "authorized_actions", "operator_ref", "owner_ref",
    "window_end_utc", "window_start_utc",
  ]);
  assertConcreteList(proof.authorized_actions, "authorized actions");
  if (proof.approved !== true
    || sorted(proof.authorized_actions).join("|") !== sorted(REQUIRED_MUTATION_ACTIONS).join("|")
    || proof.operator_ref !== control.operator_ref || proof.owner_ref !== control.owner_ref
    || proof.window_start_utc !== control.window_start_utc || proof.window_end_utc !== control.window_end_utc) {
    throw new Error("M365 authorization proof does not exactly authorize every executed mutation class");
  }
  concreteText(proof.authorization_ref, "M365 authorization_ref");
  const completedAt = m365CompletionMillis(proof.approved_at_utc, "M365 authorization approval", context.validationCutoff);
  return { completedAt, loaded, proof };
}

function validatePilot(control, context) {
  assertExactKeys(control.pilot_assignment, [
    "eligible_principal_fingerprint_sha256", "evidence_ref", "evidence_sha256",
    "excluded_principal_fingerprint_sha256", "fingerprint_sha256", "groups",
  ], "pilot assignment control");
  assertConcreteList(control.pilot_assignment.groups, "pilot assignment groups");
  assertSha256(control.pilot_assignment.fingerprint_sha256, "pilot assignment fingerprint");
  assertSha256(control.pilot_assignment.eligible_principal_fingerprint_sha256, "eligible principal fingerprint");
  assertSha256(control.pilot_assignment.excluded_principal_fingerprint_sha256, "excluded principal fingerprint");
  const loaded = readProtectedJsonProof(context.store, {
    evidence_ref: control.pilot_assignment.evidence_ref,
    evidence_sha256: control.pilot_assignment.evidence_sha256,
  }, "pilot_assignment");
  const proof = loaded.proof;
  assertProofBase(proof, "amic-os.m365-pilot-assignment-proof.v2", "pilot_assignment", context.identity, [
    "assign_to_everyone", "assignment_fingerprint_sha256", "assignment_overlap_count", "assignments",
    "eligible_principal_fingerprint_sha256", "eligible_principal_refs", "eligible_user_count",
    "excluded_principal_fingerprint_sha256", "excluded_principal_refs", "excluded_user_count", "groups",
    "max_visible_addins_per_user", "observed_at_utc", "status",
  ]);
  assertConcreteList(proof.groups, "protected pilot assignment groups");
  assertConcreteList(proof.eligible_principal_refs, "eligible principal refs");
  assertConcreteList(proof.excluded_principal_refs, "excluded principal refs");
  const excludedPrincipalRefs = new Set(proof.excluded_principal_refs);
  if (proof.eligible_principal_refs.some((ref) => excludedPrincipalRefs.has(ref))) {
    throw new Error("pilot eligible and excluded principals must be disjoint");
  }
  const eligiblePrincipalFingerprint = sha256(JSON.stringify(sorted(proof.eligible_principal_refs)));
  const excludedPrincipalFingerprint = sha256(JSON.stringify(sorted(proof.excluded_principal_refs)));
  const receiptProfiles = profileMap(context.receipt.profiles, "M365 receipt profiles");
  const assignments = profileMap(proof.assignments, "pilot assignment proof");
  const usedGroups = new Set();
  for (const productId of PRODUCT_IDS) {
    const assignment = assignments.get(productId);
    const receiptProfile = receiptProfiles.get(productId);
    assertExactKeys(assignment, [
      "assign_to_everyone", "assignment_count", "assignment_fingerprint_sha256", "assignment_state",
      "distribution_role", "group_refs", "product_id", "production_user_visible",
    ], "pilot product assignment");
    const expected = expectedDistributionProfile(context.contract, productId);
    validateProfileDistribution(assignment, expected, `${expected.profile} pilot assignment`);
    if (!Array.isArray(assignment.group_refs) || new Set(assignment.group_refs).size !== assignment.group_refs.length
      || assignment.group_refs.some((ref) => !concreteText(ref, "pilot product group ref"))
      || (expected.production_user_visible && assignment.group_refs.length < 1)
      || (!expected.production_user_visible && assignment.group_refs.length !== 0)) {
      throw new Error(`pilot group assignment drifted for ${productId}`);
    }
    assignment.group_refs.forEach((ref) => usedGroups.add(ref));
    const assignmentFingerprint = sha256(JSON.stringify(canonical(assignment.group_refs)));
    if (assignment.assignment_count !== assignment.group_refs.length
      || assignment.assignment_fingerprint_sha256 !== assignmentFingerprint
      || assignment.assignment_count !== receiptProfile.assignment_count
      || assignment.assignment_fingerprint_sha256 !== receiptProfile.assignment_fingerprint_sha256
      || assignment.assignment_state !== receiptProfile.assignment_state
      || assignment.distribution_role !== receiptProfile.distribution_role
      || assignment.production_user_visible !== receiptProfile.production_user_visible
      || assignment.assign_to_everyone !== receiptProfile.assign_to_everyone
      || assignment.group_refs.some((ref) => !proof.groups.includes(ref))) {
      throw new Error(`pilot assignment proof drifted for ${productId}`);
    }
  }
  const fingerprint = sha256(JSON.stringify(canonical(proof.assignments)));
  const distribution = context.contract.m365.production_distribution;
  if (proof.assignment_fingerprint_sha256 !== fingerprint || control.pilot_assignment.fingerprint_sha256 !== fingerprint
    || JSON.stringify(sorted(proof.groups)) !== JSON.stringify(sorted(control.pilot_assignment.groups))
    || JSON.stringify(sorted(proof.groups)) !== JSON.stringify(sorted([...usedGroups]))
    || proof.eligible_principal_fingerprint_sha256 !== eligiblePrincipalFingerprint
    || proof.eligible_principal_fingerprint_sha256 !== control.pilot_assignment.eligible_principal_fingerprint_sha256
    || proof.excluded_principal_fingerprint_sha256 !== excludedPrincipalFingerprint
    || proof.excluded_principal_fingerprint_sha256 !== control.pilot_assignment.excluded_principal_fingerprint_sha256
    || proof.eligible_user_count !== proof.eligible_principal_refs.length
    || proof.eligible_user_count !== distribution.eligible_user_count
    || proof.excluded_user_count !== proof.excluded_principal_refs.length
    || proof.excluded_user_count !== distribution.excluded_user_count
    || proof.assignment_overlap_count !== distribution.assignment_overlap_count
    || proof.max_visible_addins_per_user !== distribution.max_visible_addins_per_user
    || proof.assign_to_everyone !== distribution.assign_to_everyone
    || proof.status !== "verified") throw new Error("pilot assignment fingerprint/groups are not evidence-bound");
  const completedAt = m365CompletionMillis(proof.observed_at_utc, "pilot assignment observation", context.validationCutoff);
  return { completedAt, loaded, proof };
}

function validateMonitoring(control, context) {
  assertConcreteList(control.monitoring_criteria, "monitoring criteria");
  assertConcreteList(control.abort_criteria, "abort criteria");
  const loaded = readProtectedJsonProof(context.store, assertEvidenceBinding(control.monitoring_evidence, "monitoring evidence"), "monitoring_plan");
  const proof = loaded.proof;
  assertProofBase(proof, "amic-os.m365-monitoring-plan-proof.v1", "monitoring_plan", context.identity, [
    "abort_criteria", "approved_at_utc", "criteria", "owner_ref", "status",
  ]);
  if (proof.owner_ref !== control.owner_ref || proof.status !== "approved") throw new Error("monitoring owner/status is invalid");
  assertEqual(proof.criteria, control.monitoring_criteria, "monitoring criteria evidence");
  assertEqual(proof.abort_criteria, control.abort_criteria, "abort criteria evidence");
  const completedAt = m365CompletionMillis(proof.approved_at_utc, "monitoring plan approval", context.validationCutoff);
  return { completedAt, loaded, proof };
}

function validateRollback(control, context) {
  const restored = validateProtectedRollbackEvidence(
    context.rollback, context.baseline, context.contract, context.store,
  );
  const loaded = readProtectedJsonProof(context.store, assertEvidenceBinding(control.rollback_rehearsal_evidence, "rollback rehearsal evidence"), "rollback_rehearsal");
  const proof = loaded.proof;
  assertProofBase(proof, "amic-os.m365-rollback-rehearsal-proof.v1", "rollback_rehearsal", context.identity, [
    "owner_ref", "profiles", "rehearsed_at_utc", "result",
  ]);
  const profiles = profileMap(proof.profiles, "rollback rehearsal proof");
  for (const expected of restored.profiles) {
    const profile = profiles.get(expected.product_id);
    assertExactKeys(profile, [...Object.keys(expected), "readback_sha256", "result"], "rollback rehearsal profile");
    const projection = Object.fromEntries(Object.keys(expected).map((key) => [key, profile[key]]));
    if (JSON.stringify(canonical(projection)) !== JSON.stringify(canonical(expected))
      || profile.readback_sha256 !== sha256(JSON.stringify(canonical(expected))) || profile.result !== "pass") {
      throw new Error(`rollback rehearsal did not restore the exact protected bundle for ${expected.product_id}`);
    }
  }
  if (proof.owner_ref !== control.rollback_readback_owner_ref || proof.result !== "pass") {
    throw new Error("rollback rehearsal/readback owner is invalid");
  }
  const completedAt = m365CompletionMillis(proof.rehearsed_at_utc, "rollback rehearsal", context.validationCutoff);
  return { completedAt, loaded, proof };
}

export function validateExecutedControls(control, context) {
  assertExactKeys(control, CONTROL_KEYS, "M365 execution_control");
  concreteText(control.operator_ref, "M365 operator_ref");
  concreteText(control.owner_ref, "M365 owner_ref");
  concreteText(control.rollback_readback_owner_ref, "rollback readback owner_ref");
  const start = utcMillis(control.window_start_utc, "M365 change window start");
  const end = utcMillis(control.window_end_utc, "M365 change window end");
  if (end <= start) throw new Error("M365 change window end must follow its start");
  assertEvidenceBinding(control.central_deployment_evidence, "central deployment evidence");
  if (control.go_live_evidence != null) assertEvidenceBinding(control.go_live_evidence, "go-live evidence");
  const authorization = validateAuthorization(control, context);
  const pilot = validatePilot(control, context);
  const monitoring = validateMonitoring(control, context);
  const rollback = validateRollback(control, context);
  return { authorization, pilot, monitoring, rollback, window: { start, end } };
}
