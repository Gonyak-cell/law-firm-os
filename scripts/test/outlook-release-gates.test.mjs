import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertNoSensitiveMaterial,
  buildStaticDryRunPlan,
  sha256,
  validateApiArtifactEntries,
  validateApiArtifactRelease,
  validateBuildInventories,
  validateCoveragePaths,
  validateDependencyLicenses,
  validateM365ReleaseReceipt,
  validateReleaseCandidateReceipt,
  validateReleaseContract,
  validateRollbackContract,
  validateStaticDryRunPlan,
  validateSurfaceSeparation,
} from "../lib/outlook-release-gates.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readBytes = async (relative) => readFile(path.join(repoRoot, relative));
const readJson = async (relative) => JSON.parse(await readBytes(relative));
const contractRef = "contracts/outlook-addin-release-gates.json";
const contractBytes = await readBytes(contractRef);
const contract = JSON.parse(contractBytes);
const baselineBytes = await readBytes(contract.baseline_receipt);
const rollbackBytes = await readBytes(contract.rollback_contract);
const surfaceBytes = await readBytes(contract.surface_contract);
const baseline = JSON.parse(baselineBytes);
const rollback = JSON.parse(rollbackBytes);
const surface = JSON.parse(surfaceBytes);
const packageLock = await readJson("package-lock.json");
const hex = (character) => character.repeat(64);
const oid = (character) => character.repeat(40);

function clone(value) {
  return structuredClone(value);
}

function workflowEventPaths(source, eventName) {
  const lines = source.split(/\r?\n/u);
  const start = lines.findIndex((line) => line === `  ${eventName}:`);
  if (start < 0) throw new Error(`workflow event is missing: ${eventName}`);
  const end = lines.findIndex((line, index) => index > start && /^  [a-z_]+:/u.test(line));
  const section = lines.slice(start, end < 0 ? undefined : end);
  const paths = section.findIndex((line) => line === "    paths:");
  if (paths < 0) throw new Error(`workflow paths are missing: ${eventName}`);
  return section.slice(paths + 1)
    .map((line) => line.match(/^      - "([^"]+)"$/u)?.[1])
    .filter(Boolean);
}

function workflowPathMatches(pattern, candidate) {
  let expression = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    if (pattern[index] === "*" && pattern[index + 1] === "*") {
      expression += ".*";
      index += 1;
    } else if (pattern[index] === "*") {
      expression += "[^/]*";
    } else {
      expression += pattern[index].replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    }
  }
  return new RegExp(`${expression}$`, "u").test(candidate);
}

function workflowSingleLineRuns(source) {
  return source.split(/\r?\n/u)
    .map((line) => line.match(/^        run: (.+)$/u)?.[1])
    .filter(Boolean);
}

function lockWithReleaseDependencies() {
  const lock = clone(packageLock);
  lock.packages["node_modules/docx"] = { version: "9.7.1", license: "MIT" };
  lock.packages["node_modules/docusign-esign"] = { version: "10.0.0", license: "MIT" };
  return lock;
}

function inventory() {
  return contract.build.required_static_paths.map((file, index) => ({
    path: file,
    byte_size: index + 1,
    sha256: sha256(file),
  })).concat([
    { path: "assets/matter.js", byte_size: 10, sha256: hex("d") },
    { path: "outlook-addin/assets/inquiry.js", byte_size: 11, sha256: hex("e") },
  ]);
}

const fixturePackageLock = lockWithReleaseDependencies();
const fixturePackageLockBytes = Buffer.from(JSON.stringify(fixturePackageLock));
const sourceIdentity = {
  source_sha: oid("a"),
  source_tree: oid("b"),
  package_lock_sha256: sha256(fixturePackageLockBytes),
};
const contractArtifacts = {
  baseline: { ref: contract.baseline_receipt, sha256: sha256(baselineBytes) },
  release_gate: { ref: contractRef, sha256: sha256(contractBytes) },
  rollback: { ref: contract.rollback_contract, sha256: sha256(rollbackBytes) },
  surface: { ref: contract.surface_contract, sha256: sha256(surfaceBytes) },
};
const releaseContext = {
  baseline,
  contractArtifacts,
  existingPaths: new Set([...contract.required_release_paths, ...contract.required_test_paths]),
  expectedSourceIdentity: sourceIdentity,
  manifestHashesByPath: Object.fromEntries(contract.manifests.map((manifest) => {
    const profile = contract.profiles.find(({ production_manifest }) => production_manifest === manifest);
    return [manifest, profile ? (profile.profile === "matter-full" ? hex("1") : hex("2")) : sha256(manifest)];
  })),
  packageLock: fixturePackageLock,
  packageLockBytes: fixturePackageLockBytes,
  rollback,
  surface,
};

