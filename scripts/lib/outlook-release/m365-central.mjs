import {
  assertEqual, assertExactKeys, canonical, profileMap, requiredText, sha256, utcMillis,
} from "./primitives.mjs";
import { MUTATION_ACTIONS, PRODUCT_IDS } from "./constants.mjs";
import { expectedDistributionProfile, validateProfileDistribution } from "./m365-distribution.mjs";
import { m365CompletionMillis } from "./m365-base.mjs";
import {
  MUTATION_AUTHORIZATION_FIELDS, validateMutationAuthorization,
} from "./mutation-authorization.mjs";
import { assertProofBase } from "./proof-common.mjs";
import { readProtectedJsonProof } from "./protected-evidence.mjs";

function validateStaticReceipt(receipt, staticResult) {
  assertExactKeys(receipt.static_release, [
    "package_lock_sha256", "plan_sha256", "profiles", "source_sha", "source_tree", "target_namespaces",
  ], "M365 static_release evidence");
  for (const profile of receipt.static_release.profiles ?? []) {
    assertExactKeys(profile, [
      "bundle_sha256", "inventory_sha256", "manifest_sha256", "product_id", "profile",
      "source_location_coverage", "target_prefix", "taskpane_html_sha256",
    ], "M365 static_release profile");
  }
  assertEqual(canonical(receipt.static_release), canonical(staticResult.projection), "M365 static release exact inventory binding");
}

function validateProfileOperations(receipt, options, staticResult) {
  const { contract, releaseCandidate } = options;
  const riskOrderedProductIds = [PRODUCT_IDS[1], PRODUCT_IDS[0]];
  if (JSON.stringify(receipt.operations.map(({ product_id }) => product_id))
      !== JSON.stringify(riskOrderedProductIds)
    || JSON.stringify(receipt.readbacks.map(({ product_id }) => product_id))
      !== JSON.stringify(riskOrderedProductIds)) {
    throw new Error("central assignment operations/readbacks must be inquiry-first and Matter-last");
  }
  const profiles = profileMap(receipt.profiles, "M365 receipt profiles");
  const operations = profileMap(receipt.operations, "M365 operations");
  const staticReadbacks = profileMap(receipt.static_readbacks, "static readbacks");
  const readbacks = profileMap(receipt.readbacks, "M365 readbacks");
  const operationRefs = new Set();
  for (const expected of contract.profiles) {
    const profile = profiles.get(expected.product_id);
    const artifact = releaseCandidate.profile_artifacts.find(({ product_id }) => product_id === expected.product_id);
    const operation = operations.get(expected.product_id);
    const staticReadback = staticReadbacks.get(expected.product_id);
    const readback = readbacks.get(expected.product_id);
    const staticProfile = staticResult.plan.profiles.find(({ product_id }) => product_id === expected.product_id);
    assertExactKeys(operation, ["operation_ref", "operation_type", "product_id", "result"], `${expected.profile} M365 operation`);
    assertExactKeys(staticReadback, [
      "bundle_sha256", "http_status", "inventory_sha256", "product_id", "result", "source_locations",
      "target_prefix", "taskpane_html_sha256",
    ], `${expected.profile} static readback`);
    assertExactKeys(readback, [
      "assign_to_everyone", "assignment_count", "assignment_fingerprint_sha256", "assignment_state",
      "deployment_mode", "distribution_role", "enabled", "manifest_sha256", "product_id",
      "production_user_visible", "source_locations", "version",
    ], `${expected.profile} M365 readback`);
    const distribution = expectedDistributionProfile(contract, expected.product_id);
    validateProfileDistribution(readback, distribution, `${expected.profile} readback`);
    const operationRef = requiredText(operation.operation_ref, "M365 operation_ref");
    if (operation.operation_type !== distribution.central_operation_type || operation.result !== "success"
      || operationRefs.has(operationRef)) throw new Error(`${expected.profile} central update operation is incomplete`);
    operationRefs.add(operationRef);
    if (staticReadback.result !== "exact_hash" || staticReadback.http_status !== 200
      || staticReadback.target_prefix !== staticProfile.target_prefix
      || staticReadback.inventory_sha256 !== staticProfile.inventory_sha256
      || staticReadback.taskpane_html_sha256 !== artifact.taskpane_html_sha256
      || staticReadback.bundle_sha256 !== profile.bundle_sha256
      || JSON.stringify(staticReadback.source_locations) !== JSON.stringify(profile.source_locations)) {
      throw new Error(`${expected.profile} static asset readback is incomplete`);
    }
    if (readback.version !== contract.release_version || readback.manifest_sha256 !== profile.candidate_manifest_sha256
      || readback.deployment_mode !== "fixed" || JSON.stringify(readback.source_locations) !== JSON.stringify(profile.source_locations)
      || readback.assignment_count !== profile.assignment_count
      || readback.assignment_fingerprint_sha256 !== profile.assignment_fingerprint_sha256
      || readback.assignment_state !== profile.assignment_state
      || readback.distribution_role !== profile.distribution_role
      || readback.production_user_visible !== profile.production_user_visible
      || readback.assign_to_everyone !== profile.assign_to_everyone
      || readback.enabled !== true) throw new Error(`${expected.profile} central deployment readback drifted`);
  }
}

