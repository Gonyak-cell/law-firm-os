import { validateBuildInventories } from "./build.mjs";
import { validateReleaseCandidateReceipt } from "./candidate.mjs";
import {
  assertEqual, assertExactKeys, assertNoSensitiveMaterial, assertSafeRelativePath, assertSha256,
  canonical, inventorySha256, profileMap,
} from "./primitives.mjs";

function inventoryForNamespace(inventory, namespace) {
  return inventory.filter(({ path: file }) => file.startsWith(namespace.source_prefix)
    && !(namespace.excluded_source_prefixes ?? []).some((prefix) => file.startsWith(prefix)));
}

function validateSourceLocations(locations, namespace, profile) {
  if (!Array.isArray(locations) || !locations.length) throw new Error(`${profile} SourceLocation is required`);
  for (const value of locations) {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password
      || !url.pathname.startsWith(`/${namespace.target_prefix}`)) {
      throw new Error(`${profile} SourceLocation escaped /${namespace.target_prefix}`);
    }
  }
  return locations;
}

function immutableTargetPrefix(namespace, contract) {
  return `${namespace.target_prefix}${contract.static_deploy.immutable_segment}`;
}

export function buildStaticDryRunPlan({ releaseReceipt, releaseContext, sourceLocations, contract, bucketRef }) {
  const releaseBuild = validateReleaseCandidateReceipt(releaseReceipt, contract, releaseContext);
  if (!/^[A-Z][A-Z0-9_]{2,63}$/u.test(bucketRef ?? "")) throw new Error("static bucket_ref must be symbolic");
  const protectedPrefixes = contract.static_deploy.protected_prefixes ?? [];
  const artifacts = profileMap(releaseReceipt.profile_artifacts, "static release artifacts");
  const manifestProfiles = profileMap(releaseReceipt.profiles, "static release manifest profiles");
  const manifests = new Map(releaseReceipt.manifest_validation.manifests.map((entry) => [entry.path, entry]));
  const profiles = contract.profiles.map((expected) => {
    const namespace = contract.static_deploy.namespaces.find(({ product_id }) => product_id === expected.product_id);
    const artifact = artifacts.get(expected.product_id);
    const manifestProfile = manifestProfiles.get(expected.product_id);
    const inventory = inventoryForNamespace(releaseBuild.inventory, namespace);
    const immutablePrefix = immutableTargetPrefix(namespace, contract);
    if (!inventory.length || !inventory.some(({ path }) => path === artifact.taskpane_html_path)
      || !inventory.some(({ path }) => path === artifact.bundle_path)
      || expected.required_static_paths.some((file) => !inventory.some(({ path }) => path === file))) {
      throw new Error(`${expected.profile} static namespace is missing its complete task pane/runtime inventory`);
    }
    const operations = inventory.map((entry) => {
      const relative = assertSafeRelativePath(entry.path.slice(namespace.source_prefix.length), `${expected.profile} static target path`);
      const aliasTargetKey = `${namespace.target_prefix}${relative}`;
      const targetKey = `${immutablePrefix}${entry.sha256}/${relative}`;
      if (aliasTargetKey.endsWith(".xml") || protectedPrefixes.some((prefix) => aliasTargetKey.startsWith(prefix))) {
        throw new Error(`static dry-run attempted to overwrite a manifest object: ${aliasTargetKey}`);
      }
      return {
        alias_target_key: aliasTargetKey,
        byte_size: entry.byte_size,
        if_none_match: "*",
        overwrite_allowed: false,
        sha256: entry.sha256,
        source_path: `${contract.build.root}/${entry.path}`,
        target_key: targetKey,
      };
    });
    return {
      profile: expected.profile,
      product_id: expected.product_id,
      target_prefix: namespace.target_prefix,
      immutable_target_prefix: immutablePrefix,
      invalidation_path: namespace.invalidation_path,
      manifest_ref: expected.production_manifest,
      manifest_sha256: manifests.get(expected.production_manifest)?.sha256,
      manifest_semantic_sha256: manifestProfile.semantic_sha256,
      manifest_publish_mode: "m365_central_deployment_only",
      taskpane_html_path: artifact.taskpane_html_path,
      taskpane_html_sha256: artifact.taskpane_html_sha256,
      bundle_path: artifact.bundle_path,
      bundle_sha256: artifact.bundle_sha256,
      inventory_sha256: inventorySha256(inventory),
      inventory,
      operations,
      source_locations: validateSourceLocations(sourceLocations?.[expected.profile], namespace, expected.profile),
      source_location_coverage: true,
    };
  });
  return {
    schema_version: "amic-os.outlook-static-deploy-plan.v2",
    status: "dry_run_only_awaiting_authorization",
    mode: "dry-run",
    execution_performed: false,
    mutation_count: 0,
    alias_mutation_count: 0,
    overwrite_existing: false,
    delete: false,
    content_address_algorithm: "sha256",
    cutover_mode: contract.static_deploy.cutover_mode,
    source_sha: releaseReceipt.source_sha,
    source_tree: releaseReceipt.source_tree,
    package_lock_sha256: releaseReceipt.package_lock_sha256,
    candidate_inventory_sha256: releaseReceipt.inventory_sha256,
    bucket_ref: bucketRef,
    protected_prefixes: protectedPrefixes,
    staging_invalidation_paths: [],
    cutover_invalidation_paths: contract.static_deploy.namespaces.map(({ invalidation_path }) => invalidation_path),
    profiles,
    allowed_claim: "This is a create-only content-addressed dual-namespace staging plan; no alias, invalidation, or AWS operation was executed.",
    blocked_claim: "This is not alias cutover, static deployment, cache propagation, central deployment, or Outlook runtime evidence.",
  };
}