function releaseCandidate(candidateManifestHashes) {
  const build = validateBuildInventories(inventory(), inventory(), contract);
  return {
    schema_version: "amic-os.outlook-release-candidate.v1",
    verdict: "PASS",
    ...sourceIdentity,
    exact_sha_bound: true,
    builds_identical: true,
    artifact_count: build.artifact_count,
    inventory_sha256: build.inventory_sha256,
    inventory: build.inventory,
    profile_artifacts: contract.profiles.map((profile, index) => ({
      profile: profile.profile,
      product_id: profile.product_id,
      taskpane_html_path: profile.taskpane_html,
      taskpane_html_sha256: build.inventory.find(({ path: file }) => file === profile.taskpane_html).sha256,
      bundle_path: index ? "outlook-addin/assets/inquiry.js" : "assets/matter.js",
      bundle_sha256: index ? hex("e") : hex("d"),
    })),
    event_runtime: build.inventory.find(({ path: file }) => file === "event-runtime.js"),
    manifest_validation: {
      validator: "office-addin-manifest@2.1.6",
      official_validation_count: 4,
      manifests: contract.manifests.map((manifest) => {
        const profile = contract.profiles.find(({ production_manifest }) => production_manifest === manifest);
        return { path: manifest, sha256: profile ? candidateManifestHashes[profile.profile] : sha256(manifest) };
      }),
    },
    profiles: contract.profiles.map((profile) => ({
      profile: profile.profile,
      product_id: profile.product_id,
      version: contract.release_version,
      permission: profile.permission,
      mailbox_min_version: profile.mailbox_min_version,
      manifest_sha256: candidateManifestHashes[profile.profile],
    })),
    coverage: { required_path_count: contract.required_release_paths.length + contract.required_test_paths.length },
    licenses: validateDependencyLicenses(fixturePackageLock, contract),
    rollback: validateRollbackContract(rollback, baseline, contract),
    surface: validateSurfaceSeparation(surface, baseline, contract),
    graph_scopes: {
      graph_connection_scopes: [...contract.client_outlook_graph_connection_scopes].sort(),
      oauth_scopes: [...contract.client_outlook_oauth_scopes].sort(),
      fingerprint_sha256: sha256(JSON.stringify({
        graphScopes: [...contract.client_outlook_graph_connection_scopes].sort(),
        oauthScopes: [...contract.client_outlook_oauth_scopes].sort(),
      })),
      diff: "none",
    },
    contract_artifacts: contractArtifacts,
    runtime_provider_calls: 0,
    external_mutations: 0,
    allowed_claim: "Exact source, deterministic local build, four official manifest validations, frozen profile drift, rollback metadata, and dependency licenses passed.",
    blocked_claim: "This receipt is not API/static/M365 deployment, propagation, real Outlook host, Graph delivery, DocuSign sandbox, or go-live evidence.",
  };
}

function candidateManifestProjections() {
  return {
    "matter-full": { form_source_locations: ["https://static.example/addin/index.html"] },
    "inquiry-only": { form_source_locations: ["https://static.example/outlook-addin/index.html"] },
  };
}

