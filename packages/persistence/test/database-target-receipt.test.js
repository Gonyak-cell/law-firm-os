import assert from "node:assert/strict";
import test from "node:test";

import {
  createJsonPostgresDatabaseTargetReceiptSha256,
  JSON_POSTGRES_DATABASE_TARGET_READBACK_OPERATIONS,
  JSON_POSTGRES_DATABASE_TARGET_READBACK_SOURCE_KEYS,
  JSON_POSTGRES_DATABASE_TARGET_RECEIPT_KEYS,
  JSON_POSTGRES_DATABASE_TARGET_RECEIPT_MAX_VALIDITY_MS,
  normalizeJsonPostgresDatabaseTargetReceipt,
  validateJsonPostgresDatabaseTargetReceiptBinding,
} from "../src/postgres/database-target-receipt.js";

const ACCOUNT = "770880870480";
const REGION = "ap-northeast-2";
const SECRET =
  "arn:aws:secretsmanager:ap-northeast-2:770880870480:secret:rds!db-8ef074eb-f9ec-4d3b-b191-994b4e161d3c-iq9bAl";

function receipt() {
  return {
    schema_version: "law-firm-os.json-postgres-database-target-receipt.v1",
    account_id: ACCOUNT,
    region: REGION,
    db_instance_identifier: "lawos-production-postgres",
    db_instance_arn:
      `arn:aws:rds:${REGION}:${ACCOUNT}:db:lawos-production-postgres`,
    endpoint_host:
      "lawos-production-postgres.ctawsgoy2p9y.ap-northeast-2.rds.amazonaws.com",
    endpoint_port: 5432,
    database_name: "lawos",
    engine: "postgres",
    engine_version: "16.13",
    db_instance_status: "available",
    master_username: "lawos_admin",
    master_secret_arn: SECRET,
    master_secret_status: "active",
    master_secret_kms_key_arn:
      "arn:aws:kms:ap-northeast-2:770880870480:key/75868150-c892-47fc-8bea-17caa1808127",
    readback_source: {
      caller_arn:
        `arn:aws:sts::${ACCOUNT}:assumed-role/matter-readonly-auditor/readback`,
      operations: [
        "sts:GetCallerIdentity",
        "rds:DescribeDBInstances",
        "secretsmanager:DescribeSecret",
      ],
    },
    observed_at: "2026-08-17T00:00:00.000Z",
    expires_at: "2026-08-17T00:15:00.000Z",
  };
}

function target(value = receipt()) {
  return {
    target_ref: "lawos-production",
    aws_account: ACCOUNT,
    aws_region: REGION,
    database_secret_ref: SECRET,
    program_input_kms_key_ref:
      "arn:aws:kms:ap-northeast-2:770880870480:key/75868150-c892-47fc-8bea-17caa1808127",
    database_target_receipt: value,
    database_target_receipt_sha256:
      createJsonPostgresDatabaseTargetReceiptSha256(value),
  };
}

test("database target receipt binds exact live RDS and secret metadata", () => {
  const value = target();
  const binding = validateJsonPostgresDatabaseTargetReceiptBinding(value);

  assert.equal(
    binding.database_target_receipt.endpoint_host,
    "lawos-production-postgres.ctawsgoy2p9y.ap-northeast-2.rds.amazonaws.com",
  );
  assert.equal(binding.database_target_receipt.endpoint_port, 5432);
  assert.equal(binding.database_target_receipt.database_name, "lawos");
  assert.equal(binding.database_target_receipt.master_secret_arn, SECRET);
  assert.equal(Object.isFrozen(binding.database_target_receipt), true);
  assert.equal(Object.isFrozen(binding.database_target_receipt.readback_source), true);
  assert.equal(
    Object.isFrozen(binding.database_target_receipt.readback_source.operations),
    true,
  );
  assert.equal(
    JSON_POSTGRES_DATABASE_TARGET_RECEIPT_MAX_VALIDITY_MS,
    15 * 60 * 1_000,
  );
  assert.deepEqual(Object.keys(value.database_target_receipt),
    [...JSON_POSTGRES_DATABASE_TARGET_RECEIPT_KEYS]);
  assert.deepEqual(Object.keys(value.database_target_receipt.readback_source),
    [...JSON_POSTGRES_DATABASE_TARGET_READBACK_SOURCE_KEYS]);
  assert.deepEqual(value.database_target_receipt.readback_source.operations,
    [...JSON_POSTGRES_DATABASE_TARGET_READBACK_OPERATIONS]);
});