export function validateStaticDryRunPlan(plan, { contract, releaseReceipt, releaseContext, sourceLocations }) {
  assertNoSensitiveMaterial(plan, "static deploy plan");
  assertExactKeys(plan, [
    "alias_mutation_count", "allowed_claim", "blocked_claim", "bucket_ref", "candidate_inventory_sha256",
    "content_address_algorithm", "cutover_invalidation_paths", "cutover_mode", "delete",
    "execution_performed", "mode", "mutation_count", "overwrite_existing", "package_lock_sha256",
    "profiles", "protected_prefixes", "schema_version", "source_sha", "source_tree",
    "staging_invalidation_paths", "status",
  ], "static deploy plan");
  const releaseBuild = validateReleaseCandidateReceipt(releaseReceipt, contract, releaseContext);
  if (plan.schema_version !== "amic-os.outlook-static-deploy-plan.v2"
    || plan.status !== "dry_run_only_awaiting_authorization" || plan.mode !== "dry-run"
    || plan.execution_performed !== false || plan.mutation_count !== 0 || plan.alias_mutation_count !== 0
    || plan.overwrite_existing !== false || plan.delete !== false
    || plan.content_address_algorithm !== "sha256" || plan.cutover_mode !== contract.static_deploy.cutover_mode
    || plan.source_sha !== releaseReceipt.source_sha || plan.source_tree !== releaseReceipt.source_tree
    || plan.package_lock_sha256 !== releaseReceipt.package_lock_sha256
    || plan.candidate_inventory_sha256 !== releaseBuild.inventory_sha256
    || !/^[A-Z][A-Z0-9_]{2,63}$/u.test(plan.bucket_ref ?? "")
    || JSON.stringify(plan.protected_prefixes) !== JSON.stringify(contract.static_deploy.protected_prefixes)
    || JSON.stringify(plan.staging_invalidation_paths) !== JSON.stringify([])
    || JSON.stringify(plan.cutover_invalidation_paths) !== JSON.stringify(contract.static_deploy.namespaces.map(({ invalidation_path }) => invalidation_path))
    || plan.allowed_claim !== "This is a create-only content-addressed dual-namespace staging plan; no alias, invalidation, or AWS operation was executed."
    || plan.blocked_claim !== "This is not alias cutover, static deployment, cache propagation, central deployment, or Outlook runtime evidence.") {
    throw new Error("static deploy plan escaped the exact dual-namespace dry-run boundary");
  }
  const planProfiles = profileMap(plan.profiles, "static deploy plan profiles");
  const artifacts = profileMap(releaseReceipt.profile_artifacts, "static release artifacts");
  const manifestProfiles = profileMap(releaseReceipt.profiles, "static release manifest profiles");
  const manifests = new Map(releaseReceipt.manifest_validation.manifests.map((entry) => [entry.path, entry]));
  const allInventory = [];
  const targetKeys = new Set();
  const aliasKeys = new Set();
  let operationCount = 0;
  for (const expected of contract.profiles) {
    const profile = planProfiles.get(expected.product_id);
    const namespace = contract.static_deploy.namespaces.find(({ product_id }) => product_id === expected.product_id);
    const artifact = artifacts.get(expected.product_id);
    const manifestProfile = manifestProfiles.get(expected.product_id);
    assertExactKeys(profile, [
      "bundle_path", "bundle_sha256", "invalidation_path", "inventory", "inventory_sha256",
      "immutable_target_prefix", "manifest_publish_mode", "manifest_ref", "manifest_semantic_sha256", "manifest_sha256",
      "operations", "product_id", "profile",
      "source_location_coverage", "source_locations", "target_prefix", "taskpane_html_path", "taskpane_html_sha256",
    ], `${expected.profile} static plan profile`);
    const expectedInventory = inventoryForNamespace(releaseBuild.inventory, namespace);
    for (const entry of profile.inventory ?? []) {
      assertExactKeys(entry, ["byte_size", "path", "sha256"], `${expected.profile} static inventory entry`);
    }
    if (profile.profile !== expected.profile || profile.target_prefix !== namespace.target_prefix
      || profile.immutable_target_prefix !== immutableTargetPrefix(namespace, contract)
      || profile.invalidation_path !== namespace.invalidation_path || profile.manifest_ref !== expected.production_manifest
      || profile.manifest_sha256 !== manifests.get(expected.production_manifest)?.sha256
      || profile.manifest_semantic_sha256 !== manifestProfile.semantic_sha256
      || profile.manifest_publish_mode !== "m365_central_deployment_only"
      || profile.taskpane_html_path !== artifact.taskpane_html_path
      || profile.taskpane_html_sha256 !== artifact.taskpane_html_sha256
      || profile.bundle_path !== artifact.bundle_path || profile.bundle_sha256 !== artifact.bundle_sha256
      || profile.inventory_sha256 !== inventorySha256(expectedInventory)
      || JSON.stringify(profile.inventory) !== JSON.stringify(expectedInventory)
      || profile.source_location_coverage !== true
      || JSON.stringify(profile.source_locations) !== JSON.stringify(sourceLocations?.[expected.profile])) {
      throw new Error(`${expected.profile} static namespace binding drifted`);
    }
    validateSourceLocations(profile.source_locations, namespace, expected.profile);
    if (!Array.isArray(profile.operations) || profile.operations.length !== expectedInventory.length) {
      throw new Error(`${expected.profile} static operation inventory is incomplete`);
    }
    for (const [index, operation] of profile.operations.entries()) {
      assertExactKeys(operation, [
        "alias_target_key", "byte_size", "if_none_match", "overwrite_allowed", "sha256", "source_path", "target_key",
      ], `${expected.profile} static operation`);
      const entry = expectedInventory[index];
      const relative = assertSafeRelativePath(entry.path.slice(namespace.source_prefix.length), `${expected.profile} static target path`);
      const aliasTargetKey = `${namespace.target_prefix}${relative}`;
      const targetKey = `${immutableTargetPrefix(namespace, contract)}${entry.sha256}/${relative}`;
      if (operation.source_path !== `${contract.build.root}/${entry.path}` || operation.target_key !== targetKey
        || operation.alias_target_key !== aliasTargetKey || operation.if_none_match !== "*"
        || operation.overwrite_allowed !== false || operation.sha256 !== entry.sha256
        || operation.byte_size !== entry.byte_size || targetKeys.has(targetKey) || aliasKeys.has(aliasTargetKey)
        || aliasTargetKey.endsWith(".xml")
        || contract.static_deploy.protected_prefixes.some((prefix) => aliasTargetKey.startsWith(prefix))) {
        throw new Error(`${expected.profile} static source/target mapping drifted: ${operation.target_key}`);
      }
      targetKeys.add(targetKey);
      aliasKeys.add(aliasTargetKey);
      operationCount += 1;
    }
    allInventory.push(...profile.inventory);
  }
  validateBuildInventories(allInventory, releaseBuild.inventory, contract);
  return { operation_count: operationCount, mutation_count: 0, execution_performed: false };
}

export function staticReleaseProjection(plan, planSha256) {
  assertSha256(planSha256, "static release plan");
  return {
    plan_sha256: planSha256,
    source_sha: plan.source_sha,
    source_tree: plan.source_tree,
    package_lock_sha256: plan.package_lock_sha256,
    content_address_algorithm: plan.content_address_algorithm,
    cutover_mode: plan.cutover_mode,
    target_namespaces: plan.profiles.map(({ target_prefix }) => target_prefix),
    profiles: plan.profiles.map((profile) => ({
      profile: profile.profile, product_id: profile.product_id, target_prefix: profile.target_prefix,
      immutable_target_prefix: profile.immutable_target_prefix,
      inventory_sha256: profile.inventory_sha256, manifest_sha256: profile.manifest_sha256,
      manifest_semantic_sha256: profile.manifest_semantic_sha256,
      taskpane_html_sha256: profile.taskpane_html_sha256, bundle_sha256: profile.bundle_sha256,
      source_location_coverage: profile.source_location_coverage,
    })),
  };
}
