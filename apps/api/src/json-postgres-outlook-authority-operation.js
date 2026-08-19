import { createHash } from "node:crypto";
import { canonicalizeJson } from "../../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  validateJsonPostgresDatabaseTargetReceiptBinding,
} from "../../../packages/persistence/src/postgres/database-target-receipt.js";

export const JSON_POSTGRES_OUTLOOK_AUTHORITY_BOOTSTRAP_STAGE = "cut-009";
export const JSON_POSTGRES_OUTLOOK_AUTHORITY_BOOTSTRAP_OPERATION =
  "outlook-authority-bootstrap-001-007";
export const JSON_POSTGRES_OUTLOOK_AUTHORITY_OPERATION_BINDING_VERSION =
  "law-firm-os.json-postgres-outlook-authority-operation-binding.v3";
export const JSON_POSTGRES_OUTLOOK_AUTHORITY_LEGACY_OPERATION_BINDING_VERSION =
  "law-firm-os.json-postgres-outlook-authority-operation-binding.v2";

const ACTION = "lawos-json-postgres-production-bootstrap";
const PHASE = "w13-production-cutover";
const MODE = "commit";
const DOMAIN_V2 = "law-firm-os/json-postgres/outlook-authority-operation-binding/v2";
const DOMAIN_V3 = "law-firm-os/json-postgres/outlook-authority-operation-binding/v3";
const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const TOKEN = /^[A-Za-z0-9._:/+-]{1,240}$/u;
const KMS_KEY_ARN = /^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b|aws-iso-e|aws-iso-f):kms:([a-z]{2}(?:-[a-z0-9]+)+-\d):(\d{12}):key\/(mrk-[0-9a-f]{32}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/u;
const EVENT_KEYS = Object.freeze([
  "action",
  "phase",
  "mode",
  "stage",
  "operation",
  "attempt_ref",
  "source_sha",
  "source_tree",
  "artifact_sha256",
  "packet_sha256",
  "authorization",
]);
const AUTHORIZATION_KEYS = Object.freeze([
  "packet",
  "trust_registry",
  "approval_receipt",
  "approval_signature",
]);

function fail(message) {
  const error = new Error(message);
  error.code = "LAWOS_OUTLOOK_AUTHORITY_OPERATION_BINDING";
  throw error;
}

function closed(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).some((key) => !keys.includes(key))
    || keys.some((key) => !Object.hasOwn(value, key))) {
    fail(`${label} must have the exact closed shape`);
  }
}

function digest(domain, value) {
  return createHash("sha256")
    .update(domain)
    .update("\0")
    .update(canonicalizeJson(value))
    .digest("hex");
}

function canonicalInstant(value) {
  if (typeof value !== "string") return Number.NaN;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds)
    && new Date(milliseconds).toISOString() === value
    ? milliseconds
    : Number.NaN;
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

function kmsKeyIdentity(value, target) {
  const match = typeof value === "string" ? KMS_KEY_ARN.exec(value) : null;
  if (!match) fail("program_input_kms_key_ref must be an exact KMS key ARN");
  const [, partition, region, account, keyId] = match;
  if (region !== target?.aws_region
    || account !== target?.aws_account
    || partition !== partitionForRegion(region)) {
    fail("program_input_kms_key_ref drifted from the signed AWS target");
  }
  return Object.freeze({ partition, region, account, key_id: keyId });
}

export function isJsonPostgresOutlookAuthorityOperationCandidate(event = {}) {
  return event.action === ACTION
    && (event.mode === MODE || event.stage != null || event.operation != null);
}

export function assertJsonPostgresOutlookAuthorityBootstrapEvent(event = {}) {
  closed(event, EVENT_KEYS, "Outlook authority bootstrap event");
  closed(event.authorization, AUTHORIZATION_KEYS, "Outlook authority authorization");
  if (event.action !== ACTION
    || event.phase !== PHASE
    || event.mode !== MODE
    || event.stage !== JSON_POSTGRES_OUTLOOK_AUTHORITY_BOOTSTRAP_STAGE
    || event.operation !== JSON_POSTGRES_OUTLOOK_AUTHORITY_BOOTSTRAP_OPERATION
    || !TOKEN.test(event.attempt_ref ?? "")
    || !SHA1.test(event.source_sha ?? "")
    || !SHA1.test(event.source_tree ?? "")
    || !SHA256.test(event.artifact_sha256 ?? "")
    || !SHA256.test(event.packet_sha256 ?? "")) {
    fail("Outlook authority bootstrap event tuple is invalid");
  }
  return true;
}

