import { GIT_OID, SHA256 } from "./constants.mjs";
import { validateReleaseCandidateReceipt } from "./candidate.mjs";
import {
  assertEqual, assertExactKeys, assertNoSensitiveMaterial, assertSafeRelativePath, profileMap, sorted,
} from "./primitives.mjs";

const RECEIPT_KEYS = [
  "authorization_ref", "claims", "execution_control", "go_live_approval_ref", "graph_delegated_scope_diff",
  "host_evidence", "mutation_count", "operations", "package_lock_sha256", "permission_event_assignment_diff",
  "prerequisites", "profiles", "propagation_observations", "propagation_window_is_sla", "readbacks",
  "schema_version", "source_sha", "source_tree", "static_readbacks", "static_release", "status", "version",
];

function validateReceiptProfiles(receipt, options) {
  const { contract, baseline, rollback, releaseCandidate, candidateManifestHashes, candidateManifestProjections } = options;
  const receiptProfiles = profileMap(receipt.profiles, "M365 receipt");
  const baselineProfiles = profileMap(baseline.profiles, "deployment baseline");
  const rollbackProfiles = profileMap(rollback.profiles, "rollback contract");
  const bundleHashes = new Set();
  for (const expected of contract.profiles) {
    const current = receiptProfiles.get(expected.product_id);
    const deployed = baselineProfiles.get(expected.product_id);
    const fallback = rollbackProfiles.get(expected.product_id);
    const artifact = releaseCandidate.profile_artifacts?.find(({ product_id }) => product_id === expected.product_id);
    const manifestReceipt = releaseCandidate.manifest_validation?.manifests
      ?.find(({ path }) => path === expected.production_manifest);
    const candidateManifestSha = candidateManifestHashes?.[expected.profile];
    const projection = candidateManifestProjections?.[expected.profile];
    assertExactKeys(current, [
      "assignment_count", "assignment_fingerprint_sha256", "bundle_sha256", "candidate_manifest_sha256",
      "deployment_mode", "permission", "product_id", "profile", "rollback_manifest_ref",
      "rollback_manifest_sha256", "source_locations",
    ], `${expected.profile} M365 profile`);
    if (current.profile !== expected.profile || current.permission !== expected.permission
      || current.deployment_mode !== "fixed" || !SHA256.test(current.candidate_manifest_sha256 ?? "")
      || !SHA256.test(current.bundle_sha256 ?? "") || current.candidate_manifest_sha256 !== candidateManifestSha
      || manifestReceipt?.sha256 !== candidateManifestSha || current.bundle_sha256 !== artifact?.bundle_sha256
      || current.candidate_manifest_sha256 === fallback.rollback_manifest_sha256
      || JSON.stringify(current.source_locations) !== JSON.stringify(projection?.form_source_locations)
      || current.assignment_count !== deployed.assignment_count
      || current.assignment_fingerprint_sha256 !== deployed.assignment_fingerprint_sha256
      || current.rollback_manifest_sha256 !== fallback.rollback_manifest_sha256
      || current.rollback_manifest_ref !== fallback.protected_manifest_ref) {
      throw new Error(`${expected.profile} M365 candidate/assignment/rollback binding drifted`);
    }
    bundleHashes.add(current.bundle_sha256);
  }
  if (bundleHashes.size !== 2) throw new Error("Matter and inquiry task-pane bundles must remain independent");
  return { receiptProfiles, baselineProfiles, rollbackProfiles };
}

function validatePrerequisitePackets(receipt, contract) {
  const prerequisites = receipt.prerequisites ?? {};
  assertEqual(sorted(Object.keys(prerequisites)), sorted(contract.m365.required_prerequisites ?? []), "M365 prerequisite names");
  for (const name of contract.m365.required_prerequisites ?? []) {
    const prerequisite = prerequisites[name];
    assertExactKeys(prerequisite, [
      "artifact_sha256", "evidence_ref", "evidence_sha256", "package_lock_sha256", "source_sha", "source_tree", "status",
    ], `${name} prerequisite`);
    if (!prerequisite || !["pending", "verified"].includes(prerequisite.status)) {
      throw new Error(`M365 release prerequisite status is missing: ${name}`);
    }
    if (prerequisite.status === "verified") {
      if (!SHA256.test(prerequisite.evidence_sha256 ?? "") || !SHA256.test(prerequisite.artifact_sha256 ?? "")
        || prerequisite.source_sha !== receipt.source_sha || prerequisite.source_tree !== receipt.source_tree
        || prerequisite.package_lock_sha256 !== receipt.package_lock_sha256
        || assertSafeRelativePath(prerequisite.evidence_ref, `${name}.evidence_ref`) !== prerequisite.evidence_ref) {
        throw new Error(`M365 release prerequisite evidence is incomplete: ${name}`);
      }
    } else if ([
      prerequisite.artifact_sha256, prerequisite.evidence_sha256, prerequisite.evidence_ref,
      prerequisite.package_lock_sha256, prerequisite.source_sha, prerequisite.source_tree,
    ].some((value) => value != null)) {
      throw new Error(`pending M365 release prerequisite must not imply evidence: ${name}`);
    }
  }
  return prerequisites;
}

export function validateM365Envelope(receipt, options) {
  const { contract, releaseCandidate, releaseContext, expectedSourceIdentity } = options;
  assertNoSensitiveMaterial(receipt, "M365 release receipt");
  assertExactKeys(receipt, RECEIPT_KEYS, "M365 release receipt");
  if (receipt.schema_version !== "amic-os.outlook-m365-release.v1" || !GIT_OID.test(receipt.source_sha ?? "")
    || !GIT_OID.test(receipt.source_tree ?? "") || !SHA256.test(receipt.package_lock_sha256 ?? "")
    || receipt.version !== contract.release_version || receipt.permission_event_assignment_diff !== "none"
    || receipt.graph_delegated_scope_diff !== "none" || receipt.propagation_window_is_sla !== false) {
    throw new Error("M365 release receipt identity, source, scope, or propagation contract drifted");
  }
  if (!expectedSourceIdentity || receipt.source_sha !== expectedSourceIdentity.source_sha
    || receipt.source_tree !== expectedSourceIdentity.source_tree
    || receipt.package_lock_sha256 !== expectedSourceIdentity.package_lock_sha256) {
    throw new Error("M365 release receipt is stale for the exact current source SHA/tree/lock");
  }
  validateReleaseCandidateReceipt(releaseCandidate, contract, releaseContext);
  if (releaseCandidate.source_sha !== receipt.source_sha || releaseCandidate.source_tree !== receipt.source_tree
    || releaseCandidate.package_lock_sha256 !== receipt.package_lock_sha256
    || releaseCandidate.builds_identical !== true) {
    throw new Error("M365 receipt is not bound to a passing exact-SHA release candidate");
  }
  const profiles = validateReceiptProfiles(receipt, options);
  const prerequisites = validatePrerequisitePackets(receipt, contract);
  assertExactKeys(receipt.claims, [
    "central_deployment_verified", "go_live_approved", "propagation_verified", "real_outlook_verified",
  ], "M365 claims");
  if (Object.values(receipt.claims).some((claim) => typeof claim !== "boolean")) {
    throw new Error("M365 completion claims must be boolean");
  }
  return { ...profiles, prerequisites };
}
