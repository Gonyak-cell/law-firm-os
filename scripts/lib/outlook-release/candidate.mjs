import {
  CANDIDATE_ALLOWED_CLAIM, CANDIDATE_BLOCKED_CLAIM, CLIENT_SCOPE_FINGERPRINT_SHA256, GIT_OID, SHA256,
} from "./constants.mjs";
import { validateBuildInventories } from "./build.mjs";
import {
  validateCoveragePaths, validateSurfaceSeparation,
} from "./candidate-proofs.mjs";
import { validateRollbackContract } from "./rollback-contract.mjs";
import { validateReleaseContract } from "./contract.mjs";
import { validateDependencyLicenses } from "./license.mjs";
import {
  assertEqual, assertExactKeys, assertSafeRelativePath, assertSha256, canonical, profileMap, sha256,
} from "./primitives.mjs";

export function validateReleaseCandidateReceipt(receipt, contract, context) {
  validateReleaseContract(contract);
  assertExactKeys(receipt, [
    "allowed_claim", "artifact_count", "blocked_claim", "builds_identical", "contract_artifacts",
    "coverage", "event_runtime", "exact_sha_bound", "external_mutations", "graph_scopes", "inventory",
    "inventory_sha256", "licenses", "manifest_validation", "package_lock_sha256", "profile_artifacts",
    "profiles", "rollback", "runtime_provider_calls", "schema_version", "source_sha", "source_tree",
    "surface", "verdict",
  ], "release candidate receipt");
  if (receipt.schema_version !== "amic-os.outlook-release-candidate.v1" || receipt.verdict !== "PASS"
    || receipt.exact_sha_bound !== true || receipt.builds_identical !== true
    || !GIT_OID.test(receipt.source_sha ?? "") || !GIT_OID.test(receipt.source_tree ?? "")
    || !SHA256.test(receipt.package_lock_sha256 ?? "") || receipt.runtime_provider_calls !== 0
    || receipt.external_mutations !== 0 || receipt.allowed_claim !== CANDIDATE_ALLOWED_CLAIM
    || receipt.blocked_claim !== CANDIDATE_BLOCKED_CLAIM) {
    throw new Error("a passing zero-mutation exact-SHA release candidate receipt is required");
  }
  if (!context?.packageLock || !context.packageLockBytes || !context.baseline || !context.rollback
    || !context.surface || !context.contractArtifacts || !context.existingPaths
    || !context.expectedSourceIdentity || !context.manifestHashesByPath) {
    throw new Error("release candidate validation requires the exact lockfile and frozen proof contracts");
  }
  if (receipt.package_lock_sha256 !== sha256(context.packageLockBytes)) {
    throw new Error("release candidate package lock binding drifted");
  }
  if (receipt.source_sha !== context.expectedSourceIdentity.source_sha
    || receipt.source_tree !== context.expectedSourceIdentity.source_tree
    || receipt.package_lock_sha256 !== context.expectedSourceIdentity.package_lock_sha256) {
    throw new Error("release candidate is stale for the exact current source SHA/tree/lock");
  }
  const artifactRefs = {
    baseline: contract.baseline_receipt,
    release_gate: "contracts/outlook-addin-release-gates.json",
    rollback: contract.rollback_contract,
    surface: contract.surface_contract,
  };
  assertExactKeys(receipt.contract_artifacts, Object.keys(artifactRefs), "release candidate contract_artifacts");
  assertEqual(canonical(receipt.contract_artifacts), canonical(context.contractArtifacts), "release candidate contract artifact bindings");
  for (const [name, ref] of Object.entries(artifactRefs)) {
    assertExactKeys(receipt.contract_artifacts[name], ["ref", "sha256"], `${name} contract artifact`);
    if (receipt.contract_artifacts[name].ref !== ref
      || assertSafeRelativePath(receipt.contract_artifacts[name].ref, `${name} contract artifact ref`) !== ref) {
      throw new Error(`${name} contract artifact reference drifted`);
    }
    assertSha256(receipt.contract_artifacts[name].sha256, `${name} contract artifact`);
  }
  for (const entry of receipt.inventory ?? []) {
    assertExactKeys(entry, ["byte_size", "path", "sha256"], "release candidate inventory entry");
  }
  const build = validateBuildInventories(receipt.inventory ?? [], receipt.inventory ?? [], contract);
  if (receipt.artifact_count !== build.artifact_count || receipt.inventory_sha256 !== build.inventory_sha256) {
    throw new Error("release candidate inventory summary drifted");
  }
  const artifacts = profileMap(receipt.profile_artifacts, "release candidate artifacts");
  const bundleHashes = new Set();
  for (const expected of contract.profiles) {
    const artifact = artifacts.get(expected.product_id);
    assertExactKeys(artifact, [
      "bundle_path", "bundle_sha256", "product_id", "profile", "taskpane_html_path", "taskpane_html_sha256",
    ], `${expected.profile} release candidate artifact`);
    const taskpane = build.inventory.find(({ path: file }) => file === expected.taskpane_html);
    const bundle = build.inventory.find(({ path: file }) => file === artifact.bundle_path);
    if (artifact.profile !== expected.profile || artifact.taskpane_html_path !== expected.taskpane_html
      || artifact.taskpane_html_sha256 !== taskpane?.sha256
      || !assertSafeRelativePath(artifact.bundle_path, `${expected.profile} bundle_path`)
      || artifact.bundle_sha256 !== bundle?.sha256) {
      throw new Error(`${expected.profile} release candidate artifact binding drifted`);
    }
    bundleHashes.add(artifact.bundle_sha256);
  }
  if (bundleHashes.size !== 2) throw new Error("release candidate task-pane bundles must remain independent");
  assertExactKeys(receipt.event_runtime, ["byte_size", "path", "sha256"], "release candidate event runtime");
  const eventRuntime = build.inventory.find(({ path: file }) => file === "event-runtime.js");
  if (JSON.stringify(receipt.event_runtime) !== JSON.stringify(eventRuntime)) {
    throw new Error("release candidate event runtime binding drifted");
  }
  assertExactKeys(receipt.manifest_validation, ["manifests", "official_validation_count", "validator"], "manifest validation receipt");
  if (receipt.manifest_validation.validator !== "office-addin-manifest@2.1.6"
    || receipt.manifest_validation.official_validation_count !== 4) {
    throw new Error("four official manifest validations are required");
  }
  const manifestByPath = new Map();
  for (const manifest of receipt.manifest_validation.manifests ?? []) {
    assertExactKeys(manifest, ["path", "sha256"], "manifest validation entry");
    if (!contract.manifests.includes(manifest.path) || manifestByPath.has(manifest.path)
      || !SHA256.test(manifest.sha256 ?? "") || manifest.sha256 !== context.manifestHashesByPath[manifest.path]) {
      throw new Error(`release candidate manifest receipt is invalid: ${manifest.path}`);
    }
    manifestByPath.set(manifest.path, manifest);
  }
  if (manifestByPath.size !== 4 || contract.manifests.some((manifest) => !manifestByPath.has(manifest))) {
    throw new Error("release candidate receipt must contain all four manifest hashes");
  }
  const candidateProfiles = profileMap(receipt.profiles, "release candidate manifest profiles");
  for (const expected of contract.profiles) {
    const profile = candidateProfiles.get(expected.product_id);
    assertExactKeys(profile, [
      "mailbox_min_version", "manifest_sha256", "permission", "product_id", "profile", "version",
    ], `${expected.profile} release candidate manifest profile`);
    if (profile.profile !== expected.profile || profile.version !== contract.release_version
      || profile.permission !== expected.permission || profile.mailbox_min_version !== expected.mailbox_min_version
      || profile.manifest_sha256 !== manifestByPath.get(expected.production_manifest)?.sha256) {
      throw new Error(`${expected.profile} manifest profile binding drifted`);
    }
  }
  assertExactKeys(receipt.coverage, ["required_path_count"], "release candidate coverage");
  assertEqual(receipt.coverage, validateCoveragePaths(context.existingPaths, contract), "release candidate coverage");
  assertEqual(canonical(receipt.licenses), canonical(validateDependencyLicenses(context.packageLock, contract)), "release candidate licenses");
  assertEqual(receipt.rollback, validateRollbackContract(context.rollback, context.baseline, contract), "release candidate rollback proof");
  assertEqual(receipt.surface, validateSurfaceSeparation(context.surface, context.baseline, contract), "release candidate surface proof");
  const graphScopes = [...contract.client_outlook_graph_connection_scopes].sort();
  // OAuth scope bytes are serialized in the delegated client request. Do not
  // sort this receipt field: a reordered set must fail exact release binding.
  const oauthScopes = [...contract.client_outlook_oauth_scopes];
  assertExactKeys(receipt.graph_scopes, ["diff", "fingerprint_sha256", "graph_connection_scopes", "oauth_scopes"], "release candidate graph scopes");
  assertEqual(receipt.graph_scopes, {
    graph_connection_scopes: graphScopes,
    oauth_scopes: oauthScopes,
    fingerprint_sha256: CLIENT_SCOPE_FINGERPRINT_SHA256,
    diff: "none",
  }, "release candidate Graph scope proof");
  return build;
}
