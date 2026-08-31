import { parseOutlookManifest } from "../outlook-manifest-projection.mjs";
import {
  assertEqual, assertExactKeys, assertNoSensitiveMaterial, canonical, profileMap, sha256,
} from "./primitives.mjs";
import { validateStaticDryRunPlan } from "./static-plan.mjs";

const MANIFEST_BINDINGS = [
  {
    path: "apps/addin/manifest.canary.taskpane.production.xml",
    profile: "matter-full",
    stage: "taskpane_only",
    version: "1.3.0.0",
  },
  {
    path: "apps/addin/manifest.canary.rollback.production.xml",
    profile: "matter-full",
    stage: "forward_rollback",
    version: "1.3.0.2",
  },
  {
    path: "apps/addin/manifest.production.xml",
    profile: "matter-full",
    stage: "candidate_taskpane",
    version: "1.3.0.1",
  },
  {
    path: "apps/addin/manifest.inquiry.production.xml",
    profile: "inquiry-only",
    stage: "retained_inquiry",
    version: "1.1.0.0",
  },
];

function urlsFromProjection(projection) {
  const named = [...projection.url_resources, ...projection.image_resources]
    .map((value) => value.slice(value.indexOf("=") + 1));
  return [
    ...projection.form_source_locations,
    ...named,
    projection.icon_url,
    projection.high_resolution_icon_url,
    projection.support_url,
    ...projection.app_domains,
  ].filter(Boolean);
}

export function buildProductionManifestBindings({ manifestBytesByPath, releaseContract, origin }) {
  const profiles = new Map(releaseContract.profiles.map((profile) => [profile.profile, profile]));
  const bindings = [];
  for (const expected of MANIFEST_BINDINGS) {
    const bytes = manifestBytesByPath.get(expected.path);
    if (!Buffer.isBuffer(bytes)) throw new Error(`production manifest bytes are missing: ${expected.path}`);
    const projection = parseOutlookManifest(bytes.toString("utf8"));
    const profile = profiles.get(expected.profile);
    if (!profile || projection.product_id !== profile.product_id || projection.version !== expected.version
      || projection.permission !== profile.permission) {
      throw new Error(`production manifest identity drifted: ${expected.path}`);
    }
    const urls = urlsFromProjection(projection);
    if (!urls.length) throw new Error(`production manifest has no URL inventory: ${expected.path}`);
    for (const value of urls) {
      const parsed = new URL(value);
      if (parsed.origin !== origin || parsed.username || parsed.password || parsed.hash) {
        throw new Error(`production manifest URL escaped the exact origin: ${expected.path}`);
      }
    }
    bindings.push({
      stage: expected.stage,
      profile: expected.profile,
      product_id: projection.product_id,
      version: projection.version,
      path: expected.path,
      sha256: sha256(bytes),
      semantic_sha256: projection.semantic_manifest_sha256,
      source_locations: projection.form_source_locations,
      url_count: urls.length,
      exact_origin: true,
    });
  }
  return bindings;
}

export function validateCandidateBuildRevision({ inventory, bytesByPath, releaseContract, sourceSha }) {
  if (!/^[a-f0-9]{40,64}$/u.test(sourceSha ?? "")) {
    throw new Error("candidate build revision requires an exact Git object ID");
  }
  const results = [];
  for (const expected of releaseContract.profiles) {
    const namespace = releaseContract.static_deploy.namespaces.find(({ product_id }) => product_id === expected.product_id);
    const javascript = inventory.filter(({ path: file }) => file.endsWith(".js")
      && file.startsWith(namespace.source_prefix)
      && !(namespace.excluded_source_prefixes ?? []).some((prefix) => file.startsWith(prefix)));
    const bound = [];
    let markerCount = 0;
    let unsafeMarkerCount = 0;
    const marker = `addin@${sourceSha}`;
    for (const artifact of javascript) {
      const bytes = bytesByPath.get(artifact.path);
      if (!Buffer.isBuffer(bytes) || sha256(bytes) !== artifact.sha256 || bytes.byteLength !== artifact.byte_size) {
        throw new Error(`${expected.profile} build-revision artifact bytes drifted: ${artifact.path}`);
      }
      const text = bytes.toString("utf8");
      if (text.includes("addin@local") || text.includes("addin@unknown")) unsafeMarkerCount += 1;
      const occurrences = text.split(marker).length - 1;
      markerCount += occurrences;
      if (occurrences > 0) bound.push({ path: artifact.path, sha256: artifact.sha256 });
    }
    if (bound.length !== 1 || markerCount !== 1 || unsafeMarkerCount !== 0) {
      throw new Error(`${expected.profile} bundle is not bound exactly once to the clean source SHA`);
    }
    results.push({
      profile: expected.profile,
      product_id: expected.product_id,
      build_revision_path: bound[0].path,
      build_revision_sha256: bound[0].sha256,
      exact_source_sha_embedded: true,
    });
  }
  return { source_sha: sourceSha, profiles: results, local_or_unknown_marker_count: 0 };
}

