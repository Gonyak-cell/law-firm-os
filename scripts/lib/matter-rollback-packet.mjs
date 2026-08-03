import { randomBytes, randomUUID } from "node:crypto";
import { statSync } from "node:fs";
import { extname } from "node:path";
import { canonicalizeJson } from "./runtime-safety-approval-contract.mjs";
import {
  SHA256,
  canonicalExistingFile,
  canonicalSha256,
  describeFile,
  exactKeys,
  fail,
  readJsonFile,
  requiredText,
  sha256File,
  timestamp,
  validateFileDescriptor,
} from "./matter-rollback-io.mjs";
import {
  MATTER_ROLLBACK_ACTION,
  MATTER_ROLLBACK_ATTEST_ACTION,
  MATTER_ROLLBACK_EXECUTION_ACTION,
  MATTER_ROLLBACK_PRODUCTION_AUTHORITY_ACTION,
  MATTER_ROLLBACK_SEAL_ACTION,
  assertDistinctTargets,
  assertMutuallyCompatible,
  assertSharedAuthority,
  validateManifestReference,
} from "./matter-rollback-release-evidence.mjs";
import { acquireMatterRollbackPacketMacosLiveValidations } from "./matter-rollback-macos-live.mjs";
import {
  matterRollbackProductionIntent,
  validateMatterRollbackAuthorityReference,
} from "./matter-rollback-authority.mjs";

export const MATTER_ROLLBACK_PACKET_SCHEMA = "law-firm-os.matter-rollback.packet.v2";
export const MATTER_ROLLBACK_API_PLAN_SCHEMA = "law-firm-os.matter-rollback.api-plan.v2";
export const MATTER_ROLLBACK_RF13_DIST_SIDECAR_SCHEMA = "law-firm-os.rf13-dist.rollback-receipt.v1";
export const MATTER_ROLLBACK_PACKET_MAX_AGE_MS = 2 * 60 * 60 * 1000;

const STAGING_PROFILE = "matter-staging-admin";
const PRODUCTION_PROFILE = "matter-prod-deploy-admin";
const CHANGE_LOGICAL_IDS = Object.freeze(["AdminFunction", "ApiFunction"]);
const CHANGE_PROPERTIES = Object.freeze(["Code", "Environment"]);

function manifestReference(ref) {
  return Object.freeze({ path: ref.path, sha256: ref.sha256, bytes: ref.bytes, manifest: ref.manifest });
}

function same(left, right) {
  return canonicalizeJson(left) === canonicalizeJson(right);
}

function adapterExport(surface) {
  return surface === "api" ? "executeMatterApiRollback" : "executeMatterDesktopRollback";
}

export function describeMatterRollbackAdapter(candidate, surface) {
  if (!new Set(["api", "desktop"]).has(surface)) fail("MATTER_ROLLBACK_ADAPTER", "rollback adapter surface is invalid");
  const descriptor = describeFile(candidate, `${surface} rollback adapter`);
  if (extname(descriptor.path) !== ".mjs" || !descriptor.path.includes(descriptor.sha256)) {
    fail("MATTER_ROLLBACK_ADAPTER", "rollback adapter path must contain its full SHA-256 and end in .mjs");
  }
  return Object.freeze({ ...descriptor, export_name: adapterExport(surface) });
}

export function validateMatterRollbackAdapterDescriptor(value, surface) {
  exactKeys(value, ["path", "sha256", "bytes", "export_name"], `${surface} adapter descriptor`);
  if (value.export_name !== adapterExport(surface)) fail("MATTER_ROLLBACK_ADAPTER", "rollback adapter export binding is invalid");
  validateFileDescriptor({ path: value.path, sha256: value.sha256, bytes: value.bytes }, `${surface} rollback adapter`);
  if (extname(value.path) !== ".mjs" || !value.path.includes(value.sha256)) fail("MATTER_ROLLBACK_ADAPTER", "rollback adapter is not immutable-hash named");
  return value;
}

