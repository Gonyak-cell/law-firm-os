import { parseOutlookManifest } from "../outlook-manifest-projection.mjs";
import {
  assertEqual, assertExactKeys, assertNoSensitiveMaterial, assertSafeRelativePath,
  assertSha256, inventorySha256, profileMap, sha256,
} from "./primitives.mjs";
import { readProtectedArtifact, readProtectedJsonDocument } from "./protected-evidence.mjs";

const PRODUCTION_ORIGIN = "https://d2mthcc8vp3cr2.cloudfront.net";
const FORWARD_ROLLBACK_OPERATIONS = [
  "restore_prior_static_aliases_from_verified_snapshot",
  "readback_prior_static_hashes",
  "central_update_to_1.3.0.2",
  "readback_launch_events_zero",
];
const SECRET_VALUE = /-----BEGIN (?:RSA )?PRIVATE KEY-----|\b(?:access_token|client_secret|refresh_token)\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{16,}/iu;

function requiredAliasPaths(contract, namespace) {
  return contract.build.required_static_paths
    .filter((file) => file.startsWith(namespace.source_prefix)
      && !(namespace.excluded_source_prefixes ?? []).some((prefix) => file.startsWith(prefix)))
    .map((file) => `${namespace.target_prefix}${file.slice(namespace.source_prefix.length)}`)
    .sort((left, right) => left.localeCompare(right, "en"));
}

function validateProductionUrl(value, origin, name) {
  const url = new URL(value);
  if (url.origin !== origin || url.username || url.password || url.hash) {
    throw new Error(`${name} escaped the exact production origin`);
  }
  return url;
}

function validateProfile(profile, expected, contract) {
  assertExactKeys(profile, [
    "artifact_count", "artifacts", "entry_bundle_path", "inventory_sha256", "product_id",
    "profile", "target_prefix", "taskpane_path",
  ], `${expected.profile} forward static rollback profile`);
  const namespace = contract.static_deploy.namespaces.find(({ product_id }) => product_id === expected.product_id);
  if (profile.profile !== expected.profile || profile.target_prefix !== namespace.target_prefix) {
    throw new Error(`${expected.profile} forward static rollback namespace drifted`);
  }
  const artifacts = [];
  const paths = new Set();
  for (const artifact of profile.artifacts ?? []) {
    assertExactKeys(artifact, ["byte_size", "path", "sha256"], `${expected.profile} prior static artifact`);
    const file = assertSafeRelativePath(artifact.path, `${expected.profile} prior static path`);
    if (!file.startsWith(namespace.target_prefix) || paths.has(file)
      || !Number.isSafeInteger(artifact.byte_size) || artifact.byte_size < 1) {
      throw new Error(`${expected.profile} prior static artifact is duplicate, empty, or outside its namespace`);
    }
    if ((contract.build.forbidden_path_suffixes ?? []).some((suffix) => file.endsWith(suffix))) {
      throw new Error(`${expected.profile} prior static inventory contains a forbidden artifact: ${file}`);
    }
    assertSha256(artifact.sha256, `${expected.profile} prior static artifact`);
    paths.add(file);
    artifacts.push({ path: file, byte_size: artifact.byte_size, sha256: artifact.sha256 });
  }
  const sorted = [...artifacts].sort((left, right) => left.path.localeCompare(right.path, "en"));
  if (JSON.stringify(artifacts) !== JSON.stringify(sorted)
    || profile.artifact_count !== artifacts.length || profile.inventory_sha256 !== inventorySha256(artifacts)) {
    throw new Error(`${expected.profile} prior static inventory hash, count, or order drifted`);
  }
  for (const required of requiredAliasPaths(contract, namespace)) {
    if (!paths.has(required)) throw new Error(`${expected.profile} prior static required artifact is missing: ${required}`);
  }
  if (profile.taskpane_path !== `${namespace.target_prefix}${expected.taskpane_html.slice(namespace.source_prefix.length)}`
    || !paths.has(profile.taskpane_path) || !paths.has(profile.entry_bundle_path)
    || !profile.entry_bundle_path.startsWith(`${namespace.target_prefix}assets/`)
    || !profile.entry_bundle_path.endsWith(".js")) {
    throw new Error(`${expected.profile} prior taskpane or entry bundle is not inventory-bound`);
  }
  const assetExtensions = new Set(artifacts.filter(({ path: file }) => file.includes("/assets/"))
    .map(({ path: file }) => file.slice(file.lastIndexOf("."))));
  if (!assetExtensions.has(".js") || !assetExtensions.has(".css")) {
    throw new Error(`${expected.profile} prior taskpane JS/CSS closure is incomplete`);
  }
  return {
    profile: profile.profile,
    product_id: profile.product_id,
    target_prefix: profile.target_prefix,
    taskpane_path: profile.taskpane_path,
    entry_bundle_path: profile.entry_bundle_path,
    artifact_count: profile.artifact_count,
    inventory_sha256: profile.inventory_sha256,
  };
}

