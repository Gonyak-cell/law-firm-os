import {
  PRODUCT_IDS, REQUIRED_MUTATION_ACTIONS, ROLLBACK_ASSIGNMENT_RESTORE_POLICY,
} from "./constants.mjs";
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
  "abort_criteria", "assignment_safety_evidence", "authorization_evidence", "central_deployment_evidence", "go_live_evidence",
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
  assertProofBase(proof, "amic-os.m365-authorization-proof.v3", "authorization", context.identity, [
    "approved", "approved_at_utc", "authorization_ref", "authorized_actions",
    "eligible_principal_fingerprint_sha256", "excluded_principal_fingerprint_sha256",
    "operator_ref", "owner_ref", "pilot_group_fingerprint_sha256",
    "roster_email_fingerprint_sha256", "roster_file_sha256", "window_end_utc", "window_start_utc",
  ]);
  assertConcreteList(proof.authorized_actions, "authorized actions");
  if (proof.approved !== true
    || sorted(proof.authorized_actions).join("|") !== sorted(REQUIRED_MUTATION_ACTIONS).join("|")
    || proof.eligible_principal_fingerprint_sha256
      !== control.pilot_assignment.eligible_principal_fingerprint_sha256
    || proof.excluded_principal_fingerprint_sha256
      !== control.pilot_assignment.excluded_principal_fingerprint_sha256
    || proof.roster_file_sha256 !== control.pilot_assignment.roster_file_sha256
    || proof.roster_email_fingerprint_sha256 !== control.pilot_assignment.roster_email_fingerprint_sha256
    || proof.pilot_group_fingerprint_sha256
      !== sha256(JSON.stringify(sorted(control.pilot_assignment.groups)))
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
    "roster_email_fingerprint_sha256", "roster_file_sha256",
  ], "pilot assignment control");
  assertConcreteList(control.pilot_assignment.groups, "pilot assignment groups");
  assertSha256(control.pilot_assignment.fingerprint_sha256, "pilot assignment fingerprint");
  assertSha256(control.pilot_assignment.eligible_principal_fingerprint_sha256, "eligible principal fingerprint");
  assertSha256(control.pilot_assignment.excluded_principal_fingerprint_sha256, "excluded principal fingerprint");
  assertSha256(control.pilot_assignment.roster_file_sha256, "source roster file fingerprint");
  assertSha256(control.pilot_assignment.roster_email_fingerprint_sha256, "source roster email fingerprint");
  const loaded = readProtectedJsonProof(context.store, {
    evidence_ref: control.pilot_assignment.evidence_ref,
    evidence_sha256: control.pilot_assignment.evidence_sha256,
  }, "pilot_assignment");
  const proof = loaded.proof;
  assertProofBase(proof, "amic-os.m365-pilot-assignment-proof.v4", "pilot_assignment", context.identity, [
    "assign_to_everyone", "assignment_fingerprint_sha256", "assignment_overlap_count", "assignments",
    "direct_membership_readbacks",
    "eligible_principal_fingerprint_sha256", "eligible_principal_refs", "eligible_user_count",
    "excluded_principal_fingerprint_sha256", "excluded_principal_refs", "excluded_user_count", "groups",
    "max_visible_addins_per_user", "observed_at_utc", "roster_email_fingerprint_sha256",
    "roster_file_sha256", "status",
  ]);
  assertConcreteList(proof.groups, "protected pilot assignment groups");
  assertConcreteList(proof.eligible_principal_refs, "eligible principal refs");
  assertConcreteList(proof.excluded_principal_refs, "excluded principal refs", { allowEmpty: true });
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
  if (!Array.isArray(proof.direct_membership_readbacks) || proof.direct_membership_readbacks.length === 0) {
    throw new Error("pilot provider direct-membership readbacks are required");
  }
  const membershipGroups = new Set();
  const directMemberRefs = [];
  for (const readback of proof.direct_membership_readbacks) {
    assertExactKeys(readback, [
      "direct_member_fingerprint_sha256", "direct_member_principal_refs", "group_ref",
      "membership_scope", "nested_group_count", "provider", "result",
    ], "pilot provider direct-membership readback");
    const groupRef = concreteText(readback.group_ref, "pilot provider group ref");
    assertConcreteList(readback.direct_member_principal_refs, `direct members for ${groupRef}`);
    if (membershipGroups.has(groupRef)) throw new Error("pilot provider direct-membership group readback is duplicated");
    membershipGroups.add(groupRef);
    const fingerprint = sha256(JSON.stringify(sorted(readback.direct_member_principal_refs)));
    if (readback.provider !== "microsoft_entra" || readback.membership_scope !== "direct_members_only"
      || readback.nested_group_count !== 0 || readback.result !== "exact_provider_readback"
      || readback.direct_member_fingerprint_sha256 !== fingerprint) {
      throw new Error(`pilot provider direct-membership readback drifted for ${groupRef}`);
    }
    directMemberRefs.push(...readback.direct_member_principal_refs);
  }
  if (new Set(directMemberRefs).size !== directMemberRefs.length) {
    throw new Error("pilot provider direct members must not be duplicated across assigned groups");
  }
  if (JSON.stringify(sorted([...membershipGroups])) !== JSON.stringify(sorted([...usedGroups]))) {
    throw new Error("pilot provider direct-membership groups do not match assigned groups");
  }
  if (directMemberRefs.some((ref) => excludedPrincipalRefs.has(ref))) {
    throw new Error("pilot excluded principal appears in provider direct-membership readback");
  }
  if (JSON.stringify(sorted(directMemberRefs)) !== JSON.stringify(sorted(proof.eligible_principal_refs))) {
    throw new Error("pilot eligible principals are not bound to provider direct-membership readback");
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
    || proof.roster_file_sha256 !== control.pilot_assignment.roster_file_sha256
    || proof.roster_email_fingerprint_sha256 !== control.pilot_assignment.roster_email_fingerprint_sha256
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

function assignmentCorrectionActions(currentAssignments, targetAssignments) {
  const current = profileMap(currentAssignments, "assignment safety current readbacks");
  const targets = profileMap(targetAssignments, "assignment safety targets");
  const actions = [];
  for (const productId of [PRODUCT_IDS[1], PRODUCT_IDS[0]]) {
    const before = current.get(productId);
    const target = targets.get(productId);
    if (before.assign_to_everyone !== target.assign_to_everyone) {
      actions.push({
        action: "disable_assign_to_everyone", product_id: productId,
        target_assignment_fingerprint_sha256: target.assignment_fingerprint_sha256,
      });
    }
    if (JSON.stringify(sorted(before.group_refs)) !== JSON.stringify(sorted(target.group_refs))) {
      actions.push({
        action: "replace_group_assignments", product_id: productId,
        target_assignment_fingerprint_sha256: target.assignment_fingerprint_sha256,
      });
    }
  }
  return actions;
}

function validateAssignmentSafety(control, context, pilot) {
  const loaded = readProtectedJsonProof(
    context.store,
    assertEvidenceBinding(control.assignment_safety_evidence, "assignment safety evidence"),
    "assignment_safety",
  );
  const proof = loaded.proof;
  assertProofBase(proof, "amic-os.m365-assignment-safety-proof.v1", "assignment_safety", context.identity, [
    "correction_required", "current_assignments", "observed_at_utc",
    "pilot_assignment_evidence_sha256", "provider_readback", "required_correction_actions",
    "rollback_assignment_policy", "status", "target_assignments", "unsafe_assignment_preservation_allowed",
  ]);
  const currentAssignments = profileMap(proof.current_assignments, "assignment safety current readbacks");
  for (const productId of PRODUCT_IDS) {
    const current = currentAssignments.get(productId);
    assertExactKeys(current, [
      "assign_to_everyone", "assignment_count", "assignment_fingerprint_sha256", "group_refs", "product_id",
    ], "assignment safety provider readback");
    if (typeof current.assign_to_everyone !== "boolean" || !Array.isArray(current.group_refs)
      || new Set(current.group_refs).size !== current.group_refs.length
      || current.group_refs.some((ref) => !concreteText(ref, "assignment safety group ref"))
      || current.assignment_count !== current.group_refs.length
      || current.assignment_fingerprint_sha256 !== sha256(JSON.stringify(canonical(current.group_refs)))) {
      throw new Error(`assignment safety provider readback is invalid for ${productId}`);
    }
  }
  profileMap(proof.target_assignments, "assignment safety target assignments");
  if (JSON.stringify(canonical(proof.target_assignments)) !== JSON.stringify(canonical(pilot.proof.assignments))) {
    throw new Error("assignment safety target is not bound to the protected pilot assignment");
  }
  if (!Array.isArray(proof.required_correction_actions)) {
    throw new Error("assignment safety correction actions must be an array");
  }
  const actionKeys = new Set();
  for (const action of proof.required_correction_actions) {
    assertExactKeys(action, [
      "action", "product_id", "target_assignment_fingerprint_sha256",
    ], "assignment correction action");
    if (!PRODUCT_IDS.includes(action.product_id)
      || !["disable_assign_to_everyone", "replace_group_assignments"].includes(action.action)) {
      throw new Error("assignment correction action is invalid");
    }
    assertSha256(action.target_assignment_fingerprint_sha256, "assignment correction target fingerprint");
    const key = `${action.product_id}:${action.action}`;
    if (actionKeys.has(key)) throw new Error("assignment correction action is duplicated");
    actionKeys.add(key);
  }
  const expectedActions = assignmentCorrectionActions(proof.current_assignments, proof.target_assignments);
  if (JSON.stringify(canonical(proof.required_correction_actions))
      !== JSON.stringify(canonical(expectedActions))
    || proof.correction_required !== (expectedActions.length > 0)
    || proof.pilot_assignment_evidence_sha256 !== pilot.loaded.evidence_sha256
    || proof.provider_readback !== true
    || proof.rollback_assignment_policy !== ROLLBACK_ASSIGNMENT_RESTORE_POLICY
    || proof.unsafe_assignment_preservation_allowed !== false
    || proof.status !== "verified") {
    throw new Error("assignment safety correction/rollback prerequisite is incomplete");
  }
  const completedAt = m365CompletionMillis(
    proof.observed_at_utc, "assignment safety provider readback", context.validationCutoff,
  );
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

function validateRollback(control, context, assignmentSafety) {
  const restored = validateProtectedRollbackEvidence(
    context.rollback, context.baseline, context.contract, context.store,
  );
  const loaded = readProtectedJsonProof(context.store, assertEvidenceBinding(control.rollback_rehearsal_evidence, "rollback rehearsal evidence"), "rollback_rehearsal");
  const proof = loaded.proof;
  assertProofBase(proof, "amic-os.m365-rollback-rehearsal-proof.v2", "rollback_rehearsal", context.identity, [
    "assignment_safety_evidence_sha256", "assignment_restore_policy", "owner_ref", "profiles",
    "rehearsed_at_utc", "result", "target_assignments", "unsafe_assignment_preservation_allowed",
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
  if (proof.owner_ref !== control.rollback_readback_owner_ref || proof.result !== "pass"
    || proof.assignment_safety_evidence_sha256 !== assignmentSafety.loaded.evidence_sha256
    || proof.assignment_restore_policy !== ROLLBACK_ASSIGNMENT_RESTORE_POLICY
    || context.rollback.assignment_restore_policy !== ROLLBACK_ASSIGNMENT_RESTORE_POLICY
    || JSON.stringify(canonical(proof.target_assignments))
      !== JSON.stringify(canonical(assignmentSafety.proof.target_assignments))
    || proof.unsafe_assignment_preservation_allowed !== false) {
    throw new Error("rollback rehearsal assignment reconciliation/readback is invalid");
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
  const assignmentSafety = validateAssignmentSafety(control, context, pilot);
  const monitoring = validateMonitoring(control, context);
  const rollback = validateRollback(control, context, assignmentSafety);
  for (const [name, proof] of [["pilot assignment", pilot], ["assignment safety", assignmentSafety]]) {
    if (proof.completedAt < start || proof.completedAt > end) {
      throw new Error(`${name} observation occurred outside the authorized change window`);
    }
    if (proof.completedAt < authorization.completedAt) {
      throw new Error(`${name} observation predates protected authorization approval`);
    }
  }
  if (rollback.completedAt < assignmentSafety.completedAt) {
    throw new Error("rollback rehearsal predates the protected assignment-safety prerequisite");
  }
  return { authorization, pilot, assignmentSafety, monitoring, rollback, window: { start, end } };
}
