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
  const unreviewedOverride = clone(contract);
  unreviewedOverride.license_metadata_overrides = {
    ...(unreviewedOverride.license_metadata_overrides ?? {}),
    "node_modules/unreviewed": {
      name: "unreviewed", version: "1.0.0", license: "MIT",
      integrity: "sha512-unreviewed", resolved: "https://registry.npmjs.org/unreviewed/-/unreviewed-1.0.0.tgz",
    },
  };
  assert.throws(() => validateReleaseContract(unreviewedOverride), /license metadata overrides/);
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
  assert.ok(licenses.licenses["(MIT AND Zlib)"] > 0);
  assert.ok(licenses.licenses["(MIT OR GPL-3.0-or-later)"] > 0);
  assert.deepEqual(licenses.license_metadata_overrides, contract.license_metadata_overrides);
  const unreviewed = lockWithReleaseDependencies();
  unreviewed.packages["node_modules/unreviewed"] = { version: "1.0.0", license: "GPL-3.0-only" };
  assert.throws(() => validateDependencyLicenses(unreviewed, contract), /not allowlisted/);
  const unreviewedAlternative = lockWithReleaseDependencies();
  unreviewedAlternative.packages["node_modules/unreviewed"] = {
    version: "1.0.0", license: "(MIT OR AGPL-3.0-only)",
  };
  assert.throws(() => validateDependencyLicenses(unreviewedAlternative, contract), /not allowlisted/);
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

test("dependency license allowlist rejects unreviewed raw expressions", () => {
  for (const license of [
    "GPL-3.0-only", "(MIT OR AGPL-3.0-only)", "(GPL-3.0-or-later OR MIT)",
    "MIT OR GPL-3.0-or-later", "(MIT OR BSD-3-Clause)",
  ]) {
    const lock = lockWithReleaseDependencies();
    lock.packages["node_modules/unreviewed"] = { version: "1.0.0", license };
    assert.throws(() => validateDependencyLicenses(lock, contract), /not allowlisted/);
  }
});

test("legacy license metadata override rejects lock identity drift", () => {
  const path = "node_modules/passport-strategy";
  for (const [field, value] of [
    ["version", "1.0.1"],
    ["integrity", "sha512-drifted"],
    ["resolved", "https://registry.npmjs.org/passport-strategy/-/passport-strategy-1.0.1.tgz"],
  ]) {
    const lock = lockWithReleaseDependencies();
    lock.packages[path][field] = value;
    assert.throws(() => validateDependencyLicenses(lock, contract), /license metadata override binding drifted/);
  }
});

test("legacy license metadata override rejects missing, stale, and malformed controls", () => {
  const path = "node_modules/passport-strategy";
  const missing = clone(contract);
  delete missing.license_metadata_overrides?.[path];
  assert.throws(() => validateDependencyLicenses(lockWithReleaseDependencies(), missing), /license metadata overrides/);

  const unknownPackage = lockWithReleaseDependencies();
  unknownPackage.packages["node_modules/unreviewed"] = {
    version: "1.0.0", integrity: "sha512-unreviewed",
    resolved: "https://registry.npmjs.org/unreviewed/-/unreviewed-1.0.0.tgz",
  };
  assert.throws(() => validateDependencyLicenses(unknownPackage, contract), /no approved metadata override/);

  const stale = lockWithReleaseDependencies();
  stale.packages[path].license = "MIT";
  assert.throws(() => validateDependencyLicenses(stale, contract), /stale or unused/);

  for (const license of [null, "", 42]) {
    const malformed = lockWithReleaseDependencies();
    malformed.packages[path].license = license;
    assert.throws(() => validateDependencyLicenses(malformed, contract), /license property is malformed/);
  }
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