export function resolveApprovedMatterRollbackAdapter(packet, surface, candidate) {
  const approved = packet.execution_boundary.adapters[surface];
  validateMatterRollbackAdapterDescriptor(approved, surface);
  const path = canonicalExistingFile(candidate, `${surface} rollback adapter`);
  if (path !== approved.path || sha256File(path) !== approved.sha256 || statSync(path).size !== approved.bytes) {
    fail("MATTER_ROLLBACK_ADAPTER_NOT_APPROVED", "selected rollback adapter is not the packet-approved module");
  }
  return Object.freeze({ ...approved, path });
}

export function buildMatterRollbackDryRunApiPlan(packet) {
  const changes = CHANGE_LOGICAL_IDS.map((logicalId) => Object.freeze({
    logical_id: logicalId,
    resource_type: "AWS::Lambda::Function",
    action: "Modify",
    replacement: "False",
    changed_properties: [...CHANGE_PROPERTIES],
  }));
  return Object.freeze({
    schema_version: MATTER_ROLLBACK_API_PLAN_SCHEMA,
    route: "A->B->A",
    first_transition: {
      from_source_sha: packet.target_a.manifest.source.sha,
      to_source_sha: packet.current_b.manifest.source.sha,
      artifact_sha256: packet.current_b.manifest.api.artifact.sha256,
      s3_version_id: packet.current_b.manifest.api.s3.version_id,
      environment_sha256: packet.current_b.manifest.api.environment_sha256,
    },
    rollback_transition: {
      from_source_sha: packet.current_b.manifest.source.sha,
      to_source_sha: packet.target_a.manifest.source.sha,
      artifact_sha256: packet.target_a.manifest.api.artifact.sha256,
      s3_version_id: packet.target_a.manifest.api.s3.version_id,
      environment_sha256: packet.target_a.manifest.api.environment_sha256,
    },
    changes,
    database_resource_change_count: 0,
    bucket_resource_change_count: 0,
    network_resource_change_count: 0,
  });
}

export function validateMatterRollbackApiPlan(plan, packet) {
  exactKeys(plan, [
    "schema_version", "route", "first_transition", "rollback_transition", "changes",
    "database_resource_change_count", "bucket_resource_change_count", "network_resource_change_count",
  ], "API rollback plan");
  if (!same(plan, buildMatterRollbackDryRunApiPlan(packet))) fail("MATTER_ROLLBACK_CHANGE_SET", "API rollback plan differs from the packet-bound Lambda-only plan");
  return plan;
}

