import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildStaticDryRunPlan, sha256, validateBuildInventories, validateDependencyLicenses,
  validateRollbackContract, validateSurfaceSeparation,
} from "../../lib/outlook-release-gates.mjs";
import { CLIENT_SCOPE_FINGERPRINT_SHA256 } from "../../lib/outlook-release/constants.mjs";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const readBytes = async (relative) => readFile(path.join(repoRoot, relative));
export const readJson = async (relative) => JSON.parse(await readBytes(relative));
export const contractRef = "contracts/outlook-addin-release-gates.json";
export const contractBytes = await readBytes(contractRef);
export const contract = JSON.parse(contractBytes);
export const baselineBytes = await readBytes(contract.baseline_receipt);
export const rollbackBytes = await readBytes(contract.rollback_contract);
export const surfaceBytes = await readBytes(contract.surface_contract);
export const baseline = JSON.parse(baselineBytes);
export const rollback = JSON.parse(rollbackBytes);
export const surface = JSON.parse(surfaceBytes);
export const packageLock = await readJson("package-lock.json");
export const hex = (character) => character.repeat(64);
export const oid = (character) => character.repeat(40);
export const clone = (value) => structuredClone(value);

export function lockWithReleaseDependencies() {
  const lock = clone(packageLock);
  lock.packages["node_modules/docx"] = { version: "9.7.1", license: "MIT" };
  lock.packages["node_modules/docusign-esign"] = { version: "10.0.0", license: "MIT" };
  return lock;
}

export function inventory() {
  return contract.build.required_static_paths.map((file, index) => ({
    path: file, byte_size: index + 1, sha256: sha256(file),
  })).concat([
    { path: "assets/matter.js", byte_size: 10, sha256: hex("d") },
    { path: "outlook-addin/assets/inquiry.js", byte_size: 11, sha256: hex("e") },
  ]);
}

export const fixturePackageLock = lockWithReleaseDependencies();
export const fixturePackageLockBytes = Buffer.from(JSON.stringify(fixturePackageLock));
export const sourceIdentity = {
  source_sha: oid("a"), source_tree: oid("b"), package_lock_sha256: sha256(fixturePackageLockBytes),
};
function artifactsFor(baselineArtifactBytes = baselineBytes, rollbackArtifactBytes = rollbackBytes) {
  return {
    baseline: { ref: contract.baseline_receipt, sha256: sha256(baselineArtifactBytes) },
    release_gate: { ref: contractRef, sha256: sha256(contractBytes) },
    rollback: { ref: contract.rollback_contract, sha256: sha256(rollbackArtifactBytes) },
    surface: { ref: contract.surface_contract, sha256: sha256(surfaceBytes) },
  };
}

export function releaseContextFor({
  baseline: baselineValue = baseline,
  rollback: rollbackValue = rollback,
  baselineArtifactBytes = baselineBytes,
  rollbackArtifactBytes = rollbackBytes,
} = {}) {
  return {
    baseline: baselineValue,
    contractArtifacts: artifactsFor(baselineArtifactBytes, rollbackArtifactBytes),
    existingPaths: new Set([...contract.required_release_paths, ...contract.required_test_paths]),
    expectedSourceIdentity: sourceIdentity,
    manifestHashesByPath: Object.fromEntries(contract.manifests.map((manifest) => {
      const profile = contract.profiles.find(({ production_manifest }) => production_manifest === manifest);
      return [manifest, profile ? (profile.profile === "matter-full" ? hex("1") : hex("2")) : sha256(manifest)];
    })),
    packageLock: fixturePackageLock,
    packageLockBytes: fixturePackageLockBytes,
    rollback: rollbackValue,
    surface,
  };
}

export const contractArtifacts = artifactsFor();
export const releaseContext = releaseContextFor();

export function releaseCandidate(
  candidateManifestHashes = { "matter-full": hex("1"), "inquiry-only": hex("2") },
  context = releaseContext,
) {
  const build = validateBuildInventories(inventory(), inventory(), contract);
  const graphScopes = [...contract.client_outlook_graph_connection_scopes].sort();
  const oauthScopes = [...contract.client_outlook_oauth_scopes];
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
      taskpane_html_sha256: build.inventory.find(({ path }) => path === profile.taskpane_html).sha256,
      bundle_path: index ? "outlook-addin/assets/inquiry.js" : "assets/matter.js",
      bundle_sha256: index ? hex("e") : hex("d"),
    })),
    event_runtime: build.inventory.find(({ path }) => path === "event-runtime.js"),
    manifest_validation: {
      validator: "office-addin-manifest@2.1.6",
      official_validation_count: 4,
      manifests: contract.manifests.map((manifest) => {
        const profile = contract.profiles.find(({ production_manifest }) => production_manifest === manifest);
        return { path: manifest, sha256: profile ? candidateManifestHashes[profile.profile] : sha256(manifest) };
      }),
    },
    profiles: contract.profiles.map((profile) => ({
      profile: profile.profile, product_id: profile.product_id, version: contract.release_version,
      permission: profile.permission, mailbox_min_version: profile.mailbox_min_version,
      manifest_sha256: candidateManifestHashes[profile.profile],
    })),
    coverage: { required_path_count: contract.required_release_paths.length + contract.required_test_paths.length },
    licenses: validateDependencyLicenses(fixturePackageLock, contract),
    rollback: validateRollbackContract(context.rollback, context.baseline, contract),
    surface: validateSurfaceSeparation(surface, context.baseline, contract),
    graph_scopes: {
      graph_connection_scopes: graphScopes, oauth_scopes: oauthScopes,
      fingerprint_sha256: CLIENT_SCOPE_FINGERPRINT_SHA256, diff: "none",
    },
    contract_artifacts: context.contractArtifacts,
    runtime_provider_calls: 0,
    external_mutations: 0,
    allowed_claim: "Exact source, deterministic local build, four official manifest validations, frozen profile drift, rollback metadata, and dependency licenses passed.",
    blocked_claim: "This receipt is not API/static/M365 deployment, propagation, real Outlook host, Graph delivery, DocuSign sandbox, or go-live evidence.",
  };
}

