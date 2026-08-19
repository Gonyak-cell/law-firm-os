import { spawnSync as defaultSpawnSync } from "node:child_process";

import {
  createJsonPostgresDatabaseTargetReceiptSha256,
  JSON_POSTGRES_DATABASE_TARGET_RECEIPT_MAX_VALIDITY_MS,
  JSON_POSTGRES_DATABASE_TARGET_RECEIPT_VERSION,
  normalizeJsonPostgresDatabaseTargetReceipt,
} from "../../packages/persistence/src/postgres/database-target-receipt.js";

export const JSON_POSTGRES_DATABASE_TARGET_READ_PROFILE =
  "matter-readonly-auditor";
export const JSON_POSTGRES_DATABASE_TARGET_REGION = "ap-northeast-2";
export const JSON_POSTGRES_DATABASE_TARGET_INSTANCE =
  "lawos-production-postgres";

const ACCOUNT = "770880870480";
const GLOBAL_ARGS = Object.freeze([
  "--profile", JSON_POSTGRES_DATABASE_TARGET_READ_PROFILE,
  "--region", JSON_POSTGRES_DATABASE_TARGET_REGION,
  "--no-cli-pager", "--no-paginate", "--output", "json",
]);

function fail(message) {
  throw Object.assign(new Error(message), {
    code: "LAWOS_DATABASE_TARGET_READBACK",
  });
}

function cleanAwsEnvironment(env) {
  return Object.fromEntries([
    ...Object.entries(env)
      .filter(([key]) => !key.startsWith("AWS_")),
    ["AWS_CLI_AUTO_PROMPT", "off"],
    ["AWS_PAGER", ""],
  ]);
}

function readAwsJson(spawnSync, env, service, operation, args = []) {
  let result;
  try {
    result = spawnSync(
      "aws",
      [service, operation, ...args, ...GLOBAL_ARGS],
      {
        encoding: "utf8",
        env: cleanAwsEnvironment(env),
        maxBuffer: 2 * 1024 * 1024,
        timeout: 30_000,
        killSignal: "SIGKILL",
      },
    );
  } catch {
    fail("database target readback command failed");
  }
  if (result?.error || result?.signal || result?.status !== 0
    || typeof result.stdout !== "string" || !result.stdout.trim()) {
    fail("database target readback response was not completed");
  }
  try {
    const value = JSON.parse(result.stdout);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      fail("database target readback response was not an object");
    }
    return value;
  } catch (error) {
    if (error?.code === "LAWOS_DATABASE_TARGET_READBACK") throw error;
    fail("database target readback response was not JSON");
  }
}

function exactClock(clock) {
  let value;
  try {
    value = clock();
  } catch {
    fail("database target readback clock is invalid");
  }
  if (!Number.isSafeInteger(value)) fail("database target readback clock is invalid");
  try {
    new Date(value).toISOString();
  } catch {
    fail("database target readback clock is invalid");
  }
  return value;
}

