import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStaticDryRunPlan, sha256, validateApiArtifactEntries, validateApiArtifactRelease,
  validateStaticDryRunPlan,
} from "../lib/outlook-release-gates.mjs";
import {
  candidateManifestProjections, clone, contract, hex, inventory, oid, releaseCandidate,
  releaseContext, staticPlanFor,
} from "./helpers/outlook-release-fixtures.mjs";

test("API artifact verifier binds embedded source and preserves environment", () => {
  const artifactBytes = Buffer.from("deterministic-api-zip");
  const packageLockBytes = Buffer.from("package-lock");
  const lambdaTarget = {
    FunctionName: contract.api.function_name,
    FunctionArn: `arn:aws:lambda:${contract.api.region}:${contract.api.aws_account_id}:function:${contract.api.function_name}`,
  };
  const beforeConfiguration = { ...lambdaTarget, Environment: { Variables: { A: "one", B: "two" } } };
  const environment = {
    key_count: 2,
    keys_sha256: sha256(JSON.stringify(["A", "B"])),
    values_sha256: sha256(JSON.stringify({ A: "one", B: "two" })),
  };
  const receipt = {
    schema_version: "amic-os.outlook-api-release.v1", authorization_ref: null, mode: "dry-run",
    status: "artifact_verified_awaiting_authorized_deployment", source_sha: oid("a"), source_tree: oid("b"),
    package_lock_sha256: sha256(packageLockBytes), artifact_sha256: sha256(artifactBytes),
    lambda_code_sha256: sha256(artifactBytes, "base64"), function_name: contract.api.function_name,
    aws_account_id: contract.api.aws_account_id, region: contract.api.region,
    environment: { before: environment, preservation_status: "planned" }, mutation_count: 0,
    deployed_code_sha256: null,
  };
  const embeddedManifest = {
    schema_version: "amic-os.api-deployment-manifest.v1", source_sha: oid("a"), source_tree: oid("b"),
    package_lock_sha256: sha256(packageLockBytes), artifact_kind: "matter-lawos-api-prod",
  };
  const input = {
    receipt, artifactBytes, embeddedManifest, expectedSourceSha: oid("a"), expectedSourceTree: oid("b"),
    packageLockBytes, beforeConfiguration, contract,
  };
  assert.equal(validateApiArtifactRelease(input).status, receipt.status);
  assert.throws(() => validateApiArtifactRelease({ ...input, afterConfiguration: beforeConfiguration }), /overclaims/);
  const post = clone(receipt);
  post.mode = "post-deploy-readback";
  post.authorization_ref = "approved-api-change-window-20260808";
  post.status = "deployed_readback_verified";
  post.environment = { before: environment, after: environment, preservation_status: "verified" };
  post.mutation_count = 1;
  post.deployed_code_sha256 = receipt.lambda_code_sha256;
  const after = { ...beforeConfiguration, CodeSha256: receipt.lambda_code_sha256 };
  assert.equal(validateApiArtifactRelease({ ...input, receipt: post, afterConfiguration: after }).status, "deployed_readback_verified");
  const unauthorized = clone(post);
  unauthorized.authorization_ref = null;
  assert.throws(() => validateApiArtifactRelease({ ...input, receipt: unauthorized, afterConfiguration: after }), /authorization_ref/);
  const changed = { ...after, Environment: { Variables: { A: "changed", B: "two" } } };
  assert.throws(() => validateApiArtifactRelease({ ...input, receipt: post, afterConfiguration: changed }), /environment preservation/);
});

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