export function candidateManifestProjections() {
  return {
    "matter-full": { form_source_locations: ["https://static.amic-os.internal/addin/index.html"] },
    "inquiry-only": { form_source_locations: ["https://static.amic-os.internal/outlook-addin/index.html"] },
  };
}

export function staticPlanFor(
  hashes = { "matter-full": hex("1"), "inquiry-only": hex("2") },
  context = releaseContext,
) {
  return buildStaticDryRunPlan({
    releaseReceipt: releaseCandidate(hashes, context),
    releaseContext: context,
    sourceLocations: Object.fromEntries(Object.entries(candidateManifestProjections()).map(([profile, value]) => [
      profile, value.form_source_locations,
    ])),
    contract,
    bucketRef: "OUTLOOK_STATIC_BUCKET",
  });
}

export function awaitingM365Receipt(
  hashes = { "matter-full": hex("1"), "inquiry-only": hex("2") },
  { rollback: rollbackValue = rollback } = {},
) {
  const assignedGroupRefs = ["group-ref:outlook-roster-ten"];
  return {
    schema_version: "amic-os.outlook-m365-release.v2", status: "awaiting_authorized_deployment",
    ...sourceIdentity, version: contract.release_version, permission_event_diff: "none",
    graph_delegated_scope_diff: "none", propagation_window_is_sla: false,
    production_distribution: clone(contract.m365.production_distribution),
    prerequisites: Object.fromEntries(contract.m365.required_prerequisites.map((name) => [name, {
      status: "pending", artifact_sha256: null, evidence_sha256: null, evidence_ref: null,
      source_sha: null, source_tree: null, package_lock_sha256: null,
    }])),
    authorization_ref: null, go_live_approval_ref: null, mutation_count: 0,
    profiles: contract.profiles.map((profile, index) => {
      const fallback = rollbackValue.profiles.find(({ product_id }) => product_id === profile.product_id);
      const distribution = contract.m365.production_distribution.profiles
        .find(({ product_id }) => product_id === profile.product_id);
      const groupRefs = distribution.production_user_visible ? assignedGroupRefs : [];
      return {
        profile: profile.profile, product_id: profile.product_id, permission: profile.permission,
        deployment_mode: "fixed", source_locations: candidateManifestProjections()[profile.profile].form_source_locations,
        candidate_manifest_sha256: hashes[profile.profile], bundle_sha256: index ? hex("e") : hex("d"),
        distribution_role: distribution.distribution_role, assignment_state: distribution.assignment_state,
        production_user_visible: distribution.production_user_visible, assign_to_everyone: false,
        assignment_count: groupRefs.length, assignment_fingerprint_sha256: sha256(JSON.stringify(groupRefs)),
        rollback_manifest_sha256: fallback.rollback_manifest_sha256, rollback_manifest_ref: fallback.protected_manifest_ref,
      };
    }),
    execution_control: {
      abort_criteria: [], assignment_safety_evidence: null, authorization_evidence: null, central_deployment_evidence: null,
      go_live_evidence: null, monitoring_criteria: [], monitoring_evidence: null, operator_ref: null,
      owner_ref: null, pilot_assignment: null, rollback_readback_owner_ref: null,
      rollback_rehearsal_evidence: null, window_end_utc: null, window_start_utc: null,
    },
    operations: [], static_release: null, static_readbacks: [], readbacks: [],
    propagation_observations: [], host_evidence: [],
    claims: { central_deployment_verified: false, propagation_verified: false, real_outlook_verified: false, go_live_approved: false },
  };
}

export function m365Options(hashes, protectedEvidence, values = {}) {
  const context = values.releaseContext ?? releaseContext;
  const baselineValue = values.baseline ?? context.baseline;
  const rollbackValue = values.rollback ?? context.rollback;
  return {
    contract, baseline: baselineValue, rollback: rollbackValue,
    releaseCandidate: values.releaseCandidate ?? releaseCandidate(hashes, context), releaseContext: context,
    candidateManifestHashes: hashes, candidateManifestProjections: candidateManifestProjections(),
    expectedSourceIdentity: sourceIdentity, protectedEvidence,
    validationCutoffUtc: values.validationCutoffUtc ?? "2026-08-12T02:00:00.000Z",
  };
}