export function buildMatterRollbackPacket({
  environment = "staging",
  currentRef,
  targetRef,
  apiAdapter,
  desktopAdapter,
  productionAuthority = null,
  packetId = `rfd017-${randomUUID()}`,
  executionNonce = randomBytes(32).toString("hex"),
  generatedAt = new Date().toISOString(),
  expiresAt = new Date(Date.parse(generatedAt) + 30 * 60 * 1000).toISOString(),
} = {}) {
  if (!new Set(["staging", "production"]).has(environment) || !currentRef?.manifest || !targetRef?.manifest) {
    fail("MATTER_ROLLBACK_INPUT", "environment and exact A/B manifest references are required");
  }
  if (currentRef.manifest.environment !== environment || targetRef.manifest.environment !== environment) fail("MATTER_ROLLBACK_ENVIRONMENT", "packet and manifest environments differ");
  assertDistinctTargets(currentRef.manifest, targetRef.manifest);
  assertMutuallyCompatible(currentRef.manifest, targetRef.manifest);
  assertSharedAuthority(currentRef.manifest, targetRef.manifest);
  validateMatterRollbackAdapterDescriptor(apiAdapter, "api");
  validateMatterRollbackAdapterDescriptor(desktopAdapter, "desktop");
  requiredText(packetId, "packet_id", /^[A-Za-z0-9._:-]{8,128}$/u);
  requiredText(executionNonce, "execution_nonce", /^[0-9a-f]{64}$/u);
  const generated = timestamp(generatedAt, "generated_at");
  const expires = timestamp(expiresAt, "expires_at");
  if (expires <= generated || expires - generated > MATTER_ROLLBACK_PACKET_MAX_AGE_MS) fail("MATTER_ROLLBACK_PACKET_FRESHNESS", "packet validity window is invalid");
  if (environment === "production" && !productionAuthority) fail("MATTER_ROLLBACK_PRODUCTION_AUTHORITY_REQUIRED", "production rollback requires separate authority");
  if (environment === "staging" && productionAuthority) fail("MATTER_ROLLBACK_PRODUCTION_AUTHORITY_UNEXPECTED", "production authority is invalid for staging");
  const authority = targetRef.manifest.rollback_authority;
  const shell = { current_b: manifestReference(currentRef), target_a: manifestReference(targetRef) };
  const apiPlan = buildMatterRollbackDryRunApiPlan(shell);
  const body = {
    schema_version: MATTER_ROLLBACK_PACKET_SCHEMA,
    packet_id: packetId,
    execution_nonce: executionNonce,
    environment,
    route: "api:A->B->A;desktop:B->A",
    ...shell,
    schema_compatibility: {
      current_version: currentRef.manifest.schema_compatibility.version,
      target_version: targetRef.manifest.schema_compatibility.version,
      bidirectional_read_compatible: true,
      data_rollback_required: false,
    },
    approval: {
      action: MATTER_ROLLBACK_ACTION,
      execution_action: MATTER_ROLLBACK_EXECUTION_ACTION,
      attestation_action: MATTER_ROLLBACK_ATTEST_ACTION,
      seal_action: MATTER_ROLLBACK_SEAL_ACTION,
      owner_role: authority.owner_role,
      attestor_role: authority.attestor_role,
      trust_registry: authority.trust_registry,
    },
    health_expectations: {
      a_source_revision: targetRef.manifest.source.sha,
      b_source_revision: currentRef.manifest.source.sha,
      a_package_manifest_sha256: targetRef.manifest.desktop.release_evidence.build_manifest.sha256,
      b_package_manifest_sha256: currentRef.manifest.desktop.release_evidence.build_manifest.sha256,
      durable_readback_preserved: true,
      data_rollback_write_count: 0,
    },
    execution_boundary: {
      required_profile: environment === "production" ? PRODUCTION_PROFILE : STAGING_PROFILE,
      adapters: { api: apiAdapter, desktop: desktopAdapter },
      approved_api_plan: apiPlan,
      approved_api_plan_sha256: canonicalSha256(apiPlan),
      database_resource_change_count: 0,
      bucket_resource_change_count: 0,
      network_resource_change_count: 0,
      production_claim_allowed: false,
    },
    production_authority: productionAuthority,
    generated_at: generatedAt,
    expires_at: expiresAt,
  };
  return Object.freeze({ ...body, packet_sha256: canonicalSha256(body) });
}

function validateProductionReference(reference, packet, repoRoot, now) {
  const intent = matterRollbackProductionIntent(packet.current_b, packet.target_a);
  if (reference.intent_sha256 !== canonicalSha256(intent) || reference.required_profile !== PRODUCTION_PROFILE) fail("MATTER_ROLLBACK_PRODUCTION_AUTHORITY_INVALID", "production authority intent is invalid");
  validateMatterRollbackAuthorityReference(reference, {
    packet,
    action: MATTER_ROLLBACK_PRODUCTION_AUTHORITY_ACTION,
    role: packet.approval.owner_role,
    statementSha256: reference.intent_sha256,
    source: packet.target_a.manifest.source,
    repoRoot,
    now,
    production: true,
  });
}