function awaitingM365Receipt(candidateManifestHashes) {
  return {
    schema_version: "amic-os.outlook-m365-release.v1",
    status: "awaiting_authorized_deployment",
    ...sourceIdentity,
    version: contract.release_version,
    permission_event_assignment_diff: "none",
    graph_delegated_scope_diff: "none",
    propagation_window_is_sla: false,
    prerequisites: Object.fromEntries(contract.m365.required_prerequisites.map((name) => [name, {
      status: "pending",
      artifact_sha256: null,
      evidence_sha256: null,
      evidence_ref: null,
      source_sha: null,
      source_tree: null,
      package_lock_sha256: null,
    }])),
    authorization_ref: null,
    go_live_approval_ref: null,
    mutation_count: 0,
    profiles: contract.profiles.map((profile, index) => {
      const deployed = baseline.profiles.find(({ product_id }) => product_id === profile.product_id);
      const fallback = rollback.profiles.find(({ product_id }) => product_id === profile.product_id);
      return {
        profile: profile.profile,
        product_id: profile.product_id,
        permission: profile.permission,
        deployment_mode: "fixed",
        source_locations: candidateManifestProjections()[profile.profile].form_source_locations,
        candidate_manifest_sha256: candidateManifestHashes[profile.profile],
        bundle_sha256: index ? hex("e") : hex("d"),
        assignment_count: deployed.assignment_count,
        assignment_fingerprint_sha256: deployed.assignment_fingerprint_sha256,
        rollback_manifest_sha256: fallback.rollback_manifest_sha256,
        rollback_manifest_ref: fallback.protected_manifest_ref,
      };
    }),
    operations: [],
    static_release: null,
    static_readbacks: [],
    readbacks: [],
    propagation_observations: [],
    host_evidence: [],
    claims: {
      central_deployment_verified: false,
      propagation_verified: false,
      real_outlook_verified: false,
      go_live_approved: false,
    },
  };
}

function staticPlanFor(candidateManifestHashes) {
  return buildStaticDryRunPlan({
    releaseReceipt: releaseCandidate(candidateManifestHashes),
    releaseContext,
    sourceLocations: Object.fromEntries(Object.entries(candidateManifestProjections()).map(([profile, projection]) => [
      profile,
      projection.form_source_locations,
    ])),
    contract,
    bucketRef: "OUTLOOK_STATIC_BUCKET",
  });
}

function completedM365Fixture(candidateManifestHashes) {
  const receipt = awaitingM365Receipt(candidateManifestHashes);
  const candidate = releaseCandidate(candidateManifestHashes);
  const staticPlan = staticPlanFor(candidateManifestHashes);
  const staticPlanSha256 = sha256(Buffer.from(`${JSON.stringify(staticPlan, null, 2)}\n`));
  receipt.status = "deployment_verified";
  receipt.prerequisites = Object.fromEntries(contract.m365.required_prerequisites.map((name) => [name, {
    status: "verified",
    artifact_sha256: name === "static_release" ? candidate.inventory_sha256 : sha256(`${name}:artifact`),
    evidence_sha256: name === "static_release" ? staticPlanSha256 : sha256(name),
    evidence_ref: name === "static_release" ? "protected/prerequisites/static-release-plan.json" : `protected/prerequisites/${name}.json`,
    ...sourceIdentity,
  }]));
  receipt.authorization_ref = "approved-change-window-20260808";
  receipt.mutation_count = 2;
  receipt.operations = receipt.profiles.map((profile) => ({
    product_id: profile.product_id,
    operation_type: "central_manifest_update",
    operation_ref: `operation-${profile.product_id}`,
    result: "success",
  }));
  receipt.static_release = {
    plan_sha256: staticPlanSha256,
    ...sourceIdentity,
    target_namespaces: staticPlan.profiles.map(({ target_prefix }) => target_prefix),
    profiles: staticPlan.profiles.map((profile) => ({
      profile: profile.profile,
      product_id: profile.product_id,
      target_prefix: profile.target_prefix,
      inventory_sha256: profile.inventory_sha256,
      manifest_sha256: profile.manifest_sha256,
      taskpane_html_sha256: profile.taskpane_html_sha256,
      bundle_sha256: profile.bundle_sha256,
      source_location_coverage: profile.source_location_coverage,
    })),
  };
  receipt.static_readbacks = receipt.profiles.map((profile) => ({
    ...staticPlan.profiles.find(({ product_id }) => product_id === profile.product_id),
    product_id: profile.product_id,
    result: "exact_hash",
    http_status: 200,
    taskpane_html_sha256: candidate
      .profile_artifacts.find(({ product_id }) => product_id === profile.product_id).taskpane_html_sha256,
    bundle_sha256: profile.bundle_sha256,
    source_locations: profile.source_locations,
  })).map(({ product_id, result, http_status, target_prefix, inventory_sha256, taskpane_html_sha256, bundle_sha256, source_locations }) => ({
    product_id,
    result,
    http_status,
    target_prefix,
    inventory_sha256,
    taskpane_html_sha256,
    bundle_sha256,
    source_locations,
  }));
  receipt.readbacks = receipt.profiles.map((profile) => ({
    product_id: profile.product_id,
    version: contract.release_version,
    manifest_sha256: profile.candidate_manifest_sha256,
    deployment_mode: "fixed",
    source_locations: profile.source_locations,
    assignment_count: profile.assignment_count,
    assignment_fingerprint_sha256: profile.assignment_fingerprint_sha256,
    enabled: true,
  }));
  receipt.propagation_observations = receipt.profiles.flatMap((profile) => (
    contract.m365.propagation_observation_hours.map((hour) => ({
      product_id: profile.product_id,
      hour,
      result: "exact_readback",
      version: contract.release_version,
      manifest_sha256: profile.candidate_manifest_sha256,
      assignment_fingerprint_sha256: profile.assignment_fingerprint_sha256,
      observed_at_utc: `2026-08-${String(8 + hour / 24).padStart(2, "0")}T00:00:00Z`,
    }))
  ));
  receipt.host_evidence = receipt.profiles.flatMap((profile) => (
    contract.m365.required_host_evidence.map((host) => ({
      product_id: profile.product_id,
      host,
      evidence_kind: "real_outlook_host",
      executed: true,
      result: "pass",
      manifest_sha256: profile.candidate_manifest_sha256,
      bundle_sha256: profile.bundle_sha256,
      scenarios: [
        ...contract.m365.required_common_host_scenarios,
        ...contract.m365.required_profile_scenarios[profile.profile],
      ],
      host_version: "test-host-version",
      observed_at_utc: "2026-08-08T00:00:00Z",
      accessibility_check: "pass",
      host_dom_manipulation: false,
      evidence_ref: `protected/${profile.profile}/${host}.json`,
    }))
  ));
  receipt.claims = {
    central_deployment_verified: true,
    propagation_verified: true,
    real_outlook_verified: true,
    go_live_approved: false,
  };
  return { candidate, receipt, staticPlan, staticPlanSha256 };
}

