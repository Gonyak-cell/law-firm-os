import { GIT_OID } from "./constants.mjs";
import {
  assertEqual, assertExactKeys, assertNoSensitiveMaterial, assertSafeRelativePath,
  assertSha256, canonical, inventorySha256, sha256,
} from "./primitives.mjs";
import { readProtectedJsonDocument } from "./protected-evidence.mjs";
import { parseOutlookManifest } from "../outlook-manifest-projection.mjs";

const PRODUCT_ID = "8f3cc90d-56dd-4c1c-b9c2-0a1100500101";
const ACCOUNT_ID = "770880870480";
const REGION = "ap-northeast-2";
const FUNCTION_NAME = "matter-lawos-api-prod";
const FUNCTION_ARN = `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME}`;
const DISTRIBUTION_ID = "E3MVAKX2DIR3CS";
const ROLLBACK_ORDER = [
  "restore_static_aliases",
  "forward_update_m365_manifest",
  "restore_cloudfront_behavior",
  "restore_api_published_version",
  "readback_all_surfaces",
];
const READBACKS = [
  "static_exact_alias_hashes_and_public_bytes",
  "m365_product_version_assignment_and_zero_launch_events",
  "cloudfront_distribution_hash_and_api_desktop_origin",
  "lambda_published_code_and_non_secret_configuration",
  "desktop_0.1.29_checksums_and_zero_mutation",
];

function assertBase64Sha256(value, name) {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]{43}=$/u.test(value)
    || Buffer.from(value, "base64").byteLength !== 32) {
    throw new Error(`${name} must be an exact base64 SHA-256`);
  }
  return value;
}

function manifestVersion(value, name) {
  const match = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/u.exec(value ?? "");
  if (!match) throw new Error(`${name} must be a four-part manifest version`);
  return match.slice(1).map(Number);
}

