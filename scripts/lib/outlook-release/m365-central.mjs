import {
  assertEqual, assertExactKeys, canonical, profileMap, requiredText,
} from "./primitives.mjs";
import { MUTATION_ACTIONS } from "./constants.mjs";
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

function validateCentralProof(receipt, options, controls, staticProof) {
  const binding = controls.central_deployment_evidence;
  const loaded = readProtectedJsonProof(options.protectedEvidence, binding, "central_deployment");
  const proof = loaded.proof;
  assertProofBase(proof, "amic-os.m365-central-deployment-proof.v1", "central_deployment", options.expectedSourceIdentity, [
    "mutation_count", "observed_at_utc", "operations", "pilot_assignment_fingerprint_sha256", "result",
    "static_proof_sha256", "static_readbacks", "readbacks", ...MUTATION_AUTHORIZATION_FIELDS,
  ]);
  if (proof.static_proof_sha256 !== staticProof.loaded.evidence_sha256
    || proof.pilot_assignment_fingerprint_sha256 !== controls.pilot_assignment.fingerprint_sha256
    || proof.mutation_count !== receipt.mutation_count || proof.result !== "verified") {
    throw new Error("central deployment proof is not bound to the authorized execution controls");
  }
  assertEqual(canonical(proof.operations), canonical(receipt.operations), "central deployment operations evidence");
  assertEqual(canonical(proof.static_readbacks), canonical(receipt.static_readbacks), "central static readback evidence");
  assertEqual(canonical(proof.readbacks), canonical(receipt.readbacks), "central M365 readback evidence");
  validateMutationAuthorization(proof, MUTATION_ACTIONS.central_deployment, controls, "central_deployment");
  const completedAt = m365CompletionMillis(proof.observed_at_utc, "central deployment observation", controls.validationCutoff);
  return { completedAt, loaded, proof };
}

export function validateM365CentralDeployment(receipt, options, controls, staticProof) {
  validateStaticReceipt(receipt, staticProof.result);
  validateProfileOperations(receipt, options, staticProof.result);
  const proof = validateCentralProof(receipt, options, controls, staticProof);
  if (receipt.claims.central_deployment_verified !== true) throw new Error("central deployment readback claim is missing");
  return proof;
}