function m365Options(candidateManifestHashes, overrides = {}) {
  return {
    contract,
    baseline,
    rollback,
    releaseCandidate: releaseCandidate(candidateManifestHashes),
    releaseContext,
    candidateManifestHashes,
    candidateManifestProjections: candidateManifestProjections(),
    expectedSourceIdentity: sourceIdentity,
    staticPlan: null,
    staticPlanSha256: null,
    ...overrides,
  };
}

test("release contract binds two identities, four manifests, and additive dry-run scope", () => {
  assert.deepEqual(validateReleaseContract(contract), {
    profile_count: 2,
    manifest_count: 4,
    release_version: "1.1.0.0",
  });
  const drifted = clone(contract);
  drifted.profiles[1].product_id = drifted.profiles[0].product_id;
  assert.throws(() => validateReleaseContract(drifted), /ProductIds/);
  drifted.profiles = clone(contract.profiles);
  drifted.static_deploy.delete = true;
  assert.throws(() => validateReleaseContract(drifted), /additive \/addin and \/outlook-addin dry-run/);
});

test("surface and rollback contracts preserve ProductId-specific events and assignments", () => {
  assert.equal(validateSurfaceSeparation(surface, baseline, contract).permission_event_assignment_diff, "none");
  assert.equal(validateRollbackContract(rollback, baseline, contract).rollback_profile_count, 2);

  const eventLeak = clone(surface);
  eventLeak.profiles.find(({ profile }) => profile === "inquiry-only").manifest_fingerprint.launch_events = [
    "OnMessageSend:onMessageSendHandler:PromptUser",
  ];
  assert.throws(() => validateSurfaceSeparation(eventLeak, baseline, contract), /leaked/);

  const sharedRollback = clone(rollback);
  sharedRollback.profiles[1].protected_manifest_ref = sharedRollback.profiles[0].protected_manifest_ref;
  assert.throws(() => validateRollbackContract(sharedRollback, baseline, contract), /not independent/);

  const extraSurface = clone(surface);
  extraSurface.profiles.push({ ...extraSurface.profiles[0], product_id: "00000000-0000-0000-0000-000000000000" });
  assert.throws(() => validateSurfaceSeparation(extraSurface, baseline, contract), /ProductIds/);
});