function coexistence(staticPlan, forwardRollback) {
  const immutable = new Set(staticPlan.profiles.flatMap(({ operations }) => operations.map(({ target_key: key }) => key)));
  const aliases = new Set(staticPlan.profiles.flatMap(({ operations }) => operations.map(({ alias_target_key: key }) => key)));
  const prior = new Set(forwardRollback.profiles.flatMap(({ artifacts }) => artifacts.map(({ path: file }) => file)));
  const immutablePriorOverlap = [...immutable].filter((key) => prior.has(key));
  const aliasPriorOverlap = [...aliases].filter((key) => prior.has(key));
  if (immutablePriorOverlap.length || !aliasPriorOverlap.length || staticPlan.alias_mutation_count !== 0) {
    throw new Error("candidate immutable objects cannot coexist with the prior alias inventory");
  }
  return {
    candidate_immutable_object_count: immutable.size,
    candidate_alias_count: aliases.size,
    prior_alias_count: prior.size,
    immutable_prior_overlap_count: 0,
    candidate_prior_alias_overlap_count: aliasPriorOverlap.length,
    currently_served_alias_write_count: 0,
    candidate_prior_coexistence: true,
  };
}

function validateBuildRevisionReceipt(binding, releaseReceipt, releaseContract) {
  assertExactKeys(binding, ["local_or_unknown_marker_count", "profiles", "source_sha"], "build revision binding");
  if (binding.source_sha !== releaseReceipt.source_sha || binding.local_or_unknown_marker_count !== 0) {
    throw new Error("build revision binding drifted from the release candidate");
  }
  const boundProfiles = profileMap(binding.profiles, "build revision profiles");
  const candidateArtifacts = profileMap(releaseReceipt.profile_artifacts, "build revision candidate artifacts");
  for (const expected of releaseContract.profiles) {
    const bound = boundProfiles.get(expected.product_id);
    const artifact = candidateArtifacts.get(expected.product_id);
    assertExactKeys(bound, [
      "build_revision_path", "build_revision_sha256", "exact_source_sha_embedded", "product_id", "profile",
    ], `${expected.profile} build revision binding`);
    if (bound.profile !== expected.profile || bound.exact_source_sha_embedded !== true
      || bound.build_revision_path !== artifact.bundle_path
      || bound.build_revision_sha256 !== artifact.bundle_sha256) {
      throw new Error(`${expected.profile} build revision is not bound to its entry bundle`);
    }
  }
  return binding;
}

