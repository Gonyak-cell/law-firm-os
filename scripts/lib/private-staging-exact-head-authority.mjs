import { createHash } from "node:crypto";
import { canonicalizeJson } from "./runtime-safety-approval-contract.mjs";
import {
  PRIVATE_STAGING_ACCOUNT_ID,
  PRIVATE_STAGING_COST_LIMIT_KRW,
  PRIVATE_STAGING_REGION,
} from "./private-staging-contract.mjs";

export const PRIVATE_STAGING_EXACT_HEAD_PACKET_SCHEMA = "law-firm-os.private-staging.exact-head-authorization-packet.v1";
export const PRIVATE_STAGING_EXACT_HEAD_ACTION = "lawos-private-staging-exact-head-execution";
export const PRIVATE_STAGING_EXECUTION_SCOPE = Object.freeze([
  "branch-push",
  "pull-request-create",
  "exact-head-ci",
  "security-review",
  "artifact-upload",
  "cloudformation-change-set",
  "private-staging-deploy",
  "database-bootstrap",
  "synthetic-ses-delivery",
  "cut-005",
  "cut-006",
  "cut-007",
]);

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;

function fail(message) {
  const error = new Error(message);
  error.code = "PRIVATE_STAGING_EXACT_HEAD_PACKET_INVALID";
  throw error;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected, label) {
  if (!isRecord(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) fail(`${label} fields drifted`);
}

function assertDigest(value, name, pattern = SHA256) {
  if (typeof value !== "string" || !pattern.test(value)) fail(`${name} is invalid`);
}

function assertTimestamp(value, name) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value) || !Number.isFinite(Date.parse(value))) fail(`${name} is invalid`);
}

export function privateStagingPacketSha256(packet) {
  return createHash("sha256").update(canonicalizeJson(packet)).digest("hex");
}

export function buildPrivateStagingExactHeadPacket({
  packetId,
  baseMainSha,
  baseMainTree,
  sourceSha,
  sourceTree,
  artifactSha256,
  artifactS3Key,
  artifactManifestSha256,
  syntheticIdentityManifestSha256,
  digests,
  monthlyEstimateKrw,
  monthlyEstimateUsd,
  generatedAt = new Date().toISOString(),
  expiresAt,
} = {}) {
  const packet = {
    schema_version: PRIVATE_STAGING_EXACT_HEAD_PACKET_SCHEMA,
    packet_id: packetId,
    action: PRIVATE_STAGING_EXACT_HEAD_ACTION,
    account_id: PRIVATE_STAGING_ACCOUNT_ID,
    region: PRIVATE_STAGING_REGION,
    environment: "lawos-staging",
    base_main_sha: baseMainSha,
    base_main_tree: baseMainTree,
    source_sha: sourceSha,
    source_tree: sourceTree,
    artifact_sha256: artifactSha256,
    artifact_s3_key: artifactS3Key,
    artifact_manifest_sha256: artifactManifestSha256,
    synthetic_identity_manifest_sha256: syntheticIdentityManifestSha256,
    execution_scope: [...PRIVATE_STAGING_EXECUTION_SCOPE],
    data_scope: ["synthetic-only"],
    contact_scope: ["synthetic-mailbox-only"],
    constraints: {
      approved_resource_prefix: "lawos-private-staging",
      protected_amic_resource_mutation_allowed: false,
      production_resource_mutation_allowed: false,
      production_iam_reuse_allowed: false,
      real_data_allowed: false,
      public_rds_allowed: false,
      public_s3_allowed: false,
      json_fallback_allowed: false,
      json_writer_allowed: false,
      dual_write_allowed: false,
      file_current_authority_allowed: false,
      offline_mutation_allowed: false,
      memory_fallback_allowed: false,
      lambda_eni_bootstrap_temporary_only: true,
      synthetic_mailbox_delivery_only: true,
      monthly_cost_limit_krw: PRIVATE_STAGING_COST_LIMIT_KRW,
    },
    safe_counts: {
      monthly_estimate_krw: monthlyEstimateKrw,
      monthly_estimate_usd: monthlyEstimateUsd,
      synthetic_tenant_count: 6,
      real_data_count: 0,
      protected_resource_mutation_count: 0,
    },
    digests,
    generated_at: generatedAt,
    expires_at: expiresAt,
    approval_required: true,
  };
  validatePrivateStagingExactHeadPacket(packet);
  return Object.freeze(packet);
}

