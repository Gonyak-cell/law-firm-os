import path from "node:path";

import { GIT_OID } from "./constants.mjs";
import {
  assertEqual, assertExactKeys, assertSafeRelativePath, assertSha256, inventorySha256, profileMap,
} from "./primitives.mjs";
import { readProtectedArtifact, readProtectedJsonProof } from "./protected-evidence.mjs";
import { validateRollbackContract } from "./rollback-contract.mjs";

const INVENTORY_KEYS = [
  "artifact_count", "artifacts", "inventory_sha256", "manifest_sha256", "product_id", "profile",
  "proof_class", "schema_version", "source_locations", "source_sha", "version",
];
const ARTIFACT_KEYS = ["byte_size", "path", "protected_artifact_ref", "sha256"];

function binding(ref, digest) {
  return { evidence_ref: ref, evidence_sha256: digest };
}

function xmlAttribute(attributes, name) {
  return attributes.match(new RegExp(`\\b${name}="([^"]+)"`, "u"))?.[1] ?? null;
}

function manifestProjection(bytes) {
  const xml = bytes.toString("utf8");
  const text = (tag) => xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`, "u"))?.[1]?.trim() ?? null;
  const sourceLocations = [...xml.matchAll(/<SourceLocation\s+DefaultValue="([^"]+)"\s*\/>/gu)]
    .map((match) => match[1].replaceAll("&amp;", "&"));
  const launchEvents = [...xml.matchAll(/<LaunchEvent\b([^>]*)\/>/gu)].map((match) => {
    const type = xmlAttribute(match[1], "Type");
    const handler = xmlAttribute(match[1], "FunctionName");
    const mode = xmlAttribute(match[1], "SendMode");
    return `${type}:${handler}:${mode}`;
  });
  return { product_id: text("Id"), version: text("Version"), permission: text("Permissions"), sourceLocations, launchEvents };
}

function validateManifest(profile, store) {
  const loaded = readProtectedArtifact(store, binding(
    profile.protected_manifest_ref, profile.rollback_manifest_sha256,
  ), `${profile.profile} rollback manifest`);
  const projection = manifestProjection(loaded.bytes);
  if (projection.product_id !== profile.product_id || projection.version !== profile.rollback_version
    || projection.permission !== profile.permission
    || JSON.stringify(projection.sourceLocations) !== JSON.stringify(profile.source_locations)
    || JSON.stringify(projection.launchEvents) !== JSON.stringify(profile.launch_events)) {
    throw new Error(`${profile.profile} protected rollback manifest identity/runtime drifted`);
  }
  return loaded;
}

function normalizeArtifacts(proof, profile, store, globalRefs) {
  const seenPaths = new Set();
  const loaded = new Map();
  const inventory = [];
  for (const artifact of proof.artifacts ?? []) {
    assertExactKeys(artifact, ARTIFACT_KEYS, `${profile.profile} rollback inventory artifact`);
    const file = assertSafeRelativePath(artifact.path, `${profile.profile} rollback artifact path`);
    const ref = assertSafeRelativePath(artifact.protected_artifact_ref, `${profile.profile} rollback artifact ref`);
    if (!ref.startsWith(".omo/evidence/") || !ref.endsWith(`/${file}`)
      || seenPaths.has(file) || globalRefs.has(ref)) {
      throw new Error(`${profile.profile} rollback inventory has a shared, duplicate, or unbound artifact`);
    }
    if (!Number.isSafeInteger(artifact.byte_size) || artifact.byte_size < 1) {
      throw new Error(`${profile.profile} rollback artifact byte size is invalid`);
    }
    assertSha256(artifact.sha256, `${profile.profile} rollback artifact`);
    const value = readProtectedArtifact(store, binding(ref, artifact.sha256), `${profile.profile} rollback artifact ${file}`);
    if (value.bytes.byteLength !== artifact.byte_size) throw new Error(`${profile.profile} rollback artifact byte size drifted: ${file}`);
    seenPaths.add(file);
    globalRefs.add(ref);
    loaded.set(file, { ...artifact, bytes: value.bytes });
    inventory.push({ path: file, byte_size: artifact.byte_size, sha256: artifact.sha256 });
  }
  inventory.sort((left, right) => left.path.localeCompare(right.path, "en"));
  return { inventory, loaded };
}

function matchContractArtifact(contractArtifact, loaded, profile, name) {
  const actual = loaded.get(contractArtifact.path);
  if (!actual || actual.sha256 !== contractArtifact.sha256
    || actual.protected_artifact_ref !== contractArtifact.protected_artifact_ref) {
    throw new Error(`${profile.profile} rollback ${name} is missing, swapped, or hash-mismatched`);
  }
  return actual;
}

function validateInventory(profile, baseline, contractProfile, store, globalRefs) {
  const inventoryContract = profile.static_inventory;
  if (globalRefs.has(inventoryContract.protected_inventory_ref)) {
    throw new Error(`${profile.profile} protected rollback inventory is shared`);
  }
  globalRefs.add(inventoryContract.protected_inventory_ref);
  const loadedProof = readProtectedJsonProof(store, binding(
    inventoryContract.protected_inventory_ref, inventoryContract.protected_inventory_sha256,
  ), "rollback_static_inventory");
  const proof = loadedProof.proof;
  assertExactKeys(proof, INVENTORY_KEYS, `${profile.profile} rollback inventory proof`);
  if (proof.schema_version !== "amic-os.outlook-rollback-inventory.v1" || !GIT_OID.test(proof.source_sha ?? "")
    || proof.source_sha !== baseline.source_sha || proof.product_id !== profile.product_id
    || proof.profile !== profile.profile || proof.version !== profile.rollback_version
    || proof.manifest_sha256 !== profile.rollback_manifest_sha256
    || JSON.stringify(proof.source_locations) !== JSON.stringify(profile.source_locations)) {
    throw new Error(`${profile.profile} rollback inventory is stale or identity-swapped`);
  }
  const artifacts = normalizeArtifacts(proof, profile, store, globalRefs);
  const digest = inventorySha256(artifacts.inventory);
  if (proof.artifact_count !== artifacts.inventory.length || proof.artifact_count !== inventoryContract.artifact_count
    || proof.inventory_sha256 !== digest || inventoryContract.inventory_sha256 !== digest) {
    throw new Error(`${profile.profile} rollback static inventory hash/count mismatch`);
  }
  for (const required of contractProfile.required_static_paths) {
    if (!artifacts.loaded.has(required)) throw new Error(`${profile.profile} rollback required static artifact is missing: ${required}`);
  }
  const taskpane = matchContractArtifact(profile.taskpane_html, artifacts.loaded, profile, "taskpane HTML");
  const entry = matchContractArtifact(profile.entry_bundle, artifacts.loaded, profile, "entry bundle");
  const source = taskpane.bytes.toString("utf8");
  const modulePath = source.match(/<script\b(?=[^>]*\btype=["']module["'])[^>]*\bsrc=["']([^"']+\.js)["']/iu)?.[1];
  if (!modulePath || path.posix.basename(new URL(modulePath, "https://rollback.invalid/").pathname) !== path.posix.basename(entry.path)) {
    throw new Error(`${profile.profile} rollback taskpane is not bound to its entry bundle`);
  }
  const event = profile.event_runtime == null
    ? null : matchContractArtifact(profile.event_runtime, artifacts.loaded, profile, "event runtime");
  if (profile.event_runtime == null && artifacts.loaded.has("event-runtime.js")) {
    throw new Error(`${profile.profile} rollback inventory leaked the Matter event runtime`);
  }
  return { artifact_count: artifacts.inventory.length, event };
}

export function validateProtectedRollbackEvidence(rollback, baseline, contract, store) {
  const contractResult = validateRollbackContract(rollback, baseline, contract);
  profileMap(rollback.profiles, "protected rollback evidence");
  const globalRefs = new Set();
  const artifactCounts = new Map();
  for (const profile of rollback.profiles) {
    if (globalRefs.has(profile.protected_manifest_ref)) throw new Error("protected rollback manifests are shared");
    globalRefs.add(profile.protected_manifest_ref);
    validateManifest(profile, store);
    const expected = contract.profiles.find(({ product_id }) => product_id === profile.product_id);
    const inventory = validateInventory(profile, baseline, expected, store, globalRefs);
    artifactCounts.set(profile.product_id, inventory.artifact_count);
  }
  return {
    profiles: contractResult.profiles.map((profile) => ({
      ...profile, static_artifact_count: artifactCounts.get(profile.product_id),
    })),
  };
}