function expectedStaticFilesReceipt({
  releaseReceipt,
  releaseContext,
  staticPlan,
  releaseContract,
  manifestBindings,
  canaryManifestSet,
  forwardRollback,
  forwardRollbackContractRef,
  forwardRollbackContractSha256,
  forwardRollbackResult,
  priorSnapshotProof,
  buildRevisionBindings,
}) {
  validateStaticDryRunPlan(staticPlan, {
    contract: releaseContract,
    releaseReceipt,
    releaseContext,
    sourceLocations: Object.fromEntries(releaseContract.profiles.map((profile) => [
      profile.profile,
      manifestBindings.find(({ path: manifestPath }) => manifestPath === profile.production_manifest)?.source_locations,
    ])),
  });
  const byId = profileMap(forwardRollback.profiles, "sealed forward rollback profiles");
  const priorById = profileMap(priorSnapshotProof.profiles, "verified prior snapshot profiles");
  for (const expected of releaseContract.profiles) {
    const contractProfile = byId.get(expected.product_id);
    const verified = priorById.get(expected.product_id);
    if (contractProfile.inventory_sha256 !== verified.inventory_sha256
      || contractProfile.artifact_count !== verified.artifact_count || verified.exact_bytes_verified !== true) {
      throw new Error(`${expected.profile} prior snapshot proof drifted from the forward rollback contract`);
    }
  }
  const rollbackBinding = manifestBindings.find(({ stage }) => stage === "forward_rollback");
  if (!rollbackBinding || rollbackBinding.sha256 !== forwardRollbackResult.manifest_sha256
    || rollbackBinding.semantic_sha256 !== forwardRollbackResult.semantic_sha256
    || canaryManifestSet.rollback_manifest.manifest_sha256 !== rollbackBinding.sha256
    || canaryManifestSet.rollback_manifest.manifest_version !== "1.3.0.2"
    || canaryManifestSet.provider_mutation_performed !== false) {
    throw new Error("forward rollback manifest is not sealed to the canary manifest set");
  }
  const candidateProfiles = profileMap(releaseReceipt.profiles, "static files release candidate profiles");
  for (const expected of releaseContract.profiles) {
    const binding = manifestBindings.find(({ path: manifestPath }) => manifestPath === expected.production_manifest);
    const candidate = candidateProfiles.get(expected.product_id);
    if (!binding || binding.sha256 !== candidate.manifest_sha256
      || binding.semantic_sha256 !== candidate.semantic_sha256) {
      throw new Error(`${expected.profile} manifest raw/semantic hash binding drifted`);
    }
  }
  validateBuildRevisionReceipt(buildRevisionBindings, releaseReceipt, releaseContract);
  return {
    schema_version: "amic-os.outlook-static-files-release.v1",
    verdict: "PASS",
    source_sha: releaseReceipt.source_sha,
    source_tree: releaseReceipt.source_tree,
    package_lock_sha256: releaseReceipt.package_lock_sha256,
    release_candidate_sha256: sha256(JSON.stringify(canonical(releaseReceipt))),
    candidate_inventory_sha256: releaseReceipt.inventory_sha256,
    static_plan_sha256: sha256(JSON.stringify(canonical(staticPlan))),
    static_plan: staticPlan,
    manifest_bindings: manifestBindings,
    canary_manifest_set: canaryManifestSet,
    forward_rollback_contract: {
      ref: forwardRollbackContractRef,
      sha256: forwardRollbackContractSha256,
    },
    forward_rollback: forwardRollbackResult,
    prior_snapshot: priorSnapshotProof,
    build_revision: buildRevisionBindings,
    coexistence: coexistence(staticPlan, forwardRollback),
    exact_origin: forwardRollback.origin,
    content_address_algorithm: "sha256",
    alias_mutation_count: 0,
    external_mutations: 0,
    data_mutations: 0,
    actual_outlook_proved: false,
    allowed_claim: "Exact clean-source candidate bytes, create-only content-addressed targets, production manifest semantics, and read-only prior snapshot bytes were verified.",
    blocked_claim: "This is not S3 upload, alias cutover, CloudFront invalidation, M365 deployment, propagation, or real Outlook host evidence.",
  };
}

export function buildStaticFilesReleaseReceipt(options) {
  const receipt = expectedStaticFilesReceipt(options);
  assertNoSensitiveMaterial(receipt, "static files release receipt");
  return receipt;
}

export function validateStaticFilesReleaseReceipt(receipt, options) {
  assertExactKeys(receipt, [
    "actual_outlook_proved", "alias_mutation_count", "allowed_claim", "blocked_claim", "build_revision",
    "canary_manifest_set", "candidate_inventory_sha256", "coexistence", "content_address_algorithm",
    "data_mutations", "exact_origin", "external_mutations", "forward_rollback",
    "forward_rollback_contract", "manifest_bindings", "package_lock_sha256", "prior_snapshot",
    "release_candidate_sha256", "schema_version", "source_sha", "source_tree", "static_plan",
    "static_plan_sha256", "verdict",
  ], "static files release receipt");
  const expected = expectedStaticFilesReceipt(options);
  assertEqual(canonical(receipt), canonical(expected), "static files release receipt");
  return {
    verdict: receipt.verdict,
    candidate_artifact_count: receipt.static_plan.profiles.reduce((count, profile) => count + profile.operations.length, 0),
    prior_artifact_count: receipt.prior_snapshot.profiles.reduce((count, profile) => count + profile.artifact_count, 0),
    alias_mutation_count: receipt.alias_mutation_count,
    external_mutations: receipt.external_mutations,
  };
}