export function createJsonPostgresOutlookAuthorityOperationBinding({
  event,
  authorization,
  env = process.env,
} = {}) {
  assertJsonPostgresOutlookAuthorityBootstrapEvent(event);
  const { exact, packet, approval } = authorization ?? {};
  const target = packet?.target;
  const bindings = packet?.bindings;
  const account = String(env.LAWOS_AWS_ACCOUNT_ID ?? "").trim();
  const region = String(env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? "").trim();
  const approvedTenantIds = target?.approved_tenant_ids;
  const kmsKey = kmsKeyIdentity(target?.program_input_kms_key_ref, target);
  let databaseTargetBinding;
  try {
    databaseTargetBinding =
      validateJsonPostgresDatabaseTargetReceiptBinding(target);
  } catch {
    fail("database target receipt drifted from the signed W13 packet");
  }
  const targetObservedAt = canonicalInstant(
    databaseTargetBinding?.database_target_receipt.observed_at,
  );
  const targetExpiresAt = canonicalInstant(
    databaseTargetBinding?.database_target_receipt.expires_at,
  );
  const approvalSignedAt = canonicalInstant(approval?.signed_at);
  if (exact?.sourceSha !== event.source_sha
    || exact?.sourceTree !== event.source_tree
    || exact?.artifactSha256 !== event.artifact_sha256
    || packet?.phase !== PHASE
    || packet?.packet_sha256 !== event.packet_sha256
    || !packet?.allowed_modes?.includes(MODE)
    || !packet?.authorized_stages?.includes(
      JSON_POSTGRES_OUTLOOK_AUTHORITY_BOOTSTRAP_STAGE,
    )
    || approval?.valid !== true
    || approval?.decision !== "approved"
    || !TOKEN.test(approval?.approval_id ?? "")
    || !TOKEN.test(approval?.key_id ?? "")
    || !SHA256.test(approval?.receipt_sha256 ?? "")
    || !SHA256.test(approval?.registry_sha256 ?? "")
    || !SHA256.test(authorization?.authorization_input_sha256 ?? "")
    || !SHA256.test(bindings?.migration_catalog_sha256 ?? "")
    || !SHA256.test(bindings?.authority_manifest_sha256 ?? "")
    || !TOKEN.test(target?.target_ref ?? "")
    || (!databaseTargetBinding && !TOKEN.test(target?.database_secret_ref ?? ""))
    || !/^\d{12}$/u.test(account)
    || account !== target?.aws_account
    || !TOKEN.test(region)
    || region !== target?.aws_region
    || !Array.isArray(approvedTenantIds)
    || approvedTenantIds.length < 1
    || new Set(approvedTenantIds).size !== approvedTenantIds.length
    || approvedTenantIds.some((tenantId) => !TOKEN.test(tenantId))
    || (databaseTargetBinding && (!Number.isFinite(approvalSignedAt)
      || targetObservedAt > approvalSignedAt
      || approvalSignedAt >= targetExpiresAt))) {
    fail("Outlook authority operation drifted from the signed W13 packet");
  }
  const legacy = databaseTargetBinding == null;
  const material = Object.freeze({
    schema_version:
      legacy
        ? JSON_POSTGRES_OUTLOOK_AUTHORITY_LEGACY_OPERATION_BINDING_VERSION
        : JSON_POSTGRES_OUTLOOK_AUTHORITY_OPERATION_BINDING_VERSION,
    event_tuple: Object.freeze({
      action: ACTION,
      phase: PHASE,
      mode: MODE,
      stage: JSON_POSTGRES_OUTLOOK_AUTHORITY_BOOTSTRAP_STAGE,
      operation: JSON_POSTGRES_OUTLOOK_AUTHORITY_BOOTSTRAP_OPERATION,
    }),
    signed_packet_sha256: packet.packet_sha256,
    migration_catalog_sha256: bindings.migration_catalog_sha256,
    authority_manifest_sha256: bindings.authority_manifest_sha256,
    target_ref: target.target_ref,
    database_secret_ref: target.database_secret_ref,
    program_input_kms_key_ref: target.program_input_kms_key_ref,
    program_input_kms_key: kmsKey,
    ...(legacy ? {} : databaseTargetBinding),
    aws_account: account,
    aws_region: region,
    approved_tenant_ids: Object.freeze([...approvedTenantIds].sort()),
  });
  return Object.freeze({
    ...material,
    operation_binding_sha256: digest(legacy ? DOMAIN_V2 : DOMAIN_V3, material),
  });
}
