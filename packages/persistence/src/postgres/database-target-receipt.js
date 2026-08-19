import { createHash } from "node:crypto";
import { canonicalizeJson } from "../../../runtime-auth/src/runtime-safety-approval-contract.js";

export const JSON_POSTGRES_DATABASE_TARGET_RECEIPT_VERSION =
  "law-firm-os.json-postgres-database-target-receipt.v1";
export const JSON_POSTGRES_DATABASE_TARGET_RECEIPT_MAX_VALIDITY_MS =
  15 * 60 * 1_000;

export const JSON_POSTGRES_DATABASE_TARGET_RECEIPT_KEYS = Object.freeze([
  "schema_version", "account_id", "region", "db_instance_identifier",
  "db_instance_arn", "endpoint_host", "endpoint_port", "database_name",
  "engine", "engine_version", "db_instance_status", "master_username",
  "master_secret_arn", "master_secret_status", "master_secret_kms_key_arn",
  "readback_source", "observed_at", "expires_at",
]);
export const JSON_POSTGRES_DATABASE_TARGET_READBACK_SOURCE_KEYS =
  Object.freeze(["caller_arn", "operations"]);
export const JSON_POSTGRES_DATABASE_TARGET_READBACK_OPERATIONS = Object.freeze([
  "sts:GetCallerIdentity",
  "rds:DescribeDBInstances",
  "secretsmanager:DescribeSecret",
]);
const ACCOUNT = /^\d{12}$/u;
const REGION = /^[a-z]{2}(?:-[a-z0-9]+)+-\d$/u;
const IDENTIFIER = /^[a-z][a-z0-9-]{0,62}$/u;
const KMS_KEY_RESOURCE = /^key\/(?:mrk-[0-9a-f]{32}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/u;

function fail(message) {
  throw Object.assign(new Error(message), {
    code: "JSON_POSTGRES_DATABASE_TARGET_RECEIPT",
  });
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== keys.length
    || keys.some((key) => !Object.hasOwn(value, key))) {
    fail(`${label} must have the exact closed shape`);
  }
}

function canonicalInstant(value, label) {
  if (typeof value !== "string") fail(`${label} must be canonical UTC`);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)
    || new Date(milliseconds).toISOString() !== value) {
    fail(`${label} must be canonical UTC`);
  }
  return milliseconds;
}

function partitionForRegion(region) {
  if (region.startsWith("cn-")) return "aws-cn";
  if (region.startsWith("us-gov-")) return "aws-us-gov";
  if (region.startsWith("us-iso-")) return "aws-iso";
  if (region.startsWith("us-isob-")) return "aws-iso-b";
  if (region.startsWith("eu-isoe-")) return "aws-iso-e";
  if (region.startsWith("us-isof-")) return "aws-iso-f";
  return "aws";
}

function exactArn(value, service, region, account, resourcePattern) {
  if (typeof value !== "string") return false;
  const partition = partitionForRegion(region);
  const prefix = `arn:${partition}:${service}:${region}:${account}:`;
  return value.startsWith(prefix)
    && resourcePattern.test(value.slice(prefix.length));
}

function validCallerArn(value, region, account) {
  if (typeof value !== "string") return false;
  const partition = partitionForRegion(region);
  return new RegExp(
    `^arn:${partition}:sts::${account}:assumed-role/matter-readonly-auditor/[A-Za-z0-9+=,.@_-]{2,64}$`,
    "u",
  ).test(value);
}

function validEndpoint(value, identifier, region) {
  if (typeof value !== "string" || value !== value.toLowerCase()) return false;
  const escapedIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const escapedRegion = region.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const suffix = partitionForRegion(region) === "aws-cn"
    ? "amazonaws\\.com\\.cn"
    : "amazonaws\\.com";
  return new RegExp(
    `^${escapedIdentifier}\\.[a-z0-9-]+\\.${escapedRegion}\\.rds\\.${suffix}$`,
    "u",
  ).test(value);
}

export function createJsonPostgresDatabaseTargetReceiptSha256(receipt) {
  return createHash("sha256")
    .update(canonicalizeJson(receipt))
    .digest("hex");
}