test("dependency gate is lockfile and exact-license fail closed", () => {
  const result = validateDependencyLicenses(lockWithReleaseDependencies(), contract);
  assert.ok(result.checked_package_count > 0);
  assert.equal(result.licenses.MIT > 0, true);

  const unreviewed = lockWithReleaseDependencies();
  unreviewed.packages["node_modules/unreviewed"] = { version: "1.0.0", license: "GPL-3.0-only" };
  assert.throws(() => validateDependencyLicenses(unreviewed, contract), /not allowlisted/);

  const missing = lockWithReleaseDependencies();
  delete missing.packages["node_modules/docusign-esign"];
  assert.throws(() => validateDependencyLicenses(missing, contract), /required dependency/);
});

test("coverage and deterministic inventory gates name missing or changed artifacts", () => {
  const required = new Set([...contract.required_release_paths, ...contract.required_test_paths]);
  assert.equal(validateCoveragePaths(required, contract).required_path_count, required.size);
  required.delete(contract.required_release_paths[0]);
  assert.throws(() => validateCoveragePaths(required, contract), /coverage paths are missing/);

  const first = inventory();
  const result = validateBuildInventories(first, clone(first), contract);
  assert.equal(result.builds_identical, true);
  const changed = clone(first);
  changed.at(-1).sha256 = hex("f");
  assert.throws(() => validateBuildInventories(first, changed, contract), /deterministic double-build/);
  assert.throws(() => validateBuildInventories(first, first.concat({ path: "bundle.js.map", byte_size: 1, sha256: hex("f") }), contract), /forbidden build artifact/);
});

test("release candidate receipt requires every exact proof section and contract hash", () => {
  const receipt = releaseCandidate({ "matter-full": hex("1"), "inquiry-only": hex("2") });
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
    ...releaseContext,
    expectedSourceIdentity: null,
  }), /exact lockfile and frozen proof contracts/);
});

test("API artifact verifier binds embedded source and preserves environment without exposing values", () => {
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
    schema_version: "amic-os.outlook-api-release.v1",
    authorization_ref: null,
    mode: "dry-run",
    status: "artifact_verified_awaiting_authorized_deployment",
    source_sha: oid("a"),
    source_tree: oid("b"),
    package_lock_sha256: sha256(packageLockBytes),
    artifact_sha256: sha256(artifactBytes),
    lambda_code_sha256: sha256(artifactBytes, "base64"),
    function_name: contract.api.function_name,
    aws_account_id: contract.api.aws_account_id,
    region: contract.api.region,
    environment: { before: environment, preservation_status: "planned" },
    mutation_count: 0,
    deployed_code_sha256: null,
  };
  const embeddedManifest = {
    schema_version: "amic-os.api-deployment-manifest.v1",
    source_sha: oid("a"),
    source_tree: oid("b"),
    package_lock_sha256: sha256(packageLockBytes),
    artifact_kind: "matter-lawos-api-prod",
  };
  const input = {
    receipt,
    artifactBytes,
    embeddedManifest,
    expectedSourceSha: oid("a"),
    expectedSourceTree: oid("b"),
    packageLockBytes,
    beforeConfiguration,
    contract,
  };
  assert.equal(validateApiArtifactRelease(input).status, receipt.status);
  assert.throws(() => validateApiArtifactRelease({ ...input, afterConfiguration: beforeConfiguration }), /overclaims/);

  const postReceipt = clone(receipt);
  postReceipt.mode = "post-deploy-readback";
  postReceipt.authorization_ref = "approved-api-change-window-20260808";
  postReceipt.status = "deployed_readback_verified";
  postReceipt.environment = { before: environment, after: environment, preservation_status: "verified" };
  postReceipt.mutation_count = 1;
  postReceipt.deployed_code_sha256 = receipt.lambda_code_sha256;
  const afterConfiguration = { ...beforeConfiguration, CodeSha256: receipt.lambda_code_sha256 };
  assert.equal(validateApiArtifactRelease({ ...input, receipt: postReceipt, afterConfiguration }).status, "deployed_readback_verified");
  const unauthorizedPostReceipt = clone(postReceipt);
  unauthorizedPostReceipt.authorization_ref = null;
  assert.throws(() => validateApiArtifactRelease({ ...input, receipt: unauthorizedPostReceipt, afterConfiguration }), /authorization_ref/);
  const changedEnvironment = { ...lambdaTarget, CodeSha256: receipt.lambda_code_sha256, Environment: { Variables: { A: "changed", B: "two" } } };
  assert.throws(() => validateApiArtifactRelease({ ...input, receipt: postReceipt, afterConfiguration: changedEnvironment }), /environment preservation/);

  assert.deepEqual(validateApiArtifactEntries(["index.js", "deployment-manifest.json"], "deployment-manifest.json"), {
    entry_count: 2,
    embedded_manifest_path: "deployment-manifest.json",
  });
  assert.throws(() => validateApiArtifactEntries(["deployment-manifest.json", "deployment-manifest.json"], "deployment-manifest.json"), /unsafe or duplicate/);
  assert.throws(() => validateApiArtifactEntries(["../deployment-manifest.json"], "deployment-manifest.json"), /unsafe/);
});