test("database target receipt rejects closed-shape and identity drift", () => {
  const cases = [
    (value) => { value.extra = true; },
    (value) => { value.account_id = "000000000000"; },
    (value) => { value.account_id = { toString: () => ACCOUNT }; },
    (value) => { value.region = "us-east-1"; },
    (value) => { value.region = { toString: () => REGION }; },
    (value) => { value.db_instance_identifier = "other"; },
    (value) => { value.db_instance_arn += "-other"; },
    (value) => { value.endpoint_host = "other.ap-northeast-2.rds.amazonaws.com"; },
    (value) => { value.endpoint_port = "5432"; },
    (value) => { value.database_name = "postgres"; },
    (value) => { value.engine_version = "16.14"; },
    (value) => { value.db_instance_status = "modifying"; },
    (value) => { value.master_username = "postgres"; },
    (value) => { value.master_secret_arn += "-other"; },
    (value) => { value.master_secret_status = "scheduled-for-deletion"; },
    (value) => { value.master_secret_kms_key_arn = "alias/opaque"; },
    (value) => { value.readback_source.extra = true; },
    (value) => { value.readback_source.caller_arn = "arn:aws:sts::000000000000:assumed-role/other/readback"; },
    (value) => { value.readback_source.caller_arn = `arn:aws:sts::${ACCOUNT}:assumed-role/matter-prod-deploy-admin/readback`; },
    (value) => { value.readback_source.operations.reverse(); },
    (value) => { value.readback_source.operations[0] = { toString: () => "sts:GetCallerIdentity" }; },
    (value) => { value.observed_at = "2026-08-17T00:00:00Z"; },
    (value) => { value.expires_at = "2026-08-17T00:15:00.001Z"; },
  ];
  for (const mutate of cases) {
    const value = structuredClone(receipt());
    mutate(value);
    assert.throws(
      () => normalizeJsonPostgresDatabaseTargetReceipt(value, {
        target: target(receipt()),
      }),
      (error) => error?.code === "JSON_POSTGRES_DATABASE_TARGET_RECEIPT",
    );
  }
});

test("database target receipt rejects absent pairs and digest drift", () => {
  assert.equal(validateJsonPostgresDatabaseTargetReceiptBinding({}), null);
  const missingDigest = target();
  delete missingDigest.database_target_receipt_sha256;
  assert.throws(
    () => validateJsonPostgresDatabaseTargetReceiptBinding(missingDigest),
    (error) => error?.code === "JSON_POSTGRES_DATABASE_TARGET_RECEIPT",
  );
  assert.throws(
    () => validateJsonPostgresDatabaseTargetReceiptBinding({
      ...target(),
      database_target_receipt_sha256: "0".repeat(64),
    }),
    (error) => error?.code === "JSON_POSTGRES_DATABASE_TARGET_RECEIPT",
  );
  assert.throws(
    () => validateJsonPostgresDatabaseTargetReceiptBinding({
      ...target(),
      database_target_receipt_sha256: { toString: () => "0".repeat(64) },
    }),
    (error) => error?.code === "JSON_POSTGRES_DATABASE_TARGET_RECEIPT",
  );
  for (const driftedTarget of [
    { ...target(), target_ref: "other" },
    {
      ...target(),
      program_input_kms_key_ref:
        "arn:aws:kms:ap-northeast-2:770880870480:key/11111111-1111-1111-1111-111111111111",
    },
  ]) {
    assert.throws(
      () => validateJsonPostgresDatabaseTargetReceiptBinding(driftedTarget),
      (error) => error?.code === "JSON_POSTGRES_DATABASE_TARGET_RECEIPT",
    );
  }
});
