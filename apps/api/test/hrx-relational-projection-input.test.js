import assert from "node:assert/strict";
import test from "node:test";
import {
  loadHrxRelationalProjectionRuntimeInput,
} from "../src/hrx-relational-projection-input.js";

const SOURCE_SHA = "1".repeat(40);
const SOURCE_TREE = "2".repeat(40);
const ARTIFACT_SHA256 = "3".repeat(64);
const PACKET_SHA256 = "4".repeat(64);
const MAPPING_SHA256 = "5".repeat(64);
const INVENTORY_SHA256 = "6".repeat(64);
const PERFORMANCE_SHA256 = "7".repeat(64);
const BUCKET = "lawos-prod-program-input-770880870480";
const KMS =
  "arn:aws:kms:ap-northeast-2:770880870480:key/"
  + "00000000-0000-0000-0000-000000000000";

function env(overrides = {}) {
  return {
    AWS_REGION: "ap-northeast-2",
    LAWOS_AWS_ACCOUNT_ID: "770880870480",
    LAWOS_DEPLOYMENT_COMMIT: SOURCE_SHA,
    LAWOS_DEPLOYMENT_TREE: SOURCE_TREE,
    LAWOS_DEPLOYMENT_ARTIFACT_SHA256: ARTIFACT_SHA256,
    LAWOS_EXECUTION_PACKET_SHA256: PACKET_SHA256,
    LAWOS_PROGRAM_INPUT_BUCKET: BUCKET,
    LAWOS_PROGRAM_INPUT_KMS_KEY_ARN: KMS,
    LAWOS_HRX_RELATIONAL_PROJECTION_ENABLED: "true",
    LAWOS_HRX_RELATIONAL_PROJECTION_EVENT_LOCATOR:
      JSON.stringify({
        schema_version:
          "law-firm-os.immutable-program-input-locator.v1",
      }),
    ...overrides,
  };
}

function event(overrides = {}) {
  return {
    mode: "resume",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    artifact_sha256: ARTIFACT_SHA256,
    packet_sha256: PACKET_SHA256,
    inputs: {
      mapping_manifest: {
        key: "program-input/mapping.json",
      },
      validation_evidence: {
        key: "program-input/validation.json",
      },
    },
    ...overrides,
  };
}

function validation(overrides = {}) {
  return {
    outcome: "PASS",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: PACKET_SHA256,
    mapping_manifest_sha256: MAPPING_SHA256,
    inventory_sha256: INVENTORY_SHA256,
    performance_acceptance_sha256: PERFORMANCE_SHA256,
    source_authority: "postgres-v2-generic-ledger",
    projection_authority: "read-only",
    claims: {
      generic_ledger_authority_preserved: true,
      projection_consumers_read_only: true,
      authority_promotion_not_granted: true,
    },
    ...overrides,
  };
}

