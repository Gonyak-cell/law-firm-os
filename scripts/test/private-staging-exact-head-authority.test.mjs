import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPrivateStagingExactHeadPacket,
  PRIVATE_STAGING_EXECUTION_SCOPE,
  validatePrivateStagingExactHeadPacket,
} from "../lib/private-staging-exact-head-authority.mjs";

function packet() {
  return buildPrivateStagingExactHeadPacket({
    packetId: "LAWOS-PRIVATE-STAGING-EXACT-HEAD-EXECUTION-20260720",
    baseMainSha: "9".repeat(40),
    baseMainTree: "8".repeat(40),
    sourceSha: "a".repeat(40),
    sourceTree: "b".repeat(40),
    artifactSha256: "c".repeat(64),
    artifactS3Key: `lawos-private-staging/${"a".repeat(40)}/${"c".repeat(64)}.zip`,
    artifactManifestSha256: "d".repeat(64),
    syntheticIdentityManifestSha256: "e".repeat(64),
    monthlyEstimateKrw: 148_905,
    monthlyEstimateUsd: 99.27,
    generatedAt: "2026-07-20T00:00:00.000Z",
    expiresAt: "2026-07-27T00:00:00.000Z",
    digests: {
      infrastructure_template_sha256: "1".repeat(64),
      artifact_store_template_sha256: "2".repeat(64),
      cost_model_sha256: "3".repeat(64),
      internal_auth_contract_sha256: "4".repeat(64),
    },
  });
}

test("exact-head packet covers all authorized private-staging execution steps", () => {
  const value = packet();
  const result = validatePrivateStagingExactHeadPacket(value);
  assert.equal(result.valid, true);
  assert.deepEqual(value.execution_scope, PRIVATE_STAGING_EXECUTION_SCOPE);
  assert.match(result.packet_sha256, /^[0-9a-f]{64}$/u);
});

test("exact-head packet rejects drift, production scope, and excessive cost", () => {
  const artifactDrift = structuredClone(packet());
  artifactDrift.artifact_s3_key = "lawos-private-staging/wrong.zip";
  assert.throws(() => validatePrivateStagingExactHeadPacket(artifactDrift), /artifact_s3_key/u);

  const production = structuredClone(packet());
  production.constraints.production_resource_mutation_allowed = true;
  assert.throws(() => validatePrivateStagingExactHeadPacket(production), /constraints/u);

  const cost = structuredClone(packet());
  cost.safe_counts.monthly_estimate_krw = 300_001;
  assert.throws(() => validatePrivateStagingExactHeadPacket(cost), /safe counts/u);
});

test("exact-head packet validator enforces exact source and artifact bindings", () => {
  const value = packet();
  assert.throws(() => validatePrivateStagingExactHeadPacket(value, { sourceSha: "f".repeat(40) }), /sourceSha/u);
  assert.throws(() => validatePrivateStagingExactHeadPacket(value, { artifactSha256: "f".repeat(64) }), /artifactSha256/u);
});