export function validateMatterRollbackPacket(packet, {
  repoRoot = process.cwd(),
  now = Date.now(),
  allowExpired = false,
  macosLiveValidations = null,
} = {}) {
  validateMatterRollbackPacketEnvelope(packet, { now, allowExpired });
  const current = validateManifestReference(packet.current_b, "current B manifest", {
    repoRoot,
    now,
    macosLiveValidation: macosLiveValidations?.current_b ?? null,
  });
  const target = validateManifestReference(packet.target_a, "target A manifest", {
    repoRoot,
    now,
    macosLiveValidation: macosLiveValidations?.target_a ?? null,
  });
  if (current.manifest.environment !== packet.environment || target.manifest.environment !== packet.environment) fail("MATTER_ROLLBACK_ENVIRONMENT", "packet and manifest environments differ");
  assertDistinctTargets(current.manifest, target.manifest);
  assertMutuallyCompatible(current.manifest, target.manifest);
  assertSharedAuthority(current.manifest, target.manifest);
  exactKeys(packet.schema_compatibility, ["current_version", "target_version", "bidirectional_read_compatible", "data_rollback_required"], "packet schema compatibility");
  if (packet.schema_compatibility.current_version !== current.manifest.schema_compatibility.version
    || packet.schema_compatibility.target_version !== target.manifest.schema_compatibility.version
    || packet.schema_compatibility.bidirectional_read_compatible !== true || packet.schema_compatibility.data_rollback_required !== false) {
    fail("MATTER_ROLLBACK_SCHEMA_INCOMPATIBLE", "packet schema compatibility binding is invalid");
  }
  exactKeys(packet.health_expectations, [
    "a_source_revision", "b_source_revision", "a_package_manifest_sha256", "b_package_manifest_sha256",
    "durable_readback_preserved", "data_rollback_write_count",
  ], "packet health expectations");
  if (packet.health_expectations.a_source_revision !== target.manifest.source.sha
    || packet.health_expectations.b_source_revision !== current.manifest.source.sha
    || packet.health_expectations.a_package_manifest_sha256 !== target.manifest.desktop.release_evidence.build_manifest.sha256
    || packet.health_expectations.b_package_manifest_sha256 !== current.manifest.desktop.release_evidence.build_manifest.sha256
    || packet.health_expectations.durable_readback_preserved !== true || packet.health_expectations.data_rollback_write_count !== 0) {
    fail("MATTER_ROLLBACK_HEALTH_EXPECTATION", "packet health and package expectations drifted");
  }
  exactKeys(packet.approval, ["action", "execution_action", "attestation_action", "seal_action", "owner_role", "attestor_role", "trust_registry"], "packet approval");
  const authority = target.manifest.rollback_authority;
  if (packet.approval.action !== MATTER_ROLLBACK_ACTION || packet.approval.execution_action !== MATTER_ROLLBACK_EXECUTION_ACTION
    || packet.approval.attestation_action !== MATTER_ROLLBACK_ATTEST_ACTION || packet.approval.seal_action !== MATTER_ROLLBACK_SEAL_ACTION
    || packet.approval.owner_role !== authority.owner_role || packet.approval.attestor_role !== authority.attestor_role
    || !same(packet.approval.trust_registry, authority.trust_registry)) fail("MATTER_ROLLBACK_AUTHORITY_MISMATCH", "packet authority binding is invalid");
  exactKeys(packet.execution_boundary, [
    "required_profile", "adapters", "approved_api_plan", "approved_api_plan_sha256",
    "database_resource_change_count", "bucket_resource_change_count", "network_resource_change_count", "production_claim_allowed",
  ], "execution boundary");
  exactKeys(packet.execution_boundary.adapters, ["api", "desktop"], "adapter allowlist");
  validateMatterRollbackAdapterDescriptor(packet.execution_boundary.adapters.api, "api");
  validateMatterRollbackAdapterDescriptor(packet.execution_boundary.adapters.desktop, "desktop");
  validateMatterRollbackApiPlan(packet.execution_boundary.approved_api_plan, packet);
  if (canonicalSha256(packet.execution_boundary.approved_api_plan) !== packet.execution_boundary.approved_api_plan_sha256
    || packet.execution_boundary.database_resource_change_count !== 0
    || packet.execution_boundary.bucket_resource_change_count !== 0 || packet.execution_boundary.network_resource_change_count !== 0
    || packet.execution_boundary.production_claim_allowed !== false
    || packet.execution_boundary.required_profile !== (packet.environment === "production" ? PRODUCTION_PROFILE : STAGING_PROFILE)) {
    fail("MATTER_ROLLBACK_EXECUTION_BOUNDARY", "packet execution boundary drifted");
  }
  if (packet.environment === "production") validateProductionReference(packet.production_authority, packet, repoRoot, now);
  else if (packet.production_authority !== null) fail("MATTER_ROLLBACK_PRODUCTION_AUTHORITY_UNEXPECTED", "staging packet contains production authority");
  return packet;
}

