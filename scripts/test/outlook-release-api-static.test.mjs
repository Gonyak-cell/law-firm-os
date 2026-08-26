import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStaticDryRunPlan, validateApiArtifactEntries, validateStaticDryRunPlan,
} from "../lib/outlook-release-gates.mjs";
import {
  candidateManifestProjections, clone, contract, hex, inventory, oid, releaseCandidate,
  releaseContext, staticPlanFor,
} from "./helpers/outlook-release-fixtures.mjs";

test("API archive entry gate rejects duplicates and traversal", () => {
  assert.deepEqual(validateApiArtifactEntries(["index.js", "deployment-manifest.json"], "deployment-manifest.json"), {
    entry_count: 2, embedded_manifest_path: "deployment-manifest.json",
  });
  assert.throws(() => validateApiArtifactEntries([
    "deployment-manifest.json", "deployment-manifest.json",
  ], "deployment-manifest.json"), /unsafe or duplicate/);
  assert.throws(() => validateApiArtifactEntries(["../deployment-manifest.json"], "deployment-manifest.json"), /unsafe/);
});

test("static planner partitions exact /addin and /outlook-addin inventories", () => {
  const hashes = { "matter-full": hex("1"), "inquiry-only": hex("2") };
  const releaseReceipt = releaseCandidate(hashes);
  const sourceLocations = Object.fromEntries(Object.entries(candidateManifestProjections()).map(([profile, value]) => [
    profile, value.form_source_locations,
  ]));
  const plan = staticPlanFor(hashes);
  assert.deepEqual(plan.profiles.map(({ target_prefix }) => target_prefix), ["addin/", "outlook-addin/"]);
  assert.ok(plan.profiles.every(({ source_location_coverage }) => source_location_coverage === true));
  assert.ok(plan.profiles.every(({ manifest_publish_mode }) => manifest_publish_mode === "m365_central_deployment_only"));
  assert.deepEqual(validateStaticDryRunPlan(plan, { contract, releaseReceipt, releaseContext, sourceLocations }), {
    operation_count: inventory().length, mutation_count: 0, execution_performed: false,
  });
  const destructive = clone(plan);
  destructive.delete = true;
  assert.throws(() => validateStaticDryRunPlan(destructive, { contract, releaseReceipt, releaseContext, sourceLocations }), /escaped/);
  const sourceDrift = clone(plan);
  sourceDrift.profiles[0].operations[0].source_path = "apps/addin/dist/wrong.js";
  assert.throws(() => validateStaticDryRunPlan(sourceDrift, { contract, releaseReceipt, releaseContext, sourceLocations }), /source\/target mapping drifted/);
  const traversal = clone(plan);
  traversal.profiles[1].operations[0].target_key = "outlook-addin/../escape.js";
  assert.throws(() => validateStaticDryRunPlan(traversal, { contract, releaseReceipt, releaseContext, sourceLocations }), /source\/target mapping drifted|unsafe/);
  const protectedManifest = clone(plan);
  protectedManifest.profiles[0].operations[0].target_key = "addin/manifests/current.xml";
  assert.throws(() => validateStaticDryRunPlan(protectedManifest, { contract, releaseReceipt, releaseContext, sourceLocations }), /source\/target mapping drifted/);
  const falseCoverage = clone(plan);
  falseCoverage.profiles[1].source_location_coverage = false;
  assert.throws(() => validateStaticDryRunPlan(falseCoverage, { contract, releaseReceipt, releaseContext, sourceLocations }), /namespace binding drifted/);
  const unknown = clone(plan);
  unknown.profiles[1].product_id = "00000000-0000-0000-0000-000000000000";
  assert.throws(() => validateStaticDryRunPlan(unknown, { contract, releaseReceipt, releaseContext, sourceLocations }), /ProductIds/);
  assert.throws(() => buildStaticDryRunPlan({
    releaseReceipt, releaseContext,
    sourceLocations: { ...sourceLocations, "inquiry-only": ["https://static.amic-os.internal/addin/index.html"] },
    contract, bucketRef: "OUTLOOK_STATIC_BUCKET",
  }), /escaped \/outlook-addin\//);
});

test("static planner stages only create-only content-addressed objects before cutover", () => {
  const plan = staticPlanFor();

  assert.equal(plan.schema_version, "amic-os.outlook-static-deploy-plan.v2");
  assert.equal(plan.alias_mutation_count, 0);
  assert.equal(plan.overwrite_existing, false);
  assert.equal(plan.content_address_algorithm, "sha256");
  assert.deepEqual(plan.staging_invalidation_paths, []);

  for (const profile of plan.profiles) {
    for (const operation of profile.operations) {
      assert.equal(operation.if_none_match, "*");
      assert.equal(operation.overwrite_allowed, false);
      assert.equal(operation.alias_target_key.startsWith(profile.target_prefix), true);
      assert.match(
        operation.target_key,
        new RegExp(`^${profile.immutable_target_prefix}${operation.sha256}/`, "u"),
      );
      assert.notEqual(operation.target_key, operation.alias_target_key);
    }
  }
});