export function normalizeJsonPostgresDatabaseTargetReceipt(receipt, {
  target,
} = {}) {
  exactKeys(
    receipt,
    JSON_POSTGRES_DATABASE_TARGET_RECEIPT_KEYS,
    "database target receipt",
  );
  exactKeys(
    receipt.readback_source,
    JSON_POSTGRES_DATABASE_TARGET_READBACK_SOURCE_KEYS,
    "database target readback source",
  );
  const observedAt = canonicalInstant(receipt.observed_at, "observed_at");
  const expiresAt = canonicalInstant(receipt.expires_at, "expires_at");
  const account = receipt.account_id;
  const region = receipt.region;
  const identifier = receipt.db_instance_identifier;
  if (typeof account !== "string"
    || typeof region !== "string"
    || typeof identifier !== "string") {
    fail("database target receipt identity fields must be strings");
  }
  const expectedRdsArn = `arn:${partitionForRegion(region)}:rds:${region}:${account}:db:${identifier}`;
  const operations = receipt.readback_source.operations;
  if (receipt.schema_version !== JSON_POSTGRES_DATABASE_TARGET_RECEIPT_VERSION
    || !ACCOUNT.test(account ?? "")
    || !REGION.test(region ?? "")
    || account !== "770880870480"
    || region !== "ap-northeast-2"
    || target?.target_ref !== "lawos-production"
    || account !== target?.aws_account
    || region !== target?.aws_region
    || !IDENTIFIER.test(identifier ?? "")
    || identifier !== "lawos-production-postgres"
    || receipt.db_instance_arn !== expectedRdsArn
    || !validEndpoint(receipt.endpoint_host, identifier, region)
    || receipt.endpoint_port !== 5432
    || receipt.database_name !== "lawos"
    || receipt.engine !== "postgres"
    || receipt.engine_version !== "16.13"
    || receipt.db_instance_status !== "available"
    || receipt.master_username !== "lawos_admin"
    || receipt.master_secret_arn !== target?.database_secret_ref
    || !exactArn(
      receipt.master_secret_arn,
      "secretsmanager",
      region,
      account,
      /^secret:[A-Za-z0-9/_+=.@!-]+$/u,
    )
    || receipt.master_secret_status !== "active"
    || !exactArn(
      receipt.master_secret_kms_key_arn,
      "kms",
      region,
      account,
      KMS_KEY_RESOURCE,
    )
    || receipt.master_secret_kms_key_arn
      !== target?.program_input_kms_key_ref
    || !validCallerArn(receipt.readback_source.caller_arn, region, account)
    || !Array.isArray(operations)
    || operations.length
      !== JSON_POSTGRES_DATABASE_TARGET_READBACK_OPERATIONS.length
    || operations.some((operation, index) => typeof operation !== "string"
      || operation !== JSON_POSTGRES_DATABASE_TARGET_READBACK_OPERATIONS[index])
    || expiresAt <= observedAt
    || expiresAt - observedAt
      > JSON_POSTGRES_DATABASE_TARGET_RECEIPT_MAX_VALIDITY_MS) {
    fail("database target receipt drifted from the production target");
  }
  return Object.freeze({
    ...receipt,
    readback_source: Object.freeze({
      caller_arn: receipt.readback_source.caller_arn,
      operations: Object.freeze([...operations]),
    }),
  });
}

export function validateJsonPostgresDatabaseTargetReceiptBinding(target = {}) {
  const receipt = target.database_target_receipt;
  const receiptSha256 = target.database_target_receipt_sha256;
  if (receipt == null && receiptSha256 == null) return null;
  if (receipt == null
    || typeof receiptSha256 !== "string"
    || !/^[0-9a-f]{64}$/u.test(receiptSha256)) {
    fail("database target receipt binding is incomplete");
  }
  const normalized = normalizeJsonPostgresDatabaseTargetReceipt(receipt, {
    target,
  });
  if (createJsonPostgresDatabaseTargetReceiptSha256(normalized)
    !== receiptSha256) {
    fail("database target receipt digest drifted");
  }
  return Object.freeze({
    database_target_receipt: normalized,
    database_target_receipt_sha256: receiptSha256,
  });
}