test("HRX production projection input is exact-version loaded and fail-closed bound", async () => {
  const reads = [];
  let mappingValidationCount = 0;
  let evidenceValidationCount = 0;
  const loaded = await loadHrxRelationalProjectionRuntimeInput({
    env: env(),
    s3Client: {},
    resolveEvent: async () => event(),
    readJson: async (options) => {
      reads.push(options);
      return options.locator.key.endsWith("mapping.json")
        ? {
            manifest_sha256: MAPPING_SHA256,
            inventory_sha256: INVENTORY_SHA256,
            performance_acceptance_sha256: PERFORMANCE_SHA256,
          }
        : validation();
    },
    validateMapping: () => {
      mappingValidationCount += 1;
    },
    validateValidation: () => {
      evidenceValidationCount += 1;
    },
  });
  assert.equal(loaded.mappingManifest.manifest_sha256, MAPPING_SHA256);
  assert.equal(loaded.source_authority, "postgres-v2-generic-ledger");
  assert.equal(loaded.projection_authority, "read-model-only");
  assert.equal(loaded.json_fallback, false);
  assert.equal(mappingValidationCount, 1);
  assert.equal(evidenceValidationCount, 1);
  assert.equal(reads.length, 2);
  assert.equal(
    reads.every((read) =>
      read.expectedBucket === BUCKET
      && read.expectedBucketOwner === "770880870480"
      && read.expectedKmsKeyArn === KMS),
    true,
  );

  await assert.rejects(
    loadHrxRelationalProjectionRuntimeInput({
      env: env(),
      s3Client: {},
      resolveEvent: async () => event({
        packet_sha256: "6".repeat(64),
      }),
    }),
    (error) =>
      error?.code === "LAWOS_HRX_PROJECTION_RUNTIME_INPUT",
  );
  await assert.rejects(
    loadHrxRelationalProjectionRuntimeInput({
      env: env(),
      s3Client: {},
      resolveEvent: async () => event(),
      readJson: async (options) =>
        options.locator.key.endsWith("mapping.json")
          ? {
              manifest_sha256: MAPPING_SHA256,
              inventory_sha256: INVENTORY_SHA256,
              performance_acceptance_sha256: PERFORMANCE_SHA256,
            }
          : validation({ mapping_manifest_sha256: "8".repeat(64) }),
      validateMapping: () => {},
      validateValidation: () => {},
    }),
    (error) =>
      error?.code === "LAWOS_HRX_PROJECTION_RUNTIME_INPUT",
  );

  for (const drift of [
    { inventory_sha256: "9".repeat(64) },
    { performance_acceptance_sha256: "a".repeat(64) },
  ]) {
    await assert.rejects(
      loadHrxRelationalProjectionRuntimeInput({
        env: env(),
        s3Client: {},
        resolveEvent: async () => event(),
        readJson: async (options) =>
          options.locator.key.endsWith("mapping.json")
            ? {
                manifest_sha256: MAPPING_SHA256,
                inventory_sha256: INVENTORY_SHA256,
                performance_acceptance_sha256: PERFORMANCE_SHA256,
              }
            : validation(drift),
        validateMapping: () => {},
        validateValidation: () => {},
      }),
      (error) =>
        error?.code === "LAWOS_HRX_PROJECTION_RUNTIME_INPUT",
    );
  }
});

test("HRX production projection input stays disabled without touching immutable inputs", async () => {
  let called = false;
  const loaded = await loadHrxRelationalProjectionRuntimeInput({
    env: env({
      LAWOS_HRX_RELATIONAL_PROJECTION_ENABLED: "false",
    }),
    resolveEvent: async () => {
      called = true;
    },
  });
  assert.equal(loaded, null);
  assert.equal(called, false);
  await assert.rejects(
    loadHrxRelationalProjectionRuntimeInput({
      env: env({
        LAWOS_HRX_RELATIONAL_PROJECTION_ENABLED: "yes",
      }),
    }),
    (error) =>
      error?.code === "LAWOS_HRX_PROJECTION_RUNTIME_INPUT",
  );

  let rawEventResolved = false;
  await assert.rejects(
    loadHrxRelationalProjectionRuntimeInput({
      env: env({
        LAWOS_HRX_RELATIONAL_PROJECTION_EVENT_LOCATOR:
          JSON.stringify(event()),
      }),
      resolveEvent: async () => {
        rawEventResolved = true;
      },
    }),
    (error) =>
      error?.code === "LAWOS_HRX_PROJECTION_RUNTIME_INPUT",
  );
  assert.equal(rawEventResolved, false);

  await assert.rejects(
    loadHrxRelationalProjectionRuntimeInput({
      env: env({
        LAWOS_HRX_RELATIONAL_PROJECTION_EVENT_LOCATOR:
          "x".repeat(641),
      }),
    }),
    (error) =>
      error?.code === "LAWOS_HRX_PROJECTION_RUNTIME_INPUT",
  );
});