function validateAssignmentTransition(proof, receipt, controls, centralObservedAt) {
  const operations = profileMap(receipt.operations, "M365 operations");
  const readbacks = profileMap(receipt.readbacks, "M365 readbacks");
  const inquiryOperation = operations.get(PRODUCT_IDS[1]);
  const matterOperation = operations.get(PRODUCT_IDS[0]);
  const inquiryReadback = readbacks.get(PRODUCT_IDS[1]);
  const matterReadback = readbacks.get(PRODUCT_IDS[0]);
  const inquiryReadbackSha256 = sha256(JSON.stringify(canonical(inquiryReadback)));
  const matterReadbackSha256 = sha256(JSON.stringify(canonical(matterReadback)));
  const expected = [
    {
      action: "disable_assign_to_everyone", product_id: PRODUCT_IDS[1],
      operation_ref: inquiryOperation.operation_ref, result: "success",
      assignment_fingerprint_sha256: null, principal_fingerprint_sha256: null, readback_sha256: null,
    },
    {
      action: "replace_group_assignments", product_id: PRODUCT_IDS[1],
      operation_ref: inquiryOperation.operation_ref, result: "success",
      assignment_fingerprint_sha256: inquiryReadback.assignment_fingerprint_sha256,
      principal_fingerprint_sha256: null, readback_sha256: null,
    },
    {
      action: "verify_zero_assignment_readback", product_id: PRODUCT_IDS[1],
      operation_ref: inquiryOperation.operation_ref, result: "exact_readback",
      assignment_fingerprint_sha256: inquiryReadback.assignment_fingerprint_sha256,
      principal_fingerprint_sha256: null, readback_sha256: inquiryReadbackSha256,
    },
    {
      action: "replace_group_assignments", product_id: PRODUCT_IDS[0],
      operation_ref: matterOperation.operation_ref, result: "success",
      assignment_fingerprint_sha256: matterReadback.assignment_fingerprint_sha256,
      principal_fingerprint_sha256: controls.pilot_assignment.eligible_principal_fingerprint_sha256,
      readback_sha256: null,
    },
    {
      action: "verify_exact_roster_readback", product_id: PRODUCT_IDS[0],
      operation_ref: matterOperation.operation_ref, result: "exact_readback",
      assignment_fingerprint_sha256: matterReadback.assignment_fingerprint_sha256,
      principal_fingerprint_sha256: controls.pilot_assignment.eligible_principal_fingerprint_sha256,
      readback_sha256: matterReadbackSha256,
    },
  ];
  if (!Array.isArray(proof.assignment_transition) || proof.assignment_transition.length !== expected.length) {
    throw new Error("central assignment transition must contain the exact inquiry-safe-before-Matter sequence");
  }
  const start = utcMillis(controls.window_start_utc, "central transition window start");
  const end = utcMillis(controls.window_end_utc, "central transition window end");
  let previousObservedAt = null;
  for (const [index, step] of proof.assignment_transition.entries()) {
    assertExactKeys(step, [
      "action", "assignment_fingerprint_sha256", "observed_at_utc", "operation_ref",
      "principal_fingerprint_sha256", "product_id", "readback_sha256", "result", "sequence",
    ], "central assignment transition step");
    const observedAt = utcMillis(step.observed_at_utc, "central assignment transition observation");
    if (step.sequence !== index + 1
      || JSON.stringify(canonical(Object.fromEntries(
        Object.keys(expected[index]).map((key) => [key, step[key]]),
      ))) !== JSON.stringify(canonical(expected[index]))
      || observedAt < start || observedAt > end || observedAt > centralObservedAt
      || observedAt < controls.authorization.completedAt
      || (previousObservedAt != null && observedAt <= previousObservedAt)) {
      throw new Error("central assignment transition violated inquiry-safe-before-Matter risk order");
    }
    previousObservedAt = observedAt;
  }
}

function validateCentralProof(receipt, options, controls, staticProof) {
  const binding = controls.central_deployment_evidence;
  const loaded = readProtectedJsonProof(options.protectedEvidence, binding, "central_deployment");
  const proof = loaded.proof;
  assertProofBase(proof, "amic-os.m365-central-deployment-proof.v3", "central_deployment", options.expectedSourceIdentity, [
    "assignment_safety_evidence_sha256", "assignment_transition", "mutation_count", "observed_at_utc", "operations",
    "pilot_assignment_evidence_sha256", "pilot_assignment_fingerprint_sha256", "result",
    "static_proof_sha256", "static_readbacks", "readbacks", ...MUTATION_AUTHORIZATION_FIELDS,
  ]);
  if (proof.static_proof_sha256 !== staticProof.loaded.evidence_sha256
    || proof.pilot_assignment_evidence_sha256 !== controls.pilot_assignment.evidence_sha256
    || proof.pilot_assignment_fingerprint_sha256 !== controls.pilot_assignment.fingerprint_sha256
    || proof.assignment_safety_evidence_sha256 !== controls.assignment_safety_evidence.evidence_sha256
    || proof.mutation_count !== receipt.mutation_count || proof.result !== "verified") {
    throw new Error("central deployment proof is not bound to the authorized execution controls");
  }
  assertEqual(canonical(proof.operations), canonical(receipt.operations), "central deployment operations evidence");
  assertEqual(canonical(proof.static_readbacks), canonical(receipt.static_readbacks), "central static readback evidence");
  assertEqual(canonical(proof.readbacks), canonical(receipt.readbacks), "central M365 readback evidence");
  validateMutationAuthorization(proof, MUTATION_ACTIONS.central_deployment, controls, "central_deployment");
  const completedAt = m365CompletionMillis(proof.observed_at_utc, "central deployment observation", controls.validationCutoff);
  validateAssignmentTransition(proof, receipt, controls, completedAt);
  return { completedAt, loaded, proof };
}

export function validateM365CentralDeployment(receipt, options, controls, staticProof) {
  validateStaticReceipt(receipt, staticProof.result);
  validateProfileOperations(receipt, options, staticProof.result);
  const proof = validateCentralProof(receipt, options, controls, staticProof);
  if (receipt.claims.central_deployment_verified !== true) throw new Error("central deployment readback claim is missing");
  return proof;
}
