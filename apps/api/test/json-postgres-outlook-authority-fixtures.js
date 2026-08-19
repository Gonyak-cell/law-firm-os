import { createHash } from "node:crypto";
import { canonicalizeJson } from "../../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  createJsonPostgresOutlookAuthorityOperationBinding,
  JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION,
} from "../src/json-postgres-program-inputs.js";

export {
  firstStoredClaim,
  memoryS3,
  mutateStoredClaim,
} from "./json-postgres-outlook-authority-s3-fixture.js";

export const ACCOUNT = "770880870480";
export const REGION = "ap-northeast-2";
export const BUCKET = "lawos-prod-program-input-770880870480";
export const KMS =
  "arn:aws:kms:ap-northeast-2:770880870480:key/00000000-0000-0000-0000-000000000000";
export const DATABASE_SECRET =
  "arn:aws:secretsmanager:ap-northeast-2:770880870480:secret:rds!db-test-master";
export const NOW = Date.parse("2026-08-17T00:06:00.000Z");
const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const ARTIFACT_SHA256 = "c".repeat(64);
const MIGRATION_SHA256 = "e".repeat(64);
const AUTHORITY_SHA256 = "f".repeat(64);

export function databaseTargetReceipt(overrides = {}) {
  return {
    schema_version: "law-firm-os.json-postgres-database-target-receipt.v1",
    account_id: ACCOUNT,
    region: REGION,
    db_instance_identifier: "lawos-production-postgres",
    db_instance_arn:
      `arn:aws:rds:${REGION}:${ACCOUNT}:db:lawos-production-postgres`,
    endpoint_host:
      `lawos-production-postgres.fixture123.${REGION}.rds.amazonaws.com`,
    endpoint_port: 5432,
    database_name: "lawos",
    engine: "postgres",
    engine_version: "16.13",
    db_instance_status: "available",
    master_username: "lawos_admin",
    master_secret_arn: DATABASE_SECRET,
    master_secret_status: "active",
    master_secret_kms_key_arn: KMS,
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
    ...overrides,
  };
}

export function databaseTargetReceiptSha256(receipt) {
  return createHash("sha256")
    .update(canonicalizeJson(receipt))
    .digest("hex");
}

function fixturePacket(approvedTenantIds) {
  const databaseTarget = databaseTargetReceipt();
  const payload = {
    schema_version: "law-firm-os.json-postgres-execution-packet.v2",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    phase: "w13-production-cutover",
    action: "lawos-json-postgres-production-cutover",
    environment: "lawos-production",
    data_scope: "approved-real-manifest",
    contact_scope: ["individual-active-user-request-only"],
    bindings: {
      artifact_sha256: ARTIFACT_SHA256,
      migration_catalog_sha256: MIGRATION_SHA256,
      authority_manifest_sha256: AUTHORITY_SHA256,
      inventory_content_sha256: "d".repeat(64),
      inventory_delta_policy_sha256: "9".repeat(64),
    },
    target: {
      target_ref: "lawos-production",
      database_secret_ref: DATABASE_SECRET,
      aws_account: ACCOUNT,
      aws_region: REGION,
      program_input_bucket_name: BUCKET,
      program_input_expected_bucket_owner: ACCOUNT,
      program_input_kms_key_ref: KMS,
      database_target_receipt: databaseTarget,
      database_target_receipt_sha256:
        databaseTargetReceiptSha256(databaseTarget),
      approved_tenant_ids: approvedTenantIds,
    },
    allowed_modes: ["commit"],
    authorized_stages: ["cut-009"],
  };
  return {
    ...payload,
    packet_sha256: createHash("sha256")
      .update(canonicalizeJson(payload))
      .digest("hex"),
  };
}

const DEFAULT_PACKET_SHA256 =
  fixturePacket(["tenant_z", "tenant_a"]).packet_sha256;

export function operationEvent(overrides = {}) {
  return {
    action: JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION,
    phase: "w13-production-cutover",
    mode: "commit",
    stage: "cut-009",
    operation: "outlook-authority-bootstrap-001-007",
    attempt_ref: "outlook-authority-bootstrap-attempt-001",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    artifact_sha256: ARTIFACT_SHA256,
    packet_sha256: DEFAULT_PACKET_SHA256,
    authorization: {
      packet: { key: "packet" },
      trust_registry: { key: "registry" },
      approval_receipt: { key: "receipt" },
      approval_signature: { key: "signature" },
    },
    ...overrides,
  };
}

export function authorization(approvedTenantIds = ["tenant_z", "tenant_a"]) {
  return {
    exact: {
      sourceSha: SOURCE_SHA,
      sourceTree: SOURCE_TREE,
      artifactSha256: ARTIFACT_SHA256,
    },
    packet: fixturePacket(approvedTenantIds),
    approval: {
      valid: true,
      decision: "approved",
      approval_id: "owner-w13-approval-001",
      key_id: "owner-key-001",
      receipt_sha256: "1".repeat(64),
      signature_sha256: "4".repeat(64),
      registry_sha256: "2".repeat(64),
      registry_serial: 7,
      trust_anchor_sha256: "5".repeat(64),
      registry_signature_sha256: "6".repeat(64),
      external_authority_binding_sha256: "7".repeat(64),
      trust_root_verified: true,
      packet_sha256: fixturePacket(approvedTenantIds).packet_sha256,
      phase: "w13-production-cutover",
      action: "lawos-json-postgres-production-cutover",
      environment: "lawos-production",
      signed_at: "2026-08-17T00:05:00.000Z",
      expires_at: "2026-08-17T00:10:00.000Z",
    },
    authorization_input_sha256: "3".repeat(64),
  };
}

export function refreshAuthorizationPacketSha256(approved) {
  const payload = { ...approved.packet };
  delete payload.packet_sha256;
  approved.packet.packet_sha256 = createHash("sha256")
    .update(canonicalizeJson(payload))
    .digest("hex");
  return approved;
}

export function legacyAuthorization() {
  const approved = authorization();
  for (const key of [
    "schema_version", "source_sha", "source_tree", "action", "environment",
    "data_scope", "contact_scope",
  ]) delete approved.packet[key];
  for (const key of [
    "artifact_sha256", "inventory_content_sha256",
    "inventory_delta_policy_sha256",
  ]) delete approved.packet.bindings[key];
  delete approved.packet.target.database_target_receipt;
  delete approved.packet.target.database_target_receipt_sha256;
  approved.packet.target.database_secret_ref =
    "/lawos/production/postgres/master";
  return refreshAuthorizationPacketSha256(approved);
}

export function environment() {
  return {
    LAWOS_AWS_ACCOUNT_ID: ACCOUNT,
    AWS_REGION: REGION,
    LAWOS_APPROVAL_AUDIT_BUCKET: BUCKET,
    LAWOS_PROGRAM_INPUT_KMS_KEY_ARN: KMS,
  };
}

export function boundAuthorization(event = operationEvent(), base = authorization()) {
  const binding = createJsonPostgresOutlookAuthorityOperationBinding({
    event,
    authorization: base,
    env: environment(),
  });
  return {
    ...base,
    operation_binding_sha256: binding.operation_binding_sha256,
    databaseTargetReceipt: binding.database_target_receipt,
    database_target_receipt_sha256:
      binding.database_target_receipt_sha256,
  };
}