function compareVersion(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function validateStaticSurface(surface, forwardStatic, forwardStaticBytes) {
  assertExactKeys(surface, [
    "action", "candidate_immutable_objects_deleted", "contract_ref", "contract_sha256",
    "restore_profiles", "snapshot_inventory_canonical_sha256", "snapshot_inventory_sha256",
  ], "static rollback surface");
  if (surface.action !== "restore_prior_aliases_from_verified_snapshot"
    || surface.contract_ref !== "contracts/outlook-addin-forward-static-rollback.json"
    || surface.contract_sha256 !== sha256(forwardStaticBytes)) {
    throw new Error("static rollback contract SHA-256 or action drifted");
  }
  assertSha256(surface.contract_sha256, "static rollback contract");
  assertSha256(surface.snapshot_inventory_sha256, "static rollback inventory");
  assertSha256(surface.snapshot_inventory_canonical_sha256, "static rollback canonical inventory");
  if (surface.snapshot_inventory_sha256 !== forwardStatic?.snapshot_inventory?.sha256
    || surface.snapshot_inventory_canonical_sha256 !== forwardStatic?.snapshot_inventory?.canonical_sha256
    || surface.candidate_immutable_objects_deleted !== false) {
    throw new Error("static rollback snapshot or immutable-object preservation drifted");
  }
  assertEqual(surface.restore_profiles, ["matter-full", "inquiry-only"], "static rollback profiles");
}

function validateM365Surface(surface, forwardStatic, rollbackManifestBytes) {
  assertExactKeys(surface, [
    "action", "assignment_count", "assignment_policy", "candidate_manifest_versions",
    "forward_manifest_path", "forward_manifest_sha256", "forward_manifest_version",
    "fresh_opaque_assignment_snapshot_required", "launch_event_count", "product_id",
  ], "M365 rollback surface");
  const projection = parseOutlookManifest(rollbackManifestBytes.toString("utf8"));
  const target = manifestVersion(surface.forward_manifest_version, "forward rollback manifest version");
  for (const value of surface.candidate_manifest_versions ?? []) {
    if (compareVersion(target, manifestVersion(value, "candidate manifest version")) <= 0) {
      throw new Error("rollback manifest must move strictly forward from every candidate version");
    }
  }
  if (surface.action !== "central_manifest_forward_update" || surface.product_id !== PRODUCT_ID
    || surface.forward_manifest_path !== "apps/addin/manifest.canary.rollback.production.xml"
    || surface.forward_manifest_version !== "1.3.0.4"
    || surface.forward_manifest_sha256 !== sha256(rollbackManifestBytes)
    || projection.product_id !== surface.product_id || projection.version !== surface.forward_manifest_version
    || projection.launch_events.length !== 0 || surface.launch_event_count !== 0
    || forwardStatic?.forward_rollback?.manifest_sha256 !== surface.forward_manifest_sha256
    || forwardStatic?.forward_rollback?.manifest_version !== surface.forward_manifest_version) {
    throw new Error("forward rollback manifest identity or semantics drifted");
  }
  assertEqual(surface.candidate_manifest_versions, ["1.3.0.2", "1.3.0.3"], "candidate manifest versions");
  if (surface.assignment_policy !== "reconcile_to_fresh_same_authorized_single_principal"
    || surface.assignment_count !== 1 || surface.fresh_opaque_assignment_snapshot_required !== true) {
    throw new Error("M365 rollback assignment is not bound to one fresh authorized principal");
  }
}

function validateApiSurface(surface) {
  assertExactKeys(surface, [
    "account_id", "action", "checkpoint_latest", "code_sha256_base64", "code_size_bytes",
    "configuration", "evidence", "fresh_current_snapshot_required", "fresh_revision_id_required",
    "function_arn", "function_name", "historical_revision_id_reusable", "published_version",
    "published_version_arn", "published_version_snapshot_sha256", "region",
  ], "API rollback surface");
  assertExactKeys(surface.configuration, [
    "architecture", "environment_values_restored_from_save", "environment_variable_count",
    "environment_variable_name_set_sha256", "environment_variables_canonical_sha256", "handler",
    "memory_mib", "runtime", "timeout_seconds",
  ], "API rollback configuration");
  assertExactKeys(surface.checkpoint_latest, [
    "code_sha256_base64", "differs_from_published_version", "package_sha256", "qualifier",
  ], "API checkpoint latest");
  assertExactKeys(surface.evidence, [
    "checkpoint_configuration_ref", "checkpoint_configuration_sha256", "versions_ref", "versions_sha256",
  ], "API rollback evidence");
  if (!/^\d+$/u.test(surface.published_version ?? "")) {
    throw new Error("API rollback published version is required");
  }
  const exactVersionArn = `${FUNCTION_ARN}:${surface.published_version}`;
  if (surface.account_id !== ACCOUNT_ID || surface.region !== REGION || surface.function_name !== FUNCTION_NAME
    || surface.function_arn !== FUNCTION_ARN || surface.published_version_arn !== exactVersionArn) {
    throw new Error("API rollback target is not the exact published-version ARN");
  }
  if (surface.action !== "restore_exact_published_version_and_non_secret_configuration"
    || surface.fresh_current_snapshot_required !== true || surface.fresh_revision_id_required !== true
    || surface.historical_revision_id_reusable !== false) {
    throw new Error("API rollback does not require a fresh snapshot and RevisionId");
  }
  assertSha256(surface.published_version_snapshot_sha256, "API published version snapshot");
  assertBase64Sha256(surface.code_sha256_base64, "API published version code");
  if (!Number.isSafeInteger(surface.code_size_bytes) || surface.code_size_bytes < 1) {
    throw new Error("API published version code size is invalid");
  }
  if (surface.configuration.runtime !== "nodejs22.x"
    || surface.configuration.handler !== "apps/api/src/lambda.handler"
    || surface.configuration.architecture !== "x86_64"
    || !Number.isSafeInteger(surface.configuration.memory_mib) || surface.configuration.memory_mib < 128
    || surface.configuration.timeout_seconds !== 120
    || surface.configuration.environment_values_restored_from_save !== false
    || surface.configuration.environment_variable_count !== 49) {
    throw new Error("API rollback non-secret configuration drifted");
  }
  assertSha256(surface.configuration.environment_variable_name_set_sha256, "API environment name set");
  assertSha256(surface.configuration.environment_variables_canonical_sha256, "API environment fingerprint");
  if (surface.checkpoint_latest.qualifier !== "$LATEST"
    || surface.checkpoint_latest.differs_from_published_version !== true
    || surface.checkpoint_latest.code_sha256_base64 === surface.code_sha256_base64) {
    throw new Error("API checkpoint latest/published-version separation drifted");
  }
  assertBase64Sha256(surface.checkpoint_latest.code_sha256_base64, "API checkpoint latest code");
  assertSha256(surface.checkpoint_latest.package_sha256, "API checkpoint latest package");
  assertSafeRelativePath(surface.evidence.versions_ref, "API versions evidence ref");
  assertSafeRelativePath(surface.evidence.checkpoint_configuration_ref, "API configuration evidence ref");
  assertSha256(surface.evidence.versions_sha256, "API versions evidence");
  assertSha256(surface.evidence.checkpoint_configuration_sha256, "API configuration evidence");
}

function validateCloudFrontSurface(surface) {
  assertExactKeys(surface, [
    "action", "behavior_path_pattern", "config_canonical_sha256", "distribution_id", "evidence",
    "fresh_current_snapshot_required", "fresh_etag_required", "historical_etag_reusable",
    "restore_target_origin_id",
  ], "CloudFront rollback surface");
  assertExactKeys(surface.evidence, ["config_ref", "config_sha256"], "CloudFront rollback evidence");
  if (surface.action !== "restore_exact_distribution_config" || surface.distribution_id !== DISTRIBUTION_ID
    || surface.behavior_path_pattern !== "api/desktop*"
    || surface.restore_target_origin_id !== "matter-temp-desktop-api-origin"
    || surface.fresh_current_snapshot_required !== true || surface.fresh_etag_required !== true
    || surface.historical_etag_reusable !== false) {
    throw new Error("CloudFront rollback target or fresh ETag policy drifted");
  }
  assertSha256(surface.config_canonical_sha256, "CloudFront canonical config");
  assertSafeRelativePath(surface.evidence.config_ref, "CloudFront config evidence ref");
  assertSha256(surface.evidence.config_sha256, "CloudFront config evidence");
}

function validateDesktopSurface(surface) {
  assertExactKeys(surface, ["action", "mutation_count", "profiles"], "desktop rollback surface");
  if (surface.action !== "none_remain_on_sealed_0.1.29" || surface.mutation_count !== 0) {
    throw new Error("desktop rollback surface must remain a zero-mutation compatibility baseline");
  }
  assertEqual(surface.profiles?.map(({ platform }) => platform), ["macos-arm64", "windows-x64"], "desktop profiles");
  for (const profile of surface.profiles) {
    assertExactKeys(profile, [
      "package_hashes", "platform", "source_sha", "source_tree", "trust_boundary", "version",
    ], `${profile.platform} desktop profile`);
    if (profile.version !== "0.1.29" || !GIT_OID.test(profile.source_sha ?? "")
      || !GIT_OID.test(profile.source_tree ?? "")) {
      throw new Error(`${profile.platform} desktop identity drifted`);
    }
    const expectedHashKeys = profile.platform === "macos-arm64"
      ? ["dmg_sha256", "zip_sha256"] : ["nsis_sha256", "portable_zip_sha256"];
    assertExactKeys(profile.package_hashes, expectedHashKeys, `${profile.platform} package hashes`);
    for (const [name, value] of Object.entries(profile.package_hashes)) assertSha256(value, `${profile.platform} ${name}`);
  }
}

export function validateCrossSurfaceForwardRollbackContract(packet, {
  packetBytes, forwardStatic, forwardStaticBytes, rollbackManifestBytes,
}) {
  assertNoSensitiveMaterial(packet, "cross-surface forward rollback packet");
  assertExactKeys(packet, [
    "application_checkpoint", "claims", "data_policy", "execution_control", "mode", "readbacks",
    "save_id", "schema_version", "surfaces",
  ], "cross-surface forward rollback packet");
  if (packet.schema_version !== "amic-os.outlook-cross-surface-forward-rollback.v1"
    || packet.save_id !== "OUTLOOK-INFRA-CONNECTIONS-SAVE-20260824-01"
    || packet.application_checkpoint !== "OUTLOOK-SAVE-20260824-03B93BFF"
    || packet.mode !== "local_dry_run") {
    throw new Error("cross-surface rollback packet identity drifted");
  }
  assertExactKeys(packet.surfaces, ["api", "cloudfront", "desktop", "m365", "static"], "rollback surfaces");
  validateStaticSurface(packet.surfaces.static, forwardStatic, forwardStaticBytes);
  validateM365Surface(packet.surfaces.m365, forwardStatic, rollbackManifestBytes);
  validateApiSurface(packet.surfaces.api);
  validateCloudFrontSurface(packet.surfaces.cloudfront);
  validateDesktopSurface(packet.surfaces.desktop);

  assertExactKeys(packet.data_policy, [
    "audit_action", "database_action", "mail_action", "migration_008_action", "secret_and_token_action",
    "vault_action",
  ], "rollback data policy");
  const requiredDataPolicy = {
    database_action: "leave_rows_and_schema_unchanged",
    migration_008_action: "leave_forward_only_migration_applied_if_present",
    vault_action: "leave_documents_unchanged",
    mail_action: "leave_messages_and_receipts_unchanged",
    audit_action: "leave_rows_unchanged",
    secret_and_token_action: "do_not_restore_or_print",
  };
  if (JSON.stringify(packet.data_policy) !== JSON.stringify(requiredDataPolicy)) {
    throw new Error("rollback data-preservation database action or protected-surface policy drifted");
  }
  assertExactKeys(packet.execution_control, [
    "first_failure_policy", "fresh_pre_rollback_snapshot_required", "historical_etag_usage",
    "historical_revision_id_usage", "mutated_surface_scope", "rollback_order",
  ], "rollback execution control");
  if (packet.execution_control.first_failure_policy !== "stop_once_no_retry"
    || packet.execution_control.mutated_surface_scope !== "already_mutated_surfaces_only"
    || packet.execution_control.fresh_pre_rollback_snapshot_required !== true
    || packet.execution_control.historical_revision_id_usage !== "reference_only"
    || packet.execution_control.historical_etag_usage !== "reference_only") {
    throw new Error("rollback stop-once or fresh-snapshot policy drifted");
  }
  assertEqual(packet.execution_control.rollback_order, ROLLBACK_ORDER, "cross-surface rollback order");
  assertEqual(packet.readbacks, READBACKS, "cross-surface rollback readbacks");
  assertExactKeys(packet.claims, [
    "actual_outlook_proved", "data_mutation_performed", "deployment_verified",
    "desktop_mutation_performed", "external_mutation_performed", "go_live_approved",
  ], "rollback claims");
  if (Object.values(packet.claims).some((value) => value !== false)) {
    throw new Error("local rollback dry-run contains an external or completion claim");
  }
  return {
    packet_sha256: sha256(packetBytes),
    forward_manifest_version: packet.surfaces.m365.forward_manifest_version,
    api_published_version: packet.surfaces.api.published_version,
    cloudfront_config_sha256: packet.surfaces.cloudfront.config_canonical_sha256,
    rollback_order: [...ROLLBACK_ORDER],
    external_mutations: 0,
    data_mutations: 0,
    desktop_mutations: 0,
  };
}

function evidenceBinding(ref, digest) {
  return { evidence_ref: ref, evidence_sha256: digest };
}

function validateVersionEvidence(api, version) {
  if (!version || version.FunctionName !== api.function_name || version.FunctionArn !== api.published_version_arn
    || version.Version !== api.published_version || version.CodeSha256 !== api.code_sha256_base64
    || version.CodeSize !== api.code_size_bytes || version.Runtime !== api.configuration.runtime
    || version.Handler !== api.configuration.handler || version.MemorySize !== api.configuration.memory_mib
    || version.Timeout !== api.configuration.timeout_seconds
    || JSON.stringify(version.Architectures) !== JSON.stringify([api.configuration.architecture])) {
    throw new Error("API published version evidence drifted");
  }
  const environment = version.Environment;
  if (environment?.ValuesStored !== false
    || environment.VariableCount !== api.configuration.environment_variable_count
    || environment.VariableNameSetSha256 !== api.configuration.environment_variable_name_set_sha256
    || environment.VariablesCanonicalSha256 !== api.configuration.environment_variables_canonical_sha256) {
    throw new Error("API published version environment fingerprint drifted");
  }
  if (inventorySha256(canonical(version)) !== api.published_version_snapshot_sha256) {
    throw new Error("API published version snapshot SHA-256 drifted");
  }
}

export function verifyCrossSurfaceForwardRollbackEvidence(packet, store) {
  const api = packet.surfaces.api;
  const versions = readProtectedJsonDocument(store, evidenceBinding(
    api.evidence.versions_ref, api.evidence.versions_sha256,
  ), "API published versions").document;
  const published = versions?.available === true && Array.isArray(versions?.value?.Versions)
    ? versions.value.Versions.find(({ Version }) => Version === api.published_version) : null;
  validateVersionEvidence(api, published);

  const checkpoint = readProtectedJsonDocument(store, evidenceBinding(
    api.evidence.checkpoint_configuration_ref, api.evidence.checkpoint_configuration_sha256,
  ), "API checkpoint configuration").document;
  if (checkpoint.FunctionName !== api.function_name || checkpoint.Version !== "$LATEST"
    || checkpoint.CodeSha256 !== api.checkpoint_latest.code_sha256_base64
    || checkpoint.CodeSha256 === published.CodeSha256
    || checkpoint.Environment?.ValuesStored !== false
    || checkpoint.Environment?.VariablesCanonicalSha256
      !== api.configuration.environment_variables_canonical_sha256) {
    throw new Error("API checkpoint latest evidence drifted or was confused with published version");
  }

  const cloudfront = packet.surfaces.cloudfront;
  const distribution = readProtectedJsonDocument(store, evidenceBinding(
    cloudfront.evidence.config_ref, cloudfront.evidence.config_sha256,
  ), "CloudFront rollback config").document;
  if (inventorySha256(canonical(distribution.DistributionConfig)) !== cloudfront.config_canonical_sha256) {
    throw new Error("CloudFront rollback canonical config SHA-256 drifted");
  }
  const behaviors = distribution?.DistributionConfig?.CacheBehaviors?.Items ?? [];
  const matches = behaviors.filter(({ PathPattern }) => PathPattern === cloudfront.behavior_path_pattern);
  if (matches.length !== 1 || matches[0].TargetOriginId !== cloudfront.restore_target_origin_id) {
    throw new Error("CloudFront api/desktop behavior rollback target drifted");
  }
  return {
    api: {
      function_arn: api.function_arn,
      published_version: api.published_version,
      published_version_arn: api.published_version_arn,
      code_sha256_base64: api.code_sha256_base64,
      published_version_snapshot_sha256: api.published_version_snapshot_sha256,
      environment_variables_canonical_sha256: api.configuration.environment_variables_canonical_sha256,
      checkpoint_latest_code_sha256_base64: checkpoint.CodeSha256,
      exact_published_version_verified: true,
    },
    cloudfront: {
      distribution_id: cloudfront.distribution_id,
      config_canonical_sha256: cloudfront.config_canonical_sha256,
      behavior_path_pattern: matches[0].PathPattern,
      behavior_target_origin_id: matches[0].TargetOriginId,
      exact_config_verified: true,
    },
    fresh_snapshot_required: true,
    fresh_revision_id_required: true,
    fresh_etag_required: true,
    stale_guard_values_reused: false,
  };
}

export function buildCrossSurfaceForwardRollbackReceipt({
  packet, packetSha256, sourceSha, sourceTree, contractResult, evidence,
  staticSnapshotProof, desktopReadback,
}) {
  if (!GIT_OID.test(sourceSha ?? "") || !GIT_OID.test(sourceTree ?? "")) {
    throw new Error("cross-surface rollback receipt requires exact Git source identity");
  }
  assertSha256(packetSha256, "cross-surface rollback packet");
  if (packetSha256 !== contractResult.packet_sha256 || contractResult.external_mutations !== 0
    || evidence.stale_guard_values_reused !== false || staticSnapshotProof?.prior_snapshot_read_only !== true
    || staticSnapshotProof.snapshot_inventory_sha256 !== packet.surfaces.static.snapshot_inventory_sha256
    || staticSnapshotProof.snapshot_inventory_canonical_sha256
      !== packet.surfaces.static.snapshot_inventory_canonical_sha256
    || !staticSnapshotProof.profiles?.every(({ exact_bytes_verified }) => exact_bytes_verified === true)) {
    throw new Error("cross-surface rollback receipt evidence is incomplete or drifted");
  }
  assertExactKeys(desktopReadback, [
    "desktop_mutation_count", "desktop_source_diff_count", "macos_exact_package_hashes_verified",
    "windows_package_hashes_contract_bound",
  ], "desktop rollback readback");
  if (desktopReadback.macos_exact_package_hashes_verified !== true
    || desktopReadback.windows_package_hashes_contract_bound !== true
    || desktopReadback.desktop_source_diff_count !== 0 || desktopReadback.desktop_mutation_count !== 0) {
    throw new Error("desktop 0.1.29 checksum/no-mutation readback failed");
  }
  return {
    schema_version: "amic-os.outlook-cross-surface-forward-rollback-receipt.v1",
    verdict: "PASS_LOCAL_DRY_RUN",
    source_sha: sourceSha,
    source_tree: sourceTree,
    packet_sha256: packetSha256,
    save_id: packet.save_id,
    application_checkpoint: packet.application_checkpoint,
    rollback_order: [...contractResult.rollback_order],
    surfaces: {
      static: {
        contract_sha256: packet.surfaces.static.contract_sha256,
        snapshot_inventory_sha256: staticSnapshotProof.snapshot_inventory_sha256,
        profiles: staticSnapshotProof.profiles,
      },
      m365: {
        product_id: packet.surfaces.m365.product_id,
        forward_manifest_version: packet.surfaces.m365.forward_manifest_version,
        forward_manifest_sha256: packet.surfaces.m365.forward_manifest_sha256,
        assignment_count: packet.surfaces.m365.assignment_count,
        fresh_opaque_assignment_snapshot_required: true,
      },
      api: evidence.api,
      cloudfront: evidence.cloudfront,
      desktop: {
        action: packet.surfaces.desktop.action,
        profiles: packet.surfaces.desktop.profiles,
        ...desktopReadback,
      },
    },
    execution_control: {
      ...packet.execution_control,
      fresh_revision_id_required: evidence.fresh_revision_id_required,
      fresh_etag_required: evidence.fresh_etag_required,
      stale_guard_values_reused: evidence.stale_guard_values_reused,
    },
    data_policy: packet.data_policy,
    post_rollback_readbacks: [...packet.readbacks],
    mutations: {
      external: 0,
      database_schema: 0,
      database_rows: 0,
      vault_documents: 0,
      mail_and_receipts: 0,
      audit_rows: 0,
      desktop: 0,
    },
    actual_outlook_proved: false,
    deployment_verified: false,
    go_live_approved: false,
    blocked_claim: "This local dry-run did not mutate AWS, Microsoft 365, static objects, data, or desktop software and is not real Outlook or deployment evidence.",
  };
}