export function produceJsonPostgresDatabaseTargetReceipt({
  spawnSync = defaultSpawnSync,
  env = process.env,
  clock = Date.now,
} = {}) {
  if (typeof spawnSync !== "function" || typeof clock !== "function"
    || !env || typeof env !== "object" || Array.isArray(env)) {
    fail("database target readback dependencies are invalid");
  }
  const startedAt = exactClock(clock);
  const caller = readAwsJson(spawnSync, env, "sts", "get-caller-identity");
  if (caller.Account !== ACCOUNT
    || typeof caller.Arn !== "string"
    || !new RegExp(
      `^arn:aws:sts::${ACCOUNT}:assumed-role/matter-readonly-auditor/[A-Za-z0-9+=,.@_-]{2,64}$`,
      "u",
    ).test(caller.Arn)
    || typeof caller.UserId !== "string" || !caller.UserId) {
    fail("database target caller identity is incomplete");
  }
  const rds = readAwsJson(
    spawnSync,
    env,
    "rds",
    "describe-db-instances",
    ["--db-instance-identifier", JSON_POSTGRES_DATABASE_TARGET_INSTANCE],
  );
  if (!Array.isArray(rds.DBInstances)
    || rds.DBInstances.length !== 1
    || rds.Marker != null || rds.NextToken != null) {
    fail("database target RDS response is incomplete");
  }
  const instance = rds.DBInstances[0];
  const rdsSecret = instance?.MasterUserSecret;
  if (!instance || typeof instance !== "object" || Array.isArray(instance)
    || !rdsSecret || typeof rdsSecret !== "object" || Array.isArray(rdsSecret)
    || instance.DBInstanceIdentifier !== JSON_POSTGRES_DATABASE_TARGET_INSTANCE
    || typeof instance.DBInstanceArn !== "string"
    || typeof instance.Endpoint?.Address !== "string"
    || !Number.isSafeInteger(instance.Endpoint?.Port)
    || typeof instance.DBName !== "string"
    || typeof instance.Engine !== "string"
    || typeof instance.EngineVersion !== "string"
    || typeof instance.DBInstanceStatus !== "string"
    || typeof instance.MasterUsername !== "string"
    || typeof rdsSecret.SecretArn !== "string" || !rdsSecret.SecretArn
    || typeof rdsSecret.SecretStatus !== "string"
    || typeof rdsSecret.KmsKeyId !== "string" || !rdsSecret.KmsKeyId) {
    fail("database target RDS metadata is incomplete");
  }
  const secret = readAwsJson(
    spawnSync,
    env,
    "secretsmanager",
    "describe-secret",
    ["--secret-id", rdsSecret.SecretArn],
  );
  if (Object.hasOwn(secret, "SecretString")
    || Object.hasOwn(secret, "SecretBinary")
    || secret.ARN !== rdsSecret.SecretArn
    || typeof secret.Name !== "string" || !secret.Name
    || typeof secret.KmsKeyId !== "string" || !secret.KmsKeyId
    || secret.DeletedDate != null
    || rdsSecret.SecretStatus !== "active"
    || rdsSecret.KmsKeyId !== secret.KmsKeyId) {
    fail("database target secret metadata is incomplete");
  }
  const finishedAt = exactClock(clock);
  const expiresAt = startedAt
    + JSON_POSTGRES_DATABASE_TARGET_RECEIPT_MAX_VALIDITY_MS;
  if (finishedAt < startedAt || finishedAt >= expiresAt) {
    fail("database target readback exceeded its validity window");
  }
  const receipt = normalizeJsonPostgresDatabaseTargetReceipt({
    schema_version: JSON_POSTGRES_DATABASE_TARGET_RECEIPT_VERSION,
    account_id: caller.Account,
    region: JSON_POSTGRES_DATABASE_TARGET_REGION,
    db_instance_identifier: instance.DBInstanceIdentifier,
    db_instance_arn: instance.DBInstanceArn,
    endpoint_host: instance.Endpoint?.Address,
    endpoint_port: instance.Endpoint?.Port,
    database_name: instance.DBName,
    engine: instance.Engine,
    engine_version: instance.EngineVersion,
    db_instance_status: instance.DBInstanceStatus,
    master_username: instance.MasterUsername,
    master_secret_arn: rdsSecret.SecretArn,
    master_secret_status: rdsSecret.SecretStatus,
    master_secret_kms_key_arn: secret.KmsKeyId,
    readback_source: {
      caller_arn: caller.Arn,
      operations: [
        "sts:GetCallerIdentity",
        "rds:DescribeDBInstances",
        "secretsmanager:DescribeSecret",
      ],
    },
    observed_at: new Date(finishedAt).toISOString(),
    expires_at: new Date(expiresAt).toISOString(),
  }, {
    target: {
      target_ref: "lawos-production",
      aws_account: caller.Account,
      aws_region: JSON_POSTGRES_DATABASE_TARGET_REGION,
      database_secret_ref: rdsSecret.SecretArn,
      program_input_kms_key_ref: secret.KmsKeyId,
    },
  });
  return Object.freeze({
    database_target_receipt: receipt,
    database_target_receipt_sha256:
      createJsonPostgresDatabaseTargetReceiptSha256(receipt),
  });
}

export function createJsonPostgresExecutionPacketWithDatabaseTarget({
  createPacket,
  packetOptions,
  produceTarget = produceJsonPostgresDatabaseTargetReceipt,
} = {}) {
  if (typeof createPacket !== "function"
    || !packetOptions || typeof packetOptions !== "object"
    || Array.isArray(packetOptions)) {
    fail("database target packet dependencies are invalid");
  }
  if (packetOptions.phase !== "w13-production-cutover") {
    return createPacket(packetOptions);
  }
  if (typeof produceTarget !== "function") {
    fail("database target packet producer is invalid");
  }
  const produced = produceTarget();
  const receipt = produced?.database_target_receipt;
  const digest = produced?.database_target_receipt_sha256;
  if (!receipt || typeof digest !== "string"
    || !/^[0-9a-f]{64}$/u.test(digest)
    || createJsonPostgresDatabaseTargetReceiptSha256(receipt) !== digest) {
    fail("database target producer output is invalid");
  }
  const suppliedReceipt = packetOptions.target?.database_target_receipt;
  const suppliedDigest = packetOptions.target?.database_target_receipt_sha256;
  if ((suppliedReceipt == null) !== (suppliedDigest == null)
    || (suppliedReceipt != null
      && (suppliedDigest !== digest
        || createJsonPostgresDatabaseTargetReceiptSha256(suppliedReceipt)
          !== digest))) {
    fail("caller-supplied database target receipt drifted from live readback");
  }
  return createPacket({
    ...packetOptions,
    target: {
      ...packetOptions.target,
      database_target_receipt: receipt,
      database_target_receipt_sha256: digest,
    },
  });
}