export function validatePrivateStagingExactHeadPacket(packet, expected = {}) {
  exactKeys(packet, [
    "schema_version", "packet_id", "action", "account_id", "region", "environment",
    "base_main_sha", "base_main_tree", "source_sha", "source_tree", "artifact_sha256", "artifact_s3_key",
    "artifact_manifest_sha256", "synthetic_identity_manifest_sha256", "execution_scope",
    "data_scope", "contact_scope", "constraints", "safe_counts", "digests",
    "generated_at", "expires_at", "approval_required",
  ], "exact-head packet");
  if (packet.schema_version !== PRIVATE_STAGING_EXACT_HEAD_PACKET_SCHEMA) fail("packet schema is invalid");
  if (typeof packet.packet_id !== "string" || !/^LAWOS-PRIVATE-STAGING-EXACT-HEAD-[A-Z0-9-]{8,128}$/u.test(packet.packet_id)) fail("packet_id is invalid");
  if (packet.action !== PRIVATE_STAGING_EXACT_HEAD_ACTION) fail("packet action is invalid");
  if (packet.account_id !== PRIVATE_STAGING_ACCOUNT_ID || packet.region !== PRIVATE_STAGING_REGION || packet.environment !== "lawos-staging") fail("packet AWS/environment binding is invalid");
  assertDigest(packet.base_main_sha, "base_main_sha", SHA1);
  assertDigest(packet.base_main_tree, "base_main_tree", SHA1);
  assertDigest(packet.source_sha, "source_sha", SHA1);
  assertDigest(packet.source_tree, "source_tree", SHA1);
  assertDigest(packet.artifact_sha256, "artifact_sha256");
  assertDigest(packet.artifact_manifest_sha256, "artifact_manifest_sha256");
  assertDigest(packet.synthetic_identity_manifest_sha256, "synthetic_identity_manifest_sha256");
  if (packet.artifact_s3_key !== `lawos-private-staging/${packet.source_sha}/${packet.artifact_sha256}.zip`) fail("artifact_s3_key is not exact-head bound");
  if (JSON.stringify(packet.execution_scope) !== JSON.stringify(PRIVATE_STAGING_EXECUTION_SCOPE)) fail("execution_scope is incomplete or reordered");
  if (JSON.stringify(packet.data_scope) !== JSON.stringify(["synthetic-only"]) || JSON.stringify(packet.contact_scope) !== JSON.stringify(["synthetic-mailbox-only"])) fail("packet scope is invalid");
  exactKeys(packet.constraints, [
    "approved_resource_prefix", "protected_amic_resource_mutation_allowed", "production_resource_mutation_allowed",
    "production_iam_reuse_allowed", "real_data_allowed", "public_rds_allowed", "public_s3_allowed",
    "json_fallback_allowed", "json_writer_allowed", "dual_write_allowed", "file_current_authority_allowed",
    "offline_mutation_allowed", "memory_fallback_allowed", "lambda_eni_bootstrap_temporary_only",
    "synthetic_mailbox_delivery_only", "monthly_cost_limit_krw",
  ], "packet constraints");
  const requiredFalse = [
    "protected_amic_resource_mutation_allowed", "production_resource_mutation_allowed", "production_iam_reuse_allowed",
    "real_data_allowed", "public_rds_allowed", "public_s3_allowed", "json_fallback_allowed", "json_writer_allowed",
    "dual_write_allowed", "file_current_authority_allowed", "offline_mutation_allowed", "memory_fallback_allowed",
  ];
  if (packet.constraints.approved_resource_prefix !== "lawos-private-staging" || requiredFalse.some((key) => packet.constraints[key] !== false)) fail("packet mutation and persistence constraints are invalid");
  if (packet.constraints.lambda_eni_bootstrap_temporary_only !== true || packet.constraints.synthetic_mailbox_delivery_only !== true || packet.constraints.monthly_cost_limit_krw !== PRIVATE_STAGING_COST_LIMIT_KRW) fail("packet staging constraints are invalid");
  exactKeys(packet.safe_counts, ["monthly_estimate_krw", "monthly_estimate_usd", "synthetic_tenant_count", "real_data_count", "protected_resource_mutation_count"], "packet safe_counts");
  for (const [key, value] of Object.entries(packet.safe_counts)) if (typeof value !== "number" || !Number.isFinite(value) || value < 0) fail(`safe_counts.${key} is invalid`);
  if (packet.safe_counts.monthly_estimate_krw > PRIVATE_STAGING_COST_LIMIT_KRW || packet.safe_counts.synthetic_tenant_count !== 6 || packet.safe_counts.real_data_count !== 0 || packet.safe_counts.protected_resource_mutation_count !== 0) fail("packet safe counts exceed the approved boundary");
  if (!isRecord(packet.digests) || Object.keys(packet.digests).length < 4) fail("packet requires at least four source-controlled digests");
  for (const [key, digest] of Object.entries(packet.digests)) {
    if (!/^[a-z][a-z0-9_]{2,95}$/u.test(key)) fail(`packet digest key is invalid: ${key}`);
    assertDigest(digest, `digests.${key}`);
  }
  assertTimestamp(packet.generated_at, "generated_at");
  assertTimestamp(packet.expires_at, "expires_at");
  if (Date.parse(packet.expires_at) <= Date.parse(packet.generated_at)) fail("packet expiry must follow generation");
  if (packet.approval_required !== true) fail("packet must remain approval-gated");
  const expectedFields = {
    sourceSha: "source_sha",
    sourceTree: "source_tree",
    baseMainSha: "base_main_sha",
    baseMainTree: "base_main_tree",
    artifactSha256: "artifact_sha256",
    artifactManifestSha256: "artifact_manifest_sha256",
    syntheticIdentityManifestSha256: "synthetic_identity_manifest_sha256",
  };
  for (const [option, field] of Object.entries(expectedFields)) if (expected[option] != null && packet[field] !== expected[option]) fail(`${option} binding does not match`);
  return Object.freeze({
    valid: true,
    packet_id: packet.packet_id,
    packet_sha256: privateStagingPacketSha256(packet),
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    artifact_sha256: packet.artifact_sha256,
  });
}