export function validateForwardStaticRollbackContract(forward, releaseContract, rollbackManifestBytes) {
  assertNoSensitiveMaterial(forward, "forward static rollback contract");
  assertExactKeys(forward, [
    "application_checkpoint", "claims", "forward_rollback", "origin", "profiles",
    "save_id", "schema_version", "snapshot_inventory",
  ], "forward static rollback contract");
  if (forward.schema_version !== "amic-os.outlook-forward-static-rollback.v1"
    || forward.save_id !== "OUTLOOK-INFRA-CONNECTIONS-SAVE-20260824-01"
    || forward.application_checkpoint !== "OUTLOOK-SAVE-20260824-03B93BFF"
    || forward.origin !== PRODUCTION_ORIGIN) {
    throw new Error("forward static rollback checkpoint or origin drifted");
  }
  assertExactKeys(forward.snapshot_inventory, ["canonical_sha256", "object_count", "ref", "sha256"], "prior snapshot inventory");
  assertSafeRelativePath(forward.snapshot_inventory.ref, "prior snapshot inventory ref");
  assertSha256(forward.snapshot_inventory.sha256, "prior snapshot inventory");
  assertSha256(forward.snapshot_inventory.canonical_sha256, "prior snapshot canonical inventory");
  if (!Number.isSafeInteger(forward.snapshot_inventory.object_count) || forward.snapshot_inventory.object_count < 15) {
    throw new Error("prior snapshot object count is incomplete");
  }
  assertExactKeys(forward.claims, [
    "candidate_alias_overwrite_authorized", "data_mutation_performed",
    "external_mutation_performed", "prior_snapshot_read_only",
  ], "forward static rollback claims");
  if (forward.claims.prior_snapshot_read_only !== true
    || forward.claims.candidate_alias_overwrite_authorized !== false
    || forward.claims.external_mutation_performed !== false
    || forward.claims.data_mutation_performed !== false) {
    throw new Error("forward static rollback contract escaped the read-only boundary");
  }

  const rollback = forward.forward_rollback;
  assertExactKeys(rollback, [
    "manifest_path", "manifest_sha256", "manifest_version", "operations", "product_id",
    "profile", "semantic_sha256", "source_locations",
  ], "forward rollback manifest binding");
  const matter = releaseContract.profiles.find(({ profile }) => profile === "matter-full");
  const manifestBytes = Buffer.isBuffer(rollbackManifestBytes)
    ? rollbackManifestBytes : Buffer.from(String(rollbackManifestBytes ?? ""));
  const projection = parseOutlookManifest(manifestBytes.toString("utf8"));
  if (rollback.profile !== matter.profile || rollback.product_id !== matter.product_id
    || rollback.manifest_path !== "apps/addin/manifest.canary.rollback.production.xml"
    || rollback.manifest_version !== "1.3.0.2" || rollback.manifest_sha256 !== sha256(manifestBytes)
    || rollback.semantic_sha256 !== projection.semantic_manifest_sha256
    || projection.product_id !== rollback.product_id || projection.version !== rollback.manifest_version
    || projection.permission !== matter.permission || projection.launch_events.length !== 0
    || projection.supports_pinning.length !== 0
    || JSON.stringify(rollback.source_locations) !== JSON.stringify(projection.form_source_locations)
    || JSON.stringify(rollback.operations) !== JSON.stringify(FORWARD_ROLLBACK_OPERATIONS)) {
    throw new Error("1.3.0.2 forward rollback manifest identity or semantics drifted");
  }
  for (const location of rollback.source_locations) {
    const url = validateProductionUrl(location, forward.origin, "forward rollback SourceLocation");
    if (url.pathname !== "/addin/index.html" || url.search) {
      throw new Error("forward rollback SourceLocation is not prior-alias-bound");
    }
  }

  const byId = profileMap(forward.profiles, "forward static rollback profiles");
  const profiles = releaseContract.profiles.map((expected) => validateProfile(byId.get(expected.product_id), expected, releaseContract));
  const matterProfile = profiles.find(({ product_id }) => product_id === rollback.product_id);
  if (!matterProfile || !rollback.source_locations.every((location) => (
    new URL(location).pathname.slice(1) === matterProfile.taskpane_path
  ))) {
    throw new Error("1.3.0.2 forward rollback does not point to the prior Matter taskpane inventory");
  }
  return {
    forward_rollback_version: rollback.manifest_version,
    manifest_sha256: rollback.manifest_sha256,
    semantic_sha256: rollback.semantic_sha256,
    snapshot_inventory_sha256: forward.snapshot_inventory.sha256,
    snapshot_inventory_canonical_sha256: forward.snapshot_inventory.canonical_sha256,
    profiles,
  };
}

function localReferences(text, prefix) {
  const references = new Set();
  for (const match of text.matchAll(/["'](\/(?:addin|outlook-addin)\/[^"'?#\s]+\.(?:css|html|js|png|svg)|assets\/[A-Za-z0-9_.-]+\.(?:css|js))["']/giu)) {
    references.add(match[1].startsWith("/") ? match[1].slice(1) : `${prefix}${match[1]}`);
  }
  return references;
}