test("static deployment planner exactly partitions both namespaces without fallback or root clobber", () => {
  const manifestHashes = { "matter-full": hex("1"), "inquiry-only": hex("2") };
  const releaseReceipt = releaseCandidate(manifestHashes);
  const sourceLocations = Object.fromEntries(Object.entries(candidateManifestProjections()).map(([profile, projection]) => [
    profile,
    projection.form_source_locations,
  ]));
  const plan = staticPlanFor(manifestHashes);
  assert.deepEqual(plan.profiles.map(({ target_prefix }) => target_prefix), ["addin/", "outlook-addin/"]);
  assert.ok(plan.profiles.every(({ source_location_coverage }) => source_location_coverage === true));
  assert.ok(plan.profiles.every(({ manifest_publish_mode }) => manifest_publish_mode === "m365_central_deployment_only"));
  assert.deepEqual(validateStaticDryRunPlan(plan, { contract, releaseReceipt, releaseContext, sourceLocations }), {
    operation_count: inventory().length,
    mutation_count: 0,
    execution_performed: false,
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

  const unknownProduct = clone(plan);
  unknownProduct.profiles[1].product_id = "00000000-0000-0000-0000-000000000000";
  assert.throws(() => validateStaticDryRunPlan(unknownProduct, { contract, releaseReceipt, releaseContext, sourceLocations }), /ProductIds/);

  assert.throws(() => buildStaticDryRunPlan({
    releaseReceipt,
    releaseContext,
    sourceLocations: { ...sourceLocations, "inquiry-only": ["https://static.example/addin/index.html"] },
    contract,
    bucketRef: "OUTLOOK_STATIC_BUCKET",
  }), /escaped \/outlook-addin\//);
});

test("M365 awaiting packet cannot claim central update, propagation, host QA, or go-live", () => {
  const manifestHashes = { "matter-full": hex("1"), "inquiry-only": hex("2") };
  const release = releaseCandidate(manifestHashes);
  const awaiting = awaitingM365Receipt(manifestHashes);
  const options = m365Options(manifestHashes, { releaseCandidate: release });
  assert.deepEqual(validateM365ReleaseReceipt(awaiting, options), {
    status: "awaiting_authorized_deployment",
    external_mutation_performed: false,
    blocked_external: true,
  });
  const claimed = clone(awaiting);
  claimed.claims.central_deployment_verified = true;
  assert.throws(() => validateM365ReleaseReceipt(claimed, options), /overclaims/);

  for (const field of ["deployment_verified", "external_provider_proof", "go_live"]) {
    const overclaim = clone(awaiting);
    overclaim[field] = true;
    assert.throws(() => validateM365ReleaseReceipt(overclaim, options), /fields mismatch/);
  }
  const nestedOverclaim = clone(awaiting);
  nestedOverclaim.profiles[0].external_provider_proof = true;
  assert.throws(() => validateM365ReleaseReceipt(nestedOverclaim, options), /fields mismatch/);

  const staleReceipt = clone(awaiting);
  staleReceipt.source_sha = oid("f");
  assert.throws(() => validateM365ReleaseReceipt(staleReceipt, options), /stale for the exact current source/);

  const staleCandidate = clone(release);
  staleCandidate.source_sha = oid("f");
  assert.throws(() => validateM365ReleaseReceipt(awaiting, { ...options, releaseCandidate: staleCandidate }), /stale for the exact current source/);

  const unknownProduct = clone(awaiting);
  unknownProduct.profiles[0].product_id = "00000000-0000-0000-0000-000000000000";
  assert.throws(() => validateM365ReleaseReceipt(unknownProduct, options), /ProductIds/);
});

test("M365 executed receipt requires dual readback, four propagation times, and real hosts", () => {
  const manifestHashes = { "matter-full": hex("1"), "inquiry-only": hex("2") };
  const { candidate: release, receipt: completed, staticPlan, staticPlanSha256 } = completedM365Fixture(manifestHashes);
  const options = m365Options(manifestHashes, {
    releaseCandidate: release,
    staticPlan,
    staticPlanSha256,
  });
  const result = validateM365ReleaseReceipt(completed, options);
  assert.equal(result.central_deployment_verified, true);
  assert.equal(result.propagation_verified, true);
  assert.equal(result.real_outlook_verified, true);

  const missingObservation = clone(completed);
  missingObservation.propagation_observations.pop();
  assert.throws(() => validateM365ReleaseReceipt(missingObservation, options), /propagation observations/);

  const duplicateObservation = clone(completed);
  duplicateObservation.propagation_observations.push(clone(duplicateObservation.propagation_observations[0]));
  assert.throws(() => validateM365ReleaseReceipt(duplicateObservation, options), /invalid or duplicated/);

  const earlyObservation = clone(completed);
  earlyObservation.propagation_observations.find(({ hour }) => hour === 72).observed_at_utc = "2026-08-08T00:00:00Z";
  assert.throws(() => validateM365ReleaseReceipt(earlyObservation, options), /before their stated window/);

  const unknownObservation = clone(completed);
  unknownObservation.propagation_observations[0].product_id = "00000000-0000-0000-0000-000000000000";
  assert.throws(() => validateM365ReleaseReceipt(unknownObservation, options), /invalid or duplicated/);

  const pendingPrerequisite = clone(completed);
  pendingPrerequisite.prerequisites.api_release = {
    status: "pending",
    artifact_sha256: null,
    evidence_sha256: null,
    evidence_ref: null,
    source_sha: null,
    source_tree: null,
    package_lock_sha256: null,
  };
  assert.throws(() => validateM365ReleaseReceipt(pendingPrerequisite, options), /pending prerequisites/);

  const sharedOperation = clone(completed);
  sharedOperation.operations[1].operation_ref = sharedOperation.operations[0].operation_ref;
  assert.throws(() => validateM365ReleaseReceipt(sharedOperation, options), /operation is incomplete/);

  const browserOnly = clone(completed);
  browserOnly.host_evidence[0].evidence_kind = "browser_harness";
  assert.throws(() => validateM365ReleaseReceipt(browserOnly, options), /real Outlook evidence/);

  const duplicateHost = clone(completed);
  duplicateHost.host_evidence.push(clone(duplicateHost.host_evidence[0]));
  assert.throws(() => validateM365ReleaseReceipt(duplicateHost, options), /incomplete or duplicated/);

  const assignmentDrift = clone(completed);
  assignmentDrift.profiles[0].assignment_count += 1;
  assert.throws(() => validateM365ReleaseReceipt(assignmentDrift, options), /binding drifted/);

  const staticInventoryDrift = clone(completed);
  staticInventoryDrift.static_release.profiles[1].inventory_sha256 = hex("f");
  assert.throws(() => validateM365ReleaseReceipt(staticInventoryDrift, options), /static release exact inventory binding/);

  const staticCoverageOverclaim = clone(completed);
  staticCoverageOverclaim.static_release.profiles[1].source_location_coverage = false;
  assert.throws(() => validateM365ReleaseReceipt(staticCoverageOverclaim, options), /static release exact inventory binding/);

  const staticPlanDrift = clone(completed);
  staticPlanDrift.static_release.plan_sha256 = hex("f");
  assert.throws(() => validateM365ReleaseReceipt(staticPlanDrift, options), /static release exact inventory binding/);

  const prematureGoLive = clone(completed);
  prematureGoLive.claims.go_live_approved = true;
  assert.throws(() => validateM365ReleaseReceipt(prematureGoLive, options), /advance together/);

  const unclaimedGoLive = clone(completed);
  unclaimedGoLive.status = "go_live_approved";
  assert.throws(() => validateM365ReleaseReceipt(unclaimedGoLive, options), /advance together/);
});

test("release receipts reject raw secrets and content fields", () => {
  assert.doesNotThrow(() => assertNoSensitiveMaterial({ secret_reference: "aws-secrets-manager-ref" }));
  assert.throws(() => assertNoSensitiveMaterial({ refresh_token: "not-allowed" }), /forbidden field/);
  assert.throws(() => assertNoSensitiveMaterial({ note: "client_secret=abcdefghijklmnopqrstuvwxyz" }), /secret-like/);
});

test("CI triggers and commands cover every release lane and all four official manifests", async () => {
  const workflow = await readFile(path.join(repoRoot, ".github/workflows/outlook-addin-validation.yml"), "utf8");
  const requiredTriggeredPaths = [
    ...contract.required_release_paths,
    ...contract.required_test_paths,
    ...contract.manifests,
    contractRef,
    contract.baseline_receipt,
    contract.rollback_contract,
    contract.surface_contract,
    ".github/workflows/outlook-addin-validation.yml",
    "contracts/migration-platform-contract.json",
    "package-lock.json",
    "packages/dms/src/migrations/001_dms_vault_runtime.sql",
    "packages/email-dms/src/migrations/003_email_filing_correction.sql",
    "packages/matter/src/migrations/005_people_task_fields.sql",
    "packages/migration/src/import-plan.js",
    "packages/persistence/src/postgres/migrations/004_dms_upload_runtime.sql",
    "packages/platform/migrations/001_matter_vault_core.sql",
    "scripts/lib/outlook-release-gates.mjs",
    "scripts/plan-outlook-static-deploy.mjs",
    "scripts/test/outlook-release-gates.test.mjs",
    "scripts/validate-outlook-m365-release-receipt.mjs",
    "scripts/validate-outlook-release-candidate.mjs",
    "scripts/validate-upl-c09-c12-outlook-addin.mjs",
    "scripts/verify-outlook-api-release-artifact.mjs",
  ];
  for (const eventName of ["pull_request", "push"]) {
    const patterns = workflowEventPaths(workflow, eventName);
    for (const requiredPath of requiredTriggeredPaths) {
      assert.ok(patterns.some((pattern) => workflowPathMatches(pattern, requiredPath)), `${eventName} does not select ${requiredPath}`);
    }
  }
  const runs = workflowSingleLineRuns(workflow);
  assert.ok(runs.includes("node scripts/validate-upl-c09-c12-outlook-addin.mjs"));
  assert.ok(runs.includes("node --test scripts/test/outlook-release-gates.test.mjs"));
  assert.ok(runs.some((run) => run.startsWith("node scripts/validate-outlook-release-candidate.mjs --source-sha")));
  for (const manifest of contract.manifests) {
    assert.match(workflow, new RegExp(`office-addin-manifest@2\\.1\\.6 validate ${manifest.replaceAll(".", "\\.")}`));
  }

  for (const script of [
    "scripts/validate-outlook-release-candidate.mjs",
    "scripts/verify-outlook-api-release-artifact.mjs",
    "scripts/plan-outlook-static-deploy.mjs",
    "scripts/validate-outlook-m365-release-receipt.mjs",
  ]) {
    const source = await readFile(path.join(repoRoot, script), "utf8");
    assert.match(source, /--untracked-files=all/u);
  }
  const staticPlanner = await readFile(path.join(repoRoot, "scripts/plan-outlook-static-deploy.mjs"), "utf8");
  assert.doesNotMatch(staticPlanner, /execFileSync\(["']aws["']/u);
});
