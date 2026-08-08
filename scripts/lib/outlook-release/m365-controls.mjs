import { PRODUCT_IDS } from "./constants.mjs";
import {
  assertEqual, assertExactKeys, assertSha256, canonical, concreteText, profileMap, sha256,
  sorted, utcMillis,
} from "./primitives.mjs";
import {
  assertConcreteList, assertEvidenceBinding, assertObservedAt, assertProofBase,
} from "./proof-common.mjs";
import { readProtectedJsonProof } from "./protected-evidence.mjs";

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
  const requiredActions = ["m365_central_manifest_update", "static_dual_namespace_publish"];
  if (proof.approved !== true || sorted(proof.authorized_actions).join("|") !== sorted(requiredActions).join("|")
    || proof.operator_ref !== control.operator_ref || proof.owner_ref !== control.owner_ref
    || proof.window_start_utc !== control.window_start_utc || proof.window_end_utc !== control.window_end_utc) {
    throw new Error("M365 authorization proof is not bound to the execution controls");
  }
  concreteText(proof.authorization_ref, "M365 authorization_ref");
  assertObservedAt(proof.approved_at_utc, "M365 authorization approval");
  return { loaded, proof };
}

function validatePilot(control, context) {
  assertExactKeys(control.pilot_assignment, ["evidence_ref", "evidence_sha256", "fingerprint_sha256", "groups"], "pilot assignment control");
  assertConcreteList(control.pilot_assignment.groups, "pilot assignment groups");
  assertSha256(control.pilot_assignment.fingerprint_sha256, "pilot assignment fingerprint");
  const loaded = readProtectedJsonProof(context.store, {
    evidence_ref: control.pilot_assignment.evidence_ref,
    evidence_sha256: control.pilot_assignment.evidence_sha256,
  }, "pilot_assignment");
  const proof = loaded.proof;
  assertProofBase(proof, "amic-os.m365-pilot-assignment-proof.v1", "pilot_assignment", context.identity, [
    "assignment_fingerprint_sha256", "assignments", "groups", "observed_at_utc", "status",
  ]);
  assertConcreteList(proof.groups, "protected pilot assignment groups");
  const receiptProfiles = profileMap(context.receipt.profiles, "M365 receipt profiles");
  const assignments = profileMap(proof.assignments, "pilot assignment proof");
  for (const productId of PRODUCT_IDS) {
    const assignment = assignments.get(productId);
    const receiptProfile = receiptProfiles.get(productId);
    assertExactKeys(assignment, ["assignment_count", "assignment_fingerprint_sha256", "group_refs", "product_id"], "pilot product assignment");
    assertConcreteList(assignment.group_refs, "pilot product group refs");
    if (assignment.assignment_count !== receiptProfile.assignment_count
      || assignment.assignment_fingerprint_sha256 !== receiptProfile.assignment_fingerprint_sha256
      || assignment.group_refs.some((ref) => !proof.groups.includes(ref))) {
      throw new Error(`pilot assignment proof drifted for ${productId}`);
    }
  }
  const fingerprint = sha256(JSON.stringify(canonical(proof.assignments)));
  if (proof.assignment_fingerprint_sha256 !== fingerprint || control.pilot_assignment.fingerprint_sha256 !== fingerprint
    || JSON.stringify(sorted(proof.groups)) !== JSON.stringify(sorted(control.pilot_assignment.groups))
    || proof.status !== "verified") throw new Error("pilot assignment fingerprint/groups are not evidence-bound");
  assertObservedAt(proof.observed_at_utc, "pilot assignment observation");
  return { loaded, proof };
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
  assertObservedAt(proof.approved_at_utc, "monitoring plan approval");
  return { loaded, proof };
}

function validateRollback(control, context) {
  const loaded = readProtectedJsonProof(context.store, assertEvidenceBinding(control.rollback_rehearsal_evidence, "rollback rehearsal evidence"), "rollback_rehearsal");
  const proof = loaded.proof;
  assertProofBase(proof, "amic-os.m365-rollback-rehearsal-proof.v1", "rollback_rehearsal", context.identity, [
    "owner_ref", "profiles", "rehearsed_at_utc", "result",
  ]);
  const profiles = profileMap(proof.profiles, "rollback rehearsal proof");
  const rollbacks = profileMap(context.rollback.profiles, "rollback contract");
  for (const productId of PRODUCT_IDS) {
    const profile = profiles.get(productId);
    assertExactKeys(profile, ["product_id", "readback_sha256", "result", "rollback_manifest_sha256"], "rollback rehearsal profile");
    if (profile.rollback_manifest_sha256 !== rollbacks.get(productId).rollback_manifest_sha256
      || !/^([a-f0-9]{64})$/u.test(profile.readback_sha256 ?? "") || profile.result !== "pass") {
      throw new Error(`rollback rehearsal is incomplete for ${productId}`);
    }
  }
  if (proof.owner_ref !== control.rollback_readback_owner_ref || proof.result !== "pass") {
    throw new Error("rollback rehearsal/readback owner is invalid");
  }
  assertObservedAt(proof.rehearsed_at_utc, "rollback rehearsal");
  return { loaded, proof };
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