function validatePriorBytes(profile, loadedByPath, releaseContract) {
  const namespace = releaseContract.static_deploy.namespaces.find(({ product_id }) => product_id === profile.product_id);
  const required = new Set(requiredAliasPaths(releaseContract, namespace));
  const visited = new Set();
  const pending = [profile.taskpane_path, profile.entry_bundle_path, ...required];
  while (pending.length) {
    const file = pending.pop();
    if (visited.has(file)) continue;
    const loaded = loadedByPath.get(file);
    if (!loaded) throw new Error(`${profile.profile} prior static dependency is missing: ${file}`);
    visited.add(file);
    const text = loaded.bytes.includes(0) ? "" : loaded.bytes.toString("utf8");
    for (const pattern of releaseContract.build.forbidden_text_patterns ?? []) {
      if (text.includes(pattern)) throw new Error(`${profile.profile} prior static artifact contains a forbidden marker: ${file}`);
    }
    if (SECRET_VALUE.test(text) || (/MIME-Version:/iu.test(text) && /(?:^|\r?\n)Content-Type:/iu.test(text))) {
      throw new Error(`${profile.profile} prior static artifact contains secret-like or raw MIME material: ${file}`);
    }
    for (const reference of localReferences(text, namespace.target_prefix)) {
      if (!loadedByPath.has(reference)) throw new Error(`${profile.profile} prior static dependency is missing: ${reference}`);
      pending.push(reference);
    }
  }
  return { dependency_count: visited.size, visited };
}

export function verifyForwardStaticRollbackSnapshot(forward, releaseContract, rollbackManifestBytes, store) {
  const contractResult = validateForwardStaticRollbackContract(forward, releaseContract, rollbackManifestBytes);
  const loadedInventory = readProtectedJsonDocument(store, {
    evidence_ref: forward.snapshot_inventory.ref,
    evidence_sha256: forward.snapshot_inventory.sha256,
  }, "forward rollback snapshot inventory");
  const inventory = loadedInventory.document;
  if (inventory.inventory_canonical_sha256 !== forward.snapshot_inventory.canonical_sha256
    || inventory.object_count !== forward.snapshot_inventory.object_count
    || inventory.stable_start_end !== true || !Array.isArray(inventory.items)
    || inventory.items.length !== inventory.object_count) {
    throw new Error("forward rollback snapshot inventory is stale or incomplete");
  }
  const items = new Map();
  for (const item of inventory.items) {
    const key = assertSafeRelativePath(item?.key, "forward rollback snapshot key");
    if (items.has(key)) throw new Error(`forward rollback snapshot key is duplicated: ${key}`);
    items.set(key, item);
  }
  const loadedByPath = new Map();
  for (const profile of forward.profiles) {
    for (const artifact of profile.artifacts) {
      const item = items.get(artifact.path);
      const bodyRef = assertSafeRelativePath(item?.body_path, `${profile.profile} prior static body ref`);
      if (!item || item.sha256 !== artifact.sha256 || item.size !== artifact.byte_size
        || !bodyRef.startsWith("private-local-only/s3/") || !bodyRef.endsWith(`/${artifact.path}`)) {
        throw new Error(`${profile.profile} prior snapshot metadata drifted: ${artifact.path}`);
      }
      const loaded = readProtectedArtifact(store, {
        evidence_ref: bodyRef,
        evidence_sha256: artifact.sha256,
      }, `${profile.profile} prior static artifact ${artifact.path}`);
      if (loaded.bytes.byteLength !== artifact.byte_size) {
        throw new Error(`${profile.profile} prior static byte size drifted: ${artifact.path}`);
      }
      if (loadedByPath.has(artifact.path)) throw new Error(`prior static path is shared across profiles: ${artifact.path}`);
      loadedByPath.set(artifact.path, loaded);
    }
  }
  const verifiedProfiles = [];
  const visited = new Set();
  for (const profile of forward.profiles) {
    const closure = validatePriorBytes(profile, loadedByPath, releaseContract);
    for (const file of closure.visited) visited.add(file);
    verifiedProfiles.push({
      profile: profile.profile,
      product_id: profile.product_id,
      artifact_count: profile.artifact_count,
      inventory_sha256: profile.inventory_sha256,
      dependency_count: closure.dependency_count,
      exact_bytes_verified: true,
    });
  }
  for (const file of loadedByPath.keys()) {
    if (!visited.has(file)) throw new Error(`prior static inventory contains an unbound artifact: ${file}`);
  }
  assertEqual(
    verifiedProfiles.map(({ product_id }) => product_id).sort(),
    contractResult.profiles.map(({ product_id }) => product_id).sort(),
    "forward rollback verified profiles",
  );
  return {
    save_id: forward.save_id,
    snapshot_inventory_sha256: forward.snapshot_inventory.sha256,
    snapshot_inventory_canonical_sha256: forward.snapshot_inventory.canonical_sha256,
    prior_snapshot_read_only: true,
    profiles: verifiedProfiles,
  };
}
