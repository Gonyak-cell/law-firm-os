import assert from "node:assert/strict";
import test from "node:test";

import {
  assertNoSensitiveMaterial, validateBuildInventories, validateCoveragePaths, validateDependencyLicenses,
  validateReleaseCandidateReceipt, validateReleaseContract, validateRollbackContract, validateSurfaceSeparation,
} from "../lib/outlook-release-gates.mjs";
import {
  baseline, clone, contract, hex, inventory, lockWithReleaseDependencies, releaseCandidate,
  releaseContext, rollback, surface,
} from "./helpers/outlook-release-fixtures.mjs";

test("release contract binds dual ProductIds, four manifests, and protected proof classes", () => {
  assert.deepEqual(validateReleaseContract(contract), {
    profile_count: 2, manifest_count: 4, release_version: "1.1.0.0",
  });
  const duplicate = clone(contract);
  duplicate.profiles[1].product_id = duplicate.profiles[0].product_id;
  assert.throws(() => validateReleaseContract(duplicate), /ProductIds/);
  const destructive = clone(contract);
  destructive.static_deploy.delete = true;
  assert.throws(() => validateReleaseContract(destructive), /additive \/addin and \/outlook-addin dry-run/);
  const untrusted = clone(contract);
  untrusted.m365.protected_evidence.reject_symlinks = false;
  assert.throws(() => validateReleaseContract(untrusted), /trust boundary/);
  const unauthorizedClass = clone(contract);
  unauthorizedClass.m365.required_mutation_actions.pop();
  assert.throws(() => validateReleaseContract(unauthorizedClass), /M365 mutation actions mismatch/);
});

test("surface and rollback preserve ProductId-specific events and immutable assignments", () => {
  assert.equal(validateSurfaceSeparation(surface, baseline, contract).permission_event_assignment_diff, "none");
  assert.equal(validateRollbackContract(rollback, baseline, contract).rollback_profile_count, 2);
  const eventLeak = clone(surface);
  eventLeak.profiles.find(({ profile }) => profile === "inquiry-only").manifest_fingerprint.launch_events = [
    "OnMessageSend:onMessageSendHandler:PromptUser",
  ];
  assert.throws(() => validateSurfaceSeparation(eventLeak, baseline, contract), /leaked/);
  const sharedRollback = clone(rollback);
  sharedRollback.profiles[1].protected_manifest_ref = sharedRollback.profiles[0].protected_manifest_ref;
  assert.throws(() => validateRollbackContract(sharedRollback, baseline, contract), /shared across rollback profiles/);
  const unknown = clone(surface);
  unknown.profiles.push({ ...unknown.profiles[0], product_id: "00000000-0000-0000-0000-000000000000" });
  assert.throws(() => validateSurfaceSeparation(unknown, baseline, contract), /ProductIds/);
});

test("dependency, coverage, and deterministic build gates fail closed", () => {
  const licenses = validateDependencyLicenses(lockWithReleaseDependencies(), contract);
  assert.ok(licenses.checked_package_count > 0);
  const unreviewed = lockWithReleaseDependencies();
  unreviewed.packages["node_modules/unreviewed"] = { version: "1.0.0", license: "GPL-3.0-only" };
  assert.throws(() => validateDependencyLicenses(unreviewed, contract), /not allowlisted/);
  const missing = lockWithReleaseDependencies();
  delete missing.packages["node_modules/docusign-esign"];
  assert.throws(() => validateDependencyLicenses(missing, contract), /required dependency/);

  const paths = new Set([...contract.required_release_paths, ...contract.required_test_paths]);
  assert.equal(validateCoveragePaths(paths, contract).required_path_count, paths.size);
  paths.delete(contract.required_release_paths[0]);
  assert.throws(() => validateCoveragePaths(paths, contract), /coverage paths are missing/);
  const first = inventory();
  assert.equal(validateBuildInventories(first, clone(first), contract).builds_identical, true);
  const changed = clone(first);
  changed.at(-1).sha256 = hex("f");
  assert.throws(() => validateBuildInventories(first, changed, contract), /deterministic double-build/);
  assert.throws(() => validateBuildInventories(first, first.concat({
    path: "bundle.js.map", byte_size: 1, sha256: hex("f"),
  }), contract), /forbidden build artifact/);
});

test("candidate receipt requires exact current source and every proof section", () => {
  const receipt = releaseCandidate();
  assert.equal(validateReleaseCandidateReceipt(receipt, contract, releaseContext).inventory_sha256, receipt.inventory_sha256);
  for (const field of ["coverage", "licenses", "rollback", "surface", "graph_scopes", "profiles", "contract_artifacts"]) {
    const missing = clone(receipt);
    delete missing[field];
    assert.throws(() => validateReleaseCandidateReceipt(missing, contract, releaseContext), /fields mismatch/);
  }
  const staleContract = clone(receipt);
  staleContract.contract_artifacts.surface.sha256 = hex("f");
  assert.throws(() => validateReleaseCandidateReceipt(staleContract, contract, releaseContext), /contract artifact bindings/);
  const unknownProduct = clone(receipt);
  unknownProduct.profiles[0].product_id = "00000000-0000-0000-0000-000000000000";
  assert.throws(() => validateReleaseCandidateReceipt(unknownProduct, contract, releaseContext), /ProductIds/);
  const overclaim = clone(receipt);
  overclaim.deployment_verified = true;
  assert.throws(() => validateReleaseCandidateReceipt(overclaim, contract, releaseContext), /fields mismatch/);
  assert.throws(() => validateReleaseCandidateReceipt(receipt, contract, {
    ...releaseContext, expectedSourceIdentity: null,
  }), /exact lockfile and frozen proof contracts/);
});

test("receipts reject raw secrets and content fields", () => {
  assert.doesNotThrow(() => assertNoSensitiveMaterial({ secret_reference: "secretsmanager-ref" }));
  assert.throws(() => assertNoSensitiveMaterial({ refresh_token: "not-allowed" }), /forbidden field/);
  assert.throws(() => assertNoSensitiveMaterial({ note: "client_secret=abcdefghijklmnopqrstuvwxyz" }), /secret-like/);
});