export function validateMatterRollbackPacketEnvelope(packet, {
  now = Date.now(),
  allowExpired = false,
} = {}) {
  exactKeys(packet, [
    "schema_version", "packet_id", "execution_nonce", "environment", "route", "current_b", "target_a",
    "schema_compatibility", "approval", "health_expectations", "execution_boundary", "production_authority",
    "generated_at", "expires_at", "packet_sha256",
  ], "rollback packet");
  if (packet.schema_version !== MATTER_ROLLBACK_PACKET_SCHEMA || !new Set(["staging", "production"]).has(packet.environment)
    || packet.route !== "api:A->B->A;desktop:B->A") fail("MATTER_ROLLBACK_PACKET_SCHEMA", "rollback packet schema, environment, or route is invalid");
  requiredText(packet.packet_id, "packet_id", /^[A-Za-z0-9._:-]{8,128}$/u);
  requiredText(packet.execution_nonce, "execution_nonce", /^[0-9a-f]{64}$/u);
  const generated = timestamp(packet.generated_at, "generated_at");
  const expires = timestamp(packet.expires_at, "expires_at");
  if (expires <= generated || expires - generated > MATTER_ROLLBACK_PACKET_MAX_AGE_MS || (!allowExpired && (now < generated || now > expires))) {
    fail("MATTER_ROLLBACK_PACKET_FRESHNESS", "rollback packet is stale or not yet valid");
  }
  const body = { ...packet };
  delete body.packet_sha256;
  if (!SHA256.test(packet.packet_sha256) || canonicalSha256(body) !== packet.packet_sha256) fail("MATTER_ROLLBACK_PACKET_HASH", "packet canonical digest does not match");
  return packet;
}

export function readMatterRollbackPacket(candidate, {
  repoRoot = process.cwd(),
  now = Date.now(),
  allowExpired = false,
  macosLiveValidations = null,
} = {}) {
  const ref = readJsonFile(candidate, "rollback packet", { privateFile: true, repoRoot });
  validateMatterRollbackPacket(ref.value, { repoRoot, now, allowExpired, macosLiveValidations });
  return Object.freeze({ path: ref.path, bytes: ref.bytes, sha256: ref.sha256, packet: ref.value });
}

export function readMatterRollbackPacketLive(candidate, options = {}) {
  const ref = readJsonFile(candidate, "rollback packet", {
    privateFile: true,
    repoRoot: options.repoRoot ?? process.cwd(),
  });
  validateMatterRollbackPacketEnvelope(ref.value, options);
  const macosLiveValidations = acquireMatterRollbackPacketMacosLiveValidations(ref.value, options);
  const validated = readMatterRollbackPacket(ref.path, { ...options, macosLiveValidations });
  return Object.freeze({ ...validated, macosLiveValidations });
}

export function assertMatterRollbackProfile(packet, profile) {
  if (profile !== packet.execution_boundary.required_profile) fail("MATTER_ROLLBACK_PROFILE", "AWS profile differs from the packet boundary");
  if (packet.environment === "production" && profile !== PRODUCTION_PROFILE) fail("MATTER_ROLLBACK_PROFILE", "production rollback requires matter-prod-deploy-admin");
  return profile;
}
